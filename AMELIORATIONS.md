# SmokeTracker — propositions d'amélioration

> État analysé : `main` @ `b2e7933` (v1.1), site déployé sur
> <https://rabi46.github.io/smokertrack/>. Application statique, local-first, sans compte.

## Résumé exécutif

L'application est **fonctionnelle et honnête** : elle fait ce qu'elle annonce, sans backend, et
elle est déployée. Les améliorations restantes ne portent plus sur des bugs bloquants mais sur
trois axes, par ordre de valeur :

1. **Corriger ce qui affiche des chiffres faux** — le plus urgent, car c'est ce qui détruit la
   confiance dans un tracker.
2. **Transformer le compteur en outil de sevrage** — aujourd'hui l'app compte ; elle n'aide pas
   encore à comprendre *quand* et *pourquoi* on fume.
3. **Rendre les données indestructibles** — le local-first est un choix assumé, mais il repose
   entièrement sur un export manuel.

Les cinq gains les plus rapides (≈ 4 h au total) sont détaillés en §1.

---

> **Mise à jour : le lot « fiabilité » (§1.1 à §1.5 et §3.1) a été implémenté** en v1.2.0
> (PR #9). Les sections concernées sont conservées ci-dessous comme référence de la motivation
> initiale ; les points restants sont §2 (outil de sevrage), §3.2–3.3 et §4 (dette technique).

## Constat mesuré

| Indicateur | Valeur |
|---|---|
| Code source | 2 576 lignes (`src/`), 5 fichiers de test, 64 tests |
| Dépendances runtime | 3 (`next`, `react`, `react-dom`) — aucune librairie UI, aucune police distante |
| Bundle page d'accueil | 105 kB first load |
| Données par jour | ~45 octets → une décennie de suivi tient dans ~160 Ko (limite `localStorage` ≈ 5 Mo) |
| Failles `npm audit` (prod) | 2 : Next « Image Optimizer DoS » et PostCSS « XSS via `</style>` » |
| Pertinence réelle de ces failles | **nulle en l'état** : export statique (aucun optimiseur d'images serveur), CSS écrit par nous |
| Version de Node en CI | 20 (dépréciée, avertissement dans chaque run) |
| Widget natif | impossible depuis une PWA (contourné par raccourcis + badge) |
| Notifications push | impossibles sans serveur |

---

## 1. P0 — Corriger ce qui affiche des chiffres faux (≈ 4 h)

### 1.1 Les statistiques mentent sur une installation neuve ⚠️ le plus important — ✅ corrigé

**Constat vérifié sur le site en ligne**, sans aucune donnée saisie :

> Jours dans l'objectif : **30 / 30** · Série en cours : **30 j** · « jours consécutifs dans
> l'objectif »

