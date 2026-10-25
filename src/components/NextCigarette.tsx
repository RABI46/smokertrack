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
 * Compte à rebours vers la prochaine cigarette « due », en grand format.
 *
 * L'écart cible n'est pas un réglage de plus : il se déduit de l'objectif
 * quotidien réparti sur 16 h d'éveil (objectif 10 → une cigarette toutes les
 * 96 minutes). Il s'ajuste donc tout seul quand l'objectif change, et il est
 * identique dans le widget Android.
 *
 * États visuels :
 * - **rouge** pendant tout le décompte (« patientez »), avec une respiration
 *   douce et une pastille clignotante ;
 * - **vert** dès que le compte atteint zéro (« créneau atteint »), avec un
 *   flash de célébration ; le retard continue alors d'être affiché.
 *
 * Le décompte avance chaque seconde ; il rattrape aussi l'heure au retour au
 * premier plan (les minuteurs en arrière-plan sont throttlés par le navigateur).
 */
export default function NextCigarette({
  lastSmokedToday,
  goal,
  todayKey,
  timeZone,
}: NextCigaretteProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const next = nextCigaretteForDay(lastSmokedToday, goal, todayKey, new Date(now));

  if (!next) {
    return (
      <p className={`${styles.nextRow} ${styles.nextRowIdle}`}>
        <span className={styles.nextLabel}>Prochaine cigarette</span>
        <span className={styles.nextHint}>
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
    <p className={`${styles.nextRow} ${next.overdue ? styles.nextRowDue : ""}`}>
      <span className={styles.nextLabel}>Prochaine cigarette</span>
      <span
        className={`${styles.nextCountdown} ${
          next.overdue ? styles.nextOverdue : styles.nextValue
        }`}
      >
        {base}
      </span>
      <span className={styles.nextMeta}>repère : {formatTime(next.dueAt, "fr-FR", timeZone)}</span>
    </p>
  );
}
