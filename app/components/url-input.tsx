'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function UrlInput() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ingest URL')
      }

      setSuccess(true)
      setUrl('')
      
      // Refresh the page to show the new document
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <span className="text-sm font-medium whitespace-nowrap">Add URL</span>
        
        <div className="flex-1 relative">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            required
            disabled={loading}
            className="pr-8"
          />
          {error && (
            <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
          {success && (
            <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>

        <Button 
          type="submit" 
          disabled={loading || !url}
          size="sm"
          className="gap-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Adding...</span>
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </>
          )}
        </Button>
      </form>
      
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </div>
  )
}
