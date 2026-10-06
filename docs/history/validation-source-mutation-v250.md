# V250 — validation du journal de mutations source

Le candidat privé est écarté : son économie dans le contrôle source sérialisé ne donne aucun gain FPS utile dans le vrai jeu. Produit V242, schéma 198 et 62 payloads/65 fichiers publics conservés. [Contrat](../development/source-mutation-v250.md), [recherche](../research/source-mutation-v250.md). Aucun code candidat n’est intégré.

ROOT seul exécute les contrôles, séquentiellement via `validate:logged`, sur le GEL `3C19A13AEAA1EA51267D322403FC5B8A7DDB7BC3A2235EF4C50F03E4C8B7741A`. Sources, références publiques et archives surveillées restent exactes avant/après. Les preuves privées sont sous `tmp/performance-orientation-v250/` ; elles ne remplacent pas une qualification de toutes les parties.

| Contrôle ROOT | Résultat | Durée |
|---|---|---:|
| Typage privé | PASS | 2,960 s |
| Composants et frontières writers | 39 cas PASS | 7,307 s |
| Oracles source natifs | Quatre cohortes A/B PASS | 59,231 s |
| Coût source complet | Huit cohortes A/B/B/A PASS | 47,485 s |
| GAME matériel | Quatre mesures A/B/B/A, sauvegarde/reprise PASS | 114,655 s |

Les petits cas vérifient notamment le journal numérique, ses reçus et acquittements, les replis, les transformations et inverses RAW entiers, l’ordre des lectures/getters/throws hors scope, les cinq commits terrain et les producteurs Resource ciblés. Certaines copies Node conservent des dépendances publiques RAW : ces tests de producteurs ne constituent pas une preuve que toutes les branches ont été jouées par l’ordonnanceur natif.

Le runtime B transforme treize IDs canoniques uniques : le vrai Worker source et douze modules writers. A transforme uniquement le Worker pour le même raccord de contrôle. Encodeur public et décodeur strict restent RAW ; l’encodeur privé est lexical au Worker. Les inverses entiers des writers et raccords préparés sont contrôlés. Le GAME n’embarque ni shadow Encoder, ni force-hook de ticks, ni gros observateur de graphes.

Les oracles sérialisés font réellement jouer 256 ticks Aulnes et 64 ticks mixed. Le même force-hook A/B remet l’horloge et demande une seule progression réelle par requête ; cela ne mesure pas le débit du scheduler naturel à 6×. Le shadow indépendant compare chaque paquet à l’encodeur RAW dans le Worker avant assemblage motion/audio/envoi : clés propres et ordre, valeurs doubles, types, alias, bytes et métadonnées d’encode telles qu’epoch/révision/stepMs/speed. Il ne certifie pas séparément l’assemblage ultérieur des pistes motion/audio.

| Corpus, chaque variante | Ticks initial → final | Paquets comparés/adoptés | Checkpoints/deltas | Tile edits | Resource upserts | Growth values |
|---|---:|---:|---:|---:|---:|---:|
| Aulnes corrigées | 6934 → 7190 | 262 | 3/259 | 0 | 23 431 | 0 |
| mixed-100 | 2000 → 2064 | 70 | 3/67 | 75 | 993 | 48 |

Les graphes finaux et RNG A/B concordent. Chaque variante conserve deux anciennes vues MAIN : 878 002 checks Aulnes et 518 802 mixed passent. Pause, save physique, resync, mauvais load refusé sans publication, reload de la vraie chaîne et save finale exacte passent ; epoch finale 2/révision 2. Les compteurs d’upserts ne dénombrent pas des mutations distinctes ni les seuls candidats K. Aulnes n’exerce aucune modification terrain ; les 75 edits mixed sont compatibles avec ses travaux de minage, sans compteur de branches permettant d’attribuer chacun des cinq commits.

Rapport oracle : `source-controls-next/captures/run-oracles-2026-10-06T23-25-25.535Z-uewrze/report.json`, SHA256 `DFB652EF3F8B1D92CC8FEA7C877A2EB15568C11D18988CEB82A87C8A9352DEFA`.

