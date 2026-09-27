# Trois dispositions sociales — relevé Core 1.6.4871 pour V134

Le 27 septembre 2026, l'installation locale `E:/Steam/steamapps/common/RimWorld` annonce `1.6.4871 rev590`. Les définitions `Data/Core/Defs/TraitDefs/Traits_Singular.xml`, `InteractionDefs/Interactions_Social.xml`, `ThoughtDefs/Thoughts_Memory_Social.xml`, la traduction `Data/Core/Languages/French (Français).tar` et les classes `InteractionWorker_KindWords` et `NegativeInteractionUtility` de l'assembly ont été consultées en lecture seule. L'empreinte de cet assembly figure dans la [référence Core](core-reference-baseline.md). L'[annonce officielle des relations](https://ludeon.com/blog/2016/04/alpha-13-released/) donne le contexte de ces échanges, sans fixer leurs valeurs actuelles.

| Disposition | Constat Core de cette tranche | Libellé français local |
| --- | --- | --- |
| `Kind` | Le facteur de sélection de `Slight` et `Insult` devient zéro. `KindWords` a un poids de sélection de 0,01 si le trait est actif. Incompatible avec `Abrasive`. | Aimable |
| `Abrasive` | Multiplie le facteur de sélection des deux échanges blessants par 2,3, après opinion et compatibilité. | Incisif ; Incisive au féminin |
| `Bloodlust` | Le facteur de bagarre sociale de la cible vaut 4. | Sanguinaire |

Les **mots gentils** ont leur propre entrée dans le tirage social, puis donnent à la cible un souvenir d'opinion de base **+15**, modulé par l'impact social de l'auteur, pendant 20 jours Core. Limites : dix souvenirs par auteur et 300 de cette famille au total, avec effet de pile ×0,9. Une pensée d'humeur distincte vaut **+5** pendant deux jours Core, limite dix et pile ×0,9 ; elle ne multiplie pas les +5 par l'impact de l'auteur. Lisière convertit les jours en ses journées de 6 000 ticks, comme ses autres souvenirs sociaux. Les poids sont relatifs aux autres interactions admissibles, pas des probabilités absolues par tick.

La traduction française locale du texte descriptif de `Bloodlust` parle de « deux fois », tandis que la définition Core exécutée porte `socialFightChanceFactor=4` et que le texte anglais le décrit comme quatre fois. La règle mesurée est **×4** ; reproduire « deux fois » dans l'explication de Lisière contredirait le mécanisme. Les formulations de Lisière décrivent donc l'effet effectivement calculé.

Ce relevé ne rend pas complets les traits : `Kind` modifie aussi les jugements d'apparence dans Core, `Bloodlust` intervient dans d'autres pensées, et les biographies, âges, incapacités, gènes, esclaves, crises et idéologies restent hors du sous-lot. L'offre d'arrivée de Lisière distribue ici un troisième trait social par numéro d'offre déterministe, **adaptation du calendrier provisoire**, pas une prétention de fréquence Core. Les anciens habitants et offres conservent exactement leurs traits existants lors de la migration.
