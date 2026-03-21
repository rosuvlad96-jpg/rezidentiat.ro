'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main
      style={{ background: '#020917', minHeight: '100vh' }}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
        <h1 className="text-2xl font-bold text-white mb-2">Creează cont</h1>
        <p className="text-slate-400 mb-8">Începe să înveți pentru rezidențiat</p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nume complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          />
          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
          >
            {loading ? 'Se încarcă...' : 'Creează cont'}
          </button>

          <p className="text-slate-400 text-sm text-center">
            Ai deja cont?{' '}
            <Link href="/login" className="text-sky-400 hover:underline">
              Intră în cont
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}