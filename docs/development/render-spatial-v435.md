# V435 — lots statiques et révisions du rendu

Cette note rassemble le chantier engagé après V434. La composition22+bulk est
intégrée après comparaison complète des trois références en ×1 et contrôle
complémentaire×3/×6. Les tests ciblés et la présentation sont acquis ; build et
livraison restent en cours. Les autres variantes décrites plus bas restent des expériences privées.
La cible reste200images/s stables sur Les Forges, rotation comprise ; elle n'est
pas atteinte. Le schéma263, la simulation, ses règles et ses sauvegardes restent
inchangés.

## Bilan global avant intégration

Trois paires complètes, même entrée/caméra/options par référence, témoin ROOT V434
exact et candidat22+bulk. Firefox vidéo et stream Discord sont au repos après
confirmation humaine. Les FPS sont1000/intervalle RAF moyen sur les fenêtres
natives10s, sans profiler ni observateur GPU ; une paire courte par référence
ne constitue pas une garantie sur toutes les parties.

| Partie ×1 | FPS fixe V434→V435 | FPS rotation V434→V435 | CPU image fixe / rotation V434→V435, ms |
| --- | ---: | ---: | --- |
| Forges |125,35→137,36|87,28→113,42|5,255→4,707 /7,553→5,810|
| Éclaircies |215,85→217,74|181,13→202,58|3,037→2,708 /4,199→3,589|
| Aulnes |233,41→232,41|221,23→231,32|2,013→1,783 /3,028→2,461|

Le gain est utile en rotation sur les trois contextes, la vue fixe est meilleure
ou proche, mais les maxima restent mixtes. Forges pause217,54→214,57FPS ; Aulnes
fixe−0,43%. Les p99 rotation sont46→45,8 /16,7→16,7 /8,4→8,4ms, les maxima
116,7→129,1 /154,1→150 /20,9→29,1ms. Forges fixe monte91,7→116,6ms et Aulnes
37,6→54,2ms. Aucun freeze supprimé ou200FPS stable n'est revendiqué.

La vitesse physique fixe/rotation reste0,8826/0,9136→0,8819/0,9587× sur Forges,
0,9813/0,9968→0,9809/0,9794× sur Éclaircies et0,9815/0,9806→0,9823/0,9812×
sur Aulnes. L'écart Éclaircies rotation correspond à un tick de borne60→59,
sans preuve d'une régression durable de simulation. Les longues applications
restent ouvertes : Forges17–21ms moyens et Éclaircies11–13ms dans ces relevés.

Les six exports/recharges entiers sont stricts. Les images de même tick/pose
diffèrent de108pixels RGBA sur Forges,303sur Éclaircies et242sur Aulnes, alpha
identique ; écarts maximaux67/79/27sur255. Inspection des scènes Forges/Éclaircies
sans différence étendue visible ; les mêmes écarts clairsemés étaient déjà
présents dans le socle13. Les extensions owned/bulk avaient0pixel différent face
à ce socle. Aucune identité globale de pixels n'est annoncée.

La composition retenue regroupe les géométries statiques par pages résidentes,
copie leurs changements par plages natives, réutilise les arêtes de mouvement
confirmées et les ressources opaques explicitement suivies. Les ombres, la
caméra, les ressources partagées et les cas non reconnus gardent leurs mises à
jour natives. La préparation générale du renderer ne relit plus les propriétés
opaques connues à chaque dessin lorsque leurs producteurs n'ont rien changé.
La portée fermée MAIN et les acquittements après succès préservent les lecteurs
mutables, les reprises, les atlas d'ombres et les sauvegardes.

Preuves des trois paires retenues :
`tmp/performance-v435/qualification-forges-idle01/` (PASS402,139s),
`qualification-eclaircies-idle03/` (PASS322,273s) et
`qualification-aulnes-idle01/` (PASS287,886s). Chaque dossier conserve RAW,
tick/caméra SHA, compteurs, sources gelées et deux recharges entières.
Les comparaisons d'images sont les dossiers homologues `-pixels01` ; leurs
différences n'ont pas été ramenées à zéro par un seuil d'acceptation.

Le contrôle complémentaire `tmp/performance-v435/high-speeds-forges01/` passe
451,796s, mêmes22sources et deux recharges entières. Les vraies vitesses UI sont
×3 et×6, sans palier×4 ; typage du seul pilote complémentaire acquis3,060s.

| Forges, demande UI | FPS fixe V434→V435 | FPS rotation V434→V435 | Physique fixe / rotation V434→V435 |
| --- | ---: | ---: | --- |
| ×3 |127,91→127,48|98,14→99,12|0,9311/1,0289→0,8315/0,9965×|
| ×6 |137,09→151,09|91,83→117,07|0,9987/0,8609→0,9829/0,8938×|

Le ×3 n'est pas amélioré : p99 fixe41,8→49,9ms, rotation49,9→58,2ms ; maximum
fixe129,1→108,4ms, rotation83,4→175ms. Application fixe19,00→21,10ms et
rotation19,89→25,94ms. La baisse physique fixe est conservée ; aucune régression
durable ou cause précise n'est déduite de cette seule paire courte. Le ×6 est
meilleur en images, p99 fixe33,4→33,3ms/rotation45,9→41,7ms, maxima91,7→75,1ms
et145,8→91,6ms ; application18,75→17,86ms et23,83→21,96ms. Il ne tient toujours
pas sa vitesse demandée. La pause de cette seconde paire recule231,61→216,56FPS,
CPU2,2807→2,5617ms. Un inventaire natif après les fenêtres ne relève que Discord
0,089cœur parmi les activités utilisateur significatives ; aucune activité vidéo
concurrente n'est ainsi démontrée pour expliquer ces réserves.

