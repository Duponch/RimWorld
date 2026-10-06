# V249 — attribution de la publication dans le vrai Worker source

V249 est un diagnostic du produit V242, schéma 198. Il conserve le moteur, les règles, les lecteurs stricts, les payloads et la cadence ; aucun FPS supplémentaire n'est livré. Il complète les [phases de réception V245](adoption-phases-v245.md) après le rejet du [circuit propriétaire V248](native-clone-owner-v248.md). [Recherche et interprétation](../research/source-attribution-v249.md).

La vraie source existante est instrumentée sur ses deux IDs canoniques, `simulation.worker.ts` et `snapshots.ts`. Le Worker, son `SnapshotEncoder`, ses recorders et son transport sont ceux du jeu ; aucun second producteur, clone de World, lecteur ou Worker alternatif n'est créé. Les copies privées servent seulement au typage et aux petits oracles Node. Les transforms ont des inverses RAW entiers : decoder, conditions de publication, captures, expressions payload, ordre des règles et clocks gameplay restent historiques.

Les targets grossiers couvrent batch, step, publication, encode, captures de présentation/mouvement/audio, snapshot/drain et l'appel réel à `postMessage`. Les deux timestamps du step sont les lectures originales : le diagnostic ne leur ajoute aucune lecture d'horloge et conserve soustraction, accumulation puis division de `stepMs`. Un step interrompu avant la seconde lecture n'invente aucune durée ; son batch porte le flag threw. Les raisons de publication proviennent des branches déjà sélectionnées, sans rejouer condition ou capture.

L'encode se partitionne de `entry` à `returnAssembly` par les phases terrain, ressources, piles, dynamic et structures. Une transition ferme/ouvre avec le même timestamp ; le finally ferme parent et dernière phase ensemble. Dynamic peut être traversée deux fois. Les phases forment une partition de l'encode ; les targets parent/enfant restent inclusifs et ne s'additionnent pas. Le timer `postMessage` mesure l'appel émetteur synchrone, pas toute la livraison, le clone physique ou l'adoption MAIN.

Un seul helper lexical par realm conserve enums, ids, horloges, compteurs et samples numériques. Aucun World, Resource, paquet ou résultat de recorder n'entre dans son stockage. Les seules références de raccord sont les instances/méthodes à restaurer, le Scope, le Worker et les ports privés. Les wrappers transmettent une seule fois receiver/arguments/return/throw ; le restore préflight vérifie toutes les identités et tous les attributs des descriptors avant mutation.

La fenêtre MAIN qualifiée est traduite par `timeOrigin + now` puis soustraction de l'origine Worker, suivant [HR-Time3](https://www.w3.org/TR/hr-time-3/). Le handshake observe cohérence/latence avec une tolérance d'arrondi déclarée de 2 ms, sans offset appliqué. Arm reçoit exactement les bornes futures et doit être acquitté avant start ; une réponse tardive échoue, sans décaler ou refaire la mesure. Les enfants héritent de l'admission true **et false**. Les scopes admis finissent normalement après end avec overhang ; stop pendant un scope déclare troncature/pending. Les tokens anciens n'alimentent pas une nouvelle fenêtre.

Les agrégats count/sum/min/max/throws/overhang couvrent tous les appels valides. Seuls les 300 premiers samples par target/phase sont conservés, avec dropped explicite ; aucun percentile exhaustif n'en est déduit. Stack/raison sont bornées à 256 et wrappers à 16. Les anomalies de clocks, fenêtre, scope, méthode, port et restauration restent visibles. Les taxes de clocks, allocations, wrappers et comptage sont incluses.

Le MessageChannel de diagnostic est distinct des Request/Response gameplay. L'attachement versionné est one-shot ; les commandes arm/capture/close ont génération/id FIFO propres. Les autres MessageEvents passent une fois au handler RAW avec receiver exact. MAIN vérifie encore l'identité de son Worker ; un ancien canal ne certifie pas un restart. Le close idempotent conserve l'accès cleanup après faute et rapporte ACK/restored/faults avant fermeture des ports. Aucun timeout, pending ou flow control gameplay n'est remplacé.

ROOT qualifie le GEL 90215038, 2 908 fichiers : typage PASS 2,959 s ; 14 cas PASS 5,690 s. Onze cas numériques/ports couvrent admission héritée, overhang, partition, préfixe300, timestamps step, pending, exception/descriptors, panne de clock, profondeur et stale/close. Trois cas vérifient inverses RAW, paquets cold/growth/lifecycle/reorder/checkpoint avec FP/own fields exacts, et traces getters/throw originales. Les ports du composant sont natifs, son Scope/Worker local reste synthétique ; le GAME distinct qualifie le vrai raccord.

Le GAME matériel unique passe en 30,584 s sur Les Aulnes corrigées 250², source tick6934, 1920×1080/DPR1, cible caméra129/122/zoom1, 6× demandé, chauffe3 s puis fenêtre8 s. UI, son, musique et qualité canoniques restent actifs. Il admet 145 batches, 289 steps et 243 publications, chacune avec un encode et un envoi snapshot ; 205 publications viennent d'une phase discrète et 38 d'une fin de batch. Aucun checkpoint n'entre dans la fenêtre naturelle.

| Mesure source | Appels admis | Total, ms | Moyenne, ms |
|---|---:|---:|---:|
| Step, deux timestamps originaux | 289 | 5 043,10 | 17,450 |
| Publication inclusive | 243 | 2 455,80 | 10,106 |
| Encode inclusif | 243 | 2 151,30 | 8,853 |
| Phase ressources | 243 | 1 127,10 | 4,638 |
| Phase terrain | 243 | 640,50 | 2,636 |
| Phase structures | 243 | 323,20 | 1,330 |
| Appel émetteur postMessage | 243 | 296,10 | 1,219 |

La somme des phases vaut exactement 2 151,30 ms, écart maximal parent−partition nul. Dynamic compte 486 segments : 300 samples conservés, 186 dropped, agrégats complets. Les 289 steps admis ne sont pas les 293 ticks entre snapshots MAIN utilisés dans l'estimation de vitesse : leurs frontières diffèrent. Cette dernière donne 6,126× sur 7,972 s ; elle ne remplace ni le compteur source ni une campagne longue de débit.

MAIN observe 247 adoptions, 209 applications et 910 frames RAF, soit 113,75 RAF/s dans cette cohorte instrumentée. Il ne s'agit pas d'un ABBA ou d'un gain/recul contre les autres caméras et bancs. Zéro faute source/MAIN/HTTP ; ACK restore propre. Sauvegarde/reprise réelle au tick7389, anciennes vues et 3 266 270 checks passent. Les 62 références publiques, leurs métadonnées, les sources et archives restent exactes ; navigateur et port5258 sont fermés.

La publication source porte ainsi un coût continu mesuré, particulièrement ressources puis terrain. Une refonte devra préserver les mêmes lectures/valeurs, cold et replis, et être jugée par coût complet puis vrai GAME ; retirer du temps source ne garantit pas seul une hausse de FPS MAIN. V249 ne promeut aucun candidat, ne réécrit pas le langage et ne certifie ni 240 FPS, ni toutes les parties/vues, ni un budget GPU ou un profil V8 exclusif.
