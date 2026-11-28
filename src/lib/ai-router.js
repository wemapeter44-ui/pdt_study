// src/lib/ai-router.js
// Direct OpenRouter integration for PDT Study with quiz fallback.

import { supabase } from './supabase';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const FALLBACK_MODEL = 'openrouter/free';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const CHAT_TIMEOUT_MS = 30000;
const QUIZ_TIMEOUT_MS = 45000;

function ensureKey() {
  if (!API_KEY) throw new Error('OpenRouter API key is missing.');
}

function statusMessage(status) {
  if (status === 401 || status === 403) return 'API key rejected.';
  if (status === 429) return 'Too many requests. Please wait.';
  if (status >= 500) return 'The AI service is busy. Please try again.';
  return `AI request failed (${status}).`;
}

async function callModel({ messages, temperature, maxTokens, timeoutMs, json, model = MODEL }) {
  ensureKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = { model, messages, temperature, max_tokens: maxTokens };
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

    if (!response.ok) throw new Error(statusMessage(response.status));

    const data = await response.json();
    if (data?.error) throw new Error(data.error.message || 'AI error');

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('The AI returned an empty response.');
    return content;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The AI took too long.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function askWithFallback({ json, ...request }) {
  try {
    return await callModel({ ...request, json });
  } catch (primaryErr) {
    console.warn('Primary model failed, trying fallback:', primaryErr.message);
    try {
      return await callModel({ ...request, json, model: FALLBACK_MODEL });
    } catch (fallbackErr) {
      throw new Error(fallbackErr.message || primaryErr.message);
    }
  }
}

function cleanMessages(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }))
    .slice(-12);
}

function buildTutorPrompt(student = {}) {
  return [
    'You are PDT Study Tutor. Answer directly. No introductions, no emojis. Be concise.',
    'Use Markdown. No LaTeX.',
    student.education_level ? `Student level: ${student.education_level}.` : '',
    student.institution ? `Institution: ${student.institution}` : ''
  ].filter(Boolean).join('\n');
}

export async function generateChatResponse(messages, retries = 2, context = {}) {
  ensureKey();
  const history = cleanMessages(messages);
  if (history.length === 0) throw new Error('No conversation messages were provided.');

  return askWithFallback({
    messages: [{ role: 'system', content: buildTutorPrompt(context.student || {}) }, ...history],
    temperature: 0.3,
    maxTokens: 1000,
    timeoutMs: CHAT_TIMEOUT_MS
  });
}

function extractQuizJSON(content) {
  const cleaned = String(content).replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) throw new Error('Invalid quiz JSON format.');
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
You must return ONLY valid JSON. Do not include any Markdown, code blocks, or explanations.
Format:
{"title":"Quiz Title","questions":[{"question":"...","options":["Option 1","Option 2","Option 3","Option 4"],"correctAnswer":"Option 1","explanation":"..."}]}`;

  const content = await askWithFallback({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: QUIZ_TIMEOUT_MS,
    json: true
  });

  const raw = extractQuizJSON(content);
  const questions = raw.questions.map(q => normalizeQuestion(q, isTrueFalse)).filter(Boolean);
  if (questions.length === 0) throw new Error('The AI returned invalid questions. Please try again.');
  return { title: raw.title || 'Quiz', questions };
}
