# Validation du propriétaire lexical des clones V248

Prototype privé exact dans le domaine contrôlé, puis écarté pour son coût. Produit V242, schéma 198, 62 sauvegardes et 65 fichiers publics conservés. Aucun FPS ajouté, GAME, build de promotion ou second banc inchangé. [Contrat](../development/native-clone-owner-v248.md), [recherche](../research/native-clone-owner-v248.md). Commits locaux sans push ; relance automatique en pause, dernière autorisation humaine de performances maintenue.

## Artefacts et contrôles gelés

V248 remplace seulement le propriétaire MAIN générique de V247 par un fragment lexical data-only. Lecteur public RAW, strict Worker, source, client, gate native réelle, reconstruction, journaux, FIFO/ACK et lifecycle restent littéraux hors création owner et rebase de chemins. Aucun bool raw, export de codec ou attachement d'autorité n'est ajouté. Les descripteurs par champ et le census realm redondant de l'owner sont retirés ; vrais slice/freeze N et reçus K conservés.

Sous `tmp/performance-orientation-v248`, ROOT exécute une fois les générateurs statiques et contrôleurs. Codec 15E1D359, fragment B5A633B1 ; inverse entier indépendant vers V247 FEE78321 et préfixe public RAW exacts. GEL kernel 85CB6970, 2 042 fichiers : typage PASS 1,447 s. GEL contrôles BA926B43424202465C60615D8657CCA451BDB65688F0F1BA8222DFBCDA928E05, 2 065 fichiers : typage PASS 3,144 s. Quatorze sorties relues indépendamment : douze inverses entiers et deux endpoints littéraux. Aucun rouge V248 ; aucun ancien GEL/rouge V247 modifié ou requalifié. Les tests de composants V247 ne sont pas annoncés rejoués.

## Oracles natifs

Invocation ROOT via `validate:logged` PASS 149,540 s. Rapport privé `native-owner-controls-next/captures/run-oracles-2026-10-06T22-43-23.060Z-JLB3PP/report.json`, SHA256 6AB05896FA9241684471FD50E914A2E621427172F989109C7E0989D8A9D2A2A9.

Quatre cohortes de 65 publications : Aulnes 6934→6998, mixed 2000→2064, Shared growth mixed et constructeur Map interposé/restauré Aulnes. Vrais clones, MessagePorts, Validator RAW entier et factory MAIN fermée. Graphes complets/aliases/ordre/primitives, anciennes vues, metadata, trois lecteurs de journaux et deux suffixes composés par cohorte passent les témoins indépendants. Quatre appels standalone par cohorte gardent les droits RAW. Les hooks des stores RAW ne fabriquent aucun stamp natif ; les voies normales restent fermées après leur restauration.

Mixed émet réellement 12 paquets growth / 48 valeurs, premier au paquet 53, et 75 éditions terrain. Shared impose le repli sur les 12 dernières vues, puis la vue finale reste mutable. Le constructeur Map interposé n'est jamais appelé par les index natifs ; les 65 vues restent RAW même après restauration du global. Les finales World/RNG/seed et provenance correspondent aux corpus ordinaires.

Le vrai client distinct avance Aulnes 6934→6962 : 29 snapshots, 19 callbacks audio, trois checkpoints et 26 deltas. Pause, sauvegarde exacte du World confirmé, mauvais load refusé sans changer la base, rechargement, arrêt d'une requête en issue unknown et restart neuf passent. Les 29 en-têtes motion et 16 audio sont comparés. Les grands graphes sont observés aux checkpoints ; les 26 deltas ont les vérifications coarse prévues. Le message client « V248 explicit owned hard stop » est attendu, distinct des erreurs globales. Son débit instrumenté n'est pas une vitesse GAME.

Cinq endpoints distincts ajoutent chacun deux checkpoints mixed 2000→2001 dans une page/canal neuf. Own-data `__proto__`/sideprops et alias/cycle ferment respectivement 161 648/161 644 nœuds cumulés, zéro mutable. Trou, Map et ArrayBuffer ferment zéro nœud, gardent respectivement 161 646/161 645/161 644 mutables et restent RAW sur le checkpoint ordinaire suivant. Les slots réels Map, identités et bytes ArrayBuffer sont contrôlés en plus du graphe de propriétés. Les anciennes vues restent exactes après la seconde publication.

Ces endpoints ne modifient aucun paquet du corpus de coût. Ils certifient ces frontières précises, pas tous les exotiques, un raw Proxy/accessor ou des snapshots stale/refus forgés. Le petit oracle strict stale/refus envisagé en V247 reste non exécuté ; le mauvais load source n'en tient pas lieu. Aucun GPU loss, panne fatale source ou campagne longue revendiqué.

## Coût natif séparé sans témoin

