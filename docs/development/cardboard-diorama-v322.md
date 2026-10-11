# V322 — relief et visibilité de la boîte

Demande humaine : épaissir les découpes de papier d'environ 2,5 fois, donner aux
quatre parois la hauteur du mur arrière, puis supprimer les deux anomalies de
masquage en iso et perspective. Le décor conserve son caractère artisanal, sa
table nue, ses textures V321 et son option commune accueil/partie. Schéma229,
simulation, bridge, règles et fichiers publics inchangés.

## Forme et relief

La hauteur nominale des quatre côtés est désormais `.215 × min(width,height)`.
Les bords restent légèrement découpés, les faces bombées et les assemblages
cannelés ; aucune pente de hauteur n'est conservée sur les côtés. La boîte
asymétrique V321 suivait la référence artistique, mais la nouvelle demande
privilégie quatre parois normales. Le paysage du mur avant est adapté à cette
hauteur, avec montagnes, neige, arbres et nuages, sans répéter exactement celui
du fond.

L'épaisseur ordinaire du papier passe de `.00065` à `.001625` fois la dimension
de référence. Le film et le relief de la pointe pliée sont eux aussi multipliés
par2,5. Les couches superposées occupent des profondeurs distinctes pour éviter
les croisements de solides ; leurs faces sont planes, tandis que le carton garde
son bombement. Le jeu de montage autour de la carte passe de `.012` à `.0126` fois
la dimension de référence pour contenir toutes ces épaisseurs hors du terrain.
La table conserve exactement ses coordonnées, couleurs, normales et UV V321.
Au plus18lots statiques, sans nouvelle lumière, passe d'ombre ou animation.

## Masquage selon la caméra

Le masque ne dépend plus du quadrant de caméra ni d'un seuil de zoom. Il vérifie
si un triangle réel de carton ou de papier supérieur, orienté vers la caméra,
s'interpose entre celle-ci et le rectangle de sol jouable à `y=0`. Les rayons
parallèles de la caméra orthographique et les rayons convergents de la perspective
utilisent des contraintes différentes, issues des matrices actuelles. Le volume
de caméra, ses limites near/far et la convention WebGPU sont pris en compte.
Les contacts réduits à une ligne ou un point ne coupent pas une paroi entière.

Une hiérarchie de bornes construite une seule fois rejette les groupes de triangles
inutiles. Le calcul réemploie des buffers fixes et son résultat tant que pose et
projection ne changent pas ; aucun parcours de cellules, allocation par requête,
upload de géométrie ou accès World n'est ajouté. Un côté occultant masque toutes
ses parties supérieures. Les parties basses ne sont jamais coupées par proximité
ou zoom ; seul leur rejet hors du champ reste possible. Le même rejet précis des
boîtes englobantes V321 est conservé.

Portée : le masque protège le rectangle nominal du sol à `y=0`, sans examiner
individuellement les sols construits surélevés, l'eau ou les acteurs. Ce n'est pas
une certification de chaque pixel ni une occultation dynamique des entités.
La désactivation du diorama conserve les sorties anticipées et la propriété des
ressources V321 ; le nouvel index est libéré avec sa géométrie.

## Contrôles et reprises

ROOT seul exécute les contrôles ; sources, tests, publics et pilotes privés sont
gelés pendant chaque exécution. Les contrôles de simulation complets ne sont pas
rejoués pour ce changement exclusivement graphique.

Premier groupe `v322-targeted-2026-10-11T18-50-24.131Z-4008` : FAIL15,017s,
23cas acquis sur24 dans6fichiers. Le seul rouge est l'oracle de rayons indépendants :
son quadrillage excluait la demi-case du bord, où une vraie occultation étroite
existe. La reprise inclut ce bord sans modifier le produit :
`v322-ray-reprise-2026-10-11T18-51-39.006Z-4308`, PASS1,210s,6cas.
Les rouges et gels restent conservés sous `tmp/diorama-v322` et le journal de
validation habituel.

Après adaptation du décor avant : `v322-geometry-final-2026-10-11T18-58-10.335Z-3288`,
PASS19,406s,20cas dans4fichiers. Avec les5cas historiques de préférence et de
destruction acquis dans le premier groupe, l'ensemble comprend25cas uniques
dans6fichiers, dont12nouveaux dans2fichiers. Un dernier remplacement du swap
destructuré par des affectations explicites évite le tableau temporaire dans le
nouveau clipping ; reprise `v322-occlusion-final-2026-10-11T19-03-21.057Z-24944`,
PASS1,476s,6cas. Géométrie et autres comportements inchangés pendant cette reprise.

