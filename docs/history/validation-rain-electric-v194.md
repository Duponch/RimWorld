# Validation V194 — appareils exposés aux précipitations

3 octobre 2026, schéma **181**, base `8fd6500` (V193, 180). [Contrat](../development/rain-electric-v194.md), [recherche Core](../research/rain-electric-core-v194.md). La comparaison avec les [mécanoïdes](../research/mechanoid-core-next.md) a retenu un danger environnemental borné. Le ticket Zzztt, la vidange de réseau et l'explosion Bomb restent différés. Aucun son électrique dédié n'est livré.

## Recherche, implémentation et corrections

XML/IL de Core 1.6.4871 rev590 et recoupements Internet distinguent exposition aux précipitations et incident aléatoire. Cadence 97 Core, deux chances, sélection unique, toit à l'ancre, trader réellement allumé et batterie strictement au-dessus de 100 Wd ; le contact Flame 1,9 réutilise la résolution locale immédiate V87. Le PRNG privé et l'échantillonnage de météo/alimentation au tick local sont des adaptations documentées.

L'audit des catégories a détecté l'atelier de couture électrique absent des connecteurs et appareils actionnables, malgré son statut de consommateur. Son raccordement et son arrêt physique sont corrigés. Les gardes historiques refusent ses champs/ordres futurs en 180 ; migration sans alimentation offerte. Les 43 anciennes scènes publiques n'en contiennent aucun.

Le premier parcours préparé a réussi les transitions métier puis échoué sur **77→78 pipelines**. Le premier tracé de toiture créait tardivement son aperçu de zone. Le correctif résident prépare ce matériau dans les deux projections et conserve les nœuds/attributs lors de croissance ; le parcours final vérifie aussi cette croissance puis Escape et un pointerup tardif, sans modifier le World. L'échec initial est conservé sous `tmp/`, sans être présenté comme un succès.

## Contrôles ciblés

**95/95 tests uniques dans 18 fichiers finaux réussis**, par composition : premier groupe 73 tests/13 fichiers (68 réussis, cinq échecs), reprise 68/68 dans onze fichiers, aperçu résident 2/2. Sept fichiers et 48 tests communs sont comptés une seule fois ; les reprises remplacent les résultats échoués. Typage et build finaux passent, avec l'avertissement Vite existant sur les gros chunks.

Deux échecs du nouveau helper manquaient la recherche de vêtements autorisant l'atelier électrique ; la fixture a été corrigée, sans modifier l'admission de production. Les trois autres échecs provenaient de copies historiques de pannes, feu et toiture contenant des politiques alimentaires/vêtements futurs. Les helpers historiques existants retirent ces seuls champs futurs ; assertions métier et fichiers historiques restent conservés.

Cadence et PRNG, frontière entière proche de `MAX_SAFE_INTEGER`, sélection sans nouveau tirage, neuf catégories, seuil 100/100,5 Wd, toiture à l'ancre, emballage, pertes et propriétaires sont exercés. Adoption prospective, tick nul, strict 180→181 neutre, futur/corruption, reprise exacte, bridge au même tick et refus atomique sont couverts. Couture électrique : alimentation/démarrage, arrêt au contact et migration ancienne sans raccordement immédiat.

Les journaux sont `tmp/v194-targeted-core.{json,log}`, `tmp/v194-targeted-repair.{json,log}`, `tmp/v194-preview.{json,log}`, `tmp/v194-typecheck.log` et `tmp/v194-build.log`. Régression exhaustive et campagnes naturelles longues **non exécutées** pour ce lot.

## Colonie publique et navigateur natif

44e entrée : `public/test-saves/v194/pluie-et-appareils.json`, SHA-256 **8789f8c32d8c867ddac6e6da7ff1aff610a29ca550992b2080fc958f1d5040b2**. Scène préparée 32², trois colons, tick zéro, pluie et ressources de réparation physiques ; aucune adoption électrique, décharge, flamme, blessure, tâche ou progression précréditée. Le choix de graine stabilise une occasion future, sans simuler un événement passé.

Chromium matériel **1/1**, version 153.0.8010.12, adaptateur AMD RDNA-1, sans SwiftShader/logiciel déclaré. Vrai menu des 44 colonies, worker et commandes UI ; code d'observation uniquement. Préparation et reprise tick 0 ; décharge Core 97 au tick 10, trois allumages et dégâts ; extinction au contact tick 20 ; toit construit, interrupteur actionné, réparations achevées et trois feux éteints au tick 159. Reprises exactes après préparation, décharge, demande d'arrêt, travail d'extinction et récupération. Inspection et captures dans les deux caméras, zéro erreur JS/GPU observée et compteur FPS visible.

**78→78 pipelines**, depuis la préparation, y compris aperçu 81 cellules, capacité 16→128, annulation et toutes les transitions. Géométrie des colons 544 et trois instances, géométrie du feu 104 et capacité 32 restent stables. Le compte graphique du feu vide vaut un à cause du placeholder de préparation ; le World vide n'a aucun feu. Les allocations cumulées observées passent de 513 buffers/2 692 928 octets à 532/2 713 768 ; elles ne sont ni usage VRAM vivant ni preuve d'absence de fuite. Pas de temps GPU isolé, coût nul ou gain FPS annoncé. Résultat/captures sous `tmp/test-runs/rain-electric-v194-native/`.

## CPU isolé et portée

Quatre branches de `advanceRainElectrical`, 250² préparée vide, trois acteurs ; Node 24.11.1/V8 13.6, Windows 10.0.26300 x64, Ryzen 5 3600, 16 Gio. Par branche : 25 échauffements puis 500 échantillons, préparation/restauration/validation hors mesure, sources gelées. World hors état du risque, horloge et PRNG sont comparés exactement.

| Branche | p50 ms | p95 ms |
| --- | ---: | ---: |
| Aucune frontière 97, 2 000 batteries | 0,0005 | 0,0009 |
| Premier jet refusé, 2 000 batteries | 0,0007 | 0,0017 |
| Premier jet admis, 100 batteries | 0,0057 | 0,0194 |
| Premier jet admis, 2 000 batteries | 0,0372 | 0,0544 |

Les batteries sont à **80 Wd**, donc sélectionnables mais inadmissibles ; le nom interne `emptyEligibleBatteries` ne décrit pas leur état. Ce banc mesure collecte, sélection et refus, **aucune décharge/Flame, réseau, tick complet, worker ou GPU**. Aucun comparateur A/B ni gain général établi. Le banc précède le correctif de renderer ; les sources sim/bridge mesurées sont inchangées, pas son empreinte globale de présentation. Résultats : `tmp/v194/rain-electric-cpu.{mjs,json}`. CPU, navigateur natif et présentation ont été exécutés successivement.

## Présentation et références conservées

`npm run test:presentation` passe sur les chemins minage et abattage 250² : p95 RAF **8,4 / 8,3 ms**, zéro saut, excès de trajet continu ou occupation solide. Ces relevés ne sont pas un comparateur causal ni un débit global. Journal `tmp/v194-presentation.log`, artifacts du run `rain-electric-v194-presentation`.

Les **44/44** payloads publics passent empreinte SHA-256, admission stricte/migration vers 181 et sérialisation/reprise exacte, sans réécriture des 43 références antérieures. Script et résultats sous `tmp/v194/catalogue-check.{mjs,json}`, journal `tmp/v194-catalogue.log`. Archive des instructions, documents utilisateur originaux et données hors projet restent inchangés. Le contrôle des liens et en-têtes accompagne la finalisation documentaire ; il ne remplace aucune preuve métier.
