# Validation courante — V28, minage et préparation des ombres

15 septembre 2026. G0 en consolidation, G1 partiel, première tranche de minage G2. [Contrat](mining.md), [recherche confrontée](../research/mining-reference.md), [preuves V27 archivées](../history/validation-v27-geology.md).

## Simulation, persistance et parcours joueur

Le [lot complet](../../artifacts/mining-simulation-initial.json) passe **93/93 tests en 55,9 secondes**. Il comprend migrations, réservations, besoins, construction, logistique et continuation exacte. Après extension du pilote à quatre cases minées et au rangement des fragments, le [lot pilote/minage](../../artifacts/mining-player.json) passe **4/4**, avec trois cartes naturelles, huit jours pour la graine 42 et cinq jours pour 93/2048. Le bilan conserve les flux bois/nourriture, les repas, les couchages et les loisirs en ajoutant les résultats du minage.

Le [dernier contrôle ciblé](../../artifacts/mining-final-targeted.json) passe **5/5** : cinq roches, contact diagonal sans traversée des coins solides, préparation du coup, dégâts après interruption, reprise exacte et deltas, produit typé, transport demandé, saturation du budget d’ID sans consommation du tirage, coûts physiques/pondérés et buffers géométriques conservés. Il refuse aussi une préparation de coup sauvegardée hors intervalle et vérifie la libération de l’ordre forcé terminé. L’optimisation du terrain est contrôlée pour dégâts seuls, extraction, changement de roche, surface différente et terrain historique sans type. Le [contrat complet de snapshots](../../artifacts/mining-final-bridge.json), également inclus dans ce dernier lot, vérifie refus atomique, révisions perdues, resynchronisation et chargement. Ces assertions enrichissent les scénarios existants ; elles ne promettent pas une couverture exhaustive.

Le [premier lot UI](../../artifacts/mining-ui-journey.json) contient un parcours minage réussi en **16,0 secondes** : véritables outils, priorité, sauvegarde au milieu des coups, fragment de granite, réserve filtrée, attente sans transport automatique, désignation et livraison physique. Le parcours long y échoue sur la caméra du pilote : un massif hors du cadrage maximal n’était pas visible. Le pilote utilise maintenant aussi le véritable glissement du bouton central avec retour des coordonnées projetées. Les erreurs initiales sont conservées, les checkpoints volumineux extraits dans `tmp` avec SHA-256.

Le [parcours UI de trois jours corrigé](../../artifacts/mining-journey-rerun.json) passe en **356,7 secondes**, sans retry ni erreur navigateur. Il utilise la carte naturelle 250², les commandes visibles et les vitesses accessibles au joueur. Il vérifie quatre cases minées, rangement de tous les fragments obtenus, trois lits, table et sièges, six murs, feu et piquet, repas réellement consommés, deux activités de loisirs et reprise exacte à chaque journée. Le coût de ce scénario justifie de le réserver aux changements de boucle, commandes ou persistance ; il n’est pas lancé pour une retouche cosmétique.

Compilation de production finale réussie : 157 modules, worker **189,07 kB**, bundle jeu **1 054,93 kB / 295,53 kB gzip**. Aucune dépendance ajoutée ; avertissement préexistant du bundle supérieur à 500 kB. Captures du minage et de la charge de cent acteurs inspectées. Le compteur FPS demeure visible. Le dernier durcissement du validateur de préparation a été contrôlé dans le lot ciblé après le parcours UI, sans modifier la progression valide des coups.

## Charge CPU et communication

[Banc reproductible](../../scripts/mining-bench.ts), [résultats](../../artifacts/mining-cpu.json). Windows, AMD Ryzen 5 3600, Node 24.11.1. Carte naturelle 250² avec aire préparée ; quatre cases de grès et un arbre par colon, trois répétitions de 500 ticks, 100 ticks d’échauffement séparés. Validation hors mesure ; encodage de snapshot mesuré tous les cinq ticks. Les trois répétitions donnent exactement les mêmes extractions et produits.

