# Validation V228 — décodage et index de scène

Lot engagé le 6 octobre 2026 après V227 `bd0df0ec`, schéma 198 inchangé. [Contrat](../development/scene-decoding-performance-v228.md), [recherche](../research/scene-decoding-performance-v228.md). **Livré dans le périmètre contrôlé : registre frais et réconciliation de scène, gains matériels locaux ; cible 240 FPS, coût froid et pointes ouverts.** Root seul lance les contrôles lourds successifs, avec sources gelées et validate:logged. Les sorties privées ne remplacent aucun rapport historique ; references_UI et les sessions utilisateur restent préservés. Les étapes suivantes gardent leurs statuts contemporains et leurs résultats défavorables.

## Exploration du registre sur archive V225

`aulnes-v228-namespace-private-abba-2026-10-06T00-00-19.465Z-26036` échoue avant les oracles en 2,975 s : Vite ne retire pas les annotations TS du module virtuel privé. Le script original est conservé sous membership-abba-parse-failed.mjs. Le chargement retire ensuite uniquement les types avec l'API Node disponible ; aucune source produit ou règle n'est modifiée par cette correction de banc.

`aulnes-v228-namespace-private-abba-retry-2026-10-06T00-00-48.649Z-21844` passe en 133,844 s. Archive entière V225, seule déclaration du registre transformée dans le SSR ; deux charges, deux cycles A/B/B/A, checkpoint et 64 ticks ordinaires par passe, huit de préparation. Toutes les valeurs World/PRNG, entrées effectivement passées, anciennes frames, refus, reprise et valeurs brutes historiques sont exacts ; les sources restent stables. Le premier cycle Aulnes ne montre aucun gain (4,509 → 4,511 ms), le deuxième baisse de 20,31 % (4,860 → 3,873 ms). Les résultats contrastés motivent une préparation symétrique avant décision.

`aulnes-v228-namespace-private-warm-2026-10-06T00-06-42.902Z-12656` passe en 170,632 s : deux replays complets non chronométrés par variante avant les deux cycles mesurés, avec les mêmes oracles. Sur Aulnes, adoption moyenne 5,327 → 4,107 ms (−22,90 %), puis 5,222 → 4,126 ms (−20,99 %) ; p95 7,683 → 6,029 ms puis 7,665 → 6,422 ms. Maxima 10,375 → 7,624 ms puis 8,475 → 8,026 ms. Ce bénéfice porte uniquement sur l'adoption SSR préparée, sans publication, scène, navigateur ou FPS.

La contrepartie mixed100 demeure défavorable dans ce banc préparé : 1,897 → 2,122 ms (+11,82 %), puis 1,882 → 2,076 ms (+10,32 %). Le premier essai donnait ±1 %. Cette différence n'est pas effacée ni attribuée sans preuve à un algorithme ; elle impose une mesure des sources réellement intégrées. La collection privée et les scripts ne certifient pas encore les signatures typées du produit ou ses quatre writers actifs.

## Intégration engagée

Une archive exacte V227 `bd0df0ec` est extraite sous tmp/performance-orientation-v227/scene-index-next/baseline pour les comparaisons suivantes. Les résultats sur V225 ci-dessus restent séparés. Les agents écrivent dans des fichiers distincts : feuille/annotations du registre, index/ResourceLayer, couvert de l'herbe ; root intègre ColonyRenderer et lance les contrôles. Les anciens oracles V227 et les 62 payloads publics ne sont pas modifiés.

À cette étape, la promotion du candidat exige encore typage, cohorte des gardes et index, oracles complets des consommateurs et mesures intégrées sur matériel. Sauvegarde/reprise doivent être établies par leurs contrôles effectifs ; un parcours de présentation ne les certifie pas implicitement. Aucun résultat à venir n'est crédité rétroactivement.

## Premiers contrôles intégrés

