# Validation courante — V19, dégagement et combustible forcés

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](player-orders.md), [recherche et écarts](../research/context-services-reference.md). Les [preuves V18](../history/validation-v18-logistics.md) sont historiques.

## Simulation et continuité

[Lot ciblé](../../artifacts/context-services-core.json) : **20/20**, commandes, transports, dégagement, cuisine, pourriture, snapshots et pilote. [Continuation après intégration du pilote et du schéma](../../artifacts/context-services-continuation.json) : **15/15**, services, simulation, navigation et pilote ; ces deux lots se recouvrent, ils ne représentent pas 35 tests distincts. Le pilote conserve huit jours sur la graine 42 et cinq sur 93 et 2048, avec commandes, constructions, ingestion/repos, matières et reprises quotidiennes.

Deux scénarios profonds supplémentaires exercent les nouvelles chaînes : feu au-dessus du seuil avec automatisme désactivé, source et poste réservés en file, refus concurrent et cuisine bloquée, désaffectation du métier, prélèvement/trajet/service, interruption avec cargaison conservée, réservoir plein, reprise et rejet des faux schémas. Construction : plante sur la deuxième cellule d’un lit tourné, coupe en file, annulation de sa réservation, production conservée, transport sans métier Transport, tas supérieur au portage, parent annulé et reprise exacte. La validation contrôle chaque tick de ces parcours. Aucune couverture exhaustive des bugs n’est revendiquée.

Compilation : 120 modules ; worker 139,31 ko ; bundle jeu inchangé à 1 045,34 ko / 292,28 ko gzip. L’avertissement >500 ko reste présent. Le premier essai de compilation a détecté deux chaînes françaises insérées avec un encodage Windows ; elles ont été remises en UTF-8 puis la compilation est passée. Pas de changement de dépendances.

## Interface

[Lot natif initial](../../artifacts/context-services-ui.json) : trois réussites et un échec utile. Le pilote de trois jours passe en 5,6 minutes, avec 19 checkpoints, WebGPU Chromium natif et viewport 1440×1000. À 18 087 ticks : trois lits, table, trois tabourets, six murs, feu, piquet, quinze cultures ; 22 repas cuisinés, 18 ingestions observées, trois utilisateurs de lits, deux familles de loisirs. Bilans bois/nourriture reconciliés, zéro chantier restant, aucune erreur de console du parcours long. La fin contient 45 bois et 22 unités alimentaires, dont six repas préparés.

Le nouveau parcours contextualisé a révélé un défaut V16 : `addMaterial` traitait encore un plan de mur comme un mur solide. La coupe produisait du bois sur le plan et levait une exception. Correction : seuls les murs construits, ou les plans des anciens schémas validés selon leurs règles historiques, bloquent cette création ; les contrôles de capacité restent communs. Le scénario de construction automatique couvre désormais arbre → dégagement → livraison → mur avec bilan exact.

[Lot de régression après correction](../../artifacts/context-services-wall-regression.json) : **16/16**, construction, services, simulation et conservation alimentaire. [Rejeu du parcours UI concerné](../../artifacts/context-services-ui-fixed.json) : **1/1**, 10,2 secondes. Coupe sur plan de mur, recharge sans automatisme, désaffectation après acceptation, sauvegarde en file et en transport, tas résiduel conservé : tous passent. Le long parcours déjà réussi n’a pas été répété après cette correction localisée ; sa preuve porte sur le code précédant ce correctif. Capture `artifacts/context-services.png` inspectée : plan, piles déplacées, feu, organisation UI et compteur FPS visibles. Le FPS de cette petite fixture en pause n’est pas un benchmark de colonie.

Aucune compilation ni audit CPU lourd n’a tourné pendant les parcours navigateur.

## Performance

[Audit CPU mixte](../../artifacts/context-services-cpu.json), Ryzen 5 3600, Node 24.11.1, carte 250², 300 ticks répétés deux fois par population, sans préchauffage ni rendu concurrent. Simulation seule mesurée, préparation et validation exclues. Médiane / p95 / p99 / maximum en ms :

| Colons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0,075 | 1,136 | 3,877 | 10,169 |
| 30 | 1,477 | 7,192 | 12,101 | 17,533 |
| 100 | 16,525 | 25,206 | 30,365 | 34,864 |

À 100 colons : mêmes 13 repas, 120 cultures, 11 murs et nombres de recherches que V18. Le p95 historique V18 était 23,948 ms ; ce relevé est du même ordre de grandeur, sans prouver une absence totale de régression. Le budget ×6 de 16,67 ms/tick reste dépassé. La navigation sous charge demeure une priorité d’optimisation ; aucune fluidité universelle n’est annoncée.

Le script de files existant possède désormais un mode `--refuel` : un rangement puis une recharge forcée par colon, avec automatisme coupé, quantités et combustible brûlé vérifiés. Il sépare requêtes, commandes, ticks actifs et reste de la fenêtre, et conserve une borne de 90 secondes. Ce scénario dégagé à trajets courts ne mesure pas un pire cas de navigation. [Résultats des files de recharge](../../artifacts/context-services-queues-cpu.json) : 3/30/100 colons, p95 des ticks actifs 2,105 / 7,302 / 12,603 ms. À 100 : 100 ordres en file, 70 ticks actifs sur 300 ; 1 000 bois rangés, 1 000 transférés aux feux et 1 000 encore à la source, aucun ordre restant. Les feux contiennent ou ont brûlé 1 200 000 ticks de combustible, réserve initiale incluse. Requête contextuelle p95 1,126 ms, commande p95 1,601 ms. Le p95 de la fenêtre entière (6,948 ms) inclut les ticks inactifs ; il ne remplace pas la mesure de charge.

## Portée

Coupe/déplacement sur chantier et recharge manuelle sont livrés avec file et persistance V19. Le dégagement manuel des piles sur semis et la cuisine forcée restent absents ; leurs boucles automatiques restent jouables. Portage de dix unités, source unique, exclusivité stricte du poste et absence de tournée restent des limites connues. Aucun nouveau rendu n’est ajouté et aucune nouvelle mesure de coût GPU n’est déduite de cet audit CPU. Voir l’[inventaire fonctionnel complet](../gameplay/implementation-status.md).
