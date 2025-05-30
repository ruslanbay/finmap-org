import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/components': resolve(__dirname, './src/components'),
    },
  },
  
  build: {
    target: 'ES2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'd3': ['d3'],
        },
      },
    },
  },
  
  server: {
    port: 3000,
    open: true,
    cors: true, // For GitHub data API
  },
  
  // Optimized for your data-heavy app
  optimizeDeps: {
    include: ['d3'],
  },
  
  preview: {
    port: 4173,
  },
});
