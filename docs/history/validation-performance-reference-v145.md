# Référence de performance V145 — 28 septembre 2026

Ce sous-lot répare les outils de mesure et établit une référence sans modifier le rendu ni la simulation. Le code applicatif mesuré est celui de `898b716` (V144), schéma 144, avant la correction de concurrence entre déblaiement et abattage découverte ensuite dans la consolidation V145. Il ne s’agit pas d’une comparaison avant/après optimisation. Les tests longs, le banc Node puis les trois passages Chromium ont été exécutés successivement, sans modification de sources applicatives pendant les captures.

## Banc CPU remis en état

`npm run bench -- --counts=3,30,100 --samples=3` passe : mondes valides, matière conservée, sérialisation et reprise d’un tick identiques. Les 3/30/100 travaux sont achevés au tick 1 001 et leurs 36/360/1 200 bois rangés. La validation séparée des fixtures inclut aussi 300 colons ; cet effectif n’a pas été chronométré dans cette passe.

La fixture utilise désormais `startingPawn`, des âges neutres et des piles alimentaires admissibles plutôt qu’un objet Pawn incomplet et une pile pouvant contenir 3 000 portions. Le rapport lit `SCHEMA_VERSION` et s’écrit dans `tmp/`. Les résultats ne sont pas directement comparables à l’ancien artefact schema2.

| Colons, carte synthétique 64² | Médiane CPU actif, ms/tick | p95 des moyennes de lots de 20 ticks | Médiane CPU inactif, ms/tick |
| --- | --- | --- | --- |
| 3 | 0,091 | 0,169 | 0,080 |
| 30 | 0,344 | 1,043 | 0,239 |
| 100 | 2,192 | 4,809 | 1,164 |

[Rapport Node conservé](../../artifacts/simulation-reference-v145.json). Trois échantillons, Ryzen 5 3600, Node 24.11.1, Windows. Ce monde préparé sans rendu ne représente pas la charge de la sauvegarde mixte ci-dessous. Le p95 n’est pas celui des ticks individuels.

## Référence navigateur répétée

Banc existant `scripts/performance-audit-v140.mjs`, Chromium 153 natif/WebGPU, adaptateur AMD RDNA‑1, 1 920 × 1 080, DPR 1. Même sauvegarde `public/test-saves/v98/mixed-100.json` : carte 250², 104 personnes, 100 animaux, 266 piles, tick initial 2 000. SHA‑256 du fichier : `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`. Son schéma historique 91 est migré par le jeu.

Deux répétitions sans instrumentation GPU, chacune avec les quatre vues et vitesses 0/6. Chauffe visuelle de trois secondes, mesure de cinq secondes après reprise à la vitesse demandée ; chaque phase recharge le même monde. **La chauffe se fait en pause** : les fenêtres actives incluent les premiers travaux de reprise, pas un débit établi sur une longue campagne. Ombres, cache, nuages, étiquettes, textures, herbe et vent actifs.

| Vue à ×6 demandé | CPU image p95, répétitions A / B (ms) | Tick déclaré par le worker p95 A / B (ms) | Débit atteint A / B |
| --- | --- | --- | --- |
| Iso proche | 22,4 / 23,3 | 101,7 / 90,5 | ×2,05 / ×2,26 |
| Iso large | 20,8 / 20,8 | 71,9 / 77,5 | ×2,91 / ×3,03 |
| Perspective rasante | 28,3 / 22,9 | 78,7 / 81,6 | ×2,97 / ×3,05 |
| Iso étiquettes | 22,3 / 22,8 | 68,2 / 72,9 | ×3,25 / ×3,04 |

En pause, CPU image p95 de 2,2 à 3,3 ms ; RAF moyen de 217 à 238 images/s selon passe/vue. À ×6, RAF moyen de 72 à 99 images/s. Ces moyennes et les queues de distribution décrivent ces seules fenêtres ; elles ne prouvent pas une cadence garantie. A et B sont deux répétitions du **même code**, pas deux révisions.

[Première répétition](../../artifacts/performance-v145-reference-a.json), [seconde répétition](../../artifacts/performance-v145-reference-b.json). Zéro erreur navigateur/GPU relevée dans leurs seize phases. Les rapports séparent aussi adoption/décodage des snapshots et compteurs de dessin ; ceux-ci peuvent omettre les bundles WebGPU conservés.

## Passe GPU distincte et conclusion bornée

Même protocole, deux vues proche/rasante, vitesses 0/6, timestamps activés uniquement pour cette passe. GPU p95 : proche 1,44 ms en pause / 3,74 ms à ×6 ; rasante 1,31 / 4,19 ms. [Rapport GPU](../../artifacts/performance-v145-gpu.json), quatre phases, zéro erreur. Ne pas mélanger les RAF/CPU instrumentés avec les deux répétitions ordinaires.

Le débit ×6 demandé n’est pas atteint dans ces fenêtres de reprise. L’écart entre temps GPU et temps CPU/worker justifie de profiler ensuite simulation, publication et adoption sur cette même charge. Il n’identifie pas encore une fonction fautive et n’attribue pas une régression à un commit, au vent ou à une autre couche visuelle. Les publications de snapshots peuvent échantillonner imparfaitement le coût worker ; aucune somme de p95 ne constitue un temps total. La [recette reproductible](../development/performance-measurement.md) est le point d’entrée pour le prochain audit.
