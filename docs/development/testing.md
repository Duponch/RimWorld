# Stratégie de validation

## Contrôles ciblés V206 — périmètre ciblé exécuté

La [production unitaire des repas de survie](packaged-survival-v206.md) demande les témoins de recherche physique, Cuisine 7/8, quotas 6+6, viande/lait et plusieurs piles, cuisinières/énergie, fraîcheur, interruptions, sortie saturée, contamination et refus du voyage. Les fichiers ciblés sont `tests/packaged-survival-research-v206.test.ts`, `tests/packaged-survival-production-v206.test.ts`, `tests/packaged-survival-persistence-v206.test.ts` et `tests/packaged-survival-world-v206.test.ts` ; ils doivent distinguer ancien schéma 187 strict, migration neutre vers 188 et refus des futurs projets/factures/tâches, y compris poste emballé et ordres en file.

Le parcours `tests/integration/packaged-survival-v206.spec.ts` utilise les menus, Travail, Recherche, réserve, facture et reconnaissance depuis la scène candidate avant sa publication, sans ration initiale. Il observe cuisson, dépôts, chargement et propriétaire hors carte, avec reprises exactes et présentation WebGPU native. Les besoins préparés à 100 ne prouvent aucune consommation pendant ce court circuit ; le témoin CPU de voyage prépare explicitement son besoin avant le départ pour exercer une ingestion réelle. CPU, navigateur, rendu et publication doivent rester successifs sur sources gelées. Le [suivi des contrôles V206](../history/validation-packaged-survival-v206.md) consigne les résultats et limites ; une fixture préparée ou un test écrit n’est pas un contrôle réussi ni une preuve de campagne naturelle.

## Commandes courantes et preuves

`npm run test:quick` couvre les frontières V139/V143/V144 et les correctifs V145
de déblaiement, de sauvegarde du feu et de repas des visiteurs, ainsi que la
protection des sorties de tests.
`npm run test:regression` exécute les tests Vitest hors des pilotes longs listés dans
`scripts/test-campaign-manifest.mjs` ; c'est une régression quotidienne bornée,
pas la suite complète. `npm run test:campaign:diagnostic` rejoue séparément les
cinq pilotes historiques Survivants, Atterrissage, Énergie, Simulation et Raid ;
`npm run test:campaign` parcourt tous les pilotes longs du manifeste. Le lanceur
termine en échec si une campagne échoue et garde un journal par fichier sous
`tmp/test-runs/<run>/`. `npm test` et `npm run check` conservent **toute** la suite
Vitest, y compris les campagnes ; `npm run check:docs` vérifie l'index, les liens,
les originaux et les en-têtes d'état courant. Les parcours Playwright restent
dans `npm run test:integration` et `npm run check`.

Les producteurs de tests et de parcours natifs dirigent leurs rapports et
captures courants de `artifacts/` vers `tmp/test-runs/<run>/artifacts/` avec le
helper explicite `tests/test-output.ts`, y compris sous `npx vitest` direct.
`LISIERE_TEST_RUN` nomme un run commun ; sans lui, chaque processus emploie un
nom horodaté avec son PID. Les lectures
de `artifacts/` sont des fixtures ou preuves historiques suivies et restent
inchangées. Une preuve historique n'est publiée qu'après revue, hors du chemin
normal des tests. Un test rouge ou une campagne interrompue reste rouge ; les
contrôles ciblés n'impliquent pas que la suite historique soit verte.


## Procédure courante de livraison



Adoptée après V76 pour réduire les reprises et les relances, sans réduire les contrats de qualité. L'unité de livraison est une **boucle jouable**, composée de plusieurs sous-étapes internes. Les contrôles suivent les risques et les dépendances ; un lot plus gros ne signifie pas un unique test à la toute fin.

