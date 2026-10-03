# Validation V196 — sang, dépouilles et douleur

3 octobre 2026, parent V195 `e548493`, schéma **182 inchangé**, sans migration.
[Contrat](../development/visual-blood-v196.md),
[recherche Core et Web](../research/visual-blood-core-web-v196.md),
[stratégie](../development/testing.md). Cette preuve distingue les préparations,
les transitions physiques exécutées, les reprises d'oracles et les mesures.
**Build final et présentation250² minage/abattage acquis.**

## Périmètre et référence

Le sang confirmé colore les brins de la cellule tachée et les régions corporelles
des blessures extérieures encore présentes. Les sept espèces gardent leur modèle,
palette et pelage pour sommeil, mort, pile et charge : pose latérale sans
écrasement, yeux en croix, anatomie absente/consommée conservée. Les proxies gris
et aplatis sont retirés. Le transit sur mobilier franchissable reste au niveau
de marche ; coûts, arrêt, réservations, portes/murs, assise réelle et hauteur de
lit ne changent pas. Trois prises masculines, trois féminines et deux prises de
douleur du renard complètent le son existant.

Core local **1.6.4871 rev590** : tweener, PathGrid, passabilité et définitions de
mobilier distinguent dessin et accès. Les sources officielles Web consultées ne
définissent pas une hauteur de franchissement. Sang3D, croix et voix M/F sont des
adaptations artistiques demandées, sans règle clinique nouvelle. La recherche
identifie le commentaire `no sounds` du renard ; elle ne transforme pas une
recherche XML infructueuse des râles humains en règle moteur universelle.
Corpus et empreintes des sources primaires sont conservés dans la recherche.

## Contrôles ciblés et reprises

**212 tests réussis dans 24 fichiers Vitest uniques**, acquis par composition
des passages et reprises, **pas une passe finale unique**. Journaux :
`tmp/v196-targeted.log`, `tmp/v196-targeted-final.log`,
`tmp/v196-targeted-r3.log`, `tmp/v196-targeted-r4.log`,
`tmp/v196-corpse-final.log` et `tmp/v196-static-r2.log`. Les reprises ne sont pas
comptées deux fois ; les résultats acquis sont réutilisés pour leurs sources
inchangées. Le pipeline audio Node passe séparément **10/10**
(`tmp/v196-audio-pipeline.log`). Régression exhaustive et campagnes naturelles
longues non exécutées.

Les contrôles couvrent mots de pigment et exclusions cliniques, adoption au même
tick, compte/échelle/palette des espèces, masques anatomiques et consommation,
transferts de charge, restauration des buffers, mouvements et vrais sièges,
coûts dirigés, annulation/conservation, migrations historiques, cues et routage
audio. Les tests temporels de présentation restent distincts du diagnostic
graphique préparé.

Échecs et corrections conservés, sans assouplissement des validateurs :

- Premier groupe : **115 réussis /7 échecs**. Trois fixtures de rig supposaient
  que `createWorld()` activait la faune ; elles utilisent une vraie préparation
  animale. L'oracle mobilier omettait la lampe horticole stockable ; le faux
  schéma21 conservait de la viande de renard future dans les politiques.
  Préparation historique et attente neutre corrigées localement, avec assertion
  supplémentaire de rejet du produit futur. L'oracle d'herbe comptait une lecture
  de terrain au lieu des deux nécessaires à la cellule modifiée ; upload et
  absence de parcours sur snapshot inchangé restent exigés. L'oracle humain
  comptait les alias CPU comme locations shader : regroupement et pipelines
  réellement compilés sont contrôlés séparément.
- Groupe suivant : **205 réussis /2 échecs dans23 fichiers**. Le témoin porté
  ne satisfaisait pas la propriété clinique/logistique ; les reprises ont aussi
  révélé le travail Transport désactivé. La préparation est corrigée jusqu'à
  validation stricte et passe finalement **3/3**. Le test de rétention utilisait
  un ancien compte graphique de végétation ; son oracle suit maintenant l'API
  effective du lot. Produit et fixtures historiques ne sont pas modifiés pour
  masquer ces échecs ; les rapports intermédiaires restent sous tmp.
