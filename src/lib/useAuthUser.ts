"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  mode: "firebase" | "demo";
}

/**
 * Authentification sans friction : connexion anonyme au premier lancement
 * (l'utilisateur obtient tout de suite un `uid` isolé), puis liaison possible
 * à une adresse e-mail pour retrouver ses données sur un autre appareil.
 */
export function useAuthUser(): AuthState & { signInAnonymously: () => Promise<void> } {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    loading: isFirebaseConfigured,
    error: null,
    mode: isFirebaseConfigured ? "firebase" : "demo",
  }));

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({ user, loading: false, error: null, mode: "firebase" });
      },
      (error) => {
        setState({ user: null, loading: false, error: error.message, mode: "firebase" });
      },
    );

    // Création de session anonyme si aucune session locale n'existe.
    if (!auth.currentUser) {
      void signInAnonymously(auth).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Connexion anonyme impossible.";
        setState((previous) => ({ ...previous, loading: false, error: message }));
      });
    }

    return unsubscribe;
  }, []);

  const retryAnonymousSignIn = async () => {
    if (!isFirebaseConfigured) return;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      await signInAnonymously(getFirebaseAuth());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      setState((previous) => ({ ...previous, loading: false, error: message }));
    }
  };

  return { ...state, signInAnonymously: retryAnonymousSignIn };
}
