# V326 — Quatre murs et composition de la chambre

Lot du 12 octobre 2026, demandé pour Les Aulnes avec chambre et diorama
activés. Schéma 229, simulation, bridge et sauvegardes publiques conservés.
ROOT seul exécute les contrôles successifs sur sources/tests/pilotes gelés.

## Quatrième mur

Le mur sud et sa plinthe ferment la chambre. Les murs nord/sud recouvrent les
extrémités latérales à l'extérieur de la pièce : leurs biseaux ne laissent
plus de fente dans les angles. Les quatre parois sont permanentes, avec les
contraintes de caméra et le mobilier de V325. La chambre passe de 16 à 17 lots
et de 25 171 à 25 291 triangles ; le plafond de 28 000 reste inchangé.

## Composition dans la cible existante

Le pipeline précédent composait la chambre dans le framebuffer HDR/MSAA et
effectuait sa conversion de sortie ACES/sRGB. Le plateau rechargeait ensuite
ce framebuffer puis effectuait une seconde conversion. La première sortie
était immédiatement remplacée et jamais relue par le jeu.

La préparation chambre/flou est maintenant séparée de la composition. Le même
quad est dessiné dans la cible HDR/MSAA que Three vient de sélectionner, via
le callback public `Scene.onBeforeRender`, avant l'ouverture de la passe MAIN.
Le callback est installé une fois, armé autour du seul rendu ordinaire, filtré
par propriétaire/scène/caméra, puis consommé avant l'appel imbriqué. Compilation
et ombres ne recomposent pas. La préparation froide conserve sa voie immédiate.
Chambre OFF, aucun travail de préparation ou composition n'est ajouté.

La cible vient de `getRenderTarget`, sans nouveau buffer plein écran. Les
matériaux, `AlwaysDepth`, profondeur copiée, MSAA, flou, fréquence et ordre
composite/paysage/opaques/transparents sont conservés. Les états modifiés sont
restaurés dans des `finally`. Composite et plateau restent deux passes HDR ;
une seule conversion finale est nécessaire. Le rendu MAIN n'a pas encore
commencé lors du callback : aucune passe n'est interrompue puis rouverte.

