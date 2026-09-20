# Préparation commune — saisons, climat du site et survie végétale

Relevé du 20 septembre 2026. **Recherche préparatoire uniquement : aucun changement de production, aucune campagne, aucune nouvelle livraison.** Cette recherche a été menée en parallèle de la validation V86. Cette note prépare un ensemble intégré avec chauffage, habillement et réserves, suivi d'un seul parcours long commun. ROADMAP reste le seul calendrier.

## Périmètre et provenance

Lecture de `AGENTS.md`, de l'index et de ROADMAP courants ; contrats `temperature.md`, `plant-temperature.md`, `farming.md`, et état réel des modules `calendar`, `environment`, `site`, `plants`, `thermal-plants`, `temperature`, `local-light`, `solar-rules`. Les anciennes limites thermiques et agricoles sont encore effectives : la présence d'une doc de recherche ne les remplace pas.

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

À titre d'illustration calculée de la courbe, une latitude de 45° donne une amplitude annuelle d'environ **20,19 °C**. Avec la moyenne actuelle provisoire de 21 °C, le minimum saisonnier vaut environ 0,81 °C avant cycle quotidien et bruit : des nuits sous zéro sont possibles, mais cela ne promet pas une mort générale des cultures entre −18 et −10 °C. Ce calcul **n'est ni un site moyen de RimWorld ni une mesure de partie**. Choisir artificiellement une moyenne plus froide juste pour réussir le test de gel serait incorrect.

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

Lisière ne conserve aujourd'hui ni cet âge biologique complet, ni PV végétaux, ni exposition obscure. Le minimum cohérent pour saisons peut livrer mort par froid et feuilles des baies, avec obscurité/vieillissement encore annoncés absents ; **le ensemble plus complet recommandé ajoute les trois causes pour les cinq espèces agricoles déjà connues**, afin que les serres fermées et récoltes laissées sur pied ne deviennent pas des solutions indéfinies. Cela nécessite une décision explicite sur les plants historiques, pas l'utilisation erronée de `growthTick` comme date de naissance.

## Proposition d'intégration bornée

1. **Contexte du site et calendrier.** Nouveau module cohérent `site-climate.ts` / validateur dédié : paramètres versionnés, latitude/longitude ou profil tempéré nommé, moyenne annuelle vérifiée/choisie, origine civile et graine de variation climatique privée. `calendar.ts` expose heure/jour/année à partir de ce contexte. `World.tick` demeure du temps écoulé ; calendriers Cassandra, blessures, recrutement, pourriture, nourriture et recherches ne sont pas réécrits.
2. **Environnement partagé.** Une source commune produit lumière naturelle et température extérieure pour thermique, semis/croissance, solaire, HUD et ambiance. Préserver les différences entre lumière naturelle, éclairage intérieur et pixels. Si le bruit irrégulier est différé, le dire dans l'inspection du profil et les contrats ; ne pas annoncer météo complète. Chauffage et vêtements lisent cet air existant au lieu d'un second indice de froid.
3. **Vie végétale.** Module `plant-life.ts` sparse pour les espèces effectivement modélisées : identité, état daté de feuilles, âge observé, obscurité et éventuels PV. Un seuil de gel déterministe privé par identité ne consomme pas le PRNG de raids, social, combat ou récolte. Échelonner les contrôles sur une phase stable par plante, sans mutation par frame. La perte d'une plante annule ses réservations/récoltes au point de réconciliation habituel ; **aucune nourriture n'est produite par sa mort**.
4. **Croissance saisonnière sans balayage intégral par requête.** Conserver des ancres d'intervalle et une intégrale lumineuse partagée par profil/site, indexée par année ou par jours précomputés. Exemple de coût à arbitrer, pas architecture imposée : un préfixe annuel de 360 001 doubles représente ≈2,9 Mo par profil, contre ≈48 Ko actuellement. Ne pas recalculer 60 jours pour chaque plant ni balayer 62 500 cellules à chaque demande de température. Captures topologiques seulement pendant une décision synchrone, invalidées après mutation pertinente, comme les correctifs V86.
5. **Inspection et pilotage.** Afficher saison/date civile, températures de site/air courant, cause de croissance arrêtée, plante détruite ou en récupération ; aucune date de récolte garantie. Conserver semis désactivables, récolte réelle avant l'hiver, nourriture transportée, factures, courant et combustible.

