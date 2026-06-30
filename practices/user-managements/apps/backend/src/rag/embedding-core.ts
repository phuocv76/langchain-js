const EMBEDDING_MODEL = 'text-embedding-3-small';

type EmbeddingResponse = {
  data: { embedding: number[]; index: number }[];
};

/** Calls OpenAI embeddings API for one or more inputs. */
const embedTexts = async (
  apiKey: string,
  inputs: string[],
): Promise<number[][]> => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings failed: ${response.status}`);
  }

  const body = (await response.json()) as EmbeddingResponse;
  return body.data
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
};

const generateChunks = (input: string): string[] =>
  input
    .trim()
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);

/** Generates embeddings for sentence-like chunks. */
export const generateEmbeddings = async (
  apiKey: string,
  value: string,
): Promise<{ content: string; embedding: number[] }[]> => {
  const chunks = generateChunks(value);
  if (chunks.length === 0) return [];
  const embeddings = await embedTexts(apiKey, chunks);
  return embeddings.map((embedding, i) => ({
    content: chunks[i]!,
    embedding,
  }));
};

/** Generates one embedding vector for a query. */
export const generateEmbedding = async (
  apiKey: string,
  value: string,
): Promise<number[]> => {
  const [embedding] = await embedTexts(apiKey, [value.replaceAll('\n', ' ')]);
  if (!embedding) throw new Error('Empty embedding response');
  return embedding;
};
