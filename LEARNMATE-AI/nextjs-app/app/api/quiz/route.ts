import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const prompt = `Create a quiz from the following text. Generate 4-6 multiple choice questions in JSON format with the following structure:
{
  "quiz": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Make questions challenging but fair, with plausible distractors for incorrect options.

Text: ${text}`

    // Call Ollama API
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:latest', // ensure this model is installed, else change to 'llama3'
        prompt: prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Ollama error:', response.status, errText)
      throw new Error(`Ollama error ${response.status}: ${errText}`)
    }

    const data = await response.json()

    try {
      // Try to extract JSON from the response text
      const quizMatch = data.response.match(/\{[\s\S]*\}/)
      if (quizMatch) {
        const quizData = JSON.parse(quizMatch[0])
        return NextResponse.json(quizData)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
    }

    // Fallback quiz if model didn’t return valid JSON
    return NextResponse.json({
      quiz: [
        {
          question: "What is the main topic of the provided text?",
          options: ["Topic A", "Topic B", "Topic C", "Topic D"],
          correct: 0,
          explanation: data.response || 'Generated from your text'
        }
      ]
    })
  } catch (error) {
    console.error('Quiz API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz. Please check Ollama server and model availability.' },
      { status: 500 }
    )
  }
}
