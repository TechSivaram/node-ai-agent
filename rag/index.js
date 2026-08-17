import { askQuestion } from "./chain.js";
import { addDocumentsToStore } from "./vectorStore.js";
import { loadAndSplitFile, loadAndSplitDirectory } from "./loaders.js";

export const RAGModule = {
  query: askQuestion,
  ingest: addDocumentsToStore,

  // File Ingestion API
  ingestFile: async (filePath) => {
    const docs = await loadAndSplitFile(filePath);
    await addDocumentsToStore(docs);
    return { count: docs.length, filePath };
  },

  ingestDirectory: async (dirPath) => {
    const docs = await loadAndSplitDirectory(dirPath);
    await addDocumentsToStore(docs);
    return { count: docs.length, dirPath };
  },
};