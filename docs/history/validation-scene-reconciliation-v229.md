# Validation V229 — réconciliation de scène

Lot engagé le 6 octobre 2026 sur V228 `59f6dc39`, schéma 198 inchangé. [Contrat](../development/scene-reconciliation-v229.md), [recherche](../research/scene-reconciliation-v229.md). **Livré dans le périmètre contrôlé : gain matériel local modeste, pointes/coût froid/240FPS ouverts.** Root seul exécute les contrôles lourds successifs sur sources gelées via validate:logged ; les captures, références et sessions antérieures restent préservées. Les statuts défavorables et reprises sont conservés.

## Profil causal V228

`aulnes-v229-scene-causal-v228-final-2026-10-06T01-14-07.651Z-11380` passe en 71,982 s. Même Aulnes6934, caméra historique proche, trois secondes de préparation puis 14 secondes à 1×/6×, WebGPU matériel. Le rapport et la trace restent privés sous tmp/performance-orientation-v229. Les sources sont gelées ; aucune erreur native. Cinq wrappers racines et 22 wrappers d'instances, profiler V8 et GC sont actifs ; leur overhead n'est pas soustrait.

Le traitement `aulnes-v229-trace-profile-v228-2026-10-06T01-21-42.962Z-23228` passe en 3,646 s : deux fenêtres utilisables, clocks et threads vérifiés, pas d'alerte. Les deltas bruts négatifs du profil sont conservés dans la reconstruction temporelle, sans les transformer en pourcentages CPU. Les positions générées sont reliées aux sources par les maps Vite. Rapport SHA a6e28c9f…, trace 7b45c092…, résumé 200de20d… ; source fingerprint 484090eb….

À 6×, 1367 frames totalisent 7679,2 ms CPU (moyenne5,618/p9518,4/max38,5). 361 applyWorld totalisent4176,9 ms (11,570/26,4/34,4). Le dessin direct inclusif dans frame totalise2911,4 ms et le résidu non enveloppé431,6 ms ; ne pas additionner les appels renderer imbriqués. Décodage404×/1629,5 ms et callback404×/666,7 ms sont hors frame. updateResources1426,3 ms inclut Nature1185,5 ms ; clusters/ressources/overview ne s'ajoutent pas une seconde fois. Résidu applyWorld1431,4 ms, qui n'est pas intégralement du texte. Aucun frame≥50 ms ; les anciennes pointes243 ms restent non expliquées.

## Prototypes privés et refus d'admission

L'extraction constructive privée du décodeur passe 12 cas dans deux fichiers : `aulnes-v229-extraction-private-tests-2026-10-06T01-30-50.585Z-27980`, 4,988 s. Ce contrôle ne qualifie aucun worker réel. Le premier smoke échoue avant SSR en0,292 s : il confond le SHA des octets stockés gzip et le SHA du JSON décodé. Les sources et sorties rouges sont conservées ; le banc compare ensuite chacun à sa vraie référence, sans changer aucun payload.

Reprise `aulnes-v229-ownership-private-reprise-2026-10-06T01-32-46.996Z-15300` verte en93,416 s. Checkpoint+8 ticks ordinaires sur Aulnes et mixed100, full/sparse, ordre A/B/C/C/B/A, deux ticks de préparation et replays de warmup. A=V228 strict, B=extraction stricte, C=miroir+protection générique. Worlds/RNG, ordre propre, vraies entrées, anciennes frames, gel, refus et reprises sont exacts. Les62 octets stockés et JSON décodés sont identifiés, sans certifier62 lecteurs nouveaux. Sources inchangées.

C coûte sur Aulnes full15,992 ms contre A4,317/B4,038 ; sparse13,261 contre A4,023/B4,147. Mixed C11,488–12,010 contre A1,953–2,031 ms. **Ce miroir est rejeté avant intégration.** Le banc exclut clone, workers/ports réels, queues, rendu et FPS. L'extraction seule ne donne pas de gain stable. Une alternative privée reste à mesurer séparément.

## Observations naturelles seules