La sélection privilégie explicitement le ×1 demandé par l'utilisateur : rotation
meilleure sur les trois références et gain×6 utile, contre pause/maxima mixtes
et×3 non amélioré. Ce bilan est jugé utile pour livraison, **pas une garantie
universelle de non-régression ni une correction des freezes**.

Les contrats privés acquis par reprises restent distincts des tests pérennes
après copie. Les22sources et13fichiers tests/helper intégrés sont des copies
SHA exactes de la composition qualifiée, sans les exports injectés des pilotes.
Typage produit PASS14,235s et groupe pérenne PASS24,470s :34cas du socle
acteur/arène,6cas de copie bulk et26cas de producteurs et ressources opaques,
soit66cas en12fichiers et un helper. Les8nouveaux cas de flux d'acteurs sont
donc désormais acquis sur leurs vrais imports produit. Aucun test complet ou
campagne naturelle longue n'est annoncé.

## Budget réellement observé

Chrome155 natif, Ryzen5 3600/RX5700XT, 2560×1440/DPR1, écran240Hz. Forges RAW335
exact, 80 colons/241 animaux, caméra inclinée V432 et vrai glisser droit
erratique, 300 pas par cycle nominal3,3s pendant au moins10s. Réglages équilibrés,
textures/herbe/pièce/diorama/occlusion actifs ; audio coupé. ROOT seul exécute
les contrôles lourds, successivement. Les autres agents préparent des copies
privées ; les sources servies restent V434/HEAD79df0af6.

Le profil GPU instrumenté `tmp/performance-v435/render-profile/run02` est acquis
avec 216 images entièrement couvertes : moyenne6,0746ms, médiane4,7048,
p959,7746 et maximum10,6696ms. Le passage monde vaut4,3986ms en moyenne,
les ombres0,9826, le fond de pièce0,2660 et les autres passages0,4274ms/image.
Les deux passages étiquetés MAIN utilisent la même caméra ; ils ne démontrent
pas deux dessins du monde. Aucun temps GPU par famille n'a été mesuré.

Timber soumet560552 triangles dans le monde et autant dans les ombres.
Box et nature constituent également de gros ensembles. Le relevé complet,
les shaders réellement dessinés et les descriptions des géométries sont dans
`cached-draw-inventory.json` et `render-gpu-orbit.json` du même run. Ce budget
instrumenté n'est pas un benchmark FPS natif ; sa moyenne dépasse déjà les5ms
visées pour une image à200FPS.

## Variantes et décisions provisoires

Les chiffres suivants sont les mesures natives sans profil CPU ni census.
Les changements de FPS ne valent pas causalité marginale robuste sur une seule
paire. Les vitesses physiques et longues images sont conservées dans les RAW.

| Variante | Pause fixe | ×1 fixe | ×1 rotation | Décision |
|---|---:|---:|---:|---|
| V434, référence fraîche initiale |231,87|132,20|103,09|témoin séparé|
| V434, témoin de la paire programmes |221,61|127,81|87,78|paire acquise|
| Programmes monde privés v1 |225,12|97,12|89,47|insuffisant, non retenu|
| Regroupement ordinaire initial |219,82|118,55|12,92|régression majeure, rejeté en l'état|
| Regroupement résident corrigé |209,11|124,54|96,28|copies bornées, gain général non établi|
| Plages Timber indirectes |220,41|102,83|84,43|culling réel, gain général non établi|
| V434, témoin contemporain prépass |230,11|121,30|98,78|témoin du prochain essai|
| Prépass profondeur Timber |239,20|121,55|90,43|gain GPU isolé, insuffisant et non retenu|
| Plages Timber directes natives |232,81|98,00|87,32|soumission réelle acquise, non retenu seul|
| Couverture de l'atlas terminé |229,12|104,01|93,88|travail ombre réduit, gain global non établi|

La paire programmes est acquise dans `tmp/performance-v435/render-pair-run01`
(deux exports/recharges entiers stricts). L'identité lexicale exacte des classes
MAIN/Core/Renderer/Context est vérifiée, y compris les queries HMR. Le propriétaire
worldspace est contrôlé hors fenêtres sur tous ses consommateurs et ancêtres,
y compris les meshes cachés/vides. Le petit gain en rotation n'est pas présenté
comme une amélioration générale : la vue fixe régresse nettement.

Le regroupement ordinaire est un essai de rendu exploratoire
(`tmp/performance-v435/batching-native02`), sans qualification finale de recharge.
Il réduit52 objets à6 préparations graphiques, en conservant les draws natifs.
Le CPU image de pause descend2,959→2,294ms, mais la caméra déclenche des
reconstructions globales :103 reconstructions,5459 copies et7,183Go copiés
cumulés au dernier checkpoint. La visibilité des pièces du diorama change
pendant l'orbite ; le prototype confond cette visibilité avec l'appartenance
résidente d'une famille. Un PASS des contrats du pilote ne valide donc pas sa
performance. Le correctif est préparé séparément, sans effacer cette régression.

## Travail ouvert

La sélection de plages spatiales Timber conserve deux Mesh/RenderObjects et
les attributs/shaders/indices existants. Les instances sont rangées par zones
au changement de contenu ; seules les bornes de zones sont visitées en caméra.
Des commandes indirectes MAIN/ombre distinctes préservent les casteurs hors
champ et les rendus imbriqués. La structure des commandes, la restauration, la
croissance, les poses/pigments/ordinaux/prévisualisations et le repli matériel
sont qualifiés par six contrôles ciblés. Le device réel accepte firstInstance ;
les deux buffers sont bien distincts et seulement deux rebuilds sont observés.
Dans la pose de référence, MAIN passe de560552 à280800 triangles, les ombres à532436.
Ce retrait de sommets hors champ n'enlève pas les fragments visibles ; aucun
gain global n'est établi. Les compteurs Three ordinaires ne décrivent pas ces
plages indirectes. Reçu `tmp/performance-v435/timber-native02` ; sa fenêtre GPU
force explicitement les ombres en pause, hors fenêtres natives.

