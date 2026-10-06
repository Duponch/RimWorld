# Qualification V233 — journal structurel et scène

6 octobre 2026, ROOT seul pour tous les contrôles, sources gelées et commandes journalisées via `validate:logged`. Schéma 198 conservé ; changement limité aux cinq modules décodeur/façade, Nature/agenda et index. [Contrat](../development/resource-structural-presentation-v233.md), [recherche primaire](../research/resource-structural-presentation-v233.md). Qualification privée puis intégration contrôlée par reprises distinctes, sans réécrire les premiers rouges. Aucun 240 FPS, campagne longue ou performance générale certifiés.

## Sources et reprises

Le montage CPU et GAME substitue les cinq corps sur leurs IDs `/src/...` réels. Une unique instance de journal relie le décodeur aux consommateurs. Les imports de façade Nature/agenda/index sont rebassés exactement1/2/1fois ; la preuve d’inversion par segments et les hashes RAW/mappés sont conservés. Les autres modules, moteur, UI/audio, cadence, shaders et qualités restent canoniques.

Les trois rouges initiaux restent distincts de leurs reprises, sans assouplir un garde ni changer les corps candidats :

- Bridge : typage PASS2,191s ; six des sept oracles passent, puis une fixture compare la publication `missed` au producteur déjà avancé pour `ahead`. La reprise capture le World attendu au moment du packet : sept cas PASS8,928s, `aulnes-v233-structural-bridge-reprise-oracles-2026-10-06T05-58-09.122Z-26044`.
- Nature : typage PASS2,154s ; trois des quatre groupes passent. La fixture restante attribue `artificial-full` à un arbre legacy hors domaine végétal. Reprise de fixture seulement, sources RAW exactes : typage PASS2,310s et quatre groupes PASS5,709s, `aulnes-v233-natural-reprise-oracles-2026-10-06T06-18-49.413Z-14516`.
- Pipeline : première cohorte préparée de 98 publications/31 applications passe, dont 72 mises à jour nécessaires. La récupération suivante est construite à tort par spread d’un delta : son patch `structures` extérieur rend ambigu le checkpoint complet. Le vrai garde refuse. Échec conservé : **FAIL, 11,477 s**, `aulnes-v233-structural-pipeline-2026-10-06T06-26-54.388Z-22392`. Reprise séparée avec un vrai checkpoint forcé du SnapshotEncoder, copie NaN refusée puis original adopté à la même révision ; seuls fixture/messages changent.

GEL CPU final : `tmp/performance-orientation-v233/structural-pipeline-reprise-next`, manifest SHA256 `1A8EA45E369D2BDA45F9A5EF03E2CF310F7C6BDDDB71679EA60B909F1714AC0E`. Typage des cinq sources PASS0,845s. Reprise pipeline `aulnes-v233-structural-pipeline-reprise-2026-10-06T06-29-43.211Z-17576` **PASS776,429s**, rapport `pipeline-abba-report.json`, sources exactes avant/après.

## Oracles complets et coût des contrôles

Les deux scènes passent65admissions/54applications chacune, avec64vrais ticks moteur strictement validés : Aulnes6934→6998 et mixed2000→2064. Aulnes commence avec18224ressources/2226structures ; six transitions d’appartenance,5935patches lifecycle. Le wire réel contient un checkpoint/64deltas, trois retraits,5938upserts, zéro order explicite. Mixed :10077ressources/670structures, huit transitions,987patches lifecycle, onze retraits/993upserts/12records growth, zéro order explicite. Le moteur et l’encodage partagés sont mesurés séparément, hors comparaison A/B ; aucun tick ou contenu ajouté aux fenêtres de performance.

World/RNG, alias bidirectionnels, paquets et anciens graphes restent exacts. Le corpus compare géométries/attributs/index, ordre, slots/free/count, ranges de ressources, recoil, vent, bornes, masques/couvert/sang et références courantes de C. Il couvre B sauté, C retenu avant D déjà admis, naissance annulée, mêmeID réintroduit, classifications, ordre explicite, éviction64, checkpoint, refus/stale et récupération, voie mutable, compilation/restauration avec adoption interposée. Les arrays de vues/chunks anciens restent fixes. Les uploads nécessaires sont vérifiés :988dans la fenêtre Aulnes et38dans mixed, sans imposer l’égalité des compteurs redondants. L’API publique `ResourceLayer.updateGrowth` est réellement traversée sur deux baies devenues mûres selon ses queries historiques.

