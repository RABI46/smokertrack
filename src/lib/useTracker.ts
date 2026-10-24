"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_GOAL,
  buildSeries,
  computeStats,
  type DailyStats,
  type SeriesPoint,
} from "./domain";
import { dayKey, lastDayKeys } from "./date";
import {
  createLocalStore,
  readMeta,
  readState,
  shouldRemindBackup,
} from "./localStore";
import { downloadBackup, restoreBackup } from "./backup";
import type { TrackerSnapshot } from "./types";

/** Profondeur d'historique conservée et observable. */
export const WINDOW_DAYS = 30;

export type TrackerStatus = "loading" | "ready" | "error";

export interface TrackerApi {
  status: TrackerStatus;
  error: string | null;
  timeZone: string;
  todayKey: string;
  dayKeys: string[];
  series: SeriesPoint[];
  stats: DailyStats;
  lastSmokedAt: Date | null;
  pending: boolean;
  needsBackupExport: boolean;
  add: () => Promise<void>;
  undo: () => Promise<void>;
  /** Corrige une journée passée (ou du jour) de ±1. */
  adjustDay: (date: string, delta: 1 | -1, currentCount: number) => Promise<void>;
  updateGoal: (goal: number) => Promise<void>;
  eraseAll: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<void>;
}

export function useTracker(): TrackerApi {
  // La clé du jour est recalculée périodiquement : l'interface bascule d'elle-même
  // à minuit sans rechargement.
  const [todayKey, setTodayKey] = useState(() => dayKey());

  useEffect(() => {
    const timer = window.setInterval(() => setTodayKey(dayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const dayKeys = useMemo(() => lastDayKeys(WINDOW_DAYS, todayKey), [todayKey]);
  const store = useMemo(() => createLocalStore(), []);

  const [snapshot, setSnapshot] = useState<TrackerSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsBackupExport, setNeedsBackupExport] = useState(false);

  useEffect(() => {
    setSnapshot(null);
    setError(null);
    return store.subscribe(
      dayKeys,
      (next) => setSnapshot(next),
      (nextError) => setError(nextError.message),
    );
  }, [store, dayKeys]);

  const series = useMemo(
    () => buildSeries(dayKeys, snapshot?.entries ?? []),
    [dayKeys, snapshot],
  );

  const goal = snapshot?.goal ?? DEFAULT_GOAL;
  const stats = useMemo(() => computeStats(series, goal), [series, goal]);

  // Rappel de sauvegarde : recalculé à chaque changement de données.
  useEffect(() => {
    if (!snapshot) return;
    setNeedsBackupExport(shouldRemindBackup(readState(), readMeta()));
  }, [snapshot]);

  const lastSmokedAt = useMemo(() => {
    const dates = (snapshot?.entries ?? [])
      .map((entry) => entry.lastSmokedAt)
      .filter((value): value is Date => value instanceof Date);
    if (dates.length === 0) return null;
    return dates.reduce((latest, value) => (value > latest ? value : latest));
  }, [snapshot]);

  const todayCount = stats.today;

  const withPending = useCallback(async (action: () => Promise<void>) => {
    setPending(true);
    try {
      await action();
      setError(null);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Enregistrement impossible.",
      );
    } finally {
      setPending(false);
    }
  }, []);

  const add = useCallback(
    () => withPending(() => store.increment(todayKey, 1, todayCount, true)),
    [store, todayKey, todayCount, withPending],
  );

  const undo = useCallback(() => {
    const lastNonEmpty = [...series].reverse().find((point) => point.count > 0);
    if (!lastNonEmpty) return Promise.resolve();
    return withPending(() =>
      store.increment(lastNonEmpty.date, -1, lastNonEmpty.count, lastNonEmpty.date === todayKey),
    );
  }, [series, store, todayKey, withPending]);

  const adjustDay = useCallback(
    (date: string, delta: 1 | -1, currentCount: number) =>
      withPending(() => store.increment(date, delta, currentCount, date === todayKey)),
    [store, todayKey, withPending],
  );

  const updateGoal = useCallback(
    (nextGoal: number) => withPending(() => store.setGoal(nextGoal)),
    [store, withPending],
  );

  const eraseAll = useCallback(() => withPending(() => store.deleteAll()), [store, withPending]);

  const exportBackupNow = useCallback(() => {
    try {
      downloadBackup();
      setNeedsBackupExport(false);
      setError(null);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export impossible.");
    }
  }, []);

  const importBackupFile = useCallback(
    (file: File) => withPending(() => restoreBackup(file)),
    [withPending],
  );

  const status: TrackerStatus =
    error !== null && snapshot === null ? "error" : snapshot === null ? "loading" : "ready";

  return {
    status,
    error,
    timeZone: snapshot?.timeZone ?? "UTC",
    todayKey,
    dayKeys,
    series,
    stats,
    lastSmokedAt,
    pending,
    needsBackupExport,
    add,
    undo,
    adjustDay,
    updateGoal,
    eraseAll,
    exportBackup: exportBackupNow,
    importBackup: importBackupFile,
  };
}