`aulnes-v228-grass-render-boundaries-2026-10-06T00-16-43.132Z-8868` passe en 8,537 s : six fichiers/26 cas ; `aulnes-v228-scene-index-oracles-2026-10-06T00-17-19.086Z-18836` passe en 5,476 s : un fichier/12 cas. Ordre et références des sorties, buffers/ranges/bounds, couvert/sang, sources sautées, replis et recul sont contrôlés.

Le premier typage `aulnes-v228-types-2026-10-06T00-17-43.503Z-26260` échoue en 4,628 s : la fixture affecte NaN à schemaVersion typé littéralement 198. L'écriture adversariale emploie ensuite Reflect.set, sans changer son input réel ou son verdict. Reprise `aulnes-v228-types-retry-2026-10-06T00-18-12.283Z-18716` verte en 4,197 s. `aulnes-v228-namespace-boundaries-2026-10-06T00-18-16.547Z-27408` passe en 9,659 s : dix fichiers/67 cas, dont les quatre writers non vides, leurs collisions, refus tardif après vrais projectile/vague, raw historique et reprises exactes. Union des premiers contrôles : 17 fichiers/105 réussites.

## Première comparaison matérielle : régression

`aulnes-v228-native-abba-2026-10-06T00-18-45.234Z-10444` passe en 91,192 s, un cycle matériel A/B/B/A contre V227 figé. Même sauvegarde, caméra iso-near, qualité canonique, Chromium headless matériel, trois secondes de préparation et huit de mesure, aucun profiler/GPU timer. Sources, entrées et harness exacts et gelés.

Les témoins donnent 100,38/95,63 RAF/s, les candidats 93,01/92,39 ; moyenne **98,01 → 92,70 (−5,41 %)**. CPU frame moyen 5,316 → 5,949 ms (+11,90 %), malgré décodage moyen 4,552 → 3,952 ms (−13,18 %). Les p95 moyens par passe deviennent 17,35 → 17,15 ms ; cela n'annule pas la régression complète. Débit 5,914 → 5,924×, sans gain de vitesse déclaré. Le candidat n'est pas admis sur cette preuve.

Le premier état de toutes les sources candidat est conservé dans tmp/performance-orientation-v228/initial-candidate-src, distinct des rapports. Le banc du pipeline et les replis de l'index/herbe vont préciser le coût déplacé ; aucune attribution causale supplémentaire ou correction future n'est acquise. L'ordre d'insertion de deux Maps privées lookup/growth diffère dans la voie full par chunks, sans changement connu de la sortie graphique : les ordres source/chunks/ranges et l'effet public updateGrowth restent les oracles, pas une égalité inventée de tout état interne.

Les maxima CPU des deux témoins sont 40,8/42,3 ms contre 63,2/68,7 ms pour le candidat initial ; p99 30,3/31,6 contre 47,0/47,4 ms. Le recul ne se limite donc pas à la moyenne. Draws et triangles restent descriptifs, avec des fenêtres de ticks légèrement différentes ; aucune baisse de qualité ou de détail n'est demandée.

## Décodeur réellement intégré

`aulnes-v228-namespace-integrated-2026-10-06T00-27-25.730Z-27568` passe en 223,779 s. Les modules entiers V227 figés et ceux du candidat réel sont chargés sans transformation virtuelle ; préparation symétrique de deux replays par variante, puis deux cycles ABBA de 64 ticks ordinaires par charge. World/RNG complets, vraies entrées, anciennes frames, lecteurs, validateurs, sérialisation, refus et reprises restent exacts ; sources gelées.

Sur Aulnes, adoption 4,959 → 4,231 ms (−14,68 %), puis 4,976 → 4,252 ms (−14,54 %) ; p95 7,296 → 6,356 puis 7,632 → 6,437 ms, maxima 7,748 → 7,442 puis 8,505 → 7,471 ms. La contrepartie mixed100 donne +1,58 %, puis −6,67 % ; elle ne reproduit pas les +10–12 % du prototype V225 préparé. Ces résultats ne remplacent pas les anciens ni n'expliquent leur différence sans preuve. Ce gain intégré reste celui du décodage isolé, avant application graphique et sans FPS acquis.

