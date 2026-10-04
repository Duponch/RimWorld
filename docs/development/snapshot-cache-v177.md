# Cache de comparaison des tuiles de snapshot V177

V204 prolonge le cache avec les [contributions minières](mining-skills-v204.md) : registre clairsemé de primitives, comparaison au même tick et reset complet. Les cinq champs communs restent compacts ; les résultats V177 ci-dessous restent historiques.

V177 est une retouche interne de l’encodage des snapshots. Elle n’ajoute aucune mécanique, ne change ni `World` ni son schéma courant 166, et ne modifie ni la cadence de publication, ni les commandes, ni le protocole des messages, ni leur décodage. Sa [preuve](../history/validation-snapshot-cache-v177.md) borne les contrôles et distingue la réduction du reset terrain de la performance générale.

Lire le [contrat de synchronisation](presentation-timing.md), la [méthode de mesure](performance-measurement.md), la [recherche Web V177](../research/snapshot-cache-web-v177.md), le [profil V146](../history/validation-performance-v146.md) et l’[audit V169](../history/validation-performance-v169.md). La règle historique de l’encodeur V52 est dans [l’archive des instructions](../history/agent-instructions-through-v144.txt) : comparer **tous** les champs à **chaque** publication, même au même tick, sans référence mutable du monde comme témoin.

## Changement borné

`SnapshotEncoder` confie la comparaison des tuiles à `TileSnapshotCache`. Le cache possède une copie plate de cinq valeurs primitives par case, dans l’ordre `terrain`, `stone`, `miningDamage`, `ore`, `floor`. Il compare ces cinq valeurs aux tuiles du monde à chaque encodage delta. Une case différente émet le même tuple de delta que l’encodeur antérieur, avec les mêmes champs optionnels et le même index. Le cache actualise alors sa copie ; une case inchangée n’émet rien. Sur checkpoint ou remplacement par un autre `World`, il recopie toutes les tuiles dans les slots privés existants puis ajuste la longueur, y compris pour une carte plus petite. Il ne crée plus cinq nouveaux tableaux témoins à chaque reset.

Le cache ne retient ni objet `Tile` ni référence vers le tableau mutable du monde. Une mutation en place, même entre deux publications au même tick, doit donc être visible. Un remplacement ou un checkpoint ne peut pas comparer le nouveau monde contre l’ancienne base. Les anciennes publications décodées demeurent immuables ; epoch, révisions, base de delta, resynchronisation et ordre des messages gardent leurs contrats actuels.

La comparaison continue de parcourir **toutes** les cases à chaque publication delta : coût asymptotique O(N) pour N tuiles. Cette retouche change l’organisation des valeurs témoin et le lieu du code, sans journal de cases sales, compteur de révision `World`, court-circuit par identité ou hypothèse qu’un tick différent implique un terrain différent. Une carte jouable par défaut contient 250 × 250 cases ; une petite fixture ne représente pas cette charge. Aucune réduction de mémoire n’est établie : les cinq valeurs sont toujours conservées, et la disposition d’un tableau JavaScript dépend du moteur.

## Critères de contrôle avant livraison

- Comparer l’ancien et le nouvel encodeur sur les **paquets exacts** et les mondes reconstruits, pas seulement sur un état final : terrain, pierre, dégâts de minage, minerai et sol ; champs facultatifs présents/absents ; plusieurs cases et plusieurs publications ; mutations en place au même tick ; absence de changement.
- Couvrir checkpoint, remplacement de monde et dimensions, deltas successifs, suppression et changements de ressources indépendants des tuiles, puis vérifier que le décodeur conserve les anciennes références immuables et la chronologie de présentation. Les commandes et révisions ne doivent pas être sautées.
- Exécuter les scénarios bridge touchés et `npm run test:presentation`, requis pour une modification du bridge. La suite ciblée, la régression, les campagnes longues et le navigateur doivent être nommés selon leur exécution réelle ; aucun résultat n’est préjugé ici.
- Mesurer l’encodage isolé sur le même code témoin/candidat, la même sauvegarde, le même script et les mêmes paramètres, en passages successifs et alternés. Séparer simulation, captures, encodage, clone structuré Node, publication/adoption navigateur, CPU d’image, RAF et GPU. Conserver rapports et sorties nouvelles sous `tmp/`.

Le profil V146 relevait un coût d’encodage sur une charge à un message par tick ; V169 montrait encore la simulation comme poste majeur. Ces relevés historiques motivent l’examen du sous-coût, mais ne mesurent pas V177. Une baisse de temps d’encodage isolé ne prouve ni une baisse de `postMessage`, ni un gain de débit complet, de FPS ou de temps GPU. Les résultats réellement exécutés figurent dans la [preuve V177](../history/validation-snapshot-cache-v177.md).
