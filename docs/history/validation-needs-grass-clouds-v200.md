# Validation — repères, herbe peinte et nuages V200

3 octobre 2026, parent `fe3eb00`, schéma **182 inchangé**. [Contrat](../development/needs-grass-clouds-v200.md), [référence](../research/needs-grass-clouds-v200.md).

## Périmètre et références

Retouches de présentation, sans nouvelle mécanique : 17 repères des cinq besoins hors Humeur, couleur peinte du terrain à chaque racine d'herbe, pigment de sang limité aux racines sous le dessin réel, trou central des nuages 27→31 %. Aucune modification de simulation, sauvegarde, bridge, géométrie des brins ou horloge. Core humain **1.6.4871 rev590** vérifié localement pour les repères ; pas de prétention de parité exhaustive des égalités de Beauté ou de besoins absents.

## Contrôles ciblés

**36/36 tests dans six fichiers**, après optimisation du bake : `inspection-dossiers`, `weather-cloud-layer`, `grass-blood-v196`, `grass-blood-v200`, `gpu-ground-grass`, `filth-appearance`. Journal `tmp/ui-v200/targeted-final.log`. Seuils confrontés aux vraies transitions de pensées ; projections alpha aller/retour, débordements voisins, changements mutables au même tick, retrait, couverture/restauration, redimensionnement, option textures et absence d'uploads stables contrôlés. Les anciennes assertions de teinte rouge sur toute la cellule sont remplacées par les contrats d'empreinte ; le cache sparse antérieur garde son propre contrôle.

**Quatre parcours natifs distincts passent par reprises**, Chromium153, WebGPU matériel AMD/RDNA1, sans backend logiciel accepté :

- `needs-thresholds-v200` : 17 traits dans la moitié inférieure, deux contrastes selon franchissement, aide au survol et World inchangé. Captures relues. Résultat initial réutilisé : aucun changement UI ultérieur.
- `weather-cloud-v137`, oracle V200 : zéro différence de pixels et profondeur dans le disque intérieur sous les deux projections face au témoin nuages cachés ; témoin non masqué effectif et raccord extérieur à 39 %. Résultat initial réutilisé : seule la constante du rayon est changée.
- `grass-footprint-v200`, repris sur code final : oracle séparé pour **1792 racines**, zéro désaccord de support alpha. Comparaisons de pixels sur racine dans la tache, entre les taches de la même case, et cellule voisine atteinte. Textures on/off/on, nettoyage au même tick, terrain propre, snapshots sans mutation et uploads stables. La peinture terrain est désactivée dans ce pilote pour isoler le contrat de sang.
- `terrain-grass-v200` : trois racines d'une même cellule, nuances réellement différentes de l'atlas partagé. Référence CPU bilinéaire décodée sRGB par texel et couleur constante soumise au même shader de position/lumière ; différences maximales **0, 1, 0 sur 255**. Option textures, restoration exacte, patch du terrain au même tick sans remplacer texture/pixels, sol avec plancher identique au témoin draw vide, puis restitution. Capture sol/brins relue, World autoritaire inchangé.

Rapports/captures ignorés : `tmp/test-runs/v200-native/`, `v200-native-terrain/`, `v200-native-terrain-r2/`, journaux `tmp/ui-v200/native*.log` dont le témoin de pixels des nuages. Le premier pilote terrain échouait sur un nom de dépendance optimisée absent ; l'import passe maintenant par un module source Vite, sans détendre l'oracle. Un premier banc GPU a attendu un démarrage dont l'erreur était capturée par le menu : ancienne copie temporaire sans setter en cache. Diagnostic conservé ; module historique désormais servi sous un nom immuable dérivé de son contenu, et capture des erreurs de démarrage/réseau ajoutée au banc. Ce sont des réparations de pilotes, pas des correctifs du produit.

## GPU, scénario préparé 250²

`scripts/grass-footprint-performance-v200.mjs`, ordre **A/B/B/A successif**, sources gelées et hashes conservés. A = module d'herbe `fe3eb00`, seul fichier remplacé avec deux setters neutres de compatibilité ; B = peinture terrain partagée et masque de sang V200. Renderer, simulation, caméras, atlas et sauvegarde identiques. Save commune `v98/mixed-100.json`, SHA256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`, migrée normalement ; 104 humains, 100 animaux, 11009 ressources, **65 traces préparées de trois couches** sur un clone de rendu. Pause, 1920×1080/DPR1, iso proche et perspective basse, textures/ombres/vent activés, warmup3s et mesure4s. Ryzen53600, Chromium153, WebGPU AMD/RDNA1, timestamps supportés.