Le correctif résident est acquis dans `tmp/performance-v435/resident-native01`
après douze contrôles ciblés et typage du Core cohérent. Les copies cumulées
restent338Mo au dernier checkpoint, au lieu7,183Go ; les changements de caméra
n'imposent plus les reconstructions globales. La comparaison native est mixte,
avec un maximum304,3ms en rotation. La réduction des copies ne vaut donc pas
qualification de confort ou permission de publier cette variante seule.

Les programmes opaques v2 restent une autre variante privée : constantes
opacité/émission par contexte, couleurs/maps et propriétés physiques natives.
Typage acquis ; quatre cas acquis après correction de l'oracle distinguant
emissiveNode natif null sur Standard et absent sur Lambert. Aucun gain annoncé.

Le prépass (`tmp/performance-v435/prepass-native01`, deux bras exploratoires)
réduit le GPU de pause forcée4,3384→3,9875ms, environ8,1%. Cette fenêtre séparée
force les ombres et ne fournit pas de FPS natifs. En jeu, le ×1 fixe ne progresse
pas significativement et l'orbite régresse. Les deux captures335 de même pose
diffèrent de939916pixels RGBA, maximum62 ; l'inspection montre une variation
d'éclairage sur le monde, sans cause attribuée à ce stade. Le prototype n'est
donc pas qualifié visuellement. Sept contrats et typage sont acquis ; ils ne
remplacent ni les pixels ni les mesures natives.

La variante directe (`tmp/performance-v435/direct-native01`, exploratoire)
réemploie les mêmes plages spatiales, mais sans buffer de commandes GPU.
Le véritable `currentPass.drawIndexed` est intercepté :13820objets/appels source
à la fin de la pause, zéro repli et zéro signature refusée. La baisse des sommets
hors champ est réelle ; les compteurs Three restent ceux de l'appel entier.
Six contrats, typage et screen natif sont acquis. Le ×1 fixe descend98FPS avec
débit physique0,748× ; l'orbite87,32FPS/0,930×. Aucun avantage général sur
l'indirect ni cause de pilote GPU ne sont établis. Ces plages ne sont pas
retenues seules ; les sources produit restent inchangées.

La couverture de l'atlas terminé (`tmp/performance-v435/coverage-native01`)
conserve la fréquence60Hz et toutes les urgences métier. Elle ne retire l'urgence
caméra que si l'intersection exacte vue/prisme physique entre entièrement dans
la projection de la dernière ombre terminée, biais et filtre inclus. Sur l'orbite,
969requêtes dont406acceptées produisent720captures supplémentaires, avec563refus
de couverture. Le travail redondant est réduit, mais le relevé93,88FPS ne permet
pas de retenir cette variante seule. Sept contrats géométrie/cadence/pause et
typage sont acquis ; l'essai reste exploratoire, sans nouvelle recharge finale.

La piste principale suivante est un compilateur résident de géométries statiques
déjà exprimées en coordonnées monde. À la différence du regroupement BatchedMesh,
il doit réellement réduire les soumissions natives en concaténant les buffers
compatibles. Matériaux, textures, vent, abattage, exploration et sources physiques
restent sous leurs propriétaires actuels ; pages et patches appartiennent au
compilateur. Préparation privée engagée, aucun gain ni livraison acquis.

## Diagnostic de marge GPU, hors sélection produit

`tmp/performance-v435/sampling-native01` compare le renderer4échantillons original
à une copie privée mono-échantillon, donc **avec qualité de contour changée**.
La fenêtre GPU de pause forcée passe4,3555→3,6203ms (−16,9%) et le monde
3,3409→2,7336ms. Pourtant, les fenêtres natives ×1 fixe122,05→124,60FPS et
rotation100,82→98,48FPS ne montrent pas d'amélioration substantielle. Les CPU
image sont5,3248→5,3355ms et6,7110→6,8270ms ; la physique fixe vaut0,898× des
deux côtés. L'application fixe17,46→17,51ms reste comparable.

Ce diagnostic renforce la priorité de préparation CPU ; il ne livre pas un mode
graphique ni un gain à qualité égale. Le lissage produit reste inchangé. Une
calibration ROOT contre copie Core strictement identique est également engagée
pour distinguer variance et éventuel coût du protocole de variantes.

La calibration identique initiale (`identity-native01`) montre102,57→123,30FPS
fixe et85,67→100,19 en rotation malgré les mêmes octets Core et états d'entrée.
L'application et le Worker varient aussi ; aucun effet d'injection ou cause
matérielle n'est isolé. Les petits écarts des essais antérieurs ne permettent
donc pas une attribution causale au candidat.

Le pilote commun ajoute ensuite2s de vrais rendus d'ombre en pause335, pour
chaque bras, sans timestamps ni avancer la simulation. L'échauffement est
explicitement hors fenêtres et acquis avec des passes réellement terminées.
La calibration distincte `identity-warm-native01` passe :129,79→125,75FPS fixe,
102,36→102,16rotation ; écarts observés−3,1%/−0,2%, physique fixe0,899/0,897×.
Ce témoin ne transforme pas les essais précédents en gains ou régressions
causaux. Le protocole chauffé est désormais figé pour sélectionner les nouvelles
variantes ; aucun nouveau résultat200FPS n'est acquis.

## Compilateur statique et blocs résidents

