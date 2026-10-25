# V475 — coût des validations de présentation

Lot local A2H et FIFO natif, non publié ; dernière livraison V474. Schéma 293 inchangé.
Les sources produit contiennent les résumés de listes privées B, les formes
de piles D, les captures de hauteurs et pièces de salissures H, et le tampon
numérique d'identifiants A2. Les parcours natifs, contrôles ciblés et recharges
entières exactes de ces mêmes sources sont acquis. Les comparaisons restent
mixtes en accéléré : ce point de développement ne clôt pas la fluidité.
L'expérience A initiale et les refontes ultérieures du Worker, du mémo de
descripteurs et du journal filth restent écartées et hors de ces sources.
Priorité : microcoupures sur Les Éclaircies en rotation ×1/×3/×6, avec le
débit de simulation réel. Aucun ajout de gameplay, changement de qualité
visuelle ou relèvement d'un plafond temporel dans ce lot. Les tests coupent
effets et musique et lancent Chrome avec `--mute-audio`.

## Diagnostic et périmètre

La V474 a réduit les grosses coupures et supprimé la compilation observée au
premier cargo. Sa dernière paire conserve néanmoins un intervalle de90 ms
et un débit de5,8947× en×6 ; le chantier reste ouvert.

Une nouvelle trace G×6 (`tmp/performance-v474/trace-candidate-g-x6-2026-10-24T03-46-24-241Z`)
observe des intervalles de50–60 ms occupés par des tâches MAIN successives :
réception/décodage, puis application graphique. Elle ne reproduit pas la
pointe90 ms et ne lui attribue donc aucune cause. Le profil MAIN séparé
`main-cpu-g-x6-2026-10-24T03-51-46-955Z` attribue3802,605 ms inclusives à
l'adoption sur11097,577 ms après isolation du premier delta1263,289 ms.
Les gardes Firefoam historique/World comptent respectivement678,124 et
1961,764 ms disjointes. Les visites récursives inclusives ne sont pas des
coûts additionnables. Ces profils instrumentés ne prouvent aucun gain FPS,
temps GPU physique ou débit produit×6.

Une fusion immédiate des deux parcours n'est pas retenue : les anciens
objets et les racines reconstruites restent mutables. La provenance d'un
message natif ne garantit pas que tous leurs descendants actuels sont
restés des données ordinaires. Les références normatives consultées le
24octobre2026 sont la [sérialisation structurée HTML](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)
et [Object.freeze dans ECMAScript](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze).
Un gel superficiel ne prouve pas la stabilité des descendants. La
préparation privée d'une frontière immuable est distincte du produit livré.

## B — réutilisation des listes privées de traces

Le constructeur des données de saleté possède déjà des copies profondes
gelées et conserve l'identité des traces inchangées. Le candidat ajoute
une preuve privée pour les tableaux ordinaires gelés qu'il construit
lui-même. Après un premier parcours structurel réussi, les gardes natives
peuvent réutiliser un résumé de cette collection : version, nombre de
visites, identités, IDs et présence propre des quatre champs réservés.
Un tableau fourni par un appelant, un Proxy, un mode literal ou une
construction par `order.map` n'acquiert pas cette preuve par son gel.

Chaque utilisation conserve le budget logique complet et les refus de
cycles, puis vérifie les champs hérités vivants. Les IDs sont réinjectés
au point du census initial, avec le Set immédiat de V474. Les contrôles
locaux de temps, cellules, nextId, ondes, recherche et propriétaires
continuent sur le contexte courant. Les façades publiques restent strictes.
Il n'existe aucun cache de verdict World ni nouveau champ de sauvegarde.

Un microbanc séparé utilise4377 traces, six publications de chauffe puis
60 publications mesurées, cinq rounds en ordre alterné. Les durées
incluent préparation par le vrai propriétaire, gardes et commit ; les
tableaux restent identiques ou changent d'une trace à chaque publication.

| Parcours par publication | Tableaux | Coût moyen témoin→candidat par60 publications |
| --- | --- | ---: |
| Historique seul |Identiques|159,331→1,850 ms|
| Historique seul |Une trace modifiée|143,149→201,496 ms|
| Historique puis World |Identiques|324,651→24,844 ms|
| Historique puis World |Une trace modifiée|336,644→216,322 ms|

Rapport `tmp/performance-v475/filth-list-proposal/microbench-2026-10-24T04-25-37-819Z.json`,
PASS34,065 s. Le parcours natif normal appelle historique puis World ;
il amortit donc le résumé dès cette seconde garde. Le surcoût sur un
parcours historique isolé avec tableau modifié reste explicite. La
mémoire du résumé est proportionnelle aux rows et IDs, avec des clés
faibles et aucune chaîne conservée de Worlds. Ce banc de composants ne
prouve pas un gain de fluidité en jeu.

Sur le produit intégré,62 cas passent dans cinq fichiers, puis42 dans
quatre fichiers dont18 communs :86 cas distincts, y compris le budget
exact de deux millions de visites. Un nom de sixième fichier inexistant
dans la première commande n'a ajouté aucun cas. Typage acquis19,728 s.
Les sept contrats du vrai Worker,57 assertions, passent17,696 s avant
l'interruption ; leur résultat terminal a été relu à la reprise.

### Chargement réel et réparation de l'oracle fonctionnel

Après reprise, le pilote fonctionnel échoue deux fois sur une notification
d'attente au premier chargement (56,631 et53,579 s au total). Dans la
reprise horodatée, load3 est envoyé à4732,6 ms, l'alerte arrive à19737,1 ms,
le checkpoint1730 à21922,9 ms, puis sa réponse à22545,7 ms. Le délai de
15 secondes concerne donc ce load, et non les deux réglages initiaux
déjà confirmés. Le jeu est présent en pause dans la capture ; aucune
fault ou resynchronisation cachée n'a été relevée.

Le même pilote strict reproduit l'échec sur V474 figée,59,955 s : load3
à8602,8 ms, alerte23605,6 ms, checkpoint26225,1 ms et réponse26935,8 ms.
Cela établit ce délai hérité dans ces conditions, sans l'attribuer au
correctif B ni déclarer le temps de chargement satisfaisant.

Le contrat existant du client conserve une demande lente et résout une
réponse tardive seulement après son checkpoint corrélé
([test dédié](../../tests/consolidation-bridge-client.test.ts)). Le
pilote privé réparé accepte donc uniquement une notification `waiting`
de load avec demande réelle, réponse positive et checkpoint de même
epoch/révision, puis statut `settled`. Toutes les notifications brutes
restent dans le rapport ; une autre erreur, un défaut de corrélation,
une fault ou une resynchronisation échouent encore. Les contrôles UI,
pause, personnes et recharge RAW entière exacte sont conservés. Cette
réparation ne change aucun timeout ou comportement produit et ne prouve
pas une amélioration de chargement.

