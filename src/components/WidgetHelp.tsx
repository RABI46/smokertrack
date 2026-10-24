"use client";

import styles from "./tracker.module.css";

/**
 * Aide « widget sur l'écran d'accueil ».
 *
 * ⚠️ Honnêteté technique : une PWA ne peut pas déclarer de widget natif
 * (App Widget Android / WidgetKit iOS), qui exige du code natif et une
 * publication sur les stores. Ce qui est réellement possible depuis le web est
 * décrit ici, sans promesse trompeuse.
 */
export default function WidgetHelp() {
  return (
    <section className={styles.card} aria-labelledby="widget-titre">
      <h2 className={styles.sectionTitle} id="widget-titre">
        Widget &amp; accès rapide
      </h2>
      <p className={styles.sectionHint}>
        Le web ne peut pas créer un vrai widget natif (réservé aux applications publiées sur les
        stores). Voici les équivalents réellement fonctionnels, sans compte ni serveur.
      </p>

      <details className={styles.helpBlock}>
        <summary className={styles.helpSummary}>Android — raccourci en appui long</summary>
        <ol className={styles.helpList}>
          <li>Installer l&apos;application (bouton « Installer » ou menu du navigateur).</li>
          <li>Sur l&apos;écran d&apos;accueil, appuyer longuement sur l&apos;icône SmokeTracker.</li>
          <li>
            Choisir <strong>« Ajouter une cigarette »</strong> : la cigarette est enregistrée
            immédiatement, sans navigation.
          </li>
          <li>
            Pour un accès encore plus direct, glisser ce raccourci sur l&apos;écran d&apos;accueil
            (variable selon le constructeur).
          </li>
        </ol>
      </details>

      <details className={styles.helpBlock}>
        <summary className={styles.helpSummary}>iPhone / iPad — widget Raccourcis</summary>
        <ol className={styles.helpList}>
          <li>Installer l&apos;application (« Partager » → « Sur l&apos;écran d&apos;accueil »).</li>
          <li>Ouvrir l&apos;app <strong>Raccourcis</strong> → « + » → action « Ouvrir des URL ».</li>
          <li>
            Coller l&apos;adresse <code id="widget-url">{`${getBaseUrl()}?action=add`}</code> et
            nommer le raccourci « Ajouter une cigarette ».
          </li>
          <li>
            Revenir à l&apos;écran d&apos;accueil, ajouter un widget <strong>Raccourcis</strong> et
            y placer ce raccourci.
          </li>
        </ol>
      </details>

      <details className={styles.helpBlock}>
        <summary className={styles.helpSummary}>Badge sur l&apos;icône</summary>
        <p className={styles.hint}>
          Sur Android et iOS 16.4+ (application installée), l&apos;icône affiche le nombre de
          cigarettes du jour. Aucun réglage nécessaire.
        </p>
      </details>
    </section>
  );
}

/** URL publique courante, utilisée dans le mode d'emploi iOS. */
function getBaseUrl(): string {
  if (typeof window === "undefined") return "https://…/smokertrack/";
  return `${window.location.origin}${window.location.pathname}`;
}
