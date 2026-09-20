# Progression réellement observée dans la colonie historique B

Relevé du **20 septembre 2026**, lecture seule. Cette enquête complète les [observations de colonies](colony-observation-reference.md) et la [référence Core](core-reference-baseline.md). Elle mesure des états conservés d’une seule partie ; elle ne définit ni une colonie moyenne ni un calendrier obligatoire. Les changements de Lisière restent programmés uniquement dans [ROADMAP](../ROADMAP.md).

## Population étudiée et limites

Les **87 sauvegardes du même monde**, de **J5,0382 à J210,0959**, enregistrent RimWorld **1.6.4633 rev1261**, Core seul, **tutoriel, Phoebe, difficulté `Easy`**. Le terrain identifié par l’enquête précédente est une forêt tempérée plate, en 250×250. Ce contexte diffère du profil Cassandra/Récit d’aventure retenu pour Lisière. Le tutoriel ajoute notamment des tissus et une séquence particulière ; ses résultats ne sont pas ceux d’un départ ordinaire contemporain.

Les jours sont les ticks écoulés divisés par 60 000. La date des fichiers sert seulement à ordonner les observations et détecter des retours. Elle ne date pas les constructions, les récoltes ou l’arrivée des personnes. Deux retours temporels séparent trois segments monotones :

| Segment d’observation | États anonymes | Nombre | Retour qui ouvre le segment |
|---|---|---:|---|
| B1 | B001–B052 | 52 | Premier état conservé à J5,0382 |
| B2 | B053–B062 | 10 | J167,2820 → J166,8561 |
| B3 | B063–B087 | 25 | J186,5708 → J186,3104 |

Ces ruptures peuvent correspondre à un rechargement, une branche ou une copie. Elles ne suffisent pas à reconstruire l’arbre des parties. Les segments B2/B3 commencent avec une colonie déjà avancée ; une infrastructure présente dans leur premier état n’y vient pas nécessairement d’être construite. Les périodes sans sauvegarde restent inconnues.

Corpus relu : chapitres **11 et 12**, complétés par 13/24 via [reference-adoption](reference-adoption.md) ; SYS/TEST-062..069, 070..078, 084/085, 127/128 et 132..135. **Adopter** la séparation entre consignes, travail réalisé, produits, stocks et besoins ; **adapter** le pilote à plusieurs cycles réels ; **différer** toute moyenne de progression, tout calendrier imposé et toute attribution d’une variation de stock à une cause unique.

## Repères demandés et jours effectivement disponibles

Le tableau prend l’état conservé le plus proche du repère, sans interpolation. Le JSON conserve aussi l’état précédent et suivant chaque repère. Il n’existe notamment aucun état exactement à J10, J20, J30 ou J100.

| Repère | État réel | Humains sur carte / en caravane | Cuisine, froid et énergie présents | Aliments directement sur carte |
|---|---|---:|---|---|
| J5 | B001, J5,0382 | 3 / 0 | Cuisinière à bois, bureau simple ; pas de climatiseur ni générateur détenu constaté | 20 rations de survie |
| J10 | B002, J12,9689 | 4 / 0 | Cuisinière à bois, table de boucherie, climatiseur, éolienne, six refroidisseurs passifs | 15 repas simples |
| J20 | B005, J17,1843 | 5 / 0 | Même socle et une batterie | 8 repas simples, 4 œufs |
| J30 | B007, J25,4905 | 5 / 0 | Cuisinière électrique, table de boucherie, deux climatiseurs, éolienne, batterie ; tailleur électrique | 35 repas simples, 207 baies |
| J60 | B016, J59,6589 | 6 / 0 | Trois climatiseurs, éolienne, solaire, géothermie, deux batteries ; forge, usinage, taille de pierre et couture | 60 repas fins, 1 272 unités de viande, 24 lait, 7 œufs, 1 644 foin |
| J100 | B027, J97,3386 | 4 / 2 | Même alimentation électrique de base, trois climatiseurs ; fonderie ajoutée | 52 repas fins, 33 pemmican, 12 lait, 9 œufs, 48 foin |
| J210 | B087, J210,0959 | 12 / 0 | Quatre climatiseurs, éolienne, solaire, deux géothermies, trois batteries ; recherche avancée, fabrication et forage | 144 repas fins, 268 pemmican, 2 929 viande, 387 lait, 30 œufs, 329 aliments végétaux bruts, 3 992 foin |

Ce sont des **quantités d’objets par catégorie**, pas des équivalents nutritionnels. Le foin, les repas, la viande et le pemmican ne s’additionnent pas en « repas disponibles ». Les piles directement sur carte ne sont pas automatiquement des réserves autorisées, accessibles, rangées ou fraîches.

Les inventaires et portages des personnes/animaux appartenant au joueur sont relevés séparément dans les [agrégats](../../artifacts/core-progression-observed.json). Ainsi, à J12,9689, **cinq autres repas sont portés** ; à J17,1843, six ; à J25,4905, six ; à J59,6589, six ; à J210,0959, douze. Les capsules et autres conteneurs ne sont pas couverts par ce bilan. Aucun flux de consommation, de pourriture, de commerce ou d’abattage n’est reconstruit à partir d’une simple différence de piles.

