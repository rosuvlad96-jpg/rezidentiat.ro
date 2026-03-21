import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main
      style={{ background: '#020917', minHeight: '100vh' }}
      className="flex items-center justify-center"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Bun venit, {user.email}</p>
      </div>
    </main>
  )
}