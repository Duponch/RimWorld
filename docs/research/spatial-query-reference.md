# Accès, arrêt et sélection — relecture du 15 septembre 2026

Cible Core PC 1.6. Corpus chapitres 5/14/21, SYS-020..022, SYS-080 et SYS-113..117 : **adopter** occupation/passage/arrêt distincts et place physique de loisirs ; **adapter** l'algorithme interne ; **différer** dangers, profils hostiles, météo et pièces encore absents. [Contrat local](../development/spatial-queries.md).

## Sources confrontées

- [ThingGrid](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/ThingGrid.cs) et [EdificeGrid](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/EdificeGrid.cs), miroir de code : index par cellule et enregistrement des emprises. Cela confirme l'intérêt de requêtes spatiales ciblées ; nous gardons une capture locale plutôt qu'une copie de cette architecture avec invalidations globales.
- [GenGrid](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/GenGrid.cs) : `Standable` inspecte terrain et objets ; être traversable ne suffit pas pour s'arrêter. [StoreUtility](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/StoreUtility.cs) distingue acceptation et priorité de rangement. Notre élagage conserve le classement local existant ; il ne prétend pas reproduire tous les départages du moteur commercial.
- [RCellFinder](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/RCellFinder.cs), `TryFindSkygazeCell` et `IsGoodDestinationFor` : destination admissible, toit, région extérieure, interdictions et dangers sont des conditions distinctes. [JoyGiver_Skygaze](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JoyGiver_Skygaze.cs), récupéré directement après échec du cache web : pluie et conditions extérieures filtrent aussi l'activité. Les conditions météo et de pièce restent à livrer en G2.
- [Fragments](https://rimworldwiki.com/wiki/Stone_chunk) et [Chunk](https://rimworldwiki.com/wiki/Chunk), wiki communautaire relu : transport désigné, distinction pierre/bloc, franchissement ralenti et non-répétition. Ces pages ne suffisent pas seules à certifier tous les modes d'arrivée. L'interdiction locale d'arrêt sur fragment est déjà le contrat V28 ; le correctif aligne son index de loisirs sur l'exécution existante.
- [Correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : repère de version actuel recontrôlé. Il ne certifie pas l'identité du miroir décompilé avec le binaire installé.

## Décision et incertitude

L'optimisation supprime des lectures sans effet sur le choix final ; elle ne modifie ni vitesse de marche, ni coût diagonal, ni quantité portée, ni budgets. Comparer les états autoritaires, les cas inaccessibles et les égalités, puis les percentiles sur le même scénario. Aucun résultat de FPS n'est déduit du seul benchmark CPU.

Le désaccord sélection/exécution des loisirs sur fragments est un bug local confirmé par reproduction (`direct=false`, `indexé=true`), pas une liberté de gameplay. Correction explicite et test du retrait de l'obstacle. Confiance élevée sur cette cohérence interne et les séparations recoupées ; moyenne sur la correspondance exacte au binaire Core. Les fichiers du même miroir ne sont pas des confirmations indépendantes. Les coefficients et comportements manquants ne sont pas déclarés conformes à 100 %.
