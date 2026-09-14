# Validation courante — V17, sélection et ordres directs

14 septembre 2026. G0 en consolidation, G1 partiel. Sélection de groupe et ordres individuels sur travaux exécutables, avec file réservée, interruptions et migration V16→V17. [Recherche et limites](../research/player-orders-reference.md), [contrat](player-orders.md). Les [preuves V16](../history/validation-v16-construction.md) sont historiques.

## Gameplay et continuité

Le [lot ciblé](../../artifacts/player-orders-core.json) passe 35 scénarios : ordres, simulation, spatial, désignations, besoins/horaires, loisirs, construction, aliments, régimes et snapshots. Le pilote CPU de plusieurs jours passe également sur 42/93/2048 (huit jours sur 42, cinq sur les deux autres), avec deux premiers lots de bois demandés par ordres directs. Bilans physiques, repas, couchages, culture/cuisine et rechargements quotidiens restent ses critères ; aucun stock ni saut de temps n'est injecté pendant sa progression.

[Dernier rejeu ciblé](../../artifacts/player-orders-validated-core.json) : 13/13 après les derniers cas de file, y compris simulation et snapshots. Quatre scénarios approfondissent la nouvelle file : priorité sur une cible éloignée, métier 0 avant/après acceptation, exclusivité entre colons, alimentation différée puis reprise, file après ingestion réelle, déplacement diagonal interrompu avec aliment porté, conservation d'âge/quantité, accès devenu impossible, annulation, effondrement et V16 invalide refusée. La finition forcée exige un chantier déjà approvisionné ; le test de préparation synthétique ne remplace pas la chaîne de livraison réelle du scénario Construction.

Le [lot UI initial](../../artifacts/player-orders-ui.json) passe trois parcours natifs : chantier et portage, cadrage d'une ressource par le pilote, puis sélection/ordres. Le parcours de sélection couvre Maj-clic, double-clic, rectangle, Échap, iso/perspective, groupe non admis comme donneur d'un travail unique, métier désactivé, deux ordres, sauvegarde/reprise et 36 bois récoltés.

[Parcours long et mouvements repris](../../artifacts/player-orders-journey-final.json) : 3/3. Sur 250², deux ordres directs au départ puis trois jours par la vraie UI : au tick 18 058, trois lits, table, trois tabourets, six murs, feu et piquet ; 15 plants de riz, 21 repas cuisinés, 18 ingestions observées, trois dormeurs en lit et deux familles de loisirs. Un chantier dégagé naturellement. Stock final 45 bois/22 aliments dont six repas préparés ; aucun travail ni ordre direct en attente, faim/repos minimum 41,95/53,94. Bilans matière réconciliés et trois rechargements quotidiens exacts. Les 19 checkpoints sont extraits vers tmp, avec SHA-256 conservés au rapport.

[Dernier contrôle UI](../../artifacts/player-orders-final-ui.json) : 2/2, sélection/ordres natifs et frontières (commandes répétées, sauvegarde invalide atomique, aide, organisation compacte). Le long parcours précède les deux ultimes corrections de file : ajouter pendant l'intervalle entre deux travaux conserve les anciennes entrées ; redonner sans Maj un travail déjà en file le fait passer immédiatement. Ces branches sont contrôlées au cœur et le menu/worker est rejoué ; elles ne changent pas le déroulement ordinaire du pilote.

Compilation finale : 117 modules, worker 127,71 ko, jeu 1 045,15 ko / 292,21 ko gzip ; avertissement connu du bundle >500 ko. Tests, audits et compilation exécutés par lots successifs, sans édition des sources/tests/config pendant un parcours navigateur.

## Audit CPU à charge active

[Rapport](../../artifacts/player-orders-cpu.json), Ryzen 5 3600, Node 24.11.1, graine 42 sur 250². Deux passes de 300 ticks par population ; besoins et tâches cuisine/transport/culture/construction/combustible actifs. Setup et validation hors mesure, diagnostics inclus, pas de chauffe ni de test concurrent. Les ordres ne sont pas forcés dans cette fixture : elle mesure le coût ajouté au fonctionnement automatique.

| Colons | Médiane ms/tick | p95 | p99 | Maximum | Repas / cultures / murs |
|---:|---:|---:|---:|---:|---|
| 3 | 0,093 | 1,369 | 4,430 | 11,051 | 3 / 6 / 1 |
| 30 | 1,465 | 8,230 | 13,899 | 21,790 | 6 / 36 / 6 |
| 100 | 17,177 | 25,939 | 29,977 | 42,725 | 13 / 120 / 11 |

