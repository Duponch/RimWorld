# Références des correctifs de présentation — V200

Relevé du 3 octobre 2026. Ce lot corrige la présentation existante selon les observations utilisateur, complétées par le suivi du pigment terrain sur l'herbe ; il ne crée pas de règle persistante. [Contrat](../development/needs-grass-clouds-v200.md).

## Repères Core humains

Installation locale en lecture seule, `Version.txt` : **1.6.4871 rev590**. DLL `Assembly-CSharp.dll` déjà identifiée dans la [recherche V199](colonist-ui-core-v199.md). Classes `Need_Food`, `Need_Rest`, `Need_Joy`, `Need_Beauty`, `Need_Comfort`, `Verse.RaceProperties` et `Need.DrawBarThreshold`, sorties de lecture ponctuelle ignorées sous `tmp/ui-v200/core/`. Aucun code ni asset Core distribué.

| Jauge | Traits visibles, % | Extrêmes existants sans trait Core |
| --- | --- | --- |
| Nourriture | 12, 24 | Zéro : famine |
| Sommeil | 14, 28 | Épuisement sous 1 |
| Plaisir | 15, 30, 70, 85 | Privation sous 1 |
| Beauté | 15, 35, 65, 85 | Affreux à 1, splendide à 99 |
| Confort | 10, 60, 70, 80, 90 | — |

Nourriture est spécifique à la race : dans Core, `FoodLevelPercentageWantEat` vaut 0,3 pour l'omnivore humain ; les repères sont multipliés par 0,4 et 0,8. Cette table ne devient pas un seuil universel des animaux. `DrawBarThreshold` place les marques dans la moitié inférieure, largeur 2 quand la barre dépasse 60 unités ; le trait est sombre si `seuil < niveau`.

Les positions correspondent déjà aux changements de pensées de `src/sim/mood.ts` et `recreation-rules.ts`. Les égalités de Beauté restent une différence locale : Core emploie `>` aux bornes, alors que la simulation locale conserve `<=1`, puis `<15`, `<35`, `<65`, `<85`, `<99`. V200 adopte les traits, pas une nouvelle mécanique de besoins.

Une recherche Internet ciblée n'a pas trouvé de documentation officielle détaillant ces seuils. L'[annonce Ludeon de la mise à jour 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) distingue le jeu de base de l'extension Odyssey ; elle ne prouve pas les nombres ci-dessus. Les miroirs de code non officiels et les wikis ne servent pas d'oracle primaire actuel. Les collages utilisateur servent à repérer le défaut visuel, sans certifier chaque pixel ou toutes leurs extensions.

## Sang : référence interne et API

L'empreinte de référence est **notre décalque au sol**, généré par `filthDecal` et son atlas alpha. Les racines utilisent le même hash GPU déterministe que l'herbe existante, sans PRNG de simulation. L'oracle doit reconstruire séparément position/UV/alpha et confronter les racines couvertes et découvertes d'une même cellule ; relire le masque calculé ne suffirait pas.

La [documentation primaire TextureNode](https://threejs.org/docs/pages/TextureNode.html) distingue prélèvement filtré et chargement d'un texel sans interpolation. Le champ entier compact emploie le second chemin pour extraire deux bits, avec Three **0.186.0** épinglé. Le masque quantifie l'intensité, mais doit préserver l'absence de pigment hors empreinte. Les termes de coût appartiennent à la preuve locale : une API de texture ne garantit ni coût GPU nul ni absence de surcoût significatif.

## Nuages : choix demandé

Augmenter le trou central de 27 à 31 % du petit côté, avec même raccord de 8 points, est une adaptation artistique utilisateur. Le modèle, les variantes procédurales et le masque d'élévation déjà livrés restent inchangés. Une comparaison native avec nuages cachés et témoin non masqué vérifie les pixels et la profondeur ; elle ne constitue pas une mesure globale de météo.

## Peinture terrain partagée

L'oracle graphique est l'atlas de notre `TerrainLayer`, déjà résident et partagé avec l'eau. Sur 250², il mesure 2000² pixels RGBA ; son alpha encode la rive/mousse, pas la présence d'herbe. La correspondance monde→texture et l'espace couleur doivent donc être conservés, et la carte de couverture de l'herbe reste distincte. Une lecture sommet LOD0 du RGB suffit à retrouver le pigment à la racine ; elle n'ajoute ni texture ni traitement par brin sur le CPU. Son coût GPU est établi seulement par la comparaison locale de la preuve, pas par la documentation de l'API.
