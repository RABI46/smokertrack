"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppBadge from "./AppBadge";
import CounterCard from "./CounterCard";
import HistoryList from "./HistoryList";
import InstallPrompt from "./InstallPrompt";
import NativeShell from "./NativeShell";
import QuickAddHandler from "./QuickAddHandler";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";
import SettingsCard from "./SettingsCard";
import Skeleton from "./Skeleton";
import StatsGrid from "./StatsGrid";
import WeeklyChart from "./WeeklyChart";
import WidgetHelp from "./WidgetHelp";
import { FlameIcon, ShieldIcon } from "./icons";
import { requestPersistentStorage } from "@/lib/persistence";
import { useTracker } from "@/lib/useTracker";
import styles from "./tracker.module.css";

export default function TrackerApp() {
  const tracker = useTracker();
  const [mounted, setMounted] = useState(false);

  // Rendu après montage uniquement : le fuseau horaire et la clé du jour ne
  // sont connus que dans le navigateur (évite tout décalage d'hydratation).
  useEffect(() => {
    setMounted(true);
    // Limite le risque de purge des données par le navigateur.
    void requestPersistentStorage();
  }, []);

  if (!mounted || tracker.status === "loading") {
    return <Skeleton />;
  }

  const handleErase = () => {
    const confirmed = window.confirm(
      "Effacer définitivement toutes vos données de consommation ? Cette action est irréversible : exportez d'abord une sauvegarde si nécessaire.",
    );
    if (confirmed) void tracker.eraseAll();
  };

  return (
    <div className={styles.shell}>
      <NativeShell />
      <ServiceWorkerRegistration />
      <AppBadge count={tracker.stats.today} />
      <QuickAddHandler onAdd={() => void tracker.add()} />

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
        <div className={styles.headerActions}>
          <span className={styles.badge}>
            <ShieldIcon /> Sur cet appareil
          </span>
          <InstallPrompt />
        </div>
      </header>

      {tracker.error ? (
        <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
          <span>{tracker.error}</span>
        </div>
      ) : null}

      {tracker.autoBackupDone ? (
        <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
          <span>
            <strong>Sauvegarde automatique effectuée.</strong> Un fichier JSON vient d&apos;être
            téléchargé : conservez-le pour pouvoir restaurer vos données.
          </span>
        </div>
      ) : null}

      {tracker.needsBackupExport ? (
        <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
          <span>
            <strong>Sauvegarde recommandée.</strong> Vos données vivent uniquement dans ce
            navigateur : un export JSON les protège d&apos;une suppression involontaire.
          </span>
          <button
            type="button"
            className={`${styles.ghostButton} ${styles.smallButton}`}
            onClick={() => tracker.exportBackup()}
          >
            Exporter maintenant
          </button>
        </div>
      ) : null}

      <CounterCard
        stats={tracker.stats}
        todayKey={tracker.todayKey}
        timeZone={tracker.timeZone}
        lastSmokedAt={tracker.lastSmokedAt}
        lastSmokedToday={tracker.lastSmokedToday}
        pending={tracker.pending}
        onAdd={() => void tracker.add()}
        onUndo={() => void tracker.undo()}
      />

      <StatsGrid series={tracker.series} stats={tracker.stats} />

      <WeeklyChart series={tracker.series} goal={tracker.stats.goal} todayKey={tracker.todayKey} />

      <HistoryList
        series={tracker.series}
        goal={tracker.stats.goal}
        todayKey={tracker.todayKey}
        pending={tracker.pending}
        onAdjust={(date, delta, currentCount) => void tracker.adjustDay(date, delta, currentCount)}
      />

      <WidgetHelp />

      <SettingsCard
        goal={tracker.stats.goal}
        pending={tracker.pending}
        autoBackup={tracker.autoBackup}
        onChangeGoal={(goal) => void tracker.updateGoal(goal)}
        onToggleAutoBackup={tracker.setAutoBackupEnabled}
        onEraseAll={handleErase}
        onExport={() => tracker.exportBackup()}
        onImport={(file) => void tracker.importBackup(file)}
      />

      <footer className={styles.footer}>
        <span>
          Données locales, sans compte — <Link href="/confidentialite">confidentialité</Link>
        </span>
        <span>SmokeTracker v1.5.0</span>
      </footer>
    </div>
  );
}