1. **Cadrer une seule fois le lot.** Décision du joueur, critères de réussite, périmètre différé, fichiers/contrats concernés. Lire l'index et les documents de domaine ; réserver les historiques aux preuves utiles. Confronter les mécaniques aux sources fraîches par domaine, puis conserver règles, désaccords et liens dans leur document canonique. Rechercher de nouveau si une nouvelle question apparaît, pas à chaque retouche de la même règle.
2. **Développer la boucle et ses contrôles courts ensemble.** Faire tourner les scénarios ciblés aux changements de contrat et checkpoints internes ; ne pas attendre un gros lot entier pour détecter une migration ou une conservation cassée. Avant un parcours long, exercer chaque nouvelle commande de sa politique via le **même pilote UI**, depuis un état court pertinent. Le fonctionnement isolé du widget ne prouve pas la capacité du pilote à le manipuler.
3. **Regrouper la validation finale.** Choisir la matrice selon les contrats réellement touchés : scénarios métier profonds, sauvegarde/continuation, worker/présentation, parcours de colonie et audit lorsque requis. Jouer ensemble les scénarios concernés ; garder une passe élargie aux intégrations transversales. Un résultat reste réutilisable après une retouche sans rapport, en précisant sa portée. Un changement de contrat relance les contrôles qui en dépendent.
4. **Paralléliser uniquement ce qui est indépendant.** Recherches bornées et lectures peuvent être groupées ; revue et documentation peuvent avancer pendant un test si elles ne modifient pas ses entrées. Le serveur Vite actuel recharge les sources : geler tout code servi pendant l'UI native. Les mesures CPU/GPU et les longs pilotes restent successifs, avec environnement stable. Tester un futur build figé nécessitera un mode de diagnostic adapté : ce mécanisme n'est pas encore livré.
5. **Diagnostiquer avant de rejouer.** Checkpoint réel, état attendu/obtenu, graine et commande en échec. Reprendre la section concernée, puis élargir seulement si la correction affecte l'amont. Préserver toutes les assertions métier ; ne pas annoncer une reprise comme une nouvelle passe complète. Ne jamais faire varier les sources au milieu d'une mesure native.
6. **Publier une fois la boucle cohérente.** Mettre à jour contrats, guide, inventaire, catalogue si nécessaire et preuves ; les index/ROADMAP résument et renvoient aux contrats au lieu de recopier leurs détails. Commit local explicatif, sans push automatique, puis bilan utilisateur. Noter les durées approximatives recherche, implémentation et validation, ainsi que les reprises évitables ; réévaluer la méthode après deux lots. Aucune réduction chiffrée de temps ou de tokens promise sans mesure.

## Principes

Maintenir peu de scénarios riches : effets de jeu, invariants, cas limites et diagnostics reproductibles. Un test qui relit simplement la valeur qu’il vient d’écrire apporte peu. Chaque bug important enrichit la famille correspondante ; ni une accumulation de petits tests ni une partie longue sans assertions ne garantissent l’absence d’anomalies.

La cohérence de notre simulation et la fidélité à RimWorld sont deux validations distinctes. Une règle de référence précise source, version, unité et contexte. La continuation de notre monde doit être exacte pour une même version de règles ; notre PRNG n’a pas à produire la séquence de RimWorld. Un oracle doit avoir une implémentation indépendante du chemin qu’il contrôle.

Pour une correction de continuité comme la [poursuite V197](melee-pursuit-v197.md), l'oracle observe les transitions et les intervalles entre segments, puis rapproche chaque immobilité d'une cause admissible : récupération après tentative, étourdissement, arête encore engagée, obstacle ou absence de route sous budget. Exercer aussi le délai de recherche et l'expiration de décision en cours de poursuite, en conservant une cible mobile et un accès physique réel. Une blessure finale, une distance parcourue ou une moyenne de FPS peut réussir malgré des pauses périodiques ; ces seuls résultats ne remplacent pas les assertions temporelles de simulation et les segments observés aux vraies frames. Garder le checkpoint et la séquence en échec, sans supprimer les contrôles de blocage et de récupération pour obtenir une continuité apparente.

Regrouper les changements cohérents avant de lancer leur lot de contrôles. Après un échec, corriger sa cause et rejouer les scénarios concernés. Ne pas desserrer un seuil uniquement pour obtenir un résultat vert. Un fichier de rapport ancien reste daté ; il n’est pas une preuve d’exécution sur le code présent.

## Choisir les contrôles

| Changement | Contrôles nécessaires selon son contrat |
|---|---|
| Texte, couleur, détail procédural sans logique | Inspection visuelle ciblée ; pas de partie de trois jours. |
| Documentation | Liens, fragments, intégrité des sources et relecture du sens ; pas de suites gameplay. |
| Recette, besoin, réservations, transport ou planner | Scénarios du domaine avec bilans/interruptions/continuation ; pilote cœur si ses boucles changent. |
| Commande, persistance ou protocole worker | Refus atomiques, migrations et reconstruction ; parcours de la vraie UI/du worker. |
| Plusieurs boucles livrées ensemble ou régression de partie longue | Pilote cœur multi-graines, puis parcours UI de trois jours. |
| Navigation | Oracle, cibles inaccessibles, coins, trafic, obstacle ajouté et reprise ; audit à forte population si le coût change. |
| Rendu, caméra, interpolation | Contrôles purs des contrats et parcours graphique natif ; inspecter les captures, pas seulement la console. |
| Algorithme ou cycle de vie GPU | Oracle indépendant, exécution GPU réelle, révisions/bornes et audit avec rendu concurrent. Un backend absent ne vaut pas réussite. |

