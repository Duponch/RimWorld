# Validation courante — V29, acier compacté

15 septembre 2026. G0 en consolidation, G1 partiel ; chaîne minière G2 en cours. [Contrat](steel.md), [recherche](../research/steel-reference.md), [preuves V28 et ombres](../history/validation-v28-mining-shadows.md).

## Simulation et continuité

94 scénarios distincts contrôlés par le [lot complet](../../artifacts/steel-simulation.json) et sa [reprise ciblée](../../artifacts/steel-simulation-recheck.json). Le premier lot en passe 89 ; quatre fixtures attendaient encore un numéro final V28 et le pilote supposait libre une case de stockage sur la graine 93. Après mise à jour des attentes et choix de cases admissibles, les douze scénarios concernés passent en 52,6 secondes. Les 89 autres résultats restent valides : aucune règle de simulation n’a été modifiée entre ces exécutions. Aucune garantie d’absence de tout bug.

Le scénario de minage couvre génération répétable, groupes connectés de 30–40, topologie/RNG conservés, dégâts persistants, saturation du dernier coup sans perte ni tirage consommé, 40 acier produits, transferts et reprise pendant portage, piles finales 75+5, destination incompatible, marche et migration stricte V28. Les contrôles de surface conservent positions, indices, buffers et absence d’actualisation graphique sur un simple dégât.

Le pilote joue huit jours sur la graine 42 et cinq sur 93/2048 : quatre cases de pierre puis deux d’acier, **80 acier rangés**, camp entretenu et bilans bois/aliments préservés. Aucun minerai ni stock injecté dans le scénario naturel.

## Navigateur et présentation

[Deux parcours natifs](../../artifacts/steel-ui.json), sans échec ni reprise automatique :

- Colonie naturelle 250² pendant trois jours, vraies commandes UI et worker, repas, couchages, culture, cuisine, réorganisation du camp, six cases extraites et 80 acier rangés ; sauvegardes quotidiennes exactes. **363,0 secondes**.
- Fixture compacte signalée : granite, reprise des dégâts, rangement du fragment, extraction/transport de 40 acier, compteur et sauvegarde/rechargement. **28,3 secondes**.

Les 19 mondes intermédiaires volumineux sont dans `tmp/steel-ui-checkpoints`, avec taille/hash dans le rapport suivi. Assertions et erreurs restent dans le rapport. Capture finale `artifacts/steel-ui.png` inspectée : pile d’acier, ressource à gauche et FPS visibles. PNG locaux non suivis par Git.

## Petit audit CPU

[Mesures brutes](../../artifacts/steel-cpu.json), Ryzen 5 3600, Windows, Node 24.11.1. Carte 250² ; 3/30/100 mineurs, chacun quatre gisements et un arbre dans une zone dégagée, milieu naturel autour. Trois répétitions de 1 200 ticks, 100 ticks de chauffe distincts ; encodage séparé toutes les cinq étapes, validation hors chronométrage. Charge différente des 500 ticks de pierre V28 : pas une comparaison contrôlée entre versions.

| Colons | Tick p95 / p99 / max, ms | Snapshot p95, ms | Résultat par répétition |
|---|---|---|---|
| 3 | 0,023 / 1,266 / 7,199 | 2,848 | 12 gisements, 480 acier |
| 30 | 3,876 / 7,897 / 22,227 | 4,062 | 120 gisements, 4 800 acier |
| 100 | 9,495 / 13,979 / 18,352 | 4,415 | 400 gisements, 16 000 acier |

Tous les travaux demandés terminés, zéro erreur d’invariant. Génération des graines 42/93/2048 : **68,7 / 64,4 / 60,6 ms**, avec 553/847/840 cases d’acier. Trois échantillons, sans prétention de percentile robuste ; densité du preset explicite. Snapshots et navigation restent à surveiller sous charge mixte prolongée.

## Audit graphique et correction de croissance

