# Éruption solaire Core — recherche préparatoire V202

Recherche du **4 octobre 2026**, après V201, pour un lot borné de résilience électrique. L’éruption solaire relie les réseaux, réserves, éclairages, serres, ateliers et températures déjà jouables. Ce document établit les règles de référence et les décisions proposées ; il ne constitue aucune preuve d’implémentation, de fréquence naturelle ou de performance.

## Sources et périmètre

Arbitre primaire : installation en lecture seule `E:/Steam/steamapps/common/RimWorld`, `Version.txt` **1.6.4871 rev590**. XML lus : `Data/Core/Defs/Storyteller/Incidents_World_Conditions.xml`, `Storyteller/Storytellers.xml`, `GameConditionDefs/GameConditions_Misc.xml`, `ThingDefs_Buildings/Buildings_Power.xml` et `Buildings_Production.xml`. Lecture ciblée du binaire avec ILSpyCmd 8.2, sorties non versionnées sous `tmp/v202/core` : `GameCondition_DisableElectricity`, `GameCondition`, `GameConditionManager`, `IncidentWorker_MakeGameCondition`, `IncidentWorker`, `Storyteller`, `StorytellerComp`, `StorytellerComp_CategoryMTB`, `PowerNet`, `CompPowerTrader`, `CompPowerPlant`, `CompPowerPlantSolar`, `CompPowerBattery`, `CompRefuelable` et `Verse.CompGlower`. Aucun fichier propriétaire n’est modifié ou redistribué dans le dépôt.

| Source locale | SHA-256 |
| --- | --- |
| `Assembly-CSharp.dll` | `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` |
| `Incidents_World_Conditions.xml` | `a0e51279b51bdb61db6f734ceef0014d3d81b3652602a0085a813c31c705745c` |
| `Storytellers.xml` | `def397844c6f02595c447ad0f60f19edebecb84a6398e54e871a38b6fe8be0c5` |
| `GameConditions_Misc.xml` | `0f5e7d6100893d811e6757f3693e192e7e10f892213c7a2050aa276b9707efb2` |

