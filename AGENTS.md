# Travail sur Lisière

## Intentions persistantes

- Référence : RimWorld de base d'abord, extensions ensuite. Garder ses boucles et interactions par défaut ; documenter chaque simplification et divergence.
- Le corpus utilisateur docs/reference/originals (Documentation_developpement.html, Documentation_developpement.pdf, Referentiel_developpement.xlsx) est notre référence fonctionnelle principale, en complément des recherches antérieures. Avant un chantier, lire ses chapitres et entrées de domaine via docs/research/reference-adoption.md. Orienter le plan vers ses contrats, sans appliquer automatiquement ses architectures, nombres, priorités ou tests. Ses statuts R/P/V ne valent pas validation locale ; une divergence motivée reste possible. Ne pas confondre le comportement actuel du prototype avec la cible.
- Les nouvelles docs définissent le comportement de gameplay par défaut. Toute liberté fonctionnelle doit être connue, motivée et documentée ; la 3D demande une interprétation explicite des volumes et interactions. Les algorithmes internes restent libres : navigation, navmesh, flow fields, compute ou WASM n'ont pas à reproduire les techniques de RimWorld, mais doivent satisfaire nos contrats et budgets mesurés.
- Les interactions élémentaires ne doivent pas être remplacées par des raccourcis de prototype : manger exige accès, prélèvement et ingestion ; dormir utilise un couchage accessible et réservé, avec un repli au sol justifié. Ne pas réintroduire une consommation à distance ou un bonus de lit voisin. Un contenu absent reste explicitement absent, et une calibration provisoire ne constitue pas une parité numérique.
- Conserver la structure et l'organisation de l'interface de RimWorld : colons en haut, ressources à gauche, alertes à droite, inspection en bas à gauche, onglets de gestion en bas, temps en bas à droite. Le style peut évoluer. Ne pas déplacer les priorités hors du tableau Travail ni les constructions hors d'Architecte.
- Échelles et monde : conventions centralisées dans src/world/scale.ts, empreinte de collision cohérente avec le modèle. Génération reproductible avec structures spatiales et accessibilité contrôlées. Voir docs/research/spatial-design.md et docs/development/world-generation.md.
- Dimensions : défaut jouable 250×250 centralisé dans src/sim/map-config.ts ; 32/64/128 sont des tailles compactes ou de fixtures, pas la référence moyenne de RimWorld. Ne pas confondre le défaut 32 de createWorld pour les tests avec celui de l'application. Mesurer génération, simulation, communication et rendu séparément avant d'étendre les bornes ; préserver les dimensions des sauvegardes existantes.
- Étudier et mesurer les techniques de navigation entièrement GPU. Le laboratoire WebGPU est une expérience isolée ; ne pas annoncer qu'il pilote déjà les colons. Préserver les contrats de déterminisme, réservations, révisions et résultats périmés avant intégration.
- Jeu navigateur Three.js/WebGPU, esthétique 3D low poly. Versions stables récentes, vérifiées avant mise à jour, épinglées dans package.json et package-lock.json.
- Personnages animés sur GPU. Éviter AnimationMixer et skeleton.update par personnage et par image. Les futurs assets squelettiques remplacent la présentation, pas la simulation.
- Décor, bâtiments et objets générés en code. Blender MCP seulement lorsque demandé ou serveur annoncé pour une tâche d'asset. Ne pas modifier E:/Code/Antsystem, référence en lecture seule.
- Prendre les décisions ordinaires de mise en œuvre en co-lead, documenter les compromis, mesurer avant d'ajouter de la complexité.
- À chaque livraison de développement, donner dans la réponse un état du gameplay : nouveautés, fonctionnalités déjà jouables, simplifications et grands systèmes non implémentés. Ne pas limiter le bilan aux détails techniques ou aux tests. Cette demande utilisateur est persistante.

## Frontières

- src/sim : simulation déterministe, pas de DOM, de Three, d'horloge réelle ni de Math.random. Sérialiser tout état qui affecte la continuation.
- src/bridge : messages worker, horloge à pas fixe, gestion des erreurs. Les commandes sont ordonnées et acquittées ; le rendu peut sauter des snapshots, pas des commandes.
- src/render : présentation, caméra, interpolation GPU, géométrie procédurale. Aucune modification du World fourni.
- src/navigation-gpu : expérience de recherche et extraction GPU, oracle de validation indépendant ; src/navigation-lab.ts est son interface de diagnostic, pas un système de gameplay.
- src/main.ts et style.css : interface. Afficher les chaînes issues d'une sauvegarde avec textContent.
- Les changements de données persistantes nécessitent une version de schéma et une décision de migration explicite. Une sauvegarde invalide ne remplace jamais l'état courant.

## Qualité et continuité

- Lire docs/README.md pour l’index, docs/ROADMAP.md et les documents du domaine avant modification. Les sources originales sont dans docs/reference/originals ; history contient les preuves historiques, decisions les ADR. Mettre à jour les contrats courants sans empiler des mises à jour contradictoires.
- ROADMAP est l'unique calendrier canonique G0–G5 ; la matrice en reprend les jalons. Les étapes 1–8 et priorités P0/P1 du corpus sont des repères de dépendance, pas un second planning. Les extensions viennent après G5, sauf décision utilisateur ultérieure.
- Pour une règle issue du corpus, conserver chapitre, identifiant SYS/TEST/CONST/UI/STAT/GAP pertinent, provenance et décision (adopter, adapter, différer, vérifier). Les entrées de tests servent à enrichir nos scénarios existants, pas à créer automatiquement une suite par ligne. Les originaux restent préservés ; notre analyse et nos écarts sont dans les documents du projet.
- Peu de scénarios profonds avec résultats métier, invariants et diagnostics reproductibles. Ne jamais annoncer une couverture exhaustive de tous les bugs.
- Choisir les contrôles selon docs/development/testing.md : une couleur n'exige pas toute la suite ; planner, sauvegarde et worker exigent les contrôles de leur contrat.
- Mettre à jour guide joueur pour les règles, architecture pour les décisions, ROADMAP pour l'état, validation pour les preuves. Distinguer livré, testé, proposé et inconnu.
- Ne pas annoncer des performances depuis une capacité de buffer, un commentaire Antsystem ou Chromium logiciel. Conserver matériel, conditions et données de mesure.
- Pas de gros moteur physique, ECS générique, dépendance Rust ou compute de foule sans besoin démontré. Préférer une frontière claire à une abstraction speculative.

