# Danger électrique : pluie et court-circuit du réseau

Recherche du 3 octobre 2026, après V193 `8fd6500`. **Cadrage retenu pour V194, sans mécanique ni validation nouvelle livrée dans ce document : exposition électrique aux précipitations seulement.** Le court-circuit aléatoire du réseau reste distinct et différé. La décision joueur visée est de protéger les appareils exposés par un toit réel, arrêter les consommateurs vulnérables ou déplacer une batterie, puis traiter les incendies, blessures et réparations physiques. La comparaison avec une [première menace mécanoïde](mechanoid-core-next.md) reste dans [ROADMAP](../ROADMAP.md).

## Provenance

Arbitre des règles : installation en lecture seule `E:/Steam/steamapps/common/RimWorld`, `Version.txt` **1.6.4871 rev590**, SHA-256 d'`RimWorldWin64_Data/Managed/Assembly-CSharp.dll` recalculé : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Lecture ciblée par ILSpyCmd 8.2 : `IncidentWorker_ShortCircuit`, `ShortCircuitUtility`, `PowerNet`, `CompPower`, `CompPowerTrader`, `CompPowerBattery`, `Building_Battery`, `CompProperties_Power`, `SteadyEnvironmentEffects`, `ListerBuildings`, `WeatherManager`, `GenExplosion`, `Explosion`, `DamageWorker_Flame`, `GenCollection`, `CellRect`, et relevé local attesté de `Rand`. XML : `Storyteller/Incidents_Map_Misc.xml`, `Storyteller/Storytellers.xml`, `ThingDefs_Buildings/Buildings_{Power,Furniture,Misc,Production,Structure,Temperature}.xml`, `WeatherDefs/Weathers.xml`, `DamageDefs/Damages_{Environmental,Misc}.xml`. Aucun fichier du jeu modifié ou redistribué.

Recoupements Internet consultés ce jour : l'[annonce officielle de la mise à jour 1.5](https://ludeon.com/blog/2024/03/anomaly-expansion-and-update-1-5-announced/) atteste l'introduction des conduits cachés et leur meilleure résistance aux dommages ; elle ne donne ni seuil de batterie, ni cadence de court-circuit, ni immunité actuelle. Les copies publiques [`ShortCircuitUtility`](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/ShortCircuitUtility.cs) et [`SteadyEnvironmentEffects`](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/SteadyEnvironmentEffects.cs) facilitent le contrôle des deux chaînes, mais leur `master` n'atteste pas la version installée. Les [observations directes de joueurs de 2017](https://ludeon.com/forums/index.php?topic=35954.0) décrivent isolation de batteries et absence de conduits ; elles restent historiques et ne fondent aucune constante de 1.6.4871. Les nombres ci-dessous viennent du binaire/XML local.

Contrats et recherches relus : [énergie](../development/power.md), [réseau](power-grid-reference.md), [batteries](power-battery-reference.md), [incendies](../development/fires.md), [recherche feu/météo](fire-bundle-reference.md), [Misc Cassandra](../development/cassandra-misc-v180.md) et sa [recherche](cassandra-misc-core-v180.md). Leurs preuves historiques établissent ces socles, pas le nouveau danger.

## Corpus et décisions

