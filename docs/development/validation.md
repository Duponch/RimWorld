# Validation courante — V44

16 septembre 2026. [Interruptions involontaires et cargaisons](interrupted-cargo.md), [recherche renouvelée](../research/interrupted-cargo-reference.md). Les compétences, l’anatomie isolée et le dernier audit mixte cent colons restent dans [la preuve V43](../history/validation-human-foundations-v43.md). La santé médicale n’est pas encore active.

## Régression et contrats

Le transporteur épuisé sur sol saturé restait en mouvement : le [scénario avant correctif](../../artifacts/interrupted-cargo-before-v44.json) échoue sur le passage au sommeil. Huit scénarios profonds couvrent désormais file/engagements, identité des matériaux/meubles, âge/expiration alimentaire, recette inachevée, réveil, dépôt par un second colon, continuation et états illégaux. Le parcours de dépôt optimisé est comparé à l’ancien ordre de candidats sur 32 dispositions avec obstacles et cases incompatibles ; deux décisions successives observent les mutations.

Le lot de **43 tests** réussit, dont le pilote naturel 250² à cinq/huit jours, graines 42/93/2048. [Résultat](../../artifacts/interruption-contracts-v44.json). Les essais intermédiaires ont corrigé trois attentes de fixture : portage ordinaire limité à dix unités, cellule d’ingrédient réservée encore occupée, compteur d’épuisement absent avant sauvegarde. La migration ancienne vers la version courante utilise désormais `SCHEMA_VERSION` dans ses attentes ; les anciens numéros de fixture restent inchangés et V43 avec un marqueur V44 est refusée.

Le contrôle élargi réussit **149 tests hors pilote long**, soit 150 tests distincts avec le pilote déjà passé (les 43 tests ciblés se recouvrent avec ce total). [Suite élargie](../../artifacts/interruption-suite-v44.json).

## Charge et optimisation

Ryzen 5 3600, Node 24.11.1, Windows 11 ; carte plane 250², personnes civiles au même point, 3/30/100 épuisements simultanés, avec sol libre ou 10 000 piles autour du groupe. Cas synthétique de saturation, pas une partie moyenne ni une mesure de FPS. Première interruption mesurée séparément, 40 ticks de chauffe, 120 ticks individuels mesurés, copie réelle d’un snapshot tous les cinq ticks ; validation et sauvegarde/rejeu hors mesure. Besoins actifs. Un passage par combinaison, sans autre banc lourd piloté en parallèle.

| Population, sol saturé | Tick p95 avant → après | Tick p99 / maximum après | Interruption initiale avant → après |
| --- | --- | --- | --- |
| 3 | 45,75 → 1,34 ms | 1,46 / 8,16 ms | 50,15 → 6,39 ms |
| 30 | 207,66 → 2,30 ms | 2,52 / 6,46 ms | 463,71 → 32,00 ms |
| 100 | 695,21 → 5,06 ms | 11,10 / 11,69 ms | 705,22 → 90,30 ms |

[Avant](../../artifacts/interruption-cpu-before-v44.json), [après](../../artifacts/interruption-cpu-v44.json). Le gain combine suppression des recherches répétées parmi les piles et déphasage des tentatives, donc change la répartition temporelle des retries ; il ne faut pas l’attribuer intégralement à un seul algorithme. Cent personnes dorment et conservent 1 000 acier dans les deux cas, sans erreur de validation ; continuation sauvegardée exacte dans chaque version. Le déphasage adapté ne change pas la quantité ni l’ordre local du dépôt.

Sur sol libre, tick p95 après : 0,032/0,043/0,140 ms pour 3/30/100 personnes. **Limites persistantes :** première interruption simultanée de cent acteurs 90,30 ms en saturation (34,14 ms sol libre) ; copie des snapshots à cent acteurs saturés 23,62 ms p95, 24,13 ms maximum. Le nouveau marqueur n’enlève pas le coût de publier 10 000 piles. Ces pointes et les recherches du banc mixte V43 restent à traiter selon le profil observé, sans promesse de fluidité universelle ou de vitesse 6× constante.

## Vérification de présentation

Les deux parcours natifs finaux réussissent en 6,8 min. Le scénario de saturation (6,4 s) vérifie sommeil, alerte, rechargement exact et dégagement par transport du second colon, avec vitesses 1×/6×. Capture `interrupted-cargo-sleep.png` inspectée : texte, portage, indicateur de sommeil et FPS visibles. [Preuve](../../artifacts/interrupted-cargo-ui-v44.json).

La partie naturelle de trois jours (6,6 min) finit avec 3 lits, table/3 tabourets, 7 murs, porte, feu, piquet, atelier, générateur et lampe, 15 plants et 28 toits ; 35 blocs, 50 acier et 4 composants rangés. Bilans bois/aliments, sommeil, repas, compétences et sauvegardes quotidiennes passent. Cette fois **la branche du lendemain est effectivement exercée** : deux récoltes d’entretien présentes à minuit se terminent après le réveil, au tick 20 092, sans nouvelle commande de travail. Le pilote ne rencontre aucune cargaison bloquée ; cette situation est couverte par le scénario dédié. Capture `colony-three-days.png` inspectée. [Rapport](../../artifacts/interruption-colony-v44.json).

La garde `npm run test:presentation` réussit : 7 533 images minage, 7 489 abattage, zéro saut ni occupation de roche solide, zéro retrait anticipé, aucune rupture d’alimentation en snapshots en régime établi et aucune erreur navigateur. Deux fois 45 secondes sur carte naturelle 250², trois colons, AMD RDNA-1, 1 440×1 000 ; vitesses 1×/6×/3× répétées. Frame p95 6,1 ms dans les deux scènes ; maxima 18,0 / 12,1 ms. L’amorçage garde ses trous initiaux dans le rapport. [Preuve native](../../artifacts/interruption-presentation-v44.json). La mesure ne couvre pas le scénario saturé à cent porteurs, mesuré séparément au cœur.

Build TypeScript/Vite réussi : 211 modules, worker 246,10 kB, jeu 1 085,43 kB / 305,34 kB gzip. Avertissement historique de bundle >500 kB conservé.

Contrôle documentaire final : 162 documents, originaux inchangés. Aucun nouvel objet ni santé médicale active ; limites de dépôt, soins et incapacités sont explicites dans le contrat.
