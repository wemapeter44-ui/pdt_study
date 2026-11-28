// src/lib/ai-router.js
// Hardcoded OpenRouter integration for PDT Study.
// Keeps the advanced logic (streaming, quizzes, context) but removes other providers.

import { supabase } from './supabase';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const CHAT_TIMEOUT_MS = 30000;
const QUIZ_TIMEOUT_MS = 45000;

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 3000;
const PROFILE_TTL_MS = 2 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function withTimeout(promise, ms, fallback) { return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]); }
function tidy(text, max) { return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max); }
function stripThinking(text) { return String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); }

function ensureKey() {
  if (!API_KEY) throw new Error('OpenRouter API key is missing. Add VITE_OPENROUTER_API_KEY to your .env file.');
}

function statusMessage(status) {
  if (status === 401 || status === 403) return 'API key rejected.';
  if (status === 429) return 'Too many requests. Please wait a moment.';
  if (status >= 500) return 'The AI service is busy. Please try again.';
  return `AI request failed (${status}).`;
}

class AIError extends Error {
  constructor(message, { status = 0, retryable = true, fatal = false, timedOut = false, aborted = false } = {}) {
    super(message);
    this.name = 'AIError';
    this.status = status;
    this.retryable = retryable;
    this.fatal = fatal;
    this.timedOut = timedOut;
    this.aborted = aborted;
  }
}

/* ------------------------------------------------------------------ */
/* Context Fetching                                                    */
/* ------------------------------------------------------------------ */

const LEVELS = {
  cbc: { label: 'CBC', guide: 'Use simple words and practical examples.' },
  kcse: { label: 'KCSE', guide: 'Pitch answers for secondary school. Show working.' },
  university: { label: 'University', guide: 'Use university level terminology.' },
  college: { label: 'College', guide: 'Use practical diploma level depth.' },
  tvet: { label: 'TVET', guide: 'Focus on practical, hands-on skills.' }
};

let profileCache = { userId: null, at: 0, value: {} };

async function getStudentContext() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return {};
    if (profileCache.userId === userId && Date.now() - profileCache.at < PROFILE_TTL_MS) return profileCache.value;
    const { data } = await supabase.from('profiles').select('education_level, institution, learning_goals').eq('id', userId).maybeSingle();
    const value = data || {};
    profileCache = { userId, at: Date.now(), value };
    return value;
  } catch { return {}; }
}

/* ------------------------------------------------------------------ */
/* Core Fetch                                                          */
/* ------------------------------------------------------------------ */

async function callModel({ messages, temperature, maxTokens, timeoutMs, json }) {
  ensureKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = { model: MODEL, messages, temperature, max_tokens: maxTokens };
    if (json) body.response_format = { type: 'json_object' };

    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PDT Study'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`AI request failed (${response.status}) on ${MODEL}:`, detail);
      throw new AIError(statusMessage(response.status), { status: response.status, fatal: response.status === 401 || response.status === 403 });
    }

    const data = await response.json();
    if (data?.error) throw new AIError(statusMessage(Number(data.error.code) || 500), { status: Number(data.error.code) || 500 });

    const content = stripThinking(data?.choices?.[0]?.message?.content);
    if (!content) throw new AIError('The AI returned an empty response.', { status: 200 });
    return content;
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error?.name === 'AbortError') throw new AIError('timeout', { timedOut: true });
    throw new AIError('Network problem. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

async function askAI({ retries = 2, timeoutMessage, parse, ...request }) {
  const errors = [];
  for (let i = 0; i < Math.max(1, Math.min(Number(retries) || 1, 2)); i++) {
    try {
      const content = await callModel({ ...request });
      if (!parse) return content;
      try { return parse(content); } catch (parseError) { throw new AIError(parseError.message, { status: 200 }); }
    } catch (error) {
      errors.push(error);
      if (error.fatal || !error.retryable) throw error;
      if (i < retries - 1) await sleep(error.status === 429 ? 600 : 150);
    }
  }
  const best = errors.find((e) => e.timedOut || e.status === 429 || e.status >= 500) || errors[errors.length - 1];
  if (best?.timedOut) throw new Error(timeoutMessage || 'The AI took too long to respond.');
  throw new Error(best?.message || 'Unable to generate a response.');
}

/* ------------------------------------------------------------------ */
/* Tutor Chat                                                          */
/* ------------------------------------------------------------------ */

function cleanMessages(messages) {
  const cleaned = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_HISTORY_MESSAGES);
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  return cleaned;
}

function buildTutorPrompt(student = {}) {
  const level = LEVELS[student.education_level];
  return [
    'You are PDT Study Tutor. Answer directly. No introductions, no emojis. Be concise.',
    'Use Markdown. No LaTeX.',
    level ? `Student level: ${level.label}. ${level.guide}` : '',
    student.institution ? `Institution: ${student.institution}` : '',
    student.learning_goals ? `Goals: ${student.learning_goals}` : ''
  ].filter(Boolean).join('\n');
}

export async function generateChatResponse(messages, retries = 2, context = {}) {
  ensureKey();
  const history = cleanMessages(messages);
  if (history.length === 0) throw new Error('No conversation messages were provided.');
  const student = await withTimeout(getStudentContext(), 800, {});

  return askAI({
    retries,
    messages: [{ role: 'system', content: buildTutorPrompt(student) }, ...history],
    temperature: 0.3,
    maxTokens: 1000,
    timeoutMs: CHAT_TIMEOUT_MS,
    timeoutMessage: 'The tutor took too long to respond.'
  });
}

/* ------------------------------------------------------------------ */
/* Quiz Generation                                                     */
/* ------------------------------------------------------------------ */

function extractQuizJSON(content) {
  const cleaned = stripThinking(content).replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) throw new Error('Invalid quiz JSON.');
  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function normalizeQuestion(q, isTrueFalse) {
  if (!q || !q.question || !Array.isArray(q.options)) return null;
  const correct = q.correctAnswer || q.correct_answer || q.answer;
  if (!correct) return null;
  return { question: q.question, options: q.options, correctAnswer: correct, explanation: q.explanation || '' };
}

export async function generateQuiz({ topic, subject = '', difficulty = 'Medium', questionCount = 5, questionType = 'Multiple choice' }) {
  ensureKey();
  const isTrueFalse = /true/i.test(questionType);
  const prompt = `Write ${questionCount} ${difficulty} ${isTrueFalse ? 'True/False' : 'multiple-choice'} questions for a student.
Subject: ${subject}
Topic: ${topic}
Return ONLY valid JSON:
{"title":"Title","questions":[{"question":"...","options":["A","B"],"correctAnswer":"A","explanation":"..."}]}`;

  const content = await callModel({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: QUIZ_TIMEOUT_MS,
    json: true
  });

  const raw = extractQuizJSON(content);
  const questions = raw.questions.map(q => normalizeQuestion(q, isTrueFalse)).filter(Boolean);
  return { title: raw.title || 'Quiz', questions };
}
