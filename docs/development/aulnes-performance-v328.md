# V328 — capture géométrique confirmée dans MAIN

Lot du 12 octobre 2026, demandé pour améliorer les performances des Aulnes avec chambre et diorama activés. **Modification retenue** : adoption MAIN isolée 8,801→8,276 ms (−5,97 %), GAME +20,59 % proche / +21,25 % large à débits voisins, corpus 63 références/66 fichiers qualifié. Aucun gain GPU ou CPU global, 240 FPS en jeu ou vrai ×6 constant certifié. ROOT seul exécute les contrôles successifs sur sources/tests/pilotes gelés. Les chemins de preuves abrégés ci-dessous partent de `tmp/performance-v328/`, sauf les journaux unitaires/build sous `tmp/validation-runs/`. Livraison commit/push/publication encore à acquérir par ROOT.

Le lot conserve entre adoptions MAIN la projection des ancres de structures déjà construite par V327. Il ne conserve aucun verdict de garde. Trois feuilles produit changent : `src/sim/owned-validation-geometry.ts`, `src/bridge/snapshots.ts` et `src/main.ts`. Le nouveau fichier de tests est `tests/owned-geometry-reuse-v328.test.ts`. Schéma 229, simulation source, protocoles, sauvegardes publiques, règles, qualité et cadences conservés. Aucun nouveau gameplay ni shader d’herbe.

## Profil actuel et reprises conservées

Le profil est réalisé sur le V327 courant `8e39e108`, avant le candidat, en Chrome WebGPU 2560×1440/DPR1 : Les Aulnes 250², vrai World 8434 chargé par l’interface publique, chambre/carton ON, masques 31 %, Soleil/Lune/Ambiance 100 %, textures/herbe/ombres/zones conservées. Les deux poses V327 sont reprises exactement, proche isométrique et large perspective. Chaque pose recharge 8434, chauffe 3 s puis mesure 8 s à ×6 demandé. Chaque cohorte possède son Chrome/Vite neuf ; aucun navigateur utilisateur n’est attaché.

Trois rouges de préparation/profil sont conservés et ne deviennent pas des mesures réussies :

- `freeze-n1nxG1`, 3,941 s : gel initial arrêté, ancre de factory attendue deux fois mais trouvée trois fois. Répertoire partiel conservé sans manifeste. Reprise de gel `freeze-ZhVkfM`, 3,062 s, réussie après qualification du troisième match ; aucun code produit changé pour cette réparation de pilote.
- `profile-McCf90/report.json`, contrôle 117,299 s : première A réussie sur les deux poses et recharge de continuation 8824 exacte, puis premier P proche refusé pour un `timeDelta` brut de **−5 µs à l’index 4011**. Aucune normalisation, suppression de delta, durée/counter/profil rouge réutilisé comme échantillon. Les processus possédés sont fermés.
- Première reprise, après le gel réussi `freeze-t3kC4q` en 4,473 s : arrêt en 7,546 s avant ouverture de navigateur. Le chercheur de manifestes rencontrait le répertoire partiel sans manifeste, donnant ENOENT. La réparation ignore seulement ENOENT pour ce parcours ; les autres erreurs restent bloquantes. Aucun résultat navigateur acquis par cette tentative.

Le nouveau gel `freeze-6EwIQK`, 4,658 s, précède la reprise acceptée `profile-iO15J2/report.json`, passée en **219,624 s**. La première A déjà acquise est conservée verbatim avec son rapport, mapping et gel d’origine ; seuls P/P/A sont neufs. Zéro échantillon V8 ou span CPU du P rouge repris. Le rapport vérifie 2 088 fichiers de preuve préservés et les seuls changements hôte de `run.mts`/README ; les 2 792 entrées du gel restent exactes avant/après. L’interruption chronologique entre A initial et reprise demeure une limite de dispersion.

