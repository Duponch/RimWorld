# Température locale et âge alimentaire

Le modèle d'air local et de conservation est livré depuis V38. **V87 validée** ajoute le [climat annuel et la survie végétale](site-climate.md), le [radiateur et la météo](wind-heater.md), ainsi que la chaleur des [incendies](fires.md). Les [preuves V87](../history/validation-environment-v87.md) suivent cette campagne commune ; les résultats des versions antérieures restent historiques.

La topologie thermique utilise un parcours borné : un ensemble connecté contenant suffisamment de cellules découvertes prouve le caractère extérieur sans parcourir toute la carte. Chaque lecture recontrôle les cellules de cette preuve, ses barrières, la couverture et les portes. Les mutations en place restent détectées ; la topologie globale des pièces sert d’oracle indépendant dans les tests.

[Sources, seuils et adaptations](../research/temperature-reference.md), [pièces](rooms.md), [conservation](food-preservation.md), [validation](validation.md).

## Règles jouables

Sans climat adopté, le site historique conserve sa moyenne provisoire de 21 °C, modulée de ±7 °C par le cycle quotidien Core : minimum vers 04:19, maximum vers 16:19. Le climat V87 utilise le [profil tempéré observé](site-climate.md#profil-et-temps) : moyenne annuelle 16,2 °C, latitude 22,21° N et cycle saisonnier, avec le même cycle quotidien. Ce témoin documenté n'est pas un site moyen ni un défaut RimWorld. Sa composante thermique est renouvelée tous les six ticks locaux. La variation irrégulière Perlin de température reste absente. [V74](heatwave.md) conserve sa contribution d'incident distincte.

Une enceinte retient son air seulement si elle ne rejoint pas le bord et si moins de 25 % de ses cellules sont sans toit. Les seuils de production et de psychologie restent indépendants.

Les toits construits, ouvertures partielles, murs simples/doubles et portes échangent de la chaleur. Les matériaux de mur n'inventent pas une isolation propre au mesh. Les portes ouvertes échangent plus rapidement ; les fermer ne supprime pas toute fuite. Les seuils couverts conservent un petit volume d'air distinct, y compris dans un sas à portes adjacentes. Un seuil non couvert utilise l'extérieur. Une porte sans pièce ordinaire adjacente conserve les échanges de ses parois, après la diffusion des portails au pas local. Le feu de camp allumé chauffe son enceinte jusqu'à 28 °C ; une extinction arrête ce chauffage, sans effacer instantanément la chaleur. Ce plafond appartient au foyer de cuisine, pas aux incendies. La chaleur ne change ni la lumière ni les quantités de combustible de V10.

Les appareils utilisent leur alimentation et leur vrai volume : radiateur électrique à consigne, climatiseur à deux faces, chaleur des générateurs et cuisinières, refroidisseur passif. La chaleur d'un incendie dépend de sa taille et des cellules d'air ; elle ne s'arrête pas à 28 °C. Si le feu détruit un élément d'enceinte, la disposition thermique est réconciliée avant les décisions suivantes. Éteindre ou couper un appareil ne remet pas instantanément la pièce à la température extérieure.

L'inspection montre la température de la cellule ; l'indication extérieure reste dans le panneau de temps en bas à droite. Cacher les toits, couper les murs ou changer de caméra n'altère aucun taux.

## État et frontières

`thermal-topology.ts` construit une disposition dérivée depuis murs/roches/portes et toiture. Le cache vérifie obstacles, couverture et identité des portes. Les listes d'échange sont reconstruites seulement lorsque cette disposition change ; pas de parcours par objet alimentaire ou par frame.

`temperature.ts` intègre les échanges et les sources thermiques des appareils sur dix unités Core par tick local. La source est consultée avant consommation du combustible de l'intervalle ; l'état final alimentera l'intervalle suivant. `environment-step.ts` coordonne ensuite les impulsions des incendies, la réconciliation après destruction et les températures végétales. La moyenne exhaustive remplace le sous-échantillon aléatoire des murs Core ; les impulsions des appareils sont réparties dans le temps. Les cours distinctes utilisant la température extérieure partagent un réservoir dans la moyenne des portes, contrairement à leur multiplicité Core. Ces adaptations sont documentées, pas une parité à chaque tick Core.

`world.thermal.regions` conserve uniquement les volumes retenant de l'air : cellules triées et température. Les portes couvertes sont des volumes séparés. Absence de `thermal` = aucun historique d'air retenu, avec initialisation à la température extérieure actuelle lors de la prochaine réconciliation. Un ID de pièce dérivé n'est jamais une identité persistante. Division : température héritée par recouvrement ; fusion : moyenne pondérée par les cellules, nouvelles cellules d'air à la température extérieure. Une ouverture vers l'extérieur supprime l'historique du volume devenu extérieur.

La réconciliation se produit après les commandes acceptées et les changements d'obstacle/toit pendant la simulation. Une sauvegarde peut contenir un historique précédant une modification externe de topologie ; il sera remappé avant l'intégration suivante. Lecture UI pure, pas de recalcul autoritaire au chargement. Le champ est transmis avec les données dynamiques du worker ; mesurer taille et temps de clonage à l'augmentation du nombre de pièces.

## Conservation sous température variable

`rot.rate` facultatif conserve le taux depuis `rot.atTick` ; absent = 1 (compatibilité historique). Un changement de taux ancre d'abord l'âge sous l'ancien taux. Les piles chaudes conservent leurs ancres et évitent les écritures répétées ; les piles entre 0 et 10 °C changent de taux avec leur air. La fonction de température est bornée entre 0 et 1 : gel ne répare jamais l'âge, chaleur supérieure à 10 °C n'accélère pas davantage la pourriture.

Le taux est pris au propriétaire réel : cellule de sol, position du porteur ou chantier. Il est rafraîchi après les actions physiques, une fusion et les commandes acceptées. Fractionnement et fusion gardent les règles de V11. L'expiration arrive avant les actions, selon l'intervalle écoulé ; un ingrédient au seuil ne peut pas être consommé par la recette. La durée affichée est explicitement donnée à température actuelle ; gelée signifie conservation suspendue, pas aliment non périssable.

V37 est validée strictement avant passage en V38. Aucun ancien âge, trajet, objet ni historique thermique n'est inventé ; absence des nouveaux champs garde son sens. Le validateur refuse nouveaux champs dans une ancienne version, températures non finies/hors bornes, cellules hors carte/dupliquées/non triées et taux invalides. Une sauvegarde refusée laisse la partie courante intacte.

Pour V87, V86 est également validée avant migration. Une ancienne colonie conserve son air, ses âges et son cycle historique ; l'adoption explicite du climat commence prospectivement et ne rejoue ni hiver ni exposition passée. Date civile, temps écoulé et origines météo/vent sont distincts. Les températures extrêmes dues aux incendies restent bornées par le contrat de sauvegarde, sans rendre l'âge alimentaire négatif ni rajeunir une pile refroidie.

## Limites ouvertes

[Refroidissement passif V40](passive-cooling.md) et [climatiseur V75](cold-store.md) sont livrés. Chauffage électrique, cycle annuel du profil, météo de surface, mortalité végétale au froid et perte de feuilles des baies sont implémentés dans V87. Cela ne livre pas un climat librement sélectionnable sur un globe, tous les biomes, la variation irrégulière de température, l'épaisseur de neige, les toits naturels ou les échanges souterrains.

Coup de chaleur, isolation et refuge civil sont actifs en [V74](heatwave.md), hypothermie en V75 ; gelures localisées, pensées thermiques et choix complet du sommeil selon danger restent absents. La [croissance thermique et les semis V39](plant-temperature.md) utilisent cet air local ; leurs prolongements saisonniers et vitaux sont définis dans [site-climate](site-climate.md). Les anciennes fixtures synthétiques restent des oracles ; le parcours de construction/recherche/stockage effectivement obtenu en V75 conserve ses propres preuves.
