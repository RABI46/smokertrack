import { DEFAULT_GOAL, clampCount, clampGoal } from "./domain";
import { detectTimeZone } from "./date";
import type { DailyLogStore, DayEntry, TrackerSnapshot } from "./types";

/**
 * Magasin de démonstration : mêmes contrats que Firestore, mais persisté dans
 * `localStorage`. Il permet d'utiliser l'application sans projet Firebase et
 * sert de filet de sécurité en développement / en aperçu.
 */

const STORAGE_KEY = "smokertrack.demo.v1";

interface PersistedDay {
  count: number;
  lastSmokedAt: string | null;
}

interface PersistedState {
  goal: number;
  days: Record<string, PersistedDay>;
}

const EMPTY_STATE: PersistedState = { goal: DEFAULT_GOAL, days: {} };

type Listener = (state: PersistedState) => void;

const listeners = new Set<Listener>();

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readDemoState(): PersistedState {
  if (!hasStorage()) return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_STATE;

    const candidate = parsed as Partial<PersistedState>;
    const days: Record<string, PersistedDay> = {};
    if (candidate.days && typeof candidate.days === "object") {
      for (const [key, value] of Object.entries(candidate.days)) {
        if (value && typeof value === "object") {
          const entry = value as Partial<PersistedDay>;
          days[key] = {
            count: clampCount(Number(entry.count ?? 0)),
            lastSmokedAt: typeof entry.lastSmokedAt === "string" ? entry.lastSmokedAt : null,
          };
        }
      }
    }
    return { goal: clampGoal(Number(candidate.goal ?? DEFAULT_GOAL)), days };
  } catch {
    return EMPTY_STATE;
  }
}

function writeDemoState(state: PersistedState): void {
  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota dépassé ou stockage bloqué : on continue en mémoire.
    }
  }
  listeners.forEach((listener) => listener(state));
}

export function toEntries(state: PersistedState, dayKeys: string[]): DayEntry[] {
  return dayKeys.map((date) => {
    const day = state.days[date];
    return {
      date,
      count: clampCount(day?.count ?? 0),
      lastSmokedAt: day?.lastSmokedAt ? new Date(day.lastSmokedAt) : null,
    };
  });
}

/** Écriture pure d'une journée, réutilisée par les tests. */
export function applyIncrement(
  state: PersistedState,
  dayKey: string,
  delta: 1 | -1,
  now: Date,
): PersistedState {
  const current = state.days[dayKey]?.count ?? 0;
  const nextCount = clampCount(current + delta);
  if (nextCount === current) return state;

  const isAdd = delta > 0;
  return {
    ...state,
    days: {
      ...state.days,
      [dayKey]: {
        count: nextCount,
        lastSmokedAt: isAdd ? now.toISOString() : (state.days[dayKey]?.lastSmokedAt ?? null),
      },
    },
  };
}

export function createDemoStore(): DailyLogStore {
  const timeZone = detectTimeZone();

  return {
    mode: "demo",

    subscribe(dayKeys, onSnapshot, onError): () => void {
      const emit = (state: PersistedState) => {
        const snapshot: TrackerSnapshot = {
          entries: toEntries(state, dayKeys),
          goal: state.goal,
          timeZone,
        };
        onSnapshot(snapshot);
      };

      const listener: Listener = (state) => emit(state);
      listeners.add(listener);

      // Synchronisation entre onglets.
      const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) emit(readDemoState());
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

      try {
        emit(readDemoState());
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Lecture locale impossible"));
      }

      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },

    async increment(dayKey, delta, currentCount): Promise<void> {
      if (delta < 0 && currentCount <= 0) return;
      const state = readDemoState();
      writeDemoState(applyIncrement(state, dayKey, delta, new Date()));
    },

    async setGoal(goal): Promise<void> {
      const state = readDemoState();
      writeDemoState({ ...state, goal: clampGoal(goal) });
    },

    async deleteAll(): Promise<void> {
      // Effacement total : aucune donnée locale ne doit survivre.
      writeDemoState(EMPTY_STATE);
    },
  };
}
