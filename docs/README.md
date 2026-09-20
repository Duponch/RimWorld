# Documentation de Lisière

État courant : **V81, 20 septembre 2026**. [Infections et soins prolongés](development/infections.md) relient risque après blessure, immunité, traitements physiques répétés et récupération ; [preuves V81](history/validation-infections-v81.md). [Trois survivants](development/scenario-start.md) propose un départ explicite avec dotation physique, technologies connues et implantation naturelle ; sa calibration reste partielle. [Preuves V80](history/validation-scenario-v80.md), [estimations par système](ROADMAP.md#estimation-davancement). La [filière animale V79](development/hunting.md) relie chasse, dépouille, boucherie et repas ; ses [preuves](history/validation-hunting-v79.md) restent distinctes.

**Réorientation du 20 septembre :** [référence de partie Core vérifiée](research/core-reference-baseline.md), [rythme et difficulté](research/colony-pacing-reference.md), [cartes et ressources](research/map-calibration-reference.md), [parties réellement observées](research/colony-observation-reference.md). Installation 1.6.4871 lue sans modification et captures utilisateur ; Atterrissage forcé / Cassandra / Récit d'aventure retenus pour la cible. [Menus demandés](development/new-game-menus.md) encore à implémenter, [preuve et bilan du diagnostic](history/reference-audit-2026-09-20.md). Cette recherche ne change pas le gameplay V81.

Dernières boucles de colonie : [conservation froide V75](development/cold-store.md), [canicule V74](development/heatwave.md), [recherche et tailleur V73](development/research.md). Les étapes proches 4 et 5 sont livrées dans leurs périmètres annoncés ; arbre de recherche, saisons et environnement complet restent ouverts. [Inventaire consolidé](gameplay/implementation-status.md).

La [revue de progression](research/progression-review-2026-09-19.md) explique la réorientation vers des situations de colonie complètes. [ROADMAP](ROADMAP.md) conserve seule l’ordre des prochains travaux et les estimations. Mode jour demandé le 20 septembre ; sous-étapes indépendantes déléguées et intégration centrale.

Les bilans de versions sont dans les contrats et [l’index de validation](development/validation.md) ; ils ne remplacent pas l’état fonctionnel actuel.

## Trouver la bonne information

| Besoin | Document faisant autorité |
|---|---|
| Lancer le jeu et les outils | [README du dépôt](../README.md) |
| Jouer et comprendre les règles présentes | [Guide joueur](gameplay/player-guide.md) |
| Savoir ce qui est livré, partiel ou absent | [Inventaire fonctionnel](gameplay/implementation-status.md) |
| Connaître les prochains travaux | [ROADMAP](ROADMAP.md), unique calendrier G0–G5 |
| Recenser objets et variantes | [Catalogue de contenu](gameplay/content-catalogue.md), couverture individuelle encore incomplète |
| Comprendre les frontières techniques | [Architecture actuelle](development/architecture.md) et [simulation](development/simulation.md) |
| Choisir un contrôle et lire ses résultats | [Stratégie de tests](development/testing.md), [retour sur les défauts visibles](development/playability-validation.md), [validation courante](development/validation.md) |
| Retrouver les comportements de référence | [Adoption du corpus](research/reference-adoption.md), puis recherche du domaine |
| Comprendre une adaptation volontaire | [Décisions de gameplay](gameplay/decisions.md) et [décisions techniques](development/architecture.md#registre-des-décisions) |

## Organisation

- **gameplay/** : expérience actuelle, couverture, écarts et matrice des 25 domaines. La matrice décrit les cibles ; elle ne constitue pas une livraison.
- **development/** : contrats maintenus, frontières, migrations et contrôles du système présent.
- **research/** : sources consultées, dates, incertitudes et décisions adopter/adapter/différer/vérifier. Une ancienne observation reste datée et ne remplace pas un contrat actuel.
- **reference/originals/** : les trois fichiers reçus, auparavant dans `new_docs`, préservés octet pour octet avec [manifeste d’intégrité](reference/originals/manifest.json). HTML et PDF sont deux formats d’un même rapport, pas deux sources indépendantes.
- **decisions/** : ADR regroupées par domaine. Les décisions historiques restent traçables ; les contrats actuels indiquent leurs remplacements.
- **history/** : anciennes validations et leurs conditions exactes. Elles ne prouvent pas qu’une version plus récente passe encore ces contrôles.

## Entrées par domaine

| Domaine | Contrat du projet | Recherche et cible |
|---|---|---|
| Murs/portes endommagés, foyer et réparation | [Ouvrages V67](development/barriers.md) | [Règles et adaptations](research/barriers-reference.md) |
| Population et premier incident | [Accueil V66](development/arrivals.md) | [Arrivée volontaire et limites](research/arrival-reference.md) |
| Humeur et crises | [Humeur V64](development/mood.md), [errance triste V65](development/mental-break.md) | [Pensées](research/mood-reference.md), [crises et contradictions](research/mental-break-reference.md) |
| Conservation froide et hypothermie | [Contrat V75](development/cold-store.md) | [Recherche datée](research/cold-store-reference.md) |
| Recherche et déblocages | [Recherche V73](development/research.md) | [Sources et incertitudes](research/research-reference.md) |
| Confection et progression | [Tenue tribale V72](development/tailoring.md) | [Sources et écarts](research/tailoring-reference.md) |
| Habillement | [Vêtements et protection V63](development/armor.md) | [Règles revérifiées](research/apparel-reference.md) |
| Combat | [Tir](development/shooting.md), [mêlée](development/melee.md), [acquisition](development/automatic-combat.md), [approche](development/pursuit.md), [réveils](development/disturbance.md) | [Préparation et limites](research/combat-preparation.md), [rencontre](development/encounters.md) |
| Infection de plaie | [Contrat V81](development/infections.md) | [Sources, divergences et adaptations](research/infection-reference.md) |
| Santé et équipement | [Santé](development/health.md), [secours](development/rescue.md), [traitements](development/tending.md), [alimentation assistée](development/feeding.md), [médicaments](development/medicines.md), [équipement](development/equipment.md) | [Compétences](development/skills.md), [recherche santé](research/health-reference.md) |
| Électricité | [Génération et lampes V42](development/power.md) | [Sources et limites](research/power-reference.md) |
| Canicule et santé thermique | [Incident, isolation, refuge V74](development/heatwave.md) | [Sources et divergences](research/heatwave-reference.md) |
| Refroidissement passif | [Construction, recharge et air V40](development/passive-cooling.md) | [Sources et limites](research/passive-cooling-reference.md) |
| Température et conservation | [Air local et âges V38](development/temperature.md), [conservation](development/food-preservation.md) | [Vérifications Core](research/temperature-reference.md) |
| Lumière, travail et marche | [Travaux/marche V37](development/light-work.md), [ateliers V36](development/work-environment.md), [rendu 3D](development/environment-lighting.md) | [Travaux et marche Core](research/light-work-reference.md), [ateliers Core](research/work-environment-reference.md), [interprétation visuelle](research/environment-lighting-reference.md) |
| Sélection et ordres directs | [Sélection, file et migration](development/player-orders.md) | [Commandes Core](research/player-orders-reference.md) |
| Objets, transport, constructions | [Logistique](development/material-logistics.md), [chantiers](development/construction.md), [sol et mouvement](development/spatial-motion-storage.md) | [Objets et zones Core](research/occupancy-reference.md), [plans et cadres](research/construction-reference.md), [adoption chap. 9–10](research/reference-adoption.md) |
| Repas, repos et confort | [Besoins](development/needs.md), [repas à table](development/dining.md), [aliments](development/food-items.md) | [Mobilier/repas](research/dining-reference.md), [choix alimentaire](research/food-clearing-reference.md) |
| Régimes alimentaires | [Autorisations partagées et migration](development/food-policies.md) | [Vérification des politiques](research/food-policies-reference.md) |
| Horaires et sommeil | [Plages, fatigue et migration](development/schedules.md) | [Vérification des horaires](research/schedules-reference.md) |
| Loisirs | [Activités, lassitude et migration](development/recreation.md) | [Vérification Core](research/recreation-reference.md) |
| Conservation des aliments | [Âge, transferts et expiration](development/food-preservation.md) | [Fraîcheur et référence Core](research/food-preservation-reference.md) |
| Cuisine et combustible | [Factures, ingrédients, feu](development/cooking.md) | [Recettes et ravitaillement](research/cooking-reference.md), [ordres de cuisine/semis](research/cooking-orders-reference.md), [dégagement/recharge](research/context-services-reference.md) |
| Plantes et cultures | [Coton et tissu V71](development/textiles.md), [Agriculture](development/farming.md), [croissance thermique V39](development/plant-temperature.md), [rochers et plantes](development/rocks-and-plants.md) | [Agriculture](research/farming-reference.md), [croissance sauvage](research/plant-growth.md) |
| Toits construits | [Couverture, supports, zones et sauvegarde](development/roofing.md) | [Vérification Core](research/roofing-reference.md) |
| Carte et environnement | [Génération](development/world-generation.md), [dimensions](development/world-generation.md#contrat-commun-et-sauvegarde), [jour/nuit](development/daylight-camera.md) | [Espace 3D](research/spatial-design.md), [audit environnement](research/environment-review.md) |
| Synchronisation visuelle | [Horloge, phases et HUD](development/presentation-timing.md) | [Vérification et diagnostic](research/presentation-timing-reference.md) |
| Rendu et personnages | [Cycle des ressources GPU](development/render-lifecycle.md), [équipement/portraits prévus](development/character-presentation.md) | [Choix GPU](research/rendering-and-performance.md), [observation visuelle](research/visual-reference.md) |
| Navigation et circulation | [Mouvement et réservations livrés](development/spatial-motion-storage.md), [mobilier V22](development/furniture-travel.md) | [Mobilier Core](research/furniture-travel-reference.md), [passage civil](research/civil-traffic-reference.md), [laboratoire GPU séparé](research/gpu-navigation.md) |

## Reprendre le développement

Lire ROADMAP et l’inventaire, puis le contrat du domaine et les chapitres/identifiants du corpus indiqués dans la note d’adoption. Refaire une recherche précise avant la mécanique ; documenter source, version, incertitude et décision. Les tableaux SYS/TEST orientent les cas, sans générer une suite par ligne.

Après un changement, mettre à jour **le contrat concerné**, puis les entrées affectées du guide, de l’inventaire, du catalogue et du plan. Les preuves détaillées vont dans validation, les mesures brutes dans `artifacts/`. Ne pas recopier tout le contrat dans chaque document. Quand une règle change, remplacer sa description courante ; conserver les anciennes décisions dans ADR/Git et les anciens résultats dans history.

`python scripts/check-docs.py` vérifie liens locaux, fragments, identifiants de la matrice et intégrité des originaux. Il ne vérifie pas la vérité des règles. Une retouche documentaire ne nécessite pas de rejouer la colonie entière.

Déconstruction des bâtiments actuels : [règles et limites](research/deconstruction-reference.md), [contrat V24](development/deconstruction.md).

Déplacement des meubles entiers : [transferts](development/furniture-transfer.md), [rangement et dégagement V26](development/furniture-logistics.md), [vérification des transferts](research/furniture-transfer-reference.md) et [recherche logistique](research/furniture-logistics-reference.md).

Géologie des nouvelles cartes : [contrat V27](development/geology.md), [recherche Core](research/geology-reference.md).

Minage : [contrat V28](development/mining.md), [référence et divergences](research/mining-reference.md).

Fluidité des premiers dépôts : [préparation des ombres](development/shadow-preparation.md).

Acier et premiers minerais : [contrat V29](development/steel.md), [recherche et prérequis des ateliers](research/steel-reference.md).

Choix bois/acier : [contrat V30](development/construction-materials.md), [vérification des recettes](research/construction-materials-reference.md).

Taille de pierre : [production V32](development/stonecutting.md), [recherche de la recette](research/stonecutting-reference.md).

Atelier à ingrédients mixtes : [contrat V31](development/stonecutter.md), [recherche Core](research/stonecutter-reference.md).

Constructions en pierre V33 : [contrat des matériaux](development/construction-materials.md), [règles vérifiées](research/stone-buildings-reference.md).

Portes manuelles V34 : [contrat](development/doors.md), [recherche Core](research/doors-reference.md).

Requêtes CPU sous V34 : [contrat et durée de vie](development/spatial-queries.md), [relecture accès/arrêt/loisirs](research/spatial-query-reference.md).

Pièces sous V34 : [topologie et inspection](development/rooms.md), [relecture Core et préparation des toits](research/rooms-reference.md).