## Pipeline initial et coût du repli

`aulnes-v228-scene-pipeline-initial-2026-10-06T00-31-36.583Z-6548` passe en 182,778 s, mais confirme une régression. Le banc gelé compare tous les états courants graphiques/World/PRNG/entrées/vues et rétentions dans une cohorte lockstep avant les chronomètres ; deux vraies fenêtres de 64 ticks V227, publications de présentation sautées identiquement, puis un cycle ABBA par charge avec huit ticks de préparation. Le sous-pipeline inclut projection/index, herbe, Nature, clusters, filtre, ResourceLayer, Overview, chop/vent/caméra. Il exclut les autres phases applyWorld et tout dessin GPU. Les replays mesurés comparent les Worlds/vues/entrées à chaque tick et l'état graphique final complet ; leurs buffers intermédiaires ne sont pas tous recopiés dans les timers. Query/recul/refresh public préparés restent distincts des ticks joués.

Pipeline moyen Aulnes 5,985 → 6,892 ms (+15,16 %) ; mixed100 1,995 → 5,363 ms (+168,84 %). Les deux passages herbe Aulnes ont des p95 de 4,55/4,15 ms contre 19,60/19,04 ; mixed100 2,45/1,97 contre 20,83/24,89. Le chemin candidat courant est rapide (médianes pipeline Aulnes 1,879/1,816 contre 3,493/3,319 ms), mais les recaptures complètes déclenchent coverState et la lecture de tous les pixels. L'index full ajoute encore environ 5–8 ms sur ces applications. Ce diagnostic ne créditera pas une correction future sans mesure complète.

Le froid Aulnes est aussi défavorable (pipeline 278,8/216,7 ms contre 442,6/408,1), contrairement à mixed100 plus proche (771,2/751,9 contre 781,1/802,2). Les sources restent gelées, toutes les sorties sont neuves. Une proposition privée calcule le multiset exact des cellules rocheuses lors des deux parcours full déjà requis, avec mêmes domaine/prédécesseur et replis conservateurs ; elle ne restitue aucun journal source ni ordre inconnu.

## Correction du bilan complet et contrôles

Le prototype gelé ajoute un bilan multiset dans les deux boucles full existantes et un lecteur de domaine privé aux stamps. SameMap utilise les seed/dimensions possédées pour sparse comme full. Checkpoint/epoch/clone/même objet/autre décodeur/metadata mutées gardent l'absence de contributions ; la capture locale invalide ne publie aucun frame partiel. Les nouveaux tests distinguent les publications réelles des requêtes géométriques préparées ; aucune campagne n'est créditée.

L'ancienne assertion reset/membership/reorder/classification/eviction est conservée dans initial-candidate-tests avant adaptation : reset reste undefined ; membership roche fournit son ajout exact ; les autres donnent un bilan vide après recapture complète. Aucun oracle de source/chunk n'est retiré. `aulnes-v228-full-cover-boundaries-2026-10-06T00-42-46.043Z-21716` termine en 18,416 s avec 18 fichiers/125 cas réussis, un échec dans l'ancienne liste d'exports du facade. Le test conserve l'interdiction du writer et ajoute l'assertion du nouveau lecteur, faux/clones/étrangers négatifs et absence de fabrication de témoin. Reprise du seul fichier `aulnes-v228-domain-exports-reprise-2026-10-06T00-43-35.061Z-25884`, verte en 4,631 s : 12 cas. **19 fichiers/126 réussites par reprises, pas une passe monolithique verte.** Typage complet `aulnes-v228-full-cover-types-2026-10-06T00-43-48.047Z-23268` vert en 4,885 s.

