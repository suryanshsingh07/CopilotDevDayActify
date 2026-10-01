import OpenAI from 'openai';
import { AIExtractedDeadline, DeadlineStatus } from '../types';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(apiKey: string): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are a deadline extraction assistant for students.
Your job is to read assignment announcements and extract deadline information precisely.

Rules:
- Extract ONLY what is explicitly stated. Never guess or infer.
- If the year is missing, mark as ambiguous with reason "YEAR REQUIRED".
- If the date is relative (e.g., "next Friday", "in 3 days"), mark as relative.
- If there are conflicting dates in the same announcement, mark as conflicting.
- If no deadline is found, mark as not_found.
- For time: extract exactly as stated (e.g., "10:00 AM", "5 PM", "23:59"). If no time given, return null.
- Return a JSON object with these exact keys:
  {
    "title": string | null,
    "subject": string | null,
    "rawDate": string | null,
    "rawTime": string | null,
    "status": "verified" | "ambiguous" | "conflicting" | "relative" | "not_found",
    "ambiguityReason": string | null,
    "conflictingInfo": string | null
  }
Do not include markdown or backticks, return raw JSON only.`;

// Rule-based fallback extractor when no AI key is provided or offline
function heuristicExtraction(announcementId: number, text: string): AIExtractedDeadline {
  // Title heuristic: first line or before colon
  const firstLine = text.split('\n')[0].trim();
  const subjectMatch = text.match(/\b([A-Z]{2,5}\s*\d{2,4}[A-Z]?)\b/i);
  const subject = subjectMatch ? subjectMatch[1].toUpperCase() : 'GENERAL';

  // Date regex heuristics (e.g. October 12, 2026 or 12 Oct 2026 or 2026-10-12)
  const dateMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i
  ) || text.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i)
    || text.match(/\b\d{4}-\d{2}-\d{2}\b/);

  // Time regex heuristic (e.g. 10:00 AM, 11:59 PM, 5 PM, 23:59)
  const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\b/)
    || text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);

  const rawDate = dateMatch ? dateMatch[0] : null;
  const rawTime = timeMatch ? timeMatch[0] : null;

  let status: DeadlineStatus = 'not_found';
  let ambiguityReason: string | null = null;

  if (rawDate) {
    status = 'verified';
  } else if (/due\s+(tomorrow|next\s+week|friday|monday|sunday)/i.test(text)) {
    status = 'relative';
    ambiguityReason = 'Relative date specified without explicit calendar day';
  } else if (/due\s+on\s+[A-Za-z]+\s+\d{1,2}\b/i.test(text)) {
    status = 'ambiguous';
    ambiguityReason = 'Year missing from announcement';
  }

  let title = firstLine.replace(/^[A-Z0-9\s-]+:\s*/i, '').slice(0, 45).trim();
  if (!title) title = `Assignment #${announcementId}`;

  return {
    announcementId,
    title,
    subject,
    rawDate,
    rawTime,
    status,
    ambiguityReason,
    conflictingInfo: null,
    sourceText: text,
  };
}

// Call Google Gemini REST API directly
async function extractWithGemini(apiKey: string, text: string): Promise<Record<string, unknown>> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `${SYSTEM_PROMPT}\n\nANNOUNCEMENT:\n${text}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response received from Gemini API');

  return JSON.parse(rawText.replace(/^```json/i, '').replace(/```$/i, '').trim());
}

// Call OpenAI Chat Completions API
async function extractWithOpenAI(apiKey: string, text: string): Promise<Record<string, unknown>> {
  const openai = getOpenAIClient(apiKey);
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `ANNOUNCEMENT:\n${text}` },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('No AI response received from OpenAI');
  return JSON.parse(raw);
}

export async function extractDeadlineFromAnnouncement(
  announcementId: number,
  text: string
): Promise<AIExtractedDeadline> {
  const geminiKey = process.env.GEMINI_API_KEY || (process.env.AI_API_KEY?.startsWith('AIza') ? process.env.AI_API_KEY : '');
  const openaiKey = process.env.AI_API_KEY?.startsWith('sk-') ? process.env.AI_API_KEY : '';

  try {
    let parsed: Record<string, unknown> | null = null;

    if (geminiKey) {
      // User provided Google Gemini API Key
      parsed = await extractWithGemini(geminiKey, text);
    } else if (openaiKey) {
      // User provided OpenAI API Key
      parsed = await extractWithOpenAI(openaiKey, text);
    } else if (process.env.AI_API_KEY && process.env.AI_API_KEY.trim().length > 10) {
      // Default to Gemini or OpenAI depending on key format
      if (process.env.AI_API_KEY.includes('AIzaSy')) {
        parsed = await extractWithGemini(process.env.AI_API_KEY, text);
      } else {
        parsed = await extractWithOpenAI(process.env.AI_API_KEY, text);
      }
    } else {
      // No API key provided: use intelligent fallback parser
      return heuristicExtraction(announcementId, text);
    }

    if (!parsed) {
      return heuristicExtraction(announcementId, text);
    }

    return {
      announcementId,
      title: (parsed.title as string) ?? null,
      subject: (parsed.subject as string) ?? null,
      rawDate: (parsed.rawDate as string) ?? null,
      rawTime: (parsed.rawTime as string) ?? null,
      status: (parsed.status as DeadlineStatus) ?? 'not_found',
      ambiguityReason: (parsed.ambiguityReason as string) ?? null,
      conflictingInfo: (parsed.conflictingInfo as string) ?? null,
      sourceText: text,
    };
  } catch (err: any) {
    console.warn(`Extraction fallback used for announcement ${announcementId}: ${err?.message || err}`);
    return heuristicExtraction(announcementId, text);
  }
}
