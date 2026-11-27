import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'COLLABORATOR';
  jobTitle?: string;
  departmentId?: string;
  departmentName?: string;
  organizationId: string;
  totalPoints: number;
  currentHri?: number;
  riskLevel?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('aegis_token');
    const storedUser = localStorage.getItem('aegis_user');

    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('aegis_token');
        localStorage.removeItem('aegis_user');
      }
      // Verify token is still valid
      api.get('/auth/me').then(res => {
        if (!res.data || typeof res.data !== 'object' || !res.data.id) {
          throw new Error('INVALID_API_RESPONSE');
        }
        setUser(res.data);
        localStorage.setItem('aegis_user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('aegis_token');
        localStorage.removeItem('aegis_user');
        setToken(null);
        setUser(null);
      }).finally(() => setIsLoading(false));
    } else {
      localStorage.removeItem('aegis_token');
      localStorage.removeItem('aegis_user');
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data || {};
    if (!newToken || !newUser) {
      throw new Error('API_UNAVAILABLE');
    }
    localStorage.setItem('aegis_token', newToken);
    localStorage.setItem('aegis_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('aegis_token');
    localStorage.removeItem('aegis_user');
    setToken(null);
    setUser(null);
  };

  const isManager = user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