Le coût repart dans des contextes neufs, sans shadow/graph chargé : A/B/B/A par corpus, 65 publications chacune, froid 1 + chauffe 8 + mesure 56. Il inclut les vraies notifications, index, captures, comparateurs, encodes, copies, replis et envois. Request→fin callback, request→reply, transaction source et adoption MAIN sont des mesures distinctes et non additionnables ; aucune taxe d’observation n’est soustraite.

| Moyennes A → B, ms | Aulnes | mixed |
|---|---:|---:|
| Circuit request→reply | 33,445 → 27,115 (−18,92 %) | 42,929 → 38,654 (−9,96 %) |
| Transaction source entière | 27,762 → 21,398 (−22,92 %) | 37,939 → 33,611 (−11,41 %) |
| Adoption stricte MAIN | 3,818 → 3,898 | 1,657 → 1,654 |
| Froid request→fin callback | 925,642 → 980,832 | 2896,280 → 2827,977 |

Le froid Aulnes est défavorable. Les économies source sont réelles sur cette charge sérialisée, sans certification de FPS ou vitesse source naturelle. Rapport coût : `source-controls-next/captures/run-cost-2026-10-06T23-26-33.820Z-5P64Xp/report.json`, SHA256 `C8F9067BC8649DFC7BCF5FC018CC0BA59E954DF1267B1713826F65202E98648D`.

Le GAME garde Les Aulnes v224 depuis 6934, caméra orthographique 129/122/zoom1, 1920×1080/DPR1, chauffe 3 s/fenêtre 8 s, 6× demandé, UI/audio/musique et qualité canoniques, WebGPU matériel AMD RDNA-1. Quatre reconstructions de structures surviennent dans chaque cohorte. Les fenêtres ont des doses différentes ; aucune normalisation ne les masque.

| Ordre | RAF/s | Vitesse réelle | Ticks source observés | Adoptions/applications | CPU frame p95, ms | Démarrage, ms |
|---|---:|---:|---:|---:|---:|---:|
| A1 | 114,875 | 6,114× | 292 | 257/206 | 13,50 | 10 936 |
| B1 | 123,250 | 6,008× | 287 | 288/205 | 12,80 | 11 268 |
| B2 | 112,375 | 5,994× | 287 | 284/204 | 13,90 | 10 635 |
| A2 | 122,375 | 6,082× | 291 | 276/205 | 13,00 | 10 958 |

Moyennes A→B : 118,625→117,8125 RAF/s (−0,685 %), vitesse réelle 6,098→6,001× (−1,60 %), CPU frame 4,270→4,281 ms et p95 13,25→13,35 ms. Application 8,408→8,424 ms ; décodeur p95 6,80→6,45 ms et moyenne des maxima frame 23,10→21,75 ms sont meilleurs, sans bénéfice global utile. Le démarrage inclut la disponibilité du jeu ; ce n’est pas un temps isolé d’encode froid. Ces RAF headless ne certifient ni moniteur 240 Hz ni toutes les vues.

Chaque cohorte passe sauvegarde/reprise physique, ancienne vue stable et 3 266 270 checks de récupération, aux ticks sauvés 7375/7379/7376/7378. Rapport ABBA : `source-game-next/captures/abba-2026-10-06T23-28-02.260Z-HLS8q9/abba-report.json`, SHA256 `4E916E28B2F93161132C479880180DA43D629678BD395BE94471C9551F48F563`.

Erreurs globales et HTTP vides, aucun Worker restant dans les contrôles source ; navigateurs et serveurs possédés 5260–5263 fermés. Les 62 références et leurs métadonnées sont inchangées par empreintes ; elles ne sont pas toutes rejouées ici. Aucune règle, cadence, qualité ou population n’a été réduite pour les mesures.

Décision : écarter V250 et garder V242. Le complément natif de frontières est seulement un plan privé, non généré et non exécuté ; il ne certifie donc pas toutes les branches terrain/Resource. Aucun nouveau contrôle inchangé, promotion, build produit ou campagne supplémentaire n’est justifié par ce résultat neutre/défavorable en jeu.
