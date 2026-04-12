import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateAndParse } from '@/lib/openai'
import {
  buildConceptualSimpluPrompt,
  buildConceptualMultipluPrompt,
  buildFactualSimpluPrompt,
  buildFactualMultipluPrompt,
  buildFollowUpExplicaMaiSimplu,
  buildFollowUpCelelalteGresite,
  buildFollowUpRegulaGenerala,
  buildDrillExplanationPrompt,
} from '@/lib/prompts'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
  questionId,
  selectedOptions: selectedOptionsCamel,
  selected_options,
  confidence,
  isDrill,
  followUpType,
  originalExplanation,
  drillAngle,
} = body
const selectedOptions = selectedOptionsCamel ?? selected_options

  // Get question details
  const { data: question } = await supabase
    .from('questions')
    .select(`
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      option_e,
      correct_options,
      question_type,
      question_category,
      concept_id,
      concepts (
        name,
        concept_subcapitole (
          is_primary,
          subcapitole (
            subchapter_name,
            page_start,
            page_end,
            chapters (
              book_name,
              chapter_name
            )
          )
        )
      )
    `)
    .eq('id', questionId)
    .single()

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const options: Record<string, string> = {
    a: question.option_a,
    b: question.option_b,
    c: question.option_c,
    d: question.option_d,
  }
  if (question.option_e) options.e = question.option_e

  const correctOptions = question.correct_options as string[]
  const correctOption = correctOptions[0]

// Build source reference from concept_subcapitole
const primarySubcap = (question.concepts as any)?.concept_subcapitole
  ?.find((cs: any) => cs.is_primary)?.subcapitole

const sursa = primarySubcap
  ? `${primarySubcap.chapters?.book_name} — ${primarySubcap.subchapter_name}, p.${primarySubcap.page_start}–${primarySubcap.page_end}`
  : null

  // Check if explanation already exists in cache
  if (!followUpType && !isDrill) {
    const { data: cached } = await supabase
      .from('cached_explanations')
      .select('explanation')
      .eq('question_id', questionId)
      .eq('selected_options', JSON.stringify(selectedOptions.sort()))
      .single()

    if (cached) {
      return NextResponse.json({ explanation: cached.explanation, fromCache: true })
    }
  }

  let prompt = ''

  // Handle follow-ups
  if (followUpType === 'explica_mai_simplu') {
    prompt = buildFollowUpExplicaMaiSimplu({ originalExplanation })
  } else if (followUpType === 'celelalte_gresite') {
    prompt = buildFollowUpCelelalteGresite({
      questionText: question.question_text,
      options,
      correctOption,
    })
  } else if (followUpType === 'regula_generala') {
    prompt = buildFollowUpRegulaGenerala({
      questionText: question.question_text,
    })
  } else if (isDrill) {
    prompt = buildDrillExplanationPrompt({
      questionText: question.question_text,
      options,
      correctOption,
      selectedOption: selectedOptions[0],
      drillAngle: drillAngle || 'definition',
    })
  } else {
    // Main explanation — pick prompt based on category + type
    const category = question.question_category
    const type = question.question_type

    if (category === 'conceptual' && type === 'simplu') {
      prompt = buildConceptualSimpluPrompt({
        questionText: question.question_text,
        options,
        correctOption,
        selectedOption: selectedOptions[0],
        confidence,
        sursa,
      })
    } else if (category === 'conceptual' && type === 'multiplu') {
      prompt = buildConceptualMultipluPrompt({
        questionText: question.question_text,
        options,
        correctOptions,
        selectedOptions,
        confidence,
        sursa,
      })
    } else if (category === 'factual' && type === 'simplu') {
      prompt = buildFactualSimpluPrompt({
        questionText: question.question_text,
        options,
        correctOption,
        selectedOption: selectedOptions[0],
        sursa,
      })
    } else {
      prompt = buildFactualMultipluPrompt({
        questionText: question.question_text,
        options,
        correctOptions,
        selectedOptions,
        sursa,
      })
    }
  }

  // Generate explanation
  const explanation = await generateAndParse(prompt)

  // Cache main explanations (not follow-ups, not drills)
  if (!followUpType && !isDrill) {
    await supabase
      .from('cached_explanations')
      .insert({
        question_id: questionId,
        selected_options: JSON.stringify(selectedOptions.sort()),
        explanation: explanation,
      })
      .then(() => {}) // fire and forget
  }

  return NextResponse.json({ explanation })
}