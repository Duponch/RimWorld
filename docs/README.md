# Documentation de Lisière

**État du dépôt :** schéma 152. V153 réduit le sous-coût des [réservations alimentaires animales](development/wildlife-reservation-index-v153.md) sans changer les décisions. V152 ajoute le [plat raffiné mixte](development/fine-meal-v152.md) sur cuisinière, après [recherche Core 1.6.4871](research/fine-meal-core-v152.md). V151 a réduit le coût de la [proposition de cuisine](development/cooking-service-cache-v151.md) ; V150 a ajouté la [frénésie alimentaire](development/food-binge-v150.md). L’[inventaire fonctionnel](gameplay/implementation-status.md) distingue livré, partiel et absent. La [feuille de route](ROADMAP.md) est le calendrier des travaux ; la [validation courante](development/validation.md) borne les preuves. Les anciens résumés de versions sont conservés dans l’[index archivé](README-pre-v145.md).

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
- **development/** fixe les contrats et les frontières techniques. Les contrats récents concernent les [réservations animales V153](development/wildlife-reservation-index-v153.md), le [plat raffiné V152](development/fine-meal-v152.md), la [cuisine V151](development/cooking-service-cache-v151.md), la [frénésie alimentaire V150](development/food-binge-v150.md), le [son V149](development/audio-sfx-v149.md), le [casque de reconnaissance V148](development/recon-helmet-v148.md), les [pannes V144](development/breakdown-v144.md), les [portes automatiques V143](development/autodoor-v143.md), le [transfert local de terrain V142](development/terrain-upload-v142.md), le [casque pare-balles V141](development/flak-helmet-v141.md) et la [fabrication avancée V139](development/advanced-fabrication-v139.md).
- **research/** conserve sources, versions et incertitudes. **reference/originals/** conserve le [corpus reçu](reference/originals/manifest.json) avec contrôle d’intégrité.
- **history/** conserve les preuves et leurs conditions exactes ; une validation passée ne certifie pas automatiquement une révision ultérieure.
- **decisions/** conserve les choix de conception et leurs remplacements.

## Reprendre le développement

Lire l’état fonctionnel et la feuille de route, puis le contrat et la recherche du domaine. Après un changement, actualiser le contrat, les points d’entrée concernés et la preuve de validation. `python scripts/check-docs.py` contrôle les liens, le corpus original et l’accord des six en-têtes courants avec le schéma du code ; il ne détermine pas si une affirmation fonctionnelle est à jour. Les synthèses et tables antérieures à V145 restent consultables dans l’[archive de l’index](README-pre-v145.md).