Les huit remises à la pose rechargent 8434 exactement. Les quatre recharges ordinaires de continuation sont **8824 / 8897 / 8896 / 8832**, chacune exactement identique à sa propre sauvegarde. Erreurs produit vides, wrappers restaurés et Chrome/Vite possédés fermés. Les captures sont des aides d’inspection, pas un oracle RGBA.

P ajoute l’échantillonnage V8 MAIN à 1 000 µs et des spans CPU synchrones inclusifs. Le véritable override `MainSnapshotDecoder.adopt`, avec préparation, `super.adopt`, engagement/nettoyage des owners et exception, est appelé avec son receiver/arguments natifs inchangés. L’enregistrement est inséré après la classe exacte ; mappings source/JS compilé, inverse et hashes qualifient cette insertion. Aucun profil Worker ni timestamps GPU, aucun masque d’herbe.

| Vue | RAF/s A→P | Écart observateur | Débit réel A→P | p95 moyen ms A→P |
| --- | ---: | ---: | ---: | ---: |
| Proche iso | 105,764→76,658 | −27,52 % | 5,716→6,107× | 28,90→33,60 |
| Large perspective | 101,435→72,451 | −28,57 % | 5,830→6,198× | 27,80→29,60 |

Cette comparaison porte sur le même produit A avec/sans observateur, à débits mesurés différents. Elle quantifie la perturbation du diagnostic ; aucune soustraction de ce coût ni économie produit déduite.

## Attribution CPU fraîche et piste de piles rejetée

`ancestry-lQgmTg/report.json` passe en 1,101 s sur les quatre profils P acceptés. L’analyse vérifie format brut, références/IDs de nœuds uniques, arbre connecté sans cycle, échantillons/deltas correspondants, durées finies non négatives, endpoints, scripts complets/hashes et ancres exactes du code compilé. Les callbacks anonymes de `find` par ID de pile et de `filter` par propriétaire pawn sont distingués par module et ligne compilée, plutôt qu’imputés à un wrapper nommé.

Chaque delta brut est attribué une fois ; aucun clipping, changement d’échelle ni restriction à la fenêtre RAF. Les spans CDP complets sont **9 641,340 / 8 937,725 / 9 556,450 / 8 972,994 ms**, avec queues non échantillonnées de 397 / 574 / 356 / 370 µs. Les horloges CDP et `performance.now` restent distinctes : les durées V8 ne sont jamais divisées par les 8 s RAF ni alignées artificiellement avec une image voisine.

| Descendants disjoints de `validateCooking`, ms | P2 proche | P2 large | P3 proche | P3 large |
| --- | ---: | ---: | ---: | ---: |
| Callback `find` littéral par ID de pile | 4,979 | 7,795 | 4,619 | 6,238 |
| Callback `filter` des piles du pawn | 5,997 | 4,588 | 3,888 | 12,614 |
| `reservedSource` | 14,265 | 10,997 | 14,846 | 18,916 |
| Capacité sol/stockage | 44,130 | 42,985 | 76,427 | 34,013 |
| Place de staging libre | 26,203 | 15,780 | 34,077 | 21,830 |
| Recherches directes étagère/stockage | 72,689 | 162,565 | 100,300 | 132,016 |
| Autres descendants de cuisine | 143,167 | 122,571 | 166,198 | 135,549 |
| Union cuisine conservée | 311,430 | 367,281 | 400,355 | 361,176 |

Les deux callbacks de piles réunis n’occupent que **8,507–18,852 ms par span complet**. La mémoïsation des piles est rejetée ; aucune extension de registre par ID, cache de `reservedSource`, recapture de capacité ou déplacement de réservation. Un index `Map` à dernier ID gagnant ne pourrait de toute façon remplacer le premier `find` ni les occurrences ordonnées ; les captures de capacité existantes n’ont pas le même contrat que la validation littérale. `cpu-residual-proposal.md` et `aux-query-review.md` conservent ces études non implémentées.