Le premier compilateur statique ordinaire est contrôlé dans
`tmp/performance-v435/compiler-native01`, après typage et neuf contrats ciblés.
Il conserve les objets matériaux et les shaders d'origine, concatène seulement
des géométries compatibles déjà exprimées en coordonnées monde, et réduit
réellement les dessins natifs :108→85 en pause335. Quarante sources sont
compilées en trois pages ; les primitives actives compilées et sources restent
égales. Aucun changement de simulation ni de sauvegarde.

Le CPU image en pause descend2,4367→1,9709ms (environ19%). En ×1, l'application
reconstruit cependant une grande page de forêt dès qu'un seul morceau est
remplacé :65,13Mo copiés initialement,137,64Mo cumulés après le fixe,265,19Mo
après l'orbite. Le fixe passe128,45→124,95FPS et la rotation100,49→101,22 ;
application17,46→21,95ms et20,25→24,07ms. Les maxima149,9ms restent rouges.
Cette réduction du coût de préparation ne constitue donc pas un gain général.

Le GPU de pause forcée passe4,3305→4,5374ms, principalement dans le monde
3,3170→3,5235ms. Les pages globales soumettent davantage de primitives dans
cette pose (2232636→2364176 sur le compteur natif). Le compilateur n'est pas
retenu en l'état. La refonte suivante conserve des allocations stables par
morceau, avec patches locaux et familles spatiales bornées, pour éviter à la
fois les recopies globales et de trop grandes bornes de visibilité.

Une revue a également identifié un défaut privé d'acquittement : une
notification locale de recul d'abattage pouvait acquitter la version globale
d'un attribut et masquer une croissance antérieure dans un autre morceau du
même buffer. La réparation sépare notification partielle et acquittement de
toutes les plages en attente. Les anciens gels et mesures sont préservés ;
aucun de ces prototypes n'a été intégré ou publié.

Deux pistes complémentaires sont préparées séparément : observateur natif
délégué avec dépendances partagées (typage et16contrats acquis), et réutilisation
des commandes GPU opaques après préparation native (typage et20contrats
acquis). La première tentative native de commandes s'est arrêtée avant toute
fenêtre de mesure sur une erreur de pilote appelant une méthode privée de même
nom qu'une métrique. Ce pilote utilise maintenant explicitement l'accesseur
public déclaré. Aucun FPS n'est attribué à cet essai interrompu.

La reprise `commands-native02` est acquise en113,844s : les commandes sont
effectivement rejouées, zéro repli tardif et zéro exception. Pause230,61FPS,
fixe132,58 et rotation96,58 ; CPU fixe5,0269ms et rotation6,9541ms. L'orbite
change fréquemment l'ordre opaque : sur cette fenêtre, environ1053 relectures
et1106 reconstructions supplémentaires. Aucun gain général substantiel n'est
établi ; ce backend seul n'est pas sélectionné.

`observer-native01` passe les contrôles du pilote en116,924s mais ne qualifie
aucune accélération : les84états compilés restent tous refusés « unknown-graph »,
FULL/SHARED zéro. Les FPS120,70fixe et93,19rotation ne sont donc pas attribués
au partage attendu. Le scanner ne couvre pas encore plusieurs classes natives
réelles présentes dans le census ; diagnostic et correctif sont préparés dans
une nouvelle copie. Le pilote exige désormais une voie SHARED effectivement
atteinte avant de laisser débuter une fenêtre native. Ce durcissement de pilote
est distinct du produit, et son typage est acquis.

La comparaison de pixels du premier compilateur est également conservée :
75pixels RGBA différents sur2560×1440, maximum67/255, alpha identique
(`compiler-pixels01`). Inspection du diff : points très épars dans le décor,
sans variation globale comparable au prépass rejeté. L'identité des matériaux
ne prouve pas une identité de rasterisation après changement d'ordre opaque ;
la version finalement sélectionnée devra être comparée à nouveau.

## Arène et admission réellement exécutées

La copie à blocs résidents `static-scene-arena` est acquise après typage et
18contrats. Son premier lancement natif s'arrête avant les fenêtres sur une
dépendance originale non déclarée dans le graphe QA ; l'ancien échec est
conservé. La reprise `arena-native02` passe118,735s, voie effectivement active :
sept pages, sept constructions initiales, aucune nouvelle construction,
croissance de buffer ou relocation pendant les fenêtres ×1. Deux remplacements
locaux après le fixe, dix cumulés après l'orbite. Copies cumulées65,13→73,72→94,79Mo,
contre265,19Mo avec les premières pages globales ; mêmes372478triangles actifs
sources/pages. Les compteurs d'offres aux caméras ne sont toujours pas présentés
comme des soumissions GPU réussies.

Pause223,53FPS/CPU1,9638ms ; fixe133,39/CPU4,8347, débit physique0,914× ;
rotation108,81/CPU6,0875, débit0,996×. Application17,58/20,24ms, pire RAF112,5ms
en rotation. Ce screen exploratoire est structurellement meilleur mais son
gain global reste modeste face aux témoins chauffés128–130/102FPS. Pas encore
de sélection produit, de nouvelle preuve GPU ou de recharge entière finale.

La correction de scanner `observer-native02` atteint réellement79plans et
SHARED, avec cinq états refusés. Le contrôle passe115,815s, mais le coût régresse :
pause227,71FPS/CPU3,0469ms ; fixe108,39/6,3187 ; rotation81,46/8,4227.
Le ×1 physique vaut0,915/0,977×. Le prototype est rejeté en l'état.
Sur la fenêtre de pause,29des39états dessinés n'ont jamais produit SHARED,
alors que chaque état paie deux inspections communes par rendu. Environ2,70millions
de lectures communes et10,68millions de lectures de ressources ont lieu sur
cette seule fenêtre. La reprise en préparation sélectionne les consommateurs
réellement partagés et suit la signature native de texture, plutôt qu'une
inspection défensive de dizaines de propriétés immuables. Aucun gain attribué
à cette reprise non encore mesurée.

