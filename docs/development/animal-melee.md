# Mêlée interespèces — V78

Décision du joueur : mobiliser un colon puis **Faune → Attaquer au contact**. Le colon approche réellement, frappe avec ses outils naturels ou son revolver ; un lièvre agressé peut mordre et blesser le colon. Les soins humains existants restent le moyen de traiter ces blessures. Le tir dirigé V77 reste disponible.

Cette livraison termine la dépendance de réaction au contact, auparavant limitée aux personnes. Elle ne livre pas la chasse alimentaire : aucun métier Chasse, aucune dépouille transportable, viande ou boucherie. Le prochain lot canonique relie ces éléments, sans ajouter une autre espèce ni poursuivre les raffinements médicaux par inertie. [Recherche fraîche et limites](../research/animal-melee-reference.md), [preuves](../history/validation-animal-melee-v78.md).

## Contrat de contact et de riposte

- L'ordre humain réutilise `melee`, les places accessibles, la cadence et les réservations de mouvement existantes. Refus atomique d'un groupe invalide ; cible morte refusée. Une cible debout qui tombe arrête l'ordre ; un nouvel ordre explicite peut viser une victime à terre. Aucun achèvement de chasse spécial n'est ajouté.
- `living-melee.ts` possède le coup commun : toucher/esquive, XP humaine, impact anatomique, armure, usure, étourdissement, réveil et PRNG. La récupération est installée avant les conséquences médicales. Aucun XP ou profil humain inventé pour un animal.
- Le lièvre utilise ses dents (3,4 dégâts Bite, pénétration 0,051, 120 ticks Core) et sa tête (1,5 Blunt, 0,0225, facteur de choix 0,2). La sélection commune élimine les outils trop faibles tant que les meilleurs existent ; une mâchoire perdue supprime les dents. Toucher sain 62 %, esquive naturelle saine nulle. Capacités réelles appliquées aux mêmes courbes.
- Une tentative au contact, même ratée/esquivée, mémorise l'agresseur et interrompt repas/sommeil ; la portion n'est pas consommée. La menace reste valable pendant au plus 400 ticks Core, distance au carré ≤ 9, ligne de vue sans lean, agresseur éveillé/mobile et non porté. Ce n'est pas une crise manhunter ni une hostilité envers tous les colons.
- La riposte est une attaque locale avec échéance de travail de 200 ticks Core. Elle se termine après un coup ; sa récupération de 120 ticks reste indépendante. Si la menace reste valide après récupération/expiration, elle peut susciter une nouvelle attaque. Aucune nouvelle arête ni frappe pendant l'étourdissement ; une arête déjà engagée continue avec ses intervalles de pause/ralentissement.
- Approche bornée au voisinage de la menace : Dijkstra local, huit directions, durée euclidienne/coûts communs et portes sauvages fermées infranchissables. Cette recherche est une adaptation explicite, pas la copie des régions du moteur Core. Pas de recherche de poursuite à l'échelle de toute la carte pour une menace distante de trois cases.
- Le noyau de mêlée lit le modèle anatomique du propriétaire. Le risque d'étourdissement est rapporté aux PV du tronc de l'espèce (16 pour le lièvre), pas à une constante humaine de 40. Le délai de 45 Core reste la calibration documentée V59. La chute violente animale conserve son tirage distinct de mort ; une chute ultérieure par saignement ne le répète pas.
- Coups humains/animaux et projectiles partagent l'ordre des identités persistantes à chaque sous-pas Core. Les captures tactiques périmées sont invalidées après le coup. Un animal mort/incapable libère menace, travail, repas et frappe ; l'arête de chute et ses fractions restent continues.

## Sauvegarde et présentation

V77 est strictement validée **avant** migration neutre V78. Champs animaux facultatifs `threat`, `retaliation`, `strike`, `stun` et intervalles d'arête `stuns` ; rien n'est créé dans une ancienne partie. Un ancien ordre humain V77 ciblant un animal reste refusé avant migration. Valider outils, propriétaire humain de la menace, temporalité, récupération sans trajet actif, phase et incompatibilités. Les morts restent identifiés.

La scène et l'UI utilisent les mêmes cibles/orientations. Le rig animal conserve géométrie, matériau et graphe TSL ; le mouvement d'attaque passe par les attributs existants. Le corps regarde l'adversaire à l'arrêt, le trajet pendant l'approche ; un étourdissement suspend la marche graphique. Aucun calcul de squelette par animal/image.

Le profilage de la charge mixte a identifié des évaluations corporelles répétées. `medical-assessment-cache.ts` réutilise un résultat immuable seulement si le modèle et **toute** sa projection physiologique sont identiques : dégâts/parties manquantes, douleur, plafonds et offsets. Pas de cache par seul ID/tick ; une mutation en place au même sous-pas, le sang, une cicatrice ou l’expiration d’une amputation fraîche changent immédiatement le résultat. Cache dérivé faible, absent des sauvegardes.

## Limites maintenues

Une seule espèce adulte, aucune chasse automatique, prédation, abattage d'élevage, soins vétérinaires ou hostilité animale généralisée dans les politiques civiles/du tir libre. La riposte vise seulement son agresseur récent ; les colons ne ciblent pas spontanément la faune. Dépouilles encore retenues sur place : obstacle possible à un chantier/une porte. La conservation froide ne fait pas encore d'un corps animal une réserve de viande. Voir [inventaire](../gameplay/implementation-status.md).