L’union géométrique `canReadShelf`/`captureStructures` vaut 70,88 / 162,56 / 96,19 / 130,54 ms. Dans P2 large, le self `canReadShelf` atteint 156,224 ms alors que le descendant nommé `captureStructures` est faible ; dans P3 large, le self est réparti autrement, `captureStructures` atteignant 83,342 ms. Les lignes d’entrée de fonction et l’inlining JIT ne donnent pas une attribution par instruction : les 156 ms ne sont pas présentés comme deux vérifications de coordonnées récupérables. La piste choisie est la capture entière répétée, sous réserve de payer contrôles de réemploi, allocations, froid et invalidations au banc complet.

MAIN adopt inclusif occupe 1 880,940 / 2 064,098 / 2 256,574 / 2 072,514 ms ; `applyWorld` 1 799,280 / 1 410,272 / 1 561,779 / 1 413,165 ms. Ces branches et leurs descendants restent imbriqués, jamais additionnés pour fabriquer un coût total. Le rôle de l’analyse nommé `Three.render (frame/source inspected)` est une sélection étroite de fonctions du module Three ; il ne représente pas toute la branche native `ReentrantRenderer.render`→`_renderScene`. Les arbres bruts complets la conservent. Aucun gain GPU produit ni coût de rendu total déduit de ce rôle.

## Autorité d’objet, tuple et données vivantes

Le propriétaire est instancié seulement dans le sous-type lexical MAIN de la fermeture du client fixe. Les exports helpers et hooks protected ne constituent pas une capacité d’adoption ni une preuve d’immuabilité. Le Decoder public, RAW, staging ordinaire, moteur source, callbacks personnalisés, getters/Proxy et écrivains conservent leurs lecteurs historiques. Aucun recensement de descriptors ou verdict de garde mémorisé.

Le témoin privé vient de `prepareStructureChanges`, avant les gardes sémantiques, après vérification du parent confirmé exact, epoch/révision adjacente et mêmes dimensions/version. `updatedOrdinals` est exhaustif uniquement lorsque membres et ordre restent stables. Sans touche, le reconstructeur reprend le même tableau et émet `[]`. Un ordre explicite, même identique, une addition, un retrait, un paquet complet ou checkpoint n’offre aucun témoin. Il ne provient ni d’une identité de tableau seule ni du journal public post-commit. Son offre lit uniquement les faits locaux déjà acquis, sans nouvelle lecture de propriété de paquet dans le Decoder générique.

Le premier appel géométrique peut reprendre l’index confirmé si le prédécesseur est le même objet World, dimensions/longueurs correspondent et chaque slot attesté existe, avec le tuple exact **ID/x/z/kind/orientation/footprint/furniture/deconstruction/flick/fixBreakdown** inchangé par `Object.is`. Tout changement d’ID, géométrie ou admissibilité, témoin manquant ou atypie reprend la capture fraîche et son repli littéral. La complétude du témoin reste une propriété du producteur fermé ; une liste publique forgée n’acquiert aucune autorité.

L’index partagé ne contient que des ordinals ordonnés et n’est jamais modifié. Chaque adoption possède son propre cache de recouvrements, également ordinal ; les points, premières étagères admissibles et classifications d’occupation relisent `world.structures[ordinal]`. Doublons d’objets/IDs et ordre des occurrences sont conservés, pas réduits à un registre gagnant par ID. Les anciennes vues restent liées à leur World. Terrain, version, travaux, stockpiles, présence d’état shelf, IDs durables des cellules, filtres, priorité, capacité, quantités, claims, réservations et horloge restent des décisions actuelles.

`prepare` demeure paresseux. Commit ne provoque aucune capture ; un lecteur inutilisé/unsupported ne publie pas d’index. MAIN discard le pending avant chaque adoption et sur stale/refus/exception, commit seulement après `applied`. Le confirmé précédent est conservé après discard. Les deux owners ont leurs if/else successifs, ancres du propriétaire de ressources conservées pour l’extraction littérale des pilotes. Une erreur de présentation après engagement ne légitime aucun candidat refusé.

