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

## License

ISC