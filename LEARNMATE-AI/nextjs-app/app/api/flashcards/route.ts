import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { notes } = await req.json()

    if (!notes) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
    }

    const prompt = `Create flashcards from the following notes. Generate 5-8 flashcards in JSON format with the following structure:
{
  "flashcards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ]
}
Focus on key concepts, definitions, and important facts. Make questions clear and answers concise.

Notes: ${notes}`

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Ollama error ${response.status}: ${errText}`)
    }

    const data = await response.json()

    try {
      // Try to extract valid JSON object from model response
      const match = data.response?.match(/\{[\s\S]*\}/)
      if (match) {
        const json = JSON.parse(match[0])
        return NextResponse.json(json)
      }
    } catch (parseError) {
      console.warn('Could not parse model output as JSON:', parseError)
    }

    // Fallback if model response is not valid JSON
    return NextResponse.json({
      flashcards: [{ front: 'Generated from your notes', back: data.response || 'No response' }],
    })

  } catch (error: any) {
    console.error('Flashcards API error:', error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
