# Incidents divers de Cassandra et canicule naturelle — recherche V180

Recherche du 2 octobre 2026 pour **Atterrissage forcé / Cassandra partielle / Récit d'aventure**, Core sans extensions. Cette enquête définit une adaptation locale bornée de la catégorie `Misc` de la carte d'habitation. Elle ne constitue ni un catalogue jouable des autres incidents, ni une mesure de fréquence de parties Core. Le [contrat de scénario](../development/scenario-start.md), le [contrat thermique](../development/heatwave.md), la [recherche de rythme](colony-pacing-reference.md) et le [corpus utilisateur](reference-adoption.md), chapitre 24 et SYS/TEST-132..135, motivent la séparation de la cadence, de l'admissibilité et des conséquences. Décision : **adopter** les conditions et l'échelle temporelle vérifiées de HeatWave ; **adapter** l'agenda et la masse des incidents absents ; **différer** leur production réelle, leurs facteurs contextuels et la parité du narrateur.

## Sources et version

L'arbitre des chiffres est l'installation locale en lecture seule `E:/Steam/steamapps/common/RimWorld`, `Version.txt` = **1.6.4871 rev590**. Définitions consultées : `Data/Core/Defs/Storyteller/Storytellers.xml` (SHA-256 `def397844c6f02595c447ad0f60f19edebecb84a6398e54e871a38b6fe8be0c5`), `Data/Core/Defs/Storyteller/Incidents_Map_Misc.xml` (`39ecee17f87e429af68adf7e76523f4d34e79afbf6105c8a2df54894a4419dd5`) et `Data/Core/Defs/GameConditionDefs/GameConditions_Misc.xml`. Les classes décompilées de cette même installation sont inspectables sous `tmp/pacing-reference` : `StorytellerComp_ClassicIntro`, `StorytellerComp_CategoryMTB`, `StorytellerComp`, `Storyteller`, `IncidentWorker`, `IncidentWorker_MakeGameCondition`, `IncidentWorker_HeatWave`, `GameCondition_HeatWave`, `local-Verse_Rand`. Ce sont des paraphrases factuelles, sans republication des fichiers propriétaires dans le dépôt.

Recherche Internet renouvelée le 2 octobre : [correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) et [miroir de code daté, `StorytellerComp_CategoryMTB`](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/StorytellerComp_CategoryMTB.cs), [`IncidentWorker_HeatWave`](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/IncidentWorker_HeatWave.cs). Le correctif officiel est antérieur à 1.6.4871 et ne publie pas les Defs d'incident. Le miroir du 20 mai 2026 est également antérieur ; les valeurs citées ci-dessous sont celles de l'installation locale. Les [anciens relevés de rythme](colony-pacing-reference.md) et de [canicule](heatwave-reference.md) servent de contrôle croisé, sans primer sur la version installée.

## Deux portes temporelles distinctes

`ClassicIntro` propose **une occasion Misc à 264 000 ticks Core**, soit **J4,4 écoulé / 26 400 ticks locaux**. Il choisit un incident de catégorie Misc par poids parmi les définitions ciblant la première carte d'habitation ; cette occasion ne garantit aucun incident particulier. La petite menace à J3,4 peut être remplacée par Misc si l'introduction des menaces est interdite ; ce n'est pas le réglage retenu de Récit d'aventure. Le raid introductif J5,4 est une autre porte.

Le composant `CategoryMTB` de Cassandra, cible `Map_PlayerHome`, a `minDaysPassed=5` et `mtbDays=4.8`. `Storyteller.StorytellerTick` interroge les composants aux multiples de **1 000 ticks Core = 100 ticks locaux** ; `MakeIncidentsForInterval` écarte les contrôles lorsque `DaysPassedSinceSettleFloat <= 5`. Le premier contrôle éligible d'une partie démarrant au tick zéro est donc **30 100 ticks locaux**. À chacun de ces contrôles, `Rand.MTBEventOccurs(4.8, 60000, 1000)` calcule `1000/(4.8×60000)=1/288` puis compare une valeur uniforme. Le MTB de 4,8 jours est une échelle de **tentatives de catégorie**, pas la période de retour d'une canicule. La pause n'avance aucun tick ; le temps local reste celui du monde confirmé.

Une tentative réussie génère des paramètres puis filtre les incidents avec `Worker.CanFireNow`. Le code choisit ensuite d'abord, selon l'intention de population, entre la branche des incidents qui augmentent cette population et celle des autres, avec repli si la branche est vide. Le poids final part de `baseChance`, puis applique le facteur de population courante éventuel, l'intention de population, le facteur propre au worker et la mémoire des incidents récents. Il dépend donc du monde au moment du tirage. `baseChance` **n'est pas** une probabilité par jour. Une sélection ou une tentative d'exécution impossible ne doit pas produire une canicule de remplacement.

