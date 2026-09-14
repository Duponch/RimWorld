# Validation courante — V20, cuisine forcée et dégagement des semis

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](../development/player-orders.md), [recherche et écarts](../research/cooking-orders-reference.md). Les [preuves V19](../history/validation-v19-services.md) sont historiques.

## Simulation et continuité

[Lot ciblé](../../artifacts/cooking-orders-core.json) : **24/24**, commandes, réservations, cuisine, services, conservation alimentaire, culture et snapshots. [Continuation](../../artifacts/cooking-orders-continuation.json) : **16/16**, ordres de cuisine, simulation, navigation et pilote. Ces lots se recouvrent : ils ne représentent pas 40 scénarios distincts. Le pilote conserve huit jours sur la graine 42 et cinq sur 93 et 2048, avec bilans, ingestion/repos et reprises quotidiennes. Sa politique peut prioriser une première recette admissible lorsque le camp manque de repas ; cette branche est conditionnelle, pas garantie dans chaque graine. Elle n’a pas été déclenchée dans le parcours UI de trois jours de ce relevé ; le parcours UI ciblé vérifie effectivement la nouvelle commande.

Les trois nouveaux scénarios profonds couvrent six riz/quatre baies après une facture non réalisable, staging typé, poste exclusif, refus sans mutation, file derrière un abattage, métier désactivé après acceptation, continuation exacte à chaque phase et production unique. Autres frontières : facture suspendue/rayon, recharge préalable sans Transport, faux schéma V19 et recette invalide rejetés, expiration libérant la file, accès perdu, facture annulée pendant le portage avec âge/quantité conservés. Le dégagement agricole garde son intention lorsque le job de semis est renouvelé ; annuler la zone dépose la cargaison ; une grosse pile garde son reliquat puis le semis attend son dégagement automatique. Validation à chaque tick de ces parcours. Aucune couverture exhaustive revendiquée.

Compilation réussie : 124 modules ; worker 147,20 ko ; bundle jeu 1 045,69 ko / 292,33 ko gzip. Avertissement >500 ko encore présent ; pas de nouvelle dépendance ni changement de rendu. Après ces contrôles, seule une correction de commentaire de code a été apportée.

## Interface

[Lot navigateur natif](../../artifacts/cooking-orders-ui.json) : **5/5**, aucune erreur ni relance, 6,3 minutes au total. Le pilote WebGPU Chromium normal joue trois jours sur 250² à 1440×1000, 19 checkpoints et reprises quotidiennes, en 5,6 minutes. Au tick 18 065 : trois lits, table, trois tabourets, six murs, feu, piquet, quinze cultures ; 22 repas cuisinés, 18 ingestions observées, trois utilisateurs de lits, deux familles de loisirs. Aucun chantier restant ; 45 bois et 22 unités alimentaires, dont six repas préparés. Bilans matière réconciliés et aucune erreur console. Ce parcours valide la cohérence de la progression, pas la vitesse empirique d’un joueur de RimWorld.

Le parcours ciblé V20 (8,7 secondes) dégage une pile de champ, ajoute une recette en file par Maj-clic, désactive Cuisine après acceptation, recharge la sauvegarde puis prépare un repas et autorise le semis. Dix bois et un repas restent physiquement présents ; le champ est libéré puis semé. Trois autres parcours revérifient sélection/deux projections, chantier/ravitaillement et transport/livraison. La capture locale `artifacts/cooking-orders.png` (ignorée par Git) a été inspectée : feu, objets, culture, interface et FPS visibles. Le FPS d’une petite fixture en pause ne prouve pas les performances d’une colonie.

Les gros checkpoints bruts sont extraits dans tmp ignoré ; le rapport conserve résultats, résumés et empreintes pour audit. Aucun benchmark CPU ni compilation en concurrence avec le navigateur.

## Performance

[Audit mixte](../../artifacts/cooking-orders-cpu.json), Ryzen 5 3600, Node 24.11.1, 250², 300 ticks répétés deux fois par population, sans préchauffage ni rendu concurrent. Préparation et validation exclues ; simulation seule. Médiane / p95 / p99 / maximum, en ms :

| Colons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0,073 | 1,099 | 3,306 | 9,466 |
| 30 | 1,400 | 7,217 | 13,714 | 22,921 |
| 100 | 16,752 | 23,783 | 30,695 | 38,403 |

À 100 colons : 13 repas, 120 cultures et 11 murs, mêmes résultats et nombres de recherches que V19. Le p95 historique était 25,206 ms ; ce relevé est comparable, sans constituer une preuve statistique d’accélération ni une garantie d’absence de régression. Le budget ×6 de 16,67 ms/tick reste dépassé. La navigation sous charge demeure à optimiser ; aucune promesse de fluidité universelle.

[Files de cuisine](../../artifacts/cooking-orders-queues-cpu.json) : nouvelle option `--cook` du script de logistique, carte dégagée 250², un rangement puis une recette forcée par acteur, métiers désactivés après acceptation, 300 ticks, un passage sans préchauffage et watchdog 90 secondes. Les p95 des ticks actifs sont 1,960 / 5,863 / 7,860 ms pour 3/30/100 colons. À 100 : 265 ticks actifs, 100 recettes terminées, 1 000 bois rangés sur 3 000 présents et 100 repas, aucun ordre restant. Le combustible initial restant ou brûlé totalise 600 000 ticks. Requête contextuelle p95 2,607 ms, commande p95 3,708 ms ; p99 de toute la fenêtre 13,080 ms, maximum 16,974 ms. La courte proximité des postes ne mesure pas un pire cas de navigation et ce scénario diffère des recharges V19.

Les quantités et capacités très consultées comptent les ordres par boucles directes, sans tableau temporaire. Les autres vérifications de file ne sont exécutées que par simulation/commande ; aucun coût par personnage et par image n’a été ajouté. Pas de nouvelle mesure GPU déduite de ces chiffres CPU.

## Portée et suite

Cuisine forcée et dégagement manuel avant semis sont livrés avec persistance V20. Portage dix unités, source unique par trajet, une recette par ordre, exclusivité stricte du poste et absence de maintien local du travail priorisé restent explicites. Aucun nouvel objet n’est ajouté au catalogue. La prochaine étape G0 reprend les profils d’occupation et la coexistence des plans/meubles avec les objets et réserves. G1 reste partiel, G2–G5 ouverts : [inventaire fonctionnel complet](../gameplay/implementation-status.md), [plan canonique](../ROADMAP.md).
