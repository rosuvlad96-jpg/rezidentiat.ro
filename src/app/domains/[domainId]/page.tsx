'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DomainTopic {
  topic_id: string
  topic_name: string
  accuracy: number | null
  total_attempts: number
  weak_concept_count: number
}

interface DomainDetail {
  domain_name: string
  accuracy: number | null
  total_attempts: number
  topics: DomainTopic[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return '#334155'
  if (accuracy < 0.35) return '#ef4444'
  if (accuracy < 0.55) return '#f97316'
  if (accuracy < 0.70) return '#eab308'
  return '#22c55e'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DomainDetailPage() {
  const { domainId } = useParams<{ domainId: string }>()
  const router = useRouter()
  const [domain, setDomain] = useState<DomainDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadDomain() {
      try {
        const res = await fetch(`/api/domains/${domainId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDomain(data)
      } catch (err: any) {
        setErrorMessage(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadDomain()
  }, [domainId])

  if (loading) {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se încarcă domeniul...</p>
      </div>
    )
  }

  if (errorMessage || !domain) {
    return (
      <div style={s.centered}>
        <p style={s.errorText}>{errorMessage || 'Domeniu negăsit'}</p>
        <button style={s.btnSecondary} onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <div style={s.headerInfo}>
          <h1 style={s.title}>{domain.domain_name}</h1>
          <div style={s.domainStats}>
            <span style={{
              ...s.accuracyPill,
              color: accuracyColor(domain.accuracy),
              borderColor: accuracyColor(domain.accuracy),
            }}>
              {domain.accuracy !== null ? `${Math.round(domain.accuracy * 100)}%` : '—'}
            </span>
            <span style={s.attemptsText}>{domain.total_attempts} întrebări răspunse</span>
          </div>
        </div>
      </div>

      {/* Topics list */}
      <div style={s.section}>
        <p style={s.sectionTitle}>Subiecte ({domain.topics.length})</p>
         <div style={s.topicList}>
          {[...domain.topics]
            .sort((a, b) => {
              if (a.total_attempts === 0 && b.total_attempts > 0) return 1
              if (a.total_attempts > 0 && b.total_attempts === 0) return -1
              if (a.accuracy === null && b.accuracy !== null) return 1
              if (a.accuracy !== null && b.accuracy === null) return -1
              return (a.accuracy ?? 1) - (b.accuracy ?? 1)
            })
            .map(topic => (
            <button
              key={topic.topic_id}
              style={s.topicCard}
              onClick={() => router.push(`/topics/${topic.topic_id}`)}
            >
              <div style={s.topicInfo}>
                <p style={s.topicName}>{topic.topic_name}</p>
                {topic.total_attempts > 0 && topic.weak_concept_count > 0 && (
                  <p style={s.weakHint}>{topic.weak_concept_count} concepte de îmbunătățit</p>
                )}
                {topic.total_attempts === 0 && (
                  <p style={s.notAttempted}>0 întrebări răspunse</p>
                )}
              </div>
              <div style={s.topicRight}>
                <span style={{
                  ...s.topicAccuracy,
                  color: accuracyColor(topic.accuracy),
                }}>
                  {topic.accuracy !== null ? `${Math.round(topic.accuracy * 100)}%` : '—'}
                </span>
                <span style={s.arrow}>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
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
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh',
    backgroundColor: '#020917', gap: '16px', fontFamily: 'DM Sans, sans-serif',
  },
  header: { padding: '32px 20px 16px' },
  backBtn: {
    background: 'none', border: 'none', color: '#94a3b8',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0',
    display: 'block', marginBottom: '12px',
  },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '24px', color: '#f1f5f9', fontWeight: 700, margin: 0 },
  domainStats: { display: 'flex', alignItems: 'center', gap: '12px' },
  accuracyPill: {
    fontSize: '13px', fontWeight: 700,
    border: '1px solid', borderRadius: '6px', padding: '3px 8px',
  },
  attemptsText: { fontSize: '12px', color: '#64748b' },
  section: { padding: '8px 16px 0' },
  sectionTitle: {
    fontSize: '12px', color: '#64748b', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  topicList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  topicCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px',
    border: '1px solid #1e293b', cursor: 'pointer', width: '100%',
    textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
  },
  topicInfo: { flex: 1 },
  topicName: { fontSize: '15px', color: '#f1f5f9', fontWeight: 600, margin: '0 0 4px' },
  weakHint: { fontSize: '12px', color: '#f97316', margin: 0 },
  notAttempted: { fontSize: '12px', color: '#475569', margin: 0 },
  topicRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  topicAccuracy: { fontSize: '14px', fontWeight: 700 },
  arrow: { fontSize: '16px', color: '#475569' },
  loadingText: { color: '#64748b', fontSize: '14px' },
  errorText: { color: '#ef4444', fontSize: '14px', marginBottom: '16px' },
  btnSecondary: {
    padding: '12px 24px', borderRadius: '10px',
    background: 'transparent', border: '1px solid #1e293b',
    color: '#94a3b8', fontWeight: 600, fontSize: '14px',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
}