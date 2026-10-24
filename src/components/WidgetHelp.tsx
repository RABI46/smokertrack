"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/widgetBridge";
import styles from "./tracker.module.css";

/**
 * Aide « widget & accès rapide ».
 *
 * Depuis la version 1.4, l'APK Android embarque un **vrai widget natif**
 * (AppWidget) : compteur du jour, heure de la dernière cigarette, compte à
 * rebours de la prochaine et bouton « +1 ». Dans un navigateur, ce widget
 * n'existe pas — on explique alors les équivalents web, sans promesse trompeuse.
 */
export default function WidgetHelp() {
  const [native, setNative] = useState(false);

  // La détection n'est possible qu'après hydratation (Capacitor est injecté côté client).
  useEffect(() => setNative(isNativeApp()), []);

  return (
    <section className={styles.card} aria-labelledby="widget-titre">
      <h2 className={styles.sectionTitle} id="widget-titre">
        {native ? "Widget d'écran d'accueil" : "Widget & accès rapide"}
      </h2>

      {native ? (
        <>
          <p className={styles.sectionHint}>
            L&apos;application Android inclut un widget natif : compteur du jour, heure de la
            dernière cigarette, compte à rebours vers la prochaine et ajout d&apos;une cigarette
            sans ouvrir l&apos;application.
          </p>
          <ol className={styles.helpList}>
            <li>Revenir à l&apos;écran d&apos;accueil, appuyer longuement sur une zone vide.</li>
            <li>Choisir <strong>« Widgets »</strong> puis <strong>SmokeTracker</strong>.</li>
            <li>
              Glisser le widget sur l&apos;écran d&apos;accueil. Le bouton <strong>+ Une
              cigarette</strong> enregistre une cigarette immédiatement.
            </li>
            <li>
              Redimensionnable (2×1 minimum). Le décompte se met à jour tout seul ; le widget
              repart de zéro à minuit, même si l&apos;application n&apos;est pas ouverte.
            </li>
            <li>
              Les ajouts faits depuis le widget sont fusionnés dans les données à la prochaine
              ouverture, en conservant leur heure réelle.
            </li>
          </ol>
        </>
      ) : (
        <>
          <p className={styles.sectionHint}>
            Le web ne peut pas créer de widget natif. Voici les équivalents fonctionnels dans un
            navigateur — et le widget natif existe dans l&apos;application Android.
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
            </ol>
          </details>

          <details className={styles.helpBlock}>
            <summary className={styles.helpSummary}>iPhone / iPad — widget Raccourcis</summary>
            <ol className={styles.helpList}>
              <li>Installer l&apos;application (« Partager » → « Sur l&apos;écran d&apos;accueil »).</li>
              <li>Ouvrir l&apos;app <strong>Raccourcis</strong> → « + » → action « Ouvrir des URL ».</li>
              <li>
                Coller l&apos;adresse{" "}
                <code id="widget-url">{`${getBaseUrl()}?action=add`}</code> et nommer le raccourci
                « Ajouter une cigarette ».
              </li>
              <li>
                Revenir à l&apos;écran d&apos;accueil, ajouter un widget <strong>Raccourcis</strong> et
                y placer ce raccourci.
              </li>
            </ol>
          </details>

          <details className={styles.helpBlock}>
            <summary className={styles.helpSummary}>Widget natif (application Android)</summary>
            <p className={styles.hint}>
              Le widget natif nécessite l&apos;APK Android, téléchargeable depuis les artefacts du
              workflow <em>Android APK</em> du dépôt.
            </p>
          </details>

          <details className={styles.helpBlock}>
            <summary className={styles.helpSummary}>Badge sur l&apos;icône</summary>
            <p className={styles.hint}>
              Sur Android et iOS 16.4+ (application installée), l&apos;icône affiche le nombre de
              cigarettes du jour. Aucun réglage nécessaire.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

/** URL publique courante, utilisée dans le mode d'emploi iOS. */
function getBaseUrl(): string {
  if (typeof window === "undefined") return "https://…/smokertrack/";
  return `${window.location.origin}${window.location.pathname}`;
}