## Inventaire de `Misc` pour la carte d'habitation Core

Les **21** `IncidentDef` suivants ont `category=Misc` et `targetTags=Map_PlayerHome` dans `Incidents_Map_Misc.xml`, sans DLC requis. La colonne « filtre explicite » résume seulement les champs de Def qui restreignent âge, biome, difficulté, présence ou répétition ; les filtres communs (`CanFireNow`, cible valide, scénario, état de carte) et ceux propres aux workers subsistent. « Aucun » n'affirme pas que le worker peut toujours exécuter l'incident. Les `minRefireDays` comparent le tick actuel au dernier **déclenchement** du même incident sur la cible ; une valeur absente vaut zéro. Les quotas et poids ne sont jamais transférés aux incidents disponibles dans Lisière.

| Incident | Poids brut | Filtre explicite / état particulier |
| --- | ---: | --- |
| ResourcePodCrash | 1 | Aucun ; pose de capsule et ressource admissible par worker. |
| PsychicSoothe | 1 | Répétition ≥15 j ; condition 1,5–3 j, préconditions du worker. |
| SelfTame | 1 | Colon présent ; animal sauvage admissible réellement présent. |
| AmbrosiaSprout | 1 | Biomes tropical humide/marais, tempéré forestier/marais, boréal, aride ; placement de plante possible. |
| FarmAnimalsWanderIn | 0,4 | Entrée de bord et espèce d'élevage saisonnièrement admissible ; facteur worker variable si règle d'élevage Ideology active, exclue ici. |
| WandererJoin | 0,4 | Effet de population `IncreaseEasy` ; quête d'arrivée et ses préconditions. |
| RefugeePodCrash | 1,5 | Effet `IncreaseMedium`, colon présent ; quête de capsule et ses préconditions. |
| ThrumboPasses | 0,7 | Répétition ≥13 j ; entrée et espèce admissibles. |
| RansomDemand | 2 | Effet `IncreaseHard` ; prisonnier/rançon admissibles selon worker. |
| MeteoriteImpact | 0,5 | Ressource et emplacement admissibles ; peut viser toutes couches planétaires. |
| HerdMigration | 1 | Biomes glace de mer, calotte, toundra, désert ou désert extrême **seulement** ; donc absent en forêt tempérée. |
| WildManWandersIn | 1 | Effet `IncreaseMedium` ; personne sauvage et entrée admissibles. |
| PsychicDrone | 1 | Répétition ≥15 j ; condition 0,75–1,75 j, préconditions du worker. |
| ToxicFallout | 0,12 | J≥60, répétition ≥90 j ; écarté si météo extrême désactivée ; condition 2,5–10,5 j. |
| VolcanicWinter | 0,08 | J≥60, répétition ≥140 j ; écarté si météo extrême désactivée ; condition 7,5–40 j. |
| HeatWave | 1 | Répétition ≥30 j ; condition 1,5–3,5 j ; saison ≥20 °C et coexistence ci-dessous. |
| ColdSnap | 1 | Répétition ≥30 j ; condition 1,5–3,5 j ; saison strictement entre 0 et 15 °C. |
| Flashstorm | 0,4 | Répétition ≥15 j ; météo extrême désactivée l'écarte ; condition 0,075–0,1 j. |
| ShortCircuit | 1 | Répétition ≥8 j ; réseau électrique admissible par worker ; peut viser toutes couches. |
| CropBlight | 0,3 | Répétition ≥30 j ; culture admissible ; échelle avec points de menace. |
| Alphabeavers | 0,5 | Répétition ≥30 j ; toundra ou broussailles arides **seulement**. |

Somme arithmétique des poids bruts : **16,9**, dont **1** pour HeatWave et **15,9** pour les vingt autres. Il s'agit d'un inventaire de définitions, pas d'un dénominateur Core fixe : à J4,4, ToxicFallout et VolcanicWinter n'entrent pas encore ; en forêt tempérée, HerdMigration et Alphabeavers sont exclus ; d'autres workers peuvent échouer ; les branches de population et facteurs de récence modifient encore le partage.

Les **quatre autres** `IncidentDef` Core sans DLC portant également `category=Misc` sont séparés par cible et composant ; ils ne sont **pas** des tickets du Misc de carte Cassandra étudié ici :

