'use client';

import type { User } from 'firebase/auth';
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInAnonymously,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiCallError, apiJson } from './api';
import { clientAuth } from './firebase';

export interface SessionProfile {
  readonly uid: string;
  readonly isAnonymous: boolean;
  readonly provider: string;
  readonly displayName: string | null;
  readonly acceptedFreeEditionTermsVersion: string | null;
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export type GoogleSignInResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'cancelled' }
  /** Le compte Google possède déjà une progression : aucune fusion implicite. */
  | { readonly kind: 'account-exists' }
  | { readonly kind: 'error'; readonly message: string };

interface AuthContextValue {
  readonly status: AuthStatus;
  readonly profile: SessionProfile | null;
  /** Garantit une session serveur (anonyme si nécessaire) avant une écriture. */
  readonly ensureSession: () => Promise<SessionProfile>;
  readonly signInWithGoogle: (options?: {
    readonly abandonAnonymous?: boolean;
  }) => Promise<GoogleSignInResult>;
  readonly signOut: () => Promise<void>;
  readonly refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function exchange(user: User): Promise<SessionProfile> {
  const idToken = await user.getIdToken(true);
  const { user: profile } = await apiJson<{ user: SessionProfile }>('POST', '/api/session', {
    idToken,
  });
  return profile;
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function isCancelled(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
  );
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const pending = useRef<Promise<SessionProfile> | null>(null);

  useEffect(() => {
    const lifecycle = { active: true };
    const isActive = (): boolean => lifecycle.active;
    const unsubscribe = onAuthStateChanged(clientAuth(), (user) => {
      void (async () => {
        const { user: current } = await apiJson<{ user: SessionProfile | null }>('GET', '/api/me');
        if (!isActive()) return;
        if (current !== null && user?.uid === current.uid) {
          setProfile(current);
          setStatus('signed-in');
          return;
        }
        if (user?.isAnonymous === true) {
          // Session serveur expirée pour un compte anonyme : on la recrée sans perte de progression.
          try {
            const restored = await exchange(user);
            if (!isActive()) return;
            setProfile(restored);
            setStatus('signed-in');
            return;
          } catch {
            // on retombe sur l'état déconnecté
          }
        }
        if (!isActive()) return;
        setProfile(null);
        setStatus('signed-out');
      })().catch(() => {
        if (isActive()) setStatus('signed-out');
      });
    });
    return () => {
      lifecycle.active = false;
      unsubscribe();
    };
  }, []);

  const ensureSession = useCallback(async (): Promise<SessionProfile> => {
    if (profile !== null) return profile;
    pending.current ??= (async () => {
      const auth = clientAuth();
      const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
      const created = await exchange(user);
      setProfile(created);
      setStatus('signed-in');
      return created;
    })().finally(() => {
      pending.current = null;
    });
    return pending.current;
  }, [profile]);

  const signInWithGoogle = useCallback(
    async (options: { readonly abandonAnonymous?: boolean } = {}): Promise<GoogleSignInResult> => {
      const auth = clientAuth();
      const current = auth.currentUser;
      try {
        let user: User;
        if (current?.isAnonymous === true && options.abandonAnonymous !== true) {
          // Conversion de l'anonyme : même uid, la progression est conservée.
          user = (await linkWithPopup(current, googleProvider())).user;
        } else {
          user = (await signInWithPopup(auth, googleProvider())).user;
        }
        let created: SessionProfile;
        try {
          created = await exchange(user);
        } catch (error) {
          if (!(error instanceof ApiCallError) || error.code !== 'reauthentication-required')
            throw error;
          await reauthenticateWithPopup(user, googleProvider());
          created = await exchange(user);
        }
        setProfile(created);
        setStatus('signed-in');
        return { kind: 'ok' };
      } catch (error) {
        if (isCancelled(error)) return { kind: 'cancelled' };
        if (error instanceof FirebaseError && error.code === 'auth/credential-already-in-use') {
          return { kind: 'account-exists' };
        }
        return {
          kind: 'error',
          message: error instanceof Error ? error.message : 'Erreur inconnue',
        };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await apiJson('DELETE', '/api/session');
    await firebaseSignOut(clientAuth());
    setProfile(null);
    setStatus('signed-out');
  }, []);

  const refreshProfile = useCallback(async () => {
    const { user } = await apiJson<{ user: SessionProfile | null }>('GET', '/api/me');
    setProfile(user);
    setStatus(user === null ? 'signed-out' : 'signed-in');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, profile, ensureSession, signInWithGoogle, signOut, refreshProfile }),
    [status, profile, ensureSession, signInWithGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return ctx;
}
