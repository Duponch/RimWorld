# V325 — Table rectangulaire, chambre fixe et ciel dégagé

Lot de présentation demandé le 12 octobre 2026. Schéma 229, simulation, bridge
et sauvegardes publiques conservés. Référence artistique fournie par l'humain :
`E:/Téléchargements/Lisiere_Table_Chambre_Orbites_WebGPU.html`.

## Géométrie et navigation

Une échelle commune part de la surface de table 5,89×3,32 du prototype. Le
plateau complet mesure 6,02×3,45 dans ce même repère ; une carte carrée reste
carrée et tient sur le côté court. `room-layout.ts` fournit les dimensions de
la table, le sol, les murs, les meubles et le cadre suspendu. La boîte en
carton conserve son échelle propre à la carte.

La table est reconstruite avec bordure, surface, pieds, traverses, petites
fixations et veinage. Le lit et la bibliothèque sont adossés au mur du fond.
Les arcs des nuages sont répartis sur plusieurs côtés, leurs fils partent des
arcs réellement modélisés. Les volumes restent assemblés au chargement dans
des géométries indexées ; aucune reconstruction par image ou par tick.

Les trois murs de la chambre restent présents, comme le cadre architectural
ouvert à l'avant du prototype. Le masquage des parois de la boîte reste
indépendant. La caméra est limitée à l'intérieur de la chambre selon son
rayon de visée, avec une marge pour son plan proche. Zoom, rotation, déplacement,
inertie et changement de projection passent par la même frontière. Les limites
sont dérivées de la géométrie ; chambre OFF, ce contrôle sort immédiatement.

## Masquage des suspensions

Les deux menus proposent un rayon central de 0 à 100 % du petit côté de l'écran,
31 % par défaut ; 0 désactive ce masquage. Préférence locale indépendante
`lisiere.presentation.room-mask-radius.v1`, conservée lorsque la chambre est
désactivée. Les arcs, barres, fils, globes et nuages de coton ont des matériaux
séparés de ceux des murs et meubles. Un rejet opaque au fragment applique le
cercle sans transparence, tri, passe supplémentaire ou parcours CPU des sommets.

Le masquage est visuel : il ne coupe ni les ampoules ni les ombres du plateau.
Le flou et son cache sont invalidés quand le rayon change, y compris en pause.
Chambre ON, les anciens nuages ne sont ni présentés ni dessinés ; chambre OFF,
ils retrouvent leur présentation et leur réglage indépendants. La pluie, le
vent, le calendrier et les règles météorologiques ne changent pas.

Le propriétaire des anciens nuages et son préchauffage initial restent présents
pour pouvoir rétablir ce mode. Ce lot supprime leur travail ordinaire en chambre,
sans prétendre supprimer leur allocation initiale. La chambre reste entièrement
détruite en OFF, comme en V324.

## Comparaison contrôlée avec la référence

ROOT seul exécute les contrôles, successivement, sur sources/tests/pilotes
gelés. Le benchmark isole chambre et table, sous Three 0.186 et Chrome WebGPU
matériel, 2560×1440/DPR1 : mêmes deux éclairages ponctuels et ambiance,
caméra, pixels et `RoomBackdrop` à demi résolution. Ombres désactivées dans
les deux décors, masque à zéro ; textures de notre table réellement chargées
avant la mesure. Les géométries/helpers du HTML proviennent de tranches
vérifiées exactes, SHA256 du HTML
`9c581e3cd5bdc990cd8a12405e50b4d650c6e80d1e99da4a93f52c3820206b2b`.

La comparaison A/B/B/A utilise deux poses, 2 s de chauffe et 4 s de mesure
chacune. Le fond est invalidé à chaque image : le cache statique ne peut pas
transformer ce contrôle en simple copie. Séries de huit rendus sans limitation
RAF, puis attente de la queue GPU ; CPU de soumission séparé.

| Pose | CPU référence → jeu | Appels de rendu référence → jeu | Rendus terminés/s référence → jeu |
| --- | --- | --- | --- |
| Proche de la référence | 1,797 → 0,392 ms (−78,20 %) | 203 → 20 | 384,26 → 806,04 |
| Large | 1,734 → 0,362 ms (−79,12 %) | 213 → 20 | 396,44 → 810,82 |

Les deux B sont meilleurs que les deux A pour ces deux métriques et poses.
Géométrie résidente chambre/table : 208 maillages, 75 128 triangles et
5 771 224 octets d'attributs/index dans la référence ; 17 maillages,
26 611 triangles et 1 480 414 octets dans le jeu. La chambre seule garde
16 lots, **25 171 triangles** ; la table reste un seul lot et le diorama 18.

La simplification du décor est donc un choix de coût confirmé dans ce périmètre,
et sa structure est conservée selon la condition humaine. Le diagnostic ne
compare ni les huit sources originales, ni le posttraitement complet du HTML,
ni le jeu complet à la scène vide. Le débit de séries terminées n'est pas un
compteur FPS de jeu ou un temps GPU isolé. Une identité de qualité artistique
et une économie générale du jeu ne sont pas prouvées par ce banc.

