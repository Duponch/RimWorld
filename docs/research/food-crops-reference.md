# Pommes de terre et maïs — référence Core V84

Recherche du **20 septembre 2026**, pour la filière alimentaire après le départ local V83. Les nouvelles cultures ne fixent aucun objectif de récolte à J7. La question est le choix entre une ressource disponible rapidement, une culture moins sensible au sol pauvre et une récolte plus tardive et abondante.

## Provenance et périmètre

Le corpus utilisateur, relu via [reference-adoption](reference-adoption.md), chapitre **12** et **SYS/TEST-070** semis, **071** croissance, **072** récolte, **075** fertilité, **077** choix alimentaire, ainsi que **UI-025** factures, demande une chaîne physique complète. Chapitre **14** : nutrition, besoins et maladie sont des états distincts. Décision : adopter les cultures et leurs interactions avec les systèmes présents ; adapter leur présentation 3D ; différer hydroponie, santé végétale complète et intoxications. Les statuts du corpus ne prouvent pas la validation de Lisière.

Référence primaire consultée **en lecture seule** : RimWorld **Core 1.6.4871 rev590**, sans extension active dans la configuration témoin. Assembly SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Définitions `Plants_Cultivated_Farm`, `Plants_Bases`, `Items_Resource_RawPlant`, `Items_Resource_Base`, `Recipes_Meals`, `Difficulties` et classes `PlantProperties`, `Plant`, `PlantUtility`, `ThingDef`. Aucun XML, code décompilé ou sauvegarde personnelle brute n’est reproduit ici.

