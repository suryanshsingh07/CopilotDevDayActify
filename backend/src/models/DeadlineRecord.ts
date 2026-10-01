import { Schema, model, Document } from 'mongoose';
import type { NormalizedDeadline, ClusterResult } from '../types';

export interface IDeadlineRecord extends Document {
  userId: string;
  announcements: Array<{ id: number; text: string }>;
  deadlines: NormalizedDeadline[];
  cluster: ClusterResult;
  stats: {
    total: number;
    verified: number;
    needsReview: number;
    clusters: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const deadlineRecordSchema = new Schema<IDeadlineRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    announcements: [
      {
        id: Number,
        text: String,
      },
    ],
    deadlines: [
      {
        announcementId: Number,
        title: String,
        subject: String,
        rawDate: String,
        rawTime: String,
        isoDate: String,
        status: String,
        ambiguityReason: String,
        conflictingInfo: String,
        sourceText: String,
      },
    ],
    cluster: {
      isCluster: Boolean,
      clusterGroups: [
        {
          deadlineIds: [Number],
          startIso: String,
          endIso: String,
          windowHours: Number,
        },
      ],
    },
    stats: {
      total: Number,
      verified: Number,
      needsReview: Number,
      clusters: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const DeadlineRecord = model<IDeadlineRecord>('DeadlineRecord', deadlineRecordSchema);
