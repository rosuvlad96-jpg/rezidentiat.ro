import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getNextQuestion, submitAnswer } from '@/lib/questions'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') as any || 'general'
  const chapterId = searchParams.get('chapterId') || undefined
  const subcapitolId = searchParams.get('subcapitolId') || undefined
  const count = parseInt(searchParams.get('count') || '1')
  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

 // Exam mode — return full batch with 25/75 simplu/multiplu split
  if (mode === 'exam') {
    const simpluCount = Math.round(count * 0.25)
    const multipluCount = count - simpluCount

    const [{ data: simpluQ }, { data: multipluQ }] = await Promise.all([
      supabase
        .from('questions')
        .select('id, concept_id, question_type, question_category, question_text, option_a, option_b, option_c, option_d, option_e, correct_options, points')
        .eq('exam_id', examId)
        .eq('is_active', true)
        .eq('question_type', 'simplu')
        .limit(simpluCount * 3),
      supabase
        .from('questions')
        .select('id, concept_id, question_type, question_category, question_text, option_a, option_b, option_c, option_d, option_e, correct_options, points')
        .eq('exam_id', examId)
        .eq('is_active', true)
        .eq('question_type', 'multiplu')
        .limit(multipluCount * 3),
    ])

    const simplu = (simpluQ ?? []).sort(() => Math.random() - 0.5).slice(0, simpluCount)
    const multiplu = (multipluQ ?? []).sort(() => Math.random() - 0.5).slice(0, multipluCount)
    const all = [...simplu, ...multiplu].sort(() => Math.random() - 0.5)

    if (all.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 404 })
    }

    return NextResponse.json(all)
  }

  // Practice modes — return single question, strip correct_options
  const question = await getNextQuestion(user.id, examId, mode, chapterId, subcapitolId)

  if (!question) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  const { correct_options, ...safeQuestion } = question as any
  return NextResponse.json(safeQuestion)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { questionId, selectedOptions, confidence, sessionId, mode } = body

  if (!questionId || !selectedOptions || !sessionId || !mode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  const result = await submitAnswer(
    user.id,
    questionId,
    selectedOptions,
    confidence,
    sessionId,
    mode
  )

  return NextResponse.json(result)
}