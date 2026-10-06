# V249 — validation de l’attribution source

Diagnostic privé du produit V242, schéma 198 ; aucun code produit ou FPS supplémentaire livré. [Contrat](../development/source-attribution-v249.md), [recherche](../research/source-attribution-v249.md). ROOT seul exécute les contrôles, séquentiellement, sur le GEL `90215038151CA5FED1D8257E53CAD930EC184A9B987D9E3FD36C439E6A75A78A` : 2 908 fichiers, empreintes identiques avant/après. Les textes et captures restent sous `tmp/performance-orientation-v249/`.

Les revues indépendantes reconstruisent les quatre inverses RAW entiers : copies Snapshot/Worker, runner et serveur. Le runtime transforme les vrais IDs canoniques ; les copies servent au typage et aux petits oracles Encoder. Le raccord dev Worker est réellement exercé ; le plugin worker-bundle préparé ne l’est pas dans ce parcours.

| Contrôle ROOT via validate:logged | Résultat | Durée |
|---|---|---:|
| `aulnes-v249-source-types` | PASS | 2,959 s |
| `aulnes-v249-source-tests` | Deux fichiers, 14 cas PASS | 5,690 s |
| `aulnes-v249-source-game` | GAME matériel, sauvegarde/reprise et cleanup PASS | 30,584 s |

Les quatorze cas contrôlent l’instrumentation et ses inverses, les paquets Encoder avec ordre/FP/champs propres, les getters/throws historiques, les admissions héritées, partitions, overhangs, préfixes bornés, timestamps step originaux, descriptors et exceptions, ports natifs/origines et stale/cleanup. Le Scope/Worker du petit composant reste synthétique ; le GAME qualifie séparément le vrai canal.

Le GAME conserve Les Aulnes corrigées 250² depuis 6934, caméra orthographique 129/122/zoom1, 1920×1080/DPR1, chauffe3 s, fenêtre8 s, 6× demandé, qualité/UI/audio/musique canoniques et WebGPU matériel AMD. Rapport : `source-game-next/captures/run-2026-10-06T23-03-34.172Z-QQirjf/report.json`, SHA256 `CFCE75326F7EED0B5C572DA56378077350D5F4C8FB91EC5110A3F0C36F2EA8AD`. Readout numérique distinct `source-phases-readout.json`, SHA256 `462F1A8AB929A6437A75E848F284C6158C5F82AF06B72390CB9267991FDAB6A8`.

145 batches admis contiennent 289 steps et 243 publications/encodes/envois snapshot : 205 phases discrètes, 38 fins de batch, aucun checkpoint. Step moyen17,450 ms, publication10,106 ms, encode8,853 ms, appel postMessage1,219 ms. Ce sont des parents inclusifs taxés, non des budgets additionnables ou une mesure de CPU exclusivement actif.

Les phases exclusives de l’encode totalisent 2 151,30 ms, exactement le parent : ressources1 127,10 ms (4,638/appel,52,39 %), terrain640,50 (2,636,29,77 %), structures323,20 (1,330,15,02 %), piles54,00, dynamic4,70, returnAssembly1,50 et entry0,30. Ressources+terrain représentent82,16 % de cet encode instrumenté. L’écart maximal par parent est nul. Dynamic compte486 segments,300 samples conservés/186 dropped ; agrégats complets. La contre-revue reconstitue150 partitions depuis le préfixe, pas les243 intégralement ; les sommes complètes sont vérifiées séparément. Aucun percentile exhaustif de ce préfixe n’est annoncé.

Batch total7 817,70 ms inclut14,60 ms après end et ses descendants ; ce n’est pas97,7 % d’utilisation CPU. Les enfants héritent aussi des admissions refusées. Le handshake réel dure991,20 ms avant l’armement ; l’ACK arm arrive avant la borne future, sans offset, déplacement de fenêtre ou rejouage. Endpoint après end96,50 ms, pending0, toutes fautes/scopes/overflow0. Le coût de `postMessage` couvre l’appel émetteur synchrone, pas la livraison ou le clone physique entier.

MAIN compte247 adoptions,209 applications et910 RAF, soit113,75/s instrumentés ; CPU frame moyen4,548 ms/p95 13,900. Les293 ticks entre deux snapshots MAIN sur7,972 s donnent6,126×, distincts des289 steps admis côté source aux frontières différentes. Cette cohorte seule n’est pas un ABBA, un gain FPS, une campagne de débit ou une certification240 Hz. L’intérieur du stepWorld n’est pas attribué par V249.

Sauvegarde/reprise réelle au tick7389, ancien graphe et3 266 270 checks passent. ACK close rapporte restored true et tous flags source/MAIN0. Erreurs globales/HTTP vides, sources/archives/62 payloads et métadonnées exacts ; navigateur et serveur5258 possédés fermés. Aucun build ou large régression produit n’est justifié par cette instrumentation privée et ces documents seuls.

Décision : conserver V242 et engager une refonte des parcours source répétés, d’abord avec une preuve de propriété et un journal exhaustif de mutations. Les Resource mutables ne deviennent jamais immuables par leur ID ou leur tick. Coût complet, froid/replis, paquets exacts et GAME décideront d’une adoption ; aucun gain futur n’est acquis.
