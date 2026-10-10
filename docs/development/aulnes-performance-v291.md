# V291 — faits de ressources communs aux validations

V291 est retenue : **97,27→105,47 images RAF/s (+8,43 %)** sur Les Aulnes intégrées, Chrome matériel 1440p/dev, à débit réel **6,015→6,010×**. L'adoption CPU baisse de **11,16 %** dans des fenêtres séparées. Base V290 `49dc62a9`, schéma 218, moteur, rendu, cadence, règles et 63 sauvegardes publiques conservés. Les 240 FPS et la fluidité constante restent à atteindre ; aucun gain GPU mesuré.

## Cause et changement

Un profil MAIN neuf du vrai jeu V290 confirme plusieurs passages sur les17890ressources. Pendant UNE adoption privée, la capture paresseuse fournit désormais présence spatiale, histogramme hydroponique, forme des records, membership des ids et liste ordonnée des ressources concernées par les gardes végétaux. La géométrie existante et ces faits partagent un passage ; aucun cache n'est gardé entre deux adoptions.

Les prédicats plante médicinale/lumière/fléau sont exécutés à leur emplacement historique, sous les horloges et le schéma de la candidate. Une collision d'identité commerciale impose le parcours complet historique pour conserver courts-circuits et premières exceptions. Les formes atypiques, trous et World différents retrouvent aussi le parcours historique. La forme hydro reste vérifiée à son emplacement ; les domaines d'identités hydro/orbital restent distincts. Quantités, capacités, propriétaires, réservations, doublons et registre global demeurent contrôlés. Le reader n'est pas une capacité publique d'immuabilité ; seuls les consommateurs privés construits dans V290 fournissent son domaine stable. La voie RAW conserve aussi l'ordre de lecture des références de collections avant l'itération de leurs propriétaires.

## Profil causal

`tmp/performance-v291/native/main-avIsnl/report.json`, gel `6D6E9791`, PASS61,661s ; reprise exacte9105, sources/publics exacts, erreurs vides, CDP/navigateur/port5324 fermés. Attribution offline `analysis/report-UU8qDq/report.json`, PASS0,369s :9671échantillons,1183nœuds,175sources compilées vérifiées,15,188s avec bords ; aucun delta négatif ni référence manquante. RAW `main.cpuprofile` SHA9DBCFFE1. Les poids propres partitionnent l'échantillon ; les inclusifs se recouvrent. Decoder4552ms inclusifs, capture spatiale415ms propres, garde ressources451ms inclusifs, capture ids159ms et records hydro76ms. Aucun pourcentage de profil antérieur utilisé comme budget actuel. La fenêtre profilée ne mesure pas un gain FPS ni du GPU.

Le [protocole DevTools](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json) définit les deltas en microsecondes ; le lecteur conserve les bords et valeurs brutes, vérifie arbre et sources, sans normaliser les poids. Un poids propre du handler ne prouve pas seul une désérialisation : la mesure séparée suivante examine précisément `event.data`.

## Coût natif

Gel `E2568ECF` sous `tmp/performance-v291/cost-native/freeze-3O36eF` : six feuilles servies à leurs identités canoniques, baseV290 exacte, encodeur et client source inchangés. Quatre cohortes Chrome matériel AMD/WebGPU successives ABBA,2560×1440/DPR1/dev, source8434, caméra129/122/zoom1, chauffe3s/mesure14s, vrai ×6. Timers uniquement dans les contextes coût : une lecture unique d'event.data, puis appel réel d'adoption ; inverses compilés exacts. Seules des copies de scalaires/timings sortent, aucune référence native. Les deux spans sont disjoints, ont leurs propres effectifs et n'incluent ni tout le handler, ni livraison/rendu/GPU. Surcoût des timers non soustrait.

