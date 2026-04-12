import { generateAndParse } from '@/lib/openai'
import { buildDrillGenerationPrompt } from '@/lib/prompts'
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
export type DrillAngle = 'definition' | 'mechanism' | 'clinical' | 'comparison' | 'reverse'
export type QuestionType = 'simplu' | 'multiplu'
 
export interface GeneratedDrillQuestion {
  drill_angle: DrillAngle
  question_type: QuestionType
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_options: string[]
  explanation: string
  retine: string
}
 
export interface DrillQuestionForClient {
  id: string
  question_type: QuestionType
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  drill_angle: DrillAngle
}
 
export interface DrillSession {
  assignment_id: string
  concept_id: string
  concept_name: string
  drill_set_id: number
  questions: DrillQuestionForClient[]
  accuracy_before_drill: number | null
}
 
// ─── Shuffle options to randomize correct answer position ─────────────────────
 
function shuffleOptions(q: GeneratedDrillQuestion): GeneratedDrillQuestion {
  const letters = ['a', 'b', 'c', 'd']
 
  // Fisher-Yates shuffle
  const shuffled = [...letters]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
 
  // Plain object lookup — safe and explicit
  const optionValues: Record<string, string> = {
    a: q.option_a,
    b: q.option_b,
    c: q.option_c,
    d: q.option_d,
  }
 
  const newOpts: Record<string, string> = {}
  const oldToNew: Record<string, string> = {}
 
  // shuffled[i] = which old letter goes into new position i
  letters.forEach((newLetter, i) => {
    const oldLetter = shuffled[i]
    newOpts[`option_${newLetter}`] = optionValues[oldLetter]
    oldToNew[oldLetter] = newLetter
  })
 
  const newCorrect = q.correct_options.map(c => oldToNew[c])
 
  return {
    ...q,
    option_a: newOpts['option_a'],
    option_b: newOpts['option_b'],
    option_c: newOpts['option_c'],
    option_d: newOpts['option_d'],
    correct_options: newCorrect,
  }
}
 
// ─── Generate a new drill set via OpenAI ─────────────────────────────────────
 
export async function generateDrillSet(conceptId: string): Promise<number> {
  const { createAdminSupabaseClient } = await import('@/lib/supabase-server')
  const supabase = createAdminSupabaseClient()
 
  // 1. Fetch concept details
  const { data: concept, error: conceptError } = await supabase
    .from('concepts')
    .select('id, name, name_en, key_excerpt')
    .eq('id', conceptId)
    .single()
 
  if (conceptError || !concept) {
    throw new Error(`Concept not found: ${conceptId}`)
  }
 
  // 2. Fetch all linked subchapters (primary first)
  const { data: linkedSubs } = await supabase
    .from('concept_subcapitole')
    .select(`
      is_primary,
      subcapitole (
        subchapter_name,
        page_start,
        page_end,
        chapters ( book_name, chapter_name )
      )
    `)
    .eq('concept_id', conceptId)
    .order('is_primary', { ascending: false })
 
  // 3. Determine next drill_set_id
  const { data: existingSets } = await supabase
    .from('drill_questions')
    .select('drill_set_id')
    .eq('concept_id', conceptId)
    .order('drill_set_id', { ascending: false })
    .limit(1)
 
  const nextSetId =
    existingSets && existingSets.length > 0
      ? existingSets[0].drill_set_id + 1
      : 1
 
  if (nextSetId > 3) {
    throw new Error(`Max drill sets (3) already generated for concept ${conceptId}`)
  }
 
  // 4. Build subchapter context string for the prompt
  const subchapterContext =
    linkedSubs
      ?.map((link) => {
        const sub = link.subcapitole as any
        const chapter = sub?.chapters as any
        return `- ${sub?.subchapter_name} (${chapter?.book_name}, ${chapter?.chapter_name}, pp. ${sub?.page_start}–${sub?.page_end})${link.is_primary ? ' [sursa principala]' : ''}`
      })
      .join('\n') ?? 'Context indisponibil'
 
  // 5. Build prompt and call OpenAI
  const prompt = buildDrillGenerationPrompt({
    conceptName: concept.name,
    conceptNameEn: concept.name_en ?? '',
    keyExcerpt: concept.key_excerpt ?? null,
    subchapterContext,
    drillSetId: nextSetId,
  })
 
  const questions = await generateAndParse<GeneratedDrillQuestion[]>(prompt)
 
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error(`OpenAI returned ${questions?.length ?? 0} questions, expected 5`)
  }
 
  // Shuffle options to randomize correct answer position
  const shuffledQuestions = questions.map(shuffleOptions)
 
  // 6. Store in drill_questions table
  const rows = shuffledQuestions.map((q) => ({
    concept_id: conceptId,
    drill_set_id: nextSetId,
    question_type: q.question_type,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_options: q.correct_options,
    explanation: q.explanation,
    retine: q.retine,
    drill_angle: q.drill_angle,
  }))
 
  const { error: insertError } = await supabase
    .from('drill_questions')
    .insert(rows)
 
  if (insertError) {
    throw new Error(`Failed to store drill questions: ${insertError.message}`)
  }
 
  return nextSetId
}
 
