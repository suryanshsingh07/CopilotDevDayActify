import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DeadlineProvider } from './context/DeadlineContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage   from './pages/LandingPage';
import LoginPage     from './pages/LoginPage';
import SignupPage    from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage     from './pages/TasksPage';
import TodayPage     from './pages/TodayPage';
import ProgressPage  from './pages/ProgressPage';
import AiChatPage    from './pages/AiChatPage';
import BenefitsPage  from './pages/BenefitsPage';
import ToolkitPage   from './pages/ToolkitPage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <DeadlineProvider>
            <Routes>
              {/* Public */}
              <Route path="/"       element={<LandingPage />} />
              <Route path="/login"  element={<LoginPage />}   />
              <Route path="/signup" element={<SignupPage />}  />

              {/* Protected */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/tasks"     element={<ProtectedRoute><TasksPage /></ProtectedRoute>}     />
              <Route path="/today"     element={<ProtectedRoute><TodayPage /></ProtectedRoute>}     />
              <Route path="/progress"  element={<ProtectedRoute><ProgressPage /></ProtectedRoute>}  />
              <Route path="/ai-chat"   element={<ProtectedRoute><AiChatPage /></ProtectedRoute>}    />
              <Route path="/benefits"  element={<ProtectedRoute><BenefitsPage /></ProtectedRoute>}  />
              <Route path="/toolkit"   element={<ProtectedRoute><ToolkitPage /></ProtectedRoute>}   />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DeadlineProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
