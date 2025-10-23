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

    // 4. Search for similar documents using the match_documents function
    console.log('Searching for relevant documents...')
    const { data: matches, error: searchError } = await supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Minimum similarity score (0-1)
        match_count: 5, // Number of documents to retrieve
        filter_user_id: user.id,
      })

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search documents' },
        { status: 500 }
      )
    }

    // 5. Build context from matched documents
    const context = matches && matches.length > 0
      ? matches
          .map((match: any) => `Source: ${match.title}\nURL: ${match.url}\n\n${match.content}`)
          .join('\n\n---\n\n')
      : 'No relevant documents found.'

    // 6. Generate response with GPT-4
    console.log('Generating response...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on the user's saved knowledge base. 
          
Use the following context to answer the question. If the context doesn't contain relevant information, say so honestly.

Context:
${context}`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const response = completion.choices[0].message.content

    return NextResponse.json({ 
      response,
      sources: matches?.map((m: any) => ({ title: m.title, url: m.url })) || []
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
