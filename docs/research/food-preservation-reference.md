# Conservation alimentaire — vérification du 14 septembre 2026

Périmètre : les trois denrées périssables déjà présentes, **RimWorld Core**. Corpus relu : chapitres 11 et 14, SYS-067 (détérioration distincte de la fraîcheur), SYS-077/078 (choix et ingestion), CAT-011/015. Le tableau SYS présente ces contrats comme propositions à vérifier ; son lien `StatDefOf` ne suffit pas à expliquer la pourriture. [Contrat local V11](../development/food-preservation.md).

## Sources et décisions

Les pages communautaires [Baies](https://rimworldwiki.com/wiki/Berries), [Riz](https://rimworldwiki.com/wiki/Rice), [Repas simple](https://rimworldwiki.com/wiki/Simple_meal) et [Alimentation](https://rimworldwiki.com/wiki/Food) ont été consultées à nouveau pour ce lot. Certaines fiches portent une réserve de vérification ; elles ne sont pas quatre observations indépendantes.

Le miroir de code est fixé au commit **2d508035082e7cb0c8e29e230d26bda6e546928f**, daté du 20 mai 2026. Il corrobore les transitions, sans certifier l’identité de son assembly avec le correctif commercial PC 1.6.4850. Aucun code ou asset du jeu n’est incorporé au projet. Une observation directe dans une installation identifiée reste souhaitable.

| Sujet | Vérification et décision |
|---|---|
| Durées | **Adopter** baies 14 jours, riz 40 jours, repas simple 4 jours, d’après leurs fiches. Confiance moyenne à élevée, à recontrôler lors de l’acquisition des Defs Core résolus. Nos 6 000 ticks/jour remplacent les 60 000 de référence. |
| Deux mécanismes distincts | **Adopter la séparation.** La page Alimentation distingue perte de points de vie par exposition et pourriture thermique. Une denrée proche du seuil reste consommable ; une fois pourrie elle disparaît. Cette tranche livre la pourriture, pas les dégâts d’exposition ni l’intoxication. |
| Température | [GenTemperature.RotRateAtTemperature](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GenTemperature.cs) donne 0 à température négative, `T/10` entre 0 et 10 °C, puis 1. **Adopter** cette courbe. Le texte `1/temp` du wiki est ambigu : il ne devient pas notre formule. Notre site reste à 21 °C partout ; aucune réfrigération n’est livrée. |
| Fractionnement et mélange | [CompRottable](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/CompRottable.cs) copie la progression lors d’une séparation et fait une moyenne pondérée par les quantités absorbées. **Adopter** : le transport ne rajeunit pas une pile ; ajouter du frais modifie son âge moyen. Toute la pile atteint ensuite le même seuil. |
| Expiration | Le même composant accumule un progrès dépendant de la température et détruit l’objet lorsque le stade bascule si `rotDestroys` est actif. Les fiches alimentaires corroborent la disparition des denrées. **Adapter** vers suppression avant les actions du tick local, y compris nourriture portée ou réservée. La cadence rare de 250 ticks de référence n’est pas reproduite à l’identique. |
| Choix pour manger | [FoodUtility.FoodOptimality](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/FoodUtility.cs) ajoute **12** au score si le temps restant à température courante est strictement inférieur à une demi-journée, hors prise pour inventaire. **Adopter** pour les décisions d’ingestion du profil adulte ; cela reste combiné à préférence et distance, sans tri FIFO absolu. |

## Adaptations et inconnues

L’âge ancré utilise des nombres JavaScript double précision. Une moyenne de pile peut être fractionnaire ; nos sauvegardes reprennent exactement cette valeur, sans promettre les mêmes arrondis qu’un composant C# en simple précision. Le repas nouvellement cuisiné démarre frais ; les ingrédients restent périssables jusqu’à la transformation réelle.

Les anciennes sauvegardes n’ont aucun âge exploitable : **adapter explicitement la migration**, avec fraîcheur initiale au tick chargé et pertes cumulées nulles. Les portions historiques restent non périssables pour préserver leur compatibilité ; elles ne représentent pas un contenu Core. Les rations de survie ne pourrissent pas, mais leur usure extérieure reste différée.

Une recette privée d’un ingrédient ne produit rien. Si le chef porte encore un autre ingrédient et ne trouve pas de dépôt physique, notre état d’interruption conserve cette cargaison et permet une sauvegarde valide. Ce repli explicite découle de notre grille et de nos réservations ; ce n’est pas une affirmation sur les classes internes du jeu original.

Restent ouverts : détérioration/points de vie, pièces et stockage réfrigéré, températures variables, autres aliments, sélection d’ingrédients par fraîcheur dans les factures, politiques et inventaire personnel. Leur absence ne clôt pas SYS-067 ni le domaine climatique.