## Règles permanentes de développement (2026-09-13)
- À chaque mécanique livrée, refaire une recherche Internet précise : confronter le corpus aux sources récentes, vérifier les cas limites et consigner divergences, version et degré de certitude. Corriger notre documentation et le code si nécessaire ; ne jamais promettre une conformité certaine à 100 %.
- Maintenir un compteur FPS discret toujours visible. Il mesure le rendu réel, indépendamment du temps de simulation.
- Faire de petits audits de performance pendant le développement, avec scénario reproductible, matériel et percentiles. Optimiser les coûts observés sans changer silencieusement les règles de jeu.
- Lots de boîtes V29 : `BoxMesh` garde des attributs instanciés TSL stables ; ne pas réintroduire des uniforms de matrices nommés par ID à chaque croissance. Lire `docs/development/shadow-preparation.md` avant de modifier capacités, préparation ou propriété de leurs buffers. `geometry.instanceCount` pilote le compte graphique, pas `Mesh.count`.
- Extraire une responsabilité cohérente avant d'allonger un module déjà volumineux. La simulation, les poses GPU, les objets de décor et les outils UI gardent des frontières explicites.
- Les commits expliquent le changement, sa validation et un court état du plan global G0–G5. Commit et push autorisés sur le dépôt du projet.

- Entretenir le pilote de colonie `tests/scenarios/colony-player.ts` et ses parcours de plusieurs jours lors des ajouts de gameplay. Il doit développer un camp par les commandes du joueur, contrôler résultats et bilans, et distinguer cohérence interne et fidélité à RimWorld. Le long parcours UI se lance aux changements de boucles/commandes/persistance, pas pour une retouche cosmétique.
- Tenir `docs/gameplay/implementation-status.md` à jour pour les systèmes livrés, partiels et absents ; le résumé conversationnel ne remplace pas cet inventaire. ROADMAP reste le seul calendrier.

## Catalogue et apparence (2026-09-13)
- Mettre à jour docs/gameplay/content-catalogue.md à chaque ajout de contenu ; les 95 familles CAT du corpus ne sont pas un catalogue individuel exhaustif. Une définition présente ne signifie pas que toutes ses recettes, variantes ou règles sont livrées.
- Inventaire personnel, équipement, vêtements et cargaison temporaire sont distincts. Le contrat cible de rendu commun carte/portraits figure dans docs/development/character-presentation.md ; ne pas annoncer ces systèmes déjà implémentés.
- Schéma courant 54 (types alimentaires introduits en V5) : conserver item et quantité lors des transferts. Les nouveaux producteurs alimentaires précisent leur ItemId ; le défaut legacy-portion des helpers sert à la compatibilité et aux anciennes fixtures, jamais aux nouveaux aliments. foodRules distingue explicitement parties historiques et nouveau profil adulte.


## Sol et déplacements (V6)
- V14 autorise le partage des cellules entre colons civils. Lits, repas et postes conservent des réservations d'utilisation distinctes du transit ; un effondrement au sol ne s'approprie pas le service. Valider V13 avec ses anciennes exclusions avant migration, sans déplacer les acteurs. Lire docs/research/civil-traffic-reference.md ; le combat exigera son profil explicite commun à recherche, suivi et validation.
- Une pile d’objets par cellule de sol ; une pile contient plusieurs unités compatibles. Les étagères à plusieurs piles ne sont pas implémentées. Réserver aussi le type de la destination et conserver la matière lorsqu’un dépôt est impossible.
- Navigation CPU pondérée sur huit voisins ; déplacement physique à durée euclidienne, coins solides exclus. L’historique d’arêtes et le tampon de présentation ne sont pas des données autoritaires de simulation. Ne pas réintroduire le lissage relancé par snapshot.
- Faire face au déplacement et à la cible du travail. Corps et cargaison partagent les poses GPU ; l’anneau de sélection suit le même trajet.
- Lire docs/development/spatial-motion-storage.md avant de modifier ces contrats, la migration V5→V6 ou la représentation distante. Le laboratoire de navigation GPU reste indépendant.
- Accès aux candidats et distance sont distincts : le parcours cardinal progressif prouve seulement l'existence sous le contrat de coins ; les routes restent pondérées sur huit voisins. Les deux parcours capturent la même occupation et ne survivent qu'à une décision synchrone. Ne pas partager ces buffers entre colons/ticks ni réutiliser un coût non finalisé.

## Conservation alimentaire (V11)
- Lire docs/development/food-preservation.md avant de modifier les transferts, les âges ou la température. Séparer copie l’âge, fusionner pondère les quantités, produire démarre frais. La pourriture précède les actions ; elle réconcilie les réservations et les pertes cumulées.
- V38 intègre les taux locaux variables : lire aussi docs/development/temperature.md ; un taux change après ancrage de l’ancien intervalle. Les effets du froid, de l’exposition et de l’intoxication ne sont pas livrés par ce contrat.

## Horaires (V12)
- Lire docs/development/schedules.md avant de modifier repos et priorités horaires. Conserver plages, profil de fatigue et état d’épuisement ; une intention ne donne jamais un bonus de besoin. V15 ajoute les plages Loisirs et deux activités physiques ; lire docs/development/recreation.md. Les attentes liées à la richesse restent absentes.

## Régimes alimentaires (V13)
- Lire docs/development/food-policies.md avant de modifier les autorisations ou le choix alimentaire. Régimes partagés filtrés avant préférence/accès ; aucune exception implicite de famine. Les repas engagés continuent, transport et ingrédients restent indépendants. Ne pas confondre cargaison de tâche et inventaire personnel.

## Loisirs (V15)
- Lire docs/development/recreation.md avant de modifier satisfaction, lassitude, places de service et horaires. Le drapeau de lassitude persiste entre 30 et 50 ; aucun gain pendant le trajet. Les piquets partagent une famille et admettent trois joueurs sur des places distinctes.
- V14 migre à 55 de satisfaction sans inventer de passé ni interrompre les tâches. Le profil de camp à attentes extrêmement basses est provisoire ; ne pas le présenter comme un calcul de richesse. Les fixtures de foule doivent cloner profondément les états des personnes.

