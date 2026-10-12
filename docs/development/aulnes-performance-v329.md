# V329 — différence pause/×1 et commandes fixes de la chambre

Demande humaine : expliquer la baisse observée d’environ 240 à 190 FPS au passage de pause à ×1 et continuer les optimisations. Référence `8c1aa73e`, produit V328 `ff10a939`, schéma 229. Qualité, règles, horloges, publications et corpus public conservés. ROOT seul exécute les contrôles, successivement ; sources/tests/pilotes figés pendant chacun. Relance planifiée PAUSED.

**Décision : réutilisation ciblée des commandes fixes de chambre retenue.** Coût CPU natif proche−27,07%, deux B sous les deux A ; repli ordinaire conservé dès qu'un globe peut être soumis. Le GAME complet passe mais ne prouve pas de gain ×1 stable : proche177,054→195,116 RAF/s dispersé, large202,811→200,495(−1,14%). À ×6 les moyennes montent, avec des débits réels différents et le proche encore insuffisant. Aucune récupération des50FPS, absence générale de régression, performance GPU,240FPS joué ou vrai×6 constant certifiée. Les refus et réparations de pilotes restent explicités ci-dessous ; ni qualité ni règles réduites.

## Diagnostic actuel, sans confusion entre FPS et instrumentation

Chrome matériel/WebGPU,2560×1440,DPR 1 ; vrais Aulnes 250²/tick 8434 remis exactement avant chaque fenêtre, chambre/carton ON, masques 31%, éclairages 100%, textures/herbe/ombres/zones inchangés. Deux poses : proche iso `(129,122,.136,.7576,1.0156)` et large perspective `(124.5,124.5,1.4,-.72,.69)`.

La reprise native **A/T/T/A passe en 360,610 s** : `tmp/performance-v329/timer-reprise/timers-Tcfs9R/report.json`. T ajoute uniquement les timers des méthodes natives complètes, sans CDP/V8. Chauffe 3 s, pause 4 s et ×1 joué 8 s ; quatre recharges de continuation 8501/8507/8512/8501 exactes, seize fenêtres, erreurs vides et Chrome/Vite possédés fermés. Gel `freeze-V66my9`3,289 s ; analyse stricte `analysis-Jp1I6z`8,743 s, huit partitions synchrones et mappings/source littérale MAIN exacts.

| Fenêtres A sans timers | Pause RAF/s | ×1 RAF/s | Débit réel ×1 | p 95 moyen pause→×1 |
| --- | ---: | ---: | ---: | ---: |
| Proche iso | 240,133 | 210,388 | 0,999763× | 4,85→12,50 ms |
| Large perspective | 239,981 | 209,741 | 0,999956× | 4,95→11,85 ms |

Les deux A proches donnent 211,25/209,53 RAF/s en ×1, larges 210,99/208,49. La baisse reproduite dans ces poses est donc d’environ 30 FPS ; les 190 FPS signalés par l’humain ne sont pas prétendus reproduits sans instrumentation. T lui-même donne 196,01/195,46 RAF/s, une perturbation de−6,83/−6,81%. Ces valeurs instrumentées ne sont ni des FPS produit, ni un gain soustrait.

240→190 FPS correspond à 4,17→5,26 ms d’intervalle moyen, environ 1,10 ms supplémentaire. Cette réciproque ne mesure pas le CPU/GPU de la simulation : le plafond≈240 cache aussi la marge disponible en pause.

Le moteur tourne à **six ticks/s en ×1**. Son réveil Worker 20 ms n’est pas 50 Worlds/s. Le Worker exécute la simulation ; reconstruction/validation/adoption et application des états occupent encore MAIN. Les timers frais proches acquièrent 96 adoptions moyennes **8,842708 ms** et 96 applications moyennes **10,048958 ms**, maxima 19,8/20,5 ms. Larges :96 adoptions 7,406250 ms,94 applications 8,861702 ms. Ces durées par appel complet ne sont pas attribuées à une image voisine ni additionnées aux sous-appels inclusifs du rendu.

