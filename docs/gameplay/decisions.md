# Choix et écarts de gameplay

V76 : première espèce animale adulte, population de départ fixe et errance locale bornée ; besoin nutritionnel calibré sur le wiki arrondi malgré un ancien XML divergent. Choix alimentaire par accès pondéré, sommeil animal distinct des restrictions humaines, déplacements euclidiens et corps graphique interprété en 3D. Santé, fuite, chasse et dépouilles restent la tranche prioritaire suivante ; la faune n'est pas déclarée complète. [Sources et périmètre](../research/wildlife-reference.md).

V75 : base électrique connue du scénario mais Climatisation à rechercher ; contrôle thermique continu dans les ticks locaux ; destruction refusée si la restitution complète ne peut être déposée ; hypothermie active mais gelures localisées différées. Ce sont des adaptations/limites explicites, pas une parité générale. [Sources et motifs](../research/cold-store-reference.md).

V74 : première canicule plutôt qu’un hiver privé de règles de gel. +17 °C et exposition confrontés aux sources ; première occurrence 6–7 jours et suivantes 30–40 jours après fin sont une cadence de scénario. Refuge par distance/accessibilité et ordres prioritaires ; sélection thermique complète des lits, froid et autres météos différés. [Sources, incertitudes et décisions](../research/heatwave-reference.md).

V73 : un seul projet de recherche, Vêtements complexes. Notre camp personnalisé commence sans ce savoir, contrairement au Crashlanded classique ; difficulté/écart technologique neutres, Intellect historique absent =0, propreté intérieure neutre, malus extérieur provisoire. La tenue tribale reste initiale. [Détails et sources contradictoires](../research/research-reference.md).

V72 : tenue tribale sans recherche, tissu seul, capacité de portage locale dix, profil Artisanat absent neutre 0, reprise liée par auteur, réglage de comptage équipé différé. Seuil thermique 9 °C du code daté adopté malgré le 10 °C écrit au wiki ; pénalité seulement branchée au nouveau poste. Géométrie de tenue interprétée en 3D sur le rig GPU. [Règles et écarts](../development/tailoring.md), [sources](../research/tailoring-reference.md).

V70 : deux échanges positifs Core, aucun effet d’humeur artificiel ; distribution sociale volontairement incomplète sans insultes/bagarres/romance. Compatibilité fixe par paire avec contribution d’âge neutre, compétence Social absente = débutant sans passé, PRNG indépendant. Présentation par inspection/journal, sans bulle 3D. Confiance numérique limitée par les définitions anciennes confrontées ; [sources et choix](../research/social-reference.md).

V69 : six traits Core à consommateurs existants, profils composés explicitement pour les nouvelles personnes ; pas de distribution aléatoire prétendue conforme. Seuils proportionnels, humeur progressive et gains ordinaires distincts ; ancienne personne/offre neutre à la migration. Les interactions sociales sont le prochain lot, pas implicitement livrées. [Recherche](../research/traits-reference.md).

V68 : calendrier 3,5–4 puis 6–8 jours, effectif 1 puis 2, profils limités ; première adaptation de pression, pas le narrateur Core. Accès libre privilégié, brèche choisie par graphe stratégique puis coups réels ; départ si tous les colons sont incapables au lieu de vol/enlèvement. Pas de disparition des victimes ni de téléportation de retrait. [Sources et limites](../research/raid-reference.md).

V67 : foyer peint manuellement (extension automatique différée), réparation cardinale conforme à nos places de travail 3D, XP regroupée au tick local pour éviter un biais d'arrondi. Ouvrages historiques non typés : résistance bois explicite. Pas de ressources rendues par un mur/une porte détruit ; ne pas généraliser une restitution de 25 % à tout bâtiment. [Sources, incertitudes et limites](../research/barriers-reference.md).

V66 : choix d’accueil avec délai d’un jour et refus distinct de l’expiration. Fréquence, plafond du producteur et profils personnels explicitement provisoires ; arrivée physique sans fonds ni lit offert. Migration neutre et activation volontaire des anciens camps. [Recherche et adaptations](../research/arrival-reference.md), [contrat](../development/arrivals.md).