La reprise `functional-b-recovery-2026-10-24T10-33-13-568Z` passe109,757 s :
trois vitesses choisies dans la vraie UI,48 déplacements souris par rotation,
pause60 RAF, Bio/Besoins/Santé et recharge entière exacte. Tick1833,
RNG3150672188,1663 piles ; SHA du RAW avant/après
`fd97a8cb9d0ad61d820c366bee08021805e0bd718b3905bd229f2449a2b942b0`.
Les mêmes trois personnes sont conservées. Une alerte de load initial
est corrélée et résolue ; aucune autre erreur, fault ou resynchronisation,
aucune erreur console et sources inchangées. La capture finale a été
inspectée. Les trois échecs précédents et leurs pilotes restent conservés.

## D — formes des piles conservées par bundle

La sonde imbriquée `layers-diagnostic-b-x6-2026-10-24T10-46-00-791Z`
passe88,270 s. Elle sépare les trois consommateurs de ressources et
projection/écriture des piles. Sur168 mises à jour de piles, p99 total10,1 ms,
projection au plus2,2 ms et onze écritures de lots au plus1,6 ms. Le résidu
assemblage et colle atteint8,3 ms (p998,2 ms) : sur le maximum10,7 ms,
0,9 ms de projection,1,6 ms d'écriture et8,2 ms de résidu. Il ne s'agit
pas d'un profil direct de chaque fonction géométrique.

Le candidat D conserve les formes intrinsèques des bundles inchangés
quand une voisine modifie le même chunk. Un bundle modifié reçoit une
copie profonde privée, gelée avant publication ; aucun objet du World
n'est gelé. Les conteneurs publiés et les corps de bundle sont protégés.
Les formes cachées ne sont jamais retournées directement : leurs petits
objets scalaires sont recopiés dans le même ordre pour le lot courant.
Le frame exact, son chunk courant et l'ACK bornent cette réutilisation ;
clear, mauvaise frame et reprise n'offrent pas une autorité permanente.

BoxBatches effectue toujours ses écritures complètes, ses ordinals
d'atlas par catégorie et ses bornes. Aucun matériau, buffer, capacité,
masque, quantité ou cadence n'est changé. Le repli mutable complet du
rendu est conservé. La sortie diagnostic inspect est une copie et
n'expose plus les bundles internes. Le coût de copie/gel des seuls
bundles modifiés et la mémoire des formes conservées restent à mesurer.

Deux revues ne trouvent pas de défaut concret. Six nouveaux cas proposés
couvrent l'égalité des formes, les mutations avant/après cache, les alias
de surface et arbre, le cargo au même World, ACK/retry et vrais buffers
F32/atlas/bornes après quanta/suppression/réordonnancement. La sélection
de six fichiers donne48/49 cas acquis, dont les six nouveaux. Le seul
échec vient d'une ancienne façade de test dépourvue de `immutableWorlds` :
il est reproduit sur la V474 figée, avant le code D. Sa préparation est
réparée en ajoutant un WeakSet vide, pour exercer le même repli mutable ;
aucune assertion métier n'est retirée. Sa reprise passe18,665 s et le
typage19,692 s :49 cas distincts D acquis par reprises.

La même sonde de sous-couches passe84,910 s sur D, puis analyse0,111 s
(`layers-diagnostic-d-x6-2026-10-24T11-05-50-213Z`). Sur170 appels,
updatePiles moyen0,361 ms, p992,3 ms, maximum2,5 ms ; projection au plus
0,9 ms, onze écritures au plus1,4 ms, résidu de génération/colle au plus
0,6 ms (p990,4 ms). La fenêtre ×6 présente un débit5,85049 et aucun
intervalle RAF>50 ms, maximum48,1 ms. Ces coûts de sous-couches sont
diagnostiques ; le nettoyage disque intervenu entre B et D empêche
d'attribuer toute variation de cadence à ce seul changement. Une nouvelle
paire en ordre candidat puis témoin est lancée dans les mêmes conditions
après entretien, sans les sondes imbriquées.

La proposition C ResourceLayer reste privée, non intégrée. La sonde lui
attribue2,223 ms moyens et8,3 ms maximum dans le consommateur de meshes,
mais la priorité D est choisie pour réduire une pointe identifiée et
bornable. Les deux refontes ne sont pas empilées avant comparaison.

## A — expérience d'index à la demande, retirée du produit

Les paragraphes et mesures de cette section décrivent le candidat A
archivé, pas le code courant.

Le census World conserve toutes ses lectures et leur ordre, y compris les
ressources malformées, les getters qui échouent et les identités dans les
cartes et coffres. Il capture les **valeurs** déjà lues dans un buffer privé
éphémère, sans garder des callbacks qui reliraient les objets. Les seize
premières requêtes d'appartenance utilisent la même égalité SameValueZero ;
la dix-septième construit le Set et libère le buffer. Les identifiants des
ondes ajoutés entre les requêtes restent visibles immédiatement.

Les fonctions publiques Local et leur sink fourni par l'appelant sont
inchangés. Aucun verdict World, horloge, recherche, propriété ou succès
d'admission n'est mémorisé. Aucun nouveau champ persistant ni changement
de règles de simulation n'est introduit.

Le microbanc synthétique utilise28000 ressources, trois appels de chauffe
et vingt appels par variante/contexte, en ordre tournant. Il mesure le
validateur complet, allocations et interruptions incluses. Les prototypes
restent séparés ; le choix de matérialiser au premier has et celui de deux
recherches linéaires ont été écartés après surcoût dans les cas avec ondes.

| Contexte préparé | Set immédiat moyen | Candidat16 moyen | Médianes témoin→candidat |
| --- | ---: | ---: | ---: |
| Aucune condition |1,669 ms|1,015 ms|1,706→0,971 ms|
| Condition sans onde |1,701 ms|0,912 ms|1,435→0,683 ms|
| Une onde |1,481 ms|1,001 ms|1,442→0,708 ms|
| Quatre ondes |1,725 ms|1,248 ms|1,488→0,920 ms|
| Trente-deux ondes |1,665 ms|2,328 ms|1,656→2,327 ms|

Rapport `tmp/performance-v475/firefoam-id-census-microbench/results-r2-2026-10-24T04-14-13-067Z.json`,
PASS7,118 s. Le surcoût moyen0,663 ms dans le dernier cas est conservé.
Les pics d'interruption du banc restent dans les statistiques. Le buffer
est proportionnel au nombre d'ajouts, y compris les alias, et coexiste
brièvement avec le Set lors de sa construction. Ce banc ne démontre pas
un gain de fluidité ni une émission réellement jouée.

