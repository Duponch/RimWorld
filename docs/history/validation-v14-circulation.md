# Validation courante — V14, passage civil

14 septembre 2026. Consolidation G0, G1 encore partiel. Les colons civils peuvent se croiser sans pousser un voisin ou considérer son corps comme un mur. Les réservations d'utilisation des lits, places de repas et postes de cuisine restent exclusives. [Recherche récente, versions et certitude](../research/civil-traffic-reference.md), [contrat spatial et migration](../development/spatial-motion-storage.md). Aucun objet ajouté ; aucune collision hostile livrée.

## Contrats et scénarios

Le [lot cœur final, 36/36](../../artifacts/core-civil-traffic-final.json), regroupe espace/navigation, simulation, repas, cuisine, régimes, horaires, conservation, cultures, snapshots et pilote de colonie. Le scénario spatial enrichi exerce un couloir d'une case : deux colons échangent leurs lits en traversant un dormeur, puis deux transporteurs se croisent avec des cargaisons opposées. Il vérifie chaque tick, les quantités, les arêtes à durée géométrique, l'absence de déplacement forcé, les destinations et la continuation exacte depuis une sauvegarde prise pendant le croisement. Une variante de cuisine vérifie qu'un effondrement au sol n'acquiert pas le poste du cuisinier ; une réservation dupliquée est rejetée. Les oracles spatiaux, coins solides, replans lors d'un mur nouveau et bilans de matière restent exercés.

La migration valide d'abord les positions/arêtes exclusives de V13, puis change la version sans réécrire positions, trajets actifs, tâches, profils, stocks ou état aléatoire. Une sauvegarde V13 déjà corrompue par un chevauchement reste refusée. La poursuite V14 adopte le passage civil : une égalité future avec la simulation V13 n'est ni attendue ni revendiquée. Le rejeu V14 après chargement est exact aux checkpoints testés.

Le [lot navigateur, 6/6 en 382,5 s](../../artifacts/ui-civil-traffic-final.json), utilise Chromium WebGPU natif et le vrai worker : croisement/sauvegarde/rechargement, vitesse et orientation GPU, cuisine, régimes, conservation et parcours de trois jours. Le test de couloir observe une cellule partagée au tick 2013, recharge ce monde, puis atteint les trois lits exclusifs au tick 2040 sans erreur console/GPU. Il utilise une fixture synthétique, contrairement au parcours ordinaire suivant.

Le [joueur UI de trois jours](../../artifacts/colony-civil-traffic-three-days.json) part d'une nouvelle carte 250² graine 42 et agit par les commandes de l'interface : 3 lits, 1 table, 3 tabourets, 6 murs, 1 feu et 15 cultures. Résultat : **21 repas cuisinés, 18 prises alimentaires, 3 dormeurs observés dans leur lit**, stocks finaux de 47 bois et 21 unités alimentaires, dont 6 repas simples. Le bois est conservé et le bilan alimentaire réconcilié avec récoltes, recettes et ingestions. Les sauvegardes quotidiennes rechargent exactement ; aucun chantier ordinaire en attente à la fin. Les 19 checkpoints ont été déplacés dans tmp, leurs tailles/SHA-256/ticks restent dans le rapport. Les relevés quotidiens ne capturent aucune cellule partagée : ce n'est pas une preuve de croisement, celui-ci est assuré par le scénario dédié. Le pilote cœur développe aussi le camp pendant cinq à huit jours sur trois graines.

Compilation réussie : 99 modules, worker 109,24 ko, jeu 1 032,92 ko / 288,11 ko gzip. Avertissement connu de bundle supérieur à 500 ko. Tests, compilation et audits lourds exécutés successivement ; aucune modification de source pendant la suite navigateur. Ce lot n'est pas une exécution de toutes les suites du dépôt ni une garantie exhaustive de fidélité au jeu commercial.

## Simulation sous charge

[Mesures CPU](../../artifacts/civil-traffic-bench.json) : Ryzen 5 3600, Node 24.11.1, carte 250² graine 42, camps synthétiques et besoins actifs ; cuisine, transport, construction, culture et combustible. Deux passes de 300 ticks, sans préchauffage. Setup, validation et agrégation hors mesure ; collecte des compteurs dans le tick. Percentiles sur 600 ticks, bilans ci-dessous pour la dernière passe de 300 ticks.

