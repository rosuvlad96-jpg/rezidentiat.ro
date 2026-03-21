import { createServerSupabaseClient } from '@/lib/supabase-server'

export type EventType =
  | 'QUESTION_ANSWERED'
  | 'EXPLANATION_VIEWED'
  | 'DRILL_STARTED'
  | 'DRILL_COMPLETED'
  | 'DRILL_ABANDONED'
  | 'SESSION_START'
  | 'SESSION_END'
  | 'FUNNEL_EVENT'

interface TrackEventParams {
  userId: string
  examId: string
  sessionId?: string
  eventType: EventType
  payload: Record<string, unknown>
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('analytics_events').insert({
    user_id: params.userId,
    exam_id: params.examId,
    session_id: params.sessionId ?? null,
    event_type: params.eventType,
    payload: params.payload,
    created_at: new Date().toISOString(),
  })

  // Never throw on analytics failure — log silently
  if (error) {
    console.error('[analytics.trackEvent]', params.eventType, error.message)
  }
}

// ─── Client-side event tracking (calls API route) ─────────────────────────

export async function trackClientEvent(
  eventType: EventType,
  payload: Record<string, unknown>,
  sessionId?: string
): Promise<void> {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, payload, sessionId }),
    })
  } catch (err) {
    // Never throw on analytics failure — log silently
    console.error('[analytics.trackClientEvent]', eventType, err)
  }
}