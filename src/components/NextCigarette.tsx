"use client";

import { useEffect, useState } from "react";
import { formatDuration, nextCigaretteForDay } from "@/lib/domain";
import { formatTime } from "@/lib/date";
import styles from "./tracker.module.css";

interface NextCigaretteProps {
  /** Dernière cigarette fumée aujourd'hui (`null` si aucune). */
  lastSmokedToday: Date | null;
  goal: number;
  todayKey: string;
  timeZone: string;
}

/**
 * Compte à rebours vers la prochaine cigarette « due ».
 *
 * L'écart cible n'est pas un réglage de plus : il se déduit de l'objectif
 * quotidien réparti sur 16 h d'éveil (objectif 10 → une cigarette toutes les
 * 96 minutes). Il s'ajuste donc tout seul quand l'objectif change, et il est
 * identique dans le widget Android.
 *
 * Le décompte avance chaque seconde ; une fois le créneau dépassé, il continue
 * en affichant le retard, sans jugement ni relance automatique.
 */
export default function NextCigarette({
  lastSmokedToday,
  goal,
  todayKey,
  timeZone,
}: NextCigaretteProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const next = nextCigaretteForDay(lastSmokedToday, goal, todayKey, new Date(now));

  if (!next) {
    return (
      <p className={styles.nextRow}>
        <span className={styles.nextLabel}>Prochaine cigarette</span>
        <span className={styles.nextMeta}>
          le compte à rebours démarre à la première cigarette du jour
        </span>
      </p>
    );
  }

  const base = next.overdue
    ? `en retard de ${formatDuration(-next.remainingMs)}`
    : `dans ${formatDuration(next.remainingMs)}`;

  return (
    // Pas de `aria-live` : un texte qui change chaque seconde saturerait un
    // lecteur d'écran. L'information reste consultable à la demande.
    <p className={styles.nextRow}>
      <span className={styles.nextLabel}>Prochaine cigarette</span>
      <span className={next.overdue ? styles.nextOverdue : styles.nextValue}>{base}</span>
      <span className={styles.nextMeta}>repère : {formatTime(next.dueAt, "fr-FR", timeZone)}</span>
    </p>
  );
}
