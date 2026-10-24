import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  increment as incrementField,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { DEFAULT_GOAL, clampCount, clampGoal } from "./domain";
import { detectTimeZone } from "./date";
import { getDb } from "./firebase";
import type { DailyLogStore, DayEntry, TrackerSnapshot } from "./types";

/**
 * Persistance Firestore.
 *
 * Structure :
 *   users/{uid}                → { goal }
 *   users/{uid}/daily/{jour}   → { count, lastSmokedAt }
 *
 * `serverTimestamp()` garantit un horodatage fiable (non falsifiable par le
 * client) et `increment()` rend l'ajout atomique, même en concurrence.
 */

/** Firestore limite `in` à 30 valeurs par requête. */
const IN_QUERY_LIMIT = 30;
const DELETE_BATCH_LIMIT = 400;

interface DailyDocument {
  count?: number;
  lastSmokedAt?: { toDate: () => Date } | null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function toEntry(date: string, data: DailyDocument | undefined): DayEntry {
  return {
    date,
    count: clampCount(Number(data?.count ?? 0)),
    lastSmokedAt: data?.lastSmokedAt?.toDate?.() ?? null,
  };
}

export function createFirebaseStore(uid: string): DailyLogStore {
  const db = getDb();
  const timeZone = detectTimeZone();
  const userDoc = doc(db, "users", uid);

  return {
    mode: "firebase",

    subscribe(dayKeys, onSnapshotCallback, onError): () => void {
      const knownEntries = new Map<string, DayEntry>(
        dayKeys.map((key) => [key, { date: key, count: 0, lastSmokedAt: null }]),
      );
      let goal = DEFAULT_GOAL;
      let ready = false;

      const emit = () => {
        if (!ready) return;
        const snapshot: TrackerSnapshot = {
          entries: dayKeys.map(
            (key) =>
              knownEntries.get(key) ?? { date: key, count: 0, lastSmokedAt: null },
          ),
          goal,
          timeZone,
        };
        onSnapshotCallback(snapshot);
      };

      const profileUnsubscribe = onSnapshot(
        userDoc,
        (profileSnapshot) => {
          const rawGoal = profileSnapshot.data()?.goal;
          goal = clampGoal(Number(rawGoal ?? DEFAULT_GOAL));
          emit();
        },
        onError,
      );

      const chunks = chunk(dayKeys, IN_QUERY_LIMIT);
      const unsubscribes = chunks.map((keys) =>
        onSnapshot(
          query(collection(db, "users", uid, "daily"), where(documentId(), "in", keys)),
          (querySnapshot) => {
            querySnapshot.forEach((document) => {
              knownEntries.set(document.id, toEntry(document.id, document.data() as DailyDocument));
            });
            // Les jours absents de la réponse sont bien à zéro.
            keys.forEach((key) => {
              if (!querySnapshot.docs.some((document) => document.id === key)) {
                knownEntries.set(key, { date: key, count: 0, lastSmokedAt: null });
              }
            });
            ready = true;
            emit();
          },
          onError,
        ),
      );

      return () => {
        profileUnsubscribe();
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      };
    },

    async increment(dayKey, delta, currentCount): Promise<void> {
      if (delta < 0 && currentCount <= 0) return;
      await setDoc(
        doc(db, "users", uid, "daily", dayKey),
        {
          count: incrementField(delta),
          lastSmokedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },

    async setGoal(nextGoal): Promise<void> {
      await setDoc(userDoc, { goal: clampGoal(nextGoal) }, { merge: true });
    },

    async deleteAll(): Promise<void> {
      const collectionRef = collection(db, "users", uid, "daily");
      const allDocs = await getDocs(collectionRef);
      for (const batchDocs of chunk(allDocs.docs, DELETE_BATCH_LIMIT)) {
        const batch = writeBatch(db);
        batchDocs.forEach((document) => batch.delete(document.ref));
        await batch.commit();
      }
      await deleteDoc(userDoc);
    },
  };
}
