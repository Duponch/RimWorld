# V255 — qualification des captures Room source

Qualification privée puis rejet du candidat seul ; produit V242, schéma 198 et 62 références/65 fichiers publics conservés. [Contrat](../development/source-room-capture-v255.md), [recherche](../research/source-room-capture-v255.md). Aucun FPS ajouté au produit.

ROOT exécute seul les contrôles gelés, successivement via `validate:logged`. Les agents rédigent et relisent sans runtime. Le candidat final de cette qualification place le propriétaire et les capacités natives dans bridge, et les opérations numériques pures dans sim. Les 850 feuilles du tree privé comportent 28 changements ; aucune source produit n'est modifiée à ce stade.

## Justesse et reprises distinctes

| Contrôle | Résultat | Durée |
|---|---|---:|
| Typage du premier kernel | PASS | 6,358 s |
| 27 cas composants initiaux | 26 PASS, un libellé rouge conservé | 18,404 s |
| Reprise distincte des sept cas de transformation | PASS | 1,952 s |
| Premier oracle natif | FAIL avant création du World B | 39,275 s |
| Sonde HTTP indépendante des capacités natives | PASS après sonde blob rouge | 0,998 s |
| Typage du tree et du banc boundary | PASS | 5,028 s |
| Oracles boundary | Aulnes A/B achevées, puis attente de dimensions mixed erronée | 91,843 s |
| Audit Aulnes distinct, reprise archives | PASS après premier audit rouge | 3,755 s |
| Oracles mixed seuls, dimensions réelles | PASS après arrêt préalable d'inventaire | 39,495 s |
| Coût complet, huit cohortes natives | PASS | 61,132 s |
| Préparation GAME / syntaxe des modules | PASS | 1,320 / 1,574 s |
| GAME matériel A/B/B/A | PASS, candidat seul écarté | 132,543 s |

Les 27 cas uniques sont qualifiés par les deux exécutions de composants, sans prétendre que le premier run était vert. Les lectures RAW, réentrée/exception, alternances de caches, véritables commits des cinq writers, refus et notifications sont couverts. La première reprise textuelle d'un libellé, non exécutée, demeure distincte de la reprise réellement passée.

Le premier démarrage B échoue sur une recherche de capacités IDL au mauvais emplacement. La sonde HTTP constate les descripteurs propres de `self` et les refus brandés d'un faux receiver. La sonde blob initiale reste rouge et ne fournit aucun verdict de plateforme. Une reprise purement plateforme colocalisant encore le bootstrap dans sim est écartée statiquement, sans exécution. Le candidat boundary corrige à la fois l'emplacement des capacités et la séparation des couches ; ses contrôles natifs portent sur cette version réellement admissible.

Le rapport boundary rouge est intact : `source-boundary-reprise-controls-next/captures/run-oracles-2026-10-07T19-40-33.901Z-rP8BCl/report.json`, SHA `E7CC22C3…`. Ses deux cohortes Aulnes ont terminé tous leurs contrôles avant l'assertion `250 !== 100` sur la contrepartie suivante. Le payload `mixed-100.json` est réellement 250×250. L'audit hors ligne qualifie uniquement les Aulnes achevées et conserve `originalOracleStillFail:true` ; aucune partie Aulnes n'est rejouée pour modifier ce verdict.

La première exécution de l'audit échoue sur l'hypothèse que tous les inputs historiques de son runner appartiennent au GEL ROOT. La reprise conserve cette erreur, vérifie les cinq inputs archivaux supplémentaires par leurs hashes exacts et exige toujours l'égalité de toutes les entrées communes. Audit PASS `5AC08BC7…`, sous `aulnes-archive-audit-reprise-next/captures/audit-aulnes-2026-10-07T19-56-59.988Z-fOkoH8/report.json`.

La reprise mixed modifie seulement deux attentes de dimensions et la sélection des oracles à rejouer. Son premier lancement s'arrête avant navigateur : deux nouveaux textes d'audit ont été ajoutés entre gel et lancement. Ils sont déplacés hors du dossier gelé ; les fichiers originaux et le GEL restent exacts. Le lancement suivant passe sans nouvelle modification de kernel ou de payload. Rapport `dimension-reprise-next/captures/run-oracles-2026-10-07T19-54-09.508Z-Hv7wIT/report.json`, SHA `96DEDF98…`.

| Corpus | Dose ordinaire A/B | Publications par variante | Couverture distinctive |
|---|---:|---:|---|
| Aulnes 250² | 6934→7190, 256 ticks, puis continuation 7191 | 267 | Masque stable, lumière F32 et deux réconciliations de prison ; une capture Room |
| mixed 250² | 2000→2064, 64 ticks, puis continuation 2065 | 75 | 75 tileEdits, 52 growthValues, 16 captures Room et 29 checks d'anciennes topologies |

À chaque publication : shadow RAW indépendant dans la source, graphe du paquet, adoption stricte MAIN et digest sérialisé transitoire A/B identiques. RNG et états finaux sont exacts. Sauvegarde, checkpoint, resync, load refusé, reprise admise et anciennes vues passent. Une requête exotique Map révoque réellement le domaine ; capture non réarmée après load et tick, lectures RAW encore exercées. Le checkpoint natif reçu dans MAIN est muté de +123 ticks dans le contrôle dédié ; la sauvegarde source reste exacte. Ce probe et les clones d'oracle sont absents de la mesure de coût.

## Coût complet

