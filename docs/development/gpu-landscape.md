# Plantes 3D instanciées et paysage — V97

V99 : [repères des acteurs](interaction-feedback.md). Les zones cliquables des animaux sont projetées depuis leurs attributs GPU uniquement lors des gestes de sélection. Anneaux par espèce, barres et chemins utilisent des lots instanciés, les mêmes trajectoires/horloges et des buffers stables ; les lots vides sont cachés. Le paysage, ses ombres et les règles de simulation ne sont pas simplifiés.

## Rendu selon la distance V97

La vue proche retrouve le rejet hors champ ordinaire propre à chaque caméra, y compris celle des ombres. La vue globale conserve ses quelques commandes GPU. `LandscapeBatch.setRetained` restaure la visibilité initiale des objets en quittant ce chemin ; aucun seuil de détail ni objet visible n'est supprimé. L'adaptateur V96 reste actif.

Les touffes maintiennent une enveloppe conservatrice par transformations modifiées. Ressources et vue globale consomment les deltas de présentation ; suppressions, retours et changements d'espèce/chunk gardent leur oracle complet. La vue globale filtre aussi l'herbe du flux non filtré. [Architecture](../research/performance-v97.md), [images exactes et mesures](../history/validation-performance-v97.md).

## Contexte de rendu et caméra V96

`ReentrantRenderer` isole le contexte des commandes conservées pendant les rendus imbriqués d’ombres. Three 0.186.0 perdait autrement l’enregistrement des objets suivants : leurs matrices n’étaient réactualisées qu’à l’adoption suivante du monde. Les commandes GPU restent conservées, les uniforms de tous les objets sont mis à jour dès chaque mouvement. L’adaptateur dépend d’un champ interne identifié et doit être réaudité lors d’une mise à jour de Three. [Cause, test natif de mouvement et mesures](../history/validation-camera-v96.md).

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
