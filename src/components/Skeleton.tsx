import styles from "./tracker.module.css";

/** Écran de chargement neutre : identique côté serveur et client (pas de décalage d'hydratation). */
export default function Skeleton() {
  return (
    <div className={styles.shell} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Chargement de votre suivi…</span>
      <div className={styles.header}>
        <div style={{ width: 190 }}>
          <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
          <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "60%" }} />
        </div>
      </div>
      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "40%" }} />
      </div>
      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "30%" }} />
        <div className={`${styles.skeleton} ${styles.skeletonHero}`} style={{ height: 80 }} />
      </div>
    </div>
  );
}
