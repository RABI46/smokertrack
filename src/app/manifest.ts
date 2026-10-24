import type { MetadataRoute } from "next";

/**
 * Manifeste PWA. Les URL sont relatives au manifeste lui-même : il fonctionne
 * aussi bien à la racine (`/manifest.webmanifest`) que sous un sous-dossier de
 * GitHub Pages (`/smokertrack/manifest.webmanifest`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "./",
    name: "SmokeTracker — suivi de consommation",
    short_name: "SmokeTracker",
    description:
      "Compteur quotidien de cigarettes, objectif, tendance. Vos données restent sur votre appareil.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1120",
    theme_color: "#0b1120",
    lang: "fr",
    dir: "ltr",
    categories: ["health", "lifestyle", "productivity"],
    icons: [
      { src: "./icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "./icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "./icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
