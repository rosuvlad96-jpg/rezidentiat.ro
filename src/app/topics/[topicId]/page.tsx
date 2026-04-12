'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopicConcept {
  concept_id: string
  concept_name: string
  accuracy: number | null
  total_attempts: number
  classification: string
}

interface TopicDetail {
  topic_name: string
  domain_name: string
  accuracy: number | null
  total_attempts: number
  weak_concept_count: number
  concepts: TopicConcept[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return '#334155'
  if (accuracy < 0.35) return '#ef4444'
  if (accuracy < 0.55) return '#f97316'
  if (accuracy < 0.70) return '#eab308'
  return '#22c55e'
}

function accuracyLabel(accuracy: number | null, attempts: number): string {
  if (accuracy === null || attempts === 0) return '—'
  return `${Math.round(accuracy * 100)}% (${attempts} întrebări)`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const router = useRouter()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadTopic() {
      try {
        const res = await fetch(`/api/topics/${topicId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setTopic(data)
      } catch (err: any) {
        setErrorMessage(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTopic()
  }, [topicId])

  if (loading) {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se încarcă subiectul...</p>
      </div>
    )
  }

  if (errorMessage || !topic) {
    return (
      <div style={s.centered}>
        <p style={s.errorText}>{errorMessage || 'Subiect negăsit'}</p>
        <button style={s.btnSecondary} onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    )
  }

  const weakConcepts = topic.concepts.filter(c => c.classification === 'weak')
  const otherConcepts = topic.concepts.filter(c => c.classification !== 'weak')

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <div style={s.headerInfo}>
          <p style={s.domainLabel}>{topic.domain_name}</p>
          <h1 style={s.title}>{topic.topic_name}</h1>
          <div style={s.topicStats}>
            <span style={{
              ...s.accuracyPill,
              color: accuracyColor(topic.accuracy),
              borderColor: accuracyColor(topic.accuracy),
            }}>
              {topic.accuracy !== null ? `${Math.round(topic.accuracy * 100)}%` : '—'}
            </span>
            <span style={s.attemptsText}>{topic.total_attempts} întrebări răspunse</span>
          </div>
        </div>
      </div>

      {/* Weak concepts section */}
      {weakConcepts.length > 0 && (
        <div style={s.section}>
          <p style={s.sectionTitle}>
            {weakConcepts.length} {weakConcepts.length === 1 ? 'concept de îmbunătățit' : 'concepte de îmbunătățit'}
          </p>
          <div style={s.conceptList}>
            {weakConcepts.map(concept => (
              <div key={concept.concept_id} style={s.conceptCard}>
                <div style={s.conceptInfo}>
                  <p style={s.conceptName}>{concept.concept_name}</p>
                  <p style={s.conceptAccuracy}>
                    {accuracyLabel(concept.accuracy, concept.total_attempts)}
                  </p>
                </div>
                <button
                  style={s.drillBtn}
                  onClick={() => router.push(`/drill/${concept.concept_id}`)}
                >
                  Exersează
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other concepts section */}
      {otherConcepts.length > 0 && (
        <div style={s.section}>
          <p style={s.sectionTitle}>Alte concepte</p>
          <div style={s.conceptList}>
            {otherConcepts.map(concept => (
              <div key={concept.concept_id} style={s.conceptCard}>
                <div style={s.conceptInfo}>
                  <p style={s.conceptName}>{concept.concept_name}</p>
                  <p style={s.conceptAccuracy}>
                    {accuracyLabel(concept.accuracy, concept.total_attempts)}
                  </p>
                </div>
                {concept.total_attempts > 0 && (
                  <span style={{
                    ...s.classificationBadge,
                    color: accuracyColor(concept.accuracy),
                  }}>
                    {concept.classification === 'strong' ? 'Bun' : 'Mediu'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {topic.concepts.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.emptyText}>Nu ai răspuns la întrebări din acest subiect încă.</p>
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
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  domainLabel: { fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  title: { fontSize: '22px', color: '#f1f5f9', fontWeight: 700, margin: 0 },
  topicStats: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' },
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
  conceptList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  conceptCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', backgroundColor: '#0f172a', borderRadius: '10px',
    border: '1px solid #1e293b', gap: '12px',
  },
  conceptInfo: { flex: 1 },
  conceptName: { fontSize: '14px', color: '#f1f5f9', fontWeight: 600, margin: '0 0 4px' },
  conceptAccuracy: { fontSize: '12px', color: '#64748b', margin: 0 },
  drillBtn: {
    padding: '8px 12px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff', fontSize: '12px', fontWeight: 600,
    border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
    whiteSpace: 'nowrap',
  },
  classificationBadge: {
    fontSize: '12px', fontWeight: 600,
  },
  emptyBox: { padding: '32px 16px', textAlign: 'center' },
  emptyText: { fontSize: '14px', color: '#64748b' },
  loadingText: { color: '#64748b', fontSize: '14px' },
  errorText: { color: '#ef4444', fontSize: '14px', marginBottom: '16px' },
  btnSecondary: {
    padding: '12px 24px', borderRadius: '10px',
    background: 'transparent', border: '1px solid #1e293b',
    color: '#94a3b8', fontWeight: 600, fontSize: '14px',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
}