**PASS 81,016 s**, rapport
`tmp/diorama-v325/room-cost-mihynP/report.json`, gel final `freeze-iRQe23` exact
sur 2 793 entrées ; erreurs vides, Chrome/Vite 5406 fermés.

## Contrôles graphiques et conservation

Unitaires **77 cas / 12 fichiers, PASS 18,031 s** : proportions et assemblage,
caméra, masque et préférence, géométrie, lumière, cycle de vie, flou et boîte
historique. Rapport
`tmp/validation-runs/v325-unit-2026-10-11T22-18-12.660Z-21064/output.log`.

Chrome matériel **PASS 174,357 s**, rapport
`tmp/diorama-v325/native-full-pomeHA/report.json`, gel initial `freeze-dh3alz`
exact sur 2 793 entrées : six cadrages iso/perspective en contextes frais,
16 probes de coins/zoom contre un oracle indépendant des plans physiques,
trois murs présents, trois arcs et six nuages. Masques 0/75/31 via vraie UI,
changement de pixels, buffers conservés, persistance accueil/recharge ; deux
cycles OFF/ON et OFF froid. Les anciens nuages sont absents ON et visibles OFF
à un angle admissible ; le réglage du nouveau masque reste indépendant.
Captures de la table et de la chambre inspectées.

Les Aulnes originales sont chargées sans dotation, World en pause 8434 exact
pendant les gestes de présentation. La fenêtre ×6 puis sauvegarde/recharge
aboutit au tick **8679 exact**. La mesure absolue de 6,014 s entre 8479 et 8664
donne **69,67 RAF/s et 5,127× réels**, textures/herbe/ombres/zones/carton conservés.
Elle utilise un cadrage différent des comparaisons V324 et ne constitue ni un
gain, ni une régression comparée ; **240 FPS et vrai ×6 constant non certifiés**.
La mémoire Three partielle revient aux mêmes compteurs ON lors des deux cycles
(266 835 537 octets), sans assertion de mémoire pilote exhaustive.
Erreurs vides et Chrome/Vite fermés.

## Rouges, réparations et clôture

Le build initial est rouge **11,594 s**, TS2352 sur une conversion de tableau
vers tuple dans la table. L'annotation `satisfies Point[]` corrige uniquement
le typage : le JavaScript émis par le vrai transformateur Vite/OXC est
**exactement identique** au gel du natif et des unitaires. Preuve privée
`tmp/diorama-v325/type-only-exact.json` ; leurs acquisitions restent valides,
sans rejeu graphique identique. Build Pages et typage final **PASS 17,266 s**,
rapport `tmp/validation-runs/v325-build-final-2026-10-11T22-23-23.609Z-15908/output.log`.

Le premier banc de coût est rouge **48,662 s**, avant toute mesure : son pilote
utilise `GPUCanvasContext.getConfiguration`, absent ici, et demande un favicon
inexistant. Réparation du pilote seulement : device du backend Three réellement
actif et favicon local vide ; aucun changement produit. Rouge conservé dans
`tmp/diorama-v325/room-cost-cYlrfr/report.json`, reprise verte distincte ci-dessus.

Simulation, bridge et fichiers publics inchangés. Aucune campagne naturelle ni
régression complète de simulation rejouée pour ce lot de présentation. Aucune
dépendance mise à jour. Barricades seulement préparées, sous-métiers reportés,
branche UI papier conservée et relance planifiée **PAUSED**.

Liens documentaires **PASS 12,674 s**. Package Pages **PASS 2,345 s**, avec
les 63 références et 66 chemins de sauvegarde publics exacts ; contrôle privé
`tmp/elsewhere-pages/verify-v325.mjs`. La publication regroupée et sa vérification
HTTPS sont consignées ci-dessous, sans nouvelle compilation du produit.


## Publication

Produit **`00995fac`** commité et poussé sur `main`, puis publié une seule fois
sur [l’adresse stable](https://elsewhere-cq7.pages.dev/) et
[la publication V325](https://666b3ef1.elsewhere-cq7.pages.dev/).
Package de **515 fichiers / 119 191 064 octets**, 63 références et 66 fichiers
publics exacts, laboratoire absent ; rapport
`tmp/elsewhere-pages/v325-package-yiOxgO/report.json`.

Wrangler 4.149.0 **PASS 13,022 s**, deux fichiers envoyés et 511 déjà présents,
puis en-têtes/redirections. HTTPS **PASS 5,943 s**, **102 réponses**200/MIME/octets
exactes sur les origines stable et fraîche ; rapport
`tmp/elsewhere-pages/v325-http-YfBuuH/report.json`. Package et publics restent inchangés. `references_UI` seul reste
non suivi ; il ne fait partie ni du commit ni du package. Le commit documentaire
consigne cette publication sans deuxième déploiement.

Ces contrôles HTTPS ne rejouent pas un navigateur ou une mesure de performance
en ligne, ni tous les fichiers de sauvegarde distants. Relance **PAUSED**,
aucun lot suivant engagé.
