# Documentation de Lisière

**État du dépôt :** schéma 162. [Audio V166](development/audio-coverage-v166.md) relève le bois et élargit les bruitages selon la [recherche Core](research/audio-coverage-core-v166.md) ; les [précipitations V166](development/weather-precipitation-v166.md) rendent pluie et neige dans le monde 3D. Leurs huit scènes sont désormais dans [Colonies de test](history/validation-weather-catalog-v166.md). La [preuve ciblée V166](history/validation-audio-weather-v166.md) borne le rendu et les sons. Le [mix V165](development/audio-mix-v165.md) et ses [trois longues musiques](development/audio-music-content-v165.md) restent disponibles. La [facture de plats raffinés végétariens par quatre V162](development/fine-vegetarian-bulk-v162.md) reste livrée dans le périmètre de sa [preuve](history/validation-fine-vegetarian-bulk-v162.md). L’[inventaire fonctionnel](gameplay/implementation-status.md) distingue livré, partiel et absent ; la [feuille de route](ROADMAP.md) est le calendrier des travaux et la [validation courante](development/validation.md) borne les preuves.

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
- **development/** fixe les contrats et les frontières techniques. Les lots [raffiné végétarien ×4 V162](development/fine-vegetarian-bulk-v162.md), [raffiné mixte ×4 V161](development/fine-meal-bulk-v161.md) et [simple ×4 V160](development/simple-meal-bulk-v160.md) sont livrés dans leurs périmètres prouvés. Les autres contrats récents restent accessibles par domaine dans ce répertoire.
- **research/** conserve sources, versions et incertitudes. **reference/originals/** conserve le [corpus reçu](reference/originals/manifest.json) avec contrôle d’intégrité.
- **history/** conserve les preuves et leurs conditions exactes ; une validation passée ne certifie pas automatiquement une révision ultérieure.
- **decisions/** conserve les choix de conception et leurs remplacements.

## Reprendre le développement

Lire l’état fonctionnel et la feuille de route, puis le contrat et la recherche du domaine. Après un changement, actualiser le contrat, les points d’entrée concernés et la preuve de validation. `python scripts/check-docs.py` contrôle les liens, le corpus original et l’accord des six en-têtes courants avec le schéma du code ; il ne détermine pas si une affirmation fonctionnelle est à jour. Les synthèses et tables antérieures à V145 restent consultables dans l’[archive de l’index](README-pre-v145.md).
