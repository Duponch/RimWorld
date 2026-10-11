# V321 — diorama en carton

Demande humaine : entourer la carte carrée d’une boîte artisanale en carton,
posée sur une table nue, avec des paysages en papier collés aux parois intérieures.
La référence est la capture `codex-clipboard-1af4b67e-b88f-4d8e-886e-f312849c72b5.png`.
Cette priorité graphique remplace la préparation des barricades ; aucune nouvelle
règle de simulation n’est engagée dans ce lot. Schéma 229 conservé.

## Construction et frontières

La géométrie est déterministe et construite aux dimensions de la carte. Parois
épaisses, découpe irrégulière, léger bombement, chants cannelés, plis et languettes
de jonction partagent des lots statiques. Montagnes, neige, sapins, nuages et soleil
sont des découpes plates avec épaisseur et ombres de contact intégrées à leurs
couleurs. Table biseautée, pieds et ceinture de soutien ; aucun accessoire.

Les hauteurs sont artistiques et proportionnelles au décor, sans signification
physique dans la simulation. La carte, ses cases, interactions, lumières et ombres
de jeu restent inchangées. Le décor emprunte l’éclairage global existant mais
n’ajoute ni lumière ni passe d’ombre ; ses contacts sont ombrés dans la géométrie.
Les parties hautes tournées vers la caméra sont masquées ; à courte distance les
rebords correspondants se masquent aussi pour laisser les cases du bord visibles.
Les sommets complets identiques sont indexés sans perdre de triangles, normales
dures ni raccords UV. Les grands volumes hors champ sont rejetés par découpage
des six faces de leur boîte englobante contre le volume de caméra : les seules
sphères, et même les seuls six tests plan/boîte, conservent à tort des parois
longues en vue diagonale. Ce calcul réemploie des buffers fixes et son résultat
tant que pose, projection et cible restent identiques. Base et table gardent
leur présence quand leurs volumes intersectent la vue, sans hypothèse d’occlusion.

Le réglage « Diorama en carton » existe à l’accueil et en partie, actif par défaut,
conservé dans `lisiere.presentation.diorama.v1`, hors des sauvegardes de colonie.
OFF avant chargement : aucune couche, géométrie, requête de texture ou préparation.
OFF après activation : groupe détaché, aucun passage ordinaire de configuration,
présentation, compilation ou dessin du décor. Les ressources déjà créées restent
en cache pour permettre les comparaisons sans reconstruction. Un chargement d’image
déjà engagé peut finir en mémoire CPU ; il ne remet pas le décor dans la scène.
La destruction du renderer libère géométries, matériaux et textures, y compris
une image reçue tardivement. Le chargement des deux textures est borné à 15 s ;
des pigments solides assurent le repli. L’option générale sans textures emploie
des matériaux sans nœud de prélèvement de texture.

## Assets originaux

Génération via la compétence imagegen et l’outil intégré, sans CLI. Les textures
finales sont [kraft.png](../../public/assets/diorama/v321/kraft.png) et
[wood.png](../../public/assets/diorama/v321/wood.png). Elles restent dans le dépôt,
pas dans un cache requis à l’exécution. Filtrage linéaire, mipmaps et anisotropie 4.
Les fichiers produits mesurent chacun 1254 × 1254 pixels (malgré la taille
1024 demandée dans les prompts), respectivement 3 630 492 et 2 380 386 octets.

Prompts finaux :

> Use case: stylized-concept. Asset type: seamless albedo texture for an actual 3D handmade cardboard shoebox in a cozy low-poly game. Create ONE square tileable texture, full frame macro straight-on scan of warm natural recycled kraft cardboard, realistic softly interwoven tiny paper fibers, subtle mottling, occasional tiny pressed darker flecks, matte warm tan muted honey/biscuit color. This is the flat unprinted paper surface ONLY, not a render of a box or corrugated edge. Softly stylized tactile artisanal quality; natural detail but low contrast to avoid shimmer when minified in game. Orthographic flat uniform illumination, NO perspective, NO shadows, NO gradients across whole image, NO vignette, NO seams, NO borders, NO text, NO objects, NO holes, NO big scratches. Edges must tile seamlessly on all sides. 1024x1024.

> Use case: stylized-concept. Asset type: square seamless albedo texture for a plain wooden table under a cozy handmade cardboard diorama in a low-poly 3D game. One full-frame flat straight-on surface texture ONLY. Warm pale honey oak or birch, soft long natural wood grain lines flowing vertically, subtle elongated grain knots, softly stylized tactile realistic matte surface. Low contrast fine detail, even diffuse light. Seamlessly tileable all four edges. NO table render, no perspective, no shadows, no objects, no tools, no varnish highlights, no border, no text, no panel seams. 1024x1024.

## Contrôles et reprises

ROOT seul exécute les contrôles ; sources, tests, publics et pilotes privés sont
gelés pendant chaque exécution. Simulation/bridge et 63 références/66 fichiers
publics ne changent pas : pas de nouvelle campagne de simulation revendiquée.

