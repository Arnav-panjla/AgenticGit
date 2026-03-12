import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

interface PR {
  id: string;
  description: string;
  author_ens: string;
  reviewer_ens: string | null;
  source_branch_name: string;
  target_branch_name: string;
  status: 'open' | 'approved' | 'merged' | 'rejected';
  bounty_amount: number;
  created_at: string;
  merged_at: string | null;
}

const statusColors: Record<string, string> = {
  open: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  approved: 'bg-blue-900/50 text-blue-300 border-blue-700',
  merged: 'bg-purple-900/50 text-purple-300 border-purple-700',
  rejected: 'bg-red-900/50 text-red-300 border-red-700',
};

const statusIcons: Record<string, string> = {
  open: '●',
  approved: '✓',
  merged: '⟁',
  rejected: '✕',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PullRequests() {
  const { id } = useParams<{ id: string }>();
  const [prs, setPRs] = useState<PR[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [repoName, setRepoName] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<{ name: string }>(`/repositories/${id}`)
      .then((r) => setRepoName(r.name))
      .catch(console.error);

    const statusParam = filter ? `?status=${filter}` : '';
    api.get<PR[]>(`/repositories/${id}/pulls${statusParam}`)
      .then(setPRs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, filter]);

  const counts = prs.reduce(
    (acc, pr) => { acc[pr.status] = (acc[pr.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
          <Link to="/" className="hover:text-sky-400">Repositories</Link>
          <span>/</span>
          <Link to={`/repo/${id}`} className="hover:text-sky-400">{repoName}</Link>
          <span>/</span>
          <span className="text-white">Pull Requests</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Pull Requests</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700 pb-3">
        {['', 'open', 'merged', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              filter === s
                ? 'bg-sky-600 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== '' && counts[s] ? (
              <span className="ml-1.5 bg-slate-700 text-slate-300 rounded-full px-1.5 py-0.5 text-xs">
                {counts[s]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-400 animate-pulse">Loading pull requests...</div>}

      <div className="space-y-3">
        {prs.map((pr) => (
          <div
            key={pr.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[pr.status]}`}>
                    <span>{statusIcons[pr.status]}</span>
                    {pr.status}
                  </span>
                  <span className="text-slate-100 font-medium truncate">{pr.description}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-sm mb-3">
                  <span className="text-green-400">⎇ {pr.source_branch_name}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-blue-400">⎇ {pr.target_branch_name}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>
                    by <span className="font-mono text-sky-400">{pr.author_ens}</span>
                  </span>
                  {pr.reviewer_ens && (
                    <span>
                      reviewed by <span className="font-mono text-purple-400">{pr.reviewer_ens}</span>
                    </span>
                  )}
                  <span>{timeAgo(pr.created_at)}</span>
                  {pr.merged_at && (
                    <span className="text-purple-400">
                      merged {timeAgo(pr.merged_at)}
                    </span>
                  )}
                </div>
              </div>

              {pr.bounty_amount > 0 && (
                <div className="shrink-0 text-right">
                  <div className="text-amber-400 font-bold">{pr.bounty_amount}</div>
                  <div className="text-slate-500 text-xs">bounty</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && prs.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-3xl mb-2">⟁</div>
            <p>No pull requests {filter ? `with status "${filter}"` : 'yet'}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
