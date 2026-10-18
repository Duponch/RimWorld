# Simulation et admission de présentation — V425, lot partiel qualifié par reprises

18 octobre 2026. **Lot partiel qualifié par reprises et publié, complément de survol inclus.** Suite de l’[audit architectural V424](performance-architecture-audit-v424.md), sur une seule colonie de référence. Schéma 263 inchangé ; produit ecdfe9a3/déploiementd894d842. Les183,28images/s concernent uniquement une courte fenêtre caméra fixe : elles ne prouvent pas le confort pendant les mouvements. Cette tranche ne crée aucune mécanique et ne démontre ni 200 FPS ni une refonte complète de la présentation.

## Résultat actuellement établi

Le vrai départ trois colons250² poursuit exactement les mêmes 24ticks avec le chemin froid et la session spatiale de flore : sauvegarde de campagne entière identique, RNG, IDs, propriétaires et compteurs compris. Dans ce banc Node, les deux passages froids coûtent45,735 et46,512ms par pas en moyenne ; les deux passages spatiaux22,310 et20,536ms. Cinq captures froides sont sollicitées par passage froid. C’est un résultat sur le coût de simulation de cette continuation, pas une mesure de cadence d’image.

La comparaison Chrome1440p du premier lot est acquise sur16fenêtres et quatre recharges complètes exactes. Son résultat reste mixte : CPU image moyen plus bas, mais Decoder×1 plus cher sur les deux parties, cadence d’image du départ trois colons×6 moins bonne et débit des Aulnes×3/×6 inférieur. Ces limites restent conservées ; le confort global n’est pas déclaré rétabli.

La garde finale est intégrée, revue et typée ; la reprise Aulnes ciblée est acquise. Sur le départ trois colons, les quatre fenêtres finales LOWMEM sont acquises : à×1,98,69→183,28images/s et Decoder16,14→14,63ms face à la référence ; à×6,68,31→41,10images/s malgré72→174ticks observés. Le parcours LOWMEM entier reste rouge après l’export414 ; sa reprise séparée recharge et réexporte exactement ce checkpoint, sans rejouer les fenêtres. Les résultats sont qualifiés par reprises, sans gain isolé attribué à la seule garde ni nouvelle mesure native finale des Aulnes.

## Séparer les responsabilités sans changer les sauvegardes

Le Decoder du client MAIN est extrait de `src/main.ts` dans `src/bridge/presentation-decoder.ts`. Ses contextes de validation et leurs propriétaires restent privés à cette composition fixe, avec consommateurs de présentation en lecture seule. Le `SnapshotDecoder` public conserve ses admissions complètes pour les consommateurs mutables ; import RAW, sauvegardes et recharges gardent leurs frontières strictes. Il ne devient pas possible d’importer une projection visuelle comme sauvegarde autoritaire.

Cette séparation permet de réutiliser des faits déjà admis dans une chaîne de snapshots vérifiée. Elle ne constitue pas encore un format visuel compact : le protocole actuel, ses champs riches, ses contrôles et ses parcours résiduels restent présents. Cette tranche n’ajoute ni régulation des publications en vol ni fusion ou abandon de deltas.

### Témoin `resource-base`

Le vrai Decoder produit un témoin distinct après sa branche sparse vérifiée. Les tuples de croissance reconstruisent l’identité, la position, le substrat et les champs de candidature depuis le prédécesseur admis ; les upserts complets sont tous inscrits dans `updated`, y compris au même tick. Les nouvelles valeurs de croissance et leurs horloges restent contrôlées.

Le propriétaire de ressources et Marsh peuvent alors réutiliser leurs faits de base et ne relire que les upserts complets pertinents. Une croissance seule peut donc modifier la présentation sans rescanner les substrats de toutes les plantes. La liste de candidats particuliers conserve notamment les horloges d’arbre suspendues. Un drapeau fourni par le paquet ne peut pas créer le témoin.

Le prédécesseur, la population, l’ordre et les métadonnées doivent conserver leurs preuves existantes ; une tuile modifiée, un remappage, un checkpoint ou une preuve insuffisante rétablit le parcours complet. Supports, structures, travaux et autres contrôles ne sont pas supprimés. Les propriétaires pending sont confirmés après l’adoption entière seulement ; refus tardif, exception, stale et reprise ne publient aucune autorité anticipée. Les lecteurs publics ignorent cette capacité interne.

### Durée de vie initiale des plantes

`initialPlantLifespanCore256` remplace la reconstruction et la recherche dans toutes les définitions à chaque appel par une table privée de définitions. Le calcul float32 et sa troncature restent identiques ; en cas de définitions partageant une espèce, la première garde la priorité historique. Les identités inconnues restent absentes sans coercition. Cette table ne dépend d’aucun World, terrain ou état de croissance et ne mémorise aucune validation de sauvegarde.

## Session spatiale de flore

Le lecteur actual dispose désormais d’une session synchrone éphémère, créée uniquement lorsqu’une vraie tentative de renouvellement atteint le spawner. Les propriétaires réels sont indexés une fois ; les cellules physiques et les composantes12×12 sont calculées à la demande. Les comptes d’une région utilisent ses cellules et leur halo de contact au lieu d’enregistrer les neuf contacts de chaque plante de toute la carte.

