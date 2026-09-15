# Architecture et décisions

V39 : `thermal-plants.ts` conserve les facteurs des intervalles de croissance et groupe les plantes par volume d’air. Les lectures restent pures ; le [contrat de croissance thermique](plant-temperature.md) couvre migration, semis, toiture et deltas.

V38 : `thermal-topology.ts` possède les preuves spatiales bornées, `temperature.ts` les échanges et le remappage d’air sauvegardé, `thermal-food.ts` les changements de taux alimentaires, `temperature-save.ts` la validation. Aucun calcul thermique dans Three ou dans les frames. [Contrat](temperature.md).

Éclairage 3D sous V36 : [champ dérivé et texture TSL partagée](environment-lighting.md), propres au renderer ; aucune donnée persistante ni nouvel émetteur Three par feu. Les matériaux reçoivent explicitement la configuration à leur création.

Préparation graphique après V28 : les lots vides disposent d’une [passe de préparation des ombres](shadow-preparation.md) avant de devenir visibles en jeu. Elle complète la compilation des deux projections sans modifier la simulation.

V29 : `BoxMesh.ts` extrait transformations TSL, attributs instanciés, capacités et bornes. Les programmes des piles ne dépendent plus d’un identifiant de buffer généré ; leur croissance conserve les programmes partagés. Les minuscules sommets de cube sont possédés par lot, pour une libération indépendante. Voir [contrat et mesure](shadow-preparation.md#croissance-des-piles-v29).

La [synchronisation de présentation sous V38](presentation-timing.md) sépare réception, application de la scène et rafraîchissement du HUD. Les vitesses positives prennent effet dès confirmation ; les transitions de travail/ressource attendent la même horloge que les corps. Les mises à jour continues de scène sont regroupées à 5 Hz ; les phases discrètes restent appliquées au tick de lecture, et les trajectoires GPU avancent à chaque frame.

## Objectif

Obtenir une simulation de colonie déterministe, observable et indépendante de sa représentation 3D. Les événements émergent des règles de travail, de survie et de vie sociale. La fidélité à la référence est documentée par domaine ; la première tranche ne tente pas de livrer tous ces domaines simultanément.

## Frontières et flux

```mermaid
flowchart LR
  UI[Interface et commandes] -->|Messages ordonnés avec identifiant| Worker[Worker : horloge 10 Hz]
  Worker --> Sim[Simulation pure TypeScript]
  Sim -->|World sérialisable| Worker
  Worker -->|Snapshots périodiques, phases et acquittements| UI
  Worker -->|Snapshot| Render[Three.js : présentation]
  Render --> GPU[TSL : articulation et interpolation GPU]
  UI -->|Demande de sauvegarde| Worker
  Worker -->|État validé et versionné| Save[Stockage local navigateur]
```

Le worker exécute des ticks fixes de 100 ms. Les vitesses modifient le nombre de ticks, jamais leur signification. `FixedClock` conserve la fraction du tick entre changements de vitesse ; le temps déjà écoulé est traité à son ancien taux avant le changement. Un retard réel est plafonné à 250 ms par passage et à 15 ticks par lot : après suspension du navigateur, le jeu ralentit au lieu de tenter de rattraper des heures. Aucun jour de simulation n'est sauté dans le noyau. Cette politique concerne le temps réel, pas les règles du monde.

Les messages sont traités en séquence dans un worker unique. Chaque commande reçoit une réponse ; un échec est affiché. Un checkpoint complet initialise ou remplace une carte ; les publications suivantes, à la fin des lots actifs de 20 ms et aux transitions visuelles et après une demande réussie (hors requête de menu en lecture seule), transportent l'état dynamique et les changements de terrain/ressources. Le client reconstruit un monde complet pour ses observateurs sans recopier les tableaux inchangés. L'application propose 64/128/200/250 cases par côté, défaut 250 ; les anciennes petites cartes sont conservées. Le protocole, ses révisions et les coûts encore complets sont précisés dans ADR-013.

## Contrats actuels

Simulation pure et déterministe dans `src/sim`, messages ordonnés dans `src/bridge`, présentation sans mutation du World dans `src/render`. Les imports vers DOM/Three restent hors du noyau. Le laboratoire GPU reste isolé.

Le schéma courant est 39. [Environnement des ateliers](work-environment.md) : caches dérivés par propriétaire, source lumineuse commune et unités entières de production ; migration V35 validée avant conversion du pourcentage de travail acquis. [Toiture](roofing.md) : couverture/zones persistées, migration V34 sans toit inventé ; contexte de support transitoire et présentation instanciée séparés. Les portes conservent leur état d’ouverture et de permission ; V33 est validée avant migration. La [topologie des pièces](rooms.md) est entièrement dérivée, sans état persistant ni mutation du monde ; l’inspection possède son cache et vérifie les obstacles à chaque lecture utile. Les cinq pierres utilisent les recettes communes, un repos de lit réellement réduit et un bilan de déconstruction par type. La validation V32 précède la migration sans réécriture des objets. `building-materials.ts` porte seulement les propriétés exploitées ; aucune hiérarchie générique de statistiques n’est introduite. La [table de taille](stonecutter.md) réutilise les chantiers et transferts, avec exigences agrégées, emprise centrée 3×1 et géométrie dans un module de présentation dédié. Les [matériaux de construction](construction-materials.md) distinguent recette historique, matériau substituable et exigences typées ; transferts et restitutions conservent le type. Les [gisements et piles d’acier](steel.md) complètent le minage sans régénérer les anciennes cartes ; leur roche encaissante reste distincte du minerai. Le [minage](mining.md) sépare dégâts de roche, cadence de coup, terrain révélé et produit typé. Les [identités géologiques](geology.md) sont persistées et transmises par delta, indépendamment de leur palette de rendu. Le fournisseur ciblé `player-hauling.ts` prépare les livraisons ; `haul-reservations.ts` expose ensemble les tâches actives et en attente au planner. Les contrôles fréquents de capacité et de source parcourent ces mêmes engagements directement, sans tableau temporaire ni générateur. Les ordres restent dans le worker et le rendu ne change pas. Les contrats de propriété, besoins et mouvement font autorité sur les anciennes descriptions des ADR. Voir [simulation](simulation.md), [logistique](material-logistics.md), [alimentation](food-items.md), [agriculture](farming.md), [cuisine](cooking.md), [conservation](food-preservation.md), [horaires](schedules.md), [régimes](food-policies.md), [loisirs](recreation.md), [chantiers](construction.md), [ordres directs](player-orders.md) et [mouvement](spatial-motion-storage.md).

Extraire une responsabilité cohérente avant de rallonger un module. Ne pas introduire ECS, Rust ou compute sans besoin et mesure. Les audits séparent simulation, transport des snapshots, rendu CPU et GPU.

## Registre des décisions

Les entrées ci-dessous conservent les anciens liens par fragment. Les textes sont regroupés par domaine, avec leur contexte historique.

## ADR-001 — Grille de gameplay plane, représentation 3D

Voir [la décision détaillée](../decisions/foundations.md#adr-001--grille-de-gameplay-plane-représentation-3d).

## ADR-002 — TypeScript strict dans un worker

Voir [la décision détaillée](../decisions/foundations.md#adr-002--typescript-strict-dans-un-worker).

## ADR-003 — Three.js WebGPURenderer et TSL

Voir [la décision détaillée](../decisions/presentation.md#adr-003--threejs-webgpurenderer-et-tsl).

## ADR-004 — Animation GPU, simulation CPU

Voir [la décision détaillée](../decisions/presentation.md#adr-004--animation-gpu-simulation-cpu).

## ADR-005 — Ressources et réservations explicites

Voir [la décision détaillée](../decisions/simulation.md#adr-005--ressources-et-réservations-explicites).

## ADR-006 — Sauvegarde versionnée

Voir [la décision détaillée](../decisions/simulation.md#adr-006--sauvegarde-versionnée).

## ADR-007 — Rust/WASM et compute selon mesures

Voir [la décision détaillée](../decisions/foundations.md#adr-007--rustwasm-et-compute-selon-mesures).

## ADR-008 — Dimensions, topologie et génération

Voir [la décision détaillée](../decisions/presentation.md#adr-008--dimensions-topologie-et-génération).

## ADR-009 — Organisation de l'interface de référence

Voir [la décision détaillée](../decisions/presentation.md#adr-009--organisation-de-linterface-de-référence).

## ADR-010 — Laboratoire de navigation entièrement GPU

Voir [la décision détaillée](../decisions/presentation.md#adr-010--laboratoire-de-navigation-entièrement-gpu).

## ADR-011 — Adoption critique du référentiel utilisateur

Voir [la décision détaillée](../decisions/foundations.md#adr-011--adoption-critique-du-référentiel-utilisateur).

## ADR-012 — Boucle matérielle, reprise et budgets de planification

Voir [la décision détaillée](../decisions/simulation.md#adr-012--boucle-matérielle-reprise-et-budgets-de-planification).

## ADR-013 — Cartes 250² et publications de monde incrémentales

Voir [la décision détaillée](../decisions/presentation.md#adr-013--cartes-250²-et-publications-de-monde-incrémentales).

## ADR-014 — Désignation de terrain par rectangle

Voir [la décision détaillée](../decisions/simulation.md#adr-014--désignation-de-terrain-par-rectangle).

## ADR-015 — Besoins réalisés par des tâches physiques

Voir [la décision détaillée](../decisions/simulation.md#adr-015--besoins-réalisés-par-des-tâches-physiques).

## ADR-016 — Repas à table, modules de présentation et audits continus

Voir [la décision détaillée](../decisions/simulation.md#adr-016--repas-à-table-modules-de-présentation-et-audits-continus).

## ADR-017 — Ressources graphiques conservées pendant les actions

Voir [la décision détaillée](../decisions/presentation.md#adr-017--ressources-graphiques-conservées-pendant-les-actions).

## ADR-018 — Identité alimentaire et profils sauvegardés

Voir [la décision détaillée](../decisions/simulation.md#adr-018--identité-alimentaire-et-profils-sauvegardés).

## ADR-019 — Arêtes temporisées, sol unique et vue distante

Voir [la décision détaillée](../decisions/presentation.md#adr-019--arêtes-temporisées-sol-unique-et-vue-distante).

## ADR-020 — Surfaces rocheuses et croissance par intégrale

Voir [la décision détaillée](../decisions/presentation.md#adr-020--surfaces-rocheuses-et-croissance-par-intégrale).

## ADR-021 — Caméra et ciel séparés de la simulation

Voir [la décision détaillée](../decisions/presentation.md#adr-021--caméra-et-ciel-séparés-de-la-simulation).

## ADR-022 — Culture, intégrale lumineuse et lots séparés

Voir [la décision détaillée](../decisions/presentation.md#adr-022--culture-intégrale-lumineuse-et-lots-séparés).

## ADR-023 — Dégagement local et décision alimentaire

Voir [la décision détaillée](../decisions/simulation.md#adr-023--dégagement-local-et-décision-alimentaire).

## ADR-024 — Cuisine physique et recherches de travail par groupes

Voir [la décision détaillée](../decisions/simulation.md#adr-024--cuisine-physique-et-recherches-de-travail-par-groupes).

## ADR-025 — Occupation dense par recherche et diagnostics de cuisine

Voir [la décision détaillée](../decisions/simulation.md#adr-025--occupation-dense-par-recherche-et-diagnostics-de-cuisine).

## ADR-026 — Âge alimentaire ancré et interruption conservatrice

Voir [la décision détaillée](../decisions/simulation.md#adr-026--âge-alimentaire-ancré-et-interruption-conservatrice).

## ADR-027 — Horaires distincts des besoins physiques

Voir [la décision détaillée](../decisions/simulation.md#adr-027--horaires-distincts-des-besoins-physiques).

## ADR-028 — Régimes partagés et engagements alimentaires

Voir [la décision détaillée](../decisions/simulation.md#adr-028--régimes-partagés-et-engagements-alimentaires).

## ADR-029 — Accessibilité progressive et routes à la demande

Voir [la décision détaillée](../decisions/simulation.md#adr-029--accessibilité-progressive-et-routes-à-la-demande).

## ADR-030 — Passage civil et réservations de service

Voir [la décision détaillée](../decisions/simulation.md#adr-030--passage-civil-et-réservations-de-service).

## ADR-031 — Loisirs physiques et lassitude persistante

Voir [la décision détaillée](../decisions/simulation.md#adr-031--loisirs-physiques-et-lassitude-persistante).

## ADR-032 — Plans, cadres et dégagement matériel

Voir [la décision détaillée](../decisions/simulation.md#adr-032--plans-cadres-et-dégagement-matériel).

## Fournisseurs contextuels V19

`player-service-hauling.ts` isole les propositions de ravitaillement et de dégagement du fournisseur de stockage. L’exécution réutilise `HaulTask` et le transport physique commun ; le constructeur conserve son sous-travail de coupe. `fuelStationReserved` partage l’exclusivité du poste entre cuisine, transport actif et file. Aucune donnée de rendu ni recherche à chaque image ; aucune géométrie supplémentaire. Schéma 19 pour les nouvelles destinations en file et le drapeau manuel de recharge, après validation stricte de V18. Voir [contrat et limites](player-orders.md).

## Ordres de cuisine et semis V20

`order-types.ts` sépare les trois entrées de file (job, transport, recette). `player-cooking.ts` adapte le planificateur commun et son exécuteur ; `player-cooking-save.ts` valide la forme initiale stricte avant les références croisées. Sources et capacité au sol comptent les engagements par boucles directes ; postes et dépôts sont partagés avec construction/services. `sowing-clearance.ts` valide l’intention zone/cellule sans dépendre du renouvellement des jobs agricoles. La suppression du parent utilise le plan de dépôt conservatif commun. Schéma 20 après validation stricte de V19, aucun changement de géométrie ni travail par image. [Contrat](player-orders.md).

## Coexistence et zones V21

`occupancy.ts` sépare quatre permissions du catalogue ciblé : dégager une pile, coexister avec elle, admettre une zone et recevoir un apport. `construction-zones.ts` décrit les cellules et destinations affectées puis applique les retraits avec les dépôts préparés par `work-release`. Aucun état d’occupation global mutable ni nouvelle abstraction ECS. L’index des rectangles passe à un masque 16 bits pour distinguer les restrictions ; il reste local à la requête. `occupancy-save.ts` valide la transition des anciens dépôts dans les lits/feux après la validation V20. `render/pile-surfaces.ts` ne fournit que des décalages/échelles de présentation : ID et propriétaire restent dans la simulation, lots de géométrie existants réutilisés. La circulation actuelle est volontairement séparée et doit être complétée au prochain lot ; [contrat et limites](construction.md).

Les requêtes chaudes de présence dans une empreinte utilisent `footprintContains` (définitions centralisées), sans tableau de cellules temporaire. Les profils restent relus sur l’état courant ; aucun cache persistant d’occupation susceptible de devenir périmé n’est introduit.

Les [profils V22](furniture-travel.md) sont isolés de l’orchestrateur : `furniture-travel` pour passage/arrêt/coûts, `transit-exit` pour le repli physique, `furniture-save` pour la migration. `pawn-presentation` centralise la formule TSL corps/cargaison/sélection ; `furniture-motion` indexe les hauteurs par snapshot. Aucun nouvel attribut ni lot de personnages, aucun calcul de squelette CPU ajouté.

## Maintien prioritaire V23

`priority-work-state` sépare intention persistante et réservation, avec validation historique stricte. `priority-work` intervient après la file et avant les besoins ordinaires ; il réutilise les propositions de cuisine/construction/transport, un accès partagé et les budgets du tick. L’orchestrateur reçoit un seul appel. Absence d’intention : aucune recherche supplémentaire. Aucun nouveau mesh, attribut GPU ou dépendance. Voir [contrat et migration](player-orders.md).

## Retrait transactionnel V24

`deconstruction-rules.ts` porte cibles/durées/réservations, `deconstruction.ts` prépare le remboursement avant de supprimer l’ouvrage et `deconstruction-save.ts` contrôle les nouveaux états. Le bilan de pertes est persisté et transmis par les snapshots dynamiques. `JobLayer.ts` extrait les marqueurs du rendu principal et réutilise les lots instanciés. Voir [contrat et limites](deconstruction.md).

## Mobilier conservé et transport V25–V26

Les [transferts de meubles](furniture-transfer.md) séparent règles, commandes, progression et validation. `World.packed` garde l'objet construit et son propriétaire sol/colon ; le rendu présente ces données sans les modifier. Les représentations de paquet utilisent les lots existants de mobilier et cargaisons GPU. La migration V24 est additive après validation stricte ; aucun inventaire personnel ni registre ECS générique n'est introduit. La [logistique V26](furniture-logistics.md) étend les tâches actives/en file par `whole: true`, réserve une cellule entière, conserve le fournisseur Construction/Transport de la réinstallation et ajoute un filtre de réserve facultatif. V25 est validée avant migration, sans changer les réglages existants. Les règles, propositions, exécution et validation des paquets restent dans des modules dédiés. Les capacités des réserves sont réutilisées uniquement pendant une décision synchrone ; elles ne survivent ni à sa réservation finale ni à un tick.

## Production commune V32

Deux recettes partagent le même moteur physique. `production-recipes.ts` décrit leurs contrats et `production-output.ts` extrait livraison/fractionnement ; noms persistants `cooking` conservés, recette de blocs explicitement discriminée. Pas de nouveau moteur de réservations. Les recherches de réserve utilisent l'accès progressif commun, uniquement pendant une décision synchrone. [Contrat](stonecutting.md).

## Portes et audit de charge V34

[Portes manuelles](doors.md) : attente avant engagement de l'arête, permission distincte de l'état ouvert, temporisations sauvegardées. Index des corps et objets local à la mise à jour ; recherche/candidats toujours bornés à une décision synchrone. Jambages dans le lot statique partagé, vantaux instanciés par attributs et TSL sur le temps des colons. Aucun nouveau solveur physique ni animation CPU par objet.

Le scénario 100 portes/100 colons a révélé un coût CPU élevé avec 1 500 murs et recherches simultanées. L'[optimisation des requêtes](spatial-queries.md) compare le classement avant accès/capacité, capture les cellules d'arrêt pendant une recherche de sortie et évite les allocations d'empreintes dans les loisirs. Les mêmes états de charge sont conservés, avec des pointes CPU encore ouvertes ; voir [mesures](validation.md). Aucun cache persistant implicite ne doit masquer une création, un déplacement de pile ou un changement d'autorisation.

## Sauvegarde locale et remplacement V35

Pendant une sauvegarde manuelle, les commandes de sauvegarde et de chargement sont désactivées jusqu’à écriture effective dans le stockage local. Un chargement rapide ne lit donc plus l’ancienne entrée pendant que la réponse du worker arrive. Échec d’écriture : les boutons sont restaurés et le monde courant reste en place. Les raccourcis utilisent la même garde ; la simulation n’est pas modifiée par le test de réponse retardée.

### Lumière des actions V37

`light-environment.ts` sépare lecture lumineuse et rôles de `work-environment.ts`. La simulation injecte un contexte partagé aux départs d'arêtes et aux actions, invalidé après mutation. `work-progress.ts` et `work-progress-save.ts` possèdent unités fractionnaires et migration ; ni rendu ni navigation ne deviennent propriétaires de l'avancement. [Contrat](light-work.md).
