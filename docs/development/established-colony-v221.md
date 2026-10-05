# V221 — Les Aulnes, une colonie à reprendre

Schéma198 inchangé. La demande du5octobre autorise la reprise après les tests utilisateur et une sauvegarde donnant l'impression d'arriver en pleine partie. Ce lot rassemble les systèmes actuels dans un quotidien jouable ; ses incidents éventuels ont priorité sur l'ajout d'une mécanique isolée.

La carte naturelle64×64 conserve sa périphérie. Sept adultes, chambres, réfectoire, cuisine et froid, ateliers, soins, recherche, réserves, cultures, élevage et défense forment un village compact. Les stocks sont finis, les priorités respectent les incapacités, les factures ont des limites. Les deux tourelles autorisent le feu. Quelques travaux restent ouverts.

Le [préparateur](../../src/sim/established-colony-scenario.ts) crée cet état initial au tick0 : terrain aménagé localement, habitants supplémentaires nouveaux, liens présents, constructions, biens et connaissances sont préparés. Ensuite le [générateur](../../scripts/create-established-colony-v221-test-save.ts) avance exclusivement le moteur ordinaire. Aucun saut d'horloge, guérison, résultat de travail ou souvenir ne doit être injecté dans cette continuation. La provenance distingue l'aménagement de ses conséquences réellement simulées ; une colonie préparée n'est pas présentée comme une campagne entière jouée.

Les contrats existants restent applicables : [passé](colonist-backgrounds-v210.md), [proches](family-v214.md), [tourelle](mini-turret-v212.md), [globe](planet-group-v216.md), [cuisine](packaged-survival-v206.md), [soins](hospital-bed-v205.md), [télévision](television-v208.md), [réserves et économie](colony-economy.md). Leurs recherches primaires sont réutilisées ; aucune nouvelle règle Core n'est revendiquée.

La publication ajoute une entrée au catalogue commun, avec empreinte du JSON décodé et provenance explicite. Les59 anciennes entrées et leurs payloads conservent leurs octets. Aucun constructeur de scénario n'entre dans le bundle du jeu. Les preuves requises sont la validation stricte, le transport, la reprise déterministe, un quotidien réellement joué et un parcours natif avec sauvegarde/rechargement dans les deux vues. Les résultats et limites sont consignés dans [la preuve V221](../history/validation-established-colony-v221.md).

Cette scène facilite les essais d'intégration ; elle ne démontre pas une économie annuelle équilibrée, une campagne naturelle depuis l'atterrissage, la parité RimWorld exhaustive ou les performances d'une colonie de cent habitants.
