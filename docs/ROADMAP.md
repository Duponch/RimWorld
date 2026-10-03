# Plan de développement

**V195 livré dans son périmètre ciblé : culture médicinale domestique, schéma 182 après validation stricte de 181 et migration neutre.** Le [contrat](development/healroot-domestic-v195.md), la [recherche Core](research/healroot-domestic-core-v195.md) et la [preuve](history/validation-healroot-domestic-v195.md) distinguent chaîne physique, adaptations, scène préparée et contrôles. Le joueur organise une production médicale par semis, croissance et récolte ; la maturité préparée ne démontre pas une campagne d'autonomie naturelle.

L'[inventaire](gameplay/implementation-status.md) décrit le jeu ; la [validation courante](development/validation.md) borne les preuves. Les jalons G0–G5 restent ouverts. **Mode jour : arrêter le travail autonome après le commit V195 et attendre la prochaine relance.** Le prochain chantier explicitement demandé concerne [sang, herbe, carcasses animales, douleur sonore et franchissement visuel](development/visual-blood-next.md). Il reste entièrement à réaliser ; aucune autre mécanique ne le remplace automatiquement.

## Priorité actuelle

1. **Entretenir la continuité.** La [consolidation V176](development/colony-clearing-v176.md) passe sur trois graines CPU 250² et sur un départ UI naturel complet de trois jours, avec bilans et reprise exacts. La [preuve V176](history/validation-colony-clearing-v176.md) borne ces parcours ; les autres campagnes et la suite complète restent ouvertes, donc G0 aussi. Conserver accès physiques, commandes et migrations strictes dans les prochains lots.
2. **Réduire la charge CPU mesurée.** Le [profil V146](history/validation-performance-v146.md) situe la faune et la planification parmi les coûts dominants. Le [cache V177](development/snapshot-cache-v177.md) réduit le reset terrain dans son microbanc ; ni son encodage continu ni sa comparaison native ne démontrent un gain général. Poursuivre par sous-coût isolé et oracle exact des décisions/snapshots, en séparant CPU et GPU. La [référence V145](history/validation-performance-reference-v145.md) et les relevés V177 n'atteignent pas ×6 ; ni 240 FPS ni gain du tick complet ne sont garantis.
3. **Équilibrer les grandes boucles avant leurs détails.** À la demande utilisateur du 2 octobre, choisir les prochains lots selon les possibilités qu’ils ouvrent dans les domaines les moins couverts. L’[inventaire](gameplay/implementation-status.md) distingue les boucles déjà présentes et leurs frontières ; G5 reste partiel avec un voyage abstrait individuel et une quête locale. V195 ouvre la culture médicinale G1 après le danger électrique V194. La demande visuelle utilisateur du 3 octobre constitue maintenant le prochain lot, à la relance seulement. Les groupes de caravanes et les approfondissements du départ animal, de l'asile ou du voyage ne deviennent pas des suites automatiques.

La [comparaison des dangers électriques](research/rain-electric-core-v194.md) a retenu **l'exposition aux précipitations V194**, désormais livrée dans son périmètre : elle réutilise les protections et conséquences physiques existantes. Le court-circuit aléatoire Zzztt du réseau reste différé, car sa vidange et sa grande explosion demandent un socle distinct. La rage d'un animal local reste une piste préparatoire G3/G4, sans contrat ni activation livrés ; elle n'est pas le prochain chantier demandé. La [première menace mécanoïde](research/mechanoid-core-next.md) reste également différée : corps, besoins, mort et récupération doivent précéder sa distribution dans les raids. Les variantes chirurgicales et commerciales, planète/groupes, hydroponie, autres prédateurs et fin de partie restent ouverts sans priorité automatique.

Éviter une succession de raffinements dans un seul domaine tant qu’une autre boucle importante reste absente. Chaque choix doit nommer la décision nouvelle du joueur, ses dépendances et ses limites ; un bouton ou une définition isolés ne valent pas une boucle jouable. Les consolidations et correctifs mesurés restent prioritaires lorsqu’ils bloquent la continuité. Les pourcentages illustratifs de l’utilisateur ne sont pas des estimations d’avancement.

## Jalons G0–G5

| Jalon | Situation actuelle | Frontière avant clôture |
| --- | --- | --- |
| G0 — socle et continuité | En consolidation | Suite de continuité et anciens pilotes diagnostiqués, migrations strictes préservées. |
| G1 — survie quotidienne | Partiel | Couverture du contenu, des règles et des campagnes au-delà des scènes démontrées. |
| G2 — habitat et environnement | Partiel | Catalogue, biomes, dangers et confort encore incomplets. |
| G3 — personnages et conflits | Partiel | Santé, psychologie, relations et combat Core non exhaustifs. |
| G4 — histoires et progression | Engagé | Industrie, économie et incidents à prolonger. |
| G5 — monde et consolidation | Première boucle bornée | Reconnaissance et comptoir civil individuels avec retour physique ; planète, groupes, autres destinations/quêtes et fin de partie restent ouverts. |

Une fonctionnalité ou une preuve ciblée ne clôt pas un jalon global. Les critères détaillés et estimations historiques restent dans la [feuille de route archivée](ROADMAP-pre-v145.md).

## Estimation d'avancement

Les [estimations par domaine antérieures à V145](ROADMAP-pre-v145.md#estimation-davancement) sont datées et ne constituent pas des pourcentages actuels. L’[état fonctionnel](gameplay/implementation-status.md) et les preuves récentes permettent de refaire cette estimation avant d’en publier une nouvelle. Cette ancre est conservée pour les liens historiques.
