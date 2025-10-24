import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { searchParams } = new URL(request.url)
    const similarityThreshold = parseFloat(searchParams.get('threshold') || '0.6')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all user's documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title, url')
      .eq('user_id', user.id)

    if (docError) {
      console.error('Database error:', docError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ nodes: [], links: [] })
    }

    // Fetch all chunks for these documents
    const { data: chunks, error: chunksError } = await supabase
      .from('chunks')
      .select('document_id, content_embedding')
      .eq('user_id', user.id)

    if (chunksError) {
      console.error('Chunks error:', chunksError)
      return NextResponse.json(
        { error: 'Failed to fetch chunks' },
        { status: 500 }
      )
    }

    // Group chunks by document and average their embeddings
    const documentEmbeddings = new Map<string, number[]>()

    for (const chunk of chunks || []) {
      if (!chunk.content_embedding) continue
      
      const embedding = typeof chunk.content_embedding === 'string' 
        ? JSON.parse(chunk.content_embedding) 
        : chunk.content_embedding

      if (!documentEmbeddings.has(chunk.document_id)) {
        documentEmbeddings.set(chunk.document_id, embedding)
      } else {
        // Average with existing embeddings
        const existing = documentEmbeddings.get(chunk.document_id)!
        const averaged = existing.map((val, i) => (val + embedding[i]) / 2)
        documentEmbeddings.set(chunk.document_id, averaged)
      }
    }

    // Create nodes
    const nodes = documents
      .filter(doc => documentEmbeddings.has(doc.id))
      .map(doc => ({
        id: doc.id,
        name: doc.title || 'Untitled',
        url: doc.url,
      }))

    // Calculate similarities between documents using averaged embeddings
    const links: Array<{ source: string; target: string; value: number }> = []

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const docA = nodes[i]
        const docB = nodes[j]
        
        const embeddingA = documentEmbeddings.get(docA.id)
        const embeddingB = documentEmbeddings.get(docB.id)

        if (embeddingA && embeddingB) {
          const similarity = cosineSimilarity(embeddingA, embeddingB)

          if (similarity > similarityThreshold) {
            links.push({
              source: docA.id,
              target: docB.id,
              value: similarity,
            })
          }
        }
      }
    }

    return NextResponse.json({ nodes, links })
  } catch (error) {
    console.error('Graph data error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