Invocation ROOT via `validate:logged` PASS 59,450 s. Rapport `native-owner-controls-next/captures/run-cost-2026-10-06T22-46-16.368Z-6QqKFO/report.json`, SHA256 78303AB27482F2F90E573CE33EF86CE87C78C105907F7F371096BD71EA8B3769.

Un cycle A/B/B/A par corpus, huit cohortes avec contextes/Workers frais, checkpoint froid, huit deltas de chauffe puis 56 mesurés. A est le RAW actuel V242 ; B est le codec privé V248 avec son strict Worker V247. Aucun tap, clone témoin ou census d'oracle ne s'exécute dans ces passes. La préparation source du corpus est hors dispatch et rapportée séparément. Chaque passe applique 65 publications, présente 54 lectures Index/Nature.readScene sous vrai frame et zéro repli legacy ; finales World/RNG/seed et SHA appariés exacts.

Le callback est un pipeline partiel de consommateurs, sans GPU, Resource/Overview, UI/audio GAME ou applyWorld entier. Le chrono requête→fin callback contient réellement le circuit natif, strict Worker, reconstruction/fermeture MAIN, journaux et ce callback. Requête→réponse inclut le post ACK MAIN, sans attendre sa réception Validator. Les durées de livraison/adoption/callback se recouvrent et ne s'additionnent pas.

| Moyennes des deux passes, ms | Aulnes A→B | mixed A→B |
|---|---:|---:|
| Requête→fin callback | 8,9266→22,4904 (+151,95 %) | 8,2654→29,5667 (+257,71 %) |
| Requête→réponse | 8,9846→22,5763 | 8,2927→29,6506 |
| Adoption MAIN inclusive | 3,6963→9,3959 | 1,5527→15,1695 |
| Checkpoint froid | 199,1675→510,3875 | 78,6050→300,0525 |

| Phases B, moyennes des deux passes séparées, ms | Aulnes B1 / B2 | mixed B1 / B2 |
|---|---:|---:|
| Prepare owner | 5,7303 / 6,1684 | 8,4588 / 8,1888 |
| Finish owner | 1,6100 / 1,2049 | 2,9581 / 2,7571 |
| Strict Worker | 3,4693 / 3,9078 | 1,7750 / 1,6864 |

Ces phases sont des spans grossiers inclusifs dans leur thread, pas des budgets exclusifs ; prepare/finish sont inclus dans MAIN. Quatre clocks B, la copie work frozen et son lookup sont payés dans le timer MAIN, sans taxe soustraite ni GC forcé. P95 adoption MAIN Aulnes : A 9,205/8,360 ms contre B 23,120/23,975 ; mixed A 3,965/3,945 contre B 28,505/27,800. Les maxima restent conservés dans le rapport, dont finish Aulnes 36,32/17,00 ms ; aucune moyenne n'efface ces pointes.

Les compteurs ne sont pas des durées. Cumul froid inclus, Aulnes : 108 vrais slices / 1 070 008 éléments copiés, 5 488 slots K préparés, 2 268 262 éléments de tableaux figés. Mixed : 137 / 3 510 872, 1 809 K, 4 644 462 figés. Les froids découvrent encore 105 414 objets Aulnes et 80 761 mixed. La fermeture constructive supprime des lectures redondantes, pas le N réellement copié/figé ou les nouvelles branches Dynamic.

Outstanding maximal 1, ACK invalides 0, strictThrows/stale/resync 0 dans le coût ordinaire sériel. Cela ne qualifie pas une file sous vraie charge GAME. Les telemetry finales sont capturées avant le dernier ACK ; le nettoyage ultérieur ferme réellement les deux handles. Sources/tests/package/public et archives V247 restent exacts avant/après ; erreurs globales/HTTP vides, tous Workers/navigateurs/origines possédées 5254/5255 fermés. Sessions utilisateur préservées.

## Décision

V248 reste nettement plus lent que le RAW actuel, à chaud et à froid sur les deux charges : rejet sans GAME, build ou répétition du banc. Le produit V242 et ses performances livrées restent inchangés. Les valeurs B sont inférieures aux valeurs du précédent banc V247, mais aucun ABBA direct V247→V248 ne permet d'en faire un gain causal, général ou FPS. La décision repose sur le nouvel ABBA apparié au RAW actuel.

La prochaine priorité est l'attribution de la vraie source actuelle avant toute optimisation : préparation/publication, copies, adoption et charge continue. Aucun nouveau owner microcache, mécanisme ou avantage présumé de langage/thread n'est engagé par cette clôture.

La validation documentaire ROOT passe en 0,825 s ; `git diff --check` passe. Les documents canoniques résument la décision sans recopier les journaux privés. Aucun fichier de produit, test, package ou sauvegarde n'est modifié ; le dossier utilisateur `references_UI` reste exclu du commit local.
