// Libs for third party
import { OpenAIEmbeddings } from "@langchain/openai";

// Internal
import { loadWarrantyDocuments, splitText } from "./loader";

interface VectorRecord {
  readonly id: string;
  readonly text: string;
  readonly source: string;
  readonly embedding: readonly number[];
}

let cachedRecords: VectorRecord[] | undefined;
let cachedEmbeddings: OpenAIEmbeddings | undefined;

/** Returns a shared OpenAI embeddings client. */
const getEmbeddings = (): OpenAIEmbeddings => {
  if (!cachedEmbeddings) {
    cachedEmbeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small",
    });
  }
  return cachedEmbeddings;
};

/** Cosine similarity between two embedding vectors. */
const cosineSimilarity = (
  a: readonly number[],
  b: readonly number[],
): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/** Builds or returns the in-memory vector index for warranty docs. */
export const getVectorStore = async (): Promise<VectorRecord[]> => {
  if (cachedRecords) {
    return cachedRecords;
  }

  const docs = await loadWarrantyDocuments();
  const embeddings = getEmbeddings();
  const records: VectorRecord[] = [];

  for (const doc of docs) {
    const chunks = splitText(doc.content);
    const vectors = await embeddings.embedDocuments(chunks);

    chunks.forEach((chunk, index) => {
      records.push({
        id: `${doc.name}:${index}`,
        text: chunk,
        source: doc.name,
        embedding: vectors[index] ?? [],
      });
    });
  }

  cachedRecords = records;
  return records;
};

/**
 * Retrieves the most relevant warranty policy snippets for a query.
 *
 * @param query - Natural-language search query.
 * @param limit - Maximum snippets to return.
 */
export const retrieveWarrantyDocs = async (
  query: string,
  limit = 4,
): Promise<string[]> => {
  const records = await getVectorStore();
  if (records.length === 0) {
    return ["No warranty documentation is indexed."];
  }

  const embeddings = getEmbeddings();
  const queryVector = await embeddings.embedQuery(query);

  const ranked = records
    .map((record) => ({
      record,
      score: cosineSimilarity(queryVector, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(
    ({ record, score }) =>
      `[${record.source} | score ${score.toFixed(3)}]\n${record.text}`,
  );
};

/** Clears the cached index (useful in tests). */
export const resetVectorStore = (): void => {
  cachedRecords = undefined;
};
