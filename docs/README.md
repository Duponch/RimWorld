# Documentation de Lisière

V48 : [alimentation assistée au lit](development/feeding.md), [sources recoupées et seuil adulte](research/feeding-reference.md). Médecin prend et porte la portion selon le régime du patient ; nutrition seulement au terme du repas. Médicaments et auto-soins restent ouverts.

V47 : [traitements sans médicament, repos médical et Médecine](development/tending.md), [règles revérifiées](research/tending-reference.md). Les médicaments et les auto-soins restent ouverts ; alimentation assistée ajoutée en V48.

V46 : [secours physiques et lits médicaux](development/rescue.md). Médecin, clic droit, portage GPU et reprise en cours de transport ; traitements ajoutés en V47, alimentation assistée ajoutée en V48.

V44 : [interruptions et cargaisons conservées](development/interrupted-cargo.md), [relecture de l’épuisement et du dépôt](research/interrupted-cargo-reference.md).

V45 : [santé active](development/health.md), [recherche des transitions et accidents](research/health-reference.md). Anatomie, lésions, incapacités, décès et effets physiques intégrés ; secours ajoutés en V46, traitements sans médicament en V47 ; équipement et combat restent à développer. [Référence des secours et préparation des traitements](research/care-preparation.md).

V43 : [première compétence et apprentissage](development/skills.md), [recherche et réorientation des priorités](research/skills-reference.md).

V42 : [générateur à bois, raccordement et lampe](development/power.md), [vérification RimWorld](research/power-reference.md).

V41 : [composants industriels](development/components.md), [vérification RimWorld](research/components-reference.md).

La référence est RimWorld de base, transposé en 3D. Une description de RimWorld, une intention du projet et une fonctionnalité livrée sont trois informations distinctes. Ce dossier les sépare ; les extensions viennent après G5.

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
| Électricité | [Génération et lampes V42](development/power.md) | [Sources et limites](research/power-reference.md) |
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
| Plantes et cultures | [Agriculture](development/farming.md), [croissance thermique V39](development/plant-temperature.md), [rochers et plantes](development/rocks-and-plants.md) | [Agriculture](research/farming-reference.md), [croissance sauvage](research/plant-growth.md) |
| Toits construits | [Couverture, supports, zones et sauvegarde](development/roofing.md) | [Vérification Core](research/roofing-reference.md) |
| Carte et environnement | [Génération](development/world-generation.md), [dimensions](development/world-generation.md#contrat-et-sauvegarde), [jour/nuit](development/daylight-camera.md) | [Espace 3D](research/spatial-design.md), [audit environnement](research/environment-review.md) |
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