Temps **GPU de l'image complète**, en ms ; aucun coût isolé du seul draw d'herbe n'est déduit :

| Vue | p50 A1 / B1 / B2 / A2 | p95 A1 / B1 / B2 / A2 |
| --- | --- | --- |
| Iso proche | 2,490 / 2,425 / 2,425 / 2,490 | 3,015 / 3,015 / 3,015 / 3,015 |
| Perspective basse | 2,425 / 2,359 / 2,359 / 2,359 | 3,146 / 3,146 / 3,146 / 3,146 |

469–477 échantillons GPU par phase. Counters encodés identiques, p95 40/67 draws et 837503/1204005 triangles selon la vue ; les bundles retenus limitent leur portée. Pas d'erreur GPU/navigateur. Rapports `tmp/ui-v200/perf-gpu-{a1,b1,b2,a2}.json` : le sampler B emprunte bien l'atlas terrain **16 MB déjà existant**, availability1 et identité partagée. Aucun surcoût GPU significatif observé sur ces scènes ; les médianes légèrement plus basses ne sont pas revendiquées comme un gain. Granularité des timestamps et durée bornée empêchent une conclusion de coût nul ou une garantie sur d'autres matériels.

## Coûts et limites

CPU d'image **sans instrumentation GPU**, nouvelle séquence A/B/B/A sur les mêmes sources/scènes, warmup2s et mesure3s ; 710–724 images par phase :

| Vue | CPU p50 A1 / B1 / B2 / A2, ms | CPU p95 A1 / B1 / B2 / A2, ms |
| --- | --- | --- |
| Iso proche | 1,4 / 1,5 / 1,4 / 1,4 | 1,9 / 2,0 / 1,9 / 1,9 |
| Perspective basse | 1,7 / 1,7 / 1,7 / 1,6 | 2,3 / 2,3 / 2,2 / 2,3 |

p95 RAF4,2–4,3ms dans les huit phases, cadence d'affichage limitée par l'écran. L'écart d'une seule répétition iso n'est pas un surcoût reproductible. Rapports `tmp/ui-v200/perf-combined-cpu-{a1,b1,b2,a2}.json` ; les quatre anciens passages CPU acquis avant branchement peinture sont conservés comme diagnostic intermédiaire, pas mélangés à cette comparaison finale.

La peinture ajoute une lecture vertex, aucune texture, aucun bake CPU ou upload par brin. Le sang ajoute un champ dense **3 500 000 octets** côté CPU et le même payload côté GPU, plus 64 Kio d'alpha extrait à la création de l'atlas existant. Les valeurs de pigment sont quantifiées en trois intensités positives, avec zéro exact hors empreinte ; les contours sont lus au LOD0, qui peut différer visuellement des mipmaps du décalque à distance. Tout le brin prend la couleur de sa racine, sans gouttelettes distinctes sur sa surface.

Le bake des traces et un transfert du champ modifié coûtent réellement. Pas de bake ni d'upload du pigment sur snapshot stable, pas de boucle d'acteurs ajoutée par frame. Le premier bake dense reste une opération de chargement coûteuse ; ni le microbanc d'adoption ni la pause ne prouvent une accélération du worker ou du tick complet.

Diagnostic CPU final isolé `tmp/ui-v200/adoption-cpu.json`, hash helper `bdba4b00…480ef`, même hôte/Node24.11.1, **81 traces de trois couches** sur 250² : extraction d'alpha5,75ms, premier bake dense19,73ms ; adoption inchangée p50/p95 **0,0004/0,0095ms** (40 échantillons de mille appels), épaisseur modifiée **0,876/2,452ms**, ajout/retrait d'une trace **0,286/0,817ms** (34 échantillons après chauffe). Les transforms/masques sont préparés une seule fois par décalque ; les closures/allocation de racines par probe sont supprimées en conservant l'ordre arithmétique exact. Mesure d'une responsabilité seule, hors upload, adoption complète de snapshot, worker et GPU ; aucune comparaison générale au code antérieur.

Typage et **build de production689modules passent**, journal `tmp/ui-v200/build.log`. `check:docs` passe : 686 documents, 6615 liens, six en-têtes courants au schéma182 et trois sources originales inchangées ; `git diff --check` passe. Régression exhaustive, campagnes naturelles longues et navigateur exhaustif non exécutés. `test:presentation` non rejoué : horloge, bridge, interpolation et phases de travail inchangés, retouches de pigments/UI seules. Mode jour après commit local ; aucun push.
