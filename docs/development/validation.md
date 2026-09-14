# Validation courante — V22, circulation du mobilier

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat de transit/arrêt](furniture-travel.md), [recherche et incertitudes](../research/furniture-travel-reference.md). Les [preuves V21](../history/validation-v21-occupancy.md) sont historiques.

## Simulation et continuité

[Lot final sur le code intégré](../../artifacts/furniture-final-core.json) : **62/62**, dix-neuf fichiers, aucun échec. Il rejoue le pilote cœur après optimisation, les besoins/horaires/conservation, les commandes, les oracles, chantiers et snapshots. [Migration approfondie](../../artifacts/furniture-migration-final.json) : deux scénarios passent aussi les anciennes places de repas/sommeil incompatibles et l’arête de lit engagée sans réécriture. La place de repas migrée reprend dans l’état de recherche avec portion conservée.

Le [lot intégré](../../artifacts/furniture-integration-core.json) a passé **42/46** : oracle de navigation, accès progressif, repas, production, loisirs, ordres, worker, agriculture et pilote de colonie. Ses quatre échecs ont été corrigés dans le [lot de frontières final](../../artifacts/furniture-boundaries-final.json), **17/17** : trois attentes de version/quantité mal mises à jour et une fixture qui supposait encore pouvoir choisir un repas sur une case de lit. Le scénario de protection de service part désormais d'un checkpoint synthétique de portion portée vers une place libre. Les résultats métier et les invariants n'ont pas été assouplis.

Le pilote cœur a joué huit jours sur la graine 42 et cinq sur 93/2048, cartes naturelles 250², avec camp, cultures, repas, loisirs, conservation et reprises quotidiennes. Les contrôles de simulation et d'horaires sont aussi passés dans le [lot des frontières](../../artifacts/furniture-boundaries-fixed.json), qui conservait alors deux échecs de fixtures, corrigés ensuite. Les lots se recouvrent : ne pas additionner leurs nombres comme autant de scénarios indépendants.

Deux nouveaux scénarios combinent oracle dirigé indépendant sur quatre rotations, délais non répétés entre définitions différentes, transit/arrêt, transport opposé, annulation sur table, matières et continuations. Les anciens tests spatiaux conservent les lits et le dormeur central ; les captures converties en V13 retirent explicitement les nouveaux suppléments avant de tester ses interdictions de chevauchement.

Les rapports [initial](../../artifacts/furniture-core.json), [reprise inchangée après échec de script](../../artifacts/furniture-boundaries.json), [première correction](../../artifacts/furniture-boundaries-fixed.json) et [fixtures](../../artifacts/furniture-fixtures-fixed.json) conservent les échecs diagnostiqués. Ils ont notamment exposé une ancienne borne de durée et le besoin de persister une sortie physique sans tâche métier. Aucun résultat n'est présenté comme couverture exhaustive.

Compilation intégrée réussie : 133 modules, worker 155,33 ko, bundle jeu 1 046,75 ko / 292,81 ko gzip. Avertissement >500 ko conservé, aucune nouvelle dépendance.

## Interface et rendu

Le [premier lot navigateur](../../artifacts/furniture-ui.json) passe les trois parcours natifs de mouvement : passage civil avec lits, quatre abattages avec vitesse/orientation, transport sur table avec pause et reprise. Les attributs début/fin/temps sont identiques entre corps, cargaison et anneau. Le contrôle mesure les attributs soumis et le temps de présentation, pas les sommets relus depuis le GPU.

Le parcours 250² de ce premier lot a échoué **avant tout gameplay**, sur `GPUDevice.createBuffer(mappedAtCreation)` pour des allocations de 100 248 et 79 224 octets. Le message ne démontre pas une limite normale de taille ni une cause précise ; le défaut n'est pas déclaré corrigé. Le même parcours relancé seul a ensuite chargé normalement et joué trois jours. Incident conservé et à surveiller aux prochains audits de chargement ; aucune réduction de carte ou d'assertion pour contourner l'échec.

La [seconde exécution](../../artifacts/furniture-ui-continuation.json) passe **2/2**, sans erreur, en 6,1 minutes : trois jours sur 250² et contrôle de mobilier avec une fixture rendue plus lisible (eau infranchissable autour du couloir au lieu de hautes roches). Dix-neuf checkpoints conservés, reprise quotidienne ; au tick 18 062 : trois lits, une table, trois tabourets, six murs, feu, piquet, quinze cultures, aucun chantier restant. 21 repas préparés, 18 ingestions, trois utilisateurs de lits, deux familles de loisirs ; 45 bois et 22 unités alimentaires dont six repas. Bilans réconciliés. La progression est celle de notre pilote, pas une observation statistique de joueurs de RimWorld.

La traversée chargée relève 2 678 échantillons de vitesse, 122 images de plateau et 346 de montée. Erreur maximale de vitesse calculée depuis les attributs <0,00001 unité/s ; cette valeur numérique ne mesure ni la latence ni les saccades de tout le jeu. L'ancienne mesure sur quatre abattages relève 251 échantillons et une erreur de vitesse <0,00021 unité/s, avec les quatre orientations de travail correctes. Captures `artifacts/furniture-crossing-paused.png` et `artifacts/colony-three-days.png` inspectées : plateau/cargaisons et camp visibles, structure UI et FPS présents. La capture du couloir est prise au début de l'entrée, pas un gros plan du colon déjà debout au centre du plateau.

