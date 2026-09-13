# Validation historique — v6-v7-presentation

Résultats des versions indiquées, pas une validation du code actuel. Voir [les preuves courantes](../development/validation.md).

## Après V7 — ciel, projections et relecture de l'environnement (13 septembre 2026)

[Contrat](../development/daylight-camera.md), [recherche et audit rétroactif](../research/environment-review.md). La simulation et son schéma 7 sont inchangés. **Sept contrôles passent** dans quatre fichiers : projections, rayons du sol, horloge cyclique, ressources graphiques résidentes, mouvement, stockage et compteur FPS ([rapport final](../../artifacts/daylight-camera-contracts.json)). Le scénario de cycle parcourt deux jours et les projections combinent trois tailles/formats de carte, trois aspects, trois niveaux de zoom et bascules répétées.

**Neuf parcours UI courts passent**, 193,87 s, aucune relance automatique ni échec ([rapport](../../artifacts/daylight-camera-ui.json)). Ils couvrent les besoins, logistique, rectangles, petites/grandes cartes, déplacement GPU, buissons et le nouveau parcours caméra/ciel. Après la préparation des shaders et le dernier garde de caméra, le parcours caméra/ciel repasse : 14,30 s ([rapport final](../../artifacts/daylight-camera-ui-final.json)). Il contrôle aussi l'annulation d'un rectangle lors d'une bascule, le retour exact à un ciel sauvegardé et une restauration à minuit. Le recontrôle final du fallback graphique est conservé [séparément](../../artifacts/daylight-camera-fallback.json).

Build final TypeScript/Vite réussi : jeu 1 008,25 ko, gzip 280,01 ko ; worker inchangé 68,61 ko. Avertissement connu du lot >500 ko conservé. Le long parcours UI de trois jours et les simulations de colonie ne sont pas relancés pour ce changement de présentation ; leurs preuves V7 ci-dessous demeurent historiques, pas de nouveaux passages revendiqués.

### Mesures de rendu et premier dézoom

Ryzen 5 3600, AMD/RDNA-1, Chromium matériel WebGPU, 1440×1000, carte 250² graine 42, simulation en pause. Le [benchmark de ciel](../../artifacts/daylight-camera-benchmark.json) mesure chaque phase après 90 images de chauffe, pendant au moins 300 images et huit secondes ; CPU de soumission distinct du temps GPU. Le contrôle historique utilise les anciennes couleurs et direction de lumière sur exactement le même décor. Ces mesures de régime établi précèdent la précompilation finale, qui change le démarrage et non les couches dessinées.

| Scène | Appels | Triangles | Frame moyenne / p95 / max (ms) |
|---|---:|---:|---:|
| Anciens réglages constants, proximité | 112 | 180 119 | 4,55 / 8,3 / 12,7 |
| Midi avec ciel, proximité | 120 | 194 253 | 7,14 / 12,4 / 16,9 |
| Même midi sans shader de ciel | 119 | 192 269 | 7,26 / 12,5 / 17,2 |
| Nuit, proximité | 120 | 194 253 | 7,89 / 12,6 / 20,5 |
| Anciens réglages, panorama | 13 | 425 957 | 4,45 / 8,2 / 16,5 |
| Midi avec ciel, panorama iso | 14 | 427 941 | 4,24 / 4,4 / 8,7 |
| Midi avec ciel, perspective proche | 128 | 203 103 | 8,98 / 12,9 / 20,8 |
| Midi avec ciel, panorama perspective | 14 | 427 941 | 4,26 / 4,4 / 8,9 |

Le fond ajoute un appel. La direction d'éclairage expose d'autres lots aux ombres : le surcoût proche demeure quand on retire seulement le ciel. Un échantillonnage CDP local montrait notamment du temps dans les soumissions `writeBuffer` ; cela ne mesure pas indépendamment le temps GPU et ne prouve pas la cause exacte dans le pilote. La différence de p95 des panoramas ne vaut pas promesse d'accélération : les captures sont sensibles à l'ordonnancement. Le budget de 16,7 ms est respecté au p95 dans ces scènes, pas à chaque image ; aucune garantie de fluidité universelle.

