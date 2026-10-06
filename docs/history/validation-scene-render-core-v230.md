# Validation V230 — extraction locale du rendu

Preuve du 6 octobre 2026 sur V229, schéma 198 inchangé. [Contrat](../development/scene-render-core-v230.md), [recherche](../research/scene-render-core-v230.md). **Extraction locale intégrée dans le périmètre contrôlé. Aucun gain FPS stable ou portage complet du jeu dans un worker n'est certifié.** ROOT exécute seul les contrôles successifs via `validate:logged`, sur sources gelées et sorties privées nouvelles.

## Provenance et équivalence locale

Le `ColonyRenderer.ts` V229 original est conservé byte exact sous `tmp/performance-orientation-v230/render-core-next/ColonyRenderer.original.ts`, SHA256 `FC9C81C4060784E13CC13C28638CD90285DE75D073E8F0FA19E89B65A187D4A2`. L'extraction et les reprises d'observateur ont des gels distincts. La copie destinée au produit rebase les imports, donne au host son nom lexical `ColonyRenderer` et préserve le constructeur d'icônes sans argument ; ses autres corps restent ceux du GEL qualifié. Manifeste produit SHA256 `4D0A8D59CF97343080E84E54B6627DC484613EAD8BE603ABF4970BDC1321340F`.

| Contrôle privé réel | Verdict journal | Portée observée |
|---|---|---|
| `aulnes-v230-render-core-local-2026-10-06T02-54-43.938Z-15744` | PASS, 27,014 s | Carte32², 26 étapes, 139 746 489 comparaisons exactes |
| `aulnes-v230-render-shared-aulnes-2026-10-06T03-15-12.946Z-18448` | PASS, 103,548 s | Aulnes250² au tick6934, 18 224 ressources, 26 étapes, 930 509 836 comparaisons exactes |
| `aulnes-v230-render-core-native-2026-10-06T03-22-19.919Z-10844` | PASS, 63,737 s | Jeu réel, sauvegarde/rechargement, deux vues et récupération après vraie perte GPU |

Les deux premiers rapports restent sous `render-core-next/captures/run-2026-10-06T02-54-44.296Z-qqsyIL` et `render-core-observer-shared-next/captures-fast/run-2026-10-06T03-15-13.302Z-FsjLsL`. Sources inchangées, aucune erreur. Deux vrais renderers WebGPU AMD/RDNA-1, CameraRig et textures actuels ; seule l'horloge diagnostique de présentation est contrôlée après leur initialisation. Chacune des deux comparaisons finales de screenshots compare exactement 2 160 000 octets RGBA, sans différence, **après le reset final vers la nouvelle carte40×32**. Ces pixels ne sont donc pas une comparaison des images des Aulnes ; ses états de scène et buffers sont contrôlés dans les étapes antérieures. Les compteurs finaux frame25/render30 et applyWorld6/7 sont réellement non nuls.

Huit ticks ordinaires, un vrai encodeur et deux vrais décodeurs produisent les publications/tracks. Les observations couvrent buffers, ranges, bounds, ordre des graphes, textures/sang, caméras, queue/horloge, World présenté, références actuelles et anciennes vues, labels/audio. Pause/rattrapage, vrais stale/refus sans publication, sélection, deux projections, toits, matériaux/textures, feuillage, destruction/reconstruction de l'herbe, resize/clavier, checkpoint, voie mutable et nouvelle source/carte sont exercés. Ces nombres sont des comparaisons diagnostiques de valeurs, pas autant de tests indépendants ou une mesure FPS.

Les essais `aulnes-v230-render-core-aulnes-2026-10-06T02-55-43.340Z-19512` et `aulnes-v230-render-core-fast-aulnes-2026-10-06T03-07-17.384Z-10748` ont été interrompus séparément sans verdict ; ils ne reçoivent aucun PASS. La reprise shared corrige seulement le coût de l'observateur : comparaisons numériques Object.is sans chemins par valeur et lookup ordinal équivalent à indexOf. Les sources du candidat et les assertions de sorties restent gelées. Ces longues durées de diagnostic ne mesurent pas les stalls du jeu.

Le parcours natif conserve six fauteuils TV, deux chaises extérieures et les orientations des postes, avec captures privées. Il joue réellement 18 ticks à1× et 120 à6×, contrôle les Worlds, sauvegarde le World confirmé dans le repository puis recharge exactement et continue. Il détruit le device privé réel, vérifie le blocage des commandes pendant l'incident, reconstruit une seule surface depuis le même World puis continue 18 ticks valides. Aucune erreur navigateur ; captures sous `render-core-controls/native-results-private`. Cette preuve ne certifie pas une campagne longue ou toutes les commandes.

## Cycle matériel du Core local

