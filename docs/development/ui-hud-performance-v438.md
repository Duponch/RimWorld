# HUD et étiquettes de la carte — V438

19 octobre 2026, schéma263 inchangé. L’utilisateur demande le masquage des quantités par les objets au premier plan, puis un audit critique des coûts du HUD/DOM et des choix GPU. Ce lot conserve règles, commandes et sauvegardes ; les mesures et leurs limites sont consignées ci-dessous. Les propositions générales restent distinctes des corrections retenues.

**Première mesure Forges ×1**, 80 colons/241 animaux/1 778–1 781 piles, WebGPU 1280×720, 4,012 s, ticks 336→348 : physique ×0,499 ; RAF 86,00 FPS, p95 41,7 ms/p99 70,8/max 116,7. Les 12 rafraîchissements HUD coûtent 19,47 ms moyens (p95 23,3). Capture alimentaire 5,77 ms et alertes 6,04 ms, soit environ 61 % du HUD ; portraits 0,003 ms/appel, mutations infobulles 0,92 ms/s. Parents/enfants inclusifs non additionnés. Fenêtre courte instrumentée, sans attribution directe GPU ([rapport](../../tmp/hud-depth-v438/ui-none.json)).

## Constat du code avant correction

| Chemin | Cadence et travail constatés |
|---|---|
| HUD commun | Demandes ordinaires limitées à 200 ms ; commandes/sélections immédiates (`src/ui/snapshot-hud.ts:9`, `src/main.ts:1394,2010`). Aucun rafraîchissement général DOM par image. |
| Données communes | Piles/stocks, projections équipement/vêtements et nutrition relus séparément (`main.ts:1428–1473`, `status-alerts.ts:122`, `character-equipment.ts:6`, `character-apparel.ts:6`). Capture alimentaire déjà partagée (`main.ts:326`). Certains propriétaires nécessitent des recherches linéaires (`exploration-readers-256.ts:13`). |
| Colon sélectionné | Toutes inspections appelées, indépendamment de l’onglet (`main.ts:1517–1525`). Santé vérifie seulement l’existence du bloc ; Social/Journal vérifient leur ouverture. Environnement est explicitement déplacé dans Besoins (`colonist-inspector.ts:91,143`), mais `RoomInspection` teste seulement l’inspecteur racine : pièces/toits/meubles, toutes cellules thermiques, signature globale beauté (`room-inspection.ts:18–45`, `work-environment.ts:50`, `temperature.ts:36`, `room-beauty-inspection.ts:22`). Donc calcul possible quand Besoins est caché ; contexte d’objet visible à préserver. |
| DOM conservé | Cartes des colons, ressources, alertes et Animaux réemploient leurs nœuds ; portraits SVG en cache borné à 256. Table Travail créée même fermée lors d’un changement de roster (`main.ts:1351`). Les `innerHTML` de squelette ne sont pas exécutés par image. |
| Placement | Survol : 250 ms ; Alt : 160 ms, dimensions lues après écritures (`main.ts:1015–1060`). Placement événementiel/observé, jusqu’à quatre sondes par nouvelle clé (`hover-readout-layout.ts:43–103`, `hover-space.ts:70`). Infobulle unique : mesure à l’ouverture, mouvement coalescé RAF (`tooltip.ts:44,82,169`). |
| Autres surfaces | Globe WebGL résident, RAF seulement visible/invalidé (`planet-dense-view.ts:47–57,81`). Canvas2D des curseurs : préparation/cache (`tool-cursors.ts:91,171,268`). Horloge SVG aux minutes/conditions ; FPS/diagnostic à 1 s, détail seulement visible (`site-hud.ts:147`, `main.ts:2198`). |

## Priorités de l’audit

