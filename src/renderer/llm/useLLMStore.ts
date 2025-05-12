import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import electronApi from '../electron';

// Type definitions for Electron API
interface ElectronAPI {
  getPath: (name: string) => Promise<string>;
  isPackaged: boolean;

  // File system methods
  readDir: (path: string) => Promise<string[]>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<boolean>;

  // LLM methods
  downloadModel: (url: string, filename: string) => Promise<{success: boolean, path: string, alreadyExists: boolean}>;

  // LLM IPC methods
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;

  // LLM main process methods
  llm: {
    loadModel: (modelName: string, systemPrompt: string) => Promise<{success: boolean, error?: string}>;
    isLoaded: () => Promise<boolean>;
    getAvailableModels: () => Promise<string[]>;
    generate: (prompt: string) => Promise<{success: boolean, response?: string, error?: string}>;
    resetChat: (systemPrompt: string) => Promise<{success: boolean, error?: string}>;
  };

  log: (level: string, message: string) => void;
}

// Declare global window interface for TypeScript
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// Types for LLM state management
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMState {
  // Status
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Model info
  modelName: string;
  availableModels: string[];

  // Chat state
  messages: Message[];
  systemPrompt: string;

  // Download progress
  downloadProgress: {
    filename: string;
    progress: number;
    receivedBytes: number;
    totalBytes: number;
  } | null;

  // Actions
  initialize: () => Promise<void>;
  loadModel: (name: string) => Promise<void>;
  setSystemPrompt: (prompt: string) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
  generateResponse: (prompt: string) => Promise<string>;
  downloadModelFile: (url: string, filename: string) => Promise<boolean>;
}

// Function to check if Electron API is available
const isElectronAvailable = () => {
  return electronApi !== undefined;
};

// Brain anatomy system prompt
const defaultSystemPrompt = `You are an expert brain anatomy teaching assistant.
Your role is to provide accurate, educational information about brain structures, functions, and neuroanatomy.
When answering questions:
- Be concise but thorough
- Use precise anatomical terminology
- Relate structures to their functions and clinical relevance
- When possible, reference visible features in the 3D model the user is viewing
- Avoid speculation and clarify when information is uncertain

Your goal is to help medical students, neuroscience students, and anyone interested in brain anatomy to understand complex neuroanatomical concepts.`;