## Construction (V16)
- Lire docs/development/construction.md : plan traversable, cadre après première livraison, finition après dégagement physique. Construction peut livrer même sans Transport ; Transport seul ne finit pas un cadre ordinaire ; la réinstallation d’un meuble entier est aussi accessible à Transport en V26. Annuler libère les cargaisons de dégagement liées au parent.
- Protéger personnes, arêtes/coins et services avant livraison/achèvement. Le délai de cadre capturé appartient à l'arête sauvegardée. Valider V15 avec ses anciennes exclusions avant migration ; aucun cache d'obstacles de chantier ne survit à une décision synchrone.
- V21 : profils de coexistence dans src/sim/occupancy.ts ; table/tabouret/piquet gardent les piles compatibles, mur/lit/feu les dégagent. Les plans retirent les cellules de zone incompatibles après préplanification des cargaisons ; un feu peut recouvrir une zone sans accepter le rangement. V22 livre transit/coûts/arrêt des meubles présents ; autres profils restent ouverts. Lire docs/research/occupancy-reference.md.

## Ordres et sélection (V17)
- Lire docs/development/player-orders.md avant de modifier priorité forcée, file ou sélection. La file réserve les travaux dès acceptation ; métier 0 interdit de nouveaux ordres mais conserve les ordres forcés déjà acceptés. Annulation explicite, effondrement et disparition de cible libèrent les engagements.
- Un ordre vise un travail exécutable, pas une chaîne de construction implicite. V18 ajoute transport et approvisionnement forcés, avec quantités réservées dès acceptation ; V19 ajoute dégagement des chantiers et combustible forcés ; V20 ajoute cuisine et dégagement des piles sur semis ; un ordre de cuisine sur feu vide ravitaille sans promettre la recette suivante. Le menu interroge le worker hors des frames ; la commande revalide tout.
- Sélection multiple en présentation seulement ; anneaux instanciés partageant les trajectoires GPU. V16 validée avant migration vers des files vides ; V17 validée avant autorisation des entrées quantitatives V18, sans modifier les ordres numériques existants. V18 validée avant les destinations quantitatives V19 ; combustible forcé ignore l’automatisme mais conserve réservation exclusive du poste et phases physiques.
- V19 validée strictement avant V20 : les recettes en file réservent ingrédients, staging et poste. Un dégagement forcé de semis conserve zone/cellule, jamais un ID agricole renouvelable ; modification de zone/politique libère la cargaison. Lire docs/research/cooking-orders-reference.md.

## Transit mobilier V22
- Lire docs/development/furniture-travel.md avant de changer coûts, destinations ou poses. La non-répétition vaut entre objets qualifiants différents. Table/lit/feu traversables, arrêt ordinaire exclu ; le lit garde son service réservé. Ne pas confondre transit et destination.
- Migration V21 stricte, arêtes engagées conservées ; `transitExit` persisté pour les sorties physiques. Corps/cargaison/sélection partagent la formule TSL et les attributs existants ; hauteur graphique sans effet autoritaire.

## Priorité maintenue V23
- Lire docs/development/player-orders.md : priorité sur une cellule/famille, sans rayon autour de la cible. Dure au plus une demi-journée depuis le dernier ordre persistant accepté ; la file passe avant les suites. Ne pas confondre affectation désactivée et incapacité. Expirer l’intention ne supprime pas le travail déjà commencé.
- État facultatif Pawn.priorityWork ; V22 validée strictement avant migration sans intention inventée. Les décisions réutilisent les fournisseurs et budgets communs.

## Déconstruction V24
- Lire docs/development/deconstruction.md avant de toucher aux retraits, restitutions ou réservations de bâtiments. Déconstruction est un Job ciblant un Structure.id ; désignation seule ne bloque pas les usages, réservation oui. Progression réinitialisée après interruption, conservée après sauvegarde.
- Une restitution n’avance le PRNG et ne supprime le bâtiment qu’après prévalidation des dépôts. Le bilan world.deconstructed conserve pertes et historique combustible retiré. V23 est strictement validée avant migration. Réinstallation des quatre meubles admissibles livrée en V25 ; minage V28 distinct ; autres matériaux et compétences restent absents.

## Meubles entiers V25
- Lire docs/development/furniture-transfer.md avant de modifier installation, paquet, portage ou annulation. Le bâtiment garde son identité et le propriétaire de son lit entre structures et packed ; une seule représentation autoritaire et un seul propriétaire.
- Le plan de réinstallation réutilise les règles de chantier, avec exclusion du meuble source. Un paquet occupe une cellule exclusive. Interruption et annulation prévalident le dépôt ; un refus conserve le portage. V24 est strictement validée avant ajout de packed vide.
- V26 : lire docs/development/furniture-logistics.md. Transport seul, rangement filtré et dégagement des paquets sont livrés. HaulTask.whole réserve la case entière, active ou en file ; pas de conversion en matériau. installationWork conserve le fournisseur de réinstallation. Valider V25 strictement avant migration, filtre absent = meubles refusés. Les capacités peuvent être réutilisées pendant une décision synchrone seulement. Le dégagement reste local avant le rangement ordinaire. La valeur WorkTotal 150 du plan de référence n'est pas une durée de pose : voir la recherche fraîche et la chaîne HaulToContainer.

## Géologie V27
- Lire docs/development/geology.md et docs/research/geology-reference.md. Tile.stone et Resource.stone identifient les cinq roches Core, uniquement sur leurs porteurs rocheux ; absence = contenu historique non typé. Valider V26 strictement avant migration sans régénérer le site. Les couleurs et identités ne livrent pas le minage, le sol découvert, les chunks, les recettes ou les toits. Les futurs transferts doivent conserver le type.

## Minage V28
- Lire docs/development/mining.md et docs/research/mining-reference.md. Dégâts sur Tile.miningDamage, cadence de coup sur Job.progress ; annuler ne répare pas la roche. Dernier coup, RNG et produit engagés seulement après prévalidation.
- `rough-stone` conserve le type, reste non fertile ; fragments `chunk` pile 1, rangement après désignation, pas de conversion en bois/aliment/bloc. Le maximum terrain/objet conserve le coût du sol entre répétiteurs. V27 strictement validée avant migration. Les roches historiques restent non typées (500 PV provisoires). Toits naturels, autres minerais que l’acier et pierres décoratives transportables restent absents ; taille V32 dans son contrat distinct.

