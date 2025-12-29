
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // If building on Vercel (detected by env var), use absolute path '/'. 
  // For Electron/Local builds, use relative './' to ensure assets load correctly.
  base: process.env.VERCEL ? '/' : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate third-party libraries into their own chunks to avoid large file warnings
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'utils';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            return 'vendor'; // React and others
          }
        }
      }
    }
  }
});
