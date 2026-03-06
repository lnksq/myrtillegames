import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../../packages/shared'),
            '@engine': path.resolve(__dirname, '../../packages/engine'),
            '@games': path.resolve(__dirname, '../../packages/games'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
    },
});
