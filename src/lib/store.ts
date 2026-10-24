import { createDemoStore } from "./demoStore";
import { createFirebaseStore } from "./firestoreStore";
import { isFirebaseConfigured } from "./firebase";
import type { DailyLogStore } from "./types";

/**
 * Sélectionne l'implémentation : Firestore si le projet est configuré et qu'un
 * utilisateur est authentifié, sinon la démo locale (aperçu, développement).
 */
export function createDailyLogStore(uid: string | null): DailyLogStore {
  if (isFirebaseConfigured && uid) return createFirebaseStore(uid);
  return createDemoStore();
}
