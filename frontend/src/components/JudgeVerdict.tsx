/**
 * JudgeVerdict Component
 * 
 * Displays the AutoResearch judge verdict for an issue submission.
 */

import { type Judgement } from '../api';

interface Props {
  judgement: Judgement;
}

export function JudgeVerdict({ judgement }: Props) {
  const verdict = judgement.verdict;
  const isPassed = judgement.points_awarded > 0;

  return (
    <div
      data-testid="judge-verdict"
      className={`border rounded-lg p-4 ${
        isPassed 
          ? 'bg-green-500/5 border-green-500/30' 
          : 'bg-red-500/5 border-red-500/30'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isPassed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {isPassed ? (
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <h4 className="font-medium text-slate-200">Judge Verdict</h4>
            <p className="text-xs text-slate-400">
              {judgement.agent_ens && `by ${judgement.agent_ens}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
            {judgement.points_awarded}
          </p>
          <p className="text-xs text-slate-500">points</p>
        </div>
      </div>

      {/* Code quality score */}
      {verdict.code_quality_score !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Code Quality</span>
            <span className="text-slate-200">{verdict.code_quality_score}/10</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${verdict.code_quality_score * 10}%` }}
            />
          </div>
        </div>
      )}

      {/* Test results */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {verdict.passed_tests && verdict.passed_tests.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase mb-2">Passed Tests</p>
            <div className="space-y-1">
              {verdict.passed_tests.map((test, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">{test}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {verdict.failed_tests && verdict.failed_tests.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase mb-2">Failed Tests</p>
            <div className="space-y-1">
              {verdict.failed_tests.map((test, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-slate-300">{test}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bonus achievements */}
      {(verdict.bonus_achieved?.length || verdict.bonus_missed?.length) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {verdict.bonus_achieved && verdict.bonus_achieved.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Bonus Achieved</p>
              <div className="flex flex-wrap gap-1">
                {verdict.bonus_achieved.map((bonus, i) => (
                  <span key={i} className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                    {bonus}
                  </span>
                ))}
              </div>
            </div>
          )}

          {verdict.bonus_missed && verdict.bonus_missed.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Bonus Missed</p>
              <div className="flex flex-wrap gap-1">
                {verdict.bonus_missed.map((bonus, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                    {bonus}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reasoning */}
      {verdict.reasoning && (
        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 uppercase mb-2">Judge Analysis</p>
          <p className="text-sm text-slate-300">{verdict.reasoning}</p>
        </div>
      )}

      {/* Suggestions */}
      {verdict.suggestions && verdict.suggestions.length > 0 && (
        <div className="pt-4 border-t border-slate-700 mt-4">
          <p className="text-xs text-slate-500 uppercase mb-2">Suggestions</p>
          <ul className="space-y-1">
            {verdict.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="text-sky-400 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
