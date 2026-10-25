import type { MetadataRoute } from "next";

/**
 * Manifeste PWA.
 *
 * - Les URL sont relatives au manifeste : il fonctionne à la racine comme sous
 *   /smokertrack/ (GitHub Pages).
 * - `shortcuts` alimente le menu affiché **par un appui long sur l'icône** de
 *   l'application installée (Android, Windows, Chrome desktop). C'est ce qui
 *   s'approche le plus d'un « widget » sans code natif : une action en un tap
 *   depuis l'écran d'accueil, sans ouvrir l'application à la main.
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
    background_color: "#070b17",
    theme_color: "#070b17",
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
    shortcuts: [
      {
        name: "Ajouter une cigarette",
        short_name: "Ajouter",
        description: "Enregistre une cigarette pour aujourd'hui, sans navigation.",
        // `?action=add` est traité au chargement : ajout puis nettoyage de l'URL.
        url: "./?action=add",
        icons: [{ src: "./icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Voir mon suivi",
        short_name: "Suivi",
        description: "Ouvre le compteur et les tendances.",
        url: "./",
        icons: [{ src: "./icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
