# Documentation de Lisière

**V172 livré dans le périmètre contrôlé :** le [contrat des quatre plats gastronomiques végétariens](development/lavish-vegetarian-bulk-v172.md) et sa [recherche Core](research/lavish-vegetarian-bulk-core-v172.md) décrivent un quota unique de 100 végétaux crus et/ou laits pour quatre produits V157 existants ; la [preuve V172](history/validation-lavish-vegetarian-bulk-v172.md) consigne ciblés, Chromium préparé, régression, build et présentation passés, ainsi que les limites du microbanc CPU. Le [plat gastronomique mixte par quatre V171](development/lavish-meal-bulk-v171.md) reste livré dans le périmètre de sa [preuve](history/validation-lavish-bulk-v171.md). Le [plat raffiné carnivore V170](history/validation-fine-carnivore-bulk-v170.md) et l'[audit CPU/GPU V169](history/validation-performance-v169.md) gardent leurs preuves datées.

**État du dépôt :** schéma courant 165 ; V172 et V171 sont livrés dans le périmètre de leurs preuves respectives. La [recette V170](development/fine-carnivore-bulk-v170.md) conserve sa [preuve](history/validation-fine-carnivore-bulk-v170.md) au schéma 163. L’[inventaire fonctionnel](gameplay/implementation-status.md) distingue livré, partiel et absent ; la [feuille de route](ROADMAP.md) est le calendrier des travaux et la [validation courante](development/validation.md) borne les preuves.

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
- **development/** fixe les contrats et les frontières techniques. Le [gastronomique mixte ×4 V171](development/lavish-meal-bulk-v171.md), le [raffiné carnivore ×4 V170](development/fine-carnivore-bulk-v170.md), le [raffiné végétarien ×4 V162](development/fine-vegetarian-bulk-v162.md), le [raffiné mixte ×4 V161](development/fine-meal-bulk-v161.md) et le [simple ×4 V160](development/simple-meal-bulk-v160.md) sont livrés dans leurs périmètres prouvés. Le [gastronomique végétarien ×4 V172](development/lavish-vegetarian-bulk-v172.md) est livré dans le périmètre de sa [preuve](history/validation-lavish-vegetarian-bulk-v172.md).
- **research/** conserve sources, versions et incertitudes. **reference/originals/** conserve le [corpus reçu](reference/originals/manifest.json) avec contrôle d’intégrité.
- **history/** conserve les preuves et leurs conditions exactes ; une validation passée ne certifie pas automatiquement une révision ultérieure.
- **decisions/** conserve les choix de conception et leurs remplacements.

## Reprendre le développement

Lire l’état fonctionnel et la feuille de route, puis le contrat et la recherche du domaine. Après un changement, actualiser le contrat, les points d’entrée concernés et la preuve de validation. `python scripts/check-docs.py` contrôle les liens, le corpus original et l’accord des six en-têtes courants avec le schéma du code ; il ne détermine pas si une affirmation fonctionnelle est à jour. Les synthèses et tables antérieures à V145 restent consultables dans l’[archive de l’index](README-pre-v145.md).