V65 : première crise seulement, repli des intensités supérieures vers le contenu mineur disponible ; distribution incomplète annoncée. Échéances locales, marche 3D euclidienne, conservation des cargaisons sous saturation et catharsis après incapacité selon la branche de code datée malgré une contradiction du wiki. [Recherche et décisions](../research/mental-break-reference.md).

V62 : connexion acoustique par espaces/portes ouvertes à la place du plafond Core de quinze régions, et interruption directe du repos mobile après violence. Deux adaptations explicites, sans prétention de parité de tout le gestionnaire de jobs. [Motifs, sources et limites](../research/disturbance-reference.md).
V61 — Compatibilité des rencontres : `Pawn.tactics` est créé seulement dans une nouvelle Rencontre armée. Les anciennes sauvegardes gardent le comportement fixe ; aucune nouvelle menace inventée au chargement. Approche de cibles visibles, postes et délais locaux sont explicités dans le [contrat](../development/pursuit.md) et la [recherche](../research/pursuit-reference.md). Ce mandat individuel ne remplace pas le futur contrôle de raid.

V60 : [tir automatique et réaction civile](../research/automatic-combat-reference.md). Décision au tick local plutôt qu’à chaque quatrième tick Core, cône sur neuf rayons de grille, tri stable avant tirage ; cooldowns et conservation physiques inchangés. Réveil défensif et réception d’un nouvel ordre civil pendant récupération restent incomplets. Rayon civil exact 0,66 adopté après contradiction avec le résumé approximatif du wiki.

V59 : le contact diagonal permet un flanc dégagé, distinct du déplacement 3D. Arrêt de stun à fraction conservée sur l’arête ; poses GPU artistiques. Durée 45 ticks Core provisoire face aux sources contradictoires, et milli-PV comme les autres lésions. Terrain offensif, surprise, armure et catalogue complet restent absents. [Décisions et références](../research/melee-reference.md).

V57 — [pouvoir d’arrêt](../development/stagger.md) : adopter durée, seuil adulte, renouvellement et paiement minimal Core ; adapter l’intégration au trajet 3D continu. La base anatomique/lumineuse reste capturée au départ, le ralentissement s’applique immédiatement au sous-pas d’impact. La fin de l’arête après incapacité reste notre choix V45 ; aucun ennemi ni réaction civile implicite. [Recherche](../research/stagger-reference.md).

V56 : [premier tir](../development/shooting.md). Cadence fractionnaire Core conservée, arête physique terminée avant visée, ordre simultané stable par ID et commande de groupe atomique. Ciblage uniquement des personnages actuels, tous alliés ; aucun ennemi fictif. Pouvoir d’arrêt ajouté V57 ; réactions, jauges et audio restent différés. Le HUD/médical garde la résolution du tick local, le projectile son interpolation continue.

