// src/lib/ai-router.js
// Fast, direct Gemini integration for PDT Study.

import { supabase } from './supabase';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const FAST_MODEL = 'gemini-3.5-flash'; // Google's stable, fast flash model

const CHAT_TIMEOUT_MS = 15000; // Cut off after 15 seconds so it doesn't hang
const QUIZ_TIMEOUT_MS = 30000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function tidy(text, max) { return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max); }
function stripThinking(text) { return String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); }

function ensureKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key is missing.');
  return key;
}

function statusMessage(status) {
  if (status === 401 || status === 403) return 'API key rejected.';
  if (status === 429) return 'Too many requests. Please wait a moment.';
  if (status >= 500) return 'Gemini is currently overloaded. Please try again.';
  return `AI request failed (${status}).`;
}

/* ------------------------------------------------------------------ */
/* Context Fetching                                                    */
/* ------------------------------------------------------------------ */

const LEVELS = {
  cbc: { short: 'CBC', label: 'CBC', guide: 'Use simple words and practical examples.' },
  kcse: { short: 'KCSE', label: 'KCSE', guide: 'Pitch answers for secondary school. Show working.' },
  university: { short: 'university', label: 'University', guide: 'Use university level terminology.' },
  college: { short: 'college', label: 'College', guide: 'Use practical diploma level depth.' },
  tvet: { short: 'TVET', label: 'TVET', guide: 'Focus on practical, hands-on skills.' }
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

async function callGemini({ messages, temperature, maxTokens, timeoutMs, json }) {
  const key = ensureKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const chatHistory = messages.filter(m => m.role !== 'system');

    const body = {
      systemInstruction: { parts: [{ text: systemMsg }] },
      contents: chatHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: 'application/json' } : {})
      }
    };

    const response = await fetch(`${GEMINI_API_URL}/${FAST_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(statusMessage(response.status));
    }

    const data = await response.json();
    if (data?.error) throw new Error(statusMessage(Number(data.error.code) || 500));

    const content = stripThinking(data?.candidates?.[0]?.content?.parts?.[0]?.text);
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

  return callGemini({
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

  const content = await callGemini({
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

