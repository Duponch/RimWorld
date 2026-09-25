# Guide joueur

## Fabriquer ses armes et trier les réserves — V101

1. Dans **Recherche**, terminer **Forge**, **Usinage**, puis **Armurerie** avec un bureau et un chercheur.
2. Dans **Architecte → Production**, construire l’**Atelier d’usinage** : 150 acier, 5 composants, Construction 4. Raccorder ses 350 W et laisser libre la case de travail devant lui ; l’abriter améliore le travail.
3. Sélectionner l’atelier et ajouter une facture de revolver (30 acier, 2 composants, Artisanat 3) ou de fusil (60 acier, 3 composants, Artisanat 5). Activer Artisanat dans Travail. Quantité, rayon, suspension et destination fonctionnent comme pour la confection.
4. Une interruption conserve l’ouvrage pour son auteur. La coupure électrique arrête le travail ; les matériaux ne sont pas consommés une seconde fois à la reprise. Sélectionner l’ouvrage au sol permet de l’annuler avec restitution partielle.
5. Sélectionner une réserve, cocher **Affiner les catégories par objet**, ouvrir **Armes**, et ne garder que les objets souhaités. **Appliquer les réglages** déclenche le rangement par les transporteurs ; la catégorie doit aussi être autorisée. Désactiver l’affinage retrouve le filtre par catégories.
6. Équiper l’arme produite avec un colon par les commandes habituelles.

Pour essayer immédiatement, importer [la démonstration Atelier](../../public/test-saves/v101/atelier.json) dans **Charger → Importer**. Ce petit site préparé possède un artisan, les recherches terminées, un atelier construit et exactement les matériaux des deux armes. Ce n’est pas une colonie autonome ni une partie naturelle ; conserver sa partie personnelle dans un autre emplacement.

**V100 : interface crème et informations hiérarchisées.** Les ressources apparaissent directement sur la carte, avec leurs icônes, noms et quantités. La barre du bas présente des boutons distincts. Travail, Horaires et Affectations occupent davantage de largeur ; Copier et Coller sont côte à côte. Dans un dossier de colon, le contexte de pièce figure dans **Besoins** et les commandes restent au bas de la fiche. Pour une case, les valeurs essentielles sont visibles et **Environnement** déplie le détail. Les données, sauvegardes et commandes sont conservées.

**Sélection et commandes V99 :** cliquez un animal sauvage pour ouvrir **Informations** et **Santé**, ou le désigner pour la chasse. Double cliquez pour ajouter les animaux équivalents visibles ; un rectangle prend d'abord les colons, puis les autres personnes, puis la faune. Cliquez plusieurs fois au même endroit pour parcourir les êtres et objets superposés. Avec un colon sélectionné, **R** bascule Mobiliser ; le clic droit mobilisé sur un hostile ou un animal sauvage propose les attaques admissibles. Le trait bleu d'un colon sélectionné suit son trajet réel ; la barre dorée proche indique un travail mesuré. Les attaques ne se mettent pas encore en file avec Maj. [Contrat et limites](../development/interaction-feedback.md).

**Essayer une colonie préparée :** ouvrez **Charger une partie → Colonies de test** depuis l'accueil, ou **Menu → Charger une partie** en jeu. Six fiches proposent une colonie avancée, énergie/alimentation, prison, environnement et deux configurations de **100 colons**. Chaque fiche indique quoi essayer et où. Le chargement commence en pause ; chaque nouvel essai repart de l'original. Les situations préparées peuvent comporter des besoins urgents et ne sont pas des colonies équilibrées.

**Télécharger le fichier** permet de conserver une copie ; **Importer un fichier** la recharge dans un autre navigateur. Votre sauvegarde manuelle n'est pas écrasée en chargeant un test. La partie ouverte passe dans **Colonie précédente**, un emplacement unique : sauvegardez votre progression avant d'enchaîner les essais. [Détail des six configurations](../development/test-colonies.md).

V97 réduit le coût du paysage en vue rapprochée et des mises à jour végétales. Déplacez, tournez et zoomez normalement ; aucun réglage supplémentaire n'est nécessaire. Le débit maximal reste dépendant de la colonie et du matériel. [Mesures et limites](../history/validation-performance-v97.md).

V96 corrige le décalage du paysage pendant les déplacements, rotations et zooms de caméra. Les éléments restent alignés dès l’image suivante ; commandes et sauvegardes sont conservées. [Preuves et limites de performance](../history/validation-camera-v96.md).

**V95 : curseurs et moteur.** La carte garde une seule flèche, quel que soit l'outil ; les icônes de désignation restent au-dessus des cibles. Les boutons affichent un doigt, la saisie un curseur texte, la préparation un sablier et les commandes indisponibles le signe interdit. La molette affiche une loupe ; le déplacement utilise les mains ouverte/fermée. Les règles et vos sauvegardes restent inchangées. [Détails et limites de performance](../history/validation-performance-v95.md).

**V94 : interface remaniée.** Architecte garde ses catégories à gauche, ses pictogrammes au centre et les options à droite sans déplacer son cadre. Choisissez un outil puis fermez Architecte : l'outil et son curseur restent actifs pendant que la carte redevient visible ; Échap annule. Le registre Ressources reste toujours complet. Travail, Horaires, Affectations et Faune utilisent des colonnes stables. Les dossiers des colons restent plus hauts, leurs noms sont visibles dans les portraits sélectionnés et Bio conserve ses détails repliables. Les grandes sauvegardes sont compressées sans perte dans ce navigateur, et les anciennes restent chargeables.

