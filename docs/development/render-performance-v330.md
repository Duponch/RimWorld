# V330 — cadence des ombres et détail des animations

Référence main `18597860`, produit précédent V329 `92ff337c`, schéma 229 conservé. Demande humaine : analyser la chute pause/lecture et ajouter des ombres et animations décoratives réglables. Défaut **Équilibré** explicitement choisi par l'utilisateur : ombres 60 Hz et simplification décorative de loin. ROOT seul exécute les contrôles séquentiels sur sources/pilotes figés ; relance planifiée PAUSED.

## Demande et changement

L'utilisateur constate une baisse entre pause et lecture, un effet faible du retrait de la chambre et un gain V329 peu perceptible. V330 ajoute des réglages de présentation : fréquence/résolution des ombres et détail des mouvements décoratifs selon leur taille apparente. Ce choix peut réduire la qualité temporelle des ombres ou de certaines oscillations ; il ne constitue pas une optimisation à pixels identiques. Aucun gain FPS/CPU/GPU n'est déduit de l'implémentation.

Les préférences sont communes à **Options** à l'accueil et **Menu → Performances visuelles** en partie, appliquées au renderer courant et mémorisées dans ce navigateur. Elles restent hors du World et des sauvegardes. Simulation, bridge, calendrier, cadences de confirmation et règles du jeu restent hors de ce lot ; schéma 229 conservé.

## Réglages et défaut équilibré

| Réglage | Défaut | Choix / bornes |
| --- | --- | --- |
| Fréquence des ombres | 60 Hz | 30, 60, 120 Hz ou **À chaque image** (`0`) |
| Résolution des ombres | 2048 | 512, 1024, 2048 ou 4096 par côté |
| Adapter les animations à la distance | Activé | Désactivé : détail complet pour ces animations |
| Animations complètes | 24 px / case | Entier 4–96 |
| Arrêt décoratif lointain | 8 px / case | Entier 0–48, strictement inférieur au seuil proche ; 0 enlève l'arrêt |
| Fréquence à mi-distance | 12 Hz | Entier 1–60 |

**Équilibré** restaure les cinq valeurs numériques et active l'adaptation. **Tout animer à chaque image** désactive cette adaptation et choisit les ombres à chaque image ; il conserve la résolution choisie. Ce bouton restaure la continuité décorative pour comparaison, sans promettre l'identité complète du nouveau produit avec un ancien commit.

Les parsers acceptent un objet ou sa chaîne JSON. Chaque champ invalide reprend son défaut ; les tailles/fréquences d'animation sont arrondies et bornées, avec `farPixels < nearPixels`. La borne du curseur lointain est publiée avant sa valeur, afin qu'un changement du seuil proche puis un retour ne provoque pas un clamp DOM parasite. Le renderer limite la résolution réellement allouée aux capacités natives du matériel ; les preuves doivent distinguer demande et atlas réel si elles diffèrent. Les clés sont `lisiere.presentation.shadows.v1` et `lisiere.presentation.animation-detail.v1`. Un échec de persistance remonte au message UI prévu.

## Ombres : une passe différée, une projection cohérente

`ShadowRefreshScheduler` décide si la prochaine image ordinaire doit recalculer l'atlas. 30/60/120 Hz plafonnent la cadence de rafraîchissement en lecture ; ils ne règlent ni le nombre de RAF ni le débit des ticks. Les changements urgents peuvent provoquer une passe avant la prochaine échéance. `0` conserve une demande à chaque image jouée. Une seule passe native terminée établit une référence réutilisable ; un refus, une horloge non finie ou un retour de temps invalide la référence. Les échéances gardent leur phase lorsque le taux de RAF ne divise pas la fréquence ; un retard ne déclenche pas une série de passes de rattrapage.

En lecture, les modifications ordinaires des acteurs et des Worlds invalident le cache exact de pause sans systématiquement remettre la cadence à zéro. Caméra/projection/identité/layers/coordonnées/profondeur, redimensionnement, nouveau monde/réinitialisation, options d'affichage, textures/herbe/toits/coupe des murs, réglages lumineux ou détail d'animation provoquent une invalidation urgente sur leurs chemins concernés. Les évolutions de cargaison et de tourelle conservent l'invalidation de pause. Cette distinction évite qu'une mise à jour continue des casters annule le réglage de fréquence.

