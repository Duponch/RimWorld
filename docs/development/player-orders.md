# Sélection et commandes directes — V20

G0 partiel. [Vérification de la référence](../research/player-orders-reference.md), corpus chap. 8/9/10, SYS/TEST-031..034, 047..054 et 056. Ce contrat n'achève pas tous les ordres de RimWorld.

## Sélection et interface

`ui/pawn-selection.ts` possède l'ensemble des IDs sélectionnés. Clic remplace ; Maj-clic bascule un membre ; rectangle remplace ou ajoute avec Maj ; double-clic sur un colon sélectionne les colons visibles. Les portraits restent accessibles individuellement, y compris lorsque les modèles se superposent. L'inspection de groupe liste les activités ; le contexte de travail exige un seul colon.

`render/PawnSelectionInput.ts` gère capture, rectangle écran, modificateurs, annulation et seuil de glissement. Une annulation par Échap, perte de capture/focus, changement de mode, outil ou carte ne soumet rien au relâchement. Le tracé bloque les commandes de caméra jusqu'à sa fin. Le clic sur la carte ne recentre plus automatiquement la caméra ; un portrait simple la centre toujours. La sélection n'entre pas dans la sauvegarde ; remplacement de monde l'efface.

`PawnSelectionLayer` partage les attributs de pose et de trajet du corps ; son shader TSL place les anneaux, sans matrices par colon et par image. Un lot résident de 48 triangles par colon, dégénérés pour les non-sélectionnés, garde le nombre d'appels indépendant de la taille du groupe. Il ajoute un appel de rendu au socle, sans ombre. Les drapeaux changent à la sélection et aux snapshots, pas dans la boucle d'animation. La projection CPU de proxies ne s'effectue qu'aux gestes de sélection ; le nombre d'arbres n'intervient pas.

`ui/order-menu.ts` affiche les refus avec `textContent`, ferme les résultats périmés et limite sa position à la fenêtre. Échap, clic ailleurs et changement d'outil le ferment. Maj au clic droit ou au choix ajoute à la file. Le menu accepte navigation clavier et boutons désactivés expliqués.

## Commandes et réservations

`order-options` interroge le worker uniquement à l'ouverture d'un menu individuel. La recherche est ciblée sur un travail et ses voisins accessibles ; elle ne modifie ni monde, ni RNG, ni curseur logistique, et ne publie pas de snapshot. Une réponse d'interface n'est jamais une autorisation durable : `order-job`, `order-haul` et `order-cook` revérifient le monde à son arrivée dans la séquence des messages.

Le fournisseur `sim/player-orders.ts` prend un `jobId`, un `pawnId` et le booléen `queue`. Il vérifie métier activé, cible existante, réservation exclusive, validité agricole, maturité, accès et préparation du chantier. Les travaux déjà attribués au même colon sont refusés comme doublons. Un plan non approvisionné propose séparément la livraison V18 ; V19 propose coupe et déplacement pour les chantiers gênés. V20 propose aussi le dégagement manuel d’une pile gênant un semis. Les tâches automatiques de livraison et dégagement continuent normalement.

Sans Maj, préplanifier le dépôt de la cargaison puis interrompre l'activité actuelle et vider la file ; un refus laisse tout intact. Ni identité, quantité, type ou âge de nourriture ne sont perdus. L'arête active reste intacte ; le nouveau chemin commence à sa destination logique. Un chantier déjà livré ne rembourse pas ses matériaux lors d'un simple changement de travail.

Avec Maj et une activité courante, réserver immédiatement le travail et l'ajouter en queue. L'activité courante peut être un repas, un sommeil ou un loisir ; aucune consommation anticipée ne la remplace. Un colon sans activité ni file commence immédiatement. Ajouter avec Maj pendant l’intervalle entre deux travaux conserve la file restante ; redonner sans Maj un travail en file le démarre immédiatement en remplaçant les autres ordres. Chaque entrée vise un travail exécutable, pas la promesse de terminer tous les sous-travaux d'une construction.

`Pawn.orders` contient `active: jobId | "haul" | "cook" | null` et `queue: (jobId | HaulTask | CookingOrder)[]`. Une tâche en file réserve `Job.reservedBy` et son statut `active` signifie **attribuée**, pas déjà en cours de réalisation. L'inspection le précise. Les planners ordinaires ne peuvent donc pas voler cette tâche. L'activation réévalue l'accès dans le budget de navigation partagé : budget épuisé = attendre, accès perdu = libérer l'entrée et expliquer l'abandon dans le journal. Une seule entrée est traitée par colon/tick.