Fichiers transverses probables à attribuer au centre : `types.ts`, `serialization.ts`, `engine.ts`, `site.ts`/site-save et création de partie ; `temperature.ts`, `environment.ts`, `calendar.ts`, `thermal-plants.ts`, `plants.ts`, sauvegardes agricoles, `farming.ts`, végétation/solaire/rendu/HUD. Un autre sous-lot peut posséder chauffage/habillement/stockage sans éditer simultanément ces mêmes règles. Ne pas ajouter une dépendance météo à chaque métier indépendamment.

## Migration et invariants à décider avant le code

- **V86 doit être validée sous ses règles avant migration.** Les anciennes colonies gardent absence de climat saisonnier, leur phase civile actuelle et leur température provisoire tant qu'aucune adoption explicite n'est faite. Aucun hiver ni date passée inventés automatiquement.
- Pour faire avancer **la colonie V86 commune**, conserver le checkpoint final original immuable et définir une transition climatique explicite, datée et décrite dans le protocole. Une commande d'adoption peut fixer la phase choisie et les paramètres du profil sans avancer `tick` ; elle constitue une adaptation de continuation, **pas une ancienne partie qui aurait toujours subi ces saisons**. Autre solution : une nouvelle partie avec climat depuis le départ, mais elle répète le coût du développement colonial que l'utilisateur veut amortir.
- À l'adoption, checkpointter croissance/âges alimentaires/températures au taux précédent avant de commencer l'intervalle neuf. Ne pas rétroagir sur les récoltes, PV ou exposition obscure depuis `growthTick`. La date de semis ne peut pas être reconstruite après des changements thermiques, toits ou récoltes persistantes.
- Pour les plantes historiques, distinguer « âge observé depuis adoption » d'un âge réellement connu ; ne pas prétendre leur donner leur âge Core exact. Deux options honnêtes à trancher : vie historique neutre jusqu'au remplacement naturel, ou suivi prospectif explicitement borné. Les nouveaux semis ont immédiatement une naissance connue. Un champ optionnel incohérent/ancien schéma refusé reste un échec strict, pas une réparation silencieuse.
- Pièces, seuils, toits, ressources, IDs, contenu des piles, travail de récolte, cargaisons et réservations restent conservés. Sauvegarde/reprise avant/après un contrôle végétal doit produire le même résultat, même à proximité d'une porte retirée ou d'un toit posé.
- Une mort végétale ne décrémente pas un stock alimentaire déjà récolté. Le protocole compte séparément potentiel perdu sur pied, produit récolté, nourriture stockée/consommée/pourrie et exportée aux captifs/animaux. Pas de création de « déchets » matériels non recherchés.

## Une seule campagne longue commune proposée

Départ : **checkpoint final V86 effectivement validé**, ses habitants/recrue, prison, champs, stocks, énergie, blessures et calendrier existants. Aucun renfort, tissu, bois, nourriture, batterie ni ressource injectés. Le checkpoint d'origine et la transition décrite ci-dessus restent tous deux conservés.

Après les contrôles courts regroupés, un seul compagnon étend le pilote : consultation du site, récoltes et réserves, construction réelle de chauffage, confection/habillage si ce sous-lot est retenu, alimentation nocturne/coupures, maintien d'une pièce habitable et entretien des besoins/captifs présents. Il adapte les surfaces aux personnes et à la durée climatique restante, sans connaître le prochain tirage d'incident. Il peut arrêter les semis trop tardifs, récolter ce qui est réellement admissible et exploiter des sources alimentaires existantes par les commandes ordinaires.

Choisir la durée d'observation **après le profil climatique**, jusqu'au retour d'une période permettant semis/reprise et première récolte utile ; pas un hiver garanti à J7 ni une échéance de raid. Une année Core est une borne naturelle possible, pas la preuve qu'il faut rejouer toute l'année si des phases déjà validées ont été conservées. Le protocole central peut reprendre des checkpoints journaliers et de jalons, sans recommencer des dizaines de jours déjà passés.