À J97,3386, les quatre humains sur carte ne signifient pas une population totale de quatre : **deux humains sont identifiés dans la caravane**. Cette caravane transporte 24 repas fins et quatre baies ; ces aliments sont séparés des stocks de carte. La dernière courbe `FreeColonists`, enregistrée séparément, vaut six. Les personnages momentanément hors carte ne sont pas comptés morts. À J210,0959, la carte accueille également **101 animaux domestiques de douze espèces** ; cette exploitation animale n’existe pas encore dans Lisière.

## Les champs désignés, actifs et réellement plantés diffèrent

Une case de zone peut être vide, porter une culture antérieure ou attendre son semis. `allowSow = False` suspend la consigne ; le comptage ci-dessous ne remplace pas ce drapeau par une production fictive. Les plantes effectivement présentes sont celles dont la sauvegarde enregistre `sown = True`, parmi les objets explicites de carte.

| État | Zones alimentaires désignées | Cases dont le semis est autorisé | Plants alimentaires semés réellement présents |
|---|---|---|---|
| J5,0382 | Riz 80 | Riz 80 | Riz 55 |
| J12,9689 | Riz 80 | Riz 80 | Riz 56 |
| J17,1843 | Riz 520 | Riz 520 | Riz 140 |
| J25,4905 | Riz 228 | Riz 228 | Riz 359 |
| J59,6589 | Riz 228 ; pommes de terre 338 | Pommes de terre 1 ; riz suspendu | Pommes de terre 1 |
| J97,3386 | Riz 168 ; pommes de terre 560 | Riz 168 ; pommes de terre 122 | Riz 1 ; pommes de terre 73 |
| J210,0959 | Riz 323 ; pommes de terre 867 | Riz 323 ; pommes de terre 3 | Riz 260 ; pommes de terre 3 |

À J25,4905, 292 cases sont réglées sur coton alors que 359 plants de riz restent présents pour seulement 228 cases actuellement désignées riz. À J97,3386, des plants de devilstrand et de houblon sont présents sans zone courante réglée sur ces plantes. Ces états montrent pourquoi un changement de consigne doit rester distinct des cultures en place ; ils ne donnent pas à eux seuls la date ni l’intention de chaque modification.

Les autres zones évoluent aussi : 72 cases de foin à J17,1843 ; coton et healroot ensuite ; à J210,0959, **449 cases de foin, 238 d’healroot et 183 de devilstrand** ont le semis autorisé. Leurs rendements n’équivalent pas à de la nourriture humaine. Un unique bassin hydroponique est présent en fin de période ; cela ne caractérise pas à lui seul une ferme hydroponique dominante.

Les réserves animales importantes avec presque aucun semis alimentaire actif à J59,6589 constituent une observation de diversification, pas la preuve que l’agriculture serait inutile ou que l’élevage suffirait toujours. Les saisons, importations, récoltes antérieures, abattages et pertes entre sauvegardes restent des causes possibles non distinguées par ces seuls états.

## Premières présences observées d’infrastructures

Les objets sont filtrés par faction du joueur ; ruines, plans et cadres ne sont pas comptés comme bâtiments achevés. Les deux dates indiquent les observations conservées autour de la première présence dans le segment B1. Elles **ne donnent pas une date exacte de construction**, ni la garantie d’une absence totale de l’équipement avant l’état précédent.

| Infrastructure | État précédent conservé | Première présence observée |
|---|---:|---:|
| Cuisinière à bois, bureau simple | Aucun | J5,0382 |
| Table de boucherie, climatiseur, éolienne | J5,0382 | J12,9689 |
| Batterie | J14,6321 | J16,7428 |
| Cuisinière électrique, tailleur électrique | J17,1843 | J24,5663 |
| Panneau solaire, table de taille de pierre | J25,4905 | J37,0174 |
| Forge électrique | J41,4769 | J42,7381 |
| Générateur géothermique | J42,7381 | J51,8188 |
| Table d’usinage | J57,2117 | J57,8816 |
| Fonderie électrique | J88,3448 | J93,8095 |
| Bureau de recherche avancé | J97,3386 | J116,0554 |
| Foreuse profonde | J147,5142 | J149,2237 |
| Bassin hydroponique | J163,9338 | J167,2820 |

L’archive agrégée conserve aussi les premières présences dans B2/B3 et le détail des ateliers à chaque état. Le segment courant ne doit pas être fusionné avec un autre pour inventer une progression sans retour.

La présence d’un climatiseur ne prouve pas que la pièce est gelée. Les consignes enregistrées valent −9 °C à J12,9689, puis −25 °C sur le climatiseur à J17,1843 ; à J59,6589, trois consignes de −3 °C. Au dernier état, trois appareils demandent −3 °C et un autre **21 °C**. Puissance réellement fournie, température de chaque stock et bonne orientation ne sont pas déduites du seul nombre d’appareils.