La pause drainée permet les caches d’ombre et de fond de chambre. Le temps confirmé joué anime acteurs, astres, éclairages et effets ; les ombres et la chambre doivent alors être rendues. Les deux A proches acquièrent 0 nouvelles scènes de chambre en pause contre 3367/3367 RAF en ×1 ; larges 3356/3356. Le composite HDR reste actif en pause. Ces compteurs ne mesurent pas le temps GPU. Les publications ordinaires du HUD sont déjà bornées à 200 ms ; l’UI entière n’est pas reconstruite chaque RAF.

## Premier profil et refus conservés

Gel original `freeze-y1hiMW`2793 entrées,4,055 s. L’A/P/P/A original **échoue en 202,980 s**, `profile-AeX48v/report.json` : A1 possède six fenêtres et une recharge 8837 exacte ; P1 seulement pause/×1 proches, puis un delta V8 brut **−196 µs à l’index 3891** de ×6. Aucun delta normalisé, ancien profil repris ou faux PASS ; pas de recharge finale P1, pas deP2/A2. `analysis-TFFw1E` qualifie séparément les deux seuls profils valides en 7,463 s, tout en conservant le FAILED original. Les enveloppes CDP enµs et page/RAF enms restent indépendantes.

Le profil valide ×1 acquiert notamment 94,193 ms dans CropBatch.update, dont 37,863 ms de copie de matrices ; la scène native chambre mesure 456,200 ms/1620 appels,0,2816 ms/appel. Les descendants V8 recouvrants ne sont pas additionnés et ne sont jamais divisés par les RAF d’une autre horloge. Le cache des seuls points caméra de fitShadow est écarté :7,855 ms de clipping dans 63,850 ms inclusifs sur toute l’enveloppe. Agenda, PowerParentCapture et RoomTopology ne justifient pas un nouveau micro-lot ici.

## Deux variantes CropLayer rejetées

Premier pilote privé `crop-cost/whole-crop-9YmOlS` : **rouge 4,248 s** avant toute préparation/cohorte, Node 24.11.1 refuse le chemin Windows `--import` comme schéma `e:`. Une reprise distincte convertit seulement cet argument en URL `file:`, inverse textuel exact ; ancien pilote/rouge et scénario conservés.

La reprise `crop-cost-reprise/whole-crop-gCOcdE` **reste rouge 362,366 s** : préparation de 64vrais ticks puis huit cohortes de coût terminées ; oracle séparé interrompu par la limite totale 360 s à 25/65 états, tick 8458. Aucun oracle général d’équivalence acquis, aucun candidat promu. Les appels chronométrent le CropLayer complet avec les véritables objets Three, sans moteur/décodage/GPU dans leurs spans ; construction/froid séparés.

| Variante, A/B/B/A | Moyennes complètes ms | Moyenne A→B | Décision |
| --- | --- | ---: | --- |
| Copie Float 32 `.set` | 0,9803 / 1,0050 / 0,8910 / 0,9494 | 0,9649→0,9480,−1,75% | Dispersé, B1 dépasse les deux A ; rejet |
| Seize écritures directes | 1,0319 / 0,9377 / 0,9530 / 0,7765 | 0,9042→0,9454,+4,55% | Plus lent en moyenne ; rejet |

Les huit enfants coût finissent exit 0, sans timeout, avec 65 Worlds canoniques avant/après et empreinte finale commune ; cela ne remplace pas l’oracle interrompu. Note privée `main-cost/crop-rejection.md` et qualification JSON :2793 entrées actuelles,1034 sources A et pilotes exacts après contrôle. Les close events des enfants sont joints ; aucun inventaire système complet d’orphelins prétendu. Aucun replay supplémentaire de ces variantes rejetées.

## Commandes fixes : coût natif acquis

