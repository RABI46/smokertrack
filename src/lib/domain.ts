/** Règles métier pures, sans dépendance à React ni à Firebase (testables). */
import type { DayEntry } from "./types";

export const DEFAULT_GOAL = 10;
export const MIN_GOAL = 1;
export const MAX_GOAL = 100;
/** Plafond de sécurité : au-delà, il s'agit d'une erreur de saisie. */
export const MAX_COUNT = 200;

export interface SeriesPoint {
  date: string;
  count: number;
}

export interface DailyStats {
  /** Total sur la fenêtre observée. */
  total: number;
  /** Moyenne par jour sur la fenêtre (1 décimale). */
  average: number;
  /** Journée la plus légère de la fenêtre. */
  best: number;
  /** Journée la plus chargée de la fenêtre. */
  worst: number;
  /** Nombre de jours sous ou égaux à l'objectif. */
  daysOnTarget: number;
  /** Série de jours consécutifs (en fin de fenêtre) dans l'objectif. */
  streak: number;
  /** Consommation du jour (dernier point). */
  today: number;
  /** Objectif quotidien appliqué. */
  goal: number;
  /** Jours restants par rapport à l'objectif (négatif = dépassement). */
  remaining: number;
  /** Progression vers l'objectif, bornée entre 0 et 1. */
  progress: number;
}

export function clampGoal(goal: number): number {
  if (!Number.isFinite(goal)) return DEFAULT_GOAL;
  return Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(goal)));
}

export function clampCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.min(MAX_COUNT, Math.max(0, Math.round(count)));
}

/** Aligne les entrées reçues sur la liste de clés demandée (jours manquants = 0). */
export function buildSeries(dayKeys: string[], entries: DayEntry[]): SeriesPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry.count]));
  return dayKeys.map((date) => ({ date, count: clampCount(byDate.get(date) ?? 0) }));
}

/**
 * Calcule les statistiques d'une série triée du plus ancien au plus récent.
 * Une fenêtre vide renvoie des zéros plutôt que `NaN`.
 */
export function computeStats(series: SeriesPoint[], goal: number): DailyStats {
  const safeGoal = clampGoal(goal);

  if (series.length === 0) {
    return {
      total: 0,
      average: 0,
      best: 0,
      worst: 0,
      daysOnTarget: 0,
      streak: 0,
      today: 0,
      goal: safeGoal,
      remaining: safeGoal,
      progress: 0,
    };
  }

  const counts = series.map((point) => clampCount(point.count));
  const total = counts.reduce((sum, value) => sum + value, 0);
  const today = counts[counts.length - 1] ?? 0;

  let streak = 0;
  for (let index = counts.length - 1; index >= 0; index -= 1) {
    if ((counts[index] ?? 0) <= safeGoal) streak += 1;
    else break;
  }

  return {
    total,
    average: Math.round((total / counts.length) * 10) / 10,
    best: Math.min(...counts),
    worst: Math.max(...counts),
    daysOnTarget: counts.filter((value) => value <= safeGoal).length,
    streak,
    today,
    goal: safeGoal,
    remaining: safeGoal - today,
    progress: Math.min(1, today / safeGoal),
  };
}

/** Message d'encouragement, déterministe, selon la position du jour. */
export function encouragement(stats: DailyStats): string {
  if (stats.today === 0) return "Journée vierge : le meilleur départ possible.";
  if (stats.remaining > 0) return `Encore ${stats.remaining} cigarette${stats.remaining > 1 ? "s" : ""} dans l'objectif.`;
  if (stats.remaining === 0) return "Objectif du jour tout juste atteint.";
  const excess = Math.abs(stats.remaining);
  return `Objectif dépassé de ${excess} cigarette${excess > 1 ? "s" : ""}.`;
}

/** Variation en pourcentage entre deux fenêtres ; `null` si la base est nulle. */
export function trendPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Somme d'une série. */
export function sum(series: SeriesPoint[]): number {
  return series.reduce((total, point) => total + point.count, 0);
}

/** Tranche les `count` derniers points d'une série. */
export function takeLast(series: SeriesPoint[], count: number): SeriesPoint[] {
  if (count <= 0) return [];
  return series.slice(Math.max(0, series.length - count));
}

/** Tranche les `count` points précédant les `offset` derniers. */
export function takePrevious(series: SeriesPoint[], count: number, offset: number): SeriesPoint[] {
  const end = Math.max(0, series.length - offset);
  return series.slice(Math.max(0, end - count), end);
}