Exceptions explicites : la nouvelle dirtiness ne reproduit pas les faux changements d’ordinals. Les associations privées `resourceChunks/growing` sont comparées par ID, pas par leur ordre d’insertion chunké ; **toutes** les valeurs Resource de growing et l’effet de son parcours public restent contrôlés. Les valeurs, slots, ordre géométrique et mises à jour nécessaires ne sont pas relâchés pour faire passer le candidat. La preuve d’upload CPU ne remplace pas une compilation/draw GPU.

Le banc Node conserve des anciennes frames, copie de gros Worlds et buffers pour ses oracles. Ces vérifications, fingerprints et comparaisons sont hors fenêtres chronométrées, mais leur mémoire/GC éventuel peut affecter le processus ; aucune collecte forcée ni overhead soustrait. Les776s sont le coût du contrôle complet, pas la durée d’une application de jeu. Les rapports froids et complets restent séparés des seuls ticks mesurés. Aucun gain de latence de port navigateur n’est déduit de `structuredClone` Node.

## CPU : deux ABBA par charge

Chaque passage est neuf : construction/decoder, checkpoint froid, huit ticks de chauffe et56publications mesurées. Toutes les publications sont décodées ; même saut d’application modulo6=2. Le total direct contient **clone natif + adoption + pipeline concerné**, avec coût des replis. Le pipeline couvre terrain/index/herbe/Nature/Cluster/Resource/Overview/Crop/chop/presentation ; autres acteurs, structures/piles rendues, UI/audio et GPU sont hors périmètre. Les moyennes de pipeline concernent les applications, celles du total toutes les publications ; leurs timings imbriqués ne s’additionnent pas.

| Charge / cycle | Total moyen A→B, ms | Écart total | Pipeline appliqué A→B, ms |
| --- | --- | --- | --- |
| Aulnes1 |15,525→15,002|−3,37%|6,441→5,730|
| Aulnes2 |14,707→14,163|−3,70%|6,029→5,170|
| mixed1 |11,391→10,723|−5,87%|1,866→1,108|
| mixed2 |10,526→10,486|−0,38%|1,594→1,206|

Le froid peut régresser : au second cycle Aulnes, les premiers clone+décodage+application valent841…857ms pour A contre955…957ms pour B. Le total construction+froid+chauffe+ordinaire passe1807,17→1860,03ms dans ce cycle ; mixed2 passe1737,88→1827,61ms. Le gain ordinaire n’efface donc pas toutes les régressions de chargement ou de mémoire. Ces mesures SSR ne sont ni du GPU, ni des FPS, ni la cadence native.

## Vrai GAME matériel

`aulnes-v233-structural-native-2026-10-06T06-43-53.197Z-25584` **PASS219,864s**. Rapport parent `tmp/performance-orientation-v233/game-structural-abba-next/captures/run-2026-10-06T06-43-53.390Z-bk0TKn/report.json` ; ses huit `passes[].reportPath` pointent les childreports originaux de `dom-host-attribution-reprise-next` avec captures distinctes. Les cinq RAW/mappages/chargements restent exacts, erreurs vides et sources stables sur toutes les passes.

Chromium headless matériel WebGPU AMD rdna-1,1920×1080/DPR1 ; caméra orthographique129/122/zoom1,6× demandé, chauffe3s/fenêtre8s, deux A/B/B/A successifs. Le vrai main/client/worker/Core/queue/HUD/audio et musique restent actifs ;133assets audio chargés et contexte running, toutes les qualités conservées. Chaque passe sauvegarde/recharge strictement, conserve le graphe retenu et accomplit3266270comparaisons de recovery. Les ticks sauvegardés7364…7377 dépendent du temps réel des cohortes ; les nouvelles adoptions ne sont pas artificiellement synchronisées pour fabriquer un gain.

| Cycle | RAF/s A→B | Écart RAF | CPU frame moyen A→B, ms | applyWorld moyen A→B, ms | Décodage strict moyen A→B, ms |
| --- | --- | --- | --- | --- | --- |
|1|111,000→117,125|+5,52%|4,749→4,385|9,943→8,984|3,448→3,643|
|2|113,188→115,125|+1,71%|4,649→4,447|9,809→9,191|3,450→3,903|

Ces moyennes sont celles des deux passes par variante et par cycle, lues dans les champs réels imbriqués `frameCpuMs.mean`, `applyWorld.inclusiveMs.mean`, `decode.inclusiveMs.mean`. Agrégat des conditions :112,094→116,125RAF/s (+3,60%), CPU4,699→4,416ms (−6,01%), application9,876→9,088ms ; décodage3,449→3,773ms. Le journal ajoute donc du travail au décodeur tout en retirant du travail à la scène. Frame/apply/décodage sont inclusifs et sur des cadences distinctes : **ne pas les sommer** ni convertir les samples en budget exclusif.

