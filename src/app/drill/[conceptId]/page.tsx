'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrillQuestion {
  id: string
  question_type: 'simplu' | 'multiplu'
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  drill_angle: string
}

interface DrillResult {
  drill_question_id: string
  is_correct: boolean
  selected_options: string[]
}

interface ExplanationData {
  is_fully_correct: boolean
  correct_options: string[]
  explanation: string
  retine: string
}

type Phase = 'loading' | 'question' | 'explanation' | 'complete' | 'error'

const OPTIONS = ['a', 'b', 'c', 'd'] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DrillPage() {
  const { conceptId } = useParams<{ conceptId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const source = searchParams.get('source') ?? 'dashboard'
  const returnTopicId = searchParams.get('topicId') ?? ''
  const returnTopicName = searchParams.get('topicName') ?? ''
  const returnCompleted = parseInt(searchParams.get('completed') ?? '0')
  const returnTotal = parseInt(searchParams.get('total') ?? '0')

  const [phase, setPhase] = useState<Phase>('loading')
  const [conceptName, setConceptName] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [questions, setQuestions] = useState<DrillQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [explanation, setExplanation] = useState<ExplanationData | null>(null)
  const [results, setResults] = useState<DrillResult[]>([])
  const [accuracyBefore, setAccuracyBefore] = useState<number | null>(null)
  const [accuracyAfter, setAccuracyAfter] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // ── Start drill on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function startDrill() {
      try {
        const res = await fetch('/api/drills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            concept_id: conceptId,
            trigger: 'manual',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setAssignmentId(data.assignment_id)
        setConceptName(data.concept_name)
        setQuestions(data.questions)
        setAccuracyBefore(data.accuracy_before_drill)
        setPhase('question')
      } catch (err: any) {
        setErrorMessage(err.message)
        setPhase('error')
      }
    }
    startDrill()
  }, [conceptId])

  // ── Toggle answer option ───────────────────────────────────────────────────
  const toggleOption = (opt: string) => {
    const currentQ = questions[currentIndex]
    if (!currentQ) return

    if (currentQ.question_type === 'simplu') {
      setSelectedOptions([opt])
    } else {
      setSelectedOptions(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      )
    }
  }

  // ── Submit answer ──────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (selectedOptions.length === 0) return
    const currentQ = questions[currentIndex]

    try {
      const res = await fetch('/api/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          assignment_id: assignmentId,
          drill_question_id: currentQ.id,
          selected_options: selectedOptions,
          concept_id: conceptId,
        }),
      })
      const data: ExplanationData = await res.json()
      if (!res.ok) throw new Error((data as any).error)

      setExplanation(data)
      setResults(prev => [
        ...prev,
        {
          drill_question_id: currentQ.id,
          is_correct: data.is_fully_correct,
          selected_options: selectedOptions,
        },
      ])
      setPhase('explanation')
    } catch (err: any) {
      setErrorMessage(err.message)
      setPhase('error')
    }
  }

  // ── Advance to next question or complete ───────────────────────────────────
  const advance = async () => {
    const isLast = currentIndex === questions.length - 1

    if (isLast) {
      const finalResults = results
      const correct = finalResults.filter(r => r.is_correct).length

      try {
        const res = await fetch('/api/drills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            assignment_id: assignmentId,
            concept_id: conceptId,
            correct_count: correct,
            total_count: finalResults.length,
          }),
        })
        const data = await res.json()
        setAccuracyAfter(data.accuracy_after)
        setPhase('complete')
      } catch (err: any) {
        setErrorMessage(err.message)
        setPhase('error')
      }
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedOptions([])
      setExplanation(null)
      setPhase('question')
    }
  }

  // ── Abandon drill ──────────────────────────────────────────────────────────
  const handleAbandon = useCallback(async () => {
    if (assignmentId) {
      await fetch('/api/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abandon',
          assignment_id: assignmentId,
          concept_id: conceptId,
          questions_completed: results.length,
        }),
      })
    }
    router.back()
  }, [assignmentId, conceptId, results.length, router])

  // ── Render: loading ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se pregătesc întrebările...</p>
      </div>
    )
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={s.centered}>
        <p style={s.errorText}>A apărut o eroare: {errorMessage}</p>
        <button style={s.btnSecondary} onClick={() => router.back()}>Înapoi</button>
      </div>
    )
  }

  // ── Render: complete ───────────────────────────────────────────────────────
  if (phase === 'complete') {
    const correctCount = results.filter(r => r.is_correct).length
    const improved =
      accuracyAfter !== null && accuracyBefore !== null && accuracyAfter > accuracyBefore

    return (
      <div style={s.page}>
        <div style={s.completeCard}>
          <div style={s.completeIcon}>{improved ? '🎯' : '📚'}</div>
          <h2 style={s.completeTitle}>Exercițiu completat!</h2>
          <p style={s.conceptLabel}>{conceptName}</p>

          <div style={s.scoreRow}>
            <div style={s.scoreItem}>
              <span style={s.scoreNum}>{correctCount}/{questions.length}</span>
              <span style={s.scoreLabel}>Răspunsuri corecte</span>
            </div>
            {accuracyBefore !== null && accuracyAfter !== null && (
              <div style={s.scoreItem}>
                <span style={s.scoreNum}>
                  {Math.round(accuracyBefore * 100)}% → {Math.round(accuracyAfter * 100)}%
                </span>
                <span style={s.scoreLabel}>Acuratețe concept</span>
              </div>
            )}
          </div>

          {improved && (
            <div style={s.improvementBadge}>↑ Acuratețea ta a crescut după acest exercițiu</div>
          )}

          <div style={s.completeActions}>
            {source === 'practice' && (
              <>
                <button style={s.btnPrimary} onClick={() => router.push('/practice')}>
                  Continuă cu întrebările
                </button>
                <button style={s.btnSecondary} onClick={() => router.push('/dashboard')}>
                  Înapoi la dashboard
                </button>
              </>
            )}
            {source === 'topic' && (
              <>
                <button
                  style={s.btnPrimary}
                  onClick={() => router.push(`/topics/${returnTopicId}/drill`)}
                >
                  {returnCompleted >= returnTotal
                    ? 'Toate conceptele îmbunătățite 🎯'
                    : `Mai ai ${returnTotal - returnCompleted} concepte în ${returnTopicName}`}
                </button>
                <button style={s.btnSecondary} onClick={() => router.push('/dashboard')}>
                  Înapoi la dashboard
                </button>
              </>
            )}
            {(source === 'dashboard' || source === 'special') && (
              <>
                <button style={s.btnPrimary} onClick={() => router.push('/dashboard')}>
                  Înapoi la dashboard
                </button>
                <button style={s.btnSecondary} onClick={() => router.push('/concepts')}>
                  Subiecte de îmbunătățit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Render: question or explanation ────────────────────────────────────────
  const currentQ = questions[currentIndex]

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={handleAbandon}>←</button>
        <div style={s.headerRow}>
          <span style={s.conceptChip}>{conceptName}</span>
          <span style={s.progressText}>{currentIndex + 1} / {questions.length}</span>
        </div>
        <div style={s.progressBarWrap}>
          <div
            style={{
              ...s.progressBarFill,
              width: `${((currentIndex + (phase === 'explanation' ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div style={s.card}>
        <div style={s.angleChip}>
          {currentQ.question_type === 'multiplu' ? 'Multiplu' : 'Simplu'}
        </div>

        <p style={s.questionText}>{currentQ.question_text}</p>

        <div style={s.optionsList}>
          {OPTIONS.map(opt => {
            const text = currentQ[`option_${opt}` as keyof DrillQuestion] as string
            if (!text) return null

            const isSelected = selectedOptions.includes(opt)
            const isCorrect = explanation?.correct_options.includes(opt)
            const isWrong = phase === 'explanation' && isSelected && !isCorrect

            let optStyle = { ...s.option }
            if (phase === 'explanation') {
              if (isCorrect) optStyle = { ...optStyle, ...s.optionCorrect }
              else if (isWrong) optStyle = { ...optStyle, ...s.optionWrong }
            } else if (isSelected) {
              optStyle = { ...optStyle, ...s.optionSelected }
            }

            return (
              <button
                key={opt}
                style={optStyle}
                onClick={() => phase === 'question' && toggleOption(opt)}
                disabled={phase === 'explanation'}
              >
                <span style={s.optionLabel}>{opt.toUpperCase()}</span>
                <span style={s.optionText}>{text}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation — wrong answer */}
        {phase === 'explanation' && explanation && !explanation.is_fully_correct && (
          <div style={s.explanationPanel}>
            <div style={s.explanationSection}>
              <span style={s.explanationLabel}>De ce este corect</span>
              <p style={s.explanationText}>{explanation.explanation}</p>
            </div>
            <div style={s.retineBox}>
              <span style={s.retineLabel}>⚡ Reține</span>
              <p style={s.retineText}>{explanation.retine}</p>
            </div>
          </div>
        )}

        {/* Explanation — correct answer */}
        {phase === 'explanation' && explanation?.is_fully_correct && (
          <div style={s.correctBanner}>
            <span>✓ Corect!</span>
            <p style={s.retineTextInline}>{explanation.retine}</p>
          </div>
        )}

        {/* Action button */}
        <div style={s.actionRow}>
          {phase === 'question' ? (
            <button
              style={selectedOptions.length === 0 ? s.btnDisabled : s.btnPrimary}
              onClick={submitAnswer}
              disabled={selectedOptions.length === 0}
            >
              Verifică răspunsul
            </button>
          ) : (
            <button style={s.btnPrimary} onClick={advance}>
              {currentIndex === questions.length - 1
                ? 'Finalizează exercițiul'
                : 'Următoarea întrebare →'}
            </button>
          )}
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#020917',
    gap: '16px',
    fontFamily: 'DM Sans, sans-serif',
  },
  header: {
    padding: '16px 20px 0',
    position: 'sticky',
    top: 0,
    backgroundColor: '#020917',
    zIndex: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px 4px 0',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  conceptChip: {
    fontSize: '13px',
    color: '#38bdf8',
    fontWeight: 600,
    background: 'rgba(56,189,248,0.1)',
    borderRadius: '6px',
    padding: '4px 10px',
  },
  progressText: { fontSize: '13px', color: '#64748b' },
  progressBarWrap: {
    height: '3px',
    backgroundColor: '#1e293b',
    borderRadius: '99px',
    marginBottom: '16px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: '99px',
    transition: 'width 0.3s ease',
  },
  card: {
    margin: '0 16px',
    padding: '24px 20px',
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    border: '1px solid #1e293b',
  },
  angleChip: {
    display: 'inline-block',
    fontSize: '11px',
    color: '#818cf8',
    background: 'rgba(129,140,248,0.1)',
    borderRadius: '4px',
    padding: '3px 8px',
    marginBottom: '14px',
    fontWeight: 600,
  },
  questionText: {
    fontSize: '16px',
    color: '#f1f5f9',
    lineHeight: 1.6,
    marginBottom: '20px',
    fontWeight: 500,
  },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  option: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid #1e293b',
    backgroundColor: '#0a1628',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  optionSelected: { borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)' },
  optionCorrect: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  optionLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#64748b',
    minWidth: '20px',
    paddingTop: '1px',
  },
  optionText: { fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 },
  explanationPanel: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#080f1e',
    borderRadius: '10px',
    border: '1px solid #1e293b',
  },
  explanationSection: { marginBottom: '14px' },
  explanationLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '6px',
  },
  explanationText: { fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: 0 },
  retineBox: {
    padding: '12px 14px',
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderRadius: '8px',
    borderLeft: '3px solid #38bdf8',
  },
  retineLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#38bdf8',
    display: 'block',
    marginBottom: '4px',
  },
  retineText: { fontSize: '14px', color: '#e2e8f0', lineHeight: 1.5, margin: 0, fontWeight: 500 },
  correctBanner: {
    marginTop: '20px',
    padding: '14px 16px',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: '10px',
    border: '1px solid rgba(34,197,94,0.2)',
    color: '#22c55e',
    fontWeight: 700,
    fontSize: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  retineTextInline: { fontSize: '13px', color: '#94a3b8', fontWeight: 400, margin: 0 },
  actionRow: { marginTop: '24px' },
  btnPrimary: {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  btnSecondary: {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    background: 'transparent',
    border: '1px solid #1e293b',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  btnDisabled: {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    background: '#1e293b',
    color: '#475569',
    fontWeight: 700,
    fontSize: '15px',
    border: 'none',
    cursor: 'not-allowed',
    fontFamily: 'DM Sans, sans-serif',
  },
  completeCard: {
    margin: '60px 16px',
    padding: '32px 24px',
    backgroundColor: '#0f172a',
    borderRadius: '20px',
    border: '1px solid #1e293b',
    textAlign: 'center',
  },
  completeIcon: { fontSize: '48px', marginBottom: '16px' },
  completeTitle: { fontSize: '22px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 6px' },
  conceptLabel: { fontSize: '14px', color: '#38bdf8', marginBottom: '28px' },
  scoreRow: { display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '20px' },
  scoreItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  scoreNum: { fontSize: '20px', color: '#f1f5f9', fontWeight: 700 },
  scoreLabel: { fontSize: '12px', color: '#64748b' },
  improvementBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: '8px',
    color: '#22c55e',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '28px',
  },
  completeActions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  loadingText: { color: '#64748b', fontSize: '14px' },
  errorText: { color: '#ef4444', fontSize: '14px', marginBottom: '16px' },
}