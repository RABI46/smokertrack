/** Types partagés du domaine et du magasin de données. */

/** Consommation agrégée d'une journée (clé locale `YYYY-MM-DD`). */
export interface DayEntry {
  date: string;
  count: number;
  /** Horodatage de la dernière cigarette de la journée. */
  lastSmokedAt: Date | null;
}

/** Photo complète affichée par l'application. */
export interface TrackerSnapshot {
  /** Fenêtre glissante triée du plus ancien au plus récent. */
  entries: DayEntry[];
  /** Objectif quotidien de cigarettes. */
  goal: number;
  /** Fuseau utilisé pour déterminer « aujourd'hui ». */
  timeZone: string;
}

/**
 * L'application est « local-first » : les données vivent dans le navigateur de
 * l'utilisateur, sans serveur ni compte. Cette interface isole la persistance
 * pour pouvoir, plus tard, ajouter une synchronisation sans toucher à l'UI.
 */
export interface DailyLogStore {
  /** Abonne l'appelant à la fenêtre de jours demandée. Retourne un désabonnement. */
  subscribe(
    dayKeys: string[],
    onSnapshot: (snapshot: TrackerSnapshot) => void,
    onError: (error: Error) => void,
  ): () => void;
  /**
   * Incrémente (ou décrémente) une journée. `currentCount` sert de garde-fou bas.
   * `isToday = false` permet de corriger un jour passé sans toucher à l'heure de
   * la dernière cigarette.
   */
  increment(
    dayKey: string,
    delta: 1 | -1,
    currentCount: number,
    isToday?: boolean,
  ): Promise<void>;
  setGoal(goal: number): Promise<void>;
  /** Suppression totale des données personnelles. */
  deleteAll(): Promise<void>;
}

/** Format de sauvegarde exporté en JSON. */
export interface BackupFile {
  format: "smokertrack-backup";
  version: 1;
  exportedAt: string;
  goal: number;
  days: Record<string, { count: number; lastSmokedAt: string | null }>;
}
