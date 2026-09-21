# Diversité biologique et biomes — cadrage V90

Recherche préparatoire du 21 septembre 2026. Elle ne livre ni code, ni menu, ni migration. Son but est de choisir un premier ensemble où un biome signifie une distribution, des organismes persistants et des usages coloniaux, au lieu d'une couleur de sol ou d'un arbre générique.

## Sources, version et méthode

La source primaire est l'installation locale lue sans écriture : RimWorld Core **1.6.4871 rev590**, `Version.txt` du 21 septembre 2026, Defs de biomes, plantes et races animales, ainsi que `Assembly-CSharp.dll` SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les XML et le code propriétaire ne sont ni copiés ni publiés ici ; seules des valeurs nécessaires à la décision sont reformulées.

Le recoupement externe est volontairement secondaire : la [présentation officielle de la mise à jour 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) confirme le contexte de version et distingue le contenu des extensions ; les fiches communautaires [Temperate forest](https://rimworldwiki.com/wiki/Temperate_forest), [Arid shrubland](https://rimworldwiki.com/wiki/Arid_shrubland), [Biomes](https://rimworldwiki.com/wiki/Biome) et [Animals](https://rimworldwiki.com/wiki/Animal) aident à relire les listes et leur sens de jeu. Elles ne remplacent pas les Defs installées, qui sont postérieures à plusieurs miroirs publics et sont la référence des valeurs ci-dessous.

Les contrats lus sont [génération de site](../development/world-generation.md), [climat](../development/site-climate.md), [faune](../development/wildlife.md), [cultures](../development/food-crops.md), [textile](../development/textiles.md), [calibration carte](map-calibration-reference.md), [première faune](wildlife-reference.md) et [base Core](core-reference-baseline.md). Le témoin de sauvegarde boréal et les parties personnelles restent des observations contextualisées : ils ne déterminent ni le prochain biome, ni un nombre cible de ressources ou d'animaux.

## État de Lisière et frontière du prochain ensemble

V83/V87 possèdent un seul site local `temperate-forest`, des reliefs séparés et un climat annuel tempéré. Ses arbres génériques ne grandissent pas biologiquement ; ses baies et ses quatre cultures n'épuisent pas un catalogue de flore. V76–V79 ajoutent le seul lièvre adulte, avec faim, sommeil, combat, chasse, dépouille, viande et cuir ; ce plafond de douze individus est une calibration temporaire, pas un budget écologique Core. Les couches de cultures réservent déjà quatre lots de 65 536 instances : multiplier ce modèle par chaque silhouette sauvage serait inacceptable sans refonte de représentation.

Le premier ensemble conseillé comprend **trois profils de site réellement sélectionnables lors d'une nouvelle partie**, avec végétation et faune distinctes : forêt tempérée, forêt boréale et broussailles arides. Il ne doit pas prétendre couvrir les marais, la jungle, le désert extrême, la toundra, la glace, les côtes, les poissons, les grottes ou les contenus d'extension. La toundra est une référence utile (densités locales 0,19 végétal et 1,1 animal), mais elle demande neige accumulée, disette et calendrier de renouvellement crédibles avant de devenir un choix jouable.

Les trois profils ne sont pas trois niveaux de difficulté. Ils utilisent les trois reliefs V83 (plat, petites/grandes collines), le budget minier commun et les accès réellement générés. Le relief ne change pas secrètement de biome ; l'absence d'un minerai, d'une eau fonctionnelle ou d'un habitat accessible ne se compense jamais en augmentant les autres contenus.

## Ce que disent les Defs, et ce qu'elles ne disent pas

Les tableaux `wildPlants` et `wildAnimals` associent une espèce à un **poids relatif**. Les densités de biome gouvernent des mécanismes de pose et de renouvellement ; elles ne sont ni des probabilités par cellule, ni un nombre d'individus. Le spawn animal tient en outre compte des espèces admissibles, de groupes et de leur poids écologique. Une carte 250×250 de forêt tempérée ne contient donc pas « 3,7 animaux » ni 65 % d'arbres. Cette distinction est le garde-fou central de V90.

| Biome Core local | Densité végétale / animale | Repousse sauvage / fourrage | Lecture utile |
| --- | ---: | ---: | --- |
| Forêt tempérée | 0,65 / 3,7 | 20 j / 1 | Clairières fertiles, feuillus, nourriture sauvage rare dans les poids, faune la plus diverse des trois. |
| Forêt boréale | 0,40 / 2,8 | 25 j / 0,75 | Conifères, mousses et saison plus restrictive ; la végétation moins dense n'autorise pas à convertir son poids absent en bois. |
| Broussailles arides | 0,24 / 1,8 | 27 j / 0,5 | Plaines ouvertes, herbacées et cactus ; aliments/bois existent mais leur rareté reste une conséquence matérielle. |
| Toundra, différée | 0,19 / 1,1 | 28 j / 0,5 | Référence de stress froid, non un quatrième bouton décoratif tant que neige et renouvellement complet manquent. |

Les listes locales confirment notamment, sans que cela impose leur exhaustivité : tempéré = herbes, ronces, chêne, peuplier, baies et healroot sauvage ; boréal = herbes, mousse, ronces, pin, bouleau, baies ; aride = herbes, buissons, agave, cactus saguaro, drago et baies. Les profils contiennent aussi beaucoup plus d'animaux que Lisière ne peut raisonnablement livrer d'un coup. Le projet sélectionne un sous-ensemble fonctionnel, puis conserve les autres poids comme contenu explicitement absent, sans les redistribuer.

## Catalogue V90 recommandé

Chaque entrée ci-dessous doit exister sur carte, avoir une identité, une croissance ou des besoins propres, une interaction matérielle et une reprise exacte. Une silhouette, une teinte, un objet de menu grisé ou une variante qui se résout immédiatement en ressource générique ne compte pas comme espèce livrée.

### Flore sauvage

| Profil | Espèces proposées et différences physiques | Obtention, usage et lien catalogue |
| --- | --- | --- |
| Tempéré | **Chêne** : arbre lent, rendement bois élevé ; **peuplier** : croissance plus rapide, rendement plus faible ; **ronces/herbes hautes** : couvert végétal consommable ; baie existante conservée. Les Defs locales donnent environ 30 j / 46 bois au chêne, 15,05 j / 27 bois au peuplier ; ce sont des paramètres d'espèce, pas une promesse de récolte calendrier. | Abattage réel fournit des piles de bois, conservant jusqu'à la coupe l'identité de l'arbre et son âge. Ronce/herbe nourrit les herbivores et brûle/détruit selon les contrats partagés. Baie garde son produit, son âge et sa conservation. Le bois alimente murs, meubles, cuisine et chauffage déjà jouables. |
| Boréal | **Pin** et **bouleau** : deux arbres avec croissance, silhouette, feuilles/neige et rendements propres ; **mousse** : végétation comestible lente et résistante ; baie existante, plus rare. Les Defs donnent 20 j / 27 bois au pin et 20 j / 27 bois au bouleau, avec formes distinctes. | Le joueur peut couper, stocker et employer le bois dans les mêmes filières. Mousse et herbes sont une nourriture vivante des herbivores, donc une décision de clôture/chasse et non un décor. Baies restent récoltables, jamais transformées en agave ou riz. |
| Aride | **Agave** : nourriture sauvage récoltable ; **saguaro** : fibre combustible/récoltable, peu dense ; **drago** : arbre aride lent à bois limité ; herbes/cactus bas broutables. Les valeurs locales repérées sont : agave 6 j, 10 produits ; saguaro 5 j, 15 bois ; drago 15 j, 25 bois. | L'agave devient une pile alimentaire distincte, utilisable crue ou dans la cuisine selon les mêmes transactions que les légumes, stockage et pourriture à définir par référence avant code. Saguaro/drago fournissent du bois matériel à abattage, jamais un bonus abstrait de survie. Les petites plantes sont de l'habitat et du fourrage, pas un faux rendement. |

La distinction de source doit persister pour le plant vivant, son âge, ses dégâts, sa maturité, ses feuilles/neige et son travail engagé. Après la coupe, les piles peuvent rester le `wood` commun si ce choix est documenté : la différence jouable a alors été croissance, rendement, habitat et disponibilité, tandis que les usages constructifs ne sont pas faussement doublés. La plante alimentaire conserve en revanche son `ItemId` propre de la récolte jusqu'à stockage, cuisine, transport, ingestion, pourriture et sauvegarde.

### Faune sauvage

Le catalogue initial privilégie des herbivores et deux tailles de corps. Ajouter un prédateur sans sa recherche de proie, faim, fuite, blessures, dépouilles et effets de population répéterait l'erreur d'un menu de chasse sans chaîne animale. Les carnivores locaux (cougar, loups, lynx, warg) sont donc référencés mais différés avec prédation. Reproduction, apprivoisement, enclos, lait, charge et caravanes sont également hors du V90 initial.

| Profil | Espèces et régime | Différence réellement jouable | Sortie et usages |
| --- | --- | --- | --- |
| Tempéré | **Lièvre** existant, herbivore léger ; **cerf**, grand herbivore de groupe. | Le cerf exige un corps quadrupède propre, besoins et vitesse calibrés, groupe/espacement, nourriture végétale réelle et cible de chasse distincte. Il ne devient pas un lièvre agrandi. | Une chasse aboutie fournit une dépouille identifiée, puis viande et cuir ordinaire physiques ; la boucherie, les filtres, repas, confection et sauvegarde conservent l'espèce jusqu'à la transaction où le produit devient viande/cuir. |
| Boréal | **Lièvre des neiges**, herbivore léger distinct du lièvre ; **muffalo**, herbivore de troupeau, grand et consommateur de fourrage. | Le lièvre des neiges a son identité et son habitat boréal ; son apparence blanche ne suffit pas. Le muffalo utilise le corps à sabots, une faim et une échelle sanitaire distinctes, et met la ressource végétale sous pression. | Viande issue du corps ; cuir de mufalo (`bluefur` dans les Defs) comme matière d'habillement distincte et stockable. Le cuir doit être porté, rangé et consommé par une recette réelle, pas seulement proposé. |
| Aride | **Gazelle**, herbivore moyen de groupe ; **dromadaire**, grand herbivore de groupe. | Tous deux vivent sur la végétation aride réellement présente ; le dromadaire n'acquiert pas de transport ou d'élevage hors périmètre. Leur présence plus rare découle du budget aride, pas d'un nombre minimal garanti. | Viande et cuir ordinaire/cuir de chameau, selon la dépouille concernée. Le cuir de chameau doit donner au moins une recette d'équipement ou de mobilier du lot habitation ; sans cet usage, ne pas livrer l'item comme simple compteur. |

Les valeurs locales confirment le profil herbivore `VegetarianRoughAnimal` des cerfs, mufalos, gazelles et dromadaires. Le lièvre est un quadrupède taille 0,2, faim de base 0,115, cuir léger et espérance de vie 8 ans ; le muffalo est un quadrupède à sabots de taille 2,4, faim 0,535, cuir bleu et espérance de vie 15 ans. Ces chiffres justifient les catégories, mais V90 doit vérifier les valeurs effectives héritées et les multiplicateurs du binaire actuel avant de figer une formule. Il ne faut pas déduire de cette seule lecture le nombre de repas qu'une carte supporte.

## Modèle de génération, croissance et populations

1. **Choix de site.** La nouvelle partie choisit explicitement un profil. `biomeId`, révision de profil, climat, relief et graine ont des provenances séparées. Le climat ne reçoit pas une température moyenne différente sans modifier l'intervalle saisonnier, la croissance et les seuils déjà partagés.
2. **Terrain puis habitats.** Relief, roches, sols, eau réellement fonctionnelle et composante accessible sont générés avant les plantes. Les poids sélectionnent les espèces seulement sur les cellules compatibles avec fertilité, température, toit, humidité quand elle existe et voisinage requis. Une cellule n'héberge pas deux plantes ; aucun bosquet n'apparaît dans une zone qui serait de l'eau, de la roche ou un départ inaccessible.
3. **Vie végétale.** Toute plante a espèce, position, croissance, naissance connue ou début d'observation, dégâts, phase foliaire/neige et prochain contrôle. Les plantes historiques adoptées ne reçoivent jamais un âge fictif. Les plants consomment les règles V87 de lumière, température, feu et calendrier ; leurs seuils précis nécessitent une fiche par espèce avant implémentation. Une coupe, broutage ou feu annule les réservations et travaux touchés sans effacer une cargaison déjà produite.
4. **Budget animal.** Un budget écologique local part de la surface d'habitat admissible et de la densité du profil, puis est dépensé par espèce et groupe. Les poids déterminent le choix ; taille de groupe et poids écologique déterminent le coût. Population, sexe, état des besoins, ciblage, PRNG écologique et bilan des consommations sont persistés. Aucun appel n'utilise le PRNG de cultures, combat, météo ou narration.
5. **Renouvellement.** Le renouvellement sauvage est une transition prospective, avec un prochain contrôle et un plafond par habitat ; il ne repeuple pas instantanément une zone dès qu'un animal est chassé. Il reste séparé de la reproduction : pas de jeunes, grossesse ni élevage avant un contrat ultérieur. Une sécheresse, l'hiver ou le manque de plantes peut réduire les positions admissibles sans tuer/téléporter des animaux pour atteindre un quota.

Les densités réelles, maturités et populations doivent être relevées sur un ensemble de graines et d'habitats comparables. Elles ne sont pas établies par la sauvegarde boréale seule, par les 12 lièvres du prototype ou par une projection de poids en compte d'individus.

## Intégration aux boucles existantes

Le choix du biome modifie la disponibilité physique de bois, végétaux sauvages, gibier, viande et cuirs. Il doit donc atteindre les systèmes suivants :

- construction, meubles, radiateur et cuisine via les piles de bois ;
- réserves, transport, alimentation, pourriture et recettes via baies/agave/viande ;
- chasse, tir, mêlée animale, dépouille et boucherie via l'espèce de chaque corps ;
- confection et renouvellement d'équipement via les cuirs effectivement obtenus ;
- feu, météo, neige de présentation, lumière, températures et croissance par les contrats V87 ;
- inventaires, filtres, statistiques, commandes et sauvegarde sans introduire implicitement un nouveau contenu dans un filtre absent.

Le premier ensemble ne livre pas pêche, fourrage manuel, maladies nouvelles, herbe de terrain sans plante, hydroponie, prédateurs, élevage, transport animal, biomes marécageux ou tout le catalogue d'armes/textiles. Les éléments absents gardent leurs poids et noms documentés ; ils ne sont pas transformés en baies, bois, lièvres ou acier supplémentaires.

## Sauvegardes et migrations

Une révision de schéma future doit valider V89 strictement. Une sauvegarde antérieure conserve son `temperate-forest` historique, ses arbres génériques, ses baies, son climat, ses stocks, ses animaux et leurs PRNG : aucune carte n'est repeuplée, reboisée, reclimatisée ou rééquipée au chargement.

L'adoption éventuelle sur une ancienne partie doit être une commande visible, idempotente et prospective. Elle fixe un profil explicitement choisi, ancre l'instant d'observation des plantes existantes et crée uniquement ce que le contrat annonce, après prévalidation des emplacements. L'alternative préférable pour V90 est de réserver les trois biomes aux nouvelles parties et de ne proposer l'adoption qu'après un scénario de transition dédié. Dans les deux cas, données V90 sous un schéma antérieur, ID d'espèce inconnu, âge impossible, pile/corps sans espèce, poids négatif ou population hors plafond sont refusés avant mutation.

## Validation et performance attendues

Les contrôles courts doivent précéder toute campagne :

1. trois graines par profil et relief, avec compte séparé des cellules admissibles, sols, plantes par espèce/classe de croissance, animaux par espèce/groupe, surfaces accessibles, nourriture récoltable, bois potentiel et coûts de route ;
2. génération reproductible à PRNG isolés ; refus d'un habitat invalide sans redistribution de contenu ;
3. croissance, maturité, broutage, coupe, feu, récolte, transport, saturation de sol, chasse, dépouille, boucherie, stockage et recette de cuir réellement jouée ;
4. été/hiver ou sécheresse seulement lorsque le profil retenu l'exige, plus frontières contrôlées pour manque de fourrage et destruction ; pas d'extinction ou de prédateur forcé dans une campagne ;
5. sauvegarde/reprise au milieu d'une pousse, d'un trajet, d'une ingestion, d'un portage de corps et d'une pile de cuir ;
6. migrations neutres et adoption explicite, avec conservation byte-à-byte des données antérieures hors enveloppe de version.

La campagne commune poursuit une colonie par checkpoints réels et prouve au moins, pour chaque profil, une décision de site qui produit une conséquence matérielle : couper/construire, nourrir/cuisiner, chasser/boucher ou fabriquer à partir d'un cuir réellement obtenu. Trois cartes de laboratoire ne prouvent ni survie universelle ni équilibre Core. Les scénarios rares restent isolés ; la campagne ne réorganise pas ses stocks pour provoquer une crise.

Les mesures CPU, rendu natif et pilote lourd restent successives. Elles comparent, à même graine et état, une faune/végétation minimale puis le catalogue V90 : temps p50/p95, allocations, nombre de contrôles végétaux et animaux, recherches de chemin, réservations, lots GPU, octets de sauvegarde et image à caméra/zoom fixés. Les plantes sauvages doivent partager des lots bornés par géométrie et attribut d'espèce, ou une stratégie d'instance compacte équivalente ; un lot préalloué par espèce sur 65 536 cellules ne peut être adopté sans budget mesuré. Les caches sont invalidés localement lors d'une pousse, coupe, feu ou disparition, jamais reconstruits à chaque frame.

## Incertitudes à résoudre avant code

- Les Defs locales donnent les poids, paramètres déclarés et catégories, mais le détail des classes de spawn actuelles, des coûts écologiques et des valeurs héritées doit être relu dans le binaire 1.6.4871 avant de fixer les populations V90.
- Les seuils de lumière/température et la longévité sauvage propres aux nouvelles plantes ne doivent pas être supposés à partir des cinq plantes déjà livrées. Chaque espèce proposée requiert une fiche de valeurs et sa provenance.
- Le mode de sortie des cuirs de cerf, mufalo, gazelle et dromadaire doit être rapproché du contrat de boucherie et du futur lot habitation ; une matière sans recette physique est reportée.
- La représentation de neige de V87 ne vaut pas neige accumulée. Elle suffit à visualiser des essences boréales, pas à certifier toundra, terriers sous neige, migration saisonnière ou accès hivernal.
- Les données locales peuvent contenir des définitions partagées par des extensions installées. Seul Core sans extension active est le périmètre ; chaque candidat est revalidé au chargement réel du contenu Core.

## Synthèse

V90 doit commencer par trois biomes, douze végétaux environ et six espèces animales au plus, articulés autour de bois, fourrage, nourriture sauvage, chasse, viande et cuirs utilisables. La forêt tempérée étend le contenu déjà vivant ; la forêt boréale rend le froid et le fourrage matériellement importants ; les broussailles arides changent la rareté du bois et introduisent l'agave sans déguiser un désert en couleur. Les poids Core guident les distributions sans produire de quotas artificiels. Anciennes parties restent intactes, les renouvellements sont prospectifs, et la validation mesure séparément les règles, la campagne et les coûts avant toute extension vers prédateurs, élevage ou biomes extrêmes.
