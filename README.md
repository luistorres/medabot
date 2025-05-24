# MedaBot 🤖💊

An AI-powered medicine identification and information system that uses computer vision and retrieval-augmented generation (RAG) to provide accurate, source-backed answers about medications from their official patient leaflets.

MedaBot solves the problem of quickly accessing reliable medication information by:

1. **Identifying medicines** from photos of packaging/pills
2. **Retrieving official patient leaflets** from regulatory databases
3. **Processing leaflets with AI** to enable natural language queries
4. **Providing accurate, source-backed answers** constrained to official documentation

## 🏗️ Architecture & Technologies

### Frontend Stack

- **React 19** - Modern UI components with latest features
- **TanStack Router** - Type-safe routing and navigation
- **TanStack Start** - Full-stack React framework with SSR
- **Tailwind CSS 4** - Utility-first styling with latest features
- **React Webcam** - Camera integration for medicine photography
- **TypeScript** - Type safety throughout the application

### Backend & Processing

- **Vinxi** - Modern build tool and development server
- **Node.js** - Server-side runtime environment

## 🔄 Processing Pipeline

### Step 1: Medicine Identification 🔍

**Technology**: OpenAI GPT-4.1-nano with Vision API

- Analyzes uploaded medicine photos
- Extracts structured data: name, brand, active substance, dosage
- Uses Zod schema validation for type-safe responses
- Optimized prompts for pharmaceutical accuracy

### Step 2: Regulatory Document Retrieval 📄

**Technology**: Playwright browser automation

- Automated web scraping of Portuguese INFARMED database
- Headless browser navigation and form submission
- Network interception to capture PDF downloads
- Robust error handling and timeout management

### Step 3: Document Processing with LangChain 🤖

**Technology**: LangChain.js + OpenAI Embeddings

- **PDF Processing**: LangChain PDFLoader extracts text from patient leaflets
- **Text Chunking**: RecursiveCharacterTextSplitter creates overlapping chunks (1000 chars, 200 overlap)
- **Vector Embeddings**: OpenAI embeddings model creates semantic representations
- **Vector Storage**: In-memory vector store for fast similarity search

### Step 4: Retrieval-Augmented Generation (RAG) 📝

**Technology**: LangChain Retriever + ChatGPT-4

- **Semantic Search**: Vector similarity search finds relevant leaflet sections
- **Context Assembly**: Top-k relevant chunks provide context to LLM
- **Constrained Generation**: System prompts ensure responses use only leaflet content
- **Source Attribution**: Responses include references to specific leaflet sections

## 🛡️ Safety & Reliability Features

- **Source Constraint**: AI responses limited to official leaflet content only
- **Medical Disclaimers**: Clear guidance to consult healthcare professionals

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .envrc.example .envrc
# Add your OPENAI_API_KEY

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 📱 User Experience

1. **📸 Capture**: Take a photo of medicine packaging
2. **🔍 Identify**: AI extracts medicine details from image
3. **📄 Fetch**: System retrieves official patient leaflet
4. **🤖 Process**: LangChain creates searchable knowledge base
5. **📝 Overview**: Generate initial medicine summary
6. **✅ Query**: Ask natural language questions about the medicine

---

_Built with modern web technologies and AI to make medication information more accessible and reliable._
