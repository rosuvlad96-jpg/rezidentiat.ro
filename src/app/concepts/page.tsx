'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeakConcept {
  concept_id: string
  accuracy: number
  total_attempts: number
  concepts: {
    name: string
    topics: {
      name: string
      domains: {
        name: string
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accuracyColor(accuracy: number): string {
  if (accuracy < 0.35) return '#ef4444'
  if (accuracy < 0.55) return '#f97316'
  if (accuracy < 0.70) return '#eab308'
  return '#22c55e'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConceptsPage() {
  const router = useRouter()
  const [concepts, setConcepts] = useState<WeakConcept[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadConcepts() {
      try {
        const res = await fetch('/api/concepts/weak?limit=20')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setConcepts(data)
      } catch (err: any) {
        setErrorMessage(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadConcepts()
  }, [])

  const displayed = showAll ? concepts : concepts.slice(0, 5)

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se încarcă conceptele...</p>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>←</button>
        <h1 style={s.title}>Concepte slabe</h1>
        <p style={s.subtitle}>Sortate de la cel mai slab la cel mai bun</p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div style={s.errorBox}>
          <p style={s.errorText}>{errorMessage}</p>
        </div>
      )}

      {/* Empty state */}
      {!errorMessage && concepts.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.emptyIcon}>🎯</p>
          <p style={s.emptyTitle}>Niciun concept slab încă</p>
          <p style={s.emptySubtitle}>
            Răspunde la cel puțin 3 întrebări dintr-un concept pentru a-l vedea aici.
          </p>
          <button style={s.btnPrimary} onClick={() => router.push('/practice')}>
            Începe să exersezi
          </button>
        </div>
      )}

      {/* Concept list */}
      {displayed.length > 0 && (
        <div style={s.list}>
          {displayed.map((item, index) => {
            const concept = item.concepts
            const topic = concept?.topics
            const domain = topic?.domains

            return (
              <div key={item.concept_id} style={s.card}>
                <div style={s.cardLeft}>
                  <div style={s.rank}>#{index + 1}</div>
                  <div style={s.cardInfo}>
                    <p style={s.conceptName}>{concept?.name ?? '—'}</p>
                    <p style={s.conceptMeta}>
                      {domain?.name ?? '—'} · {topic?.name ?? '—'}
                    </p>
                    <p style={s.attempts}>{item.total_attempts} încercări</p>
                  </div>
                </div>
                <div style={s.cardRight}>
                  <span
                    style={{
                      ...s.accuracyBadge,
                      color: accuracyColor(item.accuracy),
                      borderColor: accuracyColor(item.accuracy),
                    }}
                  >
                    {Math.round(item.accuracy * 100)}%
                  </span>
                  <button
                    style={s.drillBtn}
                    onClick={() => router.push(`/drill/${item.concept_id}`)}
                  >
                    Începe exercițiile
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Show more / less */}
      {concepts.length > 5 && (
        <div style={s.showMoreRow}>
          <button style={s.showMoreBtn} onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Arată mai puține' : `Vezi toate (${concepts.length})`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', backgroundColor: '#020917',
    paddingBottom: '80px', fontFamily: 'DM Sans, sans-serif',
  },
  centered: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', backgroundColor: '#020917',
    fontFamily: 'DM Sans, sans-serif',
  },
  loadingText: { color: '#64748b', fontSize: '14px' },
  header: { padding: '32px 20px 16px' },
  backBtn: {
    background: 'none', border: 'none', color: '#94a3b8',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0',
    display: 'block', marginBottom: '12px',
  },
  title: { fontSize: '22px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 6px' },
  subtitle: { fontSize: '13px', color: '#64748b', margin: 0 },
  errorBox: { padding: '0 16px' },
  errorText: { color: '#ef4444', fontSize: '14px' },
  emptyBox: {
    margin: '40px 16px', padding: '32px 24px',
    backgroundColor: '#0f172a', borderRadius: '16px',
    border: '1px solid #1e293b', textAlign: 'center',
  },
  emptyIcon: { fontSize: '40px', margin: '0 0 12px' },
  emptyTitle: { fontSize: '18px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 8px' },
  emptySubtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 },
  list: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px',
    border: '1px solid #1e293b', gap: '12px',
  },
  cardLeft: { display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 },
  rank: {
    fontSize: '12px', color: '#475569', fontWeight: 700,
    minWidth: '24px', paddingTop: '2px',
  },
  cardInfo: { flex: 1 },
  conceptName: { fontSize: '15px', color: '#f1f5f9', fontWeight: 600, margin: '0 0 4px' },
  conceptMeta: { fontSize: '12px', color: '#64748b', margin: '0 0 4px' },
  attempts: { fontSize: '11px', color: '#475569', margin: 0 },
  cardRight: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
  },
  accuracyBadge: {
    fontSize: '14px', fontWeight: 700,
    border: '1px solid', borderRadius: '6px', padding: '3px 8px',
  },
  drillBtn: {
    padding: '8px 12px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff', fontSize: '12px', fontWeight: 600,
    border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
    whiteSpace: 'nowrap',
  },
  showMoreRow: { padding: '16px', textAlign: 'center' },
  showMoreBtn: {
    padding: '10px 24px', borderRadius: '8px',
    border: '1px solid #1e293b', backgroundColor: 'transparent',
    color: '#94a3b8', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
  btnPrimary: {
    padding: '12px 24px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff', fontWeight: 700, fontSize: '14px',
    border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
}