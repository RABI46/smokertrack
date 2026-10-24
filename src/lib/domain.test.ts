import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOAL,
  buildSeries,
  clampCount,
  clampGoal,
  computeStats,
  encouragement,
  sum,
  takeLast,
  takePrevious,
  trendPercent,
  type SeriesPoint,
} from "./domain";
import type { DayEntry } from "./types";

const series = (counts: number[]): SeriesPoint[] =>
  counts.map((count, index) => ({ date: `2026-01-${String(index + 1).padStart(2, "0")}`, count }));

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
      { date: "2026-01-02", count: 5, lastSmokedAt: null },
      { date: "2026-01-04", count: 2, lastSmokedAt: null },
    ];
    const result = buildSeries(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"], entries);
    expect(result.map((point) => point.count)).toEqual([0, 5, 0, 2]);
  });

  it("ignore les entrées hors fenêtre", () => {
    const entries: DayEntry[] = [{ date: "2025-12-31", count: 9, lastSmokedAt: null }];
    expect(buildSeries(["2026-01-01"], entries)).toEqual([{ date: "2026-01-01", count: 0 }]);
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