## Contrôles de l'expérience A et limites conservées

La sélection de quatre fichiers comporte52 cas distincts :50 passent à
la première exécution, deux nouveaux oracles échouent. Une condition vide
fait déjà lire les IDs par Local ; l'oracle attendait à tort aucune erreur
sur une ressource nulle. La fixture d'horloge prétendument tardive avait
aussi placé `advancedAtCore` avant `startedAtCore`, provoquant un refus
structurel antérieur au census. Ces deux comportements sont reproduits
sur le témoin et le candidat par `census-oracle-check.mjs`, PASS3,754 s.
La seule correction d'oracles donne16/16 sur le fichier repris,
PASS11,081 s :52 cas distincts acquis par reprises, pas68.

Le premier microbanc échoue avant toute mesure parce que sa source d'onde
est supérieure à l'identifiant de l'onde ; pilote et rapport conservés.
La fixture corrigée passe le banc R1, puis la nouvelle variante16 motive
R2. Aucun refus produit n'a été détendu pour ces reprises.

Le nouveau témoin natif V474, mêmes sauvegarde/caméra/réglages que la V474,
est acquis (`paired-witness-a-2026-10-24T04-04-58-908Z`, PASS237,319 s).
En×1/×3/×6 :0/1/6 intervalles>50 ms, maxima41,9/54,1/78 ms ; débit
0,99986/2,99687/5,63015. Cette variation entre relevés interdit d'utiliser
une ancienne paire comme comparaison du nouveau candidat.

Le candidat A passe son parcours natif242,460 s, avec mêmes entrées
vérifiées par `paired-a-comparison.json`. En×1/×3/×6 :1/4/8 intervalles
>50 ms, maxima54/72,1/54,1 ms et débit0,999755/2,990844/5,121594.
Le p99×3 et×6 monte à42 ms. La cause générale de cette dégradation n'est
pas attribuée au seul census, mais le gain de son microbanc ne suffit
pas à le retenir. Source et preuves sont archivées ; le census eager
initial est rétabli avant l'intégration B.

## Première paire native B, résultat mixte

Après interruption, témoin `paired-witness-b-2026-10-24T09-55-27-469Z`
PASS241,770 s et candidat `paired-candidate-b-2026-10-24T10-00-06-580Z`
PASS236,765 s. `paired-b-comparison.json` confirme les mêmes entrées.

| Vitesse | p99 image témoin→B | Maximum témoin→B | Intervalles>50 ms témoin→B | Débit témoin→B |
| --- | ---: | ---: | ---: | ---: |
|×1|25→20,8 ms|33,4→33,4 ms|0→0|0,99969→0,99970|
|×3|33,4→29,1 ms|104→66,7 ms|1→1|2,99919→2,99775|
|×6|33,4→33,3 ms|50→75,1 ms|0→5|5,64876→5,76471|

Le décodage moyen baisse15,975→13,631 ms,16,815→14,245 ms et
18,566→16,890 ms. En×6, son p99 monte pourtant28,6→50,4 ms et son
maximum33,1→61,5 ms ; quatre longues tâches sont observées. Une trace
est nécessaire pour attribuer ces pointes. La diminution d'un coût moyen
ne clôture donc pas le confort ni la qualification du candidat B.

## Paire inverse après entretien, D reste à compléter

Candidat D `paired-candidate-d-2026-10-24T11-08-21-310Z`, PASS230,162 s,
puis témoin V474 `paired-witness-c-2026-10-24T11-13-31-190Z`,
PASS233,295 s. `paired-c-d-comparison.json` confirme les mêmes entrées
après le second nettoyage, en ordre inverse de la paire précédente.

| Vitesse | p99 témoin→D | Maximum témoin→D | Intervalles>50 ms témoin→D | Débit témoin→D |
| --- | ---: | ---: | ---: | ---: |
|×1|18,1→18 ms|30→42 ms|0→0|0,999645→0,999595|
|×3|30→30 ms|60→78 ms|1→2|2,999325→2,999025|
|×6|30,1→35,9 ms|48→78 ms|0→4|5,755456→5,787442|

Le coût des piles est réduit dans la sonde ciblée, mais les grandes
pointes de la paire restent défavorables au candidat. Le confort général
n'est donc pas déclaré convenable et le gameplay ne reprend pas encore.

Les traces ×6 avec un seul document ne reproduisent pas ces75–78 ms,
alors que le protocole de paire charge trois fois dans le même contexte
de navigateur. Une trace du troisième document est préparée pour refaire
exactement les phases×1 puis×3 avant d'observer×6. Aucun nettoyage ou GC
forcé n'y est ajouté ; aucun relevé précédent n'est exclu. Le rôle des
cycles de documents, de la mémoire ou d'une autre tâche reste à vérifier.

### Pointes reproduites et attribution mémoire

La trace du troisième document passe244,805 s, analyse2,160 s :
`trace-third-document-d-2026-10-24T11-19-39-687Z`. Le protocole original
×1→×3→×6 est conservé, la trace CPU ne portant que sur la dernière phase.
En×6, RAF maximum96 ms et six intervalles>50 ms. Le plus grand intervalle
horodaté atteint94,7 ms, dont90,52 ms de GC observé et87,119 ms dans
MajorGC. D'autres intervalles de79,6/73,4/69,1 ms comprennent21,255/
18,698/21,607 ms de GC. Le total GC MAIN observé est495,675 ms sur20 s.
Cette fois, les grandes pointes sont effectivement reproduites et une
cause de blocage est identifiée. Cela ne prouve pas quel ensemble précis
d'allocations déclenche ces collectes ni une fuite entre documents.

Une alternative privée E retire le Set de références des4377 traces créé
par chaque nouveau résumé B. Elle réutilise le tableau privé gelé et
teste les ancêtres dans le petit ensemble actif, en conservant IDs,
versions, masques hérités, contexte et budget. Le premier passage évite
une table de hash supplémentaire ; le hit devient O(N), au lieu de
probes proportionnelles à la profondeur. Les19 contrats existants,
budget compris, passent17,191 s sur la copie privée.

Le microbanc B/E passe19,381 s, rapport
`filth-list-array-proposal/microbench-set-vs-array-2026-10-24T11-30-41-096Z.json`.
Sur300 publications par scénario, historique+World avec une trace
modifiée passe3,572→3,312 ms moyens et p997,344→6,517 ms. Avec tableau
identique, la moyenne monte0,331→0,441 ms. Historique seul : liste
modifiée3,184→2,892 ms, liste identique0,023→0,099 ms. Ces régressions de
hit restent explicites. E est intégrée ; reprise des19 contrats produit
PASS17,284 s, typage15,382 s. Aucun nouveau cas n'est compté.

