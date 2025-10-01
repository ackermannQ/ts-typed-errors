import { defineConfig } from 'vite';

// Simple config. During dev we import the library source directly from ../../src
export default defineConfig({
  server: { port: 5173 }
});
