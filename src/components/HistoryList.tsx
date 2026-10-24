"use client";

import { formatLongDate } from "@/lib/date";
import { takeLast, type SeriesPoint } from "@/lib/domain";
import styles from "./tracker.module.css";

interface HistoryListProps {
  series: SeriesPoint[];
  goal: number;
  todayKey: string;
}

export default function HistoryList({ series, goal, todayKey }: HistoryListProps) {
  const days = takeLast(series, 10).reverse();
  const hasData = series.some((point) => point.count > 0);

  return (
    <section className={styles.card} aria-labelledby="historique-titre">
      <h2 className={styles.sectionTitle} id="historique-titre">
        Historique
      </h2>
      <p className={styles.sectionHint}>10 derniers jours, du plus récent au plus ancien.</p>

      {hasData ? (
        <ul className={styles.list}>
          {days.map((point) => {
            const withinGoal = point.count <= goal;
            return (
              <li className={styles.listRow} key={point.date}>
                <span className={styles.listDate}>
                  {formatLongDate(point.date)}
                  {point.date === todayKey ? " (aujourd'hui)" : ""}
                </span>
                <span>
                  {point.count > 0 && withinGoal ? (
                    <span className={styles.pillOk}>dans l&apos;objectif</span>
                  ) : point.count > goal ? (
                    <span className={`${styles.pillOk} ${styles.pillOver}`}>dépassé</span>
                  ) : null}
                  <span className={styles.listCount}> {point.count}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.hint}>
          Aucune cigarette enregistrée sur la période. Appuyez sur « Ajouter une cigarette »
          pour commencer le suivi.
        </p>
      )}
    </section>
  );
}
