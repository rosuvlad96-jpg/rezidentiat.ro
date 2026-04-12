import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { assignDrillSet, completeDrill } from '@/lib/drills'
import { trackEvent } from '@/lib/analytics'
 
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
 
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
 
  const body = await request.json()
  const { action } = body
 
  // ── action: 'start' ────────────────────────────────────────────────────────
  if (action === 'start') {
    const { concept_id, trigger = 'manual' } = body
 
    if (!concept_id) {
      return NextResponse.json({ error: 'concept_id required' }, { status: 400 })
    }
 
    try {
      // Check for existing incomplete assignment first (prevents React Strict Mode duplicates)
      const { data: existing } = await supabase
        .from('user_drill_assignments')
        .select('id, drill_set_id, accuracy_before_drill')
        .eq('user_id', user.id)
        .eq('concept_id', concept_id)
        .is('completed_at', null)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()
 
   let session
      if (existing) {
        // Verify questions actually exist for this assignment
        const { data: existingQuestions } = await supabase
          .from('drill_questions')
          .select('id, question_type, question_text, option_a, option_b, option_c, option_d, drill_angle')
          .eq('concept_id', concept_id)
          .eq('drill_set_id', existing.drill_set_id)

        if (existingQuestions && existingQuestions.length > 0) {
          // Valid existing assignment — reuse it
          const { data: concept } = await supabase
            .from('concepts')
            .select('name')
            .eq('id', concept_id)
            .single()

          session = {
            assignment_id: existing.id,
            concept_id,
            concept_name: concept?.name ?? '',
            drill_set_id: existing.drill_set_id,
            questions: existingQuestions,
            accuracy_before_drill: existing.accuracy_before_drill,
          }
        } else {
          // Stale assignment — delete it and create fresh
          await supabase
            .from('user_drill_assignments')
            .delete()
            .eq('id', existing.id)

          session = await assignDrillSet(user.id, concept_id, trigger)
        }
      } else {
        session = await assignDrillSet(user.id, concept_id, trigger)
      }
 
      await trackEvent({
        userId: user.id,
        examId: process.env.NEXT_PUBLIC_EXAM_ID!,
        eventType: 'DRILL_STARTED',
        payload: {
          concept_id,
          drill_set_id: session.drill_set_id,
          trigger,
        },
      })
 
      return NextResponse.json(session)
    } catch (err: any) {
      console.error('[drills/start]', err)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }
 
  // ── action: 'submit' ───────────────────────────────────────────────────────
  if (action === 'submit') {
    const { assignment_id, drill_question_id, selected_options, concept_id } = body
 
    if (!assignment_id || !drill_question_id || !selected_options || !concept_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
 
    // Fetch correct_options from DB — never trust the client
    const { data: dq, error: dqError } = await supabase
      .from('drill_questions')
      .select('correct_options, explanation, retine, question_type, drill_angle')
      .eq('id', drill_question_id)
      .single()
 
    if (dqError || !dq) {
      return NextResponse.json({ error: 'Drill question not found' }, { status: 404 })
    }
 
    const selectedSorted = [...selected_options].sort()
    const correctSorted = [...dq.correct_options].sort()
    const isFullyCorrect =
      JSON.stringify(selectedSorted) === JSON.stringify(correctSorted)
 
    // Update concept stats
    const { updateConceptStats } = await import('@/lib/questions')
    await updateConceptStats(user.id, concept_id, process.env.NEXT_PUBLIC_EXAM_ID!, isFullyCorrect)
 
    // Store in user_answers (confidence is null for drills)
    await supabase.from('user_answers').insert({
      user_id: user.id,
      question_id: drill_question_id,
      concept_id,
      exam_id: process.env.NEXT_PUBLIC_EXAM_ID!,
      selected_options,
      correct_options: dq.correct_options,
      is_fully_correct: isFullyCorrect,
      partial_score: isFullyCorrect ? 1 : 0,
      confidence: null,
      practice_mode: 'drill',
    })
 
    await trackEvent({
      userId: user.id,
      examId: process.env.NEXT_PUBLIC_EXAM_ID!,
      eventType: 'QUESTION_ANSWERED',
      payload: {
        question_id: drill_question_id,
        concept_id,
        question_type: dq.question_type,
        selected_options,
        correct_options: dq.correct_options,
        is_fully_correct: isFullyCorrect,
        confidence: null,
        practice_mode: 'drill',
      },
    })
 
    return NextResponse.json({
      is_fully_correct: isFullyCorrect,
      correct_options: dq.correct_options,
      explanation: dq.explanation,
      retine: dq.retine,
    })
  }
 
  // ── action: 'complete' ─────────────────────────────────────────────────────
  if (action === 'complete') {
    const { assignment_id, concept_id, correct_count, total_count } = body
 
    if (!assignment_id || !concept_id || correct_count == null || !total_count) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
 
    try {
      const result = await completeDrill(
        assignment_id,
        user.id,
        concept_id,
        correct_count,
        total_count
      )
 
      await trackEvent({
        userId: user.id,
        examId: process.env.NEXT_PUBLIC_EXAM_ID!,
        eventType: 'DRILL_COMPLETED',
        payload: {
          concept_id,
          assignment_id,
          questions_correct: correct_count,
          questions_total: total_count,
          accuracy_before_drill: result.accuracy_before,
          accuracy_after_drill: result.accuracy_after,
        },
      })
 
      return NextResponse.json(result)
    } catch (err: any) {
      console.error('[drills/complete]', err)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }
 
  // ── action: 'abandon' ──────────────────────────────────────────────────────
  if (action === 'abandon') {
    const { assignment_id, concept_id, questions_completed = 0 } = body
 
    await trackEvent({
      userId: user.id,
      examId: process.env.NEXT_PUBLIC_EXAM_ID!,
      eventType: 'DRILL_ABANDONED',
      payload: {
        concept_id,
        assignment_id,
        questions_completed_before_exit: questions_completed,
      },
    })
 
    return NextResponse.json({ ok: true })
  }
 
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}