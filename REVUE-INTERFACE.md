# Revue d'interface — SmokeTracker

Mode : **full** (aucun mode fourni). Périmètre : toute l'interface utilisateur de la PWA
(`src/app/**`, `src/components/**`, `src/app/globals.css`, `src/components/tracker.module.css`).
Framework : Next.js 14 (App Router) + React 18. Style : CSS Modules sur variables CSS maison
(thème « Aurora Glass ») ; aucune lib UI, aucun `motion`/`framer-motion` installé → toutes les
corrections sont exprimées en CSS Modules et en variables existantes.

## Couverture

| Catégorie | Éléments inspectés | Résultat |
| --- | --- | --- |
| Typographie | `globals.css` (root, `a`, `body`), `counter`, `statValue`, `listCount`, `stepValue`, `nextCountdown`, `chartValue`, `goalInput`, `.sectionHint`, `.hint`, `eyebrow` | 3 constats corrigés, 1 rejeté (`font-smoothing` déjà présent) |
| Surfaces | `.card`, `.hero`, `.stat`, `.nextRow`, `.stepper`, `.themeSwitch`, pastilles, `.smallButton`, `.listControls .stepButton`, `.themeOption` | 4 constats corrigés (rayons concentriques vérifiés : 20/16/14 px cohérents) |
| Animations | `riseIn`, `counterPop`, `barRise`, `progressSweep`, `bannerIn`, `toastIn`, `flashDue`, `dotBlink`, `logoGlow`, aurora drift, survols/actifs de tous les boutons | 3 constats corrigés (dont un bug d'interaction réel) |
| Icônes | `icons.tsx` (`FlameIcon`, `PlusIcon`, `UndoIcon`, `ShieldIcon`), usages dans `.badge`, `.hint`, boutons | 2 constats corrigés (une seule famille d'icônes, `currentColor` partout : conforme) |
| Performance | `will-change`, `transition` par propriété, pseudo-éléments plein écran, animation du `shimmer` | 1 constat rejeté (voir plus bas), aucune occurrence de `transition: all` |

Aucune surface hors de ce périmètre n'a été revue (widget natif Android, service worker).

## Constats

### Contraste et lisibilité

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| HIGH | `src/app/globals.css:43-49` et `:69-75` | Thème clair : `--accent:#0d9488`, `--accent-2:#0284c7`, `--success:#16a34a`, `--danger:#dc2626` | `#0f766e`, `#0369a1`, `#15803d`, `#b91c1c` | Texte blanc sur le dégradé du bouton principal : 3,74:1 → **5,47:1**. Pastilles « dans l'objectif » : 2,96:1 → **4,88:1**. Sous 4,5:1 le libellé des boutons et des pastilles est illisible en plein soleil. |
| MEDIUM | `src/components/CounterCard.tsx:52-67` | `<span key={stats.today} aria-live="polite">` | Compteur `aria-hidden`, annonce dans une région `aria-live` **stable** (`data-testid="counter-announcement"`) | `key` remonte le nœud à chaque clic : une région live recréée n'est pas annoncée de façon fiable, donc l'action principale de l'app était muette pour un lecteur d'écran. Assertion ajoutée dans `TrackerApp.test.tsx`. |

### Surfaces et cibles tactiles

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| HIGH | `tracker.module.css:185-205` (`HistoryList`) | boutons −/+ de 30×30 px | 34×34 px + pseudo-élément `inset:-6px -4px` (≈42×46 px) | Correction d'un oubli du jour passé impossible au pouce sans viser. Le débordement reste inférieur à l'espace entre les deux boutons : aucune cible ne se recouvre. |
| MEDIUM | `tracker.module.css:588` (`.smallButton`) | `min-height:38px` | `min-height:44px` (+ `border-radius:14px` pour rester concentrique) | Boutons « Exporter », « Restaurer », « Effacer » : sous le minimum tactile de 44 px, alors que l'app est d'abord utilisée sur mobile. |
| MEDIUM | `tracker.module.css:151-176` (`.themeOption`) | hauteur ≈30 px | pseudo-élément `inset:-7px 0` → 44 px en vertical | Pilule Auto/Clair/Sombre trop petite ; l'extension reste verticale pour ne pas chevaucher les options voisines. |
| LOW | `tracker.module.css:369` (`.card:hover`) | `.card:hover{transform:translateY(-3px)}` sur **toutes** les cartes | `.card:hover:not(.hero)` | La carte principale contient « Ajouter une cigarette » : la lever au survol déplace la cible sous le curseur. Le survol reste sur les cartes de consultation. |
| LOW | `tracker.module.css:190-216` (`HistoryList`) | `justify-content: space-between`, sans `margin-left` sur les contrôles | `flex-wrap:wrap` sur `.listRow` + `margin-left:auto` sur `.listControls` | Sur 360 px, le libellé long (« mercredi 24 septembre (aujourd'hui) ») et les contrôles se chevauchaient. |

### Animations et retours d'état

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| MEDIUM | `tracker.module.css:46-55` (`@keyframes riseIn`) | `transform: translateY(16px→0)` avec `animation-fill-mode: both` | `translate: 0 16px → 0 0` | Avec `both`, `transform` reste figé après l'animation et **annule** le `translateY(-3px)` du survol des cartes. `translate` (propriété indépendante) laisse `transform` libre et reste interruptible. |
| MEDIUM | `tracker.module.css:569` (`.primaryButton:active`) | `transform: translateY(1px) scale(0.99)` | `transform: scale(0.96)` | 0,99 est imperceptible : aucune sensation de pression sur l'action principale. |
| MEDIUM | `tracker.module.css:606` (`.ghostButton:active`) | `transform: translateY(0)` | `transform: scale(0.96)` | Aucun retour au clic sur « Annuler ». |
| LOW | `tracker.module.css:850+` (`.stepButton:active`) | pas d'état actif | `transform: scale(0.96)` | Les boutons de l'objectif ne donnaient aucun retour tactile. |

### Icônes et accessibilité du focus

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/app/globals.css:206-209` | `:focus-visible{ … border-radius:8px }` | règle retirée | Le `border-radius` global (spécificité d'un sélecteur de pseudo-classe sur `*`) arrondissait **tous** les éléments focalisés, y compris les boutons en pilule et les lignes de liste. |
| LOW | `globals.css:200-204` | `button{font-family:inherit}` | + `-webkit-tap-highlight-color: transparent` | Sur Android, chaque tap laissait un halo bleu par-dessus le dégradé. |
| LOW | `globals.css:511-514` (`.hint`) | icône `ShieldIcon` alignée sur la ligne de base | `.hint svg{vertical-align:-0.15em; margin-right:4px}` | Le cadenas flottait au-dessus du texte et collait au mot suivant. |

### Typographie

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| LOW | `globals.css:181-189` | aucun réglage de retour à la ligne | `h1,h2,h3{text-wrap:balance}` et `p,li{text-wrap:pretty}` | Titres sur deux lignes déséquilibrées et orphelines dans les paragraphes d'aide sur mobile. |

## Rejets

| Emplacement | Candidat | Rejeté parce que |
| --- | --- | --- |
| `globals.css:122` (aurores) | Retirer `will-change:transform` | Rejeté : la règle est sur les deux halos animés en permanence et évite un repaint plein écran ; c'est l'usage légitime de `will-change`. Seul un `will-change:all` serait fautif. |
| `globals.css:130-140` (body) | Ajouter `-webkit-font-smoothing:antialiased` | Rejeté : déjà présent sur `body`. |
| `tracker.module.css:410-440` (`.progressFill`) | Remplacer `::after` + `progressSweep` par une transition | Rejeté : animation d'ambiance sans coût d'attention (hors chemin d'interaction), et le projet n'a pas de lib de mouvement : la retirer serait une perte, pas une simplification. |
| `tracker.module.css:1-44` (stagger `riseIn`) | Supprimer le décalage de 0,02 s par bloc | Rejeté : entrée de page unique (pas une interaction fréquente), donc conforme à la règle de stagger. |
| `tracker.module.css:929-941` (`shimmer`) | Passer `background-position` à `transform` | Rejeté pour l'instant : le skeleton ne vit que quelques centaines de ms au premier rendu ; le gain serait invisible. `shortcut: shimmer sur background-position, à convertir en translate sur un pseudo-élément si le skeleton devient persistant (ex. chargement réseau).` |

## Vérification

| Commande / interaction | Résultat |
| --- | --- |
| `npm run lint` | ✔ Aucun avertissement ni erreur |
| `npm run typecheck` | ✔ Aucune erreur |
| `npm test` | ✔ 11 fichiers, **134 tests** passés (dont la nouvelle assertion d'annonce du compteur) |
| `npm run build` | ✔ Export statique généré (/, /confidentialite, /manifest.webmanifest) |
| `curl http://localhost:3000/` | 200, coquille + squelette de chargement servis |
| CSS compilé (`_next/static/css/app/*.css`) | `scale(0.96)` ×3, `translate: 0 16px`, `text-wrap: balance`/`pretty`, `-webkit-tap-highlight-color`, `:hover:not(.card.hero)` présents ; aucune règle `border-radius` sur `:focus-visible` |
| Ratios de contraste | calculés (WCAG 2.1) avant/après depuis les valeurs des jetons |
| Rendu visuel réel (navigateur) | **Non vérifié** : aucun navigateur installable dans cet environnement (téléchargement Chromium bloqué). Les états hover/focus/active et les animations n'ont pas été rejoués à 10 % de vitesse. |

**Verdict : Needs changes** — plus aucun constat `HIGH`, mais la vérification visuelle en
navigateur reste à faire (mentionnée ci-dessus).

---

## Annexe — outillage réparé au passage

Le CI de `main` était **déjà rouge** avant cette revue (run `45491525017`, job « Lint »
échoue) : le bump dependabot a installé un jeu incohérent avec Next 14.

| Fichier | Problème | Correction |
| --- | --- | --- |
| `package.json` | `eslint@10` + `eslint-config-next@16` + `typescript@7` avec `next@14` → `next lint` plante (`Invalid Options`), `tsc` refuse `baseUrl`, `next build` ne résout plus `@/` | `eslint@8.57.1`, `eslint-config-next@14.2.35`, `typescript@5.9.3` (alignés sur Next 14) |
| `vitest.config.ts` | `esbuild:{jsx:"automatic"}` n'est plus lu par Vitest 5 (Vite 8/oxc) → 7 fichiers `.tsx` en échec de parsing | `oxc:{jsx:{runtime:"automatic"}}` |

`npm run lint`, `typecheck`, `test` et `build` passent désormais tous les quatre.
