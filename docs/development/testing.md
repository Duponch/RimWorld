# Stratégie de validation

## Principes

Maintenir un petit nombre de scénarios riches qui contrôlent des effets de jeu, des invariants et des frontières techniques. Un test qui vérifie simplement qu'un champ reçoit sa propre valeur n'apporte presque rien. Chaque bug réel important devient une régression dans la famille de scénarios correspondante, avec sa cause et une fixture reproductible.

Aucune suite ne garantit de détecter toute anomalie imaginable. L'objectif est de rendre les risques connus observables, de couvrir les cas limites pertinents et de renforcer les scénarios à mesure que les mécaniques s'enrichissent.

## Exploiter les scénarios du référentiel

Le [corpus utilisateur](../research/reference-adoption.md) fournit 196 propositions TEST, toutes non exécutées. Les 181 premières reformulent les contrats SYS correspondants ; elles alimentent nos critères sans devenir une suite ou un fichier par ligne. La lecture documentaire n'ajoute aucun test passé aux résultats du prototype.

Conserver les [cinq familles F1–F5](../gameplay/systems-matrix.md#stratégie-de-validation--peu-de-familles-scénarios-riches). Le chapitre 32, PDF pages 39–40, propose des scènes d'interaction à introduire avec leurs systèmes :

| Scène du corpus | Adaptation et calendrier | Familles locales |
|---|---|---|
| A — Cuisine interrompue | G0 : deux agents, pile partagée, destinations filtrées, interruption, filtre modifié et reprise. G1 : ingrédients/recette ; G2 : panne électrique. Vérifier bilan matériel et propriétaire à chaque transition, pas seulement le total final. | F1 conservation, F2 continuation. |
| B — Combat et cible mobile | G3 : mobilisation, porte, couvert, allié et cible déplacée ; séparer émission et impact, imposer les tirages des branches sensibles. | F3 topologie, F2 séquence temporelle. |
| C — Maladie et transfert du patient | G3 : soins, médecine, interruption et progression temporelle ; ajouter le départ en caravane en G5. | F1 transitions, F2 durée et reprise. |
| D — Caravane aller-retour | G5 : manifester les propriétaires avant/après chaque transfert, conserver individus, piles et consommation sans duplication. | F1 identité, F2 voyage et sauvegarde. |
| E — Pièces, énergie et incendie | G2 : modifier portes/toits/réseaux, injecter le feu sans exiger le narrateur ; dégâts aux personnes en G3. | F3 topologie, F2 échanges et cadences. |

F4 exerce les actions correspondantes dans le navigateur lorsqu'une commande ou un protocole change ; F5 mesure leur charge représentative. Ces scènes constituent des cibles futures, distinctes des suites déjà en place ci-dessous.

La profondeur vient de trois approches complémentaires : branches exactes avec entrées imposées, interactions avec invariants vérifiés pendant l'exécution, distributions avec seuils et taille d'échantillon décidés avant observation. Appliquer les distributions aux systèmes probabilistes concernés, sans créer une sixième famille ni des assertions probabilistes instables pour toute action. TEST-182..194 peuvent fournir des cas numériques après adoption explicite du modèle ; TEST-195/196 requièrent leur contexte DLC/correctif.

Pour G0, garder dans les fixtures les références SYS-041..061/TEST correspondantes et réunir quantité partielle, concurrence, destination pleine ou détruite, annulation après prélèvement/dépôt, changement de filtre et restauration aux transitions critiques. La quantité disponible, portée, livrée, consommée et détruite par une cause autorisée doit être explicable indépendamment de l'implémentation. Un bug découvert devient une régression ciblée ; le simple journal d'un long run ne remplace pas ces assertions.

Une comparaison au jeu de référence précise version, source, unité et contexte. Un PRNG différent interdit de présumer une égalité bit à bit avec RimWorld ; la continuation de **notre** simulation doit en revanche rester exacte pour sa version de règles. Le comparateur d'un algorithme doit être indépendant, et les observations inconnues restent inconnues.

## Familles en place

`tests/simulation.test.ts` exerce le noyau sans DOM ni GPU : continuation déterministe, contraintes transactionnelles, règles de priorité, annulation, interruption par les besoins, navigation, corruption de sauvegardes et simulations longues. Les assertions portent sur les ressources, le nombre de travaux réellement achevés, les liens de réservation et la validité du monde. Le soak utilise plusieurs graines et vérifie les invariants pendant l'exécution ; l'égalité d'un hash seule ne suffit pas.

`tests/integration/colony.spec.ts` pilote le navigateur, ses vrais contrôles et le vrai worker. Il vérifie notamment qu'une sélection de case provoque l'ordre attendu, que pause et sauvegarde correspondent à l'état autoritaire et qu'un chargement invalide ne modifie pas le monde. La console est inspectée, car un canvas visible et un compteur FPS ne prouvent pas que le shader est valide.

Le parcours des frontières conserve SwiftShader/WebGL 2, notamment pour les contrôles compacts et la migration V1 dans le worker. Les parcours de transport et de créations/restaurations 64²/128² lancent explicitement Chromium normal. Les états complets sont transmis comme JSON ; la comparaison exacte reste intégrale, sans faire sérialiser chaque sous-objet au protocole Playwright. Les limites du logiciel et les passages réellement exécutés sont conservés dans [validation.md](validation.md).

Pour sauvegarder un portage transitoire, le navigateur observe une cargaison puis clique le vrai bouton Pause dans le même callback. Une observation suivie d'un aller-retour supplémentaire vers le pilote peut arriver après le dépôt, particulièrement avec le rendu logiciel. Le test attend ensuite l'acquittement autoritaire et exige encore une cargaison physique dans l'état sauvegardé ; il ne remplace pas cette assertion par un simple ordre en attente.

`tests/world-generation.test.ts` regroupe trois familles : déterminisme/sauvegarde, topologie et accès du départ, distributions quantitatives sur plusieurs graines et tailles. Les cas étroits et rectangulaires exercent les limites de la grille ; les seuils empêchent notamment massifs dispersés et carte presque vide. Ils ne prouvent pas une diversité infinie de paysages crédibles.

`tests/gpu-navigation.test.ts` vérifie les contrats sans matériel. Le script `scripts/gpu-navigation-bench.mjs` valide réellement les kernels GPU contre un oracle indépendant : chemins et coûts, murs, labyrinthes, bords, petites dimensions, terrains pondérés, budget insuffisant, capacité de sortie, révision périmée et concurrence. Un backend absent est un échec explicite de cette validation, jamais un passage simulé. Le navigateur matériel reste nécessaire en complément des tests Vitest.

La façade d'observation `window.__lisiere` existe seulement dans le serveur de développement avec `?e2e`. Elle expose une copie de l'état et la projection d'une case ; les tests passent par les commandes d'interface. Elle n'existe pas dans le build de production.

Les tests graphiques logiciels valident la compilation et les interactions, pas le budget de performance matériel. Une inspection ciblée sur WebGPU doit compléter toute modification de rig, shader, layout de buffers, ombre ou version Three.js.

## Choisir les contrôles

| Modification | Validation pertinente |
|---|---|
| Documentation de recherche ou de plan, sans code modifié | Relire décisions, jalons, références et liens ; aucune relance des suites de simulation nécessaire. |
| Texte, couleur, espacement d'interface | Inspection visuelle ciblée et typecheck si TypeScript touché. |
| Commande, priorité, besoins, réservation | Scénarios simulation concernés ; élargir au soak si ordre système/invariants affectés. |
| Navigation | Fixture accessible/inaccessible, obstacle ajouté, congestion, reprise et budget de planification. |
| Générateur, échelle de carte | Familles de génération, distributions multi-graines, accessibilité, sauvegarde ancienne ; inspecter plusieurs cartes dans le rendu. |
| Navigation GPU | Contrats et oracle, exécution WebGPU réelle, révisions et budgets ; mesurer les lots avec leurs tailles, matériel et coûts de lecture. |
| Schéma, sérialisation, identifiants | Corruptions, round-trip en cours de travail, continuation égale, rejet atomique navigateur. |
| Worker, vitesse, protocole UI | Intégration réelle : pause, rafale de commandes, réponses, chargement et reprise. |
| Matériau, skinning, instancing | Typecheck/build, compilation graphique, console GPU et inspection à poses clés. |
| Optimisation | Régressions du domaine + benchmark A/B identique, même résultat métier. |
| Dépendances ou livraison de jalon | `npm run check`, puis contrôle WebGPU ciblé si rendu affecté. |

Une suite déjà passée n'a pas à être relancée après chaque retouche cosmétique. En revanche, toute correction qui modifie sa surface d'exécution invalide la preuve précédente pour cette surface.

## Diagnostics et mesures

Une anomalie de simulation doit conserver : graine, tick, commandes pertinentes, sauvegarde juste avant l'échec, invariant violé. Les erreurs du navigateur produisent captures et trace Playwright. Ne pas utiliser des seuils de durée stricts dans les tests métier : les machines et les charges diffèrent.

`npm run bench` mesure la simulation seule : affectation initiale, travaux actifs et phase inactive. Les percentiles de lots ne sont pas des percentiles de frames GPU. Les rapports doivent préciser versions, populations, taille de carte, scénario, durée et matériel disponible. Une pointe d'affectation est aussi importante qu'une moyenne faible.

À introduire avec les fonctions correspondantes : inventaire conservé à travers toutes les étapes de transport ; incendie/énergie/température couplés ; soins et incapacités ; tirs et obstacles ; incident reproductible ; import de clips et comparaison aux poses CPU de référence hors runtime ; compaction GPU aux limites de workgroup et de capacité.
