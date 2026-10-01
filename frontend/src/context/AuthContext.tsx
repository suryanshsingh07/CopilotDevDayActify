import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loginUser, registerUser, getMe } from '../api/client';

export interface User {
  id?: string;
  name: string;
  email: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, nameFallback?: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('actify_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem('actify_token');
      if (token) {
        try {
          const res = await getMe();
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('actify_user', JSON.stringify(res.user));
          }
        } catch (err) {
          // Token may be invalid/expired or backend offline; keep stored user if present
          console.warn('Backend session verification note:', err);
        }
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  async function login(email: string, password: string, nameFallback?: string) {
    try {
      const res = await loginUser(email, password);
      localStorage.setItem('actify_token', res.token);
      const u = { id: res.user.id, name: res.user.name, email: res.user.email };
      localStorage.setItem('actify_user', JSON.stringify(u));
      setUser(u);
    } catch (err: any) {
      // If network/backend error, fallback to offline demo mode
      console.warn('Backend login fallback:', err.message);
      const stored = localStorage.getItem('actify_users') ?? '[]';
      const users: Array<{ name: string; email: string; password: string }> = JSON.parse(stored);
      const found = users.find((u) => u.email === email);
      if (found && found.password === password) {
        const u = { name: found.name, email: found.email };
        localStorage.setItem('actify_user', JSON.stringify(u));
        setUser(u);
        return;
      }
      if (nameFallback) {
        const u = { name: nameFallback, email };
        localStorage.setItem('actify_user', JSON.stringify(u));
        setUser(u);
        return;
      }
      throw err;
    }
  }

  async function signup(name: string, email: string, password: string) {
    try {
      const res = await registerUser(name, email, password);
      localStorage.setItem('actify_token', res.token);
      const u = { id: res.user.id, name: res.user.name, email: res.user.email };
      localStorage.setItem('actify_user', JSON.stringify(u));
      setUser(u);
    } catch (err: any) {
      console.warn('Backend signup fallback:', err.message);
      // Fallback
      const stored = localStorage.getItem('actify_users') ?? '[]';
      const users: Array<{ name: string; email: string; password: string }> = JSON.parse(stored);
      if (!users.find((u) => u.email === email)) {
        users.push({ name: name.trim(), email: email.trim(), password });
        localStorage.setItem('actify_users', JSON.stringify(users));
      }
      const u = { name: name.trim(), email: email.trim() };
      localStorage.setItem('actify_user', JSON.stringify(u));
      setUser(u);
    }
  }

  function logout() {
    localStorage.removeItem('actify_token');
    localStorage.removeItem('actify_user');
    localStorage.removeItem('actify_deadlines');
    localStorage.removeItem('actify_result');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
