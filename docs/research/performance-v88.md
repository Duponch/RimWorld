# Performance V88 — simulation, observations et publication

Enquête du 20 septembre 2026, **en cours de validation**. La base est V87 `d38906a`, extraite depuis Git sous `tmp/performance-v88/base` pour isoler les ajouts fonctionnels V88 concurrents. Ce chantier concerne les coûts internes ; il ne modifie ni les règles de jeu, ni les calendriers, ni les tirages. [Méthode de validation](../development/testing.md), [mesures V87](performance-v87.md).

## Deux charges distinctes

Le banc préparé reprend exactement `ENVIRONMENT=1` avec **100 colons, 100 lièvres, 650 ticks** et un encodage de snapshot tous les cinq ticks. Une charge distincte de trois colons avance de cent ticks avant la mesure. Les ateliers, réserves, équipements et feux contrôlés sont ceux du protocole V87 ; ce n'est pas une colonie autonome.

La seconde fenêtre poursuit le checkpoint réel `colony-v87.json.gz`, de **816 438 à 817 438 ticks**, avec quatre colons et onze animaux. Les décisions du pilote restent espacées de 250 ticks, ou vingt pendant un raid actif. Son observation et ses compteurs tournent à chaque tick ; conservation et validation complète sont vérifiées tous les 250 ticks et à la fin. La continuation de 120 ticks sur deux copies est contrôlée et chronométrée séparément. Aucune accélération des règles, aucun saut de tick. Cette courte fenêtre ne traverse pas un enregistrement quotidien et ne prétend pas mesurer le coût moyen de la campagne annuelle ; elle commence sans amorçage JIT séparé.

Matériel : Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1. Les profils CPU V8 sont successifs, sans autre campagne CPU ni mesure native simultanée de Lisière. L'activité extérieure à Lisière n'est pas contrôlée. Les scripts, copies de code et mondes de diagnostic restent dans `tmp/performance-v88`. Aucun contenu propriétaire ou sauvegarde RimWorld brute n'est utilisé.

## Profils initiaux

Les temps suivants sont **instrumentés par V8**. Ils localisent les coûts ; ils ne prouvent aucun gain avant/après, ni débit natif. Les pourcentages inclusifs se recouvrent.

| Charge | Somme `stepWorld` | Tick p50 | Tick p95 | Tick p99 | Maximum |
|---|---:|---:|---:|---:|---:|
| ENVIRONMENT, 650 ticks | 28 661,63 ms | 40,32 ms | 82,24 ms | 120,81 ms | 136,32 ms |
| Colonie réelle, 1 000 ticks | 4 983,81 ms | 3,86 ms | 12,24 ms | 23,93 ms | 90,46 ms |

Sur le banc, les 130 encodages totalisent 1 045,40 ms, p95 12,80 ms. La validation finale prend 115,86 ms, les résultats métier 14,06 ms et la sérialisation stricte 118,00 ms. Les contrôles passent. L'état final conserve l'empreinte `2b1620d3415be4890ae552087191df935a4f31412569f08a55b1b338fa099495`.

Sur la colonie, les quatre décisions prennent 159,20 ms ; le comptage avant/après les pas, 15,27 ms ; l'observation à chaque tick, 74,18 ms ; les cinq contrôles complets, 436,46 ms. La continuation séparée prend 1 660,52 ms, y compris les deux simulations et leurs validations/sérialisations. Les contrôles et la continuation exacte passent. L'état final a l'empreinte `e469945bb533604d38b5dbf340467270403337fb2f624b527f137b72d7beb0ae`.

| Coût échantillonné | Banc ENVIRONMENT | Colonie réelle |
|---|---:|---:|
| `stepWorld`, inclusif | 94,27 % | 86,90 % |
| `canStandAt`, propre | 8,24 % | 1,93 % |
| `navigationCosts`, propre | 5,47 % | 3,62 % |
| `blockedCells`, propre | 2,94 % | 6,98 % |
| `animalNavigation`, inclusif | — | 13,63 % |
| Contexte agricole appelé par `growingJobValid`, propre | 1,75 % | — |

