# Performance V86 — occupation, accès au sol et pièces de prison

Enquête du 20 septembre 2026. **Optimisation intégrée et validée, comparaisons CPU contrôlées.** La base mesurée est V85 `7f58f12`. Ce travail concerne les algorithmes internes, sans nouvelle mécanique, version de sauvegarde ou règle de navigation. Aucun gain de débit natif n'est déduit de la comparaison historique sous charge externe variable. [Protocole de validation](../development/testing.md), [preuve énergétique de départ](../history/validation-energy-v85.md).

## Charge et méthode

Le profil reprend `energyLoad(100)` : cent colons, cent lièvres, carte naturelle 250², ateliers alimentaires, recherche, producteurs, batteries, interrupteurs et chambres froides préparés. Ce banc synthétique ne représente pas une colonie autonome. Cent ticks d'amorçage sur une charge distincte de trois colons précèdent la mesure de **650 ticks**, avec encodage de snapshot tous les cinq ticks. Les contrôles métier du banc énergétique et la validation du monde restent actifs.

Matériel : Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1. Le profil CPU V8 utilise `--cpu-prof --cpu-prof-interval=1000`. L'analyse ne retient que les échantillons de la fenêtre de simulation/encodage, séparée de la préparation. Les pourcentages inclusifs se recouvrent et ne s'additionnent pas. Les temps sous profileur servent à localiser les coûts ; ils ne remplacent pas un comparatif sans instrumentation ni une mesure native.

Les sources de base ont été extraites depuis Git dans `tmp/performance-v86/baseline`, afin que les recherches V86 concurrentes ne changent pas les entrées du comparatif. Les scripts, profils et mondes de diagnostic restent dans `tmp/performance-v86` ; ils ne contiennent que les données synthétiques Lisière.

## Premier profil

Fenêtre échantillonnée : 20 915,06 ms. Les 650 pas de simulation totalisent 20 360,42 ms ; p50 28,78 ms, p95 59,51 ms, p99 78,91 ms et maximum 114,86 ms sous profileur. Les invariants métier passent. Monde final SHA-256 : `e6de4f4251d71a47e65df3a5181c0765391044df5e992a1e70f2218ff2036684`.

| Fonction | Temps propre échantillonné | Temps inclusif | Lecture |
|---|---:|---:|---|
| `canStandAt` | 8,01 % | 10,68 % | Les requêtes ponctuelles parcourent les structures et leurs profils. |
| `leaveTransitCell` | 3,74 % | 10,90 % | Vérifie notamment si chaque colon peut rester sur sa case actuelle. |
| `navigationCosts` | 5,49 % | 6,58 % | Reconstruit la capture locale des sols et meubles. |
| `candidateAccess` | 4,39 % | 9,11 % | Capture et parcours cardinal des accès, puis recherche pondérée à la demande. |
| `footprintContains` | 3,75 % | — | Les lectures de variantes précèdent encore une partie des rejets à grande distance. |

Ces mesures ne montrent pas Dijkstra comme premier coût. La première hypothèse bornée consiste à rejeter les points hors de l'enveloppe géométrique de toute emprise courante avant de consulter ses variantes, puis à consulter le profil d'arrêt ou de stockage seulement si l'emprise contient effectivement le point. Elle ne nécessite aucun cache partagé, aucune révision de carte ni invalidation supplémentaire. Une capture persistante entre acteurs ou ticks n'est pas proposée.

## Changement retenu et comparaison

`footprintContains` rejette d'abord les points hors de l'enveloppe courante, de −1 à +3 cases par rapport à l'ancre ; le panneau solaire 4×4 reste intégralement inclus. Le calcul précis de chaque forme et orientation reste inchangé. `canStandAt`, `furnitureDelay` et les permissions de sol/stockage consultent leurs profils seulement après avoir établi que l'emprise contient le point. Ces permutations portent sur des lectures pures : aucun acteur, ordre, coût, capacité ou état aléatoire n'est modifié. Il n'y a ni cache ni capture conservée entre décisions.

Deux paires successives sans profileur emploient l'ordre **base → candidat**, puis **candidat → base**. Chaque ligne contient les mêmes 650 ticks et 130 encodages ; amorçage et préparation sont séparés. Aucune mesure native ou autre campagne CPU lourde ne tourne simultanément.

