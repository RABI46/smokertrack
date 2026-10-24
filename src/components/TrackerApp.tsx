"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CounterCard from "./CounterCard";
import HistoryList from "./HistoryList";
import SettingsCard from "./SettingsCard";
import Skeleton from "./Skeleton";
import StatsGrid from "./StatsGrid";
import WeeklyChart from "./WeeklyChart";
import { FlameIcon } from "./icons";
import { useAuthUser } from "@/lib/useAuthUser";
import { useTracker } from "@/lib/useTracker";
import styles from "./tracker.module.css";

export default function TrackerApp() {
  const auth = useAuthUser();
  const tracker = useTracker(auth.user?.uid ?? null);
  const [mounted, setMounted] = useState(false);

  // Rendu après montage uniquement : le fuseau horaire et le fuseau du jour ne
  // sont connus que dans le navigateur (évite tout décalage d'hydratation).
  useEffect(() => setMounted(true), []);

  if (!mounted || auth.loading || tracker.status === "loading") {
    return <Skeleton />;
  }

  const handleErase = () => {
    const confirmed = window.confirm(
      "Effacer définitivement toutes vos données de consommation ? Cette action est irréversible.",
    );
    if (confirmed) void tracker.eraseAll();
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <FlameIcon />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>SmokeTracker</span>
            <span className={styles.brandSubtitle}>Suivi quotidien de consommation</span>
          </span>
        </div>
        <span className={`${styles.badge} ${tracker.mode === "demo" ? styles.badgeDemo : ""}`}>
          {tracker.mode === "demo" ? "Mode démo local" : "Synchronisé"}
        </span>
      </header>

      {tracker.mode === "demo" ? (
        <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
          <span>
            <strong>Mode démo.</strong> Firebase n&apos;est pas configuré : vos données restent
            dans ce navigateur. Renseignez les variables <code>NEXT_PUBLIC_FIREBASE_*</code> pour
            activer la synchronisation.
          </span>
        </div>
      ) : null}

      {tracker.error ? (
        <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
          <span>
            <strong>Problème de synchronisation.</strong> {tracker.error}
          </span>
          <button
            type="button"
            className={`${styles.ghostButton} ${styles.smallButton}`}
            onClick={() => void auth.signInAnonymously()}
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <CounterCard
        stats={tracker.stats}
        todayKey={tracker.todayKey}
        timeZone={tracker.timeZone}
        lastSmokedAt={tracker.lastSmokedAt}
        pending={tracker.pending}
        onAdd={() => void tracker.add()}
        onUndo={() => void tracker.undo()}
      />

      <StatsGrid series={tracker.series} stats={tracker.stats} />

      <WeeklyChart series={tracker.series} goal={tracker.stats.goal} todayKey={tracker.todayKey} />

      <HistoryList series={tracker.series} goal={tracker.stats.goal} todayKey={tracker.todayKey} />

      <SettingsCard
        goal={tracker.stats.goal}
        pending={tracker.pending}
        onChangeGoal={(goal) => void tracker.updateGoal(goal)}
        onEraseAll={handleErase}
      />

      <footer className={styles.footer}>
        <span>
          Données de santé — <Link href="/confidentialite">confidentialité</Link>
        </span>
        <span>SmokeTracker v0.2.0</span>
      </footer>
    </div>
  );
}