`aulnes-v230-render-core-local-abba-2026-10-06T03-36-54.827Z-27436` passe en90,840 s ; rapport `render-core-local-abba-next/native-core-local-abba-report.json`, sources RAW gelées et aucun échec. A=V229 réel sur5208, B=host/Core local sur5212 ; le même décodeur strict est mesuré dans les deux voies, avec des compteurs non nuls. Même Aulnes6934, caméra/qualité, chauffe3s à6× puis mesure8s, un cycle A/B/B/A matériel headless.

RAF108,318→113,386/s (+4,68 %), CPU frame4,764→4,519 ms (−5,14 %), moyenne des p95 par passe15,15→13,50 ms ; maximaA34,7/38,9 et B34,2/37,7 ms. Les plages RAF A105,136–111,501 et B111,125–115,648 se chevauchent, avec amplitudes5,88/3,99 %. **Aucune régression n'est observée dans ce cycle, mais un gain stable significatif n'est pas établi.** Débit réel6,137→6,126× sur ces fenêtres ; aucun débit général garanti. Le décodage3,702→3,555 ms varie malgré son code inchangé : aucun crédit d'optimisation ne lui est attribué. Aucun budget GPU ou240FPS utilisateur n'est déduit.

## Expériences privées non admises

Les oracles de déroulement et de gel peuvent passer tandis que l'optimisation est rejetée. Les rapports et premiers échecs restent conservés.

| Expérience | Résultat déterminant | Décision |
|---|---|---|
| Ownership clone optimisé | Aulnes normal+64,64 %, sparse+24,78 % ; mixed+168,48/+107,46 % | Privé, aucune promotion |
| Ownership constructive | Aulnes normal+69,42 %, sparse−10,07 % ; mixed+165,37/+109,85 % | Le seul résultat sparse favorable ne justifie pas l'admission |
| Tables stables au second hop | Capture+clone+normalisation Aulnes+45,28 %, mixed+67,81 % | Rejet ; reprise verte distincte du premier banc rouge |
| Canal d'adoption dédié réel | RAF111,509→79,166/s (−29,0 %), CPU4,625→6,789 ms (+46,8 %), pointes adoptionB70,7/80,8 ms | Rejet, sources dédiées non intégrées |

Rapports : `tmp/performance-orientation-v229/ownership-optimized-next/ownership-optimized-smoke-ownership-report.json`, puis sous V230 `ownership-constructive-next/ownership-constructive-smoke-ownership-report.json`, `stable-tables-prototype/stable-tables-endpoint-reprise-report.json` et `dedicated-runtime-next/native-dedicated-abba-report.json`. Les trois premiers sont des endpoints CPU isolés, sans preuve FPS. Le dernier est un ABBA natif distinct du Core local, avec deux workers/ports réels ; ses fenêtres wall-time ne rejouent pas des ticks identiques. Les pointes ne sont attribuées ni au GC ni aux clones faute de trace causale spécifique.

La préparation agricole synchrone passe son typage en3,151 s et cinq cas en4,643 s. `aulnes-v230-crop-reprise-abba-2026-10-06T03-33-34.721Z-15984` passe en66,549 s, sorties exactes et sources inchangées : 32 ticks ordinaires/charge, huit de chauffe et24 mesurés, deux cycles ABBA. Le coût total préparation+application augmente sur Aulnes de2,191→2,822 ms (+28,80 %), puis2,167→2,626 (+21,16 %) ; mixed+79,17/+54,28 %. Rapport sous `crop-plans-reprise-next/captures/run-2026-10-06T03-33-34.973Z-r4u8R3`. **Aucune promotion synchrone ; un futur offload reste non démontré.**

## Probe Offscreen séparé

Le premier probe conserve son échec de capture transparente sous `offscreen-feasibility/captures/run-2026-10-06T02-17-36.788Z-8VJyHX`. Le device matériel et les vrais RAF/rendus ne suffisaient pas à valider ses pixels. La reprise séparée `offscreen-v230-capture-next-2026-10-06T02-27-21.188Z-3852` passe en3,142 s ; rapport `offscreen-feasibility-capture-next/captures/run-2026-10-06T02-27-21.544Z-Q1NCJQ`.

Vrai Worker/OffscreenCanvas avant contexte, Three0.186, AMD, cube/textures/ombres compilés, deux projections, resize/DPR, pixels visibles et readback opaque varié, vraie perte du device privé puis nouvelle surface/worker et erreurWorker réelle. Le handler messageerror est installé sans prétendre avoir reproduit un messageerror naturel. Ce probe API ne qualifie aucun rendu hors thread de Lisière, FPS, picking, UI, sauvegarde ou qualité complète du jeu.

## Vrai Core dans OffscreenCanvas, qualification privée distincte

