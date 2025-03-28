// app/page.tsx
"use client"

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Add user's message to history
    const userMessage: Message = { role: 'user', content: prompt };
    setHistory(prev => [...prev, userMessage]);
    setPrompt(''); // Clear input
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/mapBot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      // Add assistant's response to history
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setHistory(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      {/* Header */}
      <header className="w-full max-w-3xl mx-auto px-4 pt-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Grok Chat</h1>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Main Content (Chat History) */}
      <main className="flex-grow flex flex-col w-full max-w-3xl mx-auto px-4 py-6 overflow-y-auto">
        {history.length === 0 && !error && !isLoading && (
          <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Start a conversation by asking a question below...</p>
          </div>
        )}
        {history.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-4 rounded-lg ${message.role === 'user' 
              ? (isDarkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-100 border-blue-300') 
              : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')} border shadow-sm animate-in fade-in slide-in-from-bottom-4`}
          >
            <p className={`font-semibold ${message.role === 'user' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
              {message.role === 'user' ? 'You' : 'MapGPT'}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 animate-in fade-in">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {isLoading && (
          <div className="mb-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Grok</p>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Thinking...</p>
          </div>
        )}
        {/* Spacer to push input to bottom */}
        <div className="flex-grow"></div>
      </main>

      {/* Input Form (Fixed at Bottom) */}
      <div className="w-full max-w-3xl mx-auto px-4 pb-4 sticky bottom-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask me anything..."
              className={`w-full p-4 pr-12 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200`}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors duration-200`}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto px-4 py-2 text-sm opacity-70 text-center">
        Powered by xAI • {new Date().getFullYear()}
      </footer>
    </div>
  );
}