Premier parcours graphique strict : `v322-native-graphics-2026-10-11T18-58-44.570Z-23372`,
PASS67,206s, [rapport](../../tmp/diorama-v322/native-igPd66/report.json).
Vingt-deux poses iso/perspective, Aulnes8434 originales exactes en pause, gel2763
exact et aucun message d'erreur ; Chrome et Vite5396 possédés par le pilote fermés.
L'oracle indépendant clippe les triangles réels et le sol dans l'espace homogène
de caméra, intersecte leurs silhouettes, puis vérifie la profondeur par un rayon
intérieur. Il respecte l'orientation des faces et ignore les contacts inférieurs
à `.05 pixel`. Une géométrie effectivement dans la vue doit être visible sauf
si son côté supérieur occulte le sol ; hors champ, une borne conservatrice peut
garder `visible=true` sans obligation de dessin. Les tests des vues très verticales
et presque horizontales ouvrent les limites de la caméra privée : ces poses
extrêmes ne sont pas présentées comme des angles ordinaires disponibles dans l'UI.

Les captures normales, verticales et proches des bords sont inspectées. Les
rebords cachent la tranche du terrain. Les bandes de terrain remarquées dans la
pose verticale extrême font l'objet d'une lecture ciblée du produit V321 dans le
banc final ; elles ne sont pas confondues avec les attentes de masquage des murs.
Les22contrôles graphiques sont repris dans ce banc après le swap explicite final.

Premier ABBA fonctionnel : `v322-native-abba-2026-10-11T19-03-38.160Z-15456`,
PASS340,495s, [rapport](../../tmp/diorama-v322/native-YRX4mY/report.json).
Quatre recharges8562/8572/8585/8581 exactes, trois reprises du monde8434 par
cohorte,22poses graphiques B finales, gel2763 exact ; Chrome et Vite5397 fermés.
La lecture V321 confirme les mêmes bandes de terrain dans la pose verticale
extrême ; aucune correction de ce rendu préexistant n'est revendiquée ici.

Le statut fonctionnel PASS ne clôt pas le coût : proche×6 A73,54→B65,24RAF/s
(−11,28%), débit4,792→4,993× ; ensembleiso81,65→75,99 (−6,93%),5,193→5,376× ;
perspective77,79→78,50 (+0,91%),5,236→5,366×. Pause proche208,14→209,19,
ensembleiso239,63→236,81 et perspective239,28→239,04. Le rendu proche compte
exactement56dessins/875899triangles dans A et B ; les fenêtres×6 ont un débit
différent et ne constituent pas un coût causal à travail identique.

La mesure privée de128appels parvue lors de changements de caméra relève
`.0492→.0914ms` proches, `.0172→.0352ms` ensembleiso et `.0156→.0406ms` perspective.
Les valeurs incluent le chronométrage et sa résolution, pas une mesure GPU.
Ces résultats motivent une sortie anticipée supplémentaire : les contraintes
de rayons ne sont préparées que si une première borne supérieure est en champ.
Un test vérifie aussi l'absence de cette préparation hors champ et son réemploi
quand la caméra ne change pas. Les résultats défavorables restent consignés,
sans être renommés en absence de régression.

La reprise prépare les contraintes au premier haut effectivement en champ et
saute les bornes des autres hauts d'un côté déjà coupé. Les buffers de découpage
des bornes utilisent aussi des swaps explicites. Revue indépendante en lecture
seule : état paresseux, masques de côtés et propriété des buffers équivalents,
aucun blocage trouvé. Groupe `v322-lazy-visibility-2026-10-11T19-13-48.803Z-22792`,
PASS12,581s,12cas dans2fichiers ; ensemble acquis26cas uniques dans6fichiers,
dont13nouveaux dans2fichiers.

Premier typage `v322-typecheck-2026-10-11T19-14-34.914Z-10056` : FAIL7,682s,
annotation du constructeur de caméra du test trop générale (`Camera` n'expose
pas `updateProjectionMatrix`). La seule annotation est précisée en union des
deux caméras ; aucun comportement runtime ne change. Reprise
`v322-typecheck-reprise-2026-10-11T19-15-10.270Z-21768`, PASS9,913s.

## Chrome WebGPU final et performances

La reprise `v322-native-confirm-2026-10-11T19-15-47.546Z-7828` passe592,781s :
[rapport](../../tmp/diorama-v322/native-confirm-xz37nR/report.json), gel2764exact,
quatre recharges8868/8835/8850/8865exactes, trois reprises originales8434par
cohorte et22poses strictes B. Erreurs vides, Chrome et Vite5398 possédés fermés.
Comparaison A/B/B/A entre les feuilles V321 littérales et V322 finales, même
qualité, sauvegarde et caméra,2560×1440/DPR1/WebGPU matériel. Les36fenêtres
emploient4s d'échauffement puis6s de mesure, pause/×1/×6 dans trois vues.
Les captures finales sont inspectées ; aucune dotation ou modification World.

