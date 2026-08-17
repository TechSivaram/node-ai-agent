import { connect } from "@lancedb/lancedb";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RAG_CONFIG } from "./config.js";

const embeddings = new OllamaEmbeddings({
  model: RAG_CONFIG.embeddingModel,
  baseUrl: RAG_CONFIG.ollamaBaseUrl,
});

let vectorStoreInstance = null;

export async function getVectorStore() {
  if (vectorStoreInstance) return vectorStoreInstance;

  const db = await connect(RAG_CONFIG.dbPath);
  const tableNames = await db.tableNames();

  if (tableNames.includes(RAG_CONFIG.tableName)) {
    const table = await db.openTable(RAG_CONFIG.tableName);
    vectorStoreInstance = new LanceDB(embeddings, { table });
  }

  return vectorStoreInstance;
}

export async function addDocumentsToStore(documents) {
  const db = await connect(RAG_CONFIG.dbPath);
  const tableNames = await db.tableNames();

  if (!tableNames.includes(RAG_CONFIG.tableName)) {
    // Let LangChain automatically create the table & infer the exact schema from documents
    vectorStoreInstance = await LanceDB.fromDocuments(documents, embeddings, {
      uri: RAG_CONFIG.dbPath,
      tableName: RAG_CONFIG.tableName,
    });
  } else {
    const store = await getVectorStore();
    await store.addDocuments(documents);
  }
}