L’audit courant entre adoptions a relu l’entrée Worker, la façade sans handle World/decoder, `receiveMainSnapshot`, UI, rendu et audio fixes. Les contrôles de meuble/porte/électricité/étagère transmettent IDs, coordonnées et réglages indépendants au Worker ; `mountStorageControls` possède ses Set/états DOM. Les recherches d’affectations/mutateurs n’identifient aucun écrivain de `World.structures` ou du tuple. Les matchs restants sont Maps/captures privées, camera/poses et placements nouvellement construits ; le tri de sélection porte sur un tableau filtré neuf. `SceneStructurePreparation` relit les structures actuelles par ordinal. DEV `__lisiere.world` renvoie encore `structuredClone(snapshot)`. Limite : audit statique du chemin fixe, pas garantie sous intrinsics interposés, accès arbitraire aux objets internes ou nouveau consommateur écrivain. Contrat et revue indépendante : `geometry-reuse-proposal.md`, `geometry-ownership-review.md`.

## Unitaires et build acquis, dette historique qualifiée

Premier groupe `v328-geometry-guards-2026-10-12T09-11-44.246Z-12060/output.log`, 14,353 s : **81 PASS / 2 FAIL sur 83 cas, 10 fichiers**. Les deux rouges sont conservés :

- Nouveau cas de refus tardif : une collision de growing-zone seule ne déclenchait pas le namespace relationnel prospectif ; RAW et le Decoder candidat retournaient tous deux `applied`. ROOT corrige la fixture en activant le vrai registre `relationships:{links:[]}`, puis vérifie le refus tardif exact et le passage par le contexte. Aucun garde produit n’est retiré. Reprise du seul nouveau fichier `v328-geometry-reprise-2026-10-12T09-13-46.357Z-19372`, **12 cas PASS en 7,994 s**.
- Cas historique `biofuel-save-v283`, migration 217 : `Invalid historical save: Future fodder content.` Le test reste rouge et inchangé ; sa qualification A/B séparée ci-dessous établit une dette ponctuelle de fixture déjà présente dans la référence.

Les 12 nouveaux cas couvrent continuation sparse même tableau, remplacement de feuilles shelf et politiques actuelles, changements de tuple/overrides, membres/ordre/full/parent erroné, terrain/version/jobs/stockpiles vivants, occurrences dupliquées, malformed/hole/null/erreurs, laziness, discard/commit non observé, RAW mutable et lifecycle Decoder avec stale/refus tôt/tard/exception/retry. Cette paire de fixtures ne prouve pas seule l’autorité du MAIN réel ; corpus et contrôles littéraux restent nécessaires.

Le contrôle ROOT distinct `legacy-fixture-check/comparison-TIwXTp/report.json` passe en **21,873 s**. Le premier callback historique est extrait littéralement avec ses véritables clauses d’import et preuve inverse, puis exécuté sur des copies complètes fraîches des sources A et B, sans importer Vitest ni aucun autre callback du fichier. Les deux côtés refusent avec le même message `Invalid historical save: Future fodder content.` **avant la première expectation**. Le scénario exact a pour SHA256 `2f569d4e25cbf31170a130d2eb586e30b4e422a9046cf77221189e61a9267662`.

La fixture actuelle conserve des `foodPolicies` modernes autorisant explicitement les croquettes alors qu’elle est abaissée au schéma 217, où ce contenu est futur. Le diagnostic expose ce fait sans enlever, migrer ni normaliser le champ. Les quatre fichiers historiques de test/scénarios sont identiques à la référence et au candidat, dans les deux copies ; les 2 793 entrées gelées restent exactes avant/après. Ce PASS qualifie le même refus préexistant, il ne rend pas le test historique vert. Après la reprise du nouveau cas, **82 cas PASS sur 83 uniques / 10 fichiers** sont acquis ; un rouge historique inchangé reste explicitement ouvert comme dette de fixture. Aucun groupe entièrement vert revendiqué.

