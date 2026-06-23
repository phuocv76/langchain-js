import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { DocHit } from "../types.js";

/**
 * Minimal in-memory vector store over a local docs folder.
 * Files are chunked, embedded once, and retrieved by cosine similarity.
 * Good enough for practice; swap for a real vector DB in production.
 */

interface Chunk {
  source: string;
  content: string;
  embedding: number[];
}

let index: Chunk[] | undefined;
let embeddingsClient: OpenAIEmbeddings | undefined;

function embeddings(): OpenAIEmbeddings {
  if (!embeddingsClient) {
    embeddingsClient = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  }
  return embeddingsClient;
}

function chunkText(text: string, size = 800, overlap = 100): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= size) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    chunks.push(clean.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

async function readDocs(dir: string): Promise<{ source: string; content: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const docs: { source: string; content: string }[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      docs.push(...(await readDocs(full)));
    } else if (/\.(md|markdown|txt)$/i.test(entry.name)) {
      docs.push({ source: full, content: await readFile(full, "utf8") });
    }
  }
  return docs;
}

/** Build (once) the in-memory index from DOCS_DIR. */
export async function ensureIndex(): Promise<void> {
  if (index) return;

  const dir = path.resolve(process.env.DOCS_DIR || "docs");
  const docs = await readDocs(dir);

  const pending: { source: string; content: string }[] = [];
  for (const doc of docs) {
    for (const chunk of chunkText(doc.content)) {
      pending.push({ source: path.relative(process.cwd(), doc.source), content: chunk });
    }
  }

  if (pending.length === 0) {
    index = [];
    return;
  }

  const vectors = await embeddings().embedDocuments(pending.map((p) => p.content));
  index = pending.map((p, i) => ({ ...p, embedding: vectors[i] }));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/** Retrieve the top-k most relevant chunks for a query. */
export async function searchDocs(query: string, k = 3): Promise<DocHit[]> {
  await ensureIndex();
  if (!index || index.length === 0) return [];

  const queryVec = await embeddings().embedQuery(query);
  return index
    .map((chunk) => ({
      source: chunk.source,
      content: chunk.content,
      score: cosineSimilarity(queryVec, chunk.embedding),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, k);
}
