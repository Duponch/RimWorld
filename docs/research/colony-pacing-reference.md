# Rythme réel d'une colonie Core : narrateurs, difficulté et incidents

Recherche du **20 septembre 2026**, en mode jour. L'utilisateur a demandé de suspendre les ajustements et pilotes de première semaine pour comprendre le déroulement de RimWorld avant de modifier Lisière. La [préparation de première semaine](first-week-reference.md) reste une préparation suspendue ; ses propositions de calendrier ne sont pas une cible validée. **Cette enquête seule n'a livré aucun gameplay.** La tranche V82 autorisée ensuite est validée dans son périmètre ; son adoption partielle est séparée du relevé Core à la fin de ce document.

## Référence et portée des preuves

Le chapitre 24 du corpus et **SYS/TEST-132..135**, relus via [reference-adoption](reference-adoption.md), demandent de séparer rythme, admissibilité, budget, faction, stratégie, arrivée, conséquences et lettres. Les chapitres 12–15 distinguent écologie, accueil, besoins et santé. Décision : **adopter** ces séparations ; **vérifier** les réglages dans les définitions et le code ; **adapter** horloge/PRNG/3D ; **différer** uniquement les contenus explicitement absents. Une progression imposée par un test ne remplace pas une règle du jeu de référence.

**Source primaire locale : RimWorld 1.6.4871 rev590**, vérifiée dans `E:/Steam/steamapps/common/RimWorld/Version.txt`. Lecture seule des fichiers ; aucune copie des XML ou du code propriétaire n'est publiée dans le dépôt. Les valeurs ci-dessous sont des relevés factuels et les algorithmes des paraphrases. L'assemblée a été inspectée avec ILSpy temporaire, sans lancer le jeu ni exécuter ses méthodes.

| Référence locale | Fichiers / classes inspectés |
| --- | --- |
| Définitions, sous `Data/Core/Defs/` | `Storyteller/Storytellers.xml`, `Misc/DifficultyDefs/Difficulties.xml`, `Scenarios/Scenarios_Classic.xml`, `Storyteller/Incidents_Map_{Misc,Threats,Disease,Special}.xml`, `GameConditionDefs/GameConditions_Misc.xml`, `BiomeDefs/Biomes_Temperate.xml`, `QuestScriptDefs/Script_WandererJoins.xml`. |
| Menu réel | `Page_SelectStoryteller`, `StorytellerUI`, `GameInitData`, `Difficulty`, `DifficultyDef`. |
| Cadence et sélection | `Storyteller`, `StorytellerComp`, `ClassicIntro`, `OnOffCycle`, `CategoryMTB`, `RandomMain`, `Disease`, `FactionInteraction`, `Triggered`, `IncidentCycleUtility`, `IncidentWorker`, `IncidentQueue`, `StoryState`, `Rand`. |
| Puissance / population | `StorytellerUtility`, `StorytellerUtilityPopulation`, `StoryWatcher_Adaptation`, `StoryWatcher_PopAdaptation`, `Map`, `WealthWatcher`. |
| Incidents précis | `IncidentWorker_Raid`, `RaidEnemy`, `HeatWave`, `ColdSnap`, `MakeGameCondition`, `AnimalInsanitySingle`, `GameCondition_HeatWave`, `QuestNode_Root_WandererJoin_WalkIn`, `IncidentParmsUtility`, `PawnGroupKindWorker_Normal`, `Pawn_HealthTracker`. |

Empreintes SHA-256 : assemblée `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` ; `Storytellers.xml` `def397844c6f02595c447ad0f60f19edebecb84a6398e54e871a38b6fe8be0c5` ; `Difficulties.xml` `4588255920d559d6b3cb3efc3b71a48d5e656f62bea0fc6b0b9e8d6cf166ac90`. Le manifeste de travail et les inspections restent dans `tmp/pacing-reference`.

