# Paysage GPU et désignations — V92

## Périmètre

V92 remplace les petits cônes d'herbe du terrain et les boîtes des espèces `grass` / `tall-grass` par un unique champ de brins instanciés. L'agave conserve son modèle propre. Les désignations **Miner**, **Abattre**, **Récolter** et **Couper** partagent un second lot instancié de billboards et les quatre cellules de la première rangée de `/assets/ui/lisiere/icons.png` (atlas 4×5). Une rangée procédurale blanche sert de secours pendant le chargement ou si l'asset manque.

Ce lot est une présentation. Les ressources, travaux, réservations, durées, produits, sauvegardes et migrations ne changent pas.

## Brins résidents

L'approche reprend `E:/Code/Antsystem/src/graphics/grass.js`, consulté en lecture seule le 21 septembre 2026. Un quad effilé fournit quatre sommets. `instanceIndex` détermine une racine stable, l'orientation, la hauteur et la teinte. Le vertex shader choisit la réplique la plus proche du centre caméra sur un pavage toroïdal de période `2R`; un fondu masque le bord du disque. Le centre est la projection du regard sur le sol, y compris depuis une caméra isométrique haute. L'animation utilise l'horloge de présentation confirmée et un vent partagé dérivé de l'état V87, donc une pause ne laisse pas avancer une horloge murale indépendante.

Le CPU ne crée, déplace ni oriente de brin à chaque image. Il met à jour les uniformes caméra/tick et le nombre dessiné selon la hauteur. Géométrie, orientation et animation sont GPU. Cette formulation ne prétend pas que la simulation biologique ou les changements du masque sont « 100 % GPU ».

## Masque du monde

Une `DataTexture` RGBA de la taille de la carte capture quatre états : sol herbeux ordinaire, présence physique d'herbe courte, présence physique d'herbe haute et cellule utilisable. Elle est reconstruite et téléversée lorsque le terrain, les ressources ou les bâtiments changent, jamais par image.

- l'eau, le massif rocheux et les autres terrains sans herbe restent à zéro ;
- toute plante ou roche physique retire le tapis ordinaire à sa cellule ; `grass` et `tall-grass` sélectionnent plutôt leur hauteur dédiée ;
- les sols construits et toutes les cellules de l’emprise réelle d’un bâtiment restent à zéro ;
- les limites sont testées dans le shader avant l'échantillonnage et le fondu du disque.

Les anciennes géométries de `grass` et `tall-grass` sont exclues des vues proche et lointaine. Les autres espèces restent dans leurs lots historiques.

## Icônes d'ordre

Un `InstancedBufferGeometry` résident contient seulement position et indice d'icône. `SpriteNodeMaterial` effectue l'orientation vers la caméra dans le vertex shader et échantillonne la première rangée de l'atlas avec une marge alpha. Les quatre familles ont la même taille et la même hauteur logique. Le billboard conserve les couleurs de l'atlas, ignore la profondeur et s'affiche au-dessus des feuillages afin qu'un ordre confirmé sous un arbre reste lisible, sans l'ancien carré clair au sol. Le rectangle de prévisualisation garde l'ordre de rendu supérieur.

Les buffers d'instances grandissent par puissances de deux et ne sont téléversés que si l'ensemble persistant de désignations change. Les anciens carrés au sol et la croix spéciale de minage ne sont plus générés pour ces quatre familles. Plans, cadres, semis et autres travaux gardent leur présentation antérieure.

## Version et vérification

Implémentation vérifiée contre Three.js / TSL `0.186.0`, notamment `instanceIndex`, `texture(...).sample`, les attributs instanciés et `SpriteNodeMaterial.positionNode`. `tests/gpu-landscape.test.ts` contrôle le masque terrain/bâtiments/plantes, le retrait ciblé des anciens modèles avec conservation de l'agave, la correspondance des quatre icônes et la réduction du nombre de brins à distance. Le typecheck complète ces contrôles ciblés. Aucun pilote natif, benchmark lourd ou campagne longue n'est requis pour ce changement borné de présentation.

Les haches sont placées au-dessus de la couronne calculée de l’arbre ; les pioches au-dessus du relief rocheux. Les attributs ne sont téléversés que si les placements changent. Les résultats natifs sont dans [les preuves V92](../history/validation-interface-v92.md).
