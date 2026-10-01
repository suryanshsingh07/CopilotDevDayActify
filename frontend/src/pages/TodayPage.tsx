import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, AlertTriangle, Circle, Check,
  ArrowRight, Flame, Play, Pause, RotateCcw, Volume2, VolumeX,
  Filter, ShieldCheck, Timer
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDeadlines } from '../context/DeadlineContext';
import type { NormalizedDeadline } from '../types';

function fmtTime(iso: string | null, rawTime: string | null): string {
  if (rawTime) return rawTime.toUpperCase();
  if (!iso) return '11:59 PM';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '11:59 PM';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'DATE TBD';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'DATE TBD';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function getCountdown(iso: string | null): { label: string; isOverdue: boolean; isToday: boolean; isUrgent: boolean } {
  if (!iso) return { label: 'TBD', isOverdue: false, isToday: false, isUrgent: false };
  const d = new Date(iso).getTime();
  if (isNaN(d)) return { label: 'TBD', isOverdue: false, isToday: false, isUrgent: false };
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);
  
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}D OVERDUE`, isOverdue: true, isToday: false, isUrgent: true };
  if (diffDays === 0) return { label: 'DUE TODAY', isOverdue: false, isToday: true, isUrgent: true };
  if (diffDays === 1) return { label: 'DUE TOMORROW', isOverdue: false, isToday: false, isUrgent: true };
  if (diffDays <= 3) return { label: `${diffDays} DAYS LEFT`, isOverdue: false, isToday: false, isUrgent: true };
  return { label: `${diffDays} DAYS LEFT`, isOverdue: false, isToday: false, isUrgent: false };
}

export default function TodayPage() {
  const { deadlines, result, updateDeadline, addDeadline } = useDeadlines();
  const navigate = useNavigate();

  // Combine deadlines from both context sources
  const allTasks: NormalizedDeadline[] = useMemo(() => {
    if (deadlines && deadlines.length > 0) return deadlines;
    if (result?.deadlines && result.deadlines.length > 0) return result.deadlines;
    return [];
  }, [deadlines, result]);

  // Cluster IDs
  const clusterIds = useMemo(() => {
    return new Set<number>((result?.cluster?.clusterGroups ?? []).flatMap((g) => g.deadlineIds));
  }, [result]);

  // Filters & Timer State
  const [filterView, setFilterView] = useState<'all' | 'pending' | 'completed'>('all');
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');

  // Web Audio Synth chime
  function playBeep() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // AudioContext not supported
    }
  }

  // Timer Tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playBeep();
      if (timerMode === 'focus') {
        setTimerMode('break');
        setTimerSeconds(5 * 60);
      } else {
        setTimerMode('focus');
        setTimerSeconds(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, timerMode, soundEnabled]);

  const formatTimerDigits = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Toggle Task Completion
  function toggleTask(task: NormalizedDeadline) {
    updateDeadline({
      ...task,
      completed: !task.completed
    });
  }

  // Chronological Grouping
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);

  // Separate overdue, today, this week, and later
  const verifiedTasks = allTasks.filter((d) => d.status === 'verified' && d.isoDate);
  const needsReviewTasks = allTasks.filter((d) => d.status !== 'verified');

  const overdueItems = verifiedTasks.filter((d) => {
    const dt = new Date(d.isoDate!);
    dt.setHours(0, 0, 0, 0);
    return dt < today && !d.completed;
  });

  const todayItems = verifiedTasks.filter((d) => {
    const dt = new Date(d.isoDate!);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime() === today.getTime();
  });

  const thisWeekItems = verifiedTasks.filter((d) => {
    const dt = new Date(d.isoDate!);
    dt.setHours(0, 0, 0, 0);
    return dt > today && dt <= endOfWeek;
  });

  const laterItems = verifiedTasks.filter((d) => {
    const dt = new Date(d.isoDate!);
    dt.setHours(0, 0, 0, 0);
    return dt > endOfWeek;
  });

  // Calculate suggested study pace
  const openTasks = allTasks.filter((d) => !d.completed);
  const totalSuggestedHours = openTasks.reduce((acc, curr) => acc + (curr.estimatedHours || 3), 0);
  const dailySuggestedPace = openTasks.length > 0 ? Math.max(1, Math.round((totalSuggestedHours / 7) * 10) / 10) : 0;

  // Empty state handling
  if (allTasks.length === 0) {
    return (
      <AppLayout title="📅 Today's Plan">
        <div className="today-empty" style={{ maxWidth: '640px', margin: '2rem auto' }}>
          <div className="big-emoji"><Calendar size={44} /></div>
          <h3>NO DEADLINE TIMELINE YET</h3>
          <p>
            You don't have any assignments or deadlines scheduled yet. 
            Add your assignments in My Tasks to generate your chronological deadline timeline and daily study pace.
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
              LOAD DEMO SCHEDULE
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Task card component
  const renderTaskCard = (task: NormalizedDeadline, index: number) => {
    const inCluster = clusterIds.has(task.announcementId);
    const countdown = getCountdown(task.isoDate);

    // Apply filter view
    if (filterView === 'pending' && task.completed) return null;
    if (filterView === 'completed' && !task.completed) return null;

    return (
      <motion.div
        key={task.announcementId}
        className={`today-item ${inCluster ? 'cluster-item' : ''}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        style={{
          borderLeft: inCluster ? '6px solid var(--coral)' : task.completed ? '6px solid var(--mint)' : '6px solid var(--ink)',
          background: task.completed ? '#f0fdf4' : inCluster ? '#fff8f6' : '#fff',
          boxShadow: '3px 3px 0 var(--ink)',
          border: '2px solid var(--ink)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '0.75rem',
          opacity: task.completed ? 0.75 : 1
        }}
      >
        {/* Left: Time & Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <button
            onClick={() => toggleTask(task)}
            title={task.completed ? 'Mark pending' : 'Mark finished'}
            style={{
              width: 24,
              height: 24,
              border: '2px solid #111',
              background: task.completed ? 'var(--mint)' : '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {task.completed ? <Check size={16} color="#111" strokeWidth={3} /> : <Circle size={14} color="#888" />}
          </button>

          <div style={{
            font: '700 0.85rem Space Mono, monospace',
            color: task.completed ? 'var(--ink-muted)' : inCluster ? 'var(--coral)' : 'var(--ink)',
            minWidth: '85px',
            flexShrink: 0
          }}>
            {fmtTime(task.isoDate, task.rawTime)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: task.completed ? 'var(--ink-muted)' : 'var(--ink)',
              textDecoration: task.completed ? 'line-through' : 'none'
            }}>
              {inCluster && <AlertTriangle size={15} color="var(--coral)" style={{ flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '3px',
              fontSize: '0.72rem',
              fontFamily: 'Space Mono, monospace',
              color: 'var(--ink-soft)',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{task.subject}</span>
              <span>&bull;</span>
              <span>{fmtDate(task.isoDate)}</span>
              {task.type && (
                <>
                  <span>&bull;</span>
                  <span style={{ textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{task.type}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Badges & Focus Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Relative countdown pill */}
          <span className="badge" style={{
            background: countdown.isOverdue ? 'var(--coral)' : countdown.isToday ? 'var(--yellow)' : '#eee',
            color: '#111',
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.04em'
          }}>
            {countdown.label}
          </span>

          {/* Cluster Tag */}
          {inCluster && (
            <span className="badge" style={{ background: 'var(--coral)', color: '#fff', fontSize: '0.62rem', fontWeight: 800 }}>
              48H PILE-UP
            </span>
          )}

          {/* Quick Focus Button */}
          {!task.completed && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Start a 25-minute Pomodoro sprint on this assignment"
              onClick={() => {
                setSelectedTaskTitle(task.title);
                setShowTimer(true);
                setTimerMode('focus');
                setTimerSeconds(25 * 60);
                setIsTimerRunning(true);
              }}
            >
              <Timer size={12} />
              <span>SPRINT</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout title="📅 Today's Plan">
      {/* 1. HERO WORKLOAD & DAILY PACE BANNER */}
      <section className="card mb-6" style={{ padding: '1.75rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'var(--lime)', color: '#111', fontSize: '0.65rem', fontWeight: 800 }}>
                <Flame size={12} style={{ display: 'inline', marginRight: '3px' }} />
                CHRONOLOGICAL DEADLINE RADAR
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontFamily: 'Space Mono, monospace' }}>
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </span>
            </div>

            <h2 className="font-mono" style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2rem)', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              TODAY'S WORKLOAD & PACE: ~{dailySuggestedPace} HRS/DAY
            </h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', margin: 0, maxWidth: '720px' }}>
              Estimated daily effort required across your {openTasks.length} pending deadline{openTasks.length !== 1 ? 's' : ''} to avoid 48-hour collision pile-ups.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn ${showTimer ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowTimer(!showTimer)}
            >
              <Timer size={14} />
              <span>{showTimer ? 'HIDE SPRINT TIMER' : 'OPEN SPRINT TIMER'}</span>
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}
              onClick={() => navigate('/tasks')}
            >
              MANAGE TASKS <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 2. OPTIONAL EMBEDDED FOCUS SPRINT TIMER */}
        <AnimatePresence>
          {showTimer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                borderTop: '2px dashed var(--line)',
                paddingTop: '1.25rem',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  font: '800 2.2rem Space Grotesk, sans-serif',
                  background: '#111',
                  color: 'var(--lime)',
                  padding: '4px 16px',
                  border: '2px solid #111',
                  letterSpacing: '0.05em'
                }}>
                  {formatTimerDigits(timerSeconds)}
                </div>
                <div>
                  <span className="badge" style={{
                    background: timerMode === 'focus' ? 'var(--lime)' : 'var(--blue)',
                    color: '#111',
                    fontSize: '0.65rem',
                    fontWeight: 800
                  }}>
                    {timerMode === 'focus' ? '⚡ 25-MIN DEEP FOCUS' : '☕ 5-MIN RECOVERY BREAK'}
                  </span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '3px' }}>
                    {selectedTaskTitle ? `Working on: ${selectedTaskTitle}` : 'General Assignment Sprint'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> START SPRINT</>}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(timerMode === 'focus' ? 25 * 60 : 5 * 60);
                  }}
                  title="Reset Timer"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title="Toggle Chime Sound"
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 3. FILTER TABS BAR */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)', marginRight: '4px' }}>
            <Filter size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            SHOW:
          </span>
          <button
            className={`btn ${filterView === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
            onClick={() => setFilterView('all')}
          >
            ALL TIMELINE ({verifiedTasks.length})
          </button>
          <button
            className={`btn ${filterView === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
            onClick={() => setFilterView('pending')}
          >
            TO-DO ({verifiedTasks.filter((d) => !d.completed).length})
          </button>
          <button
            className={`btn ${filterView === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
            onClick={() => setFilterView('completed')}
          >
            COMPLETED ({verifiedTasks.filter((d) => d.completed).length})
          </button>
        </div>

        <div style={{ font: '700 0.75rem Space Mono, monospace', color: 'var(--ink-muted)' }}>
          CLICK CHECKBOXES TO MARK TASKS FINISHED
        </div>
      </section>

      {/* 4. OVERDUE TASKS (If any) */}
      {overdueItems.length > 0 && (
        <section className="mb-8">
          <div className="section-title" style={{ color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> 🚨 OVERDUE SUBMISSIONS ({overdueItems.length})
          </div>
          <div className="today-timeline">
            {overdueItems.map(renderTaskCard)}
          </div>
        </section>
      )}

      {/* 5. DUE TODAY */}
      <section className="mb-8">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} /> 📌 DUE TODAY ({todayItems.length})
        </div>
        {todayItems.length === 0 ? (
          <div style={{
            padding: '1.25rem',
            border: '2px dashed var(--line)',
            background: 'var(--white)',
            color: 'var(--ink-muted)',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontFamily: 'Space Mono, monospace'
          }}>
            🎉 Nothing due today — you're fully safe! Focus on upcoming assignments ahead of time.
          </div>
        ) : (
          <div className="today-timeline">
            {todayItems.map(renderTaskCard)}
          </div>
        )}
      </section>

      {/* 6. THIS WEEK (NEXT 7 DAYS) */}
      <section className="mb-8">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} /> 📅 THIS WEEK ({thisWeekItems.length})
        </div>
        {thisWeekItems.length === 0 ? (
          <div style={{
            padding: '1.25rem',
            border: '2px dashed var(--line)',
            background: 'var(--white)',
            color: 'var(--ink-muted)',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontFamily: 'Space Mono, monospace'
          }}>
            No deadlines in the next 7 days. Excellent breathing room!
          </div>
        ) : (
          <div className="today-timeline">
            {thisWeekItems.map(renderTaskCard)}
          </div>
        )}
      </section>

      {/* 7. LATER / UPCOMING BEYOND NEXT WEEK */}
      <section className="mb-8">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} /> 🗓️ LATER DEADLINES ({laterItems.length})
        </div>
        {laterItems.length === 0 ? (
          <div style={{
            padding: '1.25rem',
            border: '2px dashed var(--line)',
            background: 'var(--white)',
            color: 'var(--ink-muted)',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontFamily: 'Space Mono, monospace'
          }}>
            No major deadlines beyond next week.
          </div>
        ) : (
          <div className="today-timeline">
            {laterItems.map(renderTaskCard)}
          </div>
        )}
      </section>

      {/* 8. NEEDS CLARIFICATION / AMBIGUOUS DATES */}
      {needsReviewTasks.length > 0 && (
        <section className="mb-8">
          <div className="section-title" style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> ⚠️ NEEDS CLARIFICATION ({needsReviewTasks.length})
          </div>
          <div className="today-timeline">
            {needsReviewTasks.map((d, i) => (
              <motion.div
                key={d.announcementId}
                className="today-item"
                style={{
                  background: 'var(--yellow-light)',
                  border: '2px solid var(--ink)',
                  borderLeft: '6px solid var(--yellow-dark)',
                  boxShadow: '3px 3px 0 var(--ink)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '0.75rem'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ font: '700 0.85rem Space Mono, monospace', color: '#b45309' }}>
                    DATE MISSING
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                      {d.subject} &bull;{' '}
                      {d.status === 'ambiguous' && (d.ambiguityReason ?? 'Date requires reference')}
                      {d.status === 'conflicting' && 'Conflicting submission dates found'}
                      {d.status === 'relative' && 'Relative date requires exact calendar date'}
                      {d.status === 'not_found' && 'No deadline found in announcement'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-yellow btn-sm"
                  style={{ flexShrink: 0, padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                  onClick={() => navigate('/tasks')}
                >
                  ASSIGN DATE &rarr;
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
