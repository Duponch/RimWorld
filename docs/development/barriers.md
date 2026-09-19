# Ouvrages endommagés et réparations — V67

[Recherche et adaptations](../research/barriers-reference.md). Décision du joueur : frapper un mur/une porte avec des colons mobilisés, arrêter l'attaque, définir les cases de foyer à entretenir et affecter Construction. Les balles qui rencontrent ces ouvrages les endommagent également. Critère d'arrêt du lot : coups → dégâts sauvegardés → réparation réelle ou destruction avec passage libéré. V68 ajoute l’incident hostile et ses suites ; V75 étend ces contrats au climatiseur solide.

## Données et transactions

`Structure.damage` est un entier positif strictement inférieur aux PV maximaux. Absence signifie intact ; les PV sont dérivés de la définition et du matériau. Seuls les murs, portes et climatiseurs installés portent ce champ ; le climatiseur a 100 PV indépendants du matériau. Ni les recettes historiques ni les piles ne sont modifiées par migration.

La commande de mêlée existante porte `structure:true` pour une cible d'ouvrage. Approche, outil naturel/arme équipée, cadence, arrêt et récupération restent communs. L'ordre est annulé quand la cible disparaît ; la frappe conserve sa case pour finir l'animation orientée même après destruction. Pas d'XP Mêlée sur une cible immobile. Une balle réellement interceptée applique les dégâts de son arme, avec effet `barrier` sauvegardé pendant son dernier tick.

`barriers.ts` retire un ouvrage détruit après prévalidation du bilan `World.destroyed` (compteur et pertes par matériau). Aucun remboursement de mur/porte ; le climatiseur restitue 25 % de sa recette après prévalidation par `cooler-salvage.ts`, avec pertes nettes et PRNG atomiques. Le bilan de déconstruction reste séparé. Libérer réparateurs, jobs de retrait et entrées de file avant suppression, puis recontrôler le toit. Un effondrement peut blesser/arrêter le frappeur : ne pas recréer sa mêlée après la réconciliation médicale, ni écraser le RNG consommé par la chute.

Les captures tactiques/obstacles/projectiles expirent lors du retrait, y compris entre deux impacts du même tick Core. Les pièces, lumière et température sont réconciliées. Aucun mur graphique ne reste comme obstacle logique ou inversement. Les autres catégories d'objet restent explicitement non endommagées.

## Foyer et travail

`World.home` est une liste triée et sans doublons d'indices de cellules. Architecte → Zones permet ajout/retrait par clic ou rectangle ; le masque est visible pendant ces outils. Le foyer autorise actuellement les réparations seulement, sans prétendre fournir nettoyage ou lutte contre l'incendie. L'extension automatique autour des nouvelles constructions reste absente ; le pilote peint les ouvrages achevés.

`repairs.ts` crée des jobs sparse `repair` pour les murs/portes/climatiseurs endommagés dans le foyer. Un seul job par ouvrage, Construction et file de priorité existantes, recherche/approche et libération communes. Un ordre de déconstruction prime ; « Annuler » ne s’applique pas à ce travail automatique (retirer le foyer pour le suspendre) ; retirer le foyer annule les réservations actives et en file. La réparation ne consomme aucune matière et ne restaure rien pendant le trajet. Avant le premier PV : 80 unités Core ; ensuite 20, avec vitesse de Construction × capacités × lumière × 1,7. La progression fractionnaire est conservée en sauvegarde ; une interruption recommence la préparation sans annuler les PV déjà restaurés.

`reconcileRepairs` s'exécute une fois par tick et après commandes, jamais par colon ou frame. L'appartenance au foyer utilise une recherche binaire, sans recréer une grille de 62 500 cases à chaque tick. Les marqueurs de réparation utilisent le lot de jobs existant, sans représentation de faux bâtiment ni reconstruction graphique par unité de travail.

## Continuité et preuve

V66 validée strictement avant migration neutre V67, sans foyer, dégâts, bilan ou job inventés. Validation de forme/domaine puis relations des jobs, cibles, coordonnées, progression, propriétaires et récupération après destruction. Ancien impact `unsupported-object` reste un résultat historique admis ; un ancien schéma ne peut introduire `barrier`.

Les scénarios [barriers.test.ts](../../tests/barriers.test.ts), la famille projectiles et l'UI native croisent contact, dégâts, arrêt, reprise, entretien, disparition, toit et corruption. Le pilote de camp entretient le foyer et comptabilise les pertes destructives séparément. Charge mixte `BARRIERS=1` dans les bancs de tir existants : un tiers frappe, un tiers répare, le reste mine/coupe. [Preuves V67](../history/validation-barriers-v67.md).
