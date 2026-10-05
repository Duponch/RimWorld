# Architecture et décisions

**V219 livré dans le périmètre contrôlé, schéma 197.** Lancier et Piquier dans un seul lot : corps30/20parties, combat à distance, projectiles, défense, carcasses et récupération physique. [Contrat](ranged-mechanoids-v219.md), [référence primaire](../research/ranged-mechanoids-core-v219.md), [preuve et limites](../history/validation-ranged-mechanoids-v219.md). Régression par reprises570fichiers/2592réussites/un ignoré, typage/build, présentation et parcours natif matériel composé passent. Catalogue59scènes,58historiques inchangées. Acquisition à distance des bâtiments et contenu mécanique exhaustif restent ouverts. Le suffixe Énergie V218 passe séparément sur son commit exact ; il ne constitue pas une campagne V219 fraîche.

**V216 livré dans le périmètre contrôlé, schéma 196.** [Globe et groupe](planet-group-v216.md) : géographie privée bornée, captures et routes séparées, propriétaires humains exclusifs et horloges cliniques explicites. Les noyaux de besoins, soins et commerce sont partagés avec les domaines locaux ; la présentation SVG lit le snapshot confirmé. [Recherche primaire](../research/planet-group-core-v216.md), [contrôles et limites](../history/validation-planet-group-v216.md). Les gros orchestrateurs historiques et le coût général de simulation/publication restent à consolider.

**V214 livré dans le périmètre contrôlé, schéma 195.** Proches annoncés, couples adultes, opinions dirigées, logement par deux lits possédés et deuil familial au décès réel. [Contrat](family-v214.md), [recherche](../research/family-core-v214.md), [preuve et limites](../history/validation-family-v214.md). 537 fichiers/2 442 réussis/un ignoré, 31 nouveaux cas, build et parcours natif composé ; mariage, lit double, enfants, planète et performance générale restent ouverts.

**V212 livré dans le périmètre contrôlé, schéma 193.** État privé sur le bâtiment installé, profil intrinsèque distinct des armes d’inventaire, événements Bullet/Bomb triés par ID à chaque sous-tick Core, captures partagées et service réutilisant le transport. Le trajet refuge reste une autorité explicite pendant une crise. [Contrat](mini-turret-v212.md), [recherche](../research/mini-turret-core-v212.md), [preuve](../history/validation-mini-turret-v212.md). Les gros points d’entrée et limites générales CPU/GPU restent ouverts.

**Repère V211, schéma 192, crises mentales livrées dans le périmètre contrôlé.** [Contrat](mental-crises-v211.md), [preuve](../history/validation-mental-crises-v211.md). Union de crises, catalogue partagé, admission spatiale bornée, autorité de mêlée privée, menace réelle et dégâts à cause explicite réutilisent le moteur existant. Migration stricte191 puis neutre ; aucune cible ni menace rétroactive.

**V208 historique, schéma 190, livré dans le périmètre ciblé.** [Contrat TV](television-v208.md), [recherche](../research/television-core-v208.md), [preuve](../history/validation-television-v208.md). Validation stricte 189 avant famille `television:0/false` pour propriétaires actifs, sans projet ni plaisir rétroactif. Les archives conservent leurs champs historiques. Places frontales et topologie tick-locale partagent les services existants ; modèle dans le lot mobilier résident.

**V207 — couvert bas textile, schéma 189.** Validation stricte de 188 avant migration neutre. Recette de construction et navigation capturent livraisons et arêtes ordinaires ; `isBarrier` expose les impacts/réparations, `isBreachableBarrier` garde distincts les obstacles qui empêchent le passage. Remplissage 0,55 dans les captures tactiques existantes, sans nouveau solveur ni collision fondée sur le mesh. La restitution au quart réutilise la transaction privée existante ; `deconstructed.lostTextiles?` comptabilise seulement les futures pertes. `sandbags-save.ts` partage la garde stricte avec le bridge ; les réservations complètes restent dans les validateurs ordinaires. Le modèle de 18 placements par ouvrage occupe le lot mobilier existant. [Contrat](sandbags-v207.md), [recherche Core et adaptation tactique](../research/defensive-cover-core-v207.md), [preuve bornée](../history/validation-sandbags-v207.md). La stabilité des buffers/pipelines ne mesure ni temps GPU ni débit général.

