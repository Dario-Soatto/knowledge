'use client'

import { useState } from 'react'
import Graph from './graph'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Document {
  id: string
  title: string
  url: string
  created_at: string
}

interface GraphWithDocsProps {
  documents: Document[]
}

export default function GraphWithDocs({ documents }: GraphWithDocsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="h-[600px] flex flex-col">
      {/* Graph */}
      <div className="flex-1 overflow-hidden">
        <Graph />
      </div>

      {/* Collapsible Documents List */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
        <div className="bg-card rounded-lg border shadow-sm">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                  Saved Content
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({documents.length})
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4 pt-0 max-h-[200px] overflow-y-auto">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents yet. Add a URL above to get started!
                </p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li 
                      key={doc.id}
                      className="border rounded-md p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <a 
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate flex-1"
                          title={doc.title || 'Untitled'}
                        >
                          {doc.title || 'Untitled'}
                        </a>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  )
}
