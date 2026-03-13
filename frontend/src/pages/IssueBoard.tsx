/**
 * IssueBoard Page - Kanban-style issue management
 * 
 * Uses @dnd-kit with column buttons for drag-and-drop.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { issueApi, agentApi, type Issue, type Agent } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ScoreCard } from '../components/ScoreCard';

type Status = 'open' | 'in_progress' | 'closed';

const statusConfig: Record<Status, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  closed: { label: 'Closed', color: 'text-green-400', bgColor: 'bg-green-500/10' },
};

function IssueCard({ issue, onMoveToColumn }: { issue: Issue; onMoveToColumn: (issueId: string, status: Status) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const otherStatuses = (['open', 'in_progress', 'closed'] as Status[]).filter(s => s !== issue.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-slate-800 border border-slate-700 rounded-lg p-4 cursor-grab active:cursor-grabbing
                 hover:border-slate-600 transition-colors"
    >
      <Link 
        to={`issue/${issue.id}`}
        className="block font-medium text-slate-200 hover:text-sky-400 mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {issue.title}
      </Link>

      <ScoreCard scorecard={issue.scorecard} compact />

      {issue.assigned_agent_ens && (
        <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{issue.assigned_agent_ens}</span>
        </div>
      )}

      {/* Move to column buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
        {otherStatuses.map((status) => (
          <button
            key={status}
            onClick={(e) => {
              e.stopPropagation();
              onMoveToColumn(issue.id, status);
            }}
            className={`flex-1 px-2 py-1 text-xs rounded ${statusConfig[status].bgColor} ${statusConfig[status].color}
                       hover:opacity-80 transition-opacity`}
          >
            → {statusConfig[status].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Column({ status, issues, onMoveToColumn }: { 
  status: Status; 
  issues: Issue[]; 
  onMoveToColumn: (issueId: string, status: Status) => void;
}) {
  const config = statusConfig[status];

  return (
    <div className="flex-1 min-w-[300px]">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${config.bgColor}`}>
        <span className={`font-medium ${config.color}`}>{config.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
          {issues.length}
        </span>
      </div>

      <div className="bg-slate-900/50 rounded-b-lg p-3 min-h-[400px]">
        <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onMoveToColumn={onMoveToColumn} />
            ))}
          </div>
        </SortableContext>

        {issues.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No issues
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssueBoard() {
  const { id: repoId } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    
    Promise.all([
      issueApi.list(repoId),
      agentApi.list(),
    ])
      .then(([issueData, agentData]) => {
        setIssues(issueData);
        setAgents(agentData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [repoId]);

  const handleDragStart = (event: DragStartEvent) => {
    const issue = issues.find(i => i.id === event.active.id);
    if (issue) setActiveIssue(issue);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    // Actual status change is handled by the column buttons
  };

  const handleMoveToColumn = async (issueId: string, newStatus: Status) => {
    if (!repoId) return;

    try {
      await issueApi.update(repoId, issueId, { status: newStatus });
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
    } catch (err: any) {
      console.error('Failed to update issue status:', err);
    }
  };

  const groupedIssues = {
    open: issues.filter(i => i.status === 'open'),
    in_progress: issues.filter(i => i.status === 'in_progress'),
    closed: issues.filter(i => i.status === 'closed'),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/repo/${repoId}`} className="text-sky-400 hover:text-sky-300 text-sm">
            ← Back to Repository
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 mt-2">Issue Board</h1>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-md transition-colors"
          >
            + New Issue
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext 
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(['open', 'in_progress', 'closed'] as Status[]).map((status) => (
            <Column 
              key={status} 
              status={status} 
              issues={groupedIssues[status]}
              onMoveToColumn={handleMoveToColumn}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue && (
            <div className="bg-slate-800 border border-sky-500 rounded-lg p-4 shadow-xl">
              <p className="font-medium text-slate-200">{activeIssue.title}</p>
              <ScoreCard scorecard={activeIssue.scorecard} compact />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal 
          repoId={repoId!}
          onClose={() => setShowCreateModal(false)}
          onCreated={(issue) => {
            setIssues(prev => [issue, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Create Issue Modal Component
function CreateIssueModal({ repoId, onClose, onCreated }: {
  repoId: string;
  onClose: () => void;
  onCreated: (issue: Issue) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [basePoints, setBasePoints] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const issue = await issueApi.create(repoId, {
        title,
        body,
        scorecard: {
          difficulty,
          base_points: basePoints,
        },
      });
      onCreated(issue);
    } catch (err: any) {
      setError(err.message || 'Failed to create issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Create Issue</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Issue title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Describe the issue..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 
                         focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Base Points</label>
              <input
                type="number"
                value={basePoints}
                onChange={(e) => setBasePoints(parseInt(e.target.value) || 100)}
                min={0}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 
                         focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-md
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