- Générateur : refus `Locked complex furniture`, puis registre de recherche
  absent. La commande normale initialise ce registre et Mobilier complexe est
  explicitement préparé à tick0 pour les fauteuils. Aucune garde supprimée ;
  validation et aller-retour du payload final restent stricts.
- Harness : API caméra audio corrigée de `setCamera` vers `updateCamera`, cast
  du module shader et distinction pile/identité animale revus avant gel.
  La commande worker est acquittée avant le retour positif du hook diagnostic.
- Garde CPU finale des corps statiques : **20/20 dans quatre fichiers**, un
  nouveau test unique portant le total212. Premier essai **9/10** conservé dans
  `tmp/v196-static-final.log` : la fixture avançait le World à tick1025 sans
  mettre ses checkpoints en cohérence. Elle garde maintenant le World à tick0
  et change seulement l'origine de la timeline graphique vers1024. Primitives
  stables sous cette origine, nouveau snapshot au même tick et reset restent
  contrôlés, sans oracle assoupli. Un corps porté ou encore lié à un porteur
  pour le dépôt ne bénéficie pas du retour anticipé des corps statiques.

**Typage et build final passent :679 modules**, `tmp/v196-build-final.log`.
Le précédent build `tmp/v196-build.log` précédait le réglage isolé de fréquence
du pigment et la garde CPU ; il n'était pas présenté comme validation finale.
Avertissement habituel de chunks dépassant500kB, aucune dépendance modifiée.
**`npm run test:presentation` final passe**, `tmp/v196-presentation.log`,
carte250² et deux parcours minage/abattage. Minage : **10495 images**, RAF
p50 **4,2ms**, p95 **4,3ms**, p99 **8,4ms**, maximum **25ms**.
Abattage : **10489 images**, p50 **4,2ms**, p95 **4,3ms**, p99 **8,4ms**,
maximum **29,2ms**. Zéro saut brut ou confirmé, zéro excès de déplacement
continu, zéro occupation solide dans les deux phases. Ce sont deux parcours
temporels ciblés ; aucune cadence FPS générale n'en découle.

## Chromium natif, pixels et chronologie

**4/4 parcours natifs passent**, `tmp/v196-native.log` : deux tests audio,
transit chargé via worker et diagnostic graphique V196. Puis **1/1 graphique**
repasse après le seul réglage de fréquence du pigment,
`tmp/v196-native-final.log` ; les sources des trois autres parcours sont inchangées.
Après garde CPU, le **rejeu final graphique passe1/1 en26,0s**,
`tmp/v196-static-native-r2.log`. Ces durées de test ne mesurent pas le coût de rendu.

Chromium153, WebGPU matériel AMD RDNA‑1, Windows, viewport1440×1000.
Captures et rapports sous `tmp/test-runs/v196-native/artifacts/`,
`tmp/test-runs/v196-native-final/artifacts/` puis
`tmp/test-runs/v196-static-native-r2/artifacts/`.
**Captures relues par l'intégration centrale**, distinctement des assertions
de pixels. Aucune erreur JS/GPU ni requête échouée dans le rapport graphique final.

Le diagnostic charge la scène stricte puis présente un clone graphique avec
deux lièvres des neiges vivants/endormis supplémentaires : **ce clone n'est ni
adopté par le worker ni une sauvegarde de biome validée**. Sept lots de trois
spécimens, états0/1/2 et échelles biologiques1 ; géométrie/palette partagées,
couleurs et dimensions conservées après changements de propriétaire.
Deux projections texturées, témoin sans texture, sept paires de gros plans
croix/yeux ordinaires à pose identique, corps humain/animal avec pigment et
contrôle GPU mot nul sont capturés. Les différences de pixels complètent la
relecture ; elles ne prouvent pas une parité artistique exhaustive.

L'herbe est capturée avec le décalque de filth caché pour isoler les brins.
Cellule(8,23) : RGBA taché **[130,95,71,255]**, témoin propre
**[129,148,108,255]** ;22400 instances visibles dans ce cadrage. Changement
de carte et différence de capture établis ; ce n'est ni une durée GPU ni un
contrôle exhaustif des masques sur250².

