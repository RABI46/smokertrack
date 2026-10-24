# SmokeTracker

Suivi personnel de consommation de cigarettes — **PWA installable, hors-ligne et
local-first** : aucun compte, aucun serveur, aucune donnée envoyée nulle part.

**Application en ligne : <https://rabi46.github.io/smokertrack/>**

> Le suivi du tabagisme est une donnée de santé. L'application ne stocke donc rien ailleurs
> que dans le navigateur de l'utilisateur, et propose un export de sauvegarde ainsi qu'un
> effacement total. Voir [la page confidentialité](src/app/confidentialite/page.tsx).

## Fonctionnalités

- **Compteur du jour** en un tap, avec annulation de la dernière saisie.
- **Objectif quotidien** réglable (1–100) et barre de progression.
- **Tendances** : moyenne sur 7 jours, total sur 30 jours, comparaison avec la semaine
  précédente, jours dans l'objectif, série en cours.
- **Histogramme** des 7 derniers jours et **historique** des 10 derniers jours.
- **Sauvegarde** : export JSON et restauration en un clic (indispensable puisque les données
  sont locales).
- **Installation** sur l'écran d'accueil (bouton « Installer », ou « Partager → Sur l'écran
  d'accueil » sur iOS).
- **Hors-ligne** : service worker maison, pré-cache de la coquille + stratégies réseau/cache.
- **Passage de minuit automatique** : le compteur du jour bascule sans rechargement, et les
  calculs utilisent le fuseau horaire de l'appareil.

## Stack

| Élément | Choix |
|---|---|
| Framework | Next.js 14 (App Router) en **export statique** (`output: "export"`) |
| Langage | TypeScript strict (`noUncheckedIndexedAccess`) |
| UI | React 18 + CSS Modules (aucune librairie UI, aucune police distante) |
| Persistance | `localStorage` versionné, derrière une interface `DailyLogStore` |
| PWA | manifeste typé (`app/manifest.ts`) + `public/sw.js` écrit à la main |
| Tests | Vitest + Testing Library (48 tests) |
| Hébergement | GitHub Pages via GitHub Actions |

Aucune dépendance runtime hormis Next et React : ni Firebase, ni SDK tiers, ni
service worker généré par un plugin abandonné.

## Démarrage

```bash
npm ci
npm run dev            # http://localhost:3000
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | export statique dans `out/` |
| `npm run preview` | sert `out/` sur http://localhost:4173 |
| `npm test` | tests unitaires + tests de rendu |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Pour reproduire l'hébergement GitHub Pages en local (site servi sous `/smokertrack/`) :

```bash
NEXT_PUBLIC_BASE_PATH=/smokertrack npm run build
# puis servir `out/` dans un dossier nommé `smokertrack/`
```

## Données : où et comment

```
localStorage["smokertrack.v1"] = {
  goal: 10,
  days: {
    "2026-10-24": { count: 4, lastSmokedAt: "2026-10-24T18:12:00.000Z" },
    ...
  }
}
```

- Un enregistrement par jour (pas par cigarette) : quelques octets par jour.
- La clé `smokertrack.demo.v1` de l'ancienne version est migrée automatiquement, puis
  supprimée.
- L'export JSON utilise le même format, enveloppé dans
  `{ format, version, exportedAt, goal, days }` et validé à l'import.
- `src/lib/localStore.ts` expose une interface `DailyLogStore` : une synchronisation
  optionnelle (Drive, WebDAV, Supabase…) pourrait être ajoutée sans toucher à l'interface.

## Tests

```bash
npm test     # 48 tests
```

| Fichier | Couverture |
|---|---|
| `src/lib/domain.test.ts` | statistiques, bornes, séries, tendances |
| `src/lib/date.test.ts` | clés de jour, fuseaux, heure d'été, années bissextiles |
| `src/lib/localStore.test.ts` | incréments, plancher zéro, plafond, export/import et rejets |
| `src/components/TrackerApp.test.tsx` | rendu réel (jsdom) : compteur, annulation, objectif, persistance, restauration, effacement |

## Déploiement gratuit (GitHub Pages)

Le workflow `.github/workflows/pages.yml` exécute lint + types + tests, construit l'export
statique et le publie sur GitHub Pages à chaque push. Aucun secret n'est nécessaire.

Activation, une seule fois : **Settings → Pages → Source : GitHub Actions**.

L'URL publique est `https://<utilisateur>.github.io/<dépôt>/`, d'où la variable
`NEXT_PUBLIC_BASE_PATH=/smokertrack` dans le workflow. Pour un domaine racine (dépôt
`<utilisateur>.github.io` ou domaine personnalisé), laisser cette variable vide.

Autres hébergeurs statiques gratuits compatibles, sans changement de code : Cloudflare Pages,
Netlify, Vercel (build `npm run build`, dossier `out`).

## Structure

```
src/
├── app/
│   ├── layout.tsx           métadonnées, viewport, icônes
│   ├── page.tsx             page unique
│   ├── manifest.ts          manifeste PWA (URL relatives)
│   ├── globals.css          thème clair/sombre + base
│   └── confidentialite/     information RGPD
├── components/
│   ├── TrackerApp.tsx       orchestration, états, en-tête
│   ├── CounterCard.tsx      compteur, progression, actions
│   ├── StatsGrid.tsx        indicateurs de tendance
│   ├── WeeklyChart.tsx      histogramme 7 jours
│   ├── HistoryList.tsx      historique
│   ├── SettingsCard.tsx     objectif, export/import, effacement
│   ├── InstallPrompt.tsx    bouton d'installation PWA
│   ├── ServiceWorkerRegistration.tsx
│   ├── Skeleton.tsx         écran de chargement
│   └── icons.tsx            icônes SVG inline
├── lib/
│   ├── domain.ts            règles métier pures (testées)
│   ├── date.ts              clés de jour et fuseaux (testées)
│   ├── localStore.ts        persistance locale + validation d'import (testée)
│   ├── backup.ts            export/restauration de fichier
│   ├── useTracker.ts        état de l'écran et actions
│   └── types.ts             contrats de données
public/
├── sw.js                    service worker (pré-cache + repli hors-ligne)
├── icon-*.png, favicon.ico, .nojekyll
```

## Limites connues

- **Les données sont liées à un appareil et à un navigateur.** Vider les données du site,
  désinstaller le navigateur ou changer de téléphone les efface : l'export JSON est le seul
  filet de sécurité. Une synchronisation optionnelle est la première amélioration proposée.
- Pas de rappels/notifications, pas de suivi des rechutes ni des économies réalisées.
- Pas d'authentification : sans compte, il n'y a rien à protéger côté serveur — et rien à
  récupérer non plus.
- L'interface est en français uniquement, et l'application n'est pas un outil médical.

## Licence

MIT — voir [LICENSE](LICENSE).
