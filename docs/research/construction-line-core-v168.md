# Tracé des constructions — relecture Core

29 septembre 2026. Périmètre : RimWorld PC Core local **1.6.4871 rev590**, sans extrapoler aux extensions. Cette note prolonge la [recherche sur les chantiers](construction-reference.md) pour l'interaction Architecte. Corpus utilisateur : chapitre 10, SYS/TEST-056 et UI-019/020/024 ; ces identifiants décrivent les attentes, pas une validation locale.

## Sources et certitudes

- Installation locale en lecture seule : `E:/Steam/steamapps/common/RimWorld/Version.txt`, `Data/Core/Defs/ThingDefs_Buildings/Buildings_Structure.xml` (Wall et Fence), `Buildings_Power.xml` (PowerConduit), `Data/Core/Defs/DrawStyleCategoryDefs/DrawStyleCategories.xml` et `DrawStyleDefs/DrawStyles.xml`. **Certitude élevée pour 1.6.4871** : Wall, Fence et PowerConduit appartiennent respectivement aux catégories Walls, Defenses et Conduits, toutes héritées de Default1D. Cette catégorie propose Line, AngledLine, EmptyRectangle et EmptyOval ; Line est un style de tracé dédié, pas une succession de clics.
- [DesignationDragger](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/DesignationDragger.cs), [Designator_Place](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/Designator_Place.cs) et [Designator_Build](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Designator_Build.cs), miroir de code public non officiel, non certifié identique au binaire local. Le glisser collecte les cellules du style choisi ; `CanDesignateCell` filtre chacune, puis le placement crée des plans admissibles. **Certitude moyenne** pour les détails d'annulation, de frontière et d'ordre exact des cellules de ce miroir.
- Le [correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) signale des ajustements de livraison, cache et ordres de construction, sans définir la forme géométrique du geste.

## Décision pour Lisière

**Adopter** le maintien du clic, l'aperçu de cellules recevables, le relâchement pour émettre les plans et le refus local des cases bloquées. La ligne de murs, clôtures et câbles emploie la direction horizontale ou verticale dominante du déplacement, avec départage horizontal. Le joueur peut inverser son geste ; les cases déjà occupées ou incompatibles sont ignorées et comptées. Échap, clic droit, perte de capture ou changement d'outil annulent avant émission. Une seule commande ordonnée traverse le bridge ; les plans gardent les règles matérielles et de chantier existantes.

**Adapter** la catégorie Core à un seul style Line pour ce lot. AngledLine, rectangle vide et ovale vide restent absents, tout comme le choix de forme dans l'interface. L'algorithme de ligne locale n'est donc pas présenté comme une copie bit à bit de `DrawStyle_Line` du binaire installé.

Les zones de foyer, toiture, culture, réserve, sol et désignations de collecte/retrait possédaient déjà un rectangle glissé local. Les portes, portillons, meubles, postes et machines sont encore placés par clic, selon leur empreinte ; leur éventuel mode de tracé Core doit être vérifié définition par définition avant extension. L'annulation glissée existante reste un rectangle, y compris sur les nouveaux plans.
