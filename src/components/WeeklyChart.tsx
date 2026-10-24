"use client";

import { formatDayLabel } from "@/lib/date";
import { takeLast, type SeriesPoint } from "@/lib/domain";
import styles from "./tracker.module.css";

interface WeeklyChartProps {
  series: SeriesPoint[];
  goal: number;
  todayKey: string;
}

/**
 * Histogramme CSS sur 7 jours. Rendu 100 % HTML/CSS (pas de canvas, pas de lib
 * de graphiques) : léger, accessible et lisible sans JavaScript complexe.
 */
export default function WeeklyChart({ series, goal, todayKey }: WeeklyChartProps) {
  const lastSeven = takeLast(series, 7);
  const tracked = lastSeven.filter((point) => point.tracked);
  const max = Math.max(goal, ...tracked.map((point) => point.count), 1);
  const goalOffset = Math.min(100, (goal / max) * 100);

  return (
    <section className={styles.card} aria-labelledby="semaine-titre">
      <h2 className={styles.sectionTitle} id="semaine-titre">
        7 derniers jours
      </h2>
      <p className={styles.sectionHint}>
        Vert : dans l&apos;objectif ({goal}). Les barres creuses correspondent aux jours antérieurs
        au début du suivi.
      </p>

      <div className={styles.chart} role="img" aria-label={buildSummary(lastSeven, goal)}>
        {lastSeven.map((point) => {
          const height = point.tracked ? Math.max(4, Math.round((point.count / max) * 100)) : 0;
          const isToday = point.date === todayKey;
          return (
            <div className={styles.chartColumn} key={point.date}>
              <span className={styles.chartValue}>{point.tracked ? point.count : "—"}</span>
              <div className={styles.chartBarWrapper}>
                <div
                  className={styles.chartGoalLine}
                  style={{ bottom: `${goalOffset}%` }}
                  aria-hidden="true"
                />
                {point.tracked ? (
                  <div
                    className={[
                      styles.chartBar,
                      point.count <= goal ? styles.chartBarOk : "",
                      isToday ? styles.chartBarToday : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ height: `${height}%` }}
                  />
                ) : (
                  <div className={styles.chartBarEmpty} aria-hidden="true" />
                )}
              </div>
              <span className={`${styles.chartLabel} ${isToday ? styles.chartLabelToday : ""}`}>
                {formatDayLabel(point.date)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildSummary(series: SeriesPoint[], goal: number): string {
  const details = series
    .map((point) =>
      point.tracked ? `${formatDayLabel(point.date)} : ${point.count}` : `${formatDayLabel(point.date)} : non suivi`,
    )
    .join(", ");
  return `Consommation des 7 derniers jours (objectif ${goal}). ${details}.`;
}
