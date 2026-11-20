import { FirebaseError } from 'firebase/app';
import { Auth, onAuthStateChanged } from 'firebase/auth';
import { ReactNode, useEffect, useState } from 'react';

import { Loading } from './loading';
import './AuthGate.css';

const CANCELLED_LOG_IN_CODES = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
];

const isCancelledLogIn = (error: unknown) =>
  error instanceof FirebaseError && CANCELLED_LOG_IN_CODES.includes(error.code);

type AuthGateProps = {
  auth: Auth;
  logIn: () => Promise<unknown>;
  children: ReactNode;
};

export function AuthGate({ auth, logIn, children }: AuthGateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [hasLogInFailed, setHasLogInFailed] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setIsLoading(false);
        setLoggedIn(!!user);
      }),
    [auth],
  );

  const startLogIn = () => {
    setHasLogInFailed(false);
    logIn().catch((error: unknown) => {
      if (!isCancelledLogIn(error)) setHasLogInFailed(true);
    });
  };

  if (isLoading) {
    return (
      <div className="auth-gate-loading">
        <Loading />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="not-logged-in">
        <button onClick={startLogIn}>Log In</button>
        {hasLogInFailed && <p role="alert">Couldn't log in. Please try again.</p>}
      </div>
    );
  }

  return children;
}