Avant ce changement d'index/lecteur pur, `aulnes-v228-public-namespace-oracles-2026-10-06T00-35-24.383Z-13300` passe en 94,095 s : 62 lecteurs/roundtrips/ticks réels comparés à V227 figé, transports full/sparse et anciennes frames exacts ; checkpoint authentique V2256987→6999 par 12 ticks réellement continués, reprises save/full/sparse et endpoint7000 exacts. Payloads et métadonnées restent byte exacts. Ce contrôle du registre demeure applicable : le changement suivant n'ajoute aucun appel dans l'adoption et ne change aucun garde/assembleur/sérialiseur moteur.

`aulnes-v228-presentation-initial-2026-10-06T00-37-14.647Z-16056` passe en 117,945 s sur le candidat initial : vraies actions mine/chop et switches6/1/3, captures et rapports nouveaux dans un outputDir distinct. Zéro saut, excès continu de déplacement ou occupation solide ; maxima RAF22,9/40,5 ms. Ce parcours ne joue aucune sauvegarde, aucun chargement ni reprise. Il ne certifie pas les coûts ni les pixels du nouveau bilan complet ; les comparaisons suivantes les contrôlent séparément.

## Pipeline après bilan complet

`aulnes-v228-scene-pipeline-full-cover-2026-10-06T00-44-03.456Z-2824` passe en 188,865 s. Le même banc gelé produit des sorties neuves, avec moteur/validation stricte/encodeur exclusivement V227, sans normaliser le World. Il conserve un checkpoint puis 64 ticks ordinaires par charge, huit ticks de préparation et 56 mesurés, un cycle ABBA, les mêmes révisions de présentation sautées et les mêmes oracles complets. Aulnes commence au tick 6934 avec 18 224 ressources et 2 226 structures ; mixed100 au tick 2000 avec 10 077 ressources et 670 structures. Rapport : `tmp/performance-orientation-v227/scene-index-next/scene-pipeline-full-cover-report.json`, empreinte du manifeste `740a93ebe8090c6538036bdf435b3ef782dbfa68143de13a5ba823569815b611`, sources avant/après inchangées.

La moyenne des deux passes donne **Aulnes 5,376 → 5,236 ms (−2,61 %)**, contre **mixed100 1,902 → 1,929 ms (+1,41 %)**. Les deux moyennes candidat Aulnes restent contrastées : 5,712 et 4,759 ms, face à 5,472/5,279 ms pour V227. L'herbe Aulnes tombe à 0,118/0,110 ms en moyenne, mais la projection/index demeure à 0,874/0,767 ms avec p95 6,473/6,133 ms ; ce helper ne peut donc résumer le gain du pipeline.

Les pointes et le froid ne s'améliorent pas globalement : p95 pipeline Aulnes 24,654/25,044 ms contre 34,695/27,758, maxima 25,352/26,454 contre 47,796/30,837 ; première application 264,959/228,356 contre 463,102/424,665 ms. Mixed100 conserve un froid 758,243/739,894 contre 752,955/815,029 ms et des maxima 11,837/10,494 contre 11,886/14,345 ms. Construction des couches, première application et mesures préparées sont des postes distincts. Aucun gain général ou coût de chargement réduit n'est annoncé.

La cohorte lockstep conserve l'égalité des états courants complets et de leurs rétentions à chaque application : ordre/références source, chunks, slots, géométrie, buffers, ranges, bounds, couvert/sang, recul et sorties Nature. Chaque replay chronométré conserve aussi World/RNG, véritables inputs, anciennes frames/vues et état graphique final complet. Le contrôle public updateGrowth et les requêtes géométriques préparées restent distincts des ticks ordinaires. L'exception d'ordre des deux Maps privées demeure explicitement limitée à leurs associations par ID ; les ordres et effets publics ne sont pas relâchés. Le sous-pipeline exclut les autres phases d'applyWorld, worker/transport, dessin GPU et cadence native.