| Colons | Médiane ms | p95 ms | p99 ms | Maximum ms | Repas / murs / cultures |
|---:|---:|---:|---:|---:|---|
| 3 | 0.017 | 1.204 | 3.777 | 7.765 | 3 / 1 / 6 |
| 30 | 1.058 | 5.808 | 13.029 | 15.141 | 8 / 6 / 36 |
| 100 | 14.629 | 20.726 | 26.345 | 31.377 | 16 / 17 / 120 |

Le [relevé V13 précédent](../../artifacts/navigation-access-after.json) donnait un p95 de 21,59 ms à cent colons ; le présent 20,73 ms ne constitue pas un gain isolé de l'algorithme. Les règles de passage et l'avancement ont changé : 16 repas et 17 murs contre 12 et 16 précédemment. Les invariants de matière et l'état final sont valides. Le p95 reste supérieur à 16,67 ms, budget d'un tick à 60 ticks/seconde en vitesse ×6. Les grandes recherches d'accès restent un coût ouvert ; aucune garantie de simulation accélérée constante à cent personnes. Deux passes et leurs maxima restent sensibles au JIT/GC et à la machine.

## Rendu matériel

[Audit WebGPU](../../artifacts/civil-traffic-render.json) : AMD RDNA1, Ryzen 5 3600, Chromium natif, 1440×1000, mêmes camps synthétiques, worker à ×6. Chaque phase suit 60 images d'échauffement, puis au moins 300 images et cinq secondes. Les vues sont successives et les tâches se terminent : ce sont des observations de charge, pas un comparatif caméra à état identique.

| Colons | Vue | Image p95 ms | p99 ms | Maximum ms | Soumission CPU p95 ms | Appels médians | Ticks |
|---:|---|---:|---:|---:|---:|---:|---|
| 3 | Locale | 8.40 | 8.40 | 16.60 | 6.30 | 130 | 12 → 311 |
| 3 | Carte entière | 4.30 | 4.30 | 8.40 | 3.90 | 22 | 366 → 662 |
| 30 | Locale | 8.40 | 12.50 | 16.70 | 7.30 | 136 | 13 → 317 |
| 30 | Carte entière | 4.30 | 8.30 | 20.80 | 4.10 | 28 | 361 → 662 |
| 100 | Locale | 8.60 | 20.70 | 29.20 | 8.10 | 143 | 0 → 308 |
| 100 | Carte entière | 4.30 | 8.40 | 16.60 | 4.30 | 42 | 374 → 668 |

Aucune erreur console/GPU, états de fin valides. À cent colons, 22 tâches actives à la fin de la phase locale, zéro à la fin de la vue générale : ne pas attribuer sa meilleure mesure au seul zoom. Les intervalles RAF comprennent l'ordonnancement, la soumission CPU ne mesure pas l'exécution GPU ; les temps worker publiés peuvent être répétés sur plusieurs images. Le compteur FPS ne certifie pas une vitesse de simulation constante. Le p99 local à cent atteint 20,7 ms et le maximum 29,2 ms : des images longues subsistent.

Captures du croisement, du camp de trois jours et des deux vues à cent inspectées : FPS, objets portés et décor visibles. **Limite 3D assumée : des corps peuvent s'interpénétrer, voire rester superposés lorsque des activités civiles partagent une case.** Aucun évitement visuel ni décalage physique inventé ; sélection individuelle possible par portraits. À cent personnes, les portraits dépassent la largeur visible, gestion de grands groupes encore partielle. Aucun nouveau mesh, calcul par image ou coût GPU de séparation ajouté par cette étape.

## Documentation et suite

Guide joueur, inventaire, contrat spatial, besoins, architecture, migration, ADR-030, adoption du corpus et ROADMAP actualisés. Contrôle documentaire réussi : 62 documents, 632 liens locaux, 25 domaines et cinq familles ; les trois originaux sont byte-identiques. Aucun contenu du catalogue ajouté. Prochaine tranche proposée : loisirs physiques, variété et tolérance en G1 ; G2–G5 restent ouverts selon la ROADMAP, et les collisions de combat attendent G3.

- [Étape précédente — navigation et accès](../history/validation-navigation-access.md)
- [V13 — régimes](../history/validation-v13-regimes.md)
- [V12 — horaires](../history/validation-v12-horaires.md)
- [V11 — conservation](../history/validation-v11-conservation.md)
- [Inventaire complet du gameplay livré, partiel et absent](../gameplay/implementation-status.md)