## Acier V29
- Lire docs/development/steel.md et docs/research/steel-reference.md. Tile.ore est distinct de la roche encaissante ; 1 500 PV, dégâts naturels de 80, produit neutre 40 acier, piles 75. V28 est validée avant migration sans ajout de gisement ni de filtre. Acier automatiquement transportable, filtre absent = refus ; usages constructifs décrits dans le contrat V30. Avant compétences/rendement variable ou dégâts externes, faire évoluer le suivi des contributions minières. Le coût continu de pile n’est pas supprimé par la non-répétition du mobilier.

## Matériaux constructifs V30
- Lire docs/development/construction-materials.md et docs/research/construction-materials-reference.md. Job/Structure.material facultatif : absent = recette historique ; nouveaux ordres bois/acier et cinq pierres V33 pour les familles admissibles, feu fixe bois. Les nouveaux lits coûtent 45. JOB_WOOD_COST/DURATION sont historiques, pas les recettes des ouvrages typés.
- Exigences, piles et réservations par ItemId ; escrow reste une vue bois/nourriture. Conserver le matériau dans paquets, réinstallation et restitution ; lostSteel est un bilan, pas un stock. V29 validée avant migration sans réécrire les ouvrages. Les recettes mixtes et propriétés qualité/HP/feu restent absentes ; agréger les ingrédients identiques avant ajout d’un atelier.

## Atelier mixte V31
- Lire docs/development/stonecutter.md et docs/research/stonecutter-reference.md. Table centrée 3×1, 75 bois + 30 acier ou 105 acier agrégés ; pas de recette historique non typée pour cette nouvelle définition. Surface Item, zones interdites, passage 5 ticks sans arrêt, transfert entier conservé.
- V30 strictement validée avant migration ; la forme des progressions longues V31 précède leur validation par jobDuration. V32 ajoute la taille : lire le contrat de production avant modification. Le pilote incorpore 30 de ses 80 acier dans l’atelier.

## Production commune V32
- Lire docs/development/stonecutting.md et docs/research/stonecutting-reference.md. Artisanat distinct de Cuisine, cinq fragments typés → vingt blocs correspondants ; aucun type inventé pour legacy-chunk. Les blocs passent au sol avec délai 1,4 et restent des piles compatibles de 75.
- `pawn.cooking` / `orders.active='cook'` sont les enveloppes historiques communes ; `recipe='stone-blocks'` les discrimine. Factures conservées sur le bâtiment emballé, IDs uniques. `storageQuantity` réserve le dépôt partiel réel ; conserver le reliquat porté.
- Valider V31 strictement avant priorité Craft 2 et factures vides d’atelier. Compte général jusqu'à X = tous les blocs stockés/portés, X fois = opérations. Travail extérieur neutre 200 ticks ; lumière fonctionnelle/capacités restent absentes. Recherche, pièces et construction en pierre ne sont pas implicitement livrées.
- Le choix de réserve parcourt les candidats par priorité/distance avec l'accès progressif partagé, pendant une décision synchrone seulement. Ne pas construire toutes leurs routes/goals ni réutiliser un coût non finalisé. Le pilote maintient vingt blocs produits sans injection de matériaux.

## Constructions en pierre V33
- Lire docs/development/construction-materials.md et docs/research/stone-buildings-reference.md. Cinq blocs pour mur/lit/table/tabouret/piquet ; table de taille limitée bois/acier, feu bois fixe. `building-materials.ts` sépare WorkToBuild (base × facteur + 140) de WorkToMake ; repos des lits pierre ×0,9, sans inventer qualité ni résistance.
- Valider V32 strictement avant migration, sans réécrire un ouvrage, un stock ou une route. `lostBlocks?` suit les pertes par ItemId ; capacité, ID, bilan et PRNG prévalidés avant tout retrait. Une chaîne de caractères `legacy` n'est jamais un matériau accepté : seule l'absence de champ conserve la recette ancienne.

## Portes manuelles V34
- Lire docs/development/doors.md et docs/research/doors-reference.md. Attendre au seuil avant une arête ; permission et animation sont distinctes. Maintenir ouverte ne commande pas une ouverture distante. Corps/arêtes et objets empêchent la fermeture ; une interdiction tardive conserve le passage engagé et sa sortie.
- V33 strictement validée avant migration. Structure.door conserve temporisations et progression ; les autres objets ne portent pas cet état. Cadres solides pour les coins diagonaux même ouverts ; coût estimé séparé de l'attente physique. Jambages partagés et vantaux TSL sur l'horloge des colons. V36 ajoute les rôles de pièces et V38 les échanges thermiques ; toits naturels, remplacement direct, factions et autodoors restent absents.

## Requêtes CPU sous V34
- Lire docs/development/spatial-queries.md. Comparer le classement avant capacité/accès sans modifier ordre des couples, curseur, budgets ou réservations. Une destination mieux classée mais inaccessible ne supprime pas le meilleur candidat valide.
- Capture d’arrêt locale à l’énumération des sorties, après libération du service ; ne pas conserver la fermeture après mutation ni partager les buffers de navigation entre décisions. Les fragments interdisent aussi les places de loisirs dans leur index de sélection.

## Pièces — inspection sous V34
- Lire docs/development/rooms.md et docs/research/rooms-reference.md. Connectivité cardinale de l’espace, murs/roches pleins, portes séparées même ouvertes ; eau, plans/cadres et meubles ne ferment pas une enceinte. Ce graphe n’est ni la navigation ni un booléen universel d’intérieur.
- Cache possédé par l’appelant, masque vérifié à chaque lecture utile, mutations en place et dimensions incluses ; aucun travail par frame. Le recalcul global mesuré garde les instantanés précédents immuables. IDs dérivés non persistants. V36 ajoute les rôles du mobilier présent et leurs facteurs de production ; V38 ajoute les échanges thermiques ; toits naturels et psychologie restent absents. Pas de bonus d’abri par simple enceinte.

