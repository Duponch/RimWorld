# Continuité des déplacements et diagnostic CPU — V198

Correction des contrôleurs existants, schéma **182 inchangé**, sans nouveau chantier fonctionnel ni navigation GPU branchée. La [recherche Core et technique](../research/navigation-cpu-gpu-v198.md) distingue attente voulue, défaut produit et coût de calcul ; la [preuve ciblée](../history/validation-movement-v198.md) borne la livraison. Mode jour : commit local puis attendre la relance.

## Fuite civile

V197 ne changeait pas `processFlee` : son scénario avec victime fuyante contrôlait surtout le poursuivant. Core attend au refuge jusqu'à une observation hash35, sur une phase de cowering de1 200 ticks Core. Lisière conserve son adaptation historique de120 ticks locaux et l'observation35 Core échantillonnée. Ne pas supprimer ces attentes pour rendre un test vert.

Après une observation de danger, l'intention de repartir est traitée dans la même décision locale, sous le budget existant. L'ancien retour immédiat ajoutait une décision avant la recherche. Budget épuisé : conserver l'intention prête, sans attendre un nouveau hash. Route indisponible : nouvelle attente au refuge ; préfixe existant sûr : marcher sans recherche. Arête engagée, porte en ouverture et récupération d'un tir gardent leur autorité.

## Prédateur et dépôt encombré

Un prédateur qui doit réviser sa cible ne suspend plus son préfixe sûr parce qu'un autre animal a consommé la recherche principale du tick. La prochaine arête reste revalidée par `moveAnimal` ; aucun passage dans un obstacle ni route inventée. Rotation, limite d'une recherche principale, expiration, contact et récupération ne changent pas.

En sortie de production, un repas ou une sculpture pouvait sélectionner une case libre au-delà des voisins occupés, puis recalculer ce choix sans avancer. Les deux branches de dépôt reprennent maintenant `actionCell` et le chemin déjà présents, revalident l'admission de la destination et appellent le déplacement ordinaire. Une destination occupée est recherchée à nouveau ; le dépôt reste au contact. Aucun champ persistant supplémentaire, création gratuite, transfert à distance ou changement de quantité/qualité.

## Audit et frontières

Marche mobilisée et `moveToward` des travaux, transports, repas et sommeil ont été relus : un préfixe sûr y précède le délai de recherche. La marche alimentaire et la sortie animale suivent aussi cette séparation. Une décision prioritaire de besoin peut encore attendre son budget ; ce seul retour n'établit pas un défaut de priorité métier. Aucune absence universelle de pauses n'est garantie : portes, contacts, récupérations, absence de chemin et nouvelles intentions restent des attentes possibles.

Les tests demandent maintenant la chronologie, les raisons d'arrêt et la conservation, pas seulement un résultat final. Les attentes historiques réparées portent uniquement sur une migration jusqu'au schéma courant et un filtre alimentaire absent enV35 ; le refus strict du filtre futur reste explicite. Les trois rouges initiaux du pilote de fuite assimilaient à tort toute attente au refuge à un défaut : ils ne constituent pas une preuve produit.

Le calcul actuel est un Dijkstra pondéré progressif, avec arrêts par objectifs et égalités déterministes. Le diagnostic CPU mesure séparément le tick et le sous-coût `advance`; il exclut rendu/GPU. Le laboratoire GPU reste isolé, conformément au contrat existant. Aucune promesse de coût nul, milliers d'acteurs, gain général ou débit6× n'est faite.
