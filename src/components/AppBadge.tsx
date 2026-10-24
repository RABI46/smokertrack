"use client";

import { useEffect } from "react";

/**
 * Badge sur l'icône de l'application.
 *
 * `navigator.setAppBadge` (Badging API) est disponible sur Android/Chrome et
 * iOS 16.4+ lorsque l'application est installée. Il affiche le nombre de
 * cigarettes du jour directement sur l'icône de l'écran d'accueil : c'est le
 * seul « affichage permanent » que permet le web.
 */
export default function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const badge = (navigator as Navigator & {
      setAppBadge?: (value?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    });

    try {
      if (count > 0 && typeof badge.setAppBadge === "function") {
        void badge.setAppBadge(count).catch(() => undefined);
      } else if (typeof badge.clearAppBadge === "function") {
        void badge.clearAppBadge().catch(() => undefined);
      }
    } catch {
      // API absente ou bloquée : simple absence d'indicateur.
    }
  }, [count]);

  return null;
}
