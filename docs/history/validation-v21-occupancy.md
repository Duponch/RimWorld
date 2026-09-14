# Validation courante — V21, meubles, objets et zones

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat de construction](../development/construction.md), [recherche et limites de certitude](../research/occupancy-reference.md). Les [preuves V20](../history/validation-v20-cooking-orders.md) sont historiques.

## Simulation et continuité

[Lot final](../../artifacts/occupancy-final-core.json) : **31/31**, construction, espace, rectangles, culture, production, transports/services et simulation. [Contrôle cultures/migration](../../artifacts/occupancy-growing.json) : **22/22** ; les scénarios de cuisine forcée y passent également. Ces lots se recouvrent et ne représentent pas 53 scénarios distincts.

Deux scénarios profonds enrichissent la famille construction : six profils de meubles, pile typée conservée ou portée, empreinte tournée, coût livré, âge exact, reprise comparée à chaque tick, réserve compatible et capacité du feu nulle. Frontières supplémentaires : livraisons actives/en file invalidées par un plan, cargaison déposée avec identité conservée, carte saturée refusée sans mutation, anciennes piles de lits déplacées sans perte, vieille sauvegarde invalide refusée avant migration. Le champ est retiré uniquement sous les empreintes incompatibles ; le dessin dans l’ordre inverse applique le même profil. Végétation défrichable conservée, annulation sans restauration magique de zone, anciennes cellules agricoles migrées, cellules restantes et politiques préservées.

Le [lot de continuation](../../artifacts/occupancy-continuation.json) a passé le pilote cœur : huit jours sur la graine 42, cinq sur 93 et 2048, avec bilans et reprises quotidiennes. Une orientation invalide a révélé une exception de précontrôle dans ce même lot (15/16), corrigée puis vérifiée dans le [lot de frontières](../../artifacts/occupancy-boundaries-fixed.json), **13/13**, et le lot final. Les deux premiers rapports [initial](../../artifacts/occupancy-core.json) et [fixture corrigée](../../artifacts/occupancy-core-fixed.json) conservent chacun 28/29 : leurs échecs provenaient de la nouvelle fixture legacy sérialisée trop tôt, puis d’une réservation saturée par le mauvais type d’objet. Les corrections n’ont pas relâché les invariants de production. Aucune couverture exhaustive revendiquée.

Le pilote enrichi dessine une réserve alimentaire sur un tabouret près du feu. Le contrôle long précède la correction ciblée du dessin agricole et l’optimisation d’empreinte ; son camp ne recouvre pas les cultures par des meubles. Les corrections suivantes ont leurs contrôles ciblés ; la longue UI n’est pas relancée pour une optimisation conservant les états finaux.

Compilation finale réussie : 128 modules, worker 151,02 ko, bundle jeu 1 046,34 ko / 292,64 ko gzip. Avertissement >500 ko toujours présent ; aucune nouvelle dépendance. Contrôle documentaire : 78 documents, 826 liens locaux, originaux identiques.

## Interface et rendu

[Lot navigateur](../../artifacts/occupancy-ui.json) : **3/3**, aucune erreur ni relance, 5,9 minutes. Le pilote WebGPU natif joue trois jours sur 250², 1440×1000, avec 19 checkpoints et reprises quotidiennes. Au tick 18 065 : trois lits, table, trois tabourets, six murs, feu, piquet et quinze cultures ; 22 repas cuisinés, 18 ingestions, trois utilisateurs de lits, deux familles de loisirs. Aucun chantier restant ; 45 bois et 22 unités alimentaires dont six repas. Matière réconciliée ; réserve sur tabouret effectivement commandée au tick 2 072. Ce parcours valide la cohérence du camp, pas la cadence empirique d’un joueur de RimWorld.

[Reprise UI finale](../../artifacts/occupancy-final-ui.json) : **2/2** en 18 secondes après correction agricole et optimisation, sans erreur. Les mêmes deux parcours courts passent de nouveau.

Le nouveau parcours court construit une table sur dix riz et un tabouret sur six baies : seule la réserve du tabouret subsiste, les deux piles gardent identité/type/quantité et cellule. Les 53 bois sont incorporés, seize aliments restent, puis sauvegarde/rechargement exact. La capture locale `artifacts/occupancy.png` a été inspectée : objets sur les meubles, panneau de réserve et FPS présents. Une petite fixture en pause ne mesure pas la charge d’une colonie.

