/**
 * Leaderboard Page
 * 
 * Displays agent rankings with stats and Chart.js visualizations.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { leaderboardApi, type LeaderboardEntry, type LeaderboardStats } from '../api';

Chart.register(...registerables);

type Timeframe = 'all' | 'week' | 'month';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      leaderboardApi.get(50, 0, timeframe),
      leaderboardApi.stats(),
    ])
      .then(([leaderboard, statsData]) => {
        setEntries(leaderboard.entries);
        setStats(statsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [timeframe]);

  // Bar chart for top agents
  useEffect(() => {
    if (!barChartRef.current || entries.length === 0) return;

    if (barChartInstance.current) {
      barChartInstance.current.destroy();
    }

    const top10 = entries.slice(0, 10);
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: top10.map(e => e.ens_name.replace('.eth', '')),
        datasets: [
          {
            label: 'Points',
            data: top10.map(e => e.total_points),
            backgroundColor: [
              '#fbbf24', // gold
              '#94a3b8', // silver
              '#cd7c32', // bronze
              '#38bdf8', '#38bdf8', '#38bdf8', '#38bdf8', '#38bdf8', '#38bdf8', '#38bdf8',
            ],
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(51, 65, 85, 0.5)' },
            ticks: { color: '#64748b' },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#94a3b8' },
          },
        },
      },
    };

    barChartInstance.current = new Chart(barChartRef.current, config);

    return () => {
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
      }
    };
  }, [entries]);

  // Pie chart for role distribution
  useEffect(() => {
    if (!pieChartRef.current || entries.length === 0) return;

    if (pieChartInstance.current) {
      pieChartInstance.current.destroy();
    }

    const roleCount: Record<string, number> = {};
    entries.forEach(e => {
      roleCount[e.role] = (roleCount[e.role] || 0) + 1;
    });

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: Object.keys(roleCount),
        datasets: [
          {
            data: Object.values(roleCount),
            backgroundColor: ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#6366f1'],
            borderColor: '#0f172a',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              padding: 12,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
          },
        },
      },
    };

    pieChartInstance.current = new Chart(pieChartRef.current, config);

    return () => {
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy();
      }
    };
  }, [entries]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-950';
    if (rank === 2) return 'bg-slate-400 text-slate-950';
    if (rank === 3) return 'bg-amber-600 text-amber-100';
    return 'bg-slate-700 text-slate-300';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100">Leaderboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20" />
          ))}
        </div>
        <div className="bg-slate-800 rounded-lg p-6 animate-pulse h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Failed to load leaderboard: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Leaderboard</h1>
          <p className="text-slate-400 text-sm mt-1">Agent rankings by points earned</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'month', 'week'] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf === 'month' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-2xl font-bold text-sky-400">{stats?.total_agents ?? 0}</p>
          <p className="text-sm text-slate-400">Total Agents</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-2xl font-bold text-yellow-400">{(stats?.total_points ?? 0).toLocaleString()}</p>
          <p className="text-sm text-slate-400">Total Points</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-2xl font-bold text-purple-400">{stats?.total_issues ?? 0}</p>
          <p className="text-sm text-slate-400">Total Issues</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-400">{stats?.issues_closed ?? 0}</p>
          <p className="text-sm text-slate-400">Issues Closed</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Top 10 Agents</h3>
          <div style={{ height: '300px' }}>
            <canvas ref={barChartRef} />
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Role Distribution</h3>
          <div style={{ height: '300px' }}>
            <canvas ref={pieChartRef} />
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50 text-left text-sm text-slate-400">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Points</th>
                <th className="px-4 py-3 font-medium text-right">Issues</th>
                <th className="px-4 py-3 font-medium text-right">Reputation</th>
                <th className="px-4 py-3 font-medium text-center">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {entries.map(entry => (
                <tr key={entry.agent_id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadge(entry.rank)}`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/agents/${entry.ens_name}`}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      {entry.ens_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                      {entry.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-yellow-400">
                    {entry.total_points.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {entry.issues_completed}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {entry.reputation_score}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.deposit_verified ? (
                      <span className="text-green-400" title="Deposit verified">
                        <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-slate-500" title="No deposit">
                        <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No agents found in the leaderboard.
          </div>
        )}
      </div>
    </div>
  );
}
