"use client";

import { MAX_GOAL, MIN_GOAL } from "@/lib/domain";
import { ShieldIcon } from "./icons";
import styles from "./tracker.module.css";

interface SettingsCardProps {
  goal: number;
  pending: boolean;
  onChangeGoal: (goal: number) => void;
  onEraseAll: () => void;
}

export default function SettingsCard({
  goal,
  pending,
  onChangeGoal,
  onEraseAll,
}: SettingsCardProps) {
  const decrement = () => onChangeGoal(Math.max(MIN_GOAL, goal - 1));
  const increment = () => onChangeGoal(Math.min(MAX_GOAL, goal + 1));

  return (
    <section className={styles.card} aria-labelledby="reglages-titre">
      <h2 className={styles.sectionTitle} id="reglages-titre">
        Objectif &amp; données
      </h2>
      <p className={styles.sectionHint}>
        L&apos;objectif sert de repère quotidien : il n&apos;est ni un quota à atteindre, ni un
        jugement.
      </p>

      <div className={styles.settingsRow}>
        <span id="objectif-label">Objectif quotidien</span>
        <div
          className={styles.stepper}
          role="group"
          aria-labelledby="objectif-label"
        >
          <button
            type="button"
            className={styles.stepButton}
            onClick={decrement}
            disabled={pending || goal <= MIN_GOAL}
            aria-label="Diminuer l'objectif d'une cigarette"
          >
            −
          </button>
          <output className={styles.stepValue} aria-live="polite">
            {goal}
          </output>
          <button
            type="button"
            className={styles.stepButton}
            onClick={increment}
            disabled={pending || goal >= MAX_GOAL}
            aria-label="Augmenter l'objectif d'une cigarette"
          >
            +
          </button>
        </div>
      </div>

      <div className={styles.settingsRow} style={{ marginTop: 20 }}>
        <span className={styles.hint}>
          <ShieldIcon /> Vos données restent dans votre projet Firebase.
        </span>
        <button
          type="button"
          className={`${styles.ghostButton} ${styles.smallButton} ${styles.dangerButton}`}
          onClick={onEraseAll}
          disabled={pending}
        >
          Effacer toutes mes données
        </button>
      </div>
    </section>
  );
}
