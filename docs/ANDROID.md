# Application Android (APK)

SmokeTracker existe sous deux formes à partir du **même code** :

| Forme | Cible | Installation |
|---|---|---|
| **PWA** | navigateur | <https://rabi46.github.io/smokertrack/> → « Installer » |
| **APK** | Android 7.0+ (API 24) | artefact généré par GitHub Actions |

L'APK n'est pas une réécriture : c'est l'export statique de Next.js **embarqué dans un
WebView** (Capacitor). Aucun code métier n'est dupliqué, les deux versions restent donc
strictement identiques.

## Obtenir l'APK

### 1. Depuis GitHub Actions (recommandé, gratuit)

1. Onglet **Actions** → workflow **« Android APK »**.
2. Ouvrir le dernier run réussi → section **Artifacts** → télécharger
   `smokertrack-apk-<numéro>`.
3. Décompresser l'archive : elle contient `smokertrack-<version>-<code>.apk`.
4. Sur le téléphone : ouvrir le fichier, autoriser « Installer des applications inconnues »
   pour le navigateur ou le gestionnaire de fichiers, confirmer.

Chaque run publie un APK **auto-signé** (debug) installable immédiatement. Conservez le
fichier : Android refuse de mettre à jour une application avec une signature différente.

### 2. En local (nécessite le SDK Android)

```bash
npm ci
npm run android:apk       # build web + sync + ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Prérequis : **Node 22+** (exigé par Capacitor 8), JDK 21, Android SDK (API 36,
build-tools 36.0.0), `ANDROID_HOME` défini.
`npm run android:open` ouvre le projet dans Android Studio.

## Signature de production

Sans keystore, la CI produit un APK **debug** (auto-signé, parfait pour un usage personnel
ou un test). Pour un APK **release** signé durablement :

```bash
# 1. Créer un keystore (à conserver précieusement : sans lui, plus de mise à jour possible)
keytool -genkey -v -keystore release.keystore -alias smokertrack \
        -keyalg RSA -keysize 2048 -validity 10000

# 2. Encoder en base64
base64 -w 0 release.keystore > release.keystore.b64
```

Puis, dans **Settings → Secrets and variables → Actions** du dépôt :

| Secret | Contenu |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contenu de `release.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | alias (ici `smokertrack`) |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |

La CI détecte ces secrets et bascule automatiquement sur `assembleRelease`.
Pour un dépôt public, gardez le keystore **hors du dépôt** (il est ignoré par `.gitignore`).

## Détails techniques

| Élément | Valeur |
|---|---|
| Identifiant | `io.github.rabi46.smokertrack` (ne plus changer : perte de données sinon) |
| minSdk / targetSdk | 24 (Android 7.0) / 36 |
| WebView | `https://localhost` (`androidScheme: https`) |
| Permissions | `INTERNET` (imposée par le WebView ; l'app fonctionne en mode avion) et `SCHEDULE_EXACT_ALARM` (bascule exacte du widget à l'échéance sur Android 12+, repli approximatif si révoquée) |
| Thème | « Aurora Glass » sombre, splash « flamme », barre d'état `#070b17` |
| Données | `localStorage` du WebView — même modèle local-first que la PWA |
| Taille APK | ~4,2 Mo (l'export web pèse moins de 1 Mo) |
| Widget | `AppWidgetProvider` natif : compteur, dernière cigarette, compte à rebours, bouton « +1 » |

### Ce qui a été adapté pour le natif

- `src/components/NativeShell.tsx` : détecte `Capacitor.isNativePlatform()`, colore la barre
  d'état, marque `<html data-native="true">`, gère le bouton retour Android.
- `src/components/InstallPrompt.tsx` : le bouton « Installer » disparaît dans l'APK.
- `src/components/ServiceWorkerRegistration.tsx` : pas de service worker dans l'APK (les
  fichiers sont déjà embarqués, un cache ne créerait que du contenu périmé).
- `src/app/globals.css` : `env(safe-area-inset-*)` pour les encoches et barres gestuelles.
- Icônes adaptatives, icône ronde et splash régénérés aux couleurs de l'application.

### Mise à jour de l'application

`versionName` ("1.5.0") et `versionCode` (150) sont écrits **en dur** dans
`android/app/build.gradle` — c'est la source unique de vérité, identique pour la CI,
F-Droid et les builds locaux :

