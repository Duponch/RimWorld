# Matières biologiques — référence V91

Consultation du 21 septembre 2026. Périmètre : Core sans extension ; compléter les chaînes existantes de boucherie, cuisine et confection avec les espèces du lot. Le chapitre 11 du corpus et les contrats `tailoring.md`, `apparel-renewal.md`, `butchery.md` et `food-poisoning.md` restent applicables. Aucun chronomètre de partie personnelle ne fixe ces règles.

## Sources et arbitrages

- Installation locale RimWorld **1.6.4871**, `Data/Core/Defs/ThingDefs_Items/Items_Resource_Stuff_Leather.xml` : héritage LeatherBase, Leather_Plain, Leather_Bluefur et Leather_Camel. Lecture seule ; ni XML ni code du jeu redistribués.
- Même installation, `Items_Resource_RawPlant.xml`, RawAgave et son parent PlantFoodRawBase : fruit cru, nutrition 0,05, pensée alimentaire négative et pourriture après 25 jours.
- Recoupement Internet : [cuirs](https://rimworldwiki.com/wiki/Leathers), [fourrure bleue](https://rimworldwiki.com/wiki/Bluefur), [fruit d’agave](https://rimworldwiki.com/wiki/Agave_fruit), [table des matériaux vestimentaires](https://rimworldwiki.com/wiki/Template:Apparel_Material_Table), [isolation contre la chaleur](https://rimworldwiki.com/wiki/Insulation_-_Heat_%28Material_Factor%29). Pages communautaires consultées pour recouper les effets ; les valeurs de l’installation datée déterminent l’implémentation.

| Matière | Isolation froid / chaleur du matériau | Armure tranchant / contondant / chaleur | Conséquence obtenable |
|---|---|---|---|
| Cuir ordinaire | 16 / 16 | 0,81 / 0,24 / 1,5 | Cerf ou gazelle puis boucherie et confection |
| Fourrure bleue | 20 / 16 | mêmes valeurs | Muffalo puis vêtements offrant davantage d’isolation contre le froid |
| Cuir de dromadaire | 16 / 24 | mêmes valeurs | Dromadaire puis vêtements offrant davantage d’isolation contre la chaleur |

Les facteurs propres à chaque famille vestimentaire et à la qualité s’appliquent ensuite. Exemple à qualité normale : parka en fourrure bleue 40 °C d’isolation contre le froid ; cache-poussière en cuir de dromadaire 20,4 °C contre la chaleur. Il ne s’agit pas d’une température corporelle garantie : vêtements superposés, état du personnage et environnement restent communs.

Le facteur de PV du matériau 1,3 s’applique aux nouveaux vêtements. Les vêtements historiques en tissu/cuir léger conservent leurs PV V90 ; cette divergence antérieure est signalée et ne doit pas être corrigée silencieusement par migration. Les trois matières ajoutent chacune les cinq familles existantes, avec coût, travail, auteur, qualité, usure, mise en réserve et port physiques. Les fauteuils et le catalogue commercial conservent leur périmètre actuel.

## Conservation et limites

Les viandes ont des identités par espèce, une nutrition commune et deux jours avant pourriture ; les fruits d’agave passent par la même sélection alimentaire, pensée de cru, risque d’intoxication et recette de repas simple. Les nouveaux ingrédients sont autorisés dans les nouvelles factures/régimes ; leur absence dans un ancien filtre reste un refus. Une ancienne partie n’est pas réapprovisionnée.

Une grande dépouille peut produire plusieurs piles. Toute place, identité et quantité est prévalidée avant consommation de la dépouille ou tirage de rendement. Une seule pile principale est portée ; surplus de viande et cuir occupent réellement le sol, sans dépasser 75 unités par pile. Un manque de place reporte la transformation sans perte ni changement d’aléa.

Le lièvre des neiges est préparé dans le code mais n’est pas obtenu dans les trois milieux livrés : les définitions locales le placent dans la toundra. Il ne compte donc pas comme nouvel animal jouable de ce lot. L’élevage, la reproduction, la tonte, la traite, les prédateurs, la laine et la toundra restent distincts.
