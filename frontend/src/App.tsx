import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Repository from './pages/Repository';
import PullRequests from './pages/PullRequests';
import Agents from './pages/Agents';

function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-700'
    }`;

  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
        <NavLink to="/" className="text-sky-400 font-bold text-lg tracking-tight mr-4">
          AgentBranch
        </NavLink>
        <NavLink to="/" end className={linkClass}>Repositories</NavLink>
        <NavLink to="/agents" className={linkClass}>Agents</NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/repo/:id" element={<Repository />} />
            <Route path="/repo/:id/pulls" element={<PullRequests />} />
            <Route path="/agents" element={<Agents />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
