# Fragments et périmètre du pilote — recherche V176

Relevé du 30 septembre 2026. Consolidation du pilote, sans nouvelle mécanique ni migration. Le [contrat de minage](../development/mining.md), sa [recherche initiale](mining-reference.md) et la [logistique matérielle](../development/material-logistics.md) restent applicables. Corpus utilisateur : SYS/TEST-051..054 et SYS/TEST-061 ; leurs statuts ne prouvent pas une validation locale.

## Sources et limites

L'installation locale indique **RimWorld Core 1.6.4871 rev590** dans `E:/Steam/steamapps/common/RimWorld/Version.txt`. `Data/Core/Defs/Misc/Designations/Designations.xml` définit `Haul` avec une cible `Thing` ; `Data/Core/Defs/JobDefs/Jobs_Work.xml` distingue `HaulToCell` et `HaulToContainer`. `Data/Core/Defs/ThingDefs_Misc/Various_Stone.xml` donne au parent `ChunkBase` `designateHaulable=true` et une pile maximale de 1. Ces définitions attestent les désignations et travaux, pas à elles seules tout le comportement du transport.

Le miroir décompilé [Designator_Haul](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Designator_Haul.cs) refuse une chose non désignable, déjà désignée ou déjà en stockage valide. [HaulAIUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse.AI/HaulAIUtility.cs) exige une désignation pour un objet qui n'est pas `alwaysHaulable` et se trouve hors stockage valide ; il contrôle aussi réservation, accès et destination. Son transport de dégagement (`HaulAsideJobFor`) est distinct du rangement et ignore les désignations. Le `master` consulté n'est pas certifié comme l'assemblage exact de l'installation locale : confiance sur les mécanismes recoupés, pas promesse de parité exhaustive.

Le [wiki du transport](https://rimworldwiki.com/wiki/Hauling) et la [zone de dépôt](https://rimworldwiki.com/wiki/Dumping_stockpile_zone) recoupent la désignation explicite des fragments et leurs filtres de rangement. Ce sont des sources communautaires comportant des avertissements de vérification ; aucune règle numérique ou cadence nouvelle n'en est importée.

## Décision locale

**Conserver** la mécanique livrée : le joueur désigne les fragments à ranger, puis les colons les prennent et les livrent physiquement. Aucune source ne justifie que le joueur doive désigner tous les fragments naturels d'une carte avant d'entretenir son camp.

**Adapter la politique du joueur de test** : dégager les empreintes et contacts des ouvrages du camp, les cultures et réserves ; ranger les fragments présents sur le sol découvert par le minage. L'étendue de ce périmètre est un choix du pilote Lisière, pas une règle Core. Les fragments naturels ailleurs restent dans le monde et peuvent toujours être désignés par le joueur. Vérifier séparément production, consommation, stockage, conservation et reprise ; une baisse du nombre de commandes n'est pas une mesure du CPU ou du GPU du jeu.

La [recherche healroot préparatoire](healroot-core-next.md) propose une future filière médicale. Elle n'est ni implémentée ni validée par cette consolidation.
