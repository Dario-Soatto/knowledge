import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { openai } from '@ai-sdk/openai'
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai'
import type { MyUIMessage } from '@/ai/types'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    // 1. Parse the request body
    const { messages }: { messages: MyUIMessage[] } = await request.json()

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 })
    }

    // Get the last user message for RAG
    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join(' ')

    // 2. Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 3. Create the UI message stream
    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
        // 4. Generate embedding for the question
        console.log('Generating query embedding...')
        const embeddingResponse = await openai.embedding('text-embedding-3-small')
          .doEmbed({ values: [userQuery] })

        const queryEmbedding = embeddingResponse.embeddings[0]

        // 5. Search for similar chunks
        console.log('Searching for relevant chunks...')
        const { data: matches, error: searchError } = await supabase
          .rpc('match_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.0,
            match_count: 15,
            filter_user_id: user.id,
          })

        if (searchError) {
          console.error('Search error:', searchError)
          throw new Error('Failed to search chunks')
        }

        if (!matches || matches.length === 0) {
          console.warn('No chunks found for user')
          
          // Stream a response without sources
          const result = streamText({
            model: openai('gpt-4o-mini'),
            messages: convertToModelMessages(messages),
            temperature: 0.7,
          })

          writer.merge(result.toUIMessageStream())
          return
        }

        // 6. Sort and take top 5
        const topMatches = matches
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .slice(0, 5)

        console.log('Found matches:', topMatches.length)
        topMatches.forEach((m: any, i: number) => {
          console.log(`Match ${i + 1}: similarity=${m.similarity.toFixed(3)}`)
        })

        // 7. Fetch document info
        const documentIds = [...new Set(topMatches.map((m: any) => m.document_id))]
        const { data: documents } = await supabase
          .from('documents')
          .select('id, title, url')
          .in('id', documentIds)

        const documentsMap = new Map(documents?.map(d => [d.id, d]) || [])

        // 8. Stream sources to the client
        topMatches.forEach((match: any) => {
          const doc = documentsMap.get(match.document_id)
          if (doc) {
            writer.write({
              type: 'source-url',
              sourceId: match.id,
              url: doc.url,
              title: doc.title,
            })
          }
        })

        // 9. Build context for the LLM
        const context = topMatches
          .map((match: any, index: number) => {
            const doc = documentsMap.get(match.document_id)
            return `[Source ${index + 1} - "${doc?.title || 'Untitled'}" (similarity: ${match.similarity.toFixed(2)})]\n${match.content}`
          })
          .join('\n\n---\n\n')

        // 10. Stream the LLM response
        const result = streamText({
          model: openai('gpt-4o-mini'),
          messages: convertToModelMessages(messages),
          system: `You are a helpful assistant that answers questions based on the user's saved knowledge base.

When answering:
- Use ONLY information from the provided sources below
- If the sources don't contain enough information, say so honestly
- When you make any claim, cite your source with the link to the source
- Be thorough but concise
- If information seems partially relevant, mention what you found

Sources:
${context}`,
          temperature: 0.7,
        })

        // 11. Merge the text stream into the UI message stream
        writer.merge(result.toUIMessageStream())
      },
    })

    // 12. Return the streaming response
    return createUIMessageStreamResponse({ stream })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
