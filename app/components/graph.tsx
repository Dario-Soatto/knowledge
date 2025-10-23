'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

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
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Knowledge Graph
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {graphData.nodes.length} documents · {graphData.links.length} connections
        </p>
      </div>

      {/* Graph */}
      <div className="relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeAutoColorBy="id"
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            // Draw node
            const label = node.name
            const fontSize = 12 / globalScale
            ctx.font = `${fontSize}px Sans-Serif`
            
            // Node circle
            ctx.beginPath()
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI)
            ctx.fillStyle = node === selectedNode ? '#3b82f6' : '#6b7280'
            ctx.fill()

            // Label
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#000'
            ctx.fillText(label, node.x, node.y + 10)
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
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ✕
            </button>
            <h3 className="font-semibold text-black dark:text-white mb-2 pr-6">
              {selectedNode.name}
            </h3>
            <a
              href={selectedNode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {selectedNode.url}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
