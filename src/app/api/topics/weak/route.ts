import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  // Get all concept stats for this user
  const { data: conceptStats } = await supabase
    .from('user_concept_stats')
    .select(`
      concept_id,
      accuracy,
      total_attempts,
      classification,
      concepts (
        topic_id,
        topics (
          id,
          name,
          domain_id,
          domains (
            name
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .gt('total_attempts', 0)

  if (!conceptStats || conceptStats.length === 0) {
    return NextResponse.json([])
  }

  // Group by topic
  const topicMap: Record<string, {
    topic_id: string
    topic_name: string
    domain_name: string
    accuracies: number[]
    total_attempts: number
    weak_concept_count: number
  }> = {}

  conceptStats.forEach((stat: any) => {
    const topic = stat.concepts?.topics
    if (!topic) return

    if (!topicMap[topic.id]) {
      topicMap[topic.id] = {
        topic_id: topic.id,
        topic_name: topic.name,
        domain_name: topic.domains?.name ?? '',
        accuracies: [],
        total_attempts: 0,
        weak_concept_count: 0,
      }
    }

    topicMap[topic.id].accuracies.push(stat.accuracy)
    topicMap[topic.id].total_attempts += stat.total_attempts
    if (stat.classification === 'weak') {
      topicMap[topic.id].weak_concept_count += 1
    }
  })

  // Calculate topic accuracy and sort worst to best
  const topics = Object.values(topicMap).map(t => ({
    topic_id: t.topic_id,
    topic_name: t.topic_name,
    domain_name: t.domain_name,
    accuracy: t.accuracies.reduce((a, b) => a + b, 0) / t.accuracies.length,
    total_attempts: t.total_attempts,
    weak_concept_count: t.weak_concept_count,
  })).sort((a, b) => a.accuracy - b.accuracy)

  return NextResponse.json(topics)
}