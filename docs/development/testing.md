# Stratégie de validation

## Principes

Maintenir peu de scénarios riches : effets de jeu, invariants, cas limites et diagnostics reproductibles. Un test qui relit simplement la valeur qu’il vient d’écrire apporte peu. Chaque bug important enrichit la famille correspondante ; ni une accumulation de petits tests ni une partie longue sans assertions ne garantissent l’absence d’anomalies.

La cohérence de notre simulation et la fidélité à RimWorld sont deux validations distinctes. Une règle de référence précise source, version, unité et contexte. La continuation de notre monde doit être exacte pour une même version de règles ; notre PRNG n’a pas à produire la séquence de RimWorld. Un oracle doit avoir une implémentation indépendante du chemin qu’il contrôle.

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

Une commande sans progrès doit être diagnostiquée puis arrêtée. Les scripts d’audit disposent de bornes ; le pilote long suit ses ticks et checkpoints, avec surveillance des attentes. Une partie de trois jours qui avance normalement prend plusieurs minutes : distinguer durée attendue et blocage. Si un arrêt est nécessaire, conserver motif et dernier état avant correction/reprise.

## Familles en place

La matrice conserve [cinq familles F1–F5](../gameplay/systems-matrix.md#stratégie-de-validation--peu-de-familles-scénarios-riches) : conservation/identité, temps/continuation, espace/topologie, intégration réelle, charge. Un scénario peut traverser plusieurs familles ; les nombres de lots qui se recouvrent ne s’additionnent pas en une couverture indépendante.

| Scénarios du dépôt | Risques contrôlés |
|---|---|
| `food-policy.test.ts` | Régimes partagés, copies, refus atomiques, faim, choix avant score/accès, repas engagé, transport/cuisine indépendants et migration V12 ; cuisinier affamé gardant son produit pendant l’attente de budget de navigation, sauvegarde/reprise ; pilote cœur/UI gérant les rations par commandes. |
| `schedules.test.ts` | Commandes atomiques, frontières horaires, lit réellement rejoint, famine/réveil, fin de travail, fatigue/effondrement et reprise ; le pilote décale la nuit de la cuisinière par commande. |
| `food-preservation.test.ts` | Âges pondérés, transferts, ingestion/recette au seuil, sol saturé, 40 jours, migration et pertes groupées ; pilote et UI incluent ces données. |
| `simulation.test.ts` | Priorités, transformations, annulations, besoins, propriété, corruption, reprise et soak multi-graines. Bilans et résultats métier, pas seulement hash. |
| `world-generation.test.ts` | Déterminisme 32 bits, dimensions jusqu’à 250² et rectangles extrêmes, rivières/massifs, accès du départ, distributions, débuts de camp et corridor long. |
| `spatial-contracts.test.ts`, `navigation-budget.test.ts` | Pile unique, capacité typée et matière conservée ; durées diagonales, coins, trafic et chemins. L’oracle de distances O(V²) des petites cartes ne réutilise ni file ni voisins du moteur ; 120 cartes comparent accès progressif, demandes pondérées successives et parcours complet, y compris les départages, emprises tournées et modifications des buffers appelants après capture. |
| `dining.test.ts`, `food-items.test.ts` | Portion réellement prélevée/portée/ingérée, place et lit réservés, interruptions, distances/préférences, confort/souvenirs et migration des aliments historiques. |
| `plant-cycle.test.ts`, `area-designation.test.ts` | Croissance, récolte, coupe, politique agricole, dégagement des piles, rectangles/empreintes, compatibilité, concurrence, interruption et refus atomiques. |
| `production.test.ts`, `player-cooking.test.ts` | V20 ajoute trois parcours profonds de cuisine forcée/file/réservations, reprise et dégagement manuel avant semis ; les mêmes scénarios couvrent expiration, factures et accès perdus. Trois scénarios combinent feu construit, deux jours de combustible/recharge, recette mélangée, conservation, travail interrompu/repris, deux postes concurrents, factures ordonnées et chef ravitaillant sans Transport. Les mêmes scénarios vérifient les diagnostics de phases et de blocages. |
| `bridge-snapshot.test.ts` | Reconstruction égale au monde autoritaire, snapshots antérieurs immuables, deltas invalides/périmés/manquants, ordre des clés, changement d’epoch et reprise sans état initial. Ce codec pur ne remplace pas le vrai worker. |
| `render-retention.test.ts`, `rock-surface.test.ts` | Identité/capacité/libération des buffers, retraits et restauration de chunks, faces rocheuses exposées. Un retrait injecté ne vaut pas minage jouable. |
| `daylight-camera.test.ts`, `frame-metrics.test.ts` | Cadrage/projections, temps du ciel, pauses/cadence, longues images et bornes des métriques. |
| `gpu-navigation.test.ts` | Contrats du laboratoire : résultats, capacités et révisions. Le laboratoire ne dirige pas les colons. |
| `integration/*.spec.ts` | Commandes et gestes réels, UI, worker, sauvegardes et présentation ; les fixtures synthétiques sont signalées. |

Le parcours de frontières conserve le rendu logiciel/WebGL 2, notamment pour les contrôles compacts et la migration historique dans le worker. Les parcours matériels lancent Chromium normal et vérifient le backend obtenu. Un canvas visible et un compteur FPS ne suffisent pas : capturer les erreurs console/GPU et inspecter effectivement la pose ou l’aperçu testé.

V14 enrichit la famille spatiale avec un couloir d'une case : deux traversées opposées, dormeur central immobile, lits exclusifs, deux cargaisons qui se croisent, refus des superpositions V13 et reprise V14 au milieu des arêtes. La cuisine vérifie aussi qu'un effondrement au sol ne vole pas le poste. `integration/movement.spec.ts` conserve son contrôle de vitesse/orientation GPU et ajoute migration V13, pause sur une cellule partagée, sauvegarde/rechargement et arrivée dans trois lits via le vrai worker. La fixture commune `scenarios/civil-traffic.ts` est synthétique ; elle ne remplace pas le pilote ordinaire.

Les assertions d’état navigateur comparent un JSON complet sans sérialiser chaque sous-objet séparément par le protocole du pilote. Le suivi courant utilise les ticks ; récupérer un monde complet seulement aux étapes utiles. Pour une phase brève, observer puis cliquer le vrai bouton Pause dans le même callback, attendre son acquittement et vérifier que la phase attendue existe encore.

Le pilote de gestes cadre les cellules par de vrais mouvements de molette et vérifie qu’elles atteignent le canvas, hors panneaux. Une géométrie cachée ne prouve pas la visibilité d’un aperçu ; capturer le rectangle pendant que le pointeur reste maintenu. L’injection de perte de focus dans son test reste explicitement qualifiée comme telle.

## Pilote de colonie

`tests/scenarios/colony-player.ts` est la politique commune du joueur : elle lit le monde et produit des commandes motivées, sans le modifier directement. Elle développe réserves, trois lits, table/tabourets, murs, riz et feu, maintient une facture et collecte les ingrédients nécessaires même si les rations initiales couvrent encore la faim. La [recherche de progression](../research/colony-progression.md) distingue ce pilote d’une mesure empirique des joueurs de RimWorld.

- `colony-player.test.ts` joue cinq jours sur trois graines 250², dont la graine 42 prolongée à huit jours. Celle-ci décide toutes les quatre heures comme le navigateur, les autres toutes les heures. Contrôler matière, ingestions, sommeil par colon, camp, cultures, repas et reprise quotidienne.
- `integration/colony-journey.spec.ts` joue trois jours via la vraie UI et le vrai worker WebGPU, avec décisions toutes les quatre heures et sauvegardes quotidiennes. Aucun saut de temps ni stock artificiel après démarrage. Ce parcours de plusieurs minutes n’est pas un benchmark graphique.
- La chaîne agricole complète jusqu’à maturité et second semis est testée au cœur ; trois jours de navigateur ne suffisent pas à la prouver. Un checkpoint mûr synthétique utilisé ailleurs dans l’UI reste distinct de la progression du joueur.

Le résumé du pilote relève aussi les cellules partagées par plusieurs colons. Il n'impose pas qu'un nombre arbitraire de croisements survienne dans une partie naturelle ; le corridor dédié vérifie cette propriété de façon contrôlée. Conservation et progression restent ses critères métier.

Le bilan du bois inclut matériaux présents, constructions et combustible restant/brûlé. Le bilan alimentaire distingue récoltes, unités présentes et mangées, et conversion de **dix ingrédients en un repas** : ajouter neuf unités retirées par repas fabriqué. La nutrition n’est pas conservée par cette transformation. À chaque nouvelle mécanique, enrichir ce même bilan et ses objectifs plutôt que multiplier les pilotes.

## Diagnostics et mesures

Faire un audit aux changements de boucle, d’algorithme ou de cycle de vie graphique et toutes les deux ou trois tranches qui augmentent la charge. Reprendre le cas à cent acteurs lorsqu’il est affecté. Conserver machine, backend, versions, carte, scénario, durée, échauffement, percentiles, maxima et résultats métier. Aucune conversion d’une capacité de buffer ou d’un test logiciel en FPS promis.

| Audit | Portée et limites |
|---|---|
| `scripts/cooking-bench.ts` | 3/30/100 acteurs actifs sur 250² : cuisine, combustible, champs, chantier et stockage. Ticks individuels, état final validé, matières et diagnostics de recherche. `visited` compte les cellules pondérées finalisées, `connectivityVisited` celles développées pour l'accès ; ne pas confondre leur coût. Avec plusieurs répétitions, les percentiles agrègent les ticks, les bilans/compteurs détaillés décrivent la dernière répétition. Setup hors mesure ; bornes explicites et surveillance à 90 secondes. |
| `scripts/cooking-render-bench.mjs` | Worker réel et GPU natif, 60 images d’échauffement puis au moins 300 images/cinq secondes par vue. RAF, soumission CPU, appels, triangles et progression séparés. Locale/générale avancent successivement le monde : pas un comparatif caméra à état identique. |
| `scripts/navigation-continuation-audit.ts` | `capture|compare <dossier-tmp> <rapport.json>` : avant/après optimisation, égalité byte pour byte de quinze sauvegardes complètes, 3/30/100 colons aux ticks 1/100/300/600/1000. Rapports SHA-256 compacts, mondes dans `tmp`. Pas de mesure de performance. |
| `scripts/navigation-parity.ts` | `record|compare` : 30 états complets aux ticks 1/100/150/300/450 pour 3/30/100 colons, cuisine ordinaire et faim simultanée avec régimes. Enregistrer sur la version précédente avant modification, puis comparer exactement les chaînes sauvegardées dans `tmp/navigation-access-baseline` ; les SHA-256 servent à la provenance. La faim injectée distingue ce stress du pilote ordinaire. Watchdog 120 s. |
| `scripts/needs-bench.ts`, `scripts/dining-bench.ts` et variantes de rendu | Charges de repas/couchages. Préciser le profil alimentaire, les fixtures et leur schéma ; ne pas comparer comme identiques des règles différentes. |
| `scripts/map-bridge-bench.ts` | Microbenchmark Node de clone/encodage/adoption : ni IPC navigateur, ni GPU, ni gameplay. Options tailles/graine/échantillons/échauffement/sortie bornées ; égalité hors chronométrage. |
| `scripts/gpu-navigation-bench.mjs` | Kernels réels contre oracle : coûts/chemins, murs/labyrinthes/bords, pondération, sortie, révisions et concurrence. Mesurer aussi la lecture GPU et le rendu concurrent. |

Sur grande carte, séparer génération, sérialisation, communication/adoption, simulation et rendu. Le temps CPU de soumission n’est pas un temps GPU, et le p95 de moyennes de lots n’est pas le p95 des ticks. La métrique worker publiée à l’écran peut répéter une même moyenne sur plusieurs frames. La mémoire JSON ou comptée par Three n’est pas tout le heap ou le pilote.

Comparer à carte/population/cadrage/actions équivalents et sans autre build/test lourd en parallèle. Les audits anciens sur moteur à bornes étendues sont [archivés et qualifiés](../history/map-scale-v2.md) ; leurs chiffres ne remplacent pas les [preuves courantes](validation.md). Captures inspectées et erreurs sont consignées dans la validation, les rapports bruts dans `artifacts/`.

`scripts/compact-ui-report.py` extrait les grands checkpoints base64 vers `tmp/<rapport>-checkpoints` en gardant tick, taille et SHA-256 dans le JSON versionné. Il conserve erreurs et assertions, y compris pour les essais échoués. Ne pas supprimer une preuve d’échec diagnostiqué pour présenter artificiellement tous les passages comme réussis.

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

`python scripts/check-docs.py` contrôle liens locaux, fragments, les 25 domaines/cinq familles de la matrice et les SHA-256 des trois originaux. Il ne vérifie pas la vérité du gameplay. Relire le contrat et le code lorsqu’une ancienne formulation contredit une fonctionnalité livrée ; garder le passé dans Git/ADR/history, pas dans une seconde description actuelle.

## Loisirs V15

`recreation.test.ts` couvre trois scénarios : taux/seuils/hystérésis, construction livrée et trois places concurrentes avec trajets/rejeu/obstacles, puis observation physique et migration. Les fixtures historiques omettent les champs plus récents ; les clones de personnes sont profonds pour ne pas partager leur lassitude. Le pilote normal construit le piquet et peint les loisirs du soir ; ses bilans alimentaires et matériels restent exigés. L’UI courte valide aussi les poses et les contrôles ; la partie longue vérifie les deux activités et les sauvegardes quotidiennes.

`scripts/recreation-bench.ts` : 3/30/100 colons, faim/repos actifs, besoin de loisirs initial faible, piquets partagés et camp de travail ; deux passes de 600 ticks, setup et contrôles exclus. Les compteurs d’activité prouvent la charge réellement exercée. Ce stress synthétique complète le pilote humain, sans se faire passer pour une partie ordinaire.

`scripts/cooking-render-bench.mjs artifacts/recreation-render.json 3,30,100 recreation` reprend le même protocole matériel avec les activités de loisirs et conserve leurs effectifs réels. Les modes cuisine et loisirs restent distincts ; aucun travail n’est observé dans la fenêtre de besoin de loisirs bas.

## Chantiers V16

`construction.test.ts` combine trois scénarios matériels/spatiaux : pile typée avec fraîcheur et trois portages, annulation/rejeu en cargaison, plantes dans empreinte tournée et priorités, transporteur sans Construction, arêtes de cadre, finition/diagonale/service et migration stricte. L’index de décision est comparé à la recherche directe. L’oracle spatial incorpore des coûts de cadres.

`integration/construction.spec.ts` : fixture synthétique V15, construction sur pile par l’UI, portage observé, reprise en cargaison et cadre, bilan final. Le pilote normal évite de commander une seconde coupe sur une empreinte tout juste planifiée ; ses résumés recensent plans/cadres/dégagements. La partie de trois jours exige un dégagement naturel et garde bilans, activités et rechargements quotidiens. Suites ciblées groupées, puis audit CPU et rendu successifs ; pas de suite entière pour la documentation.

## Sélection et ordres V17

`player-orders.test.ts` approfondit interruptions, réservation exclusive de la file, accès perdu, métier 0 avant/après acceptation, fatigue, repas engagés et reprise V16/V17. `integration/player-orders.spec.ts` exerce Maj, rectangle, double-clic, annulation, deux projections, refus, ordres et sauvegarde par l’UI. Le pilote rapide et le parcours de trois jours ajoutent les deux premiers lots de bois par ordres directs après leurs désignations.

`scripts/player-orders-render-bench.mjs` garde un même monde de cent colons en pause (après 75 ticks réels dans des camps synthétiques sur 250²) ; par vue, compare 0/1/100/0 sélections avec 60 images d’échauffement et au moins 300 images/trois secondes. Les callbacks UI sont instrumentés ; le menu passe par le vrai worker. Mesurer appels, triangles, RAF, soumission CPU, coût ponctuel de sélection et 30 allers-retours de requête sans mutation. Ce test en pause ne remplace pas l’audit CPU de cent travailleurs actifs.

## Lots de travail V18

`player-hauling.test.ts` complète la famille existante : fractions réservées simultanément et en file, capacités typées, source/destination perdues, livraison sans finition, identité/âge à l'interruption, migration stricte V17 et reprise pendant le portage. Le même parcours UI des ordres couvre livraison → stockage → finition ; le pilote demande une livraison de couchage et le rangement des rations au démarrage.

Workflow : terminer ensemble code, fixtures et pilote, compiler à l'intégration et grouper les contrôles des contrats touchés. Réutiliser les preuves des sous-systèmes inchangés ; ne rejouer un long parcours réussi que si une correction touche son déroulement. Les documents peuvent être entretenus pendant les tests, les sources/configurations de leur exécution restent stables. Un audit CPU suffit lorsque seule la simulation matérielle change ; le nombre d'appels GPU n'est pas réannoncé comme une nouvelle mesure.
