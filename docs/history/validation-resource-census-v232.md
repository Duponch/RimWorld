# Qualification V232 — trois pistes non intégrées

6 octobre 2026, ROOT seul, contrôles séquentiels sur sources gelées via `validate:logged`. Base documentaire V231 `1aea56d6` ; sources produit V230 exactes. Schéma 198, 62 payloads et métadonnées conservés. Ni build produit ni régression métier nouvelle ne sont requis : aucune source/test/public n'est modifié.

## Nature : exactitude puis rejet

Prototype privé `tmp/performance-orientation-v232/nature-reconciliation-next` conservé après typage rouge : Vitest 5 n'admet plus `minWorkers`, aucun oracle exécuté. Reprise distincte sans cette option : typage passe, six des sept oracles passent ; la fixture de feuilles au tick1000 est refusée par le vrai décodeur avant le candidat, car sa phase ne suit pas `(id+1)%200`. Reprise2 conserve les sources exactes et utilise la vraie phase, puis teste expiration −2/−1/= /+1 à6000ticks. Aucun garde ou calendrier modifié.

GEL final `nature-reconciliation-reprise2-next`, manifest `8361B42DC85E66C3ACA362087445C5A6A5993965F44588293D0997B08A4EA8DC`. Typage `aulnes-v232-nature-reprise2-type-2026-10-06T05-21-03.898Z-28144` PASS2,056s ; sept oracles `...05-21-08.292Z-16144` PASS5,503s. Banc pipeline `aulnes-v232-nature-pipeline-abba-2026-10-06T05-21-42.288Z-4032` PASS255,182s, rapport `pipeline-abba-report.json` dans ce GEL.

Deux cycles ABBA sur64ticks ordinaires/charge, chauffe8, coûts froids séparés. World/RNG/ordre/refs/graphes/buffers et sources exacts. Pipeline concerné index/grass/Nature/cluster/resources/overview/chop/presentation, pas Core complet/GPU/HUD/audio. Les présentations sautées restent réelles dans ce corpus. Aulnes6934→6998 : **3,743→3,895ms (+4,06%)**, puis **3,859→3,922ms (+1,64%)**. Seulement trois exécutions ById par passe malgré six transitions d'appartenance et5935 patches lifecycle. Mixed2000→2064 : −8,02 puis+2,78%, zéro exécution ById. **Rejet avant jeu matériel.** Le banc GAME privé préparé reste non exécuté, sans résultat attribué.

## Tri du décodeur : exactitude sans gain stable

GEL `decoder-resource-triage-next`, manifest `B63DFF7F34EF53B369109890845158DFF5135BB96D4FFDA570FFC72370C8F0D9`. Typage `aulnes-v232-resource-triage-type-2026-10-06T05-29-30.379Z-11612` PASS3,143s. Banc `aulnes-v232-resource-triage-abba-2026-10-06T05-29-37.523Z-26812` PASS362,793s ; rapport `decoder-resource-triage-report.json` dans ce GEL.37 sondes gardent les valeurs, lectures, getters/throws, holes/proxy/customsome et helper public ; paquets, World/RNG, aliases, anciennes frames, journaux, refus et recovery sont exacts.

32ticks ordinaires/charge, huit de chauffe,24adoptions mesurées, chauffe ABBA puis deux cycles complets, constructor/checkpoint séparés. Aulnes : **4,673→4,325ms (−7,43%, gain0,347ms)**, puis **4,141→4,211ms (+1,70%)**. Mixed : +0,38 puis−3,44%. Le seuil déclaré0,2ms sur l'adopt entier n'est pas atteint de façon stable. **Rejet avant intégration et matériel** ; un profil V8 favorable du callback ne remplace pas cette comparaison.

## Recensement sonore local : moyenne favorable, pointes défavorables

GEL `foliage-local-census-next`, manifest `6FC47CBA84AC2E0F7A6C85F7AD879946821BCB52C3397F286DDDB5A6EA3E8C6C`. Le premier lanceur de typage reçoit EPERM avant démarrage du compilateur ; reprise autorisée `aulnes-v232-foliage-local-types-retry-2026-10-06T05-36-05.335Z-21548` PASS3,096s. Huit oracles `aulnes-v232-foliage-local-oracles-2026-10-06T05-36-25.134Z-5708` PASS7,161s : tous mots Uint32/gains Object.is, calendriers, feuilles, membership/classification/mouvement, sauts66/checkpoint/epoch/reset/mutable et mutation confirmée avant gain. Aucune inspection diagnostique ne préchauffe les queries chronométrées.