Contrat vérifié dans Three installé 0.186, `Renderer._renderScene` et
`ReentrantRenderer` du jeu ; API publique documentée dans
[Object3D](https://threejs.org/docs/pages/Object3D.html) et
[WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html).

## Diagnostic de référence

Chrome WebGPU matériel AMD RDNA1, 2560×1440/DPR1, développement Vite.
Les Aulnes originales 250²/tick8434, sans dotation, chambre/carton ON, masque
31 %, lumières 100 %, textures/herbe/ombres/zones conservées. Deux poses fixes :
iso proche et perspective large. **A possède déjà le quatrième mur** ; les
comparaisons A/B isolent la composition, pas le coût du mur supplémentaire.

Diagnostic **PASS 142,945 s**, `tmp/performance-v326/profile-kYXpev/report.json`.
Un parcours V8 MAIN puis un parcours séparé CPU/timestamps GPU ; recharges
8858 et 8875 exactes. Les 2 790 entrées gelées restent exactes.

| Moyenne diagnostique, ms | Iso proche | Perspective large |
| --- | ---: | ---: |
| CPU Core complet | 5,897 | 7,975 |
| CPU préparation/soumission du fond | 0,642 | 0,809 |
| CPU soumission MAIN | 3,201 | 4,433 |
| GPU MAIN, par passe | 4,163 | 2,332 |
| GPU ombre, par passe | 0,400 | 0,398 |
| GPU chambre, par passe | 0,212 | 0,403 |
| GPU flou, par passe | 0,096 | 0,112 |
| GPU composite, par passe | 0,204 | 0,214 |
| GPU sortie, par passe — deux par image | 0,212 | 0,248 |

Les 4 277 et 3 083 passes physiques observées sont qualifiées ; aucun reste
non attribué dans cette couverture. Uploads, copies, attente et compositeur
restent exclus. Les durées CPU imbriquées ne s'additionnent pas ; les observateurs
perturbent les mesures. Le profil V8 ne couvre pas les Workers. Ces valeurs
de référence ne constituent pas une économie mesurée.

## Comparaison du jeu complet

GAME A/B/B/A **PASS 355,339 s**, rapport
`tmp/performance-v326/abba-rThn2u/report.json`. Quatre Chrome frais, sans V8
ni observateurs CPU/GPU : 3 s de chauffe, 4 s en pause puis 12 s à ×6 demandé
par pose. Quatre sauvegardes/recharges 8982/8986/8986/8989 exactes.

| Pose et régime | A RAF/s | B RAF/s | Variation | Débit réel A → B |
| --- | ---: | ---: | ---: | ---: |
| Iso proche, pause | 240,085 | 215,319 | −10,32 % | 0 → 0 |
| Iso proche, demande ×6 | 83,018 | 77,240 | −6,96 % | 5,711× → 5,728× |
| Perspective large, pause | 239,993 | 239,237 | −0,31 % | 0 → 0 |
| Perspective large, demande ×6 | 72,071 | 76,249 | +5,80 % | 5,923× → 6,035× |

Les cohortes se croisent ; **aucun gain FPS robuste n'est acquis**. Les deux B
proches en pause donnent 190,588 puis 240,124 RAF/s. Le p95 moyen à ×6 passe
de 31,9 à 33,9 ms en proche et de 29,2 à 30,15 ms en large ; maxima respectifs
68,5→66,1 et 86,8→76,4 ms. Les débits diffèrent, et la pose proche n'atteint
pas régulièrement ×6. Ni 240 FPS en vrai ×6 constant ni absence de régression
générale ne sont certifiés. La pause retire exactement un draw et un triangle,
ce qui prouve le retrait de passe, pas une réduction du temps total.

## Coût fixe et décision

A/B/B/A en pause canonique8434, deux poses, 2 s de chauffe et 3 s observées par
pose ; quatre recharges8434 exactes. **PASS 211,230 s**, rapport
`tmp/performance-v326/cost/cost-ssyltX/report.json`, gel `cost/gate-hc7z3u`.
Les huit fenêtres qualifient toutes leurs passes, sans erreur de registre ni
offset inconnu : 2 881 frames A et 2 878 B, couverture100 %. Les jetons antérieurs
sont explicitement résolus et les requêtes terminales identifiées hors fenêtre.

| Pose | CPU Core instrumenté A → B | GPU des passes A → B |
| --- | ---: | ---: |
| Iso proche | 1,935 → 1,773 ms (−8,39 %) | 2,567 → 2,458 ms (−4,23 %) |
| Perspective large | 2,448 → 2,315 ms (−5,43 %) | 2,241 → 2,253 ms (+0,56 %) |

Les deux B sont meilleurs que les deux A **uniquement pour le GPU proche**.
Les moyennes CPU baissent mais les cohortes se croisent ; aucun gain CPU stable
ou gain GPU général n'est conclu. GPU proche p95 2,753→2,621 ms, maximum
5,505→6,816 ms ; GPU large p95 3,342→2,949 ms. Les maxima CPU sont également
défavorables sur B. Quatre passes deviennent exactement trois, dont deux
conversions de sortie deviennent une. La chambre/flou reste en cache en pause
des deux côtés, sans modification de sa cadence. Le froid complet
Vite/Chrome/chargement vaut A23,140/22,721 s et B22,474/22,343 s ; ce n'est pas
un temps de construction isolé ni une mesure du chargement en production.

**La composition est retenue comme économie graphique ciblée**, fondée sur la
passe réellement retirée, les pixels exacts et le gain GPU proche qualifié.
Elle n'est pas présentée comme une accélération générale du jeu : la hausse
GPU large de 0,013 ms, la dispersion CPU et les résultats GAME défavorables
restent exposés. Les 240 FPS en vrai ×6 sont toujours un chantier ouvert.

## Conservation et contrôles

- **61 cas / huit fichiers, PASS 16,919 s** : trois cartes carrée/rectangulaires
  vérifiées par rayons sur les triangles des quatre parois et de leurs angles,
  cible HDR/MSAA réemployée, ordre, consommation unique, compilation/ombres,
  OFF et restauration après trois points d'échec. Rapport
  `tmp/validation-runs/v326-unit-2026-10-11T23-12-17.423Z-14208/output.log`.
- Typage complet et build Pages **PASS 10,972 s** ; rapport
  `tmp/validation-runs/v326-build-2026-10-11T23-12-50.302Z-6664/output.log`.
- Pixels natifs **PASS 179,753 s**, rapport
  `tmp/performance-v326/visual/native-5ClnSq/report.json`, gel `gate-EZncxl`.
  Dix états A/B, deux captures stables par état : iso/perspective, proche/large,
  masque 0/31 %, textures ON/OFF, quatrième mur vu du côté opposé, chambre OFF,
  nuit authentique issue de la référence publique V166. **Les RGBA des dix
  couples sont exactement égaux**, à 2560×1440 ; dimensions, alpha opaque,
  contenu non noir et variation spatiale sont qualifiés. Captures depuis le
  canvas pendant un RAF suivant un rendu ordinaire et une attente GPU réelle.
  Deux cycles OFF/ON B, quatre murs, trois arcs/six nuages et caméra vérifiés ;
  World canonique exact pour chaque geste. La nuit n'est pas une campagne
  naturelle des Aulnes. Captures de la chambre et de ses angles inspectées.

Les 2 790 entrées gelées et les pilotes de chaque contrôle restent exacts.
Erreurs navigateur vides ; Chrome/Vite5408 propres à ces contrôles fermés.
Simulation/bridge/publics et dépendances inchangés, aucune campagne longue
rejouée pour cette composition graphique. Textures, densité, éclairages,
cadence et règles n'ont pas été réduits.

## Rouges et limites conservés

Le premier diagnostic est rouge **40,978 s**, `profile-9SiGGh` : le pilote
comptait aussi les décorations portant une section de mur, soit six lots.
La reprise sélectionne les quatre noms exacts des murs, sans changer le produit.

Le premier contrôle visuel est rouge **200,203 s**, `visual/native-HhCE6q`.
`locator(canvas).screenshot()` incluait le DOM superposé : les différences de
toutes les vingt paires du même côté sont confinées au compteur FPS,
x2484..2511/y52..75. Diagnostic conservé dans
`tmp/performance-v326/visual/screenshot-dom-diagnosis.json`. Le pilote a été
réparé pour exporter les pixels natifs sans HUD ; aucun produit modifié, aucune
tolérance ajoutée. Le rapport rouge et ses captures restent conservés.

Le premier contrôle de coût fixe est rouge **42,907 s**, `cost/cost-Ea9j5g` :
huit offsets natifs n'avaient pas été créés sous l'observateur. Le premier jeton
observé commence à 16, image2276 ; la résolution inclut aussi 2274/2275, soit
deux images antérieures de quatre passes. Les attentes asynchrones de préparation
laissaient le rendu ordinaire produire ces requêtes avant installation des
hooks. Le rouge demeure non qualifié. La reprise inventorie synchroniquement
les jetons exacts déjà présents (pool/type/UID/offset), vérifie leur consommation
unique et les exclut de toute mesure. Tout offset inconnu reste une erreur ;
les requêtes finales doivent appartenir à des passes observées hors fenêtre.
Seuls les outils privés de `cost/` changent, sans arrêt du rendu ni du temps.

Package Pages **PASS 1,908 s**, `tmp/elsewhere-pages/v326-package-oeZ7vl/report.json` :
515 fichiers / 119 191 772 octets, 63 références et 66 chemins publics exacts,
laboratoire et sources privés absents. `references_UI` reste non suivi et exclu.
Liens documentaires **PASS 2,331 s**, sans modification de source après le build.

Les performances historiques V325, à un autre cadrage, ne constituent pas une
référence A/B. Le plus gros poste GPU observé reste MAIN. La part de l'herbe
dans ce coût doit être attribuée avant d'envisager une modification de shader ;
aucun gain supplémentaire n'est présumé. Les anciens prototypes audio/agenda
écartés ne sont pas relancés sans changement causal. Relance planifiée
**PAUSED**, aucune nouvelle mécanique engagée dans ce lot.
