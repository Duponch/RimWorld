# Validation courante — V16, chantiers physiques

14 septembre 2026. G0 en consolidation, G1 partiel. Plans/cadres traversables, dégagement réel, livraison par Construction ou Transport, finition protégée et migration V15→V16. [Sources et adaptations](../research/construction-reference.md), [contrat](construction.md). Les [preuves V15](../history/validation-v15-recreation.md) restent historiques ; Construction n'est pas déclarée complète.

## Gameplay et continuité

[Bilan consolidé : 43 scénarios affectés](../../artifacts/construction-validation-summary.json), dernière observation réussie de chacun après lots successifs, et non exécution unique de toute la suite. Le lot regroupe construction, navigation/espace, simulation, désignations, repas, cuisine, régimes, horaires, fraîcheur, cultures, snapshots et pilote. Trois scénarios de chantier couvrent :

- 23 riz déplacés en trois portages ; type, âge et quantité conservés, annulation/rejeu en cargaison, cinq bois livrés puis incorporés au mur.
- Arbre/buisson dans un lit tourné ; coupe physique, priorité Construction malgré une collecte proche, rendement selon maturité et sauvegarde pendant la coupe. Transport seul approvisionne sans finir.
- Traversée et coût des plans/cadres, arête cardinale de 4,4 ticks sauvegardée, finition différée pendant un coin diagonal ou une place de repas réservée. Migration V15 stricte et refus des phases, roches et semis incohérents.

L'oracle indépendant sur 120 cartes comprend des cadres. Le pilote cœur joue cinq à huit jours sur trois cartes 250² avec camp, cultures, besoins, bilans et reprise quotidienne exacte. L'index d'obstacles par décision est comparé à la recherche directe. [Dernier contrôle du schéma, 3/3](../../artifacts/core-construction-schema-final.json).

[UI courte WebGPU, 6/6 en 53,5 s](../../artifacts/ui-construction-controls.json) : chantier sur pile, portage, cadre, sauvegardes, mouvement GPU, cuisine/conservation et loisirs via le vrai worker. Capture `construction-frame.png` inspectée : cadre et bois livrés visibles, riz déplacé, inspection Cadre, FPS permanent. [Frontière UI, 1/1 en 39,3 s](../../artifacts/ui-construction-boundaries-verified.json) : rendu logiciel, commandes répétées, plan sur colon sans déplacement, doublon refusé, annulation, sauvegarde invalide jamais adoptée, interface compacte et schéma V16.

[Partie UI de trois jours, 1/1 en 340,8 s](../../artifacts/ui-construction-journey.json) : nouvelle carte naturelle 250² graine 42, décisions et vitesse par l'interface, aucun stock ni saut de temps injecté. [Bilan](../../artifacts/colony-construction-three-days.json) : **3 lits, 1 table, 3 tabourets, 6 murs, 1 feu, 1 piquet, 15 cultures ; 21 repas fabriqués, 18 ingestions, trois colons observés au lit, deux loisirs pratiqués et un dégagement naturel de chantier**. Stock final 45 bois et 21 aliments, dont six repas simples ; aucun chantier ordinaire restant. Bilans bois/alimentation réconciliés, faim/repos positifs, rechargements quotidiens identiques. Les 19 checkpoints sont extraits vers tmp ; tailles, ticks et SHA-256 restent au rapport. Aucune erreur console/GPU.

La partie longue et le lot court précèdent le dernier resserrement des seuls refus de sauvegarde (roche/semis impossible). Les contrôles de corruption et la frontière worker repassent ensuite ; aucun changement de progression ne justifiait de refaire trois jours. Compilation : 111 modules, worker 122,05 ko, jeu 1 036,08 ko / 289,27 ko gzip ; avertissement connu du bundle >500 ko. Contrôles lourds successifs, sans édition de source/test/config pendant les parcours navigateur.

## Audit CPU

[Avant optimisation](../../artifacts/construction-bench-before.json), [premier relevé optimisé](../../artifacts/construction-bench.json), [relevé final](../../artifacts/construction-bench-final.json). Ryzen 5 3600, Node 24.11.1, carte 250² graine 42 ; deux passes de 300 ticks par population, sans préchauffage. Création, validation et agrégation hors mesure ; diagnostics de recherche inclus dans `stepWorld`. Besoins actifs, camps synthétiques combinant cuisine, combustible, champs, construction et stockage. Ce scénario n'est ni une partie ordinaire ni un test de milliers de plans impossibles.

| Colons | Médiane ms | p95 ms | p99 ms | Maximum ms | Repas / cultures / murs à 300 ticks |
|---:|---:|---:|---:|---:|---|
| 3 | 0,068 | 1,320 | 3,732 | 9,970 | 3 / 6 / 1 |
| 30 | 1,634 | 7,464 | 13,616 | 20,023 | 6 / 36 / 6 |
| 100 | 17,593 | 25,581 | 29,475 | 38,591 | 13 / 120 / 11 |