Vrai GAME V231 : client/worker/Core/HUD/audio/music originaux, Chromium matériel AMD rdna-1,1920×1080DPR1, toutes qualités actives, caméra129,122/zoom1,6×,chauffe3s/fenêtre8s. B remplace seulement ambience et son helper. Horloges, gates audio et cadences ne changent pas ; adopt et gain disjoints sont cumulés, les autres parents inclusifs ne sont pas additionnés. Douze cohortes sauvegardent/rechargent strictement, vérifient anciens graphes/paquets et conservent leurs captures, sans erreur ni changement de sources.

| Montage ABBA | Total sonore A→B par8s | RAF/s A→B | Conclusion |
|---|---|---|---|
| Fixe, un cycle |307,9→119,5ms, −61,19%|112,125→113,625, +1,34%| Gain moyen sonore, pas FPS stable |
| Quatre déplacements réels, cycle1 |296,9→129,15ms, −56,50%|115,8125→112,5625, −2,81%| FPS défavorables |
| Quatre déplacements réels, cycle2 |321,15→127,55ms, −60,28%|110,625→112,375, +1,58%| FPS variables |

Fixe : A266/271adoptions et gains, B260/272 ; déplacement : A267…275adoptions, B267…276, trois/quatre gains supplémentaires seulement selon le vrai gate. Débit source observé autour6,10…6,16× dans ces fenêtres finies, pas un certificat durable. Le p95 d'adopt augmente d'environ1,4…1,7ms à2,8…2,9ms ; maxima B4…5,3ms en déplacement et jusqu'à12ms fixe. Les captures complètes après membership déplacent donc une pointe vers adopt. **Non promu**, malgré le gain moyen sonore.

Contrôles matériels : `aulnes-v232-foliage-local-native-stationary-2026-10-06T05-37-15.864Z-27760` PASS109,816s ; `aulnes-v232-foliage-local-native-travel-2026-10-06T05-39-47.662Z-17768` PASS217,777s. Rapports sous `foliage-local-census-next/alternating-captures/run-2026-10-06T05-37-15.925Z-jc6R6k` et `run-2026-10-06T05-39-47.722Z-vBsc7V` ; chaque row pointe sa cohorte matérielle.

Vérification ROOT des rapports, hors nouvelle mesure : premier contrôle rouge0,146s attend des cibles entières exactes alors que la projection ordinaire donne122,00000000000001/98,99999999999999. Reprise distincte `aulnes-v232-foliage-reports-review-reprise-2026-10-06T05-50-23.572Z-22472` PASS0,255s : états de caméra réellement capturés strictement identiques entre A/B, configuration armée GPU/qualité/audio/UI exacte ; tolérance1e−10 seulement pour reconnaître la cible entière demandée, jamais pour comparer les variantes. Les deux scripts et le rouge sont conservés. Petite/mixed contrepartie CPU GEL préparée mais **non exécutée** : la promotion déjà différée ne justifie pas ce contrôle supplémentaire. Aucune petite charge ou amélioration240FPS revendiquée.

## Suite

Journal structurel + consommateurs ID privés en préparation, sans nouveau wire : l'encodeur utilise déjà les deltas compacts dans le cas commun. Réconciliation numérique bornée peut subsister ; toute économie doit inclure sa capture, les gardes et les sorties de scène complètes. Le recensement local pourra être repris avec cette nouvelle provenance dans un autre GEL. Aucun prototype privé ni préparation de banc ne constitue une livraison. Continuer l'autonomie sur les vrais coûts, commits locaux seulement ; aucune cadence/qualité/règle/sauvegarde modifiée, aucune campagne générale recertifiée.

Clôture documentaire : `aulnes-v232-docs-2026-10-06T05-52-10.558Z-2728` PASS6,025s ; `git diff --check` passe, diff `src/tests/public` vide. Les contrôles rouges privés ne sont ni effacés ni crédités par leurs reprises.