Le cache de pause WebGPU conserve ses vérifications exactes : temps/blend confirmés, caméra et caméra d'ombre, dimensions, niveau de vue distante, positions lumière/cible, résolution, intensité et biais. Une pause encore en train de vider son temps confirmé n'est pas déclarée stable. Le scheduler ne remplace pas ces vérifications. Aucun réemploi de pause équivalent n'est revendiqué sur un autre backend.

`SceneRenderCore` choisit la passe, fixe les flags natifs `autoUpdate/needsUpdate`, puis confirme sa réalisation après le rendu. Sur une image sans nouvelle passe, il conserve l'atlas **et sa projection d'ombre** : pas de nouvelle projection appliquée à une ancienne texture. Le fit du soleil normal ne s'effectue qu'avec le rafraîchissement ; dans la chambre, la source de projection et son fit suivent aussi cette décision. La couleur, la puissance et le déplacement visuel des astres continuent au temps de présentation confirmé. À la prochaine passe, la projection reprend la source courante, même si les émetteurs avaient déjà été actualisés lors d'une image intermédiaire.

La résolution appartient à l'unique atlas natif du soleil/la lune, ou à la projection commune de la chambre. Le backend garde l'allocation et le redimensionnement. Aucun second éclairage, double atlas, nouvelle passe forcée de rattrapage ni baisse du rythme de rendu principal n'est introduit.

## Animations : échelle apparente, trois niveaux

`AnimationDetail` publie une seule fois par RAF, après les contrôles de caméra, les uniforms de projection et de profondeur de la **caméra principale**. Il ne parcourt pas les acteurs pour mesurer leur distance sur le CPU. Le shader évalue le niveau à une ancre non déformée de l'acteur ou de la plante ; la caméra de la passe d'ombre ne change pas le niveau utilisé.

La mesure est une échelle apparente en pixels **CSS** par unité/case, dérivée de la hauteur CSS du viewport et de `abs(projectionMatrix[5]) / 2`. Le zoom est déjà contenu dans la matrice. En iso/orthographique, cette échelle ne dépend pas de la profondeur. En perspective, elle est divisée par la profondeur dans la vue de **chaque ancre**. Il s'agit d'une échelle de projection, pas de l'aire mesurée du polygone d'une case, ni d'une distance radiale arbitraire autour de la caméra. Le DPR ne transforme donc pas le seuil utilisateur en nombre de pixels physiques GPU.

Avec les valeurs par défaut :

| Taille apparente | Mouvements décoratifs |
| --- | --- |
| Au moins 24 px / case | Horloge et phase complètes |
| Au moins 8 et moins de 24 px / case | Temps décoratif échantillonné à 12 Hz |
| Moins de 8 px / case | Oscillations décoratives au repos |

La région intermédiaire utilise `floor(t × Hz) / Hz`. Pour la démarche, seule la phase des membres est prise au temps quantifié sur le même segment confirmé ; le corps continue sur son segment original. Ce choix **ne réduit pas le nombre d'invocations des shaders**, les uploads CPU ou les appels de rendu. Les expressions utilisant ce temps sont encore évaluées par image. Il peut produire des pas temporels perceptibles ; les seuils se modifient avec le zoom et il n'y a pas de fondu de transition ajouté.

Au loin, de véritables branches TSL `Fn/If` placent les sinus décoratifs ou le sous-graphe de déformation du vent derrière la condition de niveau. Un simple `sin(0)` calculé à chaque image ne serait pas un arrêt de ces calculs. Les rotations nécessaires au placement, aux normales et aux postures restent actives : le lot ne supprime pas toute trigonométrie d'un acteur éloigné. L'existence et le comportement des branches dans les shaders natifs sont soumis au contrôle natif de ROOT ; leur coût dépend aussi de la compilation et de la divergence GPU.

## Périmètre des mouvements conservés

