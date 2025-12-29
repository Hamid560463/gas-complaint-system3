
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
  }
});
