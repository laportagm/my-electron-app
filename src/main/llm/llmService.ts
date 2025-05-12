import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { logger } from '../../utils/logger';

// Mock implementations for type safety
class MockLlamaModel {
  constructor(options: any) {
    logger.info('Creating mock LlamaModel with options:', options);
  }

  async dispose() {
    logger.info('Disposing mock LlamaModel');
  }
}

class MockLlamaContext {
  constructor(options: any) {
    logger.info('Creating mock LlamaContext with options:', options);
  }
}

class MockLlamaChatSession {
  constructor(options: any) {
    logger.info('Creating mock LlamaChatSession with options:', options);
  }

  async prompt(text: string): Promise<string> {
    logger.info(`Received prompt: ${text}`);
    return `Mock response to: ${text}`;
  }
}

// Global model instance
let model: MockLlamaModel | null = null;
let context: MockLlamaContext | null = null;
let session: MockLlamaChatSession | null = null;

// Get the directory where models are stored
const getModelsDir = () => {
  return path.join(app.getPath('userData'), 'llm-models');
};

// Initialize the LLM service
export function initializeLLMService() {
  // Register IPC handlers for LLM operations
  ipcMain.handle('llm:load-model', async (_event, modelName: string, systemPrompt: string) => {
    try {
      return await loadModel(modelName, systemPrompt);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to load model ${modelName}:`, e);
      throw e;
    }
  });
  
  ipcMain.handle('llm:is-loaded', () => {
    return model !== null && context !== null && session !== null;
  });
  
  ipcMain.handle('llm:get-available-models', async () => {
    try {
      return await getAvailableModels();
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to get available models:', e);
      throw e;
    }
  });
  
  ipcMain.handle('llm:generate', async (_event, prompt: string) => {
    try {
      return await generateResponse(prompt);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to generate response:', e);
      throw e;
    }
  });
  
  ipcMain.handle('llm:reset-chat', (_event, systemPrompt: string) => {
    try {
      return resetChat(systemPrompt);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to reset chat:', e);
      throw e;
    }
  });
  
  logger.info('LLM service initialized');
}

// Clean up LLM resources
export async function cleanupLLMService() {
  if (model) {
    session = null;
    context = null;
    try {
      await model.dispose();
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      logger.error('Error disposing LLM model:', e);
    }
    model = null;
  }
  logger.info('LLM service cleaned up');
}

// Get list of available models
async function getAvailableModels(): Promise<string[]> {
  const modelsDir = getModelsDir();
  
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
      return [];
    }
    
    // Get list of GGUF files
    const files = await fs.promises.readdir(modelsDir);
    return files.filter(file => file.endsWith('.gguf'));
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to read models directory ${modelsDir}:`, e);
    throw e;
  }
}

// Load a model from the models directory
async function loadModel(modelName: string, systemPrompt: string): Promise<{ success: boolean, error?: string }> {
  // Clean up previous model if it exists
  if (model) {
    session = null;
    context = null;
    try {
      await model.dispose();
    } catch (error) {
      logger.warn('Error disposing model:', error);
    }
    model = null;
  }
  
  try {
    const modelsDir = getModelsDir();
    const modelPath = path.join(modelsDir, modelName);
    
    if (!fs.existsSync(modelPath)) {
      return { 
        success: false, 
        error: `Model file not found: ${modelPath}` 
      };
    }
    
    logger.info(`Loading model from: ${modelPath}`);
    
    // Load the model
    model = new MockLlamaModel({
      modelPath,
      gpuLayers: 0, // CPU only for compatibility
      threads: Math.max(1, (require('os').cpus().length - 1))
    });

    // Create context
    context = new MockLlamaContext({ model });

    // Create session with system prompt
    session = new MockLlamaChatSession({
      context: context,
      systemPrompt
    });
    
    logger.info(`Successfully loaded model: ${modelName}`);
    
    return { success: true };
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to load model ${modelName}:`, e);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Generate a response from the model
async function generateResponse(prompt: string): Promise<{ success: boolean, response?: string, error?: string }> {
  if (!model || !context || !session) {
    return { 
      success: false, 
      error: 'Model not loaded. Please load a model first.'
    };
  }
  
  try {
    logger.info('Generating response...');
    const response = await session.prompt(prompt);
    logger.info('Response generated successfully');
    
    return { success: true, response };
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to generate response:', e);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Reset the chat session
function resetChat(systemPrompt: string): { success: boolean, error?: string } {
  if (!model || !context) {
    return { 
      success: false, 
      error: 'Model not loaded. Please load a model first.'
    };
  }
  
  try {
    // Create a new chat session with the same context
    session = new MockLlamaChatSession({
      context: context,
      systemPrompt
    });
    
    logger.info('Chat session reset successfully');
    return { success: true };
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to reset chat session:', e);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}