## Toiture construite V35
- Lire docs/development/roofing.md et docs/research/roofing-reference.md. Couverture, zone de pose et zone de retrait sont distinctes du sol ; V34 validée avant migration sans toit inventé. Rayon de pose 6,9 avec connexion ; retrait volontaire par composantes sans rayon ; perte d’un support recontrôle la portée locale. Les meubles ordinaires ne sont pas porteurs.
- Travaux Construction sans matériau/cadre, vrais trajets et défrichage, file réconciliée ; les intentions non réservées tournent pour éviter la monopolisation par des cibles inaccessibles. Les contextes ne survivent ni au tick ni à une mutation de couverture/support. Checkpointer la croissance avant modification du toit.
- Deux lots graphiques préparés même vides, programmes stables ; masquer la toiture ne change pas World. V45 ajoute les blessures de toit aux personnes ; toits naturels, dommages aux objets et gravats restent absents ; V38 ajoute la thermique et V36 ajoute les facteurs intérieurs de production, avec éclairage local 3D dans la tranche de présentation suivante. Le pilote couvre 28 cases autour du repas sans couvrir le champ.

## Lumière et production V36

- Lire `docs/development/work-environment.md` et sa recherche avant de toucher lumière/rôles/taux. Lumière au colon, extérieur psychologique au poste, rôle séparé. Les portes bloquent les feux même ouvertes. Émetteurs actuels plafonnés à 50 %, jamais du soleil agricole.
- `CookingTask.progress` est en unités entières de travail neutre (10 000/tick), V35 strictement validée avant conversion du pourcentage (repas ×5 000, blocs ×8 000). Caches dérivés par propriétaire, contexte partagé seulement sans mutation du milieu. Pas de calcul par image ni par colon pour la diffusion.
- Les deux recettes utilisent les facteurs. V37 étend la lumière aux travaux/déplacements et V38 ajoute la thermique. Rôles sociaux et statistiques complètes restent explicitement absents. Les chambres actuelles concernent les lits civils simples et adultes sans relations.

## Présentation lumineuse sous V36
- Lire docs/development/environment-lighting.md avant les changements de matériaux, feux ou coupe. Texture partagée dérivée, sans mutation de World ; diffuseur logique commun, coefficients visuels artistiques. Recalcul aux changements de source/obstacle/toiture, jamais par frame ; identité texture/nœuds conservée au rechargement.
- Matériaux configurés explicitement à leur création, y compris corps/cargaison/LOD. Toits masqués et murs coupés ne modifient pas le champ. Pas de PointLight/ombre par feu ; vérifier les pipelines réels et les pixels lors des changements du shader.
- Buffers du LOD végétal et de RockLayer : StaticDrawUsage avec needsUpdate/plages lors des mutations. Three 0.186.0 renvoie DynamicDrawUsage même sans version nouvelle ; ne pas réintroduire ces envois par frame. Le banc panorama vérifie absence au repos et transferts après retrait/restauration.

## Lumière des travaux et marche V37
- Lire `docs/development/light-work.md` et sa recherche. `workRemainder` conserve les fractions de travail sans changer les ticks historiques ; réinitialiser aussi cette fraction lorsqu'une famille interrompt sa progression.
- `Job.pickTicks` capture le coup minier, `motion.speedFactor` capture la marche à l'origine après attente de porte. Ne pas retimer un coup/une arête engagés. Le délai terrain/objet reste additif ; conserver le reliquat temporel entre arêtes et coups.
- V36 validée strictement avant migration ; ancien coup entamé = 100 ticks Core, anciennes arêtes intactes. Les contextes de lumière sont partagés seulement sans mutation, les rôles de pièce calculés uniquement pour les consommateurs qui les demandent. Pas de diffusion par colon ou par frame.

## Température V38
- Lire docs/development/temperature.md et sa recherche. Seuil thermique : au moins 25 % découvert ou accès au bord = extérieur, distinct des autres critères. Murs/toits/portes échangent, feux chauffent avec plafond 28 °C ; site quotidien 14–28 °C, saisons et météo absentes.
- thermal.regions conserve les cellules d’air, pas les IDs de pièce. Reconciliation par recouvrement avant intégration. Le parcours thermique borné vérifie toutes les cellules utilisées dans sa preuve, y compris les parois ; ne pas le remplacer par un cache d’identité/tick.
- rot.rate absent = 1. Ancrer l’âge avant changement de taux/propriétaire, conserver fractions/mélanges, expiration avant action. V37 strictement validée avant V38 sans passé thermique inventé. L’intégrale agricole froide/chaude doit précéder un contenu sortant de 6–42 °C ; ni santé thermique ni chaîne du froid équipées ne sont implicites.

## Synchronisation de présentation sous V38
- Lire docs/development/presentation-timing.md. Les vitesses positives s’appliquent dès confirmation à la prochaine frame, sans changer le curseur ni réamorcer le tampon. Quatre ticks confirmés seulement au démarrage/reprise vidée ; publication en fin de lot actif de 20 ms en plus des phases. FixedClock consomme le temps à l’ancien taux avant changement et conserve les fractions. Seul RAF avance la présentation. Sous V52, intégrer les sous-intervalles aux dates des confirmations de vitesse ; ne pas appliquer un nouveau taux rétroactivement à toute la frame ni consommer un timestamp de réception futur par rapport au RAF.
- Publier les phases discrètes au tick simulé, puis appliquer la scène entière au temps des poses. Ne pas retirer une ressource à la réception avant le corps. Garder les snapshots immuables, les commandes/révisions toutes traitées, le HUD automatique à 5 Hz et les interactions immédiates.
- Onglet masqué, file excessive ou historique périmé : recalage global explicite. Le benchmark distingue réception/application ; ignorer les callbacks sans rendu durant préparation. Toute nouvelle transition visuelle enrichit l’observateur et un scénario métier.
- Les publications actives à 20 ms alimentent les trajectoires ; `PresentationQueue` regroupe les valeurs continues de scène à 5 Hz. `PresentationChanges` compare les phases par valeur pour le worker et les snapshots décodés ; une transition discrète reste appliquée dès son tick. Conserver le dernier état continu en attente même en pause.

