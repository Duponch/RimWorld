# Documentation de Lisière

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
| Choisir un contrôle et lire ses résultats | [Stratégie de tests](development/testing.md), [validation courante](development/validation.md) |
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
| Sélection et ordres directs | [Sélection, file et migration](development/player-orders.md) | [Commandes Core](research/player-orders-reference.md) |
| Objets, transport, constructions | [Logistique](development/material-logistics.md), [chantiers](development/construction.md), [sol et mouvement](development/spatial-motion-storage.md) | [Objets et zones Core](research/occupancy-reference.md), [plans et cadres](research/construction-reference.md), [adoption chap. 9–10](research/reference-adoption.md) |
| Repas, repos et confort | [Besoins](development/needs.md), [repas à table](development/dining.md), [aliments](development/food-items.md) | [Mobilier/repas](research/dining-reference.md), [choix alimentaire](research/food-clearing-reference.md) |
| Régimes alimentaires | [Autorisations partagées et migration](development/food-policies.md) | [Vérification des politiques](research/food-policies-reference.md) |
| Horaires et sommeil | [Plages, fatigue et migration](development/schedules.md) | [Vérification des horaires](research/schedules-reference.md) |
| Loisirs | [Activités, lassitude et migration](development/recreation.md) | [Vérification Core](research/recreation-reference.md) |
| Conservation des aliments | [Âge, transferts et expiration](development/food-preservation.md) | [Fraîcheur et référence Core](research/food-preservation-reference.md) |
| Cuisine et combustible | [Factures, ingrédients, feu](development/cooking.md) | [Recettes et ravitaillement](research/cooking-reference.md), [ordres de cuisine/semis](research/cooking-orders-reference.md), [dégagement/recharge](research/context-services-reference.md) |
| Plantes et cultures | [Agriculture](development/farming.md), [rochers et plantes](development/rocks-and-plants.md) | [Agriculture](research/farming-reference.md), [croissance sauvage](research/plant-growth.md) |
| Carte et environnement | [Génération](development/world-generation.md), [dimensions](development/world-generation.md#contrat-et-sauvegarde), [jour/nuit](development/daylight-camera.md) | [Espace 3D](research/spatial-design.md), [audit environnement](research/environment-review.md) |
| Rendu et personnages | [Cycle des ressources GPU](development/render-lifecycle.md), [équipement/portraits prévus](development/character-presentation.md) | [Choix GPU](research/rendering-and-performance.md), [observation visuelle](research/visual-reference.md) |
| Navigation et circulation | [Mouvement et réservations livrés](development/spatial-motion-storage.md), [mobilier V22](development/furniture-travel.md) | [Mobilier Core](research/furniture-travel-reference.md), [passage civil](research/civil-traffic-reference.md), [laboratoire GPU séparé](research/gpu-navigation.md) |

## Reprendre le développement

Lire ROADMAP et l’inventaire, puis le contrat du domaine et les chapitres/identifiants du corpus indiqués dans la note d’adoption. Refaire une recherche précise avant la mécanique ; documenter source, version, incertitude et décision. Les tableaux SYS/TEST orientent les cas, sans générer une suite par ligne.

Après un changement, mettre à jour **le contrat concerné**, puis les entrées affectées du guide, de l’inventaire, du catalogue et du plan. Les preuves détaillées vont dans validation, les mesures brutes dans `artifacts/`. Ne pas recopier tout le contrat dans chaque document. Quand une règle change, remplacer sa description courante ; conserver les anciennes décisions dans ADR/Git et les anciens résultats dans history.

`python scripts/check-docs.py` vérifie liens locaux, fragments, identifiants de la matrice et intégrité des originaux. Il ne vérifie pas la vérité des règles. Une retouche documentaire ne nécessite pas de rejouer la colonie entière.

Déconstruction des bâtiments actuels : [règles et limites](research/deconstruction-reference.md), [contrat V24](development/deconstruction.md).

Déplacement des meubles entiers : [transferts](development/furniture-transfer.md), [rangement et dégagement V26](development/furniture-logistics.md), [vérification des transferts](research/furniture-transfer-reference.md) et [recherche logistique](research/furniture-logistics-reference.md).
