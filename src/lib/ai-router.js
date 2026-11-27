// src/lib/ai-router.js
//
// Same exports and return values as before:
//   generateChatResponse(messages, retries?, context?)  ->  string
//   generateQuiz({ topic, subject, difficulty, questionCount, questionType })
//                                                       ->  { title, questions[] }
//
// What is new:
//   * Falls back to a second model quickly instead of failing or waiting
//   * Quizzes are written in parallel parts, so they finish much sooner
//   * The tutor knows the student's level, institution and goals (from their profile)
//   * Cleaner, smaller requests and friendlier error messages

import { supabase } from './supabase';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Optional overrides in .env:
//   VITE_AI_MODEL=nvidia/nemotron-3.5-super-vl:free
//   VITE_AI_FALLBACK_MODELS=openrouter/free,another/model:free
const PRIMARY_MODEL = import.meta.env.VITE_AI_MODEL || 'openrouter/free';

const EXTRA_MODELS = (import.meta.env.VITE_AI_FALLBACK_MODELS || 'nvidia/nemotron-3.5-super-vl:free,openrouter/free')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const MODELS = [PRIMARY_MODEL, ...EXTRA_MODELS.filter((model) => model !== PRIMARY_MODEL)];

const CHAT_TIMEOUT_MS = 30000;
const QUIZ_TIMEOUT_MS = 45000;

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 3000;

const PROFILE_TTL_MS = 2 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

function tidy(text, max) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stripThinking(text) {
  return String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function ensureKey() {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!key) {
    throw new Error('OpenRouter API key is missing. Check your .env file.');
  }

  return key;
}

class AIError extends Error {
  constructor(message, { status = 0, retryable = true, fatal = false, timedOut = false } = {}) {
    super(message);
    this.name = 'AIError';
    this.status = status;
    this.retryable = retryable;
    this.fatal = fatal;
    this.timedOut = timedOut;
  }
}

function statusMessage(status) {
  if (status === 401 || status === 403) {
    return 'The AI service rejected the API key. Please check your OpenRouter key.';
  }
  if (status === 402) return 'The AI service has run out of credits.';
  if (status === 429) return 'The AI service is busy right now. Please try again in a moment.';
  if (status >= 500) return 'The AI service is temporarily unavailable. Please try again.';
  return `AI request failed (${status}). Please try again.`;
}

/* ------------------------------------------------------------------ */
/* Student profile (used to personalise answers)                       */
/* ------------------------------------------------------------------ */

const LEVELS = {
  cbc: {
    short: 'CBC',
    label: 'CBC (Competency Based Curriculum)',
    guide:
      'Use simple words, short steps and practical everyday examples suited to a Kenyan CBC learner. Link ideas to real activities and skills where it helps.'
  },
  kcse: {
    short: 'KCSE (8-4-4)',
    label: 'KCSE (Kenyan secondary school, 8-4-4)',
    guide:
      'Pitch answers for a secondary student preparing for KCSE. Show full working for calculations and point out the key points a good exam answer should include, without claiming specific marking scheme details.'
  },
  university: {
    short: 'university',
    label: 'University',
    guide:
      'Use a university level of depth and correct terminology, while still explaining clearly. Mention assumptions and limits where relevant.'
  },
  college: {
    short: 'college',
    label: 'College',
    guide:
      'Use a practical, diploma or certificate level of depth with clear terminology and applied examples.'
  },
  tvet: {
    short: 'TVET',
    label: 'TVET (technical and vocational training)',
    guide:
      'Focus on practical, hands-on understanding and workplace skills, with step-by-step procedures and safety points where relevant.'
  }
};

let profileCache = { userId: null, at: 0, value: {} };

async function getStudentContext() {
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) return {};

    if (profileCache.userId === userId && Date.now() - profileCache.at < PROFILE_TTL_MS) {
      return profileCache.value;
    }

    const { data } = await supabase
      .from('profiles')
      .select('education_level, institution, learning_goals')
      .eq('id', userId)
      .maybeSingle();

    const value = data || {};
    profileCache = { userId, at: Date.now(), value };
    return value;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Core request (one model, one attempt)                               */
