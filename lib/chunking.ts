interface Chunk {
  content: string
  index: number
}

export function chunkText(
  text: string,
  chunkSize: number = 20000,
  overlap: number = 200
): Chunk[] {
  // Split by double newlines (paragraphs) first
  const paragraphs = text.split(/\n\n+/)
  const chunks: Chunk[] = []
  let currentChunk = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
      })
      chunkIndex++

      // Start new chunk with overlap (last N chars of previous chunk)
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + '\n\n' + paragraph
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
    })
  }

  // If no chunks were created (very short text), create one chunk
  if (chunks.length === 0) {
    chunks.push({
      content: text.trim(),
      index: 0,
    })
  }

  return chunks
}