Le noyau de choix reste partagé avec la génération et l’oracle froid. Les cellules de chaque composante restent triées avant les sommes float32, les voisins sont parcourus bas/droite/haut/gauche, et le BFS conserve son ordre d’insertion et ses tests de rectangle. Les contacts diagonaux gardent leurs conditions de passage. L’identité locale d’une région utilise sa première cellule ; cette identité ne participe ni aux poids ni aux tirages.

La session capture les ressources, plantes de pot, structures, frames, piles au sol et geysers réels. Elle est jetée avant la prochaine mutation de World : aucun index de terrain ou de propriétaires ne survit au tick et aucun journal incomplet de mutations n’est introduit. Les plantes planifiées dans la même avance sont enregistrées dans la session ; leurs vrais IDs, ressources, RNG et compteurs sont engagés ensemble à la frontière existante.

L’activation exige l’identité exacte du lecteur actual et de ses méthodes enregistrées. La factory générique, une copie du lecteur ou une méthode remplacée conservent le chemin froid. La capture publique complète, sa validation des queues malformées et la génération restent strictes. Le chemin actual s’appuie sur un World autoritaire déjà admis et valide les cellules effectivement consultées ; il ne prétend pas effectuer une nouvelle admission globale de World à chaque tentative.

Le coût n’est pas entièrement local : l’index des propriétaires reste reconstruit globalement à chaque session. Les requêtes de régions chargent les composantes atteintes et leur frange adjacente. La recherche de rive conserve son BFS d’origine et peut encore parcourir une grande étendue d’eau. Aucun changement de cadence, de règle, d’ordre des tirages ou de schéma persistant n’est recherché par cette optimisation.

Le complément de clôture est intégré et revu en lecture seule : une garde locale reconnaît certains refus physiques déjà définis par le spawner avant de créer la session. Pour ces refus certains, elle évite la construction de l’index global des ressources/propriétaires, de coût O(R), sans réutiliser un cache entre mutations. Cette garde reste à distinguer de la session elle-même et de son oracle froid ; règles et tirages sont conservés. Le typage `v425-guard-typecheck` du18octobre16:48:16UTC passe en15,064s. Aucun gain isolé de durée, de débit ou de FPS n’est établi pour ce complément. Les mesures finales ci-dessous portent sur la candidate avec garde ; elles ne séparent pas son effet de celui des autres changements ni des différences de préparation et de charge hôte.

## Espèces animales actives à la présentation

`wildlifePresentationGroups` regroupe les animaux vivants et les corps physiques une fois par nouveau World reçu. Il conserve l’ordre des sources à l’intérieur de chaque espèce, les porteurs de sauvetage et les transferts de corps. Une espèce présente uniquement par un cadavre reste active.

`WildlifeLayer` prépare et présente les acteurs des espèces actives. Une espèce devenue vide libère ses comptes graphiques, sa sélection et ses flammes ; son retour réutilise les géométries et matériaux résidents. Les horloges scalaires des graphes restent entretenues. La préparation de compilation expose toujours les ensembles résidents nécessaires, puis restaure visibilité et comptes sans écraser un snapshot plus récent. Cette tranche ne remplace pas les acteurs par des scènes individuelles et ne change pas leur modèle ni leur palette.

## Contrôles ciblés acquis par reprises

Les sorties courantes sont sous `tmp/validation-runs/`, avec statuts et durées dans `ledger.jsonl`. ROOT pilote typage, contrôles ciblés, banc CPU et navigateur ; les agents se limitent aux tâches indépendantes de code et de revue. Le chevauchement ponctuel d’une fin de contrôle et d’un build QA est nommé ci-dessous ; les durées de tests et de compilation ne constituent jamais des mesures de performance produit.

La première passe du nouveau Decoder conserve13rouges/15PASS sur quatre fichiers, puis la reprise conserve encore un rouge/11PASS sur deux fichiers. Les réparations distinguent l’autorité RAW de `campaignPresentation` et corrigent les préconditions des fixtures, sans retirer les assertions de valeurs, de refus ou de reprise. Le premier typage est également rouge après un lancement pendant l’édition d’une accolade ; le typage suivant passe en18,244s.

Le groupe ciblé suivant donne89PASS/4rouges sur15fichiers en82,640s. Les quatre rouges concernent deux oracles historiques de projection/ordre des clés racines, une ancienne fixture de cadavres devenue incompatible avec le catalogue courant et un nouveau contrôle de visibilité des ensembles vides. La reprise des trois fichiers concernés passe17cas en29,072s. Les oracles de projection conservent toutes les valeurs et l’ordre imbriqué ; seule la comparaison de l’ordre des clés racines est normalisée. La fixture de corps utilise les vrais dossiers médicaux animaux et borne propriétaires et IDs à la population actuelle. Ce bilan est acquis par reprises ; aucune suite complète verte n’est annoncée.

Les nouveaux cas couvrent le vrai Encoder/Decoder, croissance seule, upserts au même tick, refus tardif et retry, remplacement et ordre des ressources, champs ou horloges invalides et faux drapeaux de paquet. Le lookup de durée de vie est comparé à la formule historique pour toutes les espèces, inconnus et doublons compris. Les six cas spatiaux couvrent composantes/BFS/float32/contacts, lecture bornée d’une requête250², classifications physiques, choix et PRNG dans quatre biomes, exclusion des lecteurs tiers et continuation après mutations/reconstruction. Les contrôles animaux couvrent présence par corps, extinction, sélection, flammes et réactivation des buffers.

