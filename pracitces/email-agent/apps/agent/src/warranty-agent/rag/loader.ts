// Libs for third party
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../..");

/** Loads warranty knowledge-base files from docs/warranty. */
export const loadWarrantyDocuments = async (): Promise<
  Array<{ name: string; content: string }>
> => {
  const warrantyDir = path.resolve(
    projectRoot,
    process.env.WARRANTY_DOCS_DIR ?? "docs/warranty",
  );

  let entries: string[];
  try {
    entries = await readdir(warrantyDir);
  } catch {
    return [];
  }

  const docs: Array<{ name: string; content: string }> = [];
  for (const entry of entries) {
    if (!/\.(md|txt)$/i.test(entry)) {
      continue;
    }
    const content = await readFile(path.join(warrantyDir, entry), "utf8");
    docs.push({ name: entry, content });
  }

  return docs;
};

/** Splits text into overlapping chunks for embedding. */
export const splitText = (
  text: string,
  chunkSize = 600,
  overlap = 80,
): string[] => {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) {
      break;
    }
    start = end - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
};
