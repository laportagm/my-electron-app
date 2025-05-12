import React, { useState } from 'react';

interface ChatUIProps {
  className?: string;
}

/**
 * Simple ChatUI component for brain model assistant
 * This is a replacement component to avoid naming conflicts
 */
const ChatUIComponent: React.FC<ChatUIProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hello! I\'m your brain anatomy assistant. How can I help you?' }
  ]);
  const [input, setInput] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    setMessages(msgs => [...msgs, { role: 'user', content: input }]);
    
    // Simulate assistant response
    setTimeout(() => {
      setMessages(msgs => [
        ...msgs, 
        { 
          role: 'assistant', 
          content: 'This is a mock response. The LLM integration is not yet active in this build.'
        }
      ]);
    }, 1000);
    
    // Clear input
    setInput('');
  };
  
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      <div className="bg-blue-100 dark:bg-blue-900 p-4">
        <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
          Brain Anatomy Assistant
        </h2>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`${
              msg.role === 'user' 
                ? 'bg-blue-100 dark:bg-blue-900 ml-8' 
                : 'bg-gray-100 dark:bg-gray-700 mr-8'
            } p-3 rounded-lg`}
          >
            <p className="text-sm font-semibold mb-1">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </p>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about brain anatomy..."
            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatUIComponent;