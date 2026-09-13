# Catalogue de contenu : couverture connue

État du 13 septembre 2026. Le jeu de base complet, y compris ses centaines d'objets et leurs variantes, reste la cible. Le bilan par [système](implementation-status.md) ne suffit pas à suivre ce contenu. Ce document distingue ce que contient notre référence et ce qui existe dans le jeu développé.

## Le corpus ne contient pas un inventaire exhaustif à jour

Les trois originaux de [new_docs](../research/reference-adoption.md) contiennent un rapport HTML/PDF identique et un classeur. La feuille **Contenu** décrit **95 familles CAT**, jeu de base et extensions confondus : des exemples, des champs attendus et une provenance. Elle ne compte pas 95 objets individuels. Sa colonne G indique que les définitions ne sont pas acquises. Les 227 entrées STAT décrivent des champs à relever, sans valeurs de profils.

Les chapitres 1, 4, 11, 31 et 34 précisent eux-mêmes cette limite. Leur référence éditoriale est PC 1.6 ; aucun manifeste de définitions réellement chargées dans une installation identifiée n'accompagne les documents. Nous ne pouvons donc certifier ni un nombre total, ni l'actualité d'une liste individuelle. Les scripts d'inventaire et le squelette d'exporteur annoncés au chapitre 31 **ne font pas partie des trois fichiers reçus** ; ils n'ont pas été exécutés localement.

Une future acquisition devra conserver version exacte, modules et ordre de chargement, identifiants, héritage, références, définitions générées et erreurs. Un relevé XML brut ne suffit pas à résoudre les valeurs calculées. Matériau, qualité, usure et état d'un objet sont des variantes, pas nécessairement des définitions distinctes. Les valeurs inconnues restent inconnues. Aucun pourcentage de complétude n'est calculé sans dénominateur vérifié.

## Petit catalogue réellement disponible

| Registre / identifiant local | Usage livré | Limites |
|---|---|---|
| Objet `wood` | Bois récolté, piles, portage et construction ; CAT-005. | Espèces, masse, combustible, dégâts et autres propriétés non implémentés. |
| Objet `berries` | Baies récoltées, 0,05 nutrition/unité, piles de 75, ingestion de plusieurs unités ; CAT-011. | Pourrissement, intoxication et maturité du buisson absents. |
| Objet `survival-meal` | Repas de survie du départ, 0,9 nutrition/unité, piles de dix ; CAT-015. | Recette, ingrédients, recherche et détérioration absents. Le scénario local donne 18 repas ; ce n'est pas Crashlanded. |
| Objet `legacy-portion` | Compatibilité des sauvegardes V1–V4 : 0,35 nutrition/unité, piles de 75. | Ce n'est aucun objet de RimWorld ; absent des nouvelles parties. |
| Ressources `tree`, `berries`, `rock` | Arbre générique, buisson générique, pierre au sol. | Pas un catalogue d'espèces ou de roches. Arbre abattable et buisson récoltable ; minage absent. |
| Structures `wall`, `bed`, `table`, `stool` | Mur, lit, table 1×2, tabouret, construits en bois. | Aucun ensemble complet de mobilier, matériaux, qualité ou dégâts. |
| Terrains `grass`, `soil`, `water`, `rock` | Prairie, sol, eau et massif procéduraux. | Quatre classes locales ; ne correspondent pas à quatre définitions exhaustives du jeu original. |

Le [registre d'objets](../../src/sim/items.ts) est utilisé par simulation, piles et interface. [Definitions](../../src/sim/definitions.ts) contient les constructions et commandes actuelles. Une entrée présente ne signifie pas que tous ses comportements sont livrés : par exemple, un repas disponible au départ ne signifie pas que sa recette existe.

Le contenu restant comprend notamment métaux et pierres, composants, textiles et cuirs par espèce, aliments/cultures/viandes/œufs, repas et ingrédients, médicaments/drogues, organes/prothèses, armes/projectiles, vêtements/armures, mobilier, sols/portes/toits, ateliers, énergie, dispositifs défensifs, art, plantes et animaux. Le détail individuel et ses liens aux recettes, recherches, biomes et systèmes seront acquis et implémentés progressivement. Les DLC restent après G5.

Chaque ajout doit avoir un identifiant stable, famille CAT, source/version et champs confirmés, règles réellement disponibles, variantes encore absentes, référence de test et représentation. Les noms traduits ne servent jamais d'identifiants de sauvegarde.

L'inventaire des personnes, leurs vêtements et les portraits ont un [contrat distinct](../development/character-presentation.md), actuellement prévu et non livré.
