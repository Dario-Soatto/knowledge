'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeleteDocumentButtonProps {
  documentId: string
  documentTitle: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  onDeleteSuccess?: () => void
}

export default function DeleteDocumentButton({
  documentId,
  documentTitle,
  size = 'icon',
  variant = 'ghost',
  onDeleteSuccess,
}: DeleteDocumentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    setLoading(true)
  
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        console.error('Delete failed:', response.status, data)
        throw new Error(data.error || 'Failed to delete document')
      }
  
      // Call success callback or refresh page
      if (onDeleteSuccess) {
        onDeleteSuccess()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>"{documentTitle}"</strong>? 
            This will remove it from your knowledge base and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}