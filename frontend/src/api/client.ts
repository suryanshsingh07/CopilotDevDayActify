import type {
  Announcement,
  ExtractResponse,
  AnalyzeResponse,
  NormalizedDeadline,
  ClusterResult,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('actify_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options?.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function healthCheck(): Promise<{ status: string }> {
  return request<{ status: string }>('/health');
}

// ── Auth APIs ──
export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
  source?: string;
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<{ user: { id: string; name: string; email: string } }> {
  return request<{ user: { id: string; name: string; email: string } }>('/auth/me');
}

// ── AI Extraction & Analysis APIs ──
export async function extractDeadlines(
  announcements: Announcement[]
): Promise<ExtractResponse> {
  const filled = announcements.filter((a) => a.text.trim().length > 0);
  if (filled.length === 0) throw new Error('Please fill in at least one announcement.');
  return request<ExtractResponse>('/extract', {
    method: 'POST',
    body: JSON.stringify({ announcements: filled }),
  });
}

export async function analyzeDeadlines(
  deadlines: NormalizedDeadline[]
): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify({ deadlines }),
  });
}

// ── MongoDB Deadlines Persistence APIs ──
export interface SavedDeadlineRecord {
  announcements: Array<{ id: number; text: string }>;
  deadlines: NormalizedDeadline[];
  cluster: ClusterResult;
  stats: {
    total: number;
    verified: number;
    needsReview: number;
    clusters: number;
  };
  updatedAt?: string;
}

export async function fetchUserDeadlines(): Promise<{ record: SavedDeadlineRecord | null }> {
  return request<{ record: SavedDeadlineRecord | null }>('/deadlines');
}

export async function saveUserDeadlines(data: {
  announcements: Array<{ id: number; text: string }>;
  deadlines: NormalizedDeadline[];
  cluster: ClusterResult;
  stats: any;
}): Promise<{ success: boolean; record: SavedDeadlineRecord }> {
  return request<{ success: boolean; record: SavedDeadlineRecord }>('/deadlines/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function clearUserDeadlines(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/deadlines', {
    method: 'DELETE',
  });
}
