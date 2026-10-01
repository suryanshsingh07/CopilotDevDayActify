import { AIExtractedDeadline, NormalizedDeadline, DeadlineStatus } from '../types';

// Month name → 0-indexed month number
const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Attempt to parse rawDate into an ISO 8601 string.
 * Returns null if the date cannot be fully resolved.
 */
function parseRawDate(rawDate: string, rawTime: string | null): string | null {
  // Try standard Date parsing first
  const combined = rawTime ? `${rawDate} ${rawTime}` : rawDate;
  const attempt = new Date(combined);
  if (!isNaN(attempt.getTime())) {
    return attempt.toISOString();
  }

  // Manual parse: look for month name + day + optional year
  const lower = rawDate.toLowerCase();
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  // Try "Month DD, YYYY" or "DD Month YYYY"
  const withYear = lower.match(
    /(\d{1,2})\s+([a-z]+)\s+(\d{4})|([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})/
  );
  if (withYear) {
    if (withYear[1]) {
      day = parseInt(withYear[1]);
      month = MONTH_MAP[withYear[2]] ?? null;
      year = parseInt(withYear[3]);
    } else {
      month = MONTH_MAP[withYear[4]] ?? null;
      day = parseInt(withYear[5]);
      year = parseInt(withYear[6]);
    }
  }

  if (!withYear) {
    // Try without year: "October 12" / "12 October"
    const noYear = lower.match(/(\d{1,2})\s+([a-z]+)|([a-z]+)\s+(\d{1,2})/);
    if (noYear) {
      if (noYear[1]) {
        day = parseInt(noYear[1]);
        month = MONTH_MAP[noYear[2]] ?? null;
      } else {
        month = MONTH_MAP[noYear[3]] ?? null;
        day = parseInt(noYear[4]);
      }
    }
  }

  if (month === null || day === null) return null;
  if (year === null) return null; // Ambiguous — caller should have set status accordingly

  // Parse time
  let hours = 0;
  let minutes = 0;
  if (rawTime) {
    const timeLower = rawTime.toLowerCase();
    const timeMatch = timeLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      if (timeMatch[3] === 'pm' && hours < 12) hours += 12;
      if (timeMatch[3] === 'am' && hours === 12) hours = 0;
    }
  }

  const d = new Date(year, month, day, hours, minutes, 0, 0);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Normalize AI output into a NormalizedDeadline.
 * All date math and validation is done here in plain TypeScript.
 */
export function normalizeDeadline(ai: AIExtractedDeadline): NormalizedDeadline {
  let isoDate: string | null = null;
  let status: DeadlineStatus = ai.status;

  if (status === 'verified' && ai.rawDate) {
    isoDate = parseRawDate(ai.rawDate, ai.rawTime);
    // If we couldn't parse despite AI saying verified, treat as ambiguous
    if (!isoDate) {
      status = 'ambiguous';
    }
  }

  return {
    announcementId: ai.announcementId,
    title: ai.title ?? `Assignment ${ai.announcementId}`,
    subject: ai.subject ?? 'Unknown Subject',
    rawDate: ai.rawDate,
    rawTime: ai.rawTime,
    isoDate,
    status,
    ambiguityReason: ai.ambiguityReason,
    conflictingInfo: ai.conflictingInfo,
    sourceText: ai.sourceText,
  };
}

/**
 * Sort deadlines chronologically.
 * Deadlines without isoDate go at the end.
 */
export function sortChronologically(deadlines: NormalizedDeadline[]): NormalizedDeadline[] {
  return [...deadlines].sort((a, b) => {
    if (!a.isoDate && !b.isoDate) return 0;
    if (!a.isoDate) return 1;
    if (!b.isoDate) return -1;
    return new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime();
  });
}
