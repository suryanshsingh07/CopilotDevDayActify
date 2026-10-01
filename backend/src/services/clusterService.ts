import { NormalizedDeadline, ClusterResult, ClusterGroup } from '../types';

const CLUSTER_WINDOW_HOURS = 48;
const CLUSTER_MIN_COUNT = 3;

/**
 * Detect 48-hour deadline clusters.
 * Only considers deadlines with a resolved isoDate.
 * Uses a sliding window approach in pure TypeScript.
 */
export function detectClusters(deadlines: NormalizedDeadline[]): ClusterResult {
  const resolved = deadlines
    .filter((d) => d.isoDate !== null)
    .map((d) => ({ id: d.announcementId, ts: new Date(d.isoDate!).getTime() }))
    .sort((a, b) => a.ts - b.ts);

  const windowMs = CLUSTER_WINDOW_HOURS * 60 * 60 * 1000;
  const clusterGroups: ClusterGroup[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < resolved.length; i++) {
    if (usedIndices.has(i)) continue;

    const windowEnd = resolved[i].ts + windowMs;
    const inWindow: typeof resolved = [resolved[i]];

    for (let j = i + 1; j < resolved.length; j++) {
      if (resolved[j].ts <= windowEnd) {
        inWindow.push(resolved[j]);
      } else {
        break;
      }
    }

    if (inWindow.length >= CLUSTER_MIN_COUNT) {
      const group: ClusterGroup = {
        deadlineIds: inWindow.map((d) => d.id),
        startIso: new Date(inWindow[0].ts).toISOString(),
        endIso: new Date(inWindow[inWindow.length - 1].ts).toISOString(),
        windowHours:
          Math.round(
            ((inWindow[inWindow.length - 1].ts - inWindow[0].ts) / 3600000) * 10
          ) / 10,
      };
      clusterGroups.push(group);
      inWindow.forEach((_, idx) => usedIndices.add(i + idx));
    }
  }

  return {
    isCluster: clusterGroups.length > 0,
    clusterGroups,
  };
}

export const detectDeadlineClusters = detectClusters;