La trace du troisième document E passe244,724 s, analyse2,135 s :
`trace-third-document-e-2026-10-24T11-36-01-999Z`. En×6 : débit5,82384,
p9930 ms, maximum102 ms et deux intervalles>50 ms. Le GC MAIN observé
est250,328 ms, dont une collecte majeure45,394 ms. Le plus grand
intervalle horodaté97,1 ms cumule46,413 ms de GC avec les autres tâches,
dont un décodage25,9 ms et une application10 ms. Cette acquisition montre
moins de temps de collecte que D, tout en conservant une coupure trop
grande. Aucune cause unique ni résolution générale n'est annoncée.

Le parcours UI de la source E passe103,086 s
(`functional-e-2026-10-24T11-46-04-045Z`) : trois vitesses, rotations,
inspection, pauses et recharge complète exacte. Tick1823,
RNG4107959514,1663 piles ; SHA avant/après
`8cda6395f20d206a7768798e9fc8b77e14c1824b6ca645a090063f3108147e37`.
Aucune alerte de chargement, erreur, fault ou resynchronisation cette fois ;
sources inchangées et capture finale inspectée. Cela qualifie la
conservation de cet état, pas la disparition des pauses mémoire.

### Attribution des allocations temporaires

Le profil MAIN du troisième document E passe231,779 s ; analyse0,140 s,
`allocation-postwindow-e-2026-10-24T11-55-17-157Z`. Les trois chargements
et fenêtres20 s sont conservés. Le sampling64KiB couvre aussi les objets
collectés. La récupération du profil provoque un GC implicite : elle est
effectuée après la marque de fin, arrêt des observations et gel des timings,
sans collecte forcée avant ou pendant la fenêtre. Les franges restent
déclarées ; ces timings instrumentés ne sont pas une preuve de gain.

Les2175 nœuds et49906 samples totalisent3,839Go de selfSize statistique,
pas une mesure exacte du heap retenu. Les partitions exclusives par stack
attribuent1,157Go au scanner shape/World Firefoam,315,8Mo au scanner
d'acteurs et600,4Mo à patchCollection. Le renderer attribue247,8Mo à
ResourceLayer et201,0Mo à la vérification des pièces de filth. Les noms
de fonctions parentes ne sont pas additionnés à leurs descendants.

Les compteurs passifs hors fenêtres montrent152 Documents aux trois
phases dans le même isolate. Le heap utilisé baisse de375 à340Mo entre
les relevés, puis258Mo après la récupération/GC. Ces données ne
démontrent pas une chaîne croissante d'anciens Documents, ni l'absence
générale d'une fuite. Elles n'attribuent pas les heaps Worker ou GPU.

La reconstruction de collection F est écartée avant code : remplacer
les IDs relus par l'ancien index peut diverger quand un prédécesseur est
encore accessible par alias ; une nouvelle frontière de propriété serait
nécessaire. Une proposition de liste filth pour le scanner d'acteurs est
également écartée : ce scanner ne suit pas le champ filth dans le parcours
normal, donc le gain attendu n'était pas établi. Les observations sont
conservées et la prochaine correction vise un propriétaire réellement
présent dans les stacks.

### H : hauteurs des traces au sol, allocation ciblée réduite

Les captures de hauteurs d'une pièce sont déjà privées au renderer. Elles
deviennent un tableau indexé, tandis que la table de lecture réutilise ses
cellules scalaires avec une nouvelle marque à chaque appel. Les hauteurs
sont donc toujours relues, même sur le même objet au même tick. Le pool ne
retient aucun World ou terrain ; il est limité à131072 cellules entre les
lectures, avec vidage après dépassement ou reset. Les appels imbriqués
gardent leur table locale ; les exceptions ferment la portée de lecture.

Six nouveaux contrats différentiels comparent l'ordre exact des getters,
les changements de support/dimensions, les valeurs undefined/NaN, l'ordre
transparent, les resets, la réentrance et les exceptions. Avec les voisins
graphiques :16 cas passent3,457 s, typage14,970 s.

Le profil H passe231,867 s, analyse0,142 s. La comparaison des selfSize
uniques passe0,115 s :201013772→262256 octets statistiques pour ce
sous-arbre, soit1210926→1552 par application observée. Les applications
comptent166→169 ; les décodages291→295. Le total du profil passe3,839 à
3,686Go. Cela confirme le retrait des allocations ciblées, sans attribuer
toute variation globale à H. En×6, le maximum instrumenté reste101,9ms,
avec un intervalle>50ms et un débit5,8481 : le confort reste ouvert.

### A2 : réévaluation du census après attribution

Le nouveau profil attribue335,5Mo statistiques à l'ajout des IDs du census
World. A original reste retiré. A2 conserve les mêmes lectures d'IDs et
réutilise seulement un tampon numérique privé au factory interne. Son
préfixe actif est indépendant à chaque appel ; le débordement est local,
sans nouvelle limite. Une valeur non numérique utilise immédiatement un
Set local sans coercition. Après16 recherches, un Set est matérialisé.
Les appels imbriqués ont leur Set indépendant et un finally libère les
références temporaires. Les façades publiques World et Local restent
inchangées ; aucun verdict World n'est conservé dans le pool.

Le test d'IDs existant est étendu de16 à19 cas, sans copie de ces16 cas
dans un second fichier. La sélection de six fichiers passe80 cas/1 opt-in
non exécuté en23,402 s ; typage13,858 s. Le budget historique2m, déjà acquis
sur E et inchangé par le sink World, n'est pas rejoué. Les sept contrats
avec un vrai Worker passent16,290 s,57 assertions et aucune erreur.

Le microbanc CPU A2 passe7,568 s :13 contrats hors timing et100 mesures
par variante/cas, avec ordre tournant et mêmes dépendances. Sans condition,
condition vide, une et quatre ondes : moyenne1,523→0,626 /1,622→0,504 /
1,566→0,630 /1,547→1,055ms. Avec32 ondes, elle augmente1,775→2,827ms.
Le p99 sans condition est également défavorable2,013→4,297ms. Ces résultats
mixtes sont conservés ; aucun gain FPS ou de régularité n'est inféré de ce
microbanc. A2 poursuit sa qualification native avant décision finale.

### Paire finale plus longue : des coupures restent présentes

Le profil A2H passe230,194 s, analyse0,153 s. Le poste census direct du
profil H passe336708820→0 octet échantillonné, ce qui n'implique pas zéro
allocation exacte. Le total passe3,686 à3,307Go statistiques ; normalisé
par décodage,12,496→11,247Mo (295→294 décodages). Les allocations filth
restent faibles :0,262→0,330Mo. La source H→A2H ne diffère que par le
fichier de validation Firefoam. Le relevé instrumenté présente0 intervalle
>50ms aux trois vitesses ; ce résultat ne remplace pas la paire suivante.