## Comparaison matérielle après bilan complet

`aulnes-v228-native-full-cover-abba-2026-10-06T00-47-58.183Z-25984` passe en 89,876 s sur un cycle A/B/B/A, contre l'archive entière V227. Même sauvegarde immuable des Aulnes au tick 6934, caméra iso-near, réglages canoniques du harness, Chromium headless matériel, trois secondes de préparation et huit mesurées par passe, aucun profiler ni timestamp GPU. Les quatre fenêtres font 286 ticks et finissent à 7220. Aucun input, fichier source ou harness ne change. Rapport : `tmp/performance-orientation-v228/native-full-cover-abba-report.json`, empreinte `949d3929d7a17c12db1f0a3dca694ead11deff6ce404bd1e7eeb70a4e956f5b3`.

Cadence RAF moyenne **102,689 → 105,041 images/s (+2,29 %)**, CPU d'image 5,077 → 4,920 ms (−3,10 %), décodage 4,373 → 3,853 ms (−11,90 %). La moyenne des p95 CPU par passe est 16,0 → 15,5 ms. Les maxima CPU restent défavorables : 44,7/43,0 ms pour V227, 47,0/49,8 pour le candidat ; p99 28,3/30,0 contre 31,8/31,6. Le débit observé est 5,933 → 5,925×, sans gain de vitesse. Les moyennes worker 18,568 → 18,523 ms sont descriptives : le moteur n'est pas modifié, aucune accélération du tick n'est déduite. Les callbacks snapshot deviennent 1,397 → 1,468 ms ; ce poste défavorable reste visible.

Ce cycle local corrige le signe de la première régression, sans effacer celle-ci ni établir une significativité statistique, 240 FPS ou les FPS du moniteur utilisateur. Le gain de décodage ne devient pas un gain équivalent de scène. La passe n'exerce pas un save/load ; les preuves de lecteurs et de reprises restent celles de leurs oracles dédiés.

## Budgets du candidat en pause, 1× et 6×

`aulnes-v228-native-budget-2026-10-06T00-50-46.758Z-11292` passe en 45,680 s, sans timestamps GPU. Chaque phase recharge le même raw des Aulnes au tick 6934, fixe la caméra/réglages, prépare trois secondes et mesure huit secondes ; navigateur privé Chromium 153/WebGPU matériel AMD RDNA-1, 1920×1080/DPR1. Rapport `tmp/performance-orientation-v228/native-budget-full-cover.json`, manifeste `3ec45448fdc027c5672b13602b69a3167b408c98c129f1a8d989500af760d59c`, inchangé avant/après. Ce diagnostic porte sur le candidat seul.

| Vitesse demandée | RAF images/s | CPU image moyen / p95 / max (ms) | Décodage moyen (ms) | Débit réel | Ticks mesurés |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pause | 165,814 | 1,087 / 1,400 / 4,400 | aucune publication | 0 | 0 |
| 1× | 149,241 | 2,338 / 3,100 / 42,000 | 4,038 | 0,998× | 48 |
| 6× | 110,666 | 4,624 / 13,500 / 36,400 | 3,563 | 5,966× | 287 |

À 1× et 6×, le worker rapporte 22,894/17,215 ms de tick moyen et 35,700/28,400 ms de p95 ; ces fenêtres différentes ne sont pas une comparaison du même tick. L'instrumentation ne donne pas tout le coût du worker. La caméra réellement capturée vise (104,89), zoom 2/span 16,96, 63,68 pixels/cellule ; brouillard naturel, herbe/ombres présentes, aucun stress météo préparé. Les labels sont absents et les précipitations inactives dans l'état capturé, même si les options du harness les autorisent. Les compteurs de draws/triangles ne certifient pas le dessin exhaustif des bundles retenus.

