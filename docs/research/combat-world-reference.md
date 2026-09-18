# Décor réel, visibilité et couvert — sous V54

18 septembre 2026. Chapitres 5/10/18/19 du corpus, **SYS/TEST-061, 102, 103, 106 et 119** : adopter les propriétés logiques du contenu, adapter leur représentation 3D et la capture spatiale ; différer l'interception et les dégâts au décor. [Contrat](../development/combat-world.md). Aucun tir joueur ajouté.

## Sources et version

Relecture Internet du miroir `2d508035082e7cb0c8e29e230d26bda6e546928f` (20 mai 2026), des définitions XML `85954e64ea75334f51e33e27a4128809191e430e` (7 septembre 2018, 0.19.2009rev486), et des fiches wiki actuelles ci-dessous. Les XML sont historiques ; le miroir n'identifie pas avec certitude le binaire commercial. La [mise à jour officielle 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) est postérieure au miroir. Certitude bonne sur les règles recoupées, sans garantie de parité de chaque exception avec l'exécutable récent.

## Règles revérifiées

[GenGrid](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GenGrid.cs) teste le bâtiment plein et l'état logique Open d'une porte. La possibilité de marcher sur un objet n'en déduit pas la visibilité : le générateur à bois remplit sa case pour le tir alors qu'il autorise le transit. Une porte logiquement ouverte est transparente même si son vantail finit son animation ; interdiction et maintien ouvert ne remplacent pas Open.

[CoverGrid](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/CoverGrid.cs) retient le plus grand remplissage brut par cellule. Les objets superposés ne cumulent pas leurs protections. Une porte ouverte reste donc le candidat devant un fragment dans sa case, puis son blocage vaut zéro selon [CoverUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/CoverUtility.cs). Les égalités Core dépendent de l'ordre d'enregistrement ; nous adoptons l'identifiant persistant le plus petit, faute de cet ordre historique dans nos sauvegardes. Cette adaptation peut changer l'objet choisi comme couvert à égalité, pas son coefficient.

[ThingDef](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ThingDef.cs) distingue remplissage nul (< 0,01), partiel et plein (> 0,99). Son profil de cible autorise le bénéfice du couvert aux personnages et tourelles, pas à tous les objets. Les futures requêtes d'attaque devront garder cette restriction ; l'adaptateur ne décide pas de la cible.

Le [générateur des cadres](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/ThingDefGenerator_Buildings.cs) attribue 0,20 au cadre d'un bâtiment, même si l'ouvrage terminé est un mur. Un plan n'est pas un mur transparent doté de son couvert final.

## Contenu adopté

Les fichiers XML primaires [mobilier](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings/Buildings_Furniture.xml), [production](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings/Buildings_Production.xml), [énergie](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings/Buildings_Power.xml), [température](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings/Buildings_Temperature.xml) et [fragments](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Misc/Various_Stone.xml) donnent les valeurs suivantes. Les héritages ont été suivis, pas seulement les balises de la définition enfant.

| Contenu présent | Remplissage brut | Blocage de base admissible | Recoupement actuel |
|---|---:|---:|---|
| Mur, massif/filon, porte fermée | 1 | 0,75 | [Couvert](https://rimworldwiki.com/wiki/Cover) |
| Générateur à bois | 1 | 0,75 | [Générateur](https://rimworldwiki.com/wiki/Wood-fired_generator) |
| Atelier de taille, fragment au sol | 0,50 | 0,50 | [Atelier](https://rimworldwiki.com/wiki/Stonecutter%27s_table), [couvert](https://rimworldwiki.com/wiki/Cover) |
| Lit, table, refroidisseur passif | 0,40 | 0,40 | [Couvert](https://rimworldwiki.com/wiki/Cover) |
| Tabouret, feu, lampe debout | 0,20 | 0,20 | [Feu](https://rimworldwiki.com/wiki/Campfire), [lampe](https://rimworldwiki.com/wiki/Standing_lamp), [couvert](https://rimworldwiki.com/wiki/Cover) |
| Arbre générique, buisson de baies | 0,25 / 0,20 | mêmes valeurs | [Pin](https://rimworldwiki.com/wiki/Pine_tree), [baies](https://rimworldwiki.com/wiki/Raspberry_bush) |

Les [bases de plantes](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Plants/Plants_Bases.xml) et [plantes tempérées](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Plants/Plants_Wild_Temperate.xml) confirment les valeurs. La routine de couvert lit la définition, sans multiplier par la croissance. Notre arbre reste générique : ce coefficient n'ajoute ni espèce de pin ni cycle de croissance d'arbre.

Riz, piquet, objets ordinaires, meuble emballé, cargaison et équipement ne donnent aucun couvert dans cette capture. Eau, terre et sol brut découvert ne bloquent pas la vue. **Adaptation explicite :** les petits cailloux décoratifs `Resource.rock` restent sans couvert ; ils ne sont pas les fragments `MaterialPile` transportables (0,50). Leur conversion future ne doit pas modifier silencieusement ce statut.

Le [projectile](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Projectile.cs) parcourt les objets potentiellement interceptés avec ses propres conditions. La grille du meilleur couvert ne peut donc pas servir de liste exhaustive des interceptions. Cette distinction reste à intégrer avec le vol ; pas de murs indestructibles ou d'interception universelle implicitement livrés ici.
