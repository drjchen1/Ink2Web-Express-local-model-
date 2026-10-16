import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true,
        proxy: {
          '/api/ollama': {
            target: 'http://127.0.0.1:11434',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
          }
        }
      },
      plugins: [react(), tailwindcss()],
      define: {
        '__BUILD_DATE__': JSON.stringify(new Date().toLocaleString()),
        '__JULIAN_VERSION__': JSON.stringify(((new Date().getTime() / 86400000) + 2440587.5).toFixed(2))
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