`aulnes-v228-native-gpu-budget-2026-10-06T00-52-44.778Z-23356` passe séparément en 34,010 s, avec timestamps GPU, uniquement pause/6×. Rapport `tmp/performance-orientation-v228/native-budget-gpu-full-cover.json`, manifeste `9fe4eadc29bf2fe4e2decc152d18fe367a2c1be09f391ba54e1b0de1e6d0e5dd`, inchangé avant/après. Le seul fichier dont le hash diffère entre les deux manifestes est le harness privé native-budget.mjs ; les sources produit gardent leurs mêmes hashes. Aucun résultat GPU A/B contre V227 n'est produit.

| Phase instrumentée | Samples GPU | GPU moyen / p95 / max (ms) | CPU image moyen / p95 (ms) | RAF images/s | Débit réel |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pause | 726 | 3,018 / 3,080 / 3,342 | 1,104 / 1,400 | 165,792 | 0 |
| 6× | 338 | 3,307 / 3,736 / 4,522 | 4,914 / 14,500 | 104,889 | 5,933× |

Les timestamps instrumentés ont leur propre cadence ; CPU d'image inclut JS et soumission, GPU mesure l'exécution côté appareil. Décodage et tick worker sont échantillonnés sur d'autres appels. Ces postes inclusifs ne s'additionnent pas en un budget total, et la différence des deux passes ne mesure pas isolément le surcoût de l'instrumentation. RAF headless reste distinct du moniteur humain. Aucune erreur navigateur ou GPU n'est observée sur ces budgets ; cela ne prouve ni un coût GPU nul ni toutes les caméras/météos.

Ces mesures précèdent la troisième version, réconciliant les captures/buckets au lieu de reconstruire systématiquement l'index. Elles ne contrôlent pas cette réconciliation et aucun gain associé n'est crédité ici. Les résultats ci-dessus concernent exclusivement le candidat avec bilan complet ; V228 reste non livré et les preuves de la version suivante seront distinctes.

## Réconciliation complète : contrôles et pipeline

Le prototype privé `full-reconciliation-prototype/scene-resource-index.ts`, SHA256 `f7651d69671f88da756110470061126a8ec351fb7715e6ceeccb04bc9351b2bd`, est promu sans changement de ses gates. Les quinze nouveaux cas comparent les requêtes exhaustives, références actuelles, arrays historiques, contributions de roches, permutations d'IDs, troncatures, insertions, reclassements et erreurs tardives.

`aulnes-v228-reconciliation-boundaries-2026-10-06T00-58-08.132Z-12856` échoue en 14,582 s : dix fichiers passent, et quatre des quinze nouveaux cas échouent. La fixture de largeur 250 employait des coordonnées 259 et 322, car le chunk fait 64 cellules. Elles deviennent 195 et 133 ; aucune assertion ni garde n'est retiré. La reprise du fichier, `aulnes-v228-reconciliation-fixture-reprise-2026-10-06T00-58-51.019Z-20436`, passe ses quinze cas en 5,238 s. Union ciblée finale à cette étape : **20 fichiers/141 réussites par reprises**, et non une exécution monolithique verte. Typage complet `aulnes-v228-reconciliation-types-2026-10-06T00-59-04.259Z-24636` passe en 4,911 s.

`aulnes-v228-scene-pipeline-reconciliation-2026-10-06T00-59-17.641Z-7624` passe en 186,071 s, avec exactement le protocole et les oracles du banc précédent. Rapport neuf `tmp/performance-orientation-v227/scene-index-next/scene-pipeline-reconciliation-report.json`, manifeste `0ae4706287d34f4cb1e8e2a0f935c63a972734ca7204e537bf17794ac560b04f`, sources avant/après exactes. Moyennes pipeline des deux passes : **Aulnes 5,933 → 4,419 ms (−25,51 %)**, **mixed100 1,890 → 1,288 ms (−31,83 %)**. Les médianes Aulnes passent de 3,758/3,259 à 1,948/1,812 ms ; p95 de 30,104/26,494 à 27,072/24,098, maxima de 30,439/28,748 à 28,587/24,363.

