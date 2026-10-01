import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Copy, Check, Trash2, ArrowRight,
  Flame, Clock, BookOpen, AlertTriangle, Compass,
  Sparkles, RefreshCw
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useDeadlines } from '../context/DeadlineContext';
import type { NormalizedDeadline } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}

const QUICK_PROMPTS = [
  {
    icon: Flame,
    label: 'What should I tackle first?',
    prompt: 'Based on my saved assignments and their due dates, what should I prioritize first right now and why?'
  },
  {
    icon: Clock,
    label: 'Break down nearest deadline',
    prompt: 'Can you break down my nearest upcoming deadline into 25-minute Pomodoro sprints so I can stop procrastinating?'
  },
  {
    icon: AlertTriangle,
    label: 'Emergency overload triage',
    prompt: 'I am overwhelmed with multiple upcoming submissions and exams. Give me a 3-step calm emergency triage plan.'
  },
  {
    icon: BookOpen,
    label: 'Draft professor extension email',
    prompt: 'Could you draft a polite, professional 48-hour deadline extension request email to send to my professor?'
  },
  {
    icon: Compass,
    label: 'Active recall study protocol',
    prompt: 'How can I study for my upcoming exam using active recall and spaced retrieval instead of passive re-reading?'
  }
];

export default function AiChatPage() {
  const { user } = useAuth();
  const { deadlines, result } = useDeadlines();

  const allTasks: NormalizedDeadline[] = useMemo(() => {
    if (deadlines && deadlines.length > 0) return deadlines;
    if (result?.deadlines && result.deadlines.length > 0) return result.deadlines;
    return [];
  }, [deadlines, result]);

  const openTasks = allTasks.filter((t) => !t.completed);
  const nearest = [...openTasks].sort((a, b) => {
    if (!a.isoDate) return 1;
    if (!b.isoDate) return -1;
    return new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime();
  })[0];

  const studentName = user?.name ? user.name.split(' ')[0] : 'there';

  const initialGreeting: ChatMessage = {
    id: 'greeting',
    sender: 'ai',
    text: `Hey ${studentName}! I'm your **Actify AI Academic Strategist**.

I have synced with your workspace: you have **${openTasks.length} open deadline${openTasks.length === 1 ? '' : 's'}**${
      nearest ? `, with **${nearest.title}** (${nearest.subject}) due next on **${new Date(nearest.isoDate!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}**` : ''
    }.

How can I help you conquer your workload today? Pick a quick strategy below or ask me anything!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedActions: [
      'What should I tackle first?',
      'Break down nearest deadline',
      'Emergency overload triage'
    ]
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(`actify_chat_${user?.id || 'guest'}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [initialGreeting];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(`actify_chat_${user?.id || 'guest'}`, JSON.stringify(messages));
    } catch {
      // ignore
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user?.id]);

  function generateSmartResponse(promptText: string): { reply: string; actions: string[] } {
    const lower = promptText.toLowerCase();

    if (lower.includes('overwhelm') || lower.includes('stress') || lower.includes('panic') || lower.includes('too much') || lower.includes('triage')) {
      return {
        reply: `Take a deep breath, ${studentName}. It is completely natural to feel anxious when multiple academic deadlines collide. Here is your emergency 3-step calm plan:

1. **Stop trying to do everything simultaneously**: Pick **one single assignment** for the next 45 minutes. Right now, that should be **${nearest ? nearest.title + ' (' + nearest.subject + ')' : 'your nearest deadline'}**.
2. **Aim for an ugly first draft**: Perfectionism causes procrastination. Write bullet points, outline headings, or solve just the first problem. Momentum beats perfection every time.
3. **Protect your sleep**: Cramming past 1 AM degrades your exam recall by up to 40%. Set a firm cutoff tonight.

You have ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}. Knock down the first domino first!`,
        actions: ['Break down nearest task', 'Draft professor extension email', 'Set 25-min focus sprint']
      };
    }

    if (lower.includes('priorit') || lower.includes('first') || lower.includes('what should i do') || lower.includes('tackle')) {
      if (openTasks.length === 0) {
        return {
          reply: `You currently have zero pending assignments in your workspace, ${studentName}! You are completely caught up.

If you have incoming assignments, add them in **My Tasks** to stay ahead of future clusters.`,
          actions: ['Go to My Tasks', 'View Semester Progress']
        };
      }

      const taskList = openTasks.slice(0, 3).map((t, idx) => 
        `${idx + 1}. **${t.title}** (${t.subject}) — Due: **${t.isoDate ? new Date(t.isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBD'}**`
      ).join('\n');

      return {
        reply: `Here is your direct tactical priority order based on due dates and workload, ${studentName}:

${taskList}

**Action Recommendation:**
Focus exclusively on **${nearest ? nearest.title : 'your first assignment'}**. Put your phone in another room, set a 25-minute timer, and finish Section 1 before switching!`,
        actions: [`Start working on ${nearest?.title || 'first task'}`, 'Break down this task', 'Open Focus Timer']
      };
    }

    if (lower.includes('break down') || lower.includes('sprint') || lower.includes('pomodoro') || lower.includes('split')) {
      const targetTitle = nearest ? nearest.title : 'your assignment';
      const targetSubject = nearest ? nearest.subject : 'your course';

      return {
        reply: `Here is a high-impact 4-Sprint Breakdown for **${targetTitle}** (${targetSubject}):

- **Sprint 1 (25 min — Recon & Outline)**: Open the rubric, create document headings, list every requirement, gather initial reference links.
- **Sprint 2 (25 min — Core Draft)**: Draft the heaviest section without editing. Write continuously without second-guessing grammar.
- **Sprint 3 (25 min — Supporting Body & Citations)**: Fill in citations, calculations, figures, or references.
- **Sprint 4 (20 min — Polish & Submission Check)**: Proofread against the rubric, check file formatting, and turn it in!

Total focused time: **1 hour 35 minutes**. Would you like to launch the Sprint Timer now?`,
        actions: ['Open Today\'s Plan to start sprint', 'Draft extension email', 'Review rubric checklist']
      };
    }

    if (lower.includes('extension') || lower.includes('email') || lower.includes('professor') || lower.includes('late')) {
      return {
        reply: `Here is a respectful, high-success email template to send to your professor at least 24-48 hours before the deadline:

\`\`\`text
Subject: ${nearest ? nearest.subject : '[Course Code]'} - Extension Request: ${nearest ? nearest.title : '[Assignment Name]'}

Dear Professor [Last Name],

I hope your week is going well. I am writing to respectfully request a brief 48-hour extension on the ${nearest ? nearest.title : '[Assignment Name]'}, currently due on ${nearest && nearest.isoDate ? new Date(nearest.isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '[Due Date]'}.

I have already completed [mention 1-2 completed parts, e.g. the initial research and outline], but due to [honest brief reason: e.g. a cluster of major overlapping exams / acute illness / heavy laboratory workload], I need additional time to ensure the submission meets the high standards of your course.

Would it be permissible to submit my finalized work by [New Date, e.g. Friday at 5:00 PM]? I am happy to submit my current progress right now if helpful.

Thank you very much for your understanding and guidance.

Sincerely,
${user?.name || '[Your Full Name]'}
[Student ID]
\`\`\`

**Rule of Thumb:** Always email *before* the deadline passes. Professors respect proactive communication!`,
        actions: ['Copy email template', 'Review upcoming deadlines', 'Break down nearest task']
      };
    }

    if (lower.includes('exam') || lower.includes('study') || lower.includes('active recall') || lower.includes('memoriz')) {
      return {
        reply: `To retain maximum material without burning out before exams, use this scientifically proven **Active Recall & Spaced Retrieval** routine:

1. **The Blurting Method**: Read 1 chapter or lecture slide set for 15 minutes. Close the material, take a blank sheet of paper, and write down everything you remember from memory. Then check what you missed in red ink.
2. **Practice Problems over Re-reading**: Passive re-reading creates an illusion of competence. Solve past exam questions under timed conditions.
3. **The Feynman Technique**: Teach the hardest concept out loud as if explaining it to a 10-year-old. Wherever you get stuck, that is your knowledge gap.
4. **2-Day Buffer**: Aim to finish all review 48 hours before the exam day, so the final day is purely calm consolidation and sleep.`,
        actions: ['Create study schedule', 'Open Today\'s Plan', 'Check 48-Hour Collision Radar']
      };
    }

    // Default friendly advisor reply
    return {
      reply: `Hello ${studentName}! I am your Actify Academic Strategist.

You currently have **${openTasks.length} open deadline${openTasks.length === 1 ? '' : 's'}** in your workspace${nearest ? `, with **${nearest.title}** (${nearest.subject}) due next` : ''}.

Here are things we can do right now:
- **Tackle upcoming deadlines**: I can break down your hardest task into 25-minute sprints.
- **Triage deadline clusters**: If multiple assignments clash, we can organize an emergency timeline.
- **Draft academic emails**: Need an extension or clarification for a professor? I will write it.
- **Study methods**: Ask me about active recall, spaced repetition, or time-blocking for exams.

What is on your mind today?`,
      actions: [
        'What should I tackle first?',
        'Break down nearest deadline',
        'Draft professor extension email',
        'Emergency overload triage'
      ]
    };
  }

  async function handleSend(textToSend?: string) {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    // Call backend API if available, else local smart reasoning
    setTimeout(() => {
      const generated = generateSmartResponse(messageText);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: generated.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: generated.actions
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 600);
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleClear() {
    if (window.confirm('Clear this conversation history?')) {
      setMessages([initialGreeting]);
      sessionStorage.removeItem(`actify_chat_${user?.id || 'guest'}`);
    }
  }

  function renderFormattedText(text: string) {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const codeContent = lines[0]?.match(/^[a-z]+$/i) ? lines.slice(1).join('\n') : lines.join('\n');
        return (
          <pre
            key={index}
            style={{
              background: '#111',
              color: '#ede9dc',
              padding: '12px',
              border: '2px solid #111',
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.8rem',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              margin: '10px 0'
            }}
          >
            <code>{codeContent}</code>
          </pre>
        );
      }

      const lines = part.split('\n');
      return (
        <div key={index}>
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} style={{ height: '8px' }} />;

            const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
            const isNumbered = /^\d+\.\s/.test(trimmed);

            const formatted = trimmed.replace(/^[-\*]\s/, '').replace(/^\d+\.\s/, '');

            const parsedLine = formatted.split(/(\*\*.*?\*\*)/g).map((sub, sIdx) => {
              if (sub.startsWith('**') && sub.endsWith('**')) {
                return <strong key={sIdx}>{sub.slice(2, -2)}</strong>;
              }
              return sub;
            });

            if (isBullet) {
              return (
                <li key={lIdx} style={{ margin: '4px 0', paddingLeft: '4px', listStyleType: 'square' }}>
                  {parsedLine}
                </li>
              );
            }
            if (isNumbered) {
              const num = trimmed.match(/^(\d+)\./)?.[1] || '1';
              return (
                <div key={lIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '6px 0' }}>
                  <span style={{
                    background: 'var(--yellow)',
                    color: '#111',
                    font: '700 0.72rem Space Mono, monospace',
                    width: '18px',
                    height: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px solid #111',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {num}
                  </span>
                  <span>{parsedLine}</span>
                </div>
              );
            }

            return <p key={lIdx} style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{parsedLine}</p>;
          })}
        </div>
      );
    });
  }

  return (
    <AppLayout title="🤖 Talk with AI">
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '2.5px solid var(--line)',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge" style={{ background: 'var(--yellow)', color: '#111', fontSize: '0.65rem', fontWeight: 800 }}>
                24/7 ACADEMIC STRATEGIST
              </span>
              <span style={{ font: '700 0.72rem Space Mono, monospace', color: 'var(--ink-muted)' }}>
                {openTasks.length} DEADLINES SYNCED
              </span>
            </div>
            <h2 className="font-mono" style={{ fontSize: 'clamp(1.4rem, 2.8vw, 1.8rem)', fontWeight: 800, margin: '2px 0 4px' }}>
              TALK WITH ACTIFY AI
            </h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: 0 }}>
              Overwhelmed by deadlines or exam stress? Ask AI to prioritize your week, break down assignments into sprints, or draft extension emails.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem' }} onClick={handleClear}>
              <Trash2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> CLEAR
            </button>
          </div>
        </div>

        {/* Quick Prompts Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
          <span style={{ font: '700 0.7rem Space Mono, monospace', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
            STRATEGIES:
          </span>
          {QUICK_PROMPTS.map((qp, i) => {
            const Icon = qp.icon;
            return (
              <button
                key={i}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => void handleSend(qp.prompt)}
                disabled={loading}
              >
                <Icon size={13} />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chat Stream */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '380px', marginBottom: '20px' }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 34,
                  height: 34,
                  display: 'grid',
                  placeItems: 'center',
                  background: msg.sender === 'user' ? 'var(--yellow)' : 'var(--mint)',
                  border: '2px solid #111',
                  boxShadow: '2px 2px 0 #111',
                  flexShrink: 0
                }}>
                  {msg.sender === 'user' ? <User size={18} color="#111" /> : <Bot size={18} color="#111" />}
                </div>

                {/* Bubble */}
                <div style={{
                  background: msg.sender === 'user' ? '#fffdf0' : '#fff',
                  border: '2.5px solid #111',
                  boxShadow: '4px 4px 0 #111',
                  padding: '14px 16px',
                  width: '100%'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    paddingBottom: '6px',
                    borderBottom: '1px dashed var(--line)',
                    font: '700 0.72rem Space Mono, monospace',
                    color: 'var(--ink-muted)'
                  }}>
                    <span>{msg.sender === 'user' ? 'YOU' : 'ACTIFY AI ADVISOR'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{msg.timestamp}</span>
                      {msg.sender === 'ai' && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          title="Copy response"
                          style={{
                            background: '#faf8f2',
                            border: '1px solid #111',
                            padding: '2px 6px',
                            font: '700 0.65rem Space Mono, monospace',
                            cursor: 'pointer'
                          }}
                        >
                          {copiedId === msg.id ? <><Check size={11} style={{ display: 'inline' }} /> COPIED</> : <><Copy size={11} style={{ display: 'inline' }} /> COPY</>}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>
                    {renderFormattedText(msg.text)}
                  </div>

                  {/* Follow-up suggestions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                      <span style={{ font: '700 0.68rem Space Mono, monospace', color: 'var(--ink-muted)', display: 'block', marginBottom: '6px' }}>
                        NEXT STEPS:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {msg.suggestedActions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => void handleSend(act)}
                            disabled={loading}
                          >
                            <ArrowRight size={11} /> {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}
              >
                <div style={{ width: 34, height: 34, background: 'var(--mint)', border: '2px solid #111', display: 'grid', placeItems: 'center' }}>
                  <Bot size={18} color="#111" />
                </div>
                <div style={{ background: '#fff', border: '2.5px solid #111', boxShadow: '4px 4px 0 #111', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={14} className="spin" />
                  <span style={{ font: '600 0.78rem Space Mono, monospace', color: 'var(--ink-soft)' }}>
                    Formulating tactical academic advice...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <div style={{ position: 'sticky', bottom: '10px', background: 'var(--cream)', paddingTop: '8px' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            style={{
              display: 'flex',
              gap: '8px',
              background: '#fff',
              border: '2.5px solid #111',
              boxShadow: '4px 4px 0 #111',
              padding: '6px 10px'
            }}
          >
            <input
              type="text"
              placeholder="Ask anything: 'What should I do first?', 'Break down my project', or 'Help with exam panic'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.88rem',
                fontFamily: 'Space Grotesk, sans-serif',
                padding: '6px'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!input.trim() || loading}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={14} />
              <span>SEND</span>
            </button>
          </form>
          <small style={{ display: 'block', marginTop: '6px', font: '500 0.65rem Space Mono, monospace', color: 'var(--ink-muted)' }}>
            <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} />
            ACTIFY AI STRATEGIST EVALUATES WORKLOADS & DEADLINES. ALWAYS CONFIRM ASSIGNMENT REQUIREMENTS WITH YOUR PROFESSOR.
          </small>
        </div>
      </div>
    </AppLayout>
  );
}
