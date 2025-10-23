import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'
import FirecrawlApp from '@mendable/firecrawl-js'
import { chunkText } from '@/lib/chunking'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    // 1. Get the URL from the request
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
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

    // 3. Scrape the URL with Firecrawl
    console.log('Scraping URL:', url)
    const scrapeResult = await firecrawl.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      excludeTags: ['nav', 'footer', 'aside', 'script', 'style', 'form'],
      removeBase64Images: true,
    })

    if (!scrapeResult.markdown) {
      return NextResponse.json(
        { error: 'Failed to scrape URL' },
        { status: 500 }
      )
    }

    const content = scrapeResult.markdown
    const title = scrapeResult.metadata?.title || new URL(url).hostname

    console.log(`Content length: ${content.length} chars`)

    // 4. Create the document record first
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        url,
        title,
        content,
        content_embedding: null, // We'll store embeddings in chunks
        metadata: scrapeResult.metadata || {},
      })
      .select()
      .single()

    if (docError) {
      console.error('Database error:', docError)
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      )
    }

    // 5. Chunk the content
    const chunks = chunkText(content) // Uses default 20000
    console.log(`Created ${chunks.length} chunks`)

    // 6. Generate embeddings and store chunks
    const chunkRecords = []
    
    for (const chunk of chunks) {
      // Generate embedding for this chunk
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.content,
      })

      const embedding = embeddingResponse.data[0].embedding

      chunkRecords.push({
        document_id: document.id,
        user_id: user.id,
        content: chunk.content,
        content_embedding: embedding,
        chunk_index: chunk.index,
        metadata: {},
      })
    }

    // 7. Bulk insert all chunks
    const { error: chunksError } = await supabase
      .from('chunks')
      .insert(chunkRecords)

    if (chunksError) {
      console.error('Chunks insert error:', chunksError)
      // Clean up document if chunks failed
      await supabase.from('documents').delete().eq('id', document.id)
      return NextResponse.json(
        { error: 'Failed to save chunks' },
        { status: 500 }
      )
    }

    console.log(`Successfully stored ${chunks.length} chunks`)

    return NextResponse.json({ 
      success: true, 
      document,
      chunksCreated: chunks.length
    })
  } catch (error) {
    console.error('Ingestion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