L'analyse complémentaire du même profil CPU ne lance pas un nouveau benchmark.
Les branches disjointes donnent rendu4106,938ms, application1046,203, reste de
frame1253,956, hors frame4856,785, sur11263,882ms non négatifs ; anomalie−0,476ms
toujours séparée. Dans le reste de frame, les acteurs prennent740,445ms,
dont543ms environ de suivi/choix d'endpoints et185,900ms de capture d'animation.
Les164,163ms de MotionTimeline.segment sont déjà incluses. Une responsabilité
de présentation des acteurs est préparée à l'adoption et aux frontières
confirmées, avec repli public mutable ; la cadence d'animation et les captures
selon caméra ne sont pas supprimées. Il s'agit d'un travail ouvert, sans gain.

## Composition décor–acteurs et diagnostic du bois

`actor-playback` passe le typage et31contrats ciblés (37,271s pour les tests),
après correction typée de motion:null ; le refus initial et l'ancien gel sont
conservés. Les oracles comparent les buffers actifs aux producteurs originaux,
avec pistes interrompues/corrigées, origine1024, même World réappliqué,
portages/handoffs et voie publique mutable. Le contrôle complet de présentation
reste requis pour une sélection produit. La composition privée de13modules
reconstruit exactement le hunk Core acteurs puis l'applique à l'arène ; typage acquis.

La paire native `arena-actor-native01` passe225,417s, sources gelées et même
RAW335/caméra/échauffement. Les325acteurs sont observés et les raccourcis
progressent réellement ; l'arène reste active avec ses sept pages.

| Fenêtre ×1 | V434 contemporain | Arène + acteurs | CPU image avant→après |
|---|---:|---:|---:|
| Fixe |125,10FPS|144,10FPS|5,1732→4,4060ms|
| Rotation erratique |93,17FPS|110,68FPS|7,1018→5,8727ms|

Gains moyens de cette paire : environ15,2% fixe et18,8% rotation. Le p99 RAF
passe45,8→37,5ms fixe et54,2→45,9ms en rotation ; le maximum de rotation
reste défavorable99,9→116,7ms. L'application moyenne reste18,46→17,85ms fixe,
19,77→21,22ms rotation. Débit physique0,883→0,914× et0,945→0,979× ; aucun
gain de simulation séparé n'est attribué au rendu. Ces screens exploratoires
ne comportent pas encore la recharge finale entière de la composition et
n'établissent toujours pas200FPS stables.

Le dernier observateur générique `observer-native03` est effectivement utilisé
(12plans), mais rejeté :230,61FPS pause/CPU2,5578ms ;122,05fixe/5,5190 ;
85,95rotation/7,7227. La signature plus petite et les lectures beaucoup moins
nombreuses ne compensent pas ses propres vérifications. Aucun quatrième
scanner générique n'est engagé. Une éventuelle voie de dépendances journalisées
serait une nouvelle responsabilité de producteurs, pas un gain acquis.

Le diagnostic distinct `gpu-family-ablation/run01` passe170,589s : six fenêtres
timestamp entièrement couvertes, familles réellement absentes, flags et ombres
restaurés, export/recharge335 entiers exacts. Dans cette pose, le retrait du bois
fait passer MAIN3,5001→2,5121ms ; le témoin final restauré vaut3,3248ms.
La différence marginale se situe donc autour0,8–1ms selon le témoin. Les autres
retraits donnent MAIN2,9658(Box du seul view.boxes),3,0279(nature) et3,0618(acteurs).
Ces différences sont non additives : retirer une famille change l'occlusion.
La dérive du témoin est conservée, aucun coût isolé par famille ni FPS déduit.

La lecture du prépass bois rejeté identifie un vrai défaut : il conservait
autoClearDepth=false pendant MAIN. Le reset natif d'ombre ne remet qu'autoClear,
donc l'ombre suivante chargeait sa profondeur antérieure. L'hypothèse d'une
conversion HDR intermédiaire est écartée par la source r186. Une réparation
étroite préserve maintenant le clear natif et garde RoomOFF natif ; sa conformité
visuelle et son gain restent à mesurer. Les deux refus de typage de ce pilote
(syntaxe import du test puis ancien typage Scene du quatrième argument callback)
sont distincts du défaut produit et conservés avant reprise.

La reprise typée passe8,323s et les dix contrats passent22,136s. L'oracle
appelle les vrais ShadowNode/RendererUtils/Background r186 : l'ancien état
charge la profondeur d'ombre, le nouveau la remet à zéro. Le callback vérifie
le vrai RenderTarget reçu à l'exécution, avec repli natif pour les cibles et
moteurs non pris en charge. La composition décor–acteurs–prépass passe aussi
le typage7,275s. Ces contrôles ne remplacent pas la comparaison native des
couleurs, du coût et de la recharge entière, encore en cours.

La paire complète `triple-native01` passe411,713s, avec les deux exports et
recharges entières. Le prépass corrigé est bien exécuté ; son image ne diffère
du témoin que des mêmes108pixels déjà observés avec l'arène, maximum67/255,
alpha identique. La variation globale des ombres est donc absente de cette
capture335. Le GPU forcé pause baisse4,3511→4,0589ms (couverture1), mais la
composition donne fixe126,99→127,54FPS, rotation90,69→105,03FPS. CPU image
5,2097→5,0167ms et7,3476→6,1814ms ; application16,36→18,56ms et20,17→20,71ms.
P99 rotation54,2→45,9ms, maximum112,4→120,8ms. Physique0,898→0,913× fixe,
0,962→0,980× rotation. **Le prépass n'est pas sélectionné** : malgré son
économie GPU, il ne conserve pas le gain fixe de la composition13modules.
La sélection provisoire revient à l'arène et aux acteurs, sans prépass.