| Passe | Somme des ticks | Tick p50 | Tick p95 | Tick p99 | Maximum |
|---|---:|---:|---:|---:|---:|
| Base, première paire | 19 631,43 ms | 26,92 ms | 59,98 ms | 78,22 ms | 117,94 ms |
| Candidat, première paire | 18 013,91 ms | 24,89 ms | 55,82 ms | 82,23 ms | 106,76 ms |
| Candidat, seconde paire | 17 748,24 ms | 24,73 ms | 48,06 ms | 71,30 ms | 89,54 ms |
| Base, seconde paire | 18 908,57 ms | 26,87 ms | 54,38 ms | 69,70 ms | 107,51 ms |

La somme des ticks diminue de 8,24 % et 6,14 % dans ces deux paires. Les percentiles et pics varient ; le p99 candidat augmente dans les deux paires. Ce petit échantillon ne justifie ni intervalle statistique robuste, ni amélioration universelle, ni promesse de tenir 6×. Le coût restant demeure important.

Les quatre mesures satisfont les résultats alimentaires, énergétiques et la validation du monde. Leurs états initiaux et finaux sont strictement identiques, byte pour byte, et le monde final conserve le SHA-256 publié ci-dessus. Cela inclut PRNG, routes, réservations, objets, besoins, âges et stocks ; le comparatif ne masque pas les champs variables avant de les confronter. La copie candidate n'ajoute que les modifications des trois modules concernés à la base figée. Les [quatre rapports et empreintes](../../artifacts/occupancy-cpu-comparison-v86.json) sont conservés dans le dépôt ; leurs fichiers de diagnostic complets restent dans `tmp/performance-v86`.

## Contrôles et limites d'intégration

L'oracle de `furniture-travel.test.ts` décrit les cases occupées indépendamment des deux fonctions de production, pour toutes les familles de bâtiments, quatre orientations, empreintes historiques, réinstallation/déconstruction et cibles de commutation admissibles. Il vérifie les cases proches et éloignées, l'arrêt et le rangement, les deux ordres de coexistence avec un conduit, ainsi que les cadres et les seuils historiques. Il contrôle des requêtes géométriques ; l'autorisation de construire une paire superposée appartient aux contrôles de couches existants.

Campagne ciblée initiale : **six réussites sur huit**, trois fichiers, 2,89 s. Le nouvel oracle, les coûts/routes indépendants et deux scénarios de couches passent. Les deux échecs concernaient exclusivement les fixtures `furnitureTrafficFixture` et `power-layer-review`, dépourvues de la priorité de geôlier requise par le schéma 86 en cours d'intégration. Aucun seuil ni assertion n'est retiré : ces fixtures ont été actualisées et leurs contrôles passent dans les [campagnes centrales V86](../history/validation-prisoners-v86.md). Un premier lancement n'avait pas atteint les tests à cause d'un refus de sous-processus Vite dans le bac à sable ; la relance autorisée a produit les résultats ci-dessus.

Après intégration du gameplay V86, le profil `ENERGY=1` seul conserve ses 650 ticks et ses résultats métier. [Rapport CPU intégré](../../artifacts/energy-cpu-v86.json), même matériel :

| Colons / lièvres | Tick p50 | Tick p95 | Tick p99 | Maximum | Encodage p95 |
|---|---:|---:|---:|---:|---:|
| 3 / 3 | 1,68 ms | 4,33 ms | 6,47 ms | 12,46 ms | 3,60 ms |
| 30 / 30 | 6,25 ms | 16,97 ms | 23,88 ms | 42,95 ms | 6,88 ms |
| 100 / 100 | 27,75 ms | 52,90 ms | 68,11 ms | 88,58 ms | 7,35 ms |

Ce relevé intégré n'isole pas l'optimisation des nouvelles branches de gameplay. Le comparatif causal reste celui de la copie V85 ne contenant que les trois changements purs. `PRISONERS=1` ajoute ensuite des pièces et 1/3/10 détenus : sa charge et sa fenêtre de 1 200 ticks sont différentes, et ne doivent pas être présentées comme le même comparatif.

