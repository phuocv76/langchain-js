import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../..");

/** Loads markdown/text files from the docs directory. */
const loadDocFiles = async (): Promise<
  Array<{ name: string; content: string }>
> => {
  const docsDir = path.resolve(projectRoot, process.env.DOCS_DIR ?? "docs");

  let entries: string[];
  try {
    entries = await readdir(docsDir);
  } catch {
    return [];
  }

  const docs: Array<{ name: string; content: string }> = [];
  for (const entry of entries) {
    if (!/\.(md|txt)$/i.test(entry)) {
      continue;
    }
    const content = await readFile(path.join(docsDir, entry), "utf8");
    docs.push({ name: entry, content });
  }

  return docs;
};

/**
 * Simple keyword search over local documentation files.
 *
 * @param query - Search terms derived from email classification.
 * @param limit - Maximum snippets to return.
 */
export const searchDocs = async (
  query: string,
  limit = 5,
): Promise<string[]> => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  if (terms.length === 0) {
    return [];
  }

  const docs = await loadDocFiles();
  const scored = docs
    .map((doc) => {
      const haystack = `${doc.name}\n${doc.content}`.toLowerCase();
      const score = terms.reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0,
      );
      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ doc }) => {
    const snippet = doc.content.replace(/\s+/g, " ").trim().slice(0, 280);
    return `[${doc.name}] ${snippet}`;
  });
};
