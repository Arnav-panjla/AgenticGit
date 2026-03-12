import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

interface Branch {
  id: string;
  name: string;
  created_by_ens: string;
  commit_count: number;
  created_at: string;
}

interface Commit {
  id: string;
  message: string;
  author_ens: string;
  branch_name: string;
  content: string;
  content_type: string;
  created_at: string;
}

interface Repo {
  id: string;
  name: string;
  description: string;
  owner_ens: string;
  bounty_pool: number;
}

// Get the current agent ENS from localStorage or use a default
function getCurrentAgentEns(): string {
  // In v2, this will come from AuthContext; for now, check localStorage
  return localStorage.getItem('agentbranch_agent_ens') || 'viewer.eth';
}

function shortId(id: string) {
  return id.slice(0, 7);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Repository() {
  const { id } = useParams<{ id: string }>();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Repo>(`/repositories/${id}`),
      api.get<Branch[]>(`/repositories/${id}/branches`),
    ]).then(([r, b]) => {
      setRepo(r);
      setBranches(b);
      setSelectedBranch('');
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const branchParam = selectedBranch ? `&branch=${selectedBranch}` : '';
    const agentEns = getCurrentAgentEns();
    api.get<Commit[]>(`/repositories/${id}/commits?agent_ens=${encodeURIComponent(agentEns)}${branchParam}`)
      .then(setCommits)
      .catch(console.error);
  }, [id, selectedBranch]);

  if (loading) return <div className="text-slate-400 animate-pulse">Loading...</div>;
  if (!repo) return <div className="text-red-400">Repository not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Link to="/" className="hover:text-sky-400">Repositories</Link>
            <span>/</span>
            <span className="text-white font-medium">{repo.name}</span>
          </div>
          {repo.description && (
            <p className="text-slate-400 text-sm">{repo.description}</p>
          )}
          <div className="text-xs text-slate-500 mt-1">
            Owner: <span className="font-mono text-slate-400">{repo.owner_ens}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-2 text-center">
            <div className="text-amber-400 font-bold text-xl">{repo.bounty_pool}</div>
            <div className="text-amber-600 text-xs">bounty pool</div>
          </div>
          <Link
            to={`/repo/${id}/pulls`}
            className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Pull Requests
          </Link>
        </div>
      </div>

      {/* Branches */}
      <div className="mb-6">
        <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-3">
          Branches ({branches.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBranch('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
              selectedBranch === ''
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            All branches
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors flex items-center gap-2 ${
                selectedBranch === b.name
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
              }`}
            >
              <span className="text-green-400 text-xs">⎇</span>
              {b.name}
              <span className="text-xs opacity-60">{b.commit_count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Commits */}
      <div>
        <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-3">
          Commit History ({commits.length})
        </h2>
        <div className="space-y-2">
          {commits.map((c) => (
            <div
              key={c.id}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpandedCommit(expandedCommit === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-500 font-mono text-xs shrink-0">
                    {shortId(c.id)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-slate-100 text-sm font-medium truncate">{c.message}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono text-sky-500">{c.author_ens}</span>
                      <span>on</span>
                      <span className="font-mono text-green-500">⎇ {c.branch_name}</span>
                      <span>·</span>
                      <span>{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded font-mono">
                    {c.content_type}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {expandedCommit === c.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedCommit === c.id && (
                <div className="border-t border-slate-700 bg-slate-900 p-4">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 overflow-y-auto">
                    {c.content}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {commits.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No commits on this branch yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
