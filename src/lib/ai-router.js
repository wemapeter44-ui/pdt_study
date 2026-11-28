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

const LEVELS = {
  cbc: { label: 'CBC', guide: 'Use simple words and practical examples.' },
  kcse: { label: 'KCSE', guide: 'Pitch answers for secondary school. Show working.' },
  university: { label: 'University', guide: 'Use university level terminology.' },
  college: { label: 'College', guide: 'Use practical diploma level depth.' },
  tvet: { label: 'TVET', guide: 'Focus on practical, hands-on skills.' }
};

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

function buildTutorPrompt(student = {}) {
  const level = LEVELS[student.education_level];
  return [
    'You are PDT Study Tutor. Answer directly. No introductions, no emojis. Be concise.',
    'Use Markdown. No LaTeX.',
    level ? `Student level: ${level.label}. ${level.guide}` : '',
    student.institution ? `Institution: ${student.institution}` : ''
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
  
  const prompt = `Write ${questionCount} ${difficulty} ${isTrueFalse ? 'True/False' : 'multiple-choice'} questions for a Kenyan student.
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