**V206 — fabrication de rations existantes, schéma 188.** Validation stricte de 187 avant migration neutre, sans projet, ration ou facture rétroactif. Le projet facultatif et `cook-survival-meal` utilisent recherche, collecte, réservations, cuisson et transports physiques existants. Sauvegarde et bridge partagent la garde bornée `packaged-survival-save.ts` avant adoption ; les validations culinaires complètes restent dans leurs validateurs de sauvegarde. La contamination s'engage avec la transformation, jamais au chargement. Aucun nouveau protocole, shader, objet graphique ou pile alimentaire ; le contrôle de publication a néanmoins un coût CPU réel. [Contrat](packaged-survival-v206.md), [recherche et adaptation](../research/packaged-survival-core-v206.md), [preuve](../history/validation-packaged-survival-v206.md). Ni adoption complète, tick complet ni GPU général ne sont déduits d'un sous-banc.

**V205 — famille de lits hospitaliers, schéma 187.** Validation stricte de 186 avant migration neutre, sans lit, recherche ou bonus rétroactif. `bed-kinds.ts` partage la garde de famille ; les consommateurs cliniques résolvent le lit réellement occupé avec `hospital-medical-stats.ts` lors de leurs contacts existants ; la consultation des porteurs est bornée aux acteurs couchés. Recherche, recette, qualité à la finition et rôle médical initial utilisent les transitions ordinaires ; paquet et réinstallation gardent les propriétés et le rôle. La silhouette hospitalière réutilise le lot mobilier résident, sans nouveau shader ni mesh par acteur. [Contrat](hospital-bed-v205.md), [recherche Core et adaptation](../research/hospital-bed-core-v205.md), [preuve](../history/validation-hospital-bed-v205.md). Aucun coût général de performance n’est établi par cette structure.

**V203 — transactions de fret textile, schéma 185.** Validation stricte184 avant migration neutre ; extensions facultatives sans fret/vente rétroactifs. Le manifeste réserve des sources physiques, le registre commercial garde le propriétaire original hors carte et les échanges sont engagés sur drafts après devis, fonds et capacités. Inventaire textile distinct du stock du foyer ; cumuls bruts et reçus bornés, provenance du stock textile contrôlée. Snapshots/presentation observent ventes et achats au même tick. Aucun nouveau protocole worker, shader ou lot ; consultations au tick/UI confirmé, pas métier par image. [Contrat](caravan-sales-v203.md), [recherche et adaptations](../research/caravan-sales-core-v203.md), [preuve](../history/validation-commercial-sales-v203.md).

**V202 — condition mondiale électrique, schéma 184.** [Calendrier privé et contrat](solar-flare-v202.md) : validation stricte 183 puis migration neutre ; adoption à la première avancée réelle, sans rattrapage. Agenda World distinct, échéance Core persistée ; le réseau traite chaque frontière puis publie début/fin confirmés. Pas de garde globale dans les lecteurs de courant, ni nouveau shader ou lot. [Recherche](../research/solar-flare-core-v202.md), [preuve et limites](../history/validation-solar-flare-v202.md).

**V201 livré, schéma 183.** [Rage animale](manhunter-v201.md) : validation stricte de 182 avant migration neutre, sans incident ni horloge rétroactifs. L'agenda ThreatSmall et le PRNG mental persistent séparément des blessures et de Misc ; poursuite, récupération et frappes de porte partagent navigation et contacts existants. L'état confirmé alimente snapshots, inspection, alerte et musique tension ; le signal `ui.threat` ne se répète pas au chargement. Orientation dans les lots animaux existants, sans nouvelle texture ni pipeline propre à la rage. Agenda privé à acceptation figée et errance locale restent des adaptations. [Recherche](../research/manhunter-core-v201.md), [preuve et limites](../history/validation-manhunter-v201.md).

V200 au schéma182 : [V200](needs-grass-clouds-v200.md) complète les jauges DOM et remplace le rouge par cellule par un masque compact des racines d'herbe, précalculé sur empreintes de sang confirmées. Un lookup entier vertex conditionnel, aucun nouveau draw ni upload stable ; alpha extrait de l'atlas de saleté pendant le chargement. Les brins empruntent aussi le RGB de l'atlas terrain existant, par une lecture vertex sans texture supplémentaire. Seul le rayon du masque des nuages change. [Référence](../research/needs-grass-clouds-v200.md), [preuve et coût](../history/validation-needs-grass-clouds-v200.md).

