import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [react()],
      build: {
        target: 'esnext',
        minify: 'esbuild',
        reportCompressedSize: false,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react/') || id.includes('react-dom/')) {
                  return 'vendor-react';
                }
                if (id.includes('@google/genai')) {
                  return 'vendor-genai';
                }
                if (id.includes('recharts')) {
                  return 'vendor-recharts';
                }
                if (id.includes('d3') || id.includes('d3-')) {
                  return 'vendor-d3';
                }
                if (id.includes('leaflet') || id.includes('react-leaflet')) {
                  return 'vendor-leaflet';
                }
                if (id.includes('jspdf')) {
                  return 'vendor-jspdf';
                }
                if (id.includes('html2canvas')) {
                  return 'vendor-html2canvas';
                }
                if (id.includes('firebase')) {
                  if (id.includes('auth')) return 'vendor-firebase-auth';
                  if (id.includes('firestore')) return 'vendor-firebase-firestore';
                  return 'vendor-firebase-app';
                }
                if (id.includes('motion')) {
                  return 'vendor-motion';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-lucide';
                }
              }
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.API_KEY || env.GEMINI_API_KEY || env.API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.API_KEY || env.GEMINI_API_KEY || env.API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
