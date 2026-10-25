import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Réapplique la préférence de thème avant la première peinture : sans ce
 * script, la page clignoterait au thème système avant l'hydratation.
 * `localStorage` peut lever en mode privé → try/catch, échec sans conséquence.
 */
const THEME_BOOT_SCRIPT = `
try {
  var t = localStorage.getItem("smokertrack.theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
`.trim();

export const metadata: Metadata = {
  title: {
    default: "SmokeTracker — suivi de consommation",
    template: "%s · SmokeTracker",
  },
  description:
    "Suivez votre consommation de cigarettes au quotidien : compteur, objectif, tendance sur 7 et 30 jours. Aucun compte, aucune donnée envoyée sur un serveur.",
  applicationName: "SmokeTracker",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "any" },
      { url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/apple-touch-icon.png`, sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "SmokeTracker",
    statusBarStyle: "black-translucent",
  },
  // Le suivi du tabagisme est une donnée de santé : on demande explicitement
  // aux robots de ne pas indexer l'application.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#070b17",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
