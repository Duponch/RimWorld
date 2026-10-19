# V433 — simulation et présentation des Forges

**19 octobre 2026 — candidat retenu, contrôles ciblés acquis, non publié ; schéma 263 inchangé.** Consolidation des performances, aucune nouvelle mécanique. La sélection retient Timber GLOBAL indexé et motion delta, sans adaptateur UniformSpanUpload ni variante Timber EW. Native08-motion, présentation finale et références Aulnes/Éclaircies passent, avec recharges entières exactes. Build Pages final acquis ; contrôle documentaire et publication restent à faire.

La simulation coûte 36,30 % de moins dans la paire Node acquise. Le dernier relevé Forges donne **131,19 FPS fixe et 103,80 en rotation**, soit +13,51 %/+7,78 % face à V432, avec une physique tenue à ×0,899/×0,947. Une seule fenêtre par cas ne démontre pas un gain marginal causal de motion. **Les Forges ne tiennent toujours pas 200–230 FPS**, et aucun confort général rétabli n'est annoncé.

## Charge, conditions et périmètre retenu

RAW Les Forges au tick 335 : carte 250², 80 colons, 241 animaux, 7 512 structures, 1 778 piles et 21 122 ressources ; 32 champs couvrant 4 498 cases, dont **2 514 cultures réelles**. SHA256 `54e261830e5c803d66f98709ed413b851a43ab3051e97428e2d9aebd7b3cd52d`. Les personnes, aménagements et stocks préparés restent ceux déclarés en [V432](stress-colony-v432.md) ; les 300 ticks réels 35→335 déjà acquis ne sont pas rejoués.

Chrome 155 natif/Windows, Ryzen 5 3600/RX 5700 XT, WebGPU AMD RDNA1, 2560×1440 DPR1. Caméra perspective large inclinée, qualité équilibrée, textures/décor/herbe conservés, ombres 2048/60 Hz. Fenêtres natives de 10 s, vraie rotation par glisser droit erratique ; contrôles lourds successifs et sources gelées. Une répétition par état/source, avec progression physique entre fenêtres. Les 3,09 Go de mémoire disponible relevés après la recharge finale ne sont pas un pic mesuré pendant les fenêtres.

- SIM : empreintes géométriques locales partagées pendant la phase de décision, invalidées aux commits d'environnement ; navigation humaine/animale et index de marqueurs d'enclos limités à leur portée. Portes, pièges, chunks, terrain/neige, jobs et identité de l'acteur restent relus. Aucun tick, ordre de commande ou tirage PRNG supprimé.
- Bridge : transport privé V3 des sections stockpiles/home/roofing/filth, reconstruites avant admission complète au même epoch/révision/tick. Prédécesseur manquant refusé, préparation/commit séparés. Encodeurs publics mutables et sauvegardes restent littéraux ; aucun drapeau de confiance ajouté au World.
- Motion : suffixes des historiques confirmés dans cette voie V3, même reconstruction complète au tick admis ; générations, checkpoints, refus/retry et anciens résultats conservés. Staging atomique, association au lecteur/paquet admis et absence de mutation MAIN des anciens historiques revus. Voies publiques V2/anciennes V3 littérales, cadence de mouvement et horloges inchangées.
- Cultures : valeurs exactes calculées dans le Worker, pages distinctes de la flore, bornes résidentes complètes. Colonnes fermées IDs/croissance Float64, ordinals Uint32 et flags Uint8, sans quantification ni lignes objets parallèles. Ancien wire objets et absence historique de crops restent lus ; le retour de l'absence exige un checkpoint. Aucun buffer World transféré/détaché.
- Rendu/UI : patches et identités résidentes, cartes de colons maintenues, Timber indexé exact en deux lots Overview globaux. Tous les mots Float32 position/normale/couleur/UV et l'ordre des triangles sont conservés : murs 318→164 sommets, rives 66→44, sans retirer de triangle. Culling global comme en V432 ; partitions 64/32 et tri de profondeur écartés.

## Simulation exacte et coûts de composants

`tmp/performance-v433/sim-pair01/{before,after}` établit l'égalité des **25 Worlds entiers 335…359**, puis la recharge stricte finale. État 359 : 15 637 491 octets, SHA256 `f668d74c38c9c6d0aff6d0d94a916f99e651f9ee39867e3ce148462a74f44c39`. Les chronométrages distincts time-before/time-after excluent sérialisation, validation et compression : 24 ticks 5 364,93→3 417,44 ms (−36,30 %). Cette paire Node ne prouve ni gain FPS ni débit général ×6.

