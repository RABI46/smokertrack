# Publication sur F-Droid

Ce dossier contient tout ce qu'il faut pour publier SmokeTracker sur
[F-Droid](https://f-droid.org), le dépôt d'applications **libres** pour Android :
y sont distribuées uniquement des applications open source, compilées **depuis les
sources** par l'infrastructure F-Droid puis signées de leur clé.

Ce document explique :

1. l'état de conformité de l'application (politique d'inclusion) ;
2. ce qui a été préparé dans le dépôt ;
3. les étapes restantes de la soumission (compte GitLab requis) ;
4. le cycle de mises à jour après acceptation.

---

## 1. Conformité à la politique d'inclusion

| Exigence F-Droid | État | Détail |
|---|---|---|
| Licence libre | ✅ | MIT (`LICENSE` à la racine) |
| Sources publiques, complètes | ✅ | <https://github.com/RABI46/smokertrack> |
| Build 100 % reproductible depuis les sources | ✅ | `npm ci` → `next build` → `cap sync android` → `gradlew assembleRelease` |
| Aucune dépendance propriétaire | ✅ | le plugin Google `com.google.gms:google-services` (inutilisé) a été **retiré** ; vérifié contre les 114 signatures « non-free » du scanneur officiel (`fdroidserver`) : 0 occurrence |
| Aucune publicité / aucun traqueur | ✅ | application 100 % locale (données en `localStorage`, aucun appel réseau) |
| Permissions justifiées | ✅ | `INTERNET` (exigée par le WebView même hors-ligne), `SCHEDULE_EXACT_ALARM` (compte à rebours du widget, optionnelle) |
| Pas d'anti-feature | ✅ | aucune à déclarer |
| Version taguée en source | ⚠️ à faire | le tag `v1.5.0` doit être poussé **avant** la MR (voir étape 3.2) |
| `versionCode` croissant à chaque release | ✅ | inscrit en dur dans `android/app/build.gradle` (150 pour 1.5.0) |
| Métadonnées de présentation (fastlane) | ✅ | `fastlane/metadata/android/{fr-FR,en-US}/` (titre, description, changelog, icône 512×512) |

## 2. Ce qui a été préparé dans ce dépôt

```
fastlane/metadata/android/
├── fr-FR/                     # titre, descriptions, changelog 150, icône
└── en-US/                     # idem en anglais (langue de secours de F-Droid)
fdroid/metadata/
└── io.github.rabi46.smokertrack.yml   # recette de build prête pour fdroiddata
docs/FDROID.md                 # ce document
```

- **`fdroid/metadata/io.github.rabi46.smokertrack.yml`** : le fichier à copier tel
  quel dans le dépôt `fdroiddata` (étape 3.3). Il a été validé avec
  `fdroid lint -W error` (fdroidserver 2.4.5, catégories officielles à jour) et suit
  le schéma éprouvé par les applications Capacitor déjà publiées sur F-Droid.
- **`fastlane/metadata/android/`** : F-Droid relit automatiquement ces fichiers à
  chaque tag pour composer la page du store (titre ≤ 30 car., résumé ≤ 80 car.,
  description ≤ 4000 car., changelog ≤ 500 car. — limites respectées).
- **`android/` (Gradle)** : `versionCode`/`versionName` écrits en clair — c'est la
  source unique de vérité, lue aussi bien par la CI GitHub que par le robot de mise
  à jour de F-Droid.

> [!NOTE]
> La soumission ne peut pas être finalisée par un script : elle exige un **compte
> GitLab** et une ouverture de merge request depuis une interface authentifiée
> (gitlab.com/fdroid/fdroiddata n'accepte pas de dépôt automatisé externe).

## 3. Étapes de soumission

### 3.1 Fusionner la PR de préparation

La branche `arena/…` contient toutes les modifications ci-dessus. La fusionner dans
`main` (la CI Android passe au vert sur la branche elle-même, ce qui valide le build
Gradle après retrait du plugin Google).

### 3.2 Taguer la version `v1.5.0` sur `main`

F-Droid compile obligatoirement **un commit référencé** (ici, un tag). Le fichier de
métadonnées pointe sur `commit: v1.5.0`, qui doit donc exister avant la MR :

```bash
git checkout main && git pull
git tag -a v1.5.0 -m "SmokeTracker 1.5.0"
git push origin v1.5.0

# Recommandé : créer aussi la Release GitHub (la CI joint l'APK et
# l'URL sert de lien « Changelog » dans la fiche F-Droid) :
gh release create v1.5.0 --title "v1.5.0" \
  --notes-file fastlane/metadata/android/fr-FR/changelogs/150.txt
```

Le push du tag déclenche en bonus un build « smoke test » de la CI Android.

### 3.3 Ouvrir la merge request sur fdroiddata (voie directe, recommandée)

Prérequis : un compte sur <https://gitlab.com> (gratuit).

```bash
# 1. Forker https://gitlab.com/fdroid/fdroiddata (bouton « Fork »)
# 2. Cloner le fork et y copier les métadonnées
git clone https://gitlab.com/<VOUS>/fdroiddata.git
cd fdroiddata
cp /chemin/vers/smokertrack/fdroid/metadata/io.github.rabi46.smokertrack.yml metadata/
git add metadata/io.github.rabi46.smokertrack.yml
git commit -m "New app: SmokeTracker"
git push origin master
# 3. Ouvrir la MR : https://gitlab.com/fdroid/fdroiddata/-/merge_requests/new
#    (source : master de votre fork → cible : master de fdroiddata)
```

La CI de fdroiddata **compile réellement l'application** depuis votre dépôt au commit
tagué, vérifie que l'APK indique bien `versionName 1.5.0 / versionCode 150`, puis un
mainteneur relit la fiche. Comptez de quelques jours à quelques semaines selon la file
d'attente ; les remarques éventuelles concernent presque toujours la recette `sudo:`/
`init:` (dépendances Node) — le fichier fourni reprend les recettes déjà acceptées pour
d'autres applications Capacitor, ce qui limite ce risque.

### 3.4 Alternative : déposer une demande de packaging (RFP)

Si vous préférez laisser un volontaire écrire la recette (elle sera identique à celle
fournie ici) : ouvrez un ticket sur <https://gitlab.com/fdroid/rfp/-/issues> avec :

```
The app is licensed under MIT (OSI-approved, file LICENSE at repo root).

* Name: SmokeTracker
* Summary: Offline, local-first cigarette tracker with home-screen widget
* Description: Personal daily cigarette consumption log — counter, adjustable
  daily goal, 7/30-day trends, streaks, JSON backup, home-screen widget.
  No account, no server, no ads, no tracking; all data stays on the device.
* Website: https://rabi46.github.io/smokertrack/
* Source Code: https://github.com/RABI46/smokertrack
* Issue Tracker: https://github.com/RABI46/smokertrack/issues
* License: MIT

The app uses no proprietary dependencies and no non-free networks.
The project contains an F-Droid-ready build recipe and fastlane metadata
(see docs/FDROID.md and fdroid/metadata/io.github.rabi46.smokertrack.yml).
```

## 4. Après acceptation : cycle de mises à jour

Grâce à `AutoUpdateMode: Version` + `UpdateCheckMode: Tags`, F-Droid surveille les
tags du dépôt et prépare les nouvelles versions **sans nouvelle MR**, à condition de :

1. incrémenter `versionCode` (+1 suffit ; convention adoptée :
   `MAJEURE*10000 + MINEURE*100 + CORRECTIF`) et `versionName` dans
   `android/app/build.gradle`, en phase avec `package.json` (la CI échoue sinon) ;
2. ajouter `fastlane/metadata/android/fr-FR/changelogs/<versionCode>.txt`
   (et la version `en-US`) ;
3. taguer `v<versionName>` et pousser le tag ;
4. reporter le nouveau bloc `Builds:` dans `fdroid/metadata/io.github.rabi46.smokertrack.yml`
   (le robot F-Droid fait l'édition dans fdroiddata lui-même ; la copie du dépôt sert
   de référence) — en conservant le même bloc `sudo:`/`init:`.

L'APK publié sur F-Droid est signé par la clé F-Droid : il n'est pas interchangeable
avec les APK de la CI GitHub (signature différente → réinstallation nécessaire pour
changer de canal ; penser à l'export JSON de sauvegarde).

## Références

- Politique d'inclusion : <https://f-droid.org/docs/Inclusion_Policy/>
- Référence des métadonnées de build : <https://f-droid.org/docs/Build_Metadata_Reference/>
- Fastlane dans F-Droid : <https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots/>
- Applications Capacitor de référence sur fdroiddata : `com.kasette.app`,
  `com.iTrack.app`, `dev.fiedri.vibe` (même schéma `npm ci` + `cap sync android`).
