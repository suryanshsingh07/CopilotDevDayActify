import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="logo-mark"><Zap size={18} fill="#111" color="#111" /></div>
            <span className="logo-text">ACTIFY</span>
          </div>
          <div className="nav-links">
            <Link to="/login">
              <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Log In
              </button>
            </Link>
            <Link to="/signup">
              <button className="btn btn-yellow btn-sm">Get Started →</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          {/* Left */}
          <div>
            <motion.div
              className="hero-tag"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Zap size={10} fill="#111" /> DEADLINE CLUSTER DETECTOR
            </motion.div>

            <motion.h1
              className="hero-h1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              DEADLINES<br />ARE <span className="accent">HIDING.</span><br />ACTIFY<br />FINDS THEM.
            </motion.h1>

            <motion.p
              className="hero-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Paste six assignment announcements. Verify the extracted deadlines
              and spot crowded submission periods before they become a problem.
            </motion.p>

            <motion.div
              className="hero-cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Link to="/signup">
                <button id="hero-signup-btn" className="btn btn-coral btn-xl">
                  ANALYZE MY DEADLINES <ArrowRight size={20} />
                </button>
              </Link>
              <Link to="/login">
                <button className="btn btn-outline btn-xl">I HAVE AN ACCOUNT</button>
              </Link>
            </motion.div>

            <motion.div
              className="hero-pills"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              {['AI Extraction', '48h Cluster Detection', 'Source Verified', 'Editable Deadlines'].map((p) => (
                <span key={p} className="hero-pill">
                  <CheckCircle2 size={12} color="var(--mint)" /> {p}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — mockup */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div style={{ position: 'relative' }}>
              <div className="hero-mockup">
                <div className="mockup-bar">
                  <div className="mockup-dot red" />
                  <div className="mockup-dot yellow" />
                  <div className="mockup-dot green" />
                  <span className="mockup-title">ACTIFY — YOUR DEADLINE MAP</span>
                </div>
                <div className="mockup-body">
                  <motion.div
                    className="mockup-cluster-alert"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                  >
                    <p>⚠ DEADLINE PILE-UP</p>
                    <p className="sub">3 SUBMISSIONS WITHIN 48 HOURS</p>
                  </motion.div>
                  {[
                    { name: 'DBMS Assignment 3', date: 'OCT 12', cluster: true },
                    { name: 'OS Lab Record',     date: 'OCT 13', cluster: true },
                    { name: 'AI Presentation',   date: 'OCT 14', cluster: true },
                    { name: 'Comp Networks',     date: 'OCT 18', cluster: false },
                    { name: 'SE Case Study',     date: 'OCT 22', cluster: false },
                  ].map((item, i) => (
                    <motion.div
                      key={item.name}
                      className={`mockup-item ${item.cluster ? 'cluster' : ''}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.07 }}
                    >
                      <span className="mockup-item-name">{item.name}</span>
                      <span className="mockup-item-date">{item.date}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="mockup-floating">
                <p>✓ VERIFIED</p>
                <p style={{ fontSize: '0.62rem', fontFamily: 'Space Mono', marginTop: '2px', color: '#555' }}>5/6 DEADLINES</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-head">
          <h2>WHY STUDENTS USE ACTIFY</h2>
          <p>Focused tools that actually solve the problem</p>
        </div>
        <div className="features-grid">
          {[
            { icon: '🤖', bg: 'var(--yellow)', title: 'AI EXTRACTION', desc: 'Paste messy professor announcements — AI reads them and pulls out the exact deadline, subject, and assignment title.' },
            { icon: '⚠️', bg: 'var(--coral)', title: 'CLUSTER DETECTION', desc: 'Flags when 3 or more verified submissions fall within 48 hours — before it becomes a crisis.' },
            { icon: '✏️', bg: 'var(--mint)', title: 'EDITABLE RESULTS', desc: 'AI made a mistake? Fix it. Edit the title, date, or time without losing the original source text.' },
            { icon: '🔍', bg: 'var(--blue)', title: 'SOURCE VIEWER', desc: 'Every extracted deadline links back to the original announcement text — full transparency.' },
            { icon: '📊', bg: 'var(--purple)', title: 'PROGRESS TRACKING', desc: 'Monitor your deadline map across subjects and see where the pile-ups are forming.' },
            { icon: '📅', bg: 'var(--ink)', title: "TODAY'S VIEW", desc: "See every deadline sorted chronologically so you always know what's coming next." },
          ].map((f) => (
            <motion.div
              key={f.title}
              className="card card-hover feature-card"
              whileHover={{ y: -2 }}
            >
              <div
                className="feature-icon-box"
                style={{ background: f.bg, color: f.bg === 'var(--ink)' ? 'white' : 'var(--ink)' }}
              >
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="section-head" style={{ maxWidth: 1200, margin: '0 auto 3rem' }}>
          <h2>HOW IT WORKS</h2>
          <p>Three steps from announcement to clarity</p>
        </div>
        <div className="steps-grid">
          {[
            { num: '01', title: 'PASTE', desc: 'Drop up to 6 assignment announcements — raw text, no formatting needed.' },
            { num: '02', title: 'VERIFY', desc: 'Review AI-extracted deadlines. Edit anything wrong. View the source anytime.' },
            { num: '03', title: 'SPOT CLUSTER', desc: 'See 48-hour deadline pile-ups highlighted before your week falls apart.' },
          ].map((s) => (
            <div key={s.num} className="card step-card">
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>READY TO SEE THE PILE-UP?</h2>
          <p>Spot crowded submission periods before they become a problem.</p>
          <Link to="/signup">
            <button id="cta-signup-btn" className="btn btn-yellow btn-xl">
              START NOW — IT'S FREE <ArrowRight size={20} />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-logo footer-logo">
          <div className="logo-mark"><Zap size={14} fill="#111" color="#111" /></div>
          <span className="logo-text">ACTIFY</span>
        </div>
        <p style={{ color: '#666', fontSize: '0.8rem' }}>See the pile-up before it becomes a problem.</p>
        <p className="footer-copy">Built for students · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
