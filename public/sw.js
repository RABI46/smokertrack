/*
 * Service worker de SmokeTracker — volontairement simple et sans dépendance.
 *
 * Stratégies :
 *  - installation : pré-cache de la coquille applicative (HTML, manifeste, icônes) ;
 *  - navigation : réseau d'abord (contenu frais), repli sur le cache hors-ligne ;
 *  - ressources statiques : stale-while-revalidate (rapide et auto-actualisé).
 *
 * Toutes les URL sont résolues par rapport à `self.registration.scope`, donc le
 * worker fonctionne aussi bien à la racine que sous /smokertrack/.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `smokertrack-${CACHE_VERSION}`;

const scope = self.registration.scope;
const shellUrl = new URL("./", scope).href;
const APP_SHELL = [
  "./",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
].map((path) => new URL(path, scope).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // `addAll` échoue en bloc si une seule ressource manque : on tolère les
      // échecs individuels pour ne jamais bloquer l'installation.
      await Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("smokertrack-") && key !== CACHE_NAME).map((key) =>
          caches.delete(key),
        ),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Repli ultime : la coquille de l'application, déjà pré-cachée.
    const shell = await cache.match(shellUrl);
    if (shell) return shell;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached ?? (await network) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    isNavigation(request) ? networkFirst(request) : staleWhileRevalidate(request),
  );
});
