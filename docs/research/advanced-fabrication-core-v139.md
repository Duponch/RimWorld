# Fabrication avancée — relevé Core 1.6.4871 pour V139

Les valeurs Core ci-dessous proviennent des définitions XML de l'installation locale `E:/Steam/steamapps/common/RimWorld/Data/Core/Defs`. La [mise en œuvre de Lisière](../development/advanced-fabrication-v139.md) reprend la chaîne et les matières, mais conserve ses propres unités de travail, factures, trajets et ouvrages. Ce relevé ne décrit pas une parité industrielle générale.

## Recherche et poste

[`AdvancedFabrication`](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ResearchProjectDefs/ResearchProjects_4_MultiAnalyzer.xml) coûte **4 000 points**, exige `Fabrication`, un `HiTechResearchBench` et un `MultiAnalyzer` comme installation de recherche. Le projet est distinct de `Fabrication`, qui ouvre déjà l'établi et le composant ordinaire. Lisière possède ce bureau et cet analyseur depuis V123 ; le projet V139 réutilise leur liaison physique et leur alimentation, avec les règles de portée et de réservation locales décrites dans le [relevé V123](industry-core-v123.md).

Le [`FabricationBench` Core](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ThingDefs_Buildings/Buildings_Production.xml) liste à la fois `Make_ComponentIndustrial` et `Make_ComponentSpacer`. Il occupe 5×2 cases, consomme 250 W et coûte **200 acier, 12 composants ordinaires et 2 composants avancés** à construire. V123 a déjà livré cet établi dans Lisière ; V139 ajoute une facture à ce même poste alimenté. Les deux composants avancés nécessaires au *premier* établi proviennent toujours d'une source extérieure, notamment du marchand exotique V123. En produire deux ouvre ensuite la construction d'un deuxième établi avec les chantiers physiques existants ; cela ne supprime pas le coût d'amorçage.

## Recette et conversion de l'or

[`Make_ComponentSpacer`](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/RecipeDefs/Recipes_Production.xml) définit un ouvrage `UnfinishedComponent`, **10 000 travaux Core**, Artisanat **8**, le prérequis `AdvancedFabrication` et **un** `ComponentSpacer` en sortie. Son filtre fixe n'accepte que les quatre ressources suivantes :

| Entrée Core | `count` XML | Quantité physique |
| --- | ---: | ---: |
| `ComponentIndustrial` | 1 | 1 composant ordinaire |
| `Steel` | 20 | 20 acier |
| `Plasteel` | 10 | 10 plastacier |
| `Gold` | 0,3 | 3 or |

Le `Gold` est déclaré [`smallVolume=true`](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ThingDefs_Items/Items_Resource_Stuff.xml). La règle Core de petit volume applique un facteur de 0,1 à son comptage d'ingrédient : **0,3 / 0,1 = 3 unités d'or**. Lire le seul nombre décimal du XML comme 0,3 objet ou l'arrondir à un objet sous-estimerait la recette. Lisière représente des piles entières et demande donc explicitement trois unités d'or.

Lisière convertit les 10 000 travaux Core en **1 000 ticks de travail neutre**, suivant son rapport local de dix pour un. La cadence effective dépend ensuite de ses facteurs déjà appliqués au travail de production ; elle n'est pas une durée garantie de 1 000 ticks de monde. Les parts de matière, la conservation d'un ouvrage lié à son auteur et la restitution locale de 75 % à l'annulation ne sont pas déduites de ces définitions XML. Elles suivent le contrat de production de Lisière, décrit dans la [tranche V123](../development/industry-v123.md) et prolongé en [V139](../development/advanced-fabrication-v139.md).

Ce relevé ne promet ni les autres usages Core des composants avancés, ni les sources Core de quêtes et de colonies éloignées, ni une reproduction de toutes les opérations de l'établi. La filière V139 se termine ici par un produit réel et son emploi dans un deuxième établi.
