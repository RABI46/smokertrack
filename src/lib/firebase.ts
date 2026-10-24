import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

/**
 * Configuration lue depuis `.env.local` (voir `.env.example`).
 * Les variables `NEXT_PUBLIC_*` sont publiques par nature : la sécurité repose
 * entièrement sur les règles Firestore (`firestore.rules`), jamais sur le secret.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** Tant que les clés ne sont pas fournies, l'application bascule en mode démo local. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase n'est pas configuré : renseignez les variables NEXT_PUBLIC_FIREBASE_*.");
  }
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let firestore: Firestore | null = null;

/** Firestore avec cache persistant : les écritures hors-ligne sont mises en file. */
export function getDb(): Firestore {
  if (!firestore) {
    const app = getApp();
    try {
      firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      // Le cache persistant échoue en navigation privée / contexte non supporté.
      firestore = getFirestore(app);
    }
  }
  return firestore;
}

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getApp());
  return auth;
}
