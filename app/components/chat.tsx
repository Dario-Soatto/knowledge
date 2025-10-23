'use client'

import { useChat } from '@ai-sdk/react'
import { useState } from 'react'
import type { MyUIMessage } from '@/ai/types'

export default function Chat() {
  const [input, setInput] = useState('')
  const { messages, sendMessage } = useChat<MyUIMessage>()

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Ask Questions
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Ask anything about your saved content
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 dark:text-zinc-500 text-center">
              No messages yet. Start by asking a question!
            </p>
          </div>
        ) : (
          messages.map(message => {
            console.log('Message:', message.id, message.role, message.parts.map(p => p.type)); // DEBUG
            return (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] space-y-2`}>
                  {/* Only render text box if there are text parts */}
                  {message.parts.some(part => part.type === 'text') && (
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <div key={`${message.id}-${i}`} className="text-sm whitespace-pre-wrap">
                                {part.text}
                              </div>
                            );
                        }
                      })}
                    </div>
                  )}

                  {/* Render sources for assistant messages - only if this is the last assistant message */}
                  {message.role === 'assistant' && 
                   messages.filter(m => m.role === 'assistant').indexOf(message) === messages.filter(m => m.role === 'assistant').length - 1 &&
                   message.parts.some(part => part.type === 'source-url') && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Sources:
                      </p>
                      <div className="space-y-1">
                        {message.parts
                          .filter(part => part.type === 'source-url')
                          .map((part, i) => (
                            <div key={`${message.id}-source-${i}`} className="flex items-start gap-2">
                              <span className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                                {i + 1}.
                              </span>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={part.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline block truncate"
                                  title={part.title}
                                >
                                  {part.title}
                                </a>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.currentTarget.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
