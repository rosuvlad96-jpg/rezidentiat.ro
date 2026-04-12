'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleReset() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <main
      style={{ background: '#020917', minHeight: '100vh' }}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
        <h1 className="text-2xl font-bold text-white mb-2">Resetează parola</h1>
        <p className="text-slate-400 mb-8">Îți trimitem un link de resetare pe email</p>

        {success ? (
          <div>
            <p className="text-green-400 text-sm mb-6">
              Am trimis un link de resetare la <strong>{email}</strong>. Verifică inbox-ul.
            </p>
            <Link href="/login" className="text-sky-400 hover:underline text-sm">
              Înapoi la autentificare
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
            >
              {loading ? 'Se trimite...' : 'Trimite link de resetare'}
            </button>

            <p className="text-slate-400 text-sm text-center">
              <Link href="/login" className="text-sky-400 hover:underline">
                Înapoi la autentificare
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