Build Pages/typage `v328-build-pages-2026-10-12T09-14-10.274Z-12668`, rouge en 9,508 s : TS2339 sur `gatherSpot` dans deux objets de fixture dont le type inféré par `fixtureBuilding` était trop étroit. ROOT ajoute uniquement les deux annotations `Structure` dans le nouveau test. Reprise `v328-build-pages-reprise-2026-10-12T09-15-02.057Z-11820`, **PASS en 10,313 s**. Aucun runtime changé pour ces corrections de test. Ces durées ROOT comprennent le contrôle complet, distinctes des sous-durées internes Vitest/Vite.

## Coût CPU complet de l’adoption isolée

Le candidat final est gelé dans `freeze-W1s9xM`, contrôle 4,655 s, avec A conservé depuis `freeze-6EwIQK` et B dans les trois seules feuilles produit prévues. Gels intermédiaires `freeze-RZUaGc` 5,969 s et `freeze-BI1wRQ` 4,482 s conservés ; ils ne remplacent pas le gel final.

Le banc ROOT `adoption-cost/paired-3SQSlH/report.json` **passe en 353,919 s**. Il extrait le véritable sous-type MAIN et ses clauses d’import des deux côtés, cycle complet de chaque owner compris. Il reprend seulement les 66 paquets canoniques de 64 vrais ticks ordinaires déjà acquis en V327 : 8434→8497, sauvegarde/recharge exacte, continuation 8498. Zéro tick producteur répété, zéro ancienne mesure reprise. Le recensement hors ligne constate 64/64 continuations éligibles, dont 48/48 après chauffe ; cela n’est ni un compteur de hit réel paresseux ni une économie mesurée.

Le protocole complet Node est quatre processus A/B/B/A, 16 deltas de chauffe puis 48 `adopt` mesurés chacun ; construction/checkpoints initiaux/recharge séparés, 66 sorties MAIN et RAW, anciens Worlds et paquets comparés. Clonage d’entrée, sérialisation/gardes de sortie, RAW, moteur/Worker, dispatch et rendu restent hors de la durée `adopt`. Les contrôles intercalés perturbent symétriquement mémoire/JIT. Même un gain à ce banc isolé ne prouverait pas FPS natif, CPU global ou GPU.

| Durée ms | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| Moyenne des 48 deltas complets | 8,914 | 8,460 | 8,093 | 8,689 |
| p95 | 17,235 | 14,552 | 15,074 | 14,809 |
| Maximum | 20,522 | 20,421 | 22,477 | 21,740 |
| Construction | 0,403 | 0,624 | 0,305 | 0,248 |
| Checkpoint initial | 89,837 | 107,135 | 74,091 | 72,674 |
| Checkpoint de recharge | 39,139 | 21,144 | 22,398 | 20,956 |

Les 96 deltas par côté donnent **8,801→8,276 ms, −5,97 %** ; les deux moyennes B sont inférieures aux deux A. Ce résultat borne une économie complète de l’adoption MAIN isolée sur cette séquence. Le froid ne gagne pas régulièrement : les deux checkpoints initiaux B sont plus chers que leur A voisin, construction également ; la recharge est dispersée. Le maximum global B 22,477 ms dépasse A 21,740 ms, et le p95 B2 dépasse A2 : aucune amélioration de tous les indicateurs ni absence générale de régression annoncée.

Les 2 793 entrées gelées restent exactes avant/après, entrées réutilisées exactes. Les 66 sorties MAIN puis RAW sont exactes dans chacun des quatre processus, avec Worlds précédents et paquets conservés. Les enfants durent 71,236 / 70,559 / 76,271 / 70,269 s ; l’essentiel du contrôle n’est pas la somme des spans `adopt` chronométrés. Aucun changement de débit moteur ni économie GPU déduit de ce banc.

## Corpus public : rouge conservé et reprise exacte

