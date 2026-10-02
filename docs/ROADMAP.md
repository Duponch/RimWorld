# Plan de développement

**Schéma courant 169 ; V180 ouvre les canicules naturelles de Cassandra partielle.** Le [contrat](development/cassandra-misc-v180.md) et la [recherche Core](research/cassandra-misc-core-v180.md) distinguent cet incident du calendrier historique et des événements encore absents. L’[inventaire](gameplay/implementation-status.md) décrit le jeu ; la [validation courante](development/validation.md) borne les preuves. Aucun lot ciblé ne ferme à lui seul un jalon G0–G5.

## Priorité actuelle

1. **Entretenir la continuité.** La [consolidation V176](development/colony-clearing-v176.md) passe sur trois graines CPU 250² et sur un départ UI naturel complet de trois jours, avec bilans et reprise exacts. La [preuve V176](history/validation-colony-clearing-v176.md) borne ces parcours ; les autres campagnes et la suite complète restent ouvertes, donc G0 aussi. Conserver accès physiques, commandes et migrations strictes dans les prochains lots.
2. **Réduire la charge CPU mesurée.** Le [profil V146](history/validation-performance-v146.md) situe la faune et la planification parmi les coûts dominants. Le [cache V177](development/snapshot-cache-v177.md) réduit le reset terrain dans son microbanc ; ni son encodage continu ni sa comparaison native ne démontrent un gain général. Poursuivre par sous-coût isolé et oracle exact des décisions/snapshots, en séparant CPU et GPU. La [référence V145](history/validation-performance-reference-v145.md) et les relevés V177 n'atteignent pas ×6 ; ni 240 FPS ni gain du tick complet ne sont garantis.
3. **Équilibrer les grandes boucles avant leurs détails.** À la demande utilisateur du 2 octobre, choisir les prochains lots selon les possibilités de jeu qu’ils ouvrent dans les domaines les moins couverts. Après la cuisine et Plantes, [V180](development/cassandra-misc-v180.md) fait intervenir les incidents, refuges, vêtements et soins. Le prochain cadrage vise les conséquences sociales d’un décès, limitées aux relations réellement présentes ; ensuite, préparer le contrat d’une première caravane aller-retour avec propriété hors carte, consommation et retour sans duplication. Ces propositions exigent leur propre recherche Core et ne sont pas livrées. Le semis médicinal reste ouvert mais n’est plus le chantier suivant par défaut.

Éviter une succession de raffinements dans un seul domaine tant qu’une autre boucle importante reste absente. Chaque choix doit nommer la décision nouvelle du joueur, ses dépendances et ses limites ; un bouton ou une définition isolés ne valent pas une boucle jouable. Les consolidations et correctifs mesurés restent prioritaires lorsqu’ils bloquent la continuité. Les pourcentages illustratifs de l’utilisateur ne sont pas des estimations d’avancement.

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