Les observations du pilote ne sont donc pas le premier coût de ces fenêtres. Les captures de navigation, les requêtes d'occupation et les recherches de travail restent visibles. Le coût des contrôles stricts est conservé et présenté séparément ; il n'est pas supprimé pour raccourcir un parcours.

## Candidate bornée

La navigation animale construit actuellement une grille de toute la carte même pour vérifier le sommeil sur une case ou un seul pas de promenade. La candidate capture les solides et portes locaux, applique les mêmes vérifications ponctuelles, puis ne matérialise la grille dense qu'à la première recherche de route. Les coins de porte, délais, arrondis, ordre de sélection et recherche pondérée sont conservés. Cette capture ne survit pas à une décision synchrone ; aucune mutation du monde ne doit s'intercaler dans son utilisation.

La validation d'un travail agricole interroge une case, ou cinq pour l'abattage voisin. La candidate vérifie uniquement leurs emprises au lieu d'expanser toutes les emprises du monde, et n'instancie la vue thermique que si l'intention en a besoin. La découverte de nouveaux travaux garde sa capture complète ; la logique d'intention est commune aux deux chemins.

Deux paires successives, sans profileur, emploient l'ordre base → candidate puis candidate → base. Chaque entrée est un nouveau processus Node ; la charge synthétique conserve son amorçage distinct, la courte colonie n'en ajoute pas. Les deux modules changent ensemble : le résultat n'attribue pas une part du gain à chacun. [Rapports compacts, conditions et empreintes](../../artifacts/navigation-farming-cpu-v88.json).

| Charge / passe | Somme des ticks | p50 | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|---:|
| ENVIRONMENT base 1 | 30 393,59 ms | 42,46 ms | 86,11 ms | 126,75 ms | 144,04 ms |
| ENVIRONMENT candidate 1 | 28 073,10 ms | 38,64 ms | 86,42 ms | 128,49 ms | 160,88 ms |
| ENVIRONMENT candidate 2 | 27 518,29 ms | 38,73 ms | 79,50 ms | 119,77 ms | 142,40 ms |
| ENVIRONMENT base 2 | 32 385,74 ms | 44,64 ms | 97,66 ms | 158,81 ms | 192,22 ms |
| Colonie base 1 | 5 451,69 ms | 4,19 ms | 13,32 ms | 25,83 ms | 132,23 ms |
| Colonie candidate 1 | 4 887,10 ms | 3,56 ms | 12,43 ms | 24,60 ms | 107,58 ms |
| Colonie candidate 2 | 5 767,65 ms | 4,16 ms | 14,18 ms | 28,62 ms | 135,64 ms |
| Colonie base 2 | 6 348,88 ms | 4,74 ms | 16,22 ms | 28,46 ms | 107,44 ms |

La somme des pas diminue de **7,63 % et 15,03 %** dans les deux paires ENVIRONMENT, et de **10,36 % et 9,15 %** dans les deux paires de la colonie. La dispersion entre passes reste visible. Certains percentiles ou maximums candidats augmentent : ces deux paires ne donnent ni intervalle de confiance robuste, ni amélioration universelle, ni promesse de débit natif.

Les huit passages satisfont leurs oracles. Les états initiaux et finaux de chaque charge sont identiques **octet à octet**, sans exclusion de champs ; les empreintes finales sont celles des profils initiaux ci-dessus. L'état du pilote et sa comptabilité restent également identiques, et toutes les continuations passent. Aucun tirage, objet, chemin ou réservation n'est effacé avant la comparaison.