Compiler à l’intégration du lot. Les suites longues, compilations et benchmarks lourds ne tournent pas en concurrence. Vitest borne le parallélisme à deux workers ; les parcours navigateur utilisent un worker. Une optimisation interne conservant exactement les états n’exige pas de rejouer une longue UI déjà verte si ses contrôles n’ont pas changé.

## Familles en place

La [matrice](../gameplay/systems-matrix.md) conserve cinq familles : F1 conservation/identité, F2 continuation/rejeu, F3 espace/topologie, F4 commandes/UI réelle, F5 performance. Une entrée de catalogue ou une famille présente ne vaut pas couverture exhaustive. Choisir les contrôles selon le contrat touché plutôt qu’un nombre arbitraire de tests.

## Pilote de colonie

Les scénarios de `tests/scenarios` ne modifient pas directement le monde pour réussir : ils envoient des commandes, observent accès, matières, repas, sommeil et construction, puis gardent des checkpoints. La préparation explicite d’une fixture reste distincte d’une partie naturelle. Un obstacle réel se dégage par une commande physique ; une date d’incident rare ne se force pas pour satisfaire un horizon.

Conserver les bilans de matière, combustible et alimentation (dix ingrédients deviennent un repas) et distinguer pertes réellement prévues, consommations et destruction. Ne pas rebaptiser toute différence inexpliquée « perte » : une transformation doit être identifiée et contrôlée. Au chargement, attendre l’acquittement du nouveau monde plutôt que lire l’ancien snapshot. Une reprise depuis checkpoint valide sa continuation, pas toute la préparation antérieure.

## Diagnostics et mesures

Suivre le [protocole reproductible](performance-measurement.md), les [critères de présentation](playability-validation.md) et la [référence V145](../history/validation-performance-reference-v145.md). Maintenir les sources servies gelées et exécuter campagnes CPU, compilation et bancs natifs successivement. Relever programmes concurrents et conditions sans arrêter les applications de l’utilisateur. Une absence de backend GPU ne compte pas comme réussite.

Séparer coûts de simulation, publication/adoption, CPU image, RAF et GPU. Les rapports courants restent sous `tmp/` ; seules des preuves relues sont publiées dans `artifacts/` avec leur contexte. Les mesures historiques, outils spécialisés et cas de livraison antérieurs se trouvent dans [l’archive de stratégie](testing-pre-v145.md) ; ne pas les annoncer comme résultats actuels.


## Exploiter les scénarios du référentiel

Le [corpus utilisateur](../research/reference-adoption.md) fournit 196 propositions TEST, pas des tests directement exécutables. TEST-001..181 reformulent les contrats SYS ; ils enrichissent nos familles sans créer une suite par ligne. Les quinze autres entrées peuvent être plus précises, synthétiques ou propres à une version/extension. Le statut d’une cellule du classeur ne vaut pas validation locale.

Le chapitre 32 (PDF pages 39–40) propose les interactions suivantes. Leur calendrier appartient uniquement à ROADMAP.

| Scène | Adoption et familles |
|---|---|
| A — Cuisine interrompue | G0 : pile partagée, destination filtrée, annulation/reprise ; G1 : ingrédients/recette ; G2 : panne électrique. F1 conservation et F2 continuation à chaque transition. |
| B — Combat et cible mobile | G3 : mobilisation, porte, couvert, allié/cible déplacés ; séparer émission et impact. F3 topologie, F2 séquence. |
| C — Maladie et transfert du patient | G3 : soins, médecine, interruption/durée ; G5 : départ en caravane. F1 transferts, F2 durée/reprise. |
| D — Caravane aller-retour | G5 : propriétaires avant/après chaque transfert, individus/piles/consommation. F1 identité, F2 voyage/sauvegarde. |
| E — Pièces, énergie et incendie | G2 : portes/toits/réseaux et feu injecté sans exiger déjà le narrateur ; dégâts aux personnes en G3. F3 topologie, F2 échanges. |

F4 exerce les commandes dans le navigateur quand elles existent ; F5 mesure leur charge représentative. La profondeur combine cas imposés, interactions avec invariants et distributions seulement pour les systèmes probabilistes concernés. Fixer tailles d’échantillon et seuils avant observation ; TEST-182..194 nécessitent l’adoption de leur modèle, TEST-195/196 leur contexte DLC/correctif.

## Documentation

`npm run check:docs` contrôle liens, fragments, 25 domaines/cinq familles, les trois originaux et l’accord des six en-têtes courants avec le schéma du code. Il ne prouve pas la vérité d’une affirmation de gameplay. Tenir [la validation courante](validation.md) à jour avec les résultats réellement exécutés, les échecs ouverts, les skips et les reprises ; garder leurs diagnostics dans la preuve datée.
