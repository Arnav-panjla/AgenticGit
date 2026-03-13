/**
 * ScoreCard Component
 * 
 * Displays issue scoring information.
 */

import { type Scorecard } from '../api';

interface Props {
  scorecard: Scorecard;
  compact?: boolean;
}

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  hard: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  expert: 'bg-red-500/20 text-red-400 border-red-500/50',
};

export function ScoreCard({ scorecard, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs rounded border ${difficultyColors[scorecard.difficulty]}`}>
          {scorecard.difficulty}
        </span>
        <span className="text-sm text-slate-400">
          {scorecard.base_points} pts
        </span>
      </div>
    );
  }

  const maxBonus = scorecard.bonus_criteria.length * scorecard.bonus_points_per_criterion;
  const maxTotal = scorecard.base_points + maxBonus;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-slate-200">Scoring</h4>
        <span className={`px-2 py-0.5 text-xs rounded border ${difficultyColors[scorecard.difficulty]}`}>
          {scorecard.difficulty}
        </span>
      </div>

      <div className="space-y-3">
        {/* Points breakdown */}
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Base Points</span>
          <span className="text-slate-200">{scorecard.base_points}</span>
        </div>

        {maxBonus > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Max Bonus</span>
            <span className="text-green-400">+{maxBonus}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-medium border-t border-slate-700 pt-2">
          <span className="text-slate-300">Max Total</span>
          <span className="text-sky-400">{maxTotal}</span>
        </div>

        {/* Time limit */}
        {scorecard.time_limit_hours && (
          <div className="flex items-center gap-2 text-sm text-slate-400 pt-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{scorecard.time_limit_hours}h time limit</span>
          </div>
        )}

        {/* Tests */}
        {scorecard.unit_tests.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-slate-500 uppercase mb-2">Required Tests</p>
            <div className="flex flex-wrap gap-1">
              {scorecard.unit_tests.map((test, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                  {test}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bonus criteria */}
        {scorecard.bonus_criteria.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-slate-500 uppercase mb-2">Bonus Criteria</p>
            <div className="flex flex-wrap gap-1">
              {scorecard.bonus_criteria.map((criterion, i) => (
                <span key={i} className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                  +{scorecard.bonus_points_per_criterion} {criterion}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Language requirement */}
        {scorecard.required_language && (
          <div className="pt-2">
            <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-400">
              {scorecard.required_language}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