Le pilote des références passe le typage3,303s ; son premier lancement est
refusé avant tout test2,902s pour l'import JSON sans attribut Node24.
Ce refus de pilote est conservé, sans résultat FPS. Le pilote CPU post-refonte
passe séparément le typage2,884s, sans exécution navigateur à ce stade.

## Qualification provisoire des13modules

Un deuxième refus du pilote provient de la découverte récursive de son ancien
`native.spec.ts` archivé, avant tout test. L'archive reste conservée et est
explicitement exclue. Typages des reprises3,017/3,018s acquis. La reprise
Forges `final-forges03` passe500,029s, sept fenêtres par bras et deux recharges
entières strictes. Ce relevé plus tardif donne un gain ×1 plus petit que le
premier screen ; les deux sont conservés.

| Fenêtre | V434 contemporain | Arène + acteurs | CPU image avant→après | Physique avant→après |
|---|---:|---:|---:|---:|
| ×1 fixe |130,29FPS|142,36FPS|5,0048→4,4369ms|0,899→0,898×|
| ×1 rotation |92,45FPS|99,70FPS|7,0429→6,4066ms|0,977→0,943×|
| ×3 fixe |135,49FPS|151,66FPS|4,8612→3,9254ms|0,997→0,998×|
| ×3 rotation |96,40FPS|113,62FPS|6,8519→5,7533ms|0,912→0,896×|
| ×6 fixe |140,68FPS|136,77FPS|4,6908→4,4756ms|0,963→0,862×|
| ×6 rotation |103,23FPS|116,26FPS|6,4824→5,4520ms|0,946→0,946×|

Ces vitesses physiques sont observées par rapport à ×1, pas normalisées par la
vitesse demandée. Ni ×3 ni ×6 ne sont tenus. P99 ×1 fixe41,6→37,5ms,
rotation58,3→54,2ms ; maximum108,3→91,7ms fixe et137,6→116,8ms en rotation.
Le maximum de rotation ×6 régresse79,1→166,6ms. Le coût d'application reste
18,00→17,95ms fixe,21,03→22,23ms rotation ×1 : blocages denses non résolus.

Les34cas produit indépendants passent23,821s après typage7,772s sur une copie
cohérente dont les13sources correspondent exactement au manifeste retenu.
Ils ne comparent pas deux copies de la même implémentation. Les anciennes
comparaisons original/candidat restent des preuves privées distinctes.

`final-aulnes01` passe317,303s avec recharges entières. Les bras sont identifiés
par `comparisonArm`, jamais par l'ordre alphabétique des dossiers : fixe
227,92→230,52FPS, rotation198,55→220,84FPS ; CPU2,5891→2,2443ms et
3,5011→2,9355ms. Physique0,982→0,982× fixe,0,981→0,980× rotation.
P99 rotation12,6→12,5ms, maximum33,3→33,4ms ; le maximum fixe régresse
45,8→75,0ms. La comparaison des pixels a d'abord refusé un nom de capture
Forges employé à tort : aucune image ni mesure n'est fabriquée par ce refus.

`final-eclaircies01` passe340,133s avec les deux exports/recharges entiers.
Le témoin V434 donne222,21FPS fixe et192,80rotation ; les13modules donnent
210,05 et175,66FPS. CPU2,8697→2,9476ms et3,9481→4,1831ms ; application
11,05→14,34ms et10,67→14,07ms. P99 rotation16,7→20,9ms et maximum
145,8→208,4ms. La physique reste0,981× environ. Ce relevé défavorable est
conservé : les13modules ne sont pas une sélection universellement acquise.
Les captures Aulnes et Éclaircies diffèrent respectivement de242/303pixels RGBA,
maximum27/79, alpha identique ; les différences sont ponctuelles dans le décor.

Le screen distinct `eclaircies-arena-choice01` passe217,809s et compare exactement
les13modules à la voie acteurs seule, sans recharge finale revendiquée. Ici,
les13modules donnent212,73FPS fixe et195,30rotation ; acteurs seuls213,74 et
134,53FPS. CPU rotation3,6697→5,4720ms. Retirer l'arène détériore donc cette
rotation. Le même13modules donnant175,66 puis195,30FPS dans deux campagnes,
la variabilité native reste explicite ; la régression précédente ne justifie
ni une cause inventée ni une désactivation aveugle de l'arène.

Un nouveau prototype privé de révisions des producteurs Box/Timber est préparé,
distinct des trois scanners rejetés. Il conserve les shaders et les updates de
caméra/lumière natifs, avec FULL initial/dirty et SHARED entre commits, admission
fermée et acquittement par RenderObject seulement après succès. Les26contrats
sont acquis par reprises :11producteurs/Core, puis8compilation/durée de vie,
puis7ressources et redimensionnement natif. Les refus intermédiaires restent
conservés : typages/archives, contexte incomplet du vrai builder WGSL, génération
bool native, puis comparaison de la méthode TextureNode.updateReference.
Cette dernière était un vrai défaut du validateur, corrigé sans admettre les
ressources inconnues. Dernier typage7,772s et reprise des7cas1,402s.
Le manifeste gelé vaut571fb3806c09b36ec34247f70accd8c027ca4962b5d6d59ac5902daf7faeb84d.
La mesure native est en cours, aucun gain acquis ; ombres, arène et public
mutable restent natifs. Ce travail n'est ni intégré ni sélectionné.

