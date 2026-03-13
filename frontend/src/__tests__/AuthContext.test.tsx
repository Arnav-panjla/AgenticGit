/**
 * AuthContext Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Test component that uses auth
function TestComponent() {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      {user && <span data-testid="username">{user.username}</span>}
      <button onClick={() => login('testuser', 'password123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it('provides initial unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
    });
  });

  it('handles login successfully', async () => {
    const mockResponse = {
      token: 'test-token',
      user: { id: '1', username: 'testuser' },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
    });

    const loginButton = screen.getByRole('button', { name: /login/i });
    await act(async () => {
      await userEvent.click(loginButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    });
  });

  it('handles logout', async () => {
    // Start with authenticated state
    (window.localStorage.getItem as ReturnType<typeof vi.fn>)
      .mockImplementation((key: string) => {
        if (key === 'agentbranch_token') return 'test-token';
        if (key === 'agentbranch_user') return JSON.stringify({ id: '1', username: 'testuser' });
        return null;
      });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1', username: 'testuser' } }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await act(async () => {
      await userEvent.click(logoutButton);
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
    expect(window.localStorage.removeItem).toHaveBeenCalled();
  });

  it('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });
});
