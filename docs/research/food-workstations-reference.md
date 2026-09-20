# Postes alimentaires — enquête V84

Relevé du 20 septembre 2026, Core local **1.6.4871 rev590**, consulté en lecture seule. Cette enquête porte sur les deux cuisinières et la table de boucherie ; elle ne valide pas tout le catalogue alimentaire ni l'équilibrage d'une colonie. [Contrat appliqué](../development/food-workstations.md).

## Corpus et provenance

Les chapitres 10–12 et 22 du HTML original ont été relus via [reference-adoption](reference-adoption.md) : SYS/TEST-056 (construction),062..064 (factures et transformation),070..072 (cultures),121..125 (filière animale),126..128 (chaleur, énergie, combustible), UI-025. Adopter matières livrées, consommation transactionnelle, poste et service réservés, reprise exacte ; adapter seulement les unités, la projection 3D et les sous-systèmes encore partiels. Ni ces identifiants ni une définition seule ne valent preuve de livraison.

Sources primaires locales : `Data/Core/Defs/ThingDefs_Buildings/Buildings_Production.xml`, `Buildings_Base.xml`, `RecipeDefs/Recipes_Meals.xml`, `Recipes_Butchery.xml`, `ThingDefs_Items/Items_Food.xml`, `Stats/Stats_Building_Special.xml`, `Rooms/RoomRoles.xml`. Classes observées : `Building_WorkTable`, `Building_WorkTable_HeatPush`, `CompRefuelable`, `CompProperties_Refuelable`, `JobDriver_Refuel`, `Toils_Recipe`, `RecipeDef`, `CompHeatPusherPowered`, `CompProperties_HeatPusher`, `StatPart_WorkTableRoomRole`, `StatPart_WorkTableTemperature`, `RoomRoleWorker_Kitchen`. Empreinte SHA256 de l'assembly installé : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Seuls les faits et leur interprétation sont consignés ; aucun XML, code décompilé ou sauvegarde personnelle n'est redistribué.

La recherche publique a été renouvelée : l'[annonce officielle 1.6 du 11 juin 2025](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) décrit le changement des postes selon le rôle de leur pièce. Elle confirme le principe, sans certifier les coefficients du correctif local 4871. Les fiches communautaires [cuisinière à bois](https://rimworldwiki.com/wiki/Fueled_stove), [cuisinière électrique](https://rimworldwiki.com/wiki/Electric_stove) et [table de boucherie](https://rimworldwiki.com/wiki/Butcher_table), consultées le 20 septembre, servent de confrontation ; les valeurs d'exécution ci-dessous viennent de l'installation précise.

## Paramètres vérifiés

| Paramètre | Cuisinière à bois | Cuisinière électrique | Table de boucherie |
|---|---|---|---|
| Définition | FueledStove | ElectricStove | TableButcher |
| Emprise |3×1|3×1|3×1|
| Interaction | milieu devant le poste ; orientation appliquée | identique | identique |
| Construction |80 acier|80 acier+2 composants|75 unités de matériau bois/métal+20 bois|
| Travail de base |2000 ticks Core|2000 ticks Core|2000 ticks Core avant facteur du matériau|
| Niveau Construction |pas de seuil explicite|4|pas de seuil explicite|
| Recherche |aucune|Electricity|aucune|
| Vitesse du poste |1|1|1|
| Rendement de boucherie |sans objet|sans objet|1, contre 0,7 à l'emplacement gratuit|
| Combustible |bois seul, capacité 50, vide à la construction|aucun|aucun|
| Consommation |160 bois/jour de travail effectif|350 W tant qu'alimentée, même au repos|aucune|
| Chaleur passive |4 par seconde Core si du bois reste|3 par seconde Core si alimentée|aucune|
| Chaleur de travail |0,1 par tick Core travaillé|identique|aucune|
| Rôle requis |Cuisine|Cuisine|aucun : la définition efface le rôle hérité|
| Passage / arrêt |supplément 50 Core ; traversable sans arrêt ordinaire|identique|identique|
| Surface / stockage |surface d'objets ; pas de superposition de zone|identique|identique|
| Minification |oui|oui|oui|

La table en bois retenue en V84 coûte donc **95 bois** et prend **1400 ticks Core** avant vitesse du constructeur : la base 2000 est multipliée par le facteur bois 0,7 déjà modélisé. Le choix d'une table fixe en bois est une tranche de catalogue explicite ; les variantes métalliques de Core ne sont pas proposées.

Les trois définitions ont 180 PV de base, inflammabilité 1 et remplissage 0,5. Seul le remplissage entre dans les systèmes déjà applicables aux trois nouveaux meubles ; santé/destruction/incendie génériques des meubles ne sont pas ajoutés ici. La table porte aussi une propreté −15 dans Core : cette propriété est **une référence différée**, pas un effet livré. Le calcul infectieux actuel reste fondé sur le terrain ; sang, salissures, nettoyage et intoxication ne sont pas introduits par ces postes.

## Exécution et contreparties

Le réservoir de la cuisinière bois commence vide : `initialFuelPercent` n'est pas renseigné et sa valeur initiale est zéro. L'automatisme est activé, seuil 30 %. Le service de ravitaillement dure 240 ticks Core après trajet au poste ; la sélection et le transport du bois sont distincts. `consumeFuelOnlyWhenUsed` fait consommer le bois pendant l'action de recette, sans dépense pendant collecte, attente ou transport de sortie. Un bois représente 375 ticks Core de travail. Les temps de cuisine varient avec Cuisine, lumière, température, extérieur et rôle : ce n'est pas une taxe d'un bois par repas.

`CookMealSimple` prend son travail depuis le produit : 300 ticks Core, dix ingrédients actuels de nutrition 0,05 pour un repas de nutrition 0,9. `ButcherCorpseFlesh` demande 450 ticks Core, utilise Cuisine et les rendements anatomiques. La vitesse et le rendement sont des statistiques distinctes ; une table à rendement 1 ne promet pas une quantité fixe de viande, et le 0,7 de l'emplacement ne ralentit pas son travail. Le rendement du travailleur, ses lésions et les arrondis des deux produits restent séparés.

Les ingrédients sont placés sur l'emprise du poste dans la classe locale. V84 exploite réellement ses trois cellules de surface, chacune limitée à une pile selon notre contrat de sol. Le service devant le poste reste exclusif. Les postes historiques conservent leurs dépôts adjacents : aucune tâche chargée n'est déplacée.

Une cuisinière sans courant ou sans bois ne peut préparer une facture. Le travail local suit le contrat existant des recettes sans ouvrage : une interruption remet la progression à zéro, mais conserve ingrédients, âge et cargaison ; sauvegarder puis recharger une tâche active conserve son travail. La sortie déjà produite continue à être portée et rangée même si l'énergie s'interrompt.

Le rôle Cuisine est calculé, pas choisi manuellement :28 points par cuisinière de production alimentaire. Les scores des autres rôles gardent leurs règles et priorités. Une cuisinière dans une pièce intérieure d'un autre rôle subit 0,8 ; dehors, le facteur extérieur0,8 est distinct et le malus de rôle ne s'ajoute pas. La table de boucherie ne réclame aucun rôle et ne crée pas à elle seule une cuisine dans le catalogue présent. Aucun bonus d'hygiène n'est lié au libellé Cuisine.

Les cuisinières n'ont pas de source lumineuse dans les définitions consultées. Leur chaleur est réelle mais distincte de la lumière : au repos, un poste bois encore alimenté émet 4 chaleur/seconde sans consommer son bois ; l'électrique émet 3. Pendant travail, 6 chaleur/seconde s'ajoutent. Core applique des impulsions ; Lisière conserve l'intégration continue et les volumes de ses pièces.

## Divergences tranchées

- Le wiki du poste bois parle par endroits d'un seuil froid à 5 °C ; la classe locale `StatPart_WorkTableTemperature` donne **9 °C**, borne chaude 35 °C et facteur 0,7 hors intervalle. La valeur locale s'applique aux nouveaux postes, via le facteur thermique déjà partagé ; aucune accélération de culture ou d'horloge n'en découle.
- « Un bois par repas simple » n'est pas une constante générale : 375 ticks par bois contre 300 travail par repas donnent 0,8 bois dans les conditions neutres, et davantage avec ralentissement. Le code consomme la durée de travail, jamais le nombre de repas.
- La base 2000 de construction de la table ne doit pas masquer le facteur de son matériau : table bois 1400 Core, cuisinières acier 2000 Core. La variante bois est seule livrée.
- Le prérequis Core Electricity est constaté. Notre accès électrique reste celui du scénario et des appareils existants, déjà disponibles sans arbre électrique complet ; V84 n'invente pas un nouveau projet pour la seule cuisinière. Crashlanded connaît l'électricité dans la référence ; les camps historiques restent inchangés. Cette disponibilité globale est une adaptation, pas la livraison de toute la recherche Core.
- La simulation travaille à 6 Hz avec 10 ticks Core par pas local. La réserve conserve 600 unités par bois ; 16 unités sont brûlées par pas travaillé, fraction finale proportionnelle. La quantification du temps d'apprentissage reste au pas local comme les autres recettes ; elle n'autorise ni combustible gratuit ni remise à zéro à la sauvegarde.

La cuisson avancée, les lots de repas, les croquettes, les autres espèces, l'intoxication, les pannes aléatoires, les interrupteurs manuels, les conduits/batteries et la propreté de pièces restent distincts. Les scènes de test décrivent des fixtures contrôlées ; seule une colonie développée depuis son vrai départ permet d'observer la progression, sans transformer sa durée en garantie d'autonomie.