Schéma 182 de ce lot : [V199](colonist-ui-v199.md) ne change ni simulation, worker, renderer ni sauvegarde. Les nœuds UI existants sont déplacés sans cloner leurs écouteurs ; une infobulle déléguée réutilisable reçoit des données préparées à la cadence HUD, et une fiche modale affiche les propriétés projetées lors de son ouverture. Pas de requête métier à chaque mouvement de souris ni nouvelle boucle RAF continue. [Recherche](../research/colonist-ui-core-v199.md), [preuve et limites](../history/validation-colonist-ui-v199.md).

Schéma 182 de ce lot : [V198](movement-continuity-v198.md) dissocie observation de fuite, budget de recherche et suivi d’un trajet déjà sûr ; la sortie de production reprend sa destination persistée. Aucun champ, migration, renderer, buffer ou protocole ajouté. Le [diagnostic](../research/navigation-cpu-gpu-v198.md) conserve la navigation GPU au laboratoire ; les [preuves](../history/validation-movement-v198.md) distinguent coût CPU absolu, continuité et performances non mesurées.

Schéma 182 de ce lot : [V197](melee-pursuit-v197.md) sépare le délai de recherche de l’exécution d’un préfixe de route sûr, puis conserve l’engagement à la révision d’une même cible. Les champs persistés, budgets et arêtes capturées existants sont réutilisés. Aucun changement de renderer, buffer GPU, protocole ou migration ; la [preuve](../history/validation-melee-pursuit-v197.md) distingue chronologie validée et performances générales non mesurées.

Schéma 182 de ce lot : [V196](visual-blood-v196.md) ne change ni simulation ni sauvegarde. Le sang de l’herbe est préparé dans la carte RGBA existante ; les traces corporelles utilisent un mot dérivé par acteur dans les streams entrelacés. Les sept rigs animaux servent aussi aux piles et corps portés, via les primitives de cargaison du porteur, sans mesh individuel. Les voix lisent le compteur médical existant et le sexe projeté du rendu, sans PRNG audio de simulation. Les [limites de coût et de validation](../history/validation-visual-blood-v196.md) restent explicites. [V195](healroot-domestic-v195.md) conserve sa migration stricte 181→182 et ses buissons médicinaux résidents.

[V194](rain-electric-v194.md) conserve son état optionnel et son PRNG privé de risque électrique sous précipitations, adoptés prospectivement. Toit et alimentation restent autoritaires ; dégâts Flame, protection et récupération sont physiques. Sa [preuve](../history/validation-rain-electric-v194.md) reste historique.

Le [commerce V193](caravan-trade-v193.md) valide strictement 179 avant migration neutre au schéma 180. La carte, le voyageur et le comptoir ont des propriétaires distincts ; les projections sont réservées à la validation. Réservations sources partagées, masse entière incluant le gear, draft atomique du devis/paiement, retour inventorié puis déchargement au contact. Les nouvelles admissions et snapshots comptent le registre hors carte sans l’ajouter au stock local. La [preuve](../history/validation-commercial-v193.md) borne contrôles et consultations CPU absolues, sans gain général CPU/GPU.

La [prédation V190](predation-v190.md) valide strictement 177 avant migration neutre ; cible de chasse et anatomie consommée sont persistées, sans modifier le dossier médical ante mortem. Les index de réservation restent dérivés et ne changent ni propriétaire ni quantité. La [serre électrique V189](greenhouse-v189.md) valide strictement 176 avant migration neutre. Les plantes capturent le régime lumineux de leur intervalle ; toute transition solde la croissance acquise avant adoption du futur éclairage. L’absence de lampe horticole conserve le chemin historique. Les champs lumineux et index agricoles sont dérivés par World, sans dépendance à la caméra ; leur régime stable évite un parcours des plantes par tick. Le niveau logique agricole à 100 % reste distinct du champ graphique plafonné à 50 %. La [preuve V189](../history/validation-greenhouse-v189.md) ne vaut pas mesure générale CPU/GPU.

## Objectif

Une simulation de colonie déterministe et observable, indépendante de sa représentation 3D. Les règles et leurs adaptations Core sont documentées par domaine. Le rendu interprète les états confirmés ; il ne décide ni des actions ni de leurs conséquences.

