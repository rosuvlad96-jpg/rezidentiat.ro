'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrillConcept {
  concept_id: string
  concept_name: string
  accuracy: number | null
  classification: string
}

interface TopicDrillData {
  topic_name: string
  weak_concepts: DrillConcept[]
  total_weak: number
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TopicDrillPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const router = useRouter()

  const [data, setData] = useState<TopicDrillData | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadTopicDrill() {
      try {
        const res = await fetch(`/api/topics/${topicId}`)
        const topic = await res.json()
        if (!res.ok) throw new Error(topic.error)

        const weakConcepts = topic.concepts.filter(
          (c: DrillConcept) => c.classification === 'weak'
        )

        setData({
          topic_name: topic.topic_name,
          weak_concepts: weakConcepts,
          total_weak: weakConcepts.length,
        })
      } catch (err: any) {
        setErrorMessage(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTopicDrill()
  }, [topicId])

  if (loading) {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se pregătesc exercițiile...</p>
      </div>
    )
  }

  if (errorMessage || !data) {
    return (
      <div style={s.centered}>
        <p style={s.errorText}>{errorMessage || 'Eroare la încărcare'}</p>
        <button style={s.btnSecondary} onClick={() => router.push('/concepts')}>← Subiecte de îmbunătățit</button>
      </div>
    )
  }

  // All weak concepts completed
  if (completedCount >= data.total_weak && data.total_weak > 0) {
    return (
      <div style={s.page}>
        <div style={s.completeCard}>
          <div style={s.completeIcon}>🎯</div>
          <h2 style={s.completeTitle}>Ai îmbunătățit toate conceptele slabe din</h2>
          <p style={s.topicName}>{data.topic_name}</p>
          <div style={s.completeActions}>
            <button style={s.btnPrimary} onClick={() => router.push('/dashboard')}>
              Înapoi la dashboard
            </button>
            <button style={s.btnSecondary} onClick={() => router.push('/concepts')}>
              Subiecte de îmbunătățit
            </button>
          </div>
        </div>
      </div>
    )
  }

// No weak concepts
  if (data.total_weak === 0) {
    return (
      <div style={s.page}>
        <div style={s.completeCard}>
          <div style={s.completeIcon}>✅</div>
          <h2 style={s.completeTitle}>Nu ai concepte slabe în</h2>
          <p style={s.topicName}>{data.topic_name}</p>
          <button style={s.btnPrimary} onClick={() => router.push('/concepts')}>
            Subiecte de îmbunătățit
          </button>
        </div>
      </div>
    )
  }

  // Get next concept to drill (first weak one not yet completed)
  const nextConcept = data.weak_concepts[completedCount]
  const remaining = data.total_weak - completedCount

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/concepts')}>← Subiecte de îmbunătățit</button>
        <p style={s.topicLabel}>{data.topic_name}</p>
      </div>

      {/* Progress */}
      <div style={s.progressSection}>
        <div style={s.progressBar}>
          <div
            style={{
              ...s.progressFill,
              width: `${(completedCount / data.total_weak) * 100}%`,
            }}
          />
        </div>
        <p style={s.progressText}>
          {completedCount} din {data.total_weak} concepte îmbunătățite
        </p>
      </div>

      {/* Current concept card */}
      <div style={s.card}>
        <p style={s.cardLabel}>Următor exercițiu</p>
        <p style={s.cardRemaining}>
          {remaining} {remaining === 1 ? 'concept rămas' : 'concepte rămase'}
        </p>

        <div style={s.actions}>
          <button
            style={s.btnPrimary}
            onClick={() => {
              router.push(
                `/drill/${nextConcept.concept_id}?source=topic&topicId=${topicId}&topicName=${encodeURIComponent(data.topic_name)}&completed=${completedCount + 1}&total=${data.total_weak}`
              )
            }}
          >
            Începe exercițiul
          </button>
          <button
            style={s.btnSecondary}
            onClick={() => router.push('/dashboard')}
          >
            Termină pentru acum
          </button>
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
  header: { padding: '32px 20px 8px' },
  backBtn: {
    background: 'none', border: 'none', color: '#94a3b8',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0',
    display: 'block', marginBottom: '8px',
  },
  topicLabel: {
    fontSize: '13px', color: '#38bdf8', fontWeight: 600,
    background: 'rgba(56,189,248,0.1)', borderRadius: '6px',
    padding: '4px 10px', display: 'inline-block', margin: 0,
  },
  progressSection: { padding: '16px 20px 8px' },
  progressBar: {
    height: '4px', backgroundColor: '#1e293b',
    borderRadius: '99px', marginBottom: '8px',
  },
  progressFill: {
    height: '100%', backgroundColor: '#38bdf8',
    borderRadius: '99px', transition: 'width 0.3s ease',
  },
  progressText: { fontSize: '12px', color: '#64748b', margin: 0 },
  card: {
    margin: '8px 16px', padding: '24px 20px',
    backgroundColor: '#0f172a', borderRadius: '16px',
    border: '1px solid #1e293b',
  },
  cardLabel: {
    fontSize: '12px', color: '#64748b', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px',
  },
  cardRemaining: {
    fontSize: '20px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 24px',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: '10px' },
  completeCard: {
    margin: '60px 16px', padding: '32px 24px',
    backgroundColor: '#0f172a', borderRadius: '20px',
    border: '1px solid #1e293b', textAlign: 'center',
  },
  completeIcon: { fontSize: '48px', marginBottom: '16px' },
  completeTitle: {
    fontSize: '18px', color: '#f1f5f9', fontWeight: 700,
    margin: '0 0 8px', lineHeight: 1.4,
  },
  topicName: {
    fontSize: '16px', color: '#38bdf8', fontWeight: 600, margin: '0 0 28px',
  },
  completeActions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  btnPrimary: {
    width: '100%', padding: '15px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff', fontWeight: 700, fontSize: '15px',
    border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
  btnSecondary: {
    width: '100%', padding: '15px', borderRadius: '12px',
    background: 'transparent', border: '1px solid #1e293b',
    color: '#94a3b8', fontWeight: 600, fontSize: '15px',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
  loadingText: { color: '#64748b', fontSize: '14px' },
  errorText: { color: '#ef4444', fontSize: '14px', marginBottom: '16px' },
}