**V92 : nouvelle présentation, mêmes colonies.** [Ouvrir le jeu](https://lisiere-duponch.netlify.app). Sélectionnez un portrait, puis Bio, Besoins, Santé, Équipement ou Social ; Prisonnier apparaît pour les captifs. Les commandes de mobilisation et de travail restent dans l’inspection. Clic droit sur la carte : menu du jeu, sans menu du navigateur. Architecte → Ordres affiche désormais une hache, une pioche, une faucille ou des cisailles au-dessus des cibles. Les sauvegardes locales restent propres au navigateur et au site utilisé.

**V91 : choisir son milieu et exploiter ses ressources.** Une nouvelle partie propose forêt tempérée, forêt boréale ou broussailles arides. La végétation pousse et peut se renouveler ; les animaux sauvages mangent, se déplacent et peuvent être chassés. Les anciennes cartes gardent leur paysage.

Pour essayer les nouveautés :

1. Dans **Nouvelle partie**, choisissez votre milieu sur l’écran du site, puis démarrez. Examinez les plantes pour connaître leur croissance ; les arbres trop jeunes ne donnent pas encore de bois. Les agaves mûrs fournissent des fruits utilisables dans les repas simples.
2. Ouvrez **Faune**, repérez les animaux et désignez une chasse. Affectez un colon à Chasse, équipez-le d’une arme à feu, puis prévoyez une réserve acceptant les dépouilles et une facture de boucherie. Un grand herbivore donne plusieurs piles de viande et de cuir : laissez de la place autour du poste.
3. Au tailleur, choisissez une famille et filtrez la matière voulue : cuir ordinaire des cerfs/gazelles, fourrure bleue des muffalos ou cuir de dromadaire. Les cinq familles existantes utilisent ces matières. La fourrure bleue isole mieux du froid ; le cuir de dromadaire protège mieux de la chaleur. Le vêtement est fabriqué, rangé et porté par les travaux ordinaires.

Les distributions sont partielles : toutes les espèces ne sont pas présentes sur chaque carte. Les animaux domestiques, la reproduction, la laine et le lait ne sont pas encore livrés. Les climats sont trois sites témoins explicitement choisis, pas une génération complète de planète. Les anciens régimes et filtres conservent leurs refus : autorisez les nouveaux ingrédients avant de les cuisiner dans une ancienne colonie.


**V90 : habitat et habillement.** Construisez chaises, fauteuils, chevets, commodes, tables et pots ; choisissez leurs matières dans Architecte et utilisez « Tourner » pour les meubles orientables. Mobilier complexe ouvre les meubles avancés. Les tailleurs fabriquent cinq familles en tissu ou cuir léger ; Affectations permet de choisir l’une des deux politiques et d’activer le remplacement physique. Les anciennes colonies conservent cette automatisation désactivée jusqu’à votre choix. [Confort](../development/habitat-comfort.md), [vêtements](../development/apparel-renewal.md), [preuves et limites](../history/validation-habitat-apparel-v90.md).

**V89 validée dans son périmètre : sols, hygiène alimentaire et sépultures.** Les sections correspondantes décrivent les commandes jouables. La colonie de validation a aménagé une cuisine, posé ses sols, nettoyé et inhumé trois morts, avec réparations et reprises documentées ; aucune intoxication naturelle n'y a été observée. Les [preuves V89](../history/validation-hygiene-v89.md) distinguent ce parcours des situations cliniques. Les anciennes parties n'acquièrent ni saleté, ni contamination, ni maladie passée ; les dépouilles déjà présentes commencent leur suivi de décomposition prospectivement, sans changer la date historique du décès.

**V88 validée dans son périmètre : visiteurs, échanges et deux armes supplémentaires.** Les petits marchands ont un stock et de l’argent physiques ; un colon doit les rejoindre avant de conclure un panier. Le fusil à verrou et le couteau en plastacier complètent l’équipement. La colonie de validation conserve quatre habitants jusqu’à J159,49, vend cinq revolvers de surplus contre trois médicaments et six argent, puis termine le rangement des médicaments après le départ du marchand. Cette continuation avec reprises ne fixe ni une date de visite ni un stock garanti pour votre colonie. [Preuves et limites V88](../history/validation-trade-v88.md).

## Rencontrer un marchand

Ouvrez **Visiteurs · Commerce**, choisissez un marchand disponible et un colon capable de négocier, puis **Rejoindre le marchand**. Si la partie était en pause, le trajet reprend à 1× après acceptation de l'ordre ; le jeu se remet en pause au contact. Choisissez les quantités, contrôlez le solde et confirmez. Une visite peut finir avant l’échange ; un marchand indisponible ou une quantité réservée n’est pas un stock garanti.

Les ventes concernent les biens accessibles au sol dans votre foyer ou une réserve, hors quantités réservées. Le petit visiteur accepte notamment tissu, composants, médicaments industriels, rations, chemises/tenues admises et armes à distance. Il refuse notamment bois, récoltes, viande, repas simples, blocs, gilet et couteau. Les médicaments à base de plantes et avancés ne font pas partie de ce profil. Son stock peut proposer des médicaments industriels, mais aucun produit absent du tirage n’est remplacé automatiquement par un objet disponible.

Les objets achetés sont déposés près du négociateur ; prévoyez une place libre et des réserves pour les ranger. Activez **Argent** dans une réserve pour transporter la monnaie ; une pile contient au plus 500 unités. Argent insuffisant ou dernier dépôt impossible : le panier entier est refusé. Si le marchand ne peut pas payer tout ce que vous vendez, une confirmation distincte est nécessaire pour accepter le manque. Qualité et état influencent le prix des armes/vêtements ; revendre une arme rapporte nettement moins que l’acheter. Les provisions personnelles du visiteur ne sont pas vendables.

Les visiteurs sont neutres et ne sont pas des colons : leurs possessions ne gonflent pas vos stocks et vous ne leur attribuez ni travail ni lit. Une agression volontaire interrompt les échanges et fait retirer leur groupe ; cela ne simule pas une diplomatie complète entre factions.

Une ancienne colonie garde son calendrier : **Activer les visites → Autoriser les prochaines visites** les introduit à partir de maintenant. Les nouvelles parties Atterrissage forcé les activent au départ. Tous les visiteurs ne sont pas marchands ; les passants poursuivent leur traversée. Les caravanes de gros, commerce orbital, expéditions et diplomatie complète restent absents. [Commerce](../development/trade.md), [visiteurs](../development/visitors.md), [prix et limites](../research/trade-reference-v88.md).


**V87 validée dans son périmètre : saisons, réserves, énergie variable et incendies.** Les nouvelles colonies suivent le climat tempéré de référence. Les anciennes conservent leurs règles ; **Menu → Activer les saisons** adopte le nouveau climat à partir de l’état courant, sans refaire la carte ni vieillir rétroactivement les plantes. [Contrat climatique](../development/site-climate.md), [énergie et météo](../development/wind-heater.md), [preuves et limites](../history/validation-environment-v87.md).

## Préparer les saisons et les incendies

La date affiche les quadrums et la saison. Durée du jour, température et production solaire varient ensemble. Le site de référence est tempéré et relativement doux : sa moyenne annuelle est 16,2 °C. Les cultures peuvent ralentir au froid ; un gel extérieur suffisamment intense tue les cultures et laisse les buissons sans feuilles. Les plantes vieillissent et dépérissent aussi après une obscurité prolongée. La récolte reste possible dès que la plante est récoltable. Conservez des repas et matières premières avant de dépendre d’une récolte prochaine.

Dans **Architecte → Température**, construisez un **Radiateur** : 50 acier, 1 composant et Construction 5. Il chauffe une vraie pièce, consomme 175 W en activité et 17,5 W en veille. Son inspection règle la consigne par pas de 1 ou 10 °C ; la remise à 21 °C utilise la même commande. Un mur détruit ou une alimentation coupée change réellement son efficacité.

Dans **Architecte → Énergie**, l’**Éolienne** coûte 100 acier, 2 composants et Construction 4. Tournez son corps 7×2 et gardez libres les couloirs colorés devant et derrière : arbres, roches pleines, toits et certains bâtiments y réduisent la production. La coupe automatique demande du travail réel ; les obstacles ne disparaissent pas au clic. Vent et météo font varier la puissance. Gardez une batterie et un secours pour la cuisine et le froid.

Dans **Travail**, réglez **Incendie**. Peignez une zone **Foyer** couvrant les biens à protéger : les colons libres y recherchent les feux selon leur priorité, puis rejoignent et battent les flammes. Un clic droit avec un colon sélectionné permet de prioriser l’extinction hors de cette zone. Les personnes en feu interrompent leur travail et tentent de s’éteindre ; les blessures peuvent nécessiter des soins. Les biens endommagés perdent réellement des PV ; ceux détruits sont retirés de la carte et leurs pertes restent comptabilisées. Construction répare les ouvrages endommagés inclus dans le foyer. La pluie agit sur les feux exposés ; elle ne remplace pas une défense organisée.

La météo affichée affecte le vent, certains déplacements et tirs exposés. Il n’y a pas encore de couche de neige persistante ni de présentation complète des précipitations. Ce lot ne livre pas tous les biomes, fléaux, espèces ou événements de RimWorld.

La colonie de validation conserve quatre habitants de J76,283 à J136,073, par des reprises documentées, jusqu’à une première récolte après l’hiver. Le feu y détruit des arbres, mais aucune extinction par colon n’y est observée : cette action est éprouvée séparément en situation contrôlée. Les [preuves V87](../history/validation-environment-v87.md) distinguent cette partie, les vrais clics, les sauvegardes et les limites de charge ; elles ne garantissent ni autonomie universelle ni vitesse 6×.

**V86 : capture, détention et recrutement sont jouables.** Préparez une pièce avec un lit de prison, capturez un assaillant à terre, affectez Médecin et Geôlier pour ses soins, repas et entretiens, puis accueillez cette même personne dans le travail et les couchages ordinaires. Le parcours naturel atteint J76,28 avec quatre colons ; cela ne garantit aucune date de recrutement dans une autre partie. [Preuves et limites](../history/validation-prisoners-v86.md).

**V85 livrée et validée :** réseau de conduits, commandes physiques marche/arrêt, batteries et panneaux solaires. La reprise documentée de la colonie V84 atteint J42,21 avec cuisine électrique, denrées gelées, alimentation nocturne sur batterie et coupures suivies de reprises. Les [preuves V85](../history/validation-energy-v85.md) distinguent ce parcours des fixtures et des mesures ; elles ne garantissent pas l'autonomie de chaque colonie. [Contrat et limites](../development/power.md).

**V84 livrée :** nouvelles cultures, cuisinières/table de boucherie et malnutrition. Le parcours de 24 jours depuis la dotation réelle, les contrôles de contrats, les clics natifs et les mesures de charge sont consignés dans les [preuves V84](../history/validation-food-v84.md). Les autres preuves gardent leur portée historique ; cette livraison ne constitue pas une fidélité exhaustive à RimWorld.

## Choisir son départ

L'accueil propose **Nouvelle partie** et **Charger**. Tutoriel, Options, Mods et Crédits sont grisés. Une colonie déjà ouverte peut être reprise. L'accueil et le site ont été validés en V82/V83 ; la dotation matérielle introduite en V88 est conservée depuis la révision 4 V89, qui ajoute une connaissance initiale. Le scénario, le narrateur et le catalogue restent partiels. La [référence Core vérifiée](../research/core-reference-baseline.md) distingue les règles adoptées et les écarts persistants.

Choisissez **Atterrissage forcé**, puis confirmez **Récit d'aventure** et **Rechargeable à tout moment**. Cassandra Classique est présélectionnée ; difficulté et mode exigent un clic. Les autres possibilités sont visibles mais indisponibles. La fiche annonce une adaptation partielle : trois milieux sans rivière, trois personnes en chemise, 300 bois, 450 acier, 30 composants, 50 repas emballés, 30 médicaments, 800 argent, un fusil à verrou, un revolver, un couteau en plastacier et un gilet (Atterrissage forcé révision 6, V91). Les réserves sont de vraies piles près de l'arrivée. **Vêtements complexes**, **Climatisation** et **Mobilier complexe** sont déjà connus. **Taille de pierre** reste connue depuis la révision 4 ; aucune recherche n’est accordée rétroactivement.

Dans **Préparer le départ**, gardez ou modifiez la graine numérique proposée aléatoirement. Choisissez **Plat**, **Petites collines** ou **Grandes collines** : le relief change les massifs et les occasions de filons. Petites collines est le préréglage de Lisière. Les deux ou trois pierres affichées dépendent de la graine. Le menu crée une carte de **250 × 250 cases**, avec trois profils fixes. Le départ s'ouvre en pause à **06:00**, avant tout temps écoulé ; lumière, horaires et température suivent cette heure. À vitesse normale nominale, un jour dure **16 min 40 s** hors pauses, si l'appareil tient le débit. La caméra rejoint l'arrivée. La sélection sur une planète, les autres biomes et le choix parmi huit personnes restent absents.

Les anciennes parties **Trois survivants**, **Camp pédagogique** et **Rencontre armée** gardent leur provenance, matériel, technologies et calendriers. Elles restent chargeables ; les formats compacts et exercices sont réservés aux parcours de diagnostic. Atterrissage forcé révision 3 ajoute argent, fusil et couteau uniquement aux nouvelles colonies. Les protections initiales supplémentaires, l’animal domestique, les capsules et stocks dispersés restent absents ; aucune ancienne colonie n’est réapprovisionnée. Récit d'aventure ajoute +5 à la cible d'humeur des colons et réduit le second tirage d'infection de leurs plaies à 75 % du risque neutre ; il ne rend pas la maladie acquise moins grave. Le narrateur et la difficulté globale restent partiels. [Contrat et différences](../development/scenario-start.md).

## Développer le camp actuel

Posez d’abord trois lits, une réserve accessible et un potager. Répartissez Construction, Culture, Cuisine et Transport dans **Travail**, puis fermez et couvrez le dortoir. Les 50 repas emballés donnent du temps : gardez-les pendant que la production s’installe. Un petit champ de vingt cases est un démarrage, pas une réserve durable pour trois adultes. Le pilote V84 obtient deux récoltes sur chacune de ses 80 cases de riz avant J16 ; cette surface est un repère observé sur une graine, pas une garantie d’autonomie sur chaque site. Cliquez une case pour lire sa fertilité : terre ordinaire **100 %**, terre riche **140 %**, gravier **70 %**. La terre pauvre des anciennes cartes reste à 70 %. Dans notre lumière tempérée, le riz demande environ sept jours sur terre ordinaire et dix sur terrain à 70 %, hors trajet et semis : cueillez des baies mûres ou chassez pour compléter l’attente.

Construisez un feu, autorisez les ingrédients disponibles et utilisez une facture **Jusqu’à six repas simples**. Ce stock court limite le gaspillage sans réfrigération. Observez les produits réellement livrés : une plante semée ou une facture créée ne nourrit encore personne. À distance comparable, un repas simple est préféré à une ration ; une ration plus proche peut rester le choix du colon.

Répartissez les deux armes à feu et le couteau entre les trois personnes ; le fusil porte plus loin mais prépare son tir plus lentement. Faites porter le gilet avant l’alerte. Le nouveau profil propose son premier raid à **5,4 jours écoulés**, si une entrée est possible. Mobilisez, choisissez des positions accessibles, puis démobilisez après la menace pour permettre les secours, les soins et la reprise. Gardez une case libre accessible au chevet de chaque lit : un dortoir où toutes les têtes sont bloquées peut permettre le sommeil mais empêcher les soins. Réservez un médecin valide et surveillez les traitements dans **Santé**, y compris après la fermeture d'une plaie. Une infection n'est pas systématique.

Contrôlez la température réelle des lits et préparez un **refroidisseur passif** si nécessaire, dans une pièce fermée et couverte avec du bois pour les recharges. Cet appareil protège du chaud mais ne réfrigère pas les aliments. Le nouveau profil n'impose plus l'accueil à un jour et demi ni la canicule à six jours du camp historique. Ces anciens calendriers ne décrivent pas Cassandra.

Le parcours V83 sur douze jours, graine 42 et petites collines, obtient sa première récolte de riz vers J7 puis cuisine les 120 unités récoltées en douze repas. Les trois colons ont construit leur dortoir, rangé les provisions et repris leur activité après le raid. Une seule ration reste à J12 : cette preuve historique portait sur la première récolte, et les vingt cases ressemées ne suffisaient pas à promettre l’équilibre alimentaire.

Le parcours V84 de 24 jours développe 80 cases de riz, puis 24 de pommes de terre et 24 de maïs. Il récolte **1 434 riz et 264 pommes de terre**, prépare **119 repas à la cuisinière à bois** et conserve trois colons vivants après trois raids. La dernière ration est mangée vers **J7,04** ; chacun réalise ensuite 14 ingestions hors rations entre J17 et J24. Dix-neuf rations restent disponibles. Le maïs, semé plus tard, atteint environ **56 % de croissance moyenne** sans récolte : cette diversification reste en cours. Les stocks, trajets, soins et récoltes réels sont suivis dans les [preuves V84](../history/validation-food-v84.md) ; une seule colonie ne suffit pas à garantir tous les climats, sites ou rythmes de jeu.

Le pilote historique V82 de huit jours, graine 42, a obtenu un abri avec trois lits, sept repas cuisinés à partir de baies et trois colons vivants après le premier raid. Il restait huit rations, sans récolte de riz : c'est une boucle de démarrage observée, **pas une économie alimentaire autonome démontrée**, ni une promesse de résultat sur chaque graine.

**Chasser et cuisiner V79 :** équipez un civil d’un revolver ou d’un fusil à verrou, activez **Chasse** dans **Travail**, puis cochez **Chasser** sur un lièvre dans **Faune**. Il approche, tire et achève au contact une proie à terre si nécessaire. Le corps reste physique et peut pourrir. Une réserve avec le filtre **Dépouilles animales** permet son rangement, même si le chasseur n'est pas affecté à Transport. Vous pouvez annuler la désignation ; les balles déjà tirées continuent leur trajet.

Dans **Architecte → Production**, posez gratuitement un **Emplacement de boucherie**, puis ajoutez sa facture. Un colon affecté à **Cuisine** y apporte une dépouille fraîche, travaille et obtient viande et cuir. Les blessures et parties manquantes diminuent le rendement ; le poste ne restitue que70% du rendement du cuisinier. La viande peut entrer dans un repas simple au feu de camp avec combustible. Mangeable crue, elle donne une pensée négative ; le cuir est stockable mais sa fabrication reste à venir. **Biographie** présente Cuisine ; la température ralentit ou arrête la pourriture sans rajeunir le produit. Une ancienne partie conserve ses régimes/filtres et Chasse désactivée : activez explicitement ceux dont vous avez besoin. Si un corps est bloqué par un meuble ou une pile, le chasseur peut le prendre directement pour le ranger. Hors chasse ou après abandon, il faut encore dégager sa cellule pour permettre le transport ordinaire. [Règles et limites](../development/hunting.md).

**Faune V76 :** ouvrez **Faune** en bas de l'écran, puis **Repérer** pour centrer un lièvre. Les nouveaux camps contiennent quelques lièvres sauvages ; une ancienne partie propose une introduction explicite. Ils se déplacent, dorment, consomment réellement plantes et aliments au sol. Le broutage peut réduire vos récoltes : une enceinte et des portes fermées protègent les cultures ; une porte ouverte permet le passage. **Depuis V77**, sélectionnez un colon armé et mobilisé, puis **Faune → Tirer** sur un lièvre à portée. Les tirs utilisent la vraie visée et les obstacles ; les blessures, saignements, incapacités et morts sont consultables dans la liste. Les impacts peuvent réveiller/faire fuir l’animal. **Depuis V78**, **Faune → Attaquer au contact** permet aussi une approche puis des coups physiques. Le lièvre peut riposter brièvement et mordre le colon, même après un coup raté ; surveillez Santé et démobilisez ensuite pour permettre les soins. Le colon regarde sa cible. Ce comportement ne signifie pas que tous les lièvres deviennent hostiles. [Contrat](../development/animal-melee.md). La chasse civile et la filière dépouille → viande/cuir sont disponibles depuis V79, comme décrit en tête du guide. L’apprivoisement et l’élevage restent absents. Un corps est transportable après sa chute ; le cas d’une cellule encombrée est détaillé dans le contrat des dépouilles. [Contrat et limites](../development/animal-combat.md).

**Réserve froide V75 :** Climatisation est déjà connue dans Atterrissage forcé et Trois survivants ; placez un **Climatiseur** dans Architecte → Température. Dans un camp historique sans cette connaissance, sélectionnez **Climatisation** dans Recherche (500 points) et travaillez au bureau au préalable. Il coûte **90 acier et 3 composants**, avec un bâtisseur de niveau **Construction 5** pour la finition. Orientez la face **bleue dans la petite pièce couverte**, la face **rouge vers l’extérieur** ; les deux doivent rester libres. Il ferme la paroi, mais ne supporte pas seul un toit. Raccordement automatique à un générateur proche : **200 W en refroidissement, 20 W au repos**. Dans l’inspection, réglez par exemple **−5 °C** ; créez une réserve filtrée pour les aliments et laissez les colons les transporter. Le gel arrête leur vieillissement sans les rajeunir. Panne, porte ouverte ou mauvais rejet de chaleur peuvent faire reprendre la pourriture. Changer de projet conserve les progrès de chaque recherche.

**Attention au froid réel :** Santé affiche aussi l’hypothermie. Les vêtements isolent ; une exposition prolongée réduit les capacités et peut tuer. Un civil gravement exposé cherche un refuge tempéré ; les personnes mobilisées restent sous vos ordres, les personnes à terre ont besoin de secours vers un lit réellement tempéré. Gelures localisées et choix complet de couchage selon danger restent absents. [Contrat et adaptations](../development/cold-store.md).

**Canicule V74, calendriers historiques seulement :** camp et Trois survivants prévoient une première vague de chaleur après 6–7 jours. Ce calendrier est désactivé et son activation refusée dans le nouveau profil Atterrissage forcé ; les effets réels de température restent communs. La lettre à droite explique la menace. Préparez une petite pièce **fermée et couverte**, un **refroidisseur passif** et du bois pour le ravitailler. Placez et désignez un **lit médical dans cette pièce** pour les secours. La tenue tribale en tissu protège davantage de la chaleur qu’une chemise ; **Équipement** indique son isolation, **Santé** la température locale, la plage confortable et le coup de chaleur. À un stade grave, un civil libre cherche un refuge accessible ; un colon mobilisé attend vos ordres. Un patient à terre doit être porté jusqu’au lit. Les pansements ne soignent pas l’exposition : la récupération exige de revenir sous le maximum confortable. Une pièce simplement moins chaude peut seulement stopper l’aggravation. Les anciennes parties proposent **Activer les canicules** ; rien n’est ajouté automatiquement à leur calendrier. [Règles et limites](../development/heatwave.md).

**Recherche V73 :** Vêtements complexes et Climatisation sont déjà acquis dans le nouveau départ et Trois survivants. Le parcours suivant concerne un camp historique sans ces connaissances : dans Architecte → Production, construisez un **Bureau de recherche simple** (3×2, 75 matériaux +25 acier). Dans **Recherche**, lancez Vêtements complexes ; dans **Travail**, activez Recherche, et consultez Intellect dans Biographie. Les colons doivent rejoindre un bureau libre ; plusieurs bureaux partagent les 600 points. Suspendre ou sauvegarder conserve la progression. Un tabouret sur la place de travail apporte son confort.

Une fois terminé, construisez un **Établi de tailleur** (3×1, 75 bois ou acier), laissez sa cellule devant libre et ajoutez une facture de **chemise** : 45 tissus, Artisanat, véritable ouvrage inachevé puis vêtement à porter. L’atelier propose aussi la tenue tribale, toujours initiale au poste gratuit. Ce parcours reste celui du camp pédagogique ; le nouveau départ connaît déjà cette technologie. Six projets sont disponibles : Vêtements complexes, Climatisation, Batteries, Panneaux solaires, Taille de pierre et Forge. [Contrat, coefficients provisoires et limites](../development/research.md).

**Confection V72 :** Architecte → Production → **Emplacement d’artisanat**. Pose gratuite immédiate ; Q/E oriente la place devant le poste. Activez **Artisanat** dans Travail, inspectez le poste et ajoutez une facture de tenue tribale : 60 tissus, aucune recherche. Le colon rassemble et travaille physiquement ; une interruption laisse un ouvrage que seul son auteur reprend. Une réserve acceptant **Ouvrages inachevés** peut le ranger. Inspecter cet objet permet d’annuler et récupérer environ 75 % du tissu. Le produit possède une qualité liée au niveau Artisanat, visible dans Biographie ; sélectionner un colon puis clic droit sur la tenue → **Porter**. Elle remplace une chemise incompatible, reste compatible avec un gilet, apparaît sur la carte et le portrait. « Jusqu’à X » exclut les vêtements déjà équipés. La recherche V73 permet aussi de fabriquer une chemise ; les autres recettes restent absentes. [Détails](../development/tailoring.md).

## Faire connaissance

Les colons éveillés peuvent bavarder ou avoir une discussion approfondie en travaillant ou en se croisant à six cases au plus, avec vue dégagée. Rapprocher les postes favorise les rencontres ; dormir, être à terre ou combattre empêche ces échanges ordinaires. Sélectionnez un colon puis **Social · opinions** : dernier échange, opinion de chaque personne dans les deux sens, causes et vieillissement des souvenirs. Les deux personnes peuvent réagir différemment ; la compétence Social progresse chez celle qui engage l’échange.

Le bavardage s’accumule jusqu’à +10 d’opinion affichée puis décroît ; une discussion laisse un souvenir de vingt jours, atténué à la fin. Aucun bonus direct d’humeur pour ces deux échanges. Insultes, disputes, couples, famille et deuil restent à venir. [Règles détaillées](../development/social.md).

## Personnalité des colons

Sélectionnez un colon, puis ouvrez **Biographie · compétences**. Les six premiers traits indiquent leur effet réel : Optimiste/Pessimiste déplacent la cible d’humeur de +6/−6 ; Résolu/Nerveux déplacent le seuil de risque ; Apprentissage rapide/lent modifie les gains d’expérience à 175 %/25 % avant passion et saturation. Un apprenti rapide ne travaille pas instantanément plus vite : son niveau évolue plus vite en pratiquant.

**Pensées et humeur** affiche les causes et les trois seuils personnels. Prévoyez des loisirs pour une personne plus sensible et tenez compte de l’apprentissage pour former vos spécialistes. Les priorités restent dans Travail, les plages dans Horaires. Les demandes d’accueil annoncent les traits avant votre choix.

Les nouveaux camps ont trois profils composés : Ada Optimiste/Apprentissage rapide, Noé Résolu/Apprentissage lent, Mina Pessimiste/Nerveux. Les anciens colons et les offres déjà ouvertes restent neutres après chargement ; les nouvelles offres peuvent présenter des traits. Les rencontres armées conservent leurs anciens profils. Bavardage et discussions approfondies produisent déjà des opinions ; autres relations et traits restent à développer. [Règles détaillées](../development/traits.md).

## Défendre le camp

Dans le nouveau profil, la première occasion est à **J5,4 écoulés**. Les suivantes suivent des fenêtres ouvertes à partir de **J11** : 4,6 jours actifs, six jours de repos, une ou deux occasions espacées d'au moins 1,9 jour. Une occasion impossible ou occupée par un groupe actif n'est pas reportée. La fin d'un assaut ne décale pas les fenêtres. Même après J20, les grandes menaces restent limitées aux raids ; les visiteurs et passants V88 ont des calendriers distincts. Autres menaces, budget selon richesse et adaptation restent absents. Le premier groupe réellement créé est un assaillant sans arme ; les suivants comportent deux personnes dont une avec revolver. Cette composition reste locale et partielle.

Cliquez sur la lettre **Raid**, puis **Voir les assaillants**. Mobilisez les défenseurs depuis leurs portraits et placez-les ; leurs tirs libres et la mêlée restent disponibles. Des murs fermés peuvent être frappés puis détruits. Il n'y a pas encore de pause automatique à l'alerte. Les parties historiques gardent leur premier raid entre 3,5 et 4 jours, puis six à huit jours après une issue.

Après **Assaut terminé**, démobilisez, contrôlez Santé, soignez les blessés et entretenez les murs/portes dans la zone de foyer. Les fuyards doivent atteindre le bord. Un ennemi à terre peut mourir ou se relever ; V86 permet sa capture dans les conditions décrites plus bas. Le transport des corps et les sépultures V89 sont décrits dans la section « Transporter et inhumer les morts ». Le bilan est celui de la fin de l’assaut. Dans une ancienne sauvegarde, **Activer les raids du camp** démarre ce calendrier sans changer la carte. [Contrat et limites](../development/raids.md).

## Endommager et réparer un mur ou une porte (V67)

Mobilisez un colon, utilisez **Attaquer au corps à corps**, puis cliquez sur un mur ou une porte. Il rejoint le contact et frappe à sa cadence ; **Arrêter** interrompt l'ordre en conservant la récupération du coup. Les balles interceptées par ces ouvrages les endommagent aussi. L'inspection affiche les PV actuels et maximaux, qui dépendent du matériau.

À zéro PV, l'ouvrage disparaît et ouvre le passage ; un toit privé de support peut s'effondrer et blesser une personne. Un mur/une porte détruit ne rend aucun matériau. Pour récupérer une partie des matériaux, utilisez la déconstruction habituelle.

Dans **Architecte → Zones → Foyer**, peignez les ouvrages à entretenir. Un colon non mobilisé affecté à **Construction** rejoint un ouvrage endommagé et le répare sans matière. Une désignation de déconstruction prime sur cette réparation. **Retirer foyer** arrête son entretien ; les PV déjà restaurés restent acquis. Le foyer ne s’étend pas automatiquement autour des constructions ; il délimite aussi l’extinction ordinaire et, en V89, le Nettoyage.

Les ordres de brèche décrits ici visent les murs et portes ; V87 étend les dégâts et la réparation aux autres bâtiments du catalogue. La Rencontre armée garde son mandat local ; les assaillants du raid ordinaire V68 peuvent chercher une brèche.

## Accueillir une nouvelle personne (V66)

Dans les profils historiques de camp et Trois survivants, une première demande peut arriver entre un jour et demi et deux jours de simulation. **Ce calendrier n'est pas actif ni activable dans le nouveau profil Atterrissage forcé.** Cliquez sur sa lettre à droite : vous pouvez **accueillir**, **refuser** ou **décider plus tard**. La demande dure une journée ; la fenêtre ne met pas le jeu en pause. Sans réponse, le voyageur poursuit sa route.

Une acceptation fait entrer le colon par une bordure accessible, avec sa chemise. Il apparaît dans les portraits et les tableaux de gestion. Prévoyez un lit, davantage de repas et ses priorités de travail ; il utilise les mêmes règles que les autres colons. Sa meilleure compétence est annoncée avant le choix. Si aucune entrée n’est libre, la demande reste ouverte jusqu’à son échéance.

Refuser donne aux colons hors crise une pensée de −3 pendant six jours ; les refus répétés se cumulent avec un effet décroissant, limité à cinq. L’expiration sans réponse ne donne pas cette pensée. Sur une ancienne partie, cliquez sur **Activer les demandes d’accueil** pour commencer le calendrier sans recréer la carte. La cadence ultérieure de quatre à huit jours et les profils limités sont provisoires ; l’accueil ne comprend pas les visiteurs ni le narrateur complet ; les raids sont un calendrier distinct depuis V68. [Règles et limites](../development/arrivals.md).


## Errance triste (V65)

Une humeur durablement sous 35, 20 ou 5 % augmente le risque de crise ; franchir un seuil ne la déclenche pas immédiatement. Le colon en errance triste cesse ses travaux, libère ses engagements et marche lentement. Le symbole ↝, une alerte et son inspection expliquent son indisponibilité. Impossible de le mobiliser ou de lui imposer un travail pendant la crise. Ses objets portés sont déposés réellement ; si le sol est encombré, ils restent conservés.

Il cherche à manger à 5 % de nourriture, même sous un régime restrictif, et un couchage à 15 % de repos. Une plage Travail empêche encore le sommeil volontaire : ajuster les horaires reste possible. Le sommeil ou une incapacité peuvent terminer la crise plus tôt ; sinon elle dure normalement 16–24 heures de jeu avec récupération aléatoire après 16 heures. Une récupération donne une catharsis +40 pendant trois jours, cumul décroissant limité à cinq. Le décès ne donne pas ce souvenir. Autres crises, arrestation et interactions sociales ne sont pas encore présentes. [Règles et limites](../development/mental-break.md).

## Comprendre l’humeur (V64)

Dans l’inspection d’un colon, ouvrez **Pensées et humeur** : vous voyez sa valeur actuelle, sa cible et ce qui la compose. La faim, la fatigue, le confort, les loisirs, la douleur et les vêtements usés produisent des causes temporaires liées à la situation. Manger sans table ou du riz cru laisse un souvenir pendant un jour ; bien manger ensuite ne l’efface pas immédiatement.

La cible change avec la situation, mais la jauge évolue progressivement : au plus +12 ou −8 points par heure. Le sommeil et l’inconscience gèlent la jauge ; être à terre tout en restant conscient ne la gèle pas. Retirer réellement une pièce abîmée enlève sa pénalité, sans faire sauter instantanément l’humeur. Les attentes sont encore celles d’un camp à profil fixe, indépendantes de sa richesse. Errance triste ajoutée en V65 ; six traits V69 sont actifs ; autres crises, relations et pensées restent à développer. [Règles et limites](../development/mood.md).


## Habiller et protéger un colon (V63)

Dans le nouveau départ, les trois chemises sont déjà portées ; le gilet pare-balles est au sol. Sélectionnez un colon, puis clic droit sur le vêtement et **Porter**. Il rejoint l’objet et prend le temps de l’enfiler ; la chemise et le gilet peuvent se superposer. Une ancienne pièce incompatible est déposée pendant l’attente. Dans l’inspection **Équipement**, **Retirer** lance aussi une action temporisée ; le vêtement déposé est interdit jusqu’à autorisation.

Le gilet protège le torse/cou, pas les épaules ni les bras ; il ralentit légèrement la marche. La chemise couvre davantage de parties mais protège peu. Un impact peut être dévié, atténué ou traverser ; il use les pièces touchées, jusqu’à destruction. La tenue est visible sur le corps et le portrait. Le filtre **Vêtements** des réserves autorise leur transport. Les anciennes sauvegardes ne reçoivent pas de fournitures supplémentaires.

V90 rend cette boucle plus large : tenue tribale, chemise, pantalon, cache-poussière et parka se fabriquent en tissu ou cuir léger. Chemise et pantalon occupent des zones différentes ; la tenue tribale les remplace, tandis que parka ou cache-poussière se porte par-dessus avec le gilet intermédiaire. Matière, qualité et état modifient protection, isolation, apparence et valeur. [Protection existante](../development/armor.md), [renouvellement V90](../development/apparel-renewal.md).

Dans **Assignations**, choisissez **Tout vêtement** ou **Tenue entretenue**, puis activez le remplacement automatique pour le colon. La seconde politique retire les pièces à 51 % de PV ou moins et cherche un meilleur vêtement dans une réserve accessible. Le colon marche, réserve, retire et enfile réellement les pièces ; il n'échange rien à distance. Un vêtement mis par un ordre manuel **Porter** est forcé et reste en place jusqu'à son retrait manuel ou sa destruction. L'éditeur détaillé des politiques et le bouton séparé pour effacer seulement ce marqueur ne sont pas encore disponibles.

Les vêtements portés subissent aussi un tirage d'usure chaque jour. Ils peuvent finir détruits à zéro PV sans rendre leur matière. Conservez donc des pièces de rechange dans une réserve autorisant **Vêtements**. Le tailleur manuel travaille à demi-vitesse ; l'établi électrique consomme 120 W, travaille à pleine vitesse alimenté et à demi-vitesse hors tension. **Vêtements complexes** ouvre les deux tailleurs et les recettes avancées ; l'emplacement gratuit reste limité à la tenue tribale.

## Dormir sous le feu (V62)

Un impact proche peut réveiller un dormeur, même si la balle manque. L’audition et les murs/portes fermées comptent ; une porte ouverte laisse passer le signal. Le colon réagit ensuite selon **Fuir / Attaquer / Ignorer**, si une menace est visible à sa portée de réaction. Sa sortie du lit reste physique.

Le bruit retarde le prochain sommeil volontaire ; un coup reçu couché retarde aussi le retour au repos médical. Un patient couché mais éveillé ne se lève pas au seul bruit, et un blessé à terre ne devient pas mobile par un réveil. Mobiliser un survivant endormi reste possible. Le journal indique le réveil ; cela ne soigne ni ne restaure le repos. [Règles et limites](../development/disturbance.md).
## Tir libre et réaction au danger (V60)

Un colon mobilisé tire automatiquement sur les ennemis visibles à portée lorsqu’il tient sa position. **Tirer à volonté** dans l’inspection permet de suspendre ou réautoriser ce comportement ; déplacer le colon garde priorité. Un ordre **Tirer sur une cible** reste possible même avec le tir libre désactivé. Couper le tir libre interrompt la préparation en cours ; un ordre explicite recommence sa visée. La récupération après un coup n’est jamais supprimée. Pendant celle-ci, un nouvel ordre civil est encore refusé : redonnez-le une fois la récupération terminée. Au contact, le colon peut toujours se défendre en mêlée.

Dans **Affectations → Réaction hostile**, ou l’inspection d’un civil, choisissez **Fuir**, **Attaquer** ou **Ignorer**. Attaquer engage les menaces proches : avec une arme à feu, depuis la position actuelle et dans 66 % de sa portée ; sans arme à feu, le colon peut approcher une menace dans huit cases. Les ordres de travail imposés restent prioritaires. La seule présence d’un hostile ne réveille pas automatiquement un dormeur ; les impacts et dommages suivent les règles V62 ci-dessus. [Règles et limites](../development/automatic-combat.md).

## Attaquer au corps à corps (V59)

Mobilisez le colon, choisissez **Attaquer au corps à corps**, puis cliquez le personnage ciblé. Le colon rejoint une place accessible et frappe avec ses outils naturels ou son arme. L’ordre peut viser explicitement un allié. Arrêter, déplacer ou démobiliser interrompt l’attaque, mais conserve la récupération entre deux coups. Une cible nouvellement à terre termine l’engagement.

La sentinelle riposte au contact. Les coups peuvent blesser, ralentir ou étourdir ; vue, manipulation, mouvement et compétence Mêlée comptent. Démobilisez les survivants pour leur rendre l’accès aux besoins et soins. Chemise et gilet protègent déjà les zones couvertes ; les plaies peuvent s’infecter. Autres armes et protections restent à venir. Les nouveaux adversaires disposent de l’approche autonome décrite ci-dessous.

## Rencontre armée (V58)

**Rencontre armée** est désormais un scénario de diagnostic, hors du nouveau menu public, sur une carte de 64 × 64 minimum. Les sauvegardes de ce scénario restent chargeables. Ada commence équipée ; un combattant rouge part à distance. Il peut approcher dès qu’il voit une cible, se placer à portée avec du couvert, puis tirer ; sans arme il rejoint le contact. Préparez lits médicaux, médecin et médicaments avant l’approche. « Menace armée · voir » centre la caméra sur elle. Elle tire sur les colons visibles à portée : les blessures, le saignement et le risque de décès sont réels.

Mobilisez un colon équipé puis utilisez **Tirer sur une cible** et cliquez la sentinelle. Après le combat, démobilisez les survivants pour leur permettre de manger, se reposer et soigner. Les blessés à terre sont transportés physiquement vers un lit accessible. Un ennemi conserve son statut jusqu’à son arrivée dans un lit de prison après une capture ; il ne rejoint la colonie qu’au terme du recrutement.

**Affectations → Réaction hostile** propose Fuir (défaut), Attaquer et Ignorer. Un civil éveillé sans ordre imposé fuit une menace visible à moins de huit cases, cherche un refuge puis attend avant de reprendre ses activités. Un ordre direct ou la mobilisation prévaut. Les portes fermées protègent du passage hostile ; une porte ouverte, même interdite à vos colons, peut laisser passer l’ennemi.

**Limites importantes :** les sauvegardes créées avant V61 gardent leur sentinelle fixe ; son mandat est indiqué dans l’inspection. Le nouvel adversaire recherche des cibles visibles et des postes individuels, sans raid, poursuite omnisciente, attaque de porte ni tactique de groupe. Le tir sur un adversaire debout adjacent est refusé ; utilisez la mêlée. Chemise/gilet protègent désormais les parties couvertes ; armures supplémentaires et diplomatie restent absentes. Le nouveau parcours public utilise Atterrissage forcé partiel. [Détails V61](../development/pursuit.md).

## Capturer et recruter — V86 livrée

Préparez une pièce fermée ne touchant pas le bord de la carte, avec un lit accessible. Dans l’inspection du lit, cochez **Pour prisonniers** : tous les lits de cette pièce prennent ce rôle et cessent d’être disponibles aux colons libres. **Usage médical** reste un choix indépendant. Un toit n’est pas requis pour le rôle de prison, mais température, confort et santé continuent de compter.

Sélectionnez un colon démobilisé, faites un clic droit sur un hors-la-loi vivant à terre et choisissez **Capturer**. Le colon doit le rejoindre, le prendre et le porter au lit réservé. Une personne relevée avant la prise ne peut plus être capturée ; le transfert garde blessures, identité et vêtements. Arme et cargaison sont déposées physiquement : un sol encombré peut retarder l’arrivée. L’arrestation d’une personne debout et la mise en file des captures ne sont pas disponibles.

Activez **Médecin** pour traiter blessures et infections, et **Geôlier** dans **Travail** pour secourir et nourrir les captifs, apporter les repas et converser. Gardez un chevet accessible, des médicaments et de vrais aliments. Le prisonnier garde ses besoins et peut mourir d’une blessure ou de faim. Lorsqu’il se rétablit, il marche, mange et dort dans sa pièce ; ses loisirs ne se dégradent pas pendant la détention.

Son inspection permet de choisir le plafond médical et le régime alimentaire. **Le régime limite les aliments apportés par le personnel. Un captif mobile mangeant les aliments déjà présents dans sa pièce ignore cette restriction.** Les colons libres ne viennent pas y prendre leur repas et le transport automatique n’en évacue pas les provisions. Le lit médical garde une réservation temporaire de patient, sans propriétaire permanent.

Choisissez **Soins et nourriture** pour le maintien en détention, **Réduire la résistance** pour négocier sans recruter, ou **Recruter**. La résistance est affichée en points. Les visites du geôlier sont physiques et dépendent notamment de sa compétence Social, de l’humeur et de l’opinion du captif. Deux fins de conversation par jour constituent un maximum ; sommeil, indisponibilité et délai entre visites peuvent en réduire le nombre. Atteindre zéro ne recrute pas au cours de la même visite : en mode Recruter, une conversation ultérieure admissible permet l’entrée dans la colonie, sans tirage de réussite supplémentaire. Aucun délai de recrutement n’est garanti.

Le nouveau colon est la même personne, avec son état de santé, ses compétences et ses vêtements. Attribuez-lui un lit ordinaire, réglez ses priorités dans Travail et adaptez les repas à la nouvelle population. Une porte maintenue ouverte, une obstruction empêchant sa fermeture ou une brèche peut permettre au captif de chercher une sortie ; le passage ordinaire d’un geôlier qui laisse la porte se refermer ne suffit pas. Le captif doit parcourir le trajet jusqu’au bord pour s’évader. Refermer l’accès peut interrompre cette fuite. Les évasions organisées, la libération diplomatique, les captifs à loyauté inébranlable et la vente de personnes restent absents. [Règles et adaptations](../development/prisoners.md), [références vérifiées](../research/prisoners-reference.md).

## Commander un tir

Équipez un colon d’un revolver ou d’un fusil à verrou, sélectionnez-le et **Mobiliser/R**, puis **Tirer sur une cible**. Cliquez le personnage visé sur la carte ; Échap ou clic droit annule le ciblage. Cette commande peut réellement blesser un allié. Une sentinelle existe dans le scénario Rencontre armée ; le camp ordinaire reste paisible.

Le colon termine son pas en cours, vise, tire puis récupère avant de recommencer. Un déplacement ou **Arrêter l’ordre** interrompt la visée ; après une balle partie, la récupération reste obligatoire même en changeant d’ordre ou en démobilisant. Une cible devenue inaccessible, morte ou nouvellement à terre arrête la suite. La balle poursuit son trajet indépendamment du tireur ; couvert, précision, capacités et Tir déterminent le résultat. L’expérience vient du tir admissible, pas seulement d’un coup au but. La compétence est consultable dans Biographie · compétences.

Après un accident, démobilisez les personnes concernées et utilisez Patient/Médecin, un lit médical et les soins déjà disponibles. Le revolver ralentit temporairement un adulte touché, même pendant un pas : la marche reprend ensuite sans saut. Un nouvel impact renouvelle la durée sans cumuler les pénalités. Santé affiche cet effet séparément des blessures. La sentinelle, les réactions automatiques et la mêlée décrites plus haut utilisent ce même combat ; chemise et gilet fournissent déjà une protection partielle. [Périmètre exact](../development/shooting.md).


## Commander les déplacements

Sélectionnez un ou plusieurs colons, puis **Mobiliser** ou **R**. Un clic droit au sol les déplace ; **Maj + clic droit** ajoute un déplacement à la file. Le bouton **Arrêter l’ordre** annule la destination et la file, sans téléportation. **Démobiliser/R** rend leur autonomie aux colons. R sans colon sélectionné conserve le raccourci Récolter.

Les mobilisés ne vont pas travailler, manger ou chercher un lit seuls. Leurs besoins et leur santé continuent : un épuisement peut les faire dormir au sol. Une longue attente sans menace les démobilise automatiquement. Les objets portés sont déposés ; si le sol est saturé, le colon conserve sa cargaison jusqu’à une place libre. Le tir dirigé du revolver est décrit ci-dessus ; la défense automatique du poste et la sentinelle sont décrites plus haut.

## Équiper une arme

Atterrissage forcé possède depuis la révision 3 un revolver, un fusil à verrou et un couteau en plastacier près des réserves initiales. Les anciennes dotations restent conservées. Sélectionnez un colon, puis clic droit sur l'arme et **Équiper**. Il la rejoint avant de la prendre ; s'il possède déjà une arme, il dépose l'ancienne sur un sol libre au contact. L'inspection **Équipement** affiche sa qualité, ses PV et sa cargaison séparée. **Déposer l'arme** prend un court temps sur place. Une arme volontairement déposée est interdite : sélectionnez-la et **Autoriser cette arme** pour permettre le rangement automatique dans une réserve acceptant **Armes**. Équiper directement l'autorise aussi.

Une chute hors lit, la perte de manipulation ou le décès fait tomber l'arme. Une chute dans un lit déjà utilisé la conserve. Si le sol est saturé, le colon garde l'arme désactivée jusqu'à un dépôt possible. Après rétablissement, il peut rejoindre sa propre arme mémorisée ; le bouton **Ne pas récupérer l'arme perdue** annule cette intention. Cette récupération attend les besoins et travaux engagés et ignore l'interdiction de sa propre arme.

Revolver et fusil permettent le tir dirigé et la chasse ; le couteau sert la mêlée, avec coupures et perforations. Les armes à feu ont 100 PV, le couteau en plastacier 280. La file d’équipement, le catalogue complet et les inventaires coloniaux généraux restent à venir ; vêtements V63 décrits plus haut ; la cargaison de travail n'est pas un inventaire. L'arme procédurale est portée à la hanche puis levée vers la cible ; les modèles restent provisoires.


**Médicaments :** les nouvelles colonies disposent de trente doses industrielles. Dans Santé, choisissez le plafond du patient : aucun soin, à sec, plantes, industriel ou meilleur disponible. Le médecin rejoint une pile autorisée, prélève, porte puis travaille ; une dose peut traiter plusieurs plaies. Sans produit accessible, il soigne à sec si autorisé. Activez **Médicaments** dans une réserve pour les ranger. Les anciens sites ne reçoivent pas de stock au chargement. Culture et fabrication médicales restent absentes. [Règles et limites](../development/medicines.md).

**Urgences et priorités :** si le saignement menace la vie avant trois quarts de jour, Patient/Médecin peut passer avant les besoins à la prochaine décision, à condition d’atteindre la meilleure priorité activée. Médecin 2 avec Construction 1 ne suffit pas. Patient passe avant Médecin à égalité ; mettez Médecin devant Patient pour privilégier l’auto-soin autorisé. Le repos au lit est réexaminé périodiquement ; un auto-soin urgent traite une plaie puis réévalue. Les travaux déjà engagés ne sont pas tous annulés automatiquement. [Contrat et limites](../development/urgent-care.md).

**Se soigner :** sélectionnez le colon, cochez **Autoriser les auto-soins** dans Santé et activez Médecin dans Travail. Le clic droit sur ce même colon propose **Se soigner**. Aucun lit requis ; le colon quitte physiquement le lit s’il l’utilisait. Qualité de base réduite à 70 %, sans pénalité de vitesse spécifique. Décocher interrompt sans soin ni XP anticipés. L’option ne force pas une interruption générale des autres activités : [règles et limites](../development/self-tending.md).

**Nourrir un patient de la colonie :** activez Médecin dans Travail et gardez de la nourriture autorisée par le régime du patient. À 26 % ou moins, un médecin prend une portion, la porte au lit et nourrit le blessé sur place. Le clic droit propose aussi **Nourrir**. Le patient peut être incapable ou simplement en récupération médicale ; un dormeur sain ne suffit pas. Pour un prisonnier en V86, cette alimentation assistée revient au **Geôlier**, sous 26 % de faim ; ses traitements restent à Médecin. Interdire les traitements ne lui interdit pas la nourriture. Sauvegarde en cours possible ; file médicale encore absente. [Règles et limites](../development/feeding.md).

**Surveiller une infection après blessure :** une plaie récente peut s’infecter plusieurs heures après l’impact, même si elle a été traitée. **Santé** distingue gravité, immunité et traitement encore actif ; une alerte annonce la déclaration. Activez **Patient**, **Repos au lit** et **Médecin**, préparez un lit accessible, des repas et des médicaments. Les soins ralentissent la maladie mais ne donnent pas instantanément l’immunité : le médecin revient lorsque le traitement peut être renouvelé, en consommant une nouvelle dose. Le repos réel, la faim et la fatigue influencent l’immunité. Une infection peut rester après la cicatrisation ; son aggravation peut rendre inconscient ou tuer. L’immunité complète est suivie d’une convalescence, pas d’une disparition instantanée. Les anciennes plaies chargées depuis V80 ne reçoivent pas de nouveau risque. [Règles et adaptations](../development/infections.md).

**Traiter une blessure :** dans Travail, activez **Patient** pour le blessé et **Médecin** pour le soignant. Le patient rejoint un lit admissible ; le médecin vient au chevet et traite les plaies, une par une à sec ou en groupes avec médicament. Un clic droit du médecin sur un patient couché propose de prioriser les soins selon le plafond du patient. **Repos au lit** permet de récupérer après traitement, même sans dormir. Santé affiche les qualités obtenues et cinq plafonds de soins ; Biographie affiche Médecine. Sauvegarder conserve un soin engagé. Médicaments disponibles en V51 ; files encore absentes ; alimentation assistée livrée en V48. [Règles et limites](../development/tending.md).

**Secourir un blessé :** activez Médecin dans **Travail**. Un colon disponible peut porter une personne à terre vers un lit admissible. Pour prioriser, sélectionnez le sauveteur puis faites un clic droit sur le blessé et choisissez **Secourir**. Dans l’inspection d’un lit, cochez **Usage médical** : ce lit est réservé aux patients et n’a plus de propriétaire ordinaire. Un lit normal libre ou appartenant au patient sert de repli. La sauvegarde conserve un transport engagé. Le secours seul ne soigne pas : les traitements avec ou sans médicament et l’alimentation assistée sont désormais disponibles au lit. Le patient continue à avoir faim. Maj ne met pas encore les secours en file. [Règles et limites](../development/rescue.md).

Si l’alerte **« cargaison à déposer »** apparaît après un effondrement de fatigue, le colon se repose et conserve son objet. Faites transporter une pile voisine par un autre colon vers une réserve libre : dès qu’une case proche se libère, la cargaison peut être déposée. Ce n’est pas un inventaire personnel supplémentaire. [Détails](../development/interrupted-cargo.md).

Sélectionnez un colon puis **Biographie · compétences** dans son inspection pour consulter Construction et Médecine, leurs passions et XP. Le tableau **Travail** affiche niveau et flammes sous Construction et Médecin ; le choix des priorités reste ici. Bâtir et déconstruire enseignent la compétence au contact ; voyager, livrer, poser un toit ou désinstaller un meuble ne donnent pas d’XP. La passion accélère l’apprentissage, pas directement le travail. Les autres compétences et la personnalité restent à développer. [Détails et limites](../development/skills.md).

**Première électricité** : dans **Architecte → Énergie**, placez un générateur à bois (2×2, 100 acier + 2 composants). Après construction, laissez Transport apporter le bois : il produit 1 000 W et consomme 22 bois/jour lorsqu’il est allumé, même avec peu d’appareils. Sa réserve contient au plus 75 bois. Une lampe sur pied, disponible dans **Meubles**, coûte 20 acier et demande 30 W. Climatiseur et cuisinière électrique rejoignent le même réseau. Le démarrage et le délestage sont progressifs ; l’inspection distingue courant reçu, puissance disponible et combustible.

**Conduits et coupures — V85 :** construisez des **Conduits électriques** dans Architecte → Énergie, à raison d’un acier par case. Les segments doivent se toucher par un côté ; un contact diagonal ne suffit pas. Les appareils se raccordent automatiquement à un transmetteur dans un carré de six cases autour de leur ancre. Un raccord valide reste attaché, même si un autre transmetteur devient plus proche. Un conduit peut passer sous un mur, une porte ou un consommateur, mais pas sous un autre transmetteur. Pour retirer seulement un fil sous un mur, sélectionnez la case et utilisez **Déconstruire ce câble** dans sa fiche électrique. L’acier du conduit n’est pas restitué.

Un **Interrupteur électrique** coûte 15 acier et 1 composant. Insérez-le dans la ligne ; un autre chemin de fils peut contourner sa coupure. Dans sa fiche, choisissez **Demander l’arrêt** ou **Demander la mise en marche**. Activez **Tâches élémentaires** dans Travail et gardez un colon civil disponible : il rejoint l’appareil puis effectue le geste. La demande et l’état réel sont affichés séparément ; **Annuler la demande** retire l’intention. Les générateurs à bois, lampes, climatiseurs et cuisinières électriques disposent aussi d’un interrupteur individuel. Le réglage de ravitaillement automatique ne coupe pas le courant. L’arrêt physique d’un générateur suspend sa consommation de bois, mais il continue à relier les fils voisins. La commutation par un colon mobilisé reste absente de cette tranche.

**Stocker et produire au soleil — V85 :** choisissez **Batteries** (400 points) ou **Panneaux solaires** (600 points) dans Recherche et faites travailler un colon au bureau. Ces projets sont indépendants ; changer de projet conserve les progrès. La batterie coûte 70 acier et 2 composants, occupe 1×2 cases orientables et commence vide. Elle stocke au plus **600 watt-jours**, reçoit la moitié de l’énergie excédentaire et perd 5 watt-jours par jour, même emballée. Plusieurs batteries partagent la charge et la décharge ; l’énergie ne s’égalise pas spontanément entre elles. Une réserve presque vide peut maintenir un appareil déjà allumé sans permettre son redémarrage.

Le panneau solaire coûte 100 acier et 3 composants, occupe **4×4 cases** et demande **Construction 6** pour être terminé. Sa production varie de 0 à 1 700 W avec la lumière naturelle ; les cases couvertes diminuent le potentiel. Gardez donc son emprise à ciel ouvert. Les lampes et les ombres décoratives ne changent pas cette production. La batterie peut être désinstallée et transportée entière avec sa charge ; le panneau, le générateur, les conduits et l’interrupteur sont fixes. Batterie et solaire s’isolent par le réseau, sans bouton d’arrêt individuel.

Surveillez la réserve pendant la nuit et gardez une solution de secours pour la cuisine et le froid. Une coupure ne remet ni les ingrédients ni l’âge des aliments à zéro. Le solaire suit la lumière annuelle lorsque le climat est actif. Éoliennes, radiateurs et feux complètent ce réseau en V87 ; toutes les pannes électriques et le catalogue énergétique restent partiels. [Règles électriques et adaptations](../development/power.md).

**Composants industriels** : sur une nouvelle carte, repérez les machines compactées de teinte ocre, inspectez-les puis désignez **Miner**. Chaque case demande 25 coups au profil neutre et fournit deux composants au sol. Activez **Composants** dans une réserve pour les faire transporter ; une pile contient au plus 50 unités. Le compteur à gauche inclut aussi les composants portés. Ils servent notamment à construire le générateur à bois. Vos anciennes cartes sont préservées et ne reçoivent pas de nouveaux gisements au chargement. [Détails et limites](../development/components.md).

**Refroidir une pièce :** Architecte → Température → Refroidisseur passif. Livrez 50 bois ; le bâtiment démarre rempli pour cinq jours. Il rafraîchit au-dessus de 17 °C et consomme du bois même dehors ou quand il fait déjà frais. Transport le recharge automatiquement à 30 % ; son inspection permet de désactiver cet automatisme, et le clic droit d’un colon de le ravitailler manuellement. Vide, il reste en place. Il ne réfrigère pas la nourriture, ne se réinstalle pas et ne restitue aucun bois à la déconstruction.

Le riz et les buissons croissent normalement entre 6 et 42 °C, plus lentement en approchant 0 ou 58 °C, et cessent de croître au-delà. Les nouveaux semis sont suspendus à 0 °C et moins, ou à 58 °C et plus. L’inspection explique ces contraintes et le manque de lumière ; réchauffer une pièce partiellement découverte peut rétablir la croissance. Les parties sous climat V87 suivent aussi les saisons, le gel extérieur, l’obscurité prolongée et le vieillissement biologique.

Le panneau de temps indique la température extérieure. Sélectionner une cellule affiche la température locale de son air. Une enceinte dont moins de 25 % des cases restent découvertes peut retenir la chaleur ; un feu de camp allumé la chauffe jusqu’à 28 °C. Ce plafond ne s'applique pas aux incendies. Portes ouvertes et trous du toit augmentent les échanges. Les denrées vieillissent moins vite entre 0 et 10 °C et cessent de vieillir au gel, sans retrouver leur fraîcheur passée. Le délai affiché suppose la température actuelle constante. Le refroidisseur passif peut rafraîchir une pièce vers 17 °C, sans réfrigérer les aliments. Le cycle quotidien historique ne gèle pas naturellement ; avec le climat V87 adopté, consultez la température et la saison réelles, sans supposer un gel garanti.

Ce guide décrit la version jouable actuelle. Le [bilan fonctionnel](implementation-status.md) distingue les systèmes livrés, partiels et absents.

## Commencer une colonie

Ada, Noé et Mina arrivent sur la carte de **250 × 250 cases** du nouveau menu. Les cases et personnages gardent leurs dimensions : les trajets lointains prennent du temps et la caméra commence près du point d'arrivée. À taille, version de générateur et profil identiques, la même graine redonne le même départ.

La dotation annoncée en tête du guide comprend **300 bois et 50 repas de survie**. Les 12 bois et 18 repas appartiennent au camp pédagogique historique. Les nombres à gauche additionnent les objets au sol et portés ; les matériaux déjà livrés aux chantiers sont comptés séparément. Les anciennes petites parties gardent leur taille, y compris les cartes 32 × 32 ; charger une partie ne l'agrandit pas.

Pour les premiers jours :

1. Mettez en pause et repérez des buissons mûrs ; désignez quelques arbres à abattre.
2. Prévoyez plusieurs cases de réserve, puis trois lits accessibles. Les matériaux doivent être récoltés et livrés avant construction.
3. Ajoutez une table et des tabourets adjacents pour les repas.
4. Semez un petit champ de riz ; continuez la cueillette pendant sa croissance.
5. Construisez un feu, activez Cuisine et réglez une facture de repas simples. Approvisionnez baies/riz et gardez son accès libre.

Les raids sont actifs selon le profil de partie ; les conditions de victoire restent absentes. Les règles suivantes décrivent les interactions présentes, avec leurs adaptations et systèmes manquants.

Les colons peuvent se croiser dans un passage étroit et passer par la case d’un colon occupé ou endormi. Le lit, la place de repas ou le poste reste réservé à son utilisateur : traverser la case ne permet pas de l’utiliser. Les corps peuvent encore se superposer visuellement en 3D ; les portraits permettent de sélectionner chacun. Des clics successifs au même endroit parcourent les personnes superposées puis l’objet au sol ; cela permet notamment d’inspecter un feu ou un meuble masqué par un colon.

## Se repérer dans l’interface

Le compteur FPS reste dans le coin supérieur droit, même en pause ; il indique la cadence du rendu. Les portraits des colons sont en haut ; cliquer dessus centre la caméra et ouvre leur inspection en bas à gauche. Les stocks sont à gauche, les alertes à droite, l'heure et les vitesses en bas à droite. Les onglets de gestion occupent le bas de l'écran : Architecte pour les désignations et constructions, Travail pour les priorités de tous les colons, Horaires pour leurs plages quotidiennes, Affectations pour leurs régimes alimentaires, Historique pour les événements et Menu pour les sauvegardes. Un seul panneau de gestion est ouvert à la fois. Les onglets grisés correspondent aux domaines encore indisponibles.

Sur une fenêtre étroite, la barre des onglets se fait défiler horizontalement. Les panneaux occupent davantage de largeur, tout en conservant leur position dans l'interface.

## Sélection et ordres directs

Cliquez sur un colon pour le sélectionner ; **Maj-clic** ajoute ou retire un membre. Glissez un rectangle avec le bouton gauche : les colons encadrés sont prioritaires, puis les autres personnes, puis la faune si aucune catégorie précédente n'est présente. Maj conserve la sélection précédente. Un double-clic ajoute les êtres équivalents visibles à l'écran, y compris les animaux sauvages de même espèce et statut. Les portraits permettent toujours de choisir précisément un colon ; l'inspection de groupe liste leurs activités. La sélection multiple générale d'objets reste partielle.

Avec **un seul colon sélectionné**, cliquez droit sur un travail désigné pour le prioriser. **Maj** l'ajoute à la file après l'activité actuelle, même si le colon mange ou dort. Le travail est réservé dès l'acceptation. Un ordre direct remplace l'activité en cours ; les besoins continuent de diminuer, mais les pauses ordinaires attendent la fin des ordres et du travail priorisé. L'effondrement reste une urgence. Le bouton **Annuler les ordres directs** les retire sans supprimer les désignations.

Sur un chantier, le colon peut poursuivre dégagement, livraisons puis construction ; au poste de cuisine, il peut poursuivre les factures réalisables. La priorité reste sur la **même case**, indiquée dans l’inspection. Elle s’arrête faute de travail possible ou après douze heures en jeu, sans interrompre le sous-travail déjà commencé. La file explicite passe avant ces suites. Le dernier ordre de ce type remplace la cible maintenue ; un ordre ponctuel de récolte ou rangement ne la remplace pas. **Annuler les ordres directs** retire aussi cette priorité. Un transporteur seul ne devient pas constructeur.

Le métier doit être activé pour accepter un nouvel ordre. Passer ensuite sa priorité à 0 conserve les ordres directs et la priorité sur la cible déjà acceptés : annulez-les explicitement si vous voulez les arrêter. La file accepte au plus 32 travaux en attente et annonce tout refus. Redonner sans Maj un travail déjà en file le démarre immédiatement et remplace les autres ordres. Si un accès disparaît, le colon abandonne l'entrée impossible et le journal l'explique.

Le menu prend actuellement en charge abattage, coupe, récolte, semis sans pile gênante et finition d'un chantier déjà approvisionné et dégagé. Un clic droit sur une pile propose **Transporter vers le stockage**, sur un chantier non approvisionné **Livrer les matériaux**. Maj les ajoute à la même file que les autres travaux. Les quantités annoncées réservent dès acceptation la source et la place de dépôt. Une livraison reste un trajet ; la priorité maintenue permet d’enchaîner les apports admissibles sur ce chantier. Construction ou Transport autorisent la livraison, mais seul Construction permet la finition. Sur un chantier gêné, le menu propose **Couper la plante qui gêne le chantier** ou **Dégager le chantier**. Le constructeur peut les faire sans Collecte/Transport ; un transporteur seul peut déplacer une pile. Un gros tas nécessite plusieurs trajets de dix unités au plus. Sur un feu, **Ravitailler le feu** fonctionne même si le ravitaillement automatique est désactivé et avant son seuil habituel. Il exige Transport et du bois accessible ; le poste est réservé dès l’ajout en file, puis rechargé après transport et service. Désactiver l’automatisme ne supprime pas cet ordre manuel. Sur une cellule à semer encombrée, **Dégager avant de semer** exige Culture, même sans Transport. Sur un feu, **Cuisiner un repas simple** respecte les factures, ingrédients autorisés et rayon ; si le feu est vide, **Ravitailler avant de cuisiner** exige Cuisine et commence par cette recharge, puis peut poursuivre les factures. Maj réserve en file les ingrédients et le poste. Une modification de la facture ou du champ annule les ordres concernés avec conservation des objets portés. Un colon **mobilisé** dispose en plus des ordres de déplacement et d'attaque contextuelle sur hostile ou animal sauvage ; Maj ne met pas encore les attaques en file.

## Vue, lumière et contrôles

Le bouton **Vue : iso**, près de l'heure en bas à droite, passe en **perspective** ; recliquer revient en vue iso (projection orthographique). Le point observé et son échelle sont conservés. La molette zoome, le glissement avec le bouton droit tourne la caméra ; le bouton ⌂ recentre sur les colons. Un changement de vue annule un rectangle en cours de tracé. Le masquage du feuillage reste utile aux angles rasants.

Le soleil, le ciel, les couleurs et les ombres évoluent avec l'heure affichée. La pause arrête ce cycle et un chargement restaure l'éclairage correspondant à la partie. Le départ actuel est à minuit. La nuit garde une lumière bleutée pour permettre l'inspection et la construction.

V87 relie la lumière au calendrier annuel du site adopté et ajoute huit météos de surface avec leurs effets de gameplay . Le périmètre est validé dans les [preuves V87](../history/validation-environment-v87.md). La présentation des précipitations reste partielle. Les anciennes colonies gardent leur cycle historique jusqu'à adoption explicite. Lampes, toits et premiers effets de la lumière sur le travail sont déjà jouables ; cela ne livre pas toutes les conséquences de l'obscurité sur les activités et l'humeur. Arbres, sols et roches gardent une diversité limitée, sans catalogue de biomes complet.

Les rivières forment des cours continus, les rochers pleins des massifs infranchissables et la végétation des groupes. Le départ possède un dégagement et des ressources de premier essai. La carte n'a pas encore de relief navigable ni de ponts. Les massifs peuvent être minés selon les règles ci-dessous.

La convention 3D est de 1 m par case, 1,75 m pour un humain et 2,80 m pour un mur. Les boutons près de l'horloge permettent de couper visuellement les murs ou de masquer le feuillage pour lire la scène. Ces options ne changent ni les obstacles ni les ordres. Le nouveau lit possède une empreinte 1×2 ; les lits d'une ancienne sauvegarde conservent leur emprise 1×1 pour éviter de recouvrir un voisin au chargement.

| Commande |Effet |
|---|---|
| Molette | Zoom |
| Bouton droit maintenu | Rotation de caméra |
| Bouton central maintenu | Déplacement de caméra |
| Flèches | Déplacement de caméra ; utiliser les flèches lorsque les lettres servent aux outils |
| Espace | Pause/reprise |
| 1 / 2 / 3 | Vitesses 1× / 3× / 6× |
| C / R / B / L / X | Abattre / récolter / mur / lit / annuler ; avec un colon sélectionné, R bascule Mobiliser |
| S | Désigner une réserve |
| Q / E avec un meuble orientable | Tourner le meuble |
| Tab / F1 | Ouvrir ou fermer Architecte / Travail |
| Échap | Annuler le rectangle en cours ; sinon fermer le panneau et revenir à l'inspection |
| Ctrl+S | Sauvegarder |

Le déplacement, le travail et la disparition des ressources partagent un court tampon d’affichage. Une pause arrête la simulation immédiatement ; la scène termine les instants déjà confirmés, puis se fige. Les passages entre 1×, 3× et 6× répondent dès confirmation, sans attendre la fin du tampon. Le démarrage et la reprise après une pause entièrement vidée conservent une courte réserve de mouvement.

La mise à jour du décor après récolte utilise désormais un transport moins coûteux ; elle ne modifie ni les durées de travail ni les quantités obtenues. Le contrôle courant sur carte 250×250 ne détecte plus d’immobilité pendant minage/abattage, avec changements répétés de vitesse. Cela reste une mesure sur la machine de développement, pas une garantie pour toute charge ou tout matériel.

Un jour dure dix minutes à vitesse normale (6 000 ticks). Le compteur FPS mesure le rendu ; une simulation chargée peut avancer plus lentement malgré une bonne cadence d’image.

En vue très éloignée, les détails minuscules du décor sont remplacés par des silhouettes plus légères. Le terrain, les obstacles et les ordres restent les mêmes. Le compteur FPS continue de mesurer le rendu, y compris en pause.

Les massifs ont maintenant des sommets et parois irréguliers qui se raccordent entre cases. Ils gardent leurs obstacles au sol. Le minage retire les cases localement, révèle le sol brut et conserve les fragments typés ; les toits naturels restent absents ; perdre un support de toit construit peut désormais blesser les colons ; la couverture construite est disponible.

## Désigner et construire

Ouvrir Architecte, choisir Ordres pour abattre/récolter/annuler, Zones pour le stockage, Structure pour le mur, Meubles pour les lits, tables et tabourets, ou Température pour le feu de camp et le refroidisseur passif. Pour les ordres de terrain et les réserves, **cliquer ou maintenir le bouton gauche et tracer un rectangle**, dans n'importe quel sens. Les cases compatibles sont surlignées ; un compteur distingue les cases retenues et ignorées. Relâcher sur la carte applique l'ensemble. Échap ou clic droit annule le tracé ; changer d'outil ou quitter la fenêtre l'abandonne également. Relâcher au-dessus d'un panneau n'envoie aucun ordre.

L'abattage cible les arbres ; la récolte cible les buissons et cultures récoltables. Les ressources incompatibles, obstacles et ordres déjà présents sont ignorés, avec un bilan après application. Le rectangle crée du travail futur : les matériaux ne sont produits qu'après le travail des colons. Pour les constructions, cliquer sur un sol compatible : un plan peut recouvrir une plante ou une pile d’objets, que les colons dégageront. Roches et bâtiments existants restent refusés ; les réserves suivent les compatibilités du meuble. Le lit et la table occupent deux cases : Q/E ou le bouton Tourner change leur orientation avant placement. Le fantôme indique un placement refusé. Dans Architecte, choisissez **Bois** ou **Acier** avant de placer mur, lit, table, tabouret ou piquet. Le coût affiché suit ce choix ; le feu reste en bois. Les matériaux peuvent manquer au moment de poser un plan ; leur livraison précède le travail de construction. Le type choisi reste visible dans l’inspection, après emballage et réinstallation. Les ouvrages d’anciennes sauvegardes signalés « ancien » gardent leurs coûts historiques.

| Action | Règle actuelle |
|---|---|
| Abattre | Le colon travaille à côté de l'arbre ; toute sa quantité devient une ou plusieurs piles de bois au sol. |
| Récolter | Le buisson reste à 30 % de croissance et dépose ses baies ; récoltable au-dessus de 65 %. |
| Couper les buissons | Le buisson est retiré ; sa récolte éventuelle reste au sol. |
| Construire un mur | 5 bois ou acier, 10 / 14 ticks de travail ; seul le mur terminé bloque le passage. |
| Construire un lit | 45 bois ou acier livrés, 56 / 80 ticks de travail ; empreinte orientée 1×2, attribution à un colon et repos dans le lit. |
| Construire une table | 28 bois ou acier livrés, 53 / 75 ticks de travail ; empreinte orientée 1×2. Plan, cadre et table achevée se traversent ; l’entrée sur le plateau ralentit le colon. |
| Construire un tabouret | 25 bois ou acier livrés, 32 / 45 ticks de travail ; une case, une place de repas à côté d’une table. |
| Construire un feu | 20 bois livrés, 20 ticks de travail ; une case et une place de service orientée devant. |
| Annuler | Retire l'ordre et libère ses engagements ; les matériaux restent localisés au sol. Ne détruit pas un bâtiment achevé. On peut cliquer sur chacune des cases de son empreinte. |

Un arbre prend 100 ticks de travail, un buisson 60, hors déplacement et interruptions. La simulation avance à 6 ticks/seconde depuis V82 à vitesse normale. Les durées de construction indiquées sont bois / acier, converties au pas local avec vitesse neutre. Les valeurs de collecte restent provisoires. V90 tire une qualité de meuble à la finition selon Construction ; les échecs de construction restent absents.

## Meubler et embellir l'habitat — V90

Dans **Architecte → Meubles**, les tables 2×2 et 2×4 augmentent les places de repas sans changer la règle : il faut toujours un siège libre adjacent. La chaise de salle à manger, le fauteuil, la table de chevet et la commode demandent la recherche **Mobilier complexe** (300 points). Les nouveaux Atterrissages forcés révision 5 la connaissent ; une ancienne partie doit la rechercher. Le fauteuil consomme 110 unités d'une seule matière, tissu ou cuir léger : plusieurs piles peuvent approvisionner le même chantier.

Le confort vient du meuble effectivement utilisé. Une chaise proche ne suffit pas. Une table de chevet placée près de la tête du lit et une commode couvrant le lit ajoutent chacune +0,05 à son confort. La qualité du lit ou du siège modifie ce plafond ; la qualité du lit modifie aussi l'efficacité du repos. Désinstaller et réinstaller le meuble conserve matière et qualité.

La beauté visible fait maintenant évoluer un besoin personnel et l'humeur. Meubles, marbre, sols, fleurs, piles, corps et salissures contribuent selon leurs valeurs connues : nettoyer, ranger et meubler change donc réellement le résultat. L'inspection affiche les pensées du colon, mais n'expose pas encore le score et le qualificatif de beauté de la pièce. L'impression Core complète, la richesse et les souvenirs de chambre ou réfectoire restent absents.

Le **pot de fleurs** ne fournit pas une décoration instantanée. Après construction, un colon affecté aux Cultures sème une hémérocalle. Elle exige lumière et température admissibles, grandit en environ 1,5 jour biologique et vieillit ; lorsqu'elle meurt, elle doit être coupée avant le prochain semis. Un pot planté ne peut pas être désinstallé avant cette coupe.

## Poser et retirer un revêtement — V89

Dans **Architecte → Sols**, choisissez un revêtement, puis cliquez ou tracez un rectangle. Les matériaux sont livrés avant le travail de Construction. Les planches demandent **3 bois par case**, sans recherche ; les dalles de granite, calcaire, marbre, grès ou ardoise demandent **4 blocs de la pierre choisie**, **Taille de pierre** et Construction 3 ; les dalles en acier demandent **7 acier**, **Forge** et Construction 3. Dans Recherche, Taille de pierre coûte 300 points et Forge 700. Les nouveaux Atterrissages forcés connaissent déjà Taille de pierre depuis la révision 4 V89 ; les anciennes colonies doivent la rechercher. Cette connaissance ouvre les dalles, sans compléter tout l'arbre technologique.

Un revêtement masque la fertilité du terrain sans effacer celui-ci ni la zone de culture : aucun semis ne pousse à travers le sol construit. **Retirer le sol** rend le terrain sous-jacent utilisable et restitue environ la moitié des matériaux, si une place réelle permet leur dépôt. Pose et retrait sont possibles sous une porte ou un meuble compatible, mais refusés sous un mur ou un climatiseur. Les planches peuvent brûler ; leur reste noirci ne restitue pas de bois. [Contrat des sols](../development/cleanliness.md).

## Déconstruire un ouvrage

Dans **Architecte → Ordres → Déconstruire**, cliquez ou tracez un rectangle sur les bâtiments. L’inspection propose également Déconstruire et Annuler cet ordre. Un meuble de deux cases reste un seul objet. Le bâtiment subsiste jusqu’à la fin du travail ; un colon rejoint une case adjacente et l’enlève par le travail Construction, après les chantiers ordinaires. Le clic droit permet de le prioriser ou de le mettre en file avec Maj.

Environ la moitié du matériau revient **au sol** : un mur de 5 bois rend 2 ou 3 bois ; un lit neuf de 45 acier rend 22 ou 23 acier. Le feu de camp ne rend rien, y compris son combustible. Un meuble utilisé peut attendre la libération de sa réservation. Un lit retiré perd son propriétaire. Un retrait sans place pour ses matériaux attend ; il ne les efface pas.

Annuler conserve le bâtiment. Interrompre remet le travail de retrait à zéro ; sauvegarder/recharger conserve l’action exactement. Déconstruire détruit le meuble. Pour le conserver entier, utilisez Désinstaller ou Réinstaller sur un meuble admissible.

## Répartir le travail

Ouvrir Travail pour régler notamment Collecte, Construction, Transport, Culture et Cuisine ; V89 ajoute Nettoyage, initialement à priorité 3. **1 est la priorité la plus forte, 4 la plus faible, 0 désactive la famille.** Transport approvisionne chantiers et réserves ; Construction peut aussi dégager les piles et apporter ses matériaux même si Transport vaut 0. Le constructeur coupe les plantes gênant son chantier même si Collecte vaut 0. Désactiver Construction n'empêche donc pas un colon dont Transport reste actif d'apporter du bois à un plan. Une modification entre priorités actives s'applique lors du prochain choix de travail ; désactiver une famille interrompt son activité.

Un transporteur réserve une quantité de pile et de la place à destination, se déplace jusqu'à la source, prélève, porte et dépose. Sa cargaison est visible. Deux colons peuvent se partager une pile sans promettre les mêmes unités. La première livraison réelle transforme le plan en cadre. Un constructeur finit seulement quand tous les matériaux sont livrés et que rien ne gêne l’empreinte. Plans et cadres laissent passer, avec un ralentissement à l’entrée dans un cadre. Les piles gênantes sont portées ailleurs et les plantes réellement coupées ; un colon immobile ou une place de repas réservée fait attendre le chantier. Une interruption conserve la progression et les matériaux déjà déposés ; une cargaison abandonnée devient une pile au sol.

Les chemins contournent eau, terrain rocheux et murs. Tables, lits et feux se traversent avec un ralentissement d’entrée ; le colon choisit une case libre pour travailler ou attendre. Le lit reste utilisable pour le sommeil réservé. Passer directement entre deux tables/lits/feux/tabourets ne répète pas le supplément. Le déplacement sur table, lit ou tabouret adapte aussi sa hauteur visuelle. Les colons civils se traversent sans déplacer ceux qui restent sur place ; l'utilisation d'un lit ou d'un poste reste réservée. Inspecter un chantier indique notamment ses livraisons et ce qu'il attend. V58 ajoute le blocage des corps hostiles debout et les permissions de porte ; la navigation tactique complète reste à développer.

Les colons se déplacent dans huit directions. Une diagonale mesure √2 cases et prend proportionnellement plus de temps ; elle ne coupe pas les coins solides. Ils font face au trajet puis à leur travail. Le rendu utilise un petit tampon temporel pour conserver une marche régulière entre les messages du worker. Un retard exceptionnel peut encore arrêter brièvement l’affichage au dernier état connu.

## Organiser les horaires

Ouvrez **Horaires (F2)** : choisissez Libre, Travail ou Sommeil, puis cliquez ou glissez sur les heures d’une ligne. Copier/Coller reproduit une journée sur un autre colon. Un tracé ne traverse pas minuit ; peignez les deux extrémités séparément. Tab parcourt les boutons, Entrée/Espace peint une case et Échap annule le tracé.

Les nouvelles parties prévoient huit heures de sommeil, de 22 h à 6 h. Libre laisse le colon gérer ses besoins et continuer à dormir jusqu’à récupération complète. Travail autorise toujours les repas. Une personne épuisée peut finir par s’effondrer malgré son horaire. La plage Loisirs donne priorité aux activités accessibles ; deux familles sont disponibles, décrites plus bas. Les anciennes sauvegardes gardent leurs anciennes règles de fatigue et des plages libres, indiquées dans le panneau.

## Stocker et transporter

Dans Architecte → Zones → Réserve, choisir les filtres des objets autorisés, une priorité et une capacité, puis cliquer ou tracer un rectangle. Les nouvelles cases reçoivent ces réglages ; **les réserves existantes traversées par le rectangle gardent leurs réglages**. V88 propose une capacité de **500 unités** et une priorité normale de 2 pour les nouvelles réserves, mais chaque objet conserve sa propre limite de pile. Les anciennes réserves restent à leur capacité enregistrée, notamment 75, et refusent l'argent si leur filtre n'a pas été activé. Pour les **réserves**, 4 est la priorité la plus forte : les transporteurs déplacent les objets vers un stockage de meilleure priorité, sans va-et-vient entre réserves équivalentes.

Fermer Architecte et inspecter une case de réserve pour modifier ses filtres, sa priorité ou sa capacité. Appliquer un nouveau filtre invalide les livraisons incompatibles ; les objets déjà présents restent physiques et peuvent être déplacés vers une autre réserve valable. Retirer une réserve supprime sa règle de stockage, sans effacer les objets. Une réserve pleine n'accepte plus de nouvelle quantité.

Un trajet transporte au plus dix unités, limite actuelle du projet. Le rectangle crée plusieurs cases indépendantes ; **les zones nommées à réglages communs ne sont pas encore implémentées**. L'outil Retirer accepte lui aussi un rectangle et conserve tous les objets au sol ou déposés par les porteurs interrompus. Les livraisons aux chantiers peuvent prélever directement une pile au sol ; un passage préalable par une réserve n'est pas obligatoire.

Une case du sol accueille une seule pile : jusqu’à 500 argent, 75 bois ou unités de légumes bruts, dix repas simples ou rations. Des types différents demandent des cases différentes. Une capacité de réserve plus élevée ne relève pas ces limites. Prévoir plusieurs cellules de réserve pour les aliments ; les 50 rations du nouveau départ demandent cinq piles au maximum de dix, et les 18 du camp historique en demandent deux. Les surplus se déposent à proximité, sans être perdus. Une annulation nécessitant un dépôt impossible est refusée. Les étagères ne sont pas encore disponibles.

## Cueillir et abattre

Une récolte mûre donne dix baies dans les nouvelles colonies. Le buisson reste en place à 30 % de croissance ; il redevient récoltable au-dessus de 65 %, avec un rendement réduit tant qu'il n'est pas mûr. Inspectez sa case pour voir croissance, rendement et repos nocturne. Sa croissance avance pendant le jour, plus lentement sur gravier ou terre pauvre historique que sur terre ordinaire. Le site suit son climat annuel et sa météo lorsque V87 est activée ; les anciennes règles sont conservées jusqu’à adoption explicite.

Architecte → Ordres → **Couper les buissons** libère leur case en supprimant la plante. La coupe récupère les baies déjà récoltables ; un buisson immature ne donne rien. Les piles produites restent au sol et peuvent demander un transport avant construction. La récolte et la coupe exigent toujours un colon au contact et du travail.

## Cultiver et diversifier les champs

Dans **Architecte → Zones → Zone de culture**, tracez un champ. Activez **Culture** dans le tableau Travail. Les colons dégagent les plantes qui gênent, sèment sans consommer de graines, puis récoltent automatiquement le riz mûr. Il pousse plus lentement sur gravier ou terre pauvre historique que sur terre ordinaire, s’arrête la nuit et donne six unités par plant mûr. La date de récolte dépend du sol, du moment du semis et, sous climat V87, de la saison et de la température : prévoyez des repas ou de la cueillette pendant l’attente. La durée biologique annoncée ne constitue pas un délai calendaire garanti.

Inspectez une cellule du champ pour choisir **Riz** ou **Coton**, ainsi que **Pommes de terre** ou **Maïs** depuis V84, puis cliquez **Appliquer les réglages de culture**. Le coton produit directement dix tissus par plant mûr. Il met environ dix-neuf jours dans notre site actuel, davantage sur gravier ou terre pauvre historique : ne remplacez pas tout votre potager. Les tissus ne se mangent pas ; activez **Textiles** dans les réserves pour les ranger (75 par pile). Ils ne pourrissent pas. Avec **60 tissus**, vous pouvez désormais confectionner une tenue tribale sur un emplacement d’artisanat. Changer le choix conserve les plants présents : autoriser leur coupe permet de les remplacer physiquement ; la désactiver les protège.

**Diversification V84 :** les pommes de terre supportent mieux une faible fertilité que le riz, avec onze unités par plant mûr. Le maïs pousse plus longtemps et donne vingt-deux unités à maturité. Leurs durées biologiques de 5,8 et 11,3 jours supposent des conditions continuellement favorables : nuit, température, sol, semis et trajets allongent le délai réel. Gardez une culture rapide et des provisions pendant cette attente. Un maïs semé après une première récolte de riz peut encore être immature à J24 ; ce n’est pas une raison d’accélérer sa croissance. [Règles des cultures](../development/food-crops.md).

Inspectez une cellule du champ pour autoriser les semis et la coupe des plantes indésirables. Désactiver les semis conserve la récolte du riz mûr. Retirer la zone conserve les plants déjà semés. Un ordre manuel Récolter fonctionne au-dessus de 65 % de croissance, avec un rendement réduit. Couper les plantes libère leur case.

Prévoyez plusieurs cellules de réserve alimentaire : baies, repas et riz sont des objets différents qui ne partagent pas une même pile au sol. Le cultivateur déplace les piles gênantes hors du champ avant de semer, même sans réserve et avec Transport désactivé. Si aucun sol de dépôt n’est disponible, il attend. Plusieurs trajets peuvent être nécessaires. Ces objets pourront ensuite être transportés vers vos réserves.

Les colons peuvent manger le riz cru : 0,05 nutrition par unité, avec un souvenir −7 humeur pendant un jour. Le repas simple utilise dix unités admises de riz, baies ou viande ; V84 ajoute pommes de terre et maïs, seuls ou mélangés, au feu ou sur une cuisinière. Les denrées peuvent pourrir. V89 ajoute un risque à l’ingestion crue et une contamination possible des repas préparés, distincts de leur fraîcheur. Riz, coton, pommes de terre et maïs sont livrés ; les arbres, sols et buissons génériques ne constituent toujours pas un catalogue complet des espèces et biomes.

## Préparer des repas au feu

Construisez un **feu de camp** dans Architecte → Température : vingt bois doivent être livrés. Il démarre rempli et brûle dix bois par jour. L’inspection indique son combustible et permet de désactiver son ravitaillement automatique. Le feu vide reste en place et ne permet plus de cuire. Il éclaire localement et chauffe une pièce retenant son air jusqu’à 28 °C.

Activez **Cuisine** dans Travail, puis inspectez le feu et ajoutez une facture « repas simple ». Choisissez un nombre de fabrications, un stock cible ou une répétition sans limite. Le détail permet d’autoriser baies, riz et viande, ainsi que pommes de terre/maïs en V84, limiter le rayon de recherche et choisir rangement ou dépôt au sol. Cliquez **Appliquer la facture** après modification. Les flèches ordonnent les factures ; une facture suspendue ou impossible laisse passer la suivante.

Le cuisinier rassemble dix unités admises, les porte au poste puis travaille avant de créer un repas à 0,9 nutrition. Gardez libre la case de service devant le feu et prévoyez des réserves pour les repas, distinctes des piles de riz/baies. Le mode « jusqu’à X » compte les repas stockés et portés ; ceux posés au sol hors réserve ne suffisent pas à maintenir ce seuil.

L’inspection du colon indique collecte des ingrédients, progression de cuisson ou livraison du repas. Chaque facture explique ses blocages connus : Cuisine désactivée, combustible, ingrédients admis dans le rayon ou place de travail obstruée. Si assez d’ingrédients sont présents, vérifiez aussi les chemins et les cases libres autour du poste ; le compteur ne garantit pas leur accès.

Un cuisinier peut ravitailler son feu vide même avec Transport désactivé. Interrompre une préparation conserve les ingrédients, mais son travail partiel recommence ; sauvegarder puis recharger conserve au contraire le travail actif. Cuisine, capacités et milieu influencent déjà le travail ; recettes avancées et préparation en lots restent à développer. L’intoxication V89 est décrite ci-dessous.

## Cuisinières et table de boucherie — V84

Dans **Architecte → Production**, la **Cuisinière à bois** coûte **80 acier** et la **Cuisinière électrique** **80 acier et 2 composants**, avec **Construction 4** pour finir cette dernière. Les postes occupent **3 × 1 cases** ; tournez-les avant placement et gardez libre leur place de travail devant le centre. Inspectez ensuite le poste pour ajouter et régler ses factures. Les ingrédients sont réellement transportés sur sa surface : trois cases ne forment pas un stockage illimité.

La cuisinière à bois est **vide après construction**. Laissez Cuisine ou Transport apporter le bois ; sa réserve peut contenir 50 unités. Elle ne brûle ce combustible que pendant la préparation, et peut être rechargée sans affecter le cuisinier à Transport. La cuisinière électrique demande **350 W tant qu’elle est alimentée**, même au repos. Le réseau de conduits relie générateurs et batteries aux appareils ; surveillez sa puissance disponible et sa réserve. Une panne de bois ou de courant bloque la préparation sans effacer les ingrédients. Ces postes chauffent leur pièce mais ne constituent pas une lampe : l’éclairage réel de la place du cuisinier compte.

La **Table de boucherie en bois** coûte **95 bois**. Elle utilise Cuisine et les factures de dépouille déjà disponibles. Son rendement de poste vaut 100 % contre 70 % sur l’emplacement gratuit ; blessures de l’animal, capacités du travailleur et arrondis restent appliqués. Une facture ne crée aucune dépouille : il faut chasser, puis apporter un corps encore utilisable. Gardez une réserve de dépouilles séparée des aliments. La cuisinière et la table peuvent être désinstallées, transportées puis réinstallées entières avec leurs factures.

Couvrez les réserves et les ateliers avec des supports construits. **Un toit ne réfrigère pas les aliments** : vérifiez la température réelle et utilisez le climatiseur si vous aménagez une chambre froide. Cuisiner progressivement évite d’immobiliser toute une récolte dans des repas plus périssables. V89 relie les traces et les sols au score de propreté, puis à la contamination lors de la cuisine. Le seul rôle affiché « Cuisine » ne prouve pas que la pièce est propre. [Contrat et limites des postes](../development/food-workstations.md).

## Nourriture, repos et humeur

### Garder la cuisine propre — V89

Inspectez la **propreté de la pièce**, plutôt que son seul rôle. Le score tient compte des terrains ou revêtements, des traces présentes et de certains meubles : une table de boucherie salit la pièce où elle se trouve. Bois et pierre donnent une contribution de sol neutre ; l'acier donne +0,2. Ce n'est pas une garantie contre l'intoxication. L'extérieur et une porte seule n'ont pas de score de pièce ; cuisiner dehors conserve un risque propre à cet emplacement.

Terre, déchets, sang, cendres, vomi et bile de dépouille sont des traces physiques. Dans **Travail**, affectez un colon à **Nettoyage** et placez la surface dans le **Foyer**. Pour une intervention précise, inspectez une case de la pièce, choisissez un colon dans « Nettoyer avec », puis cliquez **Nettoyer cette pièce**. Cet ordre reste limité aux traces du foyer accessibles : le colon se déplace et travaille couche après couche. L'épaisseur allonge le nettoyage, mais ne multiplie pas la contribution de saleté de la même trace. [Propreté et sols](../development/cleanliness.md).

À la finition d'un repas, le risque dû à la pièce est évalué avant celui lié à Cuisine. Un repas contaminé reste contaminé au froid et pendant le transport ; mélanger deux piles conserve une fraction pondérée. Les baies, riz, pommes de terre, maïs et viande crue peuvent aussi intoxiquer un humain. La maladie ne commence qu'après une ingestion réellement achevée. Récit d'aventure multiplie ce risque d'ingestion par 0,75, sans réduire les chances de contamination à la cuisson. La fraîcheur et la contamination sont deux propriétés distinctes ; ni nettoyer après cuisson, ni réfrigérer un repas ne le désinfecte.

**Santé** distingue les phases initiale, majeure et de récupération. L'intoxication réduit plusieurs capacités, ajoute de la douleur et peut provoquer des vomissements qui interrompent l'activité, salissent le sol et font perdre une partie de la satiété. Un épisode engagé doit se terminer avant de donner un nouvel ordre à cette personne, y compris une mobilisation ; ses possessions restent conservées. La maladie recule progressivement, en environ une journée sans nouvelle exposition. Aucun médicament ni traitement de plaie ne la guérit ; les autres blessures restent soignables. Une personne déjà fragile peut subir une incapacité ou une défaillance par la combinaison des affections. Maintenez nourriture accessible et entretien réel ; aucune date de guérison individuelle n'est garantie. Les lièvres peuvent subir la contamination d'un repas préparé, sans le risque humain propre à l'aliment cru. [Contrat alimentaire](../development/food-poisoning.md).

### Repas et repos ordinaires

Une valeur de nourriture élevée signifie que le colon est rassasié. À 30 ou moins, il réserve une portion accessible, marche jusqu'à la nourriture puis la prend en main. Après prélèvement, il cherche une place disponible avec tabouret adjacent à une table, à 32 cases au plus de sa position actuelle. Il y transporte sa portion et s’assied. Sans siège accessible, il mange debout à proximité. Il mange pendant 50 ticks : la portion reste physique jusqu'à la fin, puis est consommée : cinq points par baie ou 90 par ration, avec une jauge plafonnée à 100. Un obstacle peut empêcher le repas ; réserver ou porter ne satisfait jamais la faim. Une interruption dépose la portion intacte là où se trouve le colon. À 20 ou moins sans repas accessible, il abandonne les travaux non vitaux et peut récolter les baies désignées. Le nouveau départ et Trois survivants commencent avec 50 repas de survie, le camp pédagogique avec 18 ; les buissons donnent des baies. La quantité de baies prélevée dépend de la faim et du stock disponible. L'interface distingue leurs quantités et la nutrition totale. Les repas simples peuvent être cuisinés au feu de camp. Les régimes d’Affectations filtrent les aliments ; le risque alimentaire V89 est évalué seulement à la fin de l’ingestion. Les anciennes parties conservent des « Portions historiques » à 35 points et leur ancien rythme de faim. Un repas terminé sans plateau adjacent laisse un souvenir de −3 humeur pendant une journée ; il se renouvelle sans se cumuler. Manger ensuite à table ne supprime pas le souvenir déjà présent.

Sous 30 de repos en plage Libre, ou sous 75 en plage Sommeil, le colon termine son travail engagé puis rejoint son lit accessible ou s’attribue un lit libre. Une plage Travail empêche le départ volontaire au lit et réveille un dormeur ayant au moins 20 de repos. La réservation est exclusive et le sommeil commence une fois arrivé ; le personnage est allongé sur le matelas dans son orientation réelle. Inspecter un lit permet de modifier son propriétaire. Sans couchage utilisable, il dort au sol ; l'épuisement peut aussi interrompre le trajet. Il se réveille une fois reposé à 100, ou pour une faim critique si une portion accessible existe. Il doit se lever pour manger seul ; un médecin peut nourrir un patient couché selon les règles V48. Un lit voisin ne donne aucun bonus. Le confort augmente progressivement pendant l’utilisation du lit ou d’un tabouret, jusqu’au plafond du meuble, puis baisse en dehors de son utilisation. L’humeur évolue vers une cible expliquée par les premières pensées V64 ; V65 ajoute l’errance triste. Relations, autres crises et pensées restent partielles ou absentes.

Les personnages provisoires possèdent des animations de marche, travail, ingestion debout/assise et sommeil calculées sur le GPU. Le profil adulte consomme au rythme de base de 1,6 nutrition/jour, réduit sous les seuils de faim ; traits alimentaires absents, capacités physiques et blessures intégrées V45. Voir [les aliments](../development/food-items.md) et le [catalogue de contenu](content-catalogue.md).

Les colons choisissent les aliments accessibles en tenant compte du goût et de la distance. Des baies fraîches proches peuvent être préférées à une ration de survie ; le riz cru est moins apprécié, mais reste consommé lorsque les alternatives sont trop loin ou inaccessibles. Un aliment qui va pourrir dans moins d’une demi-journée bénéficie d’une préférence supplémentaire, tout en tenant compte du trajet. Les autorisations du régime sont appliquées avant ces préférences, y compris si la faim devient critique.

## Faim prolongée et malnutrition — V84

À nourriture nulle, les humains et les lièvres développent progressivement une **malnutrition**, visible dans Santé. Elle augmente l’appétit et réduit la conscience ; elle peut entraîner une incapacité puis la mort. Un repas doit être réellement ingéré pour inverser sa progression : réserver ou porter des aliments ne soigne pas, et les symptômes ne disparaissent pas aussitôt après une bouchée.

Si un colon ne peut plus manger seul, utilisez les secours et **Nourrir un patient** avec un médecin disponible, un accès réel et un aliment autorisé par le régime du patient. La malnutrition ne se traite pas avec un médicament. À faim nulle, les blessures ne cicatrisent pas ; elles recommencent à guérir une fois la nourriture positive, même si la malnutrition n’est pas encore entièrement résorbée. Aucun soin vétérinaire n’est ajouté : surveillez les aliments accessibles aux animaux avant leur incapacité. [Règles médicales](../development/malnutrition.md).

## Régimes alimentaires

Ouvrez **Affectations (F3)** et choisissez un régime pour chaque colon. « Gérer les régimes alimentaires » permet de créer, dupliquer, renommer et cocher les aliments autorisés ; cliquez sur Appliquer. Modifier un régime agit sur tous ses utilisateurs. Pour le supprimer, affectez d’abord un autre régime à ses colons.

« Sans restriction » autorise tout le catalogue actuel ; « Repas uniquement » autorise les repas préparés, rations et portions historiques ; « Sans rations » permet de conserver les repas de survie ; « Rien » interdit de choisir toute nouvelle portion. Ces préréglages locaux couvrent uniquement les aliments présents. Un colon ne contourne pas automatiquement un régime qui l’empêche de manger, même à faim zéro. Le tableau signale ce blocage ; réautorisez un aliment ou approvisionnez un aliment permis.

Un repas déjà engagé peut être terminé après le changement. Transport et ingrédients des factures restent indépendants : le cuisinier peut préparer un repas qu’il n’est pas autorisé à manger. Aucun inventaire personnel de nourriture ni filtre de provenance des ingrédients n’est encore disponible.

## Conserver la nourriture

À une température de 10 °C ou plus, les baies se gardent 14 jours, le riz 40 jours et les repas simples 4 jours. V84 ajoute 30 jours pour les pommes de terre et 60 pour le maïs. Inspectez une pile pour voir le temps restant. Les rations de survie ne pourrissent pas.

Transporter ou fractionner conserve la fraîcheur ; mélanger des unités du même aliment produit un âge moyen pondéré. Une nourriture pourrie disparaît, y compris dans les mains d’un colon. La faim n’est pas satisfaite si cela arrive avant la fin du repas. Un ingrédient perdu interrompt la cuisine ; les autres restent physiques. Évitez de cuire une énorme réserve : le mode « jusqu’à X » permet de renouveler progressivement les repas.

Sans adoption V87, une ancienne partie conserve son cycle quotidien tempéré ; les canicules V74 dépendent des calendriers historiques et ne sont pas programmées par le nouveau profil. Le climatiseur V75 permet une réserve froide et expose les personnes à l’hypothermie ; la toiture seule ne réfrigère pas les aliments. Les anciennes sauvegardes démarrent leurs aliments frais au tick chargé, faute d’âge historique ; les nouvelles sauvegardes conservent leur âge réel.

## Sauvegarder et reprendre

Menu → Sauvegarder conserve le monde, les travaux, les réservations, les trajets et les besoins dans un emplacement local à ce navigateur. Depuis l’accueil, **Charger** propose la sauvegarde manuelle et la colonie précédente. Le chargement accepté ouvre la partie en pause ; une sauvegarde invalide est refusée sans remplacer la colonie active. La vitesse et l'angle de caméra ne font pas partie de la sauvegarde. Il n'y a pas encore d'autosauvegarde ni d'export de fichier.

Avant de créer ou de charger une autre colonie, le jeu conserve aussi l'état courant dans un emplacement « Colonie précédente », distinct de la sauvegarde manuelle. Cette copie contient la dernière colonie remplacée, pas tout l'historique des colonies. La création est refusée si cette copie ne peut pas être enregistrée. Les anciennes sauvegardes gardent leurs dimensions, leur terrain et leurs ressources ; leur ancien stock global, lorsqu'il existe, est converti en piles et leurs matériaux réservés sont localisés aux chantiers. Les nouvelles sauvegardes conservent également les cargaisons et les réserves. Créer ou charger un grand territoire prépare toute sa carte ; la durée de cette opération dépend de l'appareil.

## Limites et suite

Riz, coton, pommes de terre et maïs sont livrés. Le candidat V90 ajoute cinq familles vestimentaires en tissu ou cuir ; restent absents les autres cultures, les autres vêtements et matières, les armures fabriquées, autres postes et recettes culinaires avancées au-delà des ajouts V84, autres minerais que l’acier et les machines compactées, autres familles de loisirs, autres espèces animales, catalogue complet d’armes, combat complet, médecine complète, relations familiales/amoureuses, autres interactions sociales et traits, arbre de recherche complet, commerce au-delà du petit visiteur, autres producteurs électriques et pannes électriques généralisées, toit naturel, gelures localisées, carte du monde ou narrateur complet. Les lièvres et la cadence Cassandra partielle sont présents ; les autres espèces et la sélection complète d’incidents restent absentes. Les autres profils de déplacement, les réserves à plusieurs cases partageant une politique, les autres familles sélectionnables, les fournisseurs supplémentaires de travail lié sur une case et les tournées logistiques restent à développer. Les modèles sont provisoires ; la congestion entre agents actifs et la calibration des besoins restent ouvertes. V84 ajoute les conséquences médicales et mortelles de la faim. V89 relie intoxication, salissures et nettoyage, avec sept sols et les sépultures ; cela ne livre ni hôpital complet, ni toutes les maladies, ni deuil social. V85 livre conduits, batteries, solaire et interrupteurs civils dans le périmètre décrit plus haut. V86 livre la captivité et le recrutement décrits ici ; la diplomatie, les évasions organisées et une population narrative complète restent absentes. V87 ajoute saisons et survie végétale, huit météos de surface, éolienne, radiateur et incendies/extinction ; autres climats, neige accumulée et catalogue complet de risques restent ouverts.

La suite est suivie dans [le plan de développement](../ROADMAP.md). Les détails de la référence et les futures interactions sont dans [la matrice des systèmes](systems-matrix.md).

Revolver, fusil, couteau, gilet et vêtements du candidat V90 ont une première présentation partagée carte/portrait ; le reste du catalogue et les portraits définitifs restent prévus. Les modèles sont provisoires ; les sols, roches, plantes et biomes génériques ne constituent pas un catalogue complet. Consultez l’[inventaire des systèmes](implementation-status.md), le [catalogue](content-catalogue.md) et les [écarts assumés](decisions.md).

## Prendre le temps de se divertir

Dans **Architecte → Loisirs**, placer un piquet de fers à cheval : dix bois doivent être livrés et l’ouvrage construit. Les douze cases indiquées autour sont à cinq cellules du piquet. Jaune signifie place géométriquement libre avec vue dégagée ; un colon doit encore pouvoir la rejoindre. Trois colons peuvent jouer, chacun à sa place réservée. Un mur coupe le lancer, une table entre le joueur et le piquet ne coupe pas sa vue.

Sans installation, les colons peuvent rejoindre un emplacement du voisinage et s’allonger pour observer le ciel. Ce loisir appartient à la détente solitaire, les fers à cheval à la dextérité. Multiplier les piquets ne crée pas une nouvelle famille. La météo et les pièces ne modifient pas encore ces activités.

Dans **Horaires**, la plage Loisirs cherche une activité sous 95 % de satisfaction ; Libre sous 35 %. Le colon finit son travail engagé et satisfait ses besoins prioritaires. Il ne gagne rien en chemin. Pendant les premières deux heures de jeu, les loisirs ne démarrent pas. L’inspection montre satisfaction, effet d’humeur et lassitude de chaque famille : au-dessus de 50 %, le colon cesse de choisir cette famille jusqu’à ce qu’elle retombe sous 30 %. Sommeil et variété l’aident à conserver une journée équilibrée ; dormir ne fait toutefois pas baisser la lassitude. Les attentes restent celles d’un petit camp, sans calcul de richesse.

## Construire dans une réserve

Vous pouvez poser un plan dans une réserve. Mur, lit et table retirent les cellules couvertes de la zone, mais laissent les objets présents. Les transporteurs concernés déposent leur cargaison ; si aucun dépôt conservatif n’est possible, le plan est refusé. Annuler le plan ne rétablit pas la réserve.

La table conserve une pile déjà présente, affichée sur son plateau, mais n’accepte pas de zone de stockage. Tabouret et piquet peuvent garder une réserve utilisable. Le feu peut recouvrir son tracé, mais aucun objet ne sera rangé sur sa cellule ; le combustible utilise l’ordre de ravitaillement. Murs, lits et feux attendent le déplacement des piles gênantes. La table se traverse mais ne sert pas de poste de travail ou de repos. Après interruption pendant une traversée, le colon finit son arête puis rejoint une case admissible ; il ne se téléporte pas.

## Déplacer un meuble entier

Inspectez un lit, une table, un siège, un meuble de chambre, un pot vide ou un piquet et cliquez sur **Réinstaller**. Choisissez sa nouvelle case ; **Q/E** tourne son empreinte. Un bâtisseur dégage si nécessaire l’emplacement, rejoint le meuble, le retire, le porte puis le pose. Il ne consomme pas de nouvelle matière et conserve sa qualité. Le propriétaire du lit reste le même, mais le couchage est indisponible pendant le déplacement. Un meuble occupé attend la fin de son usage ; un pot planté attend d'abord la coupe physique de sa fleur.

**Désinstaller**, dans l’inspection ou Architecte → Ordres, dépose un paquet au sol. Sélectionnez ce paquet puis **Installer** pour le remettre en service. Si un colon masque sa sélection, cliquez successivement au même endroit pour atteindre l’inspection de la cellule. Un paquet posé sur un meuble compatible reste la cible du bouton Installer ; Désinstaller concerne le meuble déjà présent. Annulez un déplacement sur son plan ou sur son meuble source encore présent : si le meuble est déjà porté, il est déposé entier ; faute de place, l’annulation est refusée. Sauvegarde et rechargement conservent le portage.

Mur et feu ne sont pas déplaçables de cette façon. Désinstaller séparément relève de Construction ; réinstaller peut être effectué par Construction ou Transport. Dans les réglages de réserve, cochez **Meubles emballés** pour les ranger automatiquement. Un paquet occupe une case entière. Le clic droit permet de prioriser son transport et Maj de le mettre en file. Les réserves de même priorité ne provoquent pas de déplacement ; une priorité supérieure attire le paquet. Les anciennes réserves gardent leurs filtres : activez cette nouvelle catégorie pour les meubles.

Un constructeur ou cultivateur dégage à proximité un paquet qui gêne son chantier ou semis, même sans Transport ordinaire. Le rangement vers une réserve est ensuite une tâche séparée. Annuler le parent ou rendre la destination incompatible libère ce transport et dépose le paquet conservé, si une place est disponible. Table, tabouret et piquet peuvent garder un objet compatible sur leur cellule.

## Reconnaître les roches

Une nouvelle carte répartit les massifs et pierres voisines en régions de granite, calcaire, marbre, grès ou ardoise. Sélectionner leur case affiche le type. Un ancien massif peut afficher « type historique non défini » : le chargement préserve sa carte. Les massifs sont exploitables par le minage décrit ci-dessous. Les petites pierres décoratives ne sont pas encore transportables ; les blocs taillés au poste servent aux constructions admissibles décrites plus bas.

## Miner et ranger les fragments

Dans **Architecte → Ordres**, choisir **Miner** (M), puis cliquer ou tracer sur les massifs. Activer **Minage** dans Travail. Le colon rejoint la roche, lui fait face et frappe ; ses PV sont inspectables et les dégâts restent acquis après annulation. Un massif extrait découvre un sol rocheux non fertile. Il laisse un fragment de la même roche dans 25 % des cas, sans donner directement des blocs de construction.

Créer une réserve avec **Fragments de roche** autorisés, puis désigner les fragments via **Transporter les fragments** dans Ordres. Un fragment occupe une case entière et se porte individuellement ; les types ne fusionnent pas. Le clic droit du colon peut aussi imposer son rangement. Une interruption après prise conserve le fragment mais peut nécessiter une nouvelle désignation. L’atelier de taille peut être construit en V31 ; ses recettes de blocs sont livrées en V32 ; les autres minerais que l’acier et les machines compactées et les toits naturels restent absents.

## Extraire une réserve d’acier

Les **nouvelles colonies** peuvent présenter de l’**acier compacté**, reconnaissable à ses teintes brunes et son inspection. Architecte → Ordres → **Miner** le désigne comme un massif ; le métier Minage doit être actif. Le colon rejoint le gisement, frappe et produit 40 unités d’acier dans la case libérée. Les dégâts restent après annulation et sauvegarde.

Créer une réserve autorisant **Acier** : les transporteurs le rangent automatiquement, sans outil « Transporter les fragments ». Une pile contient au plus 75 unités ; le total apparaît à gauche. Les anciennes réserves refusent ce nouveau matériau jusqu’à modification de leur filtre. Les anciennes cartes conservent leur géologie, sans apparition rétroactive de gisements.

L’acier est extractible, stockable et utilisable pour les constructions à matériau sélectionnable dans Architecte, dont la table de taille V31. Le rendement est encore neutre, les compétences n’étant pas simulées.

## Préparer un atelier de taille

**Architecte → Production → Table de taille de pierre** : choisir Bois (75 bois + 30 acier) ou Acier (105 acier), puis tourner l’emprise 3×1 avec Q/E. Tous les matériaux doivent être livrés avant la finition. Le plateau garde les piles compatibles, mais retire les zones sous son empreinte. Les colons peuvent le franchir, sans s’y arrêter pour une autre activité.

L’inspection permet de désinstaller ou réinstaller l’atelier comme un meuble entier, ou de le déconstruire pour récupérer environ la moitié des matériaux. **La fabrication de blocs est disponible** : activer Artisanat dans Travail puis ajouter une facture dans l’inspection de l’atelier. La taille de pierre reste disponible sans recherche dans ce scénario ; les facteurs de lumière et de pièce sont décrits ci-dessous.

## Tailler et ranger les blocs

La facture générale propose cinq filtres de roche, un rayon, la suspension, la répétition et la destination. Un artisan va chercher un fragment accepté, le porte au plateau, travaille puis range **vingt blocs de la même pierre**. Il n'est pas nécessaire de désigner le fragment au transport. Les fragments historiques non typés sont exclus.

**Faire X fois** compte les fragments taillés ; **Jusqu'à X** compte les blocs stockés ou portés. Attention : cette facture générale compte tous les blocs, même lorsque ses ingrédients sont filtrés sur une seule pierre. Cocher **Blocs de pierre** dans une réserve pour accueillir les produits ; un manque de place conserve la cargaison ou conduit à un dépôt au sol. Une livraison peut remplir plusieurs piles successives.

Clic droit sur le poste avec un colon sélectionné : prioriser la taille ; Maj ajoute en file. Désinstaller/réinstaller l'atelier conserve ses factures. Un atelier déjà réservé attend avant d'être déplacé. Les blocs servent aux constructions décrites ci-dessous ; la lumière et la pièce influencent désormais la vitesse ; la compétence Artisanat ne modifie pas la vitesse de taille. La recherche actuelle débloque seulement la couture.

## Construire avec la pierre

Dans Architecte, mur, lit, table, tabouret et piquet proposent aussi granite, calcaire, marbre, grès et ardoise. Chaque chantier exige les blocs choisis : les autres pierres ne les remplacent pas. La table de taille reste en bois ou acier ; le feu reste en bois.

La construction en pierre demande davantage de travail, le grès moins que les autres pierres disponibles. Un lit en pierre restaure le repos à **90 %** de l’efficacité du lit bois/acier ; l’interface indique ce choix. Déplacer le meuble conserve ce comportement. Déconstruction rend environ la moitié du matériau d’origine, sans transformer la pierre. Résistance, beauté et inflammabilité des ouvrages ne sont pas encore simulées.

## Portes manuelles

Dans **Architecte → Structure → Porte**, choisissez un matériau. Une porte coûte 25 unités et s'oriente selon les murs voisins. Le colon s'arrête au seuil pour l'ouvrir ; le bois est plus rapide que l'acier, lui-même plus rapide que la pierre.

Inspectez-la pour **Maintenir ouverte** après le prochain passage ou **Interdire le passage**, même si elle est ouverte. Retirer le maintien peut attendre un nouveau passage. Les occupants et objets empêchent la fermeture ; dégager ou ranger l'objet libère la porte. Le colon déjà engagé termine son mouvement.

La porte se déconstruit mais ne s'emballe pas. Il faut encore déconstruire un mur avant d'y poser une porte. La toiture construite est disponible ; les murs et portes échangent de la chaleur. Une porte ouverte échange plus rapidement ; fermée, elle conserve une fuite thermique.

Les fragments au sol peuvent être traversés, mais ne servent pas de place pour observer le ciel ou jouer aux fers à cheval. Dégagez la case pour la rendre disponible.

## Inspecter une pièce

Cliquez sur le sol ou un meuble pour lire **Pièce non couverte** et son nombre de cases dans l’inspection, en bas à gauche. Un colon sélectionné indique l’espace de sa cellule. Les murs achevés, roches et portes séparent les pièces ; une porte ouverte reste un seuil. Plans et cadres ne les ferment pas encore. Une brèche latérale peut ouvrir l’espace jusqu’au bord de la carte ; un coin diagonal manquant ne suffit pas.

Le nombre compte le sol intérieur, y compris sous les meubles, sans les murs ni les portes. Ce n’est pas une statistique de confort. La toiture construite est disponible et son compte figure ici. La couverture permet de retenir un air distinct, que le feu peut chauffer. Lumière, extérieur et rôle de pièce influencent les ateliers. Les besoins psychologiques de logement restent à développer.

## Poser ou retirer un toit

Dans **Architecte → Zones**, tracer **Construire un toit**. Les bâtisseurs rejoignent la zone et travaillent sans consommer de matériau. Murs terminés, portes et roches portent le plafond ; il faut une couverture reliée aux supports. Un arbre gênant doit être abattu. Fermer une petite enceinte peut créer automatiquement la zone, mais les colons doivent toujours poser le toit.

**Retirer un toit** commande son retrait et empêche sa repose automatique. **Ignorer le toit** efface les zones sans enlever la couverture. Le bouton **Toits : masqués/visibles** change seulement la vue. L’inspection indique les cases couvertes, indépendamment de ce bouton.

Les plantes cultivées et les baies ne poussent pas sans soleil sous un toit ; les colons cherchent ailleurs pour regarder le ciel. Les pièces ont une température locale et les ateliers tiennent compte de leur milieu. Sous climat V87, les plantes présentes subissent les effets du froid, de l’obscurité prolongée et du vieillissement biologique. Retirer un support peut faire tomber la couverture et blesser les colons dessous. Les dégâts d’effondrement aux objets et les gravats restent absents. Les toits naturels des montagnes ne sont pas présents.

## Éclairer les ateliers

La lumière de gameplay figure dans l’inspection. Un toit coupe la lumière du ciel. Un feu allumé éclaire les cases proches, jusqu’à 50 %, même la nuit ; murs, roches et portes arrêtent cette diffusion. Plusieurs feux ne dépassent pas 50 % : ils ne permettent pas de faire pousser du riz sous un toit.

Éclairez **la place du colon devant le poste**. À 30 % de lumière, sa vitesse de production ne subit plus de pénalité lumineuse ; dans l’obscurité complète, elle tombe à 80 %. La taille demande 160 ticks de travail dans un atelier éclairé, 200 dehors éclairé, 250 dehors dans le noir. Le feu éclairant son cuisinier demande 60 ticks par repas à l’intérieur, 75 dehors.

Le rôle est calculé depuis les meubles : un lit peut transformer un atelier en chambre, plusieurs tables en salle à manger. La taille subit alors une pénalité de mauvaise pièce de 20 %. L’inspection détaille les facteurs ; une petite cour fermée et un auvent ouvert ne sont pas traités de la même manière. Aucun bonus d’humeur de chambre ou de salle à manger n’est encore associé à ces rôles.

Le ciel et les flammes restent stylisés. Les halos sur le décor et l’assombrissement des intérieurs sont visibles aussi en vue coupée ; l’inspection donne les valeurs de gameplay. La lumière module cuisine et taille, ainsi que les travaux et déplacements décrits ci-dessous.

## Voir les intérieurs et les feux

Un feu allumé éclaire le sol, le mobilier et les colons à proximité. Son halo respecte les obstacles lumineux ; une porte ouverte ne transmet pas la lumière du feu dans cette version de référence. Les bâtiments couverts restent sombres sans éclairage, même lorsque **Toits : masqués** permet d’en voir l’intérieur. Couper les murs ne supprime pas non plus leur obstacle logique. Ces réglages fonctionnent en iso et en perspective, sans modifier la colonie.

Les couleurs chaudes servent à lire la scène : consultez l’inspection pour le pourcentage exact et les effets sur la production. Les lampes sur pied utilisent le réseau électrique et ses sources réelles. Le radiateur électrique est disponible en V87 ; les ombres projetées par les feux restent absentes.

## Travailler et circuler dans l’obscurité

La lumière agit aussi sur l’abattage, les récoltes, les semis, les constructions/retraits et les toits : 80 % du rythme dans le noir, retour à 100 % dès 30 % de lumière. Éclairer le colon compte ; éclairer seulement sa cible ne suffit pas. L’inspection indique ce facteur, distinct des autres propriétés encore absentes.

Les mineurs préparent leurs coups plus lentement dans le noir. Les colons marchent aussi plus lentement, y compris pour porter un objet, manger ou rejoindre leur lit. Un coup ou un passage déjà engagé conserve sa cadence ; le suivant prend le nouvel éclairage. Les besoins et quantités produites ne sont pas eux-mêmes réduits de 20 %.


## Blessures et incapacité

Évitez de déconstruire ou miner le dernier appui d’un toit construit sous lequel se trouvent des colons. Retirez d’abord la toiture depuis Architecte. Un effondrement peut causer des lésions, une hémorragie ou une perte de partie corporelle. Sélectionnez le colon : **Santé** affiche ses blessures, sa douleur, son sang perdu et ses principales capacités. Les alertes signalent blessés à terre et saignements.

Une blessure peut ralentir déplacements, travaux et ingestion. Un colon à terre cesse ses actions et conserve sa cargaison si le sol empêche le dépôt. Il reste dans son lit s’il l’utilisait déjà ; sinon un sauveteur peut l’y porter. Les blessures non permanentes guérissent progressivement, avec avantage à la posture allongée et au lit réel ; la famine bloque cette guérison. Les cicatrices et parties perdues persistent. **Traitements à sec ou avec médicament et alimentation assistée sont disponibles** selon les politiques décrites plus haut. Ramper vers un lit reste absent.

Un colon décédé n'agit plus ; son dossier et sa date de décès restent consultables. V89 ajoute le corps physique et sa sépulture décrits ci-dessous. Le coup de chaleur, l'hypothermie, la malnutrition et l'infection de plaie restent des affections distinctes ; l'intoxication alimentaire V89 ne remplace pas leurs soins. Gelures localisées, chirurgie et autres maladies restent à développer.

## Transporter et inhumer les morts — V89

Dans **Architecte → Meubles → Tombe**, placez un ouvrage de deux cases sur un terrain naturel creusable ; Q/E change son orientation. La tombe ne coûte aucune matière ni recherche, mais doit être creusée par un constructeur. Elle accueille un seul corps humain. Son inspection permet d'autoriser les colons et les étrangers, ou d'affecter la tombe à un colon nommé. Cette affectation prime sur les filtres ; retirez-la pour modifier ceux-ci. Une tombe occupée ne se réaffecte pas instantanément.

Activez **Transport**, ou sélectionnez un défunt et utilisez **Inhumer** avec un transporteur et une tombe admissibles. Le colon rejoint le corps, le porte réellement puis l'inhume au contact. Si une interruption ne permet aucun dépôt au sol, il conserve sa cargaison. Vêtements et possessions encore attachées suivent la dépouille ; une arme déjà lâchée reste un objet indépendant. Déconstruire la tombe restitue le même corps quand une place est disponible.

Un corps exposé devient putréfié après 2,5 jours de vieillissement thermique puis desséché après cinq ; le froid ralentit ce vieillissement. Un corps putréfié exposé peut salir les alentours avec de la bile. L'inhumation suspend le vieillissement sans effacer l'âge acquis. La destruction par le feu conserve le dossier historique mais retire le corps et ses possessions encore attachées. Déshabillage volontaire, dégradation extérieure complète, cérémonie et deuil restent absents. [Contrat et limites](../development/burial.md).