Jalons/mesures métier : baisse de lumière et production solaire observées sur le même site, premier arrêt thermique des semis, stocks préparés et consommés pendant la période défavorable, chauffage avec alimentation réelle, santé/exposition des personnes, reprise des semis puis produit cuisiné. **La mort d'une culture n'est pas exigée dans la partie naturelle** : un joueur prudent peut récolter à temps, et certains climats ne passent jamais sous son seuil. Même distinction pour froid extrême, blight, vagues de froid, nouvelle capture et coupure dangereuse.

Frontières courtes regroupées avant ce parcours : 0/6/42/58 °C ; seuil individuel du gel de chaque côté et à égalité ; pièce intérieure froide vs extérieur/rupture du toit ; froid prolongé puis récupération des baies ; culture mûre récoltable malgré croissance nulle ; plante mourant pendant réservation et cargaison indépendante conservée ; obscurité juste avant/après 7,5 jours et reprise lumineuse ; durée de vie connue ; continuation exacte au contrôle ; hiver/été nord et heure locale sans décaler soins/raids ; extinction du chauffage et surcharge électrique. UI native sur quelques checkpoints réellement obtenus, campagne de performance séparée de la campagne de colonie, sans concurrence CPU.

Arrêt matériel : commande/validation/identité erronée, perte de colonie selon les assertions communes, impasse d'approvisionnement démontrée par plusieurs checkpoints. Une croissance lente, un hiver doux ou l'absence d'un événement rare ne constituent pas un blocage du moteur.

## Inconnues et décisions encore ouvertes

1. **Quel climat exact pour le site tempéré de Lisière ?** `LocalSite` ne possède actuellement que biome, relief, absence de rivière et pierres. La référence utilisateur `Reference-Core-4871` est une forêt **boréale à grandes collines**, 39,71° N, moyenne affichée 5,3 °C et culture 30/60 jours ; elle ne peut pas être rebaptisée forêt tempérée moyenne. Une moyenne annuelle et une date de départ tempérée restent à choisir depuis un vrai site vérifié, ou à proposer explicitement comme paramètres de profil. C'est la décision principale avant de coder un défaut, pas une constante à deviner.
2. **Date initiale et menu des saisons** : année 5500 et arrivée 06 h sont vérifiées ; la sélection automatique complète du jour initial n'a pas été relue dans cette enquête bornée. La capture du témoin affiche le 12e jour d'avrimai, ce qui est une observation de ce site, pas le défaut universel. Lire ensuite le chemin de création local ; seulement s'il reste ambigu, demander une capture du menu de réglages avancés/date sur un nouveau site tempéré, sans partie longue.
3. **Échantillon visuel ciblé utile** si la protection intérieure au gel ou l'indication de feuilles doit être confirmée à l'écran : même espèce dehors/intérieur refroidi sous son seuil, avant/après un contrôle long puis réchauffement. Les branches locales sont suffisamment établies pour proposer le contrat ; cette observation vérifierait la présentation et les interactions difficiles à reproduire dans l'UI, pas tous les paramètres numériques.
4. **Bruit climatique, calendrier de naissance des anciennes plantes, repousse des arbres et neige** : décisions de portée séparées. Les valeurs du bruit ont été lues, mais sa reproduction statistique et la phase de génération du monde ne sont pas certifiées par cette note. Le peuplement sauvage à long terme et la migration animale demandent un sous-lot écologique ; ne pas transformer les stocks de baies initiaux en ressource renouvelable immortelle par omission non signalée.
5. **Pas de prétendue parité climatique totale** : chauffage/climat/cultures peuvent former une boucle riche tout en laissant météo complète, neige mécanique, maladie végétale, écologie multiespèce, hivers de tous les biomes et contenus Odyssey ouverts. Les préparations des autres sous-lots doivent fournir leurs propres coefficients de chauffage et vêtements avant intégration.

État final de cette enquête : note exploitable, coefficients locaux et exceptions identifiés, plusieurs sources publiques primaires recoupées, **aucune implémentation ni performance ni partie exécutées**.
