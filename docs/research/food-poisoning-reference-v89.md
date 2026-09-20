# Intoxication alimentaire : référence V89

Recherche du 20–21 septembre 2026, **Core local 1.6.4871**, sans extensions. Le périmètre livré est validé dans les [preuves V89](../history/validation-hygiene-v89.md). Cette enquête distingue contamination d’un aliment, risque à l’ingestion et maladie de la personne. Elle ne remplace pas les preuves d’une boucle jouée. [Contrat et interfaces](../development/food-poisoning.md).

## Provenance et arbitrages

Le [corpus adopté](reference-adoption.md), chapitres 11, 12, 14 et 15, impose la chaîne recette/ingrédients, état propre à l’objet, ingestion physique et maladie distincte des blessures. Entrées pertinentes : SYS/TEST-062, 063, 067, 077, 078, 092, 093 et 094. SYS-088 concerne la mort sociale ; il appartient au chantier des dépouilles, pas à la probabilité d’intoxication. Les lignes du classeur enrichissent les contrôles groupés ; elles ne prescrivent ni un test par ligne ni un chiffre absent des sources.

Les relevés locaux consultent les définitions `FoodPoisoning`, `FoodPoisonChance`, `FoodPoisonChanceFixedHuman`, `FoodPoisonChance` de pièce, les bases d’aliments et la difficulté Medium. Les producteurs ont été relus dans `CompFoodPoisonable`, `GenRecipe`, `Thing.Ingested`, `FoodUtility`, `SkillNeed_Direct`, `Hediff`, `HediffComp_SeverityModifierBase`, `JobDriver_Vomit`, `Rand`, `ThingDefGenerator_Meat` et `PawnCapacityUtility`. Les extraits restent dans `tmp/food-poisoning-reference-v89`, ignoré par Git ; aucun XML ou code propriétaire n’est reproduit dans le dépôt.

