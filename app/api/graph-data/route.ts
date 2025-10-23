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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all user's documents with embeddings
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('id, title, url, content_embedding')
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ nodes: [], links: [] })
    }

    // Create nodes
    const nodes = documents.map(doc => ({
      id: doc.id,
      name: doc.title || 'Untitled',
      url: doc.url,
    }))

    // Calculate similarities and create links
    const links: Array<{ source: string; target: string; value: number }> = []
    const similarityThreshold = 0.6 // Only show connections above this threshold

    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const docA = documents[i]
        const docB = documents[j]

        if (docA.content_embedding && docB.content_embedding) {
          // Convert embeddings to arrays if they're strings
          const embeddingA = typeof docA.content_embedding === 'string' 
            ? JSON.parse(docA.content_embedding) 
            : docA.content_embedding
          const embeddingB = typeof docB.content_embedding === 'string' 
            ? JSON.parse(docB.content_embedding) 
            : docB.content_embedding

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