1. **Filtrer les candidats avant la visibilité coûteuse.** Livré : nourriture/type/nutrition avant `knownPile`, distributeur avant `knownBuilding`, lit civil avant empreinte, priorités désactivées avant recettes. Réordres purs, sans nouveau cache ni baisse de cadence. Retours alimentaires complets, alertes/targets/ordre et sérialisation strictement identiques sur Forges335/Aulnes10733/Éclaircies1730 (`tmp/hud-depth-v438/ui-filter-comparison.json`, PASS90,943s). Sur Forges, les appels de visibilité alimentaire passent de1778à261 pour les piles et7512à0 pour les bâtiments ; Aulnes382→194/2372→1, Éclaircies1663→20/416→0.
2. **Préparer seulement le dossier visible.** Livré pour l’environnement de pièce : retour avant lecture du World si sa ligne a un ancêtre `hidden`. Création initiale et contexte d’objet conservés ; le clic d’onglet dévoile le panneau avant son actualisation, y compris en pause. Les autres dossiers et le partage plus large des lectures restent à approfondir si leurs coûts le justifient.
3. **Limiter écritures/placements aux changements effectifs.** À différer si leur coût mesuré reste faible ; simplifier aussi CSS/hiérarchie pour la lisibilité, sans gain FPS présumé.

## Mesure et décision

Instrumenter temporairement `renderState`, recensement/projections, alertes, portraits, inspections et placement : appels/s, total, médiane/p95/max, corrélation styles/layout/paint. Même partie/caméra : sans sélection, Bio, Besoins, Animaux ; fenêtres courtes. Séparer CPU, mutations DOM, layout/paint et GPU, sans additionner les durées imbriquées.

**Refonte ciblée de la préparation et de la composition du HUD** à privilégier. Aucun besoin de HUD intégralement GPU démontré. Conserver texte/formulaires/focus accessibles ; réserver le GPU aux éléments spatiaux mobiles ou massifs dont le coût est mesuré. Préserver les caches et garde-fous existants dans la comparaison.

**Rouge ciblé conservé.** V393 ligne32 attend `[182]` pour un simple `group.memberIds` greffé sur une carte avec registre vide. Baseline `5b7df33c` et lecteur corrigé donnent exactement `[]`, monde inchangé ([preuve](../../tmp/hud-depth-v438/ui-traveller-case.json)). Le test vient de `1975e815`, 16 octobre 07:21 ; la priorité du registre de `45805ee01`, 16 octobre 18:11. Aucune assertion ni règle de caravane modifiée.

## Étiquettes physiques : correction et coût

Les quantités et qualités étaient peintes sur un canvas2D superposé, après le
rendu du monde. Il ne pouvait pas consulter sa profondeur. Ce canvas est
remplacé par un lot GPU résident, avec un atlas original de glyphes640×432
préparé une fois, texte12px et contour conservés. Les positions changent à
l’adoption utile ; mouvement, zoom et projection ne modifient aucun buffer.
Le lot teste la profondeur de la scène, sans l’écrire. Un appel graphique
remplace la couche2D ; aucune passe d’occlusion, lecture GPU, sonde par objet
ou cible graphique supplémentaire ajoutée. Cela ne signifie pas un coût GPU
mathématiquement nul.

Les ancres reprennent les supports physiques : étagères, tables et postes,
sommet des piles et des paquets. Les plafonds de formes sont mis en cache sur
les domaines finis d’items/formes, hors caméra. Les limites de zoom, les
qualités, les propriétaires et la découverte restent applicables. Les piles
au sol partagent leurs décalages verticaux fixes ; les étagères conservent leurs
niveaux physiques plutôt qu’un regroupement selon la caméra. Les objets opaques
au premier plan masquent les chiffres ; les surfaces transparentes qui
n’écrivent pas la profondeur gardent leur comportement de transparence.

Chrome155/WebGPU AMD RDNA1, témoin préparé avec vraies géométries de production,
1425×891/DPR1 : chiffres75/42 cachés derrière le mur,12/9 visibles devant ;
étagère et ses trois niveaux, blocs75, bois, médicaments et paquet qualitatif
contrôlés. Perspective basse/haute et orthographique inspectées. Sur la face
opaque, comparaison à la même vue sans libellés :335pixels différents avant,
**0après** (seuil12), `occlusion-pixels.json`. Aucun avertissement/erreur console.
Les caractères utilisent leurs avances Arial individuelles, sans kerning entre
glyphes ; aucune identité exacte avec la rasterisation Canvas entière annoncée.

Comparaison isolée2500piles, même scène/angle, rotation0,16rad/s, ABBA avec1s
d’échauffement et4s par passe, CPU et RAF successifs aux autres contrôles :

