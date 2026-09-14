# Décisions — presentation

Décisions datées à lire avec le [contrat actuel](../development/architecture.md). Les contrats plus récents remplacent les passages explicitement historiques.

## ADR-003 — Three.js WebGPURenderer et TSL

**Adopté.** Three 0.186.0, Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.0, Playwright 1.63.0 et types Three 0.186.0 : tags npm stables vérifiés le 13 septembre 2026, puis versions exactes installées et verrouillées. Node local : 24.11.1. Aucun tag flottant `latest` à l'exécution.

L'import `three` est redirigé exactement vers `three/webgpu` pour éviter deux instances avec les addons. Les graphes de matériaux sont construits une fois. Le backend réel est diagnostiqué après initialisation ; un repli WebGL 2 est possible pour les fonctions présentes. Les futures passes compute seront activées selon capacités et n'auront pas une parité supposée sur tous les backends. Voir [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer) et [TSL](https://threejs.org/docs/TSL.html).

## ADR-004 — Animation GPU, simulation CPU

**Adopté pour les placeholders.** Un rig de six segments rigides, un poids par sommet, pivots de bind et articulation TSL remplace les personnages. La simulation transmet position et état ; aucune hiérarchie d'os n'est animée sur CPU à chaque image. L'interpolation visuelle n'influence ni collision, ni faim, ni réservation.

**Prévu pour les glTF.** Pré-échantillonner des clips dans un atlas d'os ; comparer palette compute partagée et skinning vertex. Les animaux peuvent bénéficier de VAT. L'audit Antsystem démontre un pipeline VAT préparé sur CPU au chargement puis exploité GPU, et non un moteur universel de squelettes entièrement évalués sur GPU. Les décisions détaillées, limites de normales, LOD et ombres sont dans [la recherche de rendu](../research/rendering-and-performance.md).

## ADR-008 — Dimensions, topologie et génération

**Adopté.** `src/world/scale.ts` centralise la conversion 1 case = 1 m, les dimensions humaines et architecturales, la coupe des murs et les chunks de rendu de 16 cases. La caméra conserve un cadrage local indépendant de la taille du monde ; son angle initial d'environ 58° au-dessus du sol limite l'occultation des colons par les arbres, et reste librement orientable. Les lots par chunk permettent leur culling. Les ombres suivent le cadrage local. Ces choix ne transforment pas la grille plane en relief navigable.

`src/sim/generation.ts` produit des champs spatiaux déterministes, une rivière continue, des massifs et un couvert végétal corrélé. La validation examine topologie, densité et accès du départ, et non une simple image de seed 42. Voir [world-generation.md](../development/world-generation.md). La sauvegarde conserve chaque case et ressource : changer le générateur ne modifie pas les anciennes parties. Le schéma de données est 2 ; une version explicite de générateur reste à ajouter et une graine seule ne rejoue pas un ancien algorithme.

Les nouveaux lits ont une empreinte orientée 1×2 partagée entre placement, inspection, accès au périmètre et rendu, via `footprintCells`. Les orientations 0/1/2/3 étendent la seconde cellule vers +z/+x/−z/−x. Les lits sont encore franchissables ; leur emprise interdit les constructions et stockages superposés. Les lits V1 conservent explicitement une emprise 1×1. Les meshes ne décident pas de l'occupation ; voir [les conventions spatiales](../research/spatial-design.md) et ADR-012.

## ADR-009 — Organisation de l'interface de référence

**Adopté, demande utilisateur.** Carte en fond, portraits en haut, ressources à gauche, alertes à droite, inspection en bas à gauche, onglets en bas, temps en bas à droite. `src/ui/layout.ts` définit le squelette et les catégories ; `main.ts` branche les commandes et snapshots. Architecte, Travail, Historique et Menu sont mutuellement exclusifs. Les domaines non livrés restent désactivés, à leur emplacement de référence. Le style est propre au projet.

Les données chargées (noms, journal) sont affichées avec `textContent` ; aucun HTML de sauvegarde n'est exécuté. Les boutons et raccourcis transmettent les mêmes commandes au worker. Les préférences de coupe des murs/feuillage sont visuelles. Sur petite fenêtre, les onglets défilent horizontalement. Les observations et limites de fidélité sont consignées dans [la référence visuelle](../research/visual-reference.md).

## ADR-010 — Laboratoire de navigation entièrement GPU

**Prototype validé, adoption par la simulation reportée.** `src/navigation-gpu/` implémente une propagation pondérée entière, la vérification de convergence et l'extraction des chemins en WGSL natif WebGPU. Le CPU soumet les passes et lit une sortie bornée ; l'oracle Dijkstra est utilisé uniquement pour vérifier. `@webgpu/types` 0.1.72 fournit les types, sans runtime additionnel. Le laboratoire `/navigation.html` a sa propre entrée de build et ne charge pas le renderer Three.js.

Les grilles portent une révision ; un résultat calculé sur une révision remplacée est périmé. Une limite d'itérations produit « indéterminé », pas une fausse destination inaccessible. Les budgets de mémoire et capacités de sortie sont explicites. Les mesures matérielles montrent un surcoût sur les petites requêtes et un intérêt potentiel pour des lots importants. Le comparateur Dijkstra n'est pas un A* de production.

La simulation conserve donc son BFS et ses réservations actuelles. Avant adoption : comparer une solution hiérarchique/A* à coût égal, mesurer avec rendu concurrent, intégrer les changements de terrain au tick, les obstacles mobiles, le choix des cases de travail, l'ordre d'adoption des résultats et la reprise de sauvegarde. Détails et données : [gpu-navigation.md](../research/gpu-navigation.md). Rust/WASM reste une alternative à mesurer sur cette frontière.

## ADR-013 — Cartes 250² et publications de monde incrémentales

**Adopté.** Le défaut jouable passe de 64² à 250², soit 62 500 cellules et 15,26 fois la surface précédente. Le choix 200² offre une carte plus petite ; 64²/128² restent disponibles pour les parties compactes. `src/sim/map-config.ts` centralise les dimensions. La résolution reste d'une cellule par mètre et les volumes 3D conservent leurs proportions. Les sauvegardes existantes, notamment 32², gardent chaque case et chaque identité ; cette extension des dimensions acceptées ne transforme pas les données du schéma 2. Comparaison et provenance : [spatial-design.md](../research/spatial-design.md) ; portée mesurée : [map-scale.md](../history/map-scale-v2.md).

Cette décision adopte les contrats de grille, d'indépendance du rendu et de caches reconstruisibles des chapitres 5/21/29/30 du corpus, notamment SYS-020..022/113..117/172..181. Le chapitre 5 présente 32²/64² comme tailles de fixtures, pas comme choix officiels du jeu. Le transport incrémental est notre adaptation technique : il ne change ni l'ordre des commandes, ni les règles de navigation, ni les sauvegardes. Les recherches entièrement GPU restent dans leur laboratoire tant que leurs conditions d'intégration ne sont pas satisfaites.

`SnapshotEncoder` conserve dans le worker les dernières valeurs de terrain et de ressources publiées. Il compare les valeurs pour détecter une modification même si la simulation a muté un tableau sur place. Un delta contient l'état dynamique complet, les cellules modifiées et les ressources ajoutées/modifiées/retirées. Une liste d'ordre n'est transmise que si suppressions et ajouts en fin ne suffisent pas à reproduire l'ordre exact. Initialisation et chargement créent un nouvel `epoch`, y compris avec une taille, une graine et des IDs identiques. Chaque publication porte une révision ; un delta doit suivre exactement sa révision de base.

`SnapshotDecoder` reconstitue un `World` dont terrain et ressources conservent leur référence tant qu'ils sont inchangés. Une modification remplace le tableau concerné ; les tableaux et objets du snapshot précédent ne sont jamais modifiés. Les consommateurs les traitent comme des données en lecture seule. Le renderer exploite ces identités pour éviter de parcourir la carte à chaque publication, puis compare les contenus des chunks lorsque les ressources changent. La façade de test ne clone le monde qu'au moment de sa lecture explicite ; l'interface utilise directement le snapshot reçu.

Un message ancien est ignoré. Une révision manquante, une taille incohérente ou un patch invalide déclenche une demande de checkpoint ; le rejet ne modifie ni l'état ni sa révision. Le worker répond à cette demande dans la même séquence que les commandes, avec une nouvelle révision du même epoch. Ce mécanisme répare un consommateur sans état de base ; il ne redémarre pas un worker planté. L'API publique expose `onSnapshot(world, stepMs, speed, replaced)` : `replaced` est vrai à l'adoption d'un nouvel epoch, faux pour les deltas et les checkpoints de resynchronisation du même epoch. Le renderer peut ainsi réinitialiser l'interpolation des personnages lors d'un chargement, même si terrain et IDs sont identiques, sans reconstruire inutilement leurs géométries. Chaque commande garde sa réponse.

**Coûts et limites.** Le microbenchmark Node conservé dans [map-bridge-benchmark.json](../../artifacts/map-bridge-benchmark.json) compare le clone complet à l'encodage, au clone et à l'adoption d'un delta sur le même monde. À 250²/seed 42/trois colons, les médianes sont 48,67 ms et 0,714 ms sur Ryzen 5 3600. Ce sont des durées Node `structuredClone`, sans IPC navigateur, DOM ou GPU. Le scan d'encodage reste proportionnel aux cellules et ressources ; les tableaux dynamiques restent transmis intégralement. Génération, préparation des géométries, checkpoint initial/chargement et sauvegarde complète ne deviennent pas incrémentaux. Le compteur `stepMs` mesure les ticks de simulation, pas ces coûts. Le protocole de mesure et le scénario de reconstruction sont dans [testing.md](../development/testing.md) ; aucune garantie globale de FPS ne se déduit de ce microbenchmark.

## ADR-017 — Ressources graphiques conservées pendant les actions

Décision du 13 septembre 2026 : la disparition d'une ressource retire ses indices du lot existant ; elle ne reconstruit plus les sommets des voisins. Le mobilier, les piles, les réserves et les marqueurs de travaux utilisent des lots instanciés persistants et des matériaux partagés. La croissance de capacité est géométrique et distincte de la variation de quantité active. `ResourceLayer`, `StaticGeometry` et `BoxBatches` portent ces responsabilités ; la scène garde caméra et interactions. [Diagnostic, protocole et limites](../development/render-lifecycle.md).

Le champ de quantité n'entre pas dans une clé de pipeline reconstruite à chaque tick. Le progrès de collecte, qui ne modifie pas son marqueur, n'invalide plus ce marqueur. La reconstruction locale reste permise à l'ajout/déplacement d'une ressource et la remise à zéro complète au changement de carte. Le propriétaire final libère géométries et matériaux partagés ; les groupes enfants ne les détruisent pas isolément. Le rendu demeure sans autorité sur les règles ni les sauvegardes, qui restent en schéma 4.

Le pilote de partie est du code de test, hors application : il lit un état observable, retourne des commandes puis laisse le moteur les exécuter. Le même plan de décisions peut piloter le noyau ou les contrôles du navigateur. Il ne crée aucune API de triche en production et ne change pas l'horloge pour écourter les journées.

## ADR-019 — Arêtes temporisées, sol unique et vue distante

Adopté le 13 septembre 2026, schéma 6. [Contrat et recherche](../development/spatial-motion-storage.md). `work-planner` sépare le choix des tâches de leur exécution ; `work-release` prépare les dépôts des annulations, `ground-placement` gère capacité et voisinage. La recherche CPU pondérée emploie une file de Dial. Les arêtes physiques gardent leur durée euclidienne et leur reliquat fractionnaire.

Le worker conserve un historique de présentation distinct des sauvegardes. `MotionTimeline` avance à vitesse fixe et `PawnLayer` interpole les arêtes sur GPU, avec une horloge recentrée ; corps et cargaison partagent la pose. Les vitesses ne dépendent plus de la cadence des snapshots. L’orientation de travail vient de sa cible.

`TerrainLayer` isole les géométries du sol. `OverviewLayer` garde les silhouettes instanciées et un terrain fusionné pour le dézoom. Hystérésis et buffers résidents évitent un chantier de reconstruction au zoom. Coût assumé : mémoire supplémentaire ; ombres distantes simplifiées. Les anciens algorithmes et mesures consignés dans les ADR précédents restent historiques.

## ADR-020 — Surfaces rocheuses et croissance par intégrale

V7 : [contrat](../development/rocks-and-plants.md). RockSurface calcule les coins partagés ; RockLayer garde les buffers et deux listes d'indices selon le cadrage. Les modifications de terrain restent distinctes des nouvelles cartes. Aucune autorité de simulation n'est transférée au mesh.

Plants calcule la croissance depuis un checkpoint sérialisé et l'intégrale des ticks favorables du preset fixe. Le rendu des fruits et le codec conservent leurs identités. Une future variation du climat doit clôturer cette intégrale avant de changer les facteurs. Cette décision économise les mutations par tick, sans représenter un climat déjà implémenté.

## ADR-021 — Caméra et ciel séparés de la simulation

[Contrat](../development/daylight-camera.md), [recherche fraîche](../research/environment-review.md). `CameraRig` isole projection, échelle, contrôles et seuil de détail ; `daylight.ts` et `DayNightLayer` isolent l’échantillonnage du temps et les uniformes du ciel. `ColonyRenderer` coordonne ces couches au lieu de grossir son code de caméra. Une seule lumière directionnelle et un atlas d’ombres sont réutilisés. Le rendu n’ajoute aucun état au World ; schéma 7 inchangé.

La présentation utilise le temps confirmé de MotionTimeline, pas la phase d’animation recentrée des personnages. Le ciel clair fixe et sa palette sont une adaptation 3D assumée. Lumière de gameplay, température et météo devront appartenir au moteur ; les valeurs visuelles ne seront jamais lues pour décider de la croissance, du déplacement ou d’un tir. Le futur contexte de site exigera une migration explicite.

Les variantes de projection/LOD sont précompilées sous l'écran initial. La caméra d'ombres conserve sa résolution ; le benchmark a conduit à corriger le premier dézoom, sans appliquer une réduction de qualité non validée.


## ADR-022 — Culture, intégrale lumineuse et lots séparés

V8 : [contrat](../development/farming.md), [recherche](../research/farming-reference.md). La simulation possède les zones, leur curseur de découverte bornée et la lumière naturelle du preset sérialisé. Les travaux automatiques utilisent les réservations ordinaires ; une association explicite les distingue des ordres du joueur. Le module Farming porte ces règles, le moteur conserve l’orchestration. L’intégrale lumineuse périodique remplace la fenêtre binaire après migration conservatrice de la croissance acquise.

Le riz a son propre lot GPU à emplacements réutilisables. Les couches forêt et vue distante l’ignorent. Les zones n’ont que des contours, sans matérialiser un mesh par case. Le rendu lit les mêmes checkpoints de croissance sans les modifier. Cette première espèce ne clôture pas l’agriculture : les dépendances absentes restent listées dans le contrat.