Le compteur de résumé `furnitureTransit` de la longue UI comptait encore la dernière arête persistée même terminée ; le pilote est corrigé pour ne compter que les arêtes actives. Les mondes, objectifs et bilans de ce rapport restent inchangés.

## Performance CPU

[Audit avant optimisation](../../artifacts/furniture-cpu.json) puis [audit final](../../artifacts/furniture-cpu-optimized.json) : Ryzen 5 3600, Node 24.11.1, carte 250² graine 42, 300 ticks répétés deux fois, sans préchauffage. Setup, validation et agrégation hors chronométrage ; simulation et collecte des recherches dans la fenêtre. Aucun navigateur de test ni compilation en concurrence.

| Colons | Médiane finale | p95 final | p99 final | Maximum final |
|---|---:|---:|---:|---:|
| 3 | 0,065 ms | 1,872 ms | 4,783 ms | 10,684 ms |
| 30 | 1,678 ms | 7,240 ms | 16,050 ms | 25,281 ms |
| 100 | 10,021 ms | 26,710 ms | 32,474 ms | 37,591 ms |

Le [profil échantillonné](../../artifacts/furniture-profile-summary.json), avec son [exécution instrumentée](../../artifacts/furniture-cpu-profiled.json), relève principalement planner et capacités de stockage ; les seules opérations du shader ne peuvent expliquer ce coût CPU de simulation. `planWork` rejette maintenant les couples source/destination de priorité insuffisante avant le calcul pur de capacité. Même ordre des couples, budgets, curseur et décision ; pas de changement de règle ni cache entre ticks.

À cent colons, médiane 21,691 → 10,021 ms et p95 31,746 → 26,710 ms sur ces deux relevés. Les trois empreintes finales, bilans, activités et compteurs de recherches sont égaux avant/après. À cent : 14 repas, 120 cultures, 12 murs ; 1 146 recherches de candidats, 285 ciblées. Ce contrôle d'empreintes n'est pas une preuve mathématique de tous les états possibles. Les petites populations montrent de la variance ; aucune accélération universelle ou significativité statistique revendiquée.

Le budget ×6 (16,67 ms/tick) reste dépassé au p95 à cent acteurs. V21 observait 13 repas et 11 murs avec d'autres routes/coûts ; ses chiffres ne sont pas un A/B à état identique. Les scans de planification/stockage restent un chantier ciblé pour les prochains audits. Le premier lancement CLI a aussi détecté une propriété de paramètre TypeScript incompatible avec le mode Node strip-only ; elle est remplacée par une déclaration/affectation explicites, sans changement de comportement.

## Performance graphique

[Audit natif final](../../artifacts/furniture-render.json) : Chromium WebGPU, adaptateur AMD RDNA-1 (modèle exact non exposé), 1440×1000, 250² et cent acteurs dans vingt camps synthétiques. Quarante meubles portant initialement des piles. Worker réel à ×6, 60 images de préchauffage puis au moins 300 images/cinq secondes par vue ; aucun autre test/benchmark lourd en parallèle.

| Vue | Intervalles mesurés | RAF p95 / p99 / maximum | Soumission CPU p95 | Appels médians |
|---|---:|---|---:|---:|
| Locale | 659 | 8,50 / 20,90 / 29,10 ms | 8,30 ms | 143 |
| Générale | 1 051 | 8,40 / 12,70 / 29,20 ms | 6,20 ms | 42 |

Aucune erreur console/GPU, états validés et captures `occupancy-100-local.png`/`occupancy-100-overview.png` inspectées. Le monde avance successivement de 0 à 319 puis 378 à 665 ticks : les deux vues ne sont pas un A/B figé. Au relevé local, 24 acteurs sont actifs, dont quatre bâtisseurs ; à la fin de la vue générale, les vingt murs sont achevés et cent colons observent le ciel. Ce n'est pas cent constructeurs simultanés pendant toute la fenêtre ; l'audit CPU mixte complète cette observation.

Les lots des personnages restent partagés ; aucun nouveau draw call n'est requis par la hauteur de transit. Le total peut varier avec le travail et le décor visible. RAF inclut l'ordonnancement, la soumission CPU n'est pas du temps GPU. Le p95 proche de 8,5 ms n'exclut pas les pointes de 29 ms constatées. Le chargement 250² réussit également dans cet audit, sans reproduire l'erreur initiale d'allocation ; cause toujours non établie.

Contrôle documentaire final : 81 documents, liens locaux et fragments vérifiés, les trois originaux restent identiques octet pour octet.

## Portée

V22 livre la circulation des constructions présentes, leurs coûts et exclusions d'arrêt, une sortie physique après interruption et les hauteurs GPU. Aucun nouvel objet. Portage limité à dix unités, source unique par trajet, base de marche provisoire, autres coûts/profils, déplacement des personnes gênantes et variété du catalogue restent explicitement partiels. G0 en consolidation, G1 partiel, G2–G5 ouverts : [inventaire](../gameplay/implementation-status.md), [plan](../ROADMAP.md).
