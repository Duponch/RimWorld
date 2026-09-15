# Validation courante — V36, lumière et ateliers

15 septembre 2026. [Contrat](work-environment.md), [recherche](../research/work-environment-reference.md), [état fonctionnel](../gameplay/implementation-status.md). Les preuves V35 et leurs limites graphiques sont conservées dans [l’archive toiture](../history/validation-v35-roofs.md).

## Simulation et intégration

La suite complète a passé : **116 tests, 38 fichiers, 118,65 s**. Elle comprend le pilote naturel de cinq à huit jours sur trois graines, conservation des matières, besoins et reprise exacte. Cinq contrôles ciblés supplémentaires ont passé après la revue des seuils des pièces ; le dernier lot de six tests (dont le pilote enrichi sur trois graines) a passé en 106,57 s, avec bords lumineux et migration des deux recettes. Les parcours existants de production ont passé dans Chromium natif : taille/construction/reprise 16,6 s ; cuisine 13,4 s ; conservation et refus atomiques 8,0 s.

Le nouveau parcours d’atelier construit un feu avec vingt bois réellement livrés, lit 80 % de production dans l’atelier couvert sombre puis 100 % avec lumière de service à 50 %, fabrique vingt blocs et recharge la sauvegarde. **Passé en 9,9 s** au dernier passage après retrait de l’ancien libellé « atelier extérieur », aucune erreur de page/console/WebGPU. Capture [atelier éclairé logique](../../artifacts/work-environment-ui.png), inspectée. Un premier essai n’avait pas ouvert l’inspection : fixture placée dans le coin, parcours de caméra/clic peu fiable. La fixture est recentrée et vise le côté de l’établi ; aucune règle de jeu ni assertion lumineuse n’a été relâchée.

Le contrôle du bord et des coins est enrichi dans l’oracle de lumière ; le bilan des postes du pilote inclut désormais taux et lumière de service. Le [parcours UI de trois jours](../../artifacts/colony-work-environment-three-days.json) a **passé en 6,5 minutes** sur WebGPU natif : 21 repas cuisinés, 18 ingestions, trois utilisateurs des lits, deux familles de loisirs, bois conservé et nourriture réconciliée, aucune erreur. Au dernier checkpoint : 28 toits, trois lits, table et trois tabourets, sept murs, feu, piquet, atelier et porte ; quinze blocs restants après un mur et trente acier incorporés à l’atelier. Ce parcours commence sur carte naturelle et n’injecte aucun matériau.

## Petit audit CPU

[Rapport brut](../../artifacts/work-environment-cpu.json), [reproduction](../../scripts/work-environment-bench.ts). Windows, **Ryzen 5 3600**, Node **24.11.1**, carte 250² synthétique, 3/30/100 artisans avec autant de feux. Trois fragments réels taillés par personne, produits déposés et reprise vérifiée. Aucun autre build/test lourd lancé par cet agent pendant la mesure. Préparation, inspection de validation et sérialisation sont hors mesure du tick ; premiers ticks inclus.

| Artisans | Blocs produits | Pic réellement au travail | Ticks | Tick p95 | Tick p99 | Maximum |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 180 | 3 | 674 | 0,461 ms | 3,552 ms | 15,191 ms |
| 30 | 1 800 | 30 | 677 | 6,237 ms | 13,312 ms | 21,353 ms |
| 100 | 6 000 | 100 | 708 | 12,408 ms | 20,537 ms | 25,559 ms |

La lecture d’un environnement inchangé avec cent feux est à **0,292 ms p95** sur 99 lectures après la première. Vingt changements d’état d’un feu provoquent vingt recombinaisons : **4,707 ms p95**, maximum **4,735 ms**, cent sources au plus. Le premier groupe inclut davantage de chauffe JIT ; les petites séries ne permettent pas de conclure à une variation causale entre populations. Le recalcul des sources est global pour cette première tranche, local dans son domaine de diffusion ; il n’est exécuté ni à chaque unité brûlée ni par personnage. Des pointes de planner persistent pendant les collectes/dépôts ; aucune promesse de fluidité parfaite ou de coût nul.

Le rendu 3D ne reçoit pas de nouvelle source GPU dans cette tranche. Le test natif vérifie la véritable interface, le worker et l’absence d’erreurs ; ce n’est pas un nouvel audit graphique à cent acteurs. Les percentiles graphiques V35 restent historiques et ne sont pas réétiquetés comme mesures V36.

## Compilation et documents

Build/typecheck : **183 modules**, worker **221,13 kB**, entrée graphique **1 071,47 kB / 300,63 kB gzip**. L’avertissement historique de bundle supérieur à 500 kB reste présent. Aucune dépendance ajoutée.

Liens locaux, index, décisions, inventaire, guide, calendrier unique et intégrité des trois originaux sont contrôlés avant commit. Reste à développer : autres métiers/déplacements sensibles à la lumière, halos 3D et intérieur en coupe, thermique, météo, toits naturels, dégâts et autres rôles/statistiques ; les systèmes G3–G5 restent ouverts.
