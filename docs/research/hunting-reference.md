# Chasse, dépouilles et boucherie — confrontation du 19 septembre 2026

Recherche préparatoire du lot V79, distincte de sa validation. Corpus effectivement relu : chapitres 10–12 (logistique, recettes, alimentation et animaux), 13/15 (compétences et corps), 20/21 (combat et accès) ; classeur SYS/TEST-062..064,077/078,121..125, avec les contrats de réservation et de transfert déjà adoptés. **Adopter** une chaîne physique désignation → tir → achèvement → corps → transport → boucherie → viande/cuir → repas. **Adapter** horloge, navigation, conservation transactionnelle et 3D. **Différer** prédation, dressage, élevage et espèces supplémentaires ; la chasse humaine ne clôt pas SYS-121 sur la prédation animale.

## Sources et niveau de confiance

- Pages communautaires relues : [Hunt](https://rimworldwiki.com/wiki/Hunt), [Hare](https://rimworldwiki.com/wiki/Hare), [Corpse](https://rimworldwiki.com/wiki/Corpse), [Butcher spot](https://rimworldwiki.com/wiki/Butcher_spot), [Butcher table](https://rimworldwiki.com/wiki/Butcher_table), [Meat Amount](https://rimworldwiki.com/wiki/Meat_Amount), [Leather Amount](https://rimworldwiki.com/wiki/Leather_Amount), [Butchery Efficiency](https://rimworldwiki.com/wiki/Butchery_Efficiency), [Butchery Speed](https://rimworldwiki.com/wiki/Butchery_Speed), [Cooking Speed](https://rimworldwiki.com/wiki/Cooking_Speed), [Meat](https://rimworldwiki.com/wiki/Meat), [Lightleather](https://rimworldwiki.com/wiki/Lightleather), [Simple meal](https://rimworldwiki.com/wiki/Simple_meal). Plusieurs fiches se déclarent incomplètes ; les tables et le texte narratif ne sont pas toujours au même niveau de vérification.
- Classes téléchargées de nouveau depuis le [miroir daté du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) : `WorkGiver_HunterHunt`, `JobDriver_Hunt`, `Toils_Combat`, `ExecutionUtility`, `StatPart_NotCarefullySlaughtered`, `StatPart_NaturalNotMissingBodyPartsCoverage`, `HediffSet`, `Pawn`, `Corpse`, `ThingDefGenerator_Corpses`, `CompRottable`, `GenTemperature`, `StatWorker`, `GenRecipe`, `Toils_Recipe`, `RecipeDef`, `GenMath`, `JobDef`, `Pawn_JobTracker`, `JobGiver_GetFood`.
- [XML historiques du 7 septembre 2018](https://github.com/RimWorld-zh/RimWorld-Core/tree/85954e64ea75334f51e33e27a4128809191e430e) : `Core/Defs/RecipeDefs/Recipes_Butchery.xml`, `Recipes_Meals.xml`, `Stats/Stats_Pawns_WorkRecipes.xml`, `Stats_Pawns_General.xml`, `JobDefs/Jobs_Work.xml`, `ThinkTreeDefs/Humanlike.xml`, `ThingDefs_Buildings/Buildings_Production.xml`. Ils recoupent structure et certains paramètres ; leurs valeurs obsolètes sont explicitement rejetées ci-dessous.
- [Correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : corrige l'application du réglage de rendement de boucherie aux blocs de pierre. Postérieur au miroir, il interdit de transposer sans réserve sa branche générique des recettes. Aucun multiplicateur de boucherie ne doit affecter notre taille de pierre.

Copies de travail dans `tmp/hunting-reference`, non requises pour construire le jeu. Certitude élevée pour les branches lisibles du miroir et les invariants retenus, moyenne pour la parité numérique du patch courant. Ni le wiki ni un miroir ancien ne remplacent une comparaison au binaire actuel ; aucune certitude de 100 % annoncée.

## Chasse civile et achèvement

`WorkGiver_HunterHunt` exige une arme primaire à distance, capable de blesser, sans projectile explosif ; un bouclier bloquant le tir interdit aussi le job. Aucun niveau minimal de Tir ou d'Animaux n'est imposé par ce fournisseur. Le niveau 8 indiqué pour le lièvre concerne son dressage. Métier Chasse, désignation, accès, permission et réservation exclusive de la victime restent distincts du tir mobilisé. La liste Faune est une voie normale de désignation. [Hunt](https://rimworldwiki.com/wiki/Hunt)

La recherche de position emploie une portée maximale `max(portée × 0,95 ; 1,42)` pour la proie mobile et ne demande pas de couvert contre elle. Cette limite ne signifie pas qu'il faut rester exactement à 95 % de portée. Les lignes de tir, positions accessibles et nouveaux déplacements de la proie doivent être revalidés. Le job abandonne approche/tir lorsque son âge dépasse strictement **5 000 ticks Core** ; le corps et la désignation survivante ne disparaissent pas pour autant.

Une proie à terre sans effet de mort dangereux au contact déclenche un chemin jusqu'au contact, puis **180 ticks Core** d'attente. Si elle redevient mobile, cette branche échoue. `DoHuntingExecution` applique une petite `ExecutionCut` ignorant l'armure puis la mort, sans amputer arbitrairement le cou : dommage nominal `min(PV de la partie − 1 ; 1)`. Le tir sur une cible dangereuse mourante reste une autre branche, sans objet tant que seul le lièvre est présent.

L'annulation de désignation invalide le job tant que la proie vit. Après sa mort, le chasseur cherche le corps, enlève son interdiction et réserve corps et destination de stockage pour **une unité entière**. Sans meilleure case admissible, la chasse réussit en laissant le corps au sol. Le transport final fait partie de ce job et ne doit pas exiger artificiellement le métier Transport. Ne jamais remplacer ce parcours par une attribution directe de viande.

La chasse reste un travail civil. Le XML `Hunt` ne permet pas la suspension de son déroulement, mais conserve les interruptions ordinaires ; les besoins précèdent le travail aux nouvelles décisions. Le miroir reconsidère les dégâts externes interruptifs, hors ordre forcé, au plus une fois par 180 Core. Il ne prouve pas une interruption générale immédiate à chaque franchissement de faim. Lisière réutilise son pipeline civil de besoins, crises, soins et libération conservatrice : **adaptation de cadence**, pas copie complète du ThinkTree. Une annulation conserve l'arête, la blessure et les projectiles déjà émis ; elle libère seulement les engagements futurs.

La relecture des interruptions confirme que `JobGiver_ConfigurableHostilityResponse` exclut les ordres forcés actuels/proches et l'incapacité, mais **pas** la chasse ni sa visée. Le ThinkTree constant la rend accessible aux civils éveillés non mobilisés, hors crise/incendie ; un état de tir utilisé par la chasse ne doit donc pas neutraliser la réaction Fuir/Attaquer. La réaction est réévaluée par les décisions locales, avec délai de tir et projectiles conservés. [Réaction configurable épinglée](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobGiver_ConfigurableHostilityResponse.cs), [condition de l'arbre constant](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/ThinkNode_ConditionalCanDoConstantThinkTreeJobNow.cs)

## Identité et conservation de la dépouille

Une dépouille contient le corps antérieur, son anatomie et ses parties manquantes. Elle n'est pas une pile fusionnable de viande. Lièvre adulte : **12 kg** ; même espèce et sexe ne rendent pas deux corps interchangeables. La mort, l'apparition au sol, le portage et l'incorporation à une facture exigent un propriétaire unique. La forme 3D reste celle du lièvre couché, avec présentation distincte lorsqu'il est porté. [Hare](https://rimworldwiki.com/wiki/Hare), [Corpse](https://rimworldwiki.com/wiki/Corpse)

`ThingDefGenerator_Corpses` fixe le début de pourriture à **2,5 jours thermiques**, la dessiccation à **5 jours cumulés**. `GenTemperature.RotRateAtTemperature` vaut zéro sous 0 °C, `T/10` entre 0 et 10 °C, puis un au-delà ; 0 °C donne donc aussi zéro. L'intégration thermique commune de Lisière est à conserver lors de chaque changement de propriétaire. Refroidir n'efface jamais l'âge. Un corps pourri ne peut plus être dépecé mais reste un objet physique : ne pas employer la suppression des piles alimentaires pour représenter son pourrissement. Le miroir prévoit en plus détérioration, dégâts de pourriture, bile et gaz ; leur absence éventuelle doit rester visible dans l'inventaire des limites.

Une dépouille animale n'est pas la gestion des corps humains : équipement souillé, deuil, sépultures, cannibalisme et résurrection ont des dépendances propres. L'ingestion directe du corps et la prédation sont également distinctes de la boucherie.

## Rendement : ne pas multiplier les chiffres arrondis de l'interface

Le lièvre affiche nominalement **31 viandes et 16 cuirs légers**, mais ces nombres ne sont pas deux constantes à créditer après une chasse. [Hare](https://rimworldwiki.com/wiki/Hare)

Les statistiques actuelles de [viande](https://rimworldwiki.com/wiki/Meat_Amount) et de [cuir](https://rimworldwiki.com/wiki/Leather_Amount) appliquent les facteurs **avant** une courbe commune `f` : points `(0,0)`, `(5,14)`, `(40,40)`, puis identité. Avec taille adulte 0,2, couverture naturelle restante `C` et facteur de blessure `I` :

```text
viande disponible = f(140 × 0,2 × C × I)
cuir disponible   = f( 40 × 0,2 × C × I)
```

`C` somme la couverture exclusive des parties naturelles restantes ; une partie manquante exclut aussi ses descendants, une prothèse ne devient pas de la viande. Ne pas multiplier par un pourcentage global de PV. `I = 0,66` si une blessure non permanente subsiste, **à l'exception de l'ExecutionCut** ; sinon `I = 1`. Une cicatrice permanente seule ne justifie pas la pénalité. Source : `StatPart_NotCarefullySlaughtered` et `HediffSet.GetCoverageOfNotMissingNaturalParts`.

Exemples calculés pour `C=1`, avant cuisinier/poste : intact `31,085714… / 16,228571…` ; blessé `24,013714… / 14,208`. L'écart avec `31 × 0,66` est réel. Le XML 2018 donne viande de base 90 et cuir générique 0 : **valeurs obsolètes**, rejetées en faveur des définitions contemporaines documentées. Malnutrition et réglage de difficulté font partie des facteurs futurs à intégrer, sans inventer leur présence dans le profil actuel.

L'efficacité du cuisinier et celle du poste multiplient ensuite ces valeurs flottantes. `Pawn.ButcherProducts` applique deux arrondis probabilistes successifs, viande puis cuir. `GenMath.RoundRandom` consomme un tirage même si la fraction est zéro. Lisière doit prévalider toutes les sorties avant de publier PRNG, pertes, suppression du corps ou produits : une place manquante ne doit permettre ni duplication ni nouveau tirage opportuniste.

## Poste, compétence et travail

L'[emplacement de boucherie](https://rimworldwiki.com/wiki/Butcher_spot) est gratuit et instantané, 1×1, traversable, avec service adjacent. Il restitue **70 %**, sans ralentissement intrinsèque supplémentaire. La [table](https://rimworldwiki.com/wiki/Butcher_table) est 3×1, coûte 75 unités de matériau admissible plus 20 bois, demande 2 000 Core de construction, et restitue 100 %. Table et emplacement partagent le travail de boucherie : **450 Core**, compétence Cuisine, aucun minimum requis dans la recette. Environnement et installations éventuelles restent des multiplicateurs séparés.

Pour un niveau Cuisine `L`, manipulation `M`, vision `V` et vitesse globale `G` :

```text
vitesse de boucherie = max(0,1 ; (0,40 + 0,06 L) × M × (0,60 + 0,40 min(V,1)) × G)
efficacité          = clamp((0,75 + 0,025 L) × (0,10 + 0,90 M)
                            × (0,60 + 0,40 min(V,1)), 0, 1,5)
```

[Butchery Speed](https://rimworldwiki.com/wiki/Butchery_Speed), [Butchery Efficiency](https://rimworldwiki.com/wiki/Butchery_Efficiency). La borne actuelle d'efficacité 150 % remplace l'ancien maximum 100 % du XML. Le facteur de poste 0,7 s'applique au rendement après la statistique du cuisinier, pas à la durée. Aucun façonnage de qualité n'est demandé.

`Toils_Recipe` distingue recette avec ou sans ouvrage inachevé. Boucherie et repas sans ouvrage versent l'expérience **à la finition**, en fonction du temps réellement travaillé : `0,1 × ticks Core travaillés × workSkillLearnFactor`. Les XML consultés gardent le facteur 1. Le gain arrive **avant** la génération des produits et peut donc faire évoluer le niveau utilisé pour le rendement. Trajet, attente d'une sortie bloquée et récupération ne produisent pas de temps de travail. Pour une transaction locale atomique, calculer d'abord le résultat après apprentissage sur une copie, puis tout publier ensemble. Interruption ne justifie ni produit ni XP de finition ; la reprise doit préciser si elle est une sauvegarde du même job ou un nouveau travail.

La facture possède un compteur spécifique : `RecipeWorkerCounter_ButcherAnimals` autorise « jusqu’à X » et compte la catégorie entière `MeatRaw` via le compteur des ressources de la carte. Il ne compte ni les corps ni le cuir, et n’ajoute pas le contenu porté contrairement au compteur générique de recettes. Avec une seule espèce locale, la viande de lièvre est le seul membre de ce total ; conserver cette distinction lorsque d’autres viandes arriveront. [Compteur spécialisé épinglé](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/RecipeWorkerCounter_ButcherAnimals.cs)

## Viande, cuisson et consommation

La viande de lièvre conserve son espèce : aliment cru, **0,05 nutrition/unité**, pile maximale 75, **0,03 kg/unité**, pourriture à **2 jours thermiques**. Le cuir léger est un textile distinct, pile maximale 75, non alimentaire. La viande peut alimenter seule un repas simple : **0,5 nutrition d'ingrédients → 0,9 nutrition**, soit dix viandes ; pas de minimum Cuisine. Travail neutre 300 Core, doublé au feu par le facteur du poste. Le produit neuf commence frais ; transférer une viande existante conserve son âge. [Meat](https://rimworldwiki.com/wiki/Meat), [Lightleather](https://rimworldwiki.com/wiki/Lightleather), [Simple meal](https://rimworldwiki.com/wiki/Simple_meal)

La vitesse de cuisson actuelle **n'est pas** la vitesse multiplicative de boucherie. [Cooking Speed](https://rimworldwiki.com/wiki/Cooking_Speed) donne `score = L + 16 × (min(M,1,5) − 1) + 4 × (min(V,1,5) − 1)`, borné à −20..20. Courbe : `0,4 + 0,015 × score` sous zéro, `0,4 + 0,06 × score` au-dessus ; vitesse globale ensuite, minimum final 0,1. La migration ne doit pas inventer de biographie pour les anciens colons : tout maintien d'un profil neutre historique doit être distingué d'un véritable niveau zéro.

Manger cru doit utiliser l'accès, le régime et l'ingestion communs, avec la pensée de nourriture crue déjà disponible. La référence prévoit aussi 2 % d'intoxication pour viande crue : si ce système médical reste absent, le consigner explicitement, sans annoncer une viande parfaitement fidèle. Un lièvre herbivore ne doit pas consommer le nouvel item `hare-meat` par simple inclusion dans la catégorie générale des aliments.

La sélection alimentaire humaine n’ajoute pas une pénalité arbitraire pour `RawBad`. Le générateur de viande attribue ce classement et la pensée `AteRawFood`, sans offset humain supplémentaire. `FoodOptimality` transforme la pensée −7 en **−82** via sa courbe, comme pour le riz ; les baies sans cette pensée restent à zéro. À ces bases s’ajoutent la distance et le bonus commun de **+12** pour un aliment frais qui pourrit dans moins d’une demi-journée à sa température actuelle. Le classement peut filtrer une recherche sans constituer lui-même un malus de goût supplémentaire. [Générateur de viande épinglé](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/ThingDefGenerator_Meat.cs), [sélection alimentaire épinglée](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/FoodUtility.cs)

## Vérifications à intégrer au lot

Un petit nombre de scénarios profonds doit relier ces contrats : chasse civile avec cible mobile, finition interrompue par récupération, mort concurrente, annulation et rechargement ; transfert du même corps avec sol saturé, réservation concurrente et changement de température ; facture avec corps presque pourri, sortie bloquée et rendement anatomique ; repas réellement préparé puis ingéré, bilan séparant pertes/produits/consommation. Le parcours de colonie doit réaliser cette filière par les commandes du joueur. Les conditions et résultats effectivement livrés appartiennent au contrat et aux preuves V79, pas à ce document de recherche.