Le froid demeure défavorable sur Aulnes : 264,843/257,196 contre 455,719/398,269 ms. Mixed100 commence à 795,429/715,925 contre 785,687/757,148 ms. L'index préparé Aulnes coûte encore 0,532/0,430 ms en moyenne, p95 3,902/2,976. Toutes les assertions de World/RNG/inputs/anciennes vues et des buffers graphiques complets restent présentes ; ce gain du sous-pipeline exclut les autres phases du renderer, les hops worker, l'exécution GPU et la cadence native.

## Réconciliation : première comparaison matérielle

`aulnes-v228-native-reconciliation-2026-10-06T01-02-33.424Z-12472` passe en 90,733 s. Même protocole matériel ordinaire et archive V227 ; rapport `tmp/performance-orientation-v228/native-reconciliation-abba-report.json`, manifeste `17d8cf26e36b670b46a720f4962980e3f3212e4d926bcf255d33ecb5dacea843`, sources exactes. RAF moyen **99,555 → 103,680 images/s (+4,14 %)**, CPU d'image **5,309 → 5,036 ms (−5,14 %)**, moyenne des p95 par passe **17,65 → 15,95 ms**. Le décodage moyen devient 4,517 → 4,122 ms ; son p95 moyen est cependant 6,80 → 6,95 ms.

Les maxima CPU sont 41,4/56,4 ms pour V227, 49,0/39,6 pour le candidat ; p99 29,7/33,2 contre 33,5/29,8. Le débit réel est défavorable dans ce cycle : **5,929 → 5,802× (−2,15 %)**, avec 285/285 ticks contre 276/282. Les ticks worker moyens deviennent 18,809 → 19,270 ms et les callbacks 1,445 → 1,592 ms. Le moteur et les règles ne changent pas, mais cette contrepartie matérielle doit être vérifiée par un second cycle, et non masquée par le gain moyen RAF. Aucun 240 FPS, vrai 6× stable ou gain général acquis ; V228 reste candidat à cette étape.

## Confirmation matérielle et caméra de colonie

`aulnes-v228-native-reconciliation-confirmation-2026-10-06T01-04-30.883Z-1736` passe en 90,970 s, même caméra historique, même protocole, sources exactes et sorties neuves. Rapport `native-reconciliation-confirmation-abba-report.json`, manifeste `5b9f242388f2a6494b7b0689f8f0d5b6e168dc8582c3d578ac3f28220f6db572`. RAF moyen **100,991 → 108,302 (+7,24 %)**, CPU moyen **5,247 → 4,772 ms (−9,06 %)**, p95 moyens **17,45 → 14,90 ms**, décodage **4,443 → 3,802 ms**. Maxima CPU 45,1/44,0 contre 42,8/37,4 ; p99 29,6/33,0 contre 28,1/28,1. Débit **5,920 → 5,943×**, 285/285 ticks contre 286/287 ; ce cycle ne reproduit pas le recul de la première comparaison. Les deux cycles restent distincts : aucun débit stable à exactement 6× ni significativité générale n'est annoncé.

La caméra historique suit la position initiale du premier colon (104,89), zoom 2 ; elle n'est pas centrée sur tout le village. Le contrôle supplémentaire change uniquement deux choix du harness privé, identiques pour A/B : target (129,0,122), zoom 1. Tous les réglages de qualité, cadence, charge, pauses et chronomètres restent ceux du harness préservé. Le nouveau harness `native-colony-audit.mjs` porte le SHA256 `8baec8b5c8e88710119f4817c91535a98cdfac96caebe3a7c56abe18a71a2f0c` ; sa préparation vérifie le hash original et exactement une occurrence de chacun des deux remplacements. Le wrapper impose dans chaque résultat la pose complète attendue et sa stabilité entre passes. Les valeurs de cette autre caméra ne sont pas fusionnées avec les cycles précédents.

