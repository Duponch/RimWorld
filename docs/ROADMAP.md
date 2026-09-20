# Plan de développement

**Dernière livraison V84 : filière alimentaire durable.** [Cultures alimentaires](development/food-crops.md), [postes alimentaires](development/food-workstations.md) et [malnutrition](development/malnutrition.md) sont réunis. Le parcours naturel de 24 jours conserve trois colons vivants après trois raids, deux récoltes sur les 80 cases de riz initiales dès J16, 1 434 riz et 264 pommes de terre récoltés, 119 repas au bois. Dernière ration vers J7,04 ; chacun réalise 14 ingestions hors rations entre J17 et J24. Le maïs reste immature, sans récolte. [Preuves et limites V84](history/validation-food-v84.md). Les [87 sauvegardes historiques](research/colony-progression-observed.md) servent de repères datés, pas de moyenne ni de calendrier à reproduire.

État : **20 septembre 2026, V84 validée et livrée**. ROADMAP est l’unique calendrier G0–G5. G0 en consolidation, G1/G2/G3 partiels, G4 engagé par l’accueil, G5 absent ; aucun jalon complet. Les numéros de schéma ne mesurent pas l’avancement du jeu. [Inventaire réel](gameplay/implementation-status.md), [preuves](development/validation.md), [index](README.md).

Boucle précédente : [site local et première récolte V83](development/world-generation.md), trois reliefs, sols fertiles et ressources physiques reliés au départ. Douze jours joués avec abri, défense, riz récolté puis cuisiné ; anciennes cartes préservées. V84 prolonge ce départ par plusieurs récoltes et l’alimentation renouvelée sur le parcours documenté. [Preuves V83](history/validation-site-v83.md).

Boucle médicale précédente : [infection de plaie V81](development/infections.md), progression et immunité consultables, soins physiques renouvelés, besoins et récupération persistés. [Preuves](history/validation-infections-v81.md). Autres maladies que l’infection et la malnutrition, chirurgie et soins vétérinaires restent absents.

Départ précédent : [départ Trois survivants V80](development/scenario-start.md), scénario explicite, vraie dotation, technologies initiales et implantation sur terrain naturel. Camp pédagogique conservé ; premiers jours éprouvés sans retirer les provisions pour forcer une urgence. Catalogue et difficulté restent partiels. [Preuves V80](history/validation-scenario-v80.md). La [filière animale V79](development/hunting.md) relie toujours chasse, dépouille, boucherie et repas. [Preuves V79](history/validation-hunting-v79.md).

Précédente boucle environnementale : [conservation froide V75](development/cold-store.md), recherche et construction d’un climatiseur, stockage physique au gel, coupure et reprise du vieillissement ; exposition corporelle froide réelle. [Preuves](history/validation-cold-store-v75.md). La canicule V74 et ses protections restent livrées. La recherche et le tailleur V73 donnent toujours un projet collectif puis une chemise confectionnée et portée dans le camp. L’étape proche 4 est satisfaite par cette boucle, sans terminer l’arbre technologique ni le catalogue. [Preuves](history/validation-research-v73.md). Accueil, menace et première différenciation des personnes restent livrés dans leurs périmètres annoncés.

## Priorité actuelle

**Mode jour, demandé le 20 septembre 2026.** L’utilisateur a réorienté le lot vers la fidélité du déroulement d’une partie : recherche du rythme, des réglages initiaux, de la carte et des ressources avant les modifications. Les parcours suivent les transitions naturelles au lieu de forcer tous les événements avant J7. Sous-agents indépendants avec intégration centrale ; automatisation nocturne suspendue.

