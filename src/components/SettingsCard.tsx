"use client";

import { useRef } from "react";
import { MAX_GOAL, MIN_GOAL } from "@/lib/domain";
import { ShieldIcon } from "./icons";
import styles from "./tracker.module.css";

interface SettingsCardProps {
  goal: number;
  pending: boolean;
  onChangeGoal: (goal: number) => void;
  onEraseAll: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function SettingsCard({
  goal,
  pending,
  onChangeGoal,
  onEraseAll,
  onExport,
  onImport,
}: SettingsCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);

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
        <div className={styles.stepper} role="group" aria-labelledby="objectif-label">
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

      <div className={styles.settingsRow} style={{ marginTop: 22 }}>
        <span className={styles.hint}>
          <ShieldIcon /> Vos données ne quittent jamais cet appareil. Pensez à exporter une
          sauvegarde avant de vider le navigateur ou de changer de téléphone.
        </span>
      </div>

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={`${styles.ghostButton} ${styles.smallButton}`}
          onClick={onExport}
          disabled={pending}
        >
          Exporter mes données
        </button>
        <button
          type="button"
          className={`${styles.ghostButton} ${styles.smallButton}`}
          onClick={() => fileInput.current?.click()}
          disabled={pending}
        >
          Restaurer une sauvegarde
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Choisir un fichier de sauvegarde SmokeTracker"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            // Permet de réimporter le même fichier ensuite.
            event.target.value = "";
          }}
        />
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
