/**
 * AuthContext - Authentication state management
 * 
 * Provides login, logout, registration, and token management.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api';

interface User {
  id: string;
  username: string;
  agents?: { id: string; ens_name: string }[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getCurrentAgentEns: () => string | null;
  setCurrentAgent: (ens: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'agentbranch_token';
const USER_KEY = 'agentbranch_user';
const AGENT_KEY = 'agentbranch_current_agent';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Verify token is still valid
      api.get<{ user: User }>('/auth/me')
        .then(data => {
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        })
        .catch(() => {
          // Token expired - clear auth
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  const register = async (username: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/register', {
      username,
      password,
    });
    
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AGENT_KEY);
  };

  const getCurrentAgentEns = (): string | null => {
    return localStorage.getItem(AGENT_KEY);
  };

  const setCurrentAgent = (ens: string) => {
    localStorage.setItem(AGENT_KEY, ens);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        getCurrentAgentEns,
        setCurrentAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get current agent ENS (can be used outside React components)
export function getCurrentAgentEns(): string | null {
  return localStorage.getItem(AGENT_KEY);
}