| Feuille | Adaptation décorative | Chemins conservés |
| --- | --- | --- |
| `PawnLayer` | Marche/attente ordinaires : oscillations des membres, respiration, petits mouvements corporels et clignements | `motion.z != 0` reste au détail complet : travaux, combat, visée, soins et interactions explicites ; trajectoire, rotation, postures, ownership et cargaison/handoff restent sur leurs horloges originales |
| `WildlifeLayer` | Démarche, respiration, bob et petits mouvements de tête ; inclinaison utile de posture conservée | Attaque sur son temps original, états couché/mort, masque anatomique, orientation, trajectoire et transfert ; hauteur portée cohérente avec la pose d'interaction du porteur |
| `MechanoidLayer` | Oscillation des membres pendant la marche | Attaque, préparation visuelle de tir, posture à terre, pièces absentes, rotation, trajectoire et transfert |
| `GpuGroundGrassLayer` | Oscillation des brins | Placement, densité, visibilité, couleur et règles du sol existants |
| `PlantClusterLayer`, `ResourceLayer` | Flexion et flutter du vent | Plantes/arbres résidents, croissance/état physique, géométrie et placement existants ; repos = forme non déformée, pas disparition |

Les animaux et mécanoïdes appliquent le même angle aux positions et à leurs normales existantes. Les variantes de matériaux réemploient leur graphe de position. Le détail est déterminé par la caméra principale aussi pendant la passe d'ombre ; une ombre à cadence réduite peut naturellement représenter un instant antérieur au corps courant. L'anatomie, les pertes de pièces et les propriétaires des corps/cargos ne sont pas reconstruits selon le niveau de détail.

`PaintedWater` ne change pas : ses oscillations restent sur le temps confirmé à chaque rendu. Les précipitations, feux, projectiles/effets d'action, cordes, déplacements des astres, échantillons lumineux et audio restent également hors de l'adaptation d'animation V330. Les mises à jour CPU de présentation par RAF, les décisions de jeu, les positions physiques et les segments ne sont pas espacés par ces options.

## Attribution fraîche, chambre et diorama désactivés

`tmp/performance-v330/diagnostic-off-uQUVKn/report.json` reste **FAILED, 132,308 s** : la collecte limitée à 120 s ferme les processus possédés pendant la dernière fenêtre T large ×6. A termine ses six fenêtres, son mapping et une recharge 8533 exacte. T termine cinq fenêtres, sans mapping final des modules chargés, restauration globale finale ni recharge. Ses fenêtres achevées restaurent individuellement les wrappers natifs. Ces résultats ne constituent ni une cohorte T entière, ni un gain produit, ni une estimation fiable du coût de l'observateur.

La qualification hors ligne distincte `qualified-analysis-HSqmCY/report.json` **passe en 4,275 s** sur les cinq fenêtres achevées : forêts de spans synchrones, horloges propres, inverse du MAIN compilé et contenu des source maps exacts, copies complètes A/2788 entrées et sources/1034 exactes. Le lecteur initial refuse en 2,615 s l'hypothèse erronée `before.tick === startTick` entre deux lectures asynchrones jouées (8448 puis 8451). La reprise conserve les données et les bornes des fenêtres, impose l'ordre des ticks en lecture et leur égalité en pause ; elle ne transforme pas le diagnostic initial en PASS.

Chrome matériel/WebGPU, 2560×1440, DPR1, Aulnes250²/tick8434 restaurées exactement avant chaque fenêtre ; textures/herbe/ombres/zones ON, chambre/carton OFF. Chauffe0,5s, pause1s et lecture2s. Ces fenêtres courtes décrivent l'attribution, pas des FPS stables. Les sept timers natifs couvrent adoption MAIN, réception, setWorld/applyWorld/frame, fit du soleil et rendu Three. La passe d'ombre est le vrai rendu imbriqué de la même scène avec la caméra d'ombre ; ses durées sont incluses dans celles du rendu parent et ne s'y ajoutent pas. Aucune mesure GPU ni coût du Worker n'est assimilé au MAIN.

| T achevé, vue/vitesse | RAF/s instrumentés | Débit réel | Passes d'ombre | CPU moyen par passe d'ombre | CPU moyen adoption / application |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proche pause | 240,567 | 0 | 0 | — | — |
| Proche ×1 | 211,535 | 0,998× | 424 | 0,664 ms | 8,292 / 9,050 ms |
| Proche ×6 | 87,619 | 6,023× | 177 | 0,705 ms | 8,302 / 9,867 ms |
| Large pause | 240,207 | 0 | 0 | — | — |
| Large ×1 | 222,133 | 0,998× | 445 | 0,651 ms | 6,842 / 6,575 ms |