Le premier panorama, avant précompilation, avait un intervalle à **512,5 ms** hors fenêtre chaude. `preparePresentation` prépare désormais les variantes sous le chargement. Le [contrôle final des premières transitions](../../artifacts/camera-transitions.json) conserve toutes les 60 images de chaque manipulation, y compris le premier intervalle : maxima **16,8 ms** au premier dézoom, **8,4 ms** à la première perspective, **16,4 ms** au retour rapproché, **12,6 ms** au retour iso. Préparation initiale : **1 920,4 ms**. Aucun avertissement de validation GPU dans les rapports retenus. Ce coût initial est assumé, pas supprimé du chargement.

Captures locales inspectées : `artifacts/daylight-dawn.png` à 06:24, `daylight-noon.png` à midi et `daylight-night.png` à minuit, heures réellement chargées par le menu, soleil orienté dans le monde et nuit lisible ; screenshots ignorés par Git. La vue rasante conserve l'occlusion par le feuillage, signalée dans le guide.

Essais non retenus : redimensionner à chaud la texture d'ombres 2048→1024 dans le banc d'essai a provoqué des erreurs Three/WebGPU de texture détruite encore référencée ; ses chiffres sont **invalides**, archivés seulement en `tmp`, et aucun changement de résolution dynamique n'est livré. La première tentative de captures n'avait pas créé de sauvegarde reconnue par l'UI : le pilote utilise maintenant Sauvegarder avant ses fixtures, sans forcer l'activation du bouton. Le test de caméra sans DOM nécessitait un garde de libération des contrôles non connectés ; le garde et ses recontrôles sont livrés.


## V7 — rochers continus et buissons persistants (13 septembre 2026)

[Contrat et adaptations](../development/rocks-and-plants.md), [recherche fraîche](../research/plant-growth.md). **30 scénarios noyau passent** sur 14 fichiers, 95,75 s, sans concurrence avec le navigateur : [rapport](../../artifacts/rocks-plants-core-validation.json). Le pilote conserve cinq jours sur trois cartes 250², soit 90 000 ticks. Les nouvelles familles testent raccords de rochers, retraits/restauration, intégrale indépendante de croissance, deux récoltes du même ID, arrondi aléatoire (y compris zéro), manque de place, coupe mûre/immature, migration et rétention des fruits. [Extension du rectangle](../../artifacts/plant-area-validation.json) : récolte et coupe confrontées aux commandes unitaires, avec plante immature ; passage ciblé final réussi.

**Huit parcours UI courts passent**, 163,22 s, zéro échec et zéro relance automatique : [rapport final](../../artifacts/rocks-plants-ui-guards.json). Le parcours de trois jours a aussi passé ses assertions métier dans le passage initial (5,7 min, WebGPU, construction du camp, alimentation, sommeil et bilan réconcilié), avant les derniers gardes de présentation et d'arrondi nul. Il n'a pas été relancé pour ces gardes qui ne modifient pas ses récoltes mûres. Les captures initiales restent locales ; aucun nouveau nombre exact de repas/décisions n'est inventé en l'absence de rapport JSON archivé pour ce passage long.

Échecs intermédiaires expliqués : des attentes comptaient la disparition du buisson et ses anciennes 14 baies de tutoriel ; elles vérifient maintenant son identité persistante et dix baies. La rétention des indices inclut désormais séparément les fruits. Un nouveau pilote UI attendait un bouton de menu déjà refermé après chargement : il choisit maintenant explicitement Inspecter. Ces corrections ont leurs recontrôles ci-dessus. Le build final TypeScript/Vite passe : jeu 1 002,82 ko (gzip 278,33), worker 68,61 ko ; avertissement connu du lot >500 ko conservé.

### Comparaison de rendu

Ryzen 5 3600, AMD/RDNA-1, WebGPU Chromium matériel, carte 250² graine 42, 1440×1000, pause, mêmes cadrages. 90 images de chauffe puis au moins huit secondes et 300 images, une seule promesse navigateur, aucun intervalle long supprimé. Les mesures RAF incluent l'ordonnancement ; la soumission CPU n'est pas le temps GPU. Le démarrage et la compilation initiale restent hors fenêtre.

| Mesure | Avant : cubes | Après final : surfaces facettées |
|---|---:|---:|
| Proximité : appels de dessin | 133 | 112 |
| Proximité : triangles soumis | 194 897 | 180 119 |
| Proximité : frame moyenne / p95 / max (ms) | 4,47 / 8,3 / 8,6 | 4,66 / 8,4 / 12,5 |
| Proximité : soumission CPU p95 (ms) | 6,0 | 5,7 |
| Panorama : appels de dessin | 13 | 13 |
| Panorama : triangles soumis | 499 839 | 425 957 |
| Panorama : frame moyenne / p95 / max (ms) | 4,56 / 8,3 / 25,0 | 4,47 / 8,3 / 12,5 |

