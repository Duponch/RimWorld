# V255 — captures des enclos dans le Worker source

Qualification privée puis rejet du candidat seul ; produit V242 et schéma 198 inchangés. La simulation devient plus rapide, mais le jeu complet affiche moins d'images. Aucun FPS ajouté au produit. [Recherche](../research/source-room-capture-v255.md), [preuves et décision](../history/validation-source-room-capture-v255.md).

Le [profil V254](source-v8-attribution-v254.md) localise plusieurs parcours de terrain et de barrières sous prison et éclairage. Il ne montre pas un flood complet à chaque lecture : le cache conserve déjà sa topologie quand le masque reste égal. V255 cherche à éviter la nouvelle capture de 62 500 terrains, sans changer les heures, les deux réconciliations de prison ou les règles des pièces.

Le Worker construit et conserve lui-même la colonie et sa capture numérique. Sa fermeture n'accepte ni World, publisher, timer ou propriétaire fourni par un appelant. Elle capture le callable natif de publication et son receiver avant de produire un World ; les paquets empruntés traversent le clonage natif au point historique. Sauvegarde, réponses, ordre des messages et ACK restent distincts. La publication ne devient pas une preuve d'application MAIN.

La capture RoomInputs est un contrat de données immuables explicites : dimensions, terrains rocheux et barrières dans leur ordre. Son handle opaque ne donne pas accès aux tableaux et ne confère aucune autorité sur un World. Les nouvelles entrées numériques du moteur reçoivent un reader cohérent ; les entrées historiques sans reader gardent leurs lectures RAW. Le moteur reste déterministe, sans horloge réelle, DOM ou dépendance vers le bridge. Le propriétaire lexical, les capacités natives, la clock et le bootstrap restent dans le Worker bridge.

## Invalidations et caches

Cinq commits conservateurs invalident la capture : minage terminal du terrain, ajout d'une construction, retrait legacy d'une barrière, destruction moderne d'un bâtiment installé et déconstruction. La marque suit l'écriture réelle et précède les helpers ultérieurs ; un refus ne produit pas de faux commit et une exception après commit ne perd pas l'invalidation. Les portes ouvertes, toits, planchers et plantes ne modifient pas ce masque d'enclos.

Chaque instance historique de RoomTopologyCache conserve son histoire propre. Le chemin RAW invalide son témoin avant toute lecture et en sortie, y compris sur exception ou réentrée. Le chemin capturé emploie les mêmes tableaux de travail, masque combiné, priorités des barrières, BFS, labels et RoomSpace ; il n'acquitte son témoin qu'après réussite. La lumière et les affectations de prison n'obtiennent pas artificiellement une même identité de cache. Les anciennes vues restent intactes, y compris A→B→A avec un consommateur dormant.

L'éclairage conserve toits, sources, énergie, échantillons horaires et valeurs F32. La réconciliation de prison ne demande les inputs que dans la branche qui consultait déjà la pièce ; besoins, gardien, traitement des prisonniers, queries, thermique et navigation gardent leurs chemins historiques. Le cache Room ne remplace pas les règles de passage ou de réservation.

## Frontière native et replis

La prémisse est une nouvelle realm DedicatedWorker, son entrée fixe et ses modules audités. Ni URL, booléen, identité du World ni `instanceof` ne suffit. Les capacités brandées de l'hôte sont contrôlées avant création de la colonie. Les commandes arrivent sur le vrai MessageEvent ; les petits graphes de requêtes sont examinés avant toute réutilisation. Un objet exotique, partagé ou une invocation fabriquée révoque le domaine de façon monotone puis joue le comportement RAW historique, sans nouveau refus métier. Un load ultérieur ne réarme pas le domaine ; seul un nouveau Worker reconstruit la fermeture.

Les types wire et classes d'état sont factorisés dans une couche neutre, avec réexports bridge de la même identité. Cette extraction de modules fait partie du coût mesuré ; elle n'est pas présentée comme du texte produit RAW. Aucun deuxième clone ou lecteur strict n'est ajouté. Les entrées publiques/custom/mutables, leurs getters, Proxy et throws restent historiques.

La qualification compare les paquets et les continuations, puis mesure le circuit complet et le froid. La série forcée de vrais ticks n'établit ni vitesse naturelle ni FPS. Un GAME matériel distinct conserve UI, audio, musique, qualité et clocks ; seul son résultat peut justifier une adoption. Aucune réduction de cadence, qualité, population ou règles n'est permise pour augmenter le compteur.

Le GAME trouve 122,81→113,94 images RAF/s, avec vitesse source 5,18→5,86×. Le candidat reste privé : pas de promotion, build ou second banc inchangé. Sa fermeture et ses captures peuvent servir d'étude à une refonte couplée réduisant aussi les applications MAIN ; leur réemploi devra être qualifié avec son coût complet. La prochaine priorité est donc l'affichage, pas une accélération supplémentaire de la source seule.