| Acteurs | Tick p50 | Tick p95 | Tick p99 | Tick max | Encodage p95 | Cases extraites / fragments |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 0,006 ms | 0,161 ms | 1,554 ms | 7,004 ms | 2,410 ms | 12 / 3 |
| 30 | 0,061 ms | 3,532 ms | 6,854 ms | 18,996 ms | 2,809 ms | 120 / 30 |
| 100 | 2,039 ms | 8,424 ms | 12,844 ms | 21,604 ms | 3,377 ms | 400 / 114 |

Ce banc mesure minage, navigation et tâches concurrentes de collecte. Il ne constitue ni une colonie de cent habitants autonome plusieurs jours, ni une mesure de transport IPC, ni un engagement sur tous les matériels.

## Rendu natif et limites de fluidité

[Banc WebGPU](../../scripts/mining-render-bench.mjs), [avant suppression des allocations de terrain](../../artifacts/mining-render-before.json), [après](../../artifacts/mining-render.json). Chromium natif, GPU AMD RDNA1 (modèle précis non exposé), 1440×1000, carte 250², simulation worker à ×6, 90 images d’échauffement. Les suppressions résultent de véritables actions de minage. Aucune sérialisation complète du monde pendant les images chronométrées.

| Mineurs | Intervalle p95 | p99 | Max avant → après | Adoption rendu p95 avant → après | Appels/image p95 / max |
|---|---:|---:|---:|---:|---:|
| 3 | 6,1 ms | 6,1 ms | 24,1 → 29,9 ms | 5,8 → 4,6 ms | 165 / 166 |
| 30 | 6,1 ms | 11,9 ms | 29,9 → 30,0 ms | 10,0 → 7,5 ms | 175 / 176 |
| 100 | 6,1 ms | 18,0 ms | 78,0 → 84,0 ms | 13,4 → 11,7 ms | 190 / 194 |

Les buffers rocheux et objets de sol restent identiques pendant les extractions ; aucune erreur navigateur/WebGPU observée. La comparaison de surface évite une chaîne et un tableau couvrant 62 500 cases à chaque mise à jour de dégâts. Ces deux exécutions successives montraient une baisse du coût d’adoption, **pas une disparition des pointes**. Les maximums de 78–84 ms ont motivé le complément ci-dessous. Le temps CPU de la méthode de rendu culminait à 11 ms : il n’expliquait pas à lui seul l’intervalle maximal.

Le [diagnostic complémentaire à 100 mineurs](../../artifacts/mining-render-diagnostic.json) enregistre une pointe à **108 ms** avec l’[API Chromium Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames). L’entrée de 108,3 ms ne contient que 6,4 ms de callback de rendu attribué ; son début de rendu arrive environ 102 ms après le début de l’intervalle. L’adoption complète avec UI culmine à 18,2 ms. Ces durées seules ne localisaient pas la cause. Aucune ancienne commande de test du projet n’était encore active lors du contrôle des processus. Le recoupement suivant utilise aussi les demandes de pipelines et les événements GPU.

Le [tout premier banc](../../artifacts/mining-render-initial.json) capturait les objets de terrain avant l’adoption du chargement asynchrone : sa conclusion `stableGround: false` était invalide. Le banc attend désormais le tick, la population et les désignations exacts avant de mémoriser les buffers.

## Correction vérifiée : ombres des premières piles

[Contrat](shadow-preparation.md). La [trace initiale](../../artifacts/mining-render-trace.json) et son [extraction compacte](../../artifacts/mining-gpu-attribution.json) montrent un traitement de commandes de **115,955 ms sur CrGpuMain**, juste avant l’image retardée. C’est du temps du processus GPU, pas une durée d’exécution matérielle des shaders. La capture perturbe la cadence ; ses percentiles ne sont pas utilisés comme témoin de fluidité. Un [essai Dawn trop détaillé](../../artifacts/mining-render-pipeline-trace.json) a dépassé 128 MiB et a été arrêté ; le collecteur conserve désormais les résultats de phase même si la trace échoue.

