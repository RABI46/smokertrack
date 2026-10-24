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
| Permissions | `INTERNET` uniquement (imposée par le WebView ; l'app fonctionne en mode avion) |
| Thème | sombre, splash « flamme », barre d'état `#0b1120` |
| Données | `localStorage` du WebView — même modèle local-first que la PWA |
| Taille APK | ~4,2 Mo (l'export web pèse moins de 1 Mo) |
| Widget | `AppWidgetProvider` natif : compteur + bouton « +1 » |

### Ce qui a été adapté pour le natif

- `src/components/NativeShell.tsx` : détecte `Capacitor.isNativePlatform()`, colore la barre
  d'état, marque `<html data-native="true">`, gère le bouton retour Android.
- `src/components/InstallPrompt.tsx` : le bouton « Installer » disparaît dans l'APK.
- `src/components/ServiceWorkerRegistration.tsx` : pas de service worker dans l'APK (les
  fichiers sont déjà embarqués, un cache ne créerait que du contenu périmé).
- `src/app/globals.css` : `env(safe-area-inset-*)` pour les encoches et barres gestuelles.
- Icônes adaptatives, icône ronde et splash régénérés aux couleurs de l'application.

### Mise à jour de l'application

Le `versionCode` est fixé au numéro de run GitHub Actions : il croît donc à chaque build, ce
qui permet l'installation par-dessus l'ancienne version. Le `versionName` suit
`package.json`.

## Widget natif d'écran d'accueil

L'APK embarque un **vrai widget Android** (`AppWidgetProvider`), pas une simple icône :

| Élément | Comportement |
|---|---|
| Affichage | Nombre de cigarettes du jour + objectif |
| Bouton **+ Une cigarette** | Enregistre une cigarette **sans ouvrir** l'application |
| Toucher le compteur | Ouvre l'application |
| Minuit | Le widget repart de zéro même si l'app n'a pas été ouverte |
| Taille | 2×2 cellules par défaut, redimensionnable (2×1 minimum) |
| Thème | Fond bleu nuit, accents orange, cohérent avec l'app |

### Comment les données circulent

Le WebView stocke les données dans `localStorage` ; le widget vit dans un autre processus et
ne peut pas y accéder. Un pont étroit fait la jointure :

```
WebView (source de vérité)            Widget natif
  localStorage["smokertrack.v1"]
            │  après chaque modification
            ▼
  WidgetBridge.sync({todayKey,count,goal})
            │                        ┌──────────────────────────┐
            └──► SharedPreferences ──►  lecture + affichage     │
                 smokertrack_widget    │  bouton "+1"             │
                                       │   → pending_add++        │
                                       └───────────┬──────────────┘
            ┌──────────────────────────────────────┘
            ▼
  WidgetBridge.consumePending()  →  appliqué au localStorage
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
