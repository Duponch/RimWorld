# Revue de progression — 19 septembre 2026

Revue demandée par l’utilisateur, après V65 (`2bf25ea`), en mode jour. Analyse du code, des contrats, de l’historique Git et des preuves existantes ; aucune nouvelle session de jeu ni nouvelle mesure de performance dans cette revue. Le calendrier révisable reste exclusivement dans [ROADMAP](../ROADMAP.md).

## Diagnostic

La direction fonctionnelle et les frontières simulation/worker/rendu restent adaptées. Les interactions physiques, la propriété des objets, les capacités anatomiques et la continuation servent plusieurs systèmes. Cette revue ne démontre aucun besoin de réécriture du moteur, de Rust/WASM ou de navigation GPU en production.

En revanche, la progression a été trop organisée par approfondissements successifs d’un domaine. Après l’habitat, les soins puis le combat ont occupé de nombreux lots avant de rejoindre une partie ordinaire qui évolue. Certaines dépendances étaient nécessaires ; leur succession ne suffit pas à prouver que leur ordre était le meilleur. Le prochain lot « quelques traits d’humeur », pris isolément, prolongerait cette tendance.

Le manque prioritaire est la connexion entre des systèmes déjà utilisables et de nouvelles décisions de colonie. Ajouter un autre coefficient de moral est moins urgent aujourd’hui que devoir loger et nourrir une personne supplémentaire, réorganiser le travail après un incident ou produire un équipement devenu nécessaire. Les traits et les relations demeurent des fondations de RimWorld ; ils ne sont pas retirés de la cible.

## Éléments observés

| Constat | Preuve locale | Conséquence pour le plan |
|---|---|---|
| Le camp sait entretenir nourriture, logement et production. | [Pilote de colonie](colony-progression.md), [parcours et contrôles V65](../history/validation-mental-break-v65.md). | Réutiliser ces boucles sous une situation nouvelle plutôt que multiplier les variantes d’objets. |
| Le premier adversaire est une condition de départ d’une rencontre distincte. | `src/sim/encounter-scenario.ts` n’accepte que le tick zéro ; `ScenarioId` vaut `camp` ou `sentry`. | Un combat testé ne livre pas des incidents dans une colonie ordinaire. |
| Le camp ordinaire ne gagne pas de personnes, de recherches ou d’objectifs par ces systèmes. | [Inventaire fonctionnel](../gameplay/implementation-status.md), domaines Population, Narration, Production et recherche. | Ouvrir G4 sans attendre l’achèvement de G3. |
| Les personnes ont quatre compétences actives, des blessures, vêtements, pensées et une crise ; pas de traits ni de réseau social. | Contrats et inventaire V65. | Brancher leur différenciation sur le travail et les situations vécues ; ne pas déclarer la psychologie complète. |
| Les contrôles automatisés démontrent conservation et continuation, pas intérêt d’une partie. | Pilote guidé d’un camp, rencontre et fixtures de crise distincts. | Ajouter un épisode intégré et une revue des décisions visibles, sans supprimer les scénarios profonds existants. |
| Des textes actuels contredisent les livraisons. | Inventaire annonçant encore les armures absentes et V59 comme schéma courant ; texte de création de rencontre annonçant encore poursuite/mêlée à venir. | Corriger le bilan maintenu ; le libellé UI est à corriger lors du prochain lot visible. Les preuves historiques restent datées. |

Les données V65 conservent à cent acteurs un CPU p95 de 36,45 ms et un pic d’image de 129,2 ms dans leurs conditions respectives. Les fondations sont réutilisables, mais leur présence ne certifie ni une charge quelconque ni une accélération 6× soutenue. Les prochains ajouts de population/incidents devront mesurer les transitions autant que le régime stable.

## Confrontation à la référence

Sources consultées le 19 septembre 2026, pour une décision de priorité et non pour figer des coefficients de gameplay :