En ×1, l'ancien rendu recalcule donc l'ombre à chaque image jouée même sans chambre/carton. Le plafonnement peut économiser cette passe ; il ne retire pas les interruptions périodiques du MAIN par l'adoption/application des Worlds. Ce second coût explique pourquoi une baisse de fréquence graphique seule ne garantit pas la récupération de toute la différence pause/lecture. Les durées d'adoption/application sont par appel complet, pas par RAF voisin ; leurs parents recouvrants ne sont pas additionnés.

## Contrôles courts et présentation

**70 cas/9 fichiers PASS21,077 s**, dont 26 nouveaux/4 fichiers : préférences, scheduler/cadence144Hz, projection conservée, uniforms partagés et taille apparente selon caméra, anciens buffers/horloges/données World, cache de pause, chambre/lifecycle/bundles et herbe/vent. Les tests de backend factice ne qualifient pas des pixels ou branches GPU. `v330-render-controls-2026-10-12T13-23-16.987Z-15744/output.log` conserve le résultat ; un dixième filtre désigne un fichier absent et n'ajoute aucun fichier ni cas.

Le premier build est **rouge7,632 s** sur TS18046 dans la nouvelle fixture d'attributs. Le cast explicite BufferGeometry corrige seulement le typage du témoin ; build Pages/typage **PASS9,563 s**. Un correctif produit distinct assigne `far.max` avant `far.value` lors du retour Équilibré après near4, afin que préférence/output/curseur restent tous à8. Build final **PASS9,589 s**, `v330-build-pages-range-2026-10-12T13-36-52.434Z-14420/output.log`. Les gels successifs du contrôle regroupent3067 sources/tests/publics/scripts/configurations ; les manifests antérieurs sont conservés séparément.

`npm run test:presentation` sur Chromium livré **reste rouge65,217 s** : quatre refus Tint IR « swizzle view instruction still has usages after lowering », pipelines MeshStandard130/128/131/112. Les186 travaux initiaux deviennent162 avec19 retraits groupés, zéro saut/occupation solide/excès de déplacement/starvation ; les22 commandes visibles répondent en9,6–26ms. Le refus est celui des erreurs graphiques, pas un défaut d'achèvement métier. Le backend Chromium avait déjà refusé112 dans les notes V309/V324 ; aucun correctif de ce compilateur n'est prétendu ici.

La reprise avec le canal natif existant `HARVEST_BROWSER=chrome` **passe123,565 s** : mêmes scripts et assertions complètes, vrais minage/abattage45s chacun, changements ×6/×1/×3, continuité et retraits au temps confirmé. Rapport `tmp/test-runs/v330-presentation-chrome-2026-10-12T13-56-08.959Z-18812/artifacts/harvest-sync-verification.json`. Le rouge Chromium reste conservé ; il ne justifie aucun assouplissement des assertions, aucune absence universelle de défaut GPU, ni une réparation Brave.

## Pilotes natifs : réparations séparées

Le premier gel UI refuse les fins de ligne différentes entre blobs Git LF et fichiers Windows CRLF (`src/bridge/snapshots.ts`), alors que le diff Git moteur/bridge reste vide. La reprise conserve les octets propres à A et B ; l'audit des fichiers partagés exige identité brute ou UTF8 strict avec conversion CRLF→LF seule, binaires publics exacts. Cela qualifie l'identité du code partagé, pas une égalité brute inventée entre les deux copies. Le GAME suit le même audit, avec origine des blobs A vérifiée et nouveaux fichiers B explicitement recensés.

Le premier lancement de cette reprise est **rouge0,144 s**, avant tout navigateur : le pilote UI réemploie un chemin d'import à trois niveaux alors que son dossier en a deux. La copie distincte `ui-launch` corrige seulement ces imports/références de dossier. Le produit reste intact.

