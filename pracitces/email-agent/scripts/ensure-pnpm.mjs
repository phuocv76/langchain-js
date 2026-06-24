#!/usr/bin/env node
/**
 * Ensures the pnpm version pinned in package.json is installed via Corepack.
 *
 * Use when `pnpm install` fails with a missing CLI under ~/.pnpm/.tools, or when
 * the standalone pnpm shim cannot switch to the project version.
 *
 * Run: npm run setup
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const packageManager = packageJson.packageManager;

if (!packageManager?.startsWith('pnpm@')) {
  console.error('package.json is missing a valid "packageManager": "pnpm@x.y.z" field.');
  process.exit(1);
}

const [, version] = packageManager.split('@');

/** Runs a shell command and streams output to the terminal. */
const run = (command) => {
  execSync(command, { stdio: 'inherit', cwd: rootDir });
};

console.log(`Activating ${packageManager} via Corepack…`);

try {
  run('corepack enable');
  run(`corepack prepare pnpm@${version} --activate`);
} catch {
  console.error('\nCorepack setup failed. Install Node.js 18+ and retry: npm run setup');
  process.exit(1);
}

console.log(`\nDone. pnpm ${version} is ready. Run: pnpm install`);