Prototype privé d’une seule feuille RoomLayer : les mêmes meshes fixes passent sous un BundleGroup identité. Globes, carriers et lumières restent hors du groupe ; géométrie, matériaux/shaders, culling, ombres, blur, cadence et simulation inchangés. Invalidation sur caméra exacte/identité/matrices/projection/layers/coordonnées/profondeur/dimensions, options, configure et restauration après warm. Les mises à jour natives nodes/bindings restent actives ; seule la préparation de liste/commandes fixes peut être réutilisée. Le backend WebGL garde la traversée normale, sans gain annoncé.

L’ordre relatif des draws fixes et des globes change : une égalité visuelle n’est pas déduite du regroupement. Les compteurs `renderer.info` ne comptent pas les draws rejoués dans un bundle ; leur baisse ne représente pas moins de primitives ou de travail GPU.

Premier coût `room-cost/isolated-room-cost-ZtStNT` : **rouge 56,473 s**, limite de cohorte 45 s trop courte après 30,208 s de chargement. Une pose est enregistrée ; la seconde possède 48 calls bruts mais pas sa qualification host/mapping/recharge. Aucun B ni cohorte entière qualifiée ; Chrome/Vite fermés et gel exact. Reprise distincte, sans réutilisation de mesure, limite 65 s/cohorte et 300 s totale.

La reprise **`room-cost-reprise/isolated-room-cost-Knx3sD` passe en 218,956 s**, gel `freeze-lFcAnm`8,103 s. A/B/B/A complet ; deux poses,8 calls de chauffe puis 48 calls par pose, véritable RoomLayer.renderBackground natif et ses nodes/bindings/commandes. Une invalidation du backdrop propre au banc force exactement une passe chambre et un blur par appel, sans composite ; drains GPU/observateurs/sérialisations restent hors timers. World 8434 immobile, quatre recharges 8434 exactes, erreurs vides et processus possédés fermés.

| CPU complet chambre+blur, ms | A1 | B1 | B2 | A2 | Moyenne A→B |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proche iso | 0,35208 | 0,28125 | 0,26458 | 0,34583 | 0,34896→0,27292,−21,79% |
| Large perspective | 0,40833 | 0,34167 | 0,37083 | 0,37292 | 0,39063→0,35625,−8,80% |

Les deux B sont inférieurs aux deux A dans chaque vue ; économie isolée d’environ 0,076/0,034 ms par appel. Maximum large B0,7 ms dépasse A0,6 ms. Ce contrôle ne certifie aucun FPS joué, GPU ou économie générale, et sa cadence forcée n’est pas une modification du produit. Le prototype est seulement retenu pour qualification visuelle et comparaison GAME à ce stade.

## Refus visuel du premier prototype et réparation distincte

Le contrôle natif `visual-new/native-Dem6qU` **échoue en 356,199 s**. Les deux côtés terminent leurs 26 états, deux cycles OFF/ON, captures répétées stables et contrôles de sources ; mais **12 comparaisons RGBA sur 26 diffèrent**. Les 104 PNG, mesures, témoins et le FAILED restent intacts. Matrices, géométries, matériaux opaques et états de profondeur sont identiques ; cela ne suffit pas à garantir les pixels aux contacts entre surfaces. Aucune lecture GPU de profondeur n'est revendiquée.

