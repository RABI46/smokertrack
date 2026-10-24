/** Types partagés du domaine et des magasins de données. */

/** Consommation agrégée d'une journée (clé locale `YYYY-MM-DD`). */
export interface DayEntry {
  date: string;
  count: number;
  /** Horodatage serveur de la dernière cigarette de la journée. */
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

export type StoreMode = "firebase" | "demo";

/** Magasin de consommation : implémenté pour Firestore et pour la démo locale. */
export interface DailyLogStore {
  readonly mode: StoreMode;
  /** Abonne l'appelant à la fenêtre de jours demandée. Retourne un désabonnement. */
  subscribe(
    dayKeys: string[],
    onSnapshot: (snapshot: TrackerSnapshot) => void,
    onError: (error: Error) => void,
  ): () => void;
  /** Incrémente (ou décrémente) la journée. `currentCount` sert de garde-fou bas. */
  increment(dayKey: string, delta: 1 | -1, currentCount: number): Promise<void>;
  setGoal(goal: number): Promise<void>;
  /** Suppression totale des données personnelles (droit à l'effacement). */
  deleteAll(dayKeys: string[]): Promise<void>;
}
