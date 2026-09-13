# Référence visuelle, échelle et lisibilité 3D

Recherche et interprétation : 13 septembre 2026. Les observations ci-dessous proviennent d'images réellement affichées dans le lecteur YouTube, dans un onglet séparé du prototype. Elles ne constituent ni un visionnage intégral, ni une mesure du moteur de RimWorld. La version et les mods éventuels de cette partie ne sont pas vérifiés.

La mise en œuvre a ensuite été contrôlée dans le jeu sur WebGPU matériel : [preuve graphique](../development/render-validation.md). L'angle initial a été relevé pour lire les colons dans la forêt ; les panneaux de gestion reprennent les positions et catégories décrites ici sur leur périmètre livré.

## Journal d'observation

Source fournie par l'utilisateur : [Wilesey — RimWorld Gameplay (No Commentary), Episode 1](https://www.youtube.com/watch?v=SjLlqTnTRsc), durée affichée 1 h 29 min 13 s. L'extraction web du lien a échoué ; le lecteur navigateur a finalement permis les observations après plusieurs annonces. Aucun contenu publicitaire n'est utilisé comme référence.

| Instant réellement observé | Constat visuel | Conséquence pour Lisière |
|---|---|---|
| [26:46–26:48](https://www.youtube.com/watch?v=SjLlqTnTRsc&t=1606s) | Trois portraits et noms centrés en haut, avec Z de sommeil. Compteurs ressource icône + nombre en haut à gauche. Description de l'outil au-dessus des catégories Architecte, en bas à gauche ; palette d'objets horizontale au-dessus du menu principal. Alerte, température, météo, heure, date et vitesse à droite. | La carte reste le fond principal. Les panneaux de gestion s'ouvrent depuis le bas ; éviter un tableau de bord entourant un petit viewport. Maintenir la hiérarchie et les emplacements familiers, sans reprendre les graphismes propriétaires. |
| [26:46–26:48](https://www.youtube.com/watch?v=SjLlqTnTRsc&t=1606s) | Mur continu raccordé au rocher naturel ; portes interrompant le contour ; pièces lisibles sans toiture opaque. Trois lits rectangulaires occupent chacun environ deux cases en longueur. Les piles de ressources portent des quantités et occupent le sol du stockage violet. | La hauteur 3D d'un mur doit avoir une coupe de présentation. Les piles sont des objets physiques à livrer dans G0. Le lit miniature 1 case actuel n'est pas une dimension définitive. |
| [53:34](https://www.youtube.com/watch?v=SjLlqTnTRsc&t=3214s) | Ordre de minage : massif sombre contigu, contour irrégulier, rangées de cases désignées sur la roche ; passages et pièces creusées contrastent avec la roche pleine. Les cases ne sont pas quadrillées en permanence. | Distinguer visuellement rocher solide infranchissable et sol rocheux praticable. Les désignations doivent s'aligner sur les cases et rester compréhensibles sur les obstacles. |
| [1:20:18](https://www.youtube.com/watch?v=SjLlqTnTRsc&t=4818s) | Un colon se trouve dans un passage étroit à une porte ; un autre travaille face à un établi. Les pièces et le couloir relient les ouvertures, pas les volumes pleins. Des champs occupent des rectangles au nord du bâtiment. | Conserver l'accès à une case de travail et la largeur utile d'une porte. Les futurs ateliers/lits exigent orientation, footprint et cases d'interaction distinctes. |
| [1:20:34](https://www.youtube.com/watch?v=SjLlqTnTRsc&t=4834s) | Colons dans d'autres positions et une pile portée visible sur un colon ; activité de récolte au nord ; ordre Architecte fermé, menu principal toujours en bas. Survol de sol en bas à gauche indiquant notamment un facteur de vitesse. | Afficher le transport sur le personnage et distinguer terrain, occupation et coûts de traversée. La fermeture d'un panneau doit rendre immédiatement l'espace à la carte. |

Ces échantillons ne montrent pas de combat exploitable. Ils ne prouvent pas une règle de croisement entre deux personnages, le traitement des diagonales, les délais d'ouverture de porte, une poursuite ou une fuite. Les positions avant/après ne permettent pas de reconstituer le chemin exact. Les vitesses observées dans cette partie sont contrôlées par le joueur : aucune vitesse physique n'en est déduite.

Avant G3, compléter par des séquences continues et identifiées : deux acteurs opposés dans une porte ; angle de mur et tir ; ennemi contournant un obstacle ; cible mobile poursuivie ; retraite sous menace. Relever à chaque fois version, mods, vitesse du jeu, zoom, positions initiales et trajectoires. Les sources techniques de navigation restent dans le rapport spécialisé ; une vidéo seule ne révèle pas l'algorithme.

## Contrat d'échelle adopté

`src/world/scale.ts` centralise les dimensions. **1 unité 3D = 1 case = 1 mètre est un choix d'interprétation Lisière**, pas une conversion officielle de RimWorld. Une case est d'abord une unité de gameplay ; les murs occupent pour l'instant une case pleine, donc leur épaisseur reste exagérée par rapport à une vraie maison.

| Élément | Dimension retenue | Statut |
|---|---|---|
| Humain debout, sommet du modèle | 1,75 m | Appliqué au rig GPU procédural entier. |
| Mur | 2,80 m de hauteur | Appliqué aux structures et plans ; plus haut que l'humain. |
| Mur en coupe | 0,72 m | Présentation uniquement ; même obstacle logique. Mur plein par défaut. |
| Dégagement de porte | 2,15 m | Contrat réservé ; portes non encore livrées. |
| Arbre | 5–7 m | Silhouettes procédurales différenciées ; feuillage masquable, troncs conservés. |
| Lit | Cible 1 × 2 cases, matelas autour de 0,5 m | **Non livré** : placeholder actuel reste sur 1 case pour respecter le footprint de simulation existant. Migrer orientation et occupation ensemble. |
| Eau | Surface à −0,12 m | Dépression visuelle légère ; aucune simulation de fluide ni profondeur navigable. |
| Massif rocheux | Environ 1,7–4,05 m | Représentation des cases de roche infranchissables. Aucun étage sur le sommet. |

Éviter de résoudre un conflit de gameplay par une échelle purement graphique : un lit de deux cases visuelles mais une seule case de simulation ferait traverser son extrémité ; une porte large mais bloquant deux cases tromperait la lecture. La future table de définitions doit réunir dimensions d'usage, cases occupées et points d'interaction, puis transmettre seulement les données de présentation au renderer.

## Carte, caméra et procédure

La caméra initiale conserve un cadrage local fondé sur 32 cases, même quand la carte passe à 64 ou 128 cases. La taille d'un territoire change les distances de collecte et les temps de réaction ; elle ne doit pas rapetisser automatiquement les humains. Le zoom, la rotation, les raccourcis de déplacement et le centrage sur un colon permettent l'exploration. Les limites physiques restent celles de la grille, indépendamment du cadrage.

Le sol et les ressources utilisent des batches spatiaux de 16 × 16 cases, pour que chaque groupe conserve des bornes de visibilité utiles. Les ressources sont encore reconstruites lorsque leur signature globale change : l'invalidation au seul chunk modifié reste une optimisation à mesurer. La région d'ombre suit la caméra et conserve une taille locale, au lieu d'étirer une texture d'ombre fixe sur tout le monde.

Le relief visible n'est pas encore une heightmap navigable. Le sol praticable reste plan ; l'eau est creusée légèrement et le rocher infranchissable reçoit un volume. La génération doit d'abord assurer bassins cohérents, rives, clairière de départ accessible et distribution liée aux habitats ; ajouter du bruit à chaque case indépendamment ne suffit pas. Les nouveaux paramètres de génération et leurs garanties sont décrits par leur chantier et leurs scénarios de simulation.

Les deux outils de lecture `setWallCutaway` et `setFoliageVisible` ne modifient jamais le `World`. Masquer les couronnes garde les troncs et la position de chaque arbre ; couper les murs conserve le contour des pièces. Ces modes évitent de réduire toutes les hauteurs pour retrouver artificiellement la lisibilité de la 2D.

## Limites et prochaine validation

TypeScript valide après les changements de dimensions et de géométrie. Le changement de position GPU demande également compilation du shader, contrôle console WebGPU et inspection réelle : humain à côté du mur, sommeil, marche, ombre et changements des modes de visibilité. Cette validation graphique est consolidée avec l'interface et la génération dans le rapport de livraison ; un typecheck seul ne prouve pas le rendu.

La [présentation officielle de RimWorld](https://rimworldgame.com/) décrit des environnements, végétations et contraintes propres à chaque région. Elle appuie la cible de diversité crédible ; les dimensions métriques, hauteurs, options de caméra et profils de terrain ici proposés sont nos choix de conception.
