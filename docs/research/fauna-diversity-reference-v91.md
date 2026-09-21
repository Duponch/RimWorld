# Diversité de la faune — référence V91

Recherche arrêtée au **21 septembre 2026**. Elle prépare et justifie le moteur de faune V91; elle ne transforme ni le corpus utilisateur ni une partie observée en preuve d’exécution.

## Sources et méthode

La source primaire est l’installation locale Core lue sans écriture, **RimWorld 1.6.4871 rev590** (`Version.txt`) : définitions des races et biomes, puis lecture des classes de génération avec ILSpy 8.2. Le binaire `Assembly-CSharp.dll` observé porte le SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Aucun XML propriétaire, code décompilé ou fichier de sauvegarde n’est reproduit ici; seuls les paramètres nécessaires au contrat et le comportement déduit sont reformulés.

La [présentation officielle de la mise à jour 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) et le [correctif officiel 1.6.4566](https://ludeon.com/blog/2025/08/update-1-6-4566-improves-gravships-shuttles-and-more/) fixent le contexte de version. Les fiches communautaires [lièvre des neiges](https://rimworldwiki.com/wiki/Snowhare), [cerf](https://rimworldwiki.com/wiki/Deer), [mufalo](https://rimworldwiki.com/wiki/Muffalo), [gazelle](https://rimworldwiki.com/wiki/Gazelle) et [dromadaire](https://rimworldwiki.com/wiki/Dromedary) recoupent les catégories et ordres de grandeur. Les pages [quantité de viande](https://rimworldwiki.com/wiki/Meat_amount), [faim](https://rimworldwiki.com/wiki/Hunger_Rate), [vitesse](https://rimworldwiki.com/wiki/Move_Speed) et [animal de bât](https://rimworldwiki.com/wiki/Pack_animal) aident à séparer rendement, besoin, déplacement et capacités domestiques. Les valeurs effectives de l’installation locale priment en cas d’écart.

Ont aussi été relus : [préparation des biomes V90](biome-diversity-reference-v90.md), [première faune](wildlife-reference.md), [chasse V79](hunting-reference.md), et les contrats [faune](../development/wildlife.md), [mêlée animale](../development/animal-melee.md), [chasse](../development/hunting.md), [dépouilles](../development/corpses.md) et [boucherie](../development/butchery.md). Les chapitres 13, 15, 20 et 21 du [corpus d’adoption](reference-adoption.md), notamment SYS/TEST-062..064, 077/078 et 121..125, conduisent à adopter identité, anatomie, transport et transformation physiques. Lisière adapte l’horloge, la représentation 3D et les recherches bornées. Élevage, apprivoisement, prédation et caravanes restent différés.

## Paramètres d’espèces résolus

La faim ci-dessous est le débit adulte effectif utilisé par Lisière après le facteur commun observé; la capacité de nutrition reste égale à la taille corporelle dans ce périmètre. Le rendement brut précède couverture anatomique, blessures, efficacité du boucher, poste et arrondi.

| Espèce | Taille / santé | Nutrition / jour | Vitesse Core | Groupe / poids éco | Viande / cuir bruts | Produit de cuir |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Lièvre | 0,2 / 0,4 | 0,2 / 0,18 | 6,0 | 1 / 0,25 | 28 / 8 | cuir léger |
| Lièvre des neiges | 0,2 / 0,4 | 0,2 / 0,18 | 6,0 | 1 / 0,25 | 28 / 8 | cuir léger |
| Cerf | 1,2 / 0,9 | 1,2 / 0,32 | 5,5 | 3–9 / 0,5 | 168 / 48 | cuir ordinaire |
| Mufalo | 2,4 / 1,75 | 2,4 / 0,86 | 4,5 | 3–9 / 1,1 | 336 / 96 | fourrure bleue |
| Gazelle | 0,7 / 0,7 | 0,7 / 0,24 | 6,0 | 4–13 / 0,45 | 98 / 28 | cuir ordinaire |
| Dromadaire | 2,1 / 1,6 | 2,1 / 0,86 | 4,3 | 2–5 / 1,0 | 294 / 84 | cuir de chameau |

Les six profils gardent leurs attaques déclarées, pas une mise à l’échelle du lièvre. Les sabots, morsures, coups de tête et délais de récupération sont convertis vers le noyau commun. Exemples distinctifs : sabots de gazelle 5,5 avec 90 ticks Core; bois de cerf 7 et morsure 8; coup de tête de mufalo 13 avec 156 ticks; sabot de dromadaire 9 et morsure 10. La pénétration reprend la relation commune du noyau local. Les identifiants de frappe sauvegardés restent compatibles avec l’ancien format; la partie anatomique source conserve la distinction sabot, mâchoire ou tête.

Le quadrupède garde 28 parties pour les profils ordinaires. Les ongulés remplacent les pieds par quatre sabots. Le dromadaire ajoute une bosse extérieure, 32 PV et couverture 0,10. Le torse obtient 16 PV pour les deux lièvres, 36 pour le cerf, 70 pour le mufalo, 28 pour la gazelle et 64 pour le dromadaire. Ces PV proviennent de l’échelle sanitaire propre à l’espèce, arrondie par partie; le dossier médical sauvegarde donc l’espèce, pas seulement un gabarit « quadrupède ».

## Biomes et population

| Profil local | Densité animale | Communalité Core totale | Sous-ensemble V91, communalité brute |
| --- | ---: | ---: | --- |
| forêt tempérée | 3,7 | 12,27 | lièvre 1; cerf 0,5; mufalo 0,5; gazelle 0,3 |
| forêt boréale | 2,8 | 10,12 | lièvre 1; cerf 0,5; mufalo 0,5 |
| broussailles arides | 1,8 | 11,867 | lièvre 1,3; gazelle 0,7; dromadaire 0,7 |
| toundra de référence | 1,1 | 13,53 | lièvre 2; lièvre des neiges 2; mufalo 1 |

La lecture locale corrige une hypothèse de la préparation V90 : **la forêt boréale contient le lièvre ordinaire, pas le lièvre des neiges**. Le lièvre des neiges apparaît dans la toundra. V91 ne rend sélectionnables que les trois premiers biomes; le profil toundra et le lièvre des neiges restent donc une préparation moteur testée, pas un contenu annoncé comme obtenable en partie normale. Aucun poids boréal n’est inventé pour le rendre visible.

Le générateur natif raisonne en poids écologique. Sa cible équivaut à `surface / (10000 / densité)`; il additionne ensuite `ecoSystemWeight`, choisit des espèces pondérées et pose des groupes, qui peuvent dépasser légèrement la cible. Le renouvellement natif vérifie périodiquement la carte, utilise une chance proportionnelle à la densité, puis le même choix d’espèce et de groupe. Densité ne signifie donc jamais nombre d’animaux.

L’adaptation bornée de Lisière calcule d’abord le budget Core complet, puis le multiplie par `communalité implémentée / communalité totale`. Les espèces absentes gardent ainsi leur part au lieu de gonfler les cinq espèces jouables. À chaque renouvellement, un tirage qui tombe dans la part absente produit simplement aucune arrivée. La vérification a lieu tous les 122 ticks locaux, soit 1 220 ticks Core, approximation entière documentée des 1 213 ticks observés. La chance est `0,026955556 × densité`. `nextCheck`, compte de contrôles, arrivées, biome et deux budgets sont sauvegardés. Il s’agit d’arrivées prospectives de groupes adultes, sans naissance, croissance ni remplissage immédiat après une chasse.

## Alimentation, corps et produits

Tous les profils sont herbivores dans V91. Ils cherchent une plante réelle accessible ou une pile explicitement admise. La nutrition végétale est celle de l’espèce de plante multipliée par sa croissance courante. Le broutage soustrait exactement la fraction consommée; une plante disparaît seulement quand toute sa nutrition disponible est prise. La capacité et la faim propres à l’animal modifient donc la pression de broutage. Les travaux de coupe/récolte devenus impossibles sont invalidés, sans produit récolté inventé. Viandes et dépouilles ne sont pas admises comme nourriture herbivore.

La dépouille conserve l’espèce, le sexe, le corps médical et l’identité. Elle sélectionne une paire produit propre : `*-meat` plus cuir léger, cuir ordinaire, fourrure bleue ou cuir de chameau. La courbe des petits corps et les pertes anatomiques restent celles du contrat V79. Un grand corps peut dépasser la pile maximale de 75 : la boucherie prévalide alors toutes les piles, identités, cellules, compteurs et tirages; porte au plus une pile de viande et pose les surplus physiques par piles de 75 ou moins. Une impossibilité conserve dépouille, PRNG, XP, facture et monde. Une réussite conserve la source jusqu’à la viande de même espèce; la recette de repas consomme dix unités de cette viande.

## Portée et degré de fidélité

Les valeurs d’espèce, produits, anatomies, poids de biome et logique de budget proviennent de l’installation locale. La cadence entière de 122 ticks, la réduction du budget par part de catalogue et la pose autour de plantes accessibles sont des adaptations de Lisière. Elles préservent les propriétés importantes sans prétendre reproduire cellule par cellule un générateur propriétaire.

La toundra n’est pas un quatrième biome jouable. Les profils n’ajoutent pas de jeunes, reproduction, apprivoisement, lait, laine, caravanes, transport par animal, prédation, migration saisonnière ou sélection de prédateur. Les capacités domestiques visibles dans les sources externes ne sont pas transférées aux animaux sauvages. Aucun résultat de test court ne prouve un équilibre de population ou un débit 6× à long terme.
