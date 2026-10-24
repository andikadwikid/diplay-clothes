import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // `npm run dev` proxies the API and uploaded images to the Go backend, so the
  // app stays same-origin (which is what lets the auth cookie work).
  const env = loadEnv(mode, '.', '');
  const api = env.API_TARGET || 'http://127.0.0.1:8080';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': api,
        '/media': api,
      },
    },
  };
});
