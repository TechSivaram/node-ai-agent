import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RAG_CONFIG } from "./config.js";
import { getVectorStore } from "./vectorStore.js";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";

const llm = new ChatOllama({
  model: RAG_CONFIG.llmModel,
  baseUrl: RAG_CONFIG.ollamaBaseUrl,
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromTemplate(`
Answer the user query based ONLY on the provided context below.

Context:
{context}

Question: {question}
Answer:`);

// Helper for Reciprocal Rank Fusion (Hybrid Search)
async function getHybridResults(question, vectorRetriever, bm25Retriever, k = 5) {
  const [vectorDocs, bm25Docs] = await Promise.all([
    vectorRetriever.invoke(question),
    bm25Retriever.invoke(question),
  ]);

  const scores = new Map();

  const addDocs = (docsList, weight = 0.5) => {
    docsList.forEach((doc, rank) => {
      const key = doc.pageContent;
      const rrfScore = weight * (1 / (60 + rank + 1));

      if (scores.has(key)) {
        const existing = scores.get(key);
        existing.score += rrfScore;
      } else {
        scores.set(key, { doc, score: rrfScore });
      }
    });
  };

  addDocs(vectorDocs, 0.5);
  addDocs(bm25Docs, 0.5);

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((item) => item.doc);
}

// Pass your loaded document chunks into askQuestion
export async function askQuestion(question, allDocs = []) {
  const store = await getVectorStore();
  const vectorRetriever = store.asRetriever(5);

  const chain = RunnableSequence.from([
    {
      context: async (input) => {
        let docs = [];
        
        // If document chunks are provided, run Hybrid Search
        if (allDocs && allDocs.length > 0) {
          const bm25Retriever = BM25Retriever.fromDocuments(allDocs, { k: 5 });
          docs = await getHybridResults(input.question, vectorRetriever, bm25Retriever, 5);
        } else {
          // Fall back to Vector Search if raw docs aren't passed
          docs = await vectorRetriever.invoke(input.question);
        }

        console.log("Retrieved Chunks:", docs);
        return docs.map((d) => d.pageContent).join("\n\n");
      },
      question: (input) => input.question,
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  return await chain.invoke({ question });
}