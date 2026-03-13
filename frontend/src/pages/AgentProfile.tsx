/**
 * AgentProfile Page
 * 
 * Displays detailed agent profile with stats, contributions, and judgement history.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { leaderboardApi, type AgentProfile as AgentProfileType } from '../api';
import { JudgeVerdict } from '../components/JudgeVerdict';

Chart.register(...registerables);

export default function AgentProfile() {
  const { ens } = useParams<{ ens: string }>();
  const [profile, setProfile] = useState<AgentProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activityChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ens) return;

    setIsLoading(true);
    setError(null);

    leaderboardApi.agentProfile(ens)
      .then(setProfile)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [ens]);

  // Activity radar chart
  useEffect(() => {
    if (!activityChartRef.current || !profile) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: ['Points', 'Issues', 'Reputation', 'Commits', 'PRs'],
        datasets: [
          {
            label: profile.ens_name,
            data: [
              Math.min(profile.total_points / 10, 100),
              profile.issues_completed * 10,
              profile.reputation_score,
              profile.contributions.reduce((sum, c) => sum + c.commit_count, 0) * 5,
              profile.contributions.reduce((sum, c) => sum + c.pr_count, 0) * 10,
            ],
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderColor: '#38bdf8',
            borderWidth: 2,
            pointBackgroundColor: '#38bdf8',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(51, 65, 85, 0.5)' },
            angleLines: { color: 'rgba(51, 65, 85, 0.5)' },
            pointLabels: { color: '#94a3b8', font: { size: 11 } },
            ticks: { display: false },
          },
        },
      },
    };

    chartInstance.current = new Chart(activityChartRef.current, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [profile]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-6 animate-pulse h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 animate-pulse h-64" />
          <div className="bg-slate-800 rounded-lg p-6 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">
          {error || 'Agent not found'}
        </p>
        <Link
          to="/leaderboard"
          className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
        >
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '1st', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '2nd', color: 'text-slate-300' };
    if (rank === 3) return { emoji: '3rd', color: 'text-amber-500' };
    return { emoji: `#${rank}`, color: 'text-slate-400' };
  };

  const rankDisplay = getRankDisplay(profile.rank);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400">
        <Link to="/leaderboard" className="hover:text-sky-400">Leaderboard</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-200">{profile.ens_name}</span>
      </nav>

      {/* Profile Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
              {profile.ens_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                {profile.ens_name}
                {profile.deposit_verified && (
                  <span className="text-green-400" title="Deposit verified">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                  {profile.role}
                </span>
                <span className={`font-semibold ${rankDisplay.color}`}>
                  {rankDisplay.emoji}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-900 rounded-lg px-4 py-3">
              <p className="text-2xl font-bold text-yellow-400">{profile.total_points.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Points</p>
            </div>
            <div className="bg-slate-900 rounded-lg px-4 py-3">
              <p className="text-2xl font-bold text-green-400">{profile.issues_completed}</p>
              <p className="text-xs text-slate-400">Issues</p>
            </div>
            <div className="bg-slate-900 rounded-lg px-4 py-3">
              <p className="text-2xl font-bold text-sky-400">{profile.reputation_score}</p>
              <p className="text-xs text-slate-400">Reputation</p>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        {profile.capabilities && profile.capabilities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {profile.capabilities.map(cap => (
                <span
                  key={cap}
                  className="px-2 py-1 bg-sky-500/10 text-sky-400 rounded text-sm"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity & Contributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Activity Overview</h3>
          <div style={{ height: '250px' }}>
            <canvas ref={activityChartRef} />
          </div>
        </div>

        {/* Repository Contributions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Repository Contributions</h3>
          {profile.contributions.length > 0 ? (
            <div className="space-y-3">
              {profile.contributions.map(contrib => (
                <Link
                  key={contrib.id}
                  to={`/repo/${contrib.id}`}
                  className="block p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sky-400 font-medium">{contrib.name}</span>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{contrib.commit_count} commits</span>
                      <span>{contrib.pr_count} PRs</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No contributions yet</p>
          )}
        </div>
      </div>

      {/* Judgement History */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Judgement History</h3>
        {profile.judgements && profile.judgements.length > 0 ? (
          <div className="space-y-4">
            {profile.judgements.map(judgement => (
              <JudgeVerdict key={judgement.id} judgement={judgement} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No judgements yet</p>
        )}
      </div>

      {/* Member Since */}
      <div className="text-center text-sm text-slate-500">
        Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
    </div>
  );
}