- Premier groupe `v321-targeted-2026-10-11T18-03-03.756Z-17552` : FAIL13,748s,
  huit cas acquis et trois rouges géométriques. Le budget de sommets a motivé
  l’indexation exacte ; l’oracle des fines jointures de table est corrigé pour
  vérifier leur placement sous la carte, sans les confondre avec le plan supérieur
  strict. Reprise géométrique PASS4,033s, trois cas.
- Typage intermédiaire PASS6,609s. Après retouche du bois, de la découpe des
  rebords et ajout du repli des textures : `v321-polish-controls` PASS10,619s,
  sept cas géométrie/cycle de vie.
- Premier natif visuel PASS43,871s (`native-FBNBHj`), monde original8434 exact.
  L’apparence a ensuite été affinée. La fermeture du menu depuis une case cochée
  a été corrigée dans le pilote par son vrai bouton ; aucun comportement produit
  n’a été altéré pour ce contrôle. Reprise visuelle PASS42,359s (`native-yw1RzY`),
  sept cadrages dont perspectives avant/arrière et détails ; captures inspectées.
- Premier ABBA fonctionnel PASS311,251s (`native-ZdNRCc`), mais coût défavorable :
  proche×6 OFF77,19→ON65,00RAF/s (−15,79%), débit réel4,910→4,787×,
  dix appels de dessin supplémentaires. Vue large OFF110,56→ON102,85RAF/s
  (−6,97%), débit5,771→5,586×. Ce résultat est conservé ; il n’est pas présenté
  comme une absence de régression et a motivé le rejet précis hors champ.
- Le simple test `Frustum.intersectsBox` reste insuffisant sur les longues parois
  diagonales : `v321-culling` FAIL10,768s puis diagnostic ciblé FAIL12,120s
  conservés. Le découpage des faces passe ensuite avec
  `v321-culling-precise-2026-10-11T18-26-08.497Z-15568`, PASS12,898s, huit cas.
  Le groupe acquis totalise treize cas uniques dans quatre fichiers, dont trois
  historiques de destruction du renderer. Aucun fichier rouge n’est écrasé.

## Chrome WebGPU final et coût du décor

`v321-native-culling-abba-2026-10-11T18-26-54.910Z-24616` : **PASS294,209s**,
[rapport](../../tmp/diorama-v321/native-CjAJs7/report.json), gel
`freeze-z2unDy` : 2758 entrées exactes avant/après. Quatre contextes Chrome neufs
OFF/ON/ON/OFF, GPU matériel, 2560×1440/DPR1, serveur Vite5395 ; mêmes options,
caméras et Aulnes originales8434 sans dotation. Chaque fenêtre dure5s après1,5s
d’échauffement. Une recharge exacte de l’original précède la seconde vue dans
chaque contexte. Quatre sauvegardes/recharges finales **8677/8672/8674/8669**
exactes, erreurs vides, navigateurs de contrôle fermés.

| Cadrage/régime | OFF RAF/s | ON RAF/s | Débit réel OFF→ON | p95 moyen OFF→ON |
|---|---:|---:|---:|---:|
| Proche, pause | 239,30 | 239,96 | 0→0 | 4,75→4,75ms |
| Proche, ×6 demandé | 79,51 | 86,47 | 6,128→5,641× | 34,20→33,80ms |
| Ensemble, pause | 240,12 | 240,05 | 0→0 | 4,65→4,75ms |
| Ensemble, ×6 demandé | 114,24 | 107,74 | 5,865→5,964× | 24,15→24,20ms |

Les huit lots de parois inutiles sont éliminés en vue proche : pause54→56 appels
de dessin au lieu de54→64 initialement. En vue d’ensemble,35→49 appels : les
quatorze lots visibles contribuent réellement au décor. Le coût large est
**−5,69% RAF/s** dans cette observation, avec débit légèrement différent.
L’écart proche positif de8,75% n’est **pas** un gain certifié : le débit ON est
plus faible et les sessions dispersées. Les fenêtres courtes et compteurs RAF
ne prouvent ni rafraîchissement physique, ni240FPS, ni vrai×6 constant, ni temps
CPU/GPU attribué. Aucun gain général de simulation n’est revendiqué.

Les quatre contextes vérifient un départ OFF sans couche ni requête d’asset,
puis dix cycles de bascule chacun : objets identiques et compteurs mémoire Three
stables après échauffement. Cela ne certifie pas toute la mémoire GPU/JS.
Captures en pause, perspectives opposées, orbite réelle à la souris et détails
du papier inspectés ; la préparation utilise les mêmes ressources que le jeu.
Les tests ciblés couvrent aussi pigments sans texture, timeout/échec du chargeur,
image tardive après destruction et restauration du culling après préparation.

Typage final **PASS6,910s**, build Pages **PASS2,468s**. Un premier lancement npm
mal résolu sous Windows (`v321-build-pages`, ENOENT0,008s) n’a exécuté aucun
compilateur ; typage et build ont été repris par leurs entrées Node explicites,
sans changement produit. Le serveur Vite5395 de contrôle est fermé.
