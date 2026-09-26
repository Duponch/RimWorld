# Plantes 3D instanciées et paysage — V116

V116 ajoute un **tapis d'herbe décoratif** sur les seules cellules de terre (`grass`, `soil`, `rich-soil`). Il ne remplace pas les plantes physiques 3D rétablies en V94 : celles-ci gardent ressources, travaux, croissance et sauvegarde. Un seul carré à deux triangles est instancié. Chaque instance désigne une case absolue du monde et un emplacement stable dans cette case ; la racine, la forme et le vent sont calculés dans le shader. Déplacer ou tourner la caméra change la fenêtre de cases soumise au GPU, pas la racine d'un emplacement conservé. L'empreinte visible, étendue d'une case, borne cette fenêtre ; le rasteriseur rejette ensuite les fragments hors écran. Ce n'est pas un rejet individuel de chaque brin sur le CPU. Le nombre total d'instances reste plafonné à 120 000 : le rapprochement de la caméra réduit le nombre de cases visibles et permet d'augmenter les emplacements par case sous ce même plafond. Une carte RGBA de quatre octets par cellule reprend exactement la palette et la variation par case du terrain, avec la même normale verticale et le même éclairage. Elle masque l'eau, le gravier, les roches, les sols construits, les constructions, les piles et les meubles posés. Elle n'est réenvoyée que si la couverture ou la couleur change. La densité et la hauteur décroissent au dézoom jusqu'à disparition sous 20 pixels par case ; le tapis se retire aussi au LOD distant et avec l'option de masquage du feuillage. Il ne porte aucune ombre projetée.

L'option « Tapis d'herbe » est commune à l'accueil et au jeu, persistée dans le navigateur et indépendante des sauvegardes. Désactivée, la couche est absente de la scène : aucun maillage, atlas, matériau, pipeline ou mise à jour de carte ne lui appartient. La réactivation la reconstruit depuis l'instantané courant. Ce choix ne modifie ni les plantes physiques ni la simulation.

Le relief rocheux utilise désormais un pigment pastel de larges aplats en coordonnées monde, sans nouvel attribut UV ni nouveau lot. Les rochers ramassables et leurs dérivés exploitent les couleurs de sommet existantes par facette. L'option « Textures 3D stylisées » conserve le matériau uni pour le relief quand elle est désactivée. Le cône supérieur des sapins est davantage encastré dans le cône inférieur, sans changer la taille de l'arbre ni les règles de croissance. Les coûts et limites du rendu natif sont consignés dans les [preuves V116](../history/validation-landscape-v116.md).

V113 porte `WORLD_SCALE.chunkSize` de 16 à 64 **pour la présentation seulement**. Terrain, roches et ressources sont fusionnés en moins de lots sans modifier leurs cellules, sommets ni seuils LOD. En vue détaillée intermédiaire, la soumission CPU diminue nettement ; les gros lots peuvent toutefois réduire la précision du rejet hors champ et augmenter les triangles encodés. Les 14 états WebGPU V112/V113 comparent pixels, ombres, caméra et géométrie à l'identique. [Diagnostic](../research/performance-v113.md), [preuves et limites](../history/validation-performance-v113.md). Ne pas supprimer le rejet propre à la caméra des ombres ni l'adaptateur V96 pour tenter d'autres gains.