L'index de décision remplace les rescans de végétation pour chaque chantier candidat ; la vérification des personnes réutilise l'empreinte. Les mutations gardent une vérification directe. À cent colons, p95 **34,46 → 25,58 ms**, maximum **74,73 → 38,59 ms**. Empreintes diagnostiques, bilans et compteurs de recherche identiques aux trois populations ; ce n'est pas une preuve cryptographique de tous les états intermédiaires. Le premier relevé optimisé donnait p95 24,08 ms, variation à ne pas masquer.

À cent colons : 3 625 ticks-colons de cuisine, 7 315 de transport, 5 774 de culture, 3 193 de travaux et 2 338 de ravitaillement. Compteurs détaillés sur la dernière répétition ; percentiles sur les deux. Charge supérieure aux 16,67 ms/tick à ×6 : vitesse maximale non garantie. Navigation et vérifications répétées restent à profiler ; aucune règle n'est simplifiée pour améliorer la mesure.

## Rendu matériel

[Rapport final](../../artifacts/construction-render.json) : AMD RDNA1, Ryzen 5 3600, Chromium WebGPU natif, 1440×1000, worker à ×6. Par vue : 60 images d'échauffement, puis au moins 300 images et cinq secondes. RAF inclut l'ordonnancement ; CPU mesure la soumission, pas l'exécution GPU. Le champ worker répète son dernier indicateur, pas une distribution indépendante des ticks. Aucun contrôle lourd concurrent.

| Colons | Vue | Image p95 ms | p99 ms | Maximum ms | CPU p95 ms | Appels médians |
|---:|---|---:|---:|---:|---:|---:|
| 3 | Locale | 8,40 | 8,40 | 20,80 | 5,70 | 130 |
| 3 | Générale | 4,30 | 4,30 | 4,30 | 3,10 | 22 |
| 30 | Locale | 8,40 | 12,50 | 16,70 | 6,90 | 137 |
| 30 | Générale | 4,30 | 4,30 | 16,70 | 3,70 | 28 |
| 100 | Locale | 8,50 | 20,80 | 25,10 | 8,60 | 143 |
| 100 | Générale | 8,20 | 12,50 | 16,70 | 4,80 | 42 |

À cent colons, la fenêtre locale avance de 0 à 276 ticks ; elle finit avec 12 cadres, 8 murs et 12 bâtisseurs actifs. La vue générale avance de 357 à 662 ticks ; les 20 murs sont terminés et les cent colons observent le ciel. **Les phases n'ont donc pas la même activité**, même si le protocole et la carte sont communs ; ce n'est pas un A/B caméra à monde figé. Les 3/30 colons finissent également leur 1/6 mur. Les cases défrichées de cette fixture n'exercent pas la coupe massive d'arbres.

Aucune erreur console/GPU ; captures inspectées pour cadre, cargaisons, camp achevé et foule. Les cadres utilisent les lots de chantier existants, les poses restent GPU. Les maxima atteignent 25,1 ms et la barre de cent portraits déborde encore : ni fluidité parfaite ni UI de foule achevée. L'audit ne couvre pas encore raids, incendies, animaux ou colonies riches.

## Échecs diagnostiqués et portée

Les rapports intermédiaires restent conservés. [Premier lot](../../artifacts/core-construction-first.json) : trois attentes anciennes de plans bloquants/migration. [Lot élargi](../../artifacts/core-construction-final.json) : le pilote commandait une coupe sur un arbre déjà couvert par le plan qu'il venait de mettre en file ; il exclut désormais ces emprises. [Reprise réussie](../../artifacts/colony-construction-core.json).

[Après optimisation](../../artifacts/core-construction-optimized.json), la fixture de repas sans siège ne provoquait pas le trajet voulu ; corrigée pour exercer une vraie place debout réservée ([3/3](../../artifacts/core-construction-services.json)). [Corruption](../../artifacts/core-construction-validation.json) : la fixture de semis omettait sa zone, refusée avant le contrôle ciblé ; complétée, reprise 3/3. Les [deux](../../artifacts/ui-construction-boundaries.json) [premiers essais de frontière](../../artifacts/ui-construction-boundaries-final.json) échouaient sur le réveil licite du planner puis une assertion restée en V15 ; seul ce scénario est rejoué.

Tables achevées infranchissables, piles dégagées sous tous les meubles, plans sur réserves refusés, pas de poussée d'un civil immobile. Coûts/durées, qualité, compétences, support du sol, réparation, remplacement, minage et déconstruction restent partiels/absents. Prochain lot G0 : sélection multiple et ordres contextuels avec refus/réservations explicables. L'[inventaire complet](../gameplay/implementation-status.md) conserve les autres systèmes et centaines de contenus manquants.
