import { execSync } from 'node:child_process';

try {
  execSync('pnpm --version', { stdio: 'ignore' });
} catch {
  console.error('pnpm is required. Install: npm install -g pnpm');
  process.exit(1);
}
