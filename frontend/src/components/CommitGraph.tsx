/**
 * CommitGraph Component
 * 
 * Visualizes the reasoning graph of commits.
 */

import { useState, useEffect } from 'react';
import { commitApi, type CommitGraph as CommitGraphType } from '../api';

interface Props {
  repoId: string;
  onCommitClick?: (commitId: string) => void;
}

const reasoningColors: Record<string, string> = {
  knowledge: 'bg-blue-500',
  hypothesis: 'bg-yellow-500',
  experiment: 'bg-purple-500',
  conclusion: 'bg-green-500',
  trace: 'bg-orange-500',
};

const reasoningLabels: Record<string, string> = {
  knowledge: 'Knowledge',
  hypothesis: 'Hypothesis',
  experiment: 'Experiment',
  conclusion: 'Conclusion',
  trace: 'Trace',
};

export function CommitGraph({ repoId, onCommitClick }: Props) {
  const [graph, setGraph] = useState<CommitGraphType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    commitApi.graph(repoId)
      .then(setGraph)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [repoId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <p>No reasoning graph available</p>
        <p className="text-sm mt-1">Commits with reasoning types will appear here</p>
      </div>
    );
  }

  // Group nodes by reasoning type for legend
  const typeGroups = graph.nodes.reduce((acc, node) => {
    const type = node.reasoning_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(typeGroups).map(([type, count]) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${reasoningColors[type] || 'bg-slate-500'}`} />
            <span className="text-sm text-slate-400">
              {reasoningLabels[type] || type} ({count})
            </span>
          </div>
        ))}
      </div>

      {/* Simple list view of graph nodes */}
      <div className="space-y-2">
        {graph.nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const connectedTo = graph.edges.filter(e => e.from === node.id).map(e => e.to);
          const connectedFrom = graph.edges.filter(e => e.to === node.id).map(e => e.from);

          return (
            <div
              key={node.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-700 border-sky-500'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => {
                setSelectedNode(isSelected ? null : node.id);
                onCommitClick?.(node.id);
              }}
            >
              <div className="flex items-start gap-3">
                <span className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  reasoningColors[node.reasoning_type || ''] || 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{node.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    by {node.author_ens}
                  </p>
                  {isSelected && (connectedFrom.length > 0 || connectedTo.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-slate-700 text-xs">
                      {connectedFrom.length > 0 && (
                        <p className="text-slate-400">
                          <span className="text-slate-500">From:</span> {connectedFrom.length} parent(s)
                        </p>
                      )}
                      {connectedTo.length > 0 && (
                        <p className="text-slate-400">
                          <span className="text-slate-500">To:</span> {connectedTo.length} child(ren)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
