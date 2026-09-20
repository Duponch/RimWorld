# Coût des pièces et charge environnementale — V87

Mesures du 20 septembre 2026. La réduction du coût CPU porte sur la détection des changements dans `RoomTopologyCache`. Elle ne change ni le calcul des pièces, ni les règles de déplacement ou de température. Les mesures de charge complète V87 ci-dessous sont distinctes de cette comparaison isolée.

## Comparaison isolée

Deux copies figées du commit V86 `65fa08c9daf5859bb63410a7eae8aca6de8d9a20` ont été créées sous `tmp/performance-v87` : témoin sans changement et candidat ne modifiant que `room-topology.ts`. Même charge synthétique : cent colons, cent lièvres, dix prisonniers, cultures, ateliers, soins, réseau et réfrigération. AMD Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1 ; 50 lectures de chauffe, 500 lectures statiques, puis 200 ticks réels avec instrumentation des lectures de pièce. Pas de navigateur mesuré en parallèle. L’activité du reste du poste n’est pas contrôlée.

| Passage | 500 lectures statiques (ms) | Lectures dans 200 ticks | Temps des lectures (ms) | Temps total 200 ticks (ms) | Tick p95 (ms) | Maximum (ms) |
|---|---:|---:|---:|---:|---:|---:|
| Témoin A |246,57|4674|3321,64|14803,34|136,00|201,94|
| Candidat A |101,75|4674|2746,37|13528,60|101,68|142,94|
| Candidat B |118,27|4674|3514,20|17377,76|141,23|246,89|
| Témoin B |143,54|4674|3726,21|17231,62|143,95|218,48|

[Données des quatre passages](../../artifacts/room-cache-cpu-v87.json). Le coût des lectures baisse dans les deux ordres de passage. Le temps total s’améliore dans la première paire et reste légèrement plus élevé dans la seconde : **aucun gain global garanti ni débit 6× acquis n’est déduit de ces quatre passages**. Les échantillons restent courts et sensibles à la charge du poste.

Les quatre états initiaux complets ont le même SHA-256 `070fb20f06511d61d761b02d66c23a6ae84d0ac7a69f159ba7373658ea209381`. Les quatre états finaux complets ont le même SHA-256 `82807facc804ddfae4c9b5e0628cd528fa93d203f3d9972827921dd82e99a2dc`, sans erreur de validation. Les besoins, tirages, trajets, tâches et réservations restent donc identiques sur ces parcours ; ce constat n’est pas une preuve universelle de tous les mondes.

## Modification retenue

Les captures séparées des roches naturelles et des barrières évitent de réécrire puis comparer un masque dense combiné à chaque lecture inchangée. Chaque lecture continue de vérifier les valeurs réelles des tuiles et structures, y compris leurs mutations en place au même tick. Si une modification des entrées conserve le même masque final, la topologie précédente reste utilisable. Le parcours de composantes n’a pas changé. Les captures retournées antérieurement restent immuables.

Le contrôle existant `room-topology.test.ts` compare les composantes à un oracle indépendant, inclut des cartes rectangulaires aléatoires, les modifications en place, les remplacements, les ouvertures/fermetures et la conservation des anciennes captures. Il fait partie de la campagne commune V87.

Les outils temporaires utilisent `node:module.registerHooks` uniquement pour résoudre les imports TypeScript relatifs des copies figées ; [documentation officielle Node 24](https://nodejs.org/download/release/v24.0.1/docs/api/module.html#moduleregisterhooksoptions). Aucun chargeur ni dépendance supplémentaire n’entre dans le jeu.

## Présentation

Les pales d’éoliennes utilisent un lot résident avec angles intégrés sur GPU. Les changements de puissance actualisent leurs segments de rotation sans reconstruire les matériaux. Les flammes au sol partagent un lot ; celles des acteurs réutilisent les attributs de trajectoire du corps. Le feuillage des buissons se retire/revient par indices sans reconstruction des chunks. Les nouveaux lots sont préparés au chargement avant la première interaction. Aucun nouveau pipeline ni remplacement du buffer de personnages n'est observé pendant les trois mesures natives ci-dessous ; cela ne supprime pas les pointes de durée d'image.

## Charge mixte finale

Même processeur et OS que ci-dessus, Node 24.11.1 pour la mesure CPU. Chromium natif/WebGPU, adaptateur AMD RDNA-1, fenêtre 1440×1000 ; caméra orthographique fixée avant les 90 images de chauffe, végétation conservée, vue distante active à trente et cent. CPU, navigateur et parcours longs exécutés successivement. Une seule passe par effectif, au moins 650 ticks mesurés, pas d'export du monde pendant la fenêtre graphique.

La charge ENVIRONMENT garde recherche, minage, cultures, cuisine électrique, boucherie et faune du banc ENERGY. Elle ajoute 1/1/4 ensembles éolienne/batterie/pièce chauffée, un climat explicite et 3/9/9 feux préparés. Le Foyer protège l'enveloppe des ateliers et leurs accès. Les objets, charges et feux sont une préparation de mesure, pas une colonie naturellement obtenue. Tous les ateliers initiaux et les piles brûlées de vingt bois sont conservés, les feux sont éteints et les pièces atteignent leur consigne préparée de 30 °C. Les corrections de préparation et leurs échecs sont conservés dans les [preuves V87](../history/validation-environment-v87.md).

| Colons + lièvres | CPU tick p95 / max, ms | Image p95 / max, ms | Moyenne de tick des lots worker p95, ms | Adoption snapshot p95, ms | Débit observé / 6× demandé |
|---:|---:|---:|---:|---:|---:|
| 3 + 3 | 8,93 / 57,56 | 37,50 / 150,00 | 13,00 | 5,80 | 5,77× |
| 30 + 30 | 30,97 / 113,81 | 20,90 / 141,70 | 38,68 | 5,50 | 5,24× |
| 100 + 100 | 114,79 / 291,89 | 45,80 / 137,50 | 117,50 | 20,80 | 2,05× |

[CPU brut](../../artifacts/environment-cpu-v87.json), [worker et rendu natifs](../../artifacts/environment-render-v87.json). Débit calculé à partir des ticks réellement présentés, du temps réel mesuré et des six ticks/seconde de la vitesse normale. Les échantillons worker sont des moyennes de lots publiés, pas des mesures indépendantes de chaque tick. Aucune erreur navigateur, validation ou résultat métier ; caméras fixes et buffers stables. Les captures de charge et d'ateliers ont été inspectées hors mesure.

**Le débit 6× n'est pas tenu, et la grande colonie reste coûteuse.** Cette charge ajoute climat, feux et nouveaux appareils ; elle ne permet pas d'attribuer un gain ou une régression par rapport au chiffre 3,76× d'un ancien banc différent. L'optimisation isolée prouve une baisse du coût de lecture des pièces, pas une accélération globale garantie. Le coût du moteur et l'adoption des snapshots restent à profiler avec les prochains ensembles de gameplay.

## Durée des pilotes

Le pilote saisonnier s'exécute sans rendu et sans attendre le temps réel. La dernière reprise J88→J136,073 prend 1 630,684 s pour environ 48,073 jours, soit environ 29,5 fois la durée de jeu normale. Ce rapport comprend le pilote et ses contrôles ; aucune ventilation moteur/oracles/observations n'a encore été mesurée. Un cycle annuel n'est pas obligatoire pour les futurs lots : sa durée répond ici au changement de saisons. La procédure de [validation](../development/testing.md) exige des optimisations mesurées, des contrôles adaptés et l'équivalence des règles, sans croissance ni événements artificiellement accélérés.
