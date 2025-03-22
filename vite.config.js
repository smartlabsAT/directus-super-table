import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      name: 'SuperLayoutTable',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', '@directus/extensions-sdk', '@directus/types'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});