Recoupement public consulté le même jour : [Potato plant](https://rimworldwiki.com/wiki/Potato_plant), [Corn plant](https://rimworldwiki.com/wiki/Corn_plant) (révision affichée 181585), [Potatoes](https://rimworldwiki.com/wiki/Potatoes) (181407), [Corn](https://rimworldwiki.com/wiki/Corn) (181398), [Plants](https://rimworldwiki.com/wiki/Plants). Ce sont des pages communautaires ; certaines sont marquées comme non vérifiées. Elles corroborent les paramètres, sans remplacer l’examen des héritages locaux. La [publication officielle 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) sert uniquement à dater la branche publique antérieure : elle ne certifie pas chaque coefficient du build 4871 installé.

## Coefficients vérifiés

| Règle saine/neutre | Pommes de terre | Maïs |
| --- | ---: | ---: |
| Identifiants Core plante / produit | Plant_Potato / RawPotatoes | Plant_Corn / RawCorn |
| Identifiant Lisière plante / produit | potato / potato | corn / corn |
| Croissance biologique continue idéale | 5,8 jours | 11,3 jours |
| Produit à maturité | 11 unités | 22 unités |
| Fertilité minimale | 0,7 | 0,7 |
| Sensibilité à la fertilité | 0,4 | 1 |
| Travail neutre semis / récolte | 170 / 200 ticks Core | 170 / 200 ticks Core |
| Compétence minimale de semis | 0 | 0 |
| Nutrition d’une unité récoltée | 0,05 | 0,05 |
| Pile maximale du produit | 75 | 75 |
| Début de pourriture à taux plein | 30 jours | 60 jours |
| Nutrition du plant pour broutage | 0,25 | 0,4 |
| PV du plant dans Core, non livrés ici | 85 | 150 |
| Hydroponie dans Core, non livrée ici | autorisée | interdite |

Les valeurs héritées sont essentielles. La classe PlantProperties seule a une sensibilité initiale différente ; le parent XML PlantBase la remplace par **1**. La pomme de terre la remplace ensuite par **0,4**. Le maïs garde celle du parent. Le minimum de fertilité et les travaux viennent également du parent. Les produits héritent d’OrganicProductBase puis ResourceBase pour la limite de pile. Ne pas déduire les règles de la seule définition terminale.

La fertilité applique `1 − sensibilité + fertilité × sensibilité`, une fois le minimum satisfait. Terre ordinaire, terre riche et gravier ont respectivement 1 / 1,4 / 0,7 dans les [nouveaux sites](site-soils-reference.md). Les facteurs de croissance sont donc **1 / 1,16 / 0,88** pour la pomme de terre et **1 / 1,4 / 0,7** pour le maïs. La formulation communautaire qui décrit la pomme de terre comme « insensible » aux mauvais sols doit se lire comme moins sensible : ni coefficient nul ni croissance identique partout. Le sol historique `soil` reste à 0,7.

## Temps, récolte et risques

Les classes locales confirment l’intégrale de lumière, le repos avant 25 % et après 80 % de la journée et la rampe lumineuse 51–100 %. La croissance thermique est pleine de 6 à 42 °C et s’annule à 0/58 °C ; les intervalles antérieurs sont ancrés avant changement. La [recherche agricole initiale](farming-reference.md) et la [relecture V83](site-soils-reference.md) décrivent le profil lumineux déjà adopté. Aucun nouveau multiplicateur temporel n’est ajouté pour ces cultures.

Le wiki donne environ 10,71 jours pour les pommes de terre et 20,86 pour le maïs sur sol normal : cette conversion repose sur une fenêtre favorable de 13 h / 24 h. Ce n’est pas une garantie à toute latitude/saison. Notre profil fixe 45°/équinoxe intègre environ 2 572,1919701 ticks favorables par jour de 6 000 ticks. Une projection au taux journalier moyen donne les durées suivantes :

| Sol | Pommes de terre | Maïs |
| --- | ---: | ---: |
| Gravier 0,7 | 15,37 jours | 37,66 jours |
| Terre ordinaire 1 | 13,53 jours | 26,36 jours |
| Terre riche 1,4 | 11,66 jours | 18,83 jours |

Ce sont **des projections d’intégrale**, pas un parcours joueur observé ni une reproduction de n’importe quelle carte Core. L’heure du semis, la lumière et les températures déplacent le premier passage à maturité. La validation doit conserver les parcours de plusieurs semaines lorsque la décision observée l’exige, au lieu d’accélérer la plante.

Core permet une récolte manuelle lorsque la croissance est **strictement supérieure à 0,65** ; l’automatisation attend la maturité. Le rendement de croissance monte de la moitié au rendement plein entre ces seuils, avec arrondi stochastique. Les plantes récoltées ici sont supprimées ; un nouveau semis reçoit une autre identité. Core applique aussi les PV du plant et le multiplicateur de rendement de difficulté ; **Medium vaut1**. Les compétences/échecs de récolte, les PV végétaux, le fléau, la mort par froid ou vieillissement et les incendies ne sont pas déduits de l’ajout de deux espèces et restent absents de cette tranche. Les risques plus longs du maïs documentés par le wiki ne sont donc que partiellement présents dans Lisière : temps d’attente, arrêt de croissance, consommation par la faune et perte des stocks.

## Aliment, recette et stockage

Les deux produits sont des aliments bruts RawBad et causent la pensée de repas cru. La préférence et l’ingestion physique reprennent le contrat alimentaire existant, dont la pénalité usuelle −7 d’humeur. Core définit dans PlantFoodRawBase une probabilité fixe humaine d’intoxication de **0,02**, également héritée par le riz. **L’intoxication n’est pas implémentée dans cette tranche** : ne pas considérer ces légumes comme une filière médicale complète.

CookMealSimple accepte 0,5 nutrition d’aliments bruts pour un repas, soit **10 unités** de ces légumes, seuls ou mélangés aux ingrédients compatibles. Les filtres de facture autorisent l’usage culinaire ; les régimes du mangeur autorisent l’ingestion. Aucun des deux ne remplace le filtre de rangement ni l’accès physique. Les nouveaux produits réutilisent la copie d’âge, la fusion pondérée et les températures locales ; ils ne rajeunissent pas pendant un transport.

La nutrition de la plante pour broutage est distincte de celle de l’objet récolté. Le lièvre peut manger les plants ou produits compatibles au contact sous ses réservations. Le maïs haut de notre rendu reste un plant de remplissage balistique nul : les deux Defs n’écrasent pas le zéro par défaut de ThingDef, contrairement aux buissons et arbres. Le volume graphique ne crée donc aucun couvert ou obstacle supplémentaire.

Confiance élevée sur les valeurs locales et l’héritage observé ; moyenne sur leur calendrier moyen hors de notre profil fixe ; aucune prétention à une distribution exhaustive des rendements d’une colonie Core. [Contrat d’implémentation](../development/food-crops.md).