Les [originaux HTML, chapitres 19, 22, 23 et 24](../reference/originals/Documentation_developpement.html#chap-22), et les lignes du classeur original ont été relus sans modification.

| Identifiants | Décision pour V194 |
| --- | --- |
| SYS/TEST-127, CAT-047 | **Adopter** réseau, énergie réellement détenue et motifs d'arrêt distincts. **Différer** nouvelle variante de câble et incident aléatoire. |
| SYS/TEST-129 | **Adopter** dégâts, chaleur, propagation et extinction physiques existants ; un effet visuel seul ne constitue pas un court-circuit. |
| SYS/TEST-131 | **Adopter** taux de précipitation autoritaire et transition météo ; la référence Odyssey du corpus ne justifie pas les règles Core. |
| SYS/TEST-109, STAT-146, GAP-020 | **Adapter** uniquement le petit impact Flame existant ; **différer** moteur général d'explosion, Bomb et interaction exhaustive avec toits/obstacles. |
| SYS/TEST-132, 134, 135 | **Distinguer** occasion, admissibilité, conséquences et notification. V194 n'ajoute aucun ticket Misc ; fermer l'information n'efface pas les dégâts. |
| CONST-001/002, GAP-015 | **Adopter** les échéances Core ; **adapter** le PRNG privé et l'intégration à dix frontières Core par tick local. Pas de replay bit à bit Unity revendiqué. |

Ces lignes restent des exigences ou propositions du corpus, pas des contrôles déjà exécutés ni une clôture de toute leur couverture.

## Incident aléatoire `ShortCircuit` — non retenu

La Def vise `Map_PlayerHome`, catégorie `Misc`, poids brut **1**, `minRefireDays=8`, sans plafond de jour ou condition de pluie. La cadence générale Cassandra demeure celle du relevé V180 : occasion introductive J4,4, puis contrôles tous les 1 000 Core après J5 strict, MTB de catégorie 4,8 jours. Huit jours sont un intervalle minimal entre déclenchements du même incident, pas sa période garantie. Branches de population, admissibilité et mémoire modifient la sélection Core ; le poids ne vaut pas probabilité quotidienne.

`CanFireNowSub` demande au moins un conduit admissible. `GetShortCircuitablePowerConduits` parcourt **la Def exacte `PowerConduit`**, puis exige `PowerNet.HasActivePowerSource` : batterie avec énergie strictement positive et non étourdie par EMP, ou `CompPowerTrader.PowerOutput>0`. Il ne demande pas une batterie chargée à 20 Wd pour autoriser l'incident. Les autres transmetteurs et `HiddenConduit` ne sont pas dans cette liste. Un toit ou un mur au-dessus du conduit n'est pas un filtre de cette méthode. L'exécution tire uniformément un conduit de la liste admissible, sans choisir d'abord uniformément un réseau : le nombre de conduits influence le choix du réseau.

Deux conséquences :

- Si **au moins une** batterie du réseau a `StoredEnergy>20 Wd`, toutes les batteries du réseau sont vidées de leur énergie restante, chacune exactement une fois. Rayon Flame `clamp(sqrt(totalWd)×0,05 ; 1,5 ; 14,9)`. Si ce rayon est **strictement supérieur à 3,5**, seconde explosion **Bomb**, rayon `0,3×rayonFlame`. Cela correspond à un total strictement supérieur à 4 900 Wd avant plafonnement. Les réserves isolées sur un autre réseau ne sont pas débitées.
- Sinon, aucune décharge n'est imposée : rechercher les cellules à distance radiale ≤3, avec ligne de vue depuis l'emprise et chance d'allumage positive ; tirer une cellule puis une taille de feu entre 0,1 et 1,75. Le démarrage peut échouer. Plusieurs batteries chacune à 20 Wd ne déclenchent pas la branche de décharge, même si leur somme dépasse 20.

Il n'existe pas de mèche préalable dans cette chaîne : l'incident demande immédiatement les explosions ou le feu. Les lettres décrivent la décharge et les grandes explosions, sans créer un blocage électrique d'une durée arbitraire. L'énergie reconstruite ensuite suit le réseau ordinaire.

`GenExplosion` utilise les dégâts par défaut : Flame **10**, armure Heat, pénétration **0**, chaleur **15** par cellule ; Bomb **50**, Sharp, pénétration **0,10**, facteurs bâtiments impassables **4**, passables **2**, plantes **4**, cadavres **0,5**, chaleur **5**, parties internes possibles. `Explosion` construit ses cellules, conserve les références déjà endommagées et applique une onde aux échéances `startTick + int(distance×1,5/propagationSpeed)` ; le défaut de l'appel est `propagationSpeed=1`, sans baisse de dégâts avec distance. Ce n'est pas notre impact Flame instantané. Le grand rayon et la seconde explosion requièrent une responsabilité nouvelle : les omettre ou plafonner à trois cases fabriquerait une parité factice.

## Court-circuit sous précipitations — retenu

`SteadyEnvironmentEffectsTick` teste les multiples de **97 ticks Core**. Premier jet `Rand.Chance(0,02)`, avant de vérifier qu'il pleut ou qu'un appareil existe. En cas de succès, `RollForRainFire` effectue `Rand.Chance(0,2×N×RainRate)` ; **N** est la taille de `allBuildingsColonistElecFire`. Puis un seul bâtiment de cette collection est tiré uniformément. S'il est couvert **à son ancre `Position`**, l'essai s'arrête. Sinon, `TryShortCircuitInRain` vérifie :

- consommateur/producteur `CompPowerTrader` avec **`PowerOn` vrai et `Props.shortCircuitInRain` vrai** ;
- ou batterie dont l'énergie est **strictement supérieure à 100 Wd**.

Le résultat est une explosion **Flame de rayon 1,9**, sur une cellule aléatoire de l'emprise réelle de l'appareil. La méthode ne débite ni cette batterie, ni le réseau ; aucune dépense de 100 ou 400 Wd n'est attribuable à la pluie. Les dégâts peuvent ensuite détruire de l'énergie avec la batterie ou amorcer sa mèche de feu ordinaire. Une batterie déconnectée mais chargée reste susceptible ; un consommateur réellement arrêté n'explose pas par cette branche. Ni perte globale d'alimentation, ni panne `breakdown`, ni délai d'indisponibilité ajouté par la méthode.

Vérification complémentaire dans le même assembly : `CompPowerTrader.PowerOn` retourne `powerOnInt` ; `ReceiveCompSignal` met `PowerOn=false` pour `FlickedOff`, `ScheduledOff`, `Breakdown` et `AutoPoweredWantsOff`. L'arrêt d'un trader brisé ne constitue donc pas une immunité ajoutée par le contrôleur de pluie. Dans `Buildings_Production.xml`, `ElectricTailoringBench` déclare directement `CompPowerTrader`, `shortCircuitInRain=true`, `basePowerConsumption=120`, `CompProperties_Flickable` et `CompProperties_Breakdownable` : alimentation et actionnement physique doivent être raccordés au catalogue local. Cela ne transforme pas les batteries en traders et ne remplace pas leur seuil de charge propre.

### Collection, toit et précipitations

`ListerBuildings.Add` inscrit les bâtiments dont le composant électrique possède `shortCircuitInRain=true`, **avant tout filtrage d'activité, charge ou couverture**. Malgré le nom de la collection, cette insertion n'est pas enfermée dans la branche de faction du joueur. Les appareils couverts, éteints, vides ou en panne restent dans N. Un échec ne retire pas le candidat et ne relance pas le tirage sur un voisin exposé. Les meubles emballés ne sont pas des bâtiments placés inscrits à ce titre. V194 n'introduit aucune faction de bâtiment absente du modèle local.

Le toit de l'ancre suffit même pour une batterie 1×2 ou un atelier partiellement découvert. L'impact peut toucher une autre case de l'emprise ; exposition et centre de l'explosion sont deux décisions différentes. Le passage d'un câble sous la pluie n'est pas cette cause.

`WeatherManager.RainRate` interpole les champs `rainRate` de l'ancienne et de la nouvelle Def ; il n'additionne pas `SnowRate`. Les Defs `SnowGentle` et `SnowHard` ont elles-mêmes `rainRate=1` : cette chaîne peut donc agir pendant la neige. Le lecteur local `weatherRainRate` reproduit déjà ce choix. Absence d'état météo local = taux nul, sans inventer une pluie.

### Catalogue actuellement livré

La liste est exhaustive pour les familles de `isElectrical` relues ; `CompProperties_Power.shortCircuitInRain` est un booléen faux par défaut.

| Def Core | Famille locale | Propriété de pluie |
| --- | --- | --- |
| Battery | `battery` | Vrai ; seuil >100 Wd, sans `PowerOn` |
| Heater | `heater` | Vrai |
| ElectricStove | `electric-stove` | Vrai |
| ElectricTailoringBench | `electric-tailor-bench` | Vrai |
| TableMachining | `machining-table` | Vrai |
| FabricationBench | `fabrication-bench` | Vrai |
| HiTechResearchBench | `hi-tech-research-bench` | Vrai |
| MultiAnalyzer | `multi-analyzer` | Vrai |
| SunLamp | `sun-lamp` | Vrai ; alimentation réelle, horaire horticole conservé |
| StandingLamp, Cooler, Autodoor | `standing-lamp`, `cooler`, `autodoor` | Faux |
| WoodFiredGenerator, SolarGenerator, WindTurbine | `wood-generator`, `solar-generator`, `wind-turbine` | Faux |
| PowerConduit, PowerSwitch | `power-conduit`, `power-switch` | Faux |

Le Core marque aussi d'autres Defs vraies (télévisions, console, moniteur médical, forge, four électrique, raffinerie…), sans les rendre présentes dans Lisière. Ni nouveau catalogue ni flag généralisé à tous les appareils n'est requis. Le `HiddenConduit` Core reste absent localement et sans rôle dans la cause pluie retenue.

### Tirages et bornes

`Rand.Chance(p)` ne tire aucune valeur pour `p≤0` ou `p≥1`. À N=0 ou taux nul, le second jet échoue sans consommation aléatoire ; le premier jet de 0,02 est néanmoins effectué au multiple de 97. À `0,2×N×RainRate≥1`, le second jet réussit sans tirage supplémentaire. Le tirage de candidat subsiste, même avec N=1 : `HashSet.RandomElement` emploie `Rand.Range(0,N)`, qui consomme `Rand.Int` pour N=1. Aucune cellule d'emprise n'est tirée si le candidat est couvert ou non admissible.

`CellRect.RandomCell` tire séparément x et z par `RangeInclusive` ; une dimension de longueur un ne consomme pas de tirage, une dimension plus grande en consomme un. Une emprise 1×1 ne demande donc aucun tirage de centre, une 1×2 un seul. Un choix uniforme dans un tableau local de cellules peut conserver la distribution tout en consommant autrement : ce serait une adaptation supplémentaire à annoncer. Tirages de dégâts, attachement, feux et mèches restent ceux du socle incendie, pas des jets cachés du contrôleur d'exposition.

## Périmètre et raccords proposés

**Décision centrale : V194 adopte seulement la cause précipitations**, avec migration neutre 180→181 après validation stricte de 180, état privé optionnel adopté prospectivement, aucun appareil/dommage/événement passé ajouté. La forme de l'état et les noms d'API appartiennent au contrat central à venir ; cette recherche ne les annonce pas livrés.

Le module cohérent `rain-electric.ts` porte propriété de vulnérabilité, collection et horloge/PRNG privé ; `rain-electric-save.ts` contrôle sa continuation. Balayer les dix frontières Core du tick local, en retenant seulement les multiples de 97 : arrondir à dix ticks locaux changerait la cadence. Ordre stable de la collection locale et xorshift privé sont des adaptations au HashSet et au `Rand` partagé de Core. Conserver les candidats protégés dans N et les branches sans tirage. Aucun ticket Misc, cooldown de huit jours ou compteur du court-circuit aléatoire ne doit être réutilisé pour la pluie.

Réutiliser `weatherRainRate`, le toit réel de l'ancre, l'emprise construite, les états de batterie et d'alimentation autoritaires. `power-battery.ts` conserve 1/120 000 Wd et le demi-quantum : exactement 100 Wd refuse, le demi-quantum supérieur admet. La mèche déjà livrée demande >500 Wd et un jet <0,05 sur dommage Flame ; échéance 70 inclus/150 exclus Core, rayon 1,5..3, dépense plafonnée 400 Wd. Extinction ou décharge ne désamorcent pas la mèche. Cette chaîne est **séparée**, déjà persistée sous `fires.batteryWicks`, et doit rester inchangée.

L'impact `fire.flameBurst` existant admet 1,9 et applique brûlures, dégâts, chaleur, ignition, interruptions et pertes physiques. **Adaptation explicite** : effet local instantané avec ligne de vue et responsabilités du socle feu, tandis que Core persiste une onde courte. Ne pas élargir son rayon maximal trois ni lui donner Bomb. Le registre feu peut observer les pertes dues aux dégâts ou à la mèche ; il ne doit pas enregistrer une décharge pluie fictive.

L'intégration doit fixer explicitement la frontière d'observation météo/alimentation dans `engine.ts` et `environment-step.ts` : météo actuellement avancée avant `advancePower`, feu/chaleur ensuite. Un contrôleur appelé après météo/power voit leurs valeurs confirmées du tick local, pas chaque intermédiaire historique Core : cette précision est une adaptation, sans changement de leurs flux PRNG. Après destruction, recalculer réseau/température et réconcilier les réservations comme pour la foudre existante. Ne pas garder une collection ou une topologie mutable comme témoin après un impact ; une nouvelle occasion voit le contenu restant.

## Contrôles requis et comparaison de coût

Contrôles ciblés à préparer après contrat : frontière Core 96/97/194 malgré cadence locale ; premier et second jets, zéro et saturation sans tirage ; candidat unique couvert/éteint/vide sans repli ; table exhaustive des neuf familles ; toit d'ancre et centre d'emprise différents, rotations ; neige et météo absente/transition ; batterie 100 et 100+demi-quantum, isolée ; consommateur éteint/en panne/horaire nocturne ; pertes matérielles et soins/extinction/réparation réels ; mèche secondaire conservée ; absence de débit global ; reprise exacte avant/après échéance, refus futur du schéma 180, encodeur/décodeur au même tick. Scène jouable : deux appareils exposé/protégé sous précipitations, action réelle de toiture/arrêt, puis reprise et traitement du feu. Un déclenchement préparé ne démontre pas une fréquence naturelle.

Le coût supplémentaire peut rester proportionnel aux bâtiments électriques et aux occasions de 97 Core, sans parcours de toutes les cellules ni recherche de navigation nouvelle. Capturer les candidats une seule fois par occasion, réutiliser les primitives physiques et mesurer ultérieurement exposition/reconciliation séparément du tick complet sur 250². **Aucune mesure, test ou validation produit n'a été exécuté pour ce cadrage.**

Comparativement, un premier mécanoïde ouvre davantage le combat non biologique, mais exige corps mécanique, protection intrinsèque, cible/IA sans besoins, carcasse et récupération, sauvegarde et rendu propres. Le danger pluie ferme déjà une décision électrique avec les bâtiments et conséquences existants. L'incident Zzztt complet serait plus large que cette tranche : stockage déchargé, grand rayon, Bomb, propagation et continuation d'explosion devraient être traités avant de revendiquer sa boucle.
