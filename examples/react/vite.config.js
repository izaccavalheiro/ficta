import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'ficta/browser': resolve(__dirname, '../../src/browser.js'),
      'ficta': resolve(__dirname, '../../src/browser.js')
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
