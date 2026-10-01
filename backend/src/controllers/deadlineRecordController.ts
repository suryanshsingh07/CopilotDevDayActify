import { Response } from 'express';
import { DeadlineRecord } from '../models/DeadlineRecord';
import { isDbConnected } from '../config/db';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { NormalizedDeadline } from '../types';
import { detectDeadlineClusters } from '../services/clusterService';

// In-memory fallback per user
const inMemoryRecords: Map<string, any> = new Map();

export async function getUserDeadlines(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isDbConnected()) {
      const record = await DeadlineRecord.findOne({ userId }).sort({ updatedAt: -1 });
      if (!record) {
        return res.json({ record: null });
      }
      return res.json({
        record: {
          announcements: record.announcements,
          deadlines: record.deadlines,
          cluster: record.cluster,
          stats: record.stats,
          updatedAt: record.updatedAt,
        },
      });
    } else {
      const record = inMemoryRecords.get(userId) || null;
      return res.json({ record });
    }
  } catch (err: any) {
    console.error('Error fetching deadlines:', err);
    return res.status(500).json({ error: 'Failed to retrieve deadlines' });
  }
}

export async function saveUserDeadlines(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { announcements, deadlines, cluster, stats } = req.body;

    if (!Array.isArray(deadlines)) {
      return res.status(400).json({ error: 'deadlines array is required' });
    }

    // Re-run cluster detection for consistency
    const clusterResult = cluster || detectDeadlineClusters(deadlines);
    const verifiedCount = deadlines.filter((d: any) => d.status === 'verified').length;
    const statsResult = stats || {
      total: deadlines.length,
      verified: verifiedCount,
      needsReview: deadlines.length - verifiedCount,
      clusters: clusterResult.clusterGroups?.length || 0,
    };

    if (isDbConnected()) {
      const record = await DeadlineRecord.findOneAndUpdate(
        { userId },
        {
          userId,
          announcements: announcements || [],
          deadlines,
          cluster: clusterResult,
          stats: statsResult,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.json({
        success: true,
        record: {
          announcements: record.announcements,
          deadlines: record.deadlines,
          cluster: record.cluster,
          stats: record.stats,
          updatedAt: record.updatedAt,
        },
      });
    } else {
      const record = {
        userId,
        announcements: announcements || [],
        deadlines,
        cluster: clusterResult,
        stats: statsResult,
        updatedAt: new Date(),
      };
      inMemoryRecords.set(userId, record);
      return res.json({ success: true, record });
    }
  } catch (err: any) {
    console.error('Error saving deadlines:', err);
    return res.status(500).json({ error: 'Failed to save deadlines' });
  }
}

// Add single deadline
export async function createSingleDeadline(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const newDeadline: NormalizedDeadline = req.body;
    let existingList: NormalizedDeadline[] = [];
    let announcements: any[] = [];

    if (isDbConnected()) {
      const record = await DeadlineRecord.findOne({ userId });
      if (record) {
        existingList = record.deadlines || [];
        announcements = record.announcements || [];
      }
    } else {
      const record = inMemoryRecords.get(userId);
      if (record) {
        existingList = record.deadlines || [];
        announcements = record.announcements || [];
      }
    }

    const nextId = (existingList.length > 0 ? Math.max(...existingList.map((d) => d.announcementId)) : 0) + 1;
    newDeadline.announcementId = nextId;

    const updatedList = [...existingList, newDeadline];
    const cluster = detectDeadlineClusters(updatedList);
    const verified = updatedList.filter((d) => d.status === 'verified').length;
    const stats = {
      total: updatedList.length,
      verified,
      needsReview: updatedList.length - verified,
      clusters: cluster.clusterGroups?.length || 0,
    };

    if (isDbConnected()) {
      const updated = await DeadlineRecord.findOneAndUpdate(
        { userId },
        { userId, announcements, deadlines: updatedList, cluster, stats },
        { upsert: true, new: true }
      );
      return res.status(201).json({ success: true, record: updated, deadline: newDeadline });
    } else {
      const updated = { userId, announcements, deadlines: updatedList, cluster, stats, updatedAt: new Date() };
      inMemoryRecords.set(userId, updated);
      return res.status(201).json({ success: true, record: updated, deadline: newDeadline });
    }
  } catch (err: any) {
    console.error('Create deadline error:', err);
    return res.status(500).json({ error: 'Failed to create deadline' });
  }
}

// Delete single deadline
export async function deleteSingleDeadline(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const deadlineId = parseInt(req.params.id, 10);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let existingList: NormalizedDeadline[] = [];
    let announcements: any[] = [];

    if (isDbConnected()) {
      const record = await DeadlineRecord.findOne({ userId });
      if (record) {
        existingList = record.deadlines || [];
        announcements = record.announcements || [];
      }
    } else {
      const record = inMemoryRecords.get(userId);
      if (record) {
        existingList = record.deadlines || [];
        announcements = record.announcements || [];
      }
    }

    const filtered = existingList.filter((d) => d.announcementId !== deadlineId);
    const cluster = detectDeadlineClusters(filtered);
    const verified = filtered.filter((d) => d.status === 'verified').length;
    const stats = {
      total: filtered.length,
      verified,
      needsReview: filtered.length - verified,
      clusters: cluster.clusterGroups?.length || 0,
    };

    if (isDbConnected()) {
      const updated = await DeadlineRecord.findOneAndUpdate(
        { userId },
        { deadlines: filtered, cluster, stats },
        { new: true }
      );
      return res.json({ success: true, record: updated });
    } else {
      const updated = { userId, announcements, deadlines: filtered, cluster, stats, updatedAt: new Date() };
      inMemoryRecords.set(userId, updated);
      return res.json({ success: true, record: updated });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete deadline' });
  }
}

export async function clearUserDeadlines(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isDbConnected()) {
      await DeadlineRecord.deleteMany({ userId });
    } else {
      inMemoryRecords.delete(userId);
    }

    return res.json({ success: true, message: 'Deadlines cleared' });
  } catch (err: any) {
    console.error('Error clearing deadlines:', err);
    return res.status(500).json({ error: 'Failed to clear deadlines' });
  }
}