Une nouvelle paire sans profileur double les fenêtres à40 s par vitesse,
avec le témoin V474 figé puis le candidat A2H. Témoin295,108 s, candidat
293,842 s ; le comparateur confirme les mêmes entrées et réglages.

| Vitesse | p99 témoin→candidat | Maximum témoin→candidat | Intervalles>50ms témoin→candidat | Débit témoin→candidat |
| --- | ---: | ---: | ---: | ---: |
|×1|23,9→18ms|48→30,1ms|0→0|0,999810→0,999803|
|×3|30→24ms|72→95,9ms|2→1|2,978645→2,997834|
|×6|30,1→30ms|53,9→66ms|1→1|5,861391→5,845117|

Les intervalles moyens passent6,715→6,578 /8,784→7,972 /8,749→8,199ms.
La cadence moyenne et une partie des queues s'améliorent ; les pointes
accélérées persistent et sont plus longues dans cette paire. Le confort
n'est donc pas déclaré acquis et le gameplay reste suspendu. Les anciens
relevés mixtes, y compris ceux sans coupure sur20 s, sont conservés.

Le RAW du×3 corrèle la pointe95,9ms à un intervalle horodaté93,8ms et
une longue tâche87ms. Il contient un décodage26,4ms, un setWorld10,8ms
(dont apply10,6ms inclus) et un HUD2,8ms. Environ42,2ms entre le début
de la longue tâche et l'entrée dans decode restent hors des wrappers.
La trace CPU ciblée du deuxième document×3 est acquise :907300 événements,
sans perte relevée sur40,0033s. Elle ne reproduit pas exactement95,9ms,
mais son plus grand intervalle76,7ms contient38,007ms de GC, dont un
MajorGC36,75ms dans decode60,5ms. Le GC MAIN total atteint411,246ms.
Ce constat motive un prototype qui déporte l’admission vers un Worker,
avec un FIFO fermé et reconstruction des seuls deltas sur MAIN.

Cette refonte reste dans une copie privée sous tmp ; le produit A2H
et la production V474 n’en dépendent pas encore. Le typage privé et44
cas des lecteurs par défaut passent. Le démarrage réel à deux Workers
est acquis ; les autres parcours, pertes de source, création de monde,
âge du FIFO et coût total restent à qualifier avant intégration.
Un contrôle ciblé attribue le premier échec de vue mondiale au lecteur
strict choisi comme témoin : le candidat a déjà activeMapId:null, le
témoin conserve la carte locale. Le prochain témoin emploiera donc le
chemin Main natif du jeu pour cette seule comparaison ; l’échec initial
reste conservé et aucune assertion de transition n’est supprimée.

Le parcours UI final A2H passe102,599 s : rotations réelles et inspections
aux trois vitesses, pause60RAF et même Eden/Robin/Gaël. La recharge RAW
entière est exacte au tick1827/RNG2506615076,1663 piles, SHA
`8c2b3b2fce85b37432975b8f3c42782c10759fe5247253936e93b53af0d1cfc8`.
Aucune notification, erreur, fault ou resynchronisation dans les deux
documents ; source inchangée et capture finale inspectée. Cette preuve
de conservation ne vaut pas résolution des coupures.

Aucune publication V475 ni clôture du chantier, des six ensembles ou de
la cible FPS n'est annoncée. Le développement des six ensembles reprendra
lorsque le confort de performance sera convenable ; les gains marginaux
ne constituent pas une fin en soi.

### Prototype d’admission Worker : premier essai rejeté

Le raccord privé passe les six parcours natifs de base et le typage.
Une nouvelle paire de40s par vitesse emploie le même témoin A2H, les
mêmes réglages et une instrumentation commune de l’opération MAIN.
Le comparateur confirme les entrées comparables ; témoin295,468s,
prototype306,732s. Ce prototype augmente les coupures :

| Vitesse | Maximum témoin→prototype | Intervalles>50ms témoin→prototype | Moyenne opération MAIN témoin→prototype |
| --- | ---: | ---: | ---: |
|×1|30→216ms|0→1|12,27→20,78ms|
|×3|60→378ms|1→82|12,89→27,15ms|
|×6|78→281,9ms|1→61|14,76→27,69ms|

Le débit reste proche du témoin, sans croissance observée du FIFO ;
cela ne compense pas la dégradation du rendu. **Ce premier prototype
est rejeté pour les performances et reste hors du produit.** Les durées
d’admission Worker moyennes22,47/22,71/24,96ms sont écoulées ; elles
ne s’ajoutent pas aux wrappers MAIN comme une mesure de CPU total.

Une attribution sans renderer place environ10,08ms dans la préparation
du plan de propriété et7,88ms dans sa validation/son gel, sur359appels.
Cette acquisition garde un FAIL sur une notification de chargement
non corrélée par son pilote ; sources vérifiées, attribution limitée,
aucun profil d’allocation ou diagnostic GC supplémentaire prétendu.
Après ajout de la corrélation réelle des notifications, une version de
métadonnées compactées passe358appels, mais reste à10,51+7,18ms :
pas de baisse nette suffisante. La suite vise le double parcours des
grandes listes privées, sans modifier les lecteurs publics stricts.

Un défaut de source tardive du prototype a également été reproduit :
un getter de MessageEvent altérait un acteur après admission Worker,
et des méthodes tardives exposaient les ports/Workers privés. La copie
privée capture désormais les intrinsèques natifs et emploie des records
propres pour ses callbacks internes. Le contrôle réel passe11,925s,
sans exposition sous ces attaques, puis le typage corrigé9,541s et les
six parcours natifs34,745s. La correction de type conserve exactement
le même JavaScript. Ces preuves ne qualifient pas encore les autres
négatifs ni la création complète de monde de la nouvelle verticale.

### Intervalles réels des callbacks et essais privés suivants

