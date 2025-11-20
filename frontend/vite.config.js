import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true, // Permite acceso desde la red local
        allowedHosts: ["gentle-papers-teach.loca.lt"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    build: {
        // Code splitting optimizado
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separar vendor chunks
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['lucide-react'],
                },
            },
        },
        // Optimizaciones de build
        minify: 'esbuild',
        cssMinify: true,
        // Chunk size warnings
        chunkSizeWarningLimit: 1000,
        // Source maps solo en desarrollo
        sourcemap: false,
    },
    // Optimizar dependencias
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
    },
});
