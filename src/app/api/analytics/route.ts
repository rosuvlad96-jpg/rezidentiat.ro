import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { trackEvent, EventType } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { eventType, sessionId, payload } = body

  if (!eventType || !payload) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await trackEvent({
    userId: user.id,
    examId: process.env.NEXT_PUBLIC_EXAM_ID!,
    sessionId,
    eventType: eventType as EventType,
    payload,
  })

  return NextResponse.json({ ok: true })
}