[Témoin initial](../../artifacts/steel-render-initial.json), [diagnostic des shaders](../../artifacts/steel-render-diff.json), [résultat final](../../artifacts/steel-render-final.json). Chromium natif WebGPU, AMD RDNA-1 (modèle exact non exposé), 1440×1000, même charge de 100 mineurs sur 250², vrai worker à 6×. Contrôles lourds exécutés séparément. La trace de comparaison des shaders est désactivée pour le relevé final.

Deux pipelines apparaissaient à la croissance 256→512 d’un lot de piles, avec un maximum de frame de 30 ms. Les attributs explicites de `BoxMesh` corrigent ce cas sans augmenter le nombre de lots, ni réserver une grande capacité sur toute la carte. Le relevé final retrouve cette croissance avec **zéro pipeline en jeu**, 400 extractions, 16 000 acier et géométries roche/sol conservées. **2 508 intervalles** : p95 **6,1 ms**, p99 **12 ms**, max **24 ms** ; coût CPU de frame p95 **5,0 ms**, max **8,1 ms**. Draw calls p95 **179**, maximum **185**, identiques au maximum initial. Zéro Long Animation Frame au-delà de 50 ms et zéro erreur GPU/console.

Adoption de snapshot p95 **10,5 ms**, callback complet p95 **13,8 ms**, max **16,7 ms** : coût toujours à surveiller. Préparation initiale **1 254,3 ms**, rechargement **195,2 ms** dans ce relevé ; ce sont des échantillons, dépendants des caches et du matériel. Pas de promesse de 60 FPS sans exception : le maximum dépasse encore 16,7 ms, ni de généralisation à tous les nouveaux matériaux.

[Deux contrats de rendu](../../artifacts/steel-render-contracts.json) passent après modification : rétention, restauration, croissance, bornes et surface rocheuse. Captures des gisements, extraction et camp naturel inspectées. Les essais intermédiaires sont conservés pour le diagnostic ; leurs hypothèses rejetées ne décrivent pas le moteur final.

[Six contrôles navigateur](../../artifacts/steel-render-ui.json), puis [reprise ciblée de deux](../../artifacts/steel-ui-recheck.json), désormais tous passants : repas/lits orientés, transport/réserves/reprise, frontières en **WebGL 2 réellement relevé**, rectangles 250², transitions 32/128/200/250 et minage d’acier natif. Le premier lot rencontre une attente ancienne sans priorité Minage et un timeout de 180 s : le pilote ouvrait le menu après adoption du snapshot, avant la fermeture des panneaux en fin de préparation. L’aide `panel` attend maintenant `.game-shell.inert=false`, sans délai arbitraire ni augmentation des timeouts. Les filtres attendus incluent acier/fragments/meubles. Les deux reprises passent ensemble en **24,2 s** ; aucune modification de gameplay pour satisfaire ces attentes.

Les premières sondes de croissance de buffer importaient un autre module Vite que l’instance active ; leurs tableaux `growths` vides ne prouvent donc pas l’absence de croissance. La sonde finale enveloppe l’instance du renderer réellement exécutée. `MINING_SHADER_DIFF=1` active seulement le diagnostic de sources ; conserver cette instrumentation lourde hors des relevés comparables.

## Construction et documentation

Build et typage réussis, 160 modules ; worker **191,51 kB**, entrée graphique **1 058,15 kB** (296,48 kB gzip). Aucune dépendance ajoutée. L’avertissement de taille du bundle demeure. Contrats, guide, inventaire, catalogue et calendrier G0–G5 actualisés ; les originaux restent conservés.

## Suite et limites

Acier extractible et stockable, pas encore constructif. Prochaine dépendance : recettes de chantier à plusieurs matériaux, puis atelier de taille et blocs. Portage à dix unités et rendement neutre explicites. Autres minerais, compétences/capacités/XP, dégâts externes, sols alternatifs, lissage, toits/effondrements absents ; le catalogue géologique n’est pas terminé.
