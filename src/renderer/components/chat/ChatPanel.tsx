import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/store/useAppStore';
import { Brain, Send, Settings, Loader, X, ArrowUp } from 'lucide-react';

// Sample responses for demo purposes until we implement real LLM integration
const SAMPLE_RESPONSES = {
  default: "I'm your brain anatomy assistant. What would you like to know about the human brain?",
  frontalLobe: "The frontal lobe is the largest lobe of the brain, located at the front of each cerebral hemisphere. It's responsible for executive functions like planning, decision-making, problem-solving, and self-control. It also contains the primary motor cortex which controls voluntary movements.",
  temporalLobe: "The temporal lobe is located beneath the lateral fissure on both cerebral hemispheres. It's involved in processing auditory information, language comprehension, memory formation, and emotion. The primary auditory cortex is found in the temporal lobe.",
  parietalLobe: "The parietal lobe is positioned above the temporal lobe and behind the frontal lobe. It processes sensory information from various parts of the body, plays a key role in spatial awareness, attention, and integrating sensory information.",
  occipitalLobe: "The occipital lobe is the smallest lobe, located at the back of the brain. It contains the visual cortex and is primarily responsible for processing visual information from the eyes, including color recognition, motion detection, and visual recognition.",
  cerebellum: "The cerebellum is located at the back of the brain beneath the occipital lobes. It plays a crucial role in motor control, coordination, precision, and accurate timing of movements. It's also involved in some cognitive functions like attention and language.",
  brainstem: "The brainstem connects the cerebrum with the spinal cord and is composed of the midbrain, pons, and medulla oblongata. It controls many automatic functions like breathing, heart rate, swallowing, and consciousness. Cranial nerves III-XII originate from the brainstem.",
  thalamus: "The thalamus is a walnut-sized structure in the center of the brain that acts as a relay station for sensory and motor signals going to the cerebral cortex. It plays a crucial role in regulating consciousness, sleep, and alertness."
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  className?: string;
}

function ChatPanelComponent({ className = '' }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Brain model state
  const selectedId = useAppStore(state => state.selectedId);

  // Auto-scroll to the most recent message
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Add a message to the chat
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isGenerating) return;

    // Include context about the current brain structure
    let contextualPrompt = input;
    if (selectedId) {
      contextualPrompt = `I'm currently looking at the ${selectedId} brain structure. ${input}`;
    }

    // Add user message
    addMessage('user', input);

    setInput('');
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate response delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate fake response based on query
      let response = SAMPLE_RESPONSES.default;

      // Look for brain part keywords in the input
      const lowerInput = contextualPrompt.toLowerCase();
      if (lowerInput.includes('frontal lobe') || lowerInput.includes('frontal')) {
        response = SAMPLE_RESPONSES.frontalLobe;
      } else if (lowerInput.includes('temporal lobe') || lowerInput.includes('temporal')) {
        response = SAMPLE_RESPONSES.temporalLobe;
      } else if (lowerInput.includes('parietal lobe') || lowerInput.includes('parietal')) {
        response = SAMPLE_RESPONSES.parietalLobe;
      } else if (lowerInput.includes('occipital lobe') || lowerInput.includes('occipital')) {
        response = SAMPLE_RESPONSES.occipitalLobe;
      } else if (lowerInput.includes('cerebellum')) {
        response = SAMPLE_RESPONSES.cerebellum;
      } else if (lowerInput.includes('brainstem')) {
        response = SAMPLE_RESPONSES.brainstem;
      } else if (lowerInput.includes('thalamus')) {
        response = SAMPLE_RESPONSES.thalamus;
      } else if (selectedId) {
        // Try to match the selected model ID
        const modelKey = Object.keys(SAMPLE_RESPONSES).find(key =>
          selectedId.toLowerCase().includes(key.toLowerCase())
        );

        if (modelKey) {
          response = SAMPLE_RESPONSES[modelKey as keyof typeof SAMPLE_RESPONSES];
        }
      }

      // Add the response
      addMessage('assistant', response);
    } catch (err: any) {
      setError(err.message || 'Failed to generate response');
      console.error('Error generating response:', err);
    } finally {
      setIsGenerating(false);

      // Focus back on the input field
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Handle input changes and auto-resize the textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize the textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold">Brain Anatomy Assistant</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            Demo Mode
          </span>

          <button
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            title="LLM Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Brain className="h-12 w-12 mb-4 text-blue-600 dark:text-blue-400" />
            <p className="text-center">
              Ask me any questions about brain anatomy or the structure you're viewing.
            </p>
            <p className="text-sm mt-2">
              I'm in demo mode, but I'm ready to help!
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose dark:prose-invert prose-sm max-w-none"
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <div className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <p className="text-sm">Generating response...</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="max-w-[80%] p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
              <p className="text-sm">Error: {error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about brain anatomy..."
            disabled={isGenerating}
            className="w-full p-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '150px' }}
          />

          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-600 dark:bg-blue-700 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Optional: Keyboard shortcuts help */}
        <div className="flex justify-center mt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
              <ArrowUp className="h-3 w-3" />
            </span>
            <span>to send</span>
          </div>
        </div>
      </form>
    </div>
  );
}

// Export the component to avoid redeclaration issues
export default ChatPanelComponent;