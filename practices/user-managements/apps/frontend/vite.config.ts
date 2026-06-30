import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir, '');
  const backendUrl =
    env.VITE_BACKEND_URL ??
    env.VITE_USER_API_URL ??
    env.USER_API_URL ??
    env.BACKEND_URL ??
    'http://localhost:4000';
  const runtimeUrl =
    env.VITE_COPILOTKIT_RUNTIME_URL ??
    env.COPILOTKIT_RUNTIME_URL ??
    `${backendUrl}/api/copilotkit`;

  return {
    envDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __USER_API_URL__: JSON.stringify(backendUrl),
      __COPILOT_RUNTIME_URL__: JSON.stringify(runtimeUrl),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
