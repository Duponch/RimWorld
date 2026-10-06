# Lecteur strict isolé et codec sparse V247

V247 qualifie puis écarte ce candidat privé : la validation isolée est exacte sur le périmètre exercé, mais reconstruction et fermeture MAIN coûtent davantage que l'adoption historique. Produit V242, schéma 198, 62 références et 65 fichiers publics conservés ; aucun FPS ajouté. [Preuves et reprises](../history/validation-validated-sparse-worker-v247.md), [recherche et différences architecturales](../research/validated-sparse-worker-v247.md).

## Domaine et transport

La factory privée possède directement deux vrais handles Worker et raccorde leurs ports par un MessageChannel. Source→Validator→MAIN forme un FIFO commun pour snapshots, replies, options et faults. Le Validator exécute l'unique lecteur strict RAW complet, puis transmet le paquet original sparse et son verdict ; il ne renvoie jamais son World reconstruit en warm.

MAIN conserve le World présenté à l'UI et au renderer ; les sauvegardes restent produites par la source. Son codec privé reconstruit les patches, références retenues, aliases, ordre des propriétés et suppressions dynamiques historiques ; les règles métier déjà payées dans le Worker ne sont pas rejouées sur cette voie native. Il ferme les nouveaux descendants ordinaires, engage index et journaux, puis publie le résultat réellement appliqué. Cette fermeture du graphe entier distingue la piste du propriétaire Resource-only insuffisant de V246.

La provenance vient exclusivement des handles, URLs fixes et handlers privés. Aucun booléen raw, stamp fourni par un caller, receipt attachable ou méthode publique adoptValidated ne confère ce mandat. Le SnapshotDecoder public demeure RAW, mutable et indépendant. Les règles canoniques du Worker sont celles du moteur ; une mutation arbitraire des catalogues MAIN ne définit pas une nouvelle règle native.

Les primordials et index natifs sont capturés avant exposition ; la qualification du realm précède leur construction. Une interposition de constructeur Map puis restauration ne doit ni obtenir un index privé ni réactiver le canal disqualifié. Les magasins des trois lecteurs de journaux natifs restent privés et emploient leurs méthodes capturées ; contaminer un magasin RAW ne produit pas une preuve native ou mixte.

Le propriétaire préserve les graphes ordinaires et leurs anciennes vues, sans callbacks entre reconstruction et fermeture. Ses reçus de copies d'array permettent de contrôler les écritures K ; les véritables slice/freeze N restent payés. Un descendant retenu exotique ou un realm incompatible impose le repli RAW monotone. La croissance Float64Array est transitoire ; un backing SharedArrayBuffer impose aussi RAW sur MAIN, sans emprunter le verdict antérieur du Worker pour lire des bytes partagés.

L'ACK sequence/epoch/revision suit l'adoption MAIN et ses callbacks historiques, sans attente, seuil, suppression ou backpressure ajouté. Les compteurs d'outstanding restent primitifs et de taille constante. Une faute de reconstruction/transport termine les deux handles avant notification ; une requête déjà envoyée garde une issue inconnue. Un remplacement recrée le canal et exige un véritable chargement.

## Qualification et décision

Les oracles natifs passent après reprises distinctes des observateurs : quatre cohortes de 65publications, graphes/aliases/ordre/anciennes vues, journaux composés A→C après D, public standalone, hooks des magasins RAW, constructeur Map et repli Shared sur un vrai paquet growth de mixed. Le lifecycle réel avance les Aulnes6934→6972, puis exerce pause, sauvegarde/rechargement, refus de mauvais chargement, arrêt explicite et reprise ; 35en-têtes motion et 22audio sont comparés. Cela ne certifie pas une faute fatale source, une mutation concurrente Shared ou une perte physique GPU.

Le premier coût complet A/B/B/A utilise les mêmes corpus natifs Aulnes/mixed, un checkpoint et 64ticks ordinaires, huit deltas de chauffe puis 56mesurées. Le témoin RAW et les scans d'oracle sont absents. Le callback commun comprend le codec, SceneResourceIndex et Nature.readScene sous vrai frame, avec son repli historique ; ce n'est ni applyWorld entier ni un GAME/FPS.

| Moyenne A→B | Aulnes | mixed |
| --- | --- | --- |
| Adoption MAIN | 3,825→10,878ms | 1,767→17,819ms |
| Request→fin callback | 9,154→23,682ms (+158,71%) | 8,886→32,666ms (+267,59%) |
| Checkpoint froid | 203,657→511,738ms | 79,475→312,830ms |

Le chrono request→reply est conservé séparément et confirme le recul ; le premier chrono précède l'envoi ACK. Les deux hops, validation Worker, reconstruction, fermeture, index/journaux et consommateurs restent dans leur coût réel. Aucune taxe de timer ou GC n'est soustraite ; la livraison sérielle d'un corpus préparé ne devient pas une vitesse de simulation.

Le candidat est rejeté sans GAME, build produit ni promotion. Le raccord GAME préparé reste privé et non généré. Sources, sauvegardes/métadonnées, archives et captures rouges sont conservées ; erreurs vides et tous Workers/origines du contrôle fermés. Cadence, qualité, RNG et règles sont inchangés.

Une suite demanderait une cause nouvelle réduisant réellement reconstruction/fermeture et coût complet, avec propriété constructive conservée. Ne pas rejouer ce banc inchangé ni créditer le seul déplacement des gardes d'un gain MAIN ou FPS : les mesures présentes le contredisent.