Sans trace lourde, le [relevé des pipelines](../../artifacts/mining-render-pipelines.json) observe huit créations synchrones `ShadowMaterial` au premier dépôt et une pointe de 84 ms. Le code officiel Three r186 exclut les ombres de `compileAsync` : les lots vides manquaient donc de préparation. Une passe réelle des lots résidents pendant le chargement, suivie d’une restauration exacte, supprime ces demandes dans notre scénario.

| Charge | p95 des intervalles | p99 | Maximum après préparation | Pipelines créés pendant le jeu |
|---|---:|---:|---:|---:|
| 3 mineurs | 6,1 ms | 6,1 ms | 12,0 ms | 0 |
| 30 mineurs | 6,1 ms | 6,1 ms | 18,0 ms | 0 |
| 100 mineurs | 6,1 ms | 17,9 ms | 24,1 ms | 0 |

[Relevé final 3/30/100](../../artifacts/mining-shadow-final.json) : respectivement 12/120/400 extractions et 3/30/114 fragments, buffers conservés, aucune erreur GPU ni image longue signalée. Un [premier essai corrigé à 100](../../artifacts/mining-render-shadow-warm.json) plafonne aussi à 24 ms. En [désactivant uniquement le helper de préparation](../../artifacts/mining-shadow-control.json), huit compilations et une pointe de 107,9 ms reviennent. Cela étaye le lien causal sans garantir une cadence parfaite sur tout matériel ou tout contenu futur.

Le compromis est mesuré : préparation initiale 7,33 s pour le témoin, 11,52–11,73 s pour le lot corrigé ; rechargement dans le même renderer 0,20–0,21 s. Ce sont les durées de préparation, pas tout le chargement de page. Aucun draw call permanent supplémentaire ni nouveau buffer de simulation. Les deux scénarios purs [rétention et surface](../../artifacts/shadow-preparation-targeted.json) passent ; ils couvrent aussi un snapshot intervenant pendant l’attente GPU afin de ne pas écraser ses nouvelles instances. Compilation finale : 158 modules, worker inchangé 189,07 kB, jeu 1 055,88 kB / 295,82 kB gzip.

Le [parcours minage natif](../../artifacts/shadow-preparation-ui.json) passe après correction. Le parcours de frontières du même lot recharge correctement V28 mais échoue sur une ancienne assertion `23` ; ce défaut de fixture est corrigé pour vérifier le schéma courant. Le [parcours de frontières corrigé](../../artifacts/shadow-preparation-boundaries.json) passe en **38,6 secondes**, avec backend **WebGL 2** effectivement relevé, commandes répétées, refus de sauvegarde invalide et reprise de la partie historique. Les captures natives après extraction ont été inspectées. Les 98 documents, leurs 1 067 liens locaux et les trois originaux conservés passent le contrôle d’intégrité.

La simulation et les commandes n’ont pas été modifiées dans ce complément. Le pilote de trois jours et le lot 93/93 ci-dessus restent les preuves du gameplay V28 ; ils n’ont pas été rejoués pour une préparation graphique.

## Suite et limites fonctionnelles

Le minage ne clôt pas G2 : toits/effondrements, minerais, compétences/capacités/XP, lissage et sous-sols variés restent absents. Les fragments sont des objets physiques avec représentation procédurale provisoire ; taille, blocs et matériaux de construction constituent la suite. Les anciennes pierres décoratives ne sont pas encore converties en fragments transportables. Les cinq roches, leur dureté et leur produit ne signifient pas que toute la famille géologique soit achevée. Le mode nuit poursuit ces étapes après commit/push sur main, en maintenant l’audit des nouveaux pipelines et des capacités graphiques.