Après restauration du vrai monde worker, ordre Transport accepté, collecte
physique initiale **tick33**, dépôt dans la réserve(3,19) **tick42**.
Le rejeu final acquiert les captures porté/déposé aux **ticks35/43**.
Une seule identité corporelle/pile conservée, un seul exemplaire dans le lot
d'espèce, transferts positif puis négatif, charge liée au porteur, aucune ancienne
géométrie proxy animale dans le cargo. Ce passage exerce un lièvre ; il ne
couvre pas chaque espèce portée à tous les caps/poses.

Premier rejeu après garde : échec de l'assertion `handoff>0` parce que le pilote
mettait en pause dès réception de la propriété portée dans le worker, avant
l'adoption graphique du transfert. **Correction du pilote, pas du produit** :
attendre le handoff positif observé dans le probe avant pause. Assertions
conservées ; checkpoint de cargaison écrit en `finally`, rapport conservé avant
les assertions. Le rejeu1/1 décrit ci-dessus est le résultat acquis ; le passage
rouge ne disparaît pas de l'historique.

Le parcours mobilier utilise le vrai worker, deux cellules de table, cargaison,
pause, sauvegarde/reprise et vitesse. Extrémités GPU au sol ; assise et lit
restent couverts par les tests indépendants. Tous les pipelines observés respectent
**≤8 buffers et ≤16 attributs**, maxima8 et15 dans le rapport graphique acquis.
Ce comptage ne prouve ni absence de compilation tardive universelle ni coût nul.

Les huit vrais MP3 se décodent : PCM nominal RMS **0,0096431–0,0098308**, crête
**0,0434186–0,0642663**,2145024 octets Float32 décodés. Panner dans les deux
caméras, lecteur réel après geste utilisateur, familles M/F séparées, variation,
déduplication, pause/reset. **Aucune écoute humaine du timbre ou preuve de sortie
casque** n'est déduite de ces mesures.

## Scène publique et assets

46e entrée **« Sang, dépouilles et douleur · 3 colons »**,32², seed196, tick0.
SHA-256 : `05f89ecf414665d62400e07821d97a617aeb82893821d2084731db03f57693d6`.
Trois profils visuels cohérents M/F, deux coupures humaines4PV via API, douze
animaux légaux vivants/endormis, sept dépouilles issues de vrais producteurs
de dommages/décès et douze dépôts physiques de sang épaisseur3. Le lièvre des
neiges n'est présent vivant que dans le clone graphique décrit plus haut.
Fauteuils/recherche, sommeil initial, besoins, repas et réserve sont préparés,
pas acquis par campagne. Repas assis et nouveaux coups audibles restent des
actions manuelles offertes ; leur réussite ne découle pas du chargement.
Les45 anciennes entrées de manifeste sont préservées textuellement lors de
l'ajout ; aucun payload historique régénéré.

Manifest sonore : **54 événements /133 prises**. Huit dérivés doux publiés et
huit originaux conservés pour provenance, **347992 octets /16 fichiers** ;
runtime : seulement les huit dérivés. **31 crédits rapportés**, dont20⅓ pour les
prises publiées et10⅔ pour quatre neutres exclues du manifeste, conservées sous
tmp. Prompts complets, IDs, empreintes et traitement dans les journaux audio ;
pas de régénération automatique ni voix de mort spécifique du renard.

## Budget analytique et condition de l'herbe

L'herbe garde sa carte d'un texel par cellule et son shader/draw. Copie et
comparaison des dépôts sur CPU ont un coût ; carte inchangée : aucun upload ;
carte250² changée :250000 octets transférés. **Suivi fin de chaque nuance du
terrain différé selon la condition de coût de l'utilisateur** : le sang colore
la cellule entière sans suivre exactement le contour des gouttes. Une lecture
de l'atlas ou une carte plus détaillée ajouterait préparation/transfert ou coût
GPU ; aucun de ces coûts n'est ajouté pour cet effet.

