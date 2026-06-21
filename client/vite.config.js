import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.VITE_PORT || 5173);
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:5001';

const proxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port,
    proxy,
  },
  preview: {
    host: '127.0.0.1',
    port,
    proxy,
  },
});