Premier corpus ROOT `public-controls/public-context-check-YeEXnq/report.json`, **rouge en 15,506 s, 0/63 références terminées**. Au premier checkpoint Aulnes, décisions/graphes et sorties canoniques sont comparés, puis le contrôle d’immutabilité du paquet RAW par hash de `v8.serialize` refuse : `c3bf5b069444d0ddc89ee4a3f972252e5f157dd98a732ffaacc47cc6647781d8`→`312158e5b0ec9013a0b94f7826983b87fce05b8d04e87375394c7beff10f05d5`. Le rapport, runtime et entrées sont conservés, 2 793 entrées gelées exactes avant/après. Aucune mutation produit ou propriété d’immutabilité n’est déduite de ce seul hash différent. Ce rouge motive le diagnostic distinct ci-dessous, avant toute reprise séparée ; aucune source/test/candidate modifié pour ce rouge. La réussite ultérieure ne remplace pas ce premier rapport.

Le diagnostic distinct ROOT **`packet-immutability-diagnostic/diagnostic-r7xNpj/report.json` passe en 27,329 s**. Trois cas B neufs sont séparés : sans adoption, adoption RAW seule, puis séquence RAW/MAIN et contrôles de sortie du premier pilote. Dans les trois, comparaison profonde du paquet exacte, JSON exact et zéro différence du graphe observable : ordre des clés propres, descriptors, prototypes, extensibilité, identités/alias et bytes/identités ArrayBuffer/views conservés. Le runtime et rapport du corpus rouge restent intacts, 2 793 entrées gelées exactes.

Dans le cas **sans adoption**, le hash V8 initial et celui avant comparaison profonde restent `c3bf…`, puis deviennent `269450…` après l’ensemble des observateurs : la représentation V8 peut changer sans `adopt`, alors que le graphe observable est identique. Ce contrôle démontre que ces bytes ne sont pas un oracle canonique d’immutabilité. Il ne prouve pas rétrospectivement que le paquet du premier rouge `312158…` était inchangé. ROOT autorise une reprise distincte du corpus avec comparaison profonde et capture exacte du graphe observable à la place du seul hash V8 ; les différences V8 restent consignées comme diagnostic, aucun invariant de source produit supprimé.

La reprise **`public-controls-reprise/public-context-check-jXNGZ9/report.json` passe en 135,083 s** : **63/63 références, 66 fichiers publics exacts, 252/252 paquets observables exacts (126 RAW / 126 MAIN)**. Chaque référence reçoit checkpoint, un vrai tick ordinaire, delta et sauvegarde/recharge canonique ; ce tick est indépendamment répété sur une copie sauvegardée distincte, soit 63 vrais ticks et 63 copies. Décisions, graphes complets, checkpoints/deltas, Worlds retenus et recharges sont exacts. Le sous-type MAIN et ses imports sont extraits littéralement du produit gelé, cycles des deux owners inclus.

Les paquets doivent conserver valeurs profondes, ordre des clés propres, descriptors, prototypes, extensibilité, identité des objets/ArrayBuffer/views, topologie des alias et bytes de buffers **après adoption et après contrôles de sortie/gardes**. Les fingerprints V8/JSON restent diagnostics ; aucune soustraction de coût ou mutation source destinée à satisfaire l’oracle. Les 2 793 entrées gelées sont exactes avant/après ; anciens rouge, diagnostic, runtimes et inputs préservés sont vérifiés intacts. Aucun coût Node/GAME rééchantillonné pour cette reprise. Un tick par référence qualifie une continuation ordinaire, pas une campagne entière ou des Worlds arbitraires à getters/Proxy.

## GAME : gain natif observé près de ×6

