import { Request, Response } from 'express';
import { z } from 'zod';
import { extractDeadlineFromAnnouncement } from '../services/aiService';
import { normalizeDeadline, sortChronologically } from '../services/dateService';
import { detectClusters } from '../services/clusterService';
import { NormalizedDeadline } from '../types';

const AnnouncementSchema = z.object({
  id: z.number().int().min(1).max(6),
  text: z.string().min(1, 'Announcement text cannot be empty'),
});

const ExtractBodySchema = z.object({
  announcements: z
    .array(AnnouncementSchema)
    .min(1, 'At least one announcement is required')
    .max(6, 'Maximum 6 announcements allowed'),
});

const AnalyzeBodySchema = z.object({
  deadlines: z.array(
    z.object({
      announcementId: z.number(),
      title: z.string(),
      subject: z.string(),
      rawDate: z.string().nullable(),
      rawTime: z.string().nullable(),
      isoDate: z.string().nullable(),
      status: z.enum(['verified', 'ambiguous', 'conflicting', 'not_found', 'relative']),
      ambiguityReason: z.string().nullable(),
      conflictingInfo: z.string().nullable(),
      sourceText: z.string(),
    })
  ),
});

export async function extractController(req: Request, res: Response): Promise<void> {
  const parse = ExtractBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid request', details: parse.error.flatten() });
    return;
  }

  const { announcements } = parse.data;

  // Extract all deadlines in parallel
  const results = await Promise.allSettled(
    announcements.map((ann) =>
      extractDeadlineFromAnnouncement(ann.id, ann.text)
    )
  );

  const deadlines: NormalizedDeadline[] = results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return normalizeDeadline(result.value);
    } else {
      console.error(`Extraction failed for announcement ${announcements[idx].id}:`, result.reason);
      return {
        announcementId: announcements[idx].id,
        title: `Announcement ${announcements[idx].id}`,
        subject: 'Unknown',
        rawDate: null,
        rawTime: null,
        isoDate: null,
        status: 'not_found' as const,
        ambiguityReason: 'AI extraction failed. Please check your API key.',
        conflictingInfo: null,
        sourceText: announcements[idx].text,
      };
    }
  });

  res.json({ deadlines });
}

export async function analyzeController(req: Request, res: Response): Promise<void> {
  const parse = AnalyzeBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid request', details: parse.error.flatten() });
    return;
  }

  const { deadlines } = parse.data as { deadlines: NormalizedDeadline[] };

  const sorted = sortChronologically(deadlines);
  const cluster = detectClusters(sorted);

  const verified = sorted.filter((d) => d.status === 'verified').length;
  const needsReview = sorted.filter((d) => d.status !== 'verified').length;

  res.json({
    deadlines: sorted,
    cluster,
    stats: {
      total: sorted.length,
      verified,
      needsReview,
      clusters: cluster.clusterGroups.length,
    },
  });
}
