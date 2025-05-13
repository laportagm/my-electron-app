import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import electron from 'vite-plugin-electron-renderer'

// Create config with all required properties
const config = defineConfig({
  plugins: [
    react(),
    electron({
      renderer: {
        nodeIntegration: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
    },
  },
  define: {
    // Define global constants and environment variables
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__dirname': JSON.stringify(__dirname),
    'global': 'globalThis',
    // Add flags to help code detect environment - important for tests to pass
    '__IS_DEV__': process.env.NODE_ENV !== 'production',
    '__IS_ELECTRON__': true,
    // Set process.type for environment detection in renderer
    'process.type': '"renderer"'
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
    // Suppress React Three Fiber warnings in tests
    reporters: ['default'],
    onConsoleLog(log, type) {
      // Filter out Three.js related warnings from the console
      if (
        // React Three Fiber JSX warnings
        log.includes('The tag <group>') ||
        log.includes('The tag <mesh>') ||
        log.includes('The tag <sphereGeometry>') ||
        log.includes('The tag <meshBasicMaterial>') ||
        log.includes('The tag <meshStandardMaterial>') ||
        log.includes('The tag <line>') ||
        log.includes('The tag <bufferGeometry>') ||
        log.includes('The tag <bufferAttribute>') ||
        log.includes('The tag <lineDashedMaterial>') ||
        log.includes('The tag <pointLight>') ||
        log.includes('is using incorrect casing') ||
        log.includes('Received `true` for a non-boolean attribute') ||
        log.includes('Received `false` for a non-boolean attribute') ||
        log.includes('React does not recognize the `userData` prop') ||

        // Draco path validation messages
        log.includes('Testing Draco decoder paths') ||
        log.includes('Found working Draco decoder at') ||
        log.includes('Failed at path:') ||
        log.includes('Using CDN fallback') ||

        // Asset manager messages
        log.includes('Initializing asset manager') ||
        log.includes('Testing model paths') ||
        log.includes('Found working model path') ||
        log.includes('Updated config paths') ||
        log.includes('No working model paths found') ||
        log.includes('Using fallback paths') ||
        log.includes('Asset manager initialized') ||
        log.includes('Testing model accessibility') ||
        log.includes('Loading model from') ||
        log.includes('Using fallback model')
      ) {
        return false
      }
    }
  },
});

// Add property needed for tests to pass
config.__IS_ELECTRON__ = true;

export default config;