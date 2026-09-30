# Plan de développement

**Schéma courant 166 ; consolidation du pilote V176 livrée dans son périmètre, sans nouvelle mécanique.** Le [contrat de déblaiement](development/colony-clearing-v176.md), sa [recherche Core](research/colony-clearing-core-v176.md) et sa [preuve](history/validation-colony-clearing-v176.md) bornent le dégagement utile au camp et le suivi des produits du minage. L'[inventaire fonctionnel](gameplay/implementation-status.md) décrit le jeu présent ; la [validation courante](development/validation.md) distingue contrôles acquis et travaux ouverts. Aucun de ces lots ne ferme un jalon G0–G5.

## Priorité actuelle

1. **Entretenir la continuité.** La [consolidation V176](development/colony-clearing-v176.md) passe sur trois graines CPU 250² et sur un départ UI naturel complet de trois jours, avec bilans et reprise exacts. La [preuve V176](history/validation-colony-clearing-v176.md) borne ces parcours ; les autres campagnes et la suite complète restent ouvertes, donc G0 aussi. Conserver accès physiques, commandes et migrations strictes dans les prochains lots.
2. **Réduire la charge CPU mesurée.** Le [profil V146](history/validation-performance-v146.md) situe la faune et la planification parmi les coûts dominants ; l'[audit V169](history/validation-performance-v169.md) et les optimisations ciblées ne démontrent pas de gain du tick complet. Poursuivre par sous-coût isolé, oracle exact des décisions et snapshots, puis comparaison native répétée en séparant CPU et GPU. La [référence V145](history/validation-performance-reference-v145.md) n'atteint pas ×6 ; ni 240 FPS ni gain général ne sont garantis.
3. **Ouvrir des filières jouables complètes.** Après la continuité, la [recherche médicale préparatoire](research/healroot-core-next.md) propose la cueillette sauvage de healroot dans les biomes compatibles : plante réelle, récolte, dose physique, stockage puis soins existants. La culture domestique reste différée faute de compétence Plantes locale ; cette recherche ne livre aucune nouvelle plante. Industrie, équipement, psychologie et santé demandent ensuite des tranches distinctes ; monde, caravanes et quêtes restent plus vastes. Chaque lot exige acquisition ordinaire, conservation, continuation et charge mesurée.

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