Après report des deux modules dans le workspace V88 : **10 contrôles sur 12 passent**, quatre fichiers, 6,14 s. Les frontières nouvelles vérifient les pas animaux contre la grille dense, les portes et coins, les recaptures après mutation au même tick, ainsi que la validation agricole ponctuelle contre la capture complète pour toutes les formes/orientations. Les deux échecs concernent les fixtures de migration V75/V83 pendant l'intégration du schéma V88 : elles atteignent un schéma alors non pris en charge par `deserializeWorld`. Les contrôles de mouvement, nutrition, croissance, récolte et les deux nouveaux oracles passent. L'intégration centrale doit compléter les migrations puis reprendre ces frontières ; aucune assertion n'a été retirée.

## Publication et rendu

L'encodage est mesuré séparément du moteur, mais ce banc headless n'inclut ni `postMessage`/copie structurée, ni adoption côté navigateur, ni rendu GPU. `SnapshotEncoder` compare actuellement les 62 500 cases et les ressources à chaque publication, car celles-ci peuvent changer en place. Modifier ce contrat demande une preuve séparée ; l'identité du tableau ne suffit pas. Les résultats CPU ci-dessus ne permettent pas de conclure sur les images par seconde ou de promettre 6×.

## Charge commerciale intégrée, mesures finales

L'option `TRADE=1` des deux bancs de recherche ajoute à ENVIRONMENT **100 colons, 100 lièvres et deux visiteurs**, sans répéter les mesures à 3 et 30 acteurs. Le second chercheur du premier groupe devient négociateur ; le premier reste chercheur et pompier. Les autres métiers restent présents. Trois mineurs portent les trois armes disponibles. Les visiteurs, leurs chemises, leurs repas privés et leur halte sont des entrées synthétiques déclarées ; le stock fini du marchand vient du producteur normal avec la graine 88. Cette préparation ne mesure ni fréquence d'incident ni arrivée naturelle.

La préparation cherche trois cases libres adjacentes, à au plus 24 cases du point original du négociateur et à plus de six cases des feux initiaux. Elle déplace uniquement ce second chercheur dans l'état synthétique initial ; son ancienne position et sa position préparée sont publiées avec celles des visiteurs. Aucun atelier, travail, autre acteur ou stock n'est retiré. Le premier essai avait supposé une place sûre autour de son point initial : il a échoué avant toute mesure, car le groupe dense et les feux voisins excluaient les quatre cases. Une cellule déjà dans le foyer conserve cette protection sans répéter une désignation vide.

Un achat réel de médicament et ses transitions de contact sont exécutés avant la mesure, sans avancer la simulation. Les totaux de chaque objet doivent être exactement conservés par cet échange. Un nouvel ordre maintient le contact pendant les 650 ticks mesurés : aucune transaction, actualisation de devis ou observation du pilote n'est ajoutée dans cette boucle. Les contrôles finaux conservent tous les oracles ENVIRONMENT sur la population coloniale initiale, puis vérifient la présence des visiteurs, le contact, le registre, la monnaie, les médicaments, le stock marchand et les identités des armes. Les visiteurs ajoutés ne sont pas traités comme de nouveaux cultivateurs par les anciens contrôles fondés sur l'indice des colons.

Exécution centrale successive avec `ENVIRONMENT=1 TRADE=1 VALIDATION_VERSION=v88` : `node --experimental-strip-types scripts/research-bench.ts`, puis `node --experimental-strip-types scripts/research-render-bench.mjs`, serveur et sources figés. Les rapports du 20 septembre 2026 sont conservés : [CPU, 20:59:06 UTC](../../artifacts/trade-cpu-v88.json) et [natif, 21:02:57 UTC](../../artifacts/trade-render-v88.json). Les images `trade-initial-v88-100.png`, `trade-load-v88-100.png` et `trade-stations-v88-100.png` accompagnent le second rapport. Ces passages portent sur 100 colons, 100 lièvres et deux visiteurs ; ils ne remplacent pas les huit comparaisons pures ci-dessus.

