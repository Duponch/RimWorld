# Pièces et préparation des toits — relecture du 15 septembre 2026

Référence : RimWorld PC Core 1.6. Les pages sont consultées à cette date ; le miroir de code n’est pas une installation locale certifiée du dernier correctif. Distinguer les comportements concordants des seuils sensibles à la version. [Contrat livré](../development/rooms.md).

## Corpus et adoption

Chapitres **5, 10, 21 et 22**, domaine S10, **SYS/TEST-023..025**, environnement **SYS-028/126..131**, scène E du chapitre 32. Le chapitre 22 demande de distinguer espace, toit naturel/construit, chaleur et conséquences d’effondrement ; il ne fournit pas une distance de support définitive. Adopter ces séparations, adapter l’algorithme et l’inspection 3D. Ce lot ne valide que la connectivité et son observation : les tests de thermique, énergie, toiture et dégâts demeurent différés. Les statuts du corpus ne deviennent pas des résultats locaux.

## Règles confrontées

| Sujet | Observation, provenance et décision |
|---|---|
| Enceintes | [Rooms, wiki communautaire](https://rimworldwiki.com/wiki/Rooms) : murs, roches et portes ouvertes ou fermées délimitent les pièces, coins non obligatoires. **Adopter** pour le contenu présent ; certitude élevée sur cette règle de base, pas sur toutes les propriétés de la pièce. |
| Porte et eau | [RegionTypeUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/RegionTypeUtility.cs) attribue un portail indépendant à une porte, et distingue terrain infranchissable avec échange d’air d’un obstacle plein. [RegionAndRoomUpdater.ShouldBeInTheSameRoom](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/RegionAndRoomUpdater.cs) fusionne les districts normaux et d’échange libre, exclut le portail. **Adopter** : ne pas réutiliser le masque du pathfinding. |
| Grandes pièces | Le wiki mentionne 36 régions ; [Room](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/Room.cs) utilise notamment 60 dans ses limites de taille/rôle. **Vérifier lors des rôles** ; aucun plafond de cellules inventé pour imiter une limite dépendante du partitionnement Core. |
| Intérieur | Le wiki et `Room` distinguent température, travail et psychologie. Les seuils à 25 % de toit manquant n’ont pas tous la même inclusivité ; le travail général des ateliers utilise encore une autre propriété. **Différer les effets**, conserver un diagnostic d’enceinte neutre. Une cour non couverte n’équivaut pas automatiquement à « dehors » pour toute activité. |

Les contrôles par union et les parcours de construction comparent notre comportement au contrat adopté. Ils ne démontrent pas une parité exhaustive avec Core. La connectivité sur quatre côtés et les seuils séparés sont une interprétation logique de la grille, indépendante des silhouettes et hauteurs 3D.

## Préparation du prochain lot — non livrée

Les [toits du wiki](https://rimworldwiki.com/wiki/Roof) et [RoofCollapseUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/RoofCollapseUtility.cs) distinguent portée géométrique et chaîne de cellules couvertes : le miroir utilise **6,9 cellules**, pas un simple carré de rayon 6. Les toits construits et naturels minces se retirent, les montagnes épaisses exigent un autre traitement. Le retrait volontaire d’une couverture et la perte d’un support ne produisent pas les mêmes conséquences. **Vérifier et implémenter ensemble supports, transactions et effets réellement disponibles**, sans promettre des blessures avant la santé.

[JobDriver_AffectRoof](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JobDriver_AffectRoof.cs) porte un travail de base de 65 ticks Core et un facteur de vitesse de construction 1,7 ; ce ne sont pas directement nos ticks. [JobDriver_BuildRoof](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JobDriver_BuildRoof.cs) peut couvrir plusieurs cellules voisines lors d’un travail ; le retrait traite une cellule. [AutoBuildRoofAreaSetter](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/AutoBuildRoofAreaSetter.cs) impose des conditions de taille, de bord et de propriété avant de désigner automatiquement. **Adoption en attente de la tranche physique**, pas une permission de faire apparaître un toit par fermeture des murs.

Les fichiers étudiés sont consultables aux liens ci-dessus ; copies de travail ignorées dans `tmp/habitat-reference`. Lumière des cultures, travail extérieur et choix des loisirs devront être relus lorsque les propriétés de pièce seront consommées. Ni le climat, ni la production, ni les loisirs actuels ne changent par ce premier lot d’inspection.

V36 : la [vérification fraîche](work-environment-reference.md) distingue le consommateur des ateliers et corrige la lecture de `OutdoorsForWork` : plus de 100 cases **non couvertes**, pas plus de 100 cases totales. Le nouveau contrat de production utilise le critère psychologique.