Le contrôle initial `aulnes-v229-natural-observations-tests-2026-10-06T01-37-14.370Z-10196` échoue en33,890 s : 73 réussites/un ignoré et deux fixtures rouges dans neuf fichiers. Le refus utilise un ID arbitraire que les gardes historiques n'interdisent pas dans cette forme ; la fixture de feuilles porte une phase invalide. Diagnostic1 en6,161 s reste rouge ; reprise2 en6,246 s conserve un refus fictif par amount−1. Le privé original est conservé. Seule la fixture finale utilise le facteur thermique infini réellement refusé et la phase de feuilles admissible ; neuf cas passent en6,190 s (`aulnes-v229-natural-observation-recovery-reprise-2026-10-06T01-39-47.774Z-23420`). Aucun garde produit n'est durci. Union neuf fichiers75 réussites/un ignoré par reprises.

`aulnes-v229-natural-observations-pipeline-2026-10-06T01-41-21.396Z-13700` passe en190,983 s, sources gelées et oracles graphiques/World/RNG/inputs/vues complets. Archive entière V228,64 ticks ordinaires, huit de préparation, un cycle ABBA par charge ; sous-pipeline ressources/index/herbe/Nature/layers/chop, pas applyWorld entier ni GPU. Aulnes4,148→3,867 ms (−6,77 %), mixed1,439→1,585 (+10,14 %). Froid Aulnes264,9/238,9→475,1/418,9 ms. Cette première variante seule n'est pas admise sur cette preuve.

## Signatures et préfixe intégré

`aulnes-v229-signature-endpoint-2026-10-06T01-48-54.811Z-8656` passe en62,199 s. L'assertion du banc préparé attendait full au lieu du discriminateur réel checkpoint ; elle est corrigée avant sa première exécution, original conservé. Le producteur/encodeur/décodeur entier V228 joue32 ticks ordinaires, huit warm/24 mesurés, ABBA ; A expressions historiques, B seulement le helper privé. Portes, axes, paquets, bâtiments, home et stockage sont inclus. Strings entières, vraies entrées, World/RNG et anciennes vues exacts ; contreparties mutables hors timers ; sources gelées. Aulnes1,464→0,714 ms (−51,22 %), mixed0,490→0,284 (−42,07 %). Froid Aulnes9,908/10,060→12,554/11,157 ms, mixed0,660/0,726→0,835/0,844. Aucun gain FPS n'est déduit de cet endpoint.

Après intégration provisoire du préfixe et des signatures, `aulnes-v229-scene-boundaries-2026-10-06T01-50-49.225Z-21084` échoue en34,920 s :11 fichiers verts,83 réussites/un ignoré, une nouvelle fixture refusée. Le diagnostic en5,256 s établit État végétal invalide : une recréation d'ID emprunte la phase plantLife de l'ancien ID. La fixture crée ensuite le vrai plantLife de la nouvelle identité ; reprise2cas verte en5,230 s (`aulnes-v229-prefix-fixture-reprise-2026-10-06T01-52-19.625Z-10844`). Union12 fichiers84 réussites/un ignoré par reprises. Typage `aulnes-v229-typecheck-2026-10-06T01-52-33.139Z-15216` vert en4,858 s. Aucun changement produit pour obtenir ces reprises.

## Premier cycle matériel intégré

`aulnes-v229-native-colony-initial-abba-2026-10-06T01-52-47.694Z-18752` passe en92,290 s : A1/B1/B2/A2, V228 exact sur5210 et candidat sur5208, Chromium headless matériel. Aulnes6934, caméra dense (129,0,122)/zoom1, qualité canonique,6× demandé,3 s warm+8 s mesure par passe, pas de trace ni GPU timer. Sources stables, aucune erreur, sorties privées distinctes. Harness enfant historique inchangé ; son label v228 est conservé et n'identifie pas la version du candidat.

