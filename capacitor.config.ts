import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuration de l'application Android (Capacitor).
 *
 * `webDir: "out"` : l'export statique de Next.js est embarqué dans l'APK.
 * L'application fonctionne donc **entièrement hors-ligne**, sans serveur et
 * sans que les données (stockées dans le localStorage du WebView) ne quittent
 * l'appareil — exactement comme la PWA.
 *
 * Le paquet `io.github.rabi46.smokertrack` est l'identifiant définitif :
 * il ne doit plus changer, sinon Android considérerait l'APK comme une autre
 * application (perte des données à la réinstallation).
 */
const config: CapacitorConfig = {
  appId: "io.github.rabi46.smokertrack",
  appName: "SmokeTracker",
  webDir: "out",
  server: {
    // Origine https://localhost dans le WebView : requise pour que les chemins
    // absolus (/_next/...) de l'export statique se résolvent correctement.
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      // La barre d'état ne recouvre pas le contenu (safe areas gérées en CSS).
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#0b1120",
    },
  },
};

export default config;