// ─── Assign a drill set to a user ────────────────────────────────────────────
 
export async function assignDrillSet(
  userId: string,
  conceptId: string,
  trigger: 'manual' | 'auto_suggested' | 'dashboard' = 'manual'
): Promise<DrillSession> {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
  const supabase = await createServerSupabaseClient()
 
  // 1. What drill sets exist for this concept?
  const { data: allSets } = await supabase
    .from('drill_questions')
    .select('drill_set_id')
    .eq('concept_id', conceptId)
    .order('drill_set_id')
 
  const existingSetIds = [...new Set(allSets?.map((r) => r.drill_set_id) ?? [])]
 
  // 2. Which sets has this user already completed?
  const { data: seenAssignments } = await supabase
    .from('user_drill_assignments')
    .select('drill_set_id')
    .eq('user_id', userId)
    .eq('concept_id', conceptId)
    .not('completed_at', 'is', null)
 
  const seenSetIds = new Set(seenAssignments?.map((r) => r.drill_set_id) ?? [])
 
  // 3. Pick next unseen set, generate one, or cycle back to set 1
  let targetSetId: number
 
  const unseenSet = existingSetIds.find((id) => !seenSetIds.has(id))
 
  if (unseenSet) {
    targetSetId = unseenSet
  } else if (existingSetIds.length < 3) {
    targetSetId = await generateDrillSet(conceptId)
  } else {
    // All 3 sets seen — restart from set 1
    targetSetId = 1
  }
 
  // 4. Snapshot accuracy before drill starts
  const { data: stats } = await supabase
    .from('user_concept_stats')
    .select('accuracy')
    .eq('user_id', userId)
    .eq('concept_id', conceptId)
    .single()
 
  const accuracyBefore = stats?.accuracy ?? null
 
  // 5. Create the assignment record
  const { data: assignment, error: assignError } = await supabase
    .from('user_drill_assignments')
    .insert({
      user_id: userId,
      concept_id: conceptId,
      drill_set_id: targetSetId,
      assigned_at: new Date().toISOString(),
      accuracy_before_drill: accuracyBefore,
    })
    .select('id')
    .single()
 
  if (assignError || !assignment) {
    throw new Error(`Failed to create drill assignment: ${assignError?.message}`)
  }
 
  // 6. Fetch the 5 questions (without correct_options — never sent to client)
  const { data: questions, error: qError } = await supabase
    .from('drill_questions')
    .select('id, question_type, question_text, option_a, option_b, option_c, option_d, drill_angle')
    .eq('concept_id', conceptId)
    .eq('drill_set_id', targetSetId)
 
  if (qError || !questions) {
    throw new Error('Failed to fetch drill questions')
  }
 
  // 7. Fetch concept name for the UI
  const { data: concept } = await supabase
    .from('concepts')
    .select('name')
    .eq('id', conceptId)
    .single()
 
  return {
    assignment_id: assignment.id,
    concept_id: conceptId,
    concept_name: concept?.name ?? '',
    drill_set_id: targetSetId,
    questions,
    accuracy_before_drill: accuracyBefore,
  }
}
 
// ─── Complete a drill session ─────────────────────────────────────────────────
 
export async function completeDrill(
  assignmentId: string,
  userId: string,
  conceptId: string,
  correctCount: number,
  totalCount: number
): Promise<{ accuracy_before: number | null; accuracy_after: number }> {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
  const supabase = await createServerSupabaseClient()
 
  const drillAccuracy = correctCount / totalCount
 
  // Get the latest concept accuracy (updated during the session by submitAnswer)
  const { data: stats } = await supabase
    .from('user_concept_stats')
    .select('accuracy')
    .eq('user_id', userId)
    .eq('concept_id', conceptId)
    .single()
 
  const accuracyAfter = (stats?.accuracy != null && !isNaN(Number(stats.accuracy))) ? Number(stats.accuracy) : drillAccuracy
 
  // Get accuracy_before from the assignment record
  const { data: assignment } = await supabase
    .from('user_drill_assignments')
    .select('accuracy_before_drill')
    .eq('id', assignmentId)
    .single()
 
  // Mark assignment complete
  const { error } = await supabase
    .from('user_drill_assignments')
    .update({
      completed_at: new Date().toISOString(),
      accuracy_after_drill: accuracyAfter,
    })
    .eq('id', assignmentId)
 
  if (error) {
    throw new Error(`Failed to complete drill: ${error.message}`)
  }
 
  return {
    accuracy_before: assignment?.accuracy_before_drill ?? null,
    accuracy_after: accuracyAfter,
  }
}