/**
 * DiffViewer Component
 * 
 * Displays commit differences and replay traces.
 */

import { useState, useEffect } from 'react';
import { commitApi, type CommitReplay } from '../api';

interface Props {
  repoId: string;
  commitId: string;
}

export function DiffViewer({ repoId, commitId }: Props) {
  const [replay, setReplay] = useState<CommitReplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'trace' | 'chain'>('content');

  useEffect(() => {
    setIsLoading(true);
    commitApi.replay(repoId, commitId)
      .then(setReplay)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [repoId, commitId]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-700 rounded w-full" />
        <div className="h-64 bg-slate-700 rounded w-full" />
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>Commit not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'content', label: 'Content' },
    ...(replay.trace ? [{ id: 'trace', label: 'Trace' }] : []),
    ...(replay.reasoningChain.length > 0 ? [{ id: 'chain', label: `Chain (${replay.reasoningChain.length})` }] : []),
  ] as const;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-medium text-slate-200">{replay.commit.message}</h3>
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
          <span>{replay.commit.author_ens}</span>
          {replay.commit.reasoning_type && (
            <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400 text-xs">
              {replay.commit.reasoning_type}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {replay.commit.semantic_summary && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Summary</p>
                <p className="text-sm text-slate-300">{replay.commit.semantic_summary}</p>
              </div>
            )}

            {replay.commit.tags && replay.commit.tags.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {replay.commit.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Content Reference</p>
              <code className="block p-3 bg-slate-900 rounded font-mono text-xs text-slate-300 overflow-x-auto">
                {replay.commit.content_ref}
              </code>
            </div>
          </div>
        )}

        {activeTab === 'trace' && replay.trace && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Prompt</p>
              <div className="p-3 bg-slate-900 rounded">
                <p className="text-sm text-slate-300">{replay.trace.prompt}</p>
              </div>
            </div>

            {replay.trace.context && Object.keys(replay.trace.context).length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Context</p>
                <pre className="p-3 bg-slate-900 rounded font-mono text-xs text-slate-300 overflow-x-auto">
                  {JSON.stringify(replay.trace.context, null, 2)}
                </pre>
              </div>
            )}

            {replay.trace.tools && replay.trace.tools.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Tools Used</p>
                <div className="flex flex-wrap gap-2">
                  {replay.trace.tools.map((tool, i) => (
                    <span key={i} className="px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-sm text-sky-400">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Result</p>
              <div className="p-3 bg-slate-900 rounded">
                <p className="text-sm text-slate-300">{replay.trace.result}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chain' && (
          <div className="space-y-3">
            {replay.reasoningChain.map((commit, i) => (
              <div key={commit.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    commit.reasoning_type === 'conclusion' ? 'bg-green-500' : 'bg-sky-500'
                  }`} />
                  {i < replay.reasoningChain.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-700 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm text-slate-200">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{commit.author_ens}</span>
                    {commit.reasoning_type && (
                      <span className="px-1.5 py-0.5 bg-slate-700 rounded">
                        {commit.reasoning_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
