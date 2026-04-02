import Link from 'next/link'

export default function Home() {
  return (
    <main style={s.page}>
      <div style={s.badge}>BETA</div>
      <h1 style={s.title}>Platformă de pregătire pentru Rezidențiat</h1>
      <div style={s.actions}>
        <Link href="/signup" style={s.btnPrimary}>
          Creează cont
        </Link>
        <Link href="/login" style={s.btnSecondary}>
          Ai deja cont? Autentifică-te
        </Link>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#020917',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'DM Sans, sans-serif',
    padding: '0 24px',
    gap: '24px',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#38bdf8',
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: '6px',
    padding: '4px 12px',
    letterSpacing: '0.1em',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#f1f5f9',
    textAlign: 'center',
    maxWidth: '400px',
    lineHeight: 1.3,
    margin: 0,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '320px',
  },
  btnPrimary: {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    textAlign: 'center',
    textDecoration: 'none',
    fontFamily: 'DM Sans, sans-serif',
    display: 'block',
  },
  btnSecondary: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    fontFamily: 'DM Sans, sans-serif',
  },
}