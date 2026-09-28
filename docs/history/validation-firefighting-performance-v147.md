# Proposition d'extinction : optimisation CPU V147 — 28 septembre 2026

V147 réduit le travail nécessaire pour choisir une case de contact avec un feu. Le schéma reste **144** ; aucune règle d'extinction, décision du joueur, sauvegarde ou mécanique nouvelle n'est ajoutée. La [référence de charge V145](validation-performance-reference-v145.md) et le [profil V146](validation-performance-v146.md) motivent la recherche de sous-coûts CPU, sans fournir de gain de débit global à attribuer à cette retouche.

## Changement et invariants

L'ancienne `firefightingProposal` calculait un chemin vers chaque case de contact admissible du premier feu atteignable, puis triait tous les chemins par nombre de cases. La variante V147 visite d'abord les cases selon leur nombre **minimal possible** de pas depuis `reach.start` : le maximum des écarts horizontaux et verticaux, puisque la navigation autorise huit voisins. Une case dont cette borne ne peut améliorer le meilleur chemin est écartée ; à longueur égale, l'ordre initial des cases conserve le premier choix de l'ancien tri stable. L'ordre des feux, le contact physique, les obstacles, les chemins effectivement retenus et les tirages PRNG ne changent pas. La borne utilise l'origine du champ de navigation, qui peut différer de la position portée par le pion appelant.

Ce raccourci ne remplace ni l'accès réel ni la recherche pondérée. Il suppose que chaque arête d'un chemin occupe une des huit cases voisines, comme le fait le moteur actuel. Les [scénarios ciblés](../../tests/firefighting-route-v147.test.ts) confrontent l'ancienne décision à la nouvelle : contact immédiat, détour autour d'un obstacle, égalité de longueur, premier feu inaccessible, origine `reach.start` distincte et requêtes ultérieures sur le même accès différé. La continuation de ces seuls scénarios reste distincte de la trace mixte ci-dessous.

## Comparaison locale A/B/B/A

Le [banc dédié](../../scripts/benchmark-firefighting-v147.ts) charge `public/test-saves/v98/mixed-100.json` (SHA-256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`), puis migre strictement son schéma 91 vers 144 **hors chronométrage**. Le monde figé au tick 2 000 mesure 250 × 250 cases, 104 personnes et neuf feux. L'oracle reprend l'ancienne boucle et son tri stable ; avec un accès indépendant et frais pour chaque variante, il compare exactement `fireId`, cible et chemin ordonné des **104 personnes**. Dix-sept sont éligibles à l'extinction, chacune avec neuf feux admissibles ; les 87 autres sont aussi contrôlées, mais ne constituent pas une charge de routage. Les 17 propositions obtenues par lot totalisent 232 cases de chemin dans les deux variantes.

Sur Windows, Node 24.11.1 et AMD Ryzen 5 3600, quatre tours **A/B/B/A** chronomètrent huit lots de 17 propositions par variante dans le même processus. La migration, la sérialisation de contrôle, la grille `blockedCells` et la construction de chaque `CandidateAccess` frais sont hors chrono ; la résolution des chemins demandée par la proposition est dedans. Les appels sont chauffés avant les lots. Le banc vérifie aussi que le World sérialisé, ses PRNG monde/feu/faune et le hash du fichier source restent inchangés. Le rapport de travail est `tmp/benchmark-firefighting-v147.json` ; son SHA-256 de `src/sim/firefighting.ts` est **`f6301317180706650a801f11d73f3961254b41240c71cf3ec4a86ff868c3df12`**, après la correction de la borne à `reach.start`.

| Variante | Moyenne par lot de 17 appels | Médiane des huit lots | p95 des huit lots |
| --- | ---: | ---: | ---: |
| Ancienne boucle | 119,68 ms | 117,56 ms | 142,57 ms |
| V147 | 60,51 ms | 59,65 ms | 68,58 ms |

Le ratio des **moyennes de ce seul sous-coût** est ×1,98. Le p95 porte sur huit lots, non sur des ticks du jeu. La présence de neuf feux ne signifie pas que les neuf sont routés à chaque appel : la proposition s'arrête au premier feu atteignable. Le banc crée des accès non différés sur un monde immobile ; le planificateur peut, lui, transmettre un accès différé déjà consulté par d'autres candidats. Cette mesure ne comprend ni tout `planWork`, ni `stepWorld`, ni le worker, les snapshots, le rendu ou le GPU.

## Trace de continuation et portée

Le [traceur mixte](../../scripts/trace-mixed-v147.ts) rejoue séparément l'ancien et le nouveau code depuis la même sauvegarde. Les fichiers de travail `tmp/trace-mixed-v147-baseline.json` et `tmp/trace-mixed-v147-candidate.json` ont été comparés ligne par ligne : **80/80 ticks identiques**, de 2 001 à 2 080, pour le SHA-256 de `serializeWorld`, `world.rng` et le RNG de la faune. Le hash de l'état final est `754ec6ffa36da17daac8e7c92ca082e4a7162b16786ba13e6a2d64c527473b23`. Le hash du World couvre aussi l'état du feu. Cette trace vérifie la continuation autoritaire de cette scène ; elle ne compare pas les messages du bridge, les deltas de présentation ou une campagne naturelle longue.

L'optimisation est conservée comme réduction mesurée d'une décision locale. La priorité reste à la charge CPU complète de la scène 250², puis à des répétitions natives sur sources gelées : ni **240 FPS**, ni **×6 atteint**, ni gain général de débit ne sont établis par ces lots. Les limites de gameplay de l'incendie restent celles du [contrat incendies](../development/fires.md).

## Contrôles finaux

Les six fichiers de tests ciblés incendie, navigation et priorités passent **29/29**. La régression hors campagnes longues passe **276/276 fichiers, 1 185 tests réussis et un microbanc optionnel sauté**. Le build avec typage passe et le contrôle documentaire vérifie 516 documents et 5 143 liens locaux. Les campagnes longues et une comparaison native A/B du débit ne sont pas déduites de ces contrôles.