## Coût ajouté par les pièces de prison

Après correction des règles de portes, le banc `PRISONERS=1` dépasse son garde-fou de 111 secondes sur 1 200 ticks. Une copie figée du candidat V86 sert de référence avant toute nouvelle optimisation. Sur **200 ticks, cent colons, cent lièvres et dix captifs**, l'instrumentation compte **32 730** appels à `RoomTopologyCache.read` : **27 796 ms**, pour **45 239 ms** de simulation instrumentée, soit environ **61,4 %**. Le profil V8 retrouve environ 61,6 % inclusifs. Les chemins dominants passent par `prisonerAllowedCell` / `processPrisoner` et `foodTaskValid` / `reconcileWarden` ; les boucles alimentaires et les choix de couchage relisent également les mêmes obstacles plusieurs fois.

Ce cache reconstruit son masque d'obstacles avant de vérifier sa validité, conformément au contrat de mutations en place. Lui substituer l'identité du tableau ou le numéro de tick invaliderait ce contrat. L'optimisation conserve ce fonctionnement et transmet une **capture de topologie locale à une seule décision synchrone** à ses requêtes répétées. Elle expire avant toute mutation susceptible de changer la carte ; elle ne survit ni à un acteur ni à un tick. Les filtres alimentaires, classements, délais, parcours et PRNG restent inchangés.

La comparaison reprend les **mêmes 200 ticks sous V8 et avec le même compteur chronométré des lectures**, sur deux copies figées. La candidate remplace seulement dix modules consommateurs et requêtes de prison. La préparation est hors mesure ; il n'y a ni échauffement distinct ni encodage de snapshot pendant cette fenêtre de simulation. [Résultat compact, conditions et empreintes](../../artifacts/prison-topology-profile-v86.json).

| Mesure instrumentée | Avant capture locale | Après capture locale |
|---|---:|---:|
| Lectures de topologie | 32 730 | 4 674 |
| Temps dans ces lectures | 27 796,15 ms | 5 301,59 ms |
| Somme des 200 ticks | 45 239,27 ms | 23 297,34 ms |
| Tick p50 / p95 | 177,51 / 524,54 ms | 110,83 / 176,68 ms |
| Tick maximum | 1 357,84 ms | 235,14 ms |

Les lectures diminuent de 85,7 % et la somme instrumentée des ticks de 48,5 % dans cette paire. **Ce résultat n'est pas un gain mesuré sans profileur ni une mesure de débit natif.** Le coût des lectures reste visible dans le profil candidat, environ 22,8 % inclusifs ; les autres coûts de faune, agriculture et navigation subsistent. La campagne centrale de 1 200 ticks demeure distincte.

Les mondes initiaux et finaux sont identiques **octet à octet**, sans exclusion de champ ; les deux validations du monde passent. SHA-256 initial `070fb20f06511d61d761b02d66c23a6ae84d0ac7a69f159ba7373658ea209381`, final `82807facc804ddfae4c9b5e0628cd528fa93d203f3d9972827921dd82e99a2dc`. Le typage et les cinq contrôles d'espace passent, dont la revalidation de brèches et de roche modifiées en place au même tick après une capture. Profils, copies de code et mondes synthétiques restent sous `tmp/performance-v86/prison-topology` ; aucun monde brut n'est publié dans le résumé.

## Charge complète avec captivité

Le banc CPU optimisé passe ses **1 200 ticks** sur chacune des trois populations, sans instrumentation. [Rapport](../../artifacts/prison-cpu-v86.json). Les **1/3/10 captifs** restent présents, mobiles, nourris par ingestion réelle et ont tous une conversation complète diminuant leur résistance ; 1/3/10 rations ont été consommées. Les résultats alimentaires et électriques initiaux passent également.

| Colons / lièvres / captifs | Tick p50 | Tick p95 | Tick p99 | Maximum | Encodage p95 |
|---|---:|---:|---:|---:|---:|
| 3 / 3 / 1 | 4,65 ms | 11,62 ms | 29,85 ms | 58,42 ms | 6,07 ms |
| 30 / 30 / 3 | 13,61 ms | 45,21 ms | 62,26 ms | 90,94 ms | 10,36 ms |
| 100 / 100 / 10 | 60,23 ms | 135,85 ms | 171,84 ms | 247,35 ms | 9,93 ms |

