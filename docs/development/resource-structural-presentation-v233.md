# V233 — transitions confirmées des ressources

Lot livré dans le périmètre contrôlé après les diagnostics V231/V232, schéma 198 inchangé. Les cinq sources candidates ont été qualifiées ensemble dans le pipeline complet puis le vrai GAME ; les contrôles d’intégration sont suivis dans la [preuve](../history/validation-resource-structural-presentation-v233.md). La [recherche primaire](../research/resource-structural-presentation-v233.md) précise les références et adaptations. Les deux cycles matériels montrent un progrès local modeste, sans certifier 240 FPS, toutes les pointes ou une campagne longue. L’autorisation du 6 octobre conserve l’autonomie et les commits locaux sans push ; une nouvelle pause utilisateur prime.

V232 avait conservé tous les scans puis ajouté un remapping coûteux. V233 propage plutôt la transition déjà reconstruite et confirmée par le décodeur. Le wire et l’encodeur restent historiques : les ajouts en queue et retraits stables utilisent déjà `removed/upserted/growth`, sans tableau complet `order`. Le moteur, PRNG, schéma, sauvegardes, règles, qualité, cadence, horloges, queue, commandes et récupération ne changent pas. Les 62 scènes et leurs métadonnées restent immuables.

## Journal privé distinct

`readSnapshotResourceStructure(from,to)` rend des edges chronologiques et l’union ordonnée des tuiles modifiées, ou `undefined`. Chaque edge possède seulement révisions/counts et éditions `{id,beforeOrdinal}` ou `{id,afterOrdinal}` : suppressions, ajouts et mises à jour, y compris croissance et lifecycle silencieux. Elle certifie que les survivants gardent leur ordre relatif et que les nouveaux membres suivent en queue. Elle ne retient ni paquet, Resource, tableau emprunté ou chaîne forte d’anciens Worlds.

Les valeurs nécessaires sont capturées aux lectures historiques d’ID et à la reconstruction réelle. Aucun descriptor/Proxy trap supplémentaire ne sert à fabriquer une preuve. La préparation incertaine décline l’optimisation ; les gardes, leur ordre, les formes historiquement admises et les raisons de refus restent conservés. Publication uniquement après tous les gardes et le commit final, notamment planète. Refus et stale ne publient rien et ne consomment aucune révision.

Les stamps faibles privés exigent le même propriétaire de journal, génération active et epoch, puis une chaîne entière de parents. Le lecteur ordinal V225 reste inchangé et conserve son `undefined` sur les transitions d’appartenance. La façade est en lecture seule ; un flag, hash, tick ou simple référence ne crée aucune autorité.

Chaque journal est borné à 64 records et à un budget de primitives `min(131072,max(1024,4×nombre de ressources au reset))`. Le coût d’une edge est 4 plus les indices de tuiles et deux unités par édition ID/ordinal. Dépassement, edge inconnue ou records évincés rendent le suffixe indisponible et imposent le parcours complet ; aucune publication ni cadence n’est supprimée.

## Présenter la vraie cible

Chaque consommateur compose les métadonnées depuis sa propre base : dernier World **lu** par Nature et dernier World **appliqué** par l’index de scène restent distincts. A→B→C compose les suppressions et ordinals sans présenter B invisible. Une naissance suivie d’un retrait invisible disparaît du bilan ; suppression puis réintroduction du mêmeID reste une nouvelle entrée de queue. Les valeurs finales sont relues dans C, avec ID/count/ordinal cohérents, même si le décodeur a déjà adopté D. Les slots courants de D ne résolvent jamais C.

Nature possède shapes, références courantes et agenda par ID/rang source. Les queries de taille, maturité, feuilles et leurs dépendances sol/plancher/toit/civil restent celles du métier historique ; les fonctions numériques et les corps mutables sont conservés. Les patches silencieux actualisent les références sans inventer une modification de forme. Une vue retournée possède son tableau fixe ; les anciennes vues ne sont pas réécrites. Sa matérialisation reste O(N).

L’index garde cellules/chunks ordonnés, dernier arbre source en cas de chevauchement, captures primitives et contributions rocheuses exactes. Une suppression peut encore payer une compaction/remap numérique O(N), sans recapturer toutes les primitives survivantes. Les ajouts et mises à jour concernées sont relus dans C. Le lease conserve propriétaire/génération/World exacts et expire après l’application synchrone ; il n’est pas utilisable à travers un await ou un port.

## Dirtiness et replis

Le Map interne de Nature décrit désormais les vraies formes/classifications/membres modifiés par ID. Un décalage d’ordinal n’est plus à lui seul une modification géométrique. Les présents suivent l’ordre source C ; les suppressions suivent l’ancienne vue naturelle. Cette évolution est explicite : l’égalité de l’ancien Map amplifié n’est plus le contrat.

Les valeurs F32/index, géométrie, matériaux, ombres, ordre de dessin, slots/free/alive, counts, bornes, références utiles et restauration restent exacts. Les compteurs de versions/ranges d’uploads redondants ne sont plus égaux par obligation ; chaque valeur modifiée doit encore recevoir sa mise à jour nécessaire. Les préparations de compilation et leur restauration sont contrôlées avec une adoption interposée, dont des membres uniquement agricoles pendant les batches Overview vides. L’API publique `ResourceLayer.updateGrowth` conserve ses associations Resource complètes et son effet historique.

Checkpoint/epoch/reset, provenance absente ou étrangère, ordre explicite inconnu, chaîne perdue, budget, incohérence de cible ou appel mutable imposent les parcours historiques. Le journal certifie une reconstruction passée, jamais l’immuabilité future d’un graphe public. Le mandat de lecture immuable existant et les vérifications privées demeurent nécessaires ensemble ; aucun freeze global n’est ajouté.

Les cinq modules doivent résoudre une seule instance du décodeur et de sa façade. La qualification substitue leurs corps sur les vrais IDs canoniques ; les imports de journal Nature/agenda/index comptent respectivement1/2/1. La promotion doit inverser uniquement ce rebasing, sans modifier les corps qualifiés.

Sources primaires locales : décodeur et journal V225, `SnapshotEncoder`, `NaturalResourcePresentation`, `NaturalPresentationEvents`, index/ResourceLayer/Overview/PlantCluster, vraie queue du Core et leurs oracles indépendants. Les [contrats V228](scene-decoding-performance-v228.md), [V229](scene-reconciliation-v229.md) et [diagnostic V232](resource-census-v232.md) restent applicables. Aucun changement d’algorithme GPU, nouveau worker, partage de queries entre layers ou cache de bornes n’est inclus dans ce lot.
