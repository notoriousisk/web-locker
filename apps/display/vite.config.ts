import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: process.env.VITE_DISPLAY_BASE_PATH ?? env.VITE_DISPLAY_BASE_PATH ?? '/',
    plugins: [react()],
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  };
});
