# Validation du prototype

## V8 — Première culture et validations regroupées (13 septembre 2026)

[Contrat de culture](farming.md), [recherche fraîche](../research/farming-reference.md). La validation est organisée en un lot initial puis des reprises ciblées, sans nouvelle partie longue pour chaque correction graphique. Les rapports d’échec intermédiaires sont conservés, pas remplacés par une affirmation de passage dès le premier essai.

Le [lot principal de simulation](../../artifacts/farming-core.json) a validé 31/34 scénarios. Les corrections ciblées ont couvert les attentes V8, la date de maturité et la capacité de réserve du nouveau scénario : [première reprise](../../artifacts/farming-core-corrections.json), [deux attentes restantes](../../artifacts/farming-core-final.json). Le timeout de 30 s d’un ancien scénario à invariants par tick a été porté à 60 s et le parallélisme Vitest limité à deux workers ; ce délai n’est pas un budget de performance du moteur. Le [contrat de culture](../../artifacts/farming-contract-final.json) ajoute le champ inaccessible ; les [contrats mouvement/aliments](../../artifacts/farming-motion-food-final.json) vérifient le jitter, le riz cru et les souvenirs ; les [instances finales](../../artifacts/farming-resident-final.json) passent également. Le catalogue de tests courant contient 35 scénarios, couverts par ce lot et ces reprises ; ce n’est pas une promesse d’absence de bugs.

Le joueur ordinaire développe trois cartes naturelles de 250² pendant cinq jours, dont la graine 42 prolongée à huit jours. Un scénario indépendant de champ simule huit jours sans avancer artificiellement sa croissance : défrichage, six semis, 36 riz mûrs, transport observé et second semis, besoins actifs et reprise exacte. Les petits scénarios de sauvegarde contrôlent aussi semis interrompu, autorisations, suppression de zone, checkpoint V7 et continuité V8.

Côté navigateur : [lot initial](../../artifacts/farming-ui.json), [reprise des parcours concernés](../../artifacts/farming-ui-final.json), [mouvement/ciel/culture après correction](../../artifacts/farming-motion-ui.json) et [culture avec buffers définitifs](../../artifacts/farming-gpu-final.json). Les 11 parcours courants sont couverts ; le pilote de culture a été corrigé pour dézoomer quand Architecte masque une extrémité, et les attentes de schéma/priorités ont été actualisées. La partie de trois jours utilise réellement commandes, vitesse, sauvegarde et interface, sans injection d’inventaire ou d’horloge : **3 lits, 1 table, 3 tabourets, 6 murs, 15 plants, 18 repas observés, 3 colons ayant dormi au lit**. Bilan final : 41 bois, 72 aliments physiques, aucun ordre en attente, nourriture minimale 35,07 et repos minimal 86,16. Conservation du bois et rapprochement des aliments consommés/produits passent. Les 15 plants sont encore en croissance, pas artificiellement récoltés au jour 3.

Le contrôle de translation a reproduit une réserve de snapshots épuisée (une image immobile). [MotionTimeline](spatial-motion-storage.md) passe de 250 à 400 ms d’avance de lecture ; aucune accélération de rattrapage ni modification de simulation. Après correction : 215 échantillons, erreur maximale de vitesse 0,000204 unité/s à cible 20, erreur d’orientation au travail 4,38×10⁻⁸ rad, quatre cibles, aucune erreur WebGPU. Contrepartie : 150 ms de latence visuelle supplémentaire au démarrage/reprise ; un arrêt de worker dépassant la réserve reste une limite explicite.

Build TypeScript/Vite final réussi : jeu 1 013,49 ko (gzip 281,63 ko), worker 76,23 ko ; avertissement connu du lot JavaScript >500 ko. Le dernier changement de capacité GPU ne modifie aucune règle de simulation.

### Audit de rendu ciblé

Ryzen 5 3600, GPU AMD/RDNA-1, Chromium WebGPU matériel, 1440×1000, carte 250² graine 42, simulation en pause. [Script reproductible](../../scripts/farming-render-bench.mjs), [avant optimisation](../../artifacts/farming-render-before.json), [mesure finale](../../artifacts/farming-render-benchmark.json). Même zone dégagée, même caméra et heure : 0 → 1 000 → 0 plants ; 30 images de transition, 90 de chauffe, au moins 300 images et six secondes de régime établi par phase. Ce fixture graphique ne mesure pas le débit d’une simulation de 1 000 cultivateurs.

| État final | Appels | Triangles | Frame p95 | setWorld CPU |
|---|---:|---:|---:|---:|
| Champ vide | 120 | 165 037 | 8,4 ms | 5,2 ms |
| 1 000 plants mûrs | 121 | 183 037 | 8,4 ms | 6,7 ms |
| Après retrait | 120 | 165 037 | 8,4 ms | 4,2 ms |

L’ajout initial coûtait 23,1 ms dans setWorld et présentait une transition p95 de 116,7 ms (max 191,7). Le prétraitement de la forêt est désormais évité si seuls les plants changent ; les matrices de riz emploient un stockage GPU à taille dynamique et la capacité de carte est réservée/précompilée sous l’écran de chargement. Aucun mesh ni remplacement de buffers lié à la capacité n’est requis au premier semis ou au passage de 128 à 129 plants. La transition finale avec 1 000 plants a un p95 de 8,4 ms, max 79,2 ms, contre 91,7 ms pour le contrôle vide ; la soumission CPU maximale est 8,6 ms contre 8,9 ms au contrôle. Le protocole transporte aussi la fixture par automatisation ; l’origine exacte des pics résiduels n’est pas isolée. Ces mesures ne justifient pas de promettre une fluidité parfaite dans toute circonstance. Le GPU proprement dit n’est pas chronométré séparément.

Compromis : pour une carte 250², environ 4,75 Mio de matrices/couleurs réservées côté CPU et autant côté GPU, nombre dessiné limité aux emplacements utilisés, aucune ombre projetée par les petits plants. Les tests de buffers et le retrait vérifient qu’un lot vide ne dessine rien. Pleine carte cultivée, autres GPU, climat variable et centaines de travailleurs restent des périmètres à mesurer.


## Après V7 — ciel, projections et relecture de l'environnement (13 septembre 2026)

[Contrat](daylight-camera.md), [recherche et audit rétroactif](../research/environment-review.md). La simulation et son schéma 7 sont inchangés. **Sept contrôles passent** dans quatre fichiers : projections, rayons du sol, horloge cyclique, ressources graphiques résidentes, mouvement, stockage et compteur FPS ([rapport final](../../artifacts/daylight-camera-contracts.json)). Le scénario de cycle parcourt deux jours et les projections combinent trois tailles/formats de carte, trois aspects, trois niveaux de zoom et bascules répétées.

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