Le bundle QA privé passe en3,251s. Le typage complet final passe ensuite en23,068s et le build Pages en36,103s ; ce dernier ne constitue pas une publication. Le paquet privé avec sonde de présentation passe en2,851s, puis la variante instrumentée en3,056s. Les recharges et mesures natives sont acquises dans le périmètre ci-dessous ; les résultats de présentation V423 ne sont pas réattribués à V425.

Le contrôle de frontière urgente donne neuf PASS/un rouge sur deux fichiers en15,119s : sept cas de `urgent-threats` et deux des trois cas client passent. Le cas campagne sans carte utilisait encore un mock V407 retournant un résultat `applied` sans `summary`, alors que le vrai Decoder et `SimulationClient` publient le résumé admis depuis V408 `f7ffb521`. Test et client étaient identiques à leurs blobs HEAD avant diagnostic. Seul le mock est complété avec `summary:p.summary` ; assertion tick20, refus, ordre de livraison et corrélation ACK sont conservés. La reprise `v425-urgent-reprise-2026-10-18T16-40-22.607Z-19120` passe les dix cas des deux fichiers en20,512s.

Le contrôle ciblé Nature avec la garde conserve12PASS,27rouges historiques et un cas ignoré en55,961s. Un build QA de4,182s chevauche sa fin ; ces durées murales ne sont pas utilisées comme banc. Deux fichiers de fixtures sont réparés par les agents : attentes alignées sur `campaignPresentation` et horloge de détérioration cohérente avec le tick préparé. Aucun code produit ni assertion métier n’est changé pour ces réparations.

La reprise donne26PASS/un timeout en82,048s. Le cas Aulnes prend55,369s pour un budget30s, sans autre assertion en échec rapportée. ROOT reprend seulement ce cas avec un budget90s explicite dans le test : PASS64,138s, assertions inchangées. Les cas de fixtures concernés sont donc acquis par reprises ; le cas ignoré et tous les échecs précédents restent nommés, sans déclarer la suite complète verte.

## Banc Node du vrai pas de simulation

Rapport : `tmp/performance-refactor-v425/simulation-bench.json`, script associé dans le même dossier. Node24.11.1, Windows, cartes250² ; chaque passage recharge l’original par `deserializeCampaign`, exige `validateWorld` avant et après, puis exécute24vrais `stepWorld(world,1)`. Le chronomètre couvre chaque pas entier ; admissions, comparaison et sérialisation finales restent hors chrono.

Ordre froid→spatial→spatial→froid, quatre Worlds indépendants par input. Le témoin froid remplace temporairement `actualWildPlantReader256.capture` par un wrapper transparent : l’identité de méthode différente désactive la session, et le même entrypoint suit l’oracle froid. La méthode originale est restaurée dans `finally`. Tous les autres correctifs V425 restent identiques entre modes ; ce banc isole la session de flore et ne mesure pas le gain total V423→V425.

| Départ trois colons, ticks35→59 | Captures froides | Moyenne, ms | Médiane, ms | p95, ms | Maximum, ms |
|---|---:|---:|---:|---:|---:|
| Froid1 |5|45,735|19,578|128,850|189,440|
| Spatial1 |0|22,310|16,413|48,241|49,673|
| Spatial2 |0|20,536|15,504|43,658|59,705|
| Froid2 |5|46,512|16,323|174,498|281,800|

Input original SHA256 `748409f4b5ceba787fd59db233c2580433895cd530a077ac3fa9a1d885392df0`. Les quatre sauvegardes finales entières ont le même SHA256 `968c20cb317da50e1ac10480f8266f09f9afe98b7d3f2190b76339f35a8e5636`, sans écart de continuation. Le rapport porte `PASS_EXACT_CONTINUATIONS`.

Sur Les Aulnes10733→10757, les quatre modes sollicitent **zéro capture froide**. Les moyennes62,913/45,140/41,267/45,880ms et les pointes restent des observations conservées ; leur variation ne peut pas être attribuée à la session de flore dans cette séquence. L’input SHA256 `237c03dfce1738add9feb5e4a57724195a70b37f609ec7c2f0b0680587b8d98c` mène dans les quatre cas à la sauvegarde entière `d2c1ef047c50af7ccd3d1f3370a1ee98b92746166bac24f8c8622a6698ee5c12`.

Le premier lancement du script est rouge5,223s sur la résolution Node d’un import sans extension du codec de stockage. La reprise passe40,244s avec le chargement outillé, sans modifier les règles du produit. Les24mesures par passage incluent les premiers pas ; chauffe/JIT, GC et charge extérieure ne sont pas neutralisés. Cette courte séquence ne prouve ni endurance, débit général×6, coût total Worker, encodage, transit, adoption MAIN, rendu ou GPU.