Le premier typage `aulnes-v230-offscreen-core-type-2026-10-06T03-26-06.403Z-27212` échoue en3,090 s : deux gardes TypeScript absentes. Une copie distincte passe le typage, puis `aulnes-v230-offscreen-core-reprise-gpu-2026-10-06T03-32-34.962Z-13020` échoue avant boot en1,880 s : la fixture ajoutait un targetId interdit aux ordres chop. Le retrait du champ, avec le même générateur et les mêmes commandes réelles, conserve les gardes du moteur. `aulnes-v230-offscreen-core-physical-gpu-2026-10-06T03-39-43.416Z-19184` échoue ensuite en15,910 s : 1 076 octets pixels diffèrent sur l'icône, rendue comme un œil plutôt qu'une hache. Les scènes numériques sont égales ; cette égalité ne suffit pas à admettre le rendu. Les gels et trois premières preuves demeurent inchangés.

La reprise `offscreen-core-texture-next` décode le bitmap sans flip préalable. Le backend WebGPU installé applique déjà le flip de la Texture ; aucun champ de cette Texture ou du Core n'est changé. Les assertions de pixels restent strictes, sans masque ou tolérance. Typage3,384 s, puis `aulnes-v230-offscreen-core-texture-gpu-2026-10-06T03-43-52.853Z-20872` **PASS41,122 s**, rapport `offscreen-core-texture-next/captures/run-2026-10-06T03-43-53.210Z-eoaFU1/report.json`, sources inchangées et aucune erreur.

Le vrai Core et toutes ses couches tournent dans le vrai Worker, Three186/WebGPU AMD, sans document ni faux HTMLElement. Sur la carte générée32², neuf étapes, huit ticks ordinaires réellement produits, checkpoints/deltas stricts, anciens graphes conservés, stale/refus et reprise, caméra et dimensions sont contrôlés par111 462 444 comparaisons diagnostiques. Les captures visibles orthographique/perspective640×480 comparent1 228 800 octets sans différence ; après DPR1,5, les captures CSS480×320 comparent614 400 octets sans différence, tandis que le readback physique reste720×480. Vraie perte du device configuré, ancien propriétaire arrêté, nouvelle surface/worker/génération et teardown passent. L'icône PNG est réellement visible et exacte ; seize captures sont conservées.

L'horloge diagnostique est contrôlée après initialisation. Cette preuve qualifie le rendu du Core32², **pas Les Aulnes250², le portage complet de l'interface, les entrées/picking, les labels DOM, la lecture audio, la sauvegarde dans un renderer worker ou son débit**. Aucun code Offscreen n'est intégré au produit V230. La mesure suivante doit compter les vrais dessins du worker avec l'horloge native et les coûts de copies/décodage réels.

## Clôture centrale

Après promotion des cinq sources, `aulnes-v230-product-type-2026-10-06T03-41-11.675Z-14624` passe en4,868 s ; `aulnes-v230-product-boundaries-2026-10-06T03-41-50.584Z-5696` passe en18,004 s :12 fichiers,48 cas réussis et un ignoré. La fixture de lifecycle indique explicitement que le port de sélection n'est pas encore attaché, en conservant toutes les assertions de fatalité et de nettoyage. Le build Vite passe en1,772 s sous `aulnes-v230-product-build-2026-10-06T03-44-54.581Z-11156`, avec l'avertissement de taille du bundle.

`aulnes-v230-product-native-2026-10-06T03-45-14.204Z-23380` passe en61,853 s : le même parcours réel de catalogue,1×/6×, sauvegarde exacte, rechargement, deux vues, resize, perte réelle du device et reconstruction sur le World confirmé est rejoué sur le produit, avec sorties nouvelles sous `product-core-native-next/native-results-private`. Aucune erreur navigateur.

`aulnes-v230-product-presentation-2026-10-06T03-46-38.230Z-24572` passe en117,429 s : actions mine/chop, séquences1×/6×/1×/3×, stall contrôlé de2,5 s hors mesure et reprise de la queue réelle. Aucun saut confirmé, excès de déplacement ou occupation d'obstacle. Leurs captures vont dans le répertoire privé neuf du journal via LISIERE_TEST_RUN. Ce parcours de continuité ne mesure pas les FPS des Aulnes.

Le premier banc octets échoue en0,199 s après avoir confondu les65 fichiers JSON publics avec les62 références du catalogue ; script et preuve restent conservés. `aulnes-v230-public-bytes-reprise-2026-10-06T03-49-47.473Z-2652` passe en0,101 s : tous fichiers, noms et octets publics égaux à l'archive V229,62 entrées de catalogue et payloads uniques présents, corps des lecteurs catalogue/transport/journaux inchangés, avec seule normalisation CRLF pour leur comparaison textuelle. Le schéma198 reste inchangé. Ces égalités ne constituent pas une nouvelle campagne de62 lecteurs exécutés.

`aulnes-v230-docs-2026-10-06T03-51-23.443Z-28356` passe en4,260 s. Aucun autre contrôle lourd ou campagne longue n'est exécuté en concurrence.

Les campagnes longues, performances de toutes les vues, charges GPU, budget240FPS et portage complet hors thread restent ouverts. La poursuite autonome du6octobre et les commits locaux continuent selon la demande utilisateur, sans push ; toute nouvelle pause prime.