- [Présentation officielle de RimWorld](https://rimworldgame.com/) : personnages, événements, croissance de population, fabrication et environnement forment une expérience reliée. Le narrateur est au centre de cette présentation. Périmètre : description du jeu de base, en séparant les annonces d’extensions présentes sur la même page.
- [Entretien avec Tynan Sylvester, repris par PC Gamer](https://www.pcgamer.com/games/strategy/the-challenges-of-developing-the-colony-sim-from-dungeon-keeper-to-dwarf-fortress-and-beyond/) : l’auteur décrit la génération d’histoires comme principe de conception et insiste sur l’attention limitée du joueur. **Entretien d’archive initialement publié en juin 2017**, malgré la date récente de republication ; source de philosophie, pas de règles 1.6.
- [Guide de démarrage communautaire](https://rimworldwiki.com/wiki/Quickstart_Guides) : le début de partie associe tâches quotidiennes, développement, arrivants et défense. Il éclaire la variété des décisions ; ses conseils et valeurs ne sont ni une spécification officielle ni une mesure du joueur moyen.
- [Incidents du wiki, section Wanderer joins](https://rimworldwiki.com/wiki/Events#Wanderer_joins) : candidat pour le premier événement de population. L’accès direct a renvoyé 403 pendant cette revue ; le résultat indexé décrit un choix limité dans le temps, alors que des discussions anciennes décrivent une adhésion automatique. **Choix, délai, refus, génération et cadence restent à confronter à des sources de version identifiée avant code.** Aucune de ces branches n’est certifiée par cette revue.

Corpus relu : chapitre 24 « Narrateur, difficulté et incidents », chapitre 23 sur RNG/admissibilité ; entrées SYS-132/133/134/135 (rythme, budget, incident, lettre), SYS-084/085/086/087 (personnes), SYS-148 (capture/recrutement). Adopter les contrats de conséquence réelle, admissibilité, notification séparée et reprise ; adapter l’ordre de réalisation. Différer le catalogue complet, pas les invariants. Une arrivée volontaire ne remplace pas la capture/recrutement de SYS-148. Les probabilités proposées et statuts R/P/V du corpus ne sont pas des règles locales validées.

Conclusion de conception, tirée de cette confrontation : notre objectif immédiat doit être un camp qui change et exige une réponse, tout en conservant les comportements physiques déjà livrés. Cet ordre est notre décision de développement ; il n’est pas attribué aux auteurs de RimWorld.

## Limiter le périmètre sans dégrader la règle

Trois catégories doivent être explicites avant chaque lot :

| Catégorie | Exemples | Traitement |
|---|---|---|
| Invariants indispensables | Trajet réel, ressource conservée, ordre refusé sans mutation, sauvegarde pendant une transition, interaction accessible. | Corriger et tester dans le lot ; aucun report pour accélérer une démonstration. |
| Comportements nécessaires à la boucle annoncée | Un nouvel arrivant utilise lits, repas, horaires, UI et politiques ; une menace possède une issue et laisse ses conséquences. | Livrer ensemble ou annoncer honnêtement une étape partielle, avec sa suite bornée. |
| Extension du domaine | Tous les traits, toutes les crises, toutes les armes, toutes les stratégies de raid, tous les appareils. | Maintenir dans l’inventaire et différer jusqu’à la boucle qui en a besoin. |

Une première menace exige de traiter le cas d’un camp fermé : pas de téléportation, de traversée des portes ni d’ennemi bloqué indéfiniment. Les dégâts/réparations utiles, la sortie de menace et la gestion des victimes sont des dépendances à examiner avant de promettre un épisode complet. Elles ne justifient pas de finir tout le catalogue militaire.

Le prochain événement ne doit pas devenir un moteur générique de quêtes sans consommateur. Le calendrier d’admissibilité, sa sauvegarde et la notification sont réalisés avec un événement jouable. Un calendrier de test forcé reste distinct du déclenchement en partie normale. La fin du lot ne doit dépendre ni d’un bouton de diagnostic ni d’une injection de stock ou de personne par le test.

## Vérifier la progression du jeu

Chaque livraison indique la nouvelle décision offerte au joueur, comment la rencontrer dans une partie normale, ses conséquences et les branches encore absentes. Une correction de stabilité peut constituer un lot autonome ; elle est nommée comme telle, sans gonfler l’avancement fonctionnel.

Après trois livraisons cohérentes, ou dès qu’une dépendance dépasse le périmètre annoncé, revoir l’ordre en lançant le jeu et en comparant les décisions disponibles. Si l’on ne fait toujours que bâtir le même camp, la progression de l’expérience n’est pas démontrée, même avec davantage de tests verts. Cette règle de revue n’est pas un quota imposant trois fonctionnalités à tout prix.

Le pilote conserve conservation, commandes publiques, interruptions, sauvegarde et reprise. Il sera enrichi progressivement : adaptation de lits/production/affectations à la population, réaction à une menace, récupération, puis objectif de fabrication. Le mode paisible reste utile comme témoin. Les cas contrôlés forcent les branches rares ; une partie via l’UI vérifie l’enchaînement réel. Aucun de ces contrôles ne prétend mesurer automatiquement le plaisir de jouer.

Les audits restent liés aux risques : pic d’arrivée, acquisition de cibles, morts/retraits, population mixte, transfert worker et rendu ; percentiles et maxima conservés. Une revue documentaire ne relance pas ces suites. Réduire la profondeur optionnelle et la duplication documentaire apporte ici plus de valeur que réduire les tests des contrats modifiés.

## Avancement et limites de la revue

Le projet est un prototype de colonie jouable avec un socle déjà conséquent et une expérience globale encore incomplète. Le nombre de versions ne représente pas la couverture du jeu. Les jalons G0–G5 restent ouverts ; leurs sous-boucles doivent être décrites individuellement pour rendre le progrès visible.

L’ordre de grandeur global précédent, 15–25 % de la cible Core substantielle, reste une estimation de planification très incertaine. Cette revue ne fournit ni nouveau chiffrage de charge ni date de fin. Les grandes absences — population/social, incidents, économie/recherche, animaux, climat, monde, contenu et finition — interdisent de déduire une proximité de fin à partir du seul socle technique. Recalibrer après un épisode intégré, pas après un compteur de commits.
