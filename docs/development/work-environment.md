# Lumière et environnement des ateliers — V36

V73 ajoute les rôles du **bureau simple** (score Laboratoire 54) et du **tailleur** (Atelier 27). En cas d’égalité de scores, Laboratoire précède les rôles existants. Les facteurs de recherche sont séparés de ceux de fabrication : [recherche](research.md). Le tailleur emploie les facteurs Atelier/extérieurs et sa base 0,5, avec la pénalité thermique de confection.

15 septembre 2026. [Recherche fraîche](../research/work-environment-reference.md), [preuves](validation.md). La topologie V34 et les toits V35 deviennent des entrées réelles de la production. Aucun nouvel objet n’est ajouté.

## Lumière logique

Le ciel suit `naturalLight` au site fixe. Une cellule couverte ne reçoit pas cette contribution, même sous un auvent sans murs. La luminosité artistique de la scène ne mesure jamais la lumière de gameplay. Les feux **allumés** diffusent sur huit voisins, distances cardinales 100 et diagonales 141, avec une distance initiale 100 et une borne 1000. Ce parcours est indépendant de la navigation : eau, cadres et meubles laissent passer la lumière ; murs, roche pleine et portes, même ouvertes, la bloquent. Un seul côté opaque laisse contourner un coin, deux côtés opaques ferment sa diagonale.

Atténuation à distance accumulée `d` en cases : `0,6 × (1 − d/10) + 0,4 / d²`. Chaque contribution rouge vaut la partie entière de `252 × atténuation`. Les sources actuelles ont toutes la même couleur de feu ; stocker leur canal maximal suffit au résultat logique. Les contributions s’additionnent, puis la lumière artificielle est plafonnée à 50 %. La lumière finale est le maximum du ciel et de l’artificiel. Ajouter une source d’une autre couleur ou dépassant 50 % exigera d’étendre ce contrat, pas de détourner ce canal unique. Plusieurs feux peuvent éclairer davantage une périphérie mais ne font jamais pousser le riz sous un toit : le seuil agricole est 51 %.

Le nouveau calcul adopte le canal RGB maximal du miroir 1.6 consulté. Certains tableaux wiki calculent encore la moyenne RGB, avec un rayon « éclairé » différent : ne pas mélanger leurs distances avec cette formule. La précision et la provenance sont détaillées dans la recherche.

## Production et rôle

`work-environment.ts` sépare trois critères : lumière **à la place du colon**, extérieur psychologique **à la cellule centrale du poste**, rôle de cette pièce. Une pièce est psychologiquement extérieure dès 300 cellules non couvertes, ou si elle touche le bord et que la moitié au moins n’est pas couverte. Une petite cour entièrement entourée, même sans toit, peut donc éviter la pénalité extérieure ; une toiture isolée dans l’espace général ne suffit pas. Ce n’est ni un modèle thermique ni le critère distinct `OutdoorsForWork` de Core.

Avec les bâtiments et les adultes civils présents : un lit donne un score Chambre de 100 000 ; plusieurs lits donnent Dortoir à 100 100 par lit. Tables à manger : 12 chacune ; piquets : 7 ; ateliers de taille : 27. Le plus grand score gagne, égalité dans l’ordre Chambre, Salle à manger, Loisirs, Atelier, Dortoir. Les meubles sont comptés une fois par espace touché par leur empreinte. Le rôle d’un espace touchant le bord est absent. Le feu relève de Température, ne crée pas une Cuisine et n’exige pas ce rôle. Couples, enfants, prisons, hôpitaux, autres rôles et le cutoff Core de 60 régions restent absents ; notre partition ne donne pas une équivalence à ce nombre de régions.

La production combine :

- lumière : de ×0,8 à 0 % à ×1 à 30 %, interpolation linéaire ;
- extérieur : ×0,8 si le critère psychologique s’applique ;
- mauvaise pièce de l’atelier de taille : ×0,8 seulement hors extérieur et hors rôle Atelier ;
- poste : ×0,5 au feu, ×1 à la taille.

Travail neutre : 30 ticks locaux pour un repas, 160 pour vingt blocs. Ainsi un feu éclairant son cuisinier prend 60 ticks à l’intérieur et 75 dehors ; taille éclairée en atelier : 160, extérieure éclairée : 200, extérieure sombre : 250. Le bonus ne s’applique que pendant le travail après trajet et dépôt des ingrédients. Modifier toit, feu, cloison ou mobilier change les incréments futurs ; ni gain rétroactif ni remise à zéro. Combustion avant travail : le dernier tick de combustible ne donne pas de lumière après extinction.

## Données et coûts

Schéma **36** : `CookingTask.progress` devient un entier de travail neutre, 10 000 unités par tick neutre. Chaque incrément arrondit le taux, erreur maximale 0,00005 tick neutre par action. `productionWorkTotal` définit la borne, l’inspection conserve un pourcentage. V35 est strictement validée avec ses anciennes bornes avant migration : progression des repas ×5 000, des blocs ×8 000. Le pourcentage acquis est conservé ; les règles nouvelles régissent la suite. IDs, objets, routes, ingrédients, factures et tâches en file ne changent pas. Reprendre exactement une V36 exige le même état, pas l’historique d’un cache.

Le worker garde un `WorkEnvironmentCache` dérivé par monde dans une WeakMap ; l’inspection possède le sien. Une lecture utile vérifie les obstacles en place via le cache topologique. Lumière locale recalculée seulement si la topologie ou les positions des feux allumés changent. Toit, heure, quantité de combustible non nulle et animation de porte ne relancent pas ce parcours. Une recombinaison alloue un nouveau champ, conservant les anciens instantanés.

Le contexte de décision est partagé entre artisans du même tick, créé seulement lors d’un travail effectif. Construction/retrait, minage, transfert de meuble et recharge terminée l’invalident avant la prochaine action concernée. Pas de calcul par image, par colon immobile ou par unité brûlée. Le recalcul est encore global pour les sources allumées, borné localement par source ; audit à cent feux dans la validation. Aucun compute ajouté sans besoin mesuré.

## Portée à compléter

V36 branche les **recettes** présentes ; [V37](light-work.md) étend la lumière aux autres travaux actuels et à la marche. V38 ajoute les [températures locales](temperature.md). V45 ajoute les [capacités physiques](health.md) aux recettes ; compétences de production, effets psychologiques, propreté, confort et richesse restent à développer. La croissance naturelle conserve son intégrale et son arrêt sous toit ; les feux ne franchissent pas son seuil. Mort des plantes dans l’obscurité et autres espèces restent absentes.

L’inspection affiche lumière de la cellule, rôle et facteurs de production à la place orientée du poste. Le [rendu local 3D](environment-lighting.md) transpose désormais le champ lumineux sur le décor et les personnes, avec obscurité sous toit même en coupe. Ses coefficients artistiques ne remplacent pas les pourcentages de gameplay ; pas de `PointLight` ni d’ombres supplémentaires par feu. Les rôles livrés ne donnent aucun bonus de chambre, de salle à manger ou d’humeur.

Deux scénarios profonds couvrent oracle de diffusion indépendant, coins, portes, accumulation, extinction, mutations, seuils de pièces, rôle, différence poste/colon, production physique et migrations/reprise. Les scénarios production existants et le pilote de colonie restent actifs ; leurs bilans incluent maintenant les facteurs des postes.
