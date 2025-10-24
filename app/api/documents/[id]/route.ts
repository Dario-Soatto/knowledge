import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete the document (RLS ensures user can only delete their own)
    // Chunks will be automatically deleted due to ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Extra safety check

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}