## Critères de partie jouable
- Encodeur sous V52 : copies ordonnées pour le chemin stable, recherche par ID après permutation ; seules les mutations structurelles reconstruisent les ensembles. Comparer tous les champs à chaque publication, y compris au même tick ; ne jamais conserver une référence mutable de simulation comme valeur témoin. Vérifier l’égalité des paquets, les anciens snapshots et les suppressions avec `scripts/snapshot-encoder-bench.ts` et les scénarios bridge avant la garde native.
- Lire docs/development/playability-validation.md. État final et FPS ne prouvent pas la chronologie visible. Fixer les attentes joueur avant l’oracle ; ne pas valider un délai parce qu’il correspond au buffer interne.
- `npm run test:presentation` impose les vérifications sur zones naturelles et vitesses répétées ; requis aux changements d’horloge, bridge, interpolation ou phases de travail. Il appartient au contrôle complet, pas aux retouches cosmétiques. Distinguer exécution réelle, observation de présentation, mesure matérielle et cas non exercés.

## Plantes V39
- Lire docs/development/plant-temperature.md et sa recherche. Croissance thermique neutre 6–42 °C, nulle aux bornes 0/58 ; semis strictement entre 0/58, récolte et travail accepté indépendants. Resource.growthThermalFactor porte le facteur de l’intervalle sauvegardé ; absent = 1. Checkpointer avant changement, sans appliquer la température au passé.
- Groupes dérivés par World, tableau de ressources et disposition thermique ; les producteurs remplacent les tableaux. Valider V38 avant migration sans histoire froide inventée ; transmettre le facteur dans les deltas. Mortalité, feuilles et saisons restent absentes.

## Refroidissement passif V40
- Lire docs/development/passive-cooling.md et sa recherche. Une case fixe, 50 bois de construction devenant le réservoir initial ; combustion continue 10/jour, y compris dehors ou sous 17 °C. Refroidissement sans lumière, recettes ou bonus alimentaire. Pas de restitution de déconstruction ni minification.
- Capacités par définition dans fuel.ts, transferts physiques communs ; aucune confusion avec les besoins Cuisine. V39 strictement validée avant migration sans objet inventé. thermal-sources.ts partage l’intégration V38 ; bornes continues adaptées explicitement.
- Seize parties dans le lot de mobilier existant. Préparer aussi le curseur double face au chargement, puis restaurer son état depuis le pointeur courant ; le test navigateur exige zéro pipeline nouveau pendant construction et recharge.

## Composants industriels V41

- Lire `docs/development/components.md` et sa recherche. Gisement `machinery`, objet/famille `component` : 2 000 PV, coups naturels 80, deux unités, pile 50 ; ni acier ni combustible. Filtre absent = refus ; génération secondaire indépendante après l’acier, sans injection aux anciennes cartes.
- V40 strictement validée avant migration. Dépôt final et PRNG prévalidés, transferts communs conservatifs. V42 ajoute générateur et lampe ; composants avancés, fabrication et usure restent absents. Coût de passage 1,4 provisoire, pas une parité numérique certifiée. Rendu dans les lots existants et poses GPU communes.

## Électricité V42
- Lire docs/development/power.md et sa recherche. Générateur 2×2, 100 acier + 2 composants, réservoir neuf vide ; capacité 75 bois, 22/jour via reste entier sur cinq. Lampe 20 acier/30 W, minifiable, sans rotation ; générateur 1 000 W non minifiable. Réservoir, matériaux et pertes de déconstruction restent distincts.
- Raccordement carré de six cases, empreinte du transmetteur puis classement par ancre ; garder un parent valide. Réseaux cardinaux dérivés, consommateurs non transmetteurs. Démarrage/délestage progressifs et PRNG persistés. Réseaux équilibrés sans attente ne refont pas dix recherches de candidats par tick ; ordre des autres tirages inchangé.
- Planification et livraison de combustible emploient toute l’empreinte. Tester chaque face d’un appareil multiple : la route vers la seconde case ne doit pas bloquer le porteur. Les phases power.on/parent sont observées par le bridge.
- V41 strictement validée avant migration sans appareil injecté. La lampe emballée perd connexion/alimentation. Conduits, interrupteurs physiques, batteries, froid électrique, prérequis de recherche/compétence et incidents restent absents ; rayon brut 12 de lampe provisoire.
- Diffusion lumineuse V42 : une nouvelle topologie n’exige pas de diffusion si sources/dimensions et obstacles dans leurs bornes de portée sont identiques. Les topologies comparées restent immuables. Le canal d’opacité de la texture doit toutefois suivre chaque changement topologique, indépendamment de l’identité du tableau lumineux.

## Compétences V43

- Lire docs/development/skills.md et sa recherche. Construction est la première compétence branchée, pas une personnalité complète. Milli-XP entières, saturation strictement après 4000 XP nets, dette −1000 avant perte de niveau, cadence déphasée et remise à zéro sauvegardée.
- Gains seulement en finition de cadre approvisionné et déconstruction à coût ; pas pendant trajet, transport, dégagement, toiture ou désinstallation. Ces deux derniers travaux utilisent néanmoins la vitesse. Les anciennes durées restent explicitement calibrées ; qualité/échecs, seuils, humeur de passion et autres compétences demeurent ouverts ; capacités physiques livrées V45.
- V42 strictement validée avant profil 8/sans passion/0 XP et dernière remise inconnue (-1), sans passé inventé ni modification des routes/ressources. Cloner profondément skills dans les fixtures de foule. La ROADMAP privilégie désormais corps/capacités, soins puis équipement/combat avant de poursuivre les appareils électriques.

- Emprises V43 : le rejet rapide de `footprintContains` suppose les branches actuelles dans le voisinage immédiat de l’ancre. Étendre sa borne lors de futurs volumes et conserver la comparaison de tout le catalogue/rotations/enveloppes contre `footprintCells`. Les directions de sortie sont constantes, sans changer leur ordre.

## Interruptions V44

- Lire docs/development/interrupted-cargo.md. Une interruption involontaire libère les engagements même si le dépôt échoue ; Pawn.interruptedCargo conserve un seul objet, jamais un inventaire. Sommeil/réveil et pourriture continuent, travail bloqué jusqu’au dépôt proche. Les commandes volontaires gardent leur refus atomique.
- V43 strictement validée avant migration sans marqueur inventé. Le nouveau marqueur est une phase observée par le bridge ; arêtes capturées terminées avant effondrement de fatigue, arrêt médical immédiat ajouté en V45 selon son contrat.
- Les index de cellules de piles ne survivent qu’à une décision de dépôt. Tentatives déphasées, vingt ticks entre échecs ; commandes explicites peuvent réveiller la planification. Conserver ordre des cellules, quantités, identités, âge et meuble entier.

