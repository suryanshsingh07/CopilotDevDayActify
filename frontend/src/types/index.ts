export type DeadlineStatus = 'verified' | 'ambiguous' | 'conflicting' | 'not_found' | 'relative';

export interface NormalizedDeadline {
  announcementId: number;
  title: string;
  subject: string;
  rawDate: string | null;
  rawTime: string | null;
  isoDate: string | null;
  status: DeadlineStatus;
  ambiguityReason: string | null;
  conflictingInfo: string | null;
  sourceText: string;
  type?: 'assignment' | 'exam' | 'project' | 'reading' | 'other';
  priority?: 'high' | 'medium' | 'low';
  difficulty?: 'hard' | 'medium' | 'easy';
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedHours?: number;
  notes?: string;
  completed?: boolean;
}

export interface ClusterGroup {
  deadlineIds: number[];
  startIso: string;
  endIso: string;
  windowHours: number;
}

export interface ClusterResult {
  isCluster: boolean;
  clusterGroups: ClusterGroup[];
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

export interface Announcement {
  id: number;
  text: string;
}
