# Plantes 3D instanciées et désignations — V95

## Choix de présentation

À la demande de l'utilisateur, V94 retire entièrement le champ de brins `GpuGrassLayer` de V92. `grass` et `tall-grass` redeviennent des plantes physiques 3D correspondant aux ressources sauvegardées. Le terrain n'ajoute plus de tapis ambiant procédural. Agave, cultures, arbres et autres espèces conservent leurs couches propres.

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
