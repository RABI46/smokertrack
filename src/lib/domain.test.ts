import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOAL,
  buildSeries,
  clampCount,
  countTracked,
  clampGoal,
  computeStats,
  encouragement,
  formatDuration,
  nextCigarette,
  nextCigaretteForDay,
  spacingMs,
  sum,
  takeLast,
  takePrevious,
  trendPercent,
  type SeriesPoint,
} from "./domain";
import type { DayEntry } from "./types";

const series = (counts: number[]): SeriesPoint[] =>
  counts.map((count, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    count,
    tracked: true,
  }));

/** Série dont certains jours ne sont pas suivis (antérieurs à l'installation). */
const mixedSeries = (points: Array<number | null>): SeriesPoint[] =>
  points.map((count, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    count: count ?? 0,
    tracked: count !== null,
  }));

describe("clampGoal", () => {
  it("borne l'objectif entre 1 et 100", () => {
    expect(clampGoal(0)).toBe(1);
    expect(clampGoal(-5)).toBe(1);
    expect(clampGoal(101)).toBe(100);
    expect(clampGoal(12.6)).toBe(13);
  });

  it("retombe sur la valeur par défaut si l'entrée est invalide", () => {
    expect(clampGoal(Number.NaN)).toBe(DEFAULT_GOAL);
    expect(clampGoal(Number.POSITIVE_INFINITY)).toBe(DEFAULT_GOAL);
  });
});

describe("clampCount", () => {
  it("borne entre 0 et 200", () => {
    expect(clampCount(-3)).toBe(0);
    expect(clampCount(500)).toBe(200);
    expect(clampCount(4.4)).toBe(4);
  });
});

describe("buildSeries", () => {
  it("aligne sur les clés demandées et complète les jours manquants par 0", () => {
    const entries: DayEntry[] = [
      { date: "2026-01-02", count: 5, lastSmokedAt: null, tracked: true },
      { date: "2026-01-04", count: 2, lastSmokedAt: null, tracked: true },
    ];
    const result = buildSeries(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"], entries);
    expect(result.map((point) => point.count)).toEqual([0, 5, 0, 2]);
  });

  it("ignore les entrées hors fenêtre", () => {
    const entries: DayEntry[] = [
      { date: "2025-12-31", count: 9, lastSmokedAt: null, tracked: true },
    ];
    expect(buildSeries(["2026-01-01"], entries)).toEqual([
      { date: "2026-01-01", count: 0, tracked: false },
    ]);
  });
});

describe("computeStats", () => {
  it("calcule total, moyenne et extrêmes", () => {
    const stats = computeStats(series([4, 8, 12, 6]), 10);
    expect(stats.total).toBe(30);
    expect(stats.average).toBe(7.5);
    expect(stats.best).toBe(4);
    expect(stats.worst).toBe(12);
    expect(stats.today).toBe(6);
    expect(stats.goal).toBe(10);
  });

  it("compte les jours dans l'objectif et la série en cours", () => {
    const stats = computeStats(series([20, 9, 10, 3]), 10);
    expect(stats.daysOnTarget).toBe(3);
    expect(stats.streak).toBe(3);
    expect(stats.remaining).toBe(7);
  });

  it("interrompt la série dès que l'objectif est dépassé", () => {
    expect(computeStats(series([2, 3, 11, 4]), 10).streak).toBe(1);
  });

  it("borne la progression à 1 en cas de dépassement", () => {
    const stats = computeStats(series([25]), 10);
    expect(stats.progress).toBe(1);
    expect(stats.remaining).toBe(-15);
  });

  it("renvoie des zéros sur une fenêtre vide (jamais NaN)", () => {
    const stats = computeStats([], 10);
    expect(stats).toMatchObject({ total: 0, average: 0, today: 0, progress: 0, streak: 0 });
    expect(Number.isNaN(stats.average)).toBe(false);
  });

  it("neutralise un objectif invalide", () => {
    expect(computeStats(series([3]), 0).goal).toBe(1);
  });
});

describe("encouragement", () => {
  it("varie selon la position du jour", () => {
    expect(encouragement(computeStats(series([0]), 10))).toContain("Journée vierge");
    expect(encouragement(computeStats(series([3]), 10))).toContain("Encore 7");
    expect(encouragement(computeStats(series([10]), 10))).toContain("tout juste atteint");
    expect(encouragement(computeStats(series([12]), 10))).toContain("dépassé de 2");
  });
});

describe("trendPercent", () => {
  it("calcule une variation signée", () => {
    expect(trendPercent(50, 100)).toBe(-50);
    expect(trendPercent(150, 100)).toBe(50);
  });

  it("renvoie null sans base de comparaison", () => {
    expect(trendPercent(10, 0)).toBeNull();
  });
});

describe("utilitaires de séries", () => {
  it("sum additionne les points", () => {
    expect(sum(series([1, 2, 3]))).toBe(6);
  });

  it("takeLast conserve la fin de série", () => {
    expect(takeLast(series([1, 2, 3, 4]), 2).map((point) => point.count)).toEqual([3, 4]);
    expect(takeLast(series([1]), 0)).toEqual([]);
  });

  it("takePrevious renvoie la fenêtre juste avant", () => {
    expect(takePrevious(series([1, 2, 3, 4, 5]), 2, 2).map((point) => point.count)).toEqual([2, 3]);
  });

  it("takePrevious ne déborde pas au début de la série", () => {
    expect(takePrevious(series([1, 2]), 5, 1).map((point) => point.count)).toEqual([1]);
  });
});

describe("computeStats — jours non suivis", () => {
  it("n'invente pas de statistiques sur une installation neuve", () => {
    const stats = computeStats(mixedSeries(Array(30).fill(null)), 10);
    expect(stats.trackedDays).toBe(0);
    expect(stats.daysOnTarget).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.best).toBe(0);
    expect(stats.worst).toBe(0);
    expect(stats.firstTrackedDate).toBeNull();
  });

  it("ignore les jours antérieurs dans la moyenne", () => {
    // 25 jours hors suivi puis 5 jours à 4 cigarettes : moyenne = 4, pas 0,7.
    const stats = computeStats(mixedSeries([...Array(25).fill(null), 4, 4, 4, 4, 4]), 10);
    expect(stats.average).toBe(4);
    expect(stats.trackedDays).toBe(5);
    expect(stats.total).toBe(20);
    expect(stats.firstTrackedDate).toBe("2026-01-26");
  });

  it("ne compte pas les jours hors suivi comme réussis", () => {
    const stats = computeStats(mixedSeries([...Array(27).fill(null), 2, 3, 4]), 10);
    expect(stats.daysOnTarget).toBe(3);
    expect(stats.trackedDays).toBe(3);
  });

  it("ignore un aujourd'hui non suivi mais conserve la série d'hier", () => {
    const stats = computeStats(mixedSeries([...Array(27).fill(null), 2, 3, null]), 10);
    expect(stats.streak).toBe(2);
  });

  it("interrompt la série sur un trou entre deux jours suivis", () => {
    const stats = computeStats(mixedSeries([2, null, 3, 4, 5]), 10);
    expect(stats.streak).toBe(3);
  });

  it("interrompt la série sur un dépassement", () => {
    const stats = computeStats(mixedSeries([2, 20, 3]), 10);
    expect(stats.streak).toBe(1);
  });

  it("expose la consommation du jour même non suivie", () => {
    const stats = computeStats(mixedSeries([...Array(29).fill(null), null]), 10);
    expect(stats.today).toBe(0);
    expect(stats.remaining).toBe(10);
  });
});