Crop Wire `crop-wire/same-pass/run02/receipt.json` passe en 29,781 s mur : une chronologie réelle 335→343, deux échauffements, quatre répétitions AB/BA équilibrées, 32 observations de delta par bras. Avance SIM et oracles hors chronomètres ; valeurs/bits Float64, sidecars développés, pages, clones et anciens frames exacts, save335 inchangée.

| Sidecar natural complet, deltas 336…343 | Objets | Colonnes |
| --- | ---: | ---: |
| Capture Worker moyenne | 15,471 ms | 16,087 ms |
| structuredClone moyen | 1,803 ms | 0,060 ms |
| prepare owner moyen | 2,132 ms | 0,731 ms |
| Cultures transmises par frontière | 1 677 | 1 677 |

La capture augmente d'environ 0,616 ms : croissance et captures existantes restent calculées. Colonnes : 52 794 octets au checkpoint de 2 514 cultures, puis 35 217 par delta de 1 677 cultures, sans retraits dans ce calendrier. Les tailles JSON ne sont pas des octets postMessage ; ce banc ne mesure ni event.data ni l'admission résidente complète.

Filth.same (`filth-transport/same-pass/run01`) conserve les 621 lignes transmises après 24 appels réels advanceFilth et météo 335→359 : capture moyenne 8,247→7,089 ms. Le scan unique des descripteurs garde champs, dates et refus de getters. Ordre fixe, une paire : aucun gain de clone ou FPS déduit.

**Motion delta retenu après qualification ciblée et native.** `motion-delta/counts01/receipt.json` passe : les 25 états déjà acquis 335…359 sont relus, sans exécuter de SIM, avec oracle MotionRecorder complet à chaque tick et anciens frames revérifiés après la dernière admission. Au 359 : 325 tracks, 1 073 segments, 39 tracks modifiés/39 segments ajoutés. Clone Node du domaine motion seul : moyenne **2,922→0,116 ms** sur 32 répétitions ; capture delta 0,742 ms et préparation/commit 0,735 ms pour ce dernier état.

Ce Recorder part à froid sur 24 ticks, contre l'historique natif de 64 ticks ; le checkpoint initial delta est plus volumineux que le complet. Ordre de clone fixe complet→delta, effets JIT/GC possibles. SIM, paquet complet, désérialisation event.data, application et images sont exclus de ces chronomètres. Le résultat natif du lot est rapporté séparément ; ces chiffres de composants n'en expliquent pas à eux seuls les FPS.

## GPU, images et variantes écartées

La réparation privée de la sonde V298 restitue timestampWrites avant le drain ; GPU01 FAIL et GPU02 PASS restent séparés. Une ablation restaurée en pause identifie le bois : GPU complet 4,947→2,964 ms bois omis. Aucune omission n'entre dans le produit.

Les deux premières paires Timber donnent MAIN 4,574→4,409 ms et 4,582→4,400 ms, avec **zéro écart RGBA sur 3 686 400 pixels**. Chacune repart de V432 ; leur différence ne mesure pas le gain marginal Overview. Pause et CPU instrumenté ne qualifient pas les ombres en mouvement ni les FPS natifs.

L'expérience UBO `upload-pair-run01` passe en 234,452 s mur, même Timber global, pause puis ×1, GPU 2 s et couverture 1 ; images exactes, y compris face à Timber V432. En ×1, appels UBO observés 48 162→14 353, octets 938 392→2 639 956, comptes d'images différents. MAIN moyen 3,882→3,104 ms, p95 ≈10,38 ms ; pause 4,509→4,530 ms. Ces composants ne prouvent pas un bénéfice FPS : **l'adaptateur est écarté du périmètre retenu après le diagnostic natif OFF**, sans modifier les groupes d'uniformes.

Partition32 + tri agrégé (`timber-sort-pair-run01`) : MAIN pause 4,526→4,143 ms, 155 pixels RGBA différents, maximum 37/255 ; reprise native07 complète mais coût CPU défavorable. Rejet, GLOBAL restauré. Variante EW (`timber-interior-pair-run02`) : deux bras PASS en 189,848 s, MAIN pause **4,508→4,154 ms**, mais **29 314 pixels RGBA différents**, maximum 102/255, et joints visiblement noircis lors de l'inspection de ROOT. **EW rejetée pour ce défaut visuel** ; aucun retrait de faces n'est retenu. UBO-ON était identique dans les deux bras GPU pour préserver leur comparabilité.

## FPS et physique réellement tenue

