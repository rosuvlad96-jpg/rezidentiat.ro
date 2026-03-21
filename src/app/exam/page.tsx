'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ExamSize = 50 | 100 | 200
type Phase = 'setup' | 'loading' | 'question' | 'complete' | 'error'

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

const OPTIONS = ['a', 'b', 'c', 'd', 'e'] as const

export default function ExamPage() {
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('setup')
  const [examSize, setExamSize] = useState<ExamSize>(50)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionId] = useState(() => crypto.randomUUID())

  // ── Start exam ─────────────────────────────────────────────────────────────
  const startExam = async () => {
    setPhase('loading')
    try {
      const res = await fetch(`/api/questions?mode=exam&count=${examSize}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Expect array of questions for exam mode
      const qs: Question[] = Array.isArray(data) ? data : [data]
      setQuestions(qs)
      setCurrentIndex(0)
      setAnswers({})
      setSelectedOptions([])
      setPhase('question')
    } catch (err: any) {
      setErrorMessage(err.message)
      setPhase('error')
    }
  }

  // ── Toggle option ──────────────────────────────────────────────────────────
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

  // ── Submit current answer and advance ──────────────────────────────────────
  const submitAndAdvance = async () => {
    if (selectedOptions.length === 0) return
    const currentQ = questions[currentIndex]

    // Store answer locally
    const newAnswers = { ...answers, [currentQ.id]: selectedOptions }
    setAnswers(newAnswers)

    // Submit to API (no explanation for exam mode)
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQ.id,
        selectedOptions,
        confidence: null,
        sessionId,
        mode: 'exam',
        conceptId: currentQ.concept_id,
      }),
    })

    const isLast = currentIndex === questions.length - 1

    if (isLast) {
      // Calculate final score
      let totalScore = 0
      let maxPoints = 0
      questions.forEach(q => {
        maxPoints += q.points
        const chosen = newAnswers[q.id] ?? []
        const correct = q.correct_options
        const isCorrect =
          JSON.stringify([...chosen].sort()) === JSON.stringify([...correct].sort())
        if (isCorrect) totalScore += q.points
      })
      setScore(totalScore)
      setTotalPoints(maxPoints)
      setPhase('complete')
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedOptions([])
    }
  }

  // ── Render: setup ──────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => router.push('/dashboard')}>←</button>
        </div>
        <div style={s.setupCard}>
          <h2 style={s.setupTitle}>Simulare examen</h2>
          <p style={s.setupSubtitle}>Alege numărul de întrebări</p>

          <div style={s.sizeOptions}>
            {([50, 100, 200] as ExamSize[]).map(size => (
              <button
                key={size}
                style={examSize === size ? { ...s.sizeBtn, ...s.sizeBtnActive } : s.sizeBtn}
                onClick={() => setExamSize(size)}
              >
                <span style={s.sizeNum}>{size}</span>
                <span style={s.sizeLabel}>întrebări</span>
              </button>
            ))}
          </div>

          <button style={s.btnPrimary} onClick={startExam}>
            Începe simularea
          </button>
        </div>
      </div>
    )
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={s.centered}>
        <p style={s.loadingText}>Se pregătește simularea...</p>
      </div>
    )
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={s.centered}>
        <p style={s.errorText}>{errorMessage}</p>
        <button style={s.btnSecondary} onClick={() => setPhase('setup')}>
          Înapoi
        </button>
      </div>
    )
  }

  // ── Render: complete ───────────────────────────────────────────────────────
  if (phase === 'complete') {
    const percentage = Math.round((score / totalPoints) * 100)
    return (
      <div style={s.page}>
        <div style={s.completeCard}>
          <div style={s.completeIcon}>📋</div>
          <h2 style={s.completeTitle}>Simulare finalizată!</h2>

          <div style={s.scoreCircle}>
            <span style={s.scorePercent}>{percentage}%</span>
            <span style={s.scorePoints}>{score} / {totalPoints} puncte</span>
          </div>

          <div style={s.completeActions}>
            <button style={s.btnPrimary} onClick={() => router.push('/dashboard')}>
              Înapoi la dashboard
            </button>
            <button style={s.btnSecondary} onClick={() => setPhase('setup')}>
              Încearcă din nou
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: question ───────────────────────────────────────────────────────
  const currentQ = questions[currentIndex]

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>←</button>
        <div style={s.headerRow}>
          <span style={s.modeChip}>Simulare {examSize}q</span>
          <span style={s.progressText}>{currentIndex + 1} / {questions.length}</span>
        </div>
        <div style={s.progressBarWrap}>
          <div
            style={{
              ...s.progressBarFill,
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div style={s.card}>
        <div style={s.questionMeta}>
          <span style={s.typeChip}>
            {currentQ.question_type === 'multiplu' ? 'Multiplu' : 'Simplu'}
          </span>
          <span style={s.pointsChip}>
            {currentQ.points} {currentQ.points === 1 ? 'punct' : 'puncte'}
          </span>
        </div>

        <p style={s.questionText}>{currentQ.question_text}</p>

        {currentQ.question_type === 'multiplu' && (
          <p style={s.multiHint}>Selectează toate variantele corecte</p>
        )}

        <div style={s.optionsList}>
          {OPTIONS.map(opt => {
            const text = currentQ[`option_${opt}` as keyof Question] as string
            if (!text) return null
            const isSelected = selectedOptions.includes(opt)
            return (
              <button
                key={opt}
                style={isSelected ? { ...s.option, ...s.optionSelected } : s.option}
                onClick={() => toggleOption(opt)}
              >
                <span style={s.optionLabel}>{opt.toUpperCase()}</span>
                <span style={s.optionText}>{text}</span>
              </button>
            )
          })}
        </div>

        <div style={s.actionRow}>
          <button
            style={selectedOptions.length === 0 ? s.btnDisabled : s.btnPrimary}
            onClick={submitAndAdvance}
            disabled={selectedOptions.length === 0}
          >
            {currentIndex === questions.length - 1 ? 'Finalizează' : 'Următoarea →'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  header: { padding: '16px 20px 0' },
  backBtn: {
    background: 'none', border: 'none', color: '#94a3b8',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0',
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '12px',
  },
  modeChip: {
    fontSize: '13px', color: '#38bdf8', fontWeight: 600,
    background: 'rgba(56,189,248,0.1)', borderRadius: '6px', padding: '4px 10px',
  },
  progressText: { fontSize: '13px', color: '#64748b' },
  progressBarWrap: {
    height: '3px', backgroundColor: '#1e293b',
    borderRadius: '99px', marginBottom: '16px',
  },
  progressBarFill: {
    height: '100%', backgroundColor: '#38bdf8',
    borderRadius: '99px', transition: 'width 0.3s ease',
  },
  card: {
    margin: '0 16px', padding: '24px 20px',
    backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b',
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
  optionLabel: {
    fontSize: '13px', fontWeight: 700, color: '#64748b',
    minWidth: '20px', paddingTop: '1px',
  },
  optionText: { fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 },
  actionRow: { marginTop: '24px' },
  setupCard: {
    margin: '40px 16px', padding: '32px 24px',
    backgroundColor: '#0f172a', borderRadius: '20px',
    border: '1px solid #1e293b', textAlign: 'center',
  },
  setupTitle: { fontSize: '22px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 8px' },
  setupSubtitle: { fontSize: '14px', color: '#64748b', marginBottom: '32px' },
  sizeOptions: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' },
  sizeBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '16px 24px', borderRadius: '12px',
    border: '1px solid #1e293b', backgroundColor: '#0a1628',
    cursor: 'pointer', gap: '4px',
  },
  sizeBtnActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)' },
  sizeNum: { fontSize: '24px', color: '#f1f5f9', fontWeight: 700 },
  sizeLabel: { fontSize: '12px', color: '#64748b' },
  completeCard: {
    margin: '60px 16px', padding: '32px 24px',
    backgroundColor: '#0f172a', borderRadius: '20px',
    border: '1px solid #1e293b', textAlign: 'center',
  },
  completeIcon: { fontSize: '48px', marginBottom: '16px' },
  completeTitle: { fontSize: '22px', color: '#f1f5f9', fontWeight: 700, margin: '0 0 24px' },
  scoreCircle: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginBottom: '32px', gap: '8px',
  },
  scorePercent: { fontSize: '48px', color: '#38bdf8', fontWeight: 700 },
  scorePoints: { fontSize: '14px', color: '#64748b' },
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
  btnDisabled: {
    width: '100%', padding: '15px', borderRadius: '12px',
    background: '#1e293b', color: '#475569',
    fontWeight: 700, fontSize: '15px',
    border: 'none', cursor: 'not-allowed', fontFamily: 'DM Sans, sans-serif',
  },
  loadingText: { color: '#64748b', fontSize: '14px' },
  errorText: { color: '#ef4444', fontSize: '14px', marginBottom: '16px' },
}