**Cadence révisée après V76 :** une livraison vise une boucle jouable complète avec plusieurs sous-étapes internes, sans relance entre elles. V77/V78 ont établi les prérequis animaux ; V79 regroupe chasse, dépouille, boucherie et emploi alimentaire. Les lots suivants conservent ce regroupement ; une dépendance majeure peut justifier une tranche visible plus petite, avec motif explicite. Recherche, développement et validation suivent la [procédure regroupée](development/testing.md#procédure-courante-de-livraison). Aucun délai d'une heure, gain de vitesse garanti ou suppression de contrôle requis n'est déduit de ce regroupement. Priorités G0–G5 inchangées.

La [revue de progression du 19 septembre](research/progression-review-2026-09-19.md) remplace l’ordre « terminer pensées/traits/relations, puis ouvrir les incidents ». Les interactions physiques, cas limites, migrations et budgets restent exigés. Nous avançons maintenant par changements vécus dans la colonie, en traversant G1–G4 selon leurs dépendances. Les jalons sont des domaines de couverture, pas des portes obligeant à finir tout G3 avant G4.

**Deux premières situations de l’étape 5 livrées : canicule V74 et conservation froide V75.** Chaleur temporaire, tenue/refuge obtenables, puis investissement recherche/acier/composants/combustible pour préserver des repas. Le pilote construit sa réserve, la charge physiquement, constate le gel puis une vraie perte après épuisement du bois. Le froid corporel est inclus car les colons entrent dans cette pièce ; gelures, saisons et environnement complet restent ouverts.

**Départ cohérent V80 :** trois personnes, provisions physiques, deux technologies industrielles connues, placement admissible, végétation et faune calibrées séparément. Le camp pédagogique conserve ses recherches et ses aides explicites. 250×250 reste la taille standard ; autres biomes, scénario Crashlanded complet et difficulté équivalente ne sont pas livrés. [Recherche et limites](research/scenario-start-reference.md). La campagne distingue viabilité des premières journées et équilibrage universel.

**Enquête de référence consolidée :** [base Core 1.6.4871](research/core-reference-baseline.md), [narrateur/difficulté](research/colony-pacing-reference.md), [cartes/ressources](research/map-calibration-reference.md) et [parties observées](research/colony-observation-reference.md). Les fichiers du jeu et sauvegardes restent en lecture seule. Les preuves établissent des corrections nécessaires d'horloge, heure initiale, croissance sauvage, distributions et sélection d'incidents ; elles ne certifient pas encore un équilibrage complet. [Diagnostic de l'ancien parcours](history/reference-audit-2026-09-20.md).

**Profil décidé par l'utilisateur : Atterrissage forcé / Cassandra Classique / Récit d'aventure, Core.** Nouvelle partie et Charger actifs, Options seulement si fonctionnelles ; autres boutons, scénarios et difficultés visibles mais grisés. [Contrat des menus](development/new-game-menus.md). Récit d'aventure est un choix explicite, pas une difficulté présélectionnée dans RimWorld. Menus et profil sont intégrés en V82, validée dans son périmètre ; ils annoncent leurs limites de catalogue, de site et de narrateur.

**Boucle V82 livrée : créer et reprendre une partie sous ce profil explicite.** Accueil, choix requis, configuration locale 250² et chargement à froid ; profil persisté distinct de Trois survivants, retour/récupération et refus transactionnel. Horloge commune six ticks/s (journée 16 min 40 s), nouvelle arrivée à 06 h, maturité initiale des baies corrigée, humeur/risque infectieux liés à Récit d’aventure et occasions de raids Cassandra. Les anciennes parties gardent carte, stocks, provenance, heure et calendriers. [Preuves](history/validation-new-game-v82.md).

**Boucle V83 livrée :** configuration de site reliée aux trois reliefs, sols et fertilités, géologie/minerais à budget commun, fragments physiques, végétation et arrivée conservatrice. La première récolte est suivie jusqu'à son emploi culinaire, sans accélérer les règles. [Contrat](development/world-generation.md), [diagnostic des sols et du pilote](research/site-soils-reference.md). Ce lot termine le recentrage immédiat sur le départ ; il ne doit pas ouvrir une succession de lots consacrés aux menus.

**Limites de charge V83 :** audit mixte de cent colons et cent lièvres initiaux, CPU p95 84,48 ms ; rendu p95 29,2 ms, maximum 62,5 ms ; débit 22,08 ticks/s pour 36 demandés. Recherche animale et tirs restent à profiler. Les premiers repas renouvelables sont obtenus à J7 sur le site joué, mais une seule ration reste à J12 : ce diagnostic a conduit au lot alimentaire V84 désormais validé. [Preuves et conditions](history/validation-site-v83.md).

**Instruction utilisateur du 20 septembre : progresser ensuite par gros ensembles de gameplay élémentaire.** Les recherches de plusieurs sous-domaines indépendants se font en parallèle ; une intégration centrale réunit leurs conséquences jouables et leurs preuves. Les contrôles de contrat sont groupés avant les parcours longs, puis la campagne complète suit les risques touchés. Un commit ne correspond pas à un écran ou une petite brique interne. Core seul, sans mods ni extensions, constitue le périmètre actuel.

**Critère d’arrêt V84 atteint :** chaîne obtenue par commandes ordinaires depuis la dotation conservée jusqu’aux récoltes et repas renouvelés ; malnutrition et récupération éprouvées séparément en situations cliniques contrôlées. Conservation, migrations et reprise exacte vérifiées ; 91 contrôles dans 22 fichiers, cinq contrôles textiles rejoués, UI fonctionnelle puis reprise native du camp J24 sur 126 ticks. Le parcours naturel de 24 jours passe en 439,059 s ; aucune famine naturelle n’y est revendiquée. Les rations d’urgence peuvent rester stockées : l’indépendance est constatée par les consommations, sans les retirer. Aucune accélération pour imposer maïs ou incident avant une date. Salissures/nettoyage/intoxications constituent une chaîne supplémentaire différée explicitement ; leur absence ne donne aucun bonus fictif de propreté. Monde, autres espèces, prisonniers et commerce restent distincts.

| Dernier lot livré et ensembles suivants | Manques constatés et résultat jouable attendu | Limite et dépendances à vérifier avant code |
|---|---|---|
| V84 — Filière alimentaire livrée | Pommes de terre et maïs ; cuisinière à bois, cuisinière électrique et table de boucherie ; ingrédients, carburant/courant, chaleur, stockage et consommation physiques ; malnutrition humaine/animale et récupération par alimentation. Le pilote obtient deux cycles de riz et des pommes de terre cuisinées sur 24 jours ; maïs présent mais non mûr. | Conservation, migrations strictes, continuation, vraie UI et charge validées dans les [conditions publiées](history/validation-food-v84.md). Hygiène, intoxication, recettes avancées et élevage différés ; aucune autonomie universelle ni fidélité exhaustive. |
| 1 — Rendre l'habitat et l'énergie évolutifs | Réseau électrique local encore adapté, aucun conduit/batterie/interrupteur ; dégâts limités aux barrières. Relier réseau construit, stockage de l'énergie, coupures et entretien aux ateliers et réserves réels. | Coûts, pannes, pertes et réparations recherchés ensemble. Ajouter incendie/extinction seulement comme boucle complète explicitement cadrée ; ne pas confondre un effet visuel avec un danger joué. |
| 2 — Faire évoluer la colonie et ses conséquences | Cassandra ne sélectionne que des raids, population du nouveau profil figée ; commerce, prisonniers et corps humains absents. Réunir une famille d'événements non hostiles et l'entrée physique de nouvelles personnes, puis une première conséquence complète des rencontres (échange ou prise en charge/capture selon dépendances). | Conditions et chronologie du narrateur fondées sur les classes/Defs et observations. Argent utile et échanges conservatifs si commerce retenu ; statut, besoins et soins si capture retenue. Ni globe décoratif ni moteur de quêtes général comme préalable. |
| 3 — Traverser des saisons réelles | Température quotidienne fixe, aucune saison ni mortalité végétale. Relier climat du site, culture interrompue/reprise, chauffage, vêtements et réserves à un cycle saisonnier observé. | Recherches de calendrier/latitude/croissance communes ; conserver les climats historiques. Monde complet et biomes multiples différés, horizon dicté par la saison et non J7. |

Cet ordre remplace la liste proche V66–V75 désormais historique. Il se réévalue après chaque ensemble sur les blocages réellement observés. Les critères concrets du prochain lot sont fixés après recherche ; plusieurs sous-étapes sont livrées ensemble, sans obligation de réaliser tous les domaines cités dans un unique commit démesuré. Arsenal/dotation manquants, autres compétences et recherche doivent rejoindre la filière qui leur donne un usage, sans détour permanent vers le seul départ. Les grandes lacunes de [l'inventaire](gameplay/implementation-status.md) restent visibles.

Avant chaque lot, écrire : décision nouvelle du joueur, invariant indispensable, comportements nécessaires à la boucle, extensions différées et critère d’arrêt. Toute dépendance dépassant ce périmètre déclenche une revue ; ne pas terminer par inertie le domaine voisin. Les corrections de stabilité importantes peuvent interrompre cette priorité, avec leur motif explicite.

**Acceptation d’une livraison visible :** chemin accessible dans une partie ordinaire, conséquence expliquée, manipulation physique, sauvegarde/reprise pendant les transitions et scénario de colonie adapté. Les branches rares ont aussi des fixtures contrôlées. Le pilote adapte sa politique à l’accueil d’une quatrième personne et à l’assaut du camp : mobilisation, défense, démobilisation et reprise sur cinq jours. Le parcours observé V68 ne blesse aucun colon ; les scénarios de rencontre restent nécessaires pour prouver secours/soins après des impacts réels.

## Contrats de progression

La grille plane 3D low poly, les interactions physiques, l’UI de référence et le [corpus](research/reference-adoption.md) restent la cible. Les [adaptations](gameplay/decisions.md) sont explicites. Carte 250², simulation déterministe, travail ordonné, sauvegardes migrées strictement et rendu GPU sont des frontières maintenues, pas des raisons de retarder indéfiniment le gameplay.

Tests regroupés par contrats : conservation, continuation, espace, véritable partie UI/worker et charge. Enrichir le pilote de colonie aux nouvelles boucles ; profiler régulièrement 3/30/100 colons avec activités mixtes et scènes chargées, sans prétendre couvrir toutes les combinaisons. Garder les pointes et échecs observés dans les preuves, même si une reprise passe.

## G0 — Socle et continuité

Contrats livrés : définitions immuables ciblées, propriété unique, pile au sol par cellule, réservations quantitatives, livraison avant construction, reprise exacte, commandes ordonnées et refus atomiques. Navigation CPU à huit voisins, progression euclidienne ; le laboratoire GPU est indépendant.

À compléter :

- Zones nommées et politiques partagées ; filtres enrichis au rythme du contenu.
- V17 : sélection multiple et file de travaux exécutables avec motifs de refus livrées. V18 complète transport et approvisionnement avec réservations quantitatives. V19 ajoute dégagement des chantiers et combustible forcés. V20 ajoute dégagement des piles sur semis et cuisine forcée. V23 complète le maintien sur la cellule pour les familles présentes. Restent autres familles sélectionnables et fournisseurs liés aux contenus absents ; [contrat](development/player-orders.md).
- Construction V16 : plan/cadre/ouvrage, dégagement des piles/plantes et approvisionnement par bâtisseur livrés. V21 ajoute coexistence par définition et plans dans les réserves. V22 ajoute franchissement/coûts/arrêt du mobilier présent. Restent autres profils et déplacement des personnes gênantes ; voir [contrat](development/construction.md).
- Étendre les profils de franchissement et cases de travail à mesure que les activités arrivent ; passage civil et distinction avec les réservations de lits/repas/postes livrés en V14. La présence d’un colon ne ferme plus un couloir. Collisions hostiles debout V58 ; autres profils à compléter avec G3 ; lisibilité 3D des superpositions encore partielle.
- Manifeste de contenu/générateur, journal complet des commandes datées, export/import et garanties d’évolution.

**Acceptation G0 :** trois colons développent un camp par des commandes explicables ; matériaux conservés à chaque transition, engagements sans duplication, continuation exacte pendant les transports, contrôle de charge reproductible. Les premiers scénarios passent ; les manques ci-dessus empêchent de déclarer le jalon clos.

## G1 — Survie quotidienne

Agriculture et croissance, récolte renouvelable, cuisine avec recettes et files de fabrication, conservation des aliments, couchages réservés et trajets vers les lits, horaires et vrais besoins. Les relations de temps et de ressources doivent créer des arbitrages lisibles. Introduire traits et compétences seulement avec leurs effets mesurables.

Le corpus précise cette tranche : croissance intégrée sur le temps favorable, factures avec critères d'ingrédients et de comptage, repas réellement accessibles/transportés/ingérés, besoins séparés des jobs qui les satisfont. Ajouter l'explication des statistiques sur les premières valeurs effectivement utilisées. L'expiration des trois aliments périssables est livrée ici ; les effets des pièces, du refroidissement et de l'électricité relèvent de G2.

**Acceptation :** colonie autonome plusieurs jours avec alimentation produite et consommée ; effets vérifiables de compétence, distance, stock insuffisant et interruption. Le tutoriel doit expliquer les raisons d'un échec de survie.

## G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, températures intérieur/extérieur, saisons, météo persistante, électricité et incendies. Développer les types de sols, les cinq roches naturelles de base et les minerais, les espèces et biomes locaux avec leurs propriétés ; différencier sol découvert, bloc rocheux, chunk et matériau taillé. Le cycle visuel déjà livré ne vaut pas simulation de ces systèmes. La topologie des enceintes est livrée pour l’inspection, avec vérification des obstacles et recalcul global mesuré, séparée de la navigation. Les premiers consommateurs de production et de température sont livrés ; autres consommateurs, climat complet et invalidation locale de la topologie générale restent à développer. Prévoir coupe visuelle des toits/murs dès l'introduction de pièces.

Adapter la scène E du corpus : porte détruite/reconstruite, pièce fusionnée, alimentation coupée et feu déclenché. Les causes de panne et les changements de topologie doivent être partagés avec les travaux et la navigation. Les dégâts de toiture aux personnes sont ajoutés en V45 ; autres producteurs restent à développer avec G3 ; une injection de feu de test n'exige pas déjà le narrateur G4. Les environnements complexes des extensions restent ultérieurs.

**Acceptation :** une pièce fermée change effectivement température et confort ; une porte ou brèche invalide la bonne région ; feu, énergie et stocks interagissent sans simulation liée aux FPS.

## G3 — Personnages et conflits

Santé anatomique, capacités dérivées, soins, blessures et douleur ; combat avec ordres directs, visibilité, couverture et projectiles ; moral avec pensées, relations et crises. Animaux avec alimentation, comportement et reproduction pourront utiliser le même socle d'acteur avec des besoins distincts.

Dépendances internes : corps/capacités → soins ; équipement/ligne/impact → combat ; situations vécues → pensées et relations. Ces dépendances ne prescrivent pas de terminer tout G3 avant les incidents de G4 ; suivre la priorité actuelle ci-dessus. Le résolveur sépare intention, préparation, émission, projectile, impact et santé. Les scènes B/C du corpus sont des réserves de cas ; les coefficients et règles de cible mobile issus du miroir de code demandent vérification avant adoption. L'animation et les collisions de meshes n'ont aucune autorité sur les dégâts.

**Acceptation :** une blessure affecte réellement déplacement/travail/combat ; un soin et un équipement changent le résultat ; comportements et règles de ciblage restent reproductibles aux frontières d'obstacle et de portée.

## G4 — Histoires et progression

Incidents, rythme de tension, menace liée au contexte de colonie, factions, visiteurs, commerce, recherche et événements sociaux. Garder conditions, poids et causes observables pour équilibrer le storyteller. La difficulté doit être une décision de conception documentée, sans prétendre recopier des coefficients non vérifiés.

Séparer événement de domaine et notification, état de quête et texte, panier commercial et transfert confirmé. Enregistrer échéances, identité des participants, choix de récompenses et RNG nécessaires. La richesse et les budgets d'incidents lisent les objets existants ; une récompense déjà remise ne peut être rejouée au chargement. L'artisanat général et les déblocages prolongent les recettes de survie de G1.

**Acceptation :** des parties seedées produisent des chaînes de conséquences variées mais expliquées, sans événements impossibles, seuils absurdes ou blocage de progression.

## G5 — Monde et consolidation

Carte du monde, voyages et caravanes, échanges entre cartes, objectifs longs, migrations de sauvegarde, accessibilité, optimisation à centaines d'acteurs, configuration graphique et intégration des assets définitifs. Comparer à la matrice des domaines du jeu de base avant d'étendre le périmètre aux DLC.

La scène D du corpus guide les transferts : une personne ou pile garde son identité et un propriétaire unique entre carte, caravane et rencontre. Les sites mondiaux peuvent être abstraits ; aucune simulation intégrale des colonies étrangères n'est présumée. Le monde devient jouable à ce jalon, mais le contrat de génération locale doit déjà pouvoir recevoir un contexte de site versionné sans exiger sa réalisation immédiate.

**Acceptation :** partie longue, reprise après versions, tests multi-cartes, budgets de performance sur appareils choisis, documentation de toutes les mécaniques livrées.

## Chantiers transversaux

Audit V75 : 100 acteurs/20 chambres froides et activités mixtes, CPU tick p95 30,31 ms, image p95 33,2 ms ; des pics et un débit inférieur à 6× subsistent. Pièces/services et adoption des snapshots restent à profiler aux prochains lots. Charges différentes de V74, aucun gain/régression attribué sans comparaison contrôlée. [Mesures](history/validation-cold-store-v75.md).

Audit V74 : les ancres de croissance thermique n’invalident plus les lots forestiers sans changement visible. À 100 acteurs sous canicule, image p95 41,6→33,3 ms ; pics jusqu’à 66,6 ms sur le cas 30 acteurs. Poursuivre snapshots/scène/végétation, sans garantie 6×. [Mesures et limites](history/validation-heatwave-v74.md).

Audit V84 : charge alimentaire mixte à 3/30/100 colons et autant de lièvres, CPU puis natif successifs. À cent : CPU p95 44,13 ms ; image p95 20,7 ms, maximum 50 ms ; débit 30,78 ticks/s pour 36 demandés. Le débit à 6× n’est pas tenu. Vue distante active à cent, postes et intrants contrôlés ; aucune comparaison de gain avec V83 ni preuve d’autonomie depuis ce banc. [Conditions et preuves](history/validation-food-v84.md).

Audit V82 : journée corrigée à six ticks/s ; à cent personnes avec soins et ateliers mixtes, CPU p95 18,31 ms, image p95 20,8 ms/max50,0, lots worker p95 25,33 ms/max62,4. Les17patients sont soignés, buffers stables et aucun nouveau pipeline ; débit observé proche35,2ticks/s pour cible36. Mesure unique sans animaux, aucune garantie générale6× ni suppression des pics. [Preuves](history/validation-new-game-v82.md).

Audit V81 : soins infectieux et ateliers mixtes à 3/30/100 personnes, CPU puis natif successifs. À cent : CPU p95 16,56 ms ; image p95 16,60 ms, pic 29,30 ms ; moyenne de tick des lots worker p95 18,67 ms, pic 51,30 ms. Les 17 patients reçoivent un soin et les autres ateliers progressent ; aucun nouveau pipeline. Charge distincte de V79 avec cent animaux/chasse : aucun gain général ni débit 6× permanent déduit. [Protocole et données](history/validation-infections-v81.md).

Audit V66 : cinq compilations GPU à l’arrivée supprimées en conservant les lots de personnages. Croissance 3→4/30→31/100→101 vérifiée ; les pointes à cent acteurs restent ouvertes (CPU p95 40,28 ms, image p95 20,80 / max 125 ms). Maintenir l’audit de captures/scène/rendu avec les futures menaces ; aucun budget 6× global validé. Les exports de diagnostic du banc sont désormais hors mesure. [Preuves](history/validation-arrivals-v66.md).

Audit V48 : à cent acteurs en clinique, les pointes d’image restent observables pour alimentation et traitements déjà présents. Suivre séparément coût des transferts/scène/HUD et rendu lors du prochain audit mixte ; zéro compilation GPU ne suffit pas à prouver l’absence de saccades. [Mesures et limites V48](history/validation-feeding-v48.md).

Audit V51 : coût DOM de caméra au repos supprimé après profilage. Les courtes charges natives conservent néanmoins des pointes jusqu'à 87,1 ms ; poursuivre réception des snapshots, matrices/parcours de scène et DOM sur une charge mixte plus longue avec le prochain lot de personnages. Le gain ciblé n'est pas une validation globale de fluidité. [Données V51](history/validation-medicines-v51.md).

- **Assets et 3D** : décor/bâtiments/objets en code, placeholders remplacés progressivement, personnages squelettiques GPU et apparence commune carte/portraits. Blender seulement lors des sessions demandées. Les [échelles](research/spatial-design.md) et empreintes doivent rester cohérentes.
- **Performance** : audits courts aux changements de boucle/rendu, percentiles et machine consignés. Distinguer simulation, snapshots, rendu et GPU ; aucune garantie depuis une capacité de buffer. V22 : poursuivre le coût de planification à cent acteurs et surveiller l’erreur ponctuelle d’allocation au chargement WebGPU 250², non reproduite dans les deux contrôles suivants. Les [ressources graphiques conservées](development/render-lifecycle.md) restent le contrat pour l’abattage.
- **Navigation GPU** : [laboratoire](research/gpu-navigation.md), comparaison CPU et régions, rendu concurrent, révisions et adoption déterministe au tick. Pas de lecture GPU bloquante par colon.
- **Fidélité** : nouvelle recherche par mécanique et relectures rétroactives ; conserver chapitre/ID, provenance et décision. Plusieurs sols, roches, plantes et biomes restent prévus en G2 ; le ciel ne clôture pas météo/climat.
- **Tests et docs** : peu de scénarios profonds, pilote de colonie entretenu ; contrôles regroupés suivant [testing](development/testing.md). Mettre à jour contrats, guide, inventaire et preuves sans recopier les mêmes règles dans tout le dossier.

## Questions de conception ouvertes, sans bloquer le socle

Objectif d'une partie, tonalité fictionnelle, contraintes de verticalité, taille maximale de colonie/carte, profondeur des interactions sociales et matériel cible restent à préciser en jouant les prochains jalons. Aucun ajout d'étages, multijoueur, moteur physique global ou cloud obligatoire n'est présumé.

## Estimation d'avancement

Revue du 20 septembre 2026 ; estimations conservées après la livraison V84. Elles portent sur des fonctions, jamais sur un pourcentage de temps restant.

**Environ 25 %, avec une fourchette de 20–30 %, vers une reproduction substantielle de RimWorld de base en 3D.** Estimation du co-lead, pas un comptage de fichiers, commits, tests réussis ou objets définis. Elle inclut contenu, intégration, équilibrage et finition ; les extensions sont exclues. La survie du petit camp est sensiblement plus avancée que la couverture de l'ensemble du jeu. G0–G4 restent partiels, G5 absent : aucun jalon global clos.

La revue remplace les anciens chiffres figés du 18 septembre : ils sous-décrivaient déjà le combat, les personnes et, après V76/V77, la faune. Le passage de l'estimation centrale 20 à 25 % reflète cette relecture et les boucles effectivement intégrées depuis ; **V78 seule n'a pas réalisé cinq points du jeu**. Les domaines ont des poids différents, des dépendances communes et des coûts de catalogue très inégaux : ne pas calculer la moyenne des lignes. V79 renforce la filière alimentaire, V80 relie les systèmes dans un départ explicite, V81 ajoute une première maladie après blessure, V82 une création/reprise et un profil de départ corrigé mais partiel ; l'estimation globale reste **25 % (20–30)**, sans progression artificielle par numéro de version. Les fourchettes ci-dessous donnent l'incertitude de jugement, pas une mesure statistique. V83 relie le site au départ, V84 éprouve une alimentation renouvelée et la malnutrition ; ces tranches ciblées ne justifient pas une hausse chiffrée automatique.

| Système / boucle de gameplay | Estimation centrale (fourchette) | Déjà réellement utilisable | Principaux éléments à compléter |
|---|---:|---|---|
| Simulation, horloge, commandes et sauvegardes | 75 % (65–80) | Worker déterministe, vitesses, migrations strictes, reprise pendant les actions | Montée en charge, multi-cartes, journal complet et outils finaux de récupération |
| Navigation, déplacements et occupation | 70 % (60–80) | Huit voisins, distances cohérentes, obstacles/réservations, interpolation GPU | Tous profils futurs, arbitrages de foule, diagnostic joueur ; GPU de navigation encore laboratoire |
| Contrôle du joueur, sélection et ordres | 65 % (55–75) | Caméras iso/perspective, sélection multiple, ordres directs/files, architecte | Ergonomie, raccourcis/accessibilité et commandes des domaines absents |
| Travail, horaires et priorités | 65 % (55–75) | Affectations, besoins concurrents, réservations et interruptions conservatrices | Métiers/contenus manquants, restrictions, raisons de blocage plus complètes |
| Transport et stockage | 55 % (45–65) | Piles physiques, filtres, portage, paquets et inachevés | Étagères, zones nommées/politiques riches, masse, dépouilles humaines, inventaire personnel |
| Construction et entretien | 50 % (40–60) | Matériaux, plan/cadre, dégagement, déconstruction, réinstallation, premières réparations | Sols, catalogue étendu, qualité/échecs et dégâts/réparations généralisés |
| Minage, pierre et matériaux | 45 % (35–55) | Cinq roches, acier/composants, fragments/blocs, ouvertures locales | Autres minerais, compétence de minage, lissage, toits naturels |
| Habitat, pièces et mobilier | 45 % (35–55) | Pièces, portes, toits, lits/table/tabouret et usage physique | Chambres/classes de pièces, beauté/confort complets, lits spécialisés et catalogue |
| Faim, repos, horaires de vie et loisirs | 65 % (55–75) | Manger et dormir physiquement, régimes, horaires, deux loisirs avec lassitude | Variété, attentes contextuelles, davantage de lieux/activités et situations sociales |
| Agriculture et végétation utile | 35 % (25–45) | Riz, pommes de terre, maïs, coton, croissance et récoltes renouvelées | Nombreuses espèces, saisons, mortalité/dangers végétaux, arbres et biomes différenciés |
| Cuisine et alimentation | 50 % (40–60) | Ingrédients physiques, chasse/boucherie/viande, deux cuisinières, Cuisine/XP, factures, combustible/courant, repas renouvelés sur 24 jours | Autres aliments/recettes, intoxications, qualité/propreté et filières complètes |
| Conservation et chaîne du froid | 55 % (45–65) | Âges conservés, pourriture, température locale, réserve froide obtenable | Autres produits, détérioration extérieure, équipements et politiques associés |
| Artisanat et production | 25 % (15–35) | Blocs, coton → vêtement, inachevé/auteur/reprise, qualité | Grande majorité des ateliers, recettes, armes, composants et filières avancées |
| Recherche et progression technologique | 15 % (10–25) | Poste physique, projet collectif, Intellect, deux déblocages utiles | Arbre Core, prérequis/catalogues, niveaux de postes et progression longue |
| Compétences, traits et identité | 35 % (25–45) | Huit compétences actives, six traits avec effets, profils d'arrivants | Autres compétences/traits, biographies/incapacités, variété des profils |
| Anatomie, santé, secours et soins | 50 % (40–60) | Lésions/capacités, saignement, secours, soins/médicaments, chaleur/froid, infection localisée/immunité, malnutrition et soins prolongés | Autres maladies, chirurgie, implants, soins animaux, hôpital/propreté complets et devenir des corps humains |
| Vêtements, équipement et inventaires | 25 % (15–35) | Revolver, vêtements physiques, couches/armure/usure aux impacts, apparence partagée | Inventaire personnel, politiques automatiques, usure quotidienne, grand catalogue |
| Combat direct et défense | 40 % (30–50) | Mobilisation, tir/LOS/couvert, mêlée, protection, approches, brèches, riposte animale | Armes/stratégies, groupes plus complets, explosifs, tourelles, capture et corps |
| Humeur, pensées et crises | 25 % (15–35) | Humeur progressive explicable, quelques pensées/souvenirs, errance triste | Attentes variables, beaucoup de pensées/crises, conséquences environnementales/sociales |
| Relations et vie sociale | 10 % (5–20) | Bavardages/discussions, opinions dirigées et mémoires | Romance, parenté, conflits, deuil, liens et interactions riches |
| Animaux, chasse et élevage | 25 % (15–35) | Une espèce, besoins/santé/combat, chasse, dépouilles et boucherie | Autres espèces, écologie, soins, élevage/dressage/reproduction/prédation |
| Génération des sites, sols et biomes | 35 % (25–45) | Carte 250², scénario partiel, relief choisi, sols fertiles, pierres/filons et fragments physiques ; végétation/faune partielles | Diversité des biomes, géographie/ressources, saisons locales, cartes spéciales |
| Température, climat, météo et incendies | 25 % (15–35) | Jour/nuit visuel, températures/pièces, canicule, hypothermie/refuges | Saisons, pluie/neige, incendies/extinction, gelures et risques complets |
| Électricité et combustible | 25 % (15–35) | Générateur à bois, lampes, climatiseurs et cuisinières, pénuries réelles | Conduits/interrupteurs/batteries, autres producteurs/consommateurs et incidents |
| Arrivées, raids et narrateur | 20 % (10–30) | Accueil pendant la partie, raid limité, blessures/retrait/reprise | Narrateur adaptatif, budgets de richesse, nombreux incidents et stratégies |
| Prisonniers et recrutement contraint | 0 % (0–5) | Accueil volontaire distinct déjà livré | Capture, prison, soins/nourriture, résistance, recrutement, évasion |
| Commerce et diplomatie | 0 % (0–5) | Appartenance coloniale/hostile minimale pour le combat | Marchands, échanges, argent/valeur, réputation, accords et factions complètes |
| Carte du monde et caravanes | 0 % (0–5) | Carte locale seulement | Planète, voyage, ravitaillement, plusieurs cartes, rencontres et retours |
| Quêtes, objectifs longs et fin de partie | 0 % (0–5) | Aucune boucle correspondante | Quêtes/récompenses, objectifs, conditions de victoire et progression longue |
| Catalogue complet du jeu de base | 10 % (5–15) | Contenus ciblés du [catalogue local](gameplay/content-catalogue.md) obtenables | Centaines d'objets/variantes/recettes et leurs interactions ; pas de dénominateur exhaustif vérifié |
| Rendu 3D, interface et finition visuelle | 40 % (30–50) | Instancing/rig GPU, scène procédurale, UI structurée, équipement/portraits partagés, FPS | Assets définitifs, diversité/effets, ergonomie/polish, lisibilité et UI des systèmes absents |
| Audio et ambiance sonore | 0 % (0–5) | Le calcul logique des bruits réveille des acteurs, sans système audio livré | Sons, musique, mixage et retours sonores |

Les tests profonds, migrations et audits mesurés constituent une pratique déjà active ; ils ne donnent pas un pourcentage de fiabilité. Les pics d'image et limites à cent acteurs restent consignés dans les preuves. Un moteur bien éprouvé sur le contenu présent n'est pas une validation de tous les contenus futurs.

**Calendrier :** pas de conversion linéaire de 25 % en temps restant. La vitesse des premières fondations ne prédit pas celle des catalogues et de leurs interactions. Les anciennes projections (4–8 semaines pour une alpha, 4–8 mois pour une cible Core substantielle) restent des hypothèses historiques non recalibrées, pas des échéances réengagées. Réestimer après la filière alimentaire animale et plusieurs boucles nouvelles réellement jouées ; ne pas utiliser le nombre de versions comme mesure.
