/**
 * Leaderboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Leaderboard from '../pages/Leaderboard';

// Mock chart.js with register
vi.mock('chart.js', () => {
  const chartMock = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
  }));
  (chartMock as any).register = vi.fn();

  return {
    Chart: chartMock,
    registerables: [],
  };
});

function renderWithRouter(ui: React.ReactNode) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

const mockLeaderboardData = {
  entries: [
    {
      rank: 1,
      agent_id: 'a1',
      ens_name: 'alpha-agent.eth',
      role: 'researcher',
      reputation_score: 95,
      total_points: 1250,
      issues_completed: 12,
      deposit_verified: true,
    },
    {
      rank: 2,
      agent_id: 'a2',
      ens_name: 'beta-agent.eth',
      role: 'coder',
      reputation_score: 88,
      total_points: 980,
      issues_completed: 8,
      deposit_verified: true,
    },
    {
      rank: 3,
      agent_id: 'a3',
      ens_name: 'gamma-agent.eth',
      role: 'reviewer',
      reputation_score: 75,
      total_points: 650,
      issues_completed: 5,
      deposit_verified: false,
    },
  ],
  pagination: { total: 3, limit: 50, offset: 0 },
  timeframe: 'all',
};

const mockStats = {
  total_agents: 25,
  total_points: 15000,
  total_issues: 100,
  issues_closed: 75,
};

describe('Leaderboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/leaderboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });
      }
      if (url.includes('/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLeaderboardData),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('renders loading state initially', () => {
    renderWithRouter(<Leaderboard />);
    
    // Should show skeleton loaders
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders leaderboard header', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Agent rankings by points earned')).toBeInTheDocument();
    });
  });

  it('renders stats cards', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      const totalAgentsCard = screen.getByText('Total Agents').closest('div');
      const totalPointsCard = screen.getByText('Total Points').closest('div');
      const totalIssuesCard = screen.getByText('Total Issues').closest('div');
      const issuesClosedCard = screen.getByText('Issues Closed').closest('div');

      expect(within(totalAgentsCard!).getByText('25')).toBeInTheDocument();
      expect(within(totalPointsCard!).getByText('15,000')).toBeInTheDocument();
      expect(within(totalIssuesCard!).getByText('100')).toBeInTheDocument();
      expect(within(issuesClosedCard!).getByText('75')).toBeInTheDocument();
    });
  });

  it('renders timeframe buttons', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all time/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /this month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /this week/i })).toBeInTheDocument();
    });
  });

  it('changes timeframe on button click', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /this month/i })).toBeInTheDocument();
    });

    const monthButton = screen.getByRole('button', { name: /this month/i });
    await act(async () => {
      await userEvent.click(monthButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=month'),
        expect.any(Object)
      );
    });
  });

  it('renders rankings table', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Rankings')).toBeInTheDocument();
      expect(screen.getByText('alpha-agent.eth')).toBeInTheDocument();
      expect(screen.getByText('beta-agent.eth')).toBeInTheDocument();
      expect(screen.getByText('gamma-agent.eth')).toBeInTheDocument();
    });
  });

  it('shows rank badges with correct styling', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      const ranks = screen.getAllByText(/^[123]$/);
      expect(ranks.length).toBe(3);
    });
  });

  it('displays agent roles', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('coder')).toBeInTheDocument();
      expect(screen.getByText('reviewer')).toBeInTheDocument();
    });
  });

  it('shows points for each agent', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('980')).toBeInTheDocument();
      expect(screen.getByText('650')).toBeInTheDocument();
    });
  });

  it('shows deposit verification status', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      // Should have 2 verified checkmarks and 1 unverified
      const verifiedIcons = document.querySelectorAll('.text-green-400 svg');
      const unverifiedIcons = document.querySelectorAll('.text-slate-500 svg');
      
      expect(verifiedIcons.length).toBe(2);
      expect(unverifiedIcons.length).toBe(1);
    });
  });

  it('links agent names to profile pages', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      const agentLink = screen.getByRole('link', { name: 'alpha-agent.eth' });
      expect(agentLink).toHaveAttribute('href', '/agents/alpha-agent.eth');
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('shows empty state when no entries', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/leaderboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_agents: 0, total_points: 0, total_issues: 0, issues_closed: 0 }),
        });
      }
      if (url.includes('/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ entries: [], pagination: {}, timeframe: 'all' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText(/no agents found/i)).toBeInTheDocument();
    });
  });

  it('renders chart containers', async () => {
    renderWithRouter(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Top 10 Agents')).toBeInTheDocument();
      expect(screen.getByText('Role Distribution')).toBeInTheDocument();
    });
  });
});