| Incident | Cible / composant | Poids ou cadence, admissibilité et répétition |
| --- | --- | --- |
| Eclipse | `World`, CategoryMTB mondial | Poids 1,5 ; répétition ≥15 j ; condition 0,75–1,25 j. Cassandra lance le composant mondial après J15 strict, MTB 15 j. |
| SolarFlare | `World`, CategoryMTB mondial | Poids 1,3 ; répétition ≥15 j ; condition 0,15–0,5 j ; état de condition admissible. |
| Aurora | `World`, CategoryMTB mondial | Poids 1,2 ; répétition ≥15 j ; condition 0,125–0,35 j ; worker propre. |
| CaravanMeeting | `Caravan` ou `Map_TempIncident` | Pas de `baseChance` renseigné dans sa Def ; répétition ≥0,17 j et `mtbDaysByBiome` (10 j en forêt tempérée). Ne relève pas du CategoryMTB `Map_PlayerHome`. |

## Conditions exactes utiles à HeatWave

`IncidentWorker_HeatWave` ajoute à `IncidentWorker_MakeGameCondition` la condition **`map.mapTemperature.SeasonalTemp >= 20f`**. C'est la température saisonnière du site, pas la température de l'air à midi ou la chaleur déjà ajoutée par une condition. Le worker de condition refuse une condition HeatWave déjà active, un gestionnaire absent, une condition active qui interdit les incidents et une coexistence interdite. `GameConditions_Misc.xml` déclare HeatWave exclusive de **ColdSnap et VolcanicWinter**, avec `allowUnderground=false`. La Def de HeatWave ne contient pas `disabledWhen.extremeWeatherIncidentsDisabled`, contrairement à ToxicFallout, VolcanicWinter et Flashstorm ; le nom « canicule » ne suffit donc pas à la bloquer par ce réglage.

`minRefireDays=30` est évalué par `FiredTooRecently` comme `(ticksGame-lastFireTick)/60000 < 30` : le refroidissement démarre au **déclenchement précédent**, et s'achève lorsque trente jours sont révolus, même si la condition a duré plusieurs jours. L'exécution tire une durée de **1,5–3,5 jours Core** et crée la condition. `GameCondition_HeatWave` applique jusqu'à **+17 °C** avec montée et descente de **12 000 ticks Core = 1 200 ticks locaux**. L'effet n'est pas appliqué aux cartes souterraines. Une condition active, le refroidissement ou une saison trop fraîche peut donc consommer une occasion Misc sans HeatWave ; ces refus ne reportent pas automatiquement une nouvelle canicule.

## Adaptation prudente retenue pour Lisière V180

Conserver l'agenda de camp historique et le nouvel agenda du profil `crashlanded` séparés. Le nouveau profil peut programmer une proposition introductive Misc à J4,4 si elle est encore future à l'adoption, puis effectuer les contrôles stricts après J5 tous les 100 ticks locaux avec un **PRNG privé persisté**. Ce calendrier doit être repris à l'identique et ne doit ni appeler `Math.random` ni absorber le flux des raids, visites ou conditions historiques.

Une enveloppe locale simple, **explicitement choisie et non attribuée au Core**, est de réserver sur chaque occasion Misc un ticket HeatWave de poids **1 sur 16,9** ; les **15,9** autres tickets ne produisent rien tant que leurs incidents restent absents. Après le ticket HeatWave, vérifier saison, exclusivité, activité et cooldown ; en cas de refus, ne rien substituer. La fréquence locale par contrôle est alors bornée par `1/288 × 1/16,9 ≈ 0,0002055` avant admissibilité (et par `1/16,9` pour l'introduction). Ce choix interdit mathématiquement que la canicule absorbe les poids des vingt contenus absents. Il peut sous-représenter ou sur-représenter la probabilité Core dans un état donné, car le Core filtre les candidats, sépare les branches de population et modifie les poids ; aucune parité contextuelle ou fréquence moyenne Core n'est revendiquée.

Les contrôles du lot doivent vérifier séparément la borne J4,4/J5 stricte, l'absence possible de canicule, la saison au seuil 20 °C, le cooldown depuis le début, la durée/rampe, la reprise byte-identique du PRNG/calendrier et l'absence de changement des camps historiques. Ces contrôles établiraient le contrat local ; ils ne remplacent pas des trajectoires de parties Core, une comparaison de distribution conditionnelle ni une écoute/observation humaine de la chronologie visible.

**Relecture d’intégration :** certaines anciennes colonies locales conservent volontairement l’absence de `World.climate`. Leur air historique ne suit pas de saison annuelle ; employer le profil tempéré de secours pour l’admissibilité fabriquerait une saison différente de cet air. V180 refuse donc le ticket HeatWave tant qu’aucun climat n’est adopté, sans ajouter le climat ni reporter l’occasion. Les nouveaux départs ont déjà leur climat. Cette règle de continuation est une adaptation locale, pas une condition supplémentaire attribuée au Core.
