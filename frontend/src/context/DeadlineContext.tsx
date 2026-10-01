// Deadline store — persists analyzed deadlines/results in localStorage and syncs with MongoDB
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { NormalizedDeadline, AnalyzeResponse } from '../types';
import { fetchUserDeadlines, saveUserDeadlines, clearUserDeadlines } from '../api/client';

interface DeadlineCtx {
  deadlines: NormalizedDeadline[];
  result: AnalyzeResponse | null;
  loading: boolean;
  setDeadlines: (d: NormalizedDeadline[]) => void;
  setResult: (r: AnalyzeResponse | null) => void;
  updateDeadline: (d: NormalizedDeadline) => void;
  addDeadline: (d: Partial<NormalizedDeadline>) => void;
  clear: () => void;
  refreshFromCloud: () => Promise<void>;
}

const DeadlineContext = createContext<DeadlineCtx | null>(null);

export function DeadlineProvider({ children }: { children: ReactNode }) {
  const [deadlines, setDeadlinesState] = useState<NormalizedDeadline[]>(() => {
    try {
      const s = localStorage.getItem('actify_deadlines');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const [result, setResultState] = useState<AnalyzeResponse | null>(() => {
    try {
      const s = localStorage.getItem('actify_result');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [loading, setLoading] = useState(false);

  // Sync with MongoDB backend when token is present
  const refreshFromCloud = useCallback(async () => {
    const token = localStorage.getItem('actify_token');
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetchUserDeadlines();
      if (res?.record) {
        if (res.record.deadlines && res.record.deadlines.length > 0) {
          setDeadlinesState(res.record.deadlines);
          localStorage.setItem('actify_deadlines', JSON.stringify(res.record.deadlines));
        }
        if (res.record.deadlines) {
          const resObj: AnalyzeResponse = {
            deadlines: res.record.deadlines,
            cluster: res.record.cluster || { isCluster: false, clusterGroups: [] },
            stats: res.record.stats || {
              total: res.record.deadlines.length,
              verified: res.record.deadlines.filter((d) => d.status === 'verified').length,
              needsReview: res.record.deadlines.filter((d) => d.status !== 'verified').length,
              clusters: res.record.cluster?.clusterGroups?.length || 0,
            },
          };
          setResultState(resObj);
          localStorage.setItem('actify_result', JSON.stringify(resObj));
        }
      }
    } catch (err) {
      console.warn('Could not sync deadlines with MongoDB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromCloud();
  }, [refreshFromCloud]);

  function syncToCloud(currDeadlines: NormalizedDeadline[], currResult: AnalyzeResponse | null) {
    const token = localStorage.getItem('actify_token');
    if (!token) return;

    saveUserDeadlines({
      announcements: currDeadlines.map((d) => ({ id: d.announcementId, text: d.sourceText || d.title })),
      deadlines: currDeadlines,
      cluster: currResult?.cluster || { isCluster: false, clusterGroups: [] },
      stats: currResult?.stats || {
        total: currDeadlines.length,
        verified: currDeadlines.filter((d) => d.status === 'verified').length,
        needsReview: currDeadlines.filter((d) => d.status !== 'verified').length,
        clusters: currResult?.cluster?.clusterGroups?.length || 0,
      },
    }).catch((err) => console.warn('Sync to MongoDB note:', err.message));
  }

  function setDeadlines(d: NormalizedDeadline[]) {
    setDeadlinesState(d);
    localStorage.setItem('actify_deadlines', JSON.stringify(d));
    syncToCloud(d, result);
  }

  function setResult(r: AnalyzeResponse | null) {
    setResultState(r);
    if (r) {
      localStorage.setItem('actify_result', JSON.stringify(r));
      syncToCloud(r.deadlines, r);
    } else {
      localStorage.removeItem('actify_result');
    }
  }

  function updateDeadline(updated: NormalizedDeadline) {
    const next = deadlines.map((d) =>
      d.announcementId === updated.announcementId ? updated : d
    );
    setDeadlinesState(next);
    localStorage.setItem('actify_deadlines', JSON.stringify(next));

    let nextResult = result;
    if (result) {
      nextResult = {
        ...result,
        deadlines: result.deadlines.map((d) =>
          d.announcementId === updated.announcementId ? updated : d
        ),
      };
      setResultState(nextResult);
      localStorage.setItem('actify_result', JSON.stringify(nextResult));
    }
    syncToCloud(next, nextResult);
  }

  function addDeadline(newD: Partial<NormalizedDeadline>) {
    const nextId = (deadlines.length > 0 ? Math.max(...deadlines.map((d) => d.announcementId)) : 0) + 1;
    const deadlineObj: NormalizedDeadline = {
      announcementId: nextId,
      title: newD.title || 'Untitled Task',
      subject: newD.subject || 'General',
      rawDate: newD.rawDate || null,
      rawTime: newD.rawTime || null,
      isoDate: newD.isoDate || new Date().toISOString(),
      status: newD.status || 'verified',
      ambiguityReason: null,
      conflictingInfo: null,
      sourceText: newD.sourceText || newD.title || '',
    };

    const nextDeadlines = [...deadlines, deadlineObj];
    setDeadlinesState(nextDeadlines);
    localStorage.setItem('actify_deadlines', JSON.stringify(nextDeadlines));

    // Update stats
    const verified = nextDeadlines.filter((d) => d.status === 'verified').length;
    const needsReview = nextDeadlines.length - verified;
    const nextResult: AnalyzeResponse = {
      deadlines: nextDeadlines,
      cluster: result?.cluster || { isCluster: false, clusterGroups: [] },
      stats: {
        total: nextDeadlines.length,
        verified,
        needsReview,
        clusters: result?.cluster?.clusterGroups?.length || 0,
      },
    };
    setResultState(nextResult);
    localStorage.setItem('actify_result', JSON.stringify(nextResult));
    syncToCloud(nextDeadlines, nextResult);
  }

  function clear() {
    setDeadlinesState([]);
    setResultState(null);
    localStorage.removeItem('actify_deadlines');
    localStorage.removeItem('actify_result');
    clearUserDeadlines().catch(() => {});
  }

  return (
    <DeadlineContext.Provider value={{
      deadlines,
      result,
      loading,
      setDeadlines,
      setResult,
      updateDeadline,
      addDeadline,
      clear,
      refreshFromCloud
    }}>
      {children}
    </DeadlineContext.Provider>
  );
}

export function useDeadlines() {
  const ctx = useContext(DeadlineContext);
  if (!ctx) throw new Error('useDeadlines must be used inside DeadlineProvider');
  return ctx;
}
