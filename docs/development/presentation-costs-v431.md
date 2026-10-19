# V431 — index visuels et coûts de présentation

Lot de performances, sans nouvelle mécanique. Schéma 263 inchangé, mêmes sauvegardes, qualité graphique et règles de continuation. Demande humaine : poursuivre en autonomie, privilégier les coûts dominants et publier les gains qualifiés ; viser 200 FPS même en rotation sans présenter une moyenne comme une garantie de stabilité. **Périmètre retenu : projection/index visuels, matrices et invalidations HUD. Les optimisations de simulation sont différées après les comparaisons en jeu ci-dessous.**

## Coûts isolés et changements

Le point de départ est V430 publié (`70282ec6`, reçu `06534391`). Douze profils MAIN et trois profils Node de simulation sont conservés sous `tmp/performance-v431`. Ils utilisent les durées de chaque échantillon ; les coûts inclusifs se recouvrent et ne sont pas additionnés. Aucun FPS sous profilage n'est employé comme preuve de gain.

Sur le départ neuf en rotation ×6, le profil MAIN attribue environ 417 ms à l'index des ressources, 362 ms à la partition des cultures et 342 ms au lecteur de changements, ce dernier recouvrant les précédents. Le rendu reste coûteux : ombres, commandes Three et pièce d'arrière-plan. Le profil de simulation relève notamment les grilles de navigation de la faune et les lectures répétées des propriétés du terrain.

- Un journal privé distinct décrit les vrais ajouts, retraits et upserts de ressources ; les seuls tuples de croissance n'invalident plus la position et la classification. Publication après adoption complète seulement, WeakMap indépendante, 64 arêtes et budget numérique borné. Le journal public complet conserve tous les changements de croissance. Copies inconnues, ordre explicite, trous, refus et éviction gardent un repli exhaustif.
- Les cultures conservent leur appartenance mais reprennent les références exactes du World courant, y compris croissance et maladie. L'index spatial résout aussi les valeurs actuelles à leur ordinal courant.
- Le terrain lit sa propre liste de changements sans construire celle des ressources. Les compositions identiques sont réutilisées pour les mêmes bornes, avec invalidation à chaque append/reset ; aucun World n'est retenu dans le cache.
- Les matrices de la scène de jeu sont préparées une fois pour le dessin principal et ses ombres imbriquées ; le mode automatique est rétabli même en cas d'exception. Les écritures DOM qui répètent exactement une valeur ne déclenchent plus une nouvelle mesure du placement du survol.

Deux autres changements ont été implémentés, contrôlés puis **retirés du lot produit** : compilation des faits de navigabilité immuables et capture des grilles après les gardes d'éligibilité des ruches. Ils restent conservés dans `tmp/performance-v431/deferred-navigation`, avec manifestes de restauration et contrôles. Leurs gains Node ci-dessous ne sont pas attribués à la version publiée.

Le cache d'ombres V425 et la rétention détaillée forcée V428 ne sont pas réintroduits : leurs limites de couverture et d'ordre de dessin étaient déjà démontrées. Le simple tri de la pièce représente moins de 0,04 ms par image dans ces profils ; ce n'est pas la priorité de ce lot.

## Qualification et incidents conservés

ROOT exécute successivement les contrôles CPU et Chrome ; les agents préparent des copies privées. Une suite privée de dix tests a toutefois commencé en parallèle d'un court diagnostic ROOT : son résultat est utilisé uniquement pour la logique, jamais comme mesure de vitesse.

Le profilage MAIN termine Aulnes et Éclaircies ; sur le départ neuf, le démarrage du profileur après reprise décale la fenêtre dense au tick 327, au-delà de la borne 300. La capture reste un diagnostic de coût, pas une comparaison qualifiée ; aucun export final de cette troisième scène n'est crédité. Les comparaisons suivantes n'activent aucun profileur.

Les premiers contrôles révèlent des fixtures obsolètes : saut de tick sans avancer les horloges de détérioration, sol ne supportant pas le plancher préparé, comparaison de la projection locale à la campagne complète. Les préparations sont corrigées et toutes les valeurs transportées restent comparées. Une autre fixture tentait de rendre sans feuilles une culture ordinaire, état refusé par les règles : le test résident emploie désormais la vraie infection de culture, et le contrôle historique des matrices demeure. Aucune validation produit n'est assouplie.

Les 79 cas ciblés de présentation/index/journaux sont acquis par reprises sur onze fichiers (`v431-journal-matrix-hud`, `v431-journal-reprise`, `v431-projection-targeted`, `v431-crop-reprise`). Sept cas de navigation/terrain passent (`v431-terrain-navigation`). Le build de projection passe en 16,482 s. Ce n'est pas une suite complète.

Le premier lancement du contrôle des ruches ne démarre pas (`npx` introuvable dans le lanceur). La reprise par l'entrée Node exécute les cinq nouveaux cas avec succès ; les huit anciens cas de navigation manhunter échouent avant leur mécanique, car la scène préparée V190 passe directement au tick 2000 sans initialiser l'horloge prospective de détérioration. Ce défaut de fixture est distinct du produit. Son constructeur prospectif existant est appelé au début synthétique de la scène, avec le même flux vierge ; les huit cas passent ensuite (`v431-manhunter-fixture-reprise`, 14,860 s), sans modifier l'archive historique ni le validateur. Au total exploratoire : 99 cas acquis par reprises, dont 79 couvrent le lot retenu. Les tests de navigation ajoutés et la réparation de fixture sont différés avec leur implémentation ; aucune suite complète annoncée.

La première comparaison finale (`final01`) échoue sur la garde exigeant d'observer réellement la préparation naturelle : la sonde de prototype importait un module DEV par son URL nue et rapportait zéro. L'identité du module est sensible aux URL de rechargement à chaud ; la cause précise de cette ancienne instance n'est plus récupérable après l'arrêt du serveur. Le relevé n'est pas crédité. La sonde privée instrumente désormais l'instance effectivement construite dans le Worker, sans second import, et conserve la même assertion de coût observé. Aucun fichier produit ni règle n'est modifié par cette réparation. L'essai suivant avait été interrompu ; les captures et journaux sont conservés.

## Première comparaison native

`v431-projection-native` passe les trois parcours en 243,146 s. Chrome natif, RX 5700 XT/Ryzen 5 3600, 2560×1440 DPR1 ; réglage équilibré, ombres 2048/60 Hz, textures, herbe, pièce, diorama et occlusion actifs. Les trois entrées originales de V430 sont réutilisées, caméra large inclinée remise par l'interface à la même pose avant chaque fenêtre (tolérance 1e-4). Rotation erratique réelle au bouton droit ; ×1 puis ×6 dans la même partie. Le départ ×6 traverse effectivement les ticks 264–802 avec répétition de la trajectoire, sans nouvelle importation ni écriture de tick.

Analyse : `tmp/performance-v431/projection-comparison.{json,md}`, sources gelées `projection-source-freeze.json`, captures `projection01`. Référence réutilisée : `tmp/performance-matrix-v430/candidate01` ; il s'agit d'une paire courte par contexte, pas d'une moyenne de campagnes répétées.

| Partie / rotation | V430 FPS → projection V431 | Application moyenne ms | RAF p99 / max ms après |
|---|---:|---:|---:|
| Aulnes ×1 | 183,61 → 198,67 | 5,86 → 5,58 | 25,0 / 33,4 |
| Aulnes ×6 | 165,76 → 166,53 | 6,41 → 6,70 | 29,1 / 37,5 |
| Éclaircies ×1 | 172,41 → 193,96 | 8,15 → 7,63 | 16,6 / 25,0 |
| Éclaircies ×6 | 137,39 → 154,81 | 12,28 → 11,35 | 24,9 / 33,2 |
| Départ ×1 | 196,86 → 211,93 | 4,74 → 4,70 | 12,5 / 16,6 |
| Départ ×6 | 112,33 → 148,69 | 21,64 → 8,26 | 29,2 / 79,2 |

Dans la fenêtre dense du départ, les intervalles supérieurs à 50 ms passent de 15/15,45 s à 1/14,94 s ; sur les ticks communs 300–800, l'application moyenne passe de 21,93 à 8,33 ms. Aulnes ×6 fixe baisse légèrement (200,29→199,06 FPS) ; Éclaircies ×6 fixe garde deux pics au-delà de 50 ms, maximum 125,1 ms. Les trois exports entiers puis recharges exactes sont acquis aux ticks 11109, 2129 et 819, sans remplacer les entrées originales.

## Simulation exploratoire, différée

Le banc Node sans profileur compare 180 vrais `stepWorld` par partie, après le même échauffement et depuis les mêmes entrées originales. Les trois campagnes finales sont sérialisées après validation stricte et comparées intégralement octet pour octet, PRNG inclus. Il s'agit de simulation seule, sans transport ni rendu, et non d'un relevé FPS. Les deux lots navigation paresseuse/lookup sont mesurés ensemble.

| Partie / ticks mesurés | Pas moyen avant → après, ms | p99 avant → après, ms | Maximum avant → après, ms |
|---|---:|---:|---:|
| Aulnes 10763–10943 | 36,67 → 29,86 | 69,33 → 64,21 | 81,95 → 75,19 |
| Éclaircies 1760–1940 | 30,23 → 21,37 | 187,43 → 164,53 | 262,72 → 296,38 |
| Départ 320–500 | 27,83 → 20,53 | 104,11 → 82,97 | 177,83 → 144,48 |

`v431-sim-baseline` et `v431-sim-candidate` passent en 53,124/45,387 s ; détails et états finaux dans `tmp/performance-v431/sim-paired`. Les pointes restent présentes, y compris le maximum Éclaircies moins bon. Le build final passe en 14,900 s.

La première matrice finale (`final02`, `v431-final-native-reprise`) passe en 281,055 s, douze fenêtres et trois exports/recharges stricts aux ticks 11126/2151/835. Les trois vues finales sont inspectées : terrain, végétation, bâtiments, ombres et fond présents. Comparée à la référence de la veille, la rotation ×6 donne Aulnes 165,76→176,58, Éclaircies 137,39→135,76, départ 112,33→107,60 FPS. Le départ conserve pourtant l'économie d'application sur les ticks communs 300–800 (21,93→9,75 ms), et 15→1 intervalle de plus de 50 ms. Éclaircies ×6 fixe baisse à 156,38 FPS (174,39 auparavant) avec trois pics >50 ms. Ces résultats défavorables restent conservés dans `final-comparison.{json,md}` ; ils motivent une paire supplémentaire consécutive avec un témoin V430 courant, sans changement produit entre les essais. Aucun 200 FPS stable n'est établi.

Le contrôle requis `test:presentation` passe (`v431-presentation`, 154,871 s) : minage puis abattage 45 s chacun, changements ×6/×1/×3, aucun saut brut ou confirmé ni occupation solide. Les maxima d'intervalle sont 20,8/25,0 ms dans ces parcours ; cela ne remplace pas les mesures en rotation. Une revue indépendante des journaux BASE/publics, caches et matrices ne relève aucun défaut actionnable ; elle ne prétend pas prouver tous les chemins du rendu.

La paire consécutive `reference03`/`final03` confirme le résultat mixte : rotation ×6 Aulnes 174,32→157,29 FPS, Éclaircies 145,36→132,19 et départ 129,51→135,12. Les deux parcours passent en 277,384/259,345 s, avec leurs exports entiers. Sources V430 extraites de `06534391` dans une copie privée, mêmes dépendances/assets, serveurs successifs ; analyse complète `consecutive-comparison.{json,md}`. Ce sont des fenêtres courtes sur la même machine, pas une preuve statistique que toute variation vient du code.

Le mécanisme de compensation est observable : dans `final02`, les publications ×6 passent de 7,44 à 12,23/s sur Aulnes, de 11,35 à 18,66/s sur Éclaircies, de 14,62 à 17,98/s sur le départ, face à la référence initiale. Chaque fin de lot de simulation déclenche encore préparation naturelle et admission MAIN. L'accélération du Worker augmente donc une partie de la charge commune. Pour privilégier les FPS demandés, les quatre fichiers SIM retrouvent exactement HEAD V430 ; aucune règle, sauvegarde ou travail privé n'est perdu.

Une limitation naïve de publication à 50 ms est écartée par analyse, sans code produit : sur le timer 20 ms, des départs espacés de 60 ms et le jitter de livraison déjà pris en charge épuisent les deux ticks confirmés de réserve en ×6. Un canal léger de confirmation des mouvements, ou un pilotage du flux et de la lecture qualifiés ensemble, est nécessaire ; augmenter simplement la réserve ajouterait de la latence. Ce contre-exemple n'est pas présenté comme un test exécuté.

## Lot retenu et livraison

Les 1749 empreintes de sources du lot retenu sont strictement identiques à celles de `projection01`, avant les essais SIM. La vérification TypeScript passe (`v431-release-typecheck`, 11,810 s). La qualification native finale passe sur les trois parties (`v431-release-native`, 256,501 s), douze fenêtres et trois exports/recharges entiers stricts. Comparaison `reference03`/`release04` dans `release-comparison.{json,md}` ; même matériel, réglages et caméra, sans profileur ni ablation. Les sauvegardes publiques restent byte-exactes.

| Partie / fenêtre | V430 → V431 FPS | Application moyenne ms | RAF p99 / maximum après, ms |
|---|---:|---:|---:|
| Aulnes ×1 fixe | 207,73 → 201,58 | 7,50 → 8,08 | 20,8 / 41,7 |
| Aulnes ×1 rotation | 194,45 → 187,71 | 5,81 → 6,27 | 20,9 / 29,1 |
| Aulnes ×6 fixe | 193,96 → 199,91 | 7,25 → 6,75 | 20,9 / 33,3 |
| Aulnes ×6 rotation | 174,32 → 181,20 | 6,23 → 6,23 | 25,0 / 29,2 |
| Éclaircies ×1 fixe | 213,58 → 219,71 | 8,84 → 8,50 | 16,6 / 20,9 |
| Éclaircies ×1 rotation | 179,52 → 193,82 | 7,52 → 7,44 | 16,6 / 20,9 |
| Éclaircies ×6 fixe | 179,03 → 178,92 | 12,93 → 12,41 | 20,9 / 137,5 |
| Éclaircies ×6 rotation | 145,36 → 149,28 | 12,12 → 11,22 | 20,9 / 33,3 |
| Départ ×1 fixe | 231,99 → 231,95 | 4,86 → 5,12 | 8,3 / 20,9 |
| Départ ×1 rotation | 210,56 → 195,89 | 4,53 → 5,04 | 12,5 / 24,9 |
| Départ ×6 fixe | 178,43 → 178,86 | 10,20 → 5,87 | 20,9 / 54,1 |
| Départ ×6 rotation | 129,51 → 145,86 | 19,50 → 8,47 | 29,2 / 41,7 |

Sur les ticks communs 300–800 du départ, l'application moyenne baisse de 19,60 à 8,63 ms et son maximum de 50,70 à 20,70 ms. La rotation traverse 263–803 puis 264–803 en 14,99/14,96 s ; les quatre intervalles >50 ms du témoin n'apparaissent pas dans cette courte fenêtre candidate. Les gains de FPS ×6 sont environ +3,9 %/+2,7 %/+12,6 % : modestes sur les deux colonies, plus nets sur le départ dense. Le débit effectif ×6 en rotation reste 5,33/5,19/5,98, donc ×6 complet n'est pas établi partout. ×1 demeure mixte, avec les baisses Aulnes et départ conservées dans le tableau ; Éclaircies ×6 fixe garde trois pics >50 ms contre deux, dont un à 137,5 ms. **Ni 200 FPS stables, ni amélioration universelle, ni confort global rétabli ne sont annoncés.**

Les exports candidats entiers sont exacts aux ticks 11116/2129/821, SHA-256 respectifs `069f1a6244c70e7f54f7ee855432973c3273a20acfec0b949df95ce0168e90d9`, `e3694f5c634f9fc57d3e5733c3078503a77d56e316da203edfe64a4336163c03`, `80ff66ec760aac293b97e171a1b26ffac0ce9a446a7b403dd8cbc630b756e492`.

La priorité suivante est de séparer les confirmations légères des mouvements et les projections visuelles coûteuses, avec un producteur qui tient compte du consommateur avant l'encodage. Le journal ordonné des phases, les commandes/ACK, les urgences et SAVE doivent rester indépendants de ce regroupement. Le rendu jeu/ombres reste également coûteux ; ces profils ne mesurent pas un coût GPU par passe et ne démontrent pas qu'un changement de langage suffirait.

Le parcours de présentation est rejoué pour le périmètre exact après retrait SIM : `v431-release-presentation` passe en 154,357 s, sans saut ni occupation solide ; maxima minage/abattage 20,9/29,3 ms. Les trois captures finales `release04/*/final-view.png` sont inspectées. Documentation contrôlée (`v431-docs`, 10,100 s) ; publication du paquet propre à suivre.