La charge supplémentaire reste coûteuse, malgré la correction du principal coût redondant. Ces mesures ne prouvent pas un débit 6×. Elles ne se comparent pas directement aux 650 ticks du profil énergétique sans prison : population, pièces, tâches et fenêtre diffèrent. Le typage et **40 contrôles centraux sélectionnés** passent après optimisation.

## Mesures natives et activité externe

Chromium natif, adaptateur AMD RDNA-1, viewport 1 440×1 000 ; même protocole, caméra fixe, emprises alimentaires et feuillage conservés. Les profils **ENERGY** puis **PRISONERS** sont exécutés successivement, sans pilote ou mesure CPU simultanés, sur sources servies figées. Les temps worker sont des **moyennes de pas par lot publié**, pas des percentiles de ticks indépendants. [ENERGY](../../artifacts/energy-render-v86.json), [PRISONERS](../../artifacts/prison-render-v86.json).

| Profil / colons | Captifs ajoutés | Images relevées | Image p95 / maximum | Lot worker p95 | Adoption p95 | Débit pour 6× demandé |
|---|---:|---:|---:|---:|---:|---:|
| ENERGY / 3 | 0 | 1 671 | 16,6 / 49,8 ms | 8,80 ms | 1,4 ms | 5,90× |
| ENERGY / 30 | 0 | 812 | 37,5 / 79,2 ms | 28,10 ms | 6,4 ms | 5,80× |
| ENERGY / 100 | 0 | 3 107 | 37,6 / 79,3 ms | 92,10 ms | 20,1 ms | 2,56× |
| PRISONERS / 3 | 1 | 2 782 | 16,7 / 37,6 ms | 12,20 ms | 1,4 ms | 5,91× |
| PRISONERS / 30 | 3 | 1 712 | 33,3 / 71,0 ms | 39,93 ms | 6,0 ms | 5,23× |
| PRISONERS / 100 | 10 | 8 294 | 33,4 / 91,8 ms | 132,87 ms | 17,7 ms | 1,99× |

Toutes les validations métier, de monde et de caméra passent : captifs nourris et entretenus, autres ateliers conservés, aucune erreur ni compilation tardive, géométrie des personnages stable. Les captures de charge ont été inspectées ; leur FPS après pause ne représente pas le débit de simulation mesuré.

Le relevé énergétique natif à cent est moins bon que le relevé historique V85 de 3,76×. **Aucun gain ni régression causale n'est déduit de cette seule comparaison historique.** Un échantillon de processus pris immédiatement après la campagne révèle une forte activité extérieure au banc : un autre jeu consomme 4,59 secondes CPU sur deux secondes murales, les navigateurs environ 5,28, avec plusieurs autres applications actives. Ce relevé postérieur n'établit pas leur charge exacte pendant chaque fenêtre et n'explique pas à lui seul toute la différence ; il interdit de présenter les conditions V85/V86 comme contrôlées. Aucune application utilisateur n'a été interrompue pour améliorer les chiffres. Caméras et nombres d'appels de dessin sont identiques entre les deux rapports énergétiques ; les sources de rendu, worker et encodage n'ont pas reçu de nouvelle boucle de production.

La revue statique suivant ces mesures avance aussi le filtre « personne détenue et vivante » avant le scan des réservations dans `wardenWanted`. Les deux branches finales exigeaient déjà ce filtre : son déplacement évite un parcours quadratique inutile quand aucun captif n'existe. **Les mesures ci-dessus précèdent cette dernière permutation pure ; aucun gain chiffré supplémentaire n'est revendiqué.** La continuation et l'UI finale restent vérifiées sur le code livré.

L'optimisation pure de géométrie n'impose pas à elle seule de rejouer neuf minutes de pilote naturel énergétique déjà validé ; la nouvelle boucle de captivité possède sa propre continuation naturelle. Une différence de continuation constatée lors du comparatif impose un diagnostic avant toute revendication de conformité.
