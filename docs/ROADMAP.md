# Plan de développement

**15 octobre 2026 — schéma 238.** Autonomie et push `origin/main` explicitement autorisés. [V374](gameplay/productive-proof-v374.md) clôt la campagne QA comme partielle au tick 98038 ; la progression recherche/énergie n’est pas intégralement certifiée. Dernier produit publié : V365. Aucun pourcentage de complétude ou objectif FPS certifié.

## Priorité actuelle

1. **Trois biomes existants.** Contrôles courts sur deux graines fixes par biome : génération, cohérence du climat/flore/faune, arrivée et sauvegarde/reprise ; parcours UI regroupé. Comparer les règles et les écrans au RimWorld Vanilla avec sources datées. Garder les limites : ce n’est pas une année de survie ni un hiver entier.
2. **Toundra cohérente.** Relier froid, neige, végétation/faune, choix du site, décor et conservation. Réutiliser les références déjà auditées ; livrer une boucle utilisable plutôt qu’une seule recoloration ou des domaines dormants.
3. **Deuxième site persistant.** Voyager avec les mêmes personnes/biens, entrer sur une seconde carte, la modifier, revenir et retrouver les changements. Préserver une seule autorité de campagne et les sauvegardes historiques.
4. **Catalogue utile.** Compléter une chaîne existante avec un objet réellement fabriqué, stocké, équipé/utilisé et sauvegardé ; premier candidat étudié : armure de reconnaissance correspondant au casque existant.

La stabilité, l’ergonomie et les performances accompagnent ces lots avec contrôles proportionnés. Les campagnes longues sont périodiques ou motivées par un risque précis. La campagne conservée au 98038 reste une preuve partielle, pas une condition bloquant toutes les livraisons. Le [suivi early access](gameplay/early-access-readiness.md) distingue acquis et limites. La [stratégie de validation](development/testing.md) décrit la méthode ; les sous-métiers restent reportés.

Les anciennes chronologies et décisions sont conservées dans [l’archive jusqu’à V373](history/roadmap-through-v373.md), sans être des instructions de relance.

## Jalons G0–G5

| Jalon | Situation actuelle | Frontière avant clôture |
| --- | --- | --- |
| G0 — socle et continuité | En consolidation | Suite de continuité et anciens pilotes diagnostiqués, migrations strictes préservées. |
| G1 — survie quotidienne | Partiel | Extraction avec compétence Minage reliée ; [scanner et forage V280](gameplay/deep-drilling-v280.md) raccordés, validation ciblée et native acquise. Production des rations de survie livrée dans le [périmètre V206](history/validation-packaged-survival-v206.md) ; couverture du contenu, des règles et des campagnes au-delà des scènes démontrées encore ouverte. |
| G2 — habitat et environnement | Partiel | Lit d’hôpital spécialisé et couvert bas en tissu ajoutés ; catalogue, biomes, dangers et confort encore incomplets. |
| G3 — personnages et conflits | Partiel | Passé prospectif et incapacités V210 livrés, trois crises distinctes V211 livrées dans le périmètre contrôlé ; douze compétences reliées, avec capacités et apprentissage miniers ; lit d’hôpital, soins et chirurgie, couvert bas et combat physique restent liés. Proches, couples et logement V214 livré dans le périmètre contrôlé ; catalogue biographique, parenté étendue, psychologie et combat Core non exhaustifs. |
| G4 — histoires et progression | Engagé | Recherches hospitalière et alimentaire reliées à leurs postes et débouchés ; [Forage profond puis Scanner de sol V280](gameplay/deep-drilling-v280.md), chacun 1 000 points après Microélectronique, au bureau avancé alimenté. Validation V280 ciblée et native acquise ; défense automatique et menace mécanique V212–V213 reliées ; industrie, économie et incidents à prolonger. |
| G5 — monde et consolidation | Première boucle collective bornée | Reconnaissance et comptoir individuels conservés. V216 relie géographie persistée, groupe unique, provisions/charge, marche, survie, commerce et retour/dépôts ; ciblés, sonde publique, régression par reprises, typage, build, présentation et natif composé passent dans le périmètre de la preuve. Campagnes longues et performance générale restent distinctes. Autres groupes/destinations/quêtes, crises spatiales hors carte, camps/multicartes, diplomatie et fin de partie restent ouverts. |

Une fonctionnalité ou une preuve ciblée ne clôt pas un jalon global. Les critères détaillés et estimations historiques restent dans la [feuille de route archivée](ROADMAP-pre-v145.md).

## Estimation d'avancement

Les [estimations par domaine antérieures à V145](ROADMAP-pre-v145.md#estimation-davancement) sont datées et ne constituent pas des pourcentages actuels. L’[état fonctionnel](gameplay/implementation-status.md) et les preuves récentes permettent de refaire cette estimation avant d’en publier une nouvelle. Cette ancre est conservée pour les liens historiques.
