'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Domain {
  id: string
  name: string
  display_order: number
  accuracy: number | null
}

interface WeakestConcept {
  concept_id: string
  name: string
  accuracy: number
}

interface Stats {
  totalAnswers: number
  drillsCompleted: number
  daysActive: number
  overallAccuracy: number | null
}

interface DashboardData {
  user: { email: string }
  weakestConcept: WeakestConcept | null
  domains: Domain[]
  stats: Stats
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return '#334155'
  if (accuracy < 0.35) return '#ef4444'
  if (accuracy < 0.55) return '#f97316'
  if (accuracy < 0.70) return '#eab308'
  return '#22c55e'
}

function accuracyLabel(accuracy: number | null): string {
  if (accuracy === null) return '—'
  return `${Math.round(accuracy * 100)}%`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard')
        const json = await res.json()
        setData(json)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se încarcă...</p>
      </div>
    )
  }

  if (!data) return null

  const { weakestConcept, domains, stats } = data

  return (
    <div style={s.page}>

      {/* ── Greeting ── */}
      <div style={s.greeting}>
        <h1 style={s.greetingTitle}>Bună ziua! 👋</h1>
        {weakestConcept ? (
          <p style={s.greetingSubtitle}>
            Cel mai slab subiect al tău este{' '}
            <span style={s.weakConceptName}>{weakestConcept.name}</span>
            {' '}— acuratețe{' '}
            <span style={{ color: accuracyColor(weakestConcept.accuracy) }}>
              {accuracyLabel(weakestConcept.accuracy)}
            </span>
          </p>
        ) : (
          <p style={s.greetingSubtitle}>
            Continuă să exersezi pentru a-ți vedea progresul!
          </p>
        )}
      </div>

      {/* ── Drill CTA ── */}
      {weakestConcept && (
        <div style={s.section}>
          <button
            style={s.drillCTA}
            onClick={() => router.push(`/drill/${weakestConcept.concept_id}?source=dashboard`)}
          >
            <div>
              <p style={s.drillCTATitle}>Începe exercițiile</p>
              <p style={s.drillCTASubtitle}>{weakestConcept.name} · 5 întrebări</p>
            </div>
            <span style={s.drillCTAArrow}>→</span>
          </button>
        </div>
      )}

      {/* ── Score card (placeholder) ── */}
      <div style={s.section}>
        <div style={s.scoreCard}>
          <p style={s.scoreCardLabel}>Scor estimat</p>
          <p style={s.scoreCardValue}>—</p>
          <p style={s.scoreCardHint}>
            Completează o simulare de examen pentru a vedea scorul tău estimat
          </p>
        </div>
      </div>

      {/* ── Stats card ── */}
      <div style={s.section}>
        <div style={s.statsCard}>
          <div style={s.statItem}>
            <span style={s.statNum}>{stats.totalAnswers}</span>
            <span style={s.statLabel}>Întrebări</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.statItem}>
            <span style={s.statNum}>{stats.drillsCompleted}</span>
            <span style={s.statLabel}>Exerciții</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.statItem}>
            <span style={s.statNum}>{stats.daysActive}</span>
            <span style={s.statLabel}>Zile active</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.statItem}>
            <span style={s.statNum}>
              {stats.overallAccuracy !== null
                ? `${Math.round(stats.overallAccuracy * 100)}%`
                : '—'}
            </span>
            <span style={s.statLabel}>Acuratețe</span>
          </div>
        </div>
      </div>

      {/* ── Domain circles ── */}
      <div style={s.section}>
        <p style={s.sectionTitle}>Domenii</p>
        <div style={s.domainsGrid}>
          {domains.map(domain => (
            <button
              key={domain.id}
              style={s.domainItem}
              onClick={() => router.push(`/domains/${domain.id}`)}
            >
              <div
                style={{
                  ...s.domainCircle,
                  borderColor: accuracyColor(domain.accuracy),
                  boxShadow: `0 0 0 2px ${accuracyColor(domain.accuracy)}22`,
                }}
              >
                <span style={s.domainAccuracy}>
                  {accuracyLabel(domain.accuracy)}
                </span>
              </div>
              <span style={s.domainName}>{domain.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Practice mode cards ── */}
      <div style={s.section}>
        <p style={s.sectionTitle}>Moduri de practică</p>
        <div style={s.modeCards}>
          <button style={s.modeCard} onClick={() => router.push('/concepts')}>
            <span style={s.modeIcon}>🎯</span>
            <span style={s.modeTitle}>Subiecte de îmbunătățit</span>
            <span style={s.modeDesc}>Focusat pe ce știi mai puțin</span>
          </button>
          <button style={s.modeCard} onClick={() => router.push('/practice')}>
            <span style={s.modeIcon}>📚</span>
            <span style={s.modeTitle}>Practică generală</span>
            <span style={s.modeDesc}>Întrebări din toate domeniile</span>
          </button>
          <button style={s.modeCard} onClick={() => router.push('/chapters')}>
            <span style={s.modeIcon}>📖</span>
            <span style={s.modeTitle}>Practică pe capitole</span>
            <span style={s.modeDesc}>Alege un capitol specific</span>
          </button>
          <button style={s.modeCard} onClick={() => router.push('/exam')}>
            <span style={s.modeIcon}>📋</span>
            <span style={s.modeTitle}>Simulare examen</span>
            <span style={s.modeDesc}>50, 100 sau 200 de întrebări</span>
          </button>
        </div>
      </div>

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#020917',
    paddingBottom: '80px',
    fontFamily: 'DM Sans, sans-serif',
  },
  centered: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', backgroundColor: '#020917',
    fontFamily: 'DM Sans, sans-serif',
  },
  loadingText: { color: '#64748b', fontSize: '14px' },
  greeting: { padding: '32px 20px 8px' },
  greetingTitle: {
    fontSize: '24px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 8px',
  },
  greetingSubtitle: {
    fontSize: '14px', color: '#94a3b8', lineHeight: 1.5, margin: 0,
  },
  weakConceptName: { color: '#f1f5f9', fontWeight: 600 },
  section: { padding: '12px 16px' },
  sectionTitle: {
    fontSize: '12px', color: '#64748b', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  drillCTA: {
    width: '100%', padding: '18px 20px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    border: 'none', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontFamily: 'DM Sans, sans-serif', textAlign: 'left',
  },
  drillCTATitle: {
    fontSize: '16px', color: '#fff', fontWeight: 700, margin: '0 0 4px',
  },
  drillCTASubtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 },
  drillCTAArrow: { fontSize: '20px', color: '#fff' },
  scoreCard: {
    padding: '20px', backgroundColor: '#0f172a', borderRadius: '14px',
    border: '1px solid #1e293b', textAlign: 'center',
  },
  scoreCardLabel: {
    fontSize: '12px', color: '#64748b', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px',
  },
  scoreCardValue: {
    fontSize: '36px', color: '#334155', fontWeight: 700, margin: '0 0 8px',
  },
  scoreCardHint: { fontSize: '12px', color: '#475569', margin: 0 },
  statsCard: {
    display: 'flex', backgroundColor: '#0f172a', borderRadius: '14px',
    border: '1px solid #1e293b', padding: '16px 0',
  },
  statItem: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '4px',
  },
  statNum: { fontSize: '20px', color: '#f1f5f9', fontWeight: 700 },
  statLabel: { fontSize: '11px', color: '#64748b' },
  statDivider: { width: '1px', backgroundColor: '#1e293b' },
  domainsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
  },
  domainItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '8px', background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px',
  },
  domainCircle: {
    width: '64px', height: '64px', borderRadius: '50%',
    border: '2px solid', backgroundColor: '#0f172a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  domainAccuracy: { fontSize: '13px', color: '#f1f5f9', fontWeight: 700 },
  domainName: {
    fontSize: '11px', color: '#94a3b8', textAlign: 'center',
    lineHeight: 1.3, maxWidth: '80px',
  },
  modeCards: { display: 'flex', flexDirection: 'column', gap: '10px' },
  modeCard: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '16px', backgroundColor: '#0f172a', borderRadius: '12px',
    border: '1px solid #1e293b', cursor: 'pointer',
    textAlign: 'left', fontFamily: 'DM Sans, sans-serif', width: '100%',
  },
  modeIcon: { fontSize: '24px' },
  modeTitle: { fontSize: '15px', color: '#f1f5f9', fontWeight: 600, display: 'block' },
  modeDesc: { fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' },
}