Un complément Aulnes10840→10880 passe en28,737s, avec état final entier exact et quatre recharges complètes. Les deux moyennes froides sont34,888/36,288ms, les deux spatiales33,888/32,608ms. Les quatre modes sollicitent zéro capture froide et zéro session : la session de flore ne peut donc pas expliquer les coûts de cette fenêtre précise de ticks, et l’écart observé ne lui est pas attribué. Ce résultat ne disculpe pas toutes les autres règles écologiques ou toutes les autres continuations.

## Comparaison native du premier lot

Chrome155 natif headless/WebGPU AMD-RDNA1,2560×1440/DPR1 ; mêmes scènes initiales réelles250², caméra orthographique, textures/herbe/pièces/diorama/occlusion actifs, réglages équilibrés, ombres60Hz/2048, son et musique coupés. Les quatre scénarios complets sont acquis : référence `native-baseline-gc05`, deux cas en268,456s ; candidate départ trois colons `native-candidate-gc04`,166,636s ; candidate Aulnes `native-candidate-aulnes06`,126,843s. Chaque cas contient les quatre fenêtres de cinq secondes pause/×1/×3/×6, un export complet et sa recharge exacte.

Le rapport `tmp/performance-refactor-v425/native-comparison.json` porte `COMPLETE_OFFLINE_COMPARISON_NO_COMFORT_THRESHOLD` ; son analyse passe en0,975s. Il vérifie les quatre preuves `complete`, leurs erreurs vides, le matériel natif, les16fenêtres, les statistiques brutes, les scènes statiques, caméra, réglages et surface identiques par mode. Les40ACK speed et huit ACK de checkpoint sont corrélés par navigation/worker/id et publication. Les quatre exports finaux sont identiques à leur propre recharge, et chaque export initial à son original. Les1731sources du gel sont vérifiées exactes à la clôture de ce premier lot ; son manifeste est conservé dans `source-freeze-first-lot.json`, SHA256 `944f80019b1b50350fa092b30796ee59a1de1153cdd674cdbc07f23d379d1887`. Le gel de la candidate avec garde est distinct.

Les FPS ci-dessous sont `frameCount/(elapsedMs/1000)`. Le rapport recalcule également le RAF `1000/moyenne(intervalles)` et le débit `ticks/(6×elapsedMs/1000)` ; ces formules ne sont pas substituées l’une à l’autre. Chaque cellule donne référence→candidate ; la variation entre parenthèses concerne les FPS.

| Partie / vitesse | Images/s | CPU image moyen, ms | Decoder moyen, ms | Intervalle p99, ms | Intervalles>50ms |
|---|---:|---:|---:|---:|---:|
| Trois colons pause |222,47→239,68 (+7,74%)|3,50→2,85|absent|8,4→4,3|0→0|
| Trois colons×1 |98,69→125,26 (+26,92%)|7,30→5,19|16,14→18,58|50,0→45,8|4→5|
| Trois colons×3 |53,16→56,01 (+5,36%)|10,61→6,32|19,45→18,94|79,1→79,1|20→16|
| Trois colons×6 |68,31→50,75 (−25,70%)|9,09→9,06|133,33→61,10|166,7→170,9|17→37|
| Aulnes pause |197,32→238,00 (+20,62%)|3,92→2,42|absent|8,4→4,4|0→0|
| Aulnes×1 |80,63→118,36 (+46,79%)|6,67→4,02|30,35→31,27|62,5→50,0|8→5|
| Aulnes×3 |55,19→76,77 (+39,10%)|6,40→4,81|24,99→30,18|58,3→66,5|6→20|
| Aulnes×6 |96,52→130,49 (+35,19%)|6,05→4,32|27,20→35,26|58,3→58,4|7→12|

| Partie / vitesse | Ticks observés | Adoptions | Débit en vitesse× |
|---|---:|---:|---:|
| Trois colons pause |0→0|0→0|0→0|
| Trois colons×1 |30→30|30→30|0,989→0,997|
| Trois colons×3 |88→91|54→87|2,909→2,991|
| Trois colons×6 |72→165|9→27|2,356→5,473|
| Aulnes pause |0→0|0→0|0→0|
| Aulnes×1 |30→30|30→30|0,993→1,000|
| Aulnes×3 |95→78|85→56|3,132→2,599|
| Aulnes×6 |130→75|27→15|4,330→2,498|

**Le débit observé des Aulnes baisse de17,02% à×3 et42,31% à×6.** L’augmentation des images/s à ces vitesses ne satisfait donc pas à elle seule l’objectif joueur : la simulation avance moins vite, les Decoder moyens sont plus chers et les intervalles>50ms plus nombreux. À×1, le Decoder augmente aussi sur les deux parties :16,14→18,58ms (+15,14%) sur le départ et30,35→31,27ms (+3,04%) sur Les Aulnes. Aucun gain global d’adoption n’est établi par ces fenêtres.

Sur le départ×6, le débit augmente et reste sous la cible6×, tandis que les images/s baissent de25,70% et les pointes restent mauvaises. Les165ticks/27adoptions candidats et72ticks/neuf adoptions de référence représentent des charges et des histoires effectivement différentes. Ce résultat ne devient ni une amélioration de confort générale ni un débit×6 acquis. Les fenêtres en pause ont zéro tick/adoption et aucun intervalle>50ms ; elles ne reproduisent pas à elles seules tout signalement de ralentissement en pause.

