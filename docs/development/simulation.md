# Noyau de simulation — contrat courant

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

Schéma courant 17, migration explicite depuis V1–V16 après validation de chaque étape. Les anciens profils alimentaires et emprises de lits sont préservés ; une vieille carte n’est ni agrandie ni régénérée. V9→V10 conserve les tâches et routes en cours, ajoute Cuisine 2 et aucune tâche de cuisine rétroactive. V10→V11 initialise les âges inconnus au tick chargé ; les reprises V11 conservent âge, quantités et pertes. V11→V12 garde la calibration historique du repos et initialise des plages libres. V12→V13 ajoute les régimes et affecte Sans restriction, sans modifier les tâches ni les entités. V13→V14 valide les anciennes exclusions avant d’autoriser le passage civil, sans déplacer les acteurs ni réécrire leurs engagements. V14→V15 ajoute satisfaction 55, lassitudes nulles et aucune activité rétroactive ; les autres champs sont conservés. V15→V16 initialise plan/cadre après validation historique ; la continuation applique désormais plans traversables et dégagement réel. V16→V17 ajoute des files vides après validation historique, sans modifier les tâches existantes. Voir [ordres directs](player-orders.md), [chantiers](construction.md), [loisirs](recreation.md), [production](cooking.md), [conservation](food-preservation.md) et [horaires](schedules.md) et [régimes](food-policies.md).

Le validateur refuse types/bornes invalides, IDs ou propriétaires incohérents, engagements excessifs, dérivés contradictoires et trajets non conformes. Une route devenue obstruée peut être sauvegardée : le moteur la réévalue. Une sauvegarde invalide ne remplace jamais la partie. JSON limité à 16 millions de caractères, clés navigateur historiques préservées. Les migrations de domaine sont décrites dans les contrats correspondants ; manifeste, journal complet et export/import restent ouverts.