V55 : [enveloppes de vol](../development/projectiles.md) ordonnées par sous-pas Core puis identifiant ; santé datée au tick local, contact Core conservé séparément. Relations capturées au départ en attendant les factions ; contact avec objet explicitement non résolu, sans destruction fictive. Les résultats terminés restent un tick pour la présentation/reprise. Ces adaptations ne valent pas commande de combat livrée. [Relecture de persistance](../research/projectiles-reference.md#relecture-pour-la-persistance-v55).

Sous V54, [émission et vol isolés](../development/projectiles.md) : masques locaux à trois bits, PRNG et mélange stables propres au projet, rejet borné des directions invalides. La scène du World ordonne les candidats par catégorie/identifiant plutôt que l'ordre d'apparition non sauvegardé ; ses couches de recouvrement restent logiques, pas des mètres 3D. Aucun résultat Core identique à graine égale promis. La cible utilisée peut être touchée après déplacement selon le chemin de référence ; ne pas la remplacer par une collision physique de mesh 3D. Les protections des tirs amis diffèrent selon les branches et ne deviennent pas une immunité universelle. Dépouilles non créées, remplissage nul des paquets conservé et base adulte/couches à recontrôler avant extension du contenu. [Sources et limites](../research/projectiles-reference.md).

Sous V54, [capture tactique du décor](../development/combat-world.md) : les égalités de remplissage utilisent l'identifiant persistant plutôt qu'un ordre d'apparition non sauvegardé. Les petits cailloux décoratifs restent sans couvert, distincts des fragments transportables à 50 % ; conversion future à traiter explicitement. Le remplissage tactique ne se déduit pas de la hauteur d'un mesh. Ces propriétés sont utilisées par le tir V56.

V53 : [mobilisation](../development/drafting.md) adaptée à la 3D par conservation des arêtes engagées, conservation de cargaison indéposable et sortie physique du mobilier. Repli par proximité sans couvert, pas de formation par glisser ; commandes civiles demandent démobilisation. Ces limites ne constituent pas la cible finale de fidélité. [Sources/version/incertitudes](../research/drafting-reference.md).

V52 : [adaptations de l’équipement](../research/equipment-reference.md). Conserver l’arme désactivée sur sol saturé ; récupération mémorisée après besoins/ordres avec ignorance de sa propre interdiction ; arme visible à la hanche hors combat. File d’équipement différée explicitement. Le buste CSS n’affiche pas une arme hors cadre, mais partage son état/libellé. Ces choix ne valent pas inventaire ou combat livrés.

V51 : adopter doses/plafonds/puissance et soins groupés après [recherche](../research/medicines-reference.md). Adapter trajet/chevet à la 3D et conserver la cargaison commune. Différer explicitement collecte opportuniste sur piles voisines, acquisition complète et inventaire personnel ; aucune création distante de produit. Trente médicaments industriels seulement sur les nouvelles cartes, sans présenter le départ entier comme Crashlanded.

V50 : corriger la cible de préemption universelle après [recherche](../research/urgent-care-reference.md). Adopter la branche urgente aux points de décision et la revue au lit ; conserver les tâches engagées hors leurs contrats d’interruption. La cadence Core 211 devient 21/22 ticks locaux alternés ; sortie du meuble toujours physique.

V49 : [auto-soins ordinaires](../development/self-tending.md), qualité de base ×0,7 et lit facultatif. Adaptation 3D assumée : sortie physique vers une cellule cardinale d’arrêt avant le geste si le colon occupait un meuble. Préemption urgente explicitement différée, pas simulée par une guérison instantanée.

V48 — [alimentation assistée](../development/feeding.md) : adopter régime du patient et prélèvement/transport/ingestion ; contact cardinal et geste générique adaptés à la 3D. Seuil de 26 % retenu selon le miroir identifié malgré 27 % suggéré par le wiki. Durée locale ×1,5, aucune XP médicale ; capacité générale de portage et inventaire personnel restent ouverts. [Sources](../research/feeding-reference.md).

**Traitements V47** : adopter la chaîne physique sans médicament, Patient/Repos au lit et Médecine ; adapter la place de travail à un chevet cardinal en 3D et la progression aux ticks locaux. Cette politique initiale est prolongée par les cinq plafonds V51. [Contrat et absences assumées](../development/tending.md), [preuves de référence](../research/tending-reference.md).

V46 : prise d’un blessé sur sa cellule et dépôt sur l’ancre du lit, adaptés à nos services 3D ; trajectoire commune sans transfert instantané à distance. La file de secours et les critères de danger/température restent partiels explicitement. [Contrat et décisions](../development/rescue.md).

V44 — dépôt interrompu : rayon connecté de douze cases et identité conservée sans fusion ; en cas d’échec, sommeil/réveil possibles mais autre travail suspendu jusqu’à libération locale. C’est une adaptation logistique explicitement bornée, non une règle Core certifiée. [Motif et vérification](../research/interrupted-cargo-reference.md).

V40 — [Refroidissement passif](../development/passive-cooling.md) : seuil 17 °C, combustible continu et alimentation physique adoptés. Impulsions thermiques intégrées/écrêtées, remplissage entier conservateur hérité et recherche disponible d’emblée sont des adaptations explicites ; confort, dégâts et appareil électrique différés. [Confrontation des sources](../research/passive-cooling-reference.md).

V38 — [Températures](../development/temperature.md) : cycle quotidien Core sur moyenne de site provisoire, échanges intégrés à dix ticks locaux/s, moyenne exhaustive des candidats de paroi, feu plafonné à 28 °C. Ces choix adaptent cadences et reconstruction d’air ; ils ne revendiquent pas la même suite de températures que le binaire RimWorld. Saisons, météo, dégâts et consommateurs agricoles extrêmes sont différés explicitement.

État : 15 septembre 2026, G1 partiel et chaîne pierre G2 jouable, G0 encore ouvert. Les nouvelles [références utilisateur](../research/reference-adoption.md) définissent le comportement visé par défaut. Cette liste rend explicites les adaptations et simplifications actuelles ; une limite temporaire ne devient pas automatiquement notre cible définitive. [ROADMAP](../ROADMAP.md) suit leur progression.

| Domaine / référence | Choix ou écart actuel | Motif et suite |
|---|---|---|
| Présentation, chap. 5/29 | Grille plane représentée en 3D low poly, caméra orientable ; case 1 m, humain 1,75 m, mur 2,80 m. | Interprétation des volumes pour la lisibilité. Pas d'étages jouables ni de physique de corps imposés par la 3D. |
| Étendue, chap. 5 | Carte moyenne 250×250 par défaut, petite 200×200 ; 32/64/128 conservées comme essais et cartes compactes. | Correction de l'ancien défaut 64² : les petites dimensions proposées par le corpus étaient des fixtures. Les options 225/275/300/325 de RimWorld ne sont pas toutes proposées ; extension au-delà de 250 après mesures. Taille, résolution et cadrage sont distincts. |
| Animation, chap. 29 | Poses des personnages et cargaisons interpolées sur GPU ; la simulation décide des transferts et de l'occupation. | Liberté technique sans changer les conséquences de jeu. Les placeholders seront remplacés par les assets définitifs. |
| Navigation, chap. 21 | Dijkstra CPU déterministe sur huit voisins dans le jeu ; recherche entièrement GPU dans un laboratoire indépendant. | Les techniques de RimWorld ne sont pas une contrainte. Choisir le moteur final sur correction, coût total et fonctionnement avec le rendu. |
| Circulation, SYS-113..117 | V14 : passage entre colons civils, y compris occupés ou endormis ; réservations de service exclusives et distinctes du transit. | Corrige l'exclusion générale du premier moteur. [Vérification](../research/civil-traffic-reference.md) : les collisions hostiles et superpositions visuelles 3D restent à traiter. |
| Temps/besoins, chap. 3/14 | 10 ticks/seconde, 6 000 ticks/jour ; besoins en pourcentage et durées propres au prototype. | Conversions et équilibrage explicites avant G1. Les constantes du dossier ne sont pas copiées sans leurs unités. |
| Travail, SYS-041..050 | Collecte, construction et transport séparés ; priorités 0–4. À priorité égale, la cuisine passe avant les familles existantes ; les autres départages restent locaux. | Première partie du tableau Travail ; les métiers supplémentaires arrivent avec leur gameplay. Le départage précis est un choix documenté, pas une parité certifiée. |
| Stockage, SYS-051..055 | Cellules avec filtres bois/nourriture, priorité 1–4 croissante et capacité. Désignation rectangulaire additive ; réglages case par case, sans zone nommée commune. | Le rectangle facilite la création et le retrait ; les politiques communes et filtres riches restent ouverts en G0. Une réserve existante n'est pas reconfigurée par un chevauchement. |
| Désignations, chap. 8/10, SYS-031..037/051..061 | Rectangle inclusif pour abattre, récolter, annuler et créer/retirer des cases de réserve. Cases compatibles uniquement ; exécution ordonnée en une commande. | Adaptation 3D : projection sur la grille, aperçu instancié, souris capturée, annulation au clic droit pendant le tracé et rotation au clic droit en dehors. Murs/lits restent placés individuellement ; ce geste ne constitue pas encore une sélection multiple de colons. |
| Stockage matériel, chap. 10 | V6 : une seule pile compatible par cellule au sol ; capacité par objet, dépôt de surplus sur des cellules proches et réservations typées. Une politique de source modifiée peut laisser partir un transport déjà réservé ; une destination invalidée libère sa livraison. | La superposition au sol était une erreur désormais corrigée. Étagères et réévaluation des priorités de source restent absentes ou partielles. Voir [contrat V6](../development/spatial-motion-storage.md). Aucune matière ne disparaît lors d'un changement de politique. |
| Quantités, chap. 10 | Piles 75 unités sauf repas de survie et repas simples 10 ; portage de travail 10, ingestion selon la faim, réserve au plus 75. | Paramètres locaux pour observer des livraisons partielles. Masse, espèce et capacités dérivées ne sont pas encore simulées. |
| Construction, SYS-056..061 | V16 : plan traversable, première livraison dans un cadre, dégagement réel des plantes/piles puis finition. Les cadres ralentissent le passage ; les personnes et services sont protégés. | [Relecture V21](../research/occupancy-reference.md) : profils objets/zones adoptés pour les six constructions ; plans sur réserves possibles avec retrait des cellules incompatibles et dépôts conservatifs. V22 adopte transit, coûts et exclusions d’arrêt des meubles présents ; personne immobile gênante non déplacée. Déconstruction, minage, réparation et remplacement restent ouverts. |
| Lits, chap. 5/10 | Nouveaux lits orientés 1×2. Les lits et plans de lits des sauvegardes V1 gardent une emprise explicite `legacy-single` 1×1. | Agrandir silencieusement un ancien lit pourrait recouvrir un voisin. Les migrations préservent les emplacements existants. |
| Repas, SYS-076..080 | Portion réservée, rejointe, prise en main et ingérée pendant 50 ticks ; aucun bonus avant consommation effective. | Actions physiques livrées ; tables/tabourets, transport à la place et souvenir sans table livrés ; aliments distincts et quantités livrés ([V5](../development/food-items.md)) ; recette simple livrée, autres recettes, politiques et pensées restent à développer. Coefficients provisoires dans needs.md. |
| Repos et humeur, chap. 14 | Lit attribué, réservé et rejoint ; bonus uniquement en dormant dans celui-ci, repli au sol justifié. Confort progressif ; humeur encore dérivée des jauges avec effets de confort et premier souvenir. | V12 ajoute les horaires et la fatigue adulte vérifiée ; les anciens paramètres restent seulement dans le profil historique. [Cadences et interruptions adaptées](../development/schedules.md), loisirs et traits ouverts. Pensées et crises G3. |
| Mobilier de repas, chap. 5/10/14 | Table 1×2, tabouret 1×1 ; rayon par aliment après prélèvement, place réservée, pose assise et ingestion réelles. | V22 corrige le blocage de la table : passage coûteux et montée GPU, avec arrêt exclu. [Recherche récente](../research/furniture-travel-reference.md) ; base de marche provisoire, élévation interprétée sans physique. Repli debout à distance minimale, départage déterministe au lieu des régions aléatoires. [Recherche](../research/dining-reference.md). |
| Confort, chap. 14 | Plafonds normaux 50 tabouret / 75 lit ; variation continue à 10 Hz, souvenir −3 une journée sans cumul. | Qualités et profils absents ; baisse à 4 points/heure à confirmer contre les XML. Migration V3 : confort initial neutre 50, sans pensées rétroactives. Le modèle complet d’humeur reste à développer. |
| Interface, chap. 8 | Organisation RimWorld conservée ; inspection de cellule, filtres dans la réserve sélectionnée, transport dans Travail, constructions dans Architecte. | V17 ajoute sélection multiple de colons et menu individuel de travaux exécutables, file réservée de 32 entrées au plus et anneaux GPU. V18 ajoute transport et approvisionnement forcés, sans vol de réservation ; portage de 10 unités et trajet mono-source/mono-destination restent des limites héritées. V19 ajoute dégagement de chantier et combustible forcés avec réservation du poste en attente. V20 ajoute cuisine et dégagement des piles sur semis. V23 permet les suites sur la cellule en construction, cuisine et recharge ; chaque sous-travail garde ses réservations, le poste reste strictement exclusif ; autres familles sélectionnables encore ouvertes ; journal complet absent. [Contrat](../development/player-orders.md) et [sources](../research/player-orders-reference.md). Rotation au bouton droit glissé conservée. |
| Végétation, chap. 12 / SYS-071..072/075 | Buissons persistants, croissance diurne, maturité, rendement et coupe ; baies distinctes ou portions historiques selon profil. | Identité après récolte corrigée en V7. Climat fixe, travail et compétences encore provisoires ; arbres toujours finis. [Recherche](../research/plant-growth.md). |
| Contenu, chap. 28/33 | Jeu de base avant extensions ; ressources finies et petit catalogue fonctionnel. | Développer les interactions avant l'inventaire exhaustif ; les absences ne sont pas présentées comme une fidélité acquise. |

Une nouvelle liberté fonctionnelle doit préciser sa référence, son comportement, sa justification et sa condition de réexamen. Une optimisation ou un autre algorithme peut être adopté librement s'il conserve les contrats observables et les sauvegardes de sa version. Les mesures de performance restent associées à leurs scénarios et matériels.

V14 adopte le [passage civil vérifié](../research/civil-traffic-reference.md) : les personnes présentes ne sont plus des murs temporaires. Les réservations de lits, repas et postes gardent leur exclusivité. Les modèles peuvent encore s'interpénétrer, y compris pour des activités civiles partageant une cellule ; cette limite de présentation est assumée et reste à affiner. Les collisions hostiles et la dispersion de combat ne sont pas implémentées.


## Cuisine et limites actuelles

Le [contrat V10](../development/cooking.md) livre feu, combustible, factures et repas simple avec leurs interactions physiques. La [recherche](../research/cooking-reference.md) documente conversion du temps, recharge par unités entières, dépôt sur la grille, comptage immédiat et paramètres de facture encore partiels. Chaleur, lumière fonctionnelle, compétence et intoxication ne sont pas implicites. La [conservation V11](../development/food-preservation.md) ajoute les âges thermiques et la pourriture à température constante ; exposition et chaîne du froid restent ouvertes.

Les anciennes décisions d’implémentation V7/V8/V9 restent dans les [ADR de simulation](../decisions/simulation.md) et de [présentation](../decisions/presentation.md). Leur inventaire de manques à la date de rédaction ne remplace pas l’[état courant](implementation-status.md).

## Régimes partagés et catalogue limité

V13 adopte les autorisations avant sélection et maintient les repas engagés. Les quatre préréglages portent des noms locaux explicites ; ils couvrent les aliments du prototype, sans prétendre recopier la totalité des listes Core. Défaut des nouveaux arrivants et provenance restent ouverts. [Contrat](../development/food-policies.md) et [réserves de fidélité](../research/food-policies-reference.md).

## Loisirs V15

Deux activités livrent accès, satisfaction et lassitude sans fermer le catalogue. Profil de camp à attentes extrêmement basses jusqu’au système de richesse ; sélection locale de lieu pour le ciel, sans régions/conditions de pièce/météo. Intégration au tick local, migration à 55 sans passé inventé. [Sources et décisions détaillées](../research/recreation-reference.md), [contrat](../development/recreation.md). V64 remplace l’agrégat par une [humeur progressive à causes consultables](../development/mood.md), tout en conservant l’hypothèse explicite d’attentes fixes.

## Maintien sur la cellule V23

La préférence après clic droit vise l’ancre de l’emprise du bâtiment présent, pas un rayon de voisins. Famille conservée, file préalable et demi-journée maximale depuis l’acceptation suivent les sources consultées ; aucune promesse de terminer un chantier devenu impossible. Les autres fournisseurs seront intégrés avec leurs systèmes. Les limites de provenance et différences de logistique restent dans le [contrat](../development/player-orders.md) et sa recherche.

## Meubles emballés V26

Le rangement suit des filtres et une priorité strictement meilleure ; le dégagement reste proche avant un éventuel rangement séparé. Le départage déterministe des cellules remplace celui des régions de référence. Les dépôts de dégagement conservent notre restriction aux réserves qui acceptent l'objet, plus conservatrice que le validateur hors stockage lu dans le miroir. Ce point sera réexaminé avec les règles générales de dépôts/interdictions. Les paquets sont des placeholders réduits sur les surfaces du mobilier pour rester lisibles en 3D ; leur propriété et leur unique case au sol ne changent pas. [Sources, certitude et autres absences](../research/furniture-logistics-reference.md).

## Géologie locale V27

Cinq identités Core, sélection de deux ou trois types par site et régions continues sont adoptées ; bruit local, échelle des régions et palette sont adaptés à notre scène 3D. Les anciennes cartes restent non typées. Les pierres décoratives ne sont pas des matériaux disponibles. V28 complète les sols révélés et produits ; toits et autres dépendances restent ouverts : [sources et limites](../research/geology-reference.md).

## Minage V28

Le [contrat](../development/mining.md) adopte contact, dégâts persistants, produit probabiliste et transport désigné. Le profil neutre utilise 100 ticks Core entre coups selon le miroir, malgré une ancienne page wiki indiquant 120 ; aucune compétence simulée n’est revendiquée. La roche historique reste sans type avec 500 PV provisoires. Les massifs actuels révèlent leur sol brut correspondant et sont sans toit ; autres minerais que l’acier V29, couches de sol alternatives et effondrements restent des travaux explicites. Le dernier coup est différé si son produit ne peut être conservé. [Sources et certitude](../research/mining-reference.md).

## Acier V29 et prérequis de la taille

Gisements et produit de base sont adoptés, densité et sol encaissant adaptés au site local. Le portage garde sa calibration provisoire et le rendement son profil neutre. Les anciennes cartes ne reçoivent aucun minerai rétroactif. L’atelier demande de l’acier : extraction/stockage, puis recettes constructives mixtes, puis taille/blocs ; aucun matériau gratuit ne contourne la dépendance. [Recherche et degré de certitude](../research/steel-reference.md).

## Matériaux de construction V30

Les nouveaux ouvrages suivent les coûts bois/acier vérifiés, dont 45 unités pour un lit ; le temps est converti au pas local avec vitesse neutre. Les objets anciens restent au profil historique pour conserver leur matière. Le choix du matériau n’introduit pas encore qualité, résistance, inflammabilité ni recherche : [décisions et certitude](../research/construction-materials-reference.md). Les exigences multiples sont une frontière technique préparée ; aucun atelier mixte n’est déclaré jouable.

## Taille V32

Recette générale filtrable plutôt que six raccourcis de factures : son seuil compte tous les blocs, conformément au compteur inspecté. Travail neutre extérieur 200 ticks locaux (1600 Core / 10 / 0,8). Lumière fonctionnelle et capacités restent absentes, sans facteur inventé à partir de sources contradictoires. Le produit de vingt blocs se porte entier malgré la limite provisoire dix du transport ordinaire. Les constructions admissibles acceptent ces blocs depuis V33, avec leur travail propre et le repos des lits réduit. [Justification et sources](../research/stonecutting-reference.md).

## Construction en pierre V33
Adopter cinq roches pour les cinq familles admissibles ; conserver l’exclusion de la pierre à l’atelier de taille. Travail = base × facteur + offset, sommeil du lit ×0,9. Géométrie existante teintée ; emballage générique conservé. Résistance, incendie, beauté, économie, fondations et qualités attendent leurs vrais systèmes. [Sources, unités et niveau de certitude](../research/stone-buildings-reference.md).

## Pièces sous V34

Reconnaissance et inspection des enceintes livrées séparément de leur couverture et de leurs effets. Les portes ouvertes restent des seuils. L’eau conserve l’échange d’air malgré son transit interdit. [Contrat](../development/rooms.md), [sources et divergences](../research/rooms-reference.md). Aucun plafond calqué sur le nombre interne de régions Core ni rôle de chambre n’est inventé. La pénalité extérieure fixe des ateliers et les conditions de loisirs restent provisoires et doivent intégrer les propriétés environnementales dans une tranche suivante.

## Toiture construite V35

[Contrat](../development/roofing.md), [relecture Core](../research/roofing-reference.md). Adopter zones distinctes de la couverture, vrais bâtisseurs sans ingrédients, chaîne de supports et retrait physique. Adapter le rayon à notre parcours cardinal, le travail à quatre ticks locaux et le plafond à une dalle 3D masquable. La limite automatique de 320 cases est conservée ; celle de 26 régions dépend du moteur de référence et n’est pas transposée.

La toiture V35 différait toits naturels et dommages. V45 ajoute les blessures aux personnes lors d’un effondrement construit ; dommages aux objets et gravats restent absents. Thermique et lumière ont été livrées séparément. [Contrat courant](../development/health.md).

## V36 — lumière et pièces des recettes

[Recherche et incertitudes](../research/work-environment-reference.md), [contrat](../development/work-environment.md). Adopter les facteurs Core séparés ; lumière à la place du colon, extérieur/rôle au centre du poste. Les chambres actuelles concernent des lits simples civils et des adultes sans relations. La limite Core de 60 régions n’est pas remplacée par un nombre arbitraire de cases ; son effet sur les très grandes pièces est différé. Égalités de rôles basées sur l’ordre du XML publié historique, à confirmer avec un export de définitions récentes.

Les émetteurs partagent actuellement une couleur : le canal maximal suffit à leur contribution logique. Le miroir récent emploie le maximum RGB, tandis que le tableau wiki utilise sa moyenne ; choix explicite du miroir, sans prétendre avoir mesuré le binaire officiel. Un nouvel émetteur coloré exige une extension RGB. Progression entière à 10 000 unités par tick neutre, erreur d’arrondi maximale 0,00005 tick/action ; les anciennes sauvegardes conservent leur pourcentage de travail accompli.

Les recettes reçoivent les facteurs dans cette tranche. Le rendu local est livré dans la tranche graphique suivante sous le même schéma. Les pénalités lumineuses des autres métiers/déplacements sont les suites prioritaires ; ce sont des absences connues, pas la cible définitive. Température, humeur des pièces et autres statistiques ne sont pas implicitement simulées.

## Présentation lumineuse sous V36

[Recherche](../research/environment-lighting-reference.md), [contrat](../development/environment-lighting.md). Adapter le champ logique en teintes chaudes et obscurité de coupe avec un plancher de lisibilité, une interpolation spatiale et une limite de hauteur. Les images ne reproduisent pas numériquement le compositing 2D Core et ne modifient pas les taux de travail. Différer ombres locales, sources colorées multiples, éclairage horticole, fenêtres et étages ; ne pas faire traverser les murs par un PointLight non occlus.

### V37 — cadence lumineuse et unités locales

Adopter la lumière au colon, le travail variable, les coups et arêtes capturés. Adapter le report sous-tick à l’horloge 10 Hz ; conserver notre base de marche et nos coûts de recherche neutres, sans les annoncer comme durées Core. Les fractions ne changent pas les matériaux ni les interruptions. La relecture du travail des plantes révèle un facteur de croissance encore absent : dette connue à traiter avec leur calibration. [Recherche et certitude](../research/light-work-reference.md).


## Santé active V45

[Référence et décisions](../research/health-reference.md), [contrat](../development/health.md). Adopter corps naturel adulte, incapacités et dégâts construits, sans vie globale. Adapter unités entières, phases et fin d’arête allongée après arrêt des actions. Profil de mort instantanée autorisée par défaut ; pas de réglage de difficulté complet. Secours livrés en V46, traitements sans médicament en V47 ; différer soins complets, ramper, capacité quantitative de portage, armures et gestion des dépouilles ; aucune guérison instantanée ne compense ces absences.
