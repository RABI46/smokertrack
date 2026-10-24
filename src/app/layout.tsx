import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SmokeTracker — suivi de consommation",
    template: "%s · SmokeTracker",
  },
  description:
    "Suivez votre consommation de cigarettes au quotidien : compteur, objectif, tendance sur 7 et 30 jours. Données privées, stockées dans votre propre Firebase.",
  applicationName: "SmokeTracker",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Le suivi du tabagisme est une donnée de santé : on demande explicitement
  // aux robots de ne pas indexer l'application.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1120",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
