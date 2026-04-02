import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domainId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { domainId } = await context.params
  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  // Get domain details
  const { data: domain } = await supabase
    .from('domains')
    .select('id, name')
    .eq('id', domainId)
    .single()

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }

  // Get all topics in this domain
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name, display_order')
    .eq('domain_id', domainId)
    .eq('exam_id', examId)
    .order('display_order')

  if (!topics || topics.length === 0) {
    return NextResponse.json({
      domain_name: domain.name,
      accuracy: null,
      total_attempts: 0,
      topics: [],
    })
  }

  // Get all concepts in this domain
  const { data: concepts } = await supabase
    .from('concepts')
    .select('id, topic_id')
    .eq('domain_id', domainId)
    .eq('exam_id', examId)

  if (!concepts || concepts.length === 0) {
    return NextResponse.json({
      domain_name: domain.name,
      accuracy: null,
      total_attempts: 0,
      topics: topics.map(t => ({
        topic_id: t.id,
        topic_name: t.name,
        accuracy: null,
        total_attempts: 0,
        weak_concept_count: 0,
      })),
    })
  }

  const conceptIds = concepts.map(c => c.id)

  // Get user stats for all concepts in this domain
  const { data: stats } = await supabase
    .from('user_concept_stats')
    .select('concept_id, accuracy, total_attempts, classification')
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .in('concept_id', conceptIds)

  const statsMap = Object.fromEntries(
    (stats ?? []).map(s => [s.concept_id, s])
  )

  // Build topic list with stats
  const topicList = topics.map(topic => {
    const topicConcepts = concepts.filter(c => c.topic_id === topic.id)
    const topicStats = topicConcepts
      .map(c => statsMap[c.id])
      .filter(Boolean)

    const attempted = topicStats.filter(s => s.total_attempts > 0)
    const topicAccuracy = attempted.length > 0
      ? attempted.reduce((sum, s) => sum + s.accuracy, 0) / attempted.length
      : null
    const totalAttempts = topicStats.reduce((sum, s) => sum + s.total_attempts, 0)
    const weakCount = topicStats.filter(s => s.classification === 'weak').length

    return {
      topic_id: topic.id,
      topic_name: topic.name,
      accuracy: topicAccuracy,
      total_attempts: totalAttempts,
      weak_concept_count: weakCount,
    }
  })

  // Calculate domain accuracy
  const attemptedTopics = topicList.filter(t => t.accuracy !== null)
  const domainAccuracy = attemptedTopics.length > 0
    ? attemptedTopics.reduce((sum, t) => sum + (t.accuracy ?? 0), 0) / attemptedTopics.length
    : null
  const domainTotalAttempts = topicList.reduce((sum, t) => sum + t.total_attempts, 0)

  return NextResponse.json({
    domain_name: domain.name,
    accuracy: domainAccuracy,
    total_attempts: domainTotalAttempts,
    topics: topicList,
  })
}