# Étagères — référence Core V320

Relevé du 11 octobre 2026 avant engagement, issu de [l’enquête préparatoire conservée](../../tmp/functional-v319-reference/shelves-scope.md). Installation locale lue sans modification : **RimWorld Core 1.6.4871 rev590**, SHA256 de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll` : `5CF1B5BE399D5B1C9C56CA72C9D35B4ECF307FEACF5859D04AC5A1AA5926356A`. Cette note décrit la référence et les choix de conception ; elle ne rapporte aucun résultat de contrôle d’Elsewhere.

## Provenance et règles Core

Les defs directement lues sont `Data/Core/Defs/ThingDefs_Buildings/Buildings_Furniture.xml` (`ShelfBase`, `StorageShelfBase`, `Shelf`, `ShelfSmall`, `FurnitureBase`), `Data/Core/Defs/Misc/SpecialThingFilterDefs/SpecialThingFilters.xml` et `Data/Core/Defs/Stats/Stats_Basics_General.xml`. Les lectures ciblées du binaire via ILSpyCmd8.2 couvrent `Building_Storage`, `SlotGroup`, `StorageSettings`, `StorageGroup`, `StorageGroupUtility`, `StoreUtility`, `GenPlace`, `Building`, `GenSpawn`, `SteadyEnvironmentEffects`, `StatPart_EnvironmentalEffects` et `SpecialThingFilterWorker_CorpsesLarge`. Aucun extrait propriétaire n’est reproduit ici.

L’[annonce officielle 1.4 de Ludeon](https://ludeon.com/blog/page/7/), section « Biotech expansion announced! Update 1.4 on unstable branch » d’octobre2022, présente le stockage accru et la petite étagère d’une case. Le [post Steam lié par Ludeon](https://store.steampowered.com/news/app/294100/view/3294970071159733465) n’avait exposé qu’une image lors de cette recherche : aucun détail supplémentaire ne lui est attribué. Les defs et classes installées fondent les règles de la version actuelle.

| Sujet | Core directement relu | Choix local V320 |
| --- | --- | --- |
| Dimensions et capacité physique | Petite1×1, normale2×1 ; trois objets/piles par cellule. | Trois places sur la petite, six sur la normale ; limite réelle de chaque pile issue de son `ItemDef`. |
| Coût, travail et résistance | Petite10stuff/250Corework/50PV ; normale20stuff/500Corework/100PV. | Matériaux et facteurs ordinaires locaux, conversion du travail par le ratio10Core/local. |
| Recherche et qualité | `ComplexFurniture` ; héritage de `FurnitureBase`, sans `CompQuality`. | Recherche `complex-furniture` ; aucune qualité synthétique ni tirage aléatoire de qualité. |
| Passage | `PassThroughOnly`, pathCost50, surface Item, fillPercent0,4. | Traversée avec coût5ticks local, arrêt ordinaire refusé, accès au contact depuis un voisin. |
| Zones | `canOverlapZones=false`. | Retrait des zones incompatibles par le préflight commun, avec conservation des possessions. |
| Politique | Priorité Preferred par défaut ; filtre utilisateur intersecté avec filtre fixe. | Priorité3 dans la table1–5 ; filtres, liste d’objets, qualité/PV et Fresh/Rotten ordinaires, distincts des exclusions physiques. |
| Exclusions physiques | Chunks, Plants, Buildings et corps de BodySize≥0,75 ; Wastepack conditionnel au DLC. | Fragments, meubles emballés, corps humains et gros corps refusés. Petites dépouilles autorisables par filtre ; taille du corps réel selon son âge. Aucun DLC absent ajouté. |
| Contenus | Things spawnés à leur position, recensés par le SlotGroup de l’empreinte. | Piles physiques dans `World.piles`, propriétaire `ground` conservé ; aucun inventaire secondaire de meuble. |
| Groupes | `StorageGroup` partage une politique ; retirer le lien copie les réglages effectifs. | Copie/collage indépendant zone↔étagère ; groupes liés différés. |
| Protection | `preventDeteriorationOnTop`, effet environnemental multiplié par0 ; beauté des objets stockés ignorée. | Contribution beauté des contenus neutralisée, beauté du meuble conservée. La détérioration environnementale des piles reste absente localement. |
| Pourriture et dégâts | Protection environnementale sans immunité à la pourriture, au feu ou aux projectiles. | Pourriture, thermique et dommages physiques existants conservés. |
| Retrait | Retrait du bâtiment puis replacement proche des objets excédentaires ; contenus séparés de l’emballage. | Préflight sans l’étagère, restitution conservant IDs/états, une pile par case au sol ordinaire ; politique et cellules durables suivent le même meuble emballé. |

La reconstruction de `Building_Storage.SpaceRemainingFor` présentait une expression inattendue `HeldThingsCount−capacity`. Elle n’est pas retenue comme autorité du calcul local : `StoreUtility.NoStorageBlockersIn`, `GenPlace` et `Building.MaxItemsInCell` établissent les trois places et les fusions limitées par `stackLimit`.

## Recommandation finale : cellules durables et limites physiques

L’autorité est `Structure.shelf`, avec une politique propre et une liste de **un ou deux IDs physiques positifs globaux**, dans l’ordre canonique de l’empreinte. Ces IDs sont alloués atomiquement **à l’achèvement de la construction**, avec le bâtiment terminé. Le plan et le cadre n’allouent pas de cellules de stockage et n’exposent pas de destination active. Cette décision remplace la proposition initiale d’allocation au chantier dans l’enquête privée.

`World.stockpiles` conserve les zones au sol. La vue dérivée `StorageCell`, `storageCells(world)`, `storageCellById(world,id)` et `storageAt(world,cell)` réunit ces zones et les cellules des étagères installées. La provenance `shelfId` permet de distinguer leur politique et leurs limites physiques. Les références historiques `CookingTask.storageId` et `HaulDestination.stockpileId` continuent d’identifier une cellule physique ; aucun ID virtuel négatif ni réemploi de l’ID du meuble comme cellule n’est nécessaire.

L’emballage conserve le bâtiment, sa politique et ses IDs de cellule. Ces cellules sont inactives tant que le meuble est emballé ; une réinstallation traduit leurs coordonnées depuis la nouvelle empreinte et réactive les mêmes identités. Les contenus restent au sol, avec leurs propres IDs : ils ne suivent pas le meuble et les IDs de cellule ne deviennent pas leurs propriétaires.

Le champ legacy `shelf.settings.capacity` est **canonique à500 et ignoré dans le calcul de capacité de l’étagère**. Copier une politique de réserve normalise ce champ à500. Il ne représente ni un quota de500unités, ni un plafond artificiel par pile, ni une multiplication de la limite d’une pile. La capacité réelle découle uniquement des **trois places par cellule**, de la compatibilité de fusion et du `stackLimit` de chaque `ItemDef`. Les zones historiques conservent leur propre capacité et une seule pile par cellule.

La commande `shelf-policy` vise le `structureId` installé. Les opérations de zone — agrandir, réduire, supprimer — restent limitées à `World.stockpiles`. Changer les filtres ne supprime ni ne déplace spontanément un contenu refusé ; celui-ci peut être repris vers un stockage admissible. L’interface doit montrer les places3/6, les piles et leurs IDs réels, les exclusions fixes et la copie indépendante.

## Frontières matérielles et adaptations

La capacité de placement et la capacité de stockage restent distinctes. Le placement proche ou d’interruption respecte aussi les exclusions physiques de l’étagère. Les réservations entrantes actives et en file occupent les places promises ; exclure le transport courant ne doit pas exclure toute la file du même acteur. Une arme de limite1 consomme une place entière, même si une autre arme partage son ItemId. Aucun départ seulement promis ne libère déjà une place.

Un dépôt doit réaliser la capacité annoncée : soit une fusion entière compatible, soit une nouvelle pile licite, soit un plan atomique de fusion/séparation. Les quantités, identités et états particuliers restent physiques. Les décisions peuvent recenser localement piles et réservations ; aucun cache global par identité d’un World mutable ne doit remplacer ces faits. Les budgets ordinaires de planification sont conservés.

Les consommateurs ordinaires peuvent prélever les contenus au contact. Les places exclusives de service, comme les ingrédients posés pour le travail, ne deviennent pas des places de stockage multi-pile. Les compteurs de factures, sources de nourriture, habillement et commerce doivent utiliser la même vue de stockage en conservant leurs distinctions historiques d’admission. Les meubles emballés restent exclus comme contenus d’étagère.

Le retrait partage le préflight des contenus, des cargos libérés, du meuble emballé et des matériaux rendus. Le placement dans une vue sans étagère occupe progressivement les cases prévues avant engagement. Les tâches et files visant les cellules devenues inactives doivent être libérées ou réorientées, tandis que les objets restent conservés. Certaines urgences Core peuvent perdre un objet si `GenPlace` échoue ; Elsewhere garde l’adaptation conservatrice de différer ou refuser atomiquement une restitution impossible, sans prétendre une parité de cette urgence.

Le schéma229 doit valider l’ancien228 avant migration neutre : aucune étagère, cellule ou dotation ajoutée à une ancienne partie, aucune pile déplacée. Fichier, checkpoint, RAW et MAIN strict partagent les gardes d’identité et de superposition. Une tolérance de trois piles ne concerne qu’une empreinte d’étagère installée valide ; ni un chantier ni un meuble emballé ne l’accordent.

Le rendu doit distinguer les piles par ID, y compris trois piles du même ItemId, avec trois positions dérivées. La sélection de carte et les boutons du contenu gardent ces identités. Cette présentation n’ajoute pas de hauteur physique aux règles de simulation.

Les groupes liés, le système général de détérioration environnementale et une parité Core exhaustive restent différés. La provenance et les choix ci-dessus ne certifient ni réussite des parcours, ni campagne naturelle, ni absence de régression, ni gain de performance.