GEL boundary `E5C5BD9B…`, 3 673 fichiers ; GEL dimension `5E01392A…`, 3 680 fichiers. Manifest candidat `1E71423A…`, mapper `122070D8…`. Les rouges, trees et gels précédents restent inchangés. Rapport de coût `dimension-reprise-next/captures/run-cost-2026-10-07T19-57-26.942Z-PLADUo/report.json`, SHA `B3BED77D…`.

Huit cohortes fraîches, A/B/B/A pour chaque corpus : 64 vrais ticks, 65 publications, huit ticks de chauffe et 56 mesurés. Le circuit request→reply comprend transport et MAIN ; le parent source comprend step, captures, encodage, publication, marques et replis. L'adoption stricte est observée séparément. Ces parents se recouvrent et ne s'additionnent pas. L'ordonnanceur est forcé à un tick par requête, donc aucune vitesse naturelle ou FPS n'est déduit.

| Corpus | Circuit A→B | Source A→B | Adoption MAIN A→B | Chargement froid A→B |
|---|---:|---:|---:|---:|
| Aulnes | 43,196→39,639 ms, −8,23 % | 36,038→32,855 ms, −8,83 % | 5,005→4,675 ms | 1 148,148→1 123,768 ms |
| mixed | 52,764→55,041 ms, +4,32 % | 46,791→48,545 ms, +3,75 % | 2,084→2,242 ms | 3 628,558→3 093,455 ms |

Les deux moyennes B Aulnes sont inférieures aux deux A, mais les distributions se recouvrent et B2 a un p95/max plus défavorable qu'A2. mixed régresse dans les deux appariements successifs. Deux chargements par variante ne certifient pas un gain froid stable. Le code MAIN est inchangé et ses durées bougent aussi : aucun budget exclusif Room n'est attribué au gain source.

Le coût utile motive un unique GAME ABBA. Les préparateurs précédents restent non exécutés : deux ancres incorrectes sont repérées statiquement avant génération, puis corrigées dans un dossier distinct avec inverse entier. La reprise `AE80A847…` conserve les constantes et le mapper boundary. GEL de préparation `10BFD66E…`, 3 698 fichiers ; GEL GAME `0CD85C00…`, 3 705 fichiers, incluant le GEL dimension et les trois preuves utiles. Aucun kernel, rouge ou payload n'est réécrit.

## Jeu complet et décision

Rapport `tmp/performance-orientation-v255/source-game-boundary-anchors-reprise-next/captures/abba-2026-10-07T20-11-20.445Z-GsKHlP/abba-report.json`, SHA256 `211D4C6BB830C5416DBC0B37BBFAC81C64F011A9086CE889656A1E4CF73EACD4`. Un cycle successif A/B/B/A, Chromium WebGPU matériel AMD rdna-1, 1920×1080/DPR1, source Aulnes6934, caméra129/122/zoom1, chauffe3s/fenêtre8s, 6× demandé. Interface, audio, musique et toutes les qualités restent actifs ; aucune horloge, cadence ou règle modifiée.

| Mesure | A produit | B candidat | Variation |
|---|---:|---:|---:|
| Images RAF/s | 122,813 | 113,938 | −7,23 % |
| Vitesse source réellement livrée | 5,180× | 5,865× | +13,22 % |
| CPU image moyen | 4,754 ms | 5,057 ms | +6,37 % |
| Moyenne des p95 CPU par cohorte | 16,000 ms | 16,550 ms | +3,44 % |
| Coût moyen applyWorld | 10,586 ms | 10,445 ms | −1,33 % |

Les moyennes RAF A sont 122,875/122,750, contre 116,875/111,000 en B. La vitesse B est 5,942/5,787×, contre 5,222/5,139× en A. Les fenêtres commencent et finissent à des ticks différents, conséquence de la vitesse réelle ; elles ne représentent pas la même dose simulée. MAIN applique 186/187 scènes en A, contre 203/201 en B, et adopte 193/191 paquets contre 214/211. Cette dose supplémentaire accompagne le recul d'images ; elle n'établit pas à elle seule un budget causal exclusif. Le candidat ne retire presque aucun coût d'application unitaire.

Les maxima CPU moyens sont plus favorables (31,0→24,9 ms), tandis que moyenne/p95 et FPS régressent. Aucun de ces résultats n'est masqué. Le décodeur p95 moyen passe de9,4 à9,1ms ; ce n'est pas une optimisation du décodeur, dont le code est inchangé.

Quatre sauvegardes/reloads réels passent, chacune avec 3 266 270 checks, anciennes vues stables et recovery APPLIED. Mapping A littéral d'un module ; B25 corps servis avec provenance exacte et dépendances obligatoires. Les 28 changements du manifest ne sont pas tous revendiqués exécutés : types/non atteints sont rapportés séparément. Erreurs natives/HTTP vides, sources et 65 fichiers publics exacts, navigateurs et origines possédées5272/5273 fermés. Les contrôles source précédents ferment aussi5270/5271 ; sessions utilisateur et references_UI préservées.

Décision : **pas de promotion du candidat seul**, pas de build, second GAME inchangé ou complément de writers. Il accélère la simulation mais ne répond pas seul à la priorité FPS, et la contrepartie mixed reste défavorable. Une prochaine refonte doit retirer le travail MAIN ; le domaine source qualifié peut servir de base à une étude couplée, sans transférer automatiquement ses preuves. Aucun 240FPS, vrai6× stable, moniteur240Hz, GPU loss, bundle production ou gain toutes parties certifié. Pas de nouvelle mécanique.
