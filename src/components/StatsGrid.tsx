"use client";

import { countTracked, sum, takeLast, takePrevious, trendPercent } from "@/lib/domain";
import type { DailyStats, SeriesPoint } from "@/lib/domain";
import styles from "./tracker.module.css";

interface StatsGridProps {
  series: SeriesPoint[];
  stats: DailyStats;
}

function Trend({ current, previous }: { current: number; previous: number }) {
  const percent = trendPercent(current, previous);

  if (percent === null) {
    return <span className={styles.statTrend}>pas de comparaison</span>;
  }

  const improving = percent <= 0;
  return (
    <span className={`${styles.statTrend} ${improving ? styles.trendDown : styles.trendUp}`}>
      {improving ? "↓" : "↑"} {Math.abs(percent)} % vs semaine précédente
    </span>
  );
}

export default function StatsGrid({ series, stats }: StatsGridProps) {
  const lastSeven = takeLast(series, 7);
  const previousSeven = takePrevious(series, 7, 7);
  const lastSevenTotal = sum(lastSeven);
  const previousSevenTotal = sum(previousSeven);
  const lastSevenTracked = countTracked(lastSeven);
  const lastSevenAverage =
    lastSevenTracked > 0 ? Math.round((lastSevenTotal / lastSevenTracked) * 10) / 10 : 0;

  const nothingTracked = stats.trackedDays === 0;

  return (
    <section className={styles.card} aria-labelledby="tendances-titre">
      <h2 className={styles.sectionTitle} id="tendances-titre">
        Tendances
      </h2>
      <p className={styles.sectionHint}>
        Calculs limités aux jours réellement suivis — les jours antérieurs au début du suivi ne
        sont pas comptés.
      </p>

      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Moyenne 7 jours</span>
          <span className={styles.statValue}>{lastSevenAverage}</span>
          {lastSevenTracked >= 2 ? (
            <Trend current={lastSevenTotal} previous={previousSevenTotal} />
          ) : (
            <span className={styles.statTrend}>
              {lastSevenTracked === 0 ? "aucune donnée" : "en cours de semaine"}
            </span>
          )}
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total 30 jours</span>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statTrend}>
            {stats.trackedDays === 0
              ? "aucun jour suivi pour l'instant"
              : `sur ${stats.trackedDays} jour${stats.trackedDays > 1 ? "s" : ""} suivi${stats.trackedDays > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Jours dans l&apos;objectif</span>
          <span className={styles.statValue}>
            {stats.daysOnTarget}
            <span className={styles.statTrend}> / {stats.trackedDays}</span>
          </span>
          <span className={styles.statTrend}>objectif {stats.goal} / jour</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Série en cours</span>
          <span className={styles.statValue}>
            {stats.streak}
            <span className={styles.statTrend}> j</span>
          </span>
          <span className={styles.statTrend}>
            {nothingTracked
              ? "commencez votre suivi"
              : stats.streak > 0
                ? "jours consécutifs dans l'objectif"
                : "à relancer aujourd'hui"}
          </span>
        </div>
      </div>
    </section>
  );
}