Il s’agit d’une fenêtre par version/input/vitesse, et non d’une campagne native ABBA. Les fenêtres successives avancent de vraies histoires ; les phases de dégel préparatoires peuvent également diverger. Le rapport conserve ticks, populations et météo au début et à la fin, sans forcer des états identiques après des débits différents. Les GC Node explicites sont hors chrono ; chauffe/JIT, GC du navigateur, thermique et charge extérieure ne sont pas neutralisés. Decoder, réception et CPU image se recouvrent et ne s’additionnent pas. Le pas Worker déclaré exclut encodage et transit ; aucun GPU total, délai entrée→image, endurance ou cadence d’affichage physique n’est démontré. Les effets des correctifs combinés de cette candidate ne sont pas isolés par ces observations.

## Fenêtres natives finales avec garde, recharge acquise séparément

`native-candidate-lowmem10` conserve la scène, la caméra, la présentation, la surface et le matériel de la référence trois colons `native-baseline-gc05`. Les quatre fenêtres de5000ms restent inchangées. Le rapport `tmp/performance-refactor-v425/native-acquired-final.json`, analysé en0,722s le18octobre17:07:53UTC, vérifie les statistiques brutes et leurs formules, les contextes statiques, le matériel, les SHA des inputs et les1731sources gelées exactes. Le manifeste courant `source-freeze.json` du18octobre16:44:25.091UTC porte le SHA256 `74aa8a38030c5f017d8e3c5d4038b2ff35df7e1ffd6f732dafe5cbf2ef9cdb4c`.

Le statut de ce rapport reste littéralement `ACQUIRED_WINDOWS_ONLY_NATIVE_RUN_INCOMPLETE_RECOVERY_PENDING` : il décrit le parcours initial incomplet, sans transformer son rouge en PASS. La reprise exacte ultérieure est citée séparément ci-dessous. La collecte finale du transport ayant échoué dans le wrapper LOWMEM, aucun bilan complet de ses ACK n’est emprunté à la référence. Les FPS suivent toujours `frameCount/(elapsedMs/1000)`, distinct du RAF calculé à partir des intervalles.

| Trois colons / vitesse | Images/s référence→finale | CPU image moyen, ms | Decoder moyen, ms | Intervalle p99, ms | Intervalles>50ms |
|---|---:|---:|---:|---:|---:|
| Pause |222,47→240,19 (+7,96%)|3,50→1,96|absent|8,4→4,3|0→0|
| ×1 |98,69→183,28 (+85,71%)|7,30→3,41|16,14→14,63|50,0→29,2|4→1|
| ×3 |53,16→122,96 (+131,30%)|10,61→3,68|19,45→14,35|79,1→41,5|20→1|
| ×6 |68,31→41,10 (−39,83%)|9,09→6,71|133,33→38,27|166,7→150,0|17→41|

| Trois colons / vitesse | Ticks observés | Adoptions | Débit en vitesse× |
|---|---:|---:|---:|
| Pause |0→0|0→0|0→0|
| ×1 |30→30|30→30|0,989→0,999|
| ×3 |88→90|54→90|2,909→2,999|
| ×6 |72→174|9→55|2,356→5,703|

À×1, le CPU image moyen baisse de53,29% et le Decoder de9,38% dans cette fenêtre ; à×3, le Decoder baisse de26,20%. À×6, davantage de simulation et d’adoptions sont effectuées, mais la cadence d’image baisse de39,83% et les intervalles>50ms passent de17à41. Le débit observé reste inférieur à6×. Ce relevé ne rétablit donc pas le confort général ni un débit×6 acquis. Il ne remplace pas les résultats mixtes des Aulnes du premier lot, dont le débit×3/×6 reste moins bon et sans mesure native finale correspondante.

Les limites des courtes fenêtres du premier lot s’appliquent également : une observation par mode, histoires successives et dégels différents, charge hôte/JIT/GC non neutralisés, mesures CPU qui se recouvrent, aucune mesure de coût GPU total ni d’endurance. Le témoin est la référence native conservée ; il ne s’agit pas d’un A/B isolant la garde végétale.

### Incidents hôte et réparation du pilote

La première candidate atteint sa limite après228,430s avant une série de fenêtres acquise. La référence échoue ensuite au chargement en108,992s en headless puis107,842s en fenêtre visible, avec `createBuffer` et notamment `Instance dropped in popErrorScope`. L’utilisateur confirme ensuite que C: était plein. Un essai suivant confirme le chargement ; il conserve toutefois un nouvel échec en123,524s : `DataCloneError: Data cannot be cloned, out of memory`, dans la restauration géographique effectuée par le pilote lors de l’export final, hors fenêtres. Les rapports `native-candidate01`, `native-baseline01`, `native-baseline-headful02` et `native-baseline-space03` restent conservés.

Le pilote libère alors les gros Worlds/RAW et chaînes canoniques de chaque portée de préparation ; des GC Node explicites sont exécutés avant et après ces portées, hors des fenêtres mesurées. Les attentes d’adoption utilisent des faits scalaires et la comparaison entière reste effectuée une fois hors polling. Les admissions, export/recharge canonique, matériels et durées des fenêtres ne sont pas détendus. Les quatre scénarios GC passent ensuite et leurs recharges sont exactes. Il s’agit d’une réparation de charge mémoire du pilote, sans nouveau réglage de simulation ou de qualité produit ; elle ne démontre pas que l’incident de disque explique à lui seul tous les premiers échecs GPU.

