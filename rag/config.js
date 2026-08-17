import path from "path";

export const RAG_CONFIG = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  embeddingModel: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
  llmModel: process.env.OLLAMA_LLM_MODEL || "llama3.2",
  dbPath: path.resolve(process.cwd(), "rag/data/lancedb_store"),
  tableName: "agent_knowledge_base",
};