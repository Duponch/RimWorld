# Désinstaller et réinstaller — vérification V25

Consultation du 14 septembre 2026, RimWorld de base. Corpus : chapitre 10, **SYS-059 / TEST-059**, avec SYS-005/051/056/058. **Adopter** un objet conservé entre retrait, portage et pose ; **adapter** volumes/contacts 3D et cadence locale ; **différer** les propriétés et fournisseurs non encore présents. La provenance Odyssey associée à cette entrée du corpus ne suffit pas à établir les détails du jeu de base.

## Sources confrontées

- [Orders](https://rimworldwiki.com/wiki/Orders) décrit désinstallation, objet emballé et réinstallation. Le wiki est communautaire : il confirme la boucle, sans remplacer l'exécution du moteur.
- [Bed](https://rimworldwiki.com/wiki/Bed) et [Horseshoes pin](https://rimworldwiki.com/wiki/Horseshoes_pin) confirment que ces meubles sont déplaçables ; le piquet n'a pas de qualité. Les coûts historiques locaux des lits restent distincts des valeurs de référence.
- [Work](https://rimworldwiki.com/wiki/Work) situe la désinstallation dans Construction. Il faut distinguer retrait et transport de l'objet vers son plan.
- Miroir de code décompilé, révision **2d508035082e7cb0c8e29e230d26bda6e546928f** (20 mai 2026) : [JobDriver_Uninstall](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobDriver_Uninstall.cs), [JobDriver_RemoveBuilding](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobDriver_RemoveBuilding.cs), [Blueprint_Install](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Blueprint_Install.cs), [WorkGiver_ConstructDeliverResources](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_ConstructDeliverResources.cs), [Toils_Construct](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Toils_Construct.cs), [JobDriver_HaulToContainer](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/JobDriver_HaulToContainer.cs), [Building_Bed](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Building_Bed.cs).

Le miroir expose l'exécution mais n'est ni une distribution officielle ni une validation sur une installation locale identifiée. Confiance élevée sur ces branches consultées, modérée sur leur parité avec toute version actuelle ; les sources communautaires et le miroir ne sont pas totalement indépendants.

## Décisions et pièges vérifiés

La désinstallation utilise par défaut 200 unités de travail et ConstructionSpeed. Notre profil sans compétence utilise 12 ticks locaux, conversion arrondie de 200 / 17. Le déplacement direct peut retirer le meuble avant de l'emporter ; un meuble déjà emballé est pris au sol. La pose réutilise l'objet intérieur : elle ne reconstruit pas un autre exemplaire en consommant ses matériaux.

**150 n'est pas un délai de pose établi.** `Blueprint_Install.WorkTotal` fournit cette valeur à l'inspection, mais le parcours `HaulToContainer` ne calcule sa durée que pour un conteneur de type `Building`. Le plan est un `ThingWithComps`. La définition de base des plans n'ajoute pas de propriétés de bâtiment. La chaîne consultée attend donc zéro puis matérialise l'objet ; notre pose intervient au traitement du tick d'arrivée, sans phase de 15 ticks inventée depuis l'affichage.

`Building_Bed.DeSpawn(Vanish)` conserve les propriétaires. La propriété locale reste donc liée à l'identité du lit, même emballé. Son usage de couchage reste indisponible jusqu'à sa pose. Les autres états médicaux/qualités/dégâts ne sont pas implémentés et ne sont pas prétendus préservés.

## Limites assumées du lot

Le fournisseur actuel relève de Construction, y compris pour le portage. Le fournisseur par Transport seul, le rangement automatique des meubles emballés en réserve et leur dégagement automatique sont à compléter avant de déclarer la logistique des objets entiers terminée. Un paquet gênant doit être réinstallé ailleurs. Les quatre types présents admis sont lit, table, tabouret et piquet ; mur et feu ne le sont pas. Aucun matériau, qualité, masse ou objet nouveau n'est ajouté.

Les paquets occupent une cellule exclusive ; l'emballage et le portage sont des volumes procéduraux provisoires. Les volumes complets réapparaissent à la pose et leurs contacts suivent l'empreinte tournée. Voir [contrat](../development/furniture-transfer.md) et [preuves](../development/validation.md).
