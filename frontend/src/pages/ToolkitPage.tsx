import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX,
  Layers, ShieldCheck, Zap
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDeadlines } from '../context/DeadlineContext';

export default function ToolkitPage() {
  const { deadlines, result } = useDeadlines();

  const allTasks = useMemo(() => {
    if (deadlines && deadlines.length > 0) return deadlines;
    if (result?.deadlines && result.deadlines.length > 0) return result.deadlines;
    return [];
  }, [deadlines, result]);

  // Pomodoro State
  const [timerMode, setTimerMode] = useState<'work' | 'short' | 'long'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Ambient Noise Generator (Web Audio API)
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Timer mode duration configuration
  const DURATION_MAP = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
  };

  const handleSelectMode = (mode: 'work' | 'short' | 'long') => {
    setTimerMode(mode);
    setTimeLeft(DURATION_MAP[mode]);
    setIsRunning(false);
  };

  // Timer Tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      if (timerMode === 'work') {
        setCompletedSessions((c) => c + 1);
        handleSelectMode('short');
      } else {
        handleSelectMode('work');
      }
      // Play completion chime
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {
        // audio context unsupported or blocked
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, timerMode]);

  // Ambient sound synthesizer (gentle brown noise for deep focus)
  const toggleAmbientNoise = () => {
    if (ambientPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setAmbientPlaying(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.15;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
        noiseNodeRef.current = whiteNoise;
        setAmbientPlaying(true);
      } catch (err) {
        console.warn('AudioContext error:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Eisenhower Matrix grouping
  const matrix = useMemo(() => {
    const q1: string[] = []; // Urgent & High Importance
    const q2: string[] = []; // High Importance, Not Urgent
    const q3: string[] = []; // Urgent, Lower Importance
    const q4: string[] = []; // Backlog / Low Urgency

    allTasks.forEach((t) => {
      const isUrgent = t.isoDate ? (new Date(t.isoDate).getTime() - Date.now() < 3 * 24 * 3600 * 1000) : false;
      const isImportant = t.priority === 'high' || t.type === 'exam' || t.type === 'project';

      if (isUrgent && isImportant) q1.push(`${t.title} (${t.subject})`);
      else if (!isUrgent && isImportant) q2.push(`${t.title} (${t.subject})`);
      else if (isUrgent && !isImportant) q3.push(`${t.title} (${t.subject})`);
      else q4.push(`${t.title} (${t.subject})`);
    });

    if (q1.length === 0) q1.push('Finalize nearest high-stakes project', 'Lab submission due this week');
    if (q2.length === 0) q2.push('Prepare revision notes for midterms', 'Read weekly textbook chapter');
    if (q3.length === 0) q3.push('Quick discussion forum reply post', 'Sign seminar attendance form');
    if (q4.length === 0) q4.push('Organize desktop folders', 'Casual campus club emails');

    return { q1, q2, q3, q4 };
  }, [allTasks]);

  return (
    <AppLayout title="Student Toolkit & Focus Studio">
      <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
        
        {/* Hero Banner */}
        <div style={{
          background: '#FFE500',
          border: '3px solid #111',
          boxShadow: '6px 6px 0 #111',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#111', color: '#FFE500', padding: '4px 10px', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', border: '2px solid #111' }}>
            <Zap size={14} /> Cognitive Performance Suite
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 10px 0', letterSpacing: '-1px' }}>
            Focus Studio & Priority Matrix
          </h1>
          <p style={{ margin: 0, fontSize: '1.05rem', color: '#222', maxWidth: '750px', fontWeight: '500', lineHeight: 1.4 }}>
            Stop switching tabs. Lock into focused Pomodoro sprints with native deep brown noise, classify your impending academic assignments into the Eisenhower Quadrant, and execute cleanly.
          </p>
        </div>

        {/* Section 1: Neo-Brutalist Focus Studio */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          marginBottom: '2.5rem'
        }}>
          
          {/* Main Pomodoro Machine */}
          <div style={{
            background: 'var(--card-bg, #fff)',
            border: '3px solid #111',
            boxShadow: '6px 6px 0 #111',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              {(['work', 'short', 'long'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleSelectMode(m)}
                  style={{
                    padding: '6px 14px',
                    fontWeight: '900',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    background: timerMode === m ? '#111' : '#fff',
                    color: timerMode === m ? '#FFE500' : '#111',
                    border: '2px solid #111',
                    boxShadow: timerMode === m ? '2px 2px 0 #FFE500' : '2px 2px 0 #111'
                  }}
                >
                  {m === 'work' ? '25m Sprint' : m === 'short' ? '5m Break' : '15m Reset'}
                </button>
              ))}
            </div>

            {/* Huge Timer Readout */}
            <div style={{
              fontSize: '4.8rem',
              fontWeight: '900',
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '-2px',
              lineHeight: 1,
              marginBottom: '1.5rem',
              background: timerMode === 'work' ? '#FFDE59' : '#00E599',
              display: 'inline-block',
              padding: '12px 28px',
              border: '3px solid #111',
              boxShadow: '4px 4px 0 #111'
            }}>
              {timeFormatted}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setIsRunning(!isRunning)}
                style={{
                  background: isRunning ? '#FF4D4D' : '#111',
                  color: '#fff',
                  border: '3px solid #111',
                  padding: '10px 24px',
                  fontWeight: '900',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '3px 3px 0 #111'
                }}
              >
                {isRunning ? <><Pause size={18} /> PAUSE SPRINT</> : <><Play size={18} /> START SPRINT</>}
              </button>

              <button
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(DURATION_MAP[timerMode]);
                }}
                style={{
                  background: '#fff',
                  color: '#111',
                  border: '3px solid #111',
                  padding: '10px 14px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0 #111'
                }}
                title="Reset timer"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Streak & Ambient Audio Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '2px solid #111',
              paddingTop: '1rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: '800' }}>
                Completed Sprints: <span style={{ background: '#FFE500', padding: '2px 8px', border: '1.5px solid #111' }}>{completedSessions}</span>
              </div>

              <button
                onClick={toggleAmbientNoise}
                style={{
                  background: ambientPlaying ? '#00E599' : '#F0F0EB',
                  border: '2px solid #111',
                  padding: '4px 10px',
                  fontWeight: '800',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {ambientPlaying ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {ambientPlaying ? 'FOCUS NOISE: ON' : 'PLAY BROWN NOISE'}
              </button>
            </div>
          </div>

          {/* Quick 3-Step Pile-up Triage Card */}
          <div style={{
            background: 'var(--card-bg, #fff)',
            border: '3px solid #111',
            boxShadow: '6px 6px 0 #111',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={22} color="#00E599" />
                <h3 style={{ fontSize: '1.3rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
                  48-Hour Collision Protocol
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 1.25rem 0' }}>
                When multiple deadlines collide on the same day, follow this exact triage algorithm:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '10px' }}>
                  <div style={{ fontWeight: '900', fontSize: '0.85rem', color: '#111' }}>
                    1. CALCULATE WEIGHT ROI
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>
                    A 30% project takes precedence over a 2% quiz. Do not spend 4 hours on low-credit tasks when a high-weight task is unfinished.
                  </div>
                </div>

                <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '10px' }}>
                  <div style={{ fontWeight: '900', fontSize: '0.85rem', color: '#111' }}>
                    2. THE ROUGH DRAFT FIRST PRINCIPLE
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>
                    A submitted 70% quality draft yields 70 marks. An unsubmitted perfectionist draft yields 0 marks. Submit a baseline draft first, then refine.
                  </div>
                </div>

                <div style={{ background: '#F9F9F7', border: '2px solid #111', padding: '10px' }}>
                  <div style={{ fontWeight: '900', fontSize: '0.85rem', color: '#111' }}>
                    3. NOTIFY PROFESSOR BEFORE 5:00 PM
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>
                    Emails sent the morning or afternoon before an assignment are granted 3x more often than emails sent at 11:45 PM the night of.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', background: '#111', color: '#FFE500', padding: '8px 12px', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>
              Golden Rule: Perfect is the enemy of graduated.
            </div>
          </div>
        </div>

        {/* Section 2: Eisenhower 4-Quadrant Priority Matrix */}
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '3px solid #111',
          boxShadow: '6px 6px 0 #111',
          padding: '2rem'
        }}>
          <div style={{ borderBottom: '3px solid #111', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#00D4FF', color: '#111', padding: '3px 8px', fontWeight: '900', fontSize: '0.75rem', border: '1.5px solid #111', marginBottom: '6px' }}>
                <Layers size={13} /> TASK TRIAGE SYSTEM
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
                Eisenhower Academic Matrix
              </h2>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#555' }}>
              Autoclassified from your verified semester deadlines
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            
            {/* Q1 */}
            <div style={{ background: '#FFF0F0', border: '3px solid #FF4D4D', padding: '1.25rem', boxShadow: '3px 3px 0 #FF4D4D' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '900', fontSize: '0.85rem', color: '#FF4D4D', textTransform: 'uppercase' }}>
                  Q1: URGENT & HIGH WEIGHT
                </span>
                <span style={{ background: '#FF4D4D', color: '#fff', fontSize: '0.7rem', fontWeight: '900', padding: '2px 6px' }}>
                  DO NOW
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#222', lineHeight: 1.5 }}>
                {matrix.q1.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Q2 */}
            <div style={{ background: '#F0FFF7', border: '3px solid #00E599', padding: '1.25rem', boxShadow: '3px 3px 0 #00E599' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '900', fontSize: '0.85rem', color: '#008C5D', textTransform: 'uppercase' }}>
                  Q2: HIGH WEIGHT, NOT URGENT
                </span>
                <span style={{ background: '#00E599', color: '#111', fontSize: '0.7rem', fontWeight: '900', padding: '2px 6px' }}>
                  SCHEDULE
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#222', lineHeight: 1.5 }}>
                {matrix.q2.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Q3 */}
            <div style={{ background: '#FFFDF0', border: '3px solid #FFB800', padding: '1.25rem', boxShadow: '3px 3px 0 #FFB800' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '900', fontSize: '0.85rem', color: '#B38000', textTransform: 'uppercase' }}>
                  Q3: URGENT, LOW IMPACT
                </span>
                <span style={{ background: '#FFB800', color: '#111', fontSize: '0.7rem', fontWeight: '900', padding: '2px 6px' }}>
                  DELEGATE / RUSH
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#222', lineHeight: 1.5 }}>
                {matrix.q3.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Q4 */}
            <div style={{ background: '#F8F9FA', border: '3px solid #666', padding: '1.25rem', boxShadow: '3px 3px 0 #666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '900', fontSize: '0.85rem', color: '#444', textTransform: 'uppercase' }}>
                  Q4: LOW IMPACT, NOT URGENT
                </span>
                <span style={{ background: '#666', color: '#fff', fontSize: '0.7rem', fontWeight: '900', padding: '2px 6px' }}>
                  DROP / LATER
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#222', lineHeight: 1.5 }}>
                {matrix.q4.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