Bilans, effectifs d'activité et compteurs de recherche identiques au relevé final V16 ; les empreintes JSON changent avec le schéma et les files vides. Cela ne prouve pas l'égalité de tous les états intermédiaires. À 100 colons, p95 précédent 25,58 ms contre 25,94 ici : **pas d'amélioration revendiquée**, ni de régression majeure démontrée par ce seul échantillon. Le budget 16,67 ms/tick à ×6 reste dépassé. Les chemins et vérifications de chantier restent les postes à profiler.

## Audit graphique de la sélection

[Rapport](../../artifacts/player-orders-render.json), AMD RDNA1, Chromium WebGPU natif, 1440×1000. Même monde de 100 colons après 75 ticks réels, puis pause et caméra conservée dans chaque série 0/1/100/0. Échauffement 60 images, puis au moins 300 images/trois secondes. Les sélections passent par le callback UI instrumenté ; ce n'est pas une mesure du délai physique de la souris. Aucune autre charge de test lourde.

| Vue | Sélection | Image p95 ms | p99 | Maximum | CPU soumission p95 | Appels |
|---|---:|---:|---:|---:|---:|---:|
| Locale | 0, première passe | 12,60 | 16,50 | 20,80 | 11,70 | 138 |
| Locale | 1 | 12,50 | 12,60 | 12,70 | 9,20 | 138 |
| Locale | 100 | 12,50 | 12,70 | 12,80 | 10,30 | 138 |
| Locale | 0, retour | 12,50 | 12,60 | 16,80 | 9,60 | 138 |
| Générale | 0, première passe | 8,40 | 8,40 | 12,60 | 6,40 | 42 |
| Générale | 1 | 8,40 | 8,40 | 8,50 | 6,40 | 42 |
| Générale | 100 | 4,30 | 8,30 | 8,40 | 5,20 | 42 |
| Générale | 0, retour | 8,30 | 8,40 | 8,50 | 5,60 | 42 |

Appels et triangles constants pour une même vue (219 765 locale, 522 453 générale). Un lot résident d'anneaux remplace la sélection isolée ; il ajoute un appel au socle même sans sélection et ne croît pas en appels avec le groupe. Le p95 plus bas de la passe générale à 100 ne signifie pas que sélectionner accélère le jeu : RAF inclut ordonnancement et cadence d'affichage ; huit petites fenêtres ne sont pas une distribution exhaustive.

Coût ponctuel mesuré du callback de sélection : 4,0 à 9,0 ms, dont 7,2/5,7 ms pour 100 colons local/général. Trente requêtes de menu passent par le vrai worker et une cible accessible : médiane 4,7 ms, p95 9,2 ms, maximum 9,5 ms ; le monde est identique avant/après. Ce cas n'est pas une preuve du pire chemin impossible.

Aucune erreur console/GPU. Captures inspectées pour anneau individuel et groupe de cent colons, inspection en bas à gauche, portraits défilants en haut, carte générale et FPS visibles. La fixture nomme tous ses clones Ada ; ce n'est pas la génération de noms d'une nouvelle colonie.

## Limites

Le fournisseur force un travail exécutable, pas tout un chantier. Transport, approvisionnement, dégagement, combustible et cuisine forcés, autres familles sélectionnables, maintien local de priorité, mobilisation et commandes manuelles de besoins restent absents. La file est bornée à 32 entrées ; capacités, santé et crises ne sont pas simulées. Voir l'[inventaire complet](../gameplay/implementation-status.md) pour les autres systèmes et le catalogue manquants.

## Échecs diagnostiqués

Les [premiers parcours](../../artifacts/player-orders-journey.json) conservent deux échecs : la vérification finale du pilote ignorait `order-job`, et la fixture V13 de circulation contenait un champ Loisirs plus récent. La fixture historique est désormais validée avant utilisation et comparée sémantiquement au monde cible ; la comparaison JSON utilise le résultat migré pour ne pas confondre l'ordre des clés avec un changement d'état.

L'[extension de scénario](../../artifacts/player-orders-edge-core.json) tentait d'injecter du bois au sol sur un plan de mur avec un helper qui refuse cette destination ; la préparation synthétique du cadre passe par une case libre puis une propriété de chantier. Le [contrôle suivant](../../artifacts/player-orders-final-core.json) bornait l'attente aux 100 ticks de coupe sans compter l'approche ; il permet désormais le trajet et exige explicitement la disparition du premier travail. Ces échecs de fixtures/attentes ne sont pas présentés comme des anomalies corrigées du gameplay.
