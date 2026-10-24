"use client";

import { sum, takeLast, takePrevious, trendPercent } from "@/lib/domain";
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
  const lastSevenAverage =
    lastSeven.length > 0 ? Math.round((lastSevenTotal / lastSeven.length) * 10) / 10 : 0;

  return (
    <section className={styles.card} aria-labelledby="tendances-titre">
      <h2 className={styles.sectionTitle} id="tendances-titre">
        Tendances
      </h2>
      <p className={styles.sectionHint}>Fenêtre de 30 jours, comparée aux 7 jours précédents.</p>

      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Moyenne 7 jours</span>
          <span className={styles.statValue}>{lastSevenAverage}</span>
          <Trend current={lastSevenTotal} previous={previousSevenTotal} />
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total 30 jours</span>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statTrend}>sur {series.length} jours suivis</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Jours dans l&apos;objectif</span>
          <span className={styles.statValue}>
            {stats.daysOnTarget}
            <span className={styles.statTrend}> / {series.length}</span>
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
            {stats.streak > 0 ? "jours consécutifs dans l'objectif" : "à relancer aujourd'hui"}
          </span>
        </div>
      </div>
    </section>
  );
}
