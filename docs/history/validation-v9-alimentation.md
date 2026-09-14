# Validation historique — V9 et reclassement documentaire

## V9 — Dégagement agricole et choix alimentaire (14 septembre 2026)

[Règles et sources revérifiées](../research/food-clearing-reference.md), [contrat agricole](../development/farming.md). Le [lot initial](../../artifacts/core-food-clearing.json) passe 22/23 scénarios et révèle le conflit entre préférences alimentaires et arrêt de recherche au premier aliment proche. La [reprise ciblée](../../artifacts/core-food-clearing-followup.json) passe 6/6, dont les colonies naturelles sur trois graines, cinq à huit jours, avec conservation et continuation exacte. Après optimisation du planner, [19/19 scénarios concernés](../../artifacts/core-clearing-optimized.json) passent. Après ciblage des livraisons, le [dernier lot de contrats](../../artifacts/core-clearing-final.json) passe 20/20 : repas, agriculture, transport, interruptions, sauvegardes et déplacements. Ces lots se recouvrent ; leurs nombres ne s’additionnent pas en couverture indépendante.

L’[oracle indépendant de sélection](../../artifacts/food-choice-oracle.json) passe sur 120 cartes avec obstacles : classement calculé séparément et routes comparées à une recherche complète. Les nouveaux cas vérifient notamment les aliments préférés inaccessibles, les égalités de score, le portage de riz interrompu pour manger des baies, le dégagement avec Transport désactivé, plusieurs types de piles, le dépôt impossible, les changements de priorité et les sauvegardes corrompues. Les autres systèmes ne sont pas réputés exhaustivement testés.

### Petit audit CPU pendant le chantier

Commande reproductible : `node --experimental-strip-types scripts/clearing-bench.ts`. Ryzen 5 3600, Node 24.11.1, carte naturelle 250² graine 42 avec clairière de fixture ; 3 ou 30 cultivateurs, quatre cases par colon, sans réserve ni transport ordinaire. Une passe d’échauffement puis trois passes de 700 ticks, génération/validation hors mesure, aucun autre test/benchmark lancé en concurrence. Le scénario dure moins d’un jour ; faim et repos restent actifs. Les cultures atteignent 12/12 et 120/120 cases avec conservation exacte du bois.

| Colons, état initial du champ | p95 avant → final (ms/tick) | p99 avant → final | maximum avant → final |
|---|---:|---:|---:|
| 3, libre | 0,016 → 0,030 | 3,21 → 3,96 | 72,19 → 43,68 |
| 3, quatre piles gênantes par colon | 0,027 → 0,067 | 48,64 → 5,33 | 82,51 → 13,41 |
| 30, libre | 0,166 → 0,288 | 178,39 → 34,82 | 218,14 → 506,05 |
| 30, quatre piles gênantes par colon | 138,65 → 10,87 | 178,07 → 73,79 | 221,39 → 334,69 |

[Avant](../../artifacts/clearing-bench-before.json), [planner ciblé seul](../../artifacts/clearing-bench-planning.json), [planner et trajets ciblés](../../artifacts/clearing-bench.json). L’audit a identifié les recherches complètes répétées lors du choix de travail, puis encore lors des livraisons. Les recherches ciblées conservent l’algorithme, les modes d’arrivée et les replis ; elles évitent de parcourir inutilement le reste de la carte.

**Limite mesurée :** les percentiles s’améliorent dans le stress obstrué, mais ses maxima restent élevés et variables ; la cause des derniers pics n’est pas isolée. Ne pas les présenter comme résolus, ni supposer qu’ils viennent tous du GC. Le nombre de ticks presque inactifs explique les p95 très faibles du petit scénario. Ce sont des coûts de simulation CPU, pas des temps de frame GPU ni une promesse de fluidité parfaite. Les allocations et replis de navigation à trente acteurs sont à profiler lors du prochain audit G0.

Build TypeScript/Vite validé : worker 79,98 kB, bundle jeu 1 013,54 kB (gzip 281,65 kB). L’avertissement de chunk supérieur à 500 kB reste connu. Le [premier lot navigateur](../../artifacts/ui-food-clearing.json) passe les trois parcours courts (transport matériel, frontières de commandes/sauvegardes, cultures obstruées) ; la partie longue atteint sa limite de 480 secondes. Son dernier état extrait au tick 13 093 poursuit 6 000 ticks en 104,67 ms dans le noyau seul, sans invariant violé ([rejeu](../../artifacts/stalled-journey-replay.json)). Cela n’isole pas la cause du blocage navigateur.

Après réduction des traces et polling du tick sans copie de carte, la [reprise du seul parcours long](../../artifacts/ui-clearing-journey-retry.json) passe en 331,1 secondes sur Chromium WebGPU matériel : [trois jours par la vraie interface](../../artifacts/colony-clearing-three-days.json), trois lits utilisés, vingt repas consommés, trois lits/table/trois tabourets/six murs construits, riz semé, nourriture encore disponible, conservation du bois et bilan alimentaire réconcilié, zéro erreur console observée. Capture finale inspectée : camp, culture, dormeur, interface et FPS visibles. Les états intermédiaires volumineux restent dans `tmp/clearing-journey-checkpoints`, hors Git ; le rapport conserve ticks, tailles et empreintes SHA-256. Aucun état ni jour de jeu n’a été retiré des assertions. Le premier échec reste archivé ; une réussite ne prouve ni son origine ni une fluidité universelle.


## Réorganisation documentaire — 14 septembre 2026

Index unique, contrats courants de simulation/alimentation remis à jour, ROADMAP condensée autour de G0–G5, ADR regroupées et anciennes preuves déplacées dans history. Les trois originaux sont reclassés dans reference/originals ; SHA-256 et tailles sont identiques avant/après déplacement. Les anciens fragments d’architecture restent utilisables. Le vérificateur portable `scripts/check-docs.py` contrôle liens/fragments, les 25 domaines, les cinq familles et les empreintes des originaux. Aucun code de gameplay changé, donc aucune relance de la colonie pour ce lot documentaire.

## Historique des preuves

- [v8-cultures](validation-v8-cultures.md)
- [v6-v7-presentation](validation-v6-v7-presentation.md)
- [v3-v5-besoins](validation-v3-v5-besoins.md)
- [g0-fondations](validation-g0-fondations.md)
