# Noyau de simulation — contrat courant

V50 : [branche médicale urgente](urgent-care.md) avant les besoins aux points de décision livrés, revue périodique au lit et auto-soin en une opération. La réévaluation générale des autres travaux reste distincte.

V49 : [auto-soins ordinaires](self-tending.md) intégrés au classement Médecin et au traitement commun ; option, cellules, qualité et sauvegarde ont leurs contrôles croisés. La préemption médicale générale reste distincte.

V48 : [alimentation assistée](feeding.md), patient unique, portion et chevet réservés, transferts et ingestion physiques. V47 validée strictement avant changement de numéro uniquement ; invalidation involontaire conserve une cargaison indéposable sans garder le patient réservé.

V47 : [traitements et repos médical](tending.md), Médecine appliquée aux résultats réels, patient/chevet réservés et durée de travail capturée. V46 strictement validée avant les nouveaux profils ; interruption sans résultat et reprise exacte.

V46 : [transport des blessés](rescue.md) dans le planner commun, réservations exclusives de patient/lit, santé active pendant le trajet. V45 validée avant la nouvelle priorité Médecin ; pas d’état médical inventé.

V45 : [santé persistante et interruptions](health.md), migration V44 stricte, capacités par action et premier accident de toiture. Aucun dossier inventé pour une ancienne sauvegarde.

V38 ajoute l’air retenu et les taux alimentaires ; [règles, ordre des transitions et migration](temperature.md). Les pièces sont réconciliées avant intégration, les aliments expirent avant action et leur nouvelle position fixe le taux de l’intervalle suivant.

V35 : [toiture construite](roofing.md) persistée séparément du sol ; V34 strictement validée avant migration sans régénération. La couverture interrompt la croissance naturelle avec checkpoint préalable. Les contextes de support sont invalidés après mutation ; aucun calcul de toit par frame.

Corpus : chapitres 2/4/5/9/10/21/30/32, SYS-005/020..022/041..061/113..117. G0 reste en consolidation. Ce document décrit les frontières ; les règles détaillées font autorité dans leurs contrats de domaine.

## État et horloge

`src/sim` n’importe ni DOM ni Three, ne lit ni horloge réelle ni `Math.random`. Son World contient les données de continuation ; le même noyau tourne en worker, Vitest et Node. Une journée compte 6 000 ticks, l’horloge locale 10 ticks/seconde. Vitesse et retard réel appartiennent au [bridge](architecture.md), pas aux effets métier.

Les ressources, piles, propriétaires, tâches, besoins, trajets, événements, générateur pseudo-aléatoire et curseurs sont sérialisés. Les caches transitoires et l’historique de présentation ne sont pas autoritaires. Le renderer observe sans modifier le World.

## Commandes et travaux

`types.ts` définit le protocole des désignations unitaires/rectangulaires, réserves, cultures et politiques, factures de cuisine, combustible, priorités et attribution de lit. `applyCommand` valide avant mutation et retourne un motif de refus. L’UI et l’aperçu utilisent les mêmes règles de placement.

Les priorités Collecte/Construction/Transport/Culture/Cuisine vont de 1 haute à 4 basse, 0 désactivée. La désactivation interrompt la famille avec conservation des matières. Le dégagement agricole dépend de Culture, même sans Transport. Le [chantier](construction.md) utilise Construction pour couper/finir, Construction ou Transport pour déplacer/livrer ; ses règles et migrations sont séparées de l’orchestrateur. Voir [logistique](material-logistics.md), [rectangles](area-designations.md) et [agriculture](farming.md).

Un colon ne réalise qu’une tâche physique à la fois : travail, transport, cuisine, loisir ou autre besoin. Les intentions générées sont revalidées avant exécution. Consommer un aliment ou des matériaux exige d’avoir effectué les phases matérielles ; aucune récompense n’est accordée à une simple réservation. Voir [besoins](needs.md), [repas](dining.md) et [aliments](food-items.md).