V107 : [salissures transparentes](cleanliness.md#aspect-des-traces-v107), un atlas original et un lot instancié indépendant du paysage conservé. Une couche physique produit deux triangles, contre trois boîtes par trace auparavant ; cette réduction géométrique ne mesure pas à elle seule le coût des fragments alpha. Les mesures natives restent nécessaires. Attributs stables entre changements métier, même après mouvement de caméra ; aucune simulation dans le shader.

V99 : [repères des acteurs](interaction-feedback.md). Les zones cliquables des animaux sont projetées depuis leurs attributs GPU uniquement lors des gestes de sélection. Anneaux par espèce, barres et chemins utilisent des lots instanciés, les mêmes trajectoires/horloges et des buffers stables ; les lots vides sont cachés. Le paysage, ses ombres et les règles de simulation ne sont pas simplifiés.

## Rendu selon la distance V97

La vue proche retrouve le rejet hors champ ordinaire propre à chaque caméra, y compris celle des ombres. La vue globale conserve ses quelques commandes GPU. `LandscapeBatch.setRetained` restaure la visibilité initiale des objets en quittant ce chemin ; aucun seuil de détail ni objet visible n'est supprimé. L'adaptateur V96 reste actif.

Les touffes maintiennent une enveloppe conservatrice par transformations modifiées. Ressources et vue globale consomment les deltas de présentation ; suppressions, retours et changements d'espèce/chunk gardent leur oracle complet. La vue globale filtre aussi l'herbe du flux non filtré. [Architecture](../research/performance-v97.md), [images exactes et mesures](../history/validation-performance-v97.md).

## Contexte de rendu et caméra V96

`ReentrantRenderer` isole le contexte des commandes conservées pendant les rendus imbriqués d’ombres. Three 0.186.0 perdait autrement l’enregistrement des objets suivants : leurs matrices n’étaient réactualisées qu’à l’adoption suivante du monde. Les commandes GPU restent conservées, les uniforms de tous les objets sont mis à jour dès chaque mouvement. L’adaptateur dépend d’un champ interne identifié et doit être réaudité lors d’une mise à jour de Three. [Cause, test natif de mouvement et mesures](../history/validation-camera-v96.md).

## Choix de présentation

À la demande de l'utilisateur, V94 retire entièrement le champ de brins `GpuGrassLayer` de V92. `grass` et `tall-grass` redeviennent des plantes physiques 3D correspondant aux ressources sauvegardées. Il n'y avait alors plus de tapis ambiant procédural ; la nouvelle demande V116 le réintroduit comme couche **distincte et facultative**, sans restaurer l'ancien `GpuGrassLayer`. Agave, cultures, arbres et autres espèces conservent leurs couches propres.

Ce changement est graphique : espèces, quantités, croissance, travail, produits, sauvegardes, migrations et PRNG de simulation restent inchangés.

## Touffes verticales

`PlantClusterLayer` utilise un seul `THREE.InstancedMesh` résident et une géométrie partagée de sept tiges effilées à trois côtés. Les tiges partent du sol et montent sur l'axe Y ; elles ne sont donc plus couchées. Leur faible diamètre, leurs hauteurs et inclinaisons distinctes donnent une touffe légère plutôt qu'une tige épaisse.

La position, la rotation, les échelles X/Y/Z et la nuance sont calculées de façon déterministe depuis l'identité, les coordonnées et l'espèce. Une herbe courte et une herbe haute ne partagent pas exactement la même silhouette. Cette diversité n'avance aucun générateur aléatoire métier et reste identique après sauvegarde/rechargement.

La couche conserve ses allocations ; V95 reçoit seulement les identifiants visuellement changés et réécrit leurs emplacements. Elle n'effectue aucun travail CPU par plante à chaque image. Sur le nouveau départ de graine 42, **13 350** plantes physiques sont présentées dans ce lot unique. Le GPU dessine les instances, mais cela ne signifie pas que toute la simulation ou toute la végétation est « 100 % GPU ».

## Désignations

Miner, Abattre, Récolter et Couper conservent le lot résident de billboards introduit en V92. Une icône est orientée vers la caméra et placée au-dessus de la roche ou de la canopée ; aucun carré blanc au sol ni croix spéciale au minage n'est réintroduit. Les buffers ne sont actualisés que lorsque les désignations persistantes changent.

La fermeture d'Architecte conserve désormais l'outil choisi. Le joueur peut donc choisir un ordre, fermer le panneau pour découvrir la carte, puis cliquer réellement sa cible. Échap annule l'outil comme auparavant.

## Mesure et limites

V95 conserve les commandes WebGPU du paysage, ainsi que les attributs GPU inchangés. Les silhouettes, éclairages et ombres sont conservés ; les acteurs et la simulation ne sont pas figés. [Architecture, sources et limites](../research/performance-v95.md), [validation et mesures](../history/validation-performance-v95.md).

Correction de preuve : l'ancien contrôle A/B V94 rétablissait la visibilité des touffes à chaque image et ne permet donc pas d'isoler leur coût. Ses chiffres restent dans l'historique, sans servir de preuve comparative courante.

`tests/gpu-landscape.test.ts` vérifie la géométrie verticale multi-tiges, les variations déterministes, le lot unique, la conservation de l'agave et les correspondances de désignation. Le parcours natif vérifie en plus les instances réelles, la sauvegarde exacte et les clics de coupe/minage. Voir les [preuves V95](../history/validation-performance-v95.md), avec les limites de comparaison des pixels.
