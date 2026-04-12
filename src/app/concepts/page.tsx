'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeakTopic {
  topic_id: string
  topic_name: string
  domain_name: string
  accuracy: number
  total_attempts: number
  weak_concept_count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accuracyColor(accuracy: number): string {
  if (accuracy < 0.35) return '#ef4444'
  if (accuracy < 0.55) return '#f97316'
  if (accuracy < 0.70) return '#eab308'
  return '#22c55e'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TopicsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<WeakTopic[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadTopics() {
      try {
        const res = await fetch('/api/topics/weak')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setTopics(data)
      } catch (err: any) {
        setErrorMessage(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTopics()
  }, [])

  const displayed = showAll ? topics : topics.slice(0, 5)

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se încarcă subiectele...</p>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <h1 style={s.title}>Subiecte de îmbunătățit</h1>
        <p style={s.subtitle}>Sortate de la cel mai slab la cel mai bun</p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div style={s.errorBox}>
          <p style={s.errorText}>{errorMessage}</p>
        </div>
      )}

      {/* Empty state */}
      {!errorMessage && topics.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.emptyIcon}>📚</p>
          <p style={s.emptyTitle}>Încă nu ai subiecte de îmbunătățit</p>
          <p style={s.emptySubtitle}>
            Începe să răspunzi la întrebări și îți vom arăta unde ai nevoie de mai multă practică
          </p>
        </div>
      )}

      {/* Topic list */}
      {displayed.length > 0 && (
        <div style={s.list}>
          {displayed.map((topic, index) => (
            <div key={topic.topic_id} style={s.card}>
              <div style={s.cardLeft}>
                <div style={s.rank}>#{index + 1}</div>
                <div style={s.cardInfo}>
                  <p style={s.topicName}>{topic.topic_name}</p>
                  <p style={s.domainName}>{topic.domain_name}</p>
                  <p style={s.attempts}>
                    {topic.total_attempts} încercări
                    {topic.weak_concept_count > 0 && (
                      <span style={s.weakCount}>
                        {' · '}{topic.weak_concept_count} concepte slabe
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div style={s.cardRight}>
                <span
                  style={{
                    ...s.accuracyBadge,
                    color: accuracyColor(topic.accuracy),
                    borderColor: accuracyColor(topic.accuracy),
                  }}
                >
                  {Math.round(topic.accuracy * 100)}%
                </span>
                <button
                  style={s.drillBtn}
                  onClick={() => router.push(`/topics/${topic.topic_id}/drill`)}
                >
                  Îmbunătățește
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show more / less */}
      {topics.length > 5 && (
        <div style={s.showMoreRow}>
          <button style={s.showMoreBtn} onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Arată mai puține' : `Vezi toate (${topics.length})`}
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
  emptySubtitle: { fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 },
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
  topicName: { fontSize: '15px', color: '#f1f5f9', fontWeight: 600, margin: '0 0 4px' },
  domainName: { fontSize: '12px', color: '#64748b', margin: '0 0 4px' },
  attempts: { fontSize: '11px', color: '#475569', margin: 0 },
  weakCount: { color: '#f97316' },
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
}