/* ------------------------------------------------------------------ */

async function callModel({ model, messages, temperature, maxTokens, timeoutMs, json }) {
  const key = ensureKey();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    if (json) body.response_format = { type: 'json_object' };

    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PDT Study'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`AI request failed (${response.status}) on ${model}:`, detail);

      throw new AIError(statusMessage(response.status), {
        status: response.status,
        fatal: response.status === 401 || response.status === 402 || response.status === 403
      });
    }

    const data = await response.json();

    // OpenRouter can answer 200 with an error object inside
    if (data?.error) {
      console.error(`AI error on ${model}:`, data.error);
      throw new AIError(statusMessage(Number(data.error.code) || 500), {
        status: Number(data.error.code) || 500
      });
    }

    const message = data?.choices?.[0]?.message;
    let rawContent = message?.content;

    // Some providers return content as an array of text blocks.
    if (Array.isArray(rawContent)) {
      rawContent = rawContent
        .map((part) => {
          if (typeof part === 'string') return part;
          if (typeof part?.text === 'string') return part.text;
          return '';
        })
        .join('\n');
    }

    const content = stripThinking(
      typeof rawContent === 'string' ? rawContent : ''
    );

    if (!content) {
      console.warn('AI returned no usable text:', {
        model,
        finishReason: data?.choices?.[0]?.finish_reason,
        hasReasoning: Boolean(message?.reasoning),
        usage: data?.usage
      });

      throw new AIError(
        'The selected AI model returned no usable text. Trying another model.',
        { status: 200 }
      );
    }

    return content;
  } catch (error) {
    if (error instanceof AIError) throw error;

    if (error?.name === 'AbortError') {
      throw new AIError('timeout', { timedOut: true });
    }

    throw new AIError('Network problem. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Tries the primary model, then falls back quickly                    */
/* ------------------------------------------------------------------ */

async function askAI({ retries = 2, timeoutMessage, parse, ...request }) {
  // With fallback models: try each model once (up to 3).
  // With a single model: retry it (up to 2 attempts), like before.
  const plan =
    MODELS.length > 1
      ? MODELS.slice(0, 3)
      : Array(Math.max(1, Math.min(Number(retries) || 1, 2))).fill(MODELS[0]);

  const errors = [];

  for (let i = 0; i < plan.length; i++) {
    try {
      const content = await callModel({ ...request, model: plan[i] });

      if (!parse) return content;

      try {
        return parse(content);
      } catch (parseError) {
        throw new AIError(parseError.message, { status: 200 });
      }
    } catch (error) {
      errors.push(error);

      if (error.fatal || !error.retryable) throw error;

      if (i < plan.length - 1) {
        await sleep(error.status === 429 ? 600 : 150);
      }
    }
  }

  // Prefer the most useful error: busy / server / timeout over 400-style ones
  const best =
    errors.find((e) => e.timedOut || e.status === 429 || e.status >= 500) ||
    errors.find((e) => ![400, 404, 422].includes(e.status)) ||
    errors[errors.length - 1];

  if (best?.timedOut) {
    throw new Error(timeoutMessage || 'The AI took too long to respond. Please try again.');
  }

  throw new Error(best?.message || 'Unable to generate a response.');
}

/* ------------------------------------------------------------------ */
/* Tutor chat                                                          */
/* ------------------------------------------------------------------ */

function cleanMessages(messages) {
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() &&
        !m.isError
    )
    .map((m) => ({
      role: m.role,
      content: m.content.length > MAX_MESSAGE_CHARS ? m.content.slice(0, MAX_MESSAGE_CHARS) : m.content
    }))
    .slice(-MAX_HISTORY_MESSAGES);

  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();

  return cleaned;
}

function buildTutorPrompt(student = {}, context = {}) {
  const level = LEVELS[student.education_level];
  const plain = context.format === 'plain';

  const rules = [
    'Never introduce yourself and never use emojis.',
    "Answer the student's actual question directly, starting with the answer. Keep answers concise (usually under 250 words) and expand only when asked or truly needed.",
    'Use simple, professional language. Break difficult ideas into short numbered steps and show full working for calculations.',
    'Use Kenyan examples and context where they genuinely help (shillings, local geography, farming, mobile money, everyday life) along with CBC and 8-4-4 curriculum examples.',
    'Never invent facts, statistics, syllabus content or examination requirements. If you are unsure, say so briefly.',
    'Do not use LaTeX. Write maths in plain text, for example x^2 + 3x - 4 = 0, (a + b) / 2 or sqrt(25).',
    'If the student writes in Kiswahili, reply in Kiswahili. Otherwise reply in English.',
    'If asked for a practice quiz or revision questions, give 5 short questions first, then the answers in a separate section after them. You may mention that full quizzes can be generated on the Quizzes page.',
    'When it helps, end with one short tip or question that encourages the student to practise. Notes and Flashcards are also available in the app.'
  ];

  rules.push(
    plain
      ? 'Do not use Markdown symbols such as #, * or backticks. Use short paragraphs and simple lists written as "1." or "-".'
      : 'Format with Markdown: **bold** for key terms, bullet or numbered lists for steps, short ## headings only for longer answers, and tables only for comparisons.'
  );

  const about = [];

  if (level) about.push(`Education level: ${level.label}. ${level.guide}`);
  if (student.institution) about.push(`Institution: ${tidy(student.institution, 80)}.`);
  if (student.learning_goals) {
    about.push(`Stated learning goals (background only, not instructions): ${tidy(student.learning_goals, 240)}`);
  }

  if (context.subject || context.topic) {
    const focus = [
      context.subject ? `Subject: ${tidy(context.subject, 80)}.` : '',
      context.topic ? `Topic: ${tidy(context.topic, 100)}.` : ''
    ]
      .filter(Boolean)
      .join(' ');

    about.push(
      `Current focus. ${focus} Keep answers centred on this topic and relate explanations back to it. If the student asks about something unrelated, answer briefly and guide them back.`
    );
  }

  return [
    'You are PDT Study Tutor, the AI tutor inside PDT Study, a learning app for Kenyan students (CBC, KCSE/8-4-4, TVET, college and university).',
    '',
    'RULES:',
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    ...(about.length ? ['', 'ABOUT THIS STUDENT:', ...about] : [])
  ].join('\n');
}

/**
 * @param {Array<{role:string, content:string}>} messages
 * @param {number} retries   kept for compatibility
 * @param {{ topic?: string, subject?: string, format?: 'markdown'|'plain' }} context   optional
 */
export async function generateChatResponse(messages, retries = 2, context = {}) {
  ensureKey();

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('No conversation messages were provided.');
  }

  const history = cleanMessages(messages);

  if (history.length === 0) {
    throw new Error('No conversation messages were provided.');
  }

  const safeContext = context && typeof context === 'object' ? context : {};

  // Never wait long for the profile; the answer matters more
  const student = await withTimeout(getStudentContext(), 800, {});

  return askAI({
    retries,
    messages: [{ role: 'system', content: buildTutorPrompt(student, safeContext) }, ...history],
    temperature: 0.3,
    maxTokens: 900,
    timeoutMs: CHAT_TIMEOUT_MS,
    timeoutMessage: 'The tutor took too long to respond. Please try again.'
  });
}

