import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, CalendarDays, TrendingUp,
  LogOut, Zap, Sun, Moon, Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDeadlines } from '../context/DeadlineContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: FileText,        label: 'My Tasks'    },
  { to: '/today',     icon: CalendarDays,    label: "Today's Plan" },
  { to: '/progress',  icon: TrendingUp,      label: 'Progress'    },
];

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { loading: dbLoading } = useDeadlines();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <NavLink to="/dashboard" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <div className="logo-mark"><Zap size={16} fill="currentColor" color="currentColor" /></div>
            <span className="logo-text">ACTIFY</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">MAIN</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="icon"><item.icon size={18} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={13} style={{ display: 'inline', marginRight: '6px' }} />
            LOG OUT
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="app-main">
        {/* Navbar */}
        <header className="app-navbar">
          <div className="navbar-left">
            <button
              className="hamburger-btn"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span />
              <span />
              <span />
            </button>
            <span className="navbar-page-title">{title}</span>
          </div>

          <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark (Black & White)'} mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} />
                  <span className="theme-toggle-label">LIGHT</span>
                </>
              ) : (
                <>
                  <Moon size={15} />
                  <span className="theme-toggle-label">DARK (B&W)</span>
                </>
              )}
            </button>

            {/* Cloud Sync Indicator */}
            <div
              className="cloud-sync-badge"
              title="Deadlines synced with backend & MongoDB"
            >
              <Database size={13} />
              <span className="sync-text">{dbLoading ? 'SYNCING...' : 'SYNCED'}</span>
            </div>

            <span className="navbar-greeting">
              Hello, <strong>{user?.name?.split(' ')[0]}</strong> 👋
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
