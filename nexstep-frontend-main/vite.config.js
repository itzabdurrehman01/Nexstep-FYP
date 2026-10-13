import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * One Vite configuration for development, production builds, and Vitest.
 * Keep this JavaScript file so one configuration consistently serves Vite,
 * production builds, and Vitest.
 */
export default defineConfig(() => {
  const backendUrl = process.env.VITE_API_URL || 'http://localhost:3001';
  const frontendPort = Number(process.env.VITE_PORT || process.env.PORT) || 5173;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: frontendPort,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'clerk-vendor': ['@clerk/react'],
            'ui-vendor': ['motion', 'lucide-react'],
            'chart-vendor': ['recharts'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      pool: 'forks',
      isolate: false,
      fileParallelism: false,
      maxWorkers: 1,
      testTimeout: 30000,
    },
    optimizeDeps: {
      include: ['@clerk/react', 'react', 'react-dom', 'react-router-dom', 'motion', 'lucide-react'],
    },
  };
});
