# Éclairage local 3D — présentation sous V36

V42 étend les sources communes au générateur et à la lampe alimentés : voir [électricité](power.md). Texture et nœuds conservés ; le changement de puissance est une transition discrète, les halos restent des coefficients artistiques. Rayon brut 12 de la lampe provisoire, pas une certification des Defs actuelles.

15 septembre 2026. [Recherche et adaptations](../research/environment-lighting-reference.md), [validation](validation.md). La présentation initiale sous V36 ne changeait pas le schéma. Les états électriques sont désormais persistés en V42 dans leur contrat distinct.

V42 : le diffuseur conserve son tableau si les sources, les dimensions et les obstacles dans leurs bornes de portée sont identiques. Un minage éloigné peut changer les IDs de pièces sans toucher aucun trajet lumineux. La texture vérifie séparément la topologie, car son canal bleu d’opacité doit tout de même suivre le terrain et les murs ; ne pas déduire son invalidation du seul tableau de lumière. Comparaison contre un cache neuf et contrôle des canaux dans les scénarios existants.

## Règles et image

Les feux allumés éclairent visuellement terrain, eau, roches, végétation basse, bâtiments, piles, corps et cargaisons. Les deux projections et le LOD distant utilisent le même champ. Murs, roches pleines et portes, même ouvertes, bloquent sa propagation suivant le diffuseur V36. Le toit supprime la composante céleste logique, pas celle du feu. Masquer le toit ou couper les murs ne supprime aucun obstacle lumineux.

Le rendu reste une interprétation 3D : halo chaud interpolé entre cellules, composante colorée modulée selon la normale de la facette et ambiance faible pour garder les objets lisibles dans l’obscurité. Sous couverture, le résultat des lumières globales est multiplié par 0,12 et reçoit un faible remplissage bleu. Le feu apporte une composante chaude pondérée par le champ. Ce n’est ni une mesure photométrique, ni la reproduction du compositing 2D de Core. L’inspection reste l’autorité pour le pourcentage et les facteurs de production.

Les flancs des obstacles échantillonnent leur côté exposé ; leur centre logique ne transmet pas la lumière. L’interpolation peut éclairer un bord visible sans traverser une cellule opaque entière. Au-dessus de la hauteur de maison centralisée, l’effet s’efface : sommets des toits et canopées gardent le ciel extérieur. Les coupes de murs gardent une tranche lisible. Les ombres directionnelles habituelles restent présentes ; un toit masqué ne projette plus son ombre Three, mais la couverture continue d’assombrir l’intérieur.

## Propriété et invalidation

`EnvironmentLightField` appartient au renderer. Il réutilise `RoomTopologyCache` et `LocalLightCache`, sans calcul de rôle ni modification du World reçu. Le masque vérifie les mutations en place, dimensions comprises. La version du champ ne change qu’avec la topologie, la liste des positions de feux allumés ou la couverture construite. Heure, combustible restant positif, animation/permission de porte, personnes, piles et visibilité de coupe ne déclenchent aucun envoi de texture. La comparaison topologique reste linéaire à chaque adoption, hors boucle de frame.

`EnvironmentLighting` porte une texture RGBA8 : lumière artificielle normalisée de 0–50 % vers 0–255, couverture, opacité, canal réservé. À 250², données CPU et texels GPU représentent chacun 250 000 octets, hors overhead et caches de topologie/diffusion. Au plus trois lectures de texture par fragment concerné, niveau explicite zéro et aucun mipmap. Un rectangle conservatif (halo de filtrage et côtés compris) et la hauteur écartent les fragments hors du domaine ; ce sont des uniformes, sans nouvelle variante de pipeline à l’allumage. Couverture/opacité sont échantillonnées au centre de cellule, halo interpolé linéairement. Les coordonnées hors carte n’appliquent pas le champ.

Les données restent allouées tant que les dimensions ne changent pas. Une vraie modification déclenche un envoi complet de la petite texture ; pas d’envoi à chaque unité brûlée. Un changement de dimensions libère l’allocation GPU puis réutilise la même identité de texture et le même graphe TSL ; les dimensions sont un uniforme. Les captures passées du World restent intactes, mais le buffer de présentation est volontairement mutable et possédé par cette couche.

Le renderer injecte explicitement `configure` aux propriétaires de matériaux : statiques/eau, boîtes solides, portes, LOD et personnages. Les nouveaux matériaux de corps/cargaison, même après changement d’effectif, reçoivent le nœud avant compilation. Les overlays et sélections restent non éclairés. `outputNode` conserve l’éclairage standard et module sa sortie avant tone mapping ; `positionWorld` suit la position finale GPU, sans transformation CPU par personne. Aucun parcours des meshes ni nouvelle ressource par image.

Les matrices de végétation distante et attributs/indices rocheux utilisent désormais le mode StaticDrawUsage. Dans Three 0.186.0, DynamicDrawUsage provoque une mise à jour même à version inchangée : le profilage a révélé des écritures complètes répétées. Les suppressions/restaurations conservent needsUpdate et leurs plages explicites ; le banc vérifie les transferts réels puis leur arrêt.

La préparation existante des deux caméras/LOD/ombres couvre ces graphes dès le chargement. Aucun PointLight, passe d’ombre, draw call, objet de scène ou matériau supplémentaire par feu. Cela ne signifie pas un coût GPU nul : échantillonnage et remplissage restent mesurés dans le banc natif.

## Contrôles et limites

Le scénario de rétention couvre extinction, recharge, toiture, brèche, mutations en place, restauration et dimensions rectangulaires inversées, avec identité des ressources et World inchangé. Le parcours navigateur de production est maintenu ; son contrôle visuel compare les pixels capturés dans neuf états et conserve la sauvegarde. Le banc mesure cent artisans réels et cent feux, puis projections, LOD distant vérifié et changements simultanés de toutes les sources. Le pilote long n’est pas répété pour ce changement de présentation ; ses preuves V36 restent datées.

Pas d’ombres locales des meubles/personnes projetées par un feu, de lumière volumétrique, de scintillement nouveau, de fenêtres, d’étages ou de coupe automatique par pièce. Le champ actuel dérive du niveau logique plafonné : il n’imite pas le RGB visuel non plafonné de Core et produit une zone proche assez uniforme. Les futures couleurs/sources horticoles exigeront une représentation étendue. Température, météo et autres effets du feu ne découlent jamais de ce shader.
