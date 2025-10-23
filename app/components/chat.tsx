'use client'

import { useChat } from '@ai-sdk/react'
import { useState } from 'react'
import type { MyUIMessage } from '@/ai/types'
import { Response } from '@/components/ai-elements/response'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

export default function Chat() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat<MyUIMessage>()

  return (
    <div className="bg-card rounded-lg border shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Ask Questions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ask anything about your saved content
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              No messages yet. Start by asking a question!
            </p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%] space-y-2">
                {message.parts.some(part => part.type === 'text') && (
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.parts
                      .filter(part => part.type === 'text')
                      .map((part, index) => (
                        <div key={`${message.id}-${index}`} className="text-sm">
                          <Response 
                            isAnimating={status === 'streaming' && message.id === messages[messages.length - 1]?.id}
                          >
                            {part.text}
                          </Response>
                        </div>
                      ))}
                  </div>
                )}

                {message.role === 'assistant' && 
                 messages.filter(m => m.role === 'assistant').indexOf(message) === messages.filter(m => m.role === 'assistant').length - 1 &&
                 message.parts.some(part => part.type === 'source-url') && (
                  <div className="bg-muted/50 rounded-lg border p-3">
                    <p className="text-xs font-semibold mb-2">Sources</p>
                    <div className="space-y-1">
                      {message.parts
                        .filter(part => part.type === 'source-url')
                        .map((part, i) => (
                          <div key={`${message.id}-source-${i}`} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground">{i + 1}.</span>
                            <a
                              href={part.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate"
                              title={part.title}
                            >
                              {part.title}
                            </a>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={e => {
            e.preventDefault()
            if (input.trim()) {
              sendMessage({ text: input })
              setInput('')
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={e => setInput(e.currentTarget.value)}
            placeholder="Ask a question..."
            disabled={status !== 'ready'}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={status !== 'ready' || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
