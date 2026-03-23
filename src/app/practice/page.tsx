'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackClientEvent } from '@/lib/analytics-client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string
  question_type: 'simplu' | 'multiplu'
  question_category: 'conceptual' | 'factual'
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e?: string
  correct_options: string[]
  concept_id: string
  points: number
}

interface ExplanationData {
  explanation: string
}

type Phase = 'loading' | 'question' | 'explanation' | 'error'

const OPTIONS = ['a', 'b', 'c', 'd', 'e'] as const

const CONFIDENCE_OPTIONS = [
  { value: 1, label: 'Am ghicit' },
  { value: 2, label: 'Nesigur' },
  { value: 3, label: 'Sigur' },
  { value: 4, label: 'Foarte sigur' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('loading')
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [confidence, setConfidence] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string>('')
  const [isFullyCorrect, setIsFullyCorrect] = useState<boolean | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [errorMessage, setErrorMessage] = useState('')
  const [questionsAnswered, setQuestionsAnswered] = useState(0)

  // ── Load first question on mount ───────────────────────────────────────────
  useEffect(() => {
    trackClientEvent('SESSION_START', { practice_mode: 'general' }, sessionId)
    loadNextQuestion()
  }, [])

  const loadNextQuestion = async () => {
    setPhase('loading')
    setSelectedOptions([])
    setConfidence(null)
    setExplanation('')
    setIsFullyCorrect(null)

    try {
      const res = await fetch('/api/questions?mode=general')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestion(data)
      setPhase('question')
    } catch (err: any) {
      setErrorMessage(err.message)
      setPhase('error')
    }
  }

  // ── Toggle answer option ───────────────────────────────────────────────────
  const toggleOption = (opt: string) => {
    if (!question) return
    if (question.question_type === 'simplu') {
      setSelectedOptions([opt])
    } else {
      setSelectedOptions(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      )
    }
  }

  // ── Submit answer ──────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!question || selectedOptions.length === 0 || confidence === null) return

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          selected_options: selectedOptions,
          confidence,
          session_id: sessionId,
          practice_mode: 'general',
          concept_id: question.concept_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setIsFullyCorrect(data.is_fully_correct)
      setQuestionsAnswered(q => q + 1)

      if (!data.is_fully_correct) {
        // Load explanation for wrong answers
        const expRes = await fetch('/api/explanations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: question.id,
            question_type: question.question_type,
            question_category: question.question_category,
            question_text: question.question_text,
            options: {
              a: question.option_a,
              b: question.option_b,
              c: question.option_c,
              d: question.option_d,
              ...(question.option_e ? { e: question.option_e } : {}),
            },
            correct_options: question.correct_options,
            selected_options: selectedOptions,
            confidence,
            concept_id: question.concept_id,
          }),
        })
        const expData = await expRes.json()
        setExplanation(expData.explanation)
        await trackClientEvent('EXPLANATION_VIEWED', {
  question_id: question.id,
  concept_id: question.concept_id,
  practice_mode: 'general',
}, sessionId)
      }

      setPhase('explanation')
    } catch (err: any) {
      setErrorMessage(err.message)
      setPhase('error')
    }
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se încarcă întrebarea...</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={s.centered}>
        <p style={s.errorText}>{errorMessage}</p>
        <button style={s.btnSecondary} onClick={() => router.push('/dashboard')}>
          Înapoi la dashboard
        </button>
      </div>
    )
  }

  if (!question) return null

  const canSubmit = selectedOptions.length > 0 && confidence !== null

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>←</button>
        <div style={s.headerRow}>
          <span style={s.modeChip}>Practică generală</span>
          <span style={s.countText}>{questionsAnswered} răspunse</span>
        </div>
      </div>

      {/* Question card */}
      <div style={s.card}>
        <div style={s.questionMeta}>
          <span style={s.typeChip}>
            {question.question_type === 'multiplu' ? 'Multiplu' : 'Simplu'}
          </span>
          <span style={s.pointsChip}>
            {question.points} {question.points === 1 ? 'punct' : 'puncte'}
          </span>
        </div>

        <p style={s.questionText}>{question.question_text}</p>

        {question.question_type === 'multiplu' && (
          <p style={s.multiHint}>Selectează toate variantele corecte</p>
        )}

        {/* Options */}
        <div style={s.optionsList}>
          {OPTIONS.map(opt => {
            const text = question[`option_${opt}` as keyof Question] as string
            if (!text) return null

            const isSelected = selectedOptions.includes(opt)
            const isCorrect = phase === 'explanation' && question.correct_options.includes(opt)
            const isWrong = phase === 'explanation' && isSelected && !question.correct_options.includes(opt)

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

        {/* Confidence selector — only during question phase */}
        {phase === 'question' && (
          <div style={s.confidenceSection}>
            <p style={s.confidenceLabel}>Cât de sigur ești?</p>
            <div style={s.confidenceRow}>
              {CONFIDENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  style={confidence === opt.value ? { ...s.confidenceBtn, ...s.confidenceBtnActive } : s.confidenceBtn}
                  onClick={() => setConfidence(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Explanation — wrong answer */}
        {phase === 'explanation' && !isFullyCorrect && explanation && (
          <div style={s.explanationPanel}>
            <p style={s.explanationText}>{explanation}</p>
          </div>
        )}

        {/* Correct banner */}
        {phase === 'explanation' && isFullyCorrect && (
          <div style={s.correctBanner}>✓ Corect!</div>
        )}

        {/* Action button */}
        <div style={s.actionRow}>
          {phase === 'question' ? (
            <button
              style={canSubmit ? s.btnPrimary : s.btnDisabled}
              onClick={submitAnswer}
              disabled={!canSubmit}
            >
              Verifică răspunsul
            </button>
          ) : (
            <button style={s.btnPrimary} onClick={loadNextQuestion}>
              Următoarea întrebare →
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
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh',
    backgroundColor: '#020917', gap: '16px',
    fontFamily: 'DM Sans, sans-serif',
  },
  header: { padding: '16px 20px 0' },
  backBtn: {
    background: 'none', border: 'none', color: '#94a3b8',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0',
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '16px',
  },
  modeChip: {
    fontSize: '13px', color: '#38bdf8', fontWeight: 600,
    background: 'rgba(56,189,248,0.1)', borderRadius: '6px', padding: '4px 10px',
  },
  countText: { fontSize: '13px', color: '#64748b' },
  card: {
    margin: '0 16px', padding: '24px 20px',
    backgroundColor: '#0f172a', borderRadius: '16px',
    border: '1px solid #1e293b',
  },
  questionMeta: { display: 'flex', gap: '8px', marginBottom: '14px' },
  typeChip: {
    fontSize: '11px', color: '#818cf8', fontWeight: 600,
    background: 'rgba(129,140,248,0.1)', borderRadius: '4px', padding: '3px 8px',
  },
  pointsChip: {
    fontSize: '11px', color: '#64748b', fontWeight: 600,
    background: '#1e293b', borderRadius: '4px', padding: '3px 8px',
  },
  questionText: {
    fontSize: '16px', color: '#f1f5f9', lineHeight: 1.6,
    marginBottom: '8px', fontWeight: 500,
  },
  multiHint: { fontSize: '12px', color: '#64748b', marginBottom: '16px' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  option: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '14px 16px', borderRadius: '10px',
    border: '1px solid #1e293b', backgroundColor: '#0a1628',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  optionSelected: { borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)' },
  optionCorrect: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  optionLabel: {
    fontSize: '13px', fontWeight: 700, color: '#64748b',
    minWidth: '20px', paddingTop: '1px',
  },
  optionText: { fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 },
  confidenceSection: { marginBottom: '20px' },
  confidenceLabel: { fontSize: '13px', color: '#64748b', marginBottom: '10px' },
  confidenceRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  confidenceBtn: {
    padding: '8px 14px', borderRadius: '8px',
    border: '1px solid #1e293b', backgroundColor: '#0a1628',
    color: '#64748b', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  confidenceBtnActive: {
    borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)',
    color: '#38bdf8',
  },
  explanationPanel: {
    marginTop: '20px', padding: '16px',
    backgroundColor: '#080f1e', borderRadius: '10px',
    border: '1px solid #1e293b', marginBottom: '4px',
  },
  explanationText: { fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: 0 },
  correctBanner: {
    marginTop: '20px', padding: '14px 16px',
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: '10px',
    border: '1px solid rgba(34,197,94,0.2)',
    color: '#22c55e', fontWeight: 700, fontSize: '15px',
    marginBottom: '4px',
  },
  actionRow: { marginTop: '24px' },
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
  btnDisabled: {
    width: '100%', padding: '15px', borderRadius: '12px',
    background: '#1e293b', color: '#475569',
    fontWeight: 700, fontSize: '15px',
    border: 'none', cursor: 'not-allowed', fontFamily: 'DM Sans, sans-serif',
  },
  loadingText: { color: '#64748b', fontSize: '14px' },
  errorText: { color: '#ef4444', fontSize: '14px', marginBottom: '16px' },
}