Les maxima du tableau précédent sont ceux de l'horloge RAF. La relecture
des captures brutes ajoute les intervalles entre `performance.now()` à
l'entrée réelle du callback de rendu. Un blocage terminal peut retarder
ce callback sans apparaître dans le dernier intervalle RAF enregistré.
Le [contrat RAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
précise que plusieurs callbacks d'une même image partagent un timestamp,
même si leur exécution prend du temps. Les deux métriques sont donc
conservées ; aucune ne prouve seule la présentation physique à l'écran.

Sans rejouer ni modifier les anciennes entrées, la paire produit
V474→A2H de40s donne :

| Vitesse | Maximum wall V474→A2H | Intervalles wall>50ms V474→A2H |
| --- | ---: | ---: |
|×1|41,8→34,2ms|0→0|
|×3|75,9→93,8ms|2→1|
|×6|86,5→67,2ms|4→2|

Aucun intervalle wall>100ms dans cette paire. La baisse de certains
coûts ne ferme toujours pas le confort. Pour la première paire du
prototype Worker, les maxima wall témoin A2H→prototype sont
32,1→216,5 /63,9→396,4 /100,2→340,4ms : le rejet reste confirmé.
Les rapports et leurs métriques RAF restent conservés.

La variante privée D1 réduit les métadonnées des tableaux natifs sous
gardes de provenance, avec gel effectif et reçu de propriété seulement
après adoption complète. Les lecteurs publics gardent leur voie stricte.
Un probe3D×3 de20s atteint encore102,3ms wall et12intervalles>50ms ;
ce n'est ni une paire fraîche ni une résolution du confort. D2, consacrée
aux rows ressources, coûte davantage en attribution et est écartée.

Un census hors fenêtre trouve1698records neufs et8905champs : la faune,
les factions et les acteurs dominent. La proposition privée E réemploie
leurs enfants précédents immuables et strictement égaux. Cinq contrats,
le typage, six parcours natifs et les gardes de source passent ; aucune
qualification UI complète n'est revendiquée pour E. Le réemploi réduit
les records neufs à642 dans le census observé, mais sa comparaison
ajoute2,19ms et le plan coûte8,33ms par publication. Avec gel et commit,
le total ciblé atteint environ11,42ms contre8,59ms dans la dernière
attribution D1. Ces relevés ne constituent pas une paire causale ; ils
ne justifient aucun gain et **E est écartée avant un long essai3D**.

La copie privée revient exactement à D1. La suite vise le parcours
répété des quelque28000références ressources déjà possédées, à partir
des vrais indices modifiés du constructeur de tableaux. Aucun nouveau
format ni gain n'est acquis. Faux ports, pertes de flux, refus après
admission, buffers typés non vides et création complète de monde
restent des frontières natives à exercer avant toute intégration.

La proposition privée S1 ajoute ensuite un reçu limité aux tableaux de
ressources reconstruits par le vrai constructeur sparse. Le reçu couvre
tous les indices remplacés, croissance comprise ; les autres éléments
proviennent de la liste précédente déjà immuable. Le lecteur parcourt
les nouveaux enfants, puis gèle toujours le tableau entier. Ordre,
retraits, autres tableaux et lecteurs publics conservent le parcours
complet. Typage, cinq contrats, six natifs et gardes de source passent.

L'attribution S1 mesure3,68ms de préparation contre6,48ms dans la
dernière D1 ; seal≈1,08ms et commit≈1,10ms, avec une pointe123ms dans
ce dernier. Le probe3D premier document×3/20s atteint2,9972× réels et
mainCommit moyen10,66ms, mais son maximum wall atteint **355ms** :
10intervalles>50ms et2>100ms. Le maximum RAF239,9ms décrit une autre
horloge. Le confort reste donc en échec malgré un coût moyen inférieur.

Dans cette capture, deux longues tâches successives131 et222ms couvrent
l'application de scène114,8ms, dont réconciliation statique73,1ms, puis
mainCommit202,1ms. Ces coûts sont inclusifs. Leur chevauchement ne
prouve ni CPU exclusif ni pause GC ; une trace ciblée doit identifier
la cause avant de choisir le correctif suivant. S1 reste privée, sans
nouvelle paire40s, qualification UI complète ou publication revendiquée.

### Décision après la nouvelle paire CPU : abandon du prototype Worker

Les sondes privées suivantes ont localisé un coût de commit du registre
de propriété et réduit ses inscriptions. S2b évite environ575000
memberships dans un probe20s, mais seul un nouveau témoin permet de
juger le résultat complet. La paire fraîche premier document×3/40s
emploie des métriques wall et deux relevés CPU par version. Le contrôle
recalcule les valeurs depuis les RAW et confirme les entrées comparables.

| Mesure | Témoin A2H | Prototype S2b |
| --- | ---: | ---: |
|Maximum wall|67,2ms|276ms|
|Intervalles wall>50ms|1|14|
|p99 wall|29ms|38,3ms|
|Débit réel|2,995×|2,999×|
|CPU Chrome total|96,703s|118,313s|

Les compteurs CPU cumulent les threads des processus du navigateur,
Workers inclus, sur une enveloppe aux franges enregistrées ; ils ne
mesurent ni GPU matériel ni Node/Vite. Les processus restent stables
dans les deux relevés. Le CPU total augmente de22,35% et la régularité
recule. **La refonte d'admission Worker est rejetée pour cet objectif.**
Le serveur propre est arrêté, les sources privées et toutes les preuves
restent conservées ; aucune intégration ou publication n'a eu lieu.

Le travail revient au chemin Main A2H. Une relecture du profil réel
A2H attribue, en familles disjointes,828,8Mo à trois modules Firefoam,
618,0Mo à l'assembleur résident,372,8Mo à NativeClone,351,5Mo à Three
et245,5Mo à ResourceLayer. Ces volumes échantillonnés ne prouvent pas
la cause d'une pause GC ni une fuite. Les stacks de descripteurs sous
Firefoam totalisent318,6Mo ; leur part réellement réutilisable reste
à mesurer. La double copie systématique des anciennes rows filth est
écartée par le code et le profil.

M1 a ensuite testé un mémo privé des descripteurs propres de copies
filth gelées, en conservant les lectures publiques et les fonctions
remplacées. Le typage et huit contrats ciblés passent, mais la paire
40s×3 augmente le coût Main moyen de12,737 à15,955ms et le p99 des
intervalles réels de29,9 à33ms. Le maximum50,3→45,3ms ne suffit pas
à retenir ce recul. La variante M1b passe dix contrats mais conserve
un coût Main moyen15,646ms dans sa sonde20s ; elle est aussi écartée.
Ces essais privés ne sont pas intégrés. Le candidat est restauré
exactement aux2000sources A2H et les échecs restent conservés.

Un microbanc des boucles de recherche de champs conserve l'algorithme
existant : environ1,12million d'appels/s contre0,74 et0,61million pour
les deux variantes. Il ne démontre aucun gain dans le jeu. La suite
est un profil CPU échantillonné du Main A2H réel, distinct des relevés
comparables sans profileur, afin de hiérarchiser le temps processeur
plutôt que le seul volume d'allocations. La fenêtre est fermée avant
export RAW ; aucun contrôle métier ni débit de simulation n'est réduit.

Les profils CPU Main puis Worker sont acquis sur les sources A2H exactes.
Dans le Main, les poids échantillonnés attribuent7,194s aux images et
5,990s au callback client, dont3,737s aux deux entrées Firefoam. Dans
le Worker existant, publication9,299s et simulation5,643s forment deux
sous-arbres distincts. Ces relevés de20s gardent leurs franges et leurs
premiers intervalles atypiques ; ils ne constituent pas une nouvelle
paire de performance. Les sommes parentes ne s'ajoutent pas à leurs enfants.

Le prochain essai cible le producteur : journaliser les IDs de salissures
modifiées pour éviter seulement la comparaison profonde des rows stables.
Le contrôle des identités, l'ordre, les entêtes, les publications et le
parcours public strict restent conservés. Tout remplacement ou historique
incomplet doit revenir à la comparaison complète. La proposition est
privée et ne constitue encore aucun gain acquis.

Un relevé d'un seul delta natif compte1990objets distincts,462octets
de tableaux typés et une branche World de105430octets JSON indicatifs.
Les factions et la faune en constituent les plus grosses sous-branches.
Cela ne mesure pas les octets du structured clone ni tous les envois.
Le rapport est conservé dans `tmp/performance-v475/main-payload-census-2026-10-24T20-58-36-036Z/`.

### Journal producteur : correction acquise, performance non retenue

Le prototype privé FJ1b passe le typage et13contrats différentiels, dont
vieillissement, nettoyage, changements au même tick, ordre, débordement,
deux lecteurs et reprise après échec. Deux défauts découverts avant cette
qualification sont corrigés dans le prototype : lectures publiques ajoutées
et enrôlement incorrect d'un littéral `items:[null]`. Il reste hors produit.

La mesure sans profileur40s×3 est encadrée par deux témoins A2H :

| Mesure | Témoin avant | FJ1b | Témoin après |
| --- | ---: | ---: | ---: |
| Débit réel |2,994×|2,812×|2,979×|
| Intervalles wall>50ms |13|20|9|
| CPU navigateur par seconde simulée |0,958s|0,972s|0,946s|

La baisse du CPU total de FJ1b accompagne une baisse de simulation ; aucun
gain n'est retenu. Le témoin final conserve une pointe182,1ms, dont la cause
n'est pas attribuée. Les comparateurs confirment les entrées et réglages.
Les preuves sont référencées dans
`tmp/performance-v475/main-path-performance-prototype/rejected-fj1b-bracket.json`.
Le census instrumenté ultérieur échoue au contrôle de chronologie ; il est
conservé sans être présenté comme une qualification ou un gain.

### 25 octobre : régularité ×1 prioritaire, caches de piles écartés

La priorité humaine est désormais explicite : améliorer d'abord la régularité
à ×1, puis vérifier ×3 et ×6. Les deux commits locaux `266eb16d` et
`34c1fd60` conservent A2H ; V474 reste la seule version publiée.

Le protocole privé V4 corrige le contrôle de chronologie CPU : les requêtes
et réponses sont ordonnées dans l'horloge Node, et les intervalles d'image
dans l'horloge Page. Les écarts entre ces horloges restent indicatifs, sans
marge de tolérance ni attente artificielle. Caméra, qualité et simulation
restent identiques entre les variantes. Les preuves RAW sont recalculées par
le comparateur.

Deux variantes privées de cache de piles passent leurs contrats ciblés,
mais ne gagnent pas le critère de régularité. Leur paire ×1 de40s donne :

| Mesure | Témoin A2H | F2v2 | F2v3 |
| --- | ---: | ---: | ---: |
| Intervalle wall p99 |21,2ms|35,6ms|25,4ms|
| Maximum wall |39,1ms|74,1ms|34,7ms|
| Intervalles wall>50ms |0|2|0|
| Admission Main moyenne |12,99ms|26,01ms|15,38ms|
| Débit réel |0,99989×|0,99992×|0,99986×|

F2v3 passe13contrats après correction d'une fixture dont le point
d'injection n'était jamais lu ; le premier échec est conservé. Sa baisse
de CPU total accompagne moins d'images et ne constitue pas un gain accepté.
Les deux variantes sont écartées ; aucun prolongement F2 n'est prévu.
Les2000sources privées du candidat sont restaurées exactement à A2H,
avec reçu `tmp/performance-v475/main-path-performance-prototype/rejected-f2-final-restoration.json`.
Aucune source F2 n'entre dans le produit.

Sur le RAW du témoin ×1, les241intervalles wall supérieurs à16,7ms
chevauchent une adoption ou une application d'état. Cette corrélation
oriente le prochain essai vers leur ordonnancement ; elle ne mesure ni
un temps GPU ni une cause unique. Le prototype FIFO préparé conserve
tous les messages et leur ordre, avec une seule entrée par frame ou par
macrotâche de repli. Son intérêt reste à mesurer. La profondeur, l'âge
de la file et le retard en ticks doivent être rapportés pour exclure
un gain apparent obtenu en affichant un état ancien.

### FIFO natif : amélioration partielle de régularité

Le Main natif reçoit désormais tous les messages dans une file ordonnée.
Une entrée est traitée avant chaque image ; hors rendu disponible, une
macrotâche traite une entrée. Le chargement initial sans renderer conserve
son chemin immédiat. Les réponses, erreurs et checkpoints suivent le même
ordre. Arrêt, remplacement et incident graphique libèrent ou réveillent la
file selon leur contrat. Le client public par défaut reste immédiat.

Le reçu différé est capturé pendant le vrai MessageEvent, avec son Worker.
Les entêtes et les métadonnées de contrôle sont copiés ; World et sidecars
passent les validations A2H complètes. Un reçu sert une seule fois et ne
survit pas à la fermeture de sa source. Aucun nouveau Worker n'est ajouté.

Les comparaisons V5 fraîches utilisent40s par vitesse, même sauvegarde,
caméra, réglages et audio coupé, sans profileur :

| Mesure | A2H témoin | FIFO |
| --- | ---: | ---: |
| ×1 p99 wall |22,6ms puis23,3ms|21,5ms|
| ×1 intervalles>16,7ms |239 puis251|217|
| ×1 intervalle moyen wall |6,54ms puis6,68ms|6,60ms|
| ×3 p99 wall |30,3ms|28,1ms|
| ×3 intervalle moyen wall |8,12ms|8,26ms|
| ×3 intervalles>50ms |2|1|
| ×6 p99 wall |32,6ms|30,8ms|
| ×6 intervalle moyen wall |8,18ms|8,36ms|
| ×6 intervalles>50ms |3|0|
| ×6 débit réel |5,884×|5,829×|

Le gain concerne la régularité de ces relevés. Le débit moyen de rendu
n'augmente pas ; la petite baisse de simulation ×6 reste conservée.
L'adoption Main reste proche de13ms à ×1. Le confort final, les pointes
rares et la cible de débit restent ouverts. RAF et wall mesurent les
callbacks, sans prouver la cadence physique du moniteur ou le temps GPU.

La file atteint une profondeur maximale de1 et finit vide dans les trois
mesures. Le délai maximal réception→adoption est de19,3/23,1/35,4ms en
×1/×3/×6 ; aucune amélioration n'est attribuée à une accumulation d'états.
Les comparateurs recalculent leurs résultats à partir des RAW conservés.

Qualification des cinq sources gelées : typage privé,15contrats Node,
huit contrats natifs Chrome/101assertions, vraie rotation aux trois vitesses,
puis recharge de toute la partie exacte après60RAF en pause. SHA de cette
partie avant/après : `bc22978a4456cc201af643d9cbcfe8a5515a85bcbf5bc8c79a4aa85a2786c107`.
Le contrôle de présentation ordinaire passe minage, abattage et changements
de vitesse en155,915s, sans saut ni occupation solide observés. Son probe
CPU exclut le drain FIFO ; les mesures V5 servent à évaluer la performance.

Le premier run Node18cas échoue sur trois positifs : les MessageEvents de
ce runtime Node ont `isTrusted=false`. L'échec est conservé ; ces assertions
passent ensuite avec de vrais Workers Chrome, sans faux marqueur de trust.
Les fixtures de transport Node utilisent un décodeur explicitement limité
aux checkpoints ; elles ne prouvent pas la validation d'un World.

### Rotation de caméra et cadence des ombres

Le profil natif du Main FIFO en ×1 localise5,800s échantillonnées dans le
rendu, dont3,336s dans les ombres, sur une acquisition de20,944s avec ses
franges. Ces poids ne sont ni des temps GPU ni une comparaison de gain.
Le comptage natif suivant trouve44objets d'ombre rendus à chacune des1518
images en10s : la rotation annule la deadline du réglage existant à60Hz.

La cause est l'appel urgent par défaut de `invalidatePausedShadow()` lors
de tout changement de matrice de vue. Le correctif réserve cette urgence
au premier état, au changement de caméra, de projection, de couches ou de
convention de profondeur. Un mouvement de vue seul invalide toujours le
cache de pause mais conserve la deadline en cours. Résolution2048,
fréquence60, simulation, réserve temporelle et écrêtage restent inchangés.
En pause, une caméra mobile continue de rafraîchir immédiatement l'ombre.

Le cadrage de la caméra d'ombre reste associé à son atlas : Room et
Daylight le changent lors d'une vraie passe. Le comptage après correction
observe599passes pour1535images en10s, soit26356appels CPU d'objets
d'ombre au lieu de66792. Ces appels ne comptent pas les commandes GPU
rejouées dans des bundles et ne suffisent pas à annoncer un gain FPS.

Le contrôle natif Chrome155.0.8059.85 passe : zéro passe en90images fixes
en pause,90passes pendant leur déplacement, image fixe du cache identique
octet pour octet à son recalcul. En marche,39passes sur91images,52images
avec matrices d'ombre tenues, aucune violation ni urgence de caméra pure ;
le changement de projection force une passe avant la deadline. Son et
musique sont coupés. Typage et trois suites ciblées sur les ombres acquis.

Première paire V5 sans profileur,40s par vitesse, témoin FIFO puis candidat :

| Mesure | FIFO | Cadence corrigée |
| --- | ---: | ---: |
| ×1 p99 wall |21,4ms|20,6ms|
| ×1 maximum wall |34,5ms|42,9ms|
| ×1 intervalles>16,7ms |207|189|
| ×1 CPU Chrome total |68,133s|67,898s|
| ×1 FPS callbacks moyens |150,991|152,213|
| ×3 p99 / maximum wall |27,6 /43,3ms|27,7 /66,8ms|
| ×3 intervalles>50ms |0|2|
| ×6 p99 / maximum wall |31,5 /78,7ms|30,1 /74ms|
| ×6 intervalles>50ms |1|2|
| ×6 débit réel |5,853×|5,870×|

Le résultat ×1 est modeste, avec un maximum plus haut. Main reste proche
de12,7ms par adoption ; les pointes accélérées restent ouvertes. Cette
paire ne démontre ni confort final ni gain général. La répétition ×1 dans
l'ordre inverse, candidat puis témoin FIFO, reste comparable : p99
20,7 contre20,9ms, maximum37,5 contre39,4ms,193 contre203intervalles
>16,7ms et aucun>50ms. CPU Chrome64,06 contre68,74s, simulation≈1×.
La régularité s'améliore légèrement dans les deux ordres ; l'ampleur du
gain CPU varie entre les paires et Main reste inchangé. Le correctif est
retenu pour rétablir la cadence, sans annoncer le chantier terminé.

Les premiers essais natifs sont conservés : fixture v98 refusée avant
les oracles, collecte accidentelle des copies de tests archivées, puis
erreur Tint IR dans le canal Chromium historique. Réparer fixture et
collecte puis aligner le canal Chrome sur les mesures principales conserve
toutes les assertions, y compris l'absence d'erreur console. La cause de
l'erreur Tint n'est pas attribuée au correctif ou au canal sans comparaison.

Les sorties détaillées sont dans `tmp/performance-v475/` : paire
`main-camera-shadow-{baseline,candidate}-x1-x3-x6-*`, bilan
`camera-shadow-summary-20261025T0519Z`, comptages
`fifo-shadow-families-x1-url-*` et `camera-shadow-families-x1-*`, natif
`shadow-cadence-native-r4-*`. Rotation rapide, grand angle, bords d'atlas,
nuit et chemin hors Room ne sont pas couverts par ce seul contrôle natif.

Le parcours UI complémentaire passe ensuite en124,523s : douze rotations
rapides, trois séquences de zoom/dézoom amples et deux changements réels
Room off/on, puis les rotations ordinaires en ×1/×3/×6. Les captures loin
sans Room et près avec Room ont été inspectées. Aucune erreur applicative
ou console ; World et RNG sont produits normalement par la simulation.
La sauvegarde entière après ces gestes se recharge exactement après60RAF
en pause : SHA `705ed0250783bf43337744b3fe7a7085c64b40a493396a8ba321057d27038692`,
tick1903/RNG3829763511. Ce parcours couvre les commandes caméra citées,
sans prouver tous les bords d'atlas ou la transition nocturne.

Le typage du produit intégré passe en14,283s et la présentation ordinaire
en155,768s :7492images de minage puis7368d'abattage, sans saut, excès de
trajet continu ni occupation solide. Maxima d'intervalles30,1 et30ms dans
ce parcours préparé, distinct de la charge Éclaircies et de ses pointes.