| Mesure | Ancien canvas, deux passes | Lot GPU, deux passes |
|---|---:|---:|
| CPU des libellés moyen/image |6,849 /6,728ms|0,008 /0,013ms|
| RAF moyen |67,68 /70,10FPS|236,50 /235,99FPS|
| RAF p99 |29,1 /20,8ms|4,6 /8,3ms|
| Appels graphiques de cette scène |4|5|

Matériau, géométrie et versions des attributs inchangés pendant chaque fenêtre.
CPU de soumission du rendu voisin0,50–0,56ms avant,0,49–0,54après ; GPU non
chronométré directement. Rapport `tmp/hud-depth-v438/performance.json`.
Cette scène sans simulation n’est ni Les Forges, ni une preuve de200FPS stables
dans toutes les vues du jeu. Le gain porte sur le chemin des libellés.

## HUD réel après correction

Même copie instrumentée du programme et reprise depuis Les Forges335,80colons,
241animaux, WebGPU1280×720, fenêtres4s après1s d’échauffement. Durées CPU
inclusives par appel `renderState` :

| Contexte | Avant moyen /p95 | Après moyen /p95 |
|---|---:|---:|
| Sans sélection |19,47 /23,3ms|12,06 /13,2ms|
| Colon, Bio |42,24 /46,4ms|14,38 /16,9ms|
| Colon, Besoins |40,35 /42,7ms|28,11 /32,1ms|

Sans sélection, capture alimentaire5,77→0,725ms et alertes6,04→2,70ms moyens.
En Bio, lecture de pièce≈10–12ms avant, sous résolution du chronomètre après ;
en Besoins elle reste calculée≈11ms. Ouverture de Besoins en pause contrôlée :
texte courant visible, température/propreté/beauté/lumière présentes.

L’ABBA privé qui court-circuite seulement l’environnement caché donne
HUD40,50/39,51→27,73/29,46ms, cohérent avec ce retrait. Masquer seulement la
peinture DOM, calculs conservés, donne des RAF mixtes : visible60,63/64,58,
masqué69,43/58,75FPS. Aucune amélioration nette de peinture ni nécessité d’un
HUD intégralement GPU démontrée. Layout/paint/GPU ne sont pas chronométrés
directement par cette sonde.

Les parties continuent pendant ces relevés : les ticks et le travail diffèrent,
les wrappers ajoutent un coût et les petits échantillons ne démontrent aucun
gain global de FPS ni de débit physique. Les vitesses physiques des reprises
restent faibles et mixtes : sans sélection0,499→0,332 ; Bio0,442→0,415 ;
Besoins0,527→0,539. Les RAF correspondants sont86,00→92,90,61,91→82,08 et
55,97→48,10FPS : le dernier recule et n’est pas masqué. Les fenêtres diffèrent
en ticks (336–348/336–344,522–533/407–417,749–762/504–517), donc ne sont pas
une paire de rendement physique identique. Ces limites sont conservées ; aucun confort général rétabli
ou objectif200FPS atteint annoncé. Rapports `ui-none`, `ui-bio`, `ui-needs`,
`ui-room-abba`, `ui-paint-abba`, `ui-after-*` sous `tmp/hud-depth-v438/`.

## Qualification

19cas des5fichiers libellés/supports/découverte/détail acquis en39,237s après
l’ajout des ancres physiques. Premier groupe16cas acquis avant cet ajout.
Le groupe alimentaire/alertes/section masquée donne22PASS/1RED historique
en42,660s ; diagnostic ancien/nouveau strict du rouge conservé ci-dessus.
Un premier typage a refusé la clef optionnelle d’une forme de fragment : repli
explicite à0 ajouté, sans assouplissement de type ni changement de validateur.
Les deux pilotes historiques V135/V138 sont adaptés aux captures avec/sans
libellés GPU, culling et superposition DOM ; ils ne sont pas annoncés exécutés
ici. Contrôles d’horloge/interpolation et campagne longue non rejoués pour ce
lot de rendu/lectures UI, qui ne modifie pas ces contrats.

Typage final et build Pages acquis ensemble en31,580s. Aucun fichier de
sauvegarde publique ou personnelle modifié par ce lot.