RAF/s104,488→111,679 (+6,88 %), CPU frame5,043→4,584 ms (−9,11 %), p95 moyens par passe15,95→14,40 (−9,72 %). Débit réel5,776→5,894× ; le gain RAF ne vient pas d'une vitesse réduite. Maxima CPU46,0/42,2→38,9/51,4 ms : la deuxième pointe candidat est défavorable. Les budgets décodage/callback/tick sont observés sur des fenêtres différentes ; leurs variations ne sont pas des optimisations de leurs sources inchangées. La cadence headless ne certifie ni240FPS utilisateur ni vrai6× stable.

## Pipeline du préfixe et confirmation matérielle

`aulnes-v229-prefix-signatures-pipeline-2026-10-06T01-55-22.258Z-18376` passe en181,199 s, mêmes protocole et oracles exacts que le premier pipeline, archiveV228 et sources gelées. Le SRC des signatures est présent dans le gel mais **cet endpoint ressources ne l'appelle pas** ; il mesure observations+préfixe/Nature et ses consommateurs, pas les signatures ou applyWorld entier. Aulnes4,208→3,853 ms (−8,44 %), p95 des passes23,576/23,218→19,941/19,542 ; maxima24,941/24,240→24,395/23,032. Mixed1,468→1,523 ms (+3,75 %), avec variation importante entre passes (A1,616/1,320 ; B1,385/1,662). Aucun bénéfice général n'est déduit de cette contrepartie.

Froid Aulnes284,8/235,2→424,7/413,8 ms ; mixed783,9/721,3→758,0/820,4. Le froid reste défavorable sur la référence. Le producteur de ce banc est exclusivement l'archiveA ; les modulesSSR et leurs préparations ne sont pas le chargement natif. Aucune cause de cette différence n'est inventée, ni gain de froid promis.

`aulnes-v229-native-colony-confirmation-abba-2026-10-06T01-58-36.031Z-24636` passe en90,173 s, second cycle matériel indépendant identique et sorties neuves. Sources stables, aucune erreur. RAF/s105,197→112,629 (+7,07 %), CPU4,971→4,536 ms (−8,74 %), p95 moyens15,85→14,20 (−10,41 %), débit5,915→5,937×. Maxima58,8/47,1→43,6/40,6 ms ; les pointes défavorables du premier cycle restent conservées. Le décodage inchangé varie3,908→3,938 ms et son p95 augmente ; il ne reçoit aucun crédit d'optimisation. Les deux cycles soutiennent un gain local modeste du candidat entier sur cette caméra, pas240FPS, toutes les vues ou une vitesse6× garantie.

## Sauvegarde et contrôles finaux

`aulnes-v229-native-save-recovery-2026-10-06T02-00-21.330Z-28552` passe en53,817 s. Chromium/WebGPU matériel charge les Aulnes via le catalogue de62 scènes ; six fauteuils TV, deux chaises extérieures et postes de recherche/dîner gardent leurs orientations, avec captures privées nouvelles. La partie reprend réellement à1× puis6×, tous les Worlds contrôlés sont valides ; sauvegarde IndexedDB exacte au World confirmé, rechargement exact, nouvelle continuation6× valide, aucune erreur navigateur. Sorties sous tmp/performance-orientation-v229/native-results-final ; les anciennes captures ne sont pas écrasées. Ce parcours ne constitue pas une mesure supplémentaire de FPS.

Typage déjà vert sur ces mêmes sources ; `aulnes-v229-build-2026-10-06T02-01-50.318Z-16848` passe en1,589 s. Présentation `aulnes-v229-presentation-2026-10-06T02-02-00.065Z-26408` verte en117,910 s : minage/coupe, vitesses6/1/3 et pause/reprise, aucun jump, excès de trajet ou occupant solide sur7801/7726frames. Ce contrôle n'est pas une comparaison de FPS du lot. Les62 payloads/catalogue/métadonnées sont ensuite comparés octet à octet à l'archiveV228 ; aucun nouveau lecteur de sauvegarde n'est annoncé comme certifié, les sources des lecteurs sont inchangées. Documentation et diff sont contrôlés avant commit.

Les gardes, producteurs, sauvegardes et moteur n'ont pas changé ; aucune nouvelle campagne longue ou parité Core n'est certifiée. La qualification des coûts de copie/adoption hors main continue après ce commit local. Aucun push ou déploiement.
