import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { signOut } from './actions/auth'
import UrlInput from './components/url-input'
import Chat from './components/chat'
import GraphWithDocs from './components/graph-with-docs'

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header with user info and sign out */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            Knowledge Base
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* URL Input */}
        <UrlInput />

        {/* Two column layout: Graph (with docs) + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph with collapsible documents */}
          <GraphWithDocs documents={documents || []} />

          {/* Chat */}
          <Chat />
        </div>
      </div>
    </div>
  )
}