## Frontières et flux

| Responsabilité | Point d’entrée | Contrat |
| --- | --- | --- |
| Simulation | `src/sim` | État sérialisable, règles indépendantes de la présentation, décisions et PRNG reproductibles ; aucun DOM/Three/temps réel. |
| Commandes et horloge | `src/bridge/SimulationClient.ts`, `simulation.worker.ts`, `fixed-clock.ts` | Commandes ordonnées et acquittées, tick fixe ; un refus ne remplace pas le monde. |
| Publication | `src/bridge/snapshots.ts` | Checkpoint initial puis deltas ; les copies conservées détectent aussi les mutations au même tick. |
| Présentation | `src/render/ColonyRenderer.ts` et ses couches | Lots GPU résidents, interpolation des états confirmés, aucune mutation du World. |
| Interface | `src/main.ts`, `src/ui`, `src/style.css` | Projections des snapshots et commandes au worker ; chaînes de sauvegarde affichées avec `textContent`. |
| Navigation GPU | `src/navigation-gpu`, `src/navigation-lab.ts` | Expérience isolée et oracle indépendant, non branchée sur le déplacement du jeu. |

L’horloge locale est de **6 ticks par seconde à 1×**, soit environ 166,67 ms par tick, et une journée vaut 6 000 ticks. Les constantes sont dans `src/sim/types.ts` et leurs conversions dans `src/bridge/clock-rate.ts`. Les vitesses changent le débit, pas le sens du tick. `FixedClock` conserve sa fraction entre changements de vitesse, borne le retard réel à 250 ms par passage et à 15 ticks par lot ; un navigateur suspendu ne saute pas des jours de simulation.

Le worker publie un checkpoint complet à l’initialisation ou au remplacement du monde, puis des états dynamiques et deltas. Les acquittements ne se perdent pas quand des snapshots sont regroupés. Voir [le contrat de présentation](presentation-timing.md), [les critères de jouabilité](playability-validation.md) et les ADR historiques pour la provenance des choix.

## Contrats actuels

- **Persistance :** valider chaque ancien schéma avant sa migration explicite et neutre ; rejeter les champs futurs. Ne pas accorder de contenu rétroactif. Le schéma courant provient de `src/sim/types.ts`, jamais du numéro d’une retouche graphique.
- **Monde physique :** accès, réservations, ownership et quantité sont autoritaires au worker. Les transferts et restitutions se prévalident ; la représentation d’une cargaison peut interpoler le passage sans retarder le transfert logique. Voir [logistique](material-logistics.md), [mouvement](spatial-motion-storage.md) et [transferts visuels](carry-handoff-v137.md).
- **Rendu :** couches résidentes et attributs partagés, animation sur GPU et temps confirmé, pause stable. Voir [surfaces humaines](pawn-surface-v136.md), [surfaces animales](animal-surface-v136.md), [météo visuelle](visual-weather-v137.md), [préparation des ombres](shadow-preparation.md) et [copie locale des pigments](terrain-upload-v142.md).
- **Systèmes récents :** [fabrication avancée](advanced-fabrication-v139.md), [casque](flak-helmet-v141.md), [autodoors](autodoor-v143.md) et [pannes](breakdown-v144.md) s’intègrent aux commandes, travaux, matières et sauvegardes existants ; leurs recherches et preuves bornent les adaptations.
- **Maintenance :** extraire une responsabilité cohérente avant d’allonger un module. Pas d’ECS générique, Rust/WASM ou compute supplémentaire sans besoin mesuré. Les audits séparent simulation, publication/adoption, CPU de rendu et GPU ; les [preuves](validation.md) ne sont pas des garanties universelles de cadence.

Les commandes, fixtures et conditions reproductibles des bancs CPU et natif sont regroupées dans le [protocole de mesure](performance-measurement.md).

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

## Anatomie : frontière préalable à la santé

`body-definition.ts` garde le corps naturel et ses index immuables, distincts du squelette GPU. `body-capacities.ts` évalue une projection de pertes/absences/douleur, avec résultat immuable et voie saine partagée. Le modèle ne possède pas `World` et ne déclenche ni mort ni interruption. [Contrat anatomique et intégration V45](body.md). Aucun champ de sauvegarde n’est ajouté pour ce socle seul.
