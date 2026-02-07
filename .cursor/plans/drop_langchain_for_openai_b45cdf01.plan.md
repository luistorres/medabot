---
name: Drop LangChain for OpenAI
overview: Remove all 5 LangChain packages (@langchain/community, @langchain/classic, @langchain/core, @langchain/openai, @langchain/textsplitters) and rewrite leafletProcessor.ts using the OpenAI SDK directly plus pdf-parse, eliminating the dependency conflict entirely.
todos:
  - id: rewrite-leaflet
    content: Rewrite leafletProcessor.ts to use OpenAI SDK + pdf-parse directly instead of LangChain
    status: completed
  - id: remove-langchain-deps
    content: Remove all 5 @langchain/* packages from package.json
    status: completed
  - id: clean-dockerfile
    content: Remove .npmrc COPY and --legacy-peer-deps from Dockerfile since conflict is gone
    status: completed
  - id: delete-npmrc
    content: Delete .npmrc file
    status: completed
  - id: reinstall
    content: Run clean npm install and verify no peer dependency issues
    status: completed
  - id: update-server-fns
    content: Update server functions if the processLeaflet/queryLeaflet signatures changed
    status: completed
isProject: false
---

# Drop LangChain, Use OpenAI SDK Directly

## Why

You're pulling in **5 LangChain packages** (community, classic, core, openai, textsplitters) with a massive transitive dependency tree -- and the only file that uses them is `[app/core/leafletProcessor.ts](app/core/leafletProcessor.ts)`. The identify step already uses the OpenAI SDK directly. LangChain is overkill here and is the sole source of the peer dependency conflict.

## What LangChain Actually Does in Your Code

Breaking down what each import provides:

| Import                                                                                        | What it does                           | Replacement                                                                        |
| --------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `PDFLoader` (community)                                                                       | Wraps `pdf-parse` to extract text      | Use `pdf-parse` directly (already in deps)                                         |
| `RecursiveCharacterTextSplitter` (textsplitters)                                              | Splits text into overlapping chunks    | ~30 lines of vanilla JS                                                            |
| `OpenAIEmbeddings` (openai)                                                                   | Calls `openai.embeddings.create()`     | Use OpenAI SDK directly                                                            |
| `MemoryVectorStore` (classic)                                                                 | In-memory cosine similarity search     | ~20 lines with `cosineSimilarity()` helper                                         |
| `ChatOpenAI` + `ChatPromptTemplate` + `RunnableSequence` + `StringOutputParser` (core/openai) | Chat completion with a prompt template | Use `openai.chat.completions.create()` directly (same as identify.ts already does) |

**Every single thing LangChain does here can be replaced with straightforward code using the OpenAI SDK you already have.**

## Implementation

Rewrite `[app/core/leafletProcessor.ts](app/core/leafletProcessor.ts)` to:

### 1. PDF text extraction -- use `pdf-parse` directly

```typescript
import pdfParse from "pdf-parse";

const pdfBuffer = Buffer.from(pdfBase64, "base64");
const pdf = await pdfParse(pdfBuffer);
// pdf.text has the full text, pdf.numpages has page count
```

### 2. Text chunking -- simple recursive splitter function

```typescript
function splitText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
}
```

### 3. Embeddings + vector store -- OpenAI SDK + cosine similarity

```typescript
import { openai } from "./llm";

async function embedTexts(texts: string[]) {
  const resp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
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
```

### 4. RAG query -- direct chat completion (same pattern as identify.ts)

Replace the `ChatOpenAI` + `RunnableSequence` chain with a direct `openai.chat.completions.create()` call, just like `[app/core/identify.ts](app/core/identify.ts)` already does.

### 5. Remove LangChain from deps

Remove from `[package.json](package.json)`:

- `@langchain/classic`
- `@langchain/community`
- `@langchain/core`
- `@langchain/openai`
- `@langchain/textsplitters`

Also remove the `.npmrc` file and revert the `--legacy-peer-deps` flag from `[Dockerfile](Dockerfile)` since there will be no more peer dependency conflicts.

## What You Gain

- **Eliminates the Zod v3/v4 peer dependency conflict entirely** -- no more `.npmrc` hacks or `--legacy-peer-deps`
- **~600 fewer transitive packages** in node_modules
- **Faster Docker builds** and smaller image
- **No framework abstraction layer** between you and the OpenAI API -- easier to debug, understand, and extend
- **Consistent codebase** -- both identify and RAG use the same OpenAI SDK pattern

## Risk

Minimal. The LangChain abstractions being replaced are thin wrappers. The actual AI behavior (embeddings model, chat model, prompts) stays identical. The only thing you lose is MMR retrieval diversity, which can be approximated with a simple top-k + dedup approach, or implemented properly later if needed.
