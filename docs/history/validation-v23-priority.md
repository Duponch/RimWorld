# Validation courante — V23, maintien du travail priorisé

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](../development/player-orders.md), [sources et limites](../research/player-orders-reference.md#relecture-v23--maintien-prioritaire-sur-une-cellule). Les [preuves V22](../history/validation-v22-furniture.md) sont historiques.

## Simulation et continuité

[Lot intégré](../../artifacts/priority-core.json) : **66/66 dans 21 fichiers**, 47,1 secondes. Ordres directs et files, cuisine, transport, chantier, besoins, réservations, mouvement, sauvegardes et snapshots. Le pilote cœur joue huit jours sur la graine 42 et cinq jours sur 93/2048, cartes 250² : bilans bois/aliments, camp, cultures, ingestions, lits, loisirs et reprises quotidiennes vérifiés.

Trois scénarios nouveaux couvrent une chaîne de lit (coupe, dégagement en plusieurs voyages, approvisionnement, finition), un voisin intact, distinction constructeur/transporteur, cuisine répétée après ravitaillement puis retour à l’ingestion, annulation et effondrement avec cargaison, budgets partagés, accès perdu, délai et migration stricte V22. Les scénarios existants vérifient aussi que la dernière commande persistante en file remplace la cible ; une livraison par Construction peut désormais finir ce chantier malgré désaffectation ultérieure. Les attentes anciennes ont été corrigées à ce titre, sans retirer les bilans : annulation d’un cadre approvisionné testée sur une copie, cinq bois rendus physiquement.

Les premiers essais ciblés ont détecté des attentes qui supposaient l’arrêt après un sous-travail et des fixtures confondant ID du job et ID de l’ouvrage produit, ou déclenchant un effondrement avec repos plein. Corrections de tests et vérifications métier regroupées avant le lot intégré. Une conversion de texte Windows a été corrigée avant ce lot ; pas de modification voulue des libellés existants. Aucune couverture exhaustive ni parité avec un binaire commercial revendiquée.

Compilation réussie : 135 modules, worker 158,53 ko, bundle jeu 1 046,88 ko / 292,85 ko gzip. Avertissement de bundle >500 ko conservé, aucune dépendance ajoutée.

## Interface et partie de trois jours

[Lot natif](../../artifacts/priority-ui.json) : cinq parcours passent sur six en 6,9 minutes. La partie 250² sur trois jours passe en 5,9 minutes, sans erreur console/GPU et avec reprises quotidiennes. Au tick 18 092 : trois lits, une table, trois tabourets, six murs, feu, piquet, quinze cultures ; 21 repas cuisinés, 18 ingestions et trois utilisateurs de lits, les deux loisirs observés. 45 bois et 22 unités alimentaires dont six repas, bilans réconciliés. Dix-neuf checkpoints extraits vers `tmp` avec empreintes conservées dans le rapport.

Le nouveau chantier UI vérifie annulation via le bouton, réacceptation, désactivation du métier, sauvegarde puis lit achevé à partir de son arbre avec quatre bois restants ; le plan voisin reste intact. La cuisine UI passe deux recettes successives après une file de dégagement agricole. Sélection dans les deux projections et livraison/rangement par transporteur seul passent également.

L’ancien parcours plante/combustible échoue sur son attente de douze bois après dégagement : le maintien a réellement construit le mur en utilisant les cinq bois prévus. L’attente est corrigée pour demander le mur achevé, zéro job, zéro pile sur sa cellule et sept bois restants, puis seul ce parcours est rejoué : **1/1 réussi en 14,1 secondes** ; [rapport ciblé](../../artifacts/priority-ui-corrected.json). Aucun changement moteur après le lot cœur et la partie longue.

Captures `artifacts/priority-work.png` et `artifacts/colony-three-days.png` inspectées : lit terminé/plan voisin, camp, structure UI et compteur FPS présents. Ce sont des observations visuelles, pas des mesures de fluidité. L’allocation WebGPU au chargement réussit dans ces parcours ; pas de reproduction de l’incident ponctuel V22.

## Petit audit de simulation

[Charge priorisée](../../artifacts/priority-cpu.json) : Ryzen 5 3600, Node 24.11.1, Windows, 250² graine 42 ; 300 ticks répétés deux fois, sans préchauffage. Chaque camp de cinq acteurs reçoit un ordre de cuisine et un ordre de livraison par constructeur à l’initialisation. Les autres acteurs continuent cuisine, stockage, culture et construction. Setup/validation/agrégation hors mesure, collecte des compteurs de recherche dans le tick. Aucun build ou test navigateur lourd concurrent.

| Colons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0,090 ms | 1,997 ms | 4,058 ms | 8,114 ms |
| 30 | 0,309 ms | 10,846 ms | 20,031 ms | 27,485 ms |
| 100 | 10,881 ms | 40,443 ms | 47,685 ms | 61,523 ms |

Dernière répétition à cent : 34 repas, 120 cultures et 20 murs, 1 274 recherches de candidats et 333 ciblées ; matières et état final validés. Ces résultats ne sont **pas un A/B** avec V22 automatique (14 repas/12 murs) : les ordres modifient l’activité et les trajets. Le p95 à cent dépasse le budget de 16,67 ms/tick pour ×6 ; scans de planification/stockage à reprendre lors des prochains audits. Ce relevé mesure la simulation CPU, pas les FPS ni le GPU.

Aucune géométrie, attribut d’animation ou passe de rendu ajouté. L’interface native vérifie le compteur FPS, sans prétendre constituer un nouvel audit des percentiles graphiques. L’erreur ponctuelle d’allocation WebGPU 250² notée en V22 reste à surveiller ; sa cause n’est pas établie.

## Portée

V23 livre les suites sur une cellule pour construction/livraison, cuisine et recharge. Délai, famille, annulation et intention sauvegardée restent séparés des réservations de tâches. Autres fournisseurs, incapacité/santé, ordres manuels d’ingestion/sommeil, portage et logistique opportuniste restent ouverts. Aucun nouvel objet ajouté. Déconstruction/récupération puis réinstallation sont les prochains travaux ; minage/pierre et portes/toits/pièces suivent dans le [plan](../ROADMAP.md). [Inventaire complet des systèmes partiels ou absents](../gameplay/implementation-status.md).

Contrôle documentaire final : 82 documents et 882 liens locaux/fragments ; les trois originaux restent identiques octet pour octet.
