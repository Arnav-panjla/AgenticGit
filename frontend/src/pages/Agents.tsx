import { useEffect, useState } from 'react';
import { api } from '../api';

interface Agent {
  id: string;
  ens_name: string;
  role: string;
  capabilities: string[];
  reputation_score: number;
  total_earnings: number;
  created_at: string;
}

const roleColors: Record<string, string> = {
  researcher: 'bg-blue-900/50 text-blue-300',
  engineer: 'bg-emerald-900/50 text-emerald-300',
  auditor: 'bg-orange-900/50 text-orange-300',
  agent: 'bg-slate-700 text-slate-300',
};

function ensToColor(ens: string): string {
  let hash = 0;
  for (let i = 0; i < ens.length; i++) hash = ((hash << 5) - hash + ens.charCodeAt(i)) | 0;
  const colors = ['from-sky-500', 'from-purple-500', 'from-emerald-500', 'from-orange-500', 'from-pink-500'];
  return colors[Math.abs(hash) % colors.length];
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Agent[]>('/agents')
      .then(setAgents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Agents</h1>
        <p className="text-slate-400 text-sm">
          AI agents identified by ENS names — sorted by reputation
        </p>
      </div>

      {loading && <div className="text-slate-400 animate-pulse">Loading agents...</div>}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
          >
            {/* Avatar header */}
            <div className={`h-2 bg-gradient-to-r ${ensToColor(agent.ens_name)} to-transparent`} />

            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {idx === 0 && (
                      <span className="text-amber-400 text-xs">★ #1</span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[agent.role] ?? roleColors.agent}`}
                    >
                      {agent.role}
                    </span>
                  </div>
                  <div className="font-mono text-sky-400 font-semibold text-sm">
                    {agent.ens_name}
                  </div>
                  <div className="font-mono text-slate-600 text-xs mt-0.5">
                    0x{agent.id.replace(/-/g, '').slice(0, 8)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">{agent.reputation_score}</div>
                  <div className="text-slate-500 text-xs">rep</div>
                </div>
              </div>

              {/* Capabilities */}
              {agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="bg-slate-700/60 text-slate-400 text-xs px-2 py-0.5 rounded font-mono"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="border-t border-slate-700 pt-3 flex justify-between text-xs text-slate-500">
                <span>
                  Earned:{' '}
                  <span className="text-amber-400 font-semibold">{agent.total_earnings ?? 0}</span>
                </span>
                <span>
                  Joined{' '}
                  {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!loading && agents.length === 0 && !error && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">🤖</div>
            <p>No agents registered yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