Matériel CPU : **AMD Ryzen 5 3600**, Windows `10.0.26200`, Node `24.11.1`. Le natif utilise Chromium WebGPU, un adaptateur **AMD RDNA 1** (modèle précis absent du rapport) et une fenêtre de **1 440 × 1 000** pixels. La caméra orthographique est fixe avant l'échauffement et pendant la mesure ; les 102 centres des personnages restent dans la zone visible utile, avec ateliers et végétation conservés. Les vues rapprochées finales sont hors mesure. Une seule passe de chaque banc est publiée, sans autre campagne lourde Lisière simultanée ; l'activité des autres applications n'est pas contrôlée.

Le CPU amorce le moteur avec 100 ticks d'une autre fixture de 100 colons, puis mesure 650 pas et 130 encodages indépendants. La ligne sans les vingt premiers pas reste un diagnostic secondaire : la ligne complète conserve le démarrage et ses pics. Il n'y a ici ni worker, ni copie `postMessage`, ni rendu.

| Mesure CPU | Échantillons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|---:|
| `stepWorld`, tous les pas | 650 | 46,86 ms | 89,44 ms | 106,21 ms | 144,34 ms |
| `stepWorld`, après les vingt premiers pas | 630 | 45,88 ms | 81,93 ms | 101,91 ms | 142,41 ms |
| Encodage des snapshots | 130 | 9,18 ms | 14,20 ms | 17,82 ms | 18,52 ms |

Le natif conserve 90 images d'échauffement, puis demande **6×**, soit 36 ticks/s pour une cadence normale de six ticks/s. L'arrêt par observation du worker dépasse légèrement la cible de 650 ticks : **658 ticks réels en 41 541,9418 ms**, soit **15,83941365 ticks/s et 2,639902275×**. Le débit 6× n'est donc pas tenu. Ce calcul utilise les ticks effectivement observés ; il ne remplace pas 658 par la cible théorique de 650.

| Mesure native | Échantillons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|---:|
| Intervalle entre images | 2 830 | 8,50 ms | 41,60 ms | 54,20 ms | 120,90 ms |
| Temps CPU de l'image | 2 831 | 7,60 ms | 23,20 ms | 42,10 ms | 122,40 ms |
| Pas du worker, moyenne par lot publié | 602 | 47,65 ms | 92,90 ms | 123,44 ms | 149,40 ms |
| Adoption d'un snapshot | 602 | 0,10 ms | 20,20 ms | 24,60 ms | 31,90 ms |

Les valeurs du worker sont des **moyennes de lot**, pas des mesures indépendantes de chaque tick. L'intervalle entre images inclut l'attente et l'ordonnancement ; le temps CPU d'image ne mesure pas le temps GPU. Encodage headless et adoption navigateur décrivent deux frontières différentes. Les distributions et leurs percentiles ne s'additionnent pas pour reconstruire un temps total. Le rendu compte 80 appels graphiques médians, 83 au p95 et 84 au maximum ; aucun pipeline supplémentaire n'est enregistré et la géométrie résidente des personnages garde son identité pendant la fenêtre.

Les deux passages conservent les contrôles métier : visiteurs présents et neutres, contact réel maintenu, un achat préparatoire, monnaie/médicament/stock marchand et armes conservés. Le négociateur est préparé en `(121,105)` depuis `(120,109)` ; les visiteurs sont en `(122,105)` et `(122,106)`. Les ouvrages ENERGY restent tous présents, les quatre pièces chauffées atteignent 30 °C au-dessus de leur température initiale et de l'extérieur, les neuf feux initiaux ont disparu, douze extinctions physiques sont enregistrées, et les neuf piles de bois gardent chacune leurs vingt unités et leur identité. Des dommages partiels de 2 à 9 PV subsistent sur ces piles. Le natif rapporte zéro erreur de console, de validation et de résultat métier.

Cette charge commerciale V88 diffère du banc ENVIRONMENT V87 et de ses conditions historiques. Ses temps ne permettent donc **aucune attribution causale de gain ou de régression entre ces deux charges**. Seules les copies figées à états identiques des comparatifs précédents isolent l'optimisation de navigation/agriculture. Les pics et la limitation à environ 2,64× restent des contraintes présentes, sans promesse de fluidité parfaite ni de débit 6×.