## Module médical, intégré sous V45

- Lire docs/development/injuries.md, docs/development/health.md et leurs recherches. Pawn.health est actif en V45 ; traitements physiques ajoutés V47, combat encore absent. Le module reçoit un impact déjà localisé/résolu, pas les dégâts bruts d’une arme ou d’un toit.
- Milli-PV et unités sanguines entières ; racines manquantes sans descendants redondants ; Cut ne fusionne pas, Crush peut fusionner. Famine bloque guérison naturelle et contribution du soin ; cicatrices décidées avant guérison, douleur permanente activée au seuil.
- `MedicalRecord.tick` est figé au décès. L’appelant doit couper les intervalles aux changements de contexte ; l’intégration applique interruptions et présentation au tick effectif. Validation du dossier isolé ne vaut pas validation/migration de World.
- Le seuil sanguin de 0,1/jour suit le miroir identifié, malgré la formulation générale du wiki ; stade extrême = offset −0,4 et plafond 0,1, ne pas restaurer le vieux XML. Aucun cache d’anatomie par frame ; copies des dossiers très chargés restent un coût à traiter à l’intégration worker.


## Santé active V45

- V44 validée strictement avant migration sans dossier inventé. Santé sparse, horloge vivante au tick World, dossier figé au décès. Incapacité libère immédiatement engagements/file/services ; cargo indéposable conservé. Ne jamais réactiver un blessé depuis releaseAssignments ou un nettoyage de fin de job.
- Fin de l’arête capturée pendant la chute = adaptation 3D explicite ; aucun nouveau pas ni travail. Repos et guérison allongée après arrêt. medicalSleep distingue sommeil et posture, doit être sauvegardé. Un lit n’est gardé que s’il était réellement utilisé.
- Réutiliser les capacités uniquement dans la décision courante après évolution médicale, pas entre ticks ni après dommage. Dégâts de toiture construite Top/Outside/Crush, distincts de Blunt et montagnes ; retrait volontaire sans blessure. Cadavre encore Pawn sur place, aucun transport de dépouille implicite.

## Secours V46

- Lire docs/development/rescue.md et la recherche associée. Relation sur le porteur, patient unique, réservation patient/lit, approche et transport physiques. Santé/faim continuent ; ni soin ni nourriture donnés implicitement. Dépôt passif de la cargaison propre au patient suspendu pendant portage.
- Le rôle medical appartient seulement à un lit et survit à son emballage. Exclure sommeil ordinaire, distinguer usage temporaire et propriétaire. Interruption et invalidation libèrent aussi le patient ; aucune nouvelle arête autonome pendant portage.
- V45 validée strictement avant priorité doctor 1, sans patient ni secours inventé. Corps/cargaison/anneaux partagent les attributs GPU du sauveteur ; observer les phases et invalider le mobilier au changement de rôle. File de secours encore ouverte ; traitement sans médicament ajouté V47, alimentation assistée V48.

## Traitements V47

- Lire docs/development/tending.md et sa recherche. Patient, Médecin et Repos au lit sont distincts ; allongé n’est pas endormi. Le choix médical reste disponible à l’heure du coucher. Pas de soin/XP pendant trajet ni de PV instantanés.
- Réserver patient et chevet cardinal, capturer la durée au début du travail, conserver reliquat et continuation. Une plaie sans médicament par opération ; XP avant qualité, variation additive et plafond 70 %. Politique, accès, incapacité et mort libèrent avant résultat.
- V46 validée strictement avant Patient 1, Repos au lit 3 et Médecine 8/sans passion/0 XP. La migration V42→43 ne doit pas introduire ce nouveau profil trop tôt. Alimentation assistée ajoutée V48 ; auto-soins ordinaires ajoutés V49 ; médicaments ajoutés V51, files et expirations des autres tâches restent ouvertes.
- Incapacité dans un lit déjà utilisé : retirer l'intention volontaire mais conserver le service physique ; fin de traitement et priorité Patient 0 ne doivent pas déclencher un second secours. Valider les affections admissibles et la place au chevet.
- Fabrique des colons séparée dans starting-pawns.ts : lire docs/development/starting-pawns.md avant réintégration au générateur. L'indépendance entre créations doit résister aux mutations fractionnaires et imbriquées ; ne pas contourner les erreurs par une remise à zéro des sauvegardes.

## Alimentation assistée V48
- Lire docs/development/feeding.md et sa recherche. Seuil adulte 26 % selon le miroir (0,3 × 0,8 + 0,02), pas 27 % déduit du wiki. Patient réellement au lit avec besoin médical, également mobile en récupération ; politique de traitement indépendante du régime alimentaire.
- Médecin possède Pawn.feed, le patient conserve son lit. Patient/chevet exclusifs communs aux traitements, source quantitative commune aux repas/transports/cuisine. Prélèvement, portage et 75 ticks au contact avant consommation/nutrition ; ni XP ni facteur de vitesse d’ingestion du patient. Pas de nouveau souvenir sans table en posture couchée.
- Invalidation libère les services, conserve l’objet indéposable via interruptedCargo. Reprise exacte des trois phases ; V47 strictement validée avant V48 sans donnée inventée. Inventaires personnels, médicaments, auto-soins, distributeurs et malnutrition ne sont pas livrés par cette action.

## Auto-soins ordinaires V49
- Lire docs/development/self-tending.md et sa recherche. Permission sparse désactivée, métier Médecin et politique de soins distincts. Même tâche de traitement avec patientId égal au médecin ; qualité de base ×0,7 avant plafond/variation additive, vitesse et XP communs.
- Lit facultatif ; quitter physiquement son service pour une case cardinale d’arrêt si nécessaire (adaptation 3D). Réservation du patient commune, pas de sommeil simultané, pas de bonus de repos. Désactiver l’option arrête aussi un ordre forcé. Décisions urgentes ajoutées V50 ; ne pas les confondre avec une préemption universelle.
- V48 strictement validée avant V49, sans permission inventée. L’orientation graphique récupère la dernière arête au rechargement ; ne pas viser sa propre position.

