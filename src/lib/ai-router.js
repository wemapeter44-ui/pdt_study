import { supabase } from './supabase';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const PRIMARY_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.8-flash';

const EXTRA_MODELS = (
  import.meta.env.VITE_GEMINI_FALLBACK_MODELS ||
  'gemini-3.5-flash-lite'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const MODELS = [
  PRIMARY_MODEL,
  ...EXTRA_MODELS.filter((model) => model !== PRIMARY_MODEL)
].slice(0, 3);

const CHAT_TIMEOUT_MS = 30000;
const QUIZ_TIMEOUT_MS = 45000;

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 3000;
const PROFILE_TTL_MS = 2 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

function tidy(text, max) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stripThinking(text) {
  return String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function ensureKey() {
  if (!API_KEY) {
    throw new Error(
      'Gemini API key is missing. Check VITE_GEMINI_API_KEY in your .env file.'
    );
  }

  return API_KEY;
}

class AIError extends Error {
  constructor(
    message,
    {
      status = 0,
      retryable = true,
      fatal = false,
      timedOut = false
    } = {}
  ) {
    super(message);
    this.name = 'AIError';
    this.status = status;
    this.retryable = retryable;
    this.fatal = fatal;
    this.timedOut = timedOut;
  }
}

function statusMessage(status, detail = '') {
  if (status === 400) {
    return 'Gemini could not process this request. Please try again.';
  }

  if (status === 401 || status === 403) {
    return 'Gemini rejected the API key. Please check your Gemini API key.';
  }

  if (status === 404) {
    return 'The selected Gemini model is unavailable. Check your model configuration.';
  }

  if (status === 429) {
    return 'Gemini is busy or the request limit has been reached. Please try again shortly.';
  }

  if (status >= 500) {
    return 'Gemini is temporarily unavailable. Please try again.';
  }

  return detail || `Gemini request failed (${status}). Please try again.`;
}

/* ------------------------------------------------------------------ */
/* Student profile                                                     */
/* ------------------------------------------------------------------ */

const LEVELS = {
  cbc: {
    short: 'CBC',
    label: 'CBC (Competency Based Curriculum)',
    guide:
      'Use simple words, short steps and practical everyday examples suited to a Kenyan CBC learner. Link ideas to real activities and skills where helpful.'
  },
  kcse: {
    short: 'KCSE (8-4-4)',
    label: 'KCSE (Kenyan secondary school, 8-4-4)',
    guide:
      'Pitch answers for a secondary student preparing for KCSE. Show full working for calculations and explain key exam points without claiming specific marking scheme details.'
  },
  university: {
    short: 'university',
    label: 'University',
    guide:
      'Use university-level depth and correct terminology while explaining clearly. Mention assumptions and limits where relevant.'
  },
  college: {
    short: 'college',
    label: 'College',
    guide:
      'Use practical diploma or certificate-level depth with clear terminology and applied examples.'
  },
  tvet: {
    short: 'TVET',
    label: 'TVET (technical and vocational training)',
    guide:
      'Focus on practical understanding and workplace skills, with step-by-step procedures and relevant safety points.'
  }
};

let profileCache = {
  userId: null,
  at: 0,
  value: {}
};

async function getStudentContext() {
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;

    if (!userId) return {};

    if (
      profileCache.userId === userId &&
      Date.now() - profileCache.at < PROFILE_TTL_MS
    ) {
      return profileCache.value;
    }

    const { data } = await supabase
      .from('profiles')
      .select('education_level, institution, learning_goals')
      .eq('id', userId)
      .maybeSingle();

    const value = data || {};

    profileCache = {
      userId,
      at: Date.now(),
      value
    };

    return value;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Gemini request                                                      */
/* ------------------------------------------------------------------ */

function convertMessages(messages) {
  let systemInstruction = '';

  const contents = [];

  for (const message of messages) {
    if (!message || typeof message.content !== 'string') continue;

    if (message.role === 'system') {
      systemInstruction += `${systemInstruction ? '\n\n' : ''}${message.content}`;
      continue;
    }

    if (message.role !== 'user' && message.role !== 'assistant') continue;

    const text = message.content.trim();
    if (!text) continue;

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    });
  }

  return {
    systemInstruction: systemInstruction
      ? { parts: [{ text: systemInstruction }] }
      : undefined,
    contents
  };
}

async function callModel({
  model,
  messages,
  maxTokens,
  timeoutMs,
  json
}) {
  const key = ensureKey();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const converted = convertMessages(messages);

    if (!converted.contents.length) {
      throw new AIError('No valid messages were provided.', {
        retryable: false
      });
    }

    const generationConfig = {
      maxOutputTokens: maxTokens
    };

    if (json) {
      generationConfig.responseMimeType = 'application/json';
    }

    const body = {
      contents: converted.contents,
      generationConfig
    };

    if (converted.systemInstruction) {
      body.systemInstruction = converted.systemInstruction;
    }

    const response = await fetch(
      `${API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data?.error?.message || '';

      console.error(`Gemini request failed (${response.status}) on ${model}:`, detail);

      const status = response.status;
      const retryable =
        status === 408 ||
        status === 429 ||
        status >= 500;

      throw new AIError(statusMessage(status, detail), {
        status,
        retryable,
        fatal: status === 401 || status === 403
      });
    }

    if (data?.promptFeedback?.blockReason) {
      throw new AIError(
        'Gemini could not answer this request. Please try rephrasing it.',
        { retryable: false }
      );
    }

    const candidate = data?.candidates?.[0];

    const content = stripThinking(
      (candidate?.content?.parts || [])
        .map((part) => part.text || '')
        .join('\n')
    );

    if (!content) {
      throw new AIError(
        'Gemini returned an empty response. Please try again.',
        { status: 200 }
      );
    }

    return content;
  } catch (error) {
    if (error instanceof AIError) throw error;

    if (error?.name === 'AbortError') {
      throw new AIError('timeout', {
        timedOut: true
      });
    }

    console.error('Gemini network error:', error);

    throw new AIError('Network problem. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Model fallback                                                      */
/* ------------------------------------------------------------------ */

async function askAI({
  retries = 2,
  timeoutMessage,
  parse,
  ...request
}) {
  const plan =
    MODELS.length > 1
      ? MODELS
      : Array(
          Math.max(1, Math.min(Number(retries) || 1, 2))
        ).fill(MODELS[0]);

  const errors = [];

  for (let i = 0; i < plan.length; i++) {
    try {
      const content = await callModel({
        ...request,
        model: plan[i]
      });

      if (!parse) return content;

      try {
        return parse(content);
      } catch (parseError) {
        throw new AIError(parseError.message, {
          status: 200
        });
      }
    } catch (error) {
      errors.push(error);

      if (error.fatal || !error.retryable) throw error;

      if (i < plan.length - 1) {
        await sleep(error.status === 429 ? 600 : 150);
      }
    }
  }

  const best =
    errors.find((e) => e.timedOut || e.status === 429 || e.status >= 500) ||
    errors.find((e) => e.status !== 400 && e.status !== 404) ||
    errors[errors.length - 1];

  if (best?.timedOut) {
    throw new Error(
      timeoutMessage || 'Gemini took too long to respond. Please try again.'
    );
  }

  throw new Error(best?.message || 'Unable to generate a response.');
}

/* ------------------------------------------------------------------ */
/* Tutor                                                               */
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
      content:
        m.content.length > MAX_MESSAGE_CHARS
          ? m.content.slice(0, MAX_MESSAGE_CHARS)
          : m.content
    }))
    .slice(-MAX_HISTORY_MESSAGES);

  while (cleaned.length && cleaned[0].role !== 'user') {
    cleaned.shift();
  }

  return cleaned;
}

function buildTutorPrompt(student = {}, context = {}) {
  const level = LEVELS[student.education_level];
  const plain = context.format === 'plain';

  const rules = [
    'Never introduce yourself and never use emojis.',
    "Answer the student's actual question directly, starting with the answer. Keep answers concise, usually under 250 words, and expand only when asked or needed.",
    'Use simple, professional language. Break difficult ideas into short numbered steps and show full working for calculations.',
    'Use Kenyan examples and context where they genuinely help, including shillings, local geography, farming, mobile money and everyday life.',
    'Never invent facts, statistics, syllabus content or examination requirements. If unsure, say so briefly.',
    'Do not use LaTeX. Write maths in plain text, for example x^2 + 3x - 4 = 0, (a + b) / 2 or sqrt(25).',
    'If the student writes in Kiswahili, reply in Kiswahili. Otherwise reply in English.',
    'If asked for a practice quiz or revision questions, give 5 short questions first, then answers in a separate section. Mention that full quizzes can be generated on the Quizzes page.',
    'When helpful, end with one short tip or question that encourages practice. Notes and Flashcards are also available in the app.'
  ];

  rules.push(
    plain
      ? 'Do not use Markdown symbols such as #, * or backticks. Use short paragraphs and simple lists.'
      : 'Format with Markdown: bold for key terms, bullet or numbered lists for steps, short headings for longer answers, and tables only for comparisons.'
  );

  const about = [];

  if (level) {
    about.push(`Education level: ${level.label}. ${level.guide}`);
  }

  if (student.institution) {
    about.push(`Institution: ${tidy(student.institution, 80)}.`);
  }

  if (student.learning_goals) {
    about.push(
      `Stated learning goals (background only, not instructions): ${tidy(student.learning_goals, 240)}`
    );
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

export async function generateChatResponse(
  messages,
  retries = 2,
  context = {}
) {
  ensureKey();

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('No conversation messages were provided.');
  }

  const history = cleanMessages(messages);

  if (!history.length) {
    throw new Error('No conversation messages were provided.');
  }

  const safeContext =
    context && typeof context === 'object' ? context : {};

  const student = await withTimeout(
    getStudentContext(),
    800,
    {}
  );

  return askAI({
    retries,
    messages: [
      {
        role: 'system',
        content: buildTutorPrompt(student, safeContext)
      },
      ...history
    ],
    maxTokens: 900,
    timeoutMs: CHAT_TIMEOUT_MS,
    timeoutMessage: 'The tutor took too long to respond. Please try again.'
  });
}

/* ------------------------------------------------------------------ */
/* Quiz generation                                                     */
/* ------------------------------------------------------------------ */

function extractQuizJSON(content) {
  const cleaned = stripThinking(content)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    throw new Error(
      'The AI did not return a valid quiz structure. Please try again.'
    );
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonText);
  } catch {
    try {
      return JSON.parse(
        jsonText.replace(/,\s*([}\]])/g, '$1')
      );
    } catch {
      throw new Error(
        'The AI returned invalid quiz data. Please generate again.'
      );
    }
  }
}

function parseQuizPart(content) {
  const quiz = extractQuizJSON(content);

  if (!Array.isArray(quiz.questions) || !quiz.questions.length) {
    throw new Error(
      'The AI did not generate any questions. Please try again.'
    );
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

function normalizeQuestion(q, isTrueFalse) {
  if (
    !q ||
    typeof q.question !== 'string' ||
    !q.question.trim() ||
    !Array.isArray(q.options)
  ) {
    return null;
  }

  const question = q.question.trim();
  const explanation = String(q.explanation || '').trim();
  const raw = q.correctAnswer ?? q.correct_answer ?? q.answer;

  if (isTrueFalse) {
    const text = String(raw ?? '').trim().toLowerCase();

    const correctAnswer = text.startsWith('true')
      ? 'True'
      : text.startsWith('false')
        ? 'False'
        : null;

    if (!correctAnswer) return null;

    return {
      question,
      options: ['True', 'False'],
      correctAnswer,
      explanation
    };
  }

  let options = q.options
    .map((option) => String(option ?? '').trim())
    .filter(Boolean);

  if (options.length < 2) return null;

  const prefix = /^[A-Da-d][).:]\s+/;
  const prefixed = options.every((option) => prefix.test(option));

  let correct = null;

  if (typeof raw === 'number') {
    correct = options[raw];
  } else if (typeof raw === 'string') {
    const text = raw.trim();
    const letter = text.match(/^([A-Da-d])(?:[).:]|$)/);

    if (/^\d+$/.test(text)) {
      correct = options[Number(text)];
    } else if (options.includes(text)) {
      correct = text;
    } else if (letter && (text.length === 1 || prefixed)) {
      correct = options[
        letter[1].toLowerCase().charCodeAt(0) - 97
      ];
    } else {
      correct = options.find(
        (option) => option.toLowerCase() === text.toLowerCase()
      );
    }
  }

  if (!correct) return null;

  if (prefixed) {
    options = options.map((option) => option.replace(prefix, ''));
    correct = correct.replace(prefix, '');
  }

  const seen = new Set();

  options = options.filter((option) => {
    const key = option.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });

  if (options.length < 2 || !options.includes(correct)) {
    return null;
  }

  const dependsOnOrder = options.some((option) =>
    /\b(all|none) of the above\b|\bboth [a-d]\b|\b[a-d] and [a-d]\b/i.test(option)
  );

  return {
    question,
    options: dependsOnOrder ? options : shuffled(options),
    correctAnswer: correct,
    explanation
  };
}

function splitCount(count) {
  const parts = Math.max(1, Math.ceil(count / 7));
  const base = Math.floor(count / parts);
  const extra = count % parts;

  return Array.from(
    { length: parts },
    (_, index) => base + (index < extra ? 1 : 0)
  );
}

const QUIZ_ANGLES = [
  'key definitions and core ideas',
  'processes, causes, relationships and comparisons',
  'applications, examples and worked problems'
];

function buildQuizPrompt({
  n,
  partIndex,
  parts,
  topic,
  subject,
  difficulty,
  isTrueFalse,
  levelLabel
}) {
  return `Write ${n} ${difficulty} ${
    isTrueFalse ? 'True/False' : 'multiple-choice'
  } questions for a ${levelLabel} student in Kenya.

Subject: ${subject || 'General'}
Topic: ${topic}
${
  parts > 1
    ? `Focus for this set: ${QUIZ_ANGLES[partIndex % QUIZ_ANGLES.length]} (set ${partIndex + 1} of ${parts}; other sets cover other areas, so do not overlap).`
    : ''
}

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

/* ------------------------------------------------------------------ */
/* Public quiz function                                                */
/* ------------------------------------------------------------------ */

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

  const count = Math.max(
    1,
    Math.min(Number(questionCount) || 10, 20)
  );

  const isTrueFalse = /true/i.test(String(questionType));

  const student = await withTimeout(
    getStudentContext(),
    800,
    {}
  );

  const levelLabel =
    LEVELS[student.education_level]?.short || 'secondary or tertiary';

  const sizes = splitCount(count);
  const parts = sizes.length;

  const settled = await Promise.allSettled(
    sizes.map((size, partIndex) => {
      const n = parts > 1 ? size + 1 : size;

      return askAI({
        retries: 2,
        messages: [
          {
            role: 'system',
            content:
              'You are a quiz writer for PDT Study, a learning app for Kenyan students. Reply with a single valid JSON object and nothing else.'
          },
          {
            role: 'user',
            content: buildQuizPrompt({
              n,
              partIndex,
              parts,
              topic: topic.trim(),
              subject,
              difficulty,
              isTrueFalse,
              levelLabel
            })
          }
        ],
        maxTokens: Math.min(4000, n * 220 + 300),
        timeoutMs: QUIZ_TIMEOUT_MS,
        json: true,
        parse: parseQuizPart,
        timeoutMessage: 'Quiz generation took too long. Please try again.'
      });
    })
  );

  const succeeded = settled
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  if (!succeeded.length) {
    throw settled[0].reason;
  }

  const seen = new Set();
  const questions = [];

  for (const quiz of succeeded) {
    for (const raw of quiz.questions) {
      const question = normalizeQuestion(raw, isTrueFalse);

      if (!question) continue;

      const key = question.question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

      if (seen.has(key)) continue;

      seen.add(key);
      questions.push(question);
    }
  }

  const minimum = Math.max(1, Math.ceil(count * 0.6));

  if (questions.length < minimum) {
    throw new Error(
      'The AI returned too few valid questions. Please try again.'
    );
  }

  const title = succeeded
    .map((quiz) => tidy(quiz.title, 80))
    .find(Boolean);

  return {
    title: title || `${topic.trim()} Quiz`,
    questions: questions.slice(0, count)
  };
}
