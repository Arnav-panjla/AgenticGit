/**
 * Component Tests - ScoreCard & JudgeVerdict
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreCard } from '../components/ScoreCard';
import { JudgeVerdict } from '../components/JudgeVerdict';
import type { Scorecard, Judgement } from '../api';

describe('ScoreCard', () => {
  const mockScorecard: Scorecard = {
    difficulty: 'medium',
    base_points: 100,
    unit_tests: ['test_auth', 'test_api'],
    bonus_criteria: ['coverage > 90%', 'no lint errors'],
    bonus_points_per_criterion: 25,
    time_limit_hours: 48,
    required_language: 'TypeScript',
  };

  describe('compact mode', () => {
    it('renders difficulty badge and points', () => {
      render(<ScoreCard scorecard={mockScorecard} compact />);

      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('100 pts')).toBeInTheDocument();
    });
  });

  describe('full mode', () => {
    it('renders all scorecard information', () => {
      render(<ScoreCard scorecard={mockScorecard} />);

      expect(screen.getByText('Scoring')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('+50')).toBeInTheDocument(); // max bonus
      expect(screen.getByText('150')).toBeInTheDocument(); // max total
    });

    it('renders time limit', () => {
      render(<ScoreCard scorecard={mockScorecard} />);

      expect(screen.getByText('48h time limit')).toBeInTheDocument();
    });

    it('renders unit tests', () => {
      render(<ScoreCard scorecard={mockScorecard} />);

      expect(screen.getByText('Required Tests')).toBeInTheDocument();
      expect(screen.getByText('test_auth')).toBeInTheDocument();
      expect(screen.getByText('test_api')).toBeInTheDocument();
    });

    it('renders bonus criteria with points', () => {
      render(<ScoreCard scorecard={mockScorecard} />);

      expect(screen.getByText('Bonus Criteria')).toBeInTheDocument();
      expect(screen.getByText('+25 coverage > 90%')).toBeInTheDocument();
      expect(screen.getByText('+25 no lint errors')).toBeInTheDocument();
    });

    it('renders required language', () => {
      render(<ScoreCard scorecard={mockScorecard} />);

      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });

  describe('difficulty colors', () => {
    it('applies correct color for each difficulty', () => {
      const difficulties: Array<'easy' | 'medium' | 'hard' | 'expert'> = ['easy', 'medium', 'hard', 'expert'];

      difficulties.forEach(difficulty => {
        const { unmount } = render(
          <ScoreCard scorecard={{ ...mockScorecard, difficulty }} compact />
        );
        expect(screen.getByText(difficulty)).toBeInTheDocument();
        unmount();
      });
    });
  });
});

describe('JudgeVerdict', () => {
  const mockJudgement: Judgement = {
    id: 'j1',
    issue_id: 'i1',
    agent_id: 'a1',
    agent_ens: 'solver-agent.eth',
    verdict: {
      passed_tests: ['test_auth', 'test_api'],
      failed_tests: ['test_edge_case'],
      bonus_achieved: ['coverage > 90%'],
      bonus_missed: ['no lint errors'],
      code_quality_score: 8,
      reasoning: 'Good implementation with minor issues.',
      suggestions: ['Consider adding more edge case tests', 'Refactor the main function'],
    },
    points_awarded: 125,
    judged_at: '2024-01-15T10:00:00Z',
  };

  it('renders points awarded', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('125')).toBeInTheDocument();
    expect(screen.getByText('points')).toBeInTheDocument();
  });

  it('renders agent ENS', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('by solver-agent.eth')).toBeInTheDocument();
  });

  it('renders code quality score', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Code Quality')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('renders passed tests', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Passed Tests')).toBeInTheDocument();
    expect(screen.getByText('test_auth')).toBeInTheDocument();
    expect(screen.getByText('test_api')).toBeInTheDocument();
  });

  it('renders failed tests', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Failed Tests')).toBeInTheDocument();
    expect(screen.getByText('test_edge_case')).toBeInTheDocument();
  });

  it('renders bonus achievements', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Bonus Achieved')).toBeInTheDocument();
    expect(screen.getByText('coverage > 90%')).toBeInTheDocument();
  });

  it('renders missed bonuses', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Bonus Missed')).toBeInTheDocument();
    expect(screen.getByText('no lint errors')).toBeInTheDocument();
  });

  it('renders reasoning', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Judge Analysis')).toBeInTheDocument();
    expect(screen.getByText('Good implementation with minor issues.')).toBeInTheDocument();
  });

  it('renders suggestions', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Consider adding more edge case tests')).toBeInTheDocument();
    expect(screen.getByText('Refactor the main function')).toBeInTheDocument();
  });

  it('shows success styling for positive points', () => {
    render(<JudgeVerdict judgement={mockJudgement} />);

    const container = screen.getByTestId('judge-verdict');
    expect(container?.className).toContain('border-green-500');
  });

  it('shows failure styling for zero points', () => {
    const failedJudgement = { ...mockJudgement, points_awarded: 0 };
    render(<JudgeVerdict judgement={failedJudgement} />);

    const container = screen.getByTestId('judge-verdict');
    expect(container?.className).toContain('border-red-500');
  });
});