La recherche Internet ciblée a été refaite. L’[annonce officielle 1.2 de Tynan Sylvester](https://ludeon.com/blog/2020/08/1-2-update-with-new-quests-psycasts-gear-and-more/), datée du 10 août 2020, confirme que le risque alimentaire est un réglage de difficulté distinct. L’[échange de Tynan du 21 février 2015](https://ludeon.com/forums/index.php?topic=10656.0) présente historiquement la pâte nutritive comme moyen d’éviter l’intoxication : cela ne livre ni cet appareil ni ses règles actuelles. Ces sources primaires publiques éclairent le rôle du système ; **les coefficients retenus viennent de l’installation datée**, pas d’un ancien témoignage de partie.

Un ancien compte rendu parle de propreté comme multiplicateur de la compétence. La classe locale actuelle utilise deux essais successifs, et non ce modèle. Un changement de version, une ancienne discussion ou le nombre de personnes malades d’une sauvegarde ne permettent pas d’identifier une probabilité générale. La lecture du producteur résout aussi la croyance selon laquelle un seul repas empoisonné rendrait nécessairement toute une pile toxique à 100 %.

## Contamination à la préparation

La recette crée un produit, puis notifie sa préparation une fois pour cette pile de sortie. Le composant teste d’abord la **pièce où se trouve le cuisinier**, pas la cellule d’ancrage de la cuisinière. Si ce tirage échoue, il teste la compétence Cuisine. La cause retenue est respectivement cuisine sale ou cuisinier incompétent. Un succès rend la fraction de contamination de la sortie égale à 1.

| Propreté de pièce | Probabilité de contamination par propreté |
|---|---:|
| −5 ou moins | 5 % |
| −3,5 | 2,5 % |
| −2 ou plus | 0 % |
| Aucun objet pièce retourné | 2 % |

L’interpolation entre points est linéaire. La vérification locale de `ProperRoom` distingue une vraie pièce du dehors relié au bord et du seuil de porte seul : ces deux derniers cas utilisent le défaut 2 %. Le module d’hygiène fournit cette distinction. Les surfaces et salissures changent la propreté ; un brûleur électrique n’accorde pas d’immunité et la qualité du meuble n’est pas un multiplicateur ajouté ici.

| Niveau Cuisine | Risque de la seconde étape |
|---|---:|
| 0 / 1 / 2 / 3 | 5 % / 4 % / 3 % / 2 % |
| 4 / 5 / 6 | 1,5 % / 1 % / 0,5 % |
| 7 / 8 / 9–20 | 0,25 % / 0,15 % / 0,1 % |

`SkillNeed_Direct` indexe explicitement le niveau zéro dans le tableau. Le risque total est `pPièce + (1 − pPièce) × pCuisine`. Le second tirage n’est pas effectué après un premier succès ; une probabilité nulle ou certaine ne consomme pas d’aléa dans `Rand.Chance`. Le jeu conserve un risque non nul même pour un excellent cuisinier.

La notification vise la pile produite : une recette groupée ne ferait pas automatiquement un tirage indépendant par repas. Lisière garde pour ce lot sa recette d’un repas. La boucherie produit des ingrédients crus via une autre voie ; elle ne transforme pas leur risque intrinsèque en contamination de repas. Le transfert d’une contamination d’ingrédient au nouveau produit n’apparaît pas dans ce producteur : la sortie reçoit ses propres essais.

## Division, fusion et ingestion

La fraction et la cause sont deux données de la pile, distinctes des PV et de la pourriture. Séparer une pile copie les deux. Une fusion pondère la fraction par les quantités réellement absorbées. Un repas contaminé mélangé à neuf propres donne une fraction de 0,1 ; ce n’est pas un registre de dix unités dont une seule serait matériellement désignée comme dangereuse. Reséparer ne permet donc pas d’identifier et retirer avec certitude cette unité.

La cause inconnue cède à une cause connue. Si les deux causes sont connues, celle ayant la plus grande masse de contamination (`fraction × quantité`) gagne ; une égalité choisit l’entrant. Un transfert partiel ne compte que le nombre absorbé, et le reliquat garde sa propre fraction.

À une **ingestion achevée**, le composant du repas tire `fraction × facteurDifficulté`. La difficulté choisie Récit d’aventure fournit 0,75 ; elle agit à cette étape, pour les ingérants concernés, sans garde réservée à la faction du joueur. Les phases de maladie n’accordent aucune immunité. Les gènes et implants pouvant modifier ce facteur ne sont pas livrés dans ce lot.

Les baies, le riz, les pommes de terre, le maïs et la viande de lièvre héritent localement d’un risque cru de 2 %, avant difficulté. Ce risque de type ne concerne que les humains ; les animaux ne reçoivent pas ce risque parce qu’ils broutent ou mangent une plante crue. Un animal consommant un **repas contaminé** peut en revanche recevoir la maladie par le composant du repas. Le risque est évalué une fois par ingestion, pas une fois par baie ou grain de riz ingéré.

Le repas simple et la ration de survie disposent du composant de contamination dans Core. Une ration initiale ou achetée n’est pas empoisonnée spontanément : son composant neuf vaut zéro. Lisière n’ajoute aucun historique de cuisine aux objets importés ou migrés. Les portions historiques non typées restent sans risque cru inventé. Congeler ou réchauffer un repas contaminé ne nettoie pas ce composant ; l’expiration alimentaire existante supprime une pile pourrie avant ingestion, sans créer une nouvelle maladie de décomposition.

## Maladie, capacités et réexposition

La maladie commence à une sévérité de 1 et décroît de 1 par jour, par impulsions de 200 ticks Core. Elle disparaît à zéro. Elle ne possède ni composant d’immunité ni autorisation de pansement : le défaut `tendable=false` est conservé et `Hediff.TendableNow` refuse ces cas. Un médicament ne soigne donc pas cette intoxication. Les lésions ou infections présentes en même temps conservent leurs propres traitements.

| Stade | Sévérité | Douleur ajoutée | Facteurs des capacités | Intervalle moyen de vomissement |
|---|---|---:|---|---:|
| Initial | ≥0,8 | +0,2 | Conscience ×0,6 ; déplacement ×0,8 ; manipulation ×0,9 ; filtration ×0,95 ; ingestion ×0,5 | 0,3 jour |
| Majeur | ≥0,2 et <0,8 | +0,4 | Conscience ×0,5 ; déplacement ×0,5 ; manipulation ×0,8 ; filtration ×0,85 ; parole ×0,8 ; ingestion ×0,3 | 0,2 jour |
| Récupération | >0 et <0,2 | +0,2 | Identiques au stade initial | 0,4 jour |

Les facteurs s’appliquent après les offsets de **chaque** capacité, avant plafond, minimum et arrondi. Les capacités dépendantes lisent la conscience ou la filtration déjà modifiée. Multiplier uniquement une vitesse finale par 0,5 ignorerait ces dépendances. La douleur de maladie est globale, sans division par la taille du corps ; les blessures conservent leur propre échelle. Une personne auparavant saine reste mobile dans le cas ordinaire étudié, mais des blessures ou autres maladies peuvent provoquer incapacité ou défaillance vitale par combinaison.

Une ingestion à risque réussie pendant le stade initial ne redémarre pas le compteur. Aux deux autres stades, `FoodUtility` ramène la sévérité à **0,799** : les symptômes restent majeurs, sans nouveau stade initial plus léger. Lisière conserve la première date d’acquisition et actualise le dernier aliment/cause lors de cette rechute ; cette traçabilité d’inspection est son propre état explicite, pas un journal historique complet de Core.

## Vomissement physique

Le composant de santé teste le vomissement tous les **600 ticks Core**. La probabilité est `600 / (intervalleMoyenEnJours × 60000)`, non une échéance garantie. Le test aléatoire précède les gardes vivant sur carte/éveillé/chair ; aucun épisode ne débute chez un dormeur. Un nouveau succès peut remplacer un épisode en cours : aucune période réfractaire artificielle n’est ajoutée.

Le travail de vomissement conserve la posture, arrête le déplacement et tire une durée entière de **300 à 899 ticks Core**. Il choisit une cellule praticable parmi le voisinage et la cellule occupée ; après douze échecs, le treizième tirage ramène à la cellule occupée. Tous les **150 ticks Core** alignés sur la personne, il tente de déposer du vomi. Si la nourriture restante dépasse strictement 10 % du maximum, il retire **4 % de ce maximum**. Le niveau peut passer sous 10 % à cette occasion. Un échec de placement du déchet ne supprime pas cette perte physiologique.

Le démarrage Core interrompt le travail avec reprise demandée. Lisière délègue l’interruption au coordinateur existant pour préserver arête, ingrédients, repas porté et réservations ; elle ne peut ni jeter une cargaison ni attribuer la nutrition d’une ingestion interrompue. La granularité locale est de dix ticks Core : le dernier fragment de durée est terminé au tick local contenant sa fin, soit une discrétisation inférieure à dix ticks Core. La sélection spatiale et le PRNG restent ceux de Lisière, sans affirmation d’identité bit à bit avec Core.

## Périmètre et inconnues

Le lot relie cuisine et pièce entretenue, repas physiques, ingestions humaines/animales, maladie commune, vomi et nettoyage. Les risques bruts n’imposent pas une nouvelle recette. Ajouter pâte nutritive, repas fins, pemmican, élevage et tous les aliments pour ce seul chantier disperserait les validations ; leur acquisition et leurs effets doivent former un futur contenu cohérent.

La classification de l’extérieur est vérifiée par l’enquête hygiène. `HealthAIUtility.ShouldSeekMedicalRest` local ne donne pas de repos médical propre à cette maladie : urgence (notamment incapacité), blessure traitée qui guérit ou maladie immunisable non immune sont les voies pertinentes. Les soins de cette intoxication sont indisponibles ; une autre lésion peut toujours nécessiter un médecin. Le comportement complet de tous les traits, gènes, implants et espèces reste absent. Les tests doivent traiter les seuils et les transitions rares séparément ; une colonie propre peut traverser la campagne commune sans intoxication naturelle, ce qui ne justifie aucun événement forcé.
