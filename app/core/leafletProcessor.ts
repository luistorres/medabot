import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
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
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "text-embedding-3-small", // Newer, better model (default is ada-002)
      })
    );

    // Create retriever with MMR for better diversity
    // MMR (Maximum Marginal Relevance) retrieves diverse but relevant documents
    const retriever = vectorStore.asRetriever({
      searchType: "mmr", // Use MMR instead of similarity
      searchKwargs: {
        k: 6, // Increased from 3 to 6 for more context
        fetchK: 20, // Fetch 20 candidates, then pick 6 best with MMR
        lambda: 0.5, // Balance between relevance (1.0) and diversity (0.0)
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
    const relevantDocs = await retriever.getRelevantDocuments(question);

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

    // Use gpt-4o-mini - better quality, faster, and cheaper than gpt-4.1-nano
    // gpt-4o-mini has 128k context window and better instruction following
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini", // Updated from gpt-4.1-nano
      temperature: 0.1, // Slightly increased for more natural language, but still mostly deterministic
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000, // Limit response length
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