Les checkpoints volumineux sont extraits dans tmp ignoré ; le rapport conserve résumés, résultats, erreurs et empreintes. Aucun benchmark ni compilation ne tourne en concurrence avec le navigateur. Les surfaces utilisent les lots instanciés existants ; aucun maillage ni coût par personnage et par image n’est ajouté. Cela ne prouve pas un coût total nul : l’index des surfaces est reconstruit par snapshot et les lots changés sont actualisés.

## Performance

[Audit mixte final](../../artifacts/occupancy-cpu-optimized.json), Ryzen 5 3600, Node 24.11.1, 250², 300 ticks répétés deux fois, sans préchauffage. Préparation, validation et agrégation des diagnostics exclues ; simulation et collecte de compteurs chronométrées. Médiane / p95 / p99 / maximum, ms :

| Colons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0,125 | 1,587 | 4,487 | 12,715 |
| 30 | 1,617 | 7,928 | 15,604 | 24,908 |
| 100 | 19,262 | 27,914 | 33,531 | 41,355 |

L’[audit avant optimisation](../../artifacts/occupancy-cpu.json) relevait un p95 de 31,332 ms à cent acteurs. Les requêtes ponctuelles d’empreinte n’allouent désormais plus de tableaux/cellules ; les piles pleines ou incompatibles sont refusées avant la vérification d’occupation. Les trois empreintes d’état final sont identiques avant/après optimisation, ainsi que les bilans et recherches. À cent : 13 repas, 120 cultures, 11 murs, 1 178 recherches groupées et 287 ciblées.

Un [témoin V20 contemporain](../../artifacts/occupancy-v20-control-cpu.json), extrait de `2ad0988` dans tmp et exécuté séparément, relève médiane 17,138 / p95 26,102 / p99 33,285 / max 48,527 ms à cent acteurs. Ce témoin n’a que cette population et son profil de préchauffage implicite diffère ; les relevés ne prouvent ni accélération statistique ni absence de surcoût. Le nouveau p95 reste supérieur au témoin et le budget ×6 de 16,67 ms/tick demeure dépassé. Les recherches d’accès sous forte charge restent le chantier principal ; pas de promesse de fluidité universelle.

[Audit graphique natif](../../artifacts/occupancy-render.json) : Chromium WebGPU, adaptateur AMD RDNA-1 exposé par le navigateur (modèle exact non fourni), 1440×1000, cent acteurs, vingt camps synthétiques, vingt tables et vingt tabourets portant initialement des aliments. Même carte naturelle 250², vrai worker à ×6, 60 images de préchauffage puis au moins 300 images et cinq secondes par vue. Aucun autre test lourd en parallèle.

| Vue | Images mesurées | Intervalle RAF p95 / p99 / max (ms) | Soumission CPU p95 (ms) | Draw calls médians |
|---|---:|---|---:|---:|
| Locale | 668 | 8,50 / 20,80 / 33,30 | 8,20 | 143 |
| Carte entière | 1 079 | 8,30 / 8,40 / 21,00 | 5,20 | 45 |

Aucune erreur console/GPU, états validés et captures locales inspectées. La simulation progresse successivement de 0 à 236 puis 266 à 535 : les vues ne comparent pas un même état figé. Trente acteurs travaillent au relevé final local ; à la fin de la vue distante, cent observent le ciel après la fin des vingt murs. Ce n’est donc pas cent constructeurs simultanés pendant toute la fenêtre. La fixture mixte CPU complète cette observation. RAF inclut l’ordonnancement ; la soumission CPU ne mesure pas le temps GPU. Le témoin de rendu historique n’avait pas ces quarante meubles : aucune égalité de coût graphique avant/après n’est déduite de ces chiffres.

## Portée et suite

La coexistence objets/zones des six meubles présents, les plans dans les réserves/champs, leur présentation et la persistance V21 sont livrés. Aucun nouvel objet n’est ajouté. Table encore solide dans notre navigation, portage dix unités, source unique par trajet, zones non regroupées et personne immobile gênante non déplacée restent explicites. Le prochain lot complète la circulation du mobilier, ses coûts, exclusions d’arrêt et présentation GPU. G1 reste partiel, G2–G5 ouverts : [inventaire fonctionnel](../gameplay/implementation-status.md), [plan canonique](../ROADMAP.md).
