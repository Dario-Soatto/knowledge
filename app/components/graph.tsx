'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DeleteDocumentButton from './delete-document-button'

// Dynamically import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
})

interface Node {
  id: string
  name: string
  url: string
  x?: number
  y?: number
}

interface Link {
  source: string | Node
  target: string | Node
  value: number
}

interface GraphData {
  nodes: Node[]
  links: Link[]
}

export default function Graph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const graphRef = useRef<any>(null)
  const [showLabels, setShowLabels] = useState(false) // Add this

  useEffect(() => {
    fetchGraphData()
  }, [])

  async function fetchGraphData() {
    try {
      const response = await fetch('/api/graph-data')
      const data = await response.json()
      console.log('Graph data received:', data) // Add this line
      setGraphData(data)
    } catch (error) {
      console.error('Failed to fetch graph data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
    
    // Center camera on node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000)
      graphRef.current.zoom(2, 1000)
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 flex items-center justify-center h-[600px]">
        <p className="text-zinc-600 dark:text-zinc-400">Loading graph...</p>
      </div>
    )
  }

  if (!graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">
            No documents yet
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Add at least 2 documents to see connections
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Knowledge Graph
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {graphData.nodes.length} documents · {graphData.links.length} connections
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLabels(!showLabels)}
          className="gap-2"
        >
          {showLabels ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hide Labels</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Show Labels</span>
            </>
          )}
        </Button>
      </div>

      {/* Graph */}
      <div className="relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeAutoColorBy="id"
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            // Node circle
            ctx.beginPath()
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI)
            ctx.fillStyle = node === selectedNode ? '#3b82f6' : '#6b7280'
            ctx.fill()

            // Label (only if showLabels is true)
            if (showLabels) {
              const label = node.name
              const fontSize = 12 / globalScale
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = '#000'
              ctx.fillText(label, node.x, node.y + 10)
            }
          }}
          linkWidth={(link: any) => link.value * 2} // Thicker = more similar
          linkColor={() => '#d1d5db'}
          linkDirectionalParticles={0}
          onNodeClick={handleNodeClick}
          width={800}
          height={600}
          backgroundColor="#ffffff"
        />

        {/* Selected node info */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 max-w-xs border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-semibold text-black dark:text-white pr-6">
                {selectedNode.name}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <a
              href={selectedNode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all block mb-3"
            >
              {selectedNode.url}
            </a>
            <DeleteDocumentButton
              documentId={selectedNode.id}
              documentTitle={selectedNode.name}
              variant="ghost"
              size="icon"
            />
          </div>
        )}
      </div>
    </div>
  )
}
