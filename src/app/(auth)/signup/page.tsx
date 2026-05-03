'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup() {
    setLoading(true)
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('Prenumele și numele sunt obligatorii')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

   // Upsert into users table (insert if missing, update if present)
    if (data.user) {
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          user_tier: 'regular',
        }, {
          onConflict: 'id',
        })

      if (upsertError) {
        setError(`Cont creat dar profil incomplet: ${upsertError.message}`)
        setLoading(false)
        return
      }
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
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Prenume"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            />
            <input
              type="text"
              placeholder="Nume"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            />
          </div>
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
