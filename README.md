# Brain Anatomy Visualizer

An interactive 3D brain anatomy visualization app with AI assistant capabilities.

## Features

- 📊 Interactive 3D visualization of brain structures
- 🧠 Detailed anatomical models of various brain regions
- 💬 AI assistant for answering questions about brain anatomy
- 🌓 Light/dark mode support
- 🔍 Zoom, pan and rotate controls for detailed exploration
- 🔧 Configurable logging for asset loading diagnostics

## Getting Started

### Development Mode

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Production Build

```bash
# For a standard build (with native modules)
npm run build

# For a prototype build (no native dependencies)
./build-prototype.sh
```

## Usage

1. **Navigate the 3D Model**: Use mouse controls to rotate, zoom and pan
2. **Select Brain Structures**: Choose different parts from the side panel
3. **Ask Questions**: Use the AI assistant panel to ask questions about brain anatomy
4. **Toggle Views**: Switch between different visualization modes
5. **Configure Logging**: Use the logging controls (info icon) to adjust verbosity of asset and model loading logs

## Project Structure

- `src/main`: Electron main process
- `src/renderer`: React frontend application
- `src/renderer/components`: React components including 3D visualizations
- `src/renderer/llm`: AI assistant integration
- `src/renderer/utils`: Utility functions for model loading and management
- `public/assets/models`: 3D brain models (GLB format)

## Build Options

The project supports several build configurations:

1. **Full Build with LLM**: Includes local LLM integration using node-llama-cpp
   - Requires C++ build tools and Python
   - `npm run build`

2. **Prototype Build**: UI only with simulated AI responses
   - No native dependencies required
   - `./build-prototype.sh`

3. **Platform-specific Builds**:
   - `npm run build:mac`
   - `npm run build:win`
   - `npm run build:linux`

## Adding Custom Models

1. Place GLB files in `public/assets/models/`
2. Add model metadata to `src/renderer/utils/modelRegistry.ts`
3. Restart the application

## AI Assistant Information

The AI assistant can:
- Answer questions about brain structures and anatomy
- Explain the function of different brain regions
- Reference the currently selected 3D model

## Troubleshooting

### Rollup Native Module Errors

If you encounter errors related to missing Rollup native modules (e.g., `@rollup/rollup-darwin-x64`), you can fix them with:

```bash
# Fix Rollup native module issues
npm run fix:rollup
```

This is a common issue with npm's optional dependencies. The fix script:
1. Removes node_modules and package-lock.json
2. Clears npm cache
3. Reinstalls dependencies with native modules disabled

Alternatively, you can run these commands manually:
```bash
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force
export ROLLUP_NATIVE_MODULES=false
npm install --no-optional
```

### Electron Path.join Error

If you encounter an error like `Uncaught TypeError: path.join is not a function`, it's because Node.js APIs aren't properly exposed to the renderer process. Fix it with:

```bash
# Fix Electron path.join error
npm run fix:path
```

When using Node.js modules like `path` in the renderer process, always use them through the Electron preload bridge:

```javascript
// ❌ DON'T do this in renderer:
import path from 'path';
path.join(__dirname, 'file.txt');

// ✅ DO this instead:
window.electron.path.join(__dirname, 'file.txt');
```

The preload script safely exposes these Node.js APIs in a controlled way.

## License

ISC