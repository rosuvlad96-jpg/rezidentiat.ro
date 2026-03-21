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
  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  const question = await getNextQuestion(user.id, examId, mode, chapterId)

  if (!question) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Never send correct_options to the client
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