Recoupements Internet effectués : [présentation officielle](https://rimworldgame.com/), [correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), [classes publiques du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f), pages [Cassandra](https://www.rimworldwiki.com/wiki/Cassandra_Classic), [Phoebe](https://www.rimworldwiki.com/wiki/Phoebe_Chillax), [Randy](https://www.rimworldwiki.com/wiki/Randy_Random), [narrateurs/difficultés](https://www.rimworldwiki.com/wiki/Storyteller) et [points de raid](https://rimworldwiki.com/wiki/Raid_point). L'ancien [XML de septembre 2018](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/Storyteller/Storytellers.xml) est désormais une comparaison historique, **pas l'arbitre des chiffres actuels**. Les pages wiki ne remplacent pas les Defs installées ; leurs moyennes et affirmations de garantie ne sont pas reprises automatiquement.

L'inspection certifie les branches relevées de cette installation, pas toute version future, un ensemble de mods ni tous les parcours possibles. Les tableaux excluent les composants explicitement conditionnés aux extensions et les cartes spatiales.

## Ce que le menu choisit réellement par défaut

`Page_SelectStoryteller.PreOpen` prend le premier narrateur visible trié par `listOrder` : **Cassandra**, devant Phoebe et Randy. Le choix n'est pas tiré au hasard.

En revanche, **aucune difficulté n'est présélectionnée** dans la page normale. Le bouton suivant refuse de continuer tant que le joueur n'a pas choisi une difficulté et un mode de sauvegarde. `Reload anytime` et `Commitment` sont deux choix explicites. Le mode développeur seul fournit automatiquement `Rough` et le rechargement libre si ces choix manquent. **Ce repli de débogage ne définit pas une difficulté normale par défaut.**

Les six profils standard sont Peaceful, Community builder, Adventure story, Strive to survive, Blood and dust, Losing is fun ; Custom est un septième choix. Choisir Custom initialise ses valeurs à partir de `Rough`/Strive to survive ; les boutons de réinitialisation permettent ensuite d'employer un autre profil standard. Les réglages d'une ancienne sauvegarde ou les préférences personnelles de l'utilisateur ne remplacent pas ce comportement du menu.

Conséquence pour Lisière : la référence d'un futur parcours doit inclure **le scénario, le narrateur, le profil de difficulté explicitement choisi, le site et les extensions actives**. « Partie RimWorld normale » ne fixe pas ces paramètres. Une valeur neutre à 100 % peut être utile pour isoler une règle, mais ne doit pas être présentée comme une sélection automatique du menu.

**Décision utilisateur prise après cette recherche : Atterrissage forcé, Cassandra et Récit d'aventure (`Medium`) constituent désormais la cible initiale.** Le menu du prototype doit proposer Nouvelle partie et Charger fonctionnels, Options seulement si des réglages sont réellement disponibles ; les autres entrées restent grisées. Seuls ce scénario et cette difficulté sont activables dans la première tranche. Cassandra correspond bien à la présélection originale ; Récit d'aventure est ici un choix explicite de périmètre, **pas une difficulté par défaut inventée pour RimWorld**. L'examen des autres profils ci-dessous prépare leur extension, sans les annoncer disponibles.

## Introduction classique : une séquence bornée, pas toute la narration

Dans l'installation inspectée, Cassandra et Phoebe possèdent `ClassicIntro` ; Randy n'en possède pas. Le composant utilise le temps écoulé global `TicksGame`, vise la **première carte d'habitation** et propose les occasions suivantes. Une journée Core vaut 60 000 ticks ; le jour civil affiché dépend aussi du décalage initial, donc les dates ci-dessous sont des **durées écoulées**, pas des libellés de calendrier.

| Temps Core | Durée écoulée | Occasion proposée |
| ---: | ---: | --- |
| 150 000 | 2,5 jours | Visiteurs, budget entier tiré de 40 à 99 inclus. Ce ne sont pas des recrues garanties. |
| 204 000 | 3,4 jours | Petite menace si `allowIntroThreats`, sinon incident divers. Sur une carte Core ordinaire, la définition de petite menace correspond à l'animal enragé isolé. |
| 264 000 | 4,4 jours | Un incident de catégorie `Misc`, choisi par poids ; pas forcément une capsule, une canicule ou une personne. |
| 324 000 | 5,4 jours | Raid ennemi avec budget initial de 40 points ; remplacé par `Misc` si les menaces d'introduction sont interdites. |

Le raid fixe ses points **après** la création des paramètres ordinaires : ce budget introductif n'est pas simplement le produit richesse × difficulté. Faction, stratégie, mode d'arrivée, groupes disponibles et minima de génération interviennent ensuite. Le code ne dit pas « créer notre assaillant sans arme » ; la composition doit sortir des définitions militaires admissibles.

La préparation introduit `raidForceOneDowned` et `raidNeverFleeIndividual`. La chaîne `IncidentParmsUtility` → `PawnGroupKindWorker_Normal` rend un des combattants recrutable, bloque sa fuite individuelle et arme le drapeau médical qui écarte le tirage supplémentaire de mort lors de sa première mise à terre. **Cela ne garantit pas sa survie à un coup anatomiquement létal** et ne le fait pas apparaître blessé au sol. La capture/recrue potentielle est un prolongement de la défense, absent de notre boucle actuelle.

Ces occasions restent soumises à `CanFireNow` et à une exécution possible : cible, population, espèces présentes, factions, scénario, difficulté, etc. Le code installé de `ClassicIntro`/`Storyteller.TryFire` **ne reporte pas automatiquement le premier raid au lendemain lorsqu'un autre événement survient**. Cette affirmation du wiki Cassandra n'est pas retenue comme règle. `IncidentQueue` possède bien un mécanisme séparé de réessai, mais il faut qu'un producteur mette explicitement un incident en queue avec une durée de réessai ; l'introduction inspectée ne le fait pas.

Un raid antérieur peut provenir d'un tutoriel, scénario, quête ou changement de narrateur. Il ne suffit pas de lire le narrateur final d'une sauvegarde pour attribuer tous ses événements à ce profil. Le mode Tutor est un narrateur caché distinct dans les Defs. Une partie tutorielle n'est donc pas une preuve de la cadence du départ Crashlanded normal.

## Cadences après l'introduction

`Storyteller` examine ses composants toutes les **1 000 ticks Core**, soit 60 fois par jour. Le temps de jeu, y compris en accéléré, pilote cette cadence ; la pause ne fait pas mûrir un calendrier en temps réel. Le contrôle de début des composants exige un temps strictement supérieur à `minDaysPassed`.

| Profil / composant | Paramètres locaux 1.6.4871 | Interprétation correcte |
| --- | --- | --- |
| Cassandra, grandes menaces | Début 11 jours ; fenêtre active 4,6 jours puis repos 6 jours ; nombre tiré entre 1 et 2 ; espacement minimal 1,9 jour. | Occasions placées dans des fenêtres ancrées au temps d'installation. La prochaine fenêtre ne commence pas six jours après la mort du dernier ennemi. |
| Phoebe, grandes menaces | Début 13 jours ; 8 jours actifs puis 8 jours de repos ; une occasion. | Plus d'espace entre les menaces, sans réduction automatique de leur budget par rapport à Cassandra. |
| Cassandra/Phoebe, type initial | `forceRaidEnemyBeforeDaysPassed = 20`. | Les occasions de grande menace de ce composant avant 20 jours cherchent un raid admissible ; ensuite le choix peut inclure d'autres grandes menaces. |
| Cassandra/Phoebe, petites menaces | Mêmes débuts/fenêtres que leur composant majeur ; plage 0,2–1, arrondie aléatoirement ; acceptation décroît de 1 à 0 entre 800 et 2 800 points de menace. | Une plage fractionnaire ne promet pas au moins une petite menace dans chaque fenêtre. |
| Cassandra/Phoebe, incidents divers de carte | Début 5 jours ; `mtbDays = 4,8`. | Un tirage récurrent de catégorie, en plus de l'occasion introductive à 4,4 jours. Aucun événement particulier garanti tous les 4,8 jours. |
| Randy, mécanisme principal | Début 1 jour ; `mtbDays = 1,35` ; multiplicateur de points 0,5–1,5. | Pas de fenêtres de repos générales sur une carte de surface. Les autres composants, dont maladies et quêtes, restent distincts. |

`IncidentCycleUtility` détermine le nombre puis les positions d'occasions dans chaque fenêtre à partir de la graine persistante du monde, de la cible, du composant et du cycle. Il impose l'espacement, puis peut réduire les occasions par une fraction d'acceptation. Sauvegarder ne crée donc pas une nouvelle fenêtre. Les fenêtres « off » concernent leur composant de menaces : elles **n'interdisent pas** maladies, accidents, incidents divers ou menaces produites par une quête.

Pour les mécanismes MTB relevés ici, `Rand.MTBEventOccurs` emploie à chaque contrôle la probabilité `1 000 / (MTB × 60 000)`. Un MTB décrit le taux des **occasions de tirage**, pas une échéance ni le délai moyen d'un événement particulier après tous les filtres. Ainsi Randy a une occasion avec probabilité 1/81 par contrôle de son composant principal, tandis que le composant Misc classique utilise 1/288. Aucune moyenne globale de raid n'est déduite de ces seuls nombres.

Poids initiaux de catégories de Randy : Misc 3,5 ; ThreatBig 1,4 ; OrbitalVisitor 1,1 ; FactionArrival 2,4 ; ThreatSmall 0,6 ; ShipChunkDrop 0,22. Une catégorie sans incident utilisable peut être écartée et une autre essayée. Si plus de 13 jours se sont écoulés depuis la dernière grande menace enregistrée, **la prochaine occasion principale** tente d'abord ThreatBig ; ce n'est ni un déclenchement automatique exactement au treizième jour ni un maximum absolu si aucune menace n'est exécutable.

Le registre est mis à jour quand l'incident est effectivement lancé, pas quand ses ennemis repartent. Les incidents forcés ne sont pas enregistrés de la même manière que ceux du narrateur. Les conséquences et la clôture d'un combat restent essentielles, mais elles ne constituent pas à elles seules la pendule du narrateur.

## Accueil, animaux, maladie et température

La sélection d'un incident passe par les poids de définition, les conditions actuelles, les facteurs de population et la mémoire des incidents récents. Le nombre `baseChance` est un **poids relatif**, pas un pourcentage quotidien. Les incidents d'accueil ne constituent pas une file de recrues à débit fixe.

| Famille | Référence actuelle et nature du temps | Conséquence pour la première période |
| --- | --- | --- |
| Voyageur demandant à rejoindre | `WandererJoin`, catégorie Misc, poids 0,4, effet de population IncreaseEasy. La Def appelle la quête `WandererJoins`, dont la racine est `QuestNode_Root_WandererJoin_WalkIn`. L'offre dure 60 000 ticks après sa création. | Aucun arrivant garanti vers 1,5–2 jours. Le délai d'un jour porte sur la **réponse à une offre déjà tirée**, pas sur la fréquence d'apparition. |
| Capsule de réfugié | Misc, poids 1,5, effet IncreaseMedium, présence de colons requise. | Secours et recrutement ne se réduisent pas à une seconde variante d'acceptation automatique. |
| Apprivoisement / ferme / migration | SelfTame poids 1 ; FarmAnimalsWanderIn 0,4 ; HerdMigration 1, tous Misc. Leurs préconditions et espèces restent spécifiques. | Aucune acquisition animale promise dans la semaine. L'animal domestique initial du scénario, la population sauvage et ces incidents sont trois mécanismes distincts. |
| Animal enragé isolé | ThreatSmall, poids 5, minimum de répétition 2 jours ; le contrôleur choisit un animal présent admissible, puissance de combat au plus 40 avant le jour 7, puis 150. | L'introduction ne matérialise pas arbitrairement une bête au milieu du camp ; l'absence de candidat peut empêcher l'événement. |
| Maladies incidentes | Composants humains et animaux séparés : admissibilité après 9 jours Cassandra, 12 Phoebe, 0 Randy. MTB du biome × `diseaseIntervalFactor`, puis choix de maladie par poids et victimes admissibles. | Pas de « première maladie au jour N ». Forêt tempérée : MTB de base 50 jours pour ces tirages ; marais tempéré 40. L'infection après blessure n'utilise pas ce calendrier. |
| Canicule | HeatWave : Misc, poids 1, minimum de répétition 30 jours, durée tirée 1,5–3,5 jours ; température saisonnière ≥20 °C. Pas d'autre canicule active, ni condition incompatible. | Possible via une occasion admissible, jamais obligatoire au jour 6–7. Le minimum est compté depuis le déclenchement précédent, pas depuis sa fin. |
| Vague de froid | ColdSnap : Misc, poids 1, minimum de répétition 30 jours, durée 1,5–3,5 jours ; température saisonnière strictement entre 0 et 15 °C. | Ne se déduit pas d'un simple décalage aléatoire identique à la chaleur sur toute carte. |

La canicule ajoute jusqu'à **17 °C**, avec transitions de **12 000 ticks Core** au début et à la fin. Les Defs excluent sa coexistence avec ColdSnap et VolcanicWinter ; l'effet ne s'applique pas aux cartes souterraines. L'amplitude, la transition et la durée déjà choisies dans Lisière correspondent aux valeurs relevées ; **son calendrier garanti est l'écart principal**. HeatWave/ColdSnap ne sont pas marqués comme les incidents interdits par l'option « météo extrême » : ne pas supposer que Peaceful les désactive. Cette option exclut notamment d'autres événements, tels que ToxicFallout/VolcanicWinter/Flashstorm, selon leurs Defs.

En forêt tempérée, les maladies ne partagent pas toutes le même poids : les Defs de biome donnent notamment 100 à grippe/peste/malaria, 50 à vers/parasites, 30 aux mécaniques fibreuses/sensorielles ; la catégorie et les préconditions filtrent ensuite ces entrées. La difficulté agit sur l'**intervalle**, l'UI affichant sa réciproque comme fréquence. Une difficulté réglée à zéro fréquence n'autorise pas un incident compensatoire ultérieur. Aucun système de maladie incidente n'est livré par notre seule infection de plaie.

Les relations de faction ajoutent encore des occasions distinctes. Cassandra/Phoebe déclarent, par année de 60 jours, 5 caravanes marchandes de base après 5 jours, espacement minimal 6 ; 4 groupes de visiteurs après 3 jours, espacement 5 ; 6 groupes de voyageurs après 1 jour, espacement 1. Ces valeurs passent par la proportion de factions admissibles et les contrôles du worker : **ni cinq caravanes réussies garanties, ni un commerçant imposé avant le quinzième jour**. L'aide alliée exige en plus un danger élevé et de vrais alliés.

La perte de toute capacité d'action peut également solliciter le composant distinct de l'homme en noir, après les événements médicaux/population admissibles. Les Defs locales imposent une population maximale passée d'au moins trois et 60 jours avant répétition ; délai configuré 180 ticks. Ce mécanisme de secours ne justifie ni l'effacement des victimes ni une victoire automatique. Il reste absent de Lisière.

## Difficulté : plusieurs leviers, pas seulement la taille des raids

Valeurs des profils locaux, résolues avec les valeurs par défaut de `DifficultyDef` lorsqu'un champ est absent du XML. Les noms anglais évitent de dépendre d'un paquet de traduction. `Maladie × intervalle` est l'inverse de la fréquence affichée ; toutes les colonnes sont des réglages distincts.

| Profil | Menace × | Humeur | Récolte × | Boucherie × | Recherche × | Maladie × intervalle | Infection × | Adaptation : croissance / effet |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Peaceful | 0,10 | +10 | 1,20 | 1 | 1,20 | 3 | 0,30 | 0 / 1 |
| Community builder | 0,30 | +10 | 1,20 | 1 | 1,20 | 2,5 | 0,50 | 0,25 / 1 |
| Adventure story | 0,60 | +5 | 1 | 1 | 1 | 1,5 | 0,75 | 0,75 / 1 |
| Strive to survive | 1 | 0 | 1 | 1 | 1 | 1 | 1 | 1 / 0,90 |
| Blood and dust | 1,55 | −5 | 0,95 | 0,90 | 0,95 | 0,95 | 1 | 1 / 0,70 |
| Losing is fun | 2,20 | −10 | 0,80 | 0,80 | 0,90 | 0,90 | 1,10 | 1 / 0,40 |

Peaceful interdit les grandes menaces, menaces d'introduction et quêtes violentes ; le simple multiplicateur 0,10 ne décrit donc pas son comportement. Peaceful et Community builder interdisent aux prédateurs de chasser les humains et désactivent les incidents explicitement classés « météo extrême ». Les chances d'intoxication, de revanche animale, les prix, le rendement minier, les morts ennemies à terre et d'autres options sont également séparés. `Custom` expose notamment une échelle de menace de 0 à 500 %, l'adaptation, et une option de menace indépendante de la richesse ; **cette dernière est désactivée dans les profils standard**.

Un test de Lisière sans profil de difficulté doit donc s'annoncer comme tel. Le convertir en « Strive to survive » exige aussi les paramètres autres que 100 % de menace ; convertir la difficulté en un seul curseur serait une simplification fonctionnelle, pas une équivalence.

### Profil retenu : Récit d'aventure / Medium

Le relevé suivant résout les champs absents avec `DifficultyDef`, puis les affectations supplémentaires de `Difficulty.CopyFrom`. Il couvre les paramètres de difficulté Core pertinents pour ce projet, y compris ceux dont le système reste absent. Un coefficient relevé ne signifie pas qu'il est déjà appliqué dans Lisière.

| Paramètre / domaine | Valeur résolue | Portée et précaution d'intégration |
| --- | --- | --- |
| `threatScale` | 0,60 | Budget ordinaire de menace ; ne pas multiplier à nouveau les 40 points imposés par l'introduction. |
| `allowBigThreats`, `allowIntroThreats`, `allowViolentQuests`, `allowCaveHives` | Tous vrais | Récit d'aventure conserve les événements dangereux. Leur catalogue manquant reste à annoncer. |
| `peacefulTemples` | Faux | Les dangers correspondants ne deviennent pas pacifiques. |
| `predatorsHuntHumanlikes`, `allowExtremeWeatherIncidents` | Vrais | Ni protection générale contre les prédateurs, ni suppression des incidents météo explicitement filtrés. |
| `colonistMoodOffset` | +5 | Offset de cible d'humeur, pas guérison instantanée ni modification des seuils de crise. |
| `cropYieldFactor`, `mineYieldFactor`, `butcherYieldFactor`, `researchSpeedFactor` | Tous 1 | Rendements agricoles/miniers/boucherie et recherche inchangés ; ne pas modifier la durée de croissance du riz pour accélérer le départ. |
| `playerPawnInfectionChanceFactor` | 0,75 | Multiplicateur du **second tirage différé** d'une plaie chez la faction du joueur ; ni premier tirage d'exposition, ni progression d'une infection acquise, ni effet implicite sur tout animal sauvage. |
| `foodPoisonChanceFactor` | 0,75 | Risque d'intoxication alimentaire, distinct de la pourriture et de la nutrition. |
| `diseaseIntervalFactor` | 1,5 | Intervalle multiplié, donc fréquence théorique des occasions divisée par 1,5. En forêt tempérée : MTB 75 jours par composant humain/animal, après le début du composant Cassandra ; ce n'est pas une date promise. |
| `manhunterChanceOnDamageFactor` | 1 | Pas de réduction de la réaction enragée ; ne pas confondre celle-ci avec notre seule riposte physique locale du lièvre. |
| `scariaRotChance` | 0,333 | Probabilité spécifique aux cadavres atteints de scaria ; elle ne s'applique pas à toute proie chassée. |
| `enemyDeathOnDownedChanceFactor` | 1 | Facteur du mécanisme ennemi de mort à la mise à terre, pas certitude de décès. L'exception introductive décrite plus haut reste distincte. |
| `friendlyFireChanceFactor`, `allowInstantKillChance` | 0,40 ; 1 | Réglages supplémentaires remis par `CopyFrom` ; facteurs de leurs mécanismes, pas 40 % de risque global à chaque balle ni invulnérabilité contre un coup létal. |
| `adaptationGrowthRateFactorOverZero`, `adaptationEffectFactor` | 0,75 ; 1 | Croissance positive de l'adaptation modérée ; effet entier. Au départ, le facteur d'adaptation de menace vaut donc 0,8. |
| `minThreatPointsRangeCeiling` | 70 | Plafond de la courbe de minimum ; 35 jusqu'au jour 12, progression vers 70 au jour 35. |
| `fixedWealthMode`, `fixedWealthTimeFactor` | Faux ; 1 | Budget dépendant de la richesse réelle ; le facteur de temps reste inactif tant que le mode indépendant de richesse est désactivé. |
| `tradePriceFactorLoss`, `maintenanceCostFactor` | 0 ; 1 | Aucune pénalité supplémentaire de difficulté sur les prix ni changement du multiplicateur d'entretien ; les règles propres aux objets restent actives. |
| `questRewardValueFactor`, `raidLootPointsFactor` | 1 ; 1 | Les propriétés **effectives** divisent ces valeurs par le multiplicateur de menace borné : chacune vaut ici 1 / 0,6, soit environ 1,6667. Ne pas copier seulement le champ brut dans les futurs générateurs concernés. |
| `enemyReproductionRateFactor`, `deepDrillInfestationChanceFactor` | 0,5 ; 0,75 | Paramètres des systèmes d'ennemis/infestations correspondants, encore distincts de nos raids humains simples. |
| `allowTraps`, `allowTurrets`, `allowMortars`, `classicMortars` | Vrai ; vrai ; vrai ; faux | Constructions autorisées par difficulté ; absence actuelle d'une construction ne devient pas un interdit de ce profil. |
| `adultAgingRate`, `unwaveringPrisoners` | 1 ; vrai | Vieillissement adulte et option de prisonniers déterminés ; appliquer seulement dans leurs domaines et conditions d'extension, sans inventer un système livré. |

**Précision rétroactive du 20 septembre, lors de V82 :** la position du facteur infectieux a été vérifiée directement dans `Verse.HediffComp_Infecter` de l'assembly local 1.6.4871 dont l'empreinte figure ci-dessus. Le composant expose d'abord la nouvelle plaie, puis applique la difficulté à son échéance, après les facteurs de gravité et de soin/pièce, sous la condition `Faction.OfPlayer`. La formule précédemment nommée « risque d'infection » était incomplète sur ce placement ; elle ne doit pas conduire à réduire les deux tirages. Le multiplicateur animal 0,1 reste, lui, placé au premier tirage.

Les champs liés à des contenus d'extension sont relevés séparément pour ne pas les importer dans le périmètre Core : ressources minières nomades 0,5 ; infestations de déchets 0,5 ; pêche 1 ; croissance des enfants 4 ; bébés toujours sains faux ; exclusion des enfants faux ; enfants assaillants faux ; renfort de conversion à faible population 3 ; fractions Anomaly inactif/actif 0,08/0,30 ; efficacité d'étude 1. Leur présence dans une classe partagée n'active pas l'extension correspondante. Les options nouvelles doivent conserver cette séparation.

V82 applique **cible d'humeur +5 et second tirage d'infection du joueur ×0,75**, en plus de la sélection persistante du profil. Les facteurs de rendement/recherche restent 1 ; le narrateur et les autres paramètres gardent leurs limites décrites ci-dessous. Le nom du profil ne suffit pas à reproduire la difficulté : le facteur de menace de 60 % ne peut notamment pas être appliqué sans budget de menace.

## Richesse, personnes et adaptation : comment la puissance se construit

Pour la carte d'habitation Core standard, `Map.PlayerWealthForStoryteller` emploie la valeur des objets, **la moitié de la valeur des bâtiments** et la valeur des personnes/animaux appartenant à la colonie. `WealthWatcher` distingue objets présents hors brouillard de guerre, possessions et conteneurs, constructions du joueur, sols et personnes ; il ne transforme pas tous les arbres et minerais non extraits en richesse détenue. Ce filtre n'est pas une preuve d'accès par navigation : un objet enfermé peut compter. Le correctif officiel 1.6.4850 a explicitement mis la valeur de ponts anciens à zéro pour éviter une hausse artificielle sur les ruines : le périmètre de la richesse compte autant que la formule.

Schéma de calcul lu dans `StorytellerUtility.DefaultThreatPointsNow`, hors extensions et autres cibles :

1. Transformer la richesse par une courbe : 0 point jusqu'à 14 000, puis repères 400 000→2 400, 700 000→3 600, 1 000 000→4 200.
2. Ajouter les contributions des colons : courbe par personne selon richesse, 15 aux faibles richesses, 140 à 400 000, 200 à 1 000 000 ; la santé module cette contribution. Les animaux domestiques dressables au lâcher et non incapables ont une contribution de combat distincte ; les lièvres sauvages n'en ont pas.
3. Appliquer facteur de cible (1 pour une carte d'habitation ordinaire), adaptation pondérée par la difficulté, échelle de menace et facteur d'ancienneté.
4. Borner le résultat, puis laisser la génération du raid appliquer ses propres contraintes de faction, stratégie, arrivée et coût des unités. Randy ajoute son facteur aléatoire au budget du composant principal.

Le facteur d'ancienneté vaut **0,70 jusqu'à 10 jours**, progresse vers 1 au jour 40, puis reste à 1. La borne globale supérieure est 10 000 points. Le minimum n'est pas éternellement une constante universelle : `GlobalPointsMin` tire une valeur reproductible entre 35 et un plafond dont la courbe part de 35 jusqu'au jour 12 et atteint son réglage au jour 35 (70 par défaut, 45 pour les deux profils faciles). Le raid d'introduction à 40 points est une branche particulière, pas un exemple du calcul générique complet.

L'adaptation de menace conserve `adaptDays`, initialement 0, borné −60..100. À zéro, sa courbe brute donne 0,8 ; le profil de difficulté mélange cette valeur avec 1 (exemple : effet 0,9 → facteur initial 0,82). Pendant les 30 premiers jours, le compteur ne croît pas lorsqu'il est déjà non négatif ; il peut néanmoins diminuer après une perte et remonter lorsqu'il est négatif. Mise à jour toutes les demi-journées ; taux par morceaux, modulé par la difficulté lorsque le compteur est strictement positif.

Une mise à terre **due à une violence externe** diminue l'adaptation selon la population ; une perte de colon suit une autre courbe. À petite population, les repères sont environ six jours d'adaptation retirés pour une mise à terre à trois personnes et trente pour une perte. Le code évite de compter deux fois la mise à terre et la mort du même tick. L'évolution de santé peut donc alléger le prochain budget ; elle ne promet pas que tout autre incident sera suspendu jusqu'à guérison.

**L'adaptation de population est une seconde mémoire**, différente. Les trois narrateurs visibles héritent actuellement de la même courbe de désir de population : `(0, 8)`, `(1, 2)`, `(4, 1)`, `(7, 0,35)`, `(11, 0)`, `(20, −1)`. Une acquisition remet son compteur à zéro ; le facteur remonte vers 1 sur huit jours sans acquisition. Les descriptions anciennes attribuant à Randy une population cible de cinquante ne correspondent pas à ces Defs.

Le désir module la sélection des incidents augmentant la population et leurs poids, avec décalages selon la difficulté d'acquisition. Un plancher subsiste (0,05 en général, 0,2 pour le RandomMain de Randy) : **onze ou douze colons ne créent pas une interdiction absolue d'arrivants**. Prisonniers, caravanes et autres états ont des contributions propres ; ni un compte brut de personnes sur la seule carte ni notre seuil actuel de douze ne reproduisent ce contrat.

## Diagnostic V81 et corrections proposées lors de l'enquête

Audit initial V81 de `arrivals.ts`, `raids.ts`, `raid-state.ts`, `heatwave.ts` et du bootstrap V80. Les interactions physiques existantes restent utiles ; la divergence principale portait sur **la production des situations**, pilotée par trois profils de camp indépendants. Le tableau conserve le diagnostic de départ ; l'état effectivement adopté en V82 est précisé ensuite.

| Écart constaté en V81 | Cible de correction issue de l'enquête |
| --- | --- |
| Aucun choix réel de narrateur/difficulté ; scénario et incident souvent confondus. | Séparer ces réglages persistants. Reproduire Cassandra présélectionnée et le choix explicite de difficulté ; conserver le camp pédagogique comme scénario nommé. Ne pas importer les réglages d'une sauvegarde utilisateur. |
| Premier raid garanti 3,5–4 jours, un adversaire sans arme. | Pour une cible classique, adopter l'introduction vérifiée, y compris la petite menace préalable et le budget de 40 points ; déclarer les prolongements militaires/capture manquants. Le nom Cassandra ne doit pas couvrir seulement une nouvelle constante de date. |
| Raid suivant 6–8 jours après la clôture, au plus un groupe actif. | Introduire fenêtres/occasions du profil, registre au déclenchement et budget dépendant de la colonie. Réexaminer la limite d'un groupe actif : Core peut produire d'autres menaces avant disparition de la précédente. |
| Offre 1,5–2 jours puis toutes les 4–8, plafond dur de douze personnes. | Conserver choix/expiration physique de l'offre, remplacer sa pendule par sélection de Misc et intention de population ; ne pas transformer le plancher faible en interdiction. |
| Canicule garantie 6–7 jours puis 30–40 jours après sa fin. | Conserver les effets thermiques, remplacer la programmation par admissibilité saisonnière, catégorie Misc et cooldown depuis le déclenchement. Absence de canicule pendant une semaine doit rester possible. |
| Ni richesse/adaptation ni paramètres de difficulté ; compositions figées. | Comptage conservatif des possessions existantes, courbes et mémoires séparées ; ne pas assimiler capacité de stockage, ressources naturelles et richesse. Ne pas ajouter une vague pour « récompenser » immédiatement une construction. |
| Catalogue très réduit d'incidents. | Documenter les candidats absents et leurs effets sur la distribution. Réduire Misc à arrivée+canicule puis normaliser leurs poids concentrerait artificiellement toute la fréquence sur ces deux événements. Ne pas prétendre reproduire le rythme complet tant que cette réduction n'est pas traitée explicitement. |
| Parcours exigeant toutes les situations en sept jours. | Séparer introduction déterminée, résultats conditionnels et contrôles d'une distribution. Observer absence, coexistence, échec d'admissibilité et reprise ; ne pas forcer chaque graine à vivre une canicule, un accueil et une infection. |

## Adoption V82

Le [contrat de départ](../development/scenario-start.md) et les [menus](../development/new-game-menus.md) nomment maintenant ce qui est réellement appliqué. `crashlanded` est une nouvelle provenance, sans renommer les anciennes parties Survivants. Son profil révision 1 conserve Cassandra partielle, Récit d'aventure et Rechargeable ; la création exige les deux derniers choix, Cassandra étant présélectionnée.

- **Temps :** six ticks locaux/s, 6 000 par jour, soit 16 min 40 s nominales à 1× ; dix ticks Core restent un tick local. Tick écoulé 0 et heure civile 06 h sont distincts. Lumière, croissance, horaires et température quotidienne reçoivent le même décalage ; les échéances restent écoulées.
- **Difficulté :** +5 à la cible d'humeur coloniale ; ×0,75 au second tirage d'infection des personnes de la faction du joueur ; tir ami 0,40 déjà présent. Pas de modification des rendements/croissance/recherche pour accélérer une démonstration. Intoxication alimentaire, richesse/adaptation et budget de menace demeurent absents.
- **Occasions de raid :** J5,4 introductif, puis fenêtres à J11 + 10,6 × n, actives 4,6 jours/repos 6 jours, 1–2 occasions et espacement 1,9 jour minimum. Agenda privé persisté, distinct du RNG des groupes ; aucune replanification à la fin d'un assaut. Une occasion impossible ou un groupe encore actif consomme la date sans report.
- **Adaptations restantes :** au plus un groupe actif ; premier groupe effectivement créé sans arme, suivants deux personnes dont une avec revolver. Aucun calcul fictif des 40 points ou du multiplicateur 0,60. Après J20, **les occasions restent des raids seuls** ; variété et pondération des grandes menaces ne sont pas livrées.
- **Absences assumées :** visiteurs, petite menace introductive, Misc, maladies incidentes et événements de factions. L'accueil fixe et la canicule garantie du camp ne sont pas activés sur ce profil ; aucune renormalisation de Misc vers seulement ces deux contenus. Le climat thermique ordinaire et les infections après plaie restent actifs.
- **Migration :** validation stricte de V81, puis version 82 sans profil, calendrier, état médical, stock ou phase civile inventés. Les profils historiques gardent leurs règles et échéances ; seul le débit réel nominal commun est corrigé.

Ces choix constituent une boucle partielle contrôlable, pas une parité du narrateur, du profil de difficulté ou du scénario Core. Une réduction temporaire du catalogue est annoncée ; ni les moyennes du wiki ni un scénario de test agréable ne peuvent certifier le déroulement complet.

Les dix-sept captures utilisateur et le témoin `Reference-Core-4871` ont depuis confirmé le parcours de création et un départ sans tutoriel/mods sous le profil choisi. Le témoin est au tick 283 : il ne constitue pas une campagne ordinaire prolongée. Points encore ouverts : trajectoires comparables sur plusieurs mondes ; distribution complète des compositions militaires et leur comportement après défaite ; poids de tous les incidents selon état réel de la carte. Ces réserves n'annulent pas les paramètres et branches directement relevés dans 1.6.4871. Elles bornent ce qui pourra honnêtement être annoncé conforme.