[Avant](../../artifacts/overview-rocks-before.json), [premier découpage corrigé](../../artifacts/overview-rocks-culled.json), [final](../../artifacts/overview-rocks-final.json). Le premier essai avec un seul lot rocheux global dégradait la proximité (p95 12,6 ms, contre 8,3) : il dessinait les massifs hors champ. Les vues proches utilisent désormais des chunks partageant leurs attributs avec le panorama. Un passage corrigé avait mesuré 4,3 ms au p95 panoramique ; le passage final donne 8,3. Cette variabilité interdit de promettre un facteur stable de gain en FPS. La réduction des triangles/appels est reproductible ; aucun budget nul ou plafond universel n'est revendiqué.

### Modifications locales et croissance

[Douze retraits de rochers](../../artifacts/rock-edit-benchmark.json) : 5–9 cellules retouchées par retrait, mêmes objets géométrie/position/index et même caméra. Coût CPU de `setWorld` 3,1–9,4 ms ; intervalles d'image p95 12,3 ms, maximum 24,9 ms. C'est une injection de terrain dans la présentation, **pas du minage jouable**. Les tableaux d'attributs/indices des rochers représentent 13 262 688 octets, indices des deux vues inclus et attributs partagés comptés une fois ; ni mémoire globale du renderer ni copies internes du pilote GPU ne sont comprises. Les scans de grille et la compaction des indices restent des coûts réels.

[Suivi de croissance](../../artifacts/plant-growth-benchmark.json) : Chromium 153.0.8010.12, WebGPU, même CPU/carte/viewport, 12 411 ressources dont 3 366 buissons. Vingt lots de chauffe puis cent lots de cent vérifications. Avec tous les buissons encore non récoltables : moyenne 0,316 ms, p95 des moyennes de lots 0,483 ms, maximum 0,916 ms par appel. Sans buisson en repousse, coût proche de la résolution du chronomètre. Le monitor ne parcourt pas les arbres ; la simulation ne met pas à jour toutes les plantes chaque tick. Ce microbenchmark CPU exclut le passage simultané à maturité, les téléversements et les images GPU ; il ne doit pas être annoncé comme un percentile de frame.

Les coefficients de croissance et la coupe ont été confrontés aux sources du domaine ; climat variable, compétences et durée de travail exacte restent ouverts. Minage, cultures semées et cuisine restent absents. Les bilans historiques ci-dessous décrivent les versions précédentes.

## V6 — sol, déplacements et vue éloignée (13 septembre 2026)

[Contrat, sources et limites](../development/spatial-motion-storage.md). Le build TypeScript/Vite passe (lot jeu 996,26 ko, gzip 276,10 ko ; worker 66,66 ko ; avertissement de taille >500 ko conservé). **27 scénarios noyau, 12 fichiers, passent**, dont cinq jours sur trois cartes 250² : [rapport](../../artifacts/spatial-core-validation.json). Le passage utilise `--maxWorkers=1` : des exécutions concurrentes avec le navigateur avaient dépassé les délais de génération et de soak, sans échec de leurs assertions métier. Les délais et critères n'ont pas été relevés. Les 40 000 couples du scénario logistique sont conservés avec 200 piles réparties sur 200 cases. Le test de lit compare désormais des intervalles réellement dormis ; les durées de trajet ont leur oracle indépendant.

Les mesures graphiques utilisent Ryzen 5 3600, WebGPU AMD/RDNA-1, Chromium normal sans fenêtre, viewport 1440×1000, carte 250² graine 42 en pause. 90 images de chauffe, puis au moins huit secondes et 300 images ; aucune image longue filtrée dans cette fenêtre. Le premier affichage et ses éventuelles compilations de pipelines ne sont pas chronométrés par ce protocole. Le contrôle `stable-detailed` force les couches détaillées à tous les zooms sur le même moteur. Il permet d’isoler le coût du LOD. [Contrôle détaillé](../../artifacts/overview-stable-detailed.json), [rendu distant final](../../artifacts/overview-final-lod.json).

| Vue entière | Détail permanent | Représentation distante |
|---|---:|---:|
| Appels de dessin | 861 | 13 |
| Triangles soumis | 1 199 557 | 499 839 |
| Intervalle d’image p95 | 8,4 ms | 4,3 ms |
| Intervalle maximal | 12,7 ms | 8,5 ms |
| Soumission CPU p95 | 8,9 ms | 3,1 ms |

