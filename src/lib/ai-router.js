// src/lib/ai-router.js
// Direct OpenRouter integration for PDT Study.

import { supabase } from './supabase';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-super-vl:free';

const CHAT_TIMEOUT_MS = 25000;
const QUIZ_TIMEOUT_MS = 35000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function ensureKey() {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('OpenRouter API key is missing. Check your .env file.');
  return key;
}

function statusMessage(status) {
  if (status === 401 || status === 403) return 'API key rejected.';
  if (status === 429) return 'Too many requests. Please wait a moment.';
  if (status >= 500) return 'The AI service is currently busy. Please try again.';
  return `AI request failed (${status}).`;
}

/* ------------------------------------------------------------------ */
/* Context Fetching                                                    */
/* ------------------------------------------------------------------ */

async function getStudentContext() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return {};
    const { data } = await supabase.from('profiles').select('education_level, institution, learning_goals').eq('id', session.user.id).maybeSingle();
    return data || {};
  } catch { return {}; }
}

/* ------------------------------------------------------------------ */
/* Core Fetch                                                          */
/* ------------------------------------------------------------------ */

async function callModel({ messages, temperature, maxTokens, timeoutMs, json }) {
  const key = ensureKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
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
      throw new Error(statusMessage(response.status));
    }

    const data = await response.json();
    if (data?.error) throw new Error(data.error.message || 'AI error');

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('The AI returned an empty response.');
    return content;

  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The AI took too long to respond.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Tutor Chat                                                          */
/* ------------------------------------------------------------------ */

function cleanMessages(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }))
    .slice(-12);
}

// FIXED: Professional prompt that understands the app context
function buildTutorPrompt(student = {}) {
  return [
    'You are the PDT Study Tutor, a professional AI tutor inside the PDT Study app.',
    'PDT Study is a study platform for students. You help them understand concepts, solve problems, and prepare for exams.',
    'RULES:',
    '1. Answer directly. No introductions, no emojis, no filler.',
    '2. Use clear, academic language. Format with Markdown.',
    '3. Do not use LaTeX. Write maths in plain text (e.g., x^2).',
    '4. Never assume the user\'s curriculum or class level unless they explicitly tell you.',
    '5. If the user asks about a topic, explain it step-by-step. Use practical examples.',
    '6. Keep answers concise (under 250 words unless a detailed explanation is requested).',
    student.education_level ? `The student is at the ${student.education_level} level.` : '',
    student.institution ? `They study at ${student.institution}.` : '',
    student.learning_goals ? `Their learning goals are: ${student.learning_goals}.` : ''
  ].filter(Boolean).join('\n');
}

export async function generateChatResponse(messages, context = {}) {
  ensureKey();
  const history = cleanMessages(messages);
  const student = await getStudentContext();

  return callModel({
    messages: [{ role: 'system', content: buildTutorPrompt(student) }, ...history],
    temperature: 0.3,
    maxTokens: 1000,
    timeoutMs: CHAT_TIMEOUT_MS
  });
}

/* ------------------------------------------------------------------ */
/* Quiz Generator                                                      */
/* ------------------------------------------------------------------ */

function extractQuizJSON(content) {
  const cleaned = String(content).replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) throw new Error('Invalid quiz JSON.');
  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function normalizeQuestion(q, isTrueFalse) {
  if (!q || !q.question || !Array.isArray(q.options)) return null;
  const correct = q.correctAnswer || q.correct_answer || q.answer;
  if (!correct) return null;
  return {
    question: q.question,
    options: q.options,
    correctAnswer: correct,
    explanation: q.explanation || ''
  };
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