`cost-native/abba-khB83j/report.json` SHA `B301DA63`, PASS 211,599 s : adoption 8,826→7,841 ms (−11,16 %), p95 12,3→10,6 ms, pics 17,8→16,2 ms ; 998/995 appels. Coût cumulé 314,10→278,07 ms/s. Les moyennes A1/B1/B2/A2 sont 8,802/7,889/7,794/8,850 ms. Lecture du message 1,951→1,976 ms, p95 2,6 ms identique : aucun gain de désérialisation attribué. Somme des deux portions 383,54→348,13 ms/s (−9,23 %), à cadence comparable. Reprises exactes 9057/9056/9055/9054. Cette mesure inclut toute la préparation des faits dans le vrai client privé, mais ne constitue pas un temps CPU total.

## Jeu sans instrumentation

Même gel et mêmes conditions, quatre nouvelles cohortes originales, sans timer de getter/adoption : `cost-native/abba-WvAPlC/report.json`, SHA `E9A3990A`, PASS 209,764 s. Aucun profil CPU pendant ces fenêtres.

| Cohorte | RAF/s | Vitesse réelle | p95 intervalles | Pire intervalle | Reprise exacte |
|---|---:|---:|---:|---:|---:|
| V290 A1 |99,05|6,01×|23,3 ms|42,8 ms|9055|
| V291 B1 |105,25|6,01×|21,1 ms|51,0 ms|9055|
| V291 B2 |105,69|6,01×|21,7 ms|45,6 ms|9056|
| V290 A2 |95,49|6,02×|24,4 ms|41,3 ms|9057|

Les deux B dépassent les deux A. Agrégation par durée : 97,2686→105,4665 RAF/s (+8,43 %), débit 6,0146→6,0100× ; moyenne des p95 23,85→21,40 ms. Les pires intervalles B sont défavorables : les pointes ne sont pas résolues. Les huit cohortes coût/jeu gardent sources/publics exacts, erreurs vides et sauvegardes/recharges exactes ; navigateurs et port 5325 fermés. Ce banc headless ne certifie pas l'affichage d'un écran 240 Hz, toutes les vues ou toutes les parties. Ne pas additionner ce gain aux pourcentages des lots précédents. L'optimisation s'applique au chemin commun du jeu, son bénéfice dépend des ressources et systèmes présents.

## Validation

76 cas dans 11 fichiers, dont 12 nouveaux, PASS 8,338 s ; typage produit PASS 6,120 s après annotation effacée de version dans une fixture. Typage du profil PASS 1,235 s et du banc coût PASS 1,225 s après annotations effacées d'inférence TypeScript. Les rouges initiaux 1,303/5,951/1,177 s restent dans les journaux. Une réorganisation des lectures RAW a été corrigée lors de la revue statique avant ces contrôles ; aucune correction produit après le gel. Revue indépendante des replis/ordre et de l'agrégation sous `tmp/performance-v291/analysis`.

Les 63 références et 66 fichiers publics passent : `public-context-check-k8g7ZP/report.json`, PASS 61,741 s. Une classe MAIN extraite littéralement est comparée au Decoder RAW sur checkpoints, deltas, anciennes vues, graphes et un vrai tick après sérialisation ; les roundtrips de fichiers sont comparés dans leur forme canonique (les propriétés undefined ne sont pas des octets JSON). Sources, catalogue et payloads restent exacts. Cette fixture vérifie les requêtes, la propriété privée réelle étant exercée séparément dans Chrome. Build Vite PASS 1,574 s après le typage produit. Pas de nouvelle campagne naturelle longue, d'essai hard-stop ou de contrôle de présentation : cadence, horloge, mouvement, encodeur et client de transport sont inchangés ; les frontières du décodeur, les 63 reprises et les huit parcours UI couvrent les contrats touchés.

## Suite conditionnelle

L'accès réel aux messages coûte près de2ms par événement sur ce banc. Le checkpoint contient déjà2452constructions et active leur transport différentiel au seuil1000. Une baisse de ce seuil ne cible donc pas Les Aulnes. Les champs encore complets incluent home4800cellules, roofing2723, thermique34régions/2723cellules,14zones agricoles/1042cellules et310réserves. Leur taille ne prouve pas leur coût individuel. La note privée `next-message-layout.md` propose d'étudier une géométrie territoriale retenue, avec toutes températures/absences/modifications conservées ; coût Source et reconstruction inclus avant décision. Aucun code suivant ni noyau WASM dominant acquis.
