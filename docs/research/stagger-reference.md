# Pouvoir d’arrêt — vérification V57

18 septembre 2026. Corpus relu : chronologie du combat (chapitres 16/19/20), coûts et déplacements dynamiques (21), SYS/TEST-099..107 et 111..117, UI-009/010. **Adopter** conséquence physique de l’impact et état temporaire distinct de la blessure ; **adapter** trajectoire 3D continue et horloge locale ; **différer** autres corps, équipements, hostilité et réactions. [Contrat livré](../development/stagger.md).

## Sources et décisions

La page communautaire [Weapon, Stopping power](https://rimworldwiki.com/wiki/Weapon#Stopping_power), recherchée à nouveau le 18 septembre, décrit le seuil de taille, le ralentissement de 83 %, les 95 ticks Core et son indépendance du dommage effectif. Ce résumé ne suffit pas à déduire le suivi de déplacement ni le rafraîchissement de l’effet.

Le miroir C# est fixé à `2d508035082e7cb0c8e29e230d26bda6e546928f` (20 mai 2026), sans certification de l’assembly commercial actuel. Lecture locale des fichiers bruts de ce commit lorsque le lecteur Web échoue ; pas de copie de code dans notre moteur.

- [Bullet](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Bullet.cs) : notification après application du dommage. Ne pas conditionner le ralentissement à une quantité de PV perdus ni ajouter de tirage aléatoire.
- [StaggerHandler](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/StaggerHandler.cs), récupéré à nouveau pour ce lot : seuil avec tolérance de taille 0,001 ; durée soumise à la statistique du personnage ; renouvellement par maximum de durée restante et minimum de vitesse, pas addition de ralentissements. Profil actuel : humain adulte naturel, taille et facteur de durée égaux à 1.
- [Pawn_PathFollower](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/Pawn_PathFollower.cs), `CostToPayThisTick` : le facteur agit sur le paiement **en cours** et le paiement minimal reste le coût total de l’arête divisé par 450. Cette borne, absente du résumé wiki, évite qu’un pas très coûteux reste bloqué. Elle devient 45 ticks locaux. Un simple changement de vitesse au prochain départ serait incorrect.
- [Pawn_StanceTracker](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Pawn_StanceTracker.cs) : ralentissement séparé de la posture occupée. Aucun allongement gratuit de préparation ou récupération du tir.

Un [ancien échange du forum officiel](https://ludeon.com/forums/index.php?topic=42635.0) apparaît dans les résultats avec le seuil et la durée ; son ouverture renvoie 403. C’est une piste historique, **pas une source intégralement consultée ni une preuve du binaire actuel**. Confiance élevée sur la séparation des effets et moyenne sur la parité numérique de toute version actuelle ; confrontation interactive à une installation officielle encore ouverte.

## Interprétation 3D et limites

La distance est intégrée continûment sur la même arête : vitesse normale, ralentie, puis normale. Un nouveau coup modifie uniquement la suite ; il ne réinterpole jamais le passé depuis l’origine. Lumière, anatomie et coût du terrain restent capturés au départ selon le contrat existant. Le taux vivant de ralentissement est distinct de cette base, ainsi que du coût de recherche du chemin.

Les impacts utilisent les sous-pas Core du projectile ; la publication médicale reste au tick local V56. Le rendu suit le temps confirmé commun. La fin d’arête après incapacité demeure l’adaptation 3D V45 ; aucun nouveau travail ni pas autonome n’est autorisé. Les armures et autres statistiques de durée ne sont pas inventées pour remplir cette règle. Le premier adversaire reste un lot distinct.