Cause, dans `computeStats` : la fenêtre de 30 jours est remplie de zéros (jours *antérieurs à
l'installation*), et `0 ≤ objectif` est compté comme un jour réussi. Deux conséquences :

- l'utilisateur qui installe l'app voit immédiatement un tableau de chasse parfait, donc faux ;
- le jour où il commence à fumer, sa « série » chute brutalement de 30 à 0 — l'effet inverse de
  celui recherché.

**Correction** : distinguer « jour non suivi » de « jour à zéro ». Un jour n'est suivi qu'à
partir du premier jour avec une donnée (`firstTrackedDay`), et `streak` / `daysOnTarget` /
`average` ne doivent porter que sur des jours suivis.

```ts
// domain.ts
const firstTracked = series.findIndex((point) => point.count > 0);
const tracked = firstTracked === -1 ? [] : series.slice(firstTracked);
```

Effort : 45 min + tests. Impact : très élevé (crédibilité).

### 1.2 La moyenne inclut des jours non suivis — ✅ corrigé

Même racine : `average = total / series.length` divise par 30 même après 3 jours d'usage. Une
moyenne à 0,4 cigarette/jour alors qu'on en fume 8 est déroutant. À corriger avec §1.1.

### 1.3 Le graphique 7 jours affiche des barres « réussies » avant l'installation — ✅ corrigé

Toujours la même confusion zéro/non-suivi. Les jours antérieurs au suivi devraient être des
pointillés neutres, pas des barres vertes.

### 1.4 Saisie de l'objectif pénible — ✅ corrigé

Régler 20 cigarettes impose 10 clics sur le stepper. Remplacer par un `<input type="range">` ou
un champ numérique, avec les boutons −/+ conservés pour l'ajustement fin. Effort : 30 min.

### 1.5 Pas d'écran « nouvelle version disponible » — ✅ corrigé

`public/sw.js` déclare `CACHE_VERSION = "v1"` en dur et fait `skipWaiting()` à l'installation :
un utilisateur avec un onglet ouvert peut rester sur une version périmée sans le savoir. Il
manque un bandeau « Recharger pour mettre à jour », déclenché par
`registration.waiting.postMessage("SKIP_WAITING")`. Effort : 1 h.

---

## 2. P1 — Passer du compteur à l'outil de sevrage (≈ 3 jours)

### 2.1 Changer le modèle de données : journal d'événements ⭐ le levier principal

Aujourd'hui on ne stocke qu'un **total par jour** (`count`) et l'heure du dernier ajout
(`lastSmokedAt`). C'est suffisant pour compter, insuffisant pour aider. Les questions utiles
(« à quelle heure je fume le plus ? », « combien de temps entre deux cigarettes ? », « qu'est-ce
qui déclenche l'envie ? ») sont **structurellement impossibles** avec ce modèle.

Migration proposée, rétro-compatible :

```ts
// v2 : chaque cigarette est un événement
interface SmokeEvent {
  id: string;          // crypto.randomUUID()
  at: string;          // ISO 8601
  trigger?: string;    // "café", "stress", "pause", "après repas"…
  note?: string;
}
// localStorage["smokertrack.v2"] = { version: 2, goal, events: SmokeEvent[] }
```

- migration `v1 → v2` : générer `count` événements par jour avec une heure répartie (ou `12:00`
  quand l'heure réelle est inconnue), marqués `imported: true` ;
- l'export JSON garde la même enveloppe (`format: "smokertrack-backup"`, `version: 2`) et
  l'import accepte encore la v1 ;
- volume : ~90 octets par cigarette → 20 cigarettes/jour pendant 10 ans ≈ 6,5 Mo. **C'est la
  limite de `localStorage`** : prévoir une purge glissante (24 mois) ou passer à IndexedDB.

Débouchés immédiats : répartition horaire, intervalle médian entre cigarettes, « heure de la
première cigarette » (indicateur de dépendance), corrélation déclencheur → envie.

### 2.2 Notes et déclencheurs en un tap

À l'ajout, une rangée de pastilles optionnelles (« café », « stress », « ennui », « repas »,
« alcool », « social ») plutôt qu'un formulaire. Zéro friction, données exploitables. Dépend de
§2.1.

### 2.3 Coût et économies

Un champ « prix du paquet » et « cigarettes par paquet » → dépense cumulée, projection annuelle,
économies réalisées par rapport à une consommation de référence. C'est le retour d'information le
plus motivant dans ce type d'app, et il ne coûte qu'une multiplication. Effort : 2 h.

### 2.4 Objectif dégressif planifié

Plutôt qu'un objectif fixe : un plan (« 10 → 8 → 6 sur 6 semaines ») avec jalons datés, et un
écran qui montre l'objectif *du jour* selon le plan. Une seule structure de plus, mais c'est ce
qui distingue un outil de sevrage d'un simple compteur. Effort : 4 h.

### 2.5 Récapitulatif hebdomadaire

Le dimanche (ou au premier lancement de la semaine), une carte « bilan » : total, moyenne,
meilleur jour, jour le plus chargé, comparaison à la semaine précédente, déclencheur dominant.
Aucune notification (impossible sans serveur) : le bilan s'affiche à l'ouverture.

---

## 3. P2 — Rendre les données indestructibles (≈ 2 jours)

### 3.1 Sauvegarde automatique — ✅ corrigé (export hebdomadaire + option)

Aujourd'hui : un bandeau tous les 14 jours et un export manuel. Si l'utilisateur ignore le
bandeau, il perd tout en vidant son navigateur. Ajouter :

- export JSON automatique déclenché au premier lancement de chaque semaine ;
- option « rappeler tous les N jours » dans les réglages ;
- conservation des 3 derniers exports dans le dossier de téléchargement (nommage daté).

### 3.2 Transfert téléphone → téléphone sans serveur

Petit mais très utile : un **QR code** (ou un fichier `.json` partagé via l'API
`navigator.share`) contenant la sauvegarde. Ça résout le cas « je change de téléphone » sans
créer de compte. Un QR de 2 Ko suffit pour plusieurs mois (au-delà, partage de fichier natif).

### 3.3 Synchronisation optionnelle (le seul vrai manque)

L'interface `DailyLogStore` (`subscribe` / `increment` / `setGoal` / `deleteAll`) a été conçue
pour ça : brancher une implémentation distante ne touche pas l'interface.

| Option | Gratuit | Compte requis | Remarque |
|---|---|---|---|
| **Supabase** `free` | oui | oui (e-mail) | Postgres + RLS, le plus simple à sécuriser |
| **Cloudflare D1/KV** | oui | oui | latence excellente, mais API à écrire |
| **WebDAV / Drive perso** | oui | non | zéro fuite vers un tiers, UX de configuration rude |
| **Gist privé + token** | oui | oui | hack utile pour un usage solo |

Résolution de conflits : la donnée est un compteur **par jour**, donc un *last-write-wins*
horodaté par `serverTimestamp` suffit — pas besoin de CRDT. Le vrai risque est le double comptage
hors-ligne : conserver un journal d'incréments non synchronisés (`dirtyDays`) et rejouer les
deltas à la reconnexion.

**Ma recommandation** : ne pas l'implémenter tant que §2.1 n'est pas fait (le journal
d'événements rend la synchro plus propre, avec des `id` stables et une fusion ensembliste).

---

## 4. P3 — Technique et qualité (≈ 2 jours)

| # | Action | Pourquoi | Effort |
|---|---|---|---|
| 4.1 | **Next 15/16 + React 19** | 2 avis `npm audit` (non exploitables ici, mais ils reviendront) ; Next 14 est en fin de vie | ½ j |
| 4.2 | ~~**Node 24 en CI**~~ → **fait** : Node 22 imposé (Capacitor 8 exige ≥ 22) | avertissement de dépréciation à chaque run | 5 min |
| 4.3 | **Tests e2e Playwright** | les tests jsdom ne couvrent ni le service worker, ni le hors-ligne réel, ni l'installation PWA | 1 j |
| 4.4 | **Test de non-régression sur `out/`** | vérifier le préfixe `basePath` et la présence de `sw.js`, manifeste, icônes dans le HTML généré (classe de bug déjà rencontrée) | 2 h |
| 4.5 | **CodeQL + `npm audit` bloquant** | Dependabot ouvre déjà des PR, mais rien ne bloque une faille | 1 h |
| 4.6 | **Budget Lighthouse en CI** | garantit que la PWA reste installable et rapide | 2 h |
| 4.7 | **i18n fr/en** | l'app est en français en dur ; utile seulement si tu veux la partager | ½ j |
| 4.8 | **Error boundary + écran de secours** | une exception React laisse une page blanche | 1 h |
| 4.9 | **Purge glissante de l'historique** | `localStorage` saturé = écritures silencieusement perdues | 2 h |

---

## 4 bis. Mise à jour v1.4 — dette soldée

| Point | État |
|---|---|
| §4.2 Node 24 en CI | ✅ Node 22 (exigence Capacitor 8) |
| Actions GitHub obsolètes (6 PR Dependabot) | ✅ montées appliquées : checkout v7, setup-node v7, setup-java v6, configure-pages v6, deploy-pages v5, upload-pages-artifact v5, cache v6, upload/download-artifact v7/v8 |
| PR Dependabot « dev-dependencies » (#7) | ❌ refusée : eslint 10 (flat config) + eslint-config-next 16 exigent Next 16 → à faire avec la migration §4.1 |
| Bruit `Not implemented: navigation` dans les tests | ✅ neutralisé (`HTMLAnchorElement.prototype.click`) |
| Branche distante parasite `manifest.json` | ✅ supprimée |
| Widget natif Android | ✅ implémenté (voir docs/ANDROID.md) |
| Heure de la dernière cigarette + compte à rebours | ✅ **v1.5** : dans l'app et sur le widget, écart déduit de l'objectif (16 h / objectif) |

## 5. Ce que je ne recommande pas (et pourquoi)

| Idée | Verdict |
|---|---|
| **Widget natif iOS** | impossible depuis une PWA et hors périmètre du projet Android ; nécessiterait Xcode, un compte développeur Apple (99 €/an) et une publication App Store. |
| ~~Widget natif Android~~ | ✅ **fait en v1.4** : l'APK embarque un `AppWidgetProvider` (compteur + « +1 »), sans compte ni serveur. |
| **Notifications push de rappel** | exigent un serveur (Web Push + VAPID) : contradiction directe avec l'absence de backend. Alternative : badge + bilan à l'ouverture. |
| **Analytics (GA, Plausible…)** | sur une donnée de santé, même anonymisée, le coût de confiance dépasse le bénéfice. |
| **Comptes utilisateurs / inscription** | transforme un outil privé en service à maintenir (RGPD, support, sauvegardes). Le local-first + export est un meilleur compromis ici. |
| **Ajout d'une librairie UI / de graphiques** | le bundle est à 105 kB ; tout gain visuel est déjà obtenu en CSS. |

---

## 6. Ordre conseillé

| Étape | Contenu | Effort | Impact |
|---|---|---|---|
| **1** | §1.1–1.3 : fiabilité des statistiques (zéro vs non-suivi) | 2 h | ⭐⭐⭐⭐⭐ |
| **2** | §1.4–1.5 + §3.1 : saisie d'objectif, mise à jour PWA, sauvegarde auto | 3 h | ⭐⭐⭐⭐ |
| **3** | §2.3 + §2.5 : coût/économies, bilan hebdomadaire | 3 h | ⭐⭐⭐⭐ |
| **4** | §2.1 + §2.2 : journal d'événements, déclencheurs | 2 j | ⭐⭐⭐⭐⭐ |
| **5** | §2.4 : objectif dégressif | ½ j | ⭐⭐⭐ |
| **6** | §4.1–4.5 : dette technique (Next 16, Node 24, e2e, CodeQL) | 2 j | ⭐⭐⭐ |
| **7** | §3.3 : synchronisation optionnelle | 2 j | ⭐⭐⭐⭐ (si multi-appareils) |

Les étapes 1 à 3 (≈ 8 h) suffisent à faire passer l'application de « prototype crédible » à
« outil qu'on ouvre tous les jours ». L'étape 4 est le vrai saut qualitatif.

---

## 7. Mise à jour du 25 octobre 2026 — audit complet, corrections et refonte visuelle

### 7.1 État de vérification (tout est vert)

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | ✅ 0 erreur |
| `next lint` | ✅ 0 avertissement |
| `vitest run` | ✅ 116 tests / 7 fichiers |
| `next build` | ✅ export statique, 6 pages |
| CI Pages & Android | ✅ déjà sur Node `22.x` (le point « Node 20 déprécié » de §4 est soldé) |

Aucun bug bloquant en l'état ; la revue de code a toutefois relevé les trois défauts
suivants, corrigés dans cette session.

### 7.2 Bugs trouvés et corrigés

1. **Ajouts du widget perdus après minuit** (`src/lib/useTracker.ts`).
   L'écouteur `visibilitychange` responsable de la fusion des cigarettes ajoutées
   depuis le widget n'était réinstallé qu'au premier montage ; dès que la clé du
   jour changeait (minuit), l'effet se ré-exécutait et s’arrêtait aussitôt, donc
   plus aucune fusion au retour au premier plan jusqu'au rechargement — et la
   fusion utilisait en plus la clé de la veille. Corrigé : clé du jour calculée à
   chaque fusion, écouteur installé à chaque exécution de l'effet.
2. **Bandeau « sauvegarde » illisible en thème clair** (`tracker.module.css`).
   Le texte ambre `#fcd34d` était écrasé en dur : sur fond blanc il passait sous
   le seuil de contraste AA. Remplacé par la variable thématisée `--warning`
   (`#b45309` en clair, `#fbbf24` en sombre).
3. **Compte à rebours figé au retour en arrière-plan** (`NextCigarette.tsx`).
   Les minuteurs sont throttlés par le navigateur : après un passage en onglet
   arrière-plan ou une sortie de veille, le décompte pouvait afficher une valeur
   périmée jusqu'à la prochaine seconde. Un rafraîchissement immédiat sur
   `visibilitychange` a été ajouté (et l'effet de fusion du widget a été
   par la même occasion débarrassé de sa dépendance à la clé du jour).

### 7.3 Refonte visuelle livrée

- **Thème « Aurora Glass »** (web) : nouvelle palette indigo profond + sarcelle →
  cyan (mode clair assorti), fond d'aurore animé (deux halos en dérive lente),
  cartes givrées translucides (`backdrop-filter`), filet de lumière au survol des
  boutons primaires, barre de progression avec brillant balayé, entrées en scène
  décalées des blocs, pop du compteur à chaque ajout, barres du graphique qui se
  déploient, scrollbars et sélection thématisées. Respect strict de
  `prefers-reduced-motion`.
- **Widget Android en liquid glass** : fond verre teinté translucide (le fond
  d'écran transparaît), liseré lumineux, reflet supérieur, bouton « +1 » sarcelle
  vitré.
- **Compte à rebours agrandi et bicolore**, web **et** widget : en rouge pendant
  tout le décompte (avec respiration/clignotant sur le web), bascule en **vert
  dès qu'il atteint zéro**, avec flash de célébration côté web ; côté widget
  l'alarme d'échéance bascule le Chronometer en vert (`setTextColor`), le texte
  passe de 13 à 21 sp.

### 7.4 Nouvelles propositions (non couvertes par §2 à §4)

| # | Proposition | Pourquoi | Effort |
|---|---|---|---|
| 7.4.1 | **Choix manuel du thème** (auto / clair / sombre) mémorisé en `localStorage` + bascule dans l'en-tête | Le thème suit uniquement la préférence système ; beaucoup d'utilisateurs veulent forcer le sombre le soir | 1 h |
| 7.4.2 | **Tests E2E Playwright** sur 2 parcours critiques (raccourci `?action=add` puis rechargement ; import d'une sauvegarde corrompue) | Les tests unitaires ne couvrent pas l'URL ni le cycle de vie complet | 3 h |
| 7.4.3 | **Export CSV** en plus du JSON | Ouvrir l'historique dans un tableur pour un suivi médical / un médecin | 1 h |
| 7.4.4 | Widget : **alarme exacte à l'échéance** (`SCHEDULE_EXACT_ALARM`, Android 12+) avec repli `setAndAllowWhileIdle` | Aujourd'hui la bascule rouge → vert peut être en retard d'une minute en veille profonde | 1 h30 |
| 7.4.5 | **Statistiques dans le widget** (moyenne 7 j, série) sur les grands widgets | Le widget reste un compteur ; la tendance est la donnée la plus motivante | 2 h |
| 7.4.6 | **i18n léger** (fr par défaut, en en option) | Lisibilité hors francophonie, sans dépendance | 3 h |
