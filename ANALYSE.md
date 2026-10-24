# Analyse du dépôt `RABI46/smokertrack`

> **Statut : audit initial, puis corrections appliquées.**
> Ce rapport décrit l'état du dépôt au commit `21286d7`. Les points signalés dans les
> sections 4 à 6 ont depuis été corrigés : voir la section 10 « Corrections appliquées »
> pour la traçabilité point par point. Le contenu ci-dessous est conservé tel quel afin
> de garder la mémoire des problèmes et de leurs justifications.

> Rapport statique + vérifications exécutées le 2026-10-24, branche `arena/b6a80e89-smokertrack`
> (identique à `main`, commit `21286d7`).

---

## 1. Synthèse

`smokertrack` est une **ébauche de squelette** d'application de suivi de consommation de
cigarettes, composée de fichiers isolés à la racine. Le projet n'est **ni installable, ni
buildable, ni exécutable en l'état** : trois défauts bloquants ont été confirmés par
exécution (voir §4). Au-delà, le dépôt mélange **trois cibles techniques incompatibles**
(React Native/Expo, Next.js web, PWA maison) sans en assumer aucune, et ne contient ni
documentation, ni configuration, ni tests, ni règles de sécurité.

**Verdict : prototype non fonctionnel (< 1 % d'une application livrable), mais l'intention
fonctionnelle est claire et le périmètre est assez petit pour être remis d'aplomb rapidement.**

| Axe | Note | Commentaire |
|---|---|---|
| Structure / architecture | 1/5 | Imports pointant vers des dossiers inexistants |
| Configuration / build | 1/5 | `next-pwa` absent, `next export` obsolète, aucune page Next |
| Fonctionnalités | 1/5 | 1 bouton, 1 écran statique, aucune logique de suivi |
| Sécurité / vie privée | 1/5 | Aucune auth, aucune règle Firestore, données de santé |
| CI/CD | 2/5 | Workflow Azure présent mais avec valeurs factices |
| Documentation / qualité | 0/5 | Ni README, ni `.gitignore`, ni lint, ni tests |
| **Global** | **≈ 1/5** | Squelette à reconstruire |

---

## 2. Fiche technique

| Champ | Valeur |
|---|---|
| Dépôt | `github.com/RABI46/smokertrack` (public, 12 Ko, 0 star) |
| Créé le / dernier push | 2025-05-06 / 2025-05-24 |
| Commits | **1 seul** (`21286d7` — « Create azure-webapps-node.yml ») |
| Branches / tags | `main` uniquement, aucun tag |
| Langage principal | JavaScript (aucun TypeScript) |
| Fichiers | 9 (dont 1 workflow) — **183 lignes** au total |
| Issues / PR | 0 / 0 |
| Exécutions CI | **aucune** (`gh run list` vide → le workflow n'a jamais tourné) |
| Licence | absente |

### Contenu

```
smokertrack/
├── .github/workflows/azure-webapps-node.yml   (78 l.)  déploiement Azure
├── CigaretteTracker.js                        (15 l.)  bouton "Ajouter une cigarette"
├── Dashboard.js                               (9 l.)   écran statique
├── firebase.js                                (16 l.)  init Firestore
├── index.js                                   (11 l.)  assemblage des 2 composants
├── manifest.json                              (15 l.)  manifeste PWA
├── next.config.js                             (9 l.)   next-pwa
├── package.json                               (17 l.)  expo + next + firebase
└── sw.js                                      (13 l.)  service worker manuel
```

---

## 3. Architecture : l'intention vs la réalité

Les imports révèlent une arborescence **qui n'a jamais été créée** :

```js
// index.js (racine)
import Dashboard from "../src/components/Dashboard";        // → /src/components/... HORS du dépôt
import CigaretteTracker from "../src/components/CigaretteTracker";
// CigaretteTracker.js
import { db } from "../firebase";                            // → /firebase (hors dépôt)
```

Vérifié par résolution de chemins :

```
./src/components/Dashboard            -> /home/user/smokertrack/src/components/Dashboard   INTROUVABLE
./src/components/CigaretteTracker     -> /home/user/smokertrack/src/components/CigaretteTracker INTROUVABLE
./firebase                            -> /home/user/smokertrack/firebase                   INTROUVABLE
```

L'arborescence vraisemblablement visée (Next.js, âge d'or Pages Router) était :

```
pages/index.js
src/components/{Dashboard,CigaretteTracker}.js
src/firebase.js
public/{manifest.json,icon.png,sw.js}
```

Or **aucun fichier n'est à sa place** : tout est aplati à la racine, et `index.js` n'est pas
une page Next (il faudrait `pages/index.js` ou `app/page.js`).

### Le conflit de stacks

`package.json` déclare simultanément :

- **Expo 49 / React Native** → cible mobile natif (`react-native` importé dans les composants) ;
- **Next.js 14 / React DOM** → cible web SSR/SSG ;
- **PWA maison** (`sw.js` + `manifest.json`) → cible web hors-ligne.

Ces trois cibles imposent des conventions, des points d'entrée et des scripts incompatibles.
Le projet ne fournit **ni `react-native`, ni `react-native-web`**, donc même le web ne peut pas
rendre les composants. Il faut **choisir une cible** :

| Option | Pour | Contre |
|---|---|---|
| **Next.js + Firebase (PWA)** | Une seule base, web + mobile via PWA, déploiement simple | Pas de publication App Store |
| **Expo / React Native** | App native iOS/Android, notifications | Le workflow Azure et le PWA deviennent inutiles |
| **Expo + export web** | Un code, deux cibles | Stack la plus lourde à maintenir |

Recommandation : **Next.js PWA uniquement** pour un tracker personnel, quitte à ajouter Expo
plus tard. Le workflow Azure existant suppose déjà une application web.

---

## 4. Anomalies bloquantes (P0 — rien ne fonctionne)

### 4.1 Aucune page Next.js
Next 14 exige un dossier `pages/` ou `app/`. `index.js` à la racine est ignoré → `next build`
échoue avec « Couldn't find any `pages` or `app` directory ».

### 4.2 `next.config.js` plante au chargement
`next-pwa` est requis mais **absent des dépendances** :

```
ERREUR chargement next.config.js -> MODULE_NOT_FOUND : Cannot find module 'next-pwa'
```

Toute commande Next (`dev`, `build`, `export`) échoue dès la lecture de la config.
De plus l'API utilisée est celle de **next-pwa v4** ; en v5 (5.6.0, seule version dispo) les
options se passent à la fabrique : `require("next-pwa")({ dest: "public" })`.
Enfin **next-pwa n'est plus maintenu depuis août 2022** → préférer `@ducanh2912/next-pwa`
ou **Serwist** (successeur officiel recommandé).

### 4.3 Scripts `package.json` inopérants
- `export: "next export"` → **commande supprimée dans Next 14** ; il faut `output: 'export'`
  dans la config.
- `start: "expo start"` → serveur de **développement interactif**, pas un serveur de
  production ; Azure App Service lancera `npm start` et n'obtiendra aucune app web.
- `build-web` existe mais le workflow appelle `npm run build` (inexistant, masqué par
  `--if-present`) → **aucun build n'est réellement produit** avant déploiement.
- Nom de paquet `"smokeTracker"` en camelCase : contraire aux règles npm (minuscules).

### 4.4 Dépendances manquantes
`next-pwa`, `react-native`, `react-native-web` sont importés/utilisés mais non déclarés.
Aucun `devDependencies`, aucun **lockfile**, aucun champ `engines` → installations non
reproductibles.

### 4.5 Assets et manifeste PWA fantômes
- `icon.png` référencé dans `manifest.json` et dans `sw.js` mais **absent** →
  `cache.addAll(['/','/index.html','/icon.png'])` **rejette** → le service worker ne
  s'installe jamais (`/index.html` n'existe pas non plus en App Router).
