import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, AlertTriangle, CheckCircle2,
  Clock, Sparkles, X, ArrowRight, ShieldCheck, Flame
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useDeadlines } from '../context/DeadlineContext';
import { DEMO_ANNOUNCEMENTS } from '../data/demo';
import { analyzeDeadlines } from '../api/client';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function getDaysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Generate next 7 days for the weekly strip
function getNext7Days() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      date: d,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      iso: d.toISOString().split('T')[0],
      isToday: i === 0,
    });
  }
  return days;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { result, setResult, addDeadline } = useDeadlines();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<'all' | 'cluster' | 'urgent' | 'review'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('23:59');

  const deadlines = result?.deadlines ?? [];
  const clusterIds = new Set<number>(
    (result?.cluster?.clusterGroups ?? []).flatMap((g) => g.deadlineIds)
  );
  const stats = result?.stats;

  const verified = deadlines.filter((d) => d.status === 'verified');
  const needsReview = deadlines.filter((d) => d.status !== 'verified');
  const isClusterActive = (result?.cluster?.isCluster && (result?.cluster?.clusterGroups?.length ?? 0) > 0);

  // Filter deadlines
  const filteredDeadlines = deadlines.filter((d) => {
    if (activeFilter === 'cluster') return clusterIds.has(d.announcementId);
    if (activeFilter === 'urgent') {
      const days = getDaysUntil(d.isoDate);
      return days !== null && days <= 3 && days >= 0;
    }
    if (activeFilter === 'review') return d.status !== 'verified';
    return true;
  });

  // Calculate verification percentage
  const totalCount = deadlines.length;
  const verifiedPercent = totalCount > 0 ? Math.round((verified.length / totalCount) * 100) : 0;

  // AI coach message
  let coachMsg = 'Add your syllabus or assignment announcements to detect hidden deadline pile-ups!';
  let coachAction = 'Click "Add Announcements" to parse classroom text or paste assignments.';
  if (result) {
    if (isClusterActive) {
      const g = result.cluster.clusterGroups[0];
      coachMsg = `CRITICAL ALERT: You have ${g.deadlineIds.length} major deliverables hitting within ${Math.ceil(g.windowHours)} hours!`;
      coachAction = 'Stagger your milestones: complete the first deliverable 48 hours early to avoid burnout.';
    } else if (stats && stats.needsReview > 0) {
      coachMsg = `${stats.needsReview} deadline(s) have missing or ambiguous times. Please review them in My Tasks.`;
      coachAction = 'Set exact submission times so the cluster engine can accurately calculate collision windows.';
    } else if (stats && stats.verified > 0) {
      coachMsg = `All ${stats.verified} deadlines verified! No fatal collision detected within 48-hour windows.`;
      coachAction = 'Great pacing! Review your daily schedule under "Today\'s Plan" to keep momentum.';
    }
  }

  // Quick Add Handler
  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isoDateStr = newDate ? `${newDate}T${newTime}:00.000Z` : new Date().toISOString();
    addDeadline({
      title: newTitle.trim(),
      subject: newSubject.trim() || 'General',
      rawDate: newDate,
      rawTime: newTime,
      isoDate: isoDateStr,
      status: 'verified',
    });

    setNewTitle('');
    setNewSubject('');
    setNewDate('');
    setShowAddModal(false);
  }

  // Quick Demo Load
  async function loadDemoData() {
    try {
      const demoItems = DEMO_ANNOUNCEMENTS.map((a, i) => {
        const dates = [
          '2026-10-12T10:00:00.000Z',
          '2026-10-13T14:00:00.000Z',
          '2026-10-14T09:00:00.000Z',
          '2026-10-20T23:59:00.000Z',
          '2026-10-25T17:00:00.000Z',
          '2026-11-01T23:59:00.000Z',
        ];
        return {
          announcementId: a.id,
          title: a.text.split('\n')[0].replace(/^[A-Z0-9\s-]+:\s*/, '').slice(0, 35) || 'Assignment',
          subject: ['CS 301', 'CS 310', 'MATH 220', 'PHYS 150', 'ENG 201', 'STAT 300'][i % 6],
          rawDate: 'October ' + (12 + i) + ', 2026',
          rawTime: '10:00 AM',
          isoDate: dates[i] || new Date().toISOString(),
          status: (i === 4 ? 'ambiguous' : 'verified') as any,
          ambiguityReason: i === 4 ? 'Exact hour not specified' : null,
          conflictingInfo: null,
          sourceText: a.text,
        };
      });

      const res = await analyzeDeadlines(demoItems);
      setResult(res);
    } catch (err) {
      console.error('Failed to analyze demo:', err);
    }
  }

  const weekDays = getNext7Days();

  return (
    <AppLayout title="DASHBOARD">
      <div className="dashboard-container">
        {/* Top Header */}
        <div className="dash-header-row">
          <div>
            <div className="status-pill-badge">
              {isClusterActive ? (
                <span className="status-pill cluster">
                  <Flame size={13} /> CLUSTER ALERT ACTIVE
                </span>
              ) : (
                <span className="status-pill safe">
                  <ShieldCheck size={13} /> SCHEDULE NORMAL
                </span>
              )}
              <span className="status-date-sub">{todayStr()}</span>
            </div>
            <h1 className="dash-title">
              Welcome back, {user?.name?.split(' ')[0]} ⚡
            </h1>
            <p className="dash-subtitle">
              Your real-time collision radar and workload manager.
            </p>
          </div>

          <div className="dash-header-actions">
            <button
              id="dash-quick-add-btn"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} /> QUICK ADD
            </button>
            <button
              id="dash-extract-btn"
              className="btn btn-outline"
              onClick={() => navigate('/tasks')}
            >
              <Sparkles size={16} /> PASTE ANNOUNCEMENTS
            </button>
          </div>
        </div>

        {/* Weekly Timeline Strip */}
        <div className="weekly-strip-card">
          <div className="strip-header">
            <span className="strip-title">
              <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
              7-DAY DEADLINE COLLISION STRIP
            </span>
            <span className="strip-hint">Upcoming deliverables radar</span>
          </div>

          <div className="strip-grid">
            {weekDays.map((day) => {
              // Deadlines on this day
              const onThisDay = deadlines.filter((d) => d.isoDate && d.isoDate.startsWith(day.iso));
              const hasCluster = onThisDay.some((d) => clusterIds.has(d.announcementId));
              const hasItems = onThisDay.length > 0;

              return (
                <div
                  key={day.iso}
                  className={`strip-day-card ${day.isToday ? 'today' : ''} ${hasCluster ? 'cluster-day' : ''}`}
                >
                  <div className="strip-day-name">{day.dayName}</div>
                  <div className="strip-day-num">{day.dayNum}</div>
                  <div className="strip-day-month">{day.month}</div>

                  <div className="strip-dots">
                    {hasItems ? (
                      <span className={`strip-count-tag ${hasCluster ? 'cluster' : 'normal'}`}>
                        {onThisDay.length} {onThisDay.length === 1 ? 'task' : 'tasks'}
                      </span>
                    ) : (
                      <span className="strip-count-empty">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-top">
              <span className="metric-label">TOTAL DELIVERABLES</span>
              <span className="metric-icon">📋</span>
            </div>
            <div className="metric-value">{stats?.total ?? totalCount}</div>
            <div className="metric-footer">
              <span>{verifiedPercent}% verified accuracy</span>
              <div className="metric-progress-bar">
                <div className="metric-progress-fill" style={{ width: `${verifiedPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-top">
              <span className="metric-label">VERIFIED DATES</span>
              <span className="metric-icon">✅</span>
            </div>
            <div className="metric-value">{stats?.verified ?? verified.length}</div>
            <div className="metric-footer">
              <span className="text-mint font-bold">Lock-in confirmed</span>
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-top">
              <span className="metric-label">NEEDS REVIEW</span>
              <span className="metric-icon">⏰</span>
            </div>
            <div className="metric-value">{stats?.needsReview ?? needsReview.length}</div>
            <div className="metric-footer">
              <span className={needsReview.length > 0 ? 'text-coral' : ''}>
                {needsReview.length > 0 ? 'Requires attention' : 'All clear'}
              </span>
            </div>
          </div>

          <div className={`metric-box ${isClusterActive ? 'metric-box-alert' : ''}`}>
            <div className="metric-top">
              <span className="metric-label">DEADLINE PILE-UPS</span>
              <span className="metric-icon">⚠️</span>
            </div>
            <div className="metric-value">{stats?.clusters ?? (isClusterActive ? 1 : 0)}</div>
            <div className="metric-footer">
              <span className={isClusterActive ? 'text-coral font-bold' : ''}>
                {isClusterActive ? 'Collision within 48h!' : 'No fatal clashes'}
              </span>
            </div>
          </div>
        </div>

        {/* AI Planning Coach Banner */}
        <div className={`ai-coach-banner ${isClusterActive ? 'alert' : ''}`}>
          <div className="ai-coach-avatar">
            <Sparkles size={24} />
          </div>
          <div className="ai-coach-content">
            <div className="ai-coach-tag">AI WORKLOAD ADVISOR</div>
            <div className="ai-coach-heading">{coachMsg}</div>
            <p className="ai-coach-sub">{coachAction}</p>
          </div>
          <div className="ai-coach-actions">
            <button
              className="btn btn-white btn-sm"
              onClick={() => navigate('/today')}
            >
              TODAY'S PLAN <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Cluster Alert Box if active */}
        {isClusterActive && (
          <motion.div
            className="cluster-warning-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="cluster-header-wrap">
              <div className="cluster-icon-tag">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="cluster-alert-title">48-HOUR CONFLICT DETECTED</h3>
                <p className="cluster-alert-desc">
                  Actify algorithms detected 3 or more deadlines bunched tightly together.
                </p>
              </div>
            </div>

            <div className="cluster-group-list">
              {result?.cluster.clusterGroups.map((group, idx) => (
                <div key={idx} className="cluster-group-chip">
                  <span className="cluster-group-num">Group #{idx + 1}</span>
                  <span className="cluster-group-info">
                    {group.deadlineIds.length} tasks scheduled across {Math.ceil(group.windowHours)} hours
                  </span>
                  <span className="cluster-group-span">
                    {formatDate(group.startIso)} ➔ {formatDate(group.endIso)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Deadlines Section */}
        <div className="dash-deadlines-section">
          <div className="dash-section-header">
            <div>
              <h2 className="dash-section-title">ACTIVE DELIVERABLES</h2>
              <p className="dash-section-sub">Chronological deadline queue</p>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs-wrap">
              <button
                className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All ({deadlines.length})
              </button>
              <button
                className={`filter-tab ${activeFilter === 'cluster' ? 'active' : ''}`}
                onClick={() => setActiveFilter('cluster')}
              >
                Clusters ({clusterIds.size})
              </button>
              <button
                className={`filter-tab ${activeFilter === 'urgent' ? 'active' : ''}`}
                onClick={() => setActiveFilter('urgent')}
              >
                Next 72 Hours
              </button>
              <button
                className={`filter-tab ${activeFilter === 'review' ? 'active' : ''}`}
                onClick={() => setActiveFilter('review')}
              >
                Needs Review ({needsReview.length})
              </button>
            </div>
          </div>

          {/* List or Empty State */}
          {filteredDeadlines.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-icon-wrap">
                <Calendar size={36} />
              </div>
              <h3 className="empty-title">
                {totalCount === 0 ? 'No Deadlines Registered Yet' : 'No Deadlines Match This Filter'}
              </h3>
              <p className="empty-desc">
                {totalCount === 0
                  ? 'Paste classroom announcements or load the sample student dataset to see the collision engine in action.'
                  : 'Try selecting a different filter above to view your deadlines.'}
              </p>
              {totalCount === 0 && (
                <div className="empty-actions">
                  <button className="btn btn-primary" onClick={loadDemoData}>
                    <Sparkles size={15} /> LOAD DEMO DATASET
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowAddModal(true)}>
                    <Plus size={15} /> ADD SINGLE TASK
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="deadlines-stream">
              {filteredDeadlines.map((d) => {
                const inCluster = clusterIds.has(d.announcementId);
                const daysLeft = getDaysUntil(d.isoDate);
                const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

                return (
                  <motion.div
                    key={d.announcementId}
                    className={`deadline-card-row ${inCluster ? 'in-cluster' : ''}`}
                    layout
                  >
                    <div className="deadline-row-main">
                      <div className="deadline-col-status">
                        {inCluster ? (
                          <div className="cluster-flame-indicator" title="Part of a 48h deadline pile-up!">
                            <Flame size={16} />
                          </div>
                        ) : (
                          <div className="status-dot-normal">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>

                      <div className="deadline-col-info">
                        <div className="deadline-subject-tag">{d.subject || 'GENERAL'}</div>
                        <div className="deadline-name">{d.title}</div>
                        {d.ambiguityReason && (
                          <div className="deadline-reason-tag">
                            <Clock size={11} /> {d.ambiguityReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="deadline-row-meta">
                      {isUrgent && (
                        <span className="badge badge-urgent">
                          <AlertTriangle size={11} /> DUE IN {daysLeft === 0 ? 'TODAY' : `${daysLeft}D`}
                        </span>
                      )}

                      {inCluster && (
                        <span className="badge badge-cluster-tag">
                          PILE-UP COLLISION
                        </span>
                      )}

                      <div className="deadline-date-pill">
                        <Calendar size={13} />
                        <span>{formatDate(d.isoDate)}</span>
                        {d.rawTime && <span className="deadline-time-chip">{d.rawTime}</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <motion.div
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">QUICK ADD DEADLINE</h3>
                  <p className="modal-sub">Directly register an assignment or exam</p>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleQuickAdd} className="modal-form">
                <div className="form-group">
                  <label className="form-label">ASSIGNMENT / EXAM TITLE *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Distributed Systems Final Project"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">COURSE / SUBJECT</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CS 450"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DUE DATE *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">DUE TIME</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    CANCEL
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> SAVE TO RADAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
