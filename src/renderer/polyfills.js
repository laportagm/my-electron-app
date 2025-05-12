// Add polyfills for Electron environment that aren't available in ESM
// This file should be imported before any other imports in index.tsx

if (typeof window !== 'undefined' && typeof global === 'undefined') {
  window.global = window;
}

// Create polyfills for __dirname and __filename in ESM context
if (typeof global !== 'undefined' && typeof __dirname === 'undefined') {
  // @ts-ignore
  global.__dirname = import.meta.url
    ? new URL('.', import.meta.url).pathname 
    : process.cwd();
    
  // @ts-ignore
  global.__filename = import.meta.url
    ? new URL(import.meta.url).pathname
    : `${process.cwd()}/unknown-file.js`;
}

// Add process object if not available
if (typeof process === 'undefined') {
  // @ts-ignore
  window.process = {
    env: {
      NODE_ENV: 'development'
    }
  };
}

console.log('Polyfills loaded');