## Matière et bilans

Une pile porte son ItemId, sa quantité et un propriétaire unique : sol, colon ou chantier. Une seule pile par cellule de sol ; deux types ne fusionnent pas. Les limites dépendent de l’objet. Le portage de travail conserve sa capacité provisoire de dix unités ; l’ingestion réserve sa quantité alimentaire propre.

`stock` et `escrow` sont dérivés. Les bilans de tests n’ajoutent jamais ces vues aux piles. Les matériaux incorporés aux bâtiments et les transformations/consommations réelles sont comptés séparément. Un dépôt impossible conserve la matière et empêche la transition ; les plafonds d’IDs et de piles sont vérifiés avant allocation. Voir [sol et interruptions](spatial-motion-storage.md).

## Navigation et charge

Dijkstra CPU pondéré sur huit voisins, coins solides exclus ; les durées d’arêtes sont euclidiennes. Le travail vérifie progressivement l'accès aux candidats avant de demander les routes précises à un Dijkstra réutilisé pendant cette décision. Repas et livraisons gardent leurs recherches ciblées ; un repli peut explorer tout le composant accessible. Les deux types de parcours sont [distincts](spatial-motion-storage.md#accès-aux-candidats-et-routes-précises). La grille statique est préparée au premier besoin du tick ; l'occupation est capturée pour chaque décision. Occupation transitoire, trajet et invalidation restent distincts.

Huit recherches et 32 768 couples logistiques par tick ; curseur de parcours persistant. Ces plafonds n’incluent pas tous les coûts et ne garantissent pas un tick constant. Les colons civils peuvent partager des cellules sans se pousser ; réservations de service et occupations physiques sont distinctes. Les collisions hostiles et profils de combat restent ouverts. Le [laboratoire GPU](../research/gpu-navigation.md) ne dirige pas les colons. [Mesures courantes](validation.md).

## Sauvegardes

Schéma courant 39, migration explicite depuis V1–V38 après validation de chaque étape. Les anciens profils alimentaires et emprises de lits sont préservés ; une vieille carte n’est ni agrandie ni régénérée. V9→V10 conserve les tâches et routes en cours, ajoute Cuisine 2 et aucune tâche de cuisine rétroactive. V10→V11 initialise les âges inconnus au tick chargé ; les reprises V11 conservent âge, quantités et pertes. V11→V12 garde la calibration historique du repos et initialise des plages libres. V12→V13 ajoute les régimes et affecte Sans restriction, sans modifier les tâches ni les entités. V13→V14 valide les anciennes exclusions avant d’autoriser le passage civil, sans déplacer les acteurs ni réécrire leurs engagements. V14→V15 ajoute satisfaction 55, lassitudes nulles et aucune activité rétroactive ; les autres champs sont conservés. V15→V16 initialise plan/cadre après validation historique ; la continuation applique désormais plans traversables et dégagement réel. V16→V17 ajoute des files vides après validation historique, sans modifier les tâches existantes. V17→V18 valide les ordres numériques avant de permettre les réservations quantitatives en file, sans changer la continuation existante. V18→V19 valide les files historiques avant les destinations de recharge/dégagement ; V19→V20 valide avant les recettes en file et dégagements de semis liés à une zone/cellule. V20→V21 relocalise uniquement les anciens dépôts incompatibles dans lits/feux après validation historique, en conservant matière/âge/identité ; les anciennes cellules agricoles incompatibles sont retirées et les tâches générées des zones concernées libérées, avec précontrôle des cargaisons. Positions des colons et horloges conservées ; refus si aucun emplacement libre. Voir [ordres directs](player-orders.md), [chantiers](construction.md), [loisirs](recreation.md), [production](cooking.md), [conservation](food-preservation.md) et [horaires](schedules.md) et [régimes](food-policies.md).