Les p95 d’application des deux passes sont22,9…23,8ms pour A contre13,7…14,8ms pour B au cycle1 ;23,3…23,4contre14,5…15,8ms au cycle2. Maxima d’application A31,2/30,9ms contre B23,6/23,8ms. Le décodeur B atteint toutefois16,4ms sur une passe, contre un maximum A9,2ms sur l’ensemble. Aucune disparition générale des pointes n’est certifiée. Le débit source observé se situe6,08…6,14× dans ces fenêtres finies, sans certificat durable. La différence entre+5,52et+1,71% limite la portée du gain local ; le pacing headless ne certifie pas un moniteur240Hz. Aucun gain GPU spécifique n’est mesuré ici.

## Intégration ROOT

- Promotion des cinq corps par les seuls changements d’import qualifiés : `product-promotion-proof.json` PASS, hashes RAW/mappés identiques et inversion textuelle par segments. Aucun corps modifié entre les montages privés et les modules canoniques.
- Catalogue/sauvegardes : `aulnes-v233-public-oracles-2026-10-06T06-55-32.155Z-21296` PASS97,227s, 62 références, valeurs/RNG/ordre et full/sparse exacts, anciennes frames conservées. Contrepartie moteur V227 figée ; continuation authentique6987→6999 avec reprises réelles, puis recovery7000 séparée. Sources exactes avant/après. Les65fichiers publics, noms et métadonnées restent également exacts face à l’archive V227.
- Journal produit : `aulnes-v233-product-journal-2026-10-06T07-02-52.681Z-19820` PASS7,603s, deux fichiers/19cas. Sept nouveaux cas structurels, ancien journal ordinal conservateur et façade en lecture seule ; Worlds capturés à la création des paquets, verdicts et traces explicitement attendus. Le différentiel historique A/B reste qualifié dans son corpus privé.
- Cohorte initiale produit : `aulnes-v233-product-frontiers-2026-10-06T06-57-51.811Z-15136` FAIL80,659s, 22fichiers/150réussites/13échecs/un ignoré. Douze assertions comparent l’ancien Map ordinal redondant ; une treizième attend l’ordre d’exports de façade incorrectement mis à jour. Aucun échec de World avant ces assertions. Le rouge initial est conservé, sans crédit rétroactif.
- Reprise des seules cinq familles concernées : `aulnes-v233-product-dirty-reprise-2026-10-06T07-09-55.680Z-24068` PASS58,990s, cinq fichiers/52cas. L’oracle possède les scalaires des formes précédentes ; il exige chaque naissance, changement réel, retrait/classification, référence courante et ordre exact des entrées émises. Le Map est une sous-séquence exacte de la référence seulement sur une arête structurelle admissible ; les replis mutable/reset/checkpoint/epoch/éviction gardent l’égalité complète. Toutes les valeurs des anciens Worlds/vues restent comparées. Le patch optionnel retirant les diagnostics de ranges n’est **pas appliqué** : les comparaisons graphiques produit passent également avec ces champs. Les uploads nécessaires restent contrôlés séparément par le pipeline privé.
- Union finale des cohortes produit : 23 fichiers, 170 cas réussis et un ignoré, par reprises ; aucune régression globale ou campagne annuelle revendiquée.
- Parcours natif après promotion : `aulnes-v233-product-native-2026-10-06T06-59-59.017Z-1364` PASS88,993s. Chargement du catalogue, GPU matériel, caméras/qualités, 1×/6×, sauvegarde/reprise exacte, vraie perte GPU et reconstruction, continuation après récupération et erreurs vides. Sorties privées fraîches `product-native-next/native-results-private`, captures historiques préservées ; capture de récupération inspectée visuellement.
- Build produit : `aulnes-v233-product-build-2026-10-06T06-54-54.199Z-27240` PASS8,046s. Typage final après adaptation des oracles : `aulnes-v233-product-types-2026-10-06T07-13-09.902Z-25264` PASS5,556s.
- Présentation réelle minage/abattage : `aulnes-v233-product-presentation-2026-10-06T07-13-18.668Z-4304` PASS118,577s ; changements de vitesse, aucun saut, excès continu de trajet ni occupation solide. Les sorties sont propres à ce contrôle ; cette charge de trois colons ne remplace pas la mesure Aulnes.
- Documentation : `aulnes-v233-product-docs-2026-10-06T07-17-18.057Z-17240` PASS 1,397 s ; diff propre et cinq hashes mappés encore identiques au montage qualifié. Commit local explicatif, aucun push. Les références publiques et les sources moteur restent inchangées.

Les prototypes rejetés V231/V232 restent privés. Partage des queries de forme, bornes par blocs et recensement sonore structurel sont des suites éventuelles, sans résultat attribué à V233. Aucune campagne générale n’est rejouée pour ce changement de présentation.
