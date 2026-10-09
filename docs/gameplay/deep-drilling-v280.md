# V280 — scanner de sol et forage profond

Schéma215, adoption prospective d’une grille de réserves souterraines initialement vide. La boucle relie deux recherches, deux machines construites avec les vrais matériaux, un chercheur puis un mineur : découvrir un gisement ne fournit aucun objet au stock ; seule l’extraction produit des piles physiques transportables.

## Jouer la chaîne

Après Microélectronique, rechercher **Forage profond** (1000points), puis **Scanner de sol** (1000points), au bureau avancé alimenté. Le scanner3×3 coûte150acier,4composants et1composant avancé, demande Construction8 et700W. Toute son empreinte doit rester sans toit ; une cellule d’interaction extérieure doit être accessible. Affecter un colon au travail Recherche : le scan progresse seulement lorsqu’il travaille au contact.

La découverte suit un intervalle moyen de3jours à vitesse normale, avec garantie après6jours de travail pondérés par la vitesse de recherche. L’inspection affiche l’avancement vers cette garantie, **pas une probabilité cumulée ni un compte à rebours calendaire**. Courant coupé, toit ou absence d’opérateur suspendent le travail.

La foreuse1×1 coûte100acier et2composants, demande Construction4 et200W. Affecter un mineur à sa cellule d’interaction. Elle extrait dans les21cellules proches : première réserve selon l’ordre radial local, portions de45acier,8or,70argent ou10plastacier avant rendement, bornées par le reste disponible. Chaque cellule découverte contient initialement300unités ; quantité souterraine retirée et quantité produite restent distinctes, car le rendement dépend du mineur. Une portion exige un progrès strictement supérieur à10000Core ; vitesse, capacités, lumière, apprentissage et arrondi communs interviennent. Le dépôt réel doit être possible avant consommation de la réserve.

Sans minerai dans sa portée, la foreuse produit un fragment de la roche locale. Elle peut être désinstallée puis repositionnée par le transport mobilier existant. Réserves, progression et flux aléatoires persistent avec la sauvegarde ; l’interruption ne convertit pas un travail partiel en objets. Les coupures, pannes, incendies et priorités de besoins passent par les règles communes.

## Inspection et présentation

Architecte propose les deux machines et leurs ingrédients. Recherche expose les deux prérequis sans nouvel écran. L’inspection électrique décrit courant, opérateur réellement affecté, approche/travail, progression et prochaine cellule de minerai. Les machines ont deux géométries procédurales distinctes, orientées avec leur vraie empreinte ; le colon fait face aux commandes pendant le travail.

La vue souterraine montre uniquement les cellules découvertes encore non vides, lors de la sélection d’un scanner/foreuse ou du placement d’une foreuse, **avec un scanner alimenté sur la carte**. Les quatre matières ont des couleurs distinctes ; la portée de la foreuse sélectionnée accentue les réserves concernées. La grille est une réserve géologique, pas un stock au sol ni une promesse d’accès. Aucun gisement préparé fictif n’est affiché.

## Core et adaptations

Primaires installées Core1.6.4871rev590 : `ThingDefs_Buildings/Buildings_Production.xml:1642`, `Buildings_Misc.xml:325`, `ResearchProjectDefs/ResearchProjects_3_Microelectronics.xml:117,142`, `ThingDefs_Items/Items_Resource_Stuff.xml`, `Stats/Stats_Pawns_WorkGeneral.xml:88`, jobs et WorkGivers. DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, classes fraîches `CompScanner`, `CompDeepScanner`, `JobDriver_OperateScanner`, `DeepResourceGrid`, `GridShapeMaker`, et chaîne CompDeepDrill/driver/utility. Relevés privés : `tmp/deep-drilling-v280-reference/scanner.md` et `kernel.md`. Aucun code propriétaire n’est embarqué.

Horloge10Core/tick, dix sous-pas float32 de travail, contrôle scanner59Core avec phase locale sauvegardable ; XP de base .065Mining et.035Intellectual/Core travaillé, compétences et passions communes. Les gisements irréguliers élaguent les cellules les moins entourées, puis filtrent terrain et bords sans compenser les refus. **Adaptations explicites :** PRNG privé et ordre stable local pour égalités radiales/choix des cellules ; quatre matières déjà livrées, poids renormalisés sans uranium/jade ; terrain local et roche déterministe ; après épuisement, poursuite du forage de roche sans ajout d’un état Core « interdit ». Aucune infestation de forage n’est livrée : le risque Core correspondant reste absent.

## Validation

159 cas uniques dans26fichiers passent par reprises ciblées, dont41nouveaux : catalogue/recherches, grille finie et prospective, portions des quatre minerais, contact et compétences, dépôt saturé atomique, courant/toit/retrait, claims de service et récupération de tir, fichiers/Decoder, archives et horloges, anciennes vues et continuation exacte. Les62sauvegardes publiques passent au chargement ; les65fichiers publics restent inchangés. Groupe initial92,202s :139/143 ; reprises13,810s puis9,043s pour les fixtures historiques et deux omissions des lecteurs pré17 (`orders` encore absent). Dernier groupe forage/frontières26cas9,601s PASS. Les premiers rouges restent conservés sous `tmp/validation-runs/v280-*`. Typage/build final10,245s PASS.

Chromium matériel WebGPU1440×1000, parcours63,531s PASS : désignation UI, livraison des100acier et2composants, construction, scanner opéré et découverte, portion de minerai puis épuisement, désinstallation/réinstallation physique de la même foreuse et production d'un fragment de roche. Sept sauvegardes/rechargements exacts aux ticks3041,3221,3657,4066,4137,4181,4620 ; erreurs vides, navigateur et port5313 possédés fermés. Rapport et captures privés `tmp/deep-drilling-v280-native-fGwM4v/`.

Le contrôle commun de présentation125,346s PASS couvre minage/coupe à changements de vitesse : aucun saut, excès continu de déplacement ou occupation solide observé. Ses sorties restent privées sous `tmp/test-runs/`, sans réécriture des captures historiques.

Scène préparée : recherches achevées, scanner proche de sa garantie de travail et une unité souterraine initiale ; les transitions annoncées sont ensuite réellement jouées. Ce parcours ne démontre pas une campagne naturelle de six jours, les quatre minerais en navigateur ou un gain FPS. Les premiers contrôles natifs rouges (quantité de fixture et panneau Architecte masquant le clic de carte), ainsi que l'essai interrompu sans résultat, restent intacts ; leur reprise ferme réellement le panneau avant désignation et placement.
