# Dégagement des cultures et choix alimentaire

Recherches renouvelées les 13–14 septembre 2026. Cible : RimWorld Core, adulte humain ordinaire. Corpus relu : chapitres 9/10/12/14, SYS-041..061, SYS-070..072 et SYS-076..080, selon [l’adoption](reference-adoption.md). Ces contrats guident les interactions ; ils ne certifient pas notre parité numérique.

## Objets gênant les semis

La [fiche Growing zone](https://rimworldwiki.com/wiki/Growing_zone) décrit le déplacement automatique des fragments gênants et le défrichage par les cultivateurs. Le miroir [WorkGiver_GrowerSow](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_GrowerSow.cs) confirme un travail de transport local pour un objet transportable qui bloque la plantation. [HaulAIUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/HaulAIUtility.cs), relu par HTTP direct, distingue ce dépôt du stockage ordinaire, exige réservation/accessibilité et exclut les zones de culture de ses destinations. Il ne conditionne pas cette tâche à l’activation du travail ordinaire de transport.

**Adopter** cette interaction pour nos piles matérielles. **Adapter** la recherche à notre grille déterministe et à son budget partagé ; aucune région du moteur original n’est nécessaire. Le cultivateur réserve une quantité et une capacité, marche, porte et dépose avant le semis. Les petits rochers décoratifs restent sans objet transportable. Depuis cette recherche, les [fragments minés V28](mining-reference.md) et le [dégagement des chantiers V16](../development/construction.md) disposent de leurs contrats ; la décoration historique reste à convertir.

## Choix de nourriture

La [fiche Food](https://rimworldwiki.com/wiki/Food) confirme les différences entre aliments crus, repas et effets d’humeur. Elle ne suffit pas pour déduire un ordre absolu « repas avant toute baie ». [FoodUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/FoodUtility.cs), méthodes `FoodOptimality` et `SpawnedFoodSearchInnerScan`, combine distance de Manhattan, pensées d’ingestion et décalages de définition, après éligibilité et accessibilité. Les catégories ordinaires RawTasty/MealSimple n’ajoutent pas seules un bonus universel.

Les [données de définitions publiées par le wiki](https://rimworldwiki.com/wiki/Module:DefInfo/Data) donnent un décalage humain de −5 aux rations de survie, aucun aux baies/riz, et une pensée de repas cru au riz. L’[extrait XML Core publié en avril 2025](https://steamcommunity.com/workshop/filedetails/discussion/3386316410/600774769769474573/) recoupe −5 pour les rations, mais concerne 1.5. La courbe du miroir transforme la pensée −7 en score −82. Une baie fraîche à même distance passe donc devant une ration de survie ; la distance peut inverser ce choix. Le riz reste comestible et peut être choisi si les autres aliments sont trop éloignés ou inaccessibles.

**Adopter pour le profil adulte neutre actuellement présent** : score relatif = décalage − distance Manhattan ; baies 0, ration −5, riz −82. Omettre la constante commune 300 ne change pas le classement. Départage local stable par identifiant, distinct de l’ordre d’énumération du miroir. La durée réelle d’une diagonale reste euclidienne : l’heuristique de choix ne modifie pas le déplacement. L’ancienne économie `legacy` conserve son classement par trajet. Un repas déjà commencé n’est pas rechoisi au chargement.

**Différer explicitement** les termes nécessitant des systèmes absents : vieillissement/pourrissement, régimes et interdictions, traits, santé, titres, ingrédients, inventaire personnel. Le portage de travail ne devient pas cet inventaire ; un colon peut interrompre son transport de riz et déposer sa cargaison pour rejoindre des baies préférées.

## Degré de preuve et correction rétroactive

Le miroir est figé au commit `2d508035082e7cb0c8e29e230d26bda6e546928f`, daté du 20 mai 2026. Son équivalence avec un binaire commercial récent n’est pas établie ; les données du wiki ne garantissent pas l’actualité de tous les coefficients. Confiance élevée sur les interactions générales recoupées, moyenne sur cette calibration du profil neutre. Pas d’affirmation de conformité à 100 %.

La validation a révélé une dépendance oubliée : notre recherche partielle de nourriture s’arrêtait à l’aliment le plus proche. Elle cible désormais le meilleur candidat au classement. Si celui-ci est inaccessible, le parcours complet de la composante permet de choisir le meilleur repli accessible. Une seule recherche reste consommée, sans relancer un chemin pour chaque pile.