Un candidat distinct conserve les mêmes volumes d'arène mais remplace les
boucles JavaScript par sommet/composant par des copies natives de plages.
Les coins conservent exactement leurs mots Float32 et leur ordre logique ;
les nouveaux indices s'ajoutent sans déplacer les anciens slots. Aucun patch
partiel n'acquitte une version globale.24cas sont préparés, non exécutés à ce
stade ; revue bornée sans défaut identifié. La préparation du graphe puis
le typage14,309s et les24cas31,317s passent. Le micro CPU120000sommets,
deux échauffements/huit passages alternés, vérifie les coins hors chronométrage :
copie complète moyenne1,4561→0,2058ms, remplacement3,0300→2,3726ms,
patch épars0,2404→0,0071ms puis reconcile0,2908→0,0447ms.
Ce banc synthétique n'établit pas de gain FPS natif.

`bulk-native-eclaircies01` passe230,481s, screen explicite sans dernière
recharge entière revendiquée : les13modules donnent181,73FPS fixe et165,12
rotation,13+bulk195,06 et170,72. CPU3,8622→3,4908ms et4,3775→4,2515ms ;
application17,67→16,30ms fixe,14,31→14,24ms rotation. P99 rotation25→20,9ms,
maximum220,9→166,5ms. Physique0,996→0,980× fixe,0,980→0,998× rotation.
Pause228,32→239,50FPS/CPU2,8122→2,4050ms : cette variation sur une fenêtre
où les copies sont peu actives rappelle la limite causale du seul relevé.
Le candidat ne démontre pas un gain massif de confort ni200FPS stables.

`owned-native01` est refusé201,023s avant les fenêtres du candidat : le pilote
attend une requête runtime pour OwnedOpaqueRevisionRegistry435, alors que le
module ne déclare qu'une interface et disparaît légitimement lors du transpile.
La réparation doit geler ce fichier de types sans fabriquer une importation
runtime. Elle conserve22sources qualifiées,21modulesruntime et1interface
effacée, ainsi que49imports de types résolus vers les sources gelées. Typage du
pilote3,337s acquis ; `owned-native02` est lancé sur le même candidat produit.
Le témoin13 seul100,44FPS fixe/81,89rotation du refus ne constitue pas une
paire ni un gain. Sa physique0,713/0,778× et son CPU6,3924/7,7729ms sont aussi
moins bons que les relevés précédents. Un inventaire système distinct entre
contrôles relève Firefox utilisant environ un cœur CPU et5,4Go de RAM physique
libres ; il ne prouve pas la cause de cette variation. Le relevé sandbox limité
aux processus du shell n'est pas un inventaire système valable.

Le pilote CPU sur composition privée passe son typage4,164s et ses8cas de
lecteurs1,360s. Il permettra de conserver un profil frais après sélection sans
intégrer prématurément un candidat dans les sources produit. Aucun profil neuf
n'est encore acquis à ce stade.

`owned-native02` passe245,116s sur le produit22 inchangé après réparation du
pilote. Face aux13modules contemporains, ×1 fixe102,02→122,75FPS,
rotation79,40→93,44FPS ; CPU6,4304→5,1504ms et8,1345→6,7676ms.
Physique0,582→0,731× fixe et0,678→0,813× rotation. Application27,12→22,40ms
et29,91→26,70ms. P99 fixe54,2→50ms, rotation62,5→54,1ms ; maximum125→104,2ms
et150,1→154,1ms. Pause225,71→220,74FPS etCPU2,2651→2,5662ms : régression
conservée. Les programmes sont réellement admis (5plans,169926SHARED en fin
de rotation). Les deux captures paused335 ont0pixel différent. La comparaison
13/13+bulk sur Éclaircies a également0pixel différent. Ces résultats ne sont
pas une paire ROOT V434/lot complet.

La demande humaine du19octobre au soir impose de juger le bilan global avant
commit. Aucune intégration n'est donc effectuée sur la seule hausse Forges.
La composition privée22+bulk conserve tous les fichiers22 exacts, en remplaçant
uniquement le compilateur par le bulk qualifié. Le nouveau pilote reprend les
contrôles de référence et la réparation des types effacés ; son témoin est
ROOT V434 exact,1766sources égales au gel initial. Typage4,369s acquis,
comparaison stricte Éclaircies lancée, puis Forges/Aulnes à traiter séparément.
La sélection reste ouverte ; le gain global et la livraison ne sont pas acquis.

`qualification-eclaircies01` passe356,750s fonctionnellement (deux exports et
recharges entiers), mais son bilan performance est défavorable : ROOT V434
205,55→156,24FPS fixe et181,30→127,05rotation face à22+bulk. CPU3,3556→4,6058ms
et4,0971→5,7321ms ; application13,62→19,64ms et12,41→17,38ms. La pause régresse
239,90→196,20FPS/CPU2,2656→3,8488ms. L'owner est réellement admis :25meshes,
4plans acceptés, aucun refus de compilation. Les triangles pause sont exactement
1169544 dans les deux bras, les draws112→79 ; ce seul regroupement ne prouve
donc pas un bénéfice. Les moyennes rotation ont1629732→1664933triangles (+2,2%).

Un inventaire système séparé après la campagne relève Firefox environ1,8cœur
CPU (dont un nouveau processus1,05cœur), contre environ1cœur précédemment.
Cela ne démontre pas la cause du recul. Le résultat rouge reste conservé et
le candidat n'est pas intégré. Une demande humaine de mise au repos de Firefox
est ouverte ; la contre-épreuve `qualification-eclaircies-reverse02` reprend
exactement les mêmes sources dans l'ordre candidat puis ROOT, avec cette
réserve de charge ambiante, sans protocole ou assertion relâchée.

