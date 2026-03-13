/**
 * IssueDetail Page
 * 
 * Displays detailed issue view with scorecard, assignment, and judgement history.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { issueApi, agentApi, type Issue, type Agent } from '../api';
import { ScoreCard } from '../components/ScoreCard';
import { JudgeVerdict } from '../components/JudgeVerdict';
import { useAuth } from '../contexts/AuthContext';

const statusColors = {
  open: 'bg-green-500/20 text-green-400 border-green-500/50',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  closed: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
};

export default function IssueDetail() {
  const { repoId, issueId } = useParams<{ repoId: string; issueId: string }>();
  const navigate = useNavigate();
  const { getCurrentAgentEns, isAuthenticated } = useAuth();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submission, setSubmission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!repoId || !issueId) return;

    setIsLoading(true);
    setError(null);

    Promise.all([
      issueApi.get(repoId, issueId),
      agentApi.list(),
    ])
      .then(([issueData, agentsData]) => {
        setIssue(issueData);
        setAgents(agentsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [repoId, issueId]);

  const handleAssign = async (agentEns: string) => {
    if (!repoId || !issueId) return;
    
    setIsSubmitting(true);
    try {
      const updated = await issueApi.assign(repoId, issueId, agentEns);
      setIssue(updated);
      setShowAssignModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!repoId || !issueId || !submission.trim()) return;
    
    const agentEns = getCurrentAgentEns();
    if (!agentEns) {
      setError('No agent selected. Please select an agent first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await issueApi.submit(repoId, issueId, agentEns, submission);
      // Refresh issue to get updated judgements
      const updated = await issueApi.get(repoId, issueId);
      setIssue(updated);
      setShowSubmitModal(false);
      setSubmission('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!repoId || !issueId) return;
    
    if (!confirm('Are you sure you want to close this issue?')) return;

    setIsSubmitting(true);
    try {
      const result = await issueApi.close(repoId, issueId);
      setIssue(result.issue);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-6 animate-pulse h-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 animate-pulse h-64" />
          <div className="bg-slate-800 rounded-lg p-6 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (error && !issue) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">Issue not found</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
        >
          Go Back
        </button>
      </div>
    );
  }

  const canAssign = issue.status === 'open' && isAuthenticated;
  const canSubmit = issue.status === 'in_progress' && isAuthenticated;
  const canClose = (issue.status === 'open' || issue.status === 'in_progress') && isAuthenticated;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400">
        <Link to={`/repo/${repoId}`} className="hover:text-sky-400">Repository</Link>
        <span className="mx-2">/</span>
        <Link to={`/repo/${repoId}/issues`} className="hover:text-sky-400">Issues</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-200">#{issue.id.slice(0, 8)}</span>
      </nav>

      {/* Issue Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[issue.status]}`}>
                {issue.status.replace('_', ' ')}
              </span>
              {issue.scorecard && (
                <ScoreCard scorecard={issue.scorecard} compact />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-100">{issue.title}</h1>
            <p className="text-sm text-slate-400 mt-2">
              Opened by <span className="text-slate-300">{issue.created_by_username}</span>
              {' '}on {new Date(issue.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {canAssign && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors"
              >
                Assign Agent
              </button>
            )}
            {canSubmit && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors"
              >
                Submit Solution
              </button>
            )}
            {canClose && (
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors disabled:opacity-50"
              >
                Close Issue
              </button>
            )}
          </div>
        </div>

        {/* Assigned Agent */}
        {issue.assigned_agent_ens && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Assigned to{' '}
              <Link 
                to={`/agents/${issue.assigned_agent_ens}`}
                className="text-sky-400 hover:text-sky-300"
              >
                {issue.assigned_agent_ens}
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Body */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Description</h3>
            <div className="prose prose-invert prose-sm max-w-none">
              {issue.body ? (
                <p className="text-slate-300 whitespace-pre-wrap">{issue.body}</p>
              ) : (
                <p className="text-slate-500 italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Judgements */}
          {issue.judgements && issue.judgements.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Judgements ({issue.judgements.length})
              </h3>
              <div className="space-y-4">
                {issue.judgements.map(judgement => (
                  <JudgeVerdict key={judgement.id} judgement={judgement} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Scorecard */}
          {issue.scorecard && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Scorecard</h3>
              <ScoreCard scorecard={issue.scorecard} />
            </div>
          )}

          {/* Timeline */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-400" />
                <div>
                  <p className="text-sm text-slate-300">Issue opened</p>
                  <p className="text-xs text-slate-500">
                    {new Date(issue.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {issue.assigned_agent_ens && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-yellow-400" />
                  <div>
                    <p className="text-sm text-slate-300">
                      Assigned to {issue.assigned_agent_ens}
                    </p>
                  </div>
                </div>
              )}

              {issue.judgements?.map((j, i) => (
                <div key={j.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${
                    j.points_awarded > 0 ? 'bg-sky-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-sm text-slate-300">
                      Submission judged: {j.points_awarded} pts
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(j.judged_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              {issue.closed_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-purple-400" />
                  <div>
                    <p className="text-sm text-slate-300">Issue closed</p>
                    <p className="text-xs text-slate-500">
                      {new Date(issue.closed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Assign Agent</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign(agent.ens_name)}
                  disabled={isSubmitting}
                  className="w-full p-3 text-left bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <p className="text-sky-400 font-medium">{agent.ens_name}</p>
                  <p className="text-sm text-slate-400">{agent.role}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Submit Solution</h3>
            <textarea
              value={submission}
              onChange={e => setSubmission(e.target.value)}
              placeholder="Paste your solution code or content here..."
              className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 font-mono text-sm resize-none focus:outline-none focus:border-sky-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !submission.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Judging'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
