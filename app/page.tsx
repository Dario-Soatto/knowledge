import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { signOut } from './actions/auth'
import UrlInput from './components/url-input'
import Chat from './components/chat'
import Graph from './components/graph'

export default async function Home() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch user's documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header with user info and sign out */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Knowledge Base
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* URL Input */}
        <UrlInput />

        {/* Three column layout: Documents + Graph + Chat */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Documents List */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 h-[600px] overflow-y-auto">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
              Saved Content
            </h2>
            
            {!documents || documents.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                No documents yet. Add a URL above to get started!
              </p>
            ) : (
              <ul className="space-y-3">
                {documents.map((doc) => (
                  <li 
                    key={doc.id}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <h3 className="font-medium text-black dark:text-white mb-1 text-sm">
                      {doc.title || 'Untitled'}
                    </h3>
                    <a 
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {doc.url}
                    </a>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Graph */}
          <Graph />

          {/* Chat */}
          <Chat />
        </div>
      </div>
    </div>
  )
}