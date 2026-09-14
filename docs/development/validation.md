# Validation courante — V18, ordres de transport et livraison

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](player-orders.md), [recherche et écarts](../research/player-orders-reference.md). Les [preuves V17](../history/validation-v17-orders.md) sont historiques.

## Simulation et continuité

[Lot ciblé](../../artifacts/forced-logistics-core-v2.json) : **30/30**, ordres directs, transports forcés, construction, production, conservation alimentaire, spatial, simulation et snapshots. Le pilote CPU sur trois graines passe : huit jours sur 42, cinq jours sur 93 et 2048, avec les nouveaux ordres de livraison de lit et rangement des rations. Les constructions, ressources, ingestion/repos et reprises quotidiennes restent ses résultats métier. Durée du scénario multi-graines : 37,3 s ; scénario de simulation général : 21,5 s, exécutés sous la borne de deux workers.

Les trois scénarios nouveaux vérifient : fractions actives/en attente sur une même pile avec deux colons, priorité des réserves et leur capacité, métiers désactivés après acceptation, source réellement prélevée, reprise en cours de portage, livraison sans finition, constructeur sans Transport, annulation du chantier et du stockage, âge/identité de la cargaison déposée, expiration d'une source réservée, formes/quantités corrompues et V17 stricte. Ils enrichissent F1/F2/F3 ; ils ne certifient pas tous les cas limites possibles.

Le premier lot a détecté un oubli de raccordement : le validateur courant appelait encore explicitement V17. Il lit désormais `SCHEMA_VERSION`. [Échec conservé](../../artifacts/forced-logistics-core.json), puis lot complet réussi ci-dessus. Le premier lancement avait aussi été bloqué par `spawn EPERM` dans le bac à sable ; l'exécution autorisée permet les sous-processus de Vite.

Compilation : 119 modules, worker 134,88 ko, jeu 1 045,34 ko / 292,28 ko gzip. Avertissement de taille du bundle >500 ko toujours présent.

## Interface et charge

[Lot navigateur](../../artifacts/forced-logistics-ui.json) : **3/3**, WebGPU natif Chromium, viewport 1440×1000, sans autre contrôle lourd simultané. Durée totale 6,0 minutes, dont 5,7 pour trois jours. Sélection et file V17 sont rejouées ; le nouveau parcours effectue livraison → rangement du riz → sauvegarde/reprise → finition séparée. Capture `artifacts/forced-logistics.png` inspectée : quantité réservée et file lisibles, FPS visibles, organisation UI conservée.

La colonie naturelle 250² atteint le tick 18 093 : 3 lits, table, 3 tabourets, 6 murs, feu et piquet ; 15 cultures, 22 repas cuisinés, 18 ingestions observées, 3 dormeurs en lit et les deux loisirs. Stock final 43 bois / 22 aliments dont 6 repas préparés. Bilans bois/aliments réconciliés, aucun travail/ordre restant, reprise exacte aux trois journées. Les commandes incluent deux coupes, la livraison du premier lit puis le rangement des rations. 19 checkpoints extraits vers tmp avec hashes de provenance ; aucune erreur console/GPU.

[Dernier lot cœur](../../artifacts/forced-logistics-validated-core.json) : **18/18** après optimisation des parcours de réservation. Il comprend aussi source mise hors d'accès après acceptation et pile incompatible face à une destination encore vide mais réservée. Les états finaux, activités, productions et nombres de recherches du benchmark sont identiques avant/après optimisation. L'UI longue réussie précède cette optimisation interne et la reformulation d'un refus de semis ; elle n'a pas été relancée, car les transitions/commandes restent identiques. Le dernier scénario typé avait initialement modifié la réserve après attribution, ce qui annulait normalement la livraison active : la fixture définit maintenant ses filtres avant les ordres. [Échec conservé](../../artifacts/forced-logistics-final-core.json).

### Audit CPU

Ryzen 5 3600, Node 24.11.1, carte 250², deux passes de 300 ticks ; besoins, cuisine, transport, culture, construction et combustible actifs. Setup/validation hors mesure, diagnostics inclus, sans chauffe ni autre test lourd simultané. [Mesure finale](../../artifacts/forced-logistics-final-cpu.json).

| Colons | Médiane ms/tick | p95 | p99 | Maximum |
|---:|---:|---:|---:|---:|
| 3 | 0,115 | 1,595 | 4,349 | 12,305 |
| 30 | 2,258 | 10,741 | 18,403 | 27,449 |
| 100 | 17,865 | 23,948 | 30,404 | 35,635 |

L'[ajout initial](../../artifacts/forced-logistics-cpu.json) avait mesuré 31,36 ms au p95 à 100. Une [variante avec tableau temporaire](../../artifacts/forced-logistics-array-cpu.json) n'a pas démontré de gain au p95. Le profil CPU local a identifié les contrôles de capacité parmi les coûts importants ; les vérifications fréquentes de source/capacité parcourent maintenant directement les réservations sans liste ni générateur temporaire, et s'arrêtent à capacité nulle.

Une [exécution fraîche de main V17](../../artifacts/forced-logistics-baseline-cpu.json), extraite en lecture seule dans tmp, mesure 29,28 ms au p95 à 100, contre 25,94 historiquement : les conditions locales fluctuent. Les mesures finales sont encourageantes, mais ne démontrent pas un gain universel. Les activités et résultats restent identiques : 13 repas, 120 cultures, 11 murs ; 1 178 recherches de candidats et 287 ciblées. Le budget ×6 de 16,67 ms/tick reste dépassé. Le [passage avec profilage](../../artifacts/forced-logistics-profile.json) est diagnostique, pas une comparaison de cadence sans instrumentation.

[Audit des files forcées](../../artifacts/forced-logistics-queues-cpu.json) : camp synthétique dégagé 250², deux transports par colon, sources/dépôts proches, 300 ticks et populations 3/30/100. Les quantités réservées puis déposées sont vérifiées, tout comme l'absence de tâche restante ; le rangement automatique est désactivé après acceptation. Le rapport sépare les ticks avec des tâches des ticks devenus inactifs et les requêtes/commandes ponctuelles. Ce cas mesure les files/réservations, pas des trajets longs en terrain naturel. Aucune nouvelle mesure GPU n'est revendiquée pour cette étape sans changement de rendu.

## Portée

Transport vers réserve et livraison de chantier forcés sont ajoutés à la file persistante ; les sources et capacités sont protégées dès acceptation. Dégagement, combustible et cuisine forcés restent absents. Portage de 10 unités et trajets unitaires hérités restent incomplets face à RimWorld ; ramassage opportuniste, tournée et réemploi direct de cargaison compatible en main ne sont pas livrés. Voir l'[inventaire fonctionnel](../gameplay/implementation-status.md).
