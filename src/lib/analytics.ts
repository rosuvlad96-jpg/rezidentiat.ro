import type { EventType } from '@/lib/analytics-client'
export type { EventType }

interface TrackEventParams {
  userId: string
  examId: string
  sessionId?: string
  eventType: EventType
  payload: Record<string, unknown>
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('analytics_events').insert({
    user_id: params.userId,
    exam_id: params.examId,
    session_id: params.sessionId ?? null,
    event_type: params.eventType,
    payload: params.payload,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[analytics.trackEvent]', params.eventType, error.message)
  }
}