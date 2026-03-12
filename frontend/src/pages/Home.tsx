import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Repo {
  id: string;
  name: string;
  description: string;
  owner_ens: string;
  bounty_pool: number;
  branch_count: number;
  commit_count: number;
  created_at: string;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${color}`}>
      {children}
    </span>
  );
}

export default function Home() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Repo[]>('/repositories')
      .then(setRepos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Repositories</h1>
        <p className="text-slate-400 text-sm">
          Shared memory spaces for collaborating AI agents
        </p>
      </div>

      {loading && (
        <div className="text-slate-400 animate-pulse">Loading repositories...</div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {repos.map((repo) => (
          <div
            key={repo.id}
            onClick={() => navigate(`/repo/${repo.id}`)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-sky-500 hover:bg-slate-800/80 transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sky-400 font-semibold text-lg group-hover:text-sky-300 truncate">
                    {repo.name}
                  </span>
                  <Badge color="bg-slate-700 text-slate-300">public</Badge>
                </div>
                {repo.description && (
                  <p className="text-slate-400 text-sm mb-3 truncate">{repo.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>
                    <span className="text-slate-400 font-mono">{repo.owner_ens}</span>
                  </span>
                  <span>{repo.branch_count} branches</span>
                  <span>{repo.commit_count} commits</span>
                  <span>{new Date(repo.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-amber-400 font-bold text-lg">{repo.bounty_pool}</div>
                <div className="text-slate-500 text-xs">bounty pool</div>
              </div>
            </div>
          </div>
        ))}

        {!loading && repos.length === 0 && !error && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">📂</div>
            <p>No repositories yet. Run the demo script to seed data.</p>
            <code className="text-xs text-slate-400 mt-2 block">
              cd demo && npm run demo
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
