import path from "path";
import { RAGModule } from "./index.js";

const targetPath = process.argv[2];

if (!targetPath) {
  console.log("Usage: node rag/ingest.js <path-to-file-or-folder>");
  process.exit(1);
}

async function run() {
  const absolutePath = path.resolve(process.cwd(), targetPath);
  console.log(`Starting ingestion for: ${absolutePath}...`);

  try {
    const result = await RAGModule.ingestDirectory(absolutePath);
    console.log(`✅ Ingestion complete! Successfully stored ${result.count} document chunks into LanceDB.`);
  } catch (err) {
    console.error("❌ Ingestion failed:", err.message);
  }
}

run();