`aulnes-v228-native-colony-reconciliation-2026-10-06T01-07-06.938Z-6080` passe en 90,281 s. Rapport neuf `native-colony-reconciliation-abba-report.json`, manifeste `99ed96b23243329a92a55c992eae371ceda90504325b3e1851d61f0033f5f282`. RAF moyen **96,915 → 107,816 images/s (+11,25 %)**, CPU moyen **5,521 → 4,830 ms (−12,52 %)**, moyenne des p95 **18,80 → 14,45 ms (−23,14 %)**. Décodage **4,540 → 3,916 ms (−13,74 %)**, callbacks **1,473 → 1,414 ms**. Débit **5,900 → 5,934×**, 283/285 ticks contre 285/286. CPU max 47,5/44,4 contre 48,6/44,0 ; p99 32,7/32,7 contre 28,7/28,8. Un maximum candidat demeure plus lent ; les pointes ne sont pas résolues.

Dans cette vue dense, les draws encodés restent autour de 93 et les triangles comptés autour de 1,121 million, avec variations des ticks réels. Ces compteurs ne constituent pas une égalité de toutes les images ni de l'exécution GPU ; les données graphiques exactes sont contrôlées par les replays lockstep. Ce cycle est matériel, local et headless, sans profiler ni timestamp GPU ; aucun FPS du moniteur humain ni 240 FPS n'est certifié. Il ne joue pas de save/load, contrôlé ensuite séparément.

## Livraison contrôlée

`aulnes-v228-native-save-recovery-2026-10-06T01-09-21.080Z-13892` passe en 55,657 s sur la réconciliation finale : vrai chargement de catalogue des Aulnes6934, WebGPU matériel, quatre caméras de sièges/moniteurs, au moins 18 ticks ordinaires à 1× puis 120 à 6×, pause acquittée, sauvegarde compressée exactement égale au confirmé, chargement identique et au moins 18 ticks supplémentaires à 6×. Les captures neuves de `tmp/performance-orientation-v228/native-results/` sont inspectées ; aucun écran/dossier inversé ni erreur navigateur observés dans ce parcours. Les 62 entrées du catalogue restent présentes. Ce parcours ciblé ne certifie pas toutes les scènes ni une campagne longue.

Typage final de la réconciliation déjà acquis ; `aulnes-v228-build-2026-10-06T01-10-30.672Z-24744` passe en 1,602 s, sources produit inchangées depuis les oracles et cycles finaux. Les 20 fichiers/141 cas ciblés restent une union par reprises. Les oracles publics et la continuation authentique6987→7000 portent sur les mêmes gardes/assembleurs du registre intégré, non modifiés par la réconciliation graphique. Le parcours presentation initial mine/chop reste distinct ; les modifications graphiques suivantes ont leurs oracles complets et leur reprise matérielle finale, sans nouvelle horloge, phase ou cadence.

Les performances près de 240 FPS restent non résolues. Aucun langage réécrit, nouveau contenu Core, campagne annuelle, navigateur exhaustif ni accélération générale du moteur n'est annoncé. La prochaine qualification doit séparer les coûts complets de scène, du garde hors main, des deux clones et du miroir/journal, préserver les replies et vérifier que le bénéfice n'ajoute pas de retard ou de pertes de phases.

`aulnes-v228-docs-2026-10-06T01-12-10.266Z-27640` passe en 1,138 s sur les documents canoniques actualisés. `aulnes-v228-public-bytes-final-2026-10-06T01-12-32.769Z-14604` passe en 0,106 s : tous les noms, payloads et fichiers de métadonnées de public/test-saves sont relus et comparés byte à byte à l'archive exacte V227. Aucun fichier public ajouté, supprimé ou remplacé.
