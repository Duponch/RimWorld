# Visiteurs et passants

Contrat V88 livré dans le périmètre des [preuves](../history/validation-trade-v88.md). Référence et écarts : [enquête visiteurs](../research/visitors-reference-v88.md). Le calendrier canonique reste [ROADMAP](../ROADMAP.md).

## Frontières et cycle

`visitor-state.ts` possède les données et agendas privés ; `visitor-navigation.ts` prépare bordure/site/sortie sur la navigation réelle ; `visitors.ts` produit et fait agir les personnes ; `visitor-save.ts` valide acteurs, relations de groupe et archives avant migration. Les prix, le stock commercial et le panier sont séparés. La faction `outlanders` est neutre ; un visiteur ne devient jamais un colon commandable sous un autre nom.

`enableVisitors(world,true)` est réservé à l’usine d’une partie neuve au tick zéro. `enableVisitors(world)` adopte les visites explicitement sur une partie existante, élimine les anciennes occasions et ne rejoue aucune introduction. L’absence de `World.visitors` reste neutre. V87 est validée strictement avant passage V88 ; aucun visiteur, argent ni stock n’est ajouté par migration.

`advanceVisitors` consomme chaque occasion même si elle échoue. Tous les tirages de groupe, les nouveaux identifiants et les possessions sont préparés avant publication atomique. L’échec d’accès ou de capacité laisse les acteurs, piles, RNG de production et `nextId` inchangés. Les agendas de passants et visiteurs restent distincts du RNG de création et du calendrier hostile.

Un groupe parcourt `arriving → staying → leaving` ; les passants traversent jusqu’à une autre bordure sans halte marchande. La durée de halte commence lorsque tous les membres mobiles ont atteint leur place, dépasse strictement la durée Core enregistrée puis provoque le départ. Une négociation prête au contact immobilise le marchand, tout en restant interruptible par sa faim, l’échéance ou le danger. Elle ne prolonge pas sa visite.

## Acteurs et possessions

La physiologie humaine, les blessures, le feu et les arêtes de déplacement restent communs. `processVisitor` remplace seulement les intentions d’un colon : pas de travail, de lit colonial ni de recherche de nourriture dans les stocks de la colonie. Les provisions personnelles sont identifiées par `personalFoodIds`, distinctes des denrées vendables malgré leur propriétaire physique commun `inventory`.

Manger retire une quantité de l’inventaire personnel, conserve l’âge et l’état dans une pile de tâche portée, puis effectue l’ingestion commune. Aucun gain n’est accordé à la réservation. Les rations consommées ou pourries sortent de `personalFoodIds` avant sauvegarde ; elles ne réapparaissent pas au départ. Le repos d’urgence est un vrai sommeil au sol. Les stocks coloniaux, les prix et la valeur ne comptent pas une possession étrangère comme disponible à la colonie.

`visitorMayTrade(world,pawn)` est la condition commune du contact et de chaque validation de panier. `visitorGroupDanger(world,pawn,'hostile')` ferme immédiatement les échanges et fait retirer le groupe après une agression ; aucun compteur de diplomatie mondiale ou assaut de représailles n’est créé. `danger` couvre les retraits physiques non diplomatiques. La santé et les besoins peuvent encore retarder ou empêcher le départ.

`exitVisitor` exige un bord réel, aucune arête/récupération active, aucun repas ou cargaison de tâche et un acteur mobile. Le Pawn complet et toutes les piles personnelles, vendables, équipées ou portées sont copiés dans `departed` au tick de sortie, puis retirés de la carte une seule fois. La dernière sortie retire le groupe actif ; la simulation courante ne reparcourt pas toutes les anciennes archives. Un acteur à terre ou enfermé n’est jamais effacé pour débloquer une visite.

## Sauvegarde et limites

`validVisitorShape` refuse les champs de visite avant V88. `validateVisitors` contrôle agendas, frontières, durées, rôle/phase, appartenances et propriétaires. Les identités des Pawns et piles archivés participent au même registre global que les objets sur carte et doivent être inférieures à `nextId`. L’archive n’autorise aucune tâche vivante ; besoins, compétences, dossier médical, fraîcheur, qualité et PV sont validés au tick de départ sans avancer artificiellement le passé hors carte.

La tranche livre des visiteurs standards et des passants. Elle ne livre pas les grosses caravanes et leurs porteurs, le commerce orbital, la réputation complète, les routes mondiales, les cadeaux, les visiteurs déjà connus, le secours des blessés étrangers, l’excavation d’une sortie bloquée ou la diversité intégrale des biographies/tenues. La substitution du repas personnel raffiné par un repas simple et les profils adultes réduits sont des adaptations explicites ; elles ne modifient pas les probabilités de marchandises vendues.

Validation regroupée dans `tests/visitors.test.ts` et les parcours transactionnels communs : frontières annuelles, migration/adoption, apparition atomique, repas propriétaire, arrivée/départ réel, corruption d’archive, reprise exacte. `tests/scenarios/visitors.ts` est une préparation contrôlée de l’introduction ; le parcours naturel suit séparément cinq départs et un échange utile. Les tests natifs et mesures ont été exécutés centralement sur sources figées.
