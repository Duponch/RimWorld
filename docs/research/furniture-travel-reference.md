# Circulation du mobilier — vérification Core V22

Recherche renouvelée le 14 septembre 2026. Périmètre : constructions déjà présentes, coût du passage, répétition entre cases et différence entre traverser et s'arrêter. Aucun nouveau contenu. Corpus chapitres 5 et 21, SYS-020..022 et SYS-113..117 : **adopter** la séparation occupation/passage/arrêt ; **adapter** algorithme et volumes 3D ; **différer** profils hostiles, portes, sols et statistiques non livrés. TEST associés enrichissent F1/F2/F3, pas une suite par ligne.

## Sources et confiance

Les pages actuelles du wiki communautaire [table 1×2](https://rimworldwiki.com/wiki/Table_(1x2)), [lit](https://rimworldwiki.com/wiki/Bed), [feu de camp](https://rimworldwiki.com/wiki/Campfire), [tabouret](https://rimworldwiki.com/wiki/Stool) et [piquet](https://rimworldwiki.com/wiki/Horseshoes_pin) ont été relues. La [propriété Passability](https://rimworldwiki.com/wiki/Property:Passability) distingue Standable, PassThroughOnly et Impassable. Les pages donnent respectivement 42/42/42/30/14 de coût ; table, lit et feu sont traversables sans arrêt ordinaire. Les autres sont standables. Une propriété absente d'une fiche n'est pas à elle seule la preuve du défaut.

Contre-vérification de la logique dans le miroir communautaire décompilé Chillu1, commit **2d508035082e7cb0c8e29e230d26bda6e546928f**, daté du 20 mai 2026 : [PathGrid](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/PathGrid.cs), [Pawn_PathFollower](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/Pawn_PathFollower.cs), [GenGrid](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GenGrid.cs), [BuildableDef](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/BuildableDef.cs) et [PathFinder](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/PathFinder.cs). Les fichiers téléchargés pour lecture sont dans tmp ignoré ; aucun code commercial n'est incorporé au moteur.

Le wiki et le miroir sont deux supports communautaires, pas deux certifications indépendantes du binaire actuel. Le miroir précède le correctif 1.6.4850 de juin 2026. Confiance forte sur la séparation et l'algorithme observés, moyenne sur l'équivalence des coefficients avec la dernière version installable ; aucune promesse de conformité à 100 %.

Les définitions archivées de 2018 consultées auparavant donnaient notamment 60 pour lit/table, 50 pour feu et 10 pour piquet. **Ne pas réutiliser ces nombres historiques** : V22 adopte les valeurs des fiches actuelles, avec cette limite de provenance. Le tabouret reste à 30.

## Règles retenues

- Le coût du bâtiment s'ajoute à la durée de base de l'arête. Il ne remplace pas la distance diagonale.
- `pathCostIgnoreRepeat` vaut vrai par défaut. Le qualificatif de répétition exige un coût au moins égal à 25 dans le code observé.
- L'entrée dans un objet qualifiant ne répète pas son supplément si la cellule précédente contient **un quelconque** objet qualifiant. Ce n'est pas limité au même meuble : tabouret → table et lit → table suppriment aussi le supplément.
- Piquet et cadre, coût 14, ne qualifient pas ; leurs coûts se répètent.
- `CalculatedCostAt` combine plusieurs sources de coût par maximum, avec les conditions du moteur, pas par une addition aveugle des objets/sol/neige. Lisière n'a qu'un ouvrage par cellule et n'implémente pas encore cette combinaison environnementale complète.
- `Standable` vérifie le terrain et les objets. Un travail ordinaire ne doit pas terminer sur une table, un feu ou un cadre. Dormir dans un lit est un usage explicite avec réservation, distinct de l'arrêt générique.

## Adaptations et reste ouvert

Le moteur utilise 6 000 ticks/jour au lieu de 60 000 : suppléments convertis par dix. La base de marche **3 ticks/cellule reste provisoire** ; cela ne certifie pas la vitesse relative au temps quotidien de RimWorld. Recherche 1000/1414 et coûts arrondis ; durée physique avec √2 exact et report de fraction.

Le personnage monte sur le plateau/matelas/tabouret grâce aux poses GPU existantes ; hauteur graphique sans étage jouable. La montée occupe le premier tiers de l'arête, la descente son dernier tiers. Cette interprétation évite de traverser le plateau avec le corps ; pas d'escalade animée dédiée ni de résolution physique de collision. Les petites pierres du feu et le piquet restent des volumes stylisés sans élévation de trajet dédiée.

Après interruption sur un meuble, rejoindre réellement une cellule d'arrêt est une règle locale explicite, sous budget de navigation. Elle ne prétend pas recopier tous les Toils de recherche de place du moteur original. Les replis de repas restent déterministes et locaux. Les coûts des sols, plantes, objets, neige, portes, santé, équipement, animaux et profils de combat seront vérifiés lors de leur intégration. Ne pas déclarer la navigation ou la construction complètes.

Le [contrat implémenté](../development/furniture-travel.md) et les [preuves](../development/validation.md) séparent ces choix des résultats mesurés.
