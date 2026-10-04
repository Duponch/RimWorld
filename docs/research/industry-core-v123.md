# Industrie avancée — relevé Core 1.6.4871 pour V123

**Statut historique.** Les adaptations de recherche V123 ci-dessous sont conservées comme relevé daté. Pour les facteurs, le partage et la sélection des analyseurs actuels, lire le [contrat V209](../development/consolidation-v209.md) et sa [preuve](../history/validation-consolidation-v209.md). La ligne de vue locale ne revendique pas une équivalence exhaustive avec `GenSight.LineOfSight` Core.

Ce relevé distingue les définitions XML de RimWorld Core des choix de Lisière. Les nombres Core ci-dessous viennent de l'installation locale `E:/Steam/steamapps/common/RimWorld/Data/Core/Defs` ; les règles de Lisière sont vérifiables dans les sources liées. Il ne constitue pas une revendication de parité avec tout le système industriel de Core.

## Minerais et ressources

Dans [Buildings_Natural.xml](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ThingDefs_Buildings/Buildings_Natural.xml), les roches exploitables concernées portent ces valeurs par cellule :

| Roche Core | Points de vie | Produit | Rendement | Poids de dispersion | Taille du filon |
| --- | ---: | --- | ---: | ---: | ---: |
| `MineableSteel` | 1 500 | acier | 40 | 1 | 30–40 |
| `MineableComponentsIndustrial` | 2 000 | composant ordinaire | 2 | 1 | 3–6 |
| `MineableGold` | 1 500 | or | 40 | 0,07 | 2–8 |
| `MineablePlasteel` | 8 000 | plastacier | 40 | 0,05 | 2–8 |

La même définition donne aussi des occasions à l'argent (0,10 ; 4–12), à l'uranium (0,12 ; 6–12) et au jade (0,065 ; 2–8). [Lisière conserve ces poids dans son tirage](../../src/sim/site-ores.ts), mais seuls acier, machines compactées, or et plastacier deviennent des gisements V123 : une occasion tirant argent, uranium ou jade est consommée sans substitution. Ses centres, son budget de site et sa croissance compacte sont des adaptations locales, pas la génération exacte de Core. [Les définitions minières locales](../../src/sim/ore.ts) reprennent les points de vie et les rendements ci-dessus ; les nouvelles ressources physiques apparaissent dans les nouveaux sites, sans réensemencer les cartes sauvegardées. Le composant avancé n'est pas un minerai dans ce lot.

## Recherche et bâtiments

[Microélectronique](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ResearchProjectDefs/ResearchProjects_3_Microelectronics.xml) coûte 3 000 points Core après Électricité. [Multi-analyseur et Fabrication](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ResearchProjectDefs/ResearchProjects_4_MultiAnalyzer.xml) coûtent chacun 4 000 points : le premier exige Microélectronique, Usinage en prérequis caché et un bureau haute technologie ; la seconde exige Multi-analyseur, le bureau haute technologie et un multi-analyseur comme installation. [Lisière reprend ces coûts et cette chaîne](../../src/sim/research.ts). Son bureau de recherche simple peut encore mener Microélectronique ; ses projets Multi-analyseur et Fabrication demandent le bureau avancé alimenté. Fabrication requiert en plus un analyseur alimenté à neuf cases au plus, distance mesurée entre empreintes ; un analyseur est réservé à un seul chercheur à la fois. Le bonus local de l'analyseur est ×1,1. Cette distance, cette réservation et les facteurs de vitesse sont des règles de Lisière, sans prétention de reproduire l'algorithme Core.

| Bâtiment Core | Empreinte | Matières | Travail Core | Électricité | Construction |
| --- | --- | --- | ---: | ---: | ---: |
| [Bureau de recherche haute technologie](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ThingDefs_Buildings/Buildings_Production.xml) | 5×2 | 150 matière métallique + 100 acier + 10 composants | 5 000 | 250 W | 6 |
| [Multi-analyseur](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ThingDefs_Buildings/Buildings_Misc.xml) | 2×2 | 40 acier + 50 plastacier + 20 or + 8 composants | 10 000 | 200 W | 8 |
| [Établi de fabrication](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/ThingDefs_Buildings/Buildings_Production.xml) | 5×2 | 200 acier + 12 composants + 2 composants avancés | 5 000 | 250 W | 6 |

Le bureau Core accepte une matière de la catégorie métallique ; [la recette de Lisière](../../src/sim/construction-materials.ts) fixe l'acier et exige donc **250 acier + 10 composants**. Elle conserve les autres quantités, les empreintes et les prérequis de compétence. Lisière convertit le travail de construction Core par dix (500, 1 000, 500 unités locales). Les trois bâtiments sont des objets physiques construits, alimentés, endommageables, déconstructibles et minifiables ; ils utilisent les voies ordinaires de placement et de rangement. Le multi-analyseur Core augmente `ResearchSpeedFactor` de 0,1 et autorise au plus un lien simultané ; les modalités de liaison locales indiquées plus haut restent une adaptation.

## Fabrication et commerce

La [recette Core `Make_ComponentIndustrial`](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/RecipeDefs/Recipes_Production.xml) demande 12 acier, 5 000 travaux, Artisanat 8 et produit un composant. [Lisière](../../src/sim/production-recipes.ts) convertit ce travail en 500 ticks neutres. Elle crée un ouvrage physique portant auteur, progression et parts des piles d'acier incorporées ; la reprise est réservée à son auteur et l'annulation restitue chaque part à 75 % avec tirage, après prévalidation de l'espace et des identités ([component-work.ts](../../src/sim/component-work.ts), [component-work-plan.ts](../../src/sim/component-work-plan.ts)). L'établi doit être alimenté. Core liste aussi `Make_ComponentSpacer` à cet établi, mais **Lisière V123 ne fabrique pas les composants avancés**.

Le [marchand exotique de caravane Core](E:/Steam/steamapps/common/RimWorld/Data/Core/Defs/TraderKindDefs/TraderKinds_Caravan_Outlander.xml) définit 750–1 200 argent, 6–20 composants ordinaires, 1–4 composants avancés, 50–150 plastacier et 40–80 or, parmi d'autres biens. [Le stock exotique physique de Lisière](../../src/sim/trade-stock.ts) est plus restreint : 500–2 000 argent, 1–4 composants avancés, 50–150 plastacier et 40–80 or, sans lot de composants ordinaires ni les autres marchandises Core. Les grandes quantités sont fractionnées en piles réelles. L'arrivée emprunte le calendrier local des visiteurs : deux occasions exotiques par année locale, après un minimum de six jours, espacées d'au moins quinze jours ; les opportunités bloquées ne créent ni marchand ni stock ([visitor-state.ts](../../src/sim/visitor-state.ts), [visitors.ts](../../src/sim/visitors.ts)). Ce calendrier ne revendique pas la fréquence du marchand Core.

Les prix et les quantités commerciales de Lisière relèvent de son [catalogue](../../src/sim/trade-catalogue.ts), et son mécanisme de commerce ne simule ni colonies marchandes éloignées ni quêtes. L'accès initial aux deux composants avancés de l'établi repose ici sur un marchand exotique réel, sans don rétroactif.