[Contrat et adaptations](rocks-and-plants.md), [recherche fraîche](../research/plant-growth.md). **30 scénarios noyau passent** sur 14 fichiers, 95,75 s, sans concurrence avec le navigateur : [rapport](../../artifacts/rocks-plants-core-validation.json). Le pilote conserve cinq jours sur trois cartes 250², soit 90 000 ticks. Les nouvelles familles testent raccords de rochers, retraits/restauration, intégrale indépendante de croissance, deux récoltes du même ID, arrondi aléatoire (y compris zéro), manque de place, coupe mûre/immature, migration et rétention des fruits. [Extension du rectangle](../../artifacts/plant-area-validation.json) : récolte et coupe confrontées aux commandes unitaires, avec plante immature ; passage ciblé final réussi.

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

[Contrat, sources et limites](spatial-motion-storage.md). Le build TypeScript/Vite passe (lot jeu 996,26 ko, gzip 276,10 ko ; worker 66,66 ko ; avertissement de taille >500 ko conservé). **27 scénarios noyau, 12 fichiers, passent**, dont cinq jours sur trois cartes 250² : [rapport](../../artifacts/spatial-core-validation.json). Le passage utilise `--maxWorkers=1` : des exécutions concurrentes avec le navigateur avaient dépassé les délais de génération et de soak, sans échec de leurs assertions métier. Les délais et critères n'ont pas été relevés. Les 40 000 couples du scénario logistique sont conservés avec 200 piles réparties sur 200 cases. Le test de lit compare désormais des intervalles réellement dormis ; les durées de trajet ont leur oracle indépendant.

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

## Historique : catalogue alimentaire et propriété — 13 septembre 2026

Le [contrat alimentaire V5](food-items.md) livre baies/rations distinctes, limites de pile, quantités d'ingestion, nutrition adulte et profils historiques. Le [catalogue](../gameplay/content-catalogue.md) précise pourquoi les 95 familles du corpus ne constituent pas une liste exhaustive ; le [contrat équipement/portraits](character-presentation.md) reste prévu.

**Noyau : 24 scénarios / 11 fichiers passent**, dernier passage après correction de la réservation propre du transporteur : 35,60 s. Les deux scénarios alimentaires combinent types, limites, transport, compétition, interruption, faim et migration V4/V5. Un cas ajouté pendant la revue échouait avec six baies au lieu de seize, puis passe après exclusion de la réservation de transport du colon lors du remplacement atomique de sa tâche. Les réservations d'autrui restent contraignantes. Le pilote naturel exerce 90 000 ticks sur trois cartes et cinq jours, avec conservation par unités consommées et restauration quotidienne exacte.

**Premier passage UI : sept parcours réussis**, sans échec ni relance automatique, 435,05 s au total. Le parcours de trois jours a utilisé WebGPU matériel en 331,31 s : 49 décisions, 18 repas, trois dormeurs en lits observés, trois lits/table/trois tabourets/six murs, 41 bois et 79 baies à la fin ; bilan des stocks réconcilié, aucune erreur navigateur. Ce passage précède la dernière correction de réservation propre ; les résultats de sa revalidation longue sont ajoutés ci-dessous. Le fallback reste couvert par le parcours de frontières, sans lui attribuer les performances du GPU matériel.

**Build après correction : réussi**, TypeScript strict et Vite ; bundle jeu 986,28 kB (273,19 kB gzip), worker 57,40 kB. L'avertissement de bundle supérieur à 500 kB persiste ; il concerne le chargement, pas une preuve de lenteur de frame.

**Revalidation après correction : partie UI de trois jours réussie en 330,28 s**, sans erreur ni nouvelle tentative, WebGPU matériel. Elle vérifie aussi les piles initiales de dix et huit rations, leur affichage et l’absence de portions historiques dans une nouvelle colonie. Bilan final : 18 repas, 47 décisions, trois colons ayant utilisé leurs lits, camp complet et conservation vérifiée. [Résultats structurés et décisions du pilote](../../artifacts/food-validation.json).

### Audit graphique de la nouvelle tranche

Rapport [dining-render-food-items.json](../../artifacts/dining-render-food-items.json), 13 septembre 2026 à 17:38:56 UTC. Ryzen 5 3600, GPU AMD/RDNA-1, Chromium headless normal, WebGPU, viewport 1440×1000, carte naturelle 250² avec emplacements individuels dégagés. Cent acteurs, cinquante portions de seize baies et cinquante rations, tables/tabourets et lits attribués ; 60 frames de chauffe puis huit secondes minimum par phase. Aucun autre parcours GPU lancé simultanément. La sérialisation du monde reste hors des frames mesurées.

| Mesure, vitesse 6× | p95 | Maximum |
|---|---:|---:|
| Intervalle entre images, 1 855 intervalles | 4,3 ms | 16,7 ms |
| CPU de la frame, 1 856 échantillons | 4,3 ms | 6,6 ms |
| Adoption snapshot, 34 échantillons | 2,2 ms | 2,9 ms |
| Mise à jour UI, 34 échantillons | 4,9 ms | 4,9 ms |

Aucune tâche longue ni frame au-dessus de 32 ms enregistrée, aucune erreur GPU/navigateur. Au tick 492, les cent repas sont consommés, cent colons dorment dans leur lit et aucun souvenir sans table n'est apparu. En pause, p95 des intervalles 8,3 ms et maximum 12,5 ms. Ces chiffres ne garantissent pas une fluidité parfaite partout : scénario sans congestion et sans les futurs systèmes. Le nouveau mélange alimentaire diffère du contrôle V4 ; aucun facteur d'accélération n'est déduit de leurs états différents. Les anciens rapports de correction des freezes restent intacts.

## Historique : abattage fluide et partie de plusieurs jours — 13 septembre 2026

[Cycle de vie graphique](render-lifecycle.md), [relecture de la collecte et du pilote](../research/colony-progression.md), [inventaire du gameplay](../gameplay/implementation-status.md). La simulation et le schéma 4 restent inchangés : cette tranche corrige les reconstructions graphiques répétées et ajoute une vérification de développement de colonie.

