# Sélection et commandes directes — V17

G0 partiel. [Vérification de la référence](../research/player-orders-reference.md), corpus chap. 8/9, SYS/TEST-031..034 et 047..050. Ce contrat n'achève pas tous les ordres de RimWorld.

## Sélection et interface

`ui/pawn-selection.ts` possède l'ensemble des IDs sélectionnés. Clic remplace ; Maj-clic bascule un membre ; rectangle remplace ou ajoute avec Maj ; double-clic sur un colon sélectionne les colons visibles. Les portraits restent accessibles individuellement, y compris lorsque les modèles se superposent. L'inspection de groupe liste les activités ; le contexte de travail exige un seul colon.

`render/PawnSelectionInput.ts` gère capture, rectangle écran, modificateurs, annulation et seuil de glissement. Une annulation par Échap, perte de capture/focus, changement de mode, outil ou carte ne soumet rien au relâchement. Le tracé bloque les commandes de caméra jusqu'à sa fin. Le clic sur la carte ne recentre plus automatiquement la caméra ; un portrait simple la centre toujours. La sélection n'entre pas dans la sauvegarde ; remplacement de monde l'efface.

`PawnSelectionLayer` partage les attributs de pose et de trajet du corps ; son shader TSL place les anneaux, sans matrices par colon et par image. Un lot résident de 48 triangles par colon, dégénérés pour les non-sélectionnés, garde le nombre d'appels indépendant de la taille du groupe. Il ajoute un appel de rendu au socle, sans ombre. Les drapeaux changent à la sélection et aux snapshots, pas dans la boucle d'animation. La projection CPU de proxies ne s'effectue qu'aux gestes de sélection ; le nombre d'arbres n'intervient pas.

`ui/order-menu.ts` affiche les refus avec `textContent`, ferme les résultats périmés et limite sa position à la fenêtre. Échap, clic ailleurs et changement d'outil le ferment. Maj au clic droit ou au choix ajoute à la file. Le menu accepte navigation clavier et boutons désactivés expliqués.

## Commandes et réservations

`order-options` interroge le worker uniquement à l'ouverture d'un menu individuel. La recherche est ciblée sur un travail et ses voisins accessibles ; elle ne modifie ni monde, ni RNG, ni curseur logistique, et ne publie pas de snapshot. Une réponse d'interface n'est jamais une autorisation durable : `order-job` revérifie le monde à son arrivée dans la séquence des messages.

Le fournisseur `sim/player-orders.ts` prend un `jobId`, un `pawnId` et le booléen `queue`. Il vérifie métier activé, cible existante, réservation exclusive, validité agricole, maturité, accès et préparation du chantier. Les travaux déjà attribués au même colon sont refusés comme doublons. Les plans non approvisionnés et les semis/chantiers gênés annoncent le fournisseur forcé encore absent. Les tâches automatiques de livraison et dégagement continuent normalement.

Sans Maj, préplanifier le dépôt de la cargaison puis interrompre l'activité actuelle et vider la file ; un refus laisse tout intact. Ni identité, quantité, type ou âge de nourriture ne sont perdus. L'arête active reste intacte ; le nouveau chemin commence à sa destination logique. Un chantier déjà livré ne rembourse pas ses matériaux lors d'un simple changement de travail.

Avec Maj et une activité courante, réserver immédiatement le travail et l'ajouter en queue. L'activité courante peut être un repas, un sommeil ou un loisir ; aucune consommation anticipée ne la remplace. Un colon sans activité ni file commence immédiatement. Ajouter avec Maj pendant l’intervalle entre deux travaux conserve la file restante ; redonner sans Maj un travail en file le démarre immédiatement en remplaçant les autres ordres. Chaque entrée vise un travail exécutable, pas la promesse de terminer tous les sous-travaux d'une construction.

`Pawn.orders` contient `active: jobId | null` et `queue: jobId[]`. Une tâche en file réserve `Job.reservedBy` et son statut `active` signifie **attribuée**, pas déjà en cours de réalisation. L'inspection le précise. Les planners ordinaires ne peuvent donc pas voler cette tâche. L'activation réévalue l'accès dans le budget de navigation partagé : budget épuisé = attendre, accès perdu = libérer l'entrée et expliquer l'abandon dans le journal. Une seule entrée est traitée par colon/tick.

Les ordres acceptés retardent les besoins/horaires ordinaires, tandis que faim, fatigue et loisirs diminuent toujours. L'effondrement interrompt et libère la file. Une priorité passée à 0 empêche de nouveaux ordres mais conserve ceux déjà acceptés, conformément au miroir vérifié ; les incapacités physiques futures devront distinguer ce cas. **Annuler les ordres directs** libère la file et l'ordre actif sans effacer les désignations, qui redeviennent accessibles au travail automatique. Annuler une désignation enlève ses références dans les files après la commande.

## Persistance et contrôles

Schéma 17. V16 est validée selon son ancien contrat avant ajout de files vides ; les ordres, trajets, matières, profils alimentaires et horloges existants restent identiques. Des champs d'ordres dans une fausse V16 sont rejetés. Les versions plus anciennes traversent leurs migrations existantes.

Le validateur contrôle forme, limite de file, IDs, doublons, appartenance à un unique colon et symétrie tâche/file/réservation. Un ordre actif doit correspondre à `jobId` ; une simple désaffectation à 0 ne rend pas cette continuation invalide. Annulations et fins de tick réconcilient les références avant une sauvegarde.

Les scénarios `tests/player-orders.test.ts` vérifient bilans, besoins différés, ingestion précédant une file, accès perdu, métier désactivé avant/après acceptation, effondrement, interruption en diagonale avec aliment porté, refus atomiques et migrations. Le parcours UI couvre les deux projections et les vrais messages worker. Le pilote de colonie ajoute deux premiers lots de bois par ces commandes, puis vérifie sa progression de plusieurs jours. [Preuves courantes](validation.md).

Fournisseurs quantitatifs de transport/cuisine, autres familles sélectionnables, ordre de sommeil/ingestion manuel, mobilisation et priorité locale maintenue restent absents. Équipement et accessoires attendent le [contrat de présentation des personnages](character-presentation.md).
