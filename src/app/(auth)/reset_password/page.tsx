'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleUpdate() {
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Parolele nu coincid')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

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
        <h1 className="text-2xl font-bold text-white mb-2">Parolă nouă</h1>
        <p className="text-slate-400 mb-8">Alege o parolă nouă pentru contul tău</p>

        <div className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Parolă nouă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          />
          <input
            type="password"
            placeholder="Confirmă parola"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleUpdate}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
          >
            {loading ? 'Se salvează...' : 'Salvează parola'}
          </button>
        </div>
      </div>
    </main>
  )
}
