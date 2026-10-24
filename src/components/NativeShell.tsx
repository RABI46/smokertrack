"use client";

import { useEffect } from "react";

/**
 * Adaptations propres à l'application Android (APK Capacitor).
 *
 * Dans un navigateur, ce composant ne fait rien : la détection repose sur
 * `Capacitor.isNativePlatform()`, injecté par le pont natif.
 */
export default function NativeShell() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const capacitor = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;

    const isNative = Boolean(capacitor?.isNativePlatform?.());
    if (!isNative) return;

    // Marqueur utilisé par le CSS (`data-native` sur <html>).
    document.documentElement.dataset.native = "true";

    // Barre d'état assortie au thème sombre de l'application.
    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0b1120" });
      } catch {
        // Plugin absent (build web) : sans conséquence.
      }
    })();

    // Le bouton retour Android doit revenir à l'accueil plutôt que quitter l'app.
    const onBackButton = (event: Event) => {
      const detail = (event as CustomEvent<{ canGoBack?: boolean }>).detail;
      if (!detail?.canGoBack && window.location.pathname !== "/") {
        event.preventDefault();
        window.location.assign("/");
      }
    };
    document.addEventListener("backbutton", onBackButton);

    return () => document.removeEventListener("backbutton", onBackButton);
  }, []);

  return null;
}
