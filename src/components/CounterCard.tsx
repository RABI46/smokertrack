"use client";

import { encouragement } from "@/lib/domain";
import { formatLongDate, formatRelativeTime } from "@/lib/date";
import type { DailyStats } from "@/lib/domain";
import NextCigarette from "./NextCigarette";
import { PlusIcon, UndoIcon } from "./icons";
import styles from "./tracker.module.css";

interface CounterCardProps {
  stats: DailyStats;
  todayKey: string;
  timeZone: string;
  /** Dernière cigarette, toutes journées confondues (affichage « Dernière : … »). */
  lastSmokedAt: Date | null;
  /** Dernière cigarette du jour seulement (base du compte à rebours). */
  lastSmokedToday: Date | null;
  pending: boolean;
  onAdd: () => void;
  onUndo: () => void;
}

export default function CounterCard({
  stats,
  todayKey,
  timeZone,
  lastSmokedAt,
  lastSmokedToday,
  pending,
  onAdd,
  onUndo,
}: CounterCardProps) {
  const overGoal = stats.remaining < 0;
  const percentage = Math.round(stats.progress * 100);

  return (
    <section className={`${styles.card} ${styles.hero}`} aria-labelledby="compteur-titre">
      <div className={styles.heroHeader}>
        <div>
          <p className={styles.eyebrow} id="compteur-titre">
            Aujourd&apos;hui
          </p>
          <p className={styles.dayLabel}>{formatLongDate(todayKey)}</p>
        </div>
        {lastSmokedAt ? (
          <p className={styles.dayLabel}>
            Dernière : {formatRelativeTime(lastSmokedAt, todayKey, "fr-FR", timeZone)}
          </p>
        ) : null}
      </div>

      <div className={styles.counterRow}>
        {/* Le `key` remonte le span à chaque incrémentation : l'animation
            « pop » du compteur rejoue à chaque cigarette ajoutée. */}
        <span
          key={stats.today}
          className={styles.counter}
          aria-live="polite"
          aria-atomic="true"
        >
          {stats.today}
        </span>
        <span className={styles.counterUnit}>
          cigarette{stats.today > 1 ? "s" : ""}
        </span>
        <span className={styles.counterGoal}>objectif {stats.goal}</span>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={stats.goal}
        aria-valuenow={Math.min(stats.today, stats.goal)}
        aria-valuetext={`${stats.today} sur ${stats.goal} cigarettes`}
        aria-label="Progression vers l'objectif du jour"
      >
        <div
          className={`${styles.progressFill} ${overGoal ? styles.progressFillOver : ""}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <NextCigarette
        lastSmokedToday={lastSmokedToday}
        goal={stats.goal}
        todayKey={todayKey}
        timeZone={timeZone}
      />

      <p className={styles.hint}>{encouragement(stats)}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onAdd}
          aria-busy={pending}
          aria-label="Ajouter une cigarette à aujourd'hui"
        >
          <PlusIcon />
          Ajouter une cigarette
        </button>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={onUndo}
          disabled={stats.total === 0}
          aria-label="Annuler la dernière cigarette enregistrée"
        >
          <UndoIcon />
          Annuler
        </button>
      </div>
    </section>
  );
}
