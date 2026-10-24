"use client";

import { formatLongDate } from "@/lib/date";
import { takeLast, type SeriesPoint } from "@/lib/domain";
import styles from "./tracker.module.css";

interface HistoryListProps {
  series: SeriesPoint[];
  goal: number;
  todayKey: string;
  pending: boolean;
  onAdjust: (date: string, delta: 1 | -1, currentCount: number) => void;
}

export default function HistoryList({
  series,
  goal,
  todayKey,
  pending,
  onAdjust,
}: HistoryListProps) {
  const days = takeLast(series, 10).reverse();
  const hasData = series.some((point) => point.count > 0);

  return (
    <section className={styles.card} aria-labelledby="historique-titre">
      <h2 className={styles.sectionTitle} id="historique-titre">
        Historique
      </h2>
      <p className={styles.sectionHint}>
        10 derniers jours, du plus récent au plus ancien. Ajustez un oubli directement ici.
      </p>

      {hasData || days.length > 0 ? (
        <ul className={styles.list}>
          {days.map((point) => {
            const withinGoal = point.count <= goal;
            return (
              <li className={styles.listRow} key={point.date}>
                <span className={styles.listDate}>
                  {formatLongDate(point.date)}
                  {point.date === todayKey ? " (aujourd'hui)" : ""}
                </span>
                <span className={styles.listControls}>
                  {point.count > 0 && withinGoal ? (
                    <span className={styles.pillOk}>dans l&apos;objectif</span>
                  ) : point.count > goal ? (
                    <span className={`${styles.pillOk} ${styles.pillOver}`}>dépassé</span>
                  ) : null}
                  <span className={styles.listCount}>{point.count}</span>
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onAdjust(point.date, -1, point.count)}
                    disabled={point.count === 0}
                    aria-label={`Retirer une cigarette du ${formatLongDate(point.date)}`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onAdjust(point.date, 1, point.count)}
                    aria-label={`Ajouter une cigarette au ${formatLongDate(point.date)}`}
                  >
                    +
                  </button>
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

      <p className={styles.hint} aria-live="polite">
        {pending ? "Enregistrement…" : ""}
      </p>
    </section>
  );
}
