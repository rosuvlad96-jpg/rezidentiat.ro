import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const examId = process.env.NEXT_PUBLIC_EXAM_ID!

  // Fetch chapters (books) with their subcapitole
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select(`
      id,
      book_name,
      display_order,
      subcapitole (
        id,
        subchapter_name,
        page_start,
        page_end,
        display_order
      )
    `)
    .eq('exam_id', examId)
    .order('display_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort subcapitole by display_order within each chapter
  const result = (chapters ?? []).map(chapter => ({
    ...chapter,
    subcapitole: [...(chapter.subcapitole ?? [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    ),
  }))

  return NextResponse.json(result)
}