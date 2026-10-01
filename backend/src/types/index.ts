// Shared types for Actify backend

export interface RawAnnouncement {
  id: number;
  text: string;
}

export type DeadlineStatus =
  | 'verified'
  | 'ambiguous'
  | 'conflicting'
  | 'not_found'
  | 'relative';

export interface AIExtractedDeadline {
  announcementId: number;
  title: string | null;
  subject: string | null;
  rawDate: string | null;        // Exactly as AI found it, e.g. "October 12, 2026"
  rawTime: string | null;        // e.g. "10:00 AM"
  status: DeadlineStatus;
  ambiguityReason: string | null;
  conflictingInfo: string | null;
  sourceText: string;
}

export interface NormalizedDeadline {
  announcementId: number;
  title: string;
  subject: string;
  rawDate: string | null;
  rawTime: string | null;
  isoDate: string | null;         // ISO 8601 if fully resolved, null if ambiguous
  status: DeadlineStatus;
  ambiguityReason: string | null;
  conflictingInfo: string | null;
  sourceText: string;
}

export interface ClusterResult {
  isCluster: boolean;
  clusterGroups: ClusterGroup[];
}

export interface ClusterGroup {
  deadlineIds: number[];  // announcementIds that form this cluster
  startIso: string;
  endIso: string;
  windowHours: number;
}

export interface ExtractResponse {
  deadlines: NormalizedDeadline[];
}

export interface AnalyzeResponse {
  deadlines: NormalizedDeadline[];
  cluster: ClusterResult;
  stats: {
    total: number;
    verified: number;
    needsReview: number;
    clusters: number;
  };
}