- garder `versionName` aligné sur `package.json` > `version` (la CI échoue sinon) ;
- incrémenter `versionCode` à **chaque** publication (Android et F-Droid l'exigent) ;
- convention adoptée : `MAJEURE * 10000 + MINEURE * 100 + CORRECTIF` (1.5.0 → 150) ;
- la forme littérale (`versionCode 150`, `versionName "1.5.0"`) est volontaire : le
  robot `checkupdates` de F-Droid relit ces lignes à chaque nouveau tag git pour
  proposer les mises à jour automatiquement.

À chaque nouvelle version : incrémenter les deux champs, ajouter
`fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`, puis publier le tag
`v<versionName>`. Voir [FDROID.md](FDROID.md) pour la procédure de distribution complète.

## Widget natif d'écran d'accueil

L'APK embarque un **vrai widget Android** (`AppWidgetProvider`), pas une simple icône :

| Élément | Comportement |
|---|---|
| Affichage | Nombre de cigarettes du jour + objectif |
| Heure de la dernière cigarette | `Dernière : 14:32`, ou « aucune cigarette aujourd'hui » |
| Compte à rebours | Vers la prochaine cigarette, en **grand** ; **rouge** pendant le décompte puis **vert** dès qu'il atteint zéro (alarme exacte à l'échéance, repli approximatif), avec passage en « en retard de … » |
| Statistiques | Moyenne sur 7 jours + série en cours (poussées à chaque ouverture de l'application) |
| Bouton **+ Une cigarette** | Enregistre une cigarette **sans ouvrir** l'application |
| Toucher le compteur | Ouvre l'application |
| Minuit | Le widget repart de zéro même si l'app n'a pas été ouverte |
| Taille | 2×2 cellules par défaut, redimensionnable (2×1 minimum) |
| Thème | **Liquid glass** : verre teinté translucide, reflet supérieur, bouton sarcelle vitré — accordé au thème Aurora Glass de l'app |

### D'où vient le compte à rebours

Aucun réglage supplémentaire : l'écart cible entre deux cigarettes se déduit de
l'objectif quotidien, réparti sur 16 h d'éveil.

| Objectif | Écart entre deux cigarettes |
|---|---|
| 5 / jour | 3 h 12 min |
| 10 / jour | 1 h 36 min |
| 20 / jour | 48 min |

Le décompte est un `Chronometer` : il avance tout seul, sans réveiller
l'application. Deux alarmes sont posées par le provider — l'échéance (pour
basculer en « en retard de … ») et minuit (pour repartir de zéro) — via
`setAndAllowWhileIdle`, qui ne demande aucune permission spéciale.

La règle est écrite deux fois, volontairement : `spacingMs()` en TypeScript et
`spacingMs()` en Java. Elles doivent rester identiques, sinon le widget et
l'application afficheraient deux horaires différents.

### Comment les données circulent

Le WebView stocke les données dans `localStorage` ; le widget vit dans un autre processus et
ne peut pas y accéder. Un pont étroit fait la jointure :

```
WebView (source de vérité)            Widget natif
  localStorage["smokertrack.v1"]
            │  après chaque modification
            ▼
  WidgetBridge.sync({todayKey,count,goal,lastSmokedAt})
            │                        ┌──────────────────────────┐
            └──► SharedPreferences ──►  compteur, heure, décompte│
                 smokertrack_widget    │  bouton "+1"             │
                                       │   → pending_add++        │
                                       │   → last_smoked_at = now │
                                       └───────────┬──────────────┘
            ┌──────────────────────────────────────┘
            ▼
  WidgetBridge.consumePending()  →  {pending, lastSmokedAt} appliqués au localStorage
  (au démarrage et au retour au premier plan, une seule fois)
```

- `WidgetStorage.java` : lecture/écriture des préférences partagées.
- `SmokeWidgetProvider.java` : rendu du widget, gestion du « +1 » et du changement de jour.
- `WidgetBridgePlugin.java` : plugin Capacitor (`sync`, `consumePending`), enregistré dans
  `MainActivity`.
- `src/lib/widgetBridge.ts` : côté web, no-op total dans un navigateur.

Aucun réseau, aucune permission supplémentaire : uniquement un fichier de préférences local.

## Ce que l'APK change (et ne change pas)

**Change** : installation par icône, hors-ligne complet, badge et raccourcis plus fiables,
splash screen, aucune dépendance au navigateur.

**Ne change pas** : les données restent **locales à l'appareil**. Désinstaller l'APK efface
tout, comme vider les données du site pour la PWA → l'export JSON (manuel ou hebdomadaire)
reste indispensable.

**Différence avec la PWA** : l'APK fournit le widget natif, impossible depuis un navigateur.
La PWA conserve les raccourcis (appui long sur l'icône) et le badge comme équivalents.

## Publication sur le Play Store (optionnel)

L'APK convient au sideload. Pour une publication :

```bash
npm run android:bundle    # → android/app/build/outputs/bundle/release/app-release.aab
```

Il faut ensuite un compte Play Console (25 USD une fois), une fiche, une politique de
confidentialité publique (la page `/confidentialite` existe) et une déclaration « données de
santé » — plus contraignant que l'usage personnel, mais techniquement prêt.
