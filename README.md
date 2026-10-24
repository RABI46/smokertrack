# SmokeTracker

Suivi personnel de consommation de cigarettes — application web progressive (PWA),
installable, qui fonctionne hors-ligne et stocke vos données dans **votre** projet Firebase.

> **Donnée de santé.** Le projet est conçu pour rester privé : aucune analytique, aucun
> traceur tiers, un utilisateur ne peut accéder qu'à ses propres documents (règles Firestore),
> et un bouton efface l'intégralité des données. Voir [la page confidentialité](/src/app/confidentialite/page.tsx).

## Fonctionnalités

- **Compteur du jour** en un tap, avec annulation de la dernière saisie.
- **Objectif quotidien** réglable (1–100) et barre de progression.
- **Tendances** : moyenne sur 7 jours, total sur 30 jours, comparaison avec la semaine
  précédente, jours dans l'objectif, série en cours.
- **Graphique** des 7 derniers jours (HTML/CSS, sans librairie de graphes).
- **Historique** des 10 derniers jours.
- **Mode démo local** automatique tant que Firebase n'est pas configuré (données dans le
  navigateur, pratique pour tester ou faire une démo).
- **Hors-ligne** : cache persistant Firestore — une saisie faite sans réseau est mise en
  file et synchronisée au retour de la connexion.
- **PWA** installable (manifeste + service worker générés au build).

## Stack

| Élément | Choix | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | rendu statique, `output: "standalone"` |
| Langage | TypeScript strict | `noUncheckedIndexedAccess` activé |
| UI | React 18 + CSS Modules | aucun framework CSS, aucun composant tiers |
| Données | Firebase Auth + Firestore | connexion anonyme + cache persistant |
| PWA | `@ducanh2912/next-pwa` | successeur maintenu de `next-pwa` (abandonné en 2022) |
| Tests | Vitest + Testing Library | logique métier + rendu de l'interface |
| Qualité | ESLint (`next/core-web-vitals`) | exécuté aussi pendant `next build` |

## Démarrage

```bash
npm ci                # installe les dépendances exactes du lockfile
cp .env.example .env.local   # facultatif : sans clés, l'app démarre en mode démo
npm run dev           # http://localhost:3000
```

Scripts disponibles :

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production (lint + typecheck inclus) |
| `npm start` | serveur de production |
| `npm test` | tests unitaires et de rendu |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run emulators` | émulateurs Firebase Auth + Firestore |
| `npm run deploy:rules` | publication des règles Firestore |

## Configurer Firebase

1. Créer un projet sur la [console Firebase](https://console.firebase.google.com/) — **choisir
   une région européenne** (par ex. `europe-west1`) pour limiter les transferts hors UE.
2. Activer **Firestore** (mode production) et **Authentication → Anonyme**.
3. Ajouter une application web et copier la configuration SDK dans `.env.local`
   (modèle : `.env.example`).
4. Publier les règles de sécurité :

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # sélectionner le projet
   npm run deploy:rules
   ```

Sans ces règles, Firestore refuse toute lecture/écriture : l'application basculerait en
erreur visible plutôt que d'exposer des données.

### Modèle de données

```
users/{uid}                → { goal: number }
users/{uid}/daily/{AAAA-MM-JJ}
                           → { count: number, lastSmokedAt: Timestamp serveur }
```

Un document par jour (et non par cigarette) : les écritures sont atomiques
(`increment()`), les lectures tiennent dans une seule requête, et le coût reste constant
quelle que soit la consommation.

## Tests

```bash
npm test          # 38 tests
```

- `src/lib/domain.test.ts` — statistiques, bornes, séries, tendances.
- `src/lib/date.test.ts` — clés de jour, fuseaux horaires, heure d'été, années bissextiles.
- `src/lib/demoStore.test.ts` — incréments/décréments, immutabilité, plancher à zéro.
- `src/components/TrackerApp.test.tsx` — rendu réel (jsdom) : compteur, ajout, annulation,
  objectif, effacement.

## Déploiement (Azure App Service)

Le workflow `.github/workflows/azure-webapps-node.yml` exécute lint + typecheck + tests +
build sur chaque PR et chaque push, puis déploie sur `main` **uniquement si** la variable de
dépôt `AZURE_WEBAPP_NAME` est définie.

À configurer dans le dépôt :

| Type | Nom | Valeur |
|---|---|---|
| Variable | `AZURE_WEBAPP_NAME` | nom de l'App Service |
| Secret | `AZURE_WEBAPP_PUBLISH_PROFILE` | profil de publication Azure |
| Secret | `NEXT_PUBLIC_FIREBASE_*` (×6) | configuration Firebase de production |

L'artefact déployé est la sortie `standalone` de Next (`node server.js`), pas le dépôt entier.

## Structure

```
src/
├── app/
│   ├── layout.tsx           métadonnées, viewport, thème
│   ├── page.tsx             page unique
│   ├── manifest.ts          manifeste PWA typé
│   ├── globals.css          variables de thème + base
│   └── confidentialite/     information RGPD
├── components/
│   ├── TrackerApp.tsx       orchestration + états (chargement, erreur, démo)
│   ├── CounterCard.tsx      compteur, progression, actions
│   ├── StatsGrid.tsx        indicateurs de tendance
│   ├── WeeklyChart.tsx      histogramme 7 jours
│   ├── HistoryList.tsx      historique
│   ├── SettingsCard.tsx     objectif + effacement
│   └── icons.tsx            icônes SVG inline
└── lib/
    ├── domain.ts            règles métier pures (testées)
    ├── date.ts              clés de jour et fuseaux (testées)
    ├── types.ts             contrats de données
    ├── firebase.ts          initialisation SDK (env)
    ├── firestoreStore.ts    persistance Firestore
    ├── demoStore.ts         persistance locale (mode démo)
    ├── store.ts             sélection de l'implémentation
    ├── useAuthUser.ts       session anonyme Firebase
    └── useTracker.ts        état de l'écran, actions
```

## Limites connues

- L'authentification est **anonyme** : sans liaison à une adresse e-mail, les données sont
  perdues si le stockage du navigateur est vidé ou sur un autre appareil. La liaison de
  compte est prévue dans la feuille de route.
- Les données ne sont pas chiffrées de bout en bout : elles sont lisibles par l'administrateur
  du projet Firebase (vous-même).
- L'application n'est pas un outil médical et n'affiche aucun conseil de sevrage.

## Licence

MIT — voir [LICENSE](LICENSE).
