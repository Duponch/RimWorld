# Température locale et âge alimentaire — V38

La topologie thermique utilise un parcours borné : un ensemble connecté contenant suffisamment de cellules découvertes prouve le caractère extérieur sans parcourir toute la carte. Chaque lecture recontrôle les cellules de cette preuve, ses barrières, la couverture et les portes. Les mutations en place restent détectées ; la topologie globale des pièces sert d’oracle indépendant dans les tests.

[Sources, seuils et adaptations](../research/temperature-reference.md), [pièces](rooms.md), [conservation](food-preservation.md), [validation](validation.md).

## Règles jouables

Le site tempéré suit une moyenne provisoire de 21 °C, modulée de ±7 °C par le cycle quotidien Core : minimum vers 04:19, maximum vers 16:19. Ce n'est pas encore un climat saisonnier. Une enceinte retient son air seulement si elle ne rejoint pas le bord et si moins de 25 % de ses cellules sont sans toit. Les seuils de production et de psychologie restent indépendants.

Les toits construits, ouvertures partielles, murs simples/doubles et portes échangent de la chaleur. Les matériaux de mur n'inventent pas une isolation propre au mesh. Les portes ouvertes échangent plus rapidement ; les fermer ne supprime pas toute fuite. Les seuils couverts conservent un petit volume d'air distinct, y compris dans un sas à portes adjacentes. Un seuil non couvert utilise l'extérieur. Une porte sans pièce ordinaire adjacente conserve les échanges de ses parois, après la diffusion des portails au pas local. Le feu allumé chauffe son enceinte jusqu'à 28 °C ; une extinction arrête ce chauffage, sans effacer instantanément la chaleur. La chaleur ne change ni la lumière ni les quantités de combustible de V10.

L'inspection montre la température de la cellule ; l'indication extérieure reste dans le panneau de temps en bas à droite. Cacher les toits, couper les murs ou changer de caméra n'altère aucun taux.

## État et frontières

`thermal-topology.ts` construit une disposition dérivée depuis murs/roches/portes et toiture. Le cache vérifie obstacles, couverture et identité des portes. Les listes d'échange sont reconstruites seulement lorsque cette disposition change ; pas de parcours par objet alimentaire ou par frame.

`temperature.ts` intègre les échanges et feux en dix unités Core par tick local. La source est consultée avant combustion du combustible de l'intervalle ; l'état final alimentera l'intervalle suivant. La moyenne exhaustive remplace le sous-échantillon aléatoire des murs Core ; les impulsions sont réparties dans le temps. Les cours distinctes utilisant la température extérieure partagent un réservoir dans la moyenne des portes, contrairement à leur multiplicité Core. Ces adaptations sont documentées, pas une parité à chaque tick Core.

`world.thermal.regions` conserve uniquement les volumes retenant de l'air : cellules triées et température. Les portes couvertes sont des volumes séparés. Absence de `thermal` = aucun historique d'air retenu, avec initialisation à la température extérieure actuelle lors de la prochaine réconciliation. Un ID de pièce dérivé n'est jamais une identité persistante. Division : température héritée par recouvrement ; fusion : moyenne pondérée par les cellules, nouvelles cellules d'air à la température extérieure. Une ouverture vers l'extérieur supprime l'historique du volume devenu extérieur.

La réconciliation se produit après les commandes acceptées et les changements d'obstacle/toit pendant la simulation. Une sauvegarde peut contenir un historique précédant une modification externe de topologie ; il sera remappé avant l'intégration suivante. Lecture UI pure, pas de recalcul autoritaire au chargement. Le champ est transmis avec les données dynamiques du worker ; mesurer taille et temps de clonage à l'augmentation du nombre de pièces.

## Conservation sous température variable

`rot.rate` facultatif conserve le taux depuis `rot.atTick` ; absent = 1 (compatibilité historique). Un changement de taux ancre d'abord l'âge sous l'ancien taux. Les piles chaudes conservent leurs ancres et évitent les écritures répétées ; les piles entre 0 et 10 °C changent de taux avec leur air. La fonction de température est bornée entre 0 et 1 : gel ne répare jamais l'âge, chaleur supérieure à 10 °C n'accélère pas davantage la pourriture.

Le taux est pris au propriétaire réel : cellule de sol, position du porteur ou chantier. Il est rafraîchi après les actions physiques, une fusion et les commandes acceptées. Fractionnement et fusion gardent les règles de V11. L'expiration arrive avant les actions, selon l'intervalle écoulé ; un ingrédient au seuil ne peut pas être consommé par la recette. La durée affichée est explicitement donnée à température actuelle ; gelée signifie conservation suspendue, pas aliment non périssable.

V37 est validée strictement avant passage en V38. Aucun ancien âge, trajet, objet ni historique thermique n'est inventé ; absence des nouveaux champs garde son sens. Le validateur refuse nouveaux champs dans une ancienne version, températures non finies/hors bornes, cellules hors carte/dupliquées/non triées et taux invalides. Une sauvegarde refusée laisse la partie courante intacte.

## Limites ouvertes

[Refroidissement passif V40](passive-cooling.md) livré. Pas encore de chauffage électrique, climatiseur électrique, réseau électrique, saisons, météo, climat de site sélectionnable, toits naturels ou échange souterrain. Santé thermique, confort, sommeil lié à la température et déplacement vers un lieu sûr restent absents. La [croissance thermique et les semis V39](plant-temperature.md) utilisent cet air local. Mortalité au froid, feuilles et saisons doivent encore précéder les biomes froids. Les tests de gel emploient un historique froid synthétique, pas un congélateur déjà constructible.
