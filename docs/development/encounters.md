# Rencontre armée et réponses civiles — V58

État courant V61 : [approche et postes de tir](pursuit.md) dans les **nouvelles** rencontres. La sentinelle des anciennes sauvegardes garde son mandat fixe. Les descriptions V58/V60 ci-dessous sont historiques ; raids et autonomie complète restent absents.

Mise à jour V60 : [tir automatique des colons et Attaquer civil](automatic-combat.md) ajoutés. V59 : la sentinelle possède maintenant une riposte au contact via le [contrat de mêlée](melee.md). Elle reste sans poursuite autonome ; les descriptions V58 ci-dessous concernent le lot initial.

[Référence vérifiée et écarts](../research/encounter-reference.md). Une nouvelle colonie peut choisir Camp paisible (défaut inchangé) ou Rencontre armée, à partir de 64². Trois colons, leur camp et leurs ressources restent les mêmes ; Ada commence avec le revolver de départ déjà équipé. Une sentinelle équipée d’un second revolver normal est placée sur un emplacement accessible, à plus de 27 cases de tous les colons. Aucun spawn pendant une partie ou son chargement. Création et choix du site reproductibles ; échec sans remplacer le monde précédent.

## Autorité et représentation

`affiliation.ts` sépare propriétaire (colony/outlaws) et table de relations. Champ absent = colonie historique. Relations fixes dans cette tranche, sans diplomatie. Les adversaires partagent corps, équipement, trajets, santé, projectiles et rig GPU ; teinte rouge dans le lot existant, sans mesh ni pipeline supplémentaire par adversaire.

Ils n’apparaissent ni dans la barre des colons, ni dans Travail/Horaires/Affectations/propriétaires de lits. L’inspection carte affiche état, arme et anatomie sans ordres de colonie. Les commandes revalident l’appartenance côté worker ; un refus ne mute rien. Les secours/soins automatiques n’emmènent pas les ennemis dans les lits civils. Une capture est une future mécanique distincte.

`threats.ts` possède sélection de cible et intention civile. `shooting.ts` garde toute la chaîne de tir commune : visée, récupération, qualité, précision, XP, sous-pas Core, vol et santé. Une sentinelle cesse d’acquérir une cible non active ; blessure/incapacité interrompt via les mêmes contrats. La perte de l’arme ou l’épuisement empêchent effectivement de tirer. Le tir dirigé sur un hostile debout adjacent est refusé avec le manque de mêlée expliqué.

## Fuite, navigation et objets portés

Fuir est le défaut sparse ; Ignorer se règle dans Affectations. Les ordres directs/mobilisation passent avant la réaction. Interruption de travail avec arête active conserve cette arête et la cargaison sur son porteur ; elle n’est jamais déposée à l’avance au bout graphique du trajet. Le refuge tient compte des pièces, réservations et distances ; l’accès et la route restent séparés. À l’arrivée, tentative de dépôt normale puis attente avant reprise du travail et des besoins. Aucun soin ou gain de besoin pendant la fuite.

`combat-navigation.ts` applique le même obstacle hostile aux recherches pondérées, à l’accès progressif et au suivi. Les captures ne survivent pas à une décision/mutation. Corps debout et extrémités actives bloquent ; alliés et personnes à terre ne deviennent pas des murs. Portes fermées de la colonie infranchissables aux adversaires ; ouvertes, elles ignorent l’interdiction coloniale. Attendre la fin visuelle de l’ouverture reste l’adaptation 3D existante.

## Persistance et performances

Schéma 58 : V57 validée strictement avant changement de version. Aucun acteur, arme ou passé de fuite inventé. `Pawn.faction`, `hostilityResponse` et `flee` sont optionnels. Fuite persistée avec cible et fin d’attente ; références, chemins et incompatibilités d’activité sont contrôlés. Le contrôle hostile est une permission au départ du pas, pas une interdiction absolue de superposition : un ennemi à terre peut se relever sous un passant. Une arête engagée reste conservée dans ce cas, sans téléportation. Les snapshots conservent ces champs ; observateur de phases enrichi. Les vols conservent les relations du départ.

Pas de nouveau calcul de trajet par frame, ni de squelette CPU. Recherche de refuge soumise au budget commun des recherches. Les preuves conservent séparément simulation, communication et rendu ; voir [validation](validation.md). Les pointes observées restent des limites, pas une promesse de fluidité universelle.

## Partiel à compléter

Cette livraison est une sentinelle statique de scénario. Poursuite ennemie, réveil défensif, détection/réaction à tout dommage, gestion de faim autonome du NPC, récupération de son arme, capture, suicide/fin des raids, destruction des objets, factions neutres et diplomatie ne sont pas livrés. Un adversaire désarmé reste une personne hostile ; les actions non livrées ne sont pas remplacées par des téléportations ou des dégâts abstraits. La faim reste sans malnutrition, comme pour les colons actuels.

Audit V58 : captures de tir réutilisées seulement dans la transaction de combat, avec contrôle des couvertures mobiles après impact ; topologie du refuge conservée par propriétaire et entièrement revérifiée à chaque lecture. Aucun changement de règle ni cache fondé sur le seul tick. À cent acteurs, coût CPU p95 observé de 33,1 à 23,9 ms, encore au-dessus du budget d’un tick à 6×. [Mesures et limites](../history/validation-encounter-v58.md).