Après intégration de la garde, `native-candidate-guard07` est rouge107,156s avant les fenêtres : échec d’allocation WebGPU de61368octets et `popErrorScope`. Les observations hôte contemporaines conservent environ250Mo libres sur C: et2,8Go de mémoire virtuelle libre. Aucune cause exclusive n’est attribuée au disque ou à la garde, et aucun FPS, temps de Decoder ou débit final n’est tiré de cet essai. Les preuves de la première candidate restent acquises dans leur propre périmètre.

Le diagnostic privé08 échoue en9,314s sur une attente de polling de2,5s, avant l’initialisation GPU. Seule cette attente du pilote passe à15s ; le diagnostic09 confirme ensuite le chargement en37,553s sans erreur, sans World Node attendu matérialisé pendant l’import graphique. Il observe2557buffers pour105,6MB et175textures pour228,65MB estimés ; sept formats de texture restent inconnus. Ces allocations observées et estimations ne mesurent ni mémoire GPU totale ni FPS, et ne prouvent pas une cause exclusive des échecs précédents.

La copie privée LOWMEM conserve les mêmes imports UI, validations strictes, comparaisons entières, quatre fenêtres de5000ms et critères de recharge. Le World attendu peut être fourni par une factory asynchrone appelée seulement après disparition du menu et du chargement, puis pause confirmée. Le pilote prévalide d’abord l’input et sa chaîne canonique dans une portée fermée, libère ce World et appelle le GC avant l’import ; il matérialise à nouveau le même oracle après la préparation graphique. Après l’export final, il conserve seulement chemin, SHA et chaîne canonique, libère le World et appelle le GC avant la recharge paresseuse. Aucun gros World attendu Node n’est ainsi volontairement retenu pendant l’initialisation GPU ; les comparaisons complètes avant et après restent requises.

Lancé le18octobre16:59:29UTC, `native-candidate-lowmem10` reste rouge en226,239s après acquisition des quatre fenêtres. L’export `after.json` au tick414 est présent et a passé désérialisation stricte, validation et sérialisation canonique Node ; la comparaison entière avec `serializedWorld(__lisiere.world)` se bloque ensuite dans le pilote. Les dernières phases104–106 encadrent la préparation de la chaîne attendue puis l’appel de lecture du World navigateur. La preuve initiale n’est pas `complete`, même si elle ne relève pas d’autre erreur de fenêtre.

La reprise `v425-native-recovery414-2026-10-18T17-06-06.143Z-20708` passe séparément en55,669s. Sa preuve `native-recovery11/recovery-native-recover-ex-04df0-ed-windows-no-window-replay/proof.json` est complète : le même export414 est prévalidé strictement, rechargé par le vrai import, comparé entièrement, puis réexporté comme `recovered`. Input et export récupéré ont exactement le même SHA256 `8357b57f213cb52d667c18745127c4e104ffb7235bfb560c4edcf970808803ae`. Aucune fenêtre n’est rejouée ; cette reprise acquiert la conservation et la recharge du checkpoint sans rendre vert le parcours LOWMEM initial.

L’utilisateur libère ensuite C:. Le relevé ROOT du18octobre17:10UTC observe19 474 644 992octets libres sur C: (environ19,5GB) et11,9GB sur E:. Ce nettoyage intervient après les fenêtres LOWMEM et la reprise414. Les mesures caméra ajoutées plus bas lui sont postérieures ; aucune comparaison n’isole un gain attribuable à ce nettoyage.

## Présentation temporelle acquise par reprises

Le premier `npm run test:presentation` est rouge95,956s après le minage : sept des22changements de vitesse dépassent le budget100ms, avec des retards d’environ101–153ms. Il conserve zéro saut, excès de déplacement, occupation solide ou autre erreur signalée ; les intervalles d’image du minage ont p99=24,8ms et maximum45,7ms. Le rouge porte donc sur la réponse aux contrôles et ne doit pas être effacé par la seule cadence d’image.

La reprise minage avec trace Worker et sonde compilées passe en89,695s, assertions existantes et budget inchangés, sans modification de règle produit. Elle conserve zéro saut, excès ou occupation solide ; p99 d’image12,5ms, maximum29,2ms. La cause des sept retards du premier passage n’est pas isolée : cette reprise instrumentée acquise ne prouve pas une correction de leur cause.

L’abattage `v425-presentation-chop-2026-10-18T16-36-56.412Z-36692` passe en87,865s :9138images, p99 d’intervalle16,6ms et maximum45,8ms, zéro saut, excès de déplacement, occupation solide ou autre anomalie signalée. Les contrôles des deux phases sont donc acquis par reprises, sans annoncer un wrapper temporel entier vert ni effacer le rouge initial.

Le premier lot est acquis par reprises : continuations Node exactes, contrôles ciblés et temporels acquis, quatre parcours natifs/recharges du premier lot, quatre fenêtres finales avec garde et reprise entière exacte du checkpoint414. Les rouges initiaux restent conservés, notamment le parcours LOWMEM incomplet. Ses1731sources sont gelées et son commit local est `b82c95c1a16f79e56c57da14e7d55d7db5d0697f`. Le signalement caméra suspend la publication pendant le complément ci-dessous. Les limites de débit des Aulnes, la cadence finale×6 du départ et le budget de5ms par image restent ouverts.

