"use client";

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Define the Message interface
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState<string>('');
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, isLoading, error]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = { role: 'user', content: prompt };
    setHistory(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/openai', {
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

      if (!data.response) {
        throw new Error('No response received from the server');
      }

      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setHistory(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch response from MapGPT');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const renderMessageContent = (content: string): React.ReactNode => {
    const cleanedContent = content.replace(/•\s*/g, '').trim();
    const lines = cleanedContent.split('\n').filter(line => line.trim() !== '');

    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let inList = false;

    lines.forEach((line: string, index: number) => {
      // Handle image URLs (e.g., "Here is the image: https://example.com/image.jpg")
      const imageMatch = line.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif))/i);
      if (imageMatch) {
        const imageUrl = imageMatch[0];
        elements.push(
          React.createElement('img', {
            key: `image-${index}`,
            src: imageUrl,
            alt: 'Computer Science Department',
            className: 'mt-2 max-w-full h-auto rounded-lg shadow-md'
          })
        );
        return;
      }

      // Handle numbered lists (e.g., "1. Item")
      if (/^\d+\.\s/.test(line)) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        const [number, ...rest] = line.split('. ');
        const text = rest.join('. ').replace(/\*\*(.*?)\*\*/g, '$1');
        listItems.push(
          React.createElement('li', { key: index, className: 'ml-4 mb-1' },
            React.createElement('span', { className: 'font-semibold' }, `${number}. `),
            React.createElement('span', { className: 'font-medium' }, text)
          )
        );
      } else {
        if (inList) {
          inList = false;
          elements.push(React.createElement('ul', { key: `list-${index}`, className: 'list-none' }, listItems));
        }
        // Handle bold text (e.g., **text**)
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part: string, i: number) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return React.createElement('strong', { key: i, className: 'font-bold' }, boldText);
          }
          return renderInlineLinks(part, i);
        });
        elements.push(React.createElement('p', { key: index, className: 'mt-1 leading-relaxed' }, parts));
      }
    });

    if (inList) {
      elements.push(React.createElement('ul', { key: 'list-end', className: 'list-none' }, listItems));
    }

    return React.createElement('div', null, elements);
  };

  const renderInlineLinks = (text: string, key: number): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const [fullMatch, linkText, url] = match;
      const startIndex = match.index;

      if (startIndex > lastIndex) {
        parts.push(text.slice(lastIndex, startIndex));
      }

      // Explicitly type the props for Link to satisfy TypeScript
      parts.push(
        React.createElement(Link, {
          key: `${key}-${startIndex}`,
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-blue-500 hover:underline'
        } as React.ComponentProps<typeof Link>, linkText)
      );

      lastIndex = startIndex + fullMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return React.createElement('div', {
    className: `min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`
  },
    // Header
    React.createElement('header', {
      className: 'w-full max-w-3xl mx-auto px-4 pt-4 flex justify-between items-center'
    },
      React.createElement('h1', {
        className: 'text-3xl font-bold tracking-tight'
      }, 'Mapoly GPT Chat'),
      React.createElement('button', {
        onClick: () => setIsDarkMode(!isDarkMode),
        className: 'p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
        'aria-label': 'Toggle dark mode'
      }, isDarkMode ? '☀️' : '🌙')
    ),

    // Main Content (Chat History)
    React.createElement('main', {
      ref: chatContainerRef as React.RefObject<HTMLDivElement>,
      className: 'flex-grow flex flex-col w-full max-w-3xl mx-auto px-4 py-6 overflow-y-auto'
    },
      history.length === 0 && !error && !isLoading && React.createElement('div', {
        className: 'flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400'
      },
        React.createElement('p', null, 'Start a conversation by asking about Mapoly or the Computer Science department...')
      ),
      history.map((message: Message, index: number) =>
        React.createElement('div', {
          key: index,
          className: `mb-4 p-4 rounded-lg ${message.role === 'user' 
            ? (isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-100 border-green-300') 
            : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')} border shadow-sm animate-in fade-in slide-in-from-bottom-4 max-w-full break-words`
        },
          React.createElement('p', {
            className: `font-semibold ${message.role === 'user' ? 'text-green-600 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`
          }, message.role === 'user' ? 'You' : 'MapGPT'),
          renderMessageContent(message.content)
        )
      ),
      error && React.createElement('div', {
        className: 'mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 animate-in fade-in'
      },
        React.createElement('p', { className: 'font-semibold' }, 'Error'),
        React.createElement('p', null, error)
      ),
      isLoading && React.createElement('div', {
        className: 'mb-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse'
      },
        React.createElement('p', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'MapGPT'),
        React.createElement('p', { className: 'mt-1 text-gray-500 dark:text-gray-400' }, 'Thinking...')
      )
    ),

    // Input Form (Fixed at Bottom)
    React.createElement('div', {
      className: 'w-full max-w-3xl mx-auto px-4 pb-4 sticky bottom-0'
    },
      React.createElement('form', {
        onSubmit: handleSubmit,
        className: 'flex flex-col gap-4'
      },
        React.createElement('div', { className: 'relative' },
          React.createElement('input', {
            ref: inputRef as React.RefObject<HTMLInputElement>,
            type: 'text',
            value: prompt,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPrompt((e.target as HTMLInputElement).value),
            placeholder: 'Ask about Mapoly, Computer Science, or anything else...',
            className: `w-full p-4 pr-12 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200`,
            disabled: isLoading
          }),
          React.createElement('button', {
            type: 'submit',
            className: `absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors duration-200`,
            disabled: isLoading
          },
            isLoading
              ? React.createElement('svg', {
                  className: 'w-5 h-5 animate-spin',
                  fill: 'none',
                  viewBox: '0 0 24 24'
                },
                  React.createElement('circle', {
                    className: 'opacity-25',
                    cx: '12',
                    cy: '12',
                    r: '10',
                    stroke: 'currentColor',
                    strokeWidth: '4'
                  }),
                  React.createElement('path', {
                    className: 'opacity-75',
                    fill: 'currentColor',
                    d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  })
                )
              : React.createElement('svg', {
                  className: 'w-5 h-5',
                  fill: 'none',
                  stroke: 'currentColor',
                  viewBox: '0 0 24 24'
                },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M9 5l7 7-7 7'
                  })
                )
          )
        )
      )
    )
  );
}