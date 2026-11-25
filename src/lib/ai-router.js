
export async function generateChatResponse(messages, retries = 2) {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!openRouterKey) {
    throw new Error('OpenRouter API key is missing. Check your .env file.');
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('No conversation messages were provided.');
  }

  const systemPrompt = `You are PDT Study Tutor, a professional academic tutor for Kenyan students.

RULES:
1. Never introduce yourself or use emojis.
2. Explain concepts clearly using simple, professional language.
3. Use Markdown headings and lists where helpful.
4. Use relevant CBC and 8-4-4 curriculum examples.
5. Break difficult concepts into manageable steps.
6. Encourage understanding, not memorisation alone.
7. Never invent facts or examination requirements.
8. Answer the student's actual question directly.
9. Keep normal answers concise. Expand only when necessary.
10. Use examples when they genuinely improve understanding.`;

  const maxAttempts = Math.max(1, Math.min(retries, 2));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'PDT Study'
          },
          body: JSON.stringify({
            model: 'nvidia/nemotron-3.5-super-vl:free',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages
            ],
            temperature: 0.3,
            max_tokens: 900
          })
        }
      );

      if (
        (response.status === 429 || response.status === 503) &&
        attempt < maxAttempts
      ) {
        await new Promise(resolve => setTimeout(resolve, 800));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI request failed (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content || typeof content !== 'string') {
        throw new Error('The AI returned an empty response.');
      }

      return content.trim();

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('The tutor took too long to respond. Please try again.');
      }

      if (attempt === maxAttempts) throw error;

      if (
        error.message.includes('AI request failed') &&
        !error.message.includes('(429)') &&
        !error.message.includes('(503)')
      ) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 800));

    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Unable to generate a response.');
}


// Extract JSON even when the AI adds Markdown or introductory text.
function extractQuizJSON(content) {
  let cleaned = content.trim();

  cleaned = cleaned
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('The AI did not return a valid quiz structure. Please try again.');
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('The AI returned invalid quiz data. Please generate again.');
  }
}


// AI QUIZ GENERATOR
export async function generateQuiz({
  topic,
  subject = '',
  difficulty = 'Medium',
  questionCount = 10,
  questionType = 'Multiple choice'
}) {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!openRouterKey) {
    throw new Error('OpenRouter API key is missing. Check your .env file.');
  }

  if (!topic?.trim()) {
    throw new Error('Please select a topic for the quiz.');
  }

  const count = Math.max(1, Math.min(Number(questionCount) || 10, 20));

  const prompt = `
Create a ${difficulty} educational quiz for a Kenyan student.

Subject: ${subject || 'General'}
Topic: ${topic}
Question type: ${questionType}
Number of questions: ${count}

Rules:
- Questions must relate directly to the selected topic.
- Use accurate, curriculum-appropriate information.
- Do not repeat questions.
- Multiple choice questions must have four options.
- True/False questions must have exactly two options: True and False.
- correctAnswer must be the exact text of the correct option.
- Every question must include an explanation.
- Return exactly ${count} questions.

Return ONLY a JSON object using this exact structure:

{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Explanation of the correct answer."
    }
  ]
}

Do not include Markdown, code fences, introductions or text outside the JSON.
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PDT Study'
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3.5-super-vl:free',
          messages: [
            {
              role: 'system',
              content: 'You are an educational quiz generator. Return only valid JSON. Follow the requested JSON structure exactly.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Quiz generation failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      throw new Error('The AI returned an empty quiz.');
    }

    const quiz = extractQuizJSON(content);

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error('The AI did not generate any questions. Please try again.');
    }

    const validatedQuestions = quiz.questions.map((q, index) => {
      if (
        typeof q.question !== 'string' ||
        !q.question.trim() ||
        !Array.isArray(q.options) ||
        q.options.length < 2
      ) {
        throw new Error(`Question ${index + 1} has invalid data.`);
      }

      const options = q.options.map(option => String(option).trim());

      if (options.some(option => !option)) {
        throw new Error(`Question ${index + 1} contains an empty option.`);
      }

      // Support both exact answer text and older numeric answer indexes.
      let correctAnswer = q.correctAnswer ?? q.correct_answer;

      if (typeof correctAnswer === 'number') {
        correctAnswer = options[correctAnswer];
      } else if (
        typeof correctAnswer === 'string' &&
        /^\d+$/.test(correctAnswer.trim()) &&
        Number(correctAnswer) < options.length
      ) {
        correctAnswer = options[Number(correctAnswer)];
      }

      if (
        typeof correctAnswer !== 'string' ||
        !options.includes(correctAnswer.trim())
      ) {
        throw new Error(`Question ${index + 1} has an invalid correct answer.`);
      }

      return {
        question: q.question.trim(),
        options,
        correctAnswer: correctAnswer.trim(),
        explanation: String(q.explanation || '').trim()
      };
    });

    return {
      title: String(quiz.title || `${topic} Quiz`),
      questions: validatedQuestions
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Quiz generation took too long. Please try again.');
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}
