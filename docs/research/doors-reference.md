# Portes manuelles — recherche V34

Relu le 15 septembre 2026, cible Core PC 1.6. Corpus chap. 5/10/21, SYS-020..024 et SYS-113..117 : adopter accès/recherche/suivi et attente physique ; adapter cadence et géométrie ; différer pièces, toits et permissions des acteurs absents. [Contrat courant](../development/doors.md).

## Sources confrontées

- [Door, révision wiki 178671](https://rimworldwiki.com/index.php?title=Door&oldid=178671) : une case non réinstallable, 25 unités, base de travail 850 ; ouverture bois 120 %, acier 100 %, pierres 45 %. Maintien après passage, interdiction même porte ouverte. Certains détails de factions sont marqués incomplets : aucune extrapolation à tous les personnages.
- [Définitions Core](https://github.com/RimWorld-zh/RimWorld-Core/blob/master/Core/Defs/ThingDefs_Buildings/Buildings_Structure.xml) : coût, matériaux, non-rotation, toit et absence de composant électrique corroborés. Miroir historique, insuffisant seul pour dater la version actuelle. Remplacement par-dessus mur encore absent localement.
- [Building_Door](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Building_Door.cs) et [BuildingProperties](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/BuildingProperties.cs) : 45/vitesse puis facteur non alimenté par défaut 1 ; fermeture 110 et contact récent 120 ticks Core. Maintien distinct de l'ouverture ; corps, objets et cadavres empêchent la fermeture. L'exigence de murs latéraux des grandes portes ne s'applique pas au modèle 1×1. Miroir relu, correspondance au binaire non certifiée.
- [Pawn_PathFollower](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse.AI/Pawn_PathFollower.cs) : attente devant la prochaine porte jusqu'à pleine ouverture, réexamen de l'interdiction et notification en quittant la case. Adopter une attente réelle avant engagement de notre arête ; ne pas ralentir artificiellement un corps traversant un vantail fermé.
- [PathFinderJob](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/PathFinderJob.cs) : côtés diagonaux sensibles aux bâtiments. Adopter les cadres de portes comme coins solides ; conserver le contrat civil existant du mobilier.
- [DoorUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/DoorUtility.cs) : orientation selon voisins avec départage d'axes. Adapter aux murs/rochers/plans présents ; départages des clôtures et configurations complexes différés.
- [GenSpawn](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/GenSpawn.cs), [GenPlace](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/GenPlace.cs) et [GenGrid](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/GenGrid.cs), relus avec les copies de l'audit d'occupation : coexistence des objets sur porte, emplacement de dépôt peu désirable, visibilité selon ouverture. Adopter coexistence et blocage ; classement complet des dépôts encore partiel.

## Décisions et certitude

Confiance élevée sur les règles recoupées du passage manuel et le catalogue, moyenne sur la correspondance exacte de la branche décompilée à un binaire Core. Nos 10 ticks/s et 6 000 ticks/jour convertissent les durées par dix. Matériaux et construction conservent les contrats V33 ; HP, qualité et inflammabilité ne sont pas livrés implicitement.

Protection jusqu'au dégagement de l'arête visible : adaptation 3D. Une interdiction tardive ne supprime pas le mouvement engagé. La sauvegarde garde la fraction d'ouverture exacte, tandis que le miroir rétablit la progression graphique ouverte au maximum. Vantaux GPU et jambages sont une interprétation artistique sans changement de cellule logique.

Une porte ouverte n'est pas thermiquement une brèche ; les pièces et le toit restent des dépendances à implémenter. Réexaminer ces règles lors de l'habitat, des permissions hostiles et de l'électricité. Les tests locaux valident leurs scénarios, pas une conformité à 100 %.
