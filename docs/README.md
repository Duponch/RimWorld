# Documentation de Lisière

**État du dépôt :** schéma 160. Le [repas simple par quatre V160](development/simple-meal-bulk-v160.md) est livré dans le périmètre de sa [preuve](history/validation-simple-meal-bulk-v160.md), avec [recherche Core](research/bulk-meals-core-v160.md). V159 ajoute le [plat gastronomique carnivore](development/lavish-carnivore-v159.md) ; sa [preuve](history/validation-carnivore-lavish-v159.md) distingue les contrôles acquis de leurs limites. V158 réduit la [lecture des faces des climatiseurs](development/cooler-face-index-v158.md) sans nouvelle mécanique. L’[inventaire fonctionnel](gameplay/implementation-status.md) distingue livré, partiel et absent. La [feuille de route](ROADMAP.md) est le calendrier des travaux ; la [validation courante](development/validation.md) borne les preuves. Les anciens résumés de versions sont conservés dans l’[index archivé](README-pre-v145.md).

## Trouver la bonne information

| Besoin | Point d’entrée |
| --- | --- |
| Installer et lancer | [README du dépôt](../README.md) |
| Jouer | [Guide joueur](gameplay/player-guide.md) |
| Savoir ce qui est livré ou manque | [État fonctionnel](gameplay/implementation-status.md) |
| Choisir le prochain chantier | [ROADMAP](ROADMAP.md) |
| Vérifier un résultat | [Validation courante](development/validation.md), puis preuve du domaine concerné |
| Choisir les contrôles | [Stratégie de tests](development/testing.md) |
| Rechercher une règle Core | [Adoption du corpus](research/reference-adoption.md), puis recherche du domaine |
| Examiner le contenu | [Catalogue](gameplay/content-catalogue.md) et [matrice des 25 domaines](gameplay/systems-matrix.md) |
| Comprendre une adaptation | [Décisions de gameplay](gameplay/decisions.md), [architecture](development/architecture.md) |

## Organisation

- **gameplay/** décrit l’expérience présente et la cible. Une ligne de matrice ou une définition de catalogue n’est pas une livraison.
- **development/** fixe les contrats et les frontières techniques. Le [lot simple ×4 V160](development/simple-meal-bulk-v160.md) est livré dans le périmètre prouvé ; les contrats livrés récents concernent le [plat gastronomique carnivore V159](development/lavish-carnivore-v159.md), l'[index des faces de climatiseur V158](development/cooler-face-index-v158.md), le [plat gastronomique végétarien V157](development/lavish-vegetarian-v157.md), le [plat raffiné carnivore V156](development/fine-carnivore-v156.md), le [plat raffiné végétarien V155](development/fine-vegetarian-v155.md), le [plat gastronomique V154](development/lavish-meal-v154.md), les [réservations animales V153](development/wildlife-reservation-index-v153.md), le [plat raffiné V152](development/fine-meal-v152.md), la [cuisine V151](development/cooking-service-cache-v151.md), la [frénésie alimentaire V150](development/food-binge-v150.md), le [son V149](development/audio-sfx-v149.md) et les systèmes antérieurs accessibles dans l’[index archivé](README-pre-v145.md).
- **research/** conserve sources, versions et incertitudes. **reference/originals/** conserve le [corpus reçu](reference/originals/manifest.json) avec contrôle d’intégrité.
- **history/** conserve les preuves et leurs conditions exactes ; une validation passée ne certifie pas automatiquement une révision ultérieure.
- **decisions/** conserve les choix de conception et leurs remplacements.

## Reprendre le développement

Lire l’état fonctionnel et la feuille de route, puis le contrat et la recherche du domaine. Après un changement, actualiser le contrat, les points d’entrée concernés et la preuve de validation. `python scripts/check-docs.py` contrôle les liens, le corpus original et l’accord des six en-têtes courants avec le schéma du code ; il ne détermine pas si une affirmation fonctionnelle est à jour. Les synthèses et tables antérieures à V145 restent consultables dans l’[archive de l’index](README-pre-v145.md).