describe("countTracked", () => {
  it("compte uniquement les jours suivis", () => {
    expect(countTracked(mixedSeries([1, null, 3]))).toBe(2);
  });
});

describe("sum ignore les jours non suivis", () => {
  it("additionne seulement les jours suivis", () => {
    expect(sum(mixedSeries([5, null, 3]))).toBe(8);
  });
});

describe("spacingMs", () => {
  it("répartit l'objectif sur 16 h d'éveil", () => {
    // 16 h = 960 minutes ; objectif 10 → une cigarette toutes les 96 min.
    expect(spacingMs(10)).toBe(96 * 60_000);
    expect(spacingMs(20)).toBe(48 * 60_000);
    expect(spacingMs(1)).toBe(16 * 60 * 60_000);
  });

  it("borne les objectifs aberrants au lieu de produire NaN", () => {
    expect(spacingMs(0)).toBe(16 * 60 * 60_000); // ramené à l'objectif minimum
    expect(spacingMs(Number.NaN)).toBe(96 * 60_000); // objectif par défaut
    expect(spacingMs(10_000)).toBeGreaterThan(0);
  });
});

describe("nextCigarette", () => {
  const last = new Date("2026-10-24T14:00:00.000Z");

  it("renvoie null sans point de départ", () => {
    expect(nextCigarette(null, 10, last)).toBeNull();
    expect(nextCigarette(new Date(Number.NaN), 10, last)).toBeNull();
  });

  it("compte à rebours jusqu'à l'écart cible", () => {
    const now = new Date(last.getTime() + 30 * 60_000);
    const next = nextCigarette(last, 10, now);

    expect(next).not.toBeNull();
    expect(next?.remainingMs).toBe(66 * 60_000); // 96 - 30
    expect(next?.overdue).toBe(false);
    expect(next?.dueAt.toISOString()).toBe("2026-10-24T15:36:00.000Z");
  });

  it("signale le retard une fois le créneau dépassé", () => {
    const now = new Date(last.getTime() + 100 * 60_000);
    const next = nextCigarette(last, 10, now);

    expect(next?.overdue).toBe(true);
    expect(next?.remainingMs).toBe(-4 * 60_000);
  });

  it("atteint zéro pile à l'échéance", () => {
    const next = nextCigarette(last, 10, new Date("2026-10-24T15:36:00.000Z"));
    expect(next?.remainingMs).toBe(0);
    expect(next?.overdue).toBe(true);
  });
});

describe("nextCigaretteForDay", () => {
  it("ignore la cigarette de la veille", () => {
    const last = new Date("2026-10-23T22:10:00.000Z");
    const now = new Date("2026-10-24T08:00:00.000Z");

    // Sans cette garde, le widget afficherait « en retard de 10 h » au réveil.
    expect(nextCigaretteForDay(last, 10, "2026-10-24", now)).toBeNull();
    expect(nextCigaretteForDay(last, 10, "2026-10-23", now)).not.toBeNull();
  });

  it("accepte une cigarette du jour", () => {
    const last = new Date("2026-10-24T09:00:00.000Z");
    const now = new Date("2026-10-24T09:30:00.000Z");

    expect(nextCigaretteForDay(last, 10, "2026-10-24", now)?.overdue).toBe(false);
  });
});

describe("formatDuration", () => {
  it("reste lisible à toutes les échelles", () => {
    expect(formatDuration(45_000)).toBe("45 s");
    expect(formatDuration(30 * 60_000 + 5_000)).toBe("30 min 05 s");
    expect(formatDuration(96 * 60_000)).toBe("1 h 36 min");
  });

  it("ne produit jamais de valeur négative", () => {
    expect(formatDuration(-5_000)).toBe("0 s");
  });
});
