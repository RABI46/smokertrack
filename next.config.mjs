/** @type {import('next').NextConfig} */

/**
 * Application 100 % statique : `next build` génère le dossier `out/`, publié
 * tel quel (GitHub Pages ou n'importe quel hébergeur de fichiers).
 *
 * `NEXT_PUBLIC_BASE_PATH` permet de servir l'application depuis un sous-dossier
 * (cas de GitHub Pages : /smokertrack). Vide = servi à la racine.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  output: "export",
  // Un fichier HTML par route (`/confidentialite/index.html`) : nécessaire pour
  // les hébergeurs statiques qui ne réécrivent pas les URL.
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // Aucun serveur d'optimisation d'images en export statique.
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
