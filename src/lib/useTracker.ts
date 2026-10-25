"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  setAutoBackup,
  shouldAutoBackup,
  shouldRemindBackup,
} from "./localStore";
import { downloadBackup, downloadCsv, restoreBackup } from "./backup";
import { consumeWidgetAdditions, syncWidgetState } from "./widgetBridge";
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
  /** Dernière cigarette fumée aujourd'hui uniquement (base du compte à rebours). */
  lastSmokedToday: Date | null;
  pending: boolean;
  needsBackupExport: boolean;
  autoBackup: boolean;
  autoBackupDone: boolean;
  setAutoBackupEnabled: (enabled: boolean) => void;
  add: () => Promise<void>;
  undo: () => Promise<void>;
  /** Corrige une journée passée (ou du jour) de ±1. */
  adjustDay: (date: string, delta: 1 | -1, currentCount: number) => Promise<void>;
  updateGoal: (goal: number) => Promise<void>;
  eraseAll: () => Promise<void>;
  exportBackup: () => void;
  /** Exporte l'historique au format CSV (tableur), sans toucher au rappel de sauvegarde. */
  exportCsv: () => void;
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
  const [autoBackup, setAutoBackupState] = useState(true);
  const [autoBackupDone, setAutoBackupDone] = useState(false);

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

  // Rappel et sauvegarde automatique : recalculés à chaque changement de données.
  useEffect(() => {
    if (!snapshot) return;
    const state = readState();
    const meta = readMeta();
    setAutoBackupState(meta.autoBackup);
    setNeedsBackupExport(shouldRemindBackup(state, meta));

    if (!shouldAutoBackup(state, meta)) return;
    // Une seule tentative par session : un téléchargement surprise à chaque
    // ouverture serait insupportable.
    if (sessionStorage.getItem("smokertrack.autoExported")) return;
    sessionStorage.setItem("smokertrack.autoExported", "1");

    try {
      downloadBackup(new Date(), true);
      setAutoBackupDone(true);
      setNeedsBackupExport(false);
    } catch {
      // Silencieux : le bandeau de rappel prendra le relais.
    }
  }, [snapshot]);

  // Ajouts effectués depuis le widget Android : fusionnés une fois au démarrage,
  // puis à chaque retour au premier plan (le widget peut être utilisé pendant
  // que l'application est en arrière-plan).
  const widgetMergeDone = useRef(false);
  useEffect(() => {
    // La clé du jour est calculée à chaque fusion : après un passage à minuit,
    // les cigarettes ajoutées depuis le widget doivent tomber sur le *nouveau*
    // jour, et non sur celui en vigueur au montage.
    const merge = async () => {
      const currentKey = dayKey();
      const { pending: pendingFromWidget, lastSmokedAt: widgetAt } =
        await consumeWidgetAdditions();
      if (pendingFromWidget <= 0) return;

      // On conserve l'heure réelle du widget (la cigarette a pu être fumée
      // plusieurs heures avant l'ouverture de l'application), sauf si elle
      // appartient déjà à la veille.
      const at = widgetAt && dayKey(widgetAt) === currentKey ? widgetAt : undefined;
      await store.increment(currentKey, pendingFromWidget, 0, true, at);
    };

    // Fusion initiale : une seule fois par vie de l'application.
    if (!widgetMergeDone.current) {
      widgetMergeDone.current = true;
      void merge();
    }

    // Puis à chaque retour au premier plan — et ce, *y compris après minuit* :
    // l'écouteur est réinstallé à chaque exécution de l'effet sans être
    // conditionné au premier montage.
    const onVisible = () => {
      if (document.visibilityState === "visible") void merge();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [store]);

  const lastSmokedAt = useMemo(() => {
    const dates = (snapshot?.entries ?? [])
      .map((entry) => entry.lastSmokedAt)
      .filter((value): value is Date => value instanceof Date);
    if (dates.length === 0) return null;
    return dates.reduce((latest, value) => (value > latest ? value : latest));
  }, [snapshot]);

  // Horodatage de la dernière cigarette **du jour** : seul point de départ
  // valable pour le compte à rebours (cf. `nextCigaretteForDay`).
  const lastSmokedToday = useMemo(() => {
    const today = (snapshot?.entries ?? []).find((entry) => entry.date === todayKey);
    return today?.lastSmokedAt ?? null;
  }, [snapshot, todayKey]);

  // Le widget affiche le compteur, l'heure de la dernière cigarette et le
  // compte à rebours : on le tient à jour à chaque changement.
  useEffect(() => {
    if (!snapshot) return;
    void syncWidgetState({
      todayKey,
      count: stats.today,
      goal: stats.goal,
      lastSmokedAt: lastSmokedToday,
    });
  }, [snapshot, todayKey, stats.today, stats.goal, lastSmokedToday]);

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

  const setAutoBackupEnabled = useCallback((enabled: boolean) => {
    setAutoBackup(enabled);
    setAutoBackupState(enabled);
  }, []);

  const exportBackupNow = useCallback(() => {
    try {
      downloadBackup();
      setNeedsBackupExport(false);
      setError(null);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export impossible.");
    }
  }, []);

  const exportCsvNow = useCallback(() => {
    try {
      downloadCsv();
      setError(null);
    } catch (csvError) {
      setError(csvError instanceof Error ? csvError.message : "Export CSV impossible.");
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
    lastSmokedToday,
    pending,
    needsBackupExport,
    autoBackup,
    autoBackupDone,
    setAutoBackupEnabled,
    add,
    undo,
    adjustDay,
    updateGoal,
    eraseAll,
    exportBackup: exportBackupNow,
    exportCsv: exportCsvNow,
    importBackup: importBackupFile,
  };
}
