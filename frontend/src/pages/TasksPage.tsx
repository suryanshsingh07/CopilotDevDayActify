import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Trash2, Calendar,
  Sparkles, RotateCcw,
  FileText, BookOpen, Wrench, Bookmark,
  AlertTriangle
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDeadlines } from '../context/DeadlineContext';
import { extractDeadlines, analyzeDeadlines } from '../api/client';
import type { Announcement, NormalizedDeadline } from '../types';
import { DEMO_ANNOUNCEMENTS } from '../data/demo';

const EMPTY: Announcement[] = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, text: '' }));

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

function todayMinStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function TasksPage() {
  const { deadlines, result, setDeadlines, setResult, addDeadline } = useDeadlines();

  // View state: 'list' (Task Manager) vs 'announcements' (AI Extractor)
  const [viewMode, setViewMode] = useState<'list' | 'announcements'>('list');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskType, setTaskType] = useState<'assignment' | 'exam' | 'project' | 'reading' | 'other'>('assignment');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [taskDifficulty, setTaskDifficulty] = useState<'hard' | 'medium' | 'easy'>('medium');
  const [taskProficiency, setTaskProficiency] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [taskHours, setTaskHours] = useState('4');
  const [taskNotes, setTaskNotes] = useState('');

  // AI Announcement Extractor State
  const [announcements, setAnnouncements] = useState<Announcement[]>(EMPTY);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Cluster calculations
  const clusterIds = new Set<number>((result?.cluster.clusterGroups ?? []).flatMap((g) => g.deadlineIds));

  // Active vs Completed
  const activeTasks = deadlines.filter((d) => !d.completed);
  const completedTasks = deadlines.filter((d) => d.completed);

  // Handle Form Submit
  function handleAddTaskSubmit(e: FormEvent) {
    e.preventDefault();
    if (!taskName.trim() || !taskDeadline) return;

    const isoDate = `${taskDeadline}T23:59:00.000Z`;

    addDeadline({
      title: taskName.trim(),
      subject: taskSubject.trim() || 'General',
      rawDate: taskDeadline,
      rawTime: '11:59 PM',
      isoDate,
      status: 'verified',
      type: taskType,
      priority: taskPriority,
      difficulty: taskDifficulty,
      proficiency: taskProficiency,
      estimatedHours: parseFloat(taskHours) || 2,
      notes: taskNotes.trim(),
      completed: false,
    });

    // Reset Form
    setTaskName('');
    setTaskSubject('');
    setTaskDeadline('');
    setTaskHours('4');
    setTaskNotes('');
    setShowModal(false);
  }

  // Toggle Completed
  function toggleCompleted(dl: NormalizedDeadline) {
    const updated = deadlines.map((d) =>
      d.announcementId === dl.announcementId ? { ...d, completed: !d.completed } : d
    );
    setDeadlines(updated);
  }

  // Delete Task
  function deleteTask(id: number) {
    const updated = deadlines.filter((d) => d.announcementId !== id);
    setDeadlines(updated);
  }

  // AI Extract
  async function handleExtract() {
    const filled = announcements.filter((a) => a.text.trim().length > 0);
    if (!filled.length) { setExtractError('Please fill in at least one announcement.'); return; }
    setExtractError(null);
    setExtracting(true);
    try {
      const res = await extractDeadlines(filled);
      setDeadlines(res.deadlines);
      const analyzed = await analyzeDeadlines(res.deadlines);
      setResult(analyzed);
      setViewMode('list');
    } catch (e: any) {
      setExtractError(e?.message || 'Extraction failed.');
    } finally {
      setExtracting(false);
    }
  }

  return (
    <AppLayout title="📝 My Tasks">
      <div className="mytasks-page">
        {/* Navigation Mode Tabs */}
        <div className="tasks-mode-tabs">
          <button
            className={`tasks-mode-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 ACADEMIC TASK MANAGER
          </button>
          <button
            className={`tasks-mode-tab ${viewMode === 'announcements' ? 'active' : ''}`}
            onClick={() => setViewMode('announcements')}
          >
            <Sparkles size={14} /> PASTE ANNOUNCEMENTS (AI EXTRACTOR)
          </button>
        </div>

        {/* ── VIEW MODE: TASK LIST ── */}
        {viewMode === 'list' && (
          <>
            {/* Header */}
            <div className="mytasks-header">
              <div>
                <h1 className="mytasks-title">📝 My Tasks</h1>
                <p className="mytasks-summary">
                  {activeTasks.length} active · {completedTasks.length} completed
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  id="open-add-task-modal-btn"
                  className="btn btn-primary btn-md"
                  onClick={() => setShowModal(true)}
                >
                  ➕ Add Task
                </button>
              </div>
            </div>

            {/* Active Tasks Section */}
            <section className="mytasks-section">
              <h2 className="section-title">🎯 Active Tasks ({activeTasks.length})</h2>

              {activeTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <h3>No tasks yet!</h3>
                  <p>Add your first academic task to start planning your workload.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    onClick={() => setShowModal(true)}
                  >
                    ➕ Add Your First Task
                  </button>
                </div>
              ) : (
                <div className="task-cards-list">
                  {activeTasks.map((task) => {
                    const inCluster = clusterIds.has(task.announcementId);
                    const daysLeft = getDaysUntil(task.isoDate);
                    const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

                    return (
                      <motion.div
                        key={task.announcementId}
                        className={`task-item-card ${inCluster ? 'is-cluster' : ''}`}
                        layout
                      >
                        <div className="task-left-col">
                          <button
                            className="task-check-btn"
                            title="Mark as completed"
                            onClick={() => toggleCompleted(task)}
                          >
                            <Check size={14} style={{ opacity: 0 }} />
                          </button>

                          <div className="task-info-block">
                            <div className="task-title-row">
                              <span className="task-title-text">{task.title}</span>
                              {inCluster && (
                                <span className="task-chip chip-cluster-alert">
                                  <AlertTriangle size={11} /> 48H PILE-UP
                                </span>
                              )}
                            </div>

                            <div className="task-meta-row">
                              <span className="task-chip chip-subject">
                                {task.subject || 'GENERAL'}
                              </span>

                              {task.type && (
                                <span className="task-chip chip-type">
                                  {task.type === 'assignment' && <FileText size={10} />}
                                  {task.type === 'exam' && <BookOpen size={10} />}
                                  {task.type === 'project' && <Wrench size={10} />}
                                  {task.type === 'reading' && <Bookmark size={10} />}
                                  {task.type.toUpperCase()}
                                </span>
                              )}

                              {task.priority && (
                                <span className={`task-chip chip-priority-${task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'med' : 'low'}`}>
                                  {task.priority === 'high' ? '🔴 HIGH' : task.priority === 'medium' ? '🟡 MED' : '🟢 LOW'}
                                </span>
                              )}

                              {task.difficulty && (
                                <span className="task-chip chip-difficulty">
                                  {task.difficulty === 'hard' ? '🔥 Hard' : task.difficulty === 'medium' ? '⚡ Med' : '✨ Easy'}
                                </span>
                              )}

                              {task.estimatedHours && (
                                <span className="task-chip chip-hours">
                                  ⏱️ {task.estimatedHours}h
                                </span>
                              )}
                            </div>

                            {task.notes && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '4px' }}>
                                💬 {task.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="task-right-col">
                          <div className="task-deadline-badge">
                            <span className="deadline-date-str">
                              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              {formatDate(task.isoDate)}
                            </span>
                            <span className={`deadline-countdown-str ${isUrgent ? 'soon' : ''}`}>
                              {daysLeft !== null ? (daysLeft === 0 ? 'DUE TODAY' : daysLeft < 0 ? 'OVERDUE' : `${daysLeft} days left`) : 'NO DATE'}
                            </span>
                          </div>

                          <div className="task-action-btns">
                            <button
                              className="task-del-btn"
                              title="Delete task"
                              onClick={() => deleteTask(task.announcementId)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <section className="mytasks-section" style={{ marginTop: '2rem' }}>
                <h2 className="section-title">✅ Completed Tasks ({completedTasks.length})</h2>
                <div className="task-cards-list">
                  {completedTasks.map((task) => (
                    <div key={task.announcementId} className="task-item-card is-completed">
                      <div className="task-left-col">
                        <button
                          className="task-check-btn checked"
                          title="Mark incomplete"
                          onClick={() => toggleCompleted(task)}
                        >
                          <Check size={14} />
                        </button>
                        <div className="task-info-block">
                          <span className="task-title-text">{task.title}</span>
                          <span className="task-chip chip-subject">{task.subject}</span>
                        </div>
                      </div>
                      <div className="task-right-col">
                        <button
                          className="task-del-btn"
                          title="Delete task"
                          onClick={() => deleteTask(task.announcementId)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── VIEW MODE: AI ANNOUNCEMENT EXTRACTOR ── */}
        {viewMode === 'announcements' && (
          <div className="ai-extractor-panel">
            <div className="mytasks-header">
              <div>
                <h2 className="mytasks-title">🤖 Paste Course Announcements</h2>
                <p className="mytasks-summary">
                  Paste up to 6 unstructured announcements from Canvas, Discord, or Emails.
                </p>
              </div>
              <button
                className="btn btn-yellow btn-md"
                onClick={() => setAnnouncements(DEMO_ANNOUNCEMENTS)}
                disabled={extracting}
              >
                <RotateCcw size={14} /> LOAD DEMO ANNOUNCEMENTS
              </button>
            </div>

            <div className="announcements-grid" style={{ marginTop: '1.5rem' }}>
              {announcements.map((ann) => (
                <div key={ann.id} className="ann-card">
                  <div className="ann-card-header">
                    <span className="ann-card-num">ANNOUNCEMENT {String(ann.id).padStart(2, '0')}</span>
                    {ann.text.trim() && <span className="ann-filled-tag">FILLED</span>}
                  </div>
                  <textarea
                    id={`ann-${ann.id}`}
                    className="ann-textarea"
                    placeholder={`Paste announcement #${ann.id}...\nE.g., "Math 220 Midterm 2 scheduled for October 13, 2026 at 2 PM."`}
                    value={ann.text}
                    onChange={(e) => setAnnouncements((prev) => prev.map((a) => a.id === ann.id ? { ...a, text: e.target.value } : a))}
                    disabled={extracting}
                  />
                </div>
              ))}
            </div>

            {extractError && (
              <div className="error-box mt-4">
                <strong>⚠ EXTRACTION NOTICE:</strong> {extractError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setViewMode('list')}>
                ← RETURN TO TASK LIST
              </button>
              <button
                id="extract-btn"
                className="btn btn-primary btn-lg"
                onClick={handleExtract}
                disabled={extracting || announcements.filter((a) => a.text.trim()).length === 0}
              >
                {extracting ? 'EXTRACTING WITH AI...' : 'PARSE & DETECT CLUSTERS →'}
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD NEW TASK (EXACT MATCH TO USER SPEC) ── */}
        <AnimatePresence>
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">➕ Add New Task</h2>
                  <button
                    className="modal-close"
                    aria-label="Close"
                    onClick={() => setShowModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <form className="modal-form" onSubmit={handleAddTaskSubmit}>
                  <div className="modal-form-grid">
                    {/* Task Name */}
                    <div className="full-width">
                      <div className="input-group">
                        <label htmlFor="task-name" className="input-label">
                          Task Name<span className="input-required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            id="task-name"
                            placeholder="e.g., CS101 Final Assignment"
                            required
                            className="input-field"
                            type="text"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subject / Course */}
                    <div className="full-width">
                      <div className="input-group">
                        <label htmlFor="task-subject" className="input-label">
                          Subject / Course Name
                        </label>
                        <div className="input-wrapper">
                          <input
                            id="task-subject"
                            placeholder="e.g., Computer Science, Mathematics"
                            className="input-field"
                            type="text"
                            value={taskSubject}
                            onChange={(e) => setTaskSubject(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="input-group">
                      <label htmlFor="task-type" className="input-label">
                        Type<span className="input-required">*</span>
                      </label>
                      <select
                        id="task-type"
                        required
                        className="input-field input-select"
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value as any)}
                      >
                        <option value="assignment">📝 Assignment</option>
                        <option value="exam">📖 Exam</option>
                        <option value="project">🔧 Project</option>
                        <option value="reading">📚 Reading</option>
                        <option value="other">📌 Other</option>
                      </select>
                    </div>

                    {/* Deadline */}
                    <div className="input-group">
                      <label htmlFor="task-deadline" className="input-label">
                        Deadline<span className="input-required">*</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          id="task-deadline"
                          required
                          min={todayMinStr()}
                          className="input-field"
                          type="date"
                          value={taskDeadline}
                          onChange={(e) => setTaskDeadline(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="input-group">
                      <label htmlFor="task-priority" className="input-label">
                        Priority<span className="input-required">*</span>
                      </label>
                      <select
                        id="task-priority"
                        required
                        className="input-field input-select"
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                      >
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                    </div>

                    {/* Difficulty */}
                    <div className="input-group">
                      <label htmlFor="task-difficulty" className="input-label">
                        Difficulty<span className="input-required">*</span>
                      </label>
                      <select
                        id="task-difficulty"
                        required
                        className="input-field input-select"
                        value={taskDifficulty}
                        onChange={(e) => setTaskDifficulty(e.target.value as any)}
                      >
                        <option value="hard">🔥 Hard</option>
                        <option value="medium">⚡ Medium</option>
                        <option value="easy">✨ Easy</option>
                      </select>
                    </div>

                    {/* Command Level / Proficiency */}
                    <div className="input-group">
                      <label htmlFor="task-proficiency" className="input-label">
                        Your Command Level<span className="input-required">*</span>
                      </label>
                      <select
                        id="task-proficiency"
                        required
                        className="input-field input-select"
                        value={taskProficiency}
                        onChange={(e) => setTaskProficiency(e.target.value as any)}
                      >
                        <option value="beginner">🌱 Beginner — Just started</option>
                        <option value="intermediate">📘 Intermediate — Some grasp</option>
                        <option value="advanced">🎯 Advanced — Good command</option>
                        <option value="expert">🏆 Expert — Full mastery</option>
                      </select>
                    </div>

                    {/* Estimated Hours */}
                    <div className="input-group">
                      <label htmlFor="task-hours" className="input-label">
                        Estimated Hours<span className="input-required">*</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          id="task-hours"
                          placeholder="e.g., 8"
                          required
                          min="0.5"
                          max="100"
                          step="0.5"
                          className="input-field"
                          type="number"
                          value={taskHours}
                          onChange={(e) => setTaskHours(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="full-width">
                      <div className="input-group">
                        <label htmlFor="task-notes" className="input-label">
                          Notes (optional)
                        </label>
                        <textarea
                          id="task-notes"
                          placeholder="Any additional notes about this task..."
                          rows={3}
                          className="input-field input-textarea"
                          value={taskNotes}
                          onChange={(e) => setTaskNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-ghost btn-md"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-md">
                      Add Task →
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
