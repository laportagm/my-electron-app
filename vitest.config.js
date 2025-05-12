"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("vitest/config");
var plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
var path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@': (0, path_1.resolve)(__dirname, 'src/renderer'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
        },
        // Exclude the setupTests.ts from the build process
        exclude: ['**/node_modules/**', '**/dist/**', '**/setupTests.ts'],
    },
});
