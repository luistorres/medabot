import pdfParse from "pdf-parse";
import { openai } from "./llm";

export interface Chunk {
  text: string;
  page: number;
}

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

// Split text into overlapping chunks, preferring paragraph boundaries
function splitText(text: string, chunkSize = 800, overlap = 150): string[] {
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
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  return chunks.filter((c) => c.length > 0);
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

// Process PDF: extract text, chunk, embed
export async function processLeaflet(pdfBase64: string) {
  try {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const pdf = await pdfParse(pdfBuffer);

    const textChunks = splitText(pdf.text);

    // Estimate page numbers from position in full text
    const totalPages = pdf.numpages;
    const chunks: Chunk[] = textChunks.map((text, i) => {
      const position = i / textChunks.length;
      const page = Math.min(
        Math.ceil(position * totalPages) + 1,
        totalPages,
      );
      return { text, page };
    });

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

    // Direct chat completion — same pattern as identify.ts
    const response = await openai.chat.completions.create({
      model: "gpt-5.3-chat-latest",
      temperature: 0.2,
      max_tokens: 4000,
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
8. Organize a resposta de forma estruturada quando apropriado`,
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

    const answer = response.choices[0]?.message?.content || "Sem resposta.";

    return {
      answer,
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