Les différences comprennent 3243 pixels en perspective large (delta maximal 19), 2997 en perspective 1920×1080 (delta maximal 62) et 46 en iso redimensionnée (delta maximal 60, petite région à l'intérieur du plateau). Leur étendue dépasse les seuls globes mobiles. Three 0.186 construit une liste interne de bundle sans son tri opaque ordinaire, puis soumet les bundles avant les objets opaques ordinaires. L'hypothèse initiale de tri interne conservé était donc erronée : fixe/fixe et fixe/mobile peuvent changer d'ordre. Le prototype 1 est refusé malgré son économie CPU isolée.

Une copie privée distincte trie les mêmes feuilles fixes avec le z homogène, renderOrder et id du tri natif, seulement lors d'une capture caméra invalidée. Si un des quatre éléments mobiles peut être soumis par le frustum natif, les fixes rejoignent le groupe ordinaire et Three retrouve le tri global. Caméra, dimensions, options, configure, warm et transitions invalident les commandes ; les nodes/bindings continuent leurs mises à jour natives. Aucun shader, World, horloge, qualité ou cadence n'est modifié. Cette réparation doit acquérir ses propres pixels et coûts ; les gains du prototype 1 ne lui sont pas transférés.

Les 26 références A littérales du rouge sont acquises et stables, avec leurs entrées exactes et les deux continuations ×1 aux ticks 8555/8676. Leur éventuel réemploi reste une qualification partielle explicite du A, sans transformer la paire rouge en PASS, ni réutiliser une ancienne mesure CPU/FPS.

La copie finale `RoomLayer-order.ts` est figée en `b6df4b031dc1ef7e4d2a5c6623eab4be467574e06db3e3617222e5e1eb086f74` ; le tri tient aussi compte de l'inversion native du z en profondeur inversée, défaut trouvé et corrigé avant tout contrôle B2. Le gate B2 distinct `visual-room-b2/native-QwR52T` **reste rouge en 192,116 s**, gel `freeze-zhhp4k` 7,740 s. Il réemploie seulement les 26 références A littérales et les témoins confirmés, puis acquiert 26 nouveaux B natifs : deux contextes, deux cycles OFF/ON, répétitions stables, erreurs vides, sources/mappings/géométries exacts, Chrome/Vite fermés. Neuf états utilisent le bundle, seize le repli ordinaire, un est OFF ; les fixes réellement présents sont treize.

**25 comparaisons sur 26 sont désormais RGBA exactement égales**. Le seul résidu est celui de 46 pixels en iso 1920×1080 ; son PNG B2 entier est exactement identique au B1 (`a15c884ef93a754679e508378128c009b4473e16534097131525e658a17de381`). Dans cet état B2 est sur le chemin ordinaire, les quatre mobiles sont soumis, la chambre et ses états de lumière/caméra/profondeur correspondent. Le résidu ne varie donc pas entre les deux chemins de rendu.

La qualification de fichiers seule `visual-room-b2-offline/native-QwR52T` localise les pales de l'unique éolienne 21251 du témoin 8676. Son axe `(187,3.73,153.15)` se projette en `(816.787139,494.898539)`, au centre du rectangle de différence. `WindLayer.adopt` conserve une phase intégrée et ne la réinitialise que pour une nouvelle carte ; `SceneRenderCore` lui passe `newMap`, pas `resetPoses`. Le premier contexte A a acquis les continuations réelles avant ses captures ; les B les ont chargées directement, comme le second contexte A perspective dont les treize états sont exacts. Le premier oracle couvre les Worlds mais pas cet historique de présentation. Ni le FAILED original ni son résidu ne sont effacés ; aucune phase/pixel n'est normalisé et aucun code Wind produit n'est changé. Une comparaison native ciblée, initialisée de façon identique par les vraies charges 32²→250², doit vérifier les attributs de pales réels et les pixels complets.

## Reprise ciblée des pales et coût final B2

La paire native distincte **`visual-room-b2-reset/native-naj2Zp` passe en 77,298 s**, gel `freeze-Mr2VOJ`3,527 s. Deux contextes frais A/B exécutent les mêmes vraies charges UI32²/tick0→Aulnes250²/tick8676, puis la pose iso opposée1920×1080/masque0. World, caméra/ancienne pose, faits de chambre et historique/attributs/matrices Wind restent exactement égaux avant/entre/après les captures et entre A/B. Deux captures stables et drainées par côté : **2 073 600 pixels RGBA, zéro différence**. B2 utilise ici le repli ordinaire avec treize fixes et quatre mobiles soumis. Les5006 entrées retenues et mappings1006 par côté sont exacts ; erreurs vides et Chrome/Vite fermés. Ce PASS cible seulement la pose résiduelle initialisée identiquement et complète les25 égalités partielles sans convertir les anciens rouges en PASS26. Aucune lecture GPU de profondeur ou réparation Wind produit revendiquée.

Le coût B2 frais **A/B/B/A passe en 231,837 s** : `room-cost-b2/isolated-room-cost-b2-j6SWaw/report.json`, gel `freeze-c3etpl`7,928 s et7000 entrées exactes. Même protocole complet chambre+blur, deux poses,8warm/48calls,384 appels mesurés et forêts synchrones qualifiées. Quatre recharges8434 exactes,1006 mappings par cohorte, erreurs vides, Chrome/Vite fermés. Ni le coût B1 ni sa reprise rouge ne fournissent de mesure B2.

| CPU complet chambre+blur, ms | A1 | B1 | B2 | A2 | Moyenne A→B |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proche iso | 0,364583 | 0,308333 | 0,297917 | 0,466667 | 0,415625→0,303125 ; −27,07% |
| Large perspective | 0,420833 | 0,435417 | 0,366667 | 0,452083 | 0,436458→0,401042 ; −8,11% dispersé |

Les deux B proches sont inférieurs aux deux A : économie isolée d'environ0,1125 ms par appel. Treize fixes réellement dans le bundle, aucun mobile soumis, membership et faits exacts avant/après. Dans les B larges, les fixes utilisent le groupe ordinaire ; soleil papier/fil et lune papier sont soumis, fil lunaire hors frustum. B1 large dépasse A1, maximum B1,0 ms contre A0,8 ms : aucun gain large stable attribué. Froid séparé, aucune économie de construction/GPU déduite. Ce coût observé n'est pas un FPS joué ; l'invalidation forcée du backdrop reste propre au banc.

## Contrats intégrés et qualification GAME

La seule feuille produit modifiée est `src/render/RoomLayer.ts`, byte-exact au B2 final `b6df4b03…`. Géométries, matériaux/shaders, simulation/bridge, règles et cadences sont conservés. Les treize fixes suivent le tri opaque natif épinglé ; quatre mobiles seulement sont contrôlés à chaque appel. Repli global ordinaire quand un mobile est soumis ou le tri désactivé. Capture caméra exacte et paresseuse, transitions/configure/options/warm invalidants, mêmes objets/matrices identité. Le backend WebGL garde son rendu ordinaire, sans gain annoncé. Un futur tri opaque personnalisé, ArrayCamera ou ajout/mutation externe des fixes exigerait de revoir ce contrat ; aucun n'existe dans le produit actuel.

**41 cas/5 fichiers passent en13,903 s**, dont huit nouveaux dans `tests/room-commands-v329.test.ts` et33historiques. Géométrie, profondeur/matrices, ordre natif avant/arrière en profondeur inversée, culling/repli, caméra/dimensions/options, configure/dispose, warm/refus et deux cycles OFF/ON avec callbacks morts sont couverts. Les tests de backend factice ne simulent pas un render bundle ni des pixels GPU ; les gates natifs restent nécessaires. Le premier lancement `npx` **ENOENT0,017 s** est conservé comme refus de lancement ; seule la reprise par le module Node natif acquiert les41cas. **Build Pages/typage PASS12,028 s** ; avertissement de taille des chunks préexistant conservé.

Le **GAME A/B/B/A plain passe en538,635 s**, `tmp/performance-v329/abba-tpHKjd/report.json`, gel `freeze-Z02gXE`3,913 s et2794entrées exactes. Vingt-quatre fenêtres neuves, sans profiler, timers CPU ou timestamps GPU ; chaque pose/vitesse repart de8434, chauffe3s, pause4s ou12s positives. Quatre recharges de continuation **8987/8968/8980/8990 exactes**, erreurs vides, mappings source/MAIN inverse exacts, Chrome/Vite possédés fermés. Simulation/bridge/publics identiques ; seule RoomLayer varie entre A/B. La comparaison mesure le produit de développement natif, pas les FPS de la publication compilée.

| GAME, vue/vitesse | RAF/s A→B | Variation | Débit réel A→B | p95 moyen A→B |
| --- | ---: | ---: | ---: | ---: |
| Proche pause | 240,073→240,100 | +0,01% | 0→0 | 5,20→5,10 ms |
| Proche ×1 | 177,054→195,116 | +10,20% dispersé | 0,999833→0,999954× | 14,55→13,45 ms |
| Proche ×6 | 91,248→96,054 | +5,27% | 5,192→5,695× | 32,15→29,55 ms |
| Large pause | 240,079→240,091 | +0,005% | 0→0 | 5,20→5,35 ms |
| Large ×1 | 202,811→200,495 | −1,14% | 0,999276→0,992824× | 11,75→11,85 ms |
| Large ×6 | 76,890→88,281 | +14,81% | 5,981→5,859× | 29,95→29,60 ms |

Proche ×1 A187,714/166,393 et B205,655/184,577 : B2 est sous A1, donc pas de séparation des cohortes ni gain fiable attribué. Large ×1 A204,634/200,990 et B199,643/201,346, maximum B30,4ms contre A26,5ms : baisse moyenne observée, aucune absence de régression générale annoncée. Les huit fenêtres ×1 sont dans±5% de la vitesse demandée ; le diagnostic initial≈210FPS est un autre passage, jamais réutilisé comme A de ce candidat.

À ×6 les deux B dépassent les deux A dans chacune des vues, mais les débits ne sont pas égaux. Proche A5,717/4,667× et B5,773/5,617× : un B et un A seulement dans±5%. Large A5,950/6,012× et B5,791/5,927× sont dans±5%, maximum B62,1ms contre A52,8ms. La hausse RAF est observée dans ces échantillons, sans certifier240FPS, débit6×constant ou gain GPU. Froid≈22–23s séparé, sans économie de chargement affirmée.

L'économie isolée proche motive la rétention de cette feuille, avec ces limites GAME explicites. Aucun changement d'horloge/bridge/interpolation/phases de travail, donc pas de rejeu de présentation/corpus immuables pour ce lot de rendu ; leurs empreintes restent contrôlées et les quatre reprises natives sont acquises. Aucune campagne naturelle complète certifiée. Prochaine priorité étudiée : faits de pose fixes des acteurs et coût d'adoption/application MAIN, avec autorités privées et replis littéraux conservés ; aucune implémentation engagée dans ce lot.

## Livraison

Documentation **PASS2,689 s** avec le Python fourni par le runtime. Premier lancement sur l'alias WindowsApps `python` **EACCES0,029 s** conservé ; aucune modification de vérificateur. Diff sans erreur d'espacement, simulation/bridge/publics intacts dans le gel final.

Produit **`92ff337c` commité/poussé sur main**, publié une seule fois en **`235b1f0b`** sur [l'adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://235b1f0b.elsewhere-cq7.pages.dev/). Package **PASS1,768 s**, `tmp/elsewhere-pages/v329-package-tOrWNJ/report.json` :515fichiers,119196834octets,63références/66chemins publics exacts, contenus privés/laboratoire absents. Wrangler4.149.0 **PASS14,680 s** : deux fichiers nouveaux,511déjà présents, puis en-têtes/redirections.

HTTPS **PASS7,614 s**,102réponses200/MIME/octets exactes sur51chemins des deux origines ; rapport `tmp/elsewhere-pages/v329-http-sioJn8/report.json`. Package/publics restent exacts. Ces réponses ne rejouent pas le jeu ni un benchmark en ligne et ne téléchargent pas les66fichiers distants. `references_UI/` demeure non suivi et exclu ; seul cet élément motive l'avertissement Git dirty de Wrangler. Un commit/push documentaire consigne la livraison sans nouvelle publication. Relance PAUSED, aucun contrôle lourd actif, aucun nouveau gameplay engagé.

Documentation de livraison **PASS1,587 s**, avant ce seul ajout de durée ; aucun lien/contrat produit modifié. La suite étudiée reste hors produit et les sources/tests/pilotes acquis ne sont plus édités.
