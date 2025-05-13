# Vitest Configuration

This directory contains configuration files for Vitest testing framework.

## Fixed Configuration

For tests that need TextEncoder compatibility fixes, use:

```bash
npm run test:fixed
```

This runs tests with the patched TextEncoder implementation that correctly handles 
`instanceof Uint8Array` checks in ESM environments.