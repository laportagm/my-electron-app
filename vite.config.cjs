"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var path_1 = require("path");
var plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
var vite_plugin_electron_renderer_1 = __importDefault(require("vite-plugin-electron-renderer"));
// https://vitejs.dev/config/
exports.default = (0, vite_1.defineConfig)({
    root: (0, path_1.resolve)(__dirname, 'src/renderer'),
    base: './',
    publicDir: (0, path_1.resolve)(__dirname, 'public'),
    build: {
        outDir: (0, path_1.resolve)(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        minify: process.env.NODE_ENV === 'production',
        sourcemap: process.env.NODE_ENV !== 'production',
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    three: ['three', '@react-three/drei', '@react-three/fiber'],
                    ui: ['lucide-react'],
                    markdown: ['react-markdown', 'remark-gfm']
                }
            },
            external: [
                'node-llama-cpp',
                'better-sqlite3'
            ]
        }
    },
    resolve: {
        alias: {
            '@': (0, path_1.resolve)(__dirname, 'src/renderer'),
            '@renderer': (0, path_1.resolve)(__dirname, 'src/renderer'),
            '@main': (0, path_1.resolve)(__dirname, 'src/main'),
            '@shared': (0, path_1.resolve)(__dirname, 'src/shared'),
            '@llm': (0, path_1.resolve)(__dirname, 'src/renderer/llm'),
            '@database': (0, path_1.resolve)(__dirname, 'src/main/database')
        },
    },
    plugins: [
        (0, plugin_react_1.default)(),
        (0, vite_plugin_electron_renderer_1.default)({
            // Enables NodeJS API in renderer process
            renderer: {}
        })
    ],
    css: {
        postcss: (0, path_1.resolve)(__dirname, 'postcss.config.cjs'),
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'three', 'react-markdown', 'remark-gfm'],
        exclude: ['better-sqlite3', 'node-llama-cpp']
    },
    server: {
        host: '127.0.0.1',
        port: 5173
    }
});