Les ordres acceptés retardent les besoins/horaires ordinaires, tandis que faim, fatigue et loisirs diminuent toujours. L'effondrement interrompt et libère la file. Une priorité passée à 0 empêche de nouveaux ordres mais conserve ceux déjà acceptés, conformément au miroir vérifié ; les incapacités physiques futures devront distinguer ce cas. **Annuler les ordres directs** libère la file et l'ordre actif sans effacer les désignations, qui redeviennent accessibles au travail automatique. Annuler une désignation enlève ses références dans les files après la commande.

## Transports et livraisons V18

`player-hauling.ts` propose une source, une destination et une quantité, avec une recherche d'accès partagée pour cette décision. La pile au sol demande une réserve accessible de meilleure priorité, acceptant son type et sa quantité ; un chantier dégagé demande du bois disponible et accessible. Un colon affecté à Construction peut livrer sans Transport. Un transporteur seul ne finit pas le cadre.

Un ordre en attente contient une `HaulTask` strictement en phase `pickup`, sans cargaison ni pose : source ID, quantité entière, destination. `haul-reservations.ts` énumère les transports actifs et les entrées en file pour le planner. Les vérifications fréquentes de source et de capacité suivent directement les mêmes tâches, sans allocation temporaire. `exceptPawn` exclut seulement sa tâche actuelle ; les autres réservations de ce même colon comptent toujours. Sol typé, repas, cuisine, planificateur automatique et validation voient ces engagements. La réconciliation retire les ordres devenus invalides avec motif au journal ; la perte d'accès est vérifiée à l'activation dans le budget partagé.

Un nouvel ordre immédiat préplanifie le dépôt de la cargaison dans une vue sans les engagements qu'il remplace, puis revalide la livraison dans cette vue avec les dépôts prévus. Le monde reste intact en cas de refus. Le dépôt effectif conserve identité, quantité et âge. La mise en file préserve la tâche actuelle. Répéter un transport avec Maj peut réserver une autre fraction disponible ; cela ne réserve jamais deux fois les mêmes unités.

Chaque livraison reste un trajet mono-source/mono-destination avec le portage existant de 10 unités. Ramassage opportuniste, tournée de chantiers et réemploi direct d'une cargaison compatible en main restent absents : le remplacement passe encore par un dépôt physique. Ce sont des écarts de logistique, pas des adaptations imposées par la 3D. Pas de prise de réservation appartenant à un autre colon. V19 complète les fournisseurs de chantier et combustible ; V20 ajoute cuisine et dégagement des piles sur semis.

## Dégagement de chantier et combustible V19

[Vérification précise et écarts](../research/context-services-reference.md). Le clic droit sur un chantier choisit sa plante gênante comme sous-travail de Construction ; `Job.clearance` conserve cible et progression. Un travail en attente réserve le parent avec progression nulle. Annuler la file retire aussi cette intention de coupe. Finir la coupe produit les objets par les règles existantes et rend le chantier disponible ; cela ne livre pas son coût.

`player-service-hauling.ts` propose deux transports supplémentaires. Dégager vise une pile de l’emprise, sans réservation concurrente, et une cellule proche accessible hors des chantiers/cultures. Le parent `constructionId` est conservé : annulation libère la cargaison et les entrées en file. Construction peut dégager sans Transport ; Transport seul ne coupe pas la plante.

Ravitailler vise une source de bois accessible et un feu ayant de la place pour des unités entières. `destination.forced: true` persiste le contournement du seuil et de l’interrupteur automatiques. La source, la quantité et le poste sont réservés dès acceptation, y compris dans la file. `fuelStationReserved` est partagé avec la cuisine : un autre travail ne prend pas le poste réservé. La recharge ajoute son combustible seulement après prélèvement, déplacement et service de 24 ticks. Le drapeau manuel ne change pas l’interrupteur automatique ; le désactiver conserve l’ordre manuel.

Une seule source et un trajet par ordre, dix unités au maximum ; répéter le dégagement si une grosse pile reste. Une station déjà réservée, même pour l’activité courante du même colon lors d’un ajout en file, est refusée. Ces limites sont assumées, sans prétendre à la parité logistique complète.

## Cuisine et dégagement des semis V20

