# Architecture et décisions

## Objectif

Obtenir une simulation de colonie déterministe, observable et indépendante de sa représentation 3D. Les événements émergent des règles de travail, de survie et de vie sociale. La fidélité à la référence est documentée par domaine ; la première tranche ne tente pas de livrer tous ces domaines simultanément.

## Frontières et flux

```mermaid
flowchart LR
  UI[Interface et commandes] -->|Messages ordonnés avec identifiant| Worker[Worker : horloge 10 Hz]
  Worker --> Sim[Simulation pure TypeScript]
  Sim -->|World sérialisable| Worker
  Worker -->|Snapshot à 5 Hz et acquittements| UI
  Worker -->|Snapshot| Render[Three.js : présentation]
  Render --> GPU[TSL : articulation et interpolation GPU]
  UI -->|Demande de sauvegarde| Worker
  Worker -->|État validé et versionné| Save[Stockage local navigateur]
```

Le worker exécute des ticks fixes de 100 ms. Les vitesses modifient le nombre de ticks, jamais leur signification. Un retard réel est plafonné à 250 ms par passage et à 15 ticks par lot : après suspension du navigateur, le jeu ralentit au lieu de tenter de rattraper des heures. Aucun jour de simulation n'est sauté dans le noyau. Cette politique concerne le temps réel, pas les règles du monde.

Les messages sont traités en séquence dans un worker unique. Chaque commande reçoit une réponse ; un échec est affiché. Le snapshot complet est cloné au plus toutes les 200 ms pendant la marche, plus après une demande. Cette stratégie reste simple pour trois colons ; l'application accepte désormais des cartes 32/64/128, défaut 64. Le coût de copie et l'accumulation de messages doivent être mesurés avant l'étape des centaines d'acteurs.

## ADR-001 — Grille de gameplay plane, représentation 3D

**Adopté.** Les cellules utilisent x/z et une grille row-major. Les coordonnées des personnages sont entières dans la simulation. Le rendu interpole leurs déplacements ; sa hauteur n'ajoute pas d'étage navigable. Les volumes low poly facilitent les angles de caméra, mais les chemins et l'occupation restent faciles à vérifier. Étages, escaliers et terrain déformable exigeraient une décision séparée.

## ADR-002 — TypeScript strict dans un worker

**Adopté.** Three.js, DOM et horloge sont absents du noyau. Les modules `engine`, `pathfinding` et `serialization` permettent tests headless et un remplacement ciblé. Le modèle utilise des tableaux d'entités typées plutôt qu'un framework ECS généraliste. À cette échelle, l'absence de dépendances et la lisibilité priment ; les futurs index spatiaux et tableaux SoA peuvent être introduits derrière l'API.

