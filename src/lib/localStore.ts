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
/** Métadonnées d'usage : dernière sauvegarde exportée. */
const META_KEY = "smokertrack.meta.v1";
/** Au-delà de ce délai, on rappelle à l'utilisateur d'exporter une sauvegarde. */
export const BACKUP_REMINDER_DAYS = 14;

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

export interface StoreMeta {
  lastExportAt: string | null;
}

export function readMeta(): StoreMeta {
  if (!hasStorage()) return { lastExportAt: null };
  const raw = parseJson(window.localStorage.getItem(META_KEY));
  if (typeof raw !== "object" || raw === null) return { lastExportAt: null };
  const value = (raw as Partial<StoreMeta>).lastExportAt;
  return { lastExportAt: typeof value === "string" ? value : null };
}

/** Enregistre la date du dernier export (appelé après un téléchargement réussi). */
export function markExported(now: Date = new Date()): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify({ lastExportAt: now.toISOString() }));
  } catch {
    // Sans importance : le rappel sera simplement réaffiché.
  }
}

/**
 * Faut-il rappeler d'exporter une sauvegarde ?
 * Uniquement si des données existent (au moins une cigarette) et qu'aucun export
 * n'a eu lieu dans les `BACKUP_REMINDER_DAYS` derniers jours.
 */
export function shouldRemindBackup(
  state: PersistedState,
  meta: StoreMeta,
  now: Date = new Date(),
): boolean {
  const hasData = Object.values(state.days).some((day) => day.count > 0);
  if (!hasData) return false;
  if (!meta.lastExportAt) return true;
  const last = new Date(meta.lastExportAt).getTime();
  if (Number.isNaN(last)) return true;
  const elapsedDays = (now.getTime() - last) / 86_400_000;
  return elapsedDays >= BACKUP_REMINDER_DAYS;
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

/**
 * Écriture pure d'une journée, réutilisée par les tests.
 * `isToday = false` sert à corriger un jour passé : on ne modifie alors pas
 * l'heure de la dernière cigarette (elle appartient au passé).
 */
export function applyIncrement(
  state: PersistedState,
  dayKey: string,
  delta: 1 | -1,
  now: Date,
  isToday = true,
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
        lastSmokedAt:
          isAdd && isToday ? now.toISOString() : (state.days[dayKey]?.lastSmokedAt ?? null),
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

    async increment(dayKey, delta, currentCount, isToday = true): Promise<void> {
      if (delta < 0 && currentCount <= 0) return;
      writeState(applyIncrement(readState(), dayKey, delta, new Date(), isToday));
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
