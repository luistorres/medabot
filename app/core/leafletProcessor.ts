import pdfParse from "pdf-parse";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "./llm";
import { highlightKeyClaim } from "./highlight";
import { resolveSourceQuote } from "./sourceQuote";

export interface Chunk {
  text: string;
  page: number;
}

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

const LeafletAnswerSchema = z.object({
  answer: z.string(),
  highlightPhrase: z.string().nullable(),
  quoteAnchor: z.string().nullable(),
});

// The string pdf-parse uses to join consecutive page texts.
// pdf-parse sets ret.text = `${ret.text}\n\n${pageText}` for each page,
// so the full text is "\n\n" + page1 + "\n\n" + page2 + ...
const PAGE_JOINER = "\n\n";

/**
 * Pure helper: chunk each page's text separately (paragraph-aware, 800/150),
 * assigning the 1-based page number to every chunk it produces.
 *
 * This is the canonical runtime chunking function. The test in
 * scripts/test-page-mapping.ts exercises this exact export.
 *
 * @param pageTexts  Array of per-page text strings (index 0 = page 1).
 * @returns          Flat array of chunks in page order, each with the correct page number.
 */
export function chunkPagesWithNumbers(pageTexts: string[]): Chunk[] {
  const result: Chunk[] = [];
  for (let i = 0; i < pageTexts.length; i++) {
    const pageNum = i + 1; // 1-based
    const pageChunks = splitIntoChunks(pageTexts[i]);
    for (const text of pageChunks) {
      result.push({ text, page: pageNum });
    }
  }
  return result;
}

// Split text into overlapping chunks, preferring paragraph boundaries.
// Returns only the chunk text strings (page assignment is handled by the caller).
function splitIntoChunks(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;
    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastParagraph = slice.lastIndexOf("\n\n");
      const lastNewline = slice.lastIndexOf("\n");
      const lastSentence = slice.lastIndexOf(". ");
      if (lastParagraph > chunkSize * 0.5) end = start + lastParagraph;
      else if (lastNewline > chunkSize * 0.5) end = start + lastNewline;
      else if (lastSentence > chunkSize * 0.5) end = start + lastSentence + 1;
    }
    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push(chunkText);
    }
    start = end - overlap;
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const resp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
}

// Process PDF: extract text, chunk per-page, embed
export async function processLeaflet(pdfBase64: string) {
  try {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // Collect per-page text via pagerender callback.
    // pdf-parse joins pages with PAGE_JOINER ("\n\n"), prepending it even before
    // the first page, so: pdf.text === "\n\n" + pageTexts.join("\n\n")
    const pageTexts: string[] = [];

    const pagerender = (pageData: any): Promise<string> => {
      const renderOptions = {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      };
      return pageData.getTextContent(renderOptions).then(
        (textContent: any) => {
          let lastY: number | undefined;
          let text = "";
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === undefined) {
              text += item.str;
            } else {
              text += "\n" + item.str;
            }
            lastY = item.transform[5];
          }
          pageTexts.push(text);
          return text;
        },
      );
    };

    const pdf = await pdfParse(pdfBuffer, { pagerender });

    const totalPages = pdf.numpages;

    // ── Issue 3: Invariant check ──────────────────────────────────────────────
    // Verify that pagerender captured every page AND that pdf-parse's output
    // matches the expected join (PAGE_JOINER prepended before each page).
    // If either condition fails we fall back to whole-text chunking with a
    // proportional page estimate so nothing silently breaks.
    const expectedJoined = PAGE_JOINER + pageTexts.join(PAGE_JOINER);
    const usePerPage =
      pageTexts.length === pdf.numpages && pdf.text === expectedJoined;

    let chunks: Chunk[];

    if (usePerPage) {
      // ── Issue 1: Per-page chunking ─────────────────────────────────────────
      // Every chunk belongs to exactly one real page. No cross-page bleed.
      chunks = chunkPagesWithNumbers(pageTexts);
    } else {
      // Fallback: chunk the whole text and assign pages proportionally.
      // This path is taken when pagerender was skipped or pdf-parse changed its
      // join format — still better than crashing.
      console.warn(
        `[processLeaflet] Per-page invariant failed (captured ${pageTexts.length} pages, ` +
          `numpages=${pdf.numpages}, textMatch=${pdf.text === expectedJoined}). ` +
          `Falling back to whole-text chunking with proportional page estimate.`,
      );
      const rawChunkTexts = splitIntoChunks(pdf.text);
      chunks = rawChunkTexts.map((text, idx) => {
        const position =
          pdf.text.indexOf(text) / Math.max(pdf.text.length, 1);
        const page = Math.max(
          1,
          Math.min(Math.ceil(position * totalPages) + 1, totalPages),
        );
        return { text, page };
      });
    }

    // Embed all chunks in one batch
    const embeddings = await embedTexts(chunks.map((c) => c.text));

    const chunksWithEmbeddings: ChunkWithEmbedding[] = chunks.map(
      (chunk, i) => ({
        ...chunk,
        embedding: embeddings[i],
      }),
    );

    return {
      chunks: chunksWithEmbeddings,
      documentCount: chunksWithEmbeddings.length,
    };
  } catch (error) {
    console.error("Error processing leaflet:", error);
    throw error;
  }
}

