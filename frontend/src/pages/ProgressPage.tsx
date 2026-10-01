import AppLayout from '../components/AppLayout';
import { useDeadlines } from '../context/DeadlineContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ProgressPage() {
  const { result } = useDeadlines();
  const navigate = useNavigate();

  if (!result) {
    return (
      <AppLayout title="📈 Progress">
        <div className="today-empty">
          <div className="big-emoji">📈</div>
          <h3>NO DATA YET</h3>
          <p>Extract and analyze your deadlines to see your progress breakdown.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/tasks')}>
            GO TO MY TASKS →
          </button>
        </div>
      </AppLayout>
    );
  }

  // Group deadlines by subject
  const bySubject = new Map<string, typeof result.deadlines>();
  result.deadlines.forEach((d) => {
    const list = bySubject.get(d.subject) ?? [];
    list.push(d);
    bySubject.set(d.subject, list);
  });

  const clusterIds = new Set<number>(
    result.cluster.clusterGroups.flatMap((g) => g.deadlineIds)
  );

  const subjectColors = [
    'var(--mint)', 'var(--blue)', 'var(--yellow)', 'var(--coral)', 'var(--purple)', 'var(--ink)',
  ];

  const subjects = Array.from(bySubject.entries()).map(([subject, items], i) => {
    const verified = items.filter((d) => d.status === 'verified').length;
    const pct = Math.round((verified / items.length) * 100);
    return { subject, items, verified, pct, color: subjectColors[i % subjectColors.length] };
  });

  const { stats, cluster } = result;

  return (
    <AppLayout title="📈 Progress">
      {/* Overall summary */}
      <div className="mb-8">
        <h2 className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.3rem' }}>OVERALL SUMMARY</h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>
          {stats.verified} of {stats.total} deadlines verified across {subjects.length} subject{subjects.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Big progress bar */}
      <div className="card mb-8" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700 }}>OVERALL VERIFICATION</span>
          <span className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
          </span>
        </div>
        <div className="progress-bar-wrap">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${stats.total > 0 ? (stats.verified / stats.total) * 100 : 0}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>
        <div className="flex gap-4 mt-3 flex-wrap" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
          <span>✅ {stats.verified} VERIFIED</span>
          <span>⚠ {stats.needsReview} NEEDS REVIEW</span>
          {cluster.isCluster && <span style={{ color: 'var(--coral)', fontWeight: 700 }}>⚠ {stats.clusters} CLUSTER{stats.clusters > 1 ? 'S' : ''}</span>}
        </div>
      </div>

      {/* Per-subject */}
      <div className="mb-6">
        <div className="section-title">BREAKDOWN BY SUBJECT</div>
      </div>

      <div className="progress-cards">
        {subjects.map(({ subject, items, pct, color }, i) => (
          <motion.div
            key={subject}
            className="progress-subject-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div className="progress-subject-name">{subject.toUpperCase()}</div>
              <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{pct}%</span>
            </div>
            <div className="progress-bar-wrap">
              <motion.div
                className="progress-bar-fill"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
              />
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {items.map((d) => {
                const inCluster = clusterIds.has(d.announcementId);
                return (
                  <div
                    key={d.announcementId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.3rem 0.5rem', border: '1.5px solid #ddd',
                      fontSize: '0.78rem',
                      borderLeft: inCluster ? `3px solid var(--coral)` : undefined,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{d.title}</span>
                    <span className="badge" style={{
                      background: d.status === 'verified' ? 'var(--mint)' : d.status === 'not_found' ? '#e5e5e5' : 'var(--yellow)',
                      color: d.status === 'verified' ? '#111' : '#111',
                      fontSize: '0.55rem',
                    }}>
                      {d.status === 'verified' ? '✓' : '!'}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cluster detail */}
      {cluster.isCluster && (
        <div className="mt-6">
          <div className="section-title">⚠ CLUSTER DETAILS</div>
          {cluster.clusterGroups.map((g, i) => {
            const groupDeadlines = result.deadlines.filter((d) => g.deadlineIds.includes(d.announcementId));
            return (
              <div key={i} className="cluster-banner" style={{ marginBottom: '1rem' }}>
                <h3>GROUP {i + 1} — {g.deadlineIds.length} SUBMISSIONS IN {Math.ceil(g.windowHours)}h</h3>
                {groupDeadlines.map((d) => (
                  <p key={d.announcementId} style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                    · {d.title} ({d.subject}) — {d.isoDate ? new Date(d.isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '?'}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