## Complément caméra : mouvements rapides, vue large et inclinée

Le signalement humain concerne `localhost:5173`, également en pause. Le pilote privé `tmp/performance-camera-v425/camera-native.spec.ts` reprend le même départ réel250² au35 : vue perspective, inclinaison basse, huit gestes de dézoom240, puis300mouvements de souris erratiques en rotation droite et pan milieu, ainsi que la molette. Les fenêtres de quatre secondes utilisent les vrais événements du navigateur ; aucune écriture de caméra ou World ne remplace les gestes. Poses, durées réelles et entrées sont conservées, car les gestes successifs et l’inertie ne produisent pas toujours des poses finales identiques.

Chrome155 natif WebGPU AMD RDNA1,2560×1440/DPR1, réglages équilibrés60Hz/2048, textures/herbe/pièce/diorama actifs. La référence `native-localhost-base06` donne en pause239,97images/s fixe,167,42en rotation et179,89en pan. À×1, la rotation donne112,71images/s, p99=41,7ms et maximum83,3ms ; des pointes existent aussi à caméra fixe. Ces relevés courts instrumentés ne prouvent ni endurance ni200images physiquement affichées.

Les profils pondérés retrouvent deux coûts distincts : l’invalidation urgente de caméra refait la passe d’ombres malgré la cadence configurée60Hz, et les événements de pointeur déclenchent picking, lectures métier et disposition DOM du survol pendant l’orbite. Le fond de la pièce est également redessiné. Les commandes statiques `RoomLayer` pèsent peu dans ces profils : leur proposition de cache reste privée. Aucune compilation GPU nouvelle n’est établie comme cause des freezes.

Un essai conserve un atlas d’ombres seulement lorsque la nouvelle enveloppe, sa profondeur, sa marge de filtre et sa densité restent couvertes. Les contrôles privés et32cas ciblés passent, mais la vue agressive renouvelle encore499passes pour501images en rotation et525pour525en pan. La preuve de couverture et de densité n’autorise presque aucune réutilisation dans cette vue ; les motifs individuels de refus ne sont pas journalisés. Cet essai est **retiré intégralement**, avec copies et gel conservés sous `rejected-shadow07` ; aucun nouveau cache d’ombres ni changement de qualité ne reste dans le produit.

La candidate07 combinée conserve huit fenêtres, mais le parcours de pause échoue ensuite sur l’oracle `area-feedback` : `main.ts` masque déjà ce panneau dans `b82c95c1`. La capture montre un aperçu de murs ; la reprise doit vérifier le drag réel, ses instances d’aperçu, son annulation et l’absence de commande, puis l’export entier exact. L’échec initial demeure conservé. Le parcours×1 passe séparément.

Cette paire06→07 est globalement moins bonne : même la pause fixe, avec pose et géométrie identiques et sans rafraîchissement des ombres, passe239,97→196,03images/s et2,54→4,15ms CPU. En rotation, le coût CPU cumulé du survol baisse526→23ms et en pan479→27ms, mais ce gain local ne prouve pas une amélioration globale des FPS. Les calculs de couverture représentent environ0,08ms/image en rotation et n’expliquent pas tout le ralentissement. Le relevé hôte ultérieur observe un autre jeu et son client actifs, une charge CPU totale d’environ56% et3,8GB de mémoire disponible ; il ne permet pas de reconstruire leur charge à chaque fenêtre. L’utilisateur confirme qu’il préviendra une fois ce jeu fermé. L’utilisateur confirme ensuite la fermeture du jeu ; les comparaisons suivantes restent distinctes. Aucun gain FPS causal n’est retenu de07.

Le seul complément produit conservé est le survol différé : dernière coordonnée consommée une fois par image, suspension pendant les boutons droite/milieu, reprise sur la vraie position avec hit-test DOM frais. Sélections, annulations et picking final de commande restent synchrones. Dix-huit cas ciblés d’entrées passent ; après retrait des ombres, typage et build Pages passent en27,954s. Les1732sources sont gelées. La reprise native `native-input-recovery08` passe en100,084s : drag réel de127,128 à133,128, aperçu résident, annulation au second bouton droit sans tâche créée, survol repris après pan et export entier identique au35. Sa preuve est complète et ses erreurs vides. Elle ne sert pas de mesure FPS pendant la charge extérieure.

Schéma263, règles, sauvegardes et archives restent inchangés. Le temps d’adoption MAIN et les passes de rendu restent des limites distinctes à traiter ; les200FPS stables ne sont pas acquis. Ce complément est inclus dans la publication décrite ci-dessous.

### Comparaison finale du survol, sans profileur CPU

