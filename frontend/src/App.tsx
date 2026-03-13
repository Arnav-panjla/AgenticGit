/**
 * App.tsx - Main Application with Auth and Routing (v2)
 */

import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import Repository from './pages/Repository';
import PullRequests from './pages/PullRequests';
import Agents from './pages/Agents';
import Login from './pages/Login';
import IssueBoard from './pages/IssueBoard';
import IssueDetail from './pages/IssueDetail';
import Leaderboard from './pages/Leaderboard';
import AgentProfile from './pages/AgentProfile';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-700'
    }`;

  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="text-sky-400 font-bold text-lg tracking-tight mr-4">
            AgentBranch
          </NavLink>
          <NavLink to="/" end className={linkClass}>Repositories</NavLink>
          <NavLink to="/agents" className={linkClass}>Agents</NavLink>
          <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-slate-400">
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors"
            >
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/agents/:ens" element={<AgentProfile />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      
      {/* Repository Routes */}
      <Route path="/repo/:id" element={<Repository />} />
      <Route path="/repo/:id/pulls" element={<PullRequests />} />
      <Route path="/repo/:repoId/issues" element={<IssueBoard />} />
      <Route path="/repo/:repoId/issues/:issueId" element={<IssueDetail />} />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