[Relecture précise](../research/cooking-orders-reference.md). `player-cooking.ts` interroge le même `planCooking` que le travail automatique, filtré sur le poste demandé. Cuisine doit être activée à l’acceptation. Une facture doit encore demander une production ; suspension, filtres, rayon, ingrédients et accès sont respectés. Sur feu vide, proposer **Ravitailler avant de cuisiner**, permis par Cuisine sans Transport. Ce sous-travail ne promet pas la recette suivante. Sur feu alimenté, proposer **Cuisiner un repas simple** ; un ordre représente une recette.

`CookingOrder` enveloppe une tâche initiale de cuisine, sans objet en main ni progression. Ingrédients déjà posés ou à prélever, quantités, dépôts typés et place de travail sont réservés dès l’ajout. Les plans de construction, les transporteurs, repas et autres cuisines voient ces engagements. Le retrait/remplacement d’une facture libère ses ordres en attente ; pendant un transport, le dépôt conserve type, quantité et âge. Pourriture, perte de source ou de capacité réconcilient la file ; l’accès est revérifié à l’activation avec le budget de navigation partagé. Une désaffectation à 0 conserve l’ordre déjà accepté. Le diagnostic de facture explique aussi une recette en attente dans la file d’un colon.

**Dégager avant de semer** exige Culture, pas Transport, et une intention agricole actuellement admissible sur la cellule. La destination latérale garde `growingZoneId` et `sowCell`, pas l’ID renouvelable du job généré. La régénération des intentions ne supprime donc pas le transport. Une modification de politique ou le retrait de la zone annule cet ordre et préplanifie le dépôt de sa cargaison. Le cultivateur automatique conserve son contrat distinct de déplacement déjà engagé, qui peut finir sans parent. Une grosse pile peut exiger plusieurs ordres/trajets ; aucun plant n’est créé avant dégagement complet.

## Persistance et contrôles

Schéma 20. V19 est validée strictement avant passage à 20 ; recette en file, marqueur actif `cook` et parent de semis sont interdits dans une fausse V19. Aucun état existant n’est recalculé. V18 est validée avant passage à 19 ; les nouvelles entrées de combustible/dégagement et le drapeau forcé ne peuvent pas se cacher dans une V18. Aucun état existant n’est recalculé. V17 est validée avant passage à 18 sans modifier les ordres numériques, tâches, sources ou trajets. Elle ne peut pas dissimuler une entrée quantitative V18. V16 est validée selon son ancien contrat avant ajout de files vides ; les ordres, trajets, matières, profils alimentaires et horloges existants restent identiques. Des champs d'ordres dans une fausse V16 sont rejetés. Les versions plus anciennes traversent leurs migrations existantes.

Le validateur contrôle forme, limite de file, IDs, doublons, appartenance à un unique colon et symétrie tâche/file/réservation. Un ordre actif correspond à `jobId`, au transport courant pour `"haul"`, ou à la cuisine courante pour `"cook"` ; une simple désaffectation à 0 ne rend pas cette continuation invalide. Annulations et fins de tick réconcilient les références avant une sauvegarde.

Les scénarios `tests/player-orders.test.ts` vérifient bilans, besoins différés, ingestion précédant une file, accès perdu, métier désactivé avant/après acceptation, effondrement, interruption en diagonale avec aliment porté, refus atomiques et migrations. Le parcours UI couvre les deux projections et les vrais messages worker. Le pilote de colonie ajoute deux premiers lots de bois par ces commandes, puis vérifie sa progression de plusieurs jours. Le pilote privilégie aussi un lit gêné lorsque le fournisseur est admissible. Deux scénarios `player-services` couvrent file de ravitaillement, exclusivité cuisine, désactivation automatique, service, annulation, reprise, empreinte tournée et dégagement sans Transport. [Preuves courantes](validation.md).

Trois scénarios `player-cooking` vérifient recettes mélangées, réservations de staging, factures non exécutables, feu vide, expiration en file, accès perdu, reprise à chaque phase et dégagement lié au champ. Le parcours UI associe dégagement, cuisine en file, sauvegarde et semis suivant. Le pilote peut prioriser une première recette lorsque le camp en manque.

Autres familles sélectionnables, ordre de sommeil/ingestion manuel, mobilisation et priorité locale maintenue restent absents. Équipement et accessoires attendent le [contrat de présentation des personnages](character-presentation.md).
