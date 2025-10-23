import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    // 1. Get the message from the request
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 2. Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 3. Generate embedding for the question
    console.log('Generating query embedding...')
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // 4. Search for similar chunks - get top 15, then filter to best 5
    console.log('Searching for relevant chunks...')
    const { data: matches, error: searchError } = await supabase
      .rpc('match_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.0, // No hard threshold - always return something
        match_count: 15, // Get more results to choose from
        filter_user_id: user.id,
      })

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search chunks' },
        { status: 500 }
      )
    }

    if (!matches || matches.length === 0) {
      console.warn('No chunks found for user')
      return NextResponse.json({
        response: "I don't have any documents in your knowledge base yet. Please add some URLs first!",
        sources: [],
      })
    }

    // Sort by similarity and take top 5
    const topMatches = matches
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 5)

    console.log('Found matches:', topMatches.length)
    topMatches.forEach((m: any, i: number) => {
      console.log(`Match ${i + 1}: similarity=${m.similarity.toFixed(3)}, preview="${m.content.substring(0, 80)}..."`)
    })

    // 5. Fetch document info for the matched chunks
    const documentIds = [...new Set(topMatches.map((m: any) => m.document_id))]
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, url')
      .in('id', documentIds)

    const documentsMap = new Map(documents?.map(d => [d.id, d]) || [])

    // 6. Build rich context with numbered sources
    const context = topMatches
      .map((match: any, index: number) => {
        const doc = documentsMap.get(match.document_id)
        return `[Source ${index + 1} - "${doc?.title || 'Untitled'}" (similarity: ${match.similarity.toFixed(2)})]\n${match.content}`
      })
      .join('\n\n---\n\n')

    // 7. Generate response with improved prompt
    console.log('Generating response...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on the user's saved knowledge base.

When answering:
- Use ONLY information from the provided sources below
- If the sources don't contain enough information, say so honestly
- Cite sources when making claims
- Be thorough but concise
- If information seems partially relevant, mention what you found

Sources:
${context}`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 800, // Increased for more thorough answers
    })

    const response = completion.choices[0].message.content

    // 8. Return response with similarity scores
    const sources = topMatches.map((m: any) => {
      const doc = documentsMap.get(m.document_id)
      return { 
        title: doc?.title || 'Untitled',
        url: doc?.url,
        similarity: parseFloat(m.similarity.toFixed(3)),
      }
    })
    // Deduplicate by URL
    .filter((s: any, i: number, arr: any[]) => 
      arr.findIndex(a => a.url === s.url) === i
    )

    return NextResponse.json({ 
      response,
      sources,
      matchCount: topMatches.length,
      averageSimilarity: (topMatches.reduce((sum: number, m: any) => sum + m.similarity, 0) / topMatches.length).toFixed(3)
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
