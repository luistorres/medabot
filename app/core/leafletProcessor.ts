import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";

// Process PDF and create a retriever
export async function processLeaflet(pdfBase64: string) {
  try {
    // Convert base64 to Buffer
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // Create a blob from the buffer
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });

    // Load PDF document
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    // Split into chunks with better parameters for medical documents
    // Medical PDFs often have dense information, so slightly smaller chunks work better
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,  // Reduced from 1000 for more precise retrieval
      chunkOverlap: 150, // Reduced from 200 to avoid too much duplication
      separators: ["\n\n", "\n", ". ", " ", ""], // Prioritize paragraph breaks
    });

    const splitDocs = await splitter.splitDocuments(docs);

    // Enhance documents with page number metadata
    const enhancedDocs = splitDocs.map((doc) => {
      // Extract page number from metadata (PDFLoader provides this)
      const pageNum = doc.metadata?.loc?.pageNumber || doc.metadata?.page || 0;

      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          page: pageNum,
          source: "patient_leaflet",
        },
      });
    });

    // Create vector store with better embeddings model
    const vectorStore = await MemoryVectorStore.fromDocuments(
      enhancedDocs,
      new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      })
    );

    // Create retriever with MMR for better diversity
    // MMR (Maximum Marginal Relevance) retrieves diverse but relevant documents
    const retriever = vectorStore.asRetriever({
      searchType: "mmr",
      k: 6,
      searchKwargs: {
        fetchK: 20,
        lambda: 0.5,
      },
    });

    return {
      retriever,
      vectorStore,
      documentCount: enhancedDocs.length,
      chunks: enhancedDocs,
    };
  } catch (error) {
    console.error("Error processing leaflet:", error);
    throw error;
  }
}

// Improved function to query the leaflet with better RAG patterns
export async function queryLeaflet(retriever: any, question: string) {
  try {
    // Get relevant documents using the retriever
    const relevantDocs = await retriever.invoke(question);

    // Format context with page numbers for better citations
    const contextWithPages = relevantDocs
      .map((doc: any, idx: number) => {
        const page = doc.metadata?.page || "desconhecida";
        return `[Página ${page}]\n${doc.pageContent}`;
      })
      .join("\n\n---\n\n");

    // Extract unique page numbers for reference
    const pageNumbers = [...new Set(
      relevantDocs
        .map((doc: any) => doc.metadata?.page)
        .filter((page: any) => page !== undefined && page !== 0)
    )].sort((a: number, b: number) => a - b);

    // Improved prompt template with explicit page citation instructions
    const prompt = ChatPromptTemplate.fromTemplate(`
Você é um assistente médico especializado em fornecer informações APENAS do folheto informativo do paciente.

Contexto do folheto (com indicação de páginas):
{context}

Questão do paciente: {question}

Instruções importantes:
1. Responda APENAS com base no contexto fornecido acima
2. Quando citar informações, mencione a página: "De acordo com a página X, ..." ou "Conforme indicado na página X, ..."
3. Se a informação não estiver no folheto, diga: "Não encontro essa informação no folheto informativo. Recomendo consultar um profissional de saúde."
4. Não invente ou infira informações que não estejam explicitamente no contexto
5. Seja preciso e cite seções específicas quando possível
6. Sempre recomende consultar profissionais de saúde para aconselhamento médico personalizado
7. Use uma linguagem clara e acessível
8. Organize a resposta de forma estruturada quando apropriado

Páginas relevantes encontradas: {pages}

Resposta:
    `);

    // gpt-4o-mini: cheapest mini model ($0.15/$0.60 per 1M tokens)
    // Consider gpt-5-mini for better performance when available
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
    });

    // Create a LangChain runnable sequence (modern pattern)
    const chain = RunnableSequence.from([
      {
        context: () => contextWithPages,
        question: (input: { question: string }) => input.question,
        pages: () => pageNumbers.length > 0
          ? pageNumbers.join(", ")
          : "Páginas não identificadas",
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    // Invoke the chain
    const answer = await chain.invoke({ question });

    return {
      answer,
      sourceDocuments: relevantDocs,
      context: contextWithPages,
      pageNumbers, // Return page numbers for UI display
      relevantPages: pageNumbers,
    };
  } catch (error) {
    console.error("Error querying leaflet:", error);
    throw error;
  }
}

// Optional: Streaming version for better UX (can be implemented later)
export async function queryLeafletStream(retriever: any, question: string) {
  // Similar to above but with streaming support
  // Can be implemented if you want to show progressive responses
  // For now, this is a placeholder for future enhancement
  throw new Error("Streaming not implemented yet");
}