Le GAME ROOT plain **`abba-ANRMJM/report.json` passe en 351,831 s**, A/B/B/A sous le gel `freeze-W1s9xM`. Sources/tests/six pilotes navigateur restent figés et les 2 793 entrées sont exactes avant/après. Aucun timer CPU, profiler, masque d’herbe ni timestamp GPU ; qualité, chambre/carton et poses actuelles conservées. Protocole : recharge du vrai World 8434 par pose, chauffe 3 s, fenêtres pause 4 s et ×6 demandé 12 s. Les ticks confirmés qualifient le débit réel.

| Vue ×6 demandé | RAF/s A→B | Écart | Débit réel A→B | p95 moyen ms A→B | Maximum ms A→B |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proche iso | 83,494→100,685 | +20,59 % | 5,861→5,848× | 31,20→27,35 | 72,9→52,3 |
| Large perspective | 73,867→89,563 | +21,25 % | 6,017→5,961× | 32,05→28,75 | 65,2→59,3 |

Les deux B dépassent les deux A en RAF/s dans chacune des deux vues. Les huit fenêtres ×6 restent dans ±5 % du débit demandé ; les charges mesurées sont voisines mais **pas strictement identiques**, et ce contrôle n’établit aucun vrai ×6 constant. Les pauses sont proches de 240 RAF/s des deux côtés, sans extrapolation au jeu ×6. Gain utile observé dans ces fenêtres natives ; aucun 240 FPS en jeu, gain GPU ou absence générale de régression certifié.

Quatre recharges ordinaires de continuation **8989 / 8975 / 8978 / 8986** sont exactement identiques à leur propre sauvegarde. Erreurs produit vides, Chrome/Vite possédés tous fermés. ROOT a inspecté les captures proche/large des deux B ; elles servent d’assistance visuelle et ne constituent pas un oracle RGBA d’équivalence.

## Décision et livraison

La modification est retenue pour l’économie complète MAIN isolée de **−5,97 %** et le gain GAME proche/large de **+20,59 / +21,25 %** observé dans ces fenêtres à débits voisins, avec sorties et continuations conservées. Le froid ne s’améliore pas régulièrement ; le maximum Node B est défavorable. Aucune absence générale de régression, économie CPU globale/GPU, 240 FPS en jeu ou vrai ×6 constant certifié. L’autorité reste la fermeture MAIN auditée et son témoin exact ; RAW/source gardent leurs contrats historiques. La dette du seul test historique reste explicitement rouge et qualifiée sur A/B, sans groupe entièrement vert annoncé.

La relecture indépendante finale ne signale aucun nouveau défaut matériel. Dernier gel ROOT `v328-final-freeze` **PASS en 3,018 s à 09:46:31 UTC**, 2 793 entrées exactes. Le contrôle documentaire initial `v328-docs` est arrêté avant Python par EACCES en 0,018 s ; la reprise locale autorisée `v328-docs-reprise` **PASS en 10,773 s**.

Le produit **`ff10a939`** est commité et poussé sur `main`, puis publié une seule fois en **`e1cc34a8`**, sur [l’adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://e1cc34a8.elsewhere-cq7.pages.dev/). Package ROOT **PASS2,308s** :515fichiers,119193597octets,63références/66fichiers publics exacts ; sources/laboratoire et `references_UI/` exclus, rapport `tmp/elsewhere-pages/v328-package-oJpw3T/report.json`. Wrangler4.149.0 **PASS13,479s**, deux fichiers envoyés et511déjà présents, puis en-têtes/redirections.

HTTPS ROOT **PASS5,028s** :102réponses200/MIME/octets exactes sur51chemins des deux origines, rapport `tmp/elsewhere-pages/v328-http-R9jAuF/report.json`. Package et publics inchangés. Cette disponibilité ne rejoue pas un navigateur en ligne ni un benchmark ; les66fichiers distants ne sont pas tous téléchargés. Contrôle documentaire de livraison `v328-delivery-docs` **PASS1,092s**. La clôture documentaire est commise/poussée sans second déploiement. Relance planifiée PAUSED, `references_UI/` hors lot. Les performances restent une priorité ouverte, aucun nouveau gameplay engagé.
