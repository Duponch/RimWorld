# Atelier de taille — vérification du 15 septembre 2026

Référence éditoriale : RimWorld PC Core 1.6. [Contrat livré](../development/stonecutter.md). Cette tranche V31 livre l'objet atelier, sa construction et ses transferts ; elle ne livre pas encore les recettes de taille.

## Corpus et sources fraîches

Chapitres 5/10/11 lus dans le HTML original ; SYS/TEST-020..022 et 051..064 guident empreintes, livraison, retrait et production. **Adopter** empreinte logique distincte du rendu et transactions matérielles ; **adapter** horloge et représentation 3D ; **différer** recettes/produits et recherche au prochain domaine concerné. Le chapitre 11 distingue justement recette, travail, ingrédients, produit et bâtiment : disposer de l'atelier ne clôt pas la production. [Adoption du corpus](reference-adoption.md).

- [Wiki anglais : Stonecutter's table](https://rimworldwiki.com/wiki/Stonecutter%27s_table), consulté le 15 septembre : dimensions, coûts, durée, déplacement, recherche et propriétés. Recoupement communautaire actuel, pas certification d'un binaire local.
- [Données Core publiées par Huiji : TableStonecutter](https://rimworld.huijiwiki.com/wiki/Data%3AThingDef_TableStonecutter.json), index consulté le même jour. Définitions et héritages publiés : `BenchBase`, surface d'objet, interdiction de zones, case de travail et profil de passage ; `workTableNotInRoomRoleFactor=0.8`. L'ouverture directe échoue mais le moteur de recherche restitue ces champs et leur provenance Core. Pas de manifeste de version complet acquis.
- [Définitions historiques inspectées](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings/Buildings_Production.xml), commit du 7 septembre 2018. `TableStonecutter` et son parent `BenchBase` lus en XML. Coûts, taille, surface et recherche concordent ; ce miroir est ancien et **n'est pas la source de coefficients actuels sans recoupement**.
- [Ludeon, correctif 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), relu : correction du rendement de la facture de blocs, qui ne doit pas suivre le multiplicateur de boucherie. Point à conserver pour la prochaine tranche de production.

## Règles adoptées pour l'objet

| Règle Core recoupée | Décision V31 |
|---|---|
| Atelier 3×1 tournable, cellule de travail devant le centre | Empreinte centrée sur l'ancre, quatre orientations ; plateau et outils générés en code. La case de travail sera utilisée par les recettes, aucune activité de taille simulée ici. |
| 75 matériau compatible bois/métaux + 30 acier fixes | Bois : 75 bois + 30 acier. Acier : agréger en 105 acier avant les réservations, sans doubler une exigence du même type. Autres métaux absents du catalogue. |
| Travail de construction 2 000 ticks Core ; facteur bois 0,7 | 140 ticks locaux en bois, 200 en acier, avec la conversion temporelle déjà documentée. Compétences neutres, qualité et HP absents. |
| Surface `Item`, zones interdites, objet minifiable | Piles compatibles conservées sur les trois cellules, zones retirées conservativement ; désinstallation, paquet, rangement et réinstallation du même objet. |
| Traversable, arrêt ordinaire interdit, coût d'entrée 50 | Supplément local de 5 ticks ; suppression de répétition suivant le contrat de mobilier existant. Les trajets conservent leurs arêtes capturées. |
| Déconstruction rend environ la moitié des ingrédients | Prévalidation atomique de tous les types : 37–38 bois + 15 acier, ou 52–53 acier. Un échec ne supprime ni atelier ni matière et ne consomme pas le tirage. |

**Contradiction repérée :** l'ancien XML donne `pathCost=70`, les deux sources actuelles donnent 50. Retenir 50, confiance moyenne sur la version exacte, et conserver cette différence plutôt que recopier aveuglément le miroir. Confiance forte sur les quantités et l'empreinte recoupées ; moyenne sur la correspondance numérique complète avec 1.6.4850.

## Suites connues et adaptations explicites

Les recettes Core transforment un fragment typé en vingt blocs du même type, avec 1 600 unités de travail, sous le travail Craft sans apprentissage de compétence. Vérifier à nouveau compteurs des factures, rayon/filtres, ingrédients non désignés au transport, sortie portée, effets de lumière et atelier extérieur avant de les implémenter. Le coefficient extérieur 0,8 récent ne doit pas être remplacé par l'ancien 0,9.

L'atelier est accessible dans notre camp sans arbre de recherche, lequel est absent ; ce n'est pas une simulation du déblocage Stonecutting. Support lourd, propreté, dégâts, chaleur produite, meuble d'outils, qualité, statistiques complètes et portée des interactions restent à traiter avec leurs systèmes. L'interface annonce explicitement « fabrication de blocs à venir » ; aucun fragment n'est converti implicitement.
