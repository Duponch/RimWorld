# Plantes 3D instanciées et désignations — V94

## Choix de présentation

À la demande de l'utilisateur, V94 retire entièrement le champ de brins `GpuGrassLayer` de V92. `grass` et `tall-grass` redeviennent des plantes physiques 3D correspondant aux ressources sauvegardées. Le terrain n'ajoute plus de tapis ambiant procédural. Agave, cultures, arbres et autres espèces conservent leurs couches propres.

Ce changement est graphique : espèces, quantités, croissance, travail, produits, sauvegardes, migrations et PRNG de simulation restent inchangés.

## Touffes verticales

`PlantClusterLayer` utilise un seul `THREE.InstancedMesh` résident et une géométrie partagée de sept tiges effilées à quatre côtés. Les tiges partent du sol et montent sur l'axe Y ; elles ne sont donc plus couchées. Leur faible diamètre, leurs hauteurs et inclinaisons distinctes donnent une touffe légère plutôt qu'une tige épaisse.

La position, la rotation, les échelles X/Y/Z et la nuance sont calculées de façon déterministe depuis l'identité, les coordonnées et l'espèce. Une herbe courte et une herbe haute ne partagent pas exactement la même silhouette. Cette diversité n'avance aucun générateur aléatoire métier et reste identique après sauvegarde/rechargement.

La couche ne recrée son lot que lorsque la vue des ressources naturelles change. Elle n'effectue aucun travail CPU par plante à chaque image. Sur le nouveau départ de graine 42, **13 350** plantes physiques sont présentées dans ce lot unique. Le GPU dessine les instances, mais cela ne signifie pas que toute la simulation ou toute la végétation est « 100 % GPU ».

## Désignations

Miner, Abattre, Récolter et Couper conservent le lot résident de billboards introduit en V92. Une icône est orientée vers la caméra et placée au-dessus de la roche ou de la canopée ; aucun carré blanc au sol ni croix spéciale au minage n'est réintroduit. Les buffers ne sont actualisés que lorsque les désignations persistantes changent.

La fermeture d'Architecte conserve désormais l'outil choisi. Le joueur peut donc choisir un ordre, fermer le panneau pour découvrir la carte, puis cliquer réellement sa cible. Échap annule l'outil comme auparavant.

## Mesure et limites

Le contrôle natif alterne quatre fenêtres avec le lot visible ou masqué sur le même monde en pause. Le p95 reste **8,4 ms** dans les quatre fenêtres ; les médianes varient de **4,2 à 8,3 ms** selon l'ordre, ce qui interdit d'affirmer un coût nul. La courte fenêtre à vitesse demandée 6× atteint **5,64×**, image p95 **41,7 ms** et pic **216,6 ms**. Ces chiffres ne garantissent ni fluidité parfaite ni parité avec une charge à cent colons.

`tests/gpu-landscape.test.ts` vérifie la géométrie verticale multi-tiges, les variations déterministes, le lot unique, la conservation de l'agave et les correspondances de désignation. Le parcours natif vérifie en plus les instances réelles, la sauvegarde exacte et les clics de coupe/minage. Voir les [preuves V94](../history/validation-interface-v94.md).
