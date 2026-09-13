# Navigation GPU : expérience exécutable et décision

État : 13 septembre 2026. **Prototype réel livré et testé, isolé de la simulation.** Le GPU calcule les distances, constate la convergence et extrait les chemins. Le CPU encode les passes et lit les résultats ; il ne recherche aucun chemin dans `GpuNavigator.solve`. Le jeu utilise encore son planner déterministe. Ce document ne prétend pas que RimWorld utilise le GPU pour naviguer.

Le [laboratoire interactif local](http://127.0.0.1:5173/navigation.html) expose le paysage de la colonie et une fixture de passages. On peut déplacer départ/arrivée, peindre obstacles et coûts, puis calculer et vérifier le chemin. Les cartes 32/64/128 utilisent le vrai générateur ; 250² reste explicitement une fixture synthétique. Modifier la carte invalide le chemin affiché. Les budgets insuffisants et l'absence de WebGPU sont présentés comme tels. Le build contient une entrée dédiée, indépendante de Three.js.

## Pourquoi cette expérience

Une carte de colonie combine sols de coûts différents, constructions, portes, petites cibles souvent différentes et réservations temporaires. Déplacer un A* séquentiel dans un shader n'exploite pas automatiquement le parallélisme. Les champs de distance partagés par destination et les frontières actives sont des pistes adaptées à des lots ; leur coût dépend du diamètre du graphe, du nombre de destinations et des invalidations.

Les travaux de Merrill, Garland et Grimshaw montrent l'intérêt de gérer les frontières actives avec compaction/préfixes, ainsi que le danger de reparcourir trop de sommets. Leurs chiffres CUDA sur d'autres graphes et matériels ne constituent aucun objectif de performance pour ce jeu. [Recherche NVIDIA, Scalable GPU Graph Traversal](https://research.nvidia.com/publication/2012-02_scalable-gpu-graph-traversal).

| Approche | Avantage pour Lisière | Limite et décision |
|---|---|---|
| A* CPU borné | Peu de travail pour une cible individuelle, chemin disponible dans le tick | Comparateur optimisé à conserver ; le benchmark présent utilise Dijkstra, pas un A* optimisé. |
| BFS par frontières GPU | Ne visite que la frontière active ; naturel pour coûts uniformes | Les sols pondérés exigent une extension ; compaction et budgets de files à contrôler. Prochaine expérience si justifiée. |
| Champ pondéré reverse GPU | Beaucoup de cellules calculées en parallèle ; résultat entier vérifiable | Une destination différente crée ici un champ différent ; mémoire et travail multipliés par les requêtes. Implémenté comme référence simple. |
| Flow field partagé | Beaucoup d'acteurs vers une même sortie, zone sûre ou cible | Ne règle pas les collisions ni les réservations. Déduplication par destination/profil/révision à envisager. |
| Régions / HPA* | Réduit la recherche globale et permet une invalidation locale | Portails, raffinage, optimalité et portes dynamiques demandent un contrat métier. Proposition, pas fonctionnalité livrée. |

HPA* abstrait la carte en secteurs reliés par des entrées, puis raffine les trajets ; l'abstraction peut produire un chemin légèrement sous-optimal. Cette famille est pertinente pour grandes cartes, avec une validation spécifique des portails et des changements locaux. [Jansen et Buro, HPA* Enhancements](https://ojs.aaai.org/index.php/AIIDE/article/view/18791).

## Contrat et fonctionnement livré

`src/navigation-gpu/index.ts` expose `GpuNavigator.create()`, `setGrid(grid)`, `solve(requests, options)` et `dispose()`. Le module ne dépend ni du DOM, ni de Three, ni du World. Il peut être appelé dans un worker ; cette compatibilité de structure n'est pas une intégration au worker du jeu.

La grille row-major contient des entiers `u32` : 0 interdit le passage ; 1 à 255 indiquent le coût d'entrée dans une cellule. Les chemins sont **cardinaux**, incluent départ et arrivée, ne coupent aucun angle et ne traversent pas les bords de ligne. Départ égal à arrivée coûte zéro si la cellule est traversable. Un endpoint bloqué est inaccessible. Ce contrat n'est pas encore le contrat de locomotion final : diagonales, tailles d'animaux, portes, danger et profil de traversée restent à définir explicitement.

Chaque requête initialise un champ à l'infini sauf la destination à zéro. Une passe parallèle calcule pour chaque cellule `min(distance actuelle, distance voisine + coût d'entrée dans la voisine)`. Deux buffers alternent ; aucune lecture ne dépend d'une écriture concurrente dans la même passe. Les passes sont distinctes, sans boucle d'attente entre workgroups. Les valeurs restent entières et sous les bornes de `u32`. À la fin, une passe vérifie si une relaxation pourrait encore améliorer le champ. Si oui, le statut est `inconclusive`, même si le départ a déjà une distance finie : celle-ci n'est pas une preuve d'optimalité.

L'extraction est séquentielle par route sur le GPU, après la recherche parallèle. Elle descend les coûts strictement, choisit le plus petit index en cas d'égalité et borne la longueur. Une route trop longue produit `capacity-exceeded` ; aucun préfixe incomplet n'est exposé comme succès. Une unique lecture GPU→CPU ramène statuts, coûts et routes, sans rapatrier les champs entiers.

Les primitives WGSL distinguent invocation et workgroup ; une barrière de workgroup n'est pas un rendez-vous global. Cette séparation explique les dispatches successifs du prototype. [Spécification WGSL, mémoire et exécution](https://www.w3.org/TR/WGSL/#memory-model). La lecture `mapAsync` attend que le buffer soit accessible et interdit son utilisation GPU pendant le mapping : sa latence fait donc partie du coût réel, pas d'un détail gratuit. [MDN, GPUBuffer.mapAsync](https://developer.mozilla.org/en-US/docs/Web/API/GPUBuffer/mapAsync).

Three r186 expose déjà `computeAsync`, les buffers de stockage et les indices de workgroup via TSL. Le choix WebGPU natif ici permet de mesurer un calcul autonome, sans canvas ni initialisation d'un renderer. Il ne remplace pas le TSL utilisé pour l'animation. [Three, computeAsync](https://threejs.org/docs/pages/Renderer.html#computeAsync), [Three, TSL](https://threejs.org/docs/pages/TSL.html).

## Bornes, mémoire et état autoritaire

Maximum actuel : 262 144 cellules, 32 requêtes par lot, 4 096 relaxations, 4 096 cellules par route, 128 Mio de buffers au total, avec vérification supplémentaire des limites réelles du device. Ce sont des limites de sécurité et non des performances garanties. Par défaut, 512 relaxations au plus : un grand labyrinthe peut donc rester indéterminé. Pour un graphe positif de V cellules, V−1 relaxations suffisent théoriquement à couvrir tous les chemins simples, mais cette quantité de travail n'est pas un budget navigateur acceptable pour une grande carte.

Sur 250×250, un champ `u32` occupe 250 000 octets. Deux champs coûtent environ 0,477 Mio par destination et 15,26 Mio pour 32 destinations, auxquels s'ajoutent la grille, les routes et le staging. Une grille de navigation deux fois plus fine dans chaque direction multiplie les cellules par quatre ; elle augmente aussi le diamètre en pas. Le prototype dense peut donc multiplier le travail environ par huit à distance physique égale. C'est un argument pour conserver une résolution métier explicite, avant toute finesse visuelle.

`setGrid` copie les coûts et impose une révision strictement croissante. Une modification pendant le calcul marque le résultat `stale` ; le consommateur doit le rejeter. Un seul lot par navigator est autorisé. Libération des buffers, pertes de device et erreurs de validation sont traitées. Les requêtes ne modifient jamais la simulation.

Avant activation dans le jeu, le worker devra appliquer un résultat uniquement à une frontière de tick définie, vérifier acteur/cible/révision/profil, puis réserver les cellules et valider les prochaines étapes. Une arrivée plus rapide de promise ne doit pas décider du gagnant d'une réservation. Il faut choisir entre barrière déterministe de lot, résultats prévus pour un tick défini avec politique explicite de retard, ou enregistrement des décisions ; les gains doivent inclure ce coût. Fuite, poursuite et évitement local exigent leurs propres règles : un chemin statique ne résout pas ces comportements.

## Preuves obtenues

`tests/gpu-navigation.test.ts` contient deux scénarios de contrats et d'oracle : détour pondéré, extrémités, aucun saut diagonal ou bouclage de ligne, sommes des coûts, données et capacités invalides. Ils passent. Ils ne sont pas une exécution du GPU.

`node scripts/gpu-navigation-bench.mjs` lance Chromium normal sur une page isolée, importe le vrai module et vérifie chaque route contre un Dijkstra CPU indépendant. Dix-huit fixtures couvrent 110 requêtes, chacune répétée pour contrôler le départage déterministe : poids, obstacles, inaccessibilité, 1×1, 1×65, 65×1 et douze grilles seedées. Un scénario supplémentaire vérifie budget insuffisant, capacité de route, refus de concurrence, résultat périmé en vol et nouvel obstacle. Les coûts optimaux, les extrémités et chaque arête sont contrôlés, pas seulement un hash.

Mesure enregistrée dans `artifacts/gpu-navigation-hardware.json` : Windows 10.0.26200, Ryzen 5 3600, AMD RDNA1 non fallback, Chromium 153 ; modèle exact de carte non exposé. Page sans rendu, une chauffe et trois mesures par fixture de clôture avec ouvertures et bande de terrain lent.

| Carte / requêtes | Passes | Médiane GPU de bout en bout | Médiane oracle CPU | Lecture finale |
|---|---:|---:|---:|---:|
| 32² / 1 | 96 | 4,6 ms | 0,3 ms | 524 octets |
| 32² / 8 | 96 | 4,1 ms | 2,1 ms | 4 192 octets |
| 250² / 1 | 750 | 18,1 ms | 13,3 ms | 4 012 octets |
| 250² / 8 | 750 | 52,6 ms | 109,2 ms | 32 096 octets |

La durée GPU inclut allocations, uploads, encodage, exécution, attente, lecture et décodage. Elle exclut la création initiale du device et des pipelines. Elle n'est **pas** une mesure `timestamp-query` du temps GPU seul. Le comparateur CPU inclut validation et allocations d'un Dijkstra de diagnostic, pas le meilleur A* possible. Trois échantillons ne donnent aucun percentile fiable. Aucun rendu concurrent, worker applicatif, téléphone ou iGPU n'a été mesuré dans ce rapport. Zéro erreur de compilation/validation GPU et zéro divergence d'oracle sur ce parcours.

**Décision : conserver l'expérience accessible et la navigation du jeu déterministe actuelle.** Le GPU gagne sur le lot de huit grands chemins mesuré, mais perd sur les petits lots et dépasse déjà une frame pour une grande requête. Les prochains choix utiles sont déduplication de destinations, frontières actives ou secteurs, pool de buffers et comparaison avec A* optimisé sur les mêmes cartes. L'activation exige aussi tests d'invalidation/réservations au niveau worker et mesure avec le rendu actif.

Pour une vérification de portabilité sans prétention de performance : `node scripts/gpu-navigation-bench.mjs --software --correctness-only`. Sur cette installation, cet essai a échoué à obtenir un adapter WebGPU : ce backend n'est donc pas validé, et aucun chiffre logiciel n'est présenté comme performance. Le diagnostic négatif est conservé dans `artifacts/gpu-navigation-software-failure.json`. Garder ce rapport séparé de la mesure matériel. Le serveur Vite doit tourner sur `127.0.0.1:5173`.

Contrôle complémentaire de l'interface du laboratoire, le 13 septembre à 10:18 UTC : Chromium normal, WebGPU AMD/RDNA-1, chemin vérifié sur paysage 64² puis fixture 250², édition de terrain supprimant le résultat précédent, aucune erreur console. [Diagnostic](../../artifacts/navigation-lab-smoke.json) et [capture](../../artifacts/navigation-lab.png). Ces deux requêtes vérifient le branchement de l'interface et ne s'ajoutent pas au protocole de benchmark ci-dessus.
