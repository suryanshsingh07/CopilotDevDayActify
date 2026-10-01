import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, CheckCircle2, Circle, AlertTriangle, Calendar,
  ArrowRight, Filter, Check, Clock, ShieldCheck, Search
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDeadlines } from '../context/DeadlineContext';
import type { NormalizedDeadline } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return 'NO DATE';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'INVALID DATE';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function getDaysUntil(iso: string | null): { text: string; isOverdue: boolean; isUrgent: boolean } {
  if (!iso) return { text: 'Date TBD', isOverdue: false, isUrgent: false };
  const target = new Date(iso).getTime();
  if (isNaN(target)) return { text: 'Date TBD', isOverdue: false, isUrgent: false };
  const diff = target - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, isOverdue: true, isUrgent: false };
  if (days === 0) return { text: 'Due today', isOverdue: false, isUrgent: true };
  if (days === 1) return { text: 'Due tomorrow', isOverdue: false, isUrgent: true };
  if (days <= 3) return { text: `In ${days} days`, isOverdue: false, isUrgent: true };
  return { text: `In ${days} days`, isOverdue: false, isUrgent: false };
}

export default function ProgressPage() {
  const { deadlines, result, updateDeadline, addDeadline } = useDeadlines();
  const navigate = useNavigate();

  // Active filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done' | 'cluster'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Source list: combine result.deadlines and stored deadlines
  const allTasks: NormalizedDeadline[] = useMemo(() => {
    if (result?.deadlines && result.deadlines.length > 0) return result.deadlines;
    return deadlines;
  }, [result, deadlines]);

  // Cluster deadline IDs
  const clusterIds = useMemo(() => {
    return new Set<number>((result?.cluster?.clusterGroups ?? []).flatMap((g) => g.deadlineIds));
  }, [result]);

  // Handle empty state
  if (allTasks.length === 0) {
    return (
      <AppLayout title="📈 Progress">
        <div className="today-empty" style={{ maxWidth: '640px', margin: '2rem auto' }}>
          <div className="big-emoji"><TrendingUp size={44} /></div>
          <h3>NO DEADLINES ON YOUR RADAR</h3>
          <p>
            You haven't extracted or added any assignments or exams yet. 
            Add your course deadlines to track semester progress, completion rates, and 48-hour collision pile-ups.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
              GO TO MY TASKS <ArrowRight size={15} />
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                addDeadline({
                  title: 'DBMS Assignment 3',
                  subject: 'DBMS',
                  isoDate: '2026-10-12T10:00:00.000Z',
                  status: 'verified',
                  type: 'assignment'
                });
                addDeadline({
                  title: 'OS Lab Record',
                  subject: 'OPERATING SYSTEMS',
                  isoDate: '2026-10-13T14:00:00.000Z',
                  status: 'verified',
                  type: 'assignment'
                });
                addDeadline({
                  title: 'AI Presentation',
                  subject: 'ARTIFICIAL INTELLIGENCE',
                  isoDate: '2026-10-14T09:00:00.000Z',
                  status: 'verified',
                  type: 'exam'
                });
              }}
            >
              LOAD SAMPLE WORKLOAD
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Key performance metrics
  const total = allTasks.length;
  const completedCount = allTasks.filter((d) => d.completed).length;
  const verifiedCount = allTasks.filter((d) => d.status === 'verified').length;
  const needsReviewCount = allTasks.filter((d) => d.status !== 'verified').length;
  const clusterCount = result?.cluster?.clusterGroups?.length ?? 0;
  const inClusterCount = allTasks.filter((d) => clusterIds.has(d.announcementId)).length;

  const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const verificationPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  // Toggle completion
  function toggleTaskCompletion(task: NormalizedDeadline) {
    updateDeadline({
      ...task,
      completed: !task.completed
    });
  }

  // Subject grouping
  const subjectColors = [
    'var(--mint)', 'var(--blue)', 'var(--yellow)', 'var(--coral)', 'var(--purple)', '#ec4899', '#06b6d4'
  ];

  const subjectsMap = new Map<string, NormalizedDeadline[]>();
  allTasks.forEach((d) => {
    const subj = d.subject?.trim().toUpperCase() || 'GENERAL';
    const list = subjectsMap.get(subj) ?? [];
    list.push(d);
    subjectsMap.set(subj, list);
  });

  const subjectList = Array.from(subjectsMap.entries()).map(([subject, items], i) => {
    const done = items.filter((d) => d.completed).length;
    const verified = items.filter((d) => d.status === 'verified').length;
    const pct = Math.round((done / items.length) * 100);
    return {
      subject,
      items,
      done,
      verified,
      pct,
      color: subjectColors[i % subjectColors.length]
    };
  });

  // Filtered tasks
  const filteredSubjects = subjectList.filter((s) => {
    if (selectedSubject !== 'all' && s.subject !== selectedSubject) return false;
    return true;
  }).map((s) => {
    const matchingItems = s.items.filter((item) => {
      // Status filter
      if (statusFilter === 'todo' && item.completed) return false;
      if (statusFilter === 'done' && !item.completed) return false;
      if (statusFilter === 'cluster' && !clusterIds.has(item.announcementId)) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.subject.toLowerCase().includes(q);
      }
      return true;
    });
    return {
      ...s,
      visibleItems: matchingItems
    };
  }).filter((s) => s.visibleItems.length > 0);

  // Status message
  const statusHeadline = 
    completionPct === 100 ? '🏆 100% CONQUERED — ALL WORK FINISHED!' :
    clusterCount > 0 ? `⚠️ ${clusterCount} DEADLINE PILE-UP DETECTED` :
    completionPct >= 50 ? '🔥 STEADY MOMENTUM — PAST THE HALFWAY MARK' :
    '🎯 SEMESTER IN PROGRESS — STAY AHEAD';

  return (
    <AppLayout title="📈 Progress">
      {/* 1. HERO READINESS BANNER */}
      <section className="card mb-6" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{
                background: completionPct === 100 ? 'var(--mint)' : clusterCount > 0 ? 'var(--coral)' : 'var(--yellow)',
                color: '#111',
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.08em'
              }}>
                {statusHeadline}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontFamily: 'Space Mono, monospace' }}>
                {subjectList.length} COURSE{subjectList.length !== 1 ? 'S' : ''} TRACKED
              </span>
            </div>
            <h2 className="font-mono" style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2rem)', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              SEMESTER COMPLETION: {completionPct}%
            </h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', margin: 0 }}>
              <strong>{completedCount} of {total}</strong> assignments completed &bull; <strong>{verifiedCount}</strong> verified dates &bull; <strong>{total - completedCount}</strong> pending items left.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }} onClick={() => navigate('/tasks')}>
              MANAGE TASKS <ArrowRight size={13} />
            </button>
            <button className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }} onClick={() => navigate('/today')}>
              TODAY'S PLAN <Calendar size={13} />
            </button>
          </div>
        </div>

        {/* Dual-layered Progress Bar */}
        <div className="progress-bar-wrap" style={{ height: '20px', borderRadius: 0, border: '2.5px solid #111', background: 'var(--cream-dark)' }}>
          <motion.div
            className="progress-bar-fill"
            style={{ background: 'var(--mint)' }}
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', fontSize: '0.75rem', fontFamily: 'Space Mono, monospace', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, background: 'var(--mint)', border: '1px solid #111' }} />
            {completedCount} COMPLETED ({completionPct}%)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, background: 'var(--yellow)', border: '1px solid #111' }} />
            {total - completedCount} REMAINING ({100 - completionPct}%)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, background: 'var(--blue)', border: '1px solid #111' }} />
            {verifiedCount} VERIFIED DATES
          </span>
          {clusterCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--coral)', fontWeight: 700 }}>
              <span style={{ width: 10, height: 10, background: 'var(--coral)', border: '1px solid #111' }} />
              {clusterCount} PILE-UP CLUSTER{clusterCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>
      </section>

      {/* 2. TOP KPI METRICS 4-GRID */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* KPI 1 */}
        <article className="card" style={{ padding: '1.25rem', borderTop: '5px solid var(--mint)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)' }}>TASKS COMPLETED</span>
            <CheckCircle2 size={18} color="var(--mint)" />
          </div>
          <div style={{ font: '800 2rem Space Grotesk, sans-serif', lineHeight: 1.1 }}>
            {completedCount}<small style={{ fontSize: '1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>/{total}</small>
          </div>
          <div style={{ marginTop: '0.5rem', font: '600 0.75rem Space Mono, monospace', color: 'var(--ink-soft)' }}>
            {completionPct}% of workload marked done
          </div>
        </article>

        {/* KPI 2 */}
        <article className="card" style={{ padding: '1.25rem', borderTop: '5px solid var(--blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)' }}>VERIFIED SUBMISSIONS</span>
            <ShieldCheck size={18} color="var(--blue)" />
          </div>
          <div style={{ font: '800 2rem Space Grotesk, sans-serif', lineHeight: 1.1 }}>
            {verifiedCount}<small style={{ fontSize: '1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>/{total}</small>
          </div>
          <div style={{ marginTop: '0.5rem', font: '600 0.75rem Space Mono, monospace', color: 'var(--ink-soft)' }}>
            {verificationPct}% explicit date accuracy
          </div>
        </article>

        {/* KPI 3 */}
        <article className="card" style={{ padding: '1.25rem', borderTop: '5px solid var(--yellow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)' }}>PENDING DEADLINES</span>
            <Clock size={18} color="var(--yellow-dark)" />
          </div>
          <div style={{ font: '800 2rem Space Grotesk, sans-serif', lineHeight: 1.1 }}>
            {total - completedCount}
          </div>
          <div style={{ marginTop: '0.5rem', font: '600 0.75rem Space Mono, monospace', color: 'var(--ink-soft)' }}>
            {needsReviewCount > 0 ? `${needsReviewCount} need date review` : 'All dates confirmed'}
          </div>
        </article>

        {/* KPI 4 */}
        <article className="card" style={{ padding: '1.25rem', borderTop: `5px solid ${clusterCount > 0 ? 'var(--coral)' : 'var(--mint)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)' }}>48H CLUSTER RADAR</span>
            <AlertTriangle size={18} color={clusterCount > 0 ? 'var(--coral)' : 'var(--mint)'} />
          </div>
          <div style={{ font: '800 2rem Space Grotesk, sans-serif', lineHeight: 1.1, color: clusterCount > 0 ? 'var(--coral)' : 'var(--ink)' }}>
            {clusterCount}
          </div>
          <div style={{ marginTop: '0.5rem', font: '600 0.75rem Space Mono, monospace', color: 'var(--ink-soft)' }}>
            {clusterCount > 0 ? `${inClusterCount} tasks clashing in 48h windows` : 'Zero collision pile-ups detected'}
          </div>
        </article>
      </section>

      {/* 3. 48-HOUR CLUSTER ALERT SECTION (If any) */}
      {result?.cluster?.isCluster && (
        <section className="mb-8">
          <div className="section-title" style={{ color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> 48-HOUR DEADLINE PILE-UP DETECTED
          </div>
          {result.cluster.clusterGroups.map((g, i) => {
            const groupDeadlines = allTasks.filter((d) => g.deadlineIds.includes(d.announcementId));
            return (
              <div key={i} className="cluster-banner" style={{ marginBottom: '1rem', border: '2.5px solid var(--coral)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>CLUSTER GROUP #{i + 1} — {g.deadlineIds.length} SUBMISSIONS WITHIN {Math.ceil(g.windowHours)} HOURS</h3>
                  <span className="badge" style={{ background: 'var(--coral)', color: '#fff', fontSize: '0.65rem' }}>
                    HIGH PILE-UP RISK
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '10px' }}>
                  These deadlines arrive in rapid succession. Finish the earliest assignment ahead of time to avoid an emergency all-nighter.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                  {groupDeadlines.map((d) => (
                    <div
                      key={d.announcementId}
                      style={{
                        background: '#fff', border: '1.5px solid #111', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.85rem', display: 'block' }}>{d.title}</strong>
                        <small style={{ color: 'var(--ink-muted)', fontFamily: 'Space Mono, monospace' }}>{d.subject}</small>
                      </div>
                      <span style={{ font: '700 0.75rem Space Mono, monospace', color: 'var(--coral)' }}>
                        {formatDate(d.isoDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 4. FILTER BAR & CONTROLS */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)', marginRight: '4px' }}>
            <Filter size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            FILTER:
          </span>
          <button
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
            onClick={() => setStatusFilter('all')}
          >
            ALL ({total})
          </button>
          <button
            className={`btn ${statusFilter === 'todo' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
            onClick={() => setStatusFilter('todo')}
          >
            TO-DO ({total - completedCount})
          </button>
          <button
            className={`btn ${statusFilter === 'done' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
            onClick={() => setStatusFilter('done')}
          >
            DONE ({completedCount})
          </button>
          {clusterCount > 0 && (
            <button
              className={`btn ${statusFilter === 'cluster' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderColor: 'var(--coral)' }}
              onClick={() => setStatusFilter('cluster')}
            >
              CLUSTERED ({inClusterCount})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--ink-muted)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.35rem 0.65rem 0.35rem 1.65rem',
                border: '2px solid #111',
                font: '600 0.75rem Space Grotesk, sans-serif',
                background: '#fff',
                width: '140px'
              }}
            />
          </div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              border: '2px solid #111',
              font: '700 0.75rem Space Mono, monospace',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">ALL SUBJECTS ({subjectList.length})</option>
            {subjectList.map((s) => (
              <option key={s.subject} value={s.subject}>
                {s.subject} ({s.items.length})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 5. COURSE BY COURSE PROGRESS BREAKDOWN */}
      <section className="mb-6">
        <div className="section-title">COURSE-BY-COURSE PROGRESS & CHECKLIST</div>
      </section>

      <div className="progress-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        <AnimatePresence>
          {filteredSubjects.map(({ subject, visibleItems, items, done, pct, color }, i) => (
            <motion.article
              key={subject}
              className="progress-subject-card"
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              style={{ borderTop: `6px solid ${color}`, display: 'flex', flexDirection: 'column' }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 className="progress-subject-name" style={{ margin: 0, fontSize: '0.95rem' }}>
                    {subject}
                  </h3>
                  <small style={{ color: 'var(--ink-muted)', font: '600 0.7rem Space Mono, monospace' }}>
                    {done} of {items.length} completed
                  </small>
                </div>
                <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="progress-bar-wrap" style={{ height: '12px', border: '1.5px solid #111', marginBottom: '1rem' }}>
                <motion.div
                  className="progress-bar-fill"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                />
              </div>

              {/* Task Items inside this Course */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                {visibleItems.map((task) => {
                  const inCluster = clusterIds.has(task.announcementId);
                  const daysInfo = getDaysUntil(task.isoDate);

                  return (
                    <div
                      key={task.announcementId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.65rem',
                        border: '1.5px solid #111',
                        background: task.completed ? '#f0fdf4' : '#fff',
                        boxShadow: '1px 1px 0 #111',
                        borderLeft: inCluster ? '4px solid var(--coral)' : undefined,
                        opacity: task.completed ? 0.75 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Checkbox + Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <button
                          onClick={() => toggleTaskCompletion(task)}
                          title={task.completed ? 'Mark to-do' : 'Mark completed'}
                          style={{
                            width: 22,
                            height: 22,
                            border: '1.5px solid #111',
                            background: task.completed ? 'var(--mint)' : '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {task.completed ? <Check size={14} color="#111" strokeWidth={3} /> : <Circle size={12} color="#888" />}
                        </button>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{
                            display: 'block',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? 'var(--ink-muted)' : 'var(--ink)'
                          }}>
                            {task.title}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontFamily: 'Space Mono, monospace',
                              color: daysInfo.isOverdue ? 'var(--coral)' : daysInfo.isUrgent ? 'var(--yellow-dark)' : 'var(--ink-muted)',
                              fontWeight: daysInfo.isUrgent || daysInfo.isOverdue ? 700 : 500
                            }}>
                              {formatDate(task.isoDate)} &bull; {daysInfo.text}
                            </span>
                            {inCluster && (
                              <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--coral)', fontFamily: 'Space Mono, monospace' }}>
                                ⚠️ 48H
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span className="badge" style={{
                        background: task.status === 'verified' ? 'var(--mint)' : 'var(--yellow)',
                        color: '#111',
                        fontSize: '0.55rem',
                        fontWeight: 800,
                        marginLeft: '8px',
                        flexShrink: 0
                      }}>
                        {task.status === 'verified' ? 'VERIFIED' : 'REVIEW'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
