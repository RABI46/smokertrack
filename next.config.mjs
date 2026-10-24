import withPWAInit from "@ducanh2912/next-pwa";

/**
 * PWA générée automatiquement (manifeste + service worker versionnés).
 * Le service worker est désactivé en développement pour éviter les caches fantômes.
 * En production, il est servi depuis /sw.js et enregistré par le runtime.
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    // Les données Firestore sont gérées par le SDK (cache persistant) :
    // on ne met jamais en cache les requêtes vers Google.
    exclude: [/googleapis/, /firestore/],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Mode "standalone" : artefact de déploiement autonome (Azure App Service).
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
