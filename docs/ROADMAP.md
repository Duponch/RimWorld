# Plan de développement

**Schéma courant 155.** V155 implémente le [plat raffiné végétarien](development/fine-vegetarian-v155.md) ; sa [preuve](history/validation-vegetarian-fine-v155.md) consigne les contrôles ciblés, Chromium, la régression et le build passés. La présentation passe sur rerun isolé après un premier essai échoué. V154 livre le [plat gastronomique mixte](development/lavish-meal-v154.md) dans le périmètre de sa [preuve](history/validation-lavish-meal-v154.md). Le [pilote de colonie V153](history/validation-colony-pilot-v153.md) couvre ses trois graines. L’[état fonctionnel](gameplay/implementation-status.md) décrit le jeu présent ; la [validation courante](development/validation.md) en borne les preuves. Les priorités ci-dessous sont des travaux, pas des validations acquises.

## Priorité actuelle

1. **Entretenir la continuité.** Le [pilote commun V153](history/validation-colony-pilot-v153.md) passe ses trois graines après diagnostic des anciens oracles ; la [consolidation V145](history/validation-consolidation-v145.md) conserve le périmètre des autres campagnes. Utiliser les commandes de tests distinctes, conserver les checkpoints et traiter les échecs restants sans assouplir les validations ni écraser les preuves historiques. G0 n’est pas clos par une passe ciblée.
2. **Réduire la charge CPU mesurée.** La [référence V145](history/validation-performance-reference-v145.md) constate que ×6 demandé n’est pas atteint pendant les fenêtres de reprise. Le [profil V146](history/validation-performance-v146.md) sépare simulation, captures, encodage et clone local sur le même monde 250² ; la faune et la planification dominent `stepWorld`. La recapture de publication est retirée. Les [preuves ciblées V147](history/validation-firefighting-performance-v147.md), [V151](history/validation-cooking-performance-v151.md) et [V153](history/validation-wildlife-reservations-v153.md) mesurent des propositions d'extinction, de cuisine puis d'alimentation animale moins coûteuses avec décisions inchangées, sans établir de gain global. Les microbancs [V154](history/validation-lavish-meal-v154.md) et [V155](history/validation-vegetarian-fine-v155.md) conservent décisions et snapshots ; leurs écarts bruités ne changent pas ce bilan. Les essais de raccourcis sur les trajets animaux et le stationnement ont été rejetés après A/B défavorable ; poursuivre par sous-coût isolé, égalité des décisions/snapshots et comparaison native répétée. Les temps GPU restent séparés ; aucune garantie de 240 FPS ou ×6 général.
3. **Fermer les écarts de gameplay prioritaires.** V152 ajoute le plat raffiné mixte, V154 le gastronomique mixte et V155 implémente le [raffiné végétarien](development/fine-vegetarian-v155.md), dans le périmètre de sa preuve de validation. Les recettes carnée, par quatre et autres variantes restent absentes. La deuxième crise mineure V150 ne couvre pas les autres crises ni les effets du trait Gourmand. Étendre les débouchés de l’industrie et le catalogue utilisable, les pensées/crises et la santé, puis explorer monde, caravanes et quêtes comme une tranche verticale. Chaque lot doit préciser ses accès en partie ordinaire, ses ressources physiques, sa sauvegarde et ses limites. Compléter en parallèle les six SFX d'action encore sans fichier local et contrôler le mix à l'oreille ; la musique reste un chantier distinct.

## Jalons G0–G5

| Jalon | Situation actuelle | Frontière avant clôture |
| --- | --- | --- |
| G0 — socle et continuité | En consolidation | Suite de continuité et anciens pilotes diagnostiqués, migrations strictes préservées. |
| G1 — survie quotidienne | Partiel | Couverture du contenu, des règles et des campagnes au-delà des scènes démontrées. |
| G2 — habitat et environnement | Partiel | Catalogue, biomes, dangers et confort encore incomplets. |
| G3 — personnages et conflits | Partiel | Santé, psychologie, relations et combat Core non exhaustifs. |
| G4 — histoires et progression | Engagé | Industrie, économie et incidents à prolonger. |
| G5 — monde et consolidation | Absent | Monde, caravanes, quêtes et fin de partie. |

Une fonctionnalité ou une preuve ciblée ne clôt pas un jalon global. Les critères détaillés et estimations historiques restent dans la [feuille de route archivée](ROADMAP-pre-v145.md).

## Estimation d'avancement

Les [estimations par domaine antérieures à V145](ROADMAP-pre-v145.md#estimation-davancement) sont datées et ne constituent pas des pourcentages actuels. L’[état fonctionnel](gameplay/implementation-status.md) et les preuves récentes permettent de refaire cette estimation avant d’en publier une nouvelle. Cette ancre est conservée pour les liens historiques.