La vue locale garde 133 appels et 194 897 triangles dans les deux passages ; ses intervalles p95 sont 4,3 et 8,4 ms, maximum 8,4 et 20,8 ms. Cette variabilité empêche de prétendre à un gain universel dans la vue locale. Le temps CPU ne mesure pas l’exécution GPU ; l’intervalle RAF inclut l’ordonnancement. Aucun gain de navigation ni absence absolue de freeze n’est déduit de ce panorama en pause. Les captures de la carte entière et du camp au terme des trois jours ont été inspectées : relief, rivière, végétation, UI et compteur FPS visibles.

**Huit parcours UI passent ensemble** dans le [passage complet](../../artifacts/spatial-ui-validation.json), démarré à 18:27:28 UTC, 484,21 secondes. La partie WebGPU de trois jours effectue 48 décisions réelles de joueur et termine au tick 18 063 avec **3 lits, 1 table, 3 tabourets, 6 murs, 41 bois, 44 aliments et aucun chantier en attente**. Les 18 repas sont réconciliés, les trois colons ont dormi dans un lit et les reprises quotidiennes sont exactes. Ce passage précède les derniers garde-fous de sauvegarde/visibilité et la correction d'horloge ; les scénarios affectés sont recontrôlés séparément, sans redater la partie longue.

Un recontrôle a révélé une variation de vitesse intermittente : `performance.now()` d'un message pouvait dépasser l'horodatage de l'image suivante. Un cas déterministe échouait à 1,32 tick parcouru au lieu de 1,2. La chronologie avance maintenant uniquement sur l'horloge RAF. Le [contrôle GPU après correction](../../artifacts/spatial-movement-validation.json) passe : 196 mesures de translation, six directions et quatre cibles de travail ; erreur de vitesse maximale 0,000204 case/s à 6× et erreur d'orientation inférieure à 0,000001 radian. Le ramassage est aussi contrôlé après disparition de la pile source, sauvegarde/rechargement et lecture des deux attributs de pose GPU dans les quatre directions cardinales. Les [garde-fous ciblés](../../artifacts/spatial-final-guards.json) exercent aussi l'oracle de navigation, les coins bloqués, la reprise des arêtes et les bornes des instances restaurées. **Sept parcours courts repassent ensemble en 148,49 s**, sans relance automatique, après les corrections d’horloge et de visibilité : [rapport](../../artifacts/spatial-ui-guard-validation.json). La revue suivante a ajouté le respect des réservations lors des dépôts de récolte, l’exclusion de la propre réservation à la livraison et la position de ramassage conservée ; ces contrats sont recontrôlés dans le noyau final et les parcours UI concernés. Une attente reste possible si le worker épuise le tampon de présentation ; il n'y a pas d'extrapolation non validée.

**Audit à 100 colons sur la version corrigée** : [rapport](../../artifacts/dining-render-spatial.json), 18:44:27 UTC, même PC/WebGPU/viewport, mélange de 800 baies et 50 rations, tables et lits individuels, camps sans congestion. Capture de huit secondes minimum dans une seule promesse navigateur, sans polling du pilote ni suppression d'intervalles longs. À 6× : intervalle p95 **8,4 ms**, maximum **25 ms** ; soumission CPU p95 6,9 ms, adoption snapshot p95 1,9 ms et UI p95 6,8 ms. Aucune tâche longue ni erreur GPU enregistrée. Au tick 512, tous les aliments sont consommés, cent colons dorment et aucun souvenir sans table n'est apparu. En pause : p95 8,4 ms et maximum 20,9 ms. Le protocole de chauffe a changé depuis V5 ; on n'en déduit pas un facteur de performance comparatif.

**Dernière validation ciblée réussie** : 14 scénarios noyau dans quatre fichiers après les correctifs de réservation et d'orientation du prélèvement ; puis [trois parcours navigateur](../../artifacts/spatial-final-ui-validation.json), 46,88 s, sans échec ni nouvelle tentative. Ils couvrent repas/sommeil physiques, réserve/transport/construction/reprise en livraison et vitesse/orientation GPU. Le build final indiqué en tête suit les derniers changements de code. Les rapports précédents conservent leurs propres états et dates ; l'audit à cent acteurs précède ce dernier ajout de position de ramassage.