`ui-launch/ui-LX6VaE` **reste rouge83,964 s**, avec erreurs navigateur vides et processus possédés fermés : accueil/partie/presets/near4→far8/persistance, recharge8434 et vrais atlas/profondeurs512/4096/2048 acquis ; fenêtre30Hz qualifiée45 ombres/323 rendus principaux en1,505s. L'assertion suivante impose à tort un écart minimal entre appels natifs chronométrés pour60Hz. Ces timestamps de rendu ne sont pas ceux de décision RAF ; une cadence qui conserve sa phase après une image retardée peut aussi produire deux appels proches sans dépasser son plafond. La fenêtre60 n'était pas conservée avant l'assertion, donc aucune qualification rétrospective de cette fenêtre n'est faite.

La copie distincte `ui-cadence` conserve les fenêtres brutes avant chaque assertion. Elle vérifie nombre natif de passes par fenêtre, réel saut quand le RAF dépasse le plafond, au plus une passe par image, projection exacte sur les images sautées et vrais ticks. Elle ne prétend pas qualifier des intervalles constants, préfixes ou fenêtres glissantes depuis des horloges différentes. Aucun code produit ni cadence n'est changé pour satisfaire cet oracle.

`ui-cadence/all-kpVLm2` **reste rouge157,493 s** (elapsed interne156,203s). Quatre références A WebGPU/tick8434 sont acquises, chacune avec deux captures RGBA stables ; elles ne prouvent pas encore une égalité A/B. B acquiert à nouveau UI/persistance/recharge8434 et atlas512/4096/2048, puis les quatre fréquences :30Hz46/331,60Hz91/331,120Hz174/327,continu328/328 passes d'ombre/images principales, en1,501–1,504s avec neuf ticks ordinaires par fenêtre. Les projections restent exactement fixes sur les images sautées. Aucun gain FPS/CPU/GPU ne se déduit de cet observateur.

La pause immobile acquiert73 images/304ms sans passe. Le pan conserve97 images/402,3ms et trois passes : caméra déplacée à l'image0, puis deux changements stricts de matrice aux images1/2 pendant la stabilisation des contrôles ; les94 images suivantes ont matrices identiques et zéro passe. L'oracle attendait à tort une unique passe pour tout le pan. La signature produit reste exacte, sans epsilon ; les seuils/mouvements/shaders/pixels B et WebGL restent non acquis dans ce rouge. Mappings/inverses, erreurs vides, gel après chaque cohorte et fermeture des deux Chrome/Vite possédés sont acquis ; restauration explicite des wrappers et gel global final ne le sont pas. Rapport SHA256 `d2329db2385c4947beaf01bc3e52dd5135ee79a8a8ec94f53ca8bf8955c27bc0`, brut pan `bc8d95e49808952b12c9e3ae6567880daba9cba4a5f6660e0c7db61cda14f7e0`.

`ui-camera/remaining-kMTAbT` **reste rouge87,488 s** : après qualification hors ligne limitée des acquis précédents, WebGPU B acquiert le pan strict,12 états de seuils (deux caméras × deux matériaux × trois niveaux), trois changements de réglages sans changement synchrone de clocks/attributs/pose et2403 paires d'interpolation de segments réels ; pause stable acquise. Le filtre de shaders `/colonists/i` incluait aussi `Selected colonists — shared GPU trajectories`, anneaux sans déformation décorative, et exigeait à tort `floor/sin` sur eux. Les shaders réels sont conservés dans le rapport de cohorte, assignés avant le refus ; les corps `Colonists — procedural eight-bone GPU rig` contiennent bien ces opérations. Erreurs navigateur vides, mapping et gel après cohorte exacts, Chrome/Vite possédés fermés. Le fichier dédié de shaders, restauration explicite, recharge finale et pixels/WebGL restent non acquis dans ce rouge. Produit inchangé.

ROOT engage ensuite le GAME plain pendant la préparation privée du pilote de pixels restant : contrôles séquentiels, tests/build/présentation Chrome et acquisitions natives UI/cadence/seuils/mouvements déjà terminés. Cette chronologie diffère de la recommandation du README GAME qui plaçait le gate natif entier avant le GAME ; aucun contrôle lourd concurrent ni assouplissement d'assertion GAME. La qualification graphique restante demeure nécessaire avant livraison.