| Données résidentes | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Apparence humaine |17 floats/slot|18 floats/slot|+4 octets/slot de capacité|
| Primitives animales |17 floats/slot|33 floats/slot|+64 octets/slot de capacité|
| Métadonnées statiques animales |13 floats/sommet|16 floats/sommet|+12 octets/sommet|
| Croix des deux yeux par espèce |0|144 sommets/48 triangles|+48 triangles résidents|
| Découpage des pattes de lièvre, chacune des deux variantes |0|144 sommets/48 triangles|+48 triangles résidents|

Pigment : calcul fragment supplémentaire ; poses/masques/transferts : calcul
vertex supplémentaire. Les corps rejoignent sept lots globaux sans culling
par chunk des anciennes piles : de nombreux corps hors champ peuvent coûter
davantage. Aucun mesh de sang par acteur ou draw additionnel ne signifie
absence de coût GPU. La garde statique évite des comparaisons/allocations CPU
sur le même snapshot sans porteur ; elle ne retire ni triangles ni calcul GPU.

## Mesures CPU/RAF puis GPU, successives

[Rapport relu de comparaison des acteurs](../../artifacts/visual-blood-v196-actor-performance.json).
Ryzen5 3600, Node24.11.1, Chromium153, AMD RDNA‑1,1920×1080 DPR1.
Même payload strict/hash, pause tick0, trois colons/douze animaux/sept dépouilles ;
deux secondes de chauffe puis trois secondes mesurées par vue, textures/herbe,
ombres/cache, nuages, vent et labels activés. **A/B/B/A**, A remplaçant seulement
sept modules d'acteurs par `e548493`, B employant V196 ; main, audio, simulation,
herbe et ColonyRenderer sont communs. Ce n'est pas une comparaison de deux jeux
complets. Sources gelées par passage, CPU/RAF ordinaires puis GPU instrumenté
séparément ; aucune campagne concurrente.

Le premier diagnostic `tmp/v196/perf-{a1,b1,b2,a2}.json` précède la garde
statique et reste conservé. Il ne valide pas rétroactivement le correctif.
Les résultats CPU finaux suivants proviennent de
`tmp/v196/perf-final-{a1,b1,b2,a2}.json`.

| Rotation | CPU image iso p50/p95 ms | CPU image perspective p50/p95 ms |
| --- | ---: | ---: |
|A1 ancien rendu d'acteurs|0,9 /1,4|0,9 /1,4|
|B1 V196 final|1,4 /2,0|1,1 /1,8|
|B2 V196 final|0,9 /1,5|1,0 /1,5|
|A2 ancien rendu d'acteurs|0,9 /1,4|1,1 /1,8|

RAF p95 **4,3ms dans toutes les phases**. CPU image comprend JavaScript et
soumission, pas l'exécution GPU ; la simulation est en pause. Compteurs de draws
encodés iso/perspective **22/32→23/34** ; triangles iso
**89211/108791→85555/101479**, perspective **197755/217335→194099/210023**.
Les compteurs Three peuvent omettre le rejeu de bundles résidents ; ces nombres
ne constituent pas des durées GPU ni une preuve de baisse universelle de charge.

Passe GPU distincte A/B/B/A, **360–552 échantillons par phase**, zéro erreur :

| Rotation | GPU iso p50/p95 ms | GPU perspective p50/p95 ms |
| --- | ---: | ---: |
|A1 ancien rendu d'acteurs|0,983 /1,376|1,049 /1,442|
|B1 V196 final|0,983 /1,049|1,049 /1,442|
|B2 V196 final|0,983 /1,376|1,049 /1,442|
|A2 ancien rendu d'acteurs|0,983 /1,376|1,049 /1,049|

Ces fenêtres courtes sont variables et quantifiées. Elles **n'établissent ni
gain général, ni coût CPU/GPU nul**, ni performance sur carte250², charge de
cadavres hors champ, tick/worker ou cadence garantie. La petite scène préparée
en pause et les deux parcours de présentation250² ne remplacent ni une campagne
naturelle longue ni une régression exhaustive. Aucun passage incomplet n'est
déclaré vert.