Le validateur refuse types/bornes invalides, IDs ou propriétaires incohérents, engagements excessifs, dérivés contradictoires et trajets non conformes. Une route devenue obstruée peut être sauvegardée : le moteur la réévalue. Une sauvegarde invalide ne remplace jamais la partie. JSON limité à 16 millions de caractères, clés navigateur historiques préservées. Les migrations de domaine sont décrites dans les contrats correspondants ; manifeste, journal complet et export/import restent ouverts.

V22 ajoute les [profils de mobilier et leur migration](furniture-travel.md). L’intention `transitExit` fait partie de la continuation ; les cartes de coûts/arrêt et hauteurs graphiques sont dérivées. Un déplacement capturé n’est pas recalculé au chargement.

V23 sauvegarde une intention facultative `Pawn.priorityWork` (cellule, famille, tick d’acceptation), distincte des tâches/réservations. V22 est validée avant migration sans intention rétrospective. Le délai expire sans interrompre un travail déjà commencé ; [contrat](player-orders.md).

V24 ajoute les intentions de déconstruction ciblant une identité construite et `world.deconstructed`, bilan des pertes/historiques de combustible. V23 est validée avant ajout du bilan nul ; progression active, PRNG et dépôts restent autoritaires. Voir [déconstruction](deconstruction.md).

V25 conserve le bâtiment entre installation, paquet et portage. V24 est validée avant ajout de `packed: []` ; les intentions nouvelles ciblent une identité unique. Attribution du lit, empreinte et progression sont sérialisées. Voir [contrat de transfert](furniture-transfer.md).

V26 ajoute la [logistique des paquets](furniture-logistics.md) : tâche entière active/en file, filtre de réserve facultatif et fournisseur de réinstallation. V25 est strictement validée avant migration ; filtre absent signifie meubles refusés. Les capacités réutilisées durant une décision de planner ne sont jamais sérialisées et sont abandonnées avant la réservation suivante.

V27 ajoute les [identités rocheuses](geology.md) facultatives, validées strictement et conservées par les snapshots. Aucun nouveau travail ni produit n’est ajouté dans ce lot.

V28 ajoute le [minage physique](mining.md). La roche conserve les dégâts indépendamment de la réservation du job ; le dernier coup engage ensemble ouverture, tirage et fragment. Les fragments sont des piles `chunk` à un exemplaire, avec autorisation de rangement explicite. Le schéma 28 valide strictement V27 avant migration ; le terrain et les arêtes existantes restent conservés.

V29 ajoute [l’acier](steel.md) : gisements connectés, identité de minerai, dégâts persistants et produit de 40 unités à rendement neutre. La catégorie conserve ses piles, filtres et coûts de marche propres ; `World.stock` reste la vue historique bois/nourriture, sans autorité sur ce nouveau matériau.

V30 ajoute les [recettes constructives typées](construction-materials.md). Les chantiers et ouvrages sans matériau conservent leur calibration historique ; les nouvelles commandes utilisent le profil bois/acier revérifié. Ne pas déduire la disponibilité d’un ingrédient de la vue bois/nourriture.

V31 ajoute la [table de taille](stonecutter.md), avec matériau explicite, liste agrégée des ingrédients, empreinte centrée de trois cases et progrès de construction supérieurs à 119. V30 est validée avant migration, sans changement du contenu existant. Recettes de taille et blocs restent absents.

V36 : [lumière et pièces des ateliers](work-environment.md), progression entière de travail neutre. V35 est validée avant conversion ×5 000 des repas / ×8 000 des blocs. Contexte dérivé partagé uniquement entre actions sans changement de milieu ; le cache de diffusion ne remplace aucun état sauvegardé.

V37 : [travaux et marche sous lumière variable](light-work.md). Les actions consomment un travail fractionnaire entier ; le minage et les arêtes capturent leur cadence. Les décisions partagent le champ jusqu’à une mutation, sans calcul des rôles pour la seule marche.