`ui-rig/remaining-S5GFwh` **reste rouge162,653 s** : qualifications hors ligne des témoins WebGPU précédents acquises, puis quatre pixels B WebGPU stables acquis au mode continu2048, exactement égaux aux quatre références A conservées (RGBA, Wind, caméra et projection contrôlés séparément par ROOT). La cohorte suivante attend WebGL2 mais reçoit WebGPU : Chrome ignore ici la demande `--disable-blink-features=WebGPU`. Aucun pixel ou shader WebGL n'est acquis dans ce contrôle ; erreurs vides et cleanup/gel des deux cohortes effectuées restent distincts d'un PASS global.

Le probe natif séparé `webgl-service-probe.json` **passe1,018s** sur un serveur loopback possédé : `--disable-features=WebGPUService` conserve une API WebGPU native mais donne `requestAdapter=null`, avec WebGL2 matériel AMD RX5700XT/D3D11 disponible. Chrome et serveur fermés. Ce probe ne charge aucun jeu. Le nom du service provient de la [déclaration primaire Chromium](https://chromium.googlesource.com/chromium/src/%2B/HEAD/gpu/config/gpu_finch_features.cc) ; aucune propriété navigateur ou factory produit n'est remplacée. La reprise de couverture WebGL reste séparée.

Qualification hors ligne distincte `qualified-webgpu-pixels-reprise.json` **PASS2,462s** : quatre paires acquises A/B décodées à nouveau (16PNG), RGBA2560×1440 exactement identiques, Wind/caméra/projection exacts, World8434, B en fréquence0/détail désactivé/2048 ; cohortes acquired passed, erreurs vides et cleanup/gel vérifiés. Les deux contrôles natifs globaux restent rouges. Le premier lecteur hors ligne est **rouge0,067s** avant lecture, important à tort un paquet `pngjs` absent ; la copie distincte utilise le PNG déjà scellé de Playwright, sans nouvelle dépendance ou modification produit. La qualification ne couvre ni pixels joués ni égalité du mode équilibré.

La revue privée des88 shaders WGSL effectivement conservés distingue64 couleur/24 ombre, corps et anneaux. Corps, arbres, massifs et herbe contiennent les branches décoratives attendues ; aucun coût GPU ni résultat individuel de branche n'en est déduit. Les premières captures d'ombre sont acquises sous caméra MAIN iso seulement, même si la caméra native d'ombre est PerspectiveCamera ; aucun nouvel appariement d'ombre MAIN perspective ou mécanoïde présent dans cette colonie n'est inventé. Les12 témoins de seuils couvrent les deux projections côté uniforms/CPU.

Le contrôle matériel WebGL2 séparé `ui-webgl/webgl-uoTlBE/report.json` **reste rouge238,824s** (elapsed interne237,540s), SHA256 `065ec5828bd2cae03478c9fc77551ae97c528e4ba95e6f787b32e9c07db19648`. Ses deux cohortes A/B passent individuellement : UI/persistance/near4, vrais atlas512/4096/2048, fréquences30Hz45/248,60Hz91/249,120Hz175/242 et continu245/245,12 états de seuils et2420 paires d'interpolation de segments réels. Restauration explicite acquise, recharge8457 exacte ; erreurs vides, mappings/inverses et gels après chaque cohorte exacts, Chrome/Vite possédés fermés. WebGL conserve son comportement antérieur de rafraîchissement en pause ; aucun cache WebGPU lui est attribué.

Le refus global concerne l'égalité RGBA du mode continu/détail désactivé en perspective sans textures. La revue ROOT hors ligne `qualified-webgl-pixels.json` **passe2,763s comme lecteur**, avec statut explicite `qualified-partial`, sans transformer le contrôle natif en PASS : les16PNG sont à nouveau décodés, chaque répétition est stable, caméra/Wind/World8434 exacts. Trois paires sont exactement égales (iso plain/textured et perspective textured, cette dernière acquise avant le comparateur). La quatrième diffère sur5498 pixels/6465 canaux RGB, soit0,149% des pixels ; delta maximal1 sur255, zéro différence alpha, rectangle x595–1296/y242–646. La localisation privée situe les différences sur des bandes obliques des découpes nuages/montagnes/arbres de carton ; les shaders GLSL de ces découpes n'ont pas été capturés, donc aucune cause numérique précise n'est démontrée. Les faits sélectionnés de projection d'ombre avaient passé avant le refus RGBA. La capture perspective B est inspectée par ROOT ; aucune identité brute, cause de compilateur, égalité jouée/Équilibré ou absence universelle de régression n'est affirmée. Cette variation limitée est consignée ; aucune tolérance ajoutée ni modification produit faite seulement pour verdir le comparateur. Les réglages demandés restent retenus, avec cette limite du retour continu WebGL.

## GAME frais : chambre et diorama activés

`game-reprise/abba-hZQ4lJ/report.json` **PASS413,187 s** (elapsed interne413,083s), SHA256 `ccbb386608bea68d4164e9556b4c812d0b42834428cefe79e3451f2dd294a62c`. Quatre Chrome/Vite frais A/B/B/A, WebGPU matériel AMD/RDNA1,2560×1440/DPR1 ; chambre/carton ON, quatre murs, trois arcs/six suspensions, masque31%, éclairages100%, textures/herbe/ombres/zones ON. A est le commit18597860 avec ancien détail complet/ombre2048 par image ; B utilise les vraies préférences Équilibré60Hz/2048/24–8px/12Hz. Cette différence temporelle est demandée, pas une optimisation à pixels identiques.

Deux poses V329 proche iso et large perspective, chauffe2s, pause1s et lectures×1/×6 de6s ;24 fenêtres et24 resets natifs exacts Aulnes250²/tick8434. Les temps confirmés restent monotones et bornés ; tous les16 débits joués sont dans±5% de la demande. Suffixe compilé inverse exact, RAF/ticks et compteurs Three seulement : aucun timer CPU, wrapper natif, Profiler ou timestamp GPU dans ce GAME. Draws/triangles ne sont pas des compteurs de passes d'ombre.

| Vue / vitesse | RAF/s A→B pondérés | Variation | Débit réel A→B | p95 moyen ms A→B | Max ms A→B |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proche pause | 174,126→173,557 | −0,326% | 0→0 | 6,30→6,45 | 6,90→7,10 |
| Proche ×1 | 160,346→163,743 | +2,119% | 0,999559→0,999450× | 13,05→12,85 | 22,80→21,10 |
| Proche ×6 | 86,560→87,017 | +0,528% | 6,020353→6,031313× | 26,65→26,00 | 50,00→57,70 |
| Large pause | 173,583→174,074 | +0,282% | 0→0 | 6,50→6,45 | 7,50→7,30 |
| Large ×1 | 163,656→164,390 | +0,449% | 0,999425→0,999334× | 11,80→11,85 | 25,10→21,30 |
| Large ×6 | 91,474→95,651 | +4,567% | 6,020553→5,999000× | 24,00→24,50 | 43,40→58,60 |

RAF et débit sont pondérés par durée ; p95 = moyenne des deux p95 de cohortes, pas quantile fusionné. À×1 les deux B dépassent les deux A, mais la marge large B2/A2 n'est que0,049RAF/s. À×6 les cohortes se recouvrent : A2 dépasse les deux B proche et B2 large ; maxima B57,7/58,6ms et p95 large défavorables. Aucun gain×6 stable, amélioration générale de fluidité,240FPS, vrai×6constant ou temps GPU gagné certifiés. Le réglage reste retenu comme présentation ajustable demandée et économie de passes natives démontrée, avec gain×1 modeste dans ce banc ; il ne résout pas tout le chantier MAIN.

Quatre sauvegardes/recharges manuelles de continuation8731/8731/8730/8730 exactes,24 originaux8434 exacts, erreurs vides, mappings1006/1011/1011/1006 et tous Chrome/Vite possédés fermés. Gels global/quatre cohortes exacts :2820 entrées workspace,2797 produits,1034 sources A/1039 B et cinq nouvelles.39 différences partagées CRLF→LF seules qualifiées explicitement ;511 publics byte exact, aucun public textuel divergent. Les copies baseline sont des entrées, jamais des mesures anciennes ; les sources propres à chaque côté, leurs factories/lifecycles et suffixes inverses restent contrôlés. Simulation/bridge/codecs/publics/configuration ne sont pas modifiés.
