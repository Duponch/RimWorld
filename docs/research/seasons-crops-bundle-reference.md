# Saisons, climat du site et survie végétale — référence V87

Relevé du 20 septembre 2026, complété pendant V87. **Implémentation V87 validée dans son périmètre**, avec calendrier partagé, climat annuel, lumière saisonnière et survie des cinq plantes déjà modélisées. La campagne commune climat/énergie/feu reste distincte des contrôles courts. ROADMAP reste le seul calendrier. [Contrat courant](../development/site-climate.md).

## Périmètre et provenance

Lecture de `AGENTS.md`, de l'index et de ROADMAP courants ; contrats `temperature.md`, `plant-temperature.md`, `farming.md`, et état réel des modules `calendar`, `environment`, `site`, `plants`, `thermal-plants`, `temperature`, `local-light`, `solar-rules`. Les anciennes cartes restent sous leurs règles jusqu’à une adoption explicite ; le contrat courant décrit les nouveaux mondes et cette transition.

Corpus relu directement dans le HTML original, chapitres **3, 7, 12 et 22**, via `reference-adoption.md`, et lignes du classeur **SYS/TEST-012, 070, 071, 072, 075, 126, 131** :

- **Adopter** date locale distincte du temps écoulé, contexte climatique du site, température intérieure distincte, temps réellement favorable à la croissance, semis/récolte/mort séparés et effets de météo autoritaires.
- **Adapter** représentation 3D, cadence et arithmétique en gardant résultats et continuation ; les propositions d'architecture du corpus ne sont pas les algorithmes obligatoires.
- **Différer** tous les biomes, monde complet, maladies végétales et systèmes DLC. SYS-131 est étiqueté Core mais cite une présentation Odyssey : cette ligne ne prouve pas que chaque gel/inondation cité soit Core.

Référence primaire locale : **RimWorld Core 1.6.4871 rev590**, installation `E:/Steam/steamapps/common/RimWorld`, consultée en lecture seule. Assembly déjà identifiée dans les enquêtes du projet : SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Classes relues dans cette installation pour cette note : `GenDate`, `SeasonUtility`, `GenCelestial`, `GenTemperature`, `TemperatureTuning`, `MapTemperature`, `TileTemperaturesComp`, `WorldGrid`, `PlanetLayer`, `Plant`, `PlantUtility`, `PlantProperties`. Defs actuelles : `ThingDefs_Plants/Plants_Bases.xml`, `Plants_Cultivated_Farm.xml`, `Plants_Wild_Temperate.xml`, `Plants_Wild_General.xml`. Les lectures temporaires sont internes dans `tmp/seasons-reference` ; **aucun code propriétaire ni XML à publier**. Les nombres et comportements reformulés ci-dessous sont notre relevé.

Recherche Internet renouvelée :

