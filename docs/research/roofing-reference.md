# Toiture — vérification du 15 septembre 2026

Cible RimWorld PC Core 1.6. Chapitres 5/10/21/**22**, **SYS/TEST-023..025, 061**, scène E du chapitre 32 relus. Les toits naturels, construits, échanges thermiques et dégâts sont des contrats distincts. Adopter cette séparation ; notre algorithme et notre rendu 3D restent libres. [Contrat V35](../development/roofing.md).

## Sources confrontées

- [Roof, wiki communautaire, révision 180617](https://rimworldwiki.com/index.php?title=Roof&oldid=180617) : absence de matériau, métier Construction, travail 65 ticks modifié par vitesse ×1,7, pose jusqu’à neuf cellules, retrait individuel, arbres exclus. Les zones Ignorer/Retirer ont des effets différents. La page se déclare incomplète ; elle n’est pas une preuve suffisante seule.
- [JobDriver_AffectRoof](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JobDriver_AffectRoof.cs), [BuildRoof](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JobDriver_BuildRoof.cs) et [RemoveRoof](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JobDriver_RemoveRoof.cs) : le miroir confirme cadence, accès et opération locale. **Adopter**, avec arrondi de 65/1,7/10 à quatre ticks locaux. L’ordre local des neuf cellules est explicite dans notre code ; pas de promesse de même ordre de choix des colons.
- [RoofCollapseUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/RoofCollapseUtility.cs) : rayon précis **6,9**, parcours à travers la couverture, porteur sur place ou cardinal adjacent. La connexion sans rayon est une autre fonction. **Adopter** ; une simple distance au mur le plus proche était insuffisante.
- [RoofCollapseCellsFinder](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/RoofCollapseCellsFinder.cs) : disparition du porteur et retrait volontaire ne sont pas interchangeables. Le premier vérifie aussi les cellules proches trop éloignées d’un autre support ; le second élimine les composantes flottantes sans infliger un effondrement. **Adopter les règles**, adapter à une résolution synchrone et différer les dégâts avec la santé/HP.
- [AutoBuildRoofAreaSetter](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/AutoBuildRoofAreaSetter.cs) : enclosure, zones d’exclusion, au plus 320 cellules et 26 régions. **Adapter** : même limite de cellules ; aucune imitation du nombre de régions Core avec notre graphe. Les factions et l’autorisation de toiture automatique par pièce ne sont pas encore disponibles.
- [Rooms](https://rimworldwiki.com/wiki/Rooms) et [Room.cs](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/Room.cs) distinguent intérieur thermique, travail et psychologie, avec des seuils différents. **Différer leurs effets** au prochain lot ; une enceinte couverte ne reçoit pas un bonus universel. Voir aussi la [relecture des pièces](rooms-reference.md).

Le miroir expose le comportement du programme mais n’est pas une installation locale certifiée du dernier correctif. Les lectures brutes de certains fichiers ont échoué dans le navigateur de recherche ; leurs versions brutes ont été récupérées séparément et lues pour la confrontation. Certitude élevée sur les règles concordantes, moyenne sur leur identité avec le dernier patch et les constantes sensibles à version. Les contrôles locaux prouvent notre contrat, pas une parité exhaustive avec RimWorld.

## Relecture des systèmes déjà présents

La couverture interrompt réellement la lumière de croissance et interdit la contemplation du ciel sur sa cellule. Conserver les âges de croissance à chaque transition évite qu’enlever un toit accorde rétroactivement des journées de soleil. Les autres conséquences restent ouvertes : mortalité végétale, température, détérioration, pluie/neige, précision de tir et effets psychologiques. Le [wiki des toits](https://rimworldwiki.com/wiki/Roof) les associe à des consommateurs qui ne sont pas tous présents.

Les massifs minés peuvent désormais servir de support à une couverture **construite**. Cela ne génère ni plafond rocheux mince ni montagne épaisse. Les cinq pierres, leurs sols et leurs fragments restent distincts de ces futures données. SYS-061 est enrichi côté retrait de support, sans clore le test de montagne/dégâts du corpus.

## Limites assumées de cette tranche

Toits construits uniquement ; dalle visible/masquable en 3D. Les dégâts/gravats d’effondrement et l’alerte avec pause ne sont pas simulés ; l’événement le dit au joueur. Pas de système de résistance, d’étage, de gravship ni d’autre extension. Le coefficient extérieur de l’atelier reste provisoire : préparer les toits n’a pas livré son environnement fonctionnel.