// Query the leaflet: embed question, similarity search, chat completion
export async function queryLeaflet(
  chunks: ChunkWithEmbedding[],
  question: string,
) {
  try {
    // Embed the question
    const [questionEmbedding] = await embedTexts([question]);

    // Top-k cosine similarity search
    const relevantChunks = chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(questionEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((s) => s.chunk);

    // Format context with page numbers for citations
    const contextWithPages = relevantChunks
      .map((c) => `[Página ${c.page}]\n${c.text}`)
      .join("\n\n---\n\n");

    const pageNumbers = [
      ...new Set(relevantChunks.map((c) => c.page)),
    ].sort((a, b) => a - b);

    const pagesStr =
      pageNumbers.length > 0
        ? pageNumbers.join(", ")
        : "Páginas não identificadas";

    const response = await openai.chat.completions.parse({
      model: "gpt-5.4",
      reasoning_effort: "low",
      response_format: zodResponseFormat(LeafletAnswerSchema, "leaflet_answer"),
      max_completion_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `Você é um assistente médico especializado em fornecer informações APENAS do folheto informativo do paciente.

Instruções importantes:
1. Responda APENAS com base no contexto fornecido
2. Quando citar informações, mencione a página: "De acordo com a página X, ..." ou "Conforme indicado na página X, ..."
3. Se a informação não estiver no folheto, diga: "Não encontro essa informação no folheto informativo. Recomendo consultar um profissional de saúde."
4. Não invente ou infira informações que não estejam explicitamente no contexto
5. Seja preciso e cite seções específicas quando possível
6. Sempre recomende consultar profissionais de saúde para aconselhamento médico personalizado
7. Use uma linguagem clara e acessível
8. Organize a resposta de forma estruturada quando apropriado
9. Para realce visual, escolha opcionalmente uma única expressão curta que já apareça LITERALMENTE na resposta e que responda diretamente à pergunta do paciente, e devolva-a no campo highlightPhrase. Não escreva rótulos como "afirmação-chave" ou "frase-chave", nem explicações sobre o realce, e NÃO use marcação ==...== no texto da resposta. Se não houver uma afirmação-chave única e clara, ou se a resposta for um resumo geral, defina highlightPhrase como null.
10. No campo quoteAnchor, devolva APENAS as primeiras ~6 a 8 palavras (VERBATIM) da ÚNICA frase do "Contexto do folheto" que fundamenta a resposta — o suficiente para localizar a frase, NÃO a frase inteira. Copie exatamente do contexto (não da sua própria resposta); nunca invente nem parafraseie; não inclua o prefixo "[Página X]". Use null se nenhuma frase única fundamentar a resposta ou para resumos gerais.

Contrato do campo highlightPhrase: deve ser copiado VERBATIM do texto da resposta, ou null; nunca invente; use null para resumos gerais/visões gerais.`,
        },
        {
          role: "user",
          content: `Contexto do folheto (com indicação de páginas):
${contextWithPages}

Páginas relevantes encontradas: ${pagesStr}

Questão do paciente: ${question}`,
        },
      ],
    });

    const parsed = response.choices[0]?.message?.parsed;
    const answer = parsed
      ? highlightKeyClaim(parsed.answer, parsed.highlightPhrase)
      : "Sem resposta.";
    const sourceQuote = resolveSourceQuote(
      parsed?.quoteAnchor ?? null,
      relevantChunks,
    );

    return {
      answer,
      sourceQuote: sourceQuote?.quote ?? null,
      sourceQuotePage: sourceQuote?.page ?? null,
      sourceDocuments: relevantChunks,
      context: contextWithPages,
      pageNumbers,
      relevantPages: pageNumbers,
    };
  } catch (error) {
    console.error("Error querying leaflet:", error);
    throw error;
  }
}
