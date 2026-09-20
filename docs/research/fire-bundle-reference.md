# Préparation du lot commun — incendies, climat et survie du camp

Recherche du 20 septembre 2026. **Préparation seulement : aucun gameplay feu implémenté, aucun test ou banc lancé.** Cette recherche a été menée en parallèle du parcours naturel V86. Cette note propose une boucle à joindre aux saisons et à l'énergie, sans imposer la réalisation d'événements rares sur chaque graine.

## Références et niveau de preuve

- Corpus relu via `docs/research/reference-adoption.md` : chapitre 22, avec les frontières des chapitres 7 (météo), 9 (travail), 10 (construction), 13 (santé), 21 (navigation), 23 (simulation et sauvegarde). **SYS-129 / TEST-129** demandent propagation, chaleur, dégâts et extinction ; masquer les particules ne doit pas arrêter la combustion. **STAT-165** distingue inflammabilité de définition et facteurs d'instance. SYS/TEST-127–128 relient réseaux et combustible ; SYS/TEST-131 ne suffit pas à transférer au Core ses références Odyssey. CAT-001 n'est pas une table complète de résistances.
- Contrats courants : `docs/development/barriers.md`, `temperature.md`, `power.md`, `construction.md`, `spatial-motion-storage.md`, et inventaire des limites. Le foyer `World.home` existe pour les réparations ; il n'assure pas encore l'extinction. Les dégâts installés actuels concernent murs, portes et climatiseurs, pas toutes les choses du camp.
- Source primaire déterminante : installation locale **Core 1.6.4871 rev590**, sans extension/mod, DLL `E:/Steam/steamapps/common/RimWorld/RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Consultation en lecture seule des Defs et extractions ciblées ILSpy 8.2.0.7535 dans `tmp/fire-reference/`. Ne publier ni ces extractions ni les XML propriétaires.
- Recherche publique fraîche : le [wiki Fire](https://rimworldwiki.com/wiki/Fire) avertit explicitement que l'effet de l'inflammabilité sur Flame doit être revérifié depuis **1.5.4062**, et que les chiffres/manières de propager sont incomplets. Son résumé « feu dans le foyer » omet des branches locales importantes. L'[annonce officielle 1.5](https://ludeon.com/blog/2024/03/anomaly-expansion-and-update-1-5-announced/) situe historiquement les conduits cachés, mais ne fournit pas les coefficients actuels. Le [miroir public Fire.cs](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/Fire.cs) corrobore plusieurs branches ; `master` n'atteste pas la version locale. Les arbitrages chiffrés ci-dessous proviennent de l'installation, pas de la version supposée du miroir.
- Les recherches n'ont pas rejoué visuellement ces règles dans RimWorld. Les incohérences éventuelles entre Def, appelant et comportement visible doivent faire l'objet d'une observation précise, et non d'une certitude exhaustive.

## Boucle recommandée et limites

Un feu extérieur issu du climat peut gagner végétation, cultures, stock et bâtiment combustibles. Le joueur protège le camp par matériaux et espace dégagé, étend le foyer, affecte les pompiers ou donne un ordre direct. Ils se rendent au contact ; l'extinction concurrence réellement production, alimentation et soins. Un intérieur en feu chauffe, les personnes peuvent brûler ou subir la chaleur, une destruction peut couper l'alimentation et retirer un support de toit. Après extinction, les survivants soignent, réparent ou reconstruisent, avec pertes matérielles constatées et réserve alimentaire préservée ou reconstituée.

Ne pas traiter le feu comme un retrait périodique de bois ou une animation. Ne pas ajouter par inertie toutes les armes incendiaires, pyromanie, chimicarburant, animaux explosifs, mousse, gaz, propagation volumétrique ou physique de débris. L'absence de fumée gameplay, d'explosions de batteries et de courts-circuits devra rester visible si ces sous-systèmes ne sont pas inclus. Une batterie rendue artificiellement indestructible serait une limite majeure de la boucle énergie : arbitrer son profil et sa destruction avant livraison.

## Règles vérifiées dans le Core local

Les durées suivantes sont en **ticks Core**, 60/s, et non en ticks locaux. Lisière avance 10 ticks Core par pas local. Conserver les restes et échéances de 15, 66 ou 426 Core ; arrondir chaque opération à un nombre entier de pas locaux dériverait la cadence.

### Feu autonome, cibles et propagation

Sources : `RimWorld.Fire`, `FireUtility`, `Spark`, `Verse.Thing`.

| Règle | Valeur ou comportement constaté |
|---|---|
| Taille | Initiale/minimale 0,1 ; maximum 1,75. Le feu est une chose distincte, au sol ou attachée à une personne. |
| Avancement | Mise à jour de 15 Core ; calculs complexes au hash intervalle de 150 Core. Le nombre de particules est plafonné indépendamment de cette activité. |
| Combustible | Terrain et choses combustibles de la cellule ; maximum d'inflammabilité pour la croissance. Pas de combustible si terrain `extinguishesFire`. À moins de 0,01, le feu disparaît. |
| Croissance | Par calcul complexe : `0.00055 × inflammabilitéMax × 150`, plafonné à 1,75. La branche vide spatial est hors Core de surface retenu. |
| Départ de propagation | Seulement taille strictement supérieure à 1. Intervalle `max(75, 150 − (taille−1)×40)` Core, compteur réinitialisé après tentative. Phase initiale aléatoire. |
| Destination | 80 % : huit voisins immédiats ; 20 % : indices 10 à 20 de `GenRadial.ManualRadialPattern`. Vérifier les coordonnées exactes avant transcription ; ce n'est pas un tirage uniforme dans tout le disque. |
| Portée lointaine | Ligne de vue puis projectile `Spark`, lequel démarre un feu 0,1 à l'impact. Conserver une échéance de transit si le projectile est simplifié ; ne pas ajouter un allumage immédiat derrière un obstacle. |
| Probabilité | Le producteur effectue le tirage de la chance d'allumage. `TryStartFireIn` vérifie seulement qu'elle est positive : le rappeler avec un second tirage serait erroné. La présence d'un feu sur la cellule empêche un nouveau feu de sol. |
| Obstacles | Intérieur contracté d'un grand bâtiment impassable et filth interdisant le feu peuvent bloquer l'allumage. `FireBulwark` peut empêcher choses et terrain sous-jacents de brûler. Ce statut n'est pas synonyme de matériau à 0 % d'inflammabilité. |
| Sol construit | Le terrain inflammable brûle après un âge de feu de 7 500 Core. Les sols naturels locaux ne deviennent pas une ressource combustible inventée. |

**Aucune pondération directionnelle par le vent n'apparaît dans la propagation relue.** Les Weathers ont bien un vent, mais cela ne prouve pas un multiplicateur de propagation. Ne pas inventer de feu dirigé par le vent pour rendre le résultat intuitif.

Core réinitialise le compteur de propagation lors d'une restauration. Lisière doit au contraire persister le compteur/la prochaine échéance, les braises en transit et le PRNG, conformément à son contrat de continuation stricte. C'est une adaptation de persistance explicite, sans accélération du jeu.

### Dégâts, chaleur et pluie

Sources : `Fire.DoComplexCalcs`, `DamageWorker_Flame`, `DamageWorker_Extinguish`, `DamageWorker`, Defs `Flame` / `Burn`.

- À chaque calcul complexe, le feu de sol choisit une cible inflammable de sa cellule ; un feu attaché vise son porteur. Montant brut arrondi aléatoirement : `clamp(0.0125 + 0.0036×taille, 0.0125, 0.05) × 150`, minimum 1. Ce n'est pas « 2 dégâts/seconde fixes » pour toutes les situations.
- **Depuis le comportement local actuel, les dégâts Flame aux bâtiments sont multipliés par `max(0.05, inflammabilité)`**, en plus des facteurs généraux du DamageDef. Les plantes et corps ont leurs facteurs distincts. Ne pas appliquer ce multiplicateur à toutes les catégories à partir du seul wiki.
- Un humain reçoit une brûlure sur une partie extérieure avec armure Heat, pénétration 0 ; un vêtement porté choisi aléatoirement peut subir aussi des dégâts. `Burn` cause la blessure mais n'ajoute pas le comportement d'allumage de `Flame`. Réutiliser les vrais dossiers médicaux et la voie armure ; une baisse de jauge globale serait une régression.
- Chaleur injectée : taille ×160 unités par 150 Core, facteur 0,15 si la cellule contient une porte. Distribuer via les volumes de la topologie thermique existante. Le feu doit affecter température, conservation et exposition, pas seulement la lumière.
- Pluie : `RainRate > 0.01`, vulnérabilité du feu à la pluie, puis branche `Rand.Value < 6` dans le calcul de 150 Core ; celle-ci est donc toujours vraie pour un tirage usuel [0,1]. Extinguish 10 retire 0,1 de taille. **Ne pas transformer le symbole historique 0,04 en une probabilité de 4 % par calcul**, ni multiplier une seconde fois par l'intensité de pluie sans preuve.
- Toit : sans toit, vulnérable ; toit épais, protégé ; toit ordinaire, vulnérable seulement si l'édifice de la cellule porte un toit. Ainsi un mur sous toit ordinaire n'a pas la même protection qu'un stock sur le sol intérieur. Le modèle actuel n'a pas tous ces types de toit : consigner exactement le sous-ensemble.
- Extinguish retire `montant×0.01` de taille ; disparition si taille strictement inférieure à 0,1, et non à zéro. Un feu sans combustible disparaît également.
- La fonte locale de neige apparaît dans Fire, mais ne doit être activée que si l'épaisseur de neige est réellement livrée par l'autre sous-chantier.

### Météo et départ naturel

Sources : `WeatherDecider`, `FireWatcher`, `WeatherEvent_LightningStrike`, `WeatherDefs/Weathers.xml`.

- FireWatcher réévalue tous les **426 Core** la somme `0.5 + taille` des feux. Danger important si somme **>90**. Il réduit la durée de météo considérée à un quart et multiplie par **15** le poids des météos pluvieuses (`rainRate >0.1`). Restrictions climatiques, conditions empêchant la pluie et tirage subsistent. **Aucun minuteur ne garantit la pluie salvatrice.** Lier cet indicateur au propriétaire de la météo, sans créer un second calendrier de pluie dans le module feu.
- La sélection naturelle écarte les météos de favorabilité inférieure à Neutral avant huit jours depuis l'installation. Orages sec/pluvieux ne doivent pas être imposés au démarrage pour faire réussir un test.
- Orages sec et pluvieux locaux : températures admises 0…999 °C, durée 15 000…40 000 Core, événements flash et frappe ayant chacun un intervalle moyen de 1 200 Core. Ce sont des intervalles moyens conditionnels à l'orage, pas une frappe périodique garantie toutes les vingt secondes.
- La frappe choisit une cellule praticable sans toit ; explosion Flame de rayon 1,9, sous la condition locale de brouillard de guerre. Ne pas rendre toutes les cellules du disque automatiquement en feu : l'explosion et le démarrage possèdent leurs règles. Précipitations liquides/neigeuses partagent `rainRate` dans les Defs lues ; le visuel neige n'implique pas l'absence d'extinction.
- La distribution des météos, les valeurs du site et la saison appartiennent au chantier climat. Aucune nouvelle cadence Cassandra d'incendies n'est justifiée ici.

### Extinction physique, priorité et personne en feu

Sources : WorkTypes/WorkGivers, `WorkGiver_FightFires`, `JobDriver_BeatFire`, `Verb_BeatFire`, `Pawn_NativeVerbs`, `VerbDefsHardcodedNative`, fournisseurs de menu et arbre `BurningResponse`.

- Travail Firefighter actif initialement, naturalPriority **1400**, avant Patient **1350**, urgence, accessible mobilisé. Ces valeurs sont l'ordre Core des familles, pas les nombres de notre tableau utilisateur. Ajouter une famille Extinction cohérente avec nos priorités manuelles et une migration neutre explicitement choisie ; pas la cacher derrière Construction.
- Feu ordinaire autonome : dans le foyer, capacité Extinction, accès au contact, danger **Deadly** accepté. L'ordre normal doit pouvoir interrompre un travail moins urgent de manière conservative. Aucun seau, eau prélevée, compétence d'artisan ou XP d'extinction n'est demandé par cette voie locale.
- Coopération : réservation possible pendant l'approche, mais pas exclusion stricte de tous les pompiers. Au-delà d'une distance de 15, refus si cible non réservable ; hors ordre forcé, un premier réservant déjà à 5 cases fait considérer le feu comme pris en charge. Préserver l'anti-doublon de trajet sans interdire deux acteurs au contact.
- Le pompier éteint prioritairement sa propre cellule et une cellule de trajet avant de poursuivre. Pas de contact à travers un coin solide. Coup nominal **32 Extinguish** (=−0,32 taille), portée 1,42, échauffement nul, cooldown nominal **1,1 seconde / 66 Core**. Aucune frappe au tick de naissance du feu ni quand l'acteur est occupé par une posture exclusive.
- **Clic droit actuel distinct du WorkGiver non directOrderable** : `FloatMenuOptionProvider_ExtinguishFires` propose l'extinction à proximité, civil/mobilisé et multisélection. Manipulation, capacité métier, accès et zone autorisée sont vérifiés ; le foyer n'est pas exigé. Il construit une tâche à cibles successives, avec durée maximale de 600 secondes de travail d'extinction. Ne pas conclure « pas d'ordre direct » à partir de l'ancien seul WorkGiver.
- Personne alliée/hébergée en feu : secours automatique hors foyer jusqu'à **15 cases Manhattan**, accès Deadly. L'ordre direct dédié permet de prioriser la personne sans cette limite du scan automatique. Les captifs hébergés et colons doivent être traités avec leurs rôles réels ; un prisonnier ne devient pas pompier libre.
- Un feu attaché arrête les tâches de la personne. Dans l'arbre Core partagé humains/animaux : utilisateur d'outils cherche d'abord de l'eau extinctrice proche, puis chance 0,1 de tâche d'auto-extinction, sinon course aléatoire à danger Deadly. Auto-extinction attend 150 Core et détruit l'attachement. La chance se produit lors de la décision du ThinkTree, **pas 10 % à chaque tick local**. Le scheduler exact est à vérifier avant calibration de la panique.
- Application proposée : réaction autonome distincte des crises d'humeur, libération conservative des réservations et cargaisons, arête physique conservée, incapacité et décès prioritaires. Les animaux ne doivent pas recevoir artificiellement une priorité Extinction ni ouvrir une porte sauvage.

## Invariants de destruction et de conservation

Lecture locale `DamageWorker`, `Thing.Kill/Destroy/SplitOff/TryAbsorbStack` et code Lisière `barriers.ts` / `thermal-sources.ts`.

1. Une pile Core a ses PV, pas un réservoir de PV égal à quantité ×PV. Une séparation copie les PV ; une fusion utilise la moyenne pondérée par quantité, arrondie au plafond. À destruction, la pile entière disparaît. **Le contrat Lisière doit choisir explicitement cette représentation** et étendre split/merge/save, jamais faire disparaître une unité par coup sans preuve.
2. L'identité et l'âge des aliments non détruits restent inchangés. Enregistrer les quantités effectivement brûlées par ItemId dans un registre distinct de consommation, pourriture, construction et déconstruction. Pas de viande, bois, tissu ou composants créés en brûlant ; les cendres visuelles ne sont pas un remboursement matériel.
3. Si une ressource/pile ou station disparaît, annuler/reconcilier réservations, facture, source et destination du transport, ouvrage incorporé et soin/alimentation concernés. Une cargaison déjà portée survit tant que son objet propre n'est pas détruit ; elle ne s'annule pas parce que sa destination a brûlé.
4. Généraliser la transaction de destruction existante sans changer les restitutions historiques de murs/portes/climatiseur. Détruire un appareil doit libérer service, files, facture/fuel, puis retirer le producteur/connecteur et recomposer l'énergie. Une batterie détruite ne doit laisser ni énergie virtuelle ni pile transportée dupliquée. Les règles exactes de restes **par famille** et l'explosion d'une batterie doivent être vérifiées avant d'implémenter leur profil, pas extrapolées depuis la déconstruction.
5. Le retrait du support modifie pièces, toit, chauffage et accès au même pas ; les captures de topologie ne survivent pas à cette mutation. Une chute de toit peut tuer l'acteur et avancer le PRNG : ne pas remettre son état antérieur ensuite. Même contrat que les brèches actuelles.
6. Brasier, projectile/braise, attachement, cooldown, décision de réaction et registre des pertes font partie de la sauvegarde. Migration strictement validée avant ajout neutre ; aucun feu, dégât, objet, événement passé ou graine changée dans l'ancien camp. PRNG feu distinct recommandé, dates et sous-ticks persistés ; météo possède son propre PRNG.

## Frontières attribuables pour le ensemble

| Responsabilité indépendante | Fichiers/modules proposés et raccords centraux |
|---|---|
| Noyau du feu | Nouveaux `fire-rules.ts`, `fire.ts`, `fire-save.ts` : taille, échéances Core, combustible local, propagation/braise, attachement, pluie, chaleur et ledger. Aucun calcul global de carte par feu. |
| Dégâts et matière | Nouveau `thing-damage.ts` + profils des **seuls objets déjà disponibles**, `materials.ts`/save, `barriers.ts`, corps/plants. Extraction préalable du retrait transactionnel commun ; owner distinct du noyau feu, API de résultat prévalidé. Ne pas faire grossir barriers en gestionnaire de tout. |
| Travail et sécurité | Nouveau `firefighting.ts` et réaction de personne en feu ; raccords planner/need/ordre/draft/animal sous intégration centrale. API contact et budget navigation existants ; scans locaux/indices sparse, captures valables pour une décision synchrone. |
| Climat/saisons | Autre agent : `weatherAt/precipitationAt`, calendrier/PRNG/site, FireWatcher et émission d'un événement de frappe. Une seule décision météo, pas deux compteurs concurrents. |
| Énergie et panne | Owner énergie : invalidation après destruction, batterie/conduits sous bâtiment, éventuel court-circuit/explosion après recherche spécifique. Pas de court-circuit inventé par le noyau feu. |
| UI/rendu/validation | Root : type versionné, commandes, inspecteur/alerte foyer et tableau Extinction. Feux/particules/pose de coup en buffers résidents, aucun graphe TSL par flamme. Pilote de camp commun, checkpoints contrôlés et instrumentation. |

Ces noms sont des propositions d'ownership, pas des fichiers créés ni un calendrier concurrent à ROADMAP. Réduire la liste aux responsabilités effectivement retenues lors de l'intégration.

## Campagne commune depuis le camp V86

- **Continuité naturelle** : reprendre un checkpoint réel du camp V86 validé, conserver le résultat du recrutement, son équipement, ses dommages, cultures, stocks et recherches. Faire vivre le camp à travers la transition saisonnière choisie par le chantier climat, sans changer les longueurs de jour/culture. Mesurer températures, nourriture, chauffage/refroidissement, production et pertes. Les jours atteints sont observés, pas un contrat que toutes les menaces arrivent à cette date.
- **Feu contrôlé clairement séparé** : dériver une copie du même checkpoint, conserver toutes ses ressources et relations, puis provoquer un départ de feu identifié (hook de fixture/incident réel contrôlé, jamais état prétendu naturel). Vérifier commande et travail d'extinction, dommage avant secours, chaleur intérieure, coupure électrique et réparation/reconstruction avec les stocks du camp. Conserver le checkpoint pré-feu et son hash. Cette branche ne doit pas devenir silencieusement la suite historique du parcours naturel.
- **Scénario profond groupé** : extérieur/habitation, mur de pierre/bois, pile d'aliments, culture, pluie sous/sans toit, contact à deux pompiers et chemin barré ; personne en feu soignée, conservation de cargaison/ouvrage, destruction de support et retrait électrique. Les cas dangereux peuvent avoir une copie contrôlée dédiée ; ne pas chercher une graine unique qui les produirait tous spontanément.
- **Persistance aux frontières** : sauvegarder pendant braise en transit, personne attachée, coup de pompier, pluie et retrait d'un support ; continuation exacte et rejet des états incohérents. Inclure le survivant d'une ancienne version sans exposition rétroactive.
- **Préflight unique puis campagne groupée** : valider d'abord les commandes et un petit incendie contrôlé ; lancer ensemble les contrats touchés, puis une traversée longue commune. En cas d'échec, repartir du checkpoint réel et préserver les états invalides bruts pour diagnostic ; ne pas relancer les 70 jours précédents par automatisme.
- **Performance centralisée successive** : charge mixte camp/énergie/captifs et plusieurs foyers, affichage et particules actifs ou masqués ; même résultat autoritaire. Mesurer CPU, worker et rendu séparément après gel des sources. Ne pas profiler pendant le parcours naturel actuel ni pendant une UI native.

## Inconnues et décisions à fermer avant code concerné

1. **Auto-inflammation à ~235 °C** : indication du wiki, mais déclencheur précis, fréquence et catégories non trouvés dans les seules classes thermiques ciblées. Ne pas coder un seuil global toutes cases/tous ticks sur cette base. Lire l'appelant de température/thing avant de retenir cette partie.
2. **Profils des objets présents** : inflammabilité finale via inheritance/stuff, PV, FireBulwark, restes de destruction, paquets/ouvrages/cadavres et batteries. Les premiers Defs confirment notamment le facteur matière acier 0,4 contre bois 1, mais cela ne prouve pas que tous les appareils métalliques ont l'inflammabilité du matériau. Faire un relevé ciblé de notre catalogue seulement.
3. **Panique et auto-extinction** : périodicité des décisions du ThinkTree, cooldown effectif du verbe et comportements d'un porteur/patient à terre. Nominal 66 Core ne prouve pas absence de facteur d'état ; la voie médicale/chaleur doit rester commune.
4. **Danger de navigation et arrêt adjacent mobilisé** : WorkGiver et ordres sont vérifiés, mais pénalités générales de route, danger par taille et interruption automatique d'un mobilisé à l'arrêt nécessitent la lecture de leurs appelants. Ne pas détourner `Danger.Deadly` en immunité à la chaleur.
5. **Braises** : coordonnées exactes du motif radial et temps de projectile restent à fixer depuis Def/projection locale. Toute simplification temporelle doit être annoncée ; une portée « rayon 2 uniforme » serait déjà une autre règle.
6. **Météo complète** : probabilités conditionnelles par biome/site, transition des intensités et fréquence des événements à lire par le propriétaire climat. Les moyennes d'orage ci-dessus n'attestent pas sa fréquence annuelle.
7. **Cendres/fumée/suies** : la cendre est créée par Flame à la destruction non humaine, mais notre hygiène et fumée fonctionnelle sont absentes. Distinguer présentation de résidu et système gameplay ; ne pas prétendre une suffocation fonctionnelle à partir d'une particule.

Les inconnues sont bornées et attribuables ; elles n'obligent pas à attendre un catalogue entier. Elles empêchent en revanche de présenter comme fidèle une destruction ou une réaction corporelle dont la branche n'a pas été vérifiée.
