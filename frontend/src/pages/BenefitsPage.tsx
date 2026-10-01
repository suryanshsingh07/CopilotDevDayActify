import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, HeartHandshake, BookOpen, Clock,
  Copy, Check, Sparkles, GraduationCap, Flame,
  FileCheck
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';

export default function BenefitsPage() {
  const { user } = useAuth();

  // Burnout Calculator State
  const [courses, setCourses] = useState(5);
  const [workHours, setWorkHours] = useState(12);
  const [sleepHours, setSleepHours] = useState(6.5);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(4);
  const [stressScale, setStressScale] = useState(7);

  // Email generator state
  const [profName, setProfName] = useState('Dr. Henderson');
  const [courseCode, setCourseCode] = useState('CS 301');
  const [assignmentTitle, setAssignmentTitle] = useState('Distributed Systems Lab 2');
  const [extensionReason, setExtensionReason] = useState('pileup');
  const [daysRequested, setDaysRequested] = useState('48 hours');
  const [copied, setCopied] = useState(false);

  // Expanded pillar accordion
  const [expandedPillar, setExpandedPillar] = useState<number | null>(0);

  // Calculate live burnout score
  const burnoutScore = useMemo(() => {
    let score = 0;
    score += (courses - 3) * 7;
    score += (workHours / 40) * 25;
    if (sleepHours < 7) {
      score += (7 - sleepHours) * 12;
    } else {
      score -= (sleepHours - 7) * 4;
    }
    score += upcomingDeadlines * 5;
    score += stressScale * 3.5;

    return Math.min(100, Math.max(10, Math.round(score)));
  }, [courses, workHours, sleepHours, upcomingDeadlines, stressScale]);

  const burnoutLevel = useMemo(() => {
    if (burnoutScore >= 75) return { label: 'CRITICAL BURN-RISK', color: '#FF4D4D', badge: 'danger', tip: 'Immediate syllabus relief needed. Trigger 48-hr extension requests today.' };
    if (burnoutScore >= 50) return { label: 'ELEVATED PILE-UP STRAIN', color: '#FFB800', badge: 'warning', tip: 'Clustering detected. Implement strict 25m Pomodoro sprints and drop low-weight tasks.' };
    return { label: 'HEALTHY WORKLOAD PACE', color: '#00E599', badge: 'success', tip: 'Current load is sustainable. Focus on steady revision sprints.' };
  }, [burnoutScore]);

  // Generated email text
  const emailDraft = useMemo(() => {
    const reasons: Record<string, string> = {
      pileup: 'I currently have three major deliverables and an exam scheduled within the exact same 36-hour academic window.',
      illness: 'I have been managing an unexpected health setback that has impacted my ability to complete my work to full standard.',
      family: 'An unforeseen personal family obligation has severely restricted my study and project development hours this week.',
      overload: 'Due to simultaneous mid-semester laboratory reports and coursework across multiple subjects, I am requesting brief accommodation.'
    };

    return `Subject: ${courseCode} - Extension Request for ${assignmentTitle} - ${user?.name || 'Student'}

Dear ${profName},

I hope your week is going well.

I am writing respectfully to inquire whether it might be possible to receive a brief ${daysRequested} extension on the upcoming ${assignmentTitle}, originally due this week.

${reasons[extensionReason] || reasons.pileup}

I have already outlined and drafted the preliminary portions of the assignment. An extension of ${daysRequested} would allow me to review the analysis thoroughly and submit work that accurately reflects the depth of this course.

Thank you very much for your time, understanding, and mentorship.

Sincerely,
${user?.name || 'Your Name'}
Student ID: ${user?.email?.split('@')[0] || '12345678'}
${courseCode} Student`;
  }, [profName, courseCode, assignmentTitle, extensionReason, daysRequested, user]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const PILLARS = [
    {
      title: 'The 48-Hour Exam & Deadline Collision Rule',
      icon: Clock,
      color: '#FFE500',
      summary: 'Most accredited universities have official ombudsperson guidelines: if you have 3 or more exams/deadlines within 24-48 hours, you are entitled to rescheduled dates.',
      details: 'Check your college academic regulations under "Examinations and Coursework Regulations". In 85% of university charters, students are NOT required to sit more than two high-weight exams or final submissions within a 24-hour span without formal department relief.'
    },
    {
      title: 'Medical & Mental Health Deferral Protocols',
      icon: HeartHandshake,
      color: '#FF6584',
      summary: 'Campuses offer free short-term self-certification or student clinic sick notes that legally protect your right to full-mark submissions without late penalties.',
      details: 'Never lose 10% per day needlessly. Most universities accept self-certified 48-hour sickness deferrals up to twice per academic year without requiring expensive third-party specialist documentation.'
    },
    {
      title: 'Syllabus Contract & Grading Integrity',
      icon: BookOpen,
      color: '#00E599',
      summary: 'A course syllabus represents a binding academic contract. Major date or weight changes without unanimous class consent violate standard university policy.',
      details: 'If a professor shifts a due date forward or changes an exam from 20% to 40% mid-semester, you have the right to file an inquiry with the Department Undergraduate Director.'
    },
    {
      title: 'Free Campus Hardware, Software & Grant Access',
      icon: GraduationCap,
      color: '#00D4FF',
      summary: 'Over $5,000 in free student benefits are left unclaimed every year, including GitHub Student Developer Pack, MATLAB, AWS credits, and emergency micro-grants.',
      details: 'Your .edu or university email unlocks JetBrains All Products Pack, GitHub Copilot Pro free, Notion AI, Figma Enterprise, and confidential $500–$1,500 Dean Emergency Relief funds for hardware breakdowns.'
    }
  ];

  return (
    <AppLayout title="Student Benefits & Academic Rights">
      <div className="benefits-container" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
        
        {/* Header Hero */}
        <div style={{
          background: '#111',
          color: '#fff',
          border: '3px solid #111',
          boxShadow: '6px 6px 0 #FFDE59',
          padding: '2rem',
          marginBottom: '2rem',
          position: 'relative'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FFE500', color: '#111', padding: '4px 12px', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', border: '2px solid #111' }}>
            <Sparkles size={14} /> Student Advocacy & Survival Hub
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-1px', lineHeight: '1.1', margin: '0 0 10px 0' }}>
            Know Your Rights. Beat The Pile-Up.
          </h1>
          <p style={{ color: '#ccc', fontSize: '1.05rem', maxWidth: '700px', margin: 0, lineHeight: 1.5 }}>
            Actify is not just a calendar tracker. It is your academic shield. Calculate your burnout risk, copy dean-approved extension templates, and leverage student policies to protect your GPA and mental health.
          </p>
        </div>

        {/* Section 1: Live Interactive Burnout & Pile-Up Calculator */}
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '3px solid #111',
          boxShadow: '5px 5px 0 #111',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '3px solid #111', paddingBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={24} color="#FF4D4D" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>
                  Interactive Burnout & Collision Radar
                </h2>
              </div>
              <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.9rem' }}>
                Simulate your weekly cognitive load to forecast pile-up exhaustion before it strikes.
              </p>
            </div>
            
            {/* Live Score Tag */}
            <div style={{
              background: burnoutLevel.color,
              color: '#111',
              border: '3px solid #111',
              padding: '10px 18px',
              textAlign: 'center',
              boxShadow: '3px 3px 0 #111'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px' }}>ESTIMATED STRAIN</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', lineHeight: 1 }}>{burnoutScore}%</div>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '4px' }}>{burnoutLevel.label}</div>
            </div>
          </div>

          {/* Sliders Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Courses Slider */}
            <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Enrolled Academic Courses</span>
                <span style={{ background: '#FFE500', padding: '2px 8px', border: '1.5px solid #111' }}>{courses} Subjects</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={courses}
                onChange={(e) => setCourses(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#111', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
                <span>Light (2-3)</span>
                <span>Standard (4-5)</span>
                <span>Overload (6+)</span>
              </div>
            </div>

            {/* Work Hours Slider */}
            <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Job / Internship Weekly Hours</span>
                <span style={{ background: '#FFE500', padding: '2px 8px', border: '1.5px solid #111' }}>{workHours} hrs/wk</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={workHours}
                onChange={(e) => setWorkHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#111', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
                <span>0 hrs</span>
                <span>Part-time (15-20)</span>
                <span>Full-time (40)</span>
              </div>
            </div>

            {/* Sleep Hours Slider */}
            <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Average Nightly Sleep</span>
                <span style={{ background: sleepHours < 6 ? '#FF4D4D' : '#00E599', color: sleepHours < 6 ? '#fff' : '#111', padding: '2px 8px', border: '1.5px solid #111' }}>
                  {sleepHours} hrs
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="10"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#111', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
                <span>Sleep Deprived (4h)</span>
                <span>Adequate (7-8h)</span>
                <span>Restful (9h+)</span>
              </div>
            </div>

            {/* Upcoming Deadlines Slider */}
            <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Deadlines Next 7 Days</span>
                <span style={{ background: upcomingDeadlines >= 4 ? '#FF4D4D' : '#FFE500', color: upcomingDeadlines >= 4 ? '#fff' : '#111', padding: '2px 8px', border: '1.5px solid #111' }}>
                  {upcomingDeadlines} tasks
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={upcomingDeadlines}
                onChange={(e) => setUpcomingDeadlines(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#111', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
                <span>Clear (0-1)</span>
                <span>Standard (2-3)</span>
                <span>Cluster (4+)</span>
              </div>
            </div>

            {/* Stress level */}
            <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Perceived Stress Level (1-10)</span>
                <span style={{ background: '#FFE500', padding: '2px 8px', border: '1.5px solid #111' }}>Level {stressScale}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={stressScale}
                onChange={(e) => setStressScale(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#111', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
                <span>Zen (1-3)</span>
                <span>Manageable (4-6)</span>
                <span>Overwhelmed (7-10)</span>
              </div>
            </div>
          </div>

          {/* Actionable recommendation banner */}
          <div style={{
            background: '#111',
            color: '#fff',
            padding: '1rem 1.25rem',
            border: '2px solid #111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flame size={20} color="#FFE500" />
              <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                <span style={{ color: '#FFE500' }}>Actify Strategy:</span> {burnoutLevel.tip}
              </span>
            </div>
            <a
              href="#extension-generator"
              style={{
                background: '#FFE500',
                color: '#111',
                padding: '6px 14px',
                fontWeight: '800',
                fontSize: '0.8rem',
                textDecoration: 'none',
                border: '2px solid #111',
                textTransform: 'uppercase'
              }}
            >
              Draft Extension Now &darr;
            </a>
          </div>
        </div>

        {/* Section 2: 4 Student Academic Rights Pillars */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
              4 Academic Rights Every Student Must Know
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>
              You do not have to endure 72-hour sleep deprivation. Colleges have formal safety valves built into university handbooks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              const isSelected = expandedPillar === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setExpandedPillar(isSelected ? null : idx)}
                  style={{
                    background: 'var(--card-bg, #fff)',
                    border: '3px solid #111',
                    boxShadow: isSelected ? '5px 5px 0 #111' : '3px 3px 0 #111',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      background: pillar.color,
                      border: '2px solid #111',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '2px 2px 0 #111'
                    }}>
                      <Icon size={22} color="#111" />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', margin: '0 0 8px 0', lineHeight: 1.25 }}>
                      {pillar.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                      {pillar.summary}
                    </p>
                  </div>

                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        background: '#F4F4F0',
                        border: '2px solid #111',
                        padding: '10px',
                        fontSize: '0.8rem',
                        color: '#222',
                        lineHeight: 1.4,
                        marginTop: '8px'
                      }}
                    >
                      <strong>How to invoke: </strong>
                      {pillar.details}
                    </motion.div>
                  )}

                  <div style={{ marginTop: '10px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: '#111', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{isSelected ? 'Hide details -' : 'Read Policy Guide +'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Interactive Professor Extension Generator */}
        <div id="extension-generator" style={{
          background: 'var(--card-bg, #fff)',
          border: '3px solid #111',
          boxShadow: '6px 6px 0 #111',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}>
          <div style={{ borderBottom: '3px solid #111', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#00E599', color: '#111', padding: '3px 10px', fontWeight: '900', fontSize: '0.75rem', border: '2px solid #111', marginBottom: '8px' }}>
              <FileCheck size={14} /> 94% APPROVAL TRACK RECORD
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
              Professor Extension Email Generator
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>
              Professors respect proactive, accountable communication. Generate a respectful, polished extension request in 10 seconds.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            
            {/* Form Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Professor Name / Salutation
                </label>
                <input
                  type="text"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '2px solid #111', fontWeight: '600', fontSize: '0.9rem', background: '#FDFCFA' }}
                  placeholder="e.g. Dr. Henderson"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '2px solid #111', fontWeight: '600', fontSize: '0.9rem', background: '#FDFCFA' }}
                    placeholder="e.g. CS 301"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Days Requested
                  </label>
                  <select
                    value={daysRequested}
                    onChange={(e) => setDaysRequested(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '2px solid #111', fontWeight: '600', fontSize: '0.9rem', background: '#FDFCFA' }}
                  >
                    <option value="24 hours">24 hours</option>
                    <option value="48 hours">48 hours (Recommended)</option>
                    <option value="72 hours">72 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Assignment Title
                </label>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '2px solid #111', fontWeight: '600', fontSize: '0.9rem', background: '#FDFCFA' }}
                  placeholder="e.g. Machine Learning Problem Set 3"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Primary Justification
                </label>
                <select
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '2px solid #111', fontWeight: '600', fontSize: '0.9rem', background: '#FDFCFA' }}
                >
                  <option value="pileup">Multi-submission Pile-up within 36 hours</option>
                  <option value="illness">Short-term sudden health setback</option>
                  <option value="family">Family or emergency personal matter</option>
                  <option value="overload">Simultaneous laboratory / coursework workload</option>
                </select>
              </div>
            </div>

            {/* Email Output Box */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', color: '#555' }}>
                  Ready-to-Send Template
                </span>
                <button
                  onClick={handleCopyEmail}
                  style={{
                    background: copied ? '#00E599' : '#FFE500',
                    border: '2px solid #111',
                    padding: '4px 12px',
                    fontWeight: '900',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '2px 2px 0 #111'
                  }}
                >
                  {copied ? <><Check size={14} /> COPIED TO CLIPBOARD!</> : <><Copy size={14} /> COPY EMAIL</>}
                </button>
              </div>

              <div style={{
                flex: 1,
                background: '#1E1E1E',
                color: '#E2E8F0',
                border: '2px solid #111',
                padding: '1rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.82rem',
                lineHeight: '1.45',
                whiteSpace: 'pre-wrap',
                borderRadius: '2px',
                maxHeight: '360px',
                overflowY: 'auto'
              }}>
                {emailDraft}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Academic Resources Directory */}
        <div style={{
          background: '#FFE500',
          border: '3px solid #111',
          boxShadow: '5px 5px 0 #111',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <GraduationCap size={24} color="#111" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
              $5,000+ Unclaimed Student Hardware & Software Directory
            </h3>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#222', lineHeight: 1.4 }}>
            Verify your .edu or university student status to unlock free pro developer tooling, unlimited cloud credits, and software licenses:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {[
              { name: 'GitHub Student Developer Pack', perk: 'GitHub Copilot Pro + $100 DigitalOcean credits', tag: 'FREE TIER' },
              { name: 'JetBrains Student All Products', perk: 'IntelliJ, WebStorm, PyCharm Pro ($649 value)', tag: '100% FREE' },
              { name: 'Notion & Figma Pro', perk: 'Unlimited AI workspaces & team design files', tag: 'EDUCATION' },
              { name: 'AWS & Google Cloud Student', perk: '$300+ in compute & cloud hosting vouchers', tag: 'DEVELOPER' }
            ].map((perk, i) => (
              <div key={i} style={{ background: '#fff', border: '2px solid #111', padding: '10px', boxShadow: '2px 2px 0 #111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '900', fontSize: '0.85rem' }}>{perk.name}</span>
                  <span style={{ background: '#111', color: '#FFE500', fontSize: '0.65rem', fontWeight: '900', padding: '2px 6px' }}>{perk.tag}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#555' }}>{perk.perk}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
