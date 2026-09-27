# Âges et reproduction — relevé Core 1.6.4871 V121

Relevé du **27 septembre 2026** sur l'installation locale sans extension ni mod **RimWorld Core 1.6.4871 rev590** : `E:/Steam/steamapps/common/RimWorld/Data/Core/Defs` et `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`. La [note V120](animal-products-core-v120.md) identifie le témoin et son empreinte. Les annonces officielles [Animal Taming](https://ludeon.com/blog/2015/08/rimworld-alpha-12-animal-taming-released/) et [Update 1.3](https://ludeon.com/blog/2021/07/announcing-update-1-3-and-the-ideology-expansion/) confirment les stades, la gestation, la naissance et les enclos ; **les valeurs de la version étudiée viennent des Defs et classes locales**, non de ces annonces historiques. Aucun fichier propriétaire n'est reproduit.

## Stades et nourriture

`Misc/LifeStageDefs/LifeStages.xml` définit `AnimalBaby`, `AnimalJuvenile`, `AnimalAdult` : taille corporelle ×0,2 / ×0,5 / ×1 ; faim ×0,4 / ×0,75 / ×1 ; réserve maximale de nourriture ×0,6 / ×0,75 / ×1 (taille et facteur de réserve combinés). Le mouvement vaut ×0,5 / ×0,9 / ×1 et la santé ×0,25 / ×0,6 / ×1. Seul `AnimalAdult` est fécond, traitable ou tondable. Les Defs des six animaux locaux donnent les frontières suivantes, dans l'échelle Core de 60 jours par an :

| Espèce | Juvénile | Adulte | Gestation |
| --- | ---: | ---: | ---: |
| Lièvre, lièvre des neiges, gazelle | 0,1 an = 6 jours | 0,2222 an ≈ 13,332 jours | 5,661 jours |
| Cerf | 0,1 an = 6 jours | 0,3333 an ≈ 19,998 jours | 5,661 jours |
| Mufalo, dromadaire | 0,25 an = 15 jours | 0,3333 an ≈ 19,998 jours | 6,66 jours |

Les nombres représentent les seuils des Defs, pas l'âge observé de chaque animal d'une partie. Le travail de production V120 n'est permis qu'au stade adulte correspondant. Les sous-adultes diminuent aussi la viande et le cuir par leur taille.

`Verse.Pawn_AgeTracker.BiologicalTicksPerTick` retourne immédiatement **1 pour un non-humain** ; `TickBiologicalAge` ajoute ce taux avant le changement éventuel de stade. La faim ne ralentit donc **pas** les seuils d'âge dans ce Core. Elle module la gestation et les ressources corporelles par d'autres chemins.

## Couple, gestation et naissance

Le Core fait chercher à un mâle adulte une femelle adulte de sa propre espèce et faction ; les animaux de ferme en enclos sont concernés. La recherche périodique emploie un temps moyen d'accouplement d'environ **8 heures pour les lièvres** et **12 heures par défaut** pour les autres espèces du lot, puis le mâle doit physiquement atteindre sa partenaire. Le geste d'accouplement prend **500 ticks Core** et une tentative terminée peut produire une grossesse à **50 %**. Les cinq autres espèces considérées ont une naissance unitaire ; le lièvre peut donner **un ou deux petits** selon la courbe de portée. Les besoins alimentaires modulent l'avancement de la grossesse comme celui des ressources corporelles. Ces frontières proviennent des Defs d'espèces et des classes Core lues localement ; elles ne sont pas une preuve de parité de tous les cas cliniques ou de la gestion de faction.

La [documentation officielle](https://ludeon.com/blog/2015/08/rimworld-alpha-12-animal-taming-released/) confirme plus largement que le mâle rejoint la femelle, puis que les animaux peuvent être enceintes et mettre bas. Le Core possède aussi des interruptions et effets médicaux liés à la grossesse, du liquide amniotique, des règles d'allaitement ou d'attention aux nouveau-nés suivant l'espèce et des comportements animaux hors de notre périmètre. Ils ne doivent pas être présentés comme livrés en V121.