RAF p95/p99/maximum en ms. Afficher vite en simulant au ralenti ne satisfait pas la cible. Dernier périmètre sélectionné : GLOBAL + motion, sans UBO ; [essais intermédiaires conservés ci-dessous](#essais-intermédiaires).

| Source Forges | Fenêtre | FPS | Physique tenue | RAF p95 / p99 / max |
| --- | --- | ---: | ---: | ---: |
| V432 | ×1 fixe | 115,58 | ×0,483 | 34,4 /62,8 /114,6 |
| V432 | ×1 rotation | 96,31 | ×0,528 | 41,0 /72,0 /131,5 |
| V433 native08-motion retenu | pause fixe | 183,52 | pause | 8,4 /12,4 /12,6 |
| V433 native08-motion retenu | ×1 fixe | 131,19 | ×0,899 | 25,0 /41,6 /79,3 |
| V433 native08-motion retenu | ×1 rotation | 103,80 | ×0,947 | 25,1 /41,7 /120,7 |

`native08-motion-reprise` est PASS en **173,498 s mur** : export/recharge entiers exacts au 456, SHA256 `70b608c0794901e3ac6989fbc5767620db2d1e8f879eeb566edca0db954da614`, gel10 de 1 785 fichiers vérifié avant/après. CPU image moyen fixe/rotation 4,90/6,45 ms, application 21,00/23,24 ms, admission 6,21/5,15 ms. Le premier native08 échoue en 14,666 s hors fenêtres : la sonde attendait l'ancienne signature du runtime, puis a été adaptée au paramètre MotionRecorder. **Sources produit identiques entre gels09 et10** ; l'échec de pilote et sa reprise restent distincts.

Le gain du lot face à V432 vaut +13,51 % en fixe et +7,78 % en rotation, sans paire AB/BA ni répétitions pour isoler motion. La physique ×0,483/×0,528 devient ×0,899/×0,947, environ 1,86/1,79 fois le débit antérieur, encore sous ×1. Les pics 79,3/120,7 ms et la moyenne loin de 200 gardent l'objectif ouvert. Les moyennes Worker/adoption/application/GPU se chevauchent et ne s'additionnent pas.

### Essais intermédiaires

Ces relevés complets précèdent la sélection native08 ; les régressions, pauses et variantes rejetées ne sont pas remplacées par le meilleur résultat. Reçus détaillés : `tmp/performance-v433/{native03,native05,native06,native-ubo-off01,native07-reprise}/`.

| Essai Forges | Fenêtre | FPS | Physique tenue | RAF p95 / p99 / max |
| --- | --- | ---: | ---: | ---: |
| V433 native03 | ×1 fixe | 112,69 | ×0,916 | 28,0 /40,1 /91,8 |
| V433 native03 | ×1 rotation | 84,19 | ×0,945 | 35,5 /54,1 /98,7 |
| V433 native05 | ×1 fixe | 119,22 | ×0,899 | 25,0 /41,7 /104,3 |
| V433 native05 | ×1 rotation | 94,05 | ×0,963 | 33,2 /50,1 /112,5 |
| V433 native06, UBO-ON | pause fixe | 183,08 | pause | 8,4 /12,4 /16,7 |
| V433 native06, UBO-ON | ×1 fixe | 121,56 | ×0,882 | 25,0 /41,6 /95,9 |
| V433 native06, UBO-ON | ×1 rotation | 80,40 | ×0,843 | 37,5 /66,7 /116,6 |
| UBO-OFF01 GLOBAL, diagnostic | pause fixe | 183,79 | pause | 8,4 /8,5 /16,7 |
| UBO-OFF01 GLOBAL, diagnostic | ×1 fixe | 122,46 | ×0,899 | 25,0 /37,6 /74,9 |
| UBO-OFF01 GLOBAL, diagnostic | ×1 rotation | 90,71 | ×0,927 | 33,3 /54,1 /104,2 |
| Native07 partition32, rejetée | pause fixe | 191,73 | pause | 8,4 /12,5 /16,8 |
| Native07 partition32, rejetée | ×1 fixe | 110,26 | ×0,882 | 29,2 /45,8 /87,4 |
| Native07 partition32, rejetée | ×1 rotation | 81,42 | ×0,947 | 33,3 /58,3 /120,9 |

Native06 passe en 174,744 s avec export/recharge entiers exacts au 448 et gel 1 785 fichiers vérifié avant/après. Admission moyenne **5,909/5,473 ms** fixe/rotation, application 21,81/26,85 ms, CPU image 5,36/8,08 ms. SHA entier448 `99ea0f71f3b352e30b8a489b32ffbef15c6820a03a481b16cb118f49b2360b15`. Ce relevé avec UBO-ON ne qualifie pas la sélection native08 sans UBO.

UBO-OFF01 conserve RAW335, caméra et sources produit de native06 : seul l'appel d'installation est remplacé dans deux réponses servies tracées exactement, sans erreur. Export/recharge exacts au 454 et gel de 1 797 fichiers vérifié. CPU image 5,28/7,23 ms, application 21,18/24,68 ms, admission 5,76/4,93 ms. ON et OFF sont deux exécutions successives uniques, sans AB/BA : **aucune causalité forte**. Aucun bénéfice FPS d'ON n'est établi ; sa réduction d'appels ne suffit pas à le retenir.

La rotation des essais native03/05/06 et OFF régresse face aux 96,31 FPS de V432, malgré une physique meilleure. Le dernier native08 dépasse cette référence ; les essais antérieurs restent conservés sans attribuer cette progression à motion seul.

Les références finales utilisent exactement les sources du **gel10** commun à native08-motion, 1 785 fichiers vérifiés avant/après, SHA256 `7598c653dbdbfea50734425c8262bfd9da854d8af897371418100d20b122540c`, sans erreur. **Refs04 Aulnes PASS 125,881 s**, export/recharge au 10858 SHA256 `f0fd74900712a7133968e0399608e611cb11a9c68367c3254ea1a94fac0e9775` ; **refs05 Éclaircies PASS 139,098 s**, au 1855 SHA256 `a4d5b4bfd5987ac3b210b8c30f939cadb67350b7eca7769a2b8e1978fb948494`. Leurs `proof.json`, `summary.json` et captures sélectionnées restent sous `tmp/performance-v433/{refs04-motion-aulnes,refs05-motion-eclaircies}/`. Pauses fixes Aulnes 240,03/Éclaircies 239,67 FPS.

| Autre contexte, sélection finale | Fenêtre | FPS | Physique tenue | RAF p95 / p99 / max |
| --- | --- | ---: | ---: | ---: |
| Les Aulnes refs04-motion | ×1 fixe | 222,49 | ×0,982 | 8,3 /12,5 /33,3 |
| Les Aulnes refs04-motion | ×1 rotation | 224,63 | ×0,982 | 8,3 /8,4 /24,9 |
| Les Éclaircies refs05-motion | ×1 fixe | 215,91 | ×0,982 | 8,3 /16,7 /29,2 |
| Les Éclaircies refs05-motion | ×1 rotation | 184,90 | ×0,981 | 12,5 /20,8 /145,8 |

Les moyennes Aulnes dépassent 200 ; pics et répétition unique ne prouvent pas 200 FPS stables. Le pic rotation Éclaircies à 145,8 ms et sa moyenne sous 200 restent ouverts. Application finale Aulnes 4,95/3,57 ms, admission 1,00/0,82 ms ; Éclaircies 13,32/12,86 et 2,31/1,94 ms. Essais antérieurs GLOBAL/UBO-ON : Aulnes refs03 **234,26→222,49 FPS fixe**, rotation 221,76→224,63 ; Éclaircies refs02 fixe 212,66→215,91, **rotation 188,99→184,90**. Leurs physiques étaient ×0,983/×0,997 et ×0,981/×0,979, recharges exactes 10857/1855 conservées. Ces baisses empêchent d'écarter universellement les régressions ; une seule fenêtre ne permet pas d'isoler motion ou le retrait UBO. L'ancien relevé [V431](presentation-costs-v431.md) Éclaircies ×1 rotation 193,82 FPS est une référence historique, **pas une paire fraîche** avec V433. Les Aulnes refs01 à 208,18/184,50 restent aussi conservées ; le départ neuf n'a pas été mesuré sur la sélection finale.

## Coûts restants et priorité suivante

Le profil MAIN diagnostique `main-profile02` échantillonne 6,509 s, démarrage du profiler compris : 1,863 s dans le rendu, 0,663 s dans l'application et 0,233 s dans l'admission. Dans le rendu, scans d'uniformes/nodes/bindings représentent 0,484 s ; ces sous-coûts sont inclus, jamais additionnés à leur parent. Ce profil instrumenté ne mesure pas les FPS natifs. Sur la sélection finale des Forges, l'application moyenne reste 21,00 ms fixe et 23,24 ms en rotation, jusqu'à 106,7 ms : réduire le transport ne borne pas encore cette application.

Dans les deux rotations Éclaircies refs02/refs05, l'application du même tick1832 coûte 21,8/25,9 ms, incluses dans des frames CPU de 50,5/53,8 ms. Le trou RAF suivant de145,8 ms arrive vers7 s, à des positions caméra différentes ; une réception courte est traitée pendant ce trou. Aucun marqueur GPU/GC/entrée ne permet d'en attribuer le reliquat. La préparation de la caméra, un seuil de visibilité ou un blocage continu de l'admission ne sont donc pas des causes établies.

La priorité restante est une préparation graphique dense produisant des buffers réutilisables et une application bornée, ainsi que les coûts par dessin du renderer. La réduction de géométrie Timber avec ombres complètes reste une hypothèse privée à qualifier : aucune amélioration supplémentaire ni égalité visuelle n'est acquise. Les moyennes finales et le gain SIM ne ferment ni les pics ni l'objectif 200–230 FPS.

## Qualification, corrections et suite attendue

- SIM : 25 Worlds entiers exacts, recharge stricte et 5 cas d'intégration réelle au même tick : mur construit→autre pawn, piège réellement consommé, politique de gate vivante et changement de type en place invalidés. Revue finale des portées sans nouveau défaut concret.
- Cultures préparées : 57 cas/9 fichiers après compatibilité V2 et retrait fantôme public→préparé. Colonnes : 31/31 cas/5 fichiers et typage acquis. Rendu GLOBAL : 42/42 cas/9 fichiers en 18,858 s, puis typage 10,488 s ; contrôles ciblés, pas suite complète.
- Motion : privé 20/20 cas en 15,436 s mur puis types 6,204 s après correction de la fixture typée ; intégré **35/35 cas, 4 fichiers, 16,302 s mur**, types 11,881 s. Client public/publication Worker/mouvement des pawns : **23/23 cas, 3 fichiers, 16,720 s mur**. Staging exact et absence de mutation MAIN revus, native08 et recharge exacte acquis ; ces groupes ne constituent pas une suite complète.
- Présentation finale avec motion : **PASS 155,663 s mur** (`v433-motion-final-presentation…12-05-37`), minage 10 644 images, abattage 10 590. RAF p99 8,3 ms dans les deux parcours, maxima 29,1/33,4 ms ; compteurs jump/rawJump/continuousTravelExcess/solidOccupancy tous à 0 pour chacun. La présentation antérieure 156,038 s reste conservée ; ce pilote de chronologie ne prouve pas 200 FPS stables sur Les Forges.

| Incidents conservés | Correction ou décision |
| --- | --- |
| Fixtures portes/meubles/neige : champs futurs et mental state résiduels | Vrais formats historiques rétablis, refus de migration préservés. Garde older-schema des propriétaires263 corrigée sans accepter les champs futurs. |
| Navigation : piège non déclenché et vent verrouillé | Préconditions physiques/recherche corrigées, 5/5 vraies phases acquises sans détendre l'invalidation. |
| Preview/joints Timber et champs de buffers | Oracles historiques corrigés : sink mobilier, pavages V256, catalogue/orientations ; reprises 8/8 et 7/7. Furniture/Hygiene produit restent ceux de V432. |
| Crop Wire : classe native maquillée par prototype | Marque intrinsèque TypedArray, cas Uint8→Float64, Uint8Clamped→Uint8 et NaN flags couverts ; 31 cas intégrés. |
| Native02/GPU01, Node extensionless, réseau native07 et tests de caméra | FAIL initiaux préservés, réparations de pilotes/types séparées des gains produit ; reprises identifiées. |
| Motion : fixture checkpoint/delta mal typée et sonde native à ancienne signature | Fixture de test corrigée, 20 cas privés/35 intégrés acquis ; sonde adaptée au paramètre MotionRecorder, premier FAIL natif hors fenêtres conservé, reprise exacte sans changement produit. |
| Ombres/réserve, partitions/tri, groupes UBO, span UBO et Timber EW | Non retenus ; preuves privées conservées, aucune qualité manquante masquée par un gain GPU isolé. |

Les reçus détaillés sont sous `tmp/performance-v433/` et `tmp/validation-runs/` ; les nombres acquis par reprises ne s'additionnent pas en cas uniques. Le brouillon exhaustif et la note privée restent préservés. **Tous les contrôles ciblés finaux du périmètre retenu, la présentation et les trois références natives avec recharges exactes sont acquis. Build Pages final PASS 19,349 s mur** (`…12-14-15.493Z-3884`), contrôle documentaire PASS15,356 s et sources1785 fichiers inchangées depuis le gel10. Publication en préparation ; aucun déploiement n'est encore annoncé. **Objectif 200–230 FPS et confort des Forges toujours ouverts.**