Un worker garde le thread d'interface disponible ; ce choix n'accélère pas magiquement le calcul total. Les échanges ont un coût. Les buffers transférables, pools et numéros de révision sont la suite à mesurer quand les snapshots complets deviennent coûteux. Voir [la documentation des workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

## ADR-003 — Three.js WebGPURenderer et TSL

**Adopté.** Three 0.186.0, Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.0, Playwright 1.63.0 et types Three 0.186.0 : tags npm stables vérifiés le 13 septembre 2026, puis versions exactes installées et verrouillées. Node local : 24.11.1. Aucun tag flottant `latest` à l'exécution.

L'import `three` est redirigé exactement vers `three/webgpu` pour éviter deux instances avec les addons. Les graphes de matériaux sont construits une fois. Le backend réel est diagnostiqué après initialisation ; un repli WebGL 2 est possible pour les fonctions présentes. Les futures passes compute seront activées selon capacités et n'auront pas une parité supposée sur tous les backends. Voir [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer) et [TSL](https://threejs.org/docs/TSL.html).

## ADR-004 — Animation GPU, simulation CPU

**Adopté pour les placeholders.** Un rig de six segments rigides, un poids par sommet, pivots de bind et articulation TSL remplace les personnages. La simulation transmet position et état ; aucune hiérarchie d'os n'est animée sur CPU à chaque image. L'interpolation visuelle n'influence ni collision, ni faim, ni réservation.

**Prévu pour les glTF.** Pré-échantillonner des clips dans un atlas d'os ; comparer palette compute partagée et skinning vertex. Les animaux peuvent bénéficier de VAT. L'audit Antsystem démontre un pipeline VAT préparé sur CPU au chargement puis exploité GPU, et non un moteur universel de squelettes entièrement évalués sur GPU. Les décisions détaillées, limites de normales, LOD et ombres sont dans [la recherche de rendu](../research/rendering-and-performance.md).

## ADR-005 — Ressources et réservations explicites

**Adopté, réalisé dans le schéma 2.** Le stock global autoritaire de la première tranche est remplacé par des piles physiques avec propriétaire unique : sol, porteur ou chantier. Collecte, transport et construction sont des familles séparées. Les tâches réservent une quantité source et une capacité de destination, puis exécutent prélèvement, portage et dépôt. Le constructeur attend les matériaux réellement livrés. `stock` et `job.escrow` sont désormais des vues contrôlées, sans double comptage.

Interrompre libère les engagements futurs ; la cargaison est déposée au colon et les matériaux déjà livrés restent au chantier. Annuler un plan dépose ses matériaux sur place ; achever incorpore ces quantités au bâtiment. Les stockages sont encore des cellules indépendantes avec filtres, priorité et capacité. Le plan de mur bloque le passage dès sa désignation ; déplacement automatique des objets, zones communes et étapes de chantier plus fines restent ouverts. Contrat : [material-logistics.md](material-logistics.md) ; adaptations : [decisions.md](../gameplay/decisions.md).

## ADR-006 — Sauvegarde versionnée

**Adopté, schéma 2 courant avec migration explicite depuis 1.** Le JSON contient graine et RNG, tick, IDs, grille, entités, piles et propriétaires, stockages, orientations, tâches de transport, routes, cadences, réservations, `logisticsCursor` et événements. L'entrée est validée comme `unknown`, avec bornes, identités uniques, vues dérivées et cohérence des liens. Le chargement est préparé dans une variable temporaire et n'écrase le monde qu'après validation.

La migration valide d'abord le schéma 1. Le stock global devient des piles déterministes près du camp, l'escrow devient de la matière livrée ; les priorités existantes sont conservées et Transport reçoit 3. Les anciens lits gardent une empreinte `legacy-single` 1×1 sans déplacer les voisins. Une construction interrompue V1 peut conserver sa progression sans escrow : elle doit être réapprovisionnée avant de poursuivre. Terrain et IDs existants ne sont pas régénérés. L'égalité de continuation s'applique au schéma 2, sans promesse de reproduire le futur de l'ancien moteur.

Le renderer et la vitesse de lecture ne font pas partie du résultat métier sauvegardé. Sauvegarder n'arrête pas le jeu ; l'état correspond au traitement de la demande dans le worker. Les clés `lisiere.save.v1` et `lisiere.previous.v1` sont conservées pour retrouver les parties existantes ; le schéma est dans le JSON. Créer une colonie écrit d'abord la copie précédente et refuse le remplacement si cette écriture échoue. Export/import, autosauvegardes tournantes, manifeste de contenu/générateur et migrations ultérieures restent à développer.

## ADR-007 — Rust/WASM et compute selon mesures

**Reporté avec critères.** Envisager Rust pour navigation, régions ou diffusion si un profil représentatif dépasse le budget après optimisation algorithmique. Comparer mêmes entrées et mêmes résultats, coût JS↔WASM inclus, appels par lots. Commencer monothread dans le worker ; SharedArrayBuffer et rayon impliquent isolation cross-origin et protocole atomique.

Pour le GPU, commencer par quelques centaines d'acteurs représentatifs avant culling/compaction/indirect. Mesurer séparément simulation, échanges, soumission et temps GPU. Aucun objectif de performance ne devient une garantie sans appareil et scénario de référence. Voir [le protocole de benchmark](../research/rendering-and-performance.md#protocole-de-validation-et-de-benchmark).

## ADR-008 — Dimensions, topologie et génération

**Adopté.** `src/world/scale.ts` centralise la conversion 1 case = 1 m, les dimensions humaines et architecturales, la coupe des murs et les chunks de rendu de 16 cases. La caméra conserve un cadrage local indépendant de la taille du monde ; son angle initial d'environ 58° au-dessus du sol limite l'occultation des colons par les arbres, et reste librement orientable. Les lots par chunk permettent leur culling. Les ombres suivent le cadrage local. Ces choix ne transforment pas la grille plane en relief navigable.

`src/sim/generation.ts` produit des champs spatiaux déterministes, une rivière continue, des massifs et un couvert végétal corrélé. La validation examine topologie, densité et accès du départ, et non une simple image de seed 42. Voir [world-generation.md](world-generation.md). La sauvegarde conserve chaque case et ressource : changer le générateur ne modifie pas les anciennes parties. Le schéma de données est 2 ; une version explicite de générateur reste à ajouter et une graine seule ne rejoue pas un ancien algorithme.

Les nouveaux lits ont une empreinte orientée 1×2 partagée entre placement, inspection, accès au périmètre et rendu, via `footprintCells`. Les orientations 0/1/2/3 étendent la seconde cellule vers +z/+x/−z/−x. Les lits sont encore franchissables ; leur emprise interdit les constructions et stockages superposés. Les lits V1 conservent explicitement une emprise 1×1. Les meshes ne décident pas de l'occupation ; voir [les conventions spatiales](../research/spatial-design.md) et ADR-012.

## ADR-009 — Organisation de l'interface de référence

**Adopté, demande utilisateur.** Carte en fond, portraits en haut, ressources à gauche, alertes à droite, inspection en bas à gauche, onglets en bas, temps en bas à droite. `src/ui/layout.ts` définit le squelette et les catégories ; `main.ts` branche les commandes et snapshots. Architecte, Travail, Historique et Menu sont mutuellement exclusifs. Les domaines non livrés restent désactivés, à leur emplacement de référence. Le style est propre au projet.

Les données chargées (noms, journal) sont affichées avec `textContent` ; aucun HTML de sauvegarde n'est exécuté. Les boutons et raccourcis transmettent les mêmes commandes au worker. Les préférences de coupe des murs/feuillage sont visuelles. Sur petite fenêtre, les onglets défilent horizontalement. Les observations et limites de fidélité sont consignées dans [la référence visuelle](../research/visual-reference.md).

## ADR-010 — Laboratoire de navigation entièrement GPU

**Prototype validé, adoption par la simulation reportée.** `src/navigation-gpu/` implémente une propagation pondérée entière, la vérification de convergence et l'extraction des chemins en WGSL natif WebGPU. Le CPU soumet les passes et lit une sortie bornée ; l'oracle Dijkstra est utilisé uniquement pour vérifier. `@webgpu/types` 0.1.72 fournit les types, sans runtime additionnel. Le laboratoire `/navigation.html` a sa propre entrée de build et ne charge pas le renderer Three.js.

Les grilles portent une révision ; un résultat calculé sur une révision remplacée est périmé. Une limite d'itérations produit « indéterminé », pas une fausse destination inaccessible. Les budgets de mémoire et capacités de sortie sont explicites. Les mesures matérielles montrent un surcoût sur les petites requêtes et un intérêt potentiel pour des lots importants. Le comparateur Dijkstra n'est pas un A* de production.

La simulation conserve donc son BFS et ses réservations actuelles. Avant adoption : comparer une solution hiérarchique/A* à coût égal, mesurer avec rendu concurrent, intégrer les changements de terrain au tick, les obstacles mobiles, le choix des cases de travail, l'ordre d'adoption des résultats et la reprise de sauvegarde. Détails et données : [gpu-navigation.md](../research/gpu-navigation.md). Rust/WASM reste une alternative à mesurer sur cette frontière.

## ADR-011 — Adoption critique du référentiel utilisateur

**Adopté comme orientation, mise en œuvre par jalon.** Les trois documents reçus dans `docs/new_docs` sont la référence fonctionnelle principale. La [note d'adoption](../research/reference-adoption.md) distingue comportements sourcés, propositions et inconnues, puis les relie au calendrier unique [G0–G5](../ROADMAP.md). HTML et PDF contiennent le même rapport ; le classeur fournit contrats et critères, sans preuve d'exécution. Les sources de nombres sont à qualifier pour la version et les unités retenues.

Ils renforcent les frontières existantes : état autoritaire dans le worker, rendu observateur, identités stables, invariants et validation indépendante. Leur A* avec régions est une proposition de comparateur pour ADR-010. Leur découpage conceptuel ne justifie pas d'introduire d'avance tous les composants, un ECS générique ou C#/WASM. Les critères de mesure d'ADR-007 restent applicables ; conventions spatiales et organisation d'interface restent celles d'ADR-008/009.

**Contrats de G0 et état de réalisation :** le petit catalogue, la propriété des piles, les réservations de quantité/capacité, les transferts, les empreintes orientées et la migration sont livrés dans ADR-012. Les commandes et le fantôme partagent la validation de placement ; les diagnostics de travaux sont présents mais partiels. L'inventaire personnel, les conteneurs spécialisés, les cases de service réservées, les ordres forcés, le journal complet et les versions de contenu/générateur restent à réaliser. Le schéma 2 ne signifie pas que tous les contrats proposés sont couverts.

Avant G1, une décision séparée fixera les unités de temps/nutrition, leurs conversions et l'intégration des cadences. Les constantes du corpus ne sont pas compatibles par simple copie avec 10 Hz, 6 000 ticks/jour et des jauges en pourcentage. De même, séparer à terme RNG métier par domaine et RNG cosmétique demandera une version de règles et une preuve de continuation ; cette séparation n'est pas déjà livrée.

Traçabilité d'une évolution : chapitre et identifiant utile du classeur, décision motivée, état réel, scénario de validation et condition de réexamen. Les extensions restent après G5. Les erreurs de renvoi et annexes indisponibles sont consignées dans la note d'adoption ; les originaux sont préservés.

## ADR-012 — Boucle matérielle, reprise et budgets de planification

**Livré dans le schéma 2 ; consolidation G0 en cours.** Cette tranche réalise une partie d'ADR-011 à partir des chapitres 2/4/5/9/10/21/30/32 et SYS-005/020..022/041..061/113..117. Les objets possèdent une seule quantité autoritaire dans `World.piles`. Le petit catalogue immuable est limité aux matériaux et constructions utiles ; il ne devient pas un moteur de contenu générique.

Un colon a un travail ou une tâche de transport, jamais les deux simultanément. Les réservations sont dérivées des tâches sérialisées ; l'adoption vérifie source, quantité, accès et capacité ensemble. Les matériaux livrés survivent aux interruptions et une construction n'est exécutée qu'après approvisionnement. La progression historique V1 sans matériaux reste valide en attente. Les détails de reprise et de migration sont dans [simulation.md](simulation.md) et [material-logistics.md](material-logistics.md).

Le planificateur partage huit BFS et 32 768 couples source/destination examinés par tick. Des agrégats locaux évitent de recalculer chaque quantité pour chaque couple ; aucun tableau du produit complet piles × destinations n'est créé. Au-delà de cette fenêtre, `logisticsCursor` reprend le balayage de façon déterministe et persistante. Le classement porte alors sur les candidats vus : ce budget ne garantit ni meilleur choix global immédiat, ni durée murale constante. Des index persistants invalidés par événement restent une évolution à mesurer.

Les interprétations graphiques restent dans la présentation : lit 1×2 orienté, piles et réserves en lots par chunk, cargaisons interpolées avec les colons sur GPU. La physique de meshes ne décide pas d'un prélèvement ou dépôt. Les repas à distance, le sommeil sur place, le blocage immédiat des plans de murs et la congestion active limitée restent des écarts explicites dans [decisions.md](../gameplay/decisions.md).

La preuve combine conservation indépendante à chaque tick, deux agents partageant une pile, reprises aux frontières du portage, livraison partielle, interruptions/annulations et migrations V1. Les parcours navigateur et contrôles graphiques sont qualifiés séparément dans [validation.md](validation.md). Le benchmark schéma 2 inclut désormais transport et stockage : ses durées ne constituent pas un A/B du précédent benchmark de collecte à stock global.