## Décisions médicales urgentes V50
- Lire docs/development/urgent-care.md et sa recherche. La branche urgente n'est disponible qu'à la meilleure priorité de travail activée ; Patient avant Médecin à égalité. Seuil strict de saignement avant 0,75 jour, pas toutes les lésions.
- TendTask.urgent capture la voie ; auto-soin urgent termine après une plaie puis réévalue, ordre direct garde sa chaîne complète. Revue au lit 211 ticks Core, alternance 21/22 ticks locaux dérivée du tick/ID. Pas d'annulation universelle des travaux engagés ; expirations/dégâts restent ouverts.
- V49 validée strictement avant V50 sans marqueur inventé. Navigation progressive et réservations communes ; budget épuisé reporte, accès impossible conserve le service. Aucun gain pendant trajet ni bonus de lit debout.

## Médicaments V51
- Lire docs/development/medicines.md et sa recherche. Plafond du patient parmi cinq grades, puissance puis distance au patient, accès du médecin. Réservations quantitatives communes ; dix médecins maximum par source. Prélèvement/portage physiques, une dose par opération, premier dommage puis autres lésions tenant dans vingt PV. Sans dose, une seule plaie.
- XP une fois avant qualité, variation par plaie. Auto-soin urgent termine après une opération et dépose le reliquat ; politique invalide/cargaison indéposable conserve la matière via interruptedCargo. Pas d'inventaire personnel implicite.
- V50 strictement validée avant V51 sans doses ni plafond inventés. Absence du champ = ancien soin à sec ; nouveaux colons plafond industriel, nouvelles cartes trente doses industrielles. Herbal/avancé définis et testés mais acquisition normale encore absente ; plantes médicinales pourrissent en 150 jours via le taux local, bilan distinct de la nourriture.

## Équipement V52
- Lire docs/development/equipment.md et sa recherche. Propriétaire equipment distinct de pawn/cargaison ; une arme principale, identité/qualité/PV préservés. Réserver avant approche, échanger au contact après prévalidation du dépôt, délai de dépôt trois ticks locaux. File d’équipement différée ; file ordinaire suivante conservée.
- Chute hors lit, décès ou perte de manipulation déposent l’arme ; lit déjà utilisé conservé sauf manipulation perdue. Sol saturé conserve via equipmentDropPending, sans destruction ; récupération de l’arme mémorisée seulement après besoins/ordres (adaptation documentée). Recontrôler l’exception du lit avant sauvegarde après changement de service.
- V51 strictement validée avant V52 sans arme injectée. Nouvelle carte : un revolver normal ; combat/inventaire/vêtements absents. Attache rigide GPU dans le lot corporel, géométrie isolée et projection commune UI/carte ; ne pas ajouter de squelette CPU par arme.


## Mobilisation V53
- Lire docs/development/drafting.md et sa recherche. Mode sparse distinct des tâches civiles ; destination active exclusive, file réservée seulement à activation. Transit allié reste commun, collision hostile à intégrer avant ennemis. Arête capturée intacte lors des changements d’ordre.
- Faim/fatigue/santé continuent, sommeil involontaire au sol possible ; aucune prise de besoin/travail autonome. Démobilisation après 1 000 ticks locaux d’attente sans menace ; ajouter son prédicat au premier combat. Incapacité supprime le mode, Manipulation seule n’interdit pas la marche.
- Saturation conserve une seule cargaison via interruptedCargo, autorisée en déplacement tactique ; tentative de dépôt après navigation et hors arête pour éviter la famine de recalcul avec planCooldown partagé. Démobilisation finit l’arête, travail civil ensuite bloqué jusqu’au dépôt. V52 validée strictement avant migration sans mode inventé.
- Repli spatial sans couvert/formation et ordres civils mobilisés refusés : limites documentées, pas parité complète. Bouton/R sur sélection, clic droit/Maj, arrêt ; aucune option de tir décorative. Mode/destination/file sont des phases bridge, dernière activité seule ne l’est pas.

## Impacts anatomiques V54
- Lire docs/development/bullet-impact.md et sa recherche avant les dégâts d'arme. Producteur adulte naturel sans armure, sans facteur entrant ni protection personnalisée de mort instantanée ; réglage Core ordinaire 100 %. Ne pas lui envoyer les futurs profils équipés sans ajouter la vraie résolution de protection.
- Localisation pondérée, préservation extérieure sauf racine, propagation complète jusqu'à la première couche extérieure. Gunshot reste Gunshot sur os ; aucun second jet de préservation sur les couches dupliquées. Le dossier copié et le PRNG s'engagent ensemble, puis l'incapacité est réconciliée une fois. Une lésion létale interne ne supprime pas les autres couches du même impact.
- V53 validée strictement avec Gunshot interdit avant V54 ; migration sans blessure ou tir inventé. Traitements/sauvegardes/UI testés, mais déclencheur joueur, phases/vol, ralentissement, armures et ennemis restent absents. Une fixture d'impact ne prouve pas une attaque jouable.

## Requêtes de combat V53–V54
- Lire docs/development/combat-queries.md et docs/research/combat-preparation.md. combat-space/combat-report gardent leur frontière de requêtes ; combat-world ajoute la capture du décor, sans tir jouable. Lire docs/development/combat-world.md et sa recherche avant modification du catalogue tactique. Une probabilité ne prouve pas la ligne ; portée avant penchement, visibilité distincte de navigation, couverture et posture séparées des branches de projectile.
- Grille détenue par l'appelant pour un lot synchrone ; aucune réutilisation après mutation. Une capture du monde partagée par lot, jamais par colon ou frame ; colonnes numériques et rapports à la demande. Remplissage brut maximal par cellule, porte ouverte encore candidate mais blocage nul ; cadre 0,20 distinct du bâtiment fini. Cailloux décoratifs sans couvert, fragments posés 0,50. Rapports sans mutation ni PRNG caché. Valeurs synthétiques des tests/bancs ne sont pas les définitions de contenu ; ne pas présenter les requêtes de cent candidats comme cent combattants intégrés.
- `ranged-statistics` prépare les qualités du revolver et le calcul adulte de précision, sans compétence Tir persistée ni attaque. Lire docs/research/ranged-statistics-reference.md : dommage arrondi et pénétration distincts ; vitesse brute /100 par tick Core, journée Core/locale facteur 10. Conserver les fractions de phase lors de l'intégration ; le cycle d'XP utilise la préparation de base et le cooldown flottant, pas les durées arrondies. Gunshot et ses propagations sont ajoutés en V54 selon le contrat précédent.
