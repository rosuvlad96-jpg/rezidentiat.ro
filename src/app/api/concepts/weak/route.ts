import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '5')
  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  const { data, error } = await supabase
    .from('user_concept_stats')
    .select(`
      concept_id,
      accuracy,
      total_attempts,
      concepts (
        name,
        topics (
          name,
          domains (
            name
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .eq('classification', 'weak')
    .gte('total_attempts', 3)
    .order('accuracy', { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}