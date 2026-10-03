# Fuite, continuité et navigation CPU/GPU — recherche V198

Relevé du 3 octobre 2026. Sources gelées pour les mesures ; [contrat](../development/movement-continuity-v198.md), [preuve](../history/validation-movement-v198.md). Ce lot corrige l'existant, sans nouvelle mécanique ni changement de schéma182.

## Référence de fuite vérifiée

Lecture locale en lecture seule : Core PC **1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld`. Assembly-CSharp SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, identifié aussi dans la [recherche V197](melee-pursuit-core-v197.md). Relecture de `RimWorld.JobDriver_FleeAndCower`, `Verse.AI.JobDriver.EndJobWith` et `Verse.AI.Pawn_JobTracker.EndCurrentJob`; extractions de diagnostic sous `tmp/v198` et `tmp/v197`, sans redistribution de code propriétaire.

Après le trajet, `FleeAndCower` crée une attente1 200 Core. Son callback vérifie `ShouldStartFleeing` à l'intervalle hash35 et interrompt avec `InterruptForced`. Il n'effectue pas une observation immédiate systématique à l'arrivée. `EndJobWith` appelle `EndCurrentJob`; la branche d'interruption rejoint `TryFindAndStartJob` sans la pause de posture réservée à certains succès ordinaires. Cela ne prouve pas qu'un chemin soit toujours disponible ni qu'aucun autre système Core n'intervienne.

**Adopter** l'attente au refuge et la réobservation, **adapter** l'horloge locale×10 et l'admission bornée d'une nouvelle fuite dans la décision d'observation. **Différer** parité exhaustive de l'IA Core, collisions de foule et équivalence de phase des IDs hash. Le [contrat historique des rencontres](../development/encounters.md), sa [recherche](encounter-reference.md) et le [corpus](reference-adoption.md) restent les références des priorités et interactions physiques. V197 protégeait le poursuivant, pas ce contrôleur civil.

Le chapitre21 original du [corpus](../reference/originals/Documentation_developpement.html#chap-21), SYS/TEST-113..117, distingue accessibilité, recherche et suivi. Ses propositions A*/régions ne constituent pas des règles de gameplay ni une obligation de remplacement. [Ludeon, annonce officielle1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/), section Update1.6, confirme un pathfinding multithreadé et regroupé par lots. Cette annonce ne documente pas une navigation GPU Core ni l’architecture complète ; ne pas présenter RimWorld1.6 comme un moteur exclusivement monothread.

## Ce qui calcule les chemins aujourd'hui

`WeightedSearch` est un **Dijkstra pondéré progressif**, pas un A* ni une navigation GPU en production. Il termine la couche de coût égal pour préserver les parents et peut reprendre un même champ pour plusieurs classes d'objectifs. Les cases, diagonales, meubles, portes, réservations d'usage et profils de faune imposent leurs contrats métier distincts. La [réduction V191](../development/prey-navigation-v191.md) conserve les routes exactes lors de la sélection des proies.

Trois problèmes de contrôleur ont été reproduits : attente supplémentaire après observation civile, suspension d'un préfixe animal sûr quand la recherche est différée, trajet de sortie de produit sélectionné mais jamais exécuté. Accélérer le solveur ne corrigerait pas leurs branches de contrôle. Les autres retours sous budget ne sont pas automatiquement des bugs : absence de route ou arbitrage d'un besoin prioritaire doivent être distingués d'une route déjà engagée.

## Recherche Internet technique précise

- [Continuum Crowds, Treuille/Cooper/Popović, SIGGRAPH2006](https://grail.cs.washington.edu/projects/crowd-flows/), [article original](https://grail.cs.washington.edu/projects/crowd-flows/continuum-crowds.pdf) : des champs partagés peuvent amortir la navigation de groupes vers des objectifs communs. Ce travail n'est pas une mesure WebGPU de Lisière et ne justifie pas le même coût pour des milliers de destinations distinctes.
- [Scalable GPU Graph Traversal, Merrill/Garland/Grimshaw,2012](https://research.nvidia.com/publication/2012-02_scalable-gpu-graph-traversal) : BFS par frontières et gestion de travail limitent les revisites. Résultats CUDA sur d'autres graphes et matériels ; coûts uniformes de BFS différents des règles pondérées du jeu. Aucune extrapolation de leur débit à notre navigateur.
- [MDN, GPUBuffer.mapAsync](https://developer.mozilla.org/en-US/docs/Web/API/GPUBuffer/mapAsync), consulté le 3 octobre 2026 : lecture CPU asynchrone après disponibilité du buffer, buffer inutilisable par commandes GPU tant qu'il reste mappé, API disponible en worker. Upload, attente/readback et contrôle de révision doivent entrer dans une comparaison complète.

## Laboratoire existant et décision

Le [laboratoire GPU](gpu-navigation.md) est déjà implémenté, mais isolé du worker autoritaire. Ses mesures historiques du13 septembre 2026 sur Ryzen5 3600/AMD RDNA1/Chromium153, sans rendu concurrent, comportent une chauffe et trois mesures : 32²/une requête4,6msGPU de bout en bout contre0,3msoracleCPU ; 250²/une18,1contre13,3 ; 250²/huit52,6contre109,2. Comparateur Dijkstra diagnostique, pas le coût du contrôleur actuel ni un A* optimisé. Aucun nouveau banc GPU n'a été exécuté enV198.

Le prototype calcule un champ par requête sur une grille cardinale. Il ne fournit pas encore les diagonales, profils de portes/animaux, arbitrages de réservations ou application déterministe au tick. Les champs dense double-buffer coûtent environ0,477Mio par destination en250². Une promise terminée plus tôt ne doit pas choisir un propriétaire métier différent. Un GPU plus chargé par le rendu peut aussi déplacer le goulot d'étranglement.

**Décision : conserver le solveur actuel pour ce correctif**, mesurer les préparations et candidats CPU avant remplacement. Comparer ultérieurement, si le coût le motive, une requête individuelle ciblée/A*, réduction régionale ou champs réellement partagés, avec oracle indépendant et transfert inclus. Aucun moteur physique/ECS générique ni compute de foule ajouté. Le gain éventuel doit être confirmé dans le worker et avec rendu matériel, pas déduit d'un laboratoire.
