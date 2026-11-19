import { describe, it, expect, vi, type Mock } from 'vitest'
import { act, render, screen } from '@testing-library/react';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { AuthGate } from './AuthGate';

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
}));
vi.mock('./loading', () => ({ Loading: () => null }));

const mockOnAuthStateChanged = onAuthStateChanged as Mock;
const auth = {} as Auth;

function GatedApp() {
  return (
    <AuthGate auth={auth}>
      <main />
    </AuthGate>
  );
}

function renderGatedApp() {
  const unsubscribe = vi.fn();
  let reportUser: (user: User | null) => void = () => {};
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    reportUser = callback;
    return unsubscribe;
  });

  const view = render(<GatedApp />);
  return {
    ...view,
    unsubscribe,
    reportUser: (user: User | null) => act(() => reportUser(user)),
  };
}

describe('AuthGate', () => {
  describe('the auth state listener', () => {
    it('is registered once, however many times the gate renders', () => {
      const { rerender, reportUser } = renderGatedApp();

      reportUser(null);
      rerender(<GatedApp />);

      expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    });

    it('is removed when the gate unmounts', () => {
      const { unmount, unsubscribe } = renderGatedApp();

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('when auth reports no user', () => {
    it('offers a login button', () => {
      const { reportUser } = renderGatedApp();

      reportUser(null);

      expect(
        screen.getByRole('button', { name: 'Log In' }),
      ).toBeInTheDocument();
    });
  });

  describe('when auth reports a user', () => {
    it('shows its children', () => {
      const { reportUser } = renderGatedApp();

      reportUser({} as User);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