Le témoin11 et la candidate12 passent en174,692s et178,309s. Chrome155 headless utilise le vrai backend WebGPU AMD RDNA1,2560×1440/DPR1 ; ce n’est pas une mesure de l’affichage physique. Le témoin sert uniquement le `ColonyRenderer.ts` original de `b82c95c1` par un plugin Vite privé sur5428 ; les autres sources sont celles du gel, sans modifier le serveur utilisateur5173. La candidate utilise5173. Pas de profil CPU ni timestamps GPU dans ces fenêtres ; les wrappers CPU/RAF et compteurs de passes sont identiques. La caméra initiale perspective et son span33,92 sont exigés avant la préparation ; après préparation, le span90,816 et les poses initiales fixe/rotation correspondent. Les phases pan/zoom gardent des écarts de pose hérités de l’inertie, enregistrés dans les rapports.

| Fenêtre | Images/s témoin→survol différé | CPU image moyen, ms | RAF p99, ms | RAF maximum, ms | Intervalles>50ms | Ticks |
|---|---:|---:|---:|---:|---:|---:|
| Pause fixe |231,17→231,10|3,23→3,33|8,4→8,4|8,4→8,5|0→0|0→0|
| Pause rotation |125,43→150,11|5,56→5,51|16,7→12,5|16,8→12,6|0→0|0→0|
| Pause pan |136,99→159,06|5,20→5,20|16,7→12,4|20,8→12,5|0→0|0→0|
| Pause molette |170,88→212,88|4,86→3,72|12,5→8,4|12,6→12,6|0→0|0→0|
| ×1 fixe |93,53→163,77|7,16→4,15|54,2→37,5|83,3→83,4|4→1|24→24|
| ×1 rotation |81,48→83,99|7,15→7,87|50,0→70,9|58,3→108,4|3→16|36→38|
| ×1 pan |77,86→119,16|7,46→5,86|50,1→41,8|83,4→58,4|5→2|38→29|
| ×1 molette |122,78→144,97|5,57→4,76|45,9→41,6|62,6→54,2|2→1|24→24|

Les gains observés en pause sont19,67% en rotation et16,12% en pan ; le CPU image change peu dans ces deux fenêtres, conformément au travail de survol retiré hors RAF. La très forte variation×1 fixe, à même plage41→65 et sans geste, interdit d’attribuer tous les écarts de FPS au correctif. Une seule paire séquentielle ne neutralise pas charge hôte, JIT, GC ou pilote. Les gestes réels peuvent allonger la fenêtre : rotation×1 dure6001,8→6239,1ms et pan6280,7→4817,2ms ; les FPS sont normalisés par ces durées, les comptes de ticks et d’intervalles restent bruts.

**La rotation×1 reste problématique :** moyenne presque inchangée et pointes plus mauvaises dans cette paire. Aucun confort global rétabli, élimination des freezes ou200FPS stables n’est annoncé. La paire visible profilée09/10 est également conservée : pause non appariée (span206,34 contre90,816), donc aucun gain de pause retenu ; résultats×1 mixtes. Le passage ponctuel à200images/s de10 en pause ne remplace pas le tableau final sans profileur. Les paramètres, poses, preuves et données brutes restent sous `tmp/performance-camera-v425/`.

Les quatre preuves11/12 sont complètes, sans erreur ; les deux exports en pause sont entièrement identiques à leur original35. Le contrôle d’interaction08 reste acquis séparément. Les1732sources sont vérifiées exactes après les mesures ; le build final sans essai d’ombres a passé en27,954s. Aucun changement d’horloge, de bridge ou d’interpolation dans ce complément d’entrée ; les contrôles temporels du lot initial restent ceux décrits plus haut, sans leur attribuer une nouvelle exécution.

Une candidate privée d’admission de flore réutilisant le témoin existant est préparée pour la suite ; elle n’est ni intégrée ni testée et aucun gain ne lui est attribué. La livraison courante contient uniquement le lot initial et ce complément d’entrée.

## Publication du lot partiel

Le produit `ecdfe9a3e91ba033ced17bdf8844eedc646c0ef8`, incluant le lot initial `b82c95c1`, est poussé sur `origin/main` et publié sur [Elsewhere](https://elsewhere-cq7.pages.dev) le18octobre2026, déploiement [d894d842](https://d894d842.elsewhere-cq7.pages.dev). Le build Pages acquis en27,954s correspond aux1732sources gelées ; le contrôle documentaire final passe en2,095s. Aucun essai d’ombres ni prototype privé d’admission de flore n’est inclus.

L’inspection `tmp/elsewhere-pages/v425-package-JZ0eHE` confirme les70fichiers de catalogue/sauvegardes identiques entre `public` et `dist`, les67entrées du catalogue et les68anciens payloads préservés. La vérification `tmp/elsewhere-pages/v425-http-HzCuZv`, commencée à18:24:05UTC, passe avec136réponses HTTPS aux octets et MIME attendus sur les origines stable et déployée, sans erreur. Elle vérifie la disponibilité du paquet ; elle ne constitue pas une nouvelle mesure de performances ni une nouvelle recharge jouée.

Après ses propres essais, l’utilisateur confirme une amélioration des rotations, mais un confort global insuffisant : ordres de déplacement, pose de constructions et validation de zones ont un délai perceptible. Ces exemples motivent l’analyse du trajet commun entrée→commande→simulation→publication→adoption→présentation, sans les traiter comme trois correctifs isolés. Deux pages actives peuvent se partager CPU/GPU ; aucun gain mesuré n’est attribué à ces essais humains non instrumentés. Les200FPS stables et la faible latence générale restent ouverts.