**Deux nouveaux scénarios approfondis passent.** Le pilote fait cinq jours sur chacune des trois cartes naturelles 250² (graines 42, 93, 2048), soit 90 000 ticks : matériaux conservés, besoins non épuisés, trois lits/table/trois sièges construits dès la première journée, six murs au terme de la partie, au moins dix repas et 4 000 ticks de sommeil en lit par colon, restauration quotidienne exacte. Passage final : 31,07 s. Le contrôle de conservation/libération des buffers et faces graphiques passe séparément en 1,17 s. Les vingt scénarios antérieurs, dont les contrats de simulation inchangés, ont leur dernier passage global dans la section historique suivante ; ils ne sont pas redatés artificiellement.

**Six parcours UI courts passent ensemble** dans le premier appel navigateur ; leurs durées cumulées sont de 113,331 s. **Le parcours de trois jours passe ensuite en 437,36 s**, après correction de son pilote. Le [rapport consolidé](../../artifacts/colony-validation.json) conserve les deux dates, les durées, les assertions métier et les pièces jointes. Le parcours long hérite du backend logiciel du projet : **WebGL 2/SwiftShader**, ce qui ne constitue pas une mesure de performance GPU. Les parcours courts de gameplay utilisent Chromium normal/WebGPU ; celui des frontières conserve le repli logiciel.

Le pilote UI commence une partie normale, sans fixture injectée ni accélération cachée. Il effectue 43 décisions par menus/clics et utilise la vitesse 6× du jeu. À la fin des trois jours (tick 18 071), il reste **41 bois et 23 portions**, avec **3 lits, 1 table, 3 tabourets, 6 murs et aucun chantier en attente**. Les **21 repas** sont rapprochés de la perte de nourriture ; les trois colons ont été observés dormant dans un lit. Les trois sauvegardes quotidiennes rechargent exactement leur état. Aucun message d'erreur console/pipeline.

La première version du pilote UI fermait Architecte après choix de l'outil : cela le désactivait conformément à l'interface et l'ordre n'était pas envoyé. Le test conserve désormais le panneau ouvert ; cet échec n'est pas un bug du moteur ni un passage réussi. Le premier plan de simulation essayait un siège hors clairière ; le plan a été corrigé sans ajouter d'objets au monde ni diminuer le nombre de sièges attendu. Les captures du repas assis et du camp de trois jours ont été **inspectées visuellement** : volumes, place assise, lits occupés et ressources visibles cohérents. `artifacts/dining-seated.png` et `artifacts/colony-three-days.png` sont régénérables et ignorés dans Git.

### Comparaison matérielle avant/après

Même PC que les audits précédents, WebGPU AMD/RDNA-1, Chromium normal sans fenêtre, 1 440×1 000. Les timings sont distincts du parcours fonctionnel en rendu logiciel. Aucun autre audit GPU n'a tourné simultanément.

| Mesure | Avant | Après |
|---|---:|---:|
| Douze arbres sur 250², maximum d'intervalle de frame | 204,1 ms | **29,2 ms** |
| Fenêtres suivant les retraits, p95 / maximum | 50,0 / 175,0 ms | **4,3 / 29,2 ms** |
| Créations synchrones de pipelines pendant l'abattage | 75 | **4** |
| Mise à jour de ressources, coût CPU maximal | 15,9 ms | **5,0 ms** |
| Cent colons, scénario repas/sommeil 6×, maximum de frame | 333,4 ms | **20,8 ms** |
| Même scénario, renderer CPU maximal | 101,5 ms | **8,8 ms** |

