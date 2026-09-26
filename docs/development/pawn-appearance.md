# Apparence humaine modulaire — V109–V111

## Ajustement V111 des coiffures courtes et longues

La capture rapprochée de l'utilisateur corrige le réglage V110 : les tempes courtes finissent **au-dessus de la base de la nuque**. Les coiffures longues et les deux queues utilisent à la place des mèches latérales prolongées, et leur arrière descend lui aussi plus bas. Les mèches de la frange chevauchent légèrement la couronne en hauteur et en profondeur ; il n'y a plus de bande de peau entre les deux pièces. Les faces restent distinctes du front pour éviter les surfaces coplanaires. Ces changements réattribuent les quinze pièces résidentes existantes selon les familles, sans changer les identifiants sauvegardés, les portraits issus du maillage, l'animation ou le gameplay. [Preuves V111](../history/validation-appearance-v111.md).

## Retouche V110 des volumes et portraits

Les deux coiffures sombres de la capture annotée sont des **cheveux**, pas des couvre-chefs. Leurs couronnes trop rectangulaires ont été abaissées et divisées visuellement par les mèches déjà communes ; les cheveux couvrent maintenant les tempes et l'arrière de la tête. Deux mèches décalées couvrent ensemble toute la largeur du front, avec une face avant devant la peau pour éviter la coplanarité. Les joues de la barbe longent la mâchoire jusqu'à son arrière et descendent sous le menton. Les masques restent bornés aux quinze pièces de cheveux résidentes du lot V109 ; les variantes de coiffure ne créent aucun objet Three ni appel de dessin par personne.

Le HUD et Bio utilisent une projection orthographique fixe des **faces du même maillage** que le personnage en jeu. Proportions, pièces visibles, peau, cheveux et tenue viennent des mêmes paramètres ; ce n'est plus un second dessin manuel qui ressemble seulement au profil. Le portrait n'est pas une capture animée : il représente le personnage debout, au repos et vu sous un angle constant. Les faces sont extraites une fois et l'image SVG est mise en cache par identité et tenue, sans scène WebGPU, rendu supplémentaire ou travail à chaque image. La première création d'un grand nombre de portraits reste un coût ponctuel. [Contrôles et mesures V110](../history/validation-appearance-v110.md).

## Référence et interprétation

[Recherche Core 1.6.4871](../research/pawn-appearance-reference-v109.md). RimWorld compose des dessins existants ; Lisière compose des volumes originaux à huit articulations rigides, inspirés de l’artwork voxel fourni. Les dessins commerciaux ne sont ni copiés ni distribués.

Cinq silhouettes adultes (`Male`, `Female`, `Thin`, `Hulk`, `Fat`), douze têtes, vingt-six définitions de cheveux urbains interprétées en treize familles de volumes partagés. Des styles peuvent partager une silhouette : ce ne sont pas vingt-six sculptures uniques. Neuf teintes de peau et dix-huit bases de cheveux, avec pondération de peau foncée et variation lumineuse Core quand autorisée. Barbes possibles sur profils explicites ; génération ordinaire sans barbe faute d’âge biologique connu. Corps robustes/larges acceptés et montrés dans la démonstration ; leur attribution par biographies reste absente. Le générateur sans biographie adopte le repli Core : moitié fins, sinon corps masculin/féminin selon le sexe visuel.

`Pawn.appearance` version 1 conserve sexe visuel, corps, tête, cheveux, barbe et deux couleurs RGB8. Sexe/âge/parenté n’acquièrent aucune règle biologique par ce champ. Identité créée une seule fois pour les nouveaux habitants, arrivants, visiteurs et assaillants ; hash cosmétique indépendant du PRNG métier, pas de tirage à chaque image. Les anciennes sauvegardes gardent ce champ absent. Leur projection déterministe, mise en cache et non persistée, préserve les identités familières d’Ada, Noé et Mina ; elle ne constitue pas une donnée biologique découverte.

## Rendu et interface

Un seul lot humain instancié conserve géométrie et articulations partagées. Morphologie appliquée aux sommets et pivots avant animation ; armes conservent leurs dimensions, équipement et tissus suivent les proportions. Les cinq silhouettes gardent taille de déplacement, anatomie et collisions métier historiques. Cheveux/barbes sont un petit ensemble de pièces résidentes activées par masques. Peau, cheveux et vêtements sont séparés ; aucun changement des identifiants d’armes ou de capuche.

Les attributs de tenue, peau, cheveux et morphologie partagent un flux interleavé : sept flux utilisés et seize attributs au plus dans le shader humain, sous les minima WebGPU. Les lots de transport, sélection, feu et progression gardent la même trajectoire confirmée V108. L’agrandissement des buffers conserve données et matériaux. Aucun squelette JavaScript individuel ni nouvelle animation CPU par colon.

Le portrait V109 composait un dessin SVG depuis le même profil et la tenue ; V110 remplace cette composition indépendante par la projection du maillage décrite plus haut. Les anciennes illustrations restent dans les assets historiques. L’inspection tardive est déplacée sous Bio sans duplication à chaque actualisation. Les traits sont lisibles pour les anciennes parties aussi, sans réécrire leur sauvegarde.

## Persistance et frontières

Schéma 106 strictement validé avant migration neutre vers 109. Profil futur en 106 refusé ; énumérations, couleurs et cohérence tête/corps/sexe contrôlées en 109. Les visiteurs emportent leur profil dans leurs archives de sortie ; profils corrompus refusés. PRNG et objets historiques restent inchangés.

Restent absents : biographie générée Core complète, âge biologique/chronologique, vieillissement/grisonnement temporel, éditeur de coiffure, tatouages et toutes variations vestimentaires/visages du jeu commercial. La sélection initiale des colons et les anciens noms prédéfinis ne deviennent pas le générateur exhaustif de RimWorld.

## Essai

Charger → Colonies de test → **Visages et armurerie · 5 colons**. Cinq profils préparés couvrent toutes les silhouettes, plusieurs peaux/coiffures/barbes. Faire tourner la caméra et consulter Bio ; reprendre pour fabriquer le [gilet pare-balles](flak-armor.md). Cette scène préparée ne représente pas une colonie développée naturellement.