| Vue et vitesse | A V321 RAF/s | B V322 RAF/s | Variation | Débit réel A → B | p95 moyen A → B ms |
| --- | ---: | ---: | ---: | --- | --- |
| Proche iso, pause | 220,75 | 240,06 | +8,75% | 0 → 0 | 7,05 → 4,85 |
| Proche iso, ×1 | 181,63 | 210,44 | +15,86% | 0,9994 → 0,9997 | 14,95 → 12,20 |
| Proche iso, ×6 | 109,61 | 103,95 | −5,16% | 5,8676 → 5,7843 | 25,80 → 28,20 |
| Ensemble iso, pause | 240,08 | 240,04 | −0,02% | 0 → 0 | 4,70 → 4,70 |
| Ensemble iso, ×1 | 216,41 | 212,76 | −1,69% | 0,9992 → 0,9996 | 10,85 → 11,45 |
| Ensemble iso, ×6 | 106,50 | 109,21 | +2,54% | 6,0324 → 5,9840 | 24,90 → 25,05 |
| Ensemble perspective, pause | 240,03 | 240,03 | 0,00% | 0 → 0 | 4,80 → 4,70 |
| Ensemble perspective, ×1 | 216,54 | 212,13 | −2,04% | 0,9991 → 0,9987 | 11,10 → 11,50 |
| Ensemble perspective, ×6 | 110,60 | 111,84 | +1,12% | 6,0612 → 5,7740 | 23,80 → 25,75 |

La pause proche soumet exactement56dessins/875899triangles dans A et B ; les
vues larges49dessins, seulement8/12triangles moyens supplémentaires. Les mesures
ne démontrent **pas** une absence universelle de baisse FPS : la vue proche×6
est défavorable et les débits diffèrent ; les gains proches pause/×1 sont aussi
influencés par un quatrième A moins rapide. Aucun gain causal de CPU total/GPU,
240FPS en vrai×6 constant ou campagne naturelle entière n'est certifié.
La demande humaine de ne pas ralentir reste une limite de performance ouverte,
distincte des corrections géométriques et du masquage qui passent.

La mesure contrôlée directe de128appels parvue, à caméra déplacée, donne en
moyenne A→B : proche `.04375→.07422ms`, ensembleiso `.02109→.04609ms`, perspective
`.01172→.03594ms`. Surcoût local moyen environ `.024–.031ms` ; maximum B proche
`1,1ms`, p95 `.2ms` proche et `.1ms` large. Chronométrage et résolution inclus,
aucune soustraction ni mesure GPU. Caméra, visibilité, qualité, mémoire Three et
monde restent identiques avant/après ces appels. La préparation de caméra est
exclue de chaque échantillon, mais incluse dans le temps mural du groupe. Les
changements sont mesurés ; le réemploi à caméra fixe et le retrait OFF sont
vérifiés séparément par les tests, sans gain FPS attribué à ces sorties.

Sources, tests et pilotes ne sont plus modifiés après ces contrôles. Simulation,
bridge et63références/66fichiers publics restent inchangés. Les rapports rouges,
les gels et les deux ABBA sont conservés ; aucun banc identique n'est relancé.

Typage final acquis PASS9,913s ; build Pages final
`v322-build-pages-2026-10-11T19-28-02.840Z-18900`, PASS3,278s. Les contrôles
documentaires passent avec la reprise `v322-docs-reprise-2026-10-11T19-29-21.268Z-19796`,
PASS1,907s,939documents/8925liens et références originales exactes. Le premier
contrôle FAIL1,976s conservait un lien vers l'ancien titre du guide ; son ancre
est mise à jour, sans changement du validateur. Gel produit/tests/pilotes2764
encore exact après le build et les éditions documentaires. La livraison est
consignée ci-dessous après le commit produit.

## Livraison

Produit `a58e5b92699d77e6880b843d5b237105520e7bb2` commité et poussé sur main,
puis publié une seule fois en **b054f727** :
[adresse stable](https://elsewhere-cq7.pages.dev/) et
[publication](https://b054f727.elsewhere-cq7.pages.dev/).
Package `v322-package` PASS1,641s,515fichiers/119141579octets,
63références/66fichiers publics exacts, deux textures V321 et assets historiques
exacts, laboratoire et fichiers privés absents ;
[rapport](../../tmp/elsewhere-pages/v322-package-WF4R1t/report.json).
Wrangler4.149.0 confirmé, déploiement PASS14,201s : deux fichiers nouveaux et
511déjà présents, puis en-têtes/redirections. L'avertissement Git dirty concerne
seulement `references_UI`, exclu du commit et du package.

HTTPS `v322-https` PASS5,795s :51chemins sur les deux origines, soit102réponses
200/MIME/octets exacts ;
[rapport](../../tmp/elsewhere-pages/v322-http-XpX95Z/report.json).
Package et fichiers publics inchangés pendant le contrôle. Les66fichiers
distants ne sont pas tous téléchargés ; disponibilité du package seulement,
sans nouveau parcours de jeu en ligne ni benchmark. Le commit/push documentaire
de ces preuves ne republie pas. La relance planifiée reste **PAUSED**.