- Le manifeste doit être servi depuis `public/` et **référencé** dans le `<head>`
  (ou via `app/manifest.ts`) : aucun lien nulle part.
- `sw.js` n'est **jamais enregistré** par le code ; il entrerait de toute façon en conflit
  avec le SW généré par next-pwa.
- Icônes manquantes : 192×192, 512×512, variante `maskable`, `apple-touch-icon`.

### 4.6 Firebase non configuré
`firebase.js` contient des placeholders (`"TA_CLE_API"`, `"TON_PROJECT_ID"`…). Aucun
`.env.example`, aucune lecture de variables d'environnement → l'application écrit dans le vide
(erreur d'initialisation Firestore).

### 4.7 Workflow Azure non déployable
`AZURE_WEBAPP_NAME: your-app-name` (valeur factice), `publish-profile` non renseigné,
artifact `path: '.'` qui embarque `node_modules` et `.git`, `npm install` au lieu de `npm ci`,
`azure/webapps-deploy@v2` obsolète (v3 disponible), aucune variable Firebase injectée,
et **aucun run enregistré** : la CI n'a jamais été exercée.

---

## 5. Problèmes majeurs (P1)

### 5.1 Modèle de données inadapté
```js
addDoc(collection(db, "consommation"), { date: new Date(), count: 1 });
```
- **Un document par cigarette** (`count` toujours à 1) : coût en écritures et en lectures
  qui croît linéairement, agrégations de plus en plus lourdes.
- **Pas d'identifiant utilisateur** : impossible d'isoler plusieurs personnes ; toutes les
  données atterrissent dans une collection globale.
- **Pas de `serverTimestamp()`** : l'horodatage vient de l'horloge du client (fuseau, heure
  falsifiable) → statistiques faussées. Aucun fuseau/`timezone` stocké.
- Pas de **suppression / annulation** (erreur de saisie impossible à corriger) → contraire au
  droit à l'effacement.
- Aucune validation (date future, doublons, quota).

**Modèle recommandé** : soit un document par événement avec `uid`, `smokedAt` (Timestamp
serveur), `source`, soit — plus économique — un **compteur journalier** :
`users/{uid}/daily/{YYYY-MM-DD} = { count, goal, updatedAt }` avec `increment(1)`.

### 5.2 Aucune sécurité
- **Aucune authentification** (pas de Firebase Auth), alors que Firestore est interrogé
  directement depuis le client.
- **Aucune règle Firestore** dans le dépôt (`firestore.rules` absent). Sans règles publiées,
  la base est soit verrouillée (app cassée), soit ouverte (fuite de données).
- Pas de `firebase.json`, pas d'émulateurs, pas d'index.

### 5.3 Données de santé / RGPD
Le suivi du tabagisme est une **donnée de santé** (art. 9 RGPD, données sensibles).
Manquent : consentement explicite, politique de confidentialité, minimisation, durée de
conservation, droit d'accès/portabilité/suppression, choix d'hébergement UE pour Firestore,
mention de l'âge. À traiter **avant** toute mise en ligne, même pour un projet personnel.

### 5.4 Le PWA est contre-productif
`sw.js` fait du **cache-first sur toutes les requêtes**, y compris les navigations HTML :
après déploiement, l'utilisateur reste bloqué sur une version ancienne. Aucune version de
cache, aucun `activate` nettoyant les anciens caches, aucun fallback hors-ligne, aucune
stratégie réseau-d'abord, et les écritures Firestore échouées hors-ligne ne sont pas
réessayées (pas de file d'attente). À remplacer par une solution générée et versionnée.

### 5.5 Aucune gestion d'état/erreur
`addCigarette` n'a **ni `try/catch`, ni état de chargement, ni retour utilisateur** : en cas
d'échec (réseau, permission), le bouton semble fonctionner. Pas de désactivation pendant
l'écriture → doubles saisies possibles.

### 5.6 Fonctionnalité quasi inexistante
Le `Dashboard` affiche une phrase statique (`🔥 SmokeTracker - Suivi des cigarettes 🚀`) et
**ne lit aucune donnée**. Il n'y a ni total du jour, ni objectif, ni historique, ni graphique,
ni rappel — c'est-à-dire aucune des fonctions qui définissent un « tracker ».

---

## 6. Dette de qualité (P2)

- **Aucun README**, `LICENSE`, `.gitignore`, `.editorconfig`, `.nvmrc`, `CONTRIBUTING`.
- **Aucun test** (ni framework, ni script `test`), **aucun lint/format** (ESLint, Prettier).
- **Pas de TypeScript** : aucune sûreté sur le modèle de données ni les props.
- **Pas de structure** : `src/`, `public/`, `app/` ou `pages/` à créer ; `Dashboard.js` et
  `CigaretteTracker.js` devraient vivre dans `src/components/`.
- **Accessibilité** : contraste non vérifié, `Button` sans libellé explicite, aucun
  `accessibilityLabel`, information portée uniquement par des emojis.
- **i18n** : textes français codés en dur, commentaires anglais — pas de stratégie de langue.
- **Aucun monitoring** (Sentry, analytics respectueux), aucune gestion d'environnements
  (dev/staging/prod).
- **Message de commit** unique et non descriptif ; workflow committé avant le code applicatif.

---

## 7. Plan d'action priorisé

### Étape 0 — Décider (30 min)
Choisir la cible : **Next.js PWA** (recommandé) ou **Expo**. Supprimer l'autre.

### Étape 1 — Rendre le projet démarrable (½ journée)
1. Créer l'arborescence `app/` (ou `pages/`) + `src/components/` + `src/lib/` + `public/`.
2. Déplacer `Dashboard.js` / `CigaretteTracker.js` dans `src/components/`, `firebase.js` dans
   `src/lib/`.
3. Remplacer `next.config.js` par `next.config.mjs` avec `@ducanh2912/next-pwa` (ou Serwist),
   supprimer `sw.js` manuel.
4. `npm i` + générer `package-lock.json`, ajouter `engines`, corriger le nom du paquet,
   passer à TypeScript.
5. Créer les icônes PWA réelles et `app/manifest.ts` ; supprimer `manifest.json` racine.
6. Configurer Firebase via `.env.local` + `.env.example` (`NEXT_PUBLIC_FIREBASE_*`).

### Étape 2 — Sécuriser (½ journée)
1. Firebase Auth (email/magic link ou anonyme lié à un compte).
2. `firestore.rules` : `allow read, write: if request.auth.uid == uid;` + validation de champ.
3. Ajouter `uid` et `serverTimestamp()` à chaque écriture ; passer au compteur journalier.
4. Ajouter la suppression d'une entrée et l'effacement complet du compte.

### Étape 3 — Fonctionnalités (2–3 jours)
Compteur du jour, objectif quotidien, historique 7/30 jours, graphique simple, moyenne,
bouton « annuler la dernière », états vide/chargement/erreur, mode hors-ligne avec file
d'attente d'écritures.

### Étape 4 — Industrialiser (1 journée)
`npm ci` + cache dans la CI, lint + typecheck + tests en PR, build réellement exécuté avant
déploiement, `AZURE_WEBAPP_NAME` en secret/variable, `azure/webapps-deploy@v3`, artifact
limité à `.next/standalone`, README + LICENSE + `.gitignore`, protection de `main`.

---

## 8. Extraits de correction prêts à l'emploi

**`src/lib/firebase.ts`**
```ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

**Écriture atomique journalière (`src/lib/consumption.ts`)**
```ts
import { doc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function addCigarette(uid: string) {
  const day = new Date().toISOString().slice(0, 10); // remplacer par le fuseau utilisateur
  await setDoc(
    doc(db, "users", uid, "daily", day),
    { count: increment(1), updatedAt: serverTimestamp() },
    { merge: true }
  );
}
```

**`firestore.rules`**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/daily/{day} {
      allow read, write: if request.auth != null && request.auth.uid == uid
        && request.resource.data.count is int
        && request.resource.data.count >= 0
        && request.resource.data.count <= 200;
    }
  }
}
```

**`next.config.mjs`** (successeur maintenu de next-pwa)
```js
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWA({ reactStrictMode: true });
```

---

## 9. Commandes de vérification utilisées

```bash
node -e "require('./next.config.js')"     # MODULE_NOT_FOUND: next-pwa
node -e "…résolution des imports…"        # 3 chemins INTROUVABLES
wc -l *.js *.json .github/workflows/*.yml # 183 lignes
gh run list -R RABI46/smokertrack         # aucun run
npm view next-pwa version time.modified   # 5.6.0, modifié 2022-08-23
```

---

## 10. Corrections appliquées

| Constat de l'audit | Correction |
|---|---|
| §4.1 Aucune page Next | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/manifest.ts` |
| §4.2 `next.config.js` (MODULE_NOT_FOUND, API v4) | `next.config.mjs` + `@ducanh2912/next-pwa` 10.2.9, SW désactivé en dev, en-têtes de sécurité |
| §4.3 Scripts inopérants | `dev` / `build` / `start` / `lint` / `typecheck` / `test` ; `next export` supprimé ; paquet renommé `smokertrack`, `private: true`, `engines` |
| §4.4 Dépendances manquantes | `package-lock.json` généré, `typescript`, `eslint`, `vitest`, `jsdom` déclarés ; stack React Native abandonnée |
| §4.5 Assets/manifeste fantômes | icônes 192/512/maskable/apple/favicon générées, manifeste typé `app/manifest.ts`, `sw.js` manuel supprimé (généré au build, ignoré par Git) |
| §4.6 Firebase non configuré | `src/lib/firebase.ts` lit `NEXT_PUBLIC_FIREBASE_*`, `.env.example` fourni, **mode démo local** automatique sans clés |
| §4.7 Workflow Azure non déployable | workflow réécrit : `npm ci`, lint + typecheck + tests + build, artefact `standalone` (sans `.git`/`node_modules`), `webapps-deploy@v3`, `startup-command`, déploiement conditionné à la variable `AZURE_WEBAPP_NAME` |
| §5.1 Modèle de données inadapté | 1 document par jour `users/{uid}/daily/{AAAA-MM-JJ}`, `increment()` atomique, `serverTimestamp()`, `uid` systématique, annulation et effacement |
| §5.2 Aucune sécurité | `firestore.rules` (propriété + validation de champs + refus par défaut), `firebase.json`, connexion anonyme Firebase Auth |
| §5.3 RGPD | page `/confidentialite`, mentions dans le pied de page, `robots: noindex`, effacement total en un bouton, cache persistant local |
| §5.4 PWA contre-productif | Workbox généré et versionné, exclusion des domaines Google du cache ; cache persistant Firestore pour la file d'écritures hors-ligne |
| §5.5 Aucune gestion d'état/erreur | `useTracker` : états chargement / prêt / erreur, bandeau d'erreur + « Réessayer », garde anti-double-comptage, boutons désactivés à bon escient |
| §5.6 Fonctionnalité inexistante | compteur, objectif, progression, tendances 7/30 j, série, histogramme 7 j, historique, annulation |
| §6 Dette de qualité | README, LICENSE MIT, `.gitignore`, `.nvmrc`, `.eslintrc.json`, TypeScript strict, 38 tests, Dependabot |

### Écarts assumés par rapport aux recommandations

- **`@ducanh2912/next-pwa` plutôt que Serwist** : le successeur officiel demande une
  migration vers Turbopack/App Router dédiée ; le choix retenu reste maintenu et compatible
  avec Next 14. Migration vers Serwist à planifier lors du passage à Next 15.
- **Mode démo local conservé** : au lieu de planter sans clés Firebase, l'application
  fonctionne en `localStorage` et l'affiche clairement. Cela rend le dépôt démontrable
  immédiatement, sans configuration.
- **Liaison de compte e-mail** non implémentée (mentionnée en limite connue du README) :
  la session anonyme suffit au périmètre actuel, mais ne survit pas à un changement
  d'appareil.

*Audit généré automatiquement le 2026-10-24 ; corrections appliquées le même jour sur la branche `arena/b6a80e89-smokertrack`.*
