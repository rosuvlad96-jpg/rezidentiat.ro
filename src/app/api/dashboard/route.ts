import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  // 1. Fetch all concept stats for this user
  const { data: conceptStats } = await supabase
    .from('user_concept_stats')
    .select('concept_id, accuracy, classification, concepts(domain_id)')
    .eq('user_id', user.id)
    .eq('exam_id', examId)

  // 2. Fetch all domains
  const { data: domains } = await supabase
    .from('domains')
    .select('id, name, display_order')
    .eq('exam_id', examId)
    .order('display_order')

  // 3. Calculate domain accuracies
  const domainAccuracies = (domains ?? []).map(domain => {
    const domainConcepts = (conceptStats ?? []).filter(
      s => (s.concepts as any)?.domain_id === domain.id
    )
    const accuracy =
      domainConcepts.length > 0
        ? domainConcepts.reduce((sum, s) => sum + s.accuracy, 0) / domainConcepts.length
        : null
    return {
      id: domain.id,
      name: domain.name,
      display_order: domain.display_order,
      accuracy,
    }
  })

  // 4. Find weakest concept (min 3 attempts, lowest accuracy)
  const { data: weakConcepts } = await supabase
    .from('user_concept_stats')
    .select('concept_id, accuracy, concepts(name)')
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .gte('total_attempts', 3)
    .eq('classification', 'weak')
    .order('accuracy', { ascending: true })
    .limit(1)

  const weakestConcept = weakConcepts?.[0] ?? null

  // 5. Fetch summary stats
  const { count: totalAnswers } = await supabase
    .from('user_answers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('exam_id', examId)

  const { count: drillsCompleted } = await supabase
    .from('user_drill_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)

  // 6. Calculate overall accuracy
  const overallAccuracy =
    conceptStats && conceptStats.length > 0
      ? conceptStats.reduce((sum, s) => sum + s.accuracy, 0) / conceptStats.length
      : null

  // 7. Days active
  const { data: firstAnswer } = await supabase
    .from('user_answers')
    .select('answered_at')
    .eq('user_id', user.id)
    .order('answered_at', { ascending: true })
    .limit(1)

  const daysActive = firstAnswer?.[0]
    ? Math.ceil(
        (Date.now() - new Date(firstAnswer[0].answered_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 1

  return NextResponse.json({
    user: {
      email: user.email,
    },
    weakestConcept: weakestConcept
      ? {
          concept_id: weakestConcept.concept_id,
          name: (weakestConcept.concepts as any)?.name ?? '',
          accuracy: weakestConcept.accuracy,
        }
      : null,
    domains: domainAccuracies,
    stats: {
      totalAnswers: totalAnswers ?? 0,
      drillsCompleted: drillsCompleted ?? 0,
      daysActive,
      overallAccuracy,
    },
  })
}