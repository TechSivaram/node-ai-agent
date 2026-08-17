import fs from "fs/promises";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 150,
});

/**
 * Clean metadata to prevent LanceDB Arrow schema inference failures
 */
function sanitizeDocuments(docs, filePath) {
  return docs.map(
    (doc) =>
      new Document({
        pageContent: doc.pageContent,
        metadata: {
          source: path.basename(filePath),
          loc_pageNumber: doc.metadata?.loc?.pageNumber || 1,
        },
      })
  );
}

/**
 * Safely read .txt and .md files into Documents
 */
async function loadTextFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return [
    new Document({
      pageContent: content,
      metadata: { source: path.basename(filePath) },
    }),
  ];
}

/**
 * Loads a single file (.pdf, .txt, .md) and splits it into chunked Documents
 */
export async function loadAndSplitFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let rawDocs = [];

  if (ext === ".pdf") {
    const loader = new PDFLoader(filePath);
    rawDocs = await loader.load();
    rawDocs = sanitizeDocuments(rawDocs, filePath);
  } else if (ext === ".txt" || ext === ".md") {
    rawDocs = await loadTextFile(filePath);
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  return await textSplitter.splitDocuments(rawDocs);
}

/**
 * Recursively scans a directory and loads all supported files (.pdf, .txt, .md)
 */
export async function loadAndSplitDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let allChunks = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subChunks = await loadAndSplitDirectory(fullPath);
      allChunks.push(...subChunks);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".pdf", ".txt", ".md"].includes(ext)) {
        const chunks = await loadAndSplitFile(fullPath);
        allChunks.push(...chunks);
      }
    }
  }

  return allChunks;
}