import AppLayout from '../components/AppLayout';
import { useDeadlines } from '../context/DeadlineContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

function fmtTime(iso: string | null, rawTime: string | null): string {
  if (rawTime) return rawTime.toUpperCase();
  if (!iso) return 'NO TIME SET';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export default function TodayPage() {
  const { result } = useDeadlines();
  const navigate = useNavigate();

  if (!result) {
    return (
      <AppLayout title="📅 Today's Plan">
        <div className="today-empty">
          <div className="big-emoji">📅</div>
          <h3>NO DEADLINE MAP YET</h3>
          <p>Go to My Tasks, paste your announcements and extract deadlines first.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/tasks')}>
            GO TO MY TASKS →
          </button>
        </div>
      </AppLayout>
    );
  }

  const clusterIds = new Set<number>(
    result.cluster.clusterGroups.flatMap((g) => g.deadlineIds)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const verified = result.deadlines.filter((d) => d.status === 'verified' && d.isoDate);
  const todayItems = verified.filter((d) => {
    const dd = new Date(d.isoDate!); dd.setHours(0, 0, 0, 0);
    return dd.getTime() === today.getTime();
  });
  const upcomingItems = verified.filter((d) => {
    const dd = new Date(d.isoDate!);
    return dd > today && dd <= nextWeek;
  });
  const laterItems = verified.filter((d) => new Date(d.isoDate!) > nextWeek);
  const needsReview = result.deadlines.filter((d) => d.status !== 'verified');

  function Section({ title, items, emptyMsg }: { title: string; items: typeof verified; emptyMsg: string }) {
    return (
      <div className="mb-8">
        <div className="section-title">{title}</div>
        {items.length === 0 ? (
          <div style={{ padding: '1.5rem', border: 'var(--border)', background: 'var(--white)', color: 'var(--ink-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
            {emptyMsg}
          </div>
        ) : (
          <div className="today-timeline">
            {items.map((d, i) => {
              const inCluster = clusterIds.has(d.announcementId);
              return (
                <motion.div
                  key={d.announcementId}
                  className={`today-item ${inCluster ? 'cluster-item' : ''}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="today-item-time">{fmtTime(d.isoDate, d.rawTime)}</div>
                  <div className="today-item-main">
                    <div className="today-item-title">
                      {inCluster && <AlertTriangle size={13} color="var(--coral)" style={{ display: 'inline', marginRight: 5 }} />}
                      {d.title}
                    </div>
                    <div className="today-item-sub">
                      {d.subject} · {fmtDate(d.isoDate)}
                      {inCluster && <span style={{ color: 'var(--coral)', fontWeight: 700, marginLeft: 8 }}>CLUSTER ⚠</span>}
                    </div>
                  </div>
                  {inCluster && (
                    <span className="badge badge-coral" style={{ flexShrink: 0 }}>CLUSTER</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppLayout title="📅 Today's Plan">
      {/* Header */}
      <div className="today-header">
        <div>
          <h2>DEADLINE TIMELINE</h2>
          <p>All verified deadlines, sorted chronologically</p>
        </div>
        {result.cluster.isCluster && (
          <span className="badge badge-coral" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
            <AlertTriangle size={12} /> {result.cluster.clusterGroups.length} CLUSTER{result.cluster.clusterGroups.length > 1 ? 'S' : ''} DETECTED
          </span>
        )}
      </div>

      <Section title="📌 DUE TODAY"         items={todayItems}    emptyMsg="Nothing due today — you're safe! 🎉" />
      <Section title="📅 THIS WEEK"          items={upcomingItems} emptyMsg="No deadlines in the next 7 days." />
      <Section title="🗓 LATER"              items={laterItems}    emptyMsg="No deadlines beyond next week." />

      {needsReview.length > 0 && (
        <div className="mb-8">
          <div className="section-title">⚠ NEEDS CLARIFICATION</div>
          <div className="today-timeline">
            {needsReview.map((d, i) => (
              <motion.div
                key={d.announcementId}
                className="today-item"
                style={{ background: 'var(--yellow-light)', borderLeft: '4px solid var(--yellow-dark)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              >
                <div className="today-item-time" style={{ color: '#7a5900' }}>⚠</div>
                <div className="today-item-main">
                  <div className="today-item-title">{d.title}</div>
                  <div className="today-item-sub">
                    {d.subject} ·{' '}
                    {d.status === 'ambiguous' && (d.ambiguityReason ?? 'Date needs clarification')}
                    {d.status === 'conflicting' && 'Conflicting information'}
                    {d.status === 'relative' && 'Relative date — needs clarification'}
                    {d.status === 'not_found' && 'No deadline found'}
                  </div>
                </div>
                <button className="btn btn-yellow btn-sm" onClick={() => navigate('/tasks')}>
                  FIX →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