Les [rapports d'abattage avant](../../artifacts/tree-render-before.json) et [après](../../artifacts/tree-render-after.json) conservent les données et horodatages (16:41:43 et 16:45:54 UTC). Douze arbres réellement abattus, mêmes 141 bois disponibles, aucune erreur ; les ticks de publication diffèrent car les mesures suivent le temps réel. Le p95 global de frame reste 4,3 ms : c'est le maximum et la fenêtre des retraits qui révèlent ici le problème.

Le [nouveau contrôle à cent acteurs](../../artifacts/dining-render-retained.json), à 17:05:27 UTC, utilise le même scénario que le [rapport historique](../../artifacts/dining-render-benchmark.json). En activité, p95 de frame 4,3 ms, maximum 20,8 ms, aucune tâche longue relevée ; adoption des snapshots au maximum 3,1 ms et mise à jour DOM 4,8 ms. Les cent portions sont consommées à table et les cent lits occupés. En pause, p95 8,4 ms, maximum 12,5 ms ; 139 appels de dessin contre 173 auparavant, avec 221 645 triangles dans les deux cas.

Ces résultats montrent la suppression des gros gels reproduits sur ces scénarios. Ils ne garantissent pas toutes les frames sous 16,7 ms ni une fluidité parfaite sur tout matériel, en congestion ou lors d'une nouvelle allocation massive. Les reconstructions locales à l'ajout de ressources et les hausses de capacité restent des points d'audit lors des prochains systèmes.

**Compilation TypeScript/Vite finale réussie** : jeu 985,46 kB minifiés / 272,75 kB gzip, worker inchangé à 55,12 kB. Le warning de chunk supérieur à 500 kB reste visible. Le renderer principal passe de 774 à 667 lignes ; trois responsabilités supplémentaires sont extraites. Contrôle de 27 documents et 231 liens locaux réussi ; fins de fichiers vérifiées avant le commit. Le dernier nettoyage ne change que l'ordre de libération des propriétaires graphiques et retire deux références inutilisées ; le contrôle matériel à cent acteurs le suit.

## Historique : repas à table, confort et FPS — 13 septembre 2026

[Contrat livré](dining.md), [recherche et écarts de référence](../research/dining-reference.md). Tables et tabourets nécessitent livraison et construction ; le repas réserve une place, y transporte la portion puis l'ingère. Le confort dépend de l'usage réel du mobilier ; le premier souvenir concerne le repas sans table. Le schéma 4 conserve les nouvelles phases et migre les versions 1 à 3. L'humeur complète et les types d'aliments restent à développer. Les tables bloquent ici le passage : cette adaptation 3D est explicitement provisoire.

**Simulation : 20/20 scénarios dans huit fichiers, 26,86 s (`npm test`).** Le passage inclut le soak de 60 000 ticks sur cinq graines. Trois familles supplémentaires vérifient les repas concurrents, les interruptions et meubles invalidés, les quatre orientations, les limites de portée, la conservation, les reprises aux différentes phases, la migration d'une véritable ingestion V3, le confort et l'expiration du souvenir. Un oracle compare les résultats et chemins des recherches bornées et complètes sur 120 cartes. Un scénario vérifie la fenêtre FPS, les blocages visibles et le retour d'un onglet caché. Ces contrôles ne constituent pas une couverture exhaustive.

**Intégration : 6/6 parcours passent ensemble en 130,00 s.** Le [rapport archivé](../../artifacts/dining-validation.json), démarrage à 15:53:01 UTC, conserve les durées et pièces jointes. Besoins physiques, boucle matérielle, frontières/migrations, rectangles 250², nouvelles cartes/restauration et repas à table sont vérifiés. Le dernier parcours construit le mobilier avec 53 bois, observe portage et ingestion assise, recharge les deux phases et contrôle le compteur FPS en pause, dans Menu et sur une fenêtre étroite. Chromium normal utilise WebGPU AMD/RDNA-1 ; seul le parcours des frontières emploie SwiftShader.

Les premiers passages ont révélé un conflit d'accessibilité : le compteur en `output` ajoutait un rôle implicite `status`, ambigu avec les annonces de sauvegarde. Le compteur utilise maintenant un `span` avec `aria-live="off"`. Le retrait de réserve a également connu deux échecs intermittents dont la cause n'est pas établie : le contrôle vérifie désormais séparément l'aperçu maintenu puis le retrait par geste rapide après rechargement, avec diagnostics en cas d'échec. Les deux gestes passent dans le passage global final ; aucun correctif du moteur de rectangles n'est revendiqué. La première capture du repas assis a été inspectée ; le test régénère `artifacts/dining-seated.png` (ignoré dans Git). La capture rapprochée suivante n'a pas pu être relue à cause d'une erreur de l'outil d'image.

**Build TypeScript/Vite final réussi** : jeu 983,35 kB minifiés / 272,06 kB gzip ; worker 55,12 kB ; simulation partagée 13,43 / 5,59 kB. L'avertissement du bundle supérieur à 500 kB demeure. Le renderer principal passe de 1 046 à 774 lignes : poses GPU, mobilier et primitives ont été extraits dans des modules dédiés. Le compteur publie à cadence limitée et reste indépendant des ticks de simulation.

### Audit CPU apparié

[Contrôle avant optimisation](../../artifacts/dining-benchmark-before.json) à 15:26:21 UTC et [résultat après optimisation](../../artifacts/dining-benchmark.json) à 15:28:13 UTC, Node 24.11.1 sur Ryzen 5 3600. Même scénario, un échauffement et trois mesures de 400 ticks, cartes 64²/250² avec 3/100 acteurs. Chaque acteur dispose d'une portion, d'une table, d'un tabouret et d'un lit : le scénario isole les décisions et trajets, sans congestion.

Sur **250² et 100 acteurs**, le p95 de la phase repas/trajets passe de **23,70 à 6,90 ms par tick** (environ −71 %) ; maximum de 42,55 à 16,44 ms. Une fois les dormeurs installés, le p95 est de 0,196 ms. Les quatre empreintes finales sont identiques avant/après ; les cent repas assis et les cent couchages sont vérifiés. Le gain vient de recherches BFS arrêtées après la première couche contenant le but, avec départages conservés. Il s'agit de temps CPU, pas de FPS ; les recherches ordinaires de travail restent complètes et la navigation jouée n'utilise pas le laboratoire GPU.

### Audit navigateur et limite observée

[Rapport graphique détaillé](../../artifacts/dining-render-benchmark.json) à 16:03:20 UTC : Chromium normal sans fenêtre, WebGPU AMD/RDNA-1, 1 440×1 000, carte générée 250² sauf camps dégagés, 100 acteurs. Après 60 frames d'échauffement, chaque phase dure au moins huit secondes et 240 frames ; aucune sérialisation du monde n'est ajoutée dans les frames mesurées. Le script mesure séparément intervalles de rendu, temps CPU du renderer, adoption des snapshots et mise à jour DOM.

| Mesure | Pause | Simulation 6× |
|---|---:|---:|
| Nombre de frames | 1 521 | 1 660 |
| Intervalle de frame p95 / maximum | 8,4 / 25,0 ms | 8,3 / **333,4 ms** |
| Renderer CPU p95 / maximum | 6,1 / 10,9 ms | 4,8 / 101,5 ms |
| Adoption snapshot p95 / maximum | — | 3,9 / 4,3 ms |
| Mise à jour DOM p95 / maximum | — | 5,9 / 5,9 ms |

Les cent portions ont été mangées à table et les cent acteurs dorment au terme du scénario, sans erreur console/GPU. **Une saccade d'environ 333 ms reste observée**, avec une tâche longue de 108 ms et une frame CPU de 101,5 ms. La mise à jour DOM mesurée n'explique pas ce pic ; l'origine exacte côté rendu, pilote ou ordonnancement reste inconnue. Une trace ciblée est inscrite au prochain audit, avant d'augmenter la charge graphique. Le temps CPU inclut les soumissions mais ne chronomètre pas directement l'exécution GPU. Ces percentiles sur une scène sans congestion ne prouvent ni une fluidité constante ni un budget garanti sur d'autres appareils.

## Historique : repas et couchages physiques — 13 septembre 2026

[Contrat et paramètres](needs.md). Consommation à distance et bonus de lit voisin supprimés ; tâches de repas et de sommeil persistées en schéma 3, attribution de lits, interruptions conservant les objets. Deux scénarios de simulation existants enrichis, plutôt qu'une nouvelle multitude de tests. Les résultats antérieurs ci-dessous sont historiques, notamment leurs timings de navigation sous les anciennes règles.

**Simulation : 15/15 scénarios dans cinq fichiers, 23,68 s.** Le passage global comprend le soak des cinq graines, 60 000 ticks avec invariants, les nouvelles interactions repas/transport et couchage, les migrations V1/V2, les rectangles, la génération et le codec.

**Build final réussi** : jeu 980,07 kB, gzip 270,57 kB ; worker 49,36 kB. L'avertissement de chunk supérieur à 500 kB reste présent. Le shader d'ingestion et les poses de lits utilisent les attributs instanciés existants, sans animation d'os par personnage sur CPU.

**Mesure CPU dédiée** : [rapport complet](../../artifacts/needs-benchmark.json), Node 24.11.1, Ryzen 5 3600, 14:51:39 UTC. Sur 250² avec 100 colons, la phase mêlant décisions/trajets et arrivée au lit mesure 17,47 ms au p95 et 27,55 ms au maximum par tick ; après installation des dormeurs, 0,089 ms au p95. Les cent portions sont ingérées et les cent lits occupés. Le même scénario sur 64² mesure 2,02 ms au p95 et 12,79 ms au maximum pendant la première phase. La grande carte renchérit donc les recherches complètes : le plafond de recherches n'annule pas leur coût. Ce sont des ticks CPU, pas des frames ou un profil de colonie congestionnée ; les pointes peuvent peser sur le rattrapage à vitesse 6×. Les trois colons sur 250² culminent à 9,49 ms dans ce scénario. Les anciennes mesures du moteur à repas distants ne sont pas un contrôle à gameplay équivalent.

**Intégration : 5/5 parcours passent ensemble en 113,24 s.** [Rapport archivé](../../artifacts/needs-validation.json), démarrage 14:52:56 UTC : besoins 10,5 s, boucle matérielle 14,1 s, frontières/migration 46,1 s, rectangles 250² 25,5 s, nouvelles cartes/restauration 15,0 s. Le scénario des besoins a utilisé **WebGPU, adaptateur AMD / RDNA-1**, sans erreur console/GPU. Le parcours des frontières conserve SwiftShader ; les autres lancent Chromium normal.

Le contrôle navigateur des repas a été inspecté : portion en main et deux dormeurs allongés à la hauteur et dans l'orientation de leur matelas. La capture `artifacts/needs-eating-sleeping.png` est régénérable par le test et ignorée dans Git. Les premiers essais du nouveau scénario avaient deux erreurs de préparation UI (découverte de sauvegarde après injection et tentative de fermer un menu déjà fermé par le chargement) ; elles ont été corrigées dans le test. Elles ne sont pas comptées comme des validations.

## Historique : désignations rectangulaires — 13 septembre 2026

La [tranche de désignation](area-designations.md) ajoute abattage, récolte, annulation et création/retrait de cases de réserve en rectangle. Les matériaux, les déplacements et le schéma 2 restent ceux de la boucle matérielle. Le geste est transitoire ; la validation et le bilan d'application viennent du worker.

**`npm test` : 15/15 scénarios, cinq fichiers, 22,40 s.** Aux huit familles de simulation, trois de génération, deux de contrats GPU et une de codec s'ajoute une famille de désignation : oracle via commandes unitaires, quatre sens, frontières et mauvais paramètres, conservation/reprise pendant prélèvement ou portage, annulation unique d'un lit sur deux cellules et préservation d'un autre chantier. Le scénario exerce également la carte entière 250² et la capacité des identités. Le soak de 60 000 ticks avec invariants fait toujours partie du passage global.

**Les quatre parcours navigateur passent ensemble**, environ 1,5 minute :

| Parcours | Navigateur | Durée |
|---|---|---:|
| Boucle matérielle, réserves tracées en rectangle, transport, couchages et reprise en livraison | Chromium normal | 14,3 s |
| Frontières, commandes, migration V1 et interface compacte | Chromium avec SwiftShader | 41,1 s |
| Rectangles 250² : aperçu, interruptions, stockage, rotation et collecte réelle | Chromium normal, WebGPU AMD/RDNA-1 | 20,4 s |
| Défaut 250², tailles 128²/200²/250² et ancienne colonie restaurée exactement | Chromium normal | 12,6 s |

Le [rapport graphique et métier](../../artifacts/area-gameplay-validation.json), **14:09:36,801 UTC**, conserve cinq interruptions (Échap, second bouton droit, relâchement sur l'interface, événement blur injecté, changement d'outil), dix cellules de réserve, une collecte réelle et 24 unités de bois conservées. Une première réserve de huit cellules conserve ses réglages lors d'un rectangle chevauchant qui n'ajoute que deux cellules. Le retrait garde les piles, le rechargement retrouve le monde complet. L'aperçu a été capturé pendant un geste maintenu et réellement inspecté ; aucun message d'erreur console/GPU. Le rapport est également joint au test sous `area-gameplay` ; un reporter Playwright JSON permet de conserver cette pièce jointe lors d'un nouveau passage.

Le premier essai visait une extrémité masquée par Architecte : son refus était conforme au contrat, mais une assertion textuelle lisait encore le contenu d'un indicateur caché. Le pilote vérifie désormais les extrémités sur le canvas et la visibilité réelle de l'aperçu. La gestion des boutons a aussi été corrigée : presser le droit pendant le gauche produit un changement de `buttons` dans `pointermove`, pas nécessairement un nouveau `pointerdown`. Ce cas fait partie du parcours régulier. La caméra suspend aussi son amortissement pendant le tracé.

La relecture suivante a ajouté un précontrôle conservateur du nombre d'IDs nécessaires aux dépôts d'une annulation ou d'un retrait. Une sauvegarde valide peut avoir épuisé ce compteur ; la commande doit alors être refusée avant toute suppression de propriétaire. Les régressions vérifient un chantier approvisionné et une cargaison portée à cette limite. **Le scénario de désignation final repasse en 954 ms, et le parcours navigateur ciblé en 19,0 s**, après ce garde-fou. Les autres règles sont inchangées depuis les passages globaux ci-dessus. Le JSON du rapport reste celui du passage global à 14:09 ; la capture locale a été régénérée par le passage ciblé.

**Build TypeScript/Vite final réussi** : jeu 978,69 ko minifiés / 270,13 ko gzip ; worker 43,03 ko ; simulation partagée 12,27 / 5,18 ko ; laboratoire GPU 18,29 / 7,29 ko. L'avertissement du bundle supérieur à 500 ko reste visible. L'archivage du rapport a été sorti du code du test pour conserver le typecheck navigateur sans ajouter de dépendance Node uniquement pour cet export ; cela ne change aucune assertion de jeu.

Le [benchmark de commandes](../../artifacts/area-designation-benchmark.json) mesure le noyau Node, séparément du navigateur : 156 désignations dans un rectangle 32² sur carte 250² prennent 1,85 ms en médiane par commande groupée contre 10,40 ms via commandes unitaires. Les petits rectangles ne bénéficient pas tous d'un gain : deux cibles prennent 2,40 ms contre 0,49 ms, du fait de la préparation de l'index. Conditions, contrôle de l'égalité et limites dans [area-designations.md](area-designations.md). Aucun FPS ni coût d'exécution ultérieure de milliers de travaux n'en est déduit. Les anciens profils de carte ci-dessous ne sont pas redatés après cette livraison.

## Historique : cartes moyennes 250² — 13 septembre 2026

Le défaut jouable est 250×250, avec 200² et les dimensions compactes conservées. Les anciennes sauvegardes gardent leur terrain et leurs identités. Les [mesures appariées de simulation, communication et rendu](map-scale.md) distinguent l'ancien défaut 64², l'ancien moteur dont seules les bornes sont étendues, et le nouveau moteur. Elles documentent également les coûts supplémentaires de mémoire et de préparation ; aucune absence générale de régression n'est revendiquée.

**Noyau : 14/14 scénarios passent en 19,14 s**, dans quatre fichiers : huit familles de simulation, trois de génération, deux de contrats GPU et une de transport des snapshots. Les familles existantes comprennent toujours 60 000 ticks avec conservation ; la génération couvre maintenant 60 paysages, 13 dimensions rectangulaires, 12 départs de camp et un trajet dépassant les anciennes tailles de carte. La comparaison CPU de contrôle vérifie séparément l'égalité complète des générations et continuations. Les tests Vitest de contrats GPU ne lancent pas les shaders.

Après ce passage, la frontière de présentation a reçu un indicateur explicite de remplacement de carte. L'intégration a ensuite détecté un défaut d'ordre des clés JSON dans la reconstruction des deltas : les valeurs étaient égales, mais le snapshot n'avait plus exactement la représentation de la sauvegarde autoritaire. La reconstruction préserve désormais l'ordre du checkpoint et le scénario de codec exige aussi l'égalité JSON intégrale. **Ce scénario ciblé repasse sur le code final en 746 ms** ; la simulation, déjà vérifiée, n'a pas changé depuis le passage global.

**Les trois parcours navigateur passent dans un même appel `npx playwright test`**, en environ 1,2 minute, après cette correction :

| Parcours | Navigateur | Durée |
|---|---|---:|
| Portage physique, réserve filtrée, couchages, sauvegarde/reprise exacte pendant livraison | Chromium normal | 14,1 s |
| Commandes répétées, chargement invalide atomique, vraie migration V1, interface compacte | Chromium avec SwiftShader | 41,6 s |
| Défaut 250², créations 128²/200²/250², sauvegarde/rechargement 250², restauration intégrale de l'ancienne colonie 32² | Chromium normal | 12,5 s |

Ces durées sont des contrôles fonctionnels, pas des benchmarks. Le test des grandes cartes compare les mondes complets, pas uniquement leur dimension ou leur hash. Les parcours inspectent les erreurs console et de pipeline.

**Build final TypeScript/Vite réussi** : jeu 973,26 ko minifiés / 268,66 ko gzip ; worker 38,94 ko ; simulation partagée 10,58 / 4,58 ko ; laboratoire GPU 18,29 / 7,29 ko. L'avertissement du bundle principal supérieur à 500 ko demeure visible. Ni les dépendances ni les kernels de navigation GPU n'ont changé dans cette tranche.

La préparation des rapports a révélé deux défauts d'instrumentation graphique : un parcours quittait entièrement la carte et un retour Playwright sérialisait le renderer. Les profils affectés sont explicitement exclus ; seules les comparaisons nettoyées sont retenues dans [map-scale.md](map-scale.md). Les limites de cette machine et les pointes encore observées font partie du résultat.

**Contrôle graphique final 250² réussi à 13:41:17 UTC**, WebGPU sur AMD/RDNA-1, sans erreur console/GPU : portage physique, mur et lit 1×2 achevés, quatre orientations, occultation sans mutation de la simulation, interface compacte et reprise de poses au chargement. Le chargement garde terrain et IDs identiques mais augmente le tick et déplace un colon ; les poses initiale et finale sont immédiatement égales à sa position restaurée. Le [rapport courant](../../artifacts/render-probe.json) et [l'inspection visuelle](render-validation.md) précisent les captures réellement examinées. Les mesures de performance ont précédé le correctif d'ordre des clés du codec ; leurs timestamps restent inchangés.

## Historique : tranche matérielle G0, schéma 2 — 13 septembre 2026

Cette section décrit les preuves de la tranche matérielle avant le passage aux cartes 250². Les sections suivantes sont **historiques** : leurs nombres, backends et simplifications décrivent les versions alors testées. La boucle matérielle est livrée ; G0 conserve les limites détaillées dans [ROADMAP](../ROADMAP.md) et [les choix de gameplay](../gameplay/decisions.md).

`npm test` réussit avec **13/13 scénarios en 10,46 s** : huit familles de simulation, trois de génération et deux de contrats GPU. Les huit familles incluent 60 000 ticks sur cinq graines avec bilan matière et invariants à chaque tick. Elles couvrent partage et fusion de piles, réservations de quantités et capacités, interruptions aux transitions de portage, livraison partielle, reprise exacte, empreintes et migrations V1 actives ou interrompues. Les régressions finales couvrent aussi une capacité abaissée avec report vers une réserve de priorité égale, un colon inactif bloquant seulement la destination, et une recherche de 40 000 couples reprise après la fenêtre de 32 768 via le curseur sauvegardé. Les tests de contrats GPU n'exécutent pas les kernels sur un appareil.

Le build TypeScript/Vite réussit. Les tailles produites sont :

| Sortie JavaScript | Minifiée (ko) | Gzip (ko) |
|---|---:|---:|
| Jeu | 968,25 | 266,85 |
| Worker | 37,21 | — |
| Module de simulation partagé | 10,51 | 4,56 |
| Laboratoire GPU | 18,29 | 7,29 |

Ces tailles ne mesurent ni chargement réseau ni fluidité. L'avertissement de taille du bundle principal reste visible.

Les **trois parcours navigateur passent lors de passages ciblés successifs**, sur les mêmes sources finales :

| Parcours | Navigateur | Durée du test |
|---|---|---:|
| Transport réel, pause pendant le portage, sauvegarde/reprise exacte, annulation depuis la seconde cellule du lit | Chromium normal, adaptateur sélectionné automatiquement | 20,4 s |
| Frontières de commandes, chargement invalide atomique, migration d'une vraie sauvegarde V1, interface compacte | Chromium avec SwiftShader | 54,8 s |
| Cartes 64²/128² et restauration intégrale de la colonie précédente | Chromium normal | 28,3 s |

Ces durées ne sont pas des benchmarks. L'ancien parcours matériel logiciel observait parfois une cargaison, puis la demande de pause arrivait après son dépôt. Le helper envoie désormais la pause dans la même observation navigateur que la détection du portage et attend la pause autoritaire. Le passage matériel utilise Chromium normal ; le test de frontières conserve le backend logiciel. Un résultat « trois parcours passés » n'affirme pas qu'ils ont été exécutés dans un unique appel global.

Le [diagnostic graphique archivé](../../artifacts/render-probe-material.json), daté du **13 septembre 2026 à 12:44:44,892 UTC**, rapporte **WebGPU sur AMD/RDNA-1**, sans erreur. Il capture une cargaison de sept bois appartenant au colon 734, puis construction réelle d'un mur et d'un lit 1×2, en pause au tick 420. Le script attend deux images avant les captures ; le code du jeu est inchangé. Un [contrôle ciblé des aperçus aux quatre orientations](../../artifacts/placement-preview-probe.json) n'a révélé aucun défaut. Captures et portée dans [render-validation.md](render-validation.md). Cela valide le chemin graphique exercé, sans preuve de performance de centaines de personnages, de rigs glTF ou de rendu et navigation compute simultanés.

### Mesure finale du noyau matériel

[Données brutes schéma 2](../../artifacts/simulation-benchmark.json), **13 septembre 2026 à 12:39:49,525 UTC**, Node v24.11.1, Windows x64, AMD Ryzen 5 3600, 12 processeurs logiques, 17 131 188 224 octets de mémoire système. Le protocole emploie cinq mondes neufs par population, carte ouverte 64², collecte distante et stockage dimensionné pour tout le bois. Il mesure le premier tick, 200 ticks supplémentaires par lots de 20, puis vérifie les résultats à 1 001 ticks. Le monde inactif est distinct ; le portage est limité à dix unités.

| Colons | Premier tick médian (ms) | Tick actif médian (ms) | p95 des moyennes de lots (ms/tick) | Tick inactif médian (ms) | Travaux achevés à 1 001 | Bois stocké à 1 001 |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 0,849 | 0,013 | 0,076 | 0,013 | 3/3 | 36/36 |
| 30 | 1,481 | 0,025 | 0,405 | 0,013 | 30/30 | 336/360 |
| 100 | 1,485 | 0,055 | 0,956 | 0,020 | 100/100 | 1 038/1 200 |
| 300 | 2,041 | 0,914 | 2,244 | 0,040 | 300/300 | 2 783/3 600 |

Les achèvements et quantités stockées sont les moyennes des cinq répétitions. La conservation est vérifiée dans chaque répétition. **Collecte achevée ne signifie pas stockage achevé** : à 300 colons, 2 783 des 3 600 bois sont en réserve à la fin de la fenêtre. Les quantités restantes existent encore ailleurs ; cette mesure ne ferme pas le chantier de congestion. Les maxima du premier tick et observations d'affectation restent dans le JSON.

Le p95 porte sur des moyennes de lots, pas sur les pointes individuelles. Le test inclut besoins, BFS, travail et transport CPU ; il exclut GPU, rendu, navigateur, DOM, échanges worker et persistance. Ces chiffres ne donnent aucun FPS. L'ajout du transport change le scénario par rapport au schéma 1 : **aucune comparaison A/B** n'est déduite de l'écart avec les [données initiales](../../artifacts/simulation-benchmark-initial.json).

## Historique : adoption documentaire du corpus utilisateur — 13 septembre 2026

Les trois fichiers de `docs/new_docs` ont été examinés : lecture des 36 chapitres HTML, extraction et comparaison du PDF de 49 pages, inspection visuelle de dix pages structurantes, lecture des neuf feuilles du classeur et contrôle de ses identifiants/compteurs. HTML et PDF contiennent le même rapport. Les 181 premiers TEST ont été comparés à leurs fiches SYS : ce sont des critères reformulés, et aucun des 196 TEST du dossier n'est donné comme exécuté. L'annonce officielle 1.6.4850 a été recontrôlée ; les constantes et la parité complète n'ont pas été vérifiées en jeu.

Les décisions, renvois erronés et annexes absentes sont dans [reference-adoption.md](../research/reference-adoption.md). ROADMAP, matrice, architecture, stratégie de tests et consignes de reprise ont été harmonisés autour de ces références. Cette livraison est documentaire : aucun code ni comportement du jeu n'a changé. Les contrôles portent sur les liens locaux, la traçabilité et la cohérence des jalons ; les suites de simulation et navigateur n'ont pas été relancées. Les résultats ci-dessous restent ceux de leurs exécutions antérieures.

## Historique : extension spatiale, interface et navigation GPU — 13 septembre 2026

Le générateur spatial, les dimensions 3D, l'organisation d'interface et le laboratoire de navigation ont été ajoutés après la validation initiale consignée plus bas. `npm test` réussit avec **13/13 scénarios** : 8 de simulation, 3 de génération et 2 de contrats/oracle de navigation. Le soak de 60 000 ticks fait toujours partie des huit scénarios de simulation. Les familles et leur portée sont dans [testing.md](testing.md).

`npm run build` réussit avec deux entrées : jeu et laboratoire. Le JavaScript du jeu représente 956,22 ko minifiés / 263,02 ko gzip ; le laboratoire 22,59 ko / 9,26 ko. Le worker fait 17,21 ko. Ces tailles de fichiers ne sont pas une mesure de chargement réseau. L'avertissement de taille du bundle du jeu demeure visible.

La validation matérielle du calcul GPU couvre **110 requêtes sur 18 fixtures répétées**, puis invalidation en vol, concurrence et capacités ; aucune divergence de coût ou de chemin admissible et aucune erreur GPU. Les mesures de lots, conditions et limites sont dans [gpu-navigation.md](../research/gpu-navigation.md). Les tests Vitest seuls ne prouvent pas l'exécution des shaders. L'essai WebGPU logiciel n'a pas trouvé d'adaptateur et reste non validé.

L'interface du laboratoire a été exercée séparément sur le GPU AMD/RDNA-1 : paysage 64², obstacle 250², résultat vérifié contre Dijkstra et édition invalidant le chemin. [Diagnostic du laboratoire](../../artifacts/navigation-lab-smoke.json). Aucune performance de foule ni de rendu simultané n'est déduite de ces contrôles.

Le contrôle final du jeu sur WebGPU, après réglage de l'angle de caméra et correction de la surface du socle, réussit également sans erreur : collecte, construction réelle de mur/lit, coupe, feuillage et priorités accessibles. Le diagnostic attend explicitement la pause autoritaire avant de comparer l'état ; cliquer sur Pause sans attendre son acquittement créait une course dans la version précédente du script. [Rapport graphique et captures](render-validation.md).

**Les trois parcours d'intégration ont réussi lors de passages ciblés successifs** : collecte → trois lits réellement achevés → alerte supprimée → sauvegarde/reprise exacte et annulation ; rafale de priorités, chargement invalide atomique et organisation 1280×720/768×900 ; création des cartes 64²/graine 271 et 128²/graine 4 294 967 295 puis restauration intégrale de la colonie 32² avec son ordre et sa priorité désactivée. Les deux premiers utilisent SwiftShader avec repli WebGL 2. Le troisième lance Chromium normal et s'achève en 17,7 s sur cette machine ; cette durée n'est pas un benchmark.

Le parcours 128² sous SwiftShader a dépassé son budget global de 90 s, malgré les derniers états et assertions consultés corrects. Le point précis du dépassement n'a pas été isolé ; on ne déclare donc pas ce backend validé pour ce parcours. Un [diagnostic des extraits observés](../../artifacts/integration-software-diagnostic.json) est conservé ; le zip complet a été effacé par le run suivant, ce qui limite l'analyse rétrospective. Le transfert des états au protocole Playwright utilise une chaîne JSON, et leur comparaison intégrale évite de parcourir des milliers d'objets dans le matcher. Ce changement préserve la comparaison exacte ; aucune assertion de conservation n'a été remplacée par une simple longueur ou un hash.

Le générateur a également fait l'objet d'une exploration de 480 cartes. Une graine enfermant le départ a conduit à une réparation de passage vers la région principale de sa rive. Le contrat régulier contrôle 36 paysages quantifiés et neuf continuations de parties. [Détail de génération](world-generation.md). Les anciennes sauvegardes sont chargées sans régénération ; un nouveau départ avec une ancienne graine peut changer de paysage.

Les séquences de la vidéo fournie réellement consultées et leurs limites sont consignées dans [visual-reference.md](../research/visual-reference.md). Elles fondent la structure d'interface et l'interprétation des volumes ; elles ne constituent pas une validation de combat, de fuite ou des diagonales de RimWorld.

## Historique : validation initiale

### Environnement initial

Première validation réalisée le 13 septembre 2026, Windows x64, Node 24.11.1. Dépendances exactes dans package-lock.json. Le serveur Vite utilise localhost ; aucune publication distante n'a été faite.

### Contrôles fonctionnels initiaux

`npm run check` a réussi sur la version finale des règles : **8/8 scénarios de simulation, build TypeScript/Vite et 2/2 scénarios d'intégration**. Les dernières corrections de présentation ont ensuite été vérifiées par l'inspection WebGPU ciblée et un nouveau build. Le bundle Three.js reste volumineux : environ 0,95 Mo minifié, 0,26 Mo gzip, avant cache HTTP. L'avertissement de taille du bundler reste visible ; il ne doit pas être masqué pour donner l'impression d'un chargement optimisé. Le découpage et le chargement des futurs assets seront évalués avec leur coût réseau réel.

Les huit scénarios de simulation couvrent déterminisme et sauvegarde en trajet, concurrence et conservation des matériaux, accessibilité/commandes invalides, épuisement et récupération, faim critique, nouvelle obstruction de chemin, 23 familles de corruptions de sauvegarde et soak sur cinq graines. Le soak totalise 60 000 ticks, soit dix jours cumulés ; il ne représente pas dix jours pour chacune des cinq colonies.

Deux scénarios d'intégration Chromium pilotent la carte et les commandes réelles. Ils couvrent production des ressources, construction, priorités, pause, restauration exacte d'un état en attente, annulation, chargement invalide atomique, aide et format compact. La frontière horloge/commandes est aussi exercée par une rafale d'actions de priorité. Captures dans artifacts/, traces conservées uniquement en cas d'échec.

### Défauts initialement détectés et corrigés

| Défaut | Correction et preuve |
|---|---|
| Priorité 3 choisie avant 1 alors que l'interface promettait l'inverse | Tri ascendant, 0 exclu ; scénario d'une collecte prioritaire plus lointaine qu'un chantier. |
| Envoi de commandes réinitialisant le temps réel du worker | Réinitialisation limitée aux changements d'horloge ; rafale d'actions dans l'intégration. |
| Retour BFCache conservant l'interface mais un worker détruit | Pas de destruction sur pagehide.persisted ; correction relue. Parcours retour/avance BFCache encore à automatiser. |
| Colon inactif bouchant indéfiniment un passage | Cession locale déterministe ; fixture de couloir et conservation de non-chevauchement. |
| Affectation simultanée de centaines d'acteurs provoquant une pointe de BFS | Maximum huit recherches par tick, ordre d'examen rotatif et test de progression de tous les travaux. |
| Rig dépassant les huit emplacements de vertex buffers du device testé | Attributs géométriques entrelacés, cinq buffers utilisés ; compilation et affichage WebGPU vérifiés. |
| Surfaces de dalles voisines se superposant | Dimensions ramenées à une cellule exacte ; inspection graphique ciblée. |

### Mesures initiales de simulation

Les [données brutes initiales](../../artifacts/simulation-benchmark-initial.json) concernent le moteur à stock global du schéma 1. Elles séparent premier tick d'affectation, travaux actifs et population inactive, avec issues métier contrôlées. Le [contrat courant de simulation](simulation.md) décrit désormais le schéma 2 ; le tableau en tête de ce document et le nouveau fichier de benchmark portent sur le transport physique. Aucun de ces résultats ne comprend rendu, GPU, interface, messages worker, sérialisation ou congestion générale d'une vraie colonie.

Les percentiles des lots de 20 ticks décrivent des **moyennes par tick de lot**, pas la queue de distribution de ticks individuels. Les différences entre runs reflètent aussi la charge de la machine ; comparer des modifications exige le même protocole et plusieurs répétitions.

### Rendu initial et limites de la preuve

Les tests d'intégration de cette première version utilisaient Chromium et SwiftShader, avec repli WebGL 2 observé. Ils validaient l'intégration et la compilation du chemin de compatibilité ; leurs FPS ne représentaient pas le GPU de l'utilisateur. Des passages séparés avaient validé le pipeline WebGPU sur AMD/RDNA-1, avec personnages et ombres sans erreur console. Le [compte rendu graphique](render-validation.md) et `render-probe.json` sont maintenant actualisés pour la tranche matérielle ; leur dernier contenu ne constitue pas une archive du premier passage.

Restent à valider avant annonce de performance : centaines d'acteurs animés et équipés, import glTF réel, transitions de clips, perte/restauration de device, vrai matériel de référence, coût des snapshots et profils p95/p99 de frames. Le compteur intégré ne mesure qu'une cadence d'images et un coût CPU récent de simulation.

### Portée des preuves historiques

Ces preuves concernent le prototype et les scénarios décrits. Elles ne certifient ni l'équivalence complète à RimWorld, ni la validité de toutes ses formules, ni toutes les combinaisons futures de mécaniques. Les prochaines fonctionnalités doivent étendre les invariants et scénarios correspondants.
