import pdfParse from "pdf-parse";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "./llm";
import { highlightKeyClaim } from "./highlight";
import { resolveSourceQuote } from "./sourceQuote";
import { extractPageTexts } from "./leafletStore";

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
  quoteStart: z.string().nullable(),
  quoteEnd: z.string().nullable(),
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

export async function retrieveRelevantChunks(
  chunks: ChunkWithEmbedding[],
  question: string,
  k = 6,
): Promise<ChunkWithEmbedding[]> {
  const [questionEmbedding] = await embedTexts([question]);

  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(questionEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.chunk);
}

// Process PDF: extract text, chunk per-page, embed
export async function processLeaflet(pdfBase64: string) {
  try {
    const pages = await extractPageTexts(pdfBase64);
    const chunks: Chunk[] = chunkPagesWithNumbers(pages.map((p) => p.text));

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
    const relevantChunks = await retrieveRelevantChunks(chunks, question);

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
10. Para localizar no folheto a frase/trecho que fundamenta a resposta, devolva DOIS marcadores curtos, copiados VERBATIM do "Contexto do folheto" (não da sua própria resposta): quoteStart = as primeiras ~5 a 6 palavras desse trecho; quoteEnd = as últimas ~5 a 6 palavras do MESMO trecho. Não copie o trecho inteiro. Ambos devem pertencer à mesma frase/trecho contíguo. Nunca invente nem parafraseie; não inclua o prefixo "[Página X]". Use null em ambos os campos se nenhum trecho único fundamentar a resposta ou para resumos gerais.

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
      parsed?.quoteStart ?? null,
      parsed?.quoteEnd ?? null,
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