| Source primaire publique | Ce qu'elle établit | Limite |
|---|---|---|
| [Ludeon, Alpha 8 — Winter is Coming, 10 décembre 2014](https://ludeon.com/blog/2014/12/alpha-8-winter-is-coming-released/) | Saisons dépendant du lieu, température quotidienne/annuelle, chauffage, froid, vêtements, nourriture et neige sont des systèmes du jeu de base depuis cette version. | Historique du système, pas preuve des coefficients 1.6.4871. |
| [Ludeon, Beta 18, 18 novembre 2017](https://ludeon.com/blog/2017/11/rimworld-beta-18-a-world-of-story-is-released/) | Les saisons varient progressivement avec la latitude, avec transition sans saison près de l'équateur. | Ne pas réduire toute latitude à quatre étiquettes identiques ; valeurs actuelles lues localement. |
| [Tynan, réponse sur le healroot, 10 mars 2020](https://ludeon.com/forums/index.php?topic=51033.0) | Le développeur confirme que sa survie au grand froid est intentionnelle. | Rapport d'origine sous 1.1 et avec mods ; seules la réponse du développeur et les Defs locales soutiennent l'exception, pas toutes les conditions de la capture. |
| [Ludeon, aperçu Odyssey du 19 juin 2025](https://ludeon.com/blog/2025/06/odyssey-preview-1-map-features-landmarks-and-biomes/) | La présentation concerne explicitement des nouveautés d'extension, dont milieux, caractéristiques et météos. | Ce texte ne justifie pas l'adoption automatique de l'eau/glace dynamique ou des inondations dans notre lot Core. |

Les pages généralistes et discussions trouvées sur la température ont parfois repris un optimum à 10 °C ou confondu saison annoncée et autorisation de semer. Les classes locales confirment les bornes **0/6/42/58 °C**, déjà adoptées V39 ; aucune raison de changer les six degrés en dix. Aucun chiffre de fréquence d'événement n'est déduit d'une partie personnelle.

## Calendrier et climat vérifiés

| Grandeur | Core local | Conséquence Lisière |
|---|---|---|
| Jour / heure | 60 000 / 2 500 ticks Core | 6 000 / 250 ticks locaux existants, dix Core par local ; ne pas modifier les durées biologiques. |
| Année / quadrum | 60 jours / 15 jours ; douzième = 5 jours | Année locale 360 000 ticks. Un quadrum est une date globale ; ce n'est pas toujours une saison locale. |
| Arrivée | Heure nominale 06 h ; année initiale nominale 5500 | L'heure d'arrivée déjà appliquée ne prouve ni jour de l'année, ni latitude du site. |
| Heure locale | Décalage par fuseau de longitude, largeur nominale 15°, offset en heures | Séparer heure locale, date absolue et temps écoulé. Ne pas appliquer cet offset aux soins, à la pourriture, aux échéances ou aux RNG. |
| Température extérieure | Moyenne de tuile + variation saisonnière + variation solaire quotidienne + variation irrégulière + conditions de carte | Un hiver est une évolution du site ; une vague de froid reste un incident distinct. |
| Quotidien | Cosinus d'amplitude 7 °C, phase journalière +0,32 | Le minimum quotidien déjà modélisé est vers 04:19, le maximum vers 16:19. |
| Saisonnier | Cosinus annuel, minimum au début du douzième central de l'hiver nord ; signe inversé au sud | La température ne saute pas au changement d'étiquette. Le milieu de saison affiché et l'extrémum thermique ne sont pas interchangeables. |
| Amplitude saisonnière | Courbe linéaire par morceaux : distance normalisée 0 → 3 °C ; 0,1 → 4 °C ; 1 → 28 °C | **La distance n'est pas latitude/90** : `PlanetLayer` utilise la valeur absolue de la coordonnée verticale du centre de tuile divisée par le rayon, donc sinus de latitude sur la sphère. |
| Variation irrégulière | Bruit Perlin déterministe lié à la tuile, amplitude multiplicative 7 ; fréquence ≈0,000005 par tick Core, lacunarité 2, persistance 0,5, trois octaves | Ce n'est pas un tirage indépendant par jour. Si le lot n'adopte pas ce bruit, annoncer cette limite au lieu de fabriquer une météo aléatoire équivalente. |
| Rafraîchissement extérieur | Cache Core renouvelé tous les 60 ticks de jeu, conditions thermiques de carte ajoutées lors du renouvellement | Une cadence locale explicite de six ticks est possible ; elle doit être commune aux consommateurs et testée, sans produire de mise à jour par frame. |

La lumière céleste consulte latitude, jour de l'année et fraction de jour. `GenCelestial` applique des corrections propres au jeu, une direction saisonnière, puis normalise le produit scalaire à **0,7**. La trajectoire actuelle à 45°/équinoxe est une coupe de ce modèle, pas un modèle annuel. **Ne pas remplacer les corrections du jeu par un lever 06 h / coucher 18 h constant, ni par un modèle astronomique terrestre supposé plus réaliste.**

### Site retenu et date automatique : inconnues levées avant calibration

Le témoin retenu est la **colonie historique B**, identifiée dans les [observations locales](colony-observation-reference.md), et non `Reference-Core-4871`, qui est boréal. Le dernier état S088 porte effectivement la date de fichier **1er février 2026, 15:10 UTC**, comme la partie mentionnée par l’utilisateur ; les douze derniers états de ce jour et le premier état S002 partagent la même tuile. Le redécodage des grilles dans S002 et S088, lus à nouveau en lecture seule, donne **16,2 °C de moyenne annuelle et 900 mm de précipitations**, identiques. Version sauvegardée : **1.6.4633 rev1261** ; ce n’est pas une carte générée en 1.6.4871.

L’utilisateur rapporte pour cette partie **22,21° N, 18,23° O**, en signalant lui-même son incertitude sur la partie ouverte. La concordance des dates et de l’ensemble B constitue un rapprochement fort, pas une vérification indépendante de la géométrie sphérique : les coordonnées n’ont pas été reconstruites depuis le graphe mondial. Elles sont retenues comme **observation utilisateur**, associées aux paramètres effectivement relus. Le réglage global de température de B est `Normal`. À cette latitude, `LatitudeSectionUtility` actuel donne bien une région saisonnière, pas un été permanent.

**Décision V87 : profil tempéré de référence nommé**, moyenne16,2, pluie900 et latitude22,21 ; formules biologiques/climatiques de la DLL actuelle. Il ne définit ni une tuile moyenne ni un réglage par défaut universel. La capture antérieure d’un autre site tempéré à8,3 °C/plage−7..23/pluie1950 a été écartée de la calibration quand les coordonnées de B ont été disponibles ; aucune latitude déduite de cette plage arrondie n’est livrée.

La courbe d’amplitude actuelle donne environ **11,41 °C** à22,21° N. Le minimum saisonnier est donc environ **4,79 °C**, avant oscillation quotidienne et bruit irrégulier. Sans ce dernier, une nuit atteint environ−2,21 °C : ralentissement ou arrêt de croissance possible, **pas une mortalité naturelle par gel garantie**. Le gel destructeur se vérifie dans une frontière contrôlée, sans rendre ce site plus froid pour le pilote.

La nouvelle lecture locale de `GenTicks.ConfiguredTicksAbsAtGameStart`, `TwelfthUtility.FindStartingWarmTwelfth` et `GenTemperature.EarliestTwelfthInAverageTemperatureRange` ferme la règle **Auto** : chercher le premier intervalle de cinq jours dont la moyenne est au moins12 °C ; si la plage chaude traverse la fin d’année, remonter à son début ; si aucune plage n’existe, prendre le début de l’été de l’hémisphère. Chaque moyenne utilise120 points horaires, commençant à midi du premier jour. Ce n’est pas un tirage uniforme d’une saison. Pour le profil B retenu, Auto commence au premier douzième ; l’arrivée locale reste06 h. Le `gameStartAbsTick=17500` réellement enregistré dans B est compatible avec ce départ et un fuseau−1, soit15000 ticks Core locaux.

La page communautaire [World generation](https://rimworldwiki.com/wiki/World_generation) conseille Auto, sans fournir toute cette sélection. La formulation générale de [Time](https://rimworldwiki.com/wiki/Time), « départ au printemps », ne suffit pas à garantir un jour identique partout. Un [ancien guide sur le forum officiel](https://ludeon.com/forums/index.php?topic=21768.0) décrit Auto comme aléatoire ; cette explication historique ne remplace pas la branche locale actuelle. Ces pages servent à identifier les divergences ; la règle retenue est fondée sur les classes primaires de la version installée.

`SeasonUtility` combine saison annuelle, hémisphère et zones de latitude ; près de l'équateur ou des pôles, été/hiver permanent sont des catégories possibles. Le lot peut rester limité à un profil tempéré nord clairement annoncé, mais ne doit pas exposer des latitudes arbitraires si leurs règles n'ont pas été intégrées.

## Plantes : règles distinctes à adopter

### Croissance et nouveaux semis

Les températures de croissance des espèces actuelles sont 0/6/42/58 °C : arrêt à 0 et 58, interpolation 0–6 et 42–58, optimum 6–42. `GrowthSeasonNow(cell, map, def)` prend **l'air de la cellule actuelle**, avec des comparaisons strictes aux deux bornes ; sa surcharge carte prend l'extérieur. Aucune fenêtre calendaire fixe n'est utilisée par cette fonction. Une saison de culture annoncée sur l'écran du site est donc un indicateur climatique, pas un verrou unique remplaçant la température locale.

La plante intègre sa croissance par `TickLong`, 2 000 ticks Core, et conserve le repos avant 25 % et après 80 % de la journée locale (06:00 et 19:12). Le facteur lumineux et la fertilité restent distincts. Lisière possède aujourd'hui une intégrale continue exacte pour son site fixe : garder cette adaptation de cadence explicitement documentée, ou changer de cadence avec décision de migration séparée ; **aucune accélération de riz/pomme de terre/maïs/coton**.

Un ancien travail de semis accepté n'est pas à annuler arbitrairement à chaque baisse de température ; le contrat V39 distingue proposition nouvelle et tâche engagée. La neige introduirait une autre condition : `SnowAllowsPlanting` exige profondeur **<0,2** dans le Core. Elle reste **différée tant que neige et travaux concernés ne sont pas livrés** ; aucune neige visuelle seule ne doit désactiver les champs.

### Froid, feuilles et mort

Lors du contrôle long, la plante consulte sa pièce. Le froid déclenche la perte des feuilles seulement si la pièce existe, **utilise la température extérieure** et si sa température ambiante est **strictement inférieure** à son seuil individuel. Ce seuil est `minGrowthTemperature + valeur déterministe entre −18 et −10 °C`, dérivée de l'identité de la plante. Il n'est ni tiré à chaque passage, ni égal à zéro.

La propriété `dieIfLeafless` décide ensuite de la conséquence. Si vraie, la plante est détruite par cette transition ; sinon la date de perte des feuilles est conservée. La durée minimale sans feuilles vaut **60 000 Core = un jour** après le dernier déclenchement : le froid persistant renouvelle cette date. **Une pièce intérieure froide n'est pas automatiquement soumise à cette branche de gel extérieur.** Elle reste soumise à la température de croissance et éventuellement à l'obscurité/vieillissement. Ne pas rendre tout toit magique : c'est la règle thermique de pièce, pas la visibilité du toit, qui est consultée.

| Espèce du catalogue présent | Croissance biologique | `dieIfLeafless` résolu | Durée de vie nominale liée à l'âge | PV plante Core |
|---|---:|---|---:|---:|
| Riz | 3 j | oui | 24 j | 85 |
| Pommes de terre | 5,8 j | oui | 46,4 j | 85 |
| Maïs | 11,3 j | oui | 90,4 j | 150 |
| Coton | 8 j | oui | 64 j | 85 |
| Buisson de baies | 6 j | non | 48 j | 120 |

La durée de vie du tableau résulte du défaut `lifespanDaysPerGrowDays=8` dans `PlantProperties`, sans override pour ces cinq plantes. Les quatre cultures ont `dieIfLeafless=true` explicite, les baies conservent le défaut faux. Le parent des arbres donne un multiplicateur de vie 9 et 200 PV, mais notre arbre générique n'est pas une espèce biologique résolue : **ne pas lui attribuer arbitrairement une durée de croissance d'un chêne, ni tuer toute la forêt**. Le healroot illustre une autre exception réelle ; l'ajouter au catalogue n'est pas nécessaire pour prouver ces règles.

`HarvestableNow` vérifie la maturité, indépendamment du froid et de `LeaflessNow` ; cette dernière empêche en revanche certaines possibilités d'ingestion directe de la plante. Ne pas inventer une interdiction générale de récolter un buisson sans feuilles. La récolte d'une plante persistante réduit sa croissance sans remise à zéro de son âge dans la méthode locale consultée.

### Obscurité et vieillissement

L'âge et le compteur sans lumière avancent de 2 000 Core au contrôle long ; le compteur sans lumière revient à zéro si la lumière de croissance redevient suffisante. Ce contrôle ne confond pas repos nocturne et absence de lumière. Après **plus de 450 000 Core (7,5 jours)** sans lumière suffisante, les plantes sensibles prennent des dégâts. Dépasser strictement leur durée de vie fait également débuter la dégradation. Le taux commun observé est **0,005 PV/Core**, soit **10 PV par contrôle long**, sans addition de ces deux causes : le maximum est retenu. Le gel létal ci-dessus est une autre transition, pas cette lente usure.

V87 suit ces trois causes pour les cinq plantes du tableau. L’âge historique reste inconnu : la migration n’en invente pas, et l’adoption commence un suivi prospectif. Le premier contrôle partiel ajoute seulement le temps réellement observé depuis création/adoption ; les contrôles suivants ajoutent200 ticks locaux. C’est une adaptation explicite de la première tranche Core de2000, en plus de notre intégration continue de croissance. `growthTick` ne devient jamais une date de naissance.

## Intégration retenue et invariants

- `SiteClimate` versionné conserve origine d’adoption et origine civile. `World.tick` reste le temps écoulé des raids, soins, recrutement, faim, pourriture et travaux. `calendarTick` fournit heure/date, avec une année de60 jours. Ancien monde sans climat : anciennes fonctions et phase préservées.
- Une seule intégrale annuelle lumineuse partagée de360001 doubles (≈2,9Mo) donne les intervalles de croissance enO(1), sans balayage de carte par requête. Latitude/jour communs alimentent lumière de gameplay, solaire et direction graphique ; la luminosité artistique nocturne n’est pas une règle agricole.
- Température moyenne+saison+journée, échantillonnée tous6 ticks locaux depuis l’adoption, correspondant aux60 ticks Core du cache actuel. Aucun bruit Perlin de température n’est livré : le cycle hors incident est répétitif et cette limite reste annoncée. Météo et vent disposent de leurs propres règles et états, sans réutiliser le RNG de croissance.
- `PlantLife` conserve début d’observation, naissance uniquement connue au semis, âge observé, exposition obscure, date de feuilles perdues et contrôle suivant. `Resource.damage` est commun à feu et dégradation. Phase stable par ID ; seuil individuel stable−18..−10 dérivé de l’ID avec notre mélange déterministe, **pas la même séquence privée que le RNG de RimWorld**. Aucun tirage de récolte/combat/raid n’est consommé.
- Contrôle végétal réparti tous200 ticks locaux ; gel extérieur prioritaire, puis obscurité/âge à10PV au maximum commun. La destruction passe par le retrait conservatif des ressources et travaux du feu ; aucune récolte automatique ni déduction d’un stock déjà cueilli.
- L’adoption explicite conserve l’heure courante et l’année écoulée, choisit le début doux Auto du profil et ancre toutes les croissances avant changement. Les plantes présentes commencent un âge prospectif, sans `bornAt`. Les semis suivants portent une naissance réelle. La transition n’affirme pas que la colonie V86 aurait toujours subi ce climat.
- V86 est validée sous ses règles avant migration neutre ; champs V87 interdits dans les formats antérieurs. Un climat actif impose un état biologique valide aux cinq plantes concernées ; suppression de cet état, phase fausse, âge incohérent ou futur sont rejetés, jamais réparés silencieusement.

## Une seule campagne longue commune, désormais parcourue

Départ : **checkpoint final V86 effectivement validé**, ses habitants/recrue, prison, champs, stocks, énergie, blessures et calendrier existants. Aucun renfort, tissu, bois, nourriture, batterie ni ressource injectés. Le checkpoint d'origine et la transition décrite ci-dessus restent tous deux conservés.

Après les contrôles courts regroupés, un seul compagnon étend le pilote : consultation du site, récoltes et réserves, deux chauffages, éolienne raccordée, entretien de son passage du vent, batterie nocturne, générateur de secours et entretien des besoins. Il prépare un champ supplémentaire pour les quatre personnes et extrait les matériaux manquants par les commandes ordinaires, sans connaître le prochain tirage d'incident. La confection n'est pas un nouveau sous-lot V87. Les anciennes cellules des deux murs manquants du dortoir sont occupées par des corps humains dont le transport n'est pas livré : une fermeture autour d'eux est construite physiquement, sans ajout de mur ni déplacement fictif par la fixture. Les câbles contournent aussi les cellules sans place de travail accessible ; des conduits sont réellement construits sous les radiateurs pour conserver leurs parents réseau.

Choisir la durée d'observation **après le profil climatique**, jusqu'au retour d'une période permettant semis/reprise et première récolte utile ; pas un hiver garanti à J7 ni une échéance de raid. Une année Core est une borne naturelle possible, pas la preuve qu'il faut rejouer toute l'année si des phases déjà validées ont été conservées. Le protocole central peut reprendre des checkpoints journaliers et de jalons, sans recommencer des dizaines de jours déjà passés.

Jalons exigés : ralentissement par froid, hiver puis retour du printemps, stocks réellement consommés pendant l'hiver, chauffage avec alimentation réelle, éolienne productrice, batterie consommée de nuit et récolte agricole utile au printemps. Les quatre personnes initiales doivent survivre, manger, dormir et continuer à produire des repas. Les températures et lumières sont conservées dans les observations ; un éventuel franchissement de zéro est enregistré séparément. **La mort d'une culture n'est pas exigée dans la partie naturelle** : un joueur prudent peut récolter à temps, et certains climats ne passent jamais sous son seuil. Même distinction pour froid extrême, blight, vagues de froid, nouvelle capture et coupure dangereuse. Le protocole ne permet pas de déclarer tous ces jalons obtenus avant sa réussite.

Frontières courtes regroupées avant ce parcours : 0/6/42/58 °C ; seuil individuel du gel de chaque côté et à égalité ; pièce intérieure froide vs extérieur/rupture du toit ; froid prolongé puis récupération des baies ; culture mûre récoltable malgré croissance nulle ; plante mourant pendant réservation et cargaison indépendante conservée ; obscurité juste avant/après 7,5 jours et reprise lumineuse ; durée de vie connue ; continuation exacte au contrôle ; hiver/été nord et heure locale sans décaler soins/raids ; extinction du chauffage et surcharge électrique. UI native sur quelques checkpoints réellement obtenus, campagne de performance séparée de la campagne de colonie, sans concurrence CPU.

Arrêt matériel : commande/validation/identité erronée, perte de colonie selon les assertions communes, impasse d'approvisionnement démontrée par plusieurs checkpoints. Une croissance lente, un hiver doux ou l'absence d'un événement rare ne constituent pas un blocage du moteur.

Le parcours est réussi de **J76,283 à J136,073**, soit 59,79 jours depuis l'adoption. Il reprend les checkpoints réels après diagnostic du travail fractionnaire de construction, des accès de chantier et de la transaction de destruction ; la dernière reprise J88→fin dure 1 630,684 s de pilote. Le froid observé atteint −2,211 °C, le maximum 34,607 °C. Hiver, croissance ralentie et chauffage hivernal sont constatés au tick 724500 ; le printemps revient au tick 814500 et six riz sont récoltés au tick 816438. Les quatre habitants initiaux survivent ; 120 ingestions sont observées pendant l'hiver. Les 7 163 produits récoltés et 483 repas cuisinés sont des résultats de cette colonie, pas une norme de rendement ou une preuve d'autonomie universelle.

La petite chambre perd réellement sa chaleur après une brèche lors d'un raid, puis retrouve 21 °C après reconstruction ordinaire. Quinze arbres brûlent naturellement ; 153 unités de rendement potentiel de bois sont comptées distinctement des piles perdues. Aucune extinction par les colons ni destruction de stock par le feu n'est revendiquée dans cette campagne. Voir le [contrat](../development/site-climate.md), le [rapport complet](../../artifacts/environment-colony-v87.json) et la [preuve centrale](../history/validation-environment-v87.md) pour les reprises, frontières rares, UI et mesures séparées. La fixture finale Lisière permet de poursuivre le prochain ensemble sans rejouer ce cycle.

## Limites et observations encore ouvertes

- Coordonnées de B : observation utilisateur concordante, pas géométrie reconstruite. Le témoin boréal apparaît39,71°N/13,47°E dans une capture de sélection, puis39,63°N/13,81°E dans la nouvelle observation ; l’écart peut désigner une autre tuile. Il n’entre pas dans la calibration tempérée.
- Bruit Perlin de température, monde paramétrable, autres biomes et réglages thermiques globaux restent absents. Météo et vent V87 ne permettent pas d’affirmer cette variation de température irrégulière déjà reproduite.
- Âge initial des plantes sauvages et leur renouvellement spontané, espèces réelles d’arbres, neige accumulée et sa profondeur, autorisation de semis sous neige, maladies végétales, écologie/migration animale restent partiels ou absents. Un buisson historique suivi prospectivement peut finir par mourir ; aucun stock sauvage immortel n’est annoncé.
- La croissance sous lampe horticole n’est pas livrée ; les sources ordinaires plafonnent à50 %, sous le seuil agricole51 %. Un toit protège de la lumière naturelle mais ne remplace pas une pièce thermique.
- Le scénario court d’intérieur froid et de gel extérieur utilise des entrées climatiques contrôlées, distinctes de la campagne naturelle. Une capture de cette frontière dans RimWorld serait utile pour comparer sa présentation ; les branches de simulation sont déjà vérifiées localement.
- État V87 : quatre contrôles courts climat/plantes et campagne commune réussis ; la clôture intégrée, les inspections et mesures finales restent suivies dans la preuve centrale. Ce résultat n’est ni un équilibrage global Core ni une preuve de performance en colonie dense.
