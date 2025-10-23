import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'
import FirecrawlApp from '@mendable/firecrawl-js'

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

    // 4. Generate embedding with OpenAI
    console.log('Generating embedding...')
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })

    const embedding = embeddingResponse.data[0].embedding

    // 5. Store in Supabase
    console.log('Storing in database...')
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        url,
        title,
        content,
        content_embedding: embedding,
        metadata: scrapeResult.metadata || {},
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, document: data })
  } catch (error) {
    console.error('Ingestion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