Recherche Internet précise renouvelée ce jour sur les sites de Ludeon et la publication officielle Steam. L’[annonce officielle du 11 juillet 2025](https://ludeon.com/blog/2025/07/the-rimworld-odyssey-expansion-is-out-now/) distingue le Core gratuit 1.6 de l’extension Odyssey. Le [correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) est antérieur à l’exemplaire installé ; il ne documente ni durée, ni poids, ni algorithme de coupure solaire. Aucune publication officielle actuelle trouvée dans ces recherches ne remplace la lecture des Defs et du binaire. Le [témoignage de lecture de code du 29 décembre 2016](https://ludeon.com/forums/index.php?topic=28858.0) situe déjà la coupure dans `PowerNetTick`, mais reste une observation historique d’un participant, sans valeur d’oracle 1.6.4871. Aucun nombre de wiki n’est adopté comme règle primaire.

Socles relus : [électricité](../development/power.md), [éolienne et radiateur](../development/wind-heater.md), [froid et conservation](../development/cold-store.md), [postes alimentaires](../development/food-workstations.md), [serre](../development/greenhouse-v189.md), [Misc de carte](../development/cassandra-misc-v180.md), [orage local](../development/flashstorm-v184.md), [pluie électrique](../development/rain-electric-v194.md), leurs recherches et preuves V85/V180/V189/V194. L’[archive des obligations historiques](../history/agent-instructions-through-v144.txt), sections énergie V85 et environnement V87, conserve propriété, interrupteurs physiques, quantums, lumière et horloges. Ces preuves ne valident pas V202.

## Calendrier mondial distinct

`SolarFlare` est un incident **Misc de cible World**, avec worker `IncidentWorker_MakeGameCondition`, poids brut **1,3**, répétition minimale **15 jours depuis le dernier déclenchement**, durée **0,15–0,5 jour**. Il n’appartient ni à l’enveloppe **16,9** des incidents Misc de carte V180, ni à ThreatSmall V201. L’introduction Misc de carte à J4,4 ne le produit pas.

Le composant mondial `CategoryMTB` de Cassandra possède **minDaysPassed=15** et **mtbDays=15**. `Storyteller` vérifie tous les **1 000 Core** et refuse lorsque le temps depuis l’installation est **≤15 jours**. Avec le temps écoulé local d’un nouveau départ, le premier contrôle admissible est donc **901 000 Core / 90 100 ticks locaux**, après J15 strict. `Rand.MTBEventOccurs(15,60000,1000)` donne **1/900 par contrôle**, chance d’une tentative de catégorie mondiale, pas d’une éruption solaire.

Les trois incidents Misc World Core sans DLC sont **Eclipse 1,5**, **SolarFlare 1,3**, **Aurora 1,2**, somme brute **4**. Core filtre d’abord les incidents admissibles, puis calcule les poids finaux, notamment la récence, avant sélection. Le rapport **1,3/4** n’est donc pas une probabilité Core universelle. Aucun incident absent ne doit devenir une éruption de remplacement.

**Adaptation proposée :** agenda mondial privé séparé de `miscIncidents`, conservant J15 strict, cadence cent ticks locaux et tentative 1/900. À chaque tentative, enveloppe fixe **4**, dont **1,3 solaire** et **2,7 silencieux** pour Eclipse/Aurora encore absents. Un ticket refusé consomme son occasion, sans relance ni transfert de poids. Cette enveloppe et le PRNG privé sont des choix Lisière ; ils ne reproduisent pas le filtrage et les poids contextuels exhaustifs du narrateur Core. Aucun rattrapage des contrôles déjà passés à l’adoption.

## Admissibilité et durée exactes

Le worker refuse un gestionnaire absent, une condition solaire déjà active et une coexistence interdite. Les restrictions générales de cible/scénario, difficulté déclarée et cooldown subsistent. La Def solaire ne requiert **ni appareil électrique présent, ni batterie, ni climat, ni température saisonnière, ni pluie**, et ne contient pas `disabledWhen.extremeWeatherIncidentsDisabled`. Ajouter un de ces filtres serait une adaptation locale à documenter. Aucun seuil de richesse ou de points de menace solaire n’est déclaré.

La condition peut être permanente dans les outils/scénarios Core, mais l’incident naturel étudié tire une durée finie. `Mathf.RoundToInt(durationDays.RandomInRange × 60000)` produit **9 000–30 000 Core**, soit nominalement **900–3 000 ticks locaux**. `GameCondition.Expired` compare strictement `TicksGame > startTick + Duration` : la condition subsiste à sa borne, puis expire. Conserver une échéance entière `endCore` évite de réarrondir les durées en ticks locaux. Une desserte à la première frontière locale strictement supérieure donne **901–3 001 ticks locaux** pour une activation alignée ; elle peut retarder la fin Core de neuf Core au maximum. C’est la même distinction temporelle que V184, à déclarer comme adaptation.

Le gestionnaire mondial est consulté par celui de la carte. La condition ne s’applique pas aux cartes souterraines (`allowUnderground=false`) et suit les filtres de couches. Anomaly peut la masquer sous `UnnaturalDarkness` ; `ElectricityDisabled(map)` ignore alors son effet sur cette carte. Navettes, sous-sol, autres couches et Anomaly sont hors périmètre local, sans créer de nouvelles exceptions jouables. La Def ne force aucune météo ni baisse de lumière du ciel ; sa lettre approximative ne doit pas remplacer la durée réellement calculée.

## Coupure, sources et stockage

`GameCondition_DisableElectricity` fournit seulement `ElectricityDisabled=true`. **Elle ne met pas instantanément tous les booléens `PowerOn` à false.** Le getter de `CompPowerTrader.PowerOn` renvoie son état ; `PowerOutput` garde son potentiel sauf stun EMP indépendant. `Verse.CompGlower` lit les composants `IThingGlower` et l’interrupteur réel, sans garde solaire globale qui contournerait le délestage.

Pendant la condition, `PowerNetTick` entre dans la branche de délestage, quel que soit le bilan ou la charge. Aux multiples de **20 Core = deux ticks locaux**, il recueille les traders **actuellement allumés et de sortie strictement négative**, puis tente d’en éteindre **max(1,RoundToInt(nombre×0,05))**. Les choix uniformes se font avec remplacement sur cette liste : plusieurs tirages peuvent viser le même appareil. `RoundToInt` suit les demis vers l’entier pair. Les sorties nulles ou positives ne sont pas des candidats. Les appareils s’arrêtent donc progressivement et leurs effets suivent la transition réelle de `PowerOn` ; aucune coupure visuelle anticipée ne constitue cette règle.

| Élément | Conséquence Core vérifiée / décision locale |
| --- | --- |
| Générateur à bois allumé, alimenté et sain | Son trader reste actif ; `CompPowerPlant.UpdateDesiredPowerOutput` ne consulte pas l’éruption. `CompRefuelable.CompTick` continue la combustion lorsque l’interrupteur réel est allumé : **22 bois/jour** dans la Def. Éteindre demeure un travail physique. |
| Panneau solaire | Le potentiel reste calculé par ciel et proportion de cases non couvertes. Une éruption n’est pas une éclipse ; ne pas forcer le potentiel à zéro. Un panneau nocturne à sortie zéro n’est pas éteint par le délestage. |
| Éolienne | Préserver vent, dégagement, potentiel et trader de source ; l’éruption ne crée pas une baisse de vent ni une panne mécanique. |
| Réseau, batteries et sources seules | `ChangeStoredEnergy` est entièrement sauté : **aucune charge et aucune décharge de réseau**, même pendant le bref délestage des consommateurs, même en surplus ou sans consommateur. La production non stockée n’est pas une réserve accumulée à restituer après la condition. |
| Batterie | `StoredEnergy` reste réel et `CurrentStoredEnergy` la compte normalement, sauf EMP distinct. Pas de vidage solaire. `CompPowerBattery.CompTick` conserve l’autodécharge **5 W = 5 Wd/jour** ; zéro reste zéro. Les règles locales d’emballage, portage, fuite et demi-quantum V85/V87 subsistent. |
| Fin de condition | Réconciliation et redémarrage ordinaires, avec leurs réserves/seuils et cadences **30–200 Core**. Aucun réallumage gratuit de tous les appareils ni modification des `switchOn`. |

La panne mécanique, l’arrêt physique, le manque de carburant, la connexion absente, la pénurie et l’éruption sont des causes distinctes. Cette condition n’altère ni les PV, ni les câbles, ni les connexions valides, ni les réserves de combustible. Elle n’inflige aucune explosion/Flame ou maladie à son démarrage.

Lampes ordinaires et horticoles, climatiseurs et radiateurs perdent leurs effets à leur extinction réelle. Les intervalles d’âge alimentaire, température et croissance sont soldés avec le régime précédent avant adoption du suivant ; ne pas rajeunir un stock, rattraper une croissance sombre ou ajouter immédiatement une température extérieure. Les ateliers conservent matières, ouvrages et réservations selon leurs contrats d’interruption. L’éruption ne signifie pas que tous les postes électriques deviennent inutilisables : `Buildings_Production.xml`, Def `ElectricTailoringBench`, déclare **unpoweredWorkTableWorkSpeedFactor=0,5** ; la couture électrique doit conserver ce travail manuel ralenti. Les autres recettes/postes suivent leur admissibilité réelle, sans règle solaire parallèle.

L’exposition électrique V194 reste indépendante. Les consommateurs progressivement éteints ne satisfont plus son exigence d’alimentation, tandis qu’une batterie exposée conservant **strictement plus de 100 Wd** reste admissible à son danger propre. L’éruption ne fournit ni toit, ni immunité de batterie, ni nouveau jet de pluie ; les impacts/feux éventuels continuent leurs horloges et flux existants.

## Corpus, adoption et contrôles encore requis

Les [chapitres 22, 23 et 24 de l’original HTML](../reference/originals/Documentation_developpement.html#chap-22) et l’[adoption du référentiel](reference-adoption.md) séparent cause énergétique, distribution, état de condition et lettre. Identifiants conservés sans clôture globale : **SYS/TEST-127/128**, **CAT-047**, **SYS/TEST-126/131**, **SYS/TEST-132..135**, **CONST-001/002**, puis **SYS/TEST-062..064/070..072/077** pour leurs interactions physiques.

- **Adopter :** cible World distincte, durées et cooldown, arrêt progressif des consommateurs négatifs, sources/carburant conservés, stockage sans transfert et fuite normale, reprise ordinaire, effets physiques dépendants de l’alimentation réelle.
- **Adapter :** Core×10, distribution mondiale fixe avec poids absents silencieux, agenda/PRNG privé, projection sur la seule carte locale et desserte de fin quantifiée. La scène publique peut préparer une occasion future, mais doit déclencher puis terminer réellement la condition.
- **Différer :** Eclipse/Aurora, narrateur mondial exhaustif, planète/multicarte, sous-sol, navettes, DLC, EMP, sons solaires dédiés et nouveau traitement graphique météorologique.
- **Vérifier :** frontières J15/cooldown/expiration, zéro sortie et zéro charge, réseaux équilibrés sans batterie, sources sans consommateur, multiples délestages, reprise avant/après premier arrêt, arrêt manuel et panne coexistants, extinction/reprise de lampe horticole sans rattrapage, cuisine/froid/production, batterie exposée V194 et UI explicative.

Le schéma source courant est **183**, lu dans `src/sim/types.ts`. Une extension persistante requiert validation stricte de 183 avant migration neutre vers le nouveau schéma : refuser les champs futurs dans 183, changer uniquement la version pendant migration, adopter l’agenda prospectivement à la reprise, ne pas créer condition, calendrier passé, tirage, énergie ou dommage au chargement/pause/pas nul. Les nouvelles et anciennes parties gardent leurs flux métiers existants ; persister toute donnée influençant la continuation et comparer aussi les changements au même tick.

La recherche n’exécute ni tests, ni navigateur, ni banc CPU/GPU. Les contrôles courts, scène native préparée, présentation des transitions et mesures isolées du lot restent à acquérir ; aucune campagne naturelle longue, fréquence moyenne, coût nul ou gain général n’est établi par cette lecture.
