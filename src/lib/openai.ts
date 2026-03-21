export async function generateExplanation(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  return clean
}

export async function generateAndParse<T>(prompt: string): Promise<T> {
  const raw = await generateExplanation(prompt)
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${raw}`)
  }
}