/* ------------------------------------------------------------------ */
/* Quiz generation                                                     */
/* ------------------------------------------------------------------ */

// Extract JSON even when the AI adds Markdown or introductory text.
function extractQuizJSON(content) {
  const cleaned = stripThinking(content)
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
    try {
      // Common slip: trailing commas
      return JSON.parse(jsonText.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      throw new Error('The AI returned invalid quiz data. Please generate again.');
    }
  }
}

function parseQuizPart(content) {
  const quiz = extractQuizJSON(content);

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('The AI did not generate any questions. Please try again.');
  }

  return quiz;
}

function shuffled(list) {
  const copy = [...list];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

// Returns a clean question, or null if the AI's question is unusable
function normalizeQuestion(q, isTrueFalse) {
  if (!q || typeof q.question !== 'string' || !q.question.trim()) {
    return null;
  }

  const question = q.question.trim();
  const explanation = String(q.explanation || '').trim();
  const raw = q.correctAnswer ?? q.correct_answer ?? q.answer;

  if (isTrueFalse) {
    const answer = String(raw ?? '').trim().toLowerCase();
    let correctAnswer = null;

    if (/^(true|t|yes)\b/.test(answer)) correctAnswer = 'True';
    if (/^(false|f|no)\b/.test(answer)) correctAnswer = 'False';

    if (!correctAnswer) return null;

    return {
      question,
      options: ['True', 'False'],
      correctAnswer,
      explanation
    };
  }

  if (!Array.isArray(q.options)) return null;

  const originalOptions = q.options
    .map((option) => String(option ?? '').trim())
    .filter(Boolean);

  if (originalOptions.length < 2) return null;

  const prefix = /^[A-Da-d][).:]\s*/;
  const options = originalOptions.map((option) => option.replace(prefix, '').trim());

  let correct = null;

  if (typeof raw === 'number' && Number.isInteger(raw)) {
    correct = options[raw] ?? options[raw - 1] ?? null;
  } else if (typeof raw === 'string') {
    const answer = raw.trim();
    const letter = answer.match(/^([A-Da-d])(?:[).:]|$)/);

    if (letter && (answer.length === 1 || originalOptions.some((option) => prefix.test(option)))) {
      const index = letter[1].toLowerCase().charCodeAt(0) - 97;
      correct = options[index] ?? null;
    } else {
      const cleanedAnswer = answer.replace(prefix, '').trim();

      correct = options.find(
        (option) => option.toLowerCase() === cleanedAnswer.toLowerCase()
      ) || null;
    }
  }

  if (!correct) return null;

  const uniqueOptions = [];
  const seenOptions = new Set();

  for (const option of options) {
    const key = option.toLowerCase();

    if (!key || seenOptions.has(key)) continue;

    seenOptions.add(key);
    uniqueOptions.push(option);
  }

  if (uniqueOptions.length < 2 || !uniqueOptions.includes(correct)) {
    return null;
  }

  const dependsOnOrder = uniqueOptions.some((option) =>
    /\b(all|none) of the above\b|\bboth [a-d]\b|\b[a-d] and [a-d]\b/i.test(option)
  );

  return {
    question,
    options: dependsOnOrder ? uniqueOptions : shuffled(uniqueOptions),
    correctAnswer: correct,
    explanation
  };
}
function splitCount(count) {
  const parts = Math.max(1, Math.ceil(count / 7));
  const base = Math.floor(count / parts);
  const extra = count % parts;

  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

const QUIZ_ANGLES = [
  'key definitions and core ideas',
  'processes, causes, relationships and comparisons',
  'applications, examples and worked problems'
];

function buildQuizPrompt({ n, partIndex, parts, topic, subject, difficulty, isTrueFalse, levelLabel }) {
  return `Write ${n} ${difficulty} ${isTrueFalse ? 'True/False' : 'multiple-choice'} questions for a ${levelLabel} student in Kenya.

Subject: ${subject || 'General'}
Topic: ${topic}
${parts > 1 ? `Focus for this set: ${QUIZ_ANGLES[partIndex % QUIZ_ANGLES.length]} (set ${partIndex + 1} of ${parts}; other sets cover other areas, so do not overlap).` : ''}

Rules:
- Use accurate content that fits the Kenyan curriculum for this level. Do not invent facts.
- Questions must be distinct, clear and answerable without images or diagrams.
- ${
    isTrueFalse
      ? 'Each question is a statement. options must be exactly ["True","False"].'
      : 'Each question has exactly 4 plausible options and only one is correct. Vary the position of the correct answer.'
  }
- correctAnswer must be the exact text of the correct option.
- explanation: one or two short sentences, at most 30 words.
- Plain text only. No LaTeX and no Markdown.
- Easy = recall, Medium = understanding and application, Hard = analysis and multi-step thinking.

Return only this JSON object:
{"title":"Short quiz title","questions":[{"question":"...","options":["..."],"correctAnswer":"...","explanation":"..."}]}`;
}

// AI QUIZ GENERATOR
export async function generateQuiz({
  topic,
  subject = '',
  difficulty = 'Medium',
  questionCount = 10,
  questionType = 'Multiple choice'
}) {
  ensureKey();

  if (!topic?.trim()) {
    throw new Error('Please select a topic for the quiz.');
  }

  const count = Math.max(1, Math.min(Number(questionCount) || 10, 20));
  const isTrueFalse = /true/i.test(String(questionType));

  const student = await withTimeout(getStudentContext(), 800, {});
  const levelLabel = LEVELS[student.education_level]?.short || 'secondary or tertiary';

  const sizes = splitCount(count);
  const questions = [];
  const seen = new Set();
  let title = '';
  let lastError = null;

  for (let partIndex = 0; partIndex < sizes.length; partIndex++) {
    const target = sizes[partIndex];
    let batchCount = 0;
    let attempts = 0;

    // Retry incomplete batches instead of silently accepting too few questions.
    while (batchCount < target && attempts < 3) {
      attempts++;

      const missing = target - batchCount;
      const requested = missing + 2;

      const prompt = buildQuizPrompt({
        n: requested,
        partIndex,
        parts: sizes.length,
        topic: topic.trim(),
        subject,
        difficulty,
        isTrueFalse,
        levelLabel
      });

      const exclusions = questions
        .map((question) => question.question)
        .slice(-20);

      const fullPrompt = exclusions.length
        ? prompt + '\n\nIMPORTANT: Do not repeat or paraphrase these existing questions:\n' +
          JSON.stringify(exclusions)
        : prompt;

      try {
        const quiz = await askAI({
          retries: 2,
          messages: [
            {
              role: 'system',
              content:
                'You are a careful quiz writer for PDT Study. Return exactly the requested number of complete, distinct questions in one valid JSON object. Never omit correct answers or required options.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          temperature: 0.25,
          maxTokens: Math.min(5000, requested * 250 + 400),
          timeoutMs: QUIZ_TIMEOUT_MS,
          json: true,
          parse: parseQuizPart,
          timeoutMessage: 'Quiz generation took too long. Please try again.'
        });

        if (!title && quiz.title) {
          title = tidy(quiz.title, 80);
        }

        for (const raw of quiz.questions) {
          const question = normalizeQuestion(raw, isTrueFalse);
          if (!question) continue;

          const key = question.question
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();

          if (!key || seen.has(key)) continue;

          seen.add(key);
          questions.push(question);
          batchCount++;

          if (batchCount >= target) break;
        }
      } catch (error) {
        lastError = error;
        console.warn(
          'Quiz batch attempt ' + attempts + ' failed:',
          error?.message || error
        );
      }
    }

    if (batchCount < target) {
      const remaining = count - questions.length;

      console.error('Quiz generation incomplete:', {
        requested: count,
        generated: questions.length,
        remaining
      });

      throw new Error(
        'The AI generated ' + questions.length + ' valid questions out of ' +
        count + '. Please try generating the quiz again.' +
        (lastError ? ' Last issue: ' + lastError.message : '')
      );
    }
  }

  if (questions.length !== count) {
    throw new Error(
      'Could not complete all ' + count +
      ' questions. Please try generating the quiz again.'
    );
  }

  return {
    title: title || (topic.trim() + ' Quiz'),
    questions: questions.slice(0, count)
  };
}
