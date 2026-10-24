import { DEFAULT_GOAL, clampCount, clampGoal } from "./domain";
import { detectTimeZone } from "./date";
import type { BackupFile, DailyLogStore, DayEntry, TrackerSnapshot } from "./types";

/**
 * Persistance locale (aucun serveur, aucun compte).
 *
 * Les données sont stockées dans `localStorage` sous une clé versionnée. Le
 * volume reste minuscule (un enregistrement de quelques octets par jour), et le
 * format est identique à celui de l'export JSON : sauvegarde et restauration
 * sont donc triviales.
 */

const STORAGE_KEY = "smokertrack.v1";
/** Clé de l'ancien « mode démo » : migrée automatiquement à la première lecture. */
const LEGACY_KEY = "smokertrack.demo.v1";

export interface PersistedDay {
  count: number;
  lastSmokedAt: string | null;
}

export interface PersistedState {
  goal: number;
  days: Record<string, PersistedDay>;
}

export const EMPTY_STATE: PersistedState = { goal: DEFAULT_GOAL, days: {} };

type Listener = (state: PersistedState) => void;

const listeners = new Set<Listener>();

function hasStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Safari en navigation privée expose localStorage mais lève à l'écriture.
    const probe = "__smokertrack_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function sanitize(raw: unknown): PersistedState {
  if (typeof raw !== "object" || raw === null) return EMPTY_STATE;
  const candidate = raw as Partial<PersistedState>;
  const days: Record<string, PersistedDay> = {};

  if (candidate.days && typeof candidate.days === "object") {
    for (const [key, value] of Object.entries(candidate.days)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Partial<PersistedDay>;
      days[key] = {
        count: clampCount(Number(entry.count ?? 0)),
        lastSmokedAt: typeof entry.lastSmokedAt === "string" ? entry.lastSmokedAt : null,
      };
    }
  }

  return { goal: clampGoal(Number(candidate.goal ?? DEFAULT_GOAL)), days };
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function readState(): PersistedState {
  if (!hasStorage()) return EMPTY_STATE;

  const current = parseJson(window.localStorage.getItem(STORAGE_KEY));
  if (current) return sanitize(current);

  // Reprise en douceur des données de l'ancienne version « démo ».
  const legacy = parseJson(window.localStorage.getItem(LEGACY_KEY));
  if (legacy) {
    const migrated = sanitize(legacy);
    writeState(migrated);
    window.localStorage.removeItem(LEGACY_KEY);
    return migrated;
  }

  return EMPTY_STATE;
}

function writeState(state: PersistedState): void {
  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota dépassé ou stockage bloqué : on continue en mémoire.
    }
  }
  listeners.forEach((listener) => listener(state));
}

/** Remplace l'intégralité de l'état (restauration d'une sauvegarde). */
export function replaceState(state: PersistedState): void {
  writeState(sanitize(state));
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

/** Construit un fichier de sauvegarde à partir de l'état courant. */
export function toBackup(state: PersistedState, now: Date = new Date()): BackupFile {
  return {
    format: "smokertrack-backup",
    version: 1,
    exportedAt: now.toISOString(),
    goal: state.goal,
    days: state.days,
  };
}

/**
 * Valide et normalise un fichier de sauvegarde importé.
 * Lève une erreur explicite si le fichier n'est pas reconnu.
 */
export function parseBackup(input: unknown): PersistedState {
  if (typeof input !== "object" || input === null) {
    throw new Error("Fichier de sauvegarde illisible.");
  }
  const candidate = input as Partial<BackupFile>;
  if (candidate.format !== "smokertrack-backup") {
    throw new Error("Ce fichier n'est pas une sauvegarde SmokeTracker.");
  }
  if (candidate.version !== 1) {
    throw new Error(`Version de sauvegarde non prise en charge : ${String(candidate.version)}.`);
  }
  if (!candidate.days || typeof candidate.days !== "object") {
    throw new Error("Sauvegarde incomplète : aucune journée trouvée.");
  }
  return sanitize({ goal: candidate.goal, days: candidate.days });
}

export function createLocalStore(): DailyLogStore {
  const timeZone = detectTimeZone();

  return {
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

      // Synchronisation entre onglets et avec la restauration d'une sauvegarde.
      const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) emit(readState());
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

      try {
        emit(readState());
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Lecture des données impossible"));
      }

      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },

    async increment(dayKey, delta, currentCount): Promise<void> {
      if (delta < 0 && currentCount <= 0) return;
      writeState(applyIncrement(readState(), dayKey, delta, new Date()));
    },

    async setGoal(goal): Promise<void> {
      writeState({ ...readState(), goal: clampGoal(goal) });
    },

    async deleteAll(): Promise<void> {
      // Effacement total : aucune donnée locale ne doit survivre.
      writeState(EMPTY_STATE);
    },
  };
}