Le collecteur de vrais programmes d'un rendu pausé après le profil CPU reste
distinct des fenêtres mesurées : aucun programme fabriqué, hooks retirés en
finally, familles par identité et cas non observés listés. Premier typage refusé
3,718s pour un paramètre diagnostique implicitement any ; reprise typage3,200s
et3cas de cycle de vie1,082s acquis, anciens8lecteurs inchangés. Le pilote est
ensuite adapté aux trois références SHA acquises, sans encore être exécuté.
Les corrections de pilote n'accordent aucun nouveau gain produit.

La contre-épreuve inverse02 est interrompue et **hors qualification** : la
confirmation humaine de mise au repos de Firefox intervient entre ses bras.
Les fenêtres candidat partielles restent conservées, sans comparaison avec un
témoin ultérieur ; reçu `ambient-change-interruption.json`. Seul le sous-arbre
du processus de ce contrôle privé est arrêté. L'inventaire suivant ne relève
plus Firefox parmi les premiers consommateurs. L'utilisateur précise ensuite
qu'un stream Discord reste actif ; une demande de suspension de ce seul stream
est ouverte pour la future paire FPS propre.

Le dernier typage du pilote multiréférence passe3,279s. Le profil CPU distinct
du candidat22+bulk sur Éclaircies passe138,371s, avec les réserves de charge
ambiante et sans aucune revendication de gain FPS. Les11364,379ms échantillonnées
sur1392images se partitionnent sans delta négatif : rendu5669,283ms, application
925,833ms, reste de l'image834,484ms, UI370,943ms, bridge259,467ms et pointeur
108,946ms ; les autres branches incluent le temps programme non attribuable.
Le rendu vaut4,073ms/image, dont1,043ms d'ombres,2,017ms de dessin hors ombres,
0,364ms de matrices hors ombres et0,649ms d'autres travaux du renderer.
Les uniformes/bindings/mises à jour natives restent devant les matrices.
L'application instrumentée prend17,142ms en moyenne sur55appels, p9527,6ms,
maximum32,3ms. Les67adoptions prennent2,799ms en moyenne. L'union des hooks et
vérifications propriétaires ne vaut que101,256ms,0,89% du profil ; aucun effet
JIT indirect n'est établi. Le zéro d'ombres du lecteur par producteurs est un
défaut de matcher face au bundle Three, pas une absence de coût d'ombres.

Après confirmations humaines de mise au repos de Firefox puis du stream Discord,
`qualification-eclaircies-idle03` passe322,273s, avec les deux exports/recharges
entiers stricts. ROOT V434→22+bulk : fixe215,85→217,74FPS, rotation181,13→202,58 ;
CPU3,0375→2,7077ms et4,1994→3,5886ms. Pause239,70→239,81FPS/CPU2,3054→2,0685ms.
P99 rotation16,7ms inchangé, maximum154,1→150ms ; le maximum fixe33,4→37,4ms
reste moins bon. Application fixe11,33→12,87ms et rotation10,90→11,74ms : cette
branche n'est pas améliorée par ce lot. Physique fixe0,9813→0,9809× et rotation
0,9968→0,9794×. Ce résultat favorable aux images ne démontre ni200FPS stables,
ni la cause exclusive des rouges précédents. La qualification du même lot sur
Forges puis Aulnes reste requise avant sélection. Les sources produit restent
ROOT V434. Aucun commit ni déploiement V435.

`qualification-forges-idle01` passe402,139s, même lot22+bulk/témoin ROOT V434,
avec les deux exports/recharges entiers stricts. Fixe125,35→137,36FPS,
rotation87,28→113,42 ; CPU5,2551→4,7069ms et7,5533→5,8096ms. Physique fixe
0,8826→0,8819×, rotation0,9136→0,9587×. P95 rotation33,3→25,1ms, p9946→45,8ms,
mais maximum116,7→129,1ms ; fixe p9941,6ms inchangé et maximum91,7→116,6ms.
Les intervalles>50ms sont5/1254→6/1373 fixe et6/875→8/1137 rotation ; leurs
proportions restent proches (0,40→0,44% et0,69→0,70%), sans effacer les maxima.
Application17,25→18,52ms fixe et21,86→21,08ms rotation : aucune suppression
des longues mises à jour. Pause217,54→214,57FPS malgré CPU3,1052→2,8288ms.
Les pages statiques agrègent le culling : les triangles soumis en pause augmentent
2232636→2364176 (+5,9%), les draws108→89. Le bilan actif est meilleur mais la
pause et les maxima ne sont pas améliorés. Les Aulnes restent à qualifier.

Les échecs de pilotes, réparations et contrôles sont conservés sous
`tmp/validation-runs`. Les essais courts servent à écarter les prototypes ;
la variante retenue devra encore subir images/options/ombres, sauvegarde entière,
références Aulnes/Éclaircies, mesures natives pertinentes puis build et publication.
**Aucun objectif200FPS stable, confort général rétabli ou débit physique×6 tenu n'est acquis.**

## Qualification finale du produit intégré

Le reçu `tmp/performance-v435/integration-receipt.json` conserve les35copies
exactes :22sources produit et12tests avec leur helper. Revue de fermeture et
recherche ciblée de raccords QA sans défaut bloquant. Les sources servies sont
gelées sur1775fichiers avant/après le contrôle de présentation.

`test:presentation` passe155,313s sur le produit intégré : minage10629images,
abattage10111images et changements réels6/1/3. Aucun saut, excès continu de
déplacement ou occupation solide ; p998,3/8,4ms sur ce parcours trois colons.
Cela ne remplace pas les relevés denses des Forges. Typage et66cas pérennes
acquis ci-dessus ; aucun résultat de suite complète n'est revendiqué.

Les seuls outputs fermés de cette qualification ont été compressés par NTFS,
avec leurs chemins et contenus conservés ; aucun vidage de `tmp` ni remplacement
d'une partie jouée. Build Pages, publication et réponses HTTPS restent à consigner.
