#!/usr/bin/env node
/**
 * Scaffolds a new practice exercise from a template.
 *
 * Usage:
 *   npm run new -- <kind> "<title>"
 *
 *   <kind>   chain | graph   (defaults to chain)
 *   <title>  short description, e.g. "rag over docs"
 *
 * Example:
 *   npm run new -- graph "tool calling agent"
 */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const exercisesDir = path.join(root, "src", "exercises");
const templatesDir = path.join(root, "scripts", "templates");

const args = process.argv.slice(2);
let kind = "chain";
let title = "";

if (args.length === 1) {
  title = args[0];
} else if (args.length >= 2) {
  kind = args[0];
  title = args.slice(1).join(" ");
}

if (!title) {
  console.error('Usage: npm run new -- <chain|graph> "<title>"');
  process.exit(1);
}
if (!["chain", "graph"].includes(kind)) {
  console.error(`Unknown kind "${kind}". Use "chain" or "graph".`);
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

await mkdir(exercisesDir, { recursive: true });

const existing = (await readdir(exercisesDir)).filter((f) => /^\d{2}-/.test(f));
const nextNum = String(existing.length + 1).padStart(2, "0");
const filename = `${nextNum}-${slug}.ts`;
const target = path.join(exercisesDir, filename);

if (existsSync(target)) {
  console.error(`File already exists: ${target}`);
  process.exit(1);
}

const templatePath = path.join(templatesDir, `${kind}.ts.tmpl`);
const template = await readFile(templatePath, "utf8");
const content = template
  .replaceAll("{{NUM}}", nextNum)
  .replaceAll("{{TITLE}}", title)
  .replaceAll("{{FILE}}", `src/exercises/${filename}`);

await writeFile(target, content, "utf8");

console.log(`Created ${path.relative(root, target)}`);
console.log(`Run it with:\n  npm run exercise src/exercises/${filename}`);
