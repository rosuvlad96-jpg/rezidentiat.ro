export type EventType =
  | 'QUESTION_ANSWERED'
  | 'EXPLANATION_VIEWED'
  | 'DRILL_STARTED'
  | 'DRILL_COMPLETED'
  | 'DRILL_ABANDONED'
  | 'SESSION_START'
  | 'SESSION_END'
  | 'FUNNEL_EVENT'

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
    console.error('[analytics.trackClientEvent]', eventType, err)
  }
}