## Recherche et consignes de production

La sauvegarde conserve les points par technologie et le projet courant. Le lecteur les compare aux coûts des **Defs installées 1.6.4871 rev590**, avec empreinte des fichiers de recherche dans le rapport. Cette comparaison de versions est explicitement un indicateur : elle ne certifie pas les coûts historiques de 1.6.4633 ni les dates d’achèvement.

Les sept connaissances `ClassicStart` atteignent déjà leur coût actuel dans le premier état : mobilier complexe, refroidissement passif, taille de pierre, vêtements complexes, électricité, pâte nutritive et climatisation. `DrugProduction` est alors partiellement avancée. Les points observés atteignent ensuite les coûts actuels de batterie au plus tard J16,7428, solaire au plus tard J25,4905, géothermie au plus tard J59,6589 ; usinage et armes sont également développés. Le dernier état possède des points au coût actuel de fabrication, fabrication avancée, forage, scanner et plusieurs technologies médicales et militaires. Un déblocage ne prouve pas que chaque objet associé a été construit ou utilisé.

Les factures montrent une évolution distincte des bâtiments : repas simples à répétition illimitée dans l’état J12,9689 ; à J25,4905, **repas simples en lot avec cible de 30** sur la cuisinière électrique ; à J59,6589, **repas fins en lot avec cible de 60** ; au dernier état, repas fins en lot avec cible de 150 et pemmican en lot avec cible de 250. Ces nombres sont des consignes enregistrées, pas des quantités produites depuis le départ. La boucherie est configurée en répétition illimitée dans les états où sa table est examinée.

## Conséquences concrètes pour Lisière

Le [socle V83](../gameplay/implementation-status.md) possède déjà récolte et ressemis, cuisine au feu, chasse au lièvre, dépouille et poste de boucherie, transport physique, stockage, chambres et conservation froide, puis un début d’énergie/recherche. Il ne faut pas réintroduire ces boucles comme des nouveautés.

Les écarts prioritaires pour une alimentation durable sont les capacités **combinées** suivantes :

- Dimensionner les cultures au nombre de consommateurs, au rendement et au travail réellement disponibles ; suivre au moins deux cycles et les stocks après disparition naturelle de la dotation. Les 80 cases observées à J5 donnent un repère concret pour le prochain pilote à trois personnes ; elles ne garantissent ni une récolte à J5 ni l’autonomie de tout groupe.
- Passer d’un feu de camp à une cuisinière fonctionnelle et du poste de boucherie à une table construite, avec matières, accès, travail et produits physiques. La colonie observée exploite ensuite l’électricité ; cela exige une source et une panne réelles, pas un indicateur décoratif.
- Autoriser des cultures et recettes distinctes : pommes de terre observées, repas fins et pemmican présents plus tard. Une diversification supplémentaire doit venir de ses références propres ; les sauvegardes ne justifient pas un rendement ou une cadence inventés.
- Relier factures, ingrédients, place de stockage, abri et froid. Une cible de repas ou un atelier disponible ne crée pas les ingrédients, ne les transporte pas et ne protège pas un stock encore dehors.
- Garder séparés les grands ensembles encore absents : élevage/reproduction/lait/œufs et renouvellement animal, saisons et dangers agricoles complets, câbles/batteries et diversité de production électrique, arbre de recherche/ateliers avancés, commerce et caravanes. Le parcours V84 peut améliorer la filière disponible sans prétendre reproduire déjà la ferme observée à J210.

Une longue colonie montre ici de grands stocks et une industrie diversifiée. Elle ne prouve ni un équilibre universel de Core, ni l’absence de crises intermédiaires, ni une consommation quotidienne moyenne extrapolable à Lisière. L’objectif de validation reste une chaîne alimentaire reproductible et conservatrice, avec ses échecs diagnostiqués depuis les vrais états.

## Reproduction et contrôle des données

[Script](../../scripts/reference-progression-audit.py) et [agrégats anonymisés](../../artifacts/core-progression-observed.json). Depuis le dépôt, Python standard uniquement :

```text
python scripts/reference-progression-audit.py --saves DOSSIER_SAVES --defs-root DOSSIER_CORE_DEFS --output artifacts/core-progression-observed.json
```

Le script choisit le groupe de monde Core seul possédant le plus de fichiers. Il lit les sauvegardes et les Defs sans les modifier ; il ne lance pas le jeu. La sortie contient versions, ticks, empreintes, comptes d’objets, cultures, points et consignes. Elle exclut noms de fichiers privés, dates réelles des sessions, graines, positions et identités des personnes, factions ou monde. Aucun XML propriétaire ni sauvegarde personnelle brute n’est publié.

Correction d’extraction conservée : un premier agrégat ne lisait que `pawns/li` pour les caravanes. L’examen de l’état J97,3386 a identifié `pawns/innerList/li` et ses références `Thing_` ; le lecteur résout désormais les vrais personnages hors carte avant le relevé final. Les contrôles de lecture ne sont ni des tests de simulation Lisière ni une campagne de performance.