// LLM store implementation
export const useLLMStore = create<LLMState>()(
  persist(
    (set, get) => {
      // Set up event listeners for download progress
      if (isElectronAvailable()) {
        electronApi.on('llm:download-progress', (data) => {
          set({ downloadProgress: data });
        });

        electronApi.on('llm:download-complete', () => {
          set({ downloadProgress: null });
          // Refresh available models
          get().initialize();
        });

        electronApi.on('llm:download-error', () => {
          set({ downloadProgress: null });
        });
      }

      return {
        // Initial state
        isLoaded: false,
        isLoading: false,
        error: null,
        modelName: '',
        availableModels: [],
        messages: [],
        systemPrompt: defaultSystemPrompt,
        downloadProgress: null,

        // Initialize by scanning for available models
        initialize: async () => {
          try {
            if (!isElectronAvailable()) {
              console.warn('Electron API not available');
              set({ availableModels: [], error: 'Electron API not available' });
              return;
            }

            // Get available models from main process
            const models = await electronApi.llm.getAvailableModels();
            set({ availableModels: models });
            console.log(`Found ${models.length} models`);

            // Check if model is already loaded
            const isModelLoaded = await electronApi.llm.isLoaded();
            set({ isLoaded: isModelLoaded });

            // Auto-load the first model if available and not already loaded
            if (models.length > 0 && !isModelLoaded && !get().isLoading) {
              if (models[0]) {
                get().loadModel(models[0]);
              }
            }
          } catch (error) {
            console.error('Failed to initialize LLM:', error);
            set({
              error: `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`,
              availableModels: []
            });
          }
        },

        // Load a model from the models directory
        loadModel: async (name: string) => {
          const { isLoading, systemPrompt } = get();

          if (isLoading) {
            console.log('Already loading a model, please wait...');
            return;
          }

          if (!isElectronAvailable()) {
            set({ error: 'Electron API not available' });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            // Load the model using the main process
            const result = await electronApi.llm.loadModel(name, systemPrompt);

            if (result.success) {
              set({
                isLoaded: true,
                isLoading: false,
                modelName: name,
                error: null
              });
              console.log(`Successfully loaded model: ${name}`);
            } else {
              set({
                isLoaded: false,
                isLoading: false,
                error: result.error || 'Unknown error loading model'
              });
              console.error(`Failed to load model: ${result.error}`);
            }
          } catch (error) {
            console.error('Failed to load model:', error);
            set({
              isLoading: false,
              isLoaded: false,
              error: `Failed to load model: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        },

        // Set system prompt and reset session if needed
        setSystemPrompt: (prompt: string) => {
          set({ systemPrompt: prompt });

          // Reset the chat session with the new prompt if model is loaded
          if (get().isLoaded && isElectronAvailable()) {
            electronApi.llm.resetChat(prompt)
              .then(result => {
                if (!result.success) {
                  console.error('Failed to reset chat session:', result.error);
                }
              })
              .catch(error => {
                console.error('Error resetting chat session:', error);
              });
          }
        },

        // Add a message to the chat history
        addMessage: (role, content) => {
          set(state => ({
            messages: [...state.messages, { role, content }]
          }));
        },

        // Clear chat history
        clearMessages: () => {
          set({ messages: [] });

          // Reset the chat session with the same prompt if model is loaded
          if (get().isLoaded && isElectronAvailable()) {
            electronApi.llm.resetChat(get().systemPrompt)
              .then(result => {
                if (!result.success) {
                  console.error('Failed to reset chat session:', result.error);
                }
              })
              .catch(error => {
                console.error('Error resetting chat session:', error);
              });
          }
        },

        // Generate a response from the model
        generateResponse: async (prompt: string) => {
          const { isLoaded, addMessage } = get();

          if (!isLoaded) {
            throw new Error('Model not loaded. Please load a model first.');
          }

          if (!isElectronAvailable()) {
            throw new Error('Electron API not available');
          }

          try {
            // Add user message to history
            addMessage('user', prompt);

            // Generate response using the main process
            console.log('Generating response...');
            const result = await electronApi.llm.generate(prompt);

            if (result.success && result.response) {
              console.log('Response generated successfully');

              // Add assistant message to history
              addMessage('assistant', result.response);
              return result.response;
            } else {
              throw new Error(result.error || 'Failed to generate response');
            }
          } catch (error) {
            console.error('Failed to generate response:', error);
            throw error;
          }
        },

        // Download a model file
        downloadModelFile: async (url: string, filename: string) => {
          if (!isElectronAvailable()) {
            throw new Error('Electron API not available');
          }

          try {
            // Start download and update UI
            set({ downloadProgress: { filename, progress: 0, receivedBytes: 0, totalBytes: 0 } });

            // Call the main process to download the model
            const result = await electronApi.downloadModel(url, filename);

            if (result.success) {
              // If it was already downloaded, we still need to manually remove the progress indicator
              if (result.alreadyExists) {
                set({ downloadProgress: null });
              }

              // Refresh list of available models
              await get().initialize();

              return true;
            } else {
              set({ downloadProgress: null });
              return false;
            }
          } catch (error) {
            set({ downloadProgress: null });
            console.error('Failed to download model:', error);
            throw error;
          }
        }
      };
    },
    {
      name: 'llm-store',
      partialize: (state) => ({
        // Only persist these values
        modelName: state.modelName,
        systemPrompt: state.systemPrompt,
        messages: state.messages,
      })
    }
  )
);

// Initialize models when the store is first used
setTimeout(() => {
  if (isElectronAvailable()) {
    useLLMStore.getState().initialize()
      .catch(error => console.error('Error initializing LLM store:', error));
  }
}, 1000); // Small delay to ensure the IPC bridge is ready