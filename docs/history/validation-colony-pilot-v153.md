# Validation du pilote de colonie V153

Cette consolidation corrige les attentes historiques de [`colony-player.test.ts`](../../tests/colony-player.test.ts). Elle ne livre aucune mécanique de jeu. Les trois graines utilisent une carte 250 × 250, les vraies commandes du joueur, les transitions de simulation, des contrôles périodiques de conservation et des reprises de sauvegarde.

## Écarts diagnostiqués et oracles conservés

| Observation physique | Contrôle du pilote réparé |
| --- | --- |
| Les mondes générés contiennent déjà 1 021, 1 157 et 1 096 fragments naturels (graines 42, 93 et 2048). Quatre cases de réserve ne peuvent contenir tous les fragments de la carte. | Les IDs présents à la génération sont distingués des fragments créés ensuite. Les quatre cases doivent contenir des nouveaux fragments encore présents ; tout surplus nouveau reste au sol avec une demande de transport. |
| Une bagarre sociale réciproque blesse Noé et Mina sur la graine 93 ; `social-relax` s'ajoute aux loisirs déjà observés. | Une nouvelle lésion n'est admise qu'au tick d'une frappe de mêlée réussie vers le blessé, avec deux ordres sociaux réciproques. Blessure par balle, brûlure, plaie sans cette provenance, mort et partie manquante restent interdites. Les trois loisirs (`horseshoes`, `skygaze`, `social-relax`) sont exigés. |
| Ada nourrit deux fois au lit des colons blessés. Le premier repas faisait baisser le stock d'une unité sans entrer dans l'ancien compteur d'ingestion autonome. | Le repas assisté est compté une seule fois lorsque la tâche physique arrive à son dernier tick et que l'événement confirmé du même tick nomme patient, quantité et médecin. Le contrôle de conservation alimentaire reste exact. |
| Au tick 20 721, l'intoxication du repas assisté ajoute de la douleur aux contusions soignées et met temporairement Noé à terre. Sans l'intoxication, le même dossier médical est `mobile` (douleur 0,2846325 contre 0,6846325 avec elle). | Une chute n'est admise que si toutes les blessures sont d'origine sociale et que l'intoxication active est la cause différentielle de l'incapacité. À la fin, chaque colon ainsi tombé doit être vivant, médicalement mobile, sans partie manquante, et l'épisode causal identifié par `bornAt` doit être terminé. Une nouvelle intoxication indépendante ne remplace pas cet épisode. |
| Les soins ont consommé quatre médicaments : 26 restent, tous rangés. Une récolte sauvage commencée et un abattage restent en file au dernier minuit ; le repos médical au lit réduit les ticks de sommeil ordinaire de Noé à 3 991. | Stock final = stock initial de 30 moins les traitements avec médicament confirmés ; les politiques `industrial` et la mise en réserve sont conservées. Seuls `harvest` et `chop` peuvent attendre à ce checkpoint, et leurs IDs doivent disparaître sans nouvel ordre (1 558 ticks depuis le checkpoint). Le sommeil réel reste positif pour chacun et sommeil + repos médical physique au lit dépasse 4 000 ticks. |

## Exécutions sur le diff final

| Commande ciblée | Résultat | Journal local |
| --- | --- | --- |
| `npm run test -- --run tests/colony-player.test.ts -t 'graine 93'` | **1 passé, 2 exclus**, 111,14 s. | `tmp/colony-player-v153-continuity-93-r6.log` |
| `npm run test -- --run tests/colony-player.test.ts -t 'graine (42\|2048)'` | **2 passés, 1 exclu**, 253,82 s. | `tmp/colony-player-v153-continuity-42-2048-r7.log` |
| `npm run typecheck`, `git diff --check -- tests/colony-player.test.ts` | Réussis avant les deux exécutions ciblées. | Sortie de session. |

Les sorties de simulation et les checkpoints de diagnostic restent sous `tmp/`. Les premières exécutions r3/r4 ont servi à localiser les oracles historiques ; r2/r5 ont été interrompues pour éviter des campagnes concurrentes ou inutiles. Les résultats r6 et r7 couvrent ensemble les trois graines sur le même pilote final. Ce parcours teste la correction et la continuité de la colonie ; ses durées ne constituent ni un profil CPU comparatif ni une mesure de FPS/GPU.
