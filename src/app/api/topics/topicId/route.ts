import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topicId } = await params
  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  // Get topic details
  const { data: topic } = await supabase
    .from('topics')
    .select(`
      id,
      name,
      domains ( name )
    `)
    .eq('id', topicId)
    .single()

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
  }

  // Get all concepts in this topic
  const { data: concepts } = await supabase
    .from('concepts')
    .select('id, name')
    .eq('topic_id', topicId)
    .eq('exam_id', examId)

  if (!concepts || concepts.length === 0) {
    return NextResponse.json({
      topic_name: topic.name,
      domain_name: (topic.domains as any)?.name ?? '',
      accuracy: null,
      total_attempts: 0,
      weak_concept_count: 0,
      concepts: [],
    })
  }

  // Get user stats for all concepts in this topic
  const conceptIds = concepts.map(c => c.id)

  const { data: stats } = await supabase
    .from('user_concept_stats')
    .select('concept_id, accuracy, total_attempts, classification')
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .in('concept_id', conceptIds)

  const statsMap = Object.fromEntries(
    (stats ?? []).map(s => [s.concept_id, s])
  )

  // Build concept list
  const conceptList = concepts.map(c => {
    const stat = statsMap[c.id]
    return {
      concept_id: c.id,
      concept_name: c.name,
      accuracy: stat?.accuracy ?? null,
      total_attempts: stat?.total_attempts ?? 0,
      classification: stat?.classification ?? 'unknown',
    }
  }).sort((a, b) => {
    // Weak first, then by accuracy ascending, unknown last
    if (a.classification === 'weak' && b.classification !== 'weak') return -1
    if (b.classification === 'weak' && a.classification !== 'weak') return 1
    if (a.total_attempts === 0) return 1
    if (b.total_attempts === 0) return -1
    return (a.accuracy ?? 1) - (b.accuracy ?? 1)
  })

  // Calculate topic-level stats
  const attempted = conceptList.filter(c => c.total_attempts > 0)
  const topicAccuracy = attempted.length > 0
    ? attempted.reduce((sum, c) => sum + (c.accuracy ?? 0), 0) / attempted.length
    : null
  const totalAttempts = conceptList.reduce((sum, c) => sum + c.total_attempts, 0)
  const weakCount = conceptList.filter(c => c.classification === 'weak').length

  return NextResponse.json({
    topic_name: topic.name,
    domain_name: (topic.domains as any)?.name ?? '',
    accuracy: topicAccuracy,
    total_attempts: totalAttempts,
    weak_concept_count: weakCount,
    concepts: conceptList,
  })
}