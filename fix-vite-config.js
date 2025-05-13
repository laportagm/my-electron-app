import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Fixing Vite configuration...');

// Path to the configuration file
const viteConfigPath = path.join(__dirname, 'vite.config.ts');

// Create backup
fs.copyFileSync(viteConfigPath, `${viteConfigPath}.backup`);
console.log('Created backup of the original vite.config.ts');

// Create optimized configuration
const fixedConfig = `
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron-renderer';
import { builtinModules } from 'module';

// Log environment for debugging
console.log('Vite environment:', {
  NODE_ENV: process.env.NODE_ENV,
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  dirname: __dirname
});

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/drei', '@react-three/fiber']
        }
      },
      external: [
        'electron',
        'fs',
        'path',
        'os',
        'node-llama-cpp',
        'better-sqlite3',
        ...builtinModules.flatMap(m => [m, \`node:\${m}\`])
      ]
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@llm': resolve(__dirname, 'src/renderer/llm'),
      '@database': resolve(__dirname, 'src/main/database')
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
  },
  
  plugins: [
    react(),
    electron({
      renderer: {
        nodeIntegration: true
      }
    })
  ],
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__dirname': JSON.stringify(__dirname),
    'global': 'globalThis'
  },
  
  css: {
    postcss: resolve(__dirname, 'postcss.config.cjs')
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'three'],
    exclude: [
      'electron',
      'better-sqlite3',
      'node-llama-cpp',
      ...builtinModules.flatMap(m => [m, \`node:\${m}\`])
    ]
  },
  
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  }
});
`;

// Write the fixed configuration
fs.writeFileSync(viteConfigPath, fixedConfig);
console.log('Fixed vite.config.ts written successfully');

// Now fix the preload script path in main.ts
const mainTsPath = path.join(__dirname, 'src', 'main', 'main.ts');
const mainTsContent = fs.readFileSync(mainTsPath, 'utf8');

// Backup the original file
fs.writeFileSync(`${mainTsPath}.backup`, mainTsContent);

// Fix the preload path
const fixedMainTs = mainTsContent.replace(
  /preload: path\.join\(__dirname, ['"]preload\/preload\.js['"]\),/,
  `preload: path.join(__dirname, process.env.NODE_ENV === 'development' ? '../main/preload.js' : 'preload.js'),`
);

fs.writeFileSync(mainTsPath, fixedMainTs);
console.log('Fixed preload path in main.ts');

// Create a simple script to compile the preload script
const compilePreloadPath = path.join(__dirname, 'compile-preload.js');
const compilePreloadContent = `
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Compiling preload script...');

try {
  // Compile the preload.ts file to preload.js
  execSync(\`tsc -p \${path.join(__dirname, 'tsconfig.preload.json')}\`, { stdio: 'inherit' });
  
  // Also compile directly to src/main for development
  execSync(\`tsc \${path.join(__dirname, 'src', 'main', 'preload.ts')} --outDir \${path.join(__dirname, 'src', 'main')} --target ES2018 --module CommonJS\`, { stdio: 'inherit' });
  
  console.log('Preload script successfully compiled');
} catch (error) {
  console.error('Error compiling preload script:', error);
  process.exit(1);
}
`;

fs.writeFileSync(compilePreloadPath, compilePreloadContent);
console.log('Created compile-preload.js script');

// Update package.json to use the new scripts
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Backup the original package.json
fs.writeFileSync(`${packageJsonPath}.backup`, JSON.stringify(packageJson, null, 2));

// Update scripts
packageJson.scripts = {
  ...packageJson.scripts,
  "fix:vite": "node fix-vite-config.js",
  "dev:preload": "node compile-preload.js",
  "dev:electron": "npm run dev:preload && wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .",
  "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:electron\""
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json scripts');

console.log('All fixes have been applied. Run "npm run dev" to start the application.');