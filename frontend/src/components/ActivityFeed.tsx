/**
 * ActivityFeed Component
 * 
 * Displays recent activity across repositories.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { commitApi, prApi, type Commit, type PullRequest } from '../api';

interface ActivityItem {
  id: string;
  type: 'commit' | 'pr_opened' | 'pr_merged' | 'pr_rejected';
  title: string;
  description?: string;
  author: string;
  repoId: string;
  repoName?: string;
  timestamp: string;
}

interface Props {
  repoId?: string;
  limit?: number;
}

export function ActivityFeed({ repoId, limit = 10 }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch from a unified activity endpoint
    // For now, we'll show a placeholder
    setIsLoading(false);
    setActivities([]);
  }, [repoId]);

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'commit':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'pr_opened':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
      case 'pr_merged':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 group">
          {getIcon(activity.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">
              <span className="font-medium text-sky-400">{activity.author}</span>
              {' '}
              {activity.type === 'commit' && 'committed'}
              {activity.type === 'pr_opened' && 'opened a PR'}
              {activity.type === 'pr_merged' && 'merged a PR'}
              {activity.type === 'pr_rejected' && 'rejected a PR'}
            </p>
            <p className="text-sm text-slate-400 truncate">{activity.title}</p>
            <p className="text-xs text-slate-500 mt-1">{formatTime(activity.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
