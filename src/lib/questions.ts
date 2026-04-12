
export type PracticeMode = 'general' | 'chapter' | 'exam' | 'diagnostic' | 'drill'
 
export async function getNextQuestion(
  userId: string,
  examId: string,
  mode: PracticeMode,
  chapterId?: string,
  subcapitolId?: string
) {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
const supabase = await createServerSupabaseClient()
 
  // 25/75 split: 25% simplu, 75% multiplu
  const questionType = Math.random() < 0.25 ? 'simplu' : 'multiplu'
 
  let query = supabase
    .from('questions')
    .select(`
      id,
      concept_id,
      chapter_id,
      question_type,
      question_category,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      option_e,
      correct_options,
      points,
      explanation,
      source,
      question_source_detail
    `)
    .eq('exam_id', examId)
    .eq('is_active', true)
    .eq('question_type', questionType)
 
  // Filter by subcapitol if in chapter mode with subcapitolId
  if (mode === 'chapter' && subcapitolId) {
    query = query.eq('subcapitol_id', subcapitolId)
  } else if (mode === 'chapter' && chapterId) {
    query = query.eq('chapter_id', chapterId)
  }
 
  // Chapter mode: prioritize unseen concepts first
  if (mode === 'chapter') {
    const { data: seenConcepts } = await supabase
      .from('user_concept_stats')
      .select('concept_id')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .gt('total_attempts', 0)
 
    const seenConceptIds = seenConcepts?.map(c => c.concept_id) ?? []
 
    if (seenConceptIds.length > 0) {
      const filterCol = subcapitolId ? 'subcapitol_id' : 'chapter_id'
      const filterVal = subcapitolId ?? chapterId ?? ''
 
      const { data: unseenQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('exam_id', examId)
        .eq('is_active', true)
        .eq(filterCol, filterVal)
        .not('concept_id', 'in', `(${seenConceptIds.join(',')})`)
 
      if (unseenQuestions && unseenQuestions.length > 0) {
        query = query.not('concept_id', 'in', `(${seenConceptIds.join(',')})`)
      }
    }
  }
 
  // Get answered question IDs to avoid repeats in same session
  const { data: answeredQuestions } = await supabase
    .from('user_answers')
    .select('question_id')
    .eq('user_id', userId)
 
  const answeredIds = answeredQuestions?.map(a => a.question_id) || []
 
  if (answeredIds.length > 0) {
    query = query.not('id', 'in', `(${answeredIds.join(',')})`)
  }
 
  // Get random question
  const { data: questions, error } = await query
 
  if (error || !questions || questions.length === 0) {
    // Fallback: if no questions of that type, try the other type
    const fallbackType = questionType === 'simplu' ? 'multiplu' : 'simplu'
    const { data: fallback } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .eq('is_active', true)
      .eq('question_type', fallbackType)
      .limit(1)
      .single()
 
    return fallback
  }
 
  // Pick a random question from results
  const randomIndex = Math.floor(Math.random() * questions.length)
  return questions[randomIndex]
}
 
export async function submitAnswer(
  userId: string,
  questionId: string,
  selectedOptions: string[],
  confidence: number | null,
  sessionId: string,
  mode: PracticeMode
) {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
const supabase = await createServerSupabaseClient()
 
  // Get the question to check correct answer
  const { data: question, error } = await supabase
    .from('questions')
    .select('correct_options, concept_id, exam_id, question_type, points')
    .eq('id', questionId)
    .single()
 
  if (error || !question) {
    throw new Error('Question not found')
  }
 
  const correctOptions = question.correct_options as string[]
  const isFullyCorrect =
    selectedOptions.length === correctOptions.length &&
    selectedOptions.every(o => correctOptions.includes(o))
 
  // Calculate partial score for multiplu
  let partialScore = 0
  if (question.question_type === 'simplu') {
    partialScore = isFullyCorrect ? 1 : 0
  } else {
    const correctSelected = selectedOptions.filter(o => correctOptions.includes(o)).length
    const incorrectSelected = selectedOptions.filter(o => !correctOptions.includes(o)).length
    partialScore = Math.max(0, (correctSelected - incorrectSelected) / correctOptions.length)
  }
 
  // Save the answer
  const { error: insertError } = await supabase
    .from('user_answers')
    .insert({
      user_id: userId,
      question_id: questionId,
      concept_id: question.concept_id,
      exam_id: question.exam_id,
      selected_options: selectedOptions,
      correct_options: correctOptions,
      is_fully_correct: isFullyCorrect,
      partial_score: partialScore,
      confidence: confidence,
      practice_mode: mode,
      session_id: sessionId,
    })
 
  if (insertError) {
    throw new Error('Failed to save answer')
  }
 
  // Update concept stats
  await updateConceptStats(userId, question.concept_id, question.exam_id, isFullyCorrect)
 
  return {
    isFullyCorrect,
    correctOptions,
    partialScore,
    conceptId: question.concept_id,
  }
}
 
export async function updateConceptStats(
  userId: string,
  conceptId: string,
  examId: string,
  isCorrect: boolean
) {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
const supabase = await createServerSupabaseClient()
 
  // Get existing stats
  const { data: existing } = await supabase
    .from('user_concept_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('concept_id', conceptId)
    .single()
 
  if (existing) {
    const newCorrect = existing.correct_count + (isCorrect ? 1 : 0)
    const newWrong = existing.wrong_count + (isCorrect ? 0 : 1)
    const newTotal = existing.total_attempts + 1
    const newAccuracy = newCorrect / newTotal
 
 // Classification rules — 1+ attempt, pure accuracy
    let classification = 'unknown'
    if (newAccuracy < 0.5) classification = 'weak'
    else if (newAccuracy <= 0.8) classification = 'medium'
    else classification = 'strong'
 
    await supabase
      .from('user_concept_stats')
      .update({
        correct_count: newCorrect,
        wrong_count: newWrong,
        total_attempts: newTotal,
        accuracy: newAccuracy,
        classification,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    // First attempt for this concept
    await supabase
      .from('user_concept_stats')
      .insert({
        user_id: userId,
        concept_id: conceptId,
        exam_id: examId,
        correct_count: isCorrect ? 1 : 0,
        wrong_count: isCorrect ? 0 : 1,
        total_attempts: 1,
        accuracy: isCorrect ? 1 : 0,
        classification: isCorrect ? 'strong' : 'weak',
        last_seen: new Date().toISOString(),
      })
  }
}
 
export async function getWeakConcepts(userId: string, examId: string, limit = 5) {
 const { createServerSupabaseClient } = await import('@/lib/supabase-server')
const supabase = await createServerSupabaseClient()
 
  const { data, error } = await supabase
    .from('user_concept_stats')
    .select(`
      concept_id,
      accuracy,
      total_attempts,
      classification,
      concepts (
        name,
        topic_id,
        domain_id,
        topics (name),
        domains (name)
      )
    `)
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .eq('classification', 'weak')
    .order('accuracy', { ascending: true })
    .limit(limit)
 
  return data || []
}
 
export async function getDomainAccuracy(userId: string, examId: string) {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
const supabase = await createServerSupabaseClient()
 
  const { data, error } = await supabase
    .from('user_concept_stats')
    .select(`
      accuracy,
      concepts (
        domain_id,
        domains (id, name, display_order)
      )
    `)
    .eq('user_id', userId)
    .eq('exam_id', examId)
 
  if (!data) return []
 
  // Group by domain and calculate average accuracy
  const domainMap: Record<string, { name: string, accuracies: number[], order: number }> = {}
 
  data.forEach((stat: any) => {
    const domain = stat.concepts?.domains
    if (!domain) return
    if (!domainMap[domain.id]) {
      domainMap[domain.id] = { name: domain.name, accuracies: [], order: domain.display_order }
    }
    domainMap[domain.id].accuracies.push(stat.accuracy)
  })
 
  return Object.entries(domainMap).map(([id, d]) => ({
    id,
    name: d.name,
    display_order: d.order,
    accuracy: d.accuracies.reduce((a, b) => a + b, 0) / d.accuracies.length,
  })).sort((a, b) => a.display_order - b.display_order)
}
 