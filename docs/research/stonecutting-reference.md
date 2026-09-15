# Taille de pierre — vérification du 15 septembre 2026

RimWorld PC Core 1.6 ; [contrat local V32](../development/stonecutting.md). Corpus original, chapitre 11 relu, **SYS/TEST-062..064 et UI-025** : adopter recette/ingrédients/facture/produit séparés et conservation ; adapter horloge, présentation 3D et catégories de filtre ; différer paramètres avancés, objets inachevés d'autres recettes et statistiques absentes. Les statuts du corpus ne sont pas des preuves locales.

## Sources confrontées

- [Stonecutter's table](https://rimworldwiki.com/wiki/Stonecutter%27s_table), révision observée 180745 : Artisanat, pas d'XP, rendement indépendant du niveau, recherche des fragments sans désignation de transport. Factures générales ou par roche. Recoupement communautaire actuel.
- [Stone chunk](https://rimworldwiki.com/wiki/Stone_chunk), révision observée 180379 : un fragment devient vingt blocs correspondants, 1 600 ticks Core. Distinguer les cinq roches Core de Vacstone d'Odyssey, exclue ici.
- [Définitions de production Core historiques](https://github.com/RimWorld-zh/RimWorld-Core/blob/master/Core/Defs/RecipeDefs/Recipes_Production.xml) : MakeStoneBlocksBase, ingrédient un, travail 1600, ajustement de cible 20. Miroir ancien, insuffisant seul pour les coefficients actuels.
- [Bill_Production](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Bill_Production.cs) et [RecipeWorkerCounter_MakeStoneBlocks](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/RecipeWorkerCounter_MakeStoneBlocks.cs), code miroir relu ce jour. Une itération décrémente `repeatCount` d'un ; la cible de stock utilise un compteur séparé. Le compteur « any stone » somme **tous les blocs**, indépendamment du filtre d'ingrédients. L'ajustement 20 est le pas des boutons de cible, pas une division du stock par vingt. Miroir inspectable, sans certification de correspondance exacte au binaire actuel.
- [Ludeon 1.6.4850, 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : correction du rendement de la recette générale, affecté à tort par le réglage de boucherie. Notre recette a un rendement fixe indépendant.
- [Work Speed Factor](https://rimworldwiki.com/wiki/Work_Speed_Factor) et [atelier Core publié](https://rimworld.huijiwiki.com/wiki/Data%3AThingDef_TableStonecutter.json) : facteur hors pièce adaptée 0,8 récent ; l'ancien facteur 0,9 n'est pas retenu. Sans pièces ni toits, nos ateliers sont tous extérieurs.

[Blocs de granite](https://rimworldwiki.com/wiki/Granite_blocks), relus lors de la vérification du transit : pile 75, coût de passage 14. Appliquer le même supplément que l’acier, 1,4 tick local ; arrêt sur la pile autorisé, coût conservé sur les arêtes déjà engagées. Les données historiques ResourceBase divergent sur 15 : voir la [recherche acier](steel-reference.md).

Confiance forte sur ratio, métier, absence d'XP et besoin de transporter le fragment ; moyenne sur parité numérique complète et compteurs de tous les conteneurs, dont beaucoup sont absents ici.

## Pièges corrigés et limites connues

Le paragraphe du wiki concernant la quantité d'une facture porte une mention de vérification. Ne pas le généraliser : **X fois compte les opérations**, « jusqu'à X » compte les blocs. L'interface explique cette unité. Notre recette générale propose les cinq filtres ; les raccourcis de recettes individuelles restent absents. Même avec un seul filtre, sa cible compte donc tous les blocs, conformément au compteur général inspecté.

La page [Global Work Speed](https://rimworldwiki.com/wiki/Global_Work_Speed), relue, est contradictoire : elle annonce 0,3 à lumière nulle mais une formule commençant à 0,8 pour l'intervalle suivant. [StatPart_Glow](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/StatPart_Glow.cs) lit une courbe de définition, sans résoudre ses points dans ce fichier. **Ne pas adopter l'une de ces valeurs arbitrairement.** La lumière fonctionnelle et les capacités des personnes restent absentes, distinctes de notre ciel et de la lumière agricole. G2 doit résoudre les données exactes et appliquer les facteurs aux métiers concernés ensemble. Le coefficient extérieur 0,8 donne 200 ticks locaux pour cette recette à vitesse neutre ; ce n'est pas une simulation complète de General Labor Speed.

Pas d'ouvrage inachevé pour cette recette : avant conversion, interrompre remet le travail à zéro et conserve les ingrédients ; sauver/recharger conserve la progression. Après conversion, le produit reste porté ou déposé. Les blocs n'ont ni nutrition, ni pourriture, ni qualité. Masse/capacité de portage générale, dégâts/détérioration, propreté, confort au travail, recherche et constructions en pierre restent explicitement non livrés. Le produit groupé de vingt blocs est porté entier avant dépôt, alors que le transport ordinaire garde sa limite provisoire de dix unités.

Relecture V36 du même jour : la [recherche lumière/pièces](work-environment-reference.md) résout les points de WorkSpeedGlobal et remplace le coefficient extérieur fixe. Les limites historiques ci-dessus ne décrivent plus le consommateur de production courant.
