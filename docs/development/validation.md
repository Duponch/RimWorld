# Validation courante — V32, production de blocs de pierre

15 septembre 2026. G0 en consolidation, G1 partiel ; chaîne pierre G2 en cours. [Contrat](stonecutting.md), [recherche](../research/stonecutting-reference.md), [preuves V31 archivées](../history/validation-v31-stonecutter.md).

## Simulation et continuité

**89 scénarios distincts passants**, union des lots [initial](../../artifacts/stonecutting-focused.json), [frontières communes](../../artifacts/stonecutting-suite.json), [colonie et matériaux](../../artifacts/stonecutting-colony.json) et [lot final de 50 scénarios](../../artifacts/stonecutting-final-core.json). Ces lots se recouvrent ; leurs totaux ne s'additionnent pas. Les premiers passages ont révélé un propriétaire au sol contenant des champs de zone, une attente de schéma périmée, une commande de fixture dont le type était écrasé et un atelier manuel sans factures. Corrections et reprises réussies ; aucun échec restant sur ces scénarios. Les tests ne constituent pas une couverture exhaustive.

Trois scénarios profonds de taille couvrent les cinq transformations physiques, filtre/rayon, phases reprises après sauvegarde, réservation concurrente du fragment et du poste, métier désactivé après ordre accepté, annulation conservative, factures conservées avec le meuble emballé, anciennes sauvegardes strictement validées, destinations saturées et sortie partielle 7+13. Une réserve inaccessible de haute priorité ne bloque pas une autre destination ; une réserve accessible plus loin garde sa priorité devant celle qui est proche. Le compteur général compte tous les blocs malgré un filtre d'ingrédients limité. Traversée à coût 1,4 local, absence de non-répétition et arrêt sur une pile contrôlés.

Le pilote joue **huit jours sur la graine 42, cinq sur 93 et 2048**, cartes naturelles 250². Il récolte, construit, cultive, cuisine, dort, joue, extrait l'acier et prépare son atelier sans don de matière. Bilan acier : **80 extraits = 30 incorporés + 50 rangés**. Il poursuit le minage jusqu'à obtenir un fragment utilisable, puis fabrique et range au moins vingt blocs par une facture réelle. Bilans, besoins et continuation quotidienne identiques ; aucun résultat aléatoire de fragment forcé pour satisfaire le scénario.

## Interface réelle et inspection visuelle

[Trois parcours finaux WebGPU natif](../../artifacts/stonecutting-ui-final.json), sans arguments de rendu logiciel hérités :

- Colonie naturelle trois jours : **369,815 s**, camp entretenu, atelier construit, vingt blocs stockés, rechargements quotidiens cohérents. Dix-neuf checkpoints complets extraits dans `tmp/stonecutting-ui-final-checkpoints` ; tailles et SHA-256 conservés dans le rapport suivi.
- Taille : **9,524 s**, colonne Artisanat, cinq filtres, inspection latérale de l'atelier, ordre contextuel, transport réel, sauvegarde pendant travail, vingt blocs de marbre rangés et fragment de granite conservé. Compteur de cible et FPS vérifiés.
- Cuisine existante : **10,468 s**, construction, facture, ingrédients portés, reprise et repas rangés. Un premier passage échouait sur une formulation de diagnostic changée ; la formulation du repas a été rétablie et le parcours rejoué avec succès. [Rapport intermédiaire conservé](../../artifacts/stonecutting-ui.json).

Aucune erreur console/GPU dans les trois parcours finaux. Captures locales `stonecutting-ui.png`, `stonecutting-render-100.png` et `colony-three-days.png` inspectées : blocs visibles, organisation UI et FPS conservés. La colonie atteint le début du jour 4 avec vingt blocs et cinquante aciers en réserve. Une capture ne remplace pas une mesure de fluidité.

## Audit CPU et optimisation

Windows, Ryzen 5 3600, Node 24.11.1. Carte dégagée 250², 3/30/100 artisans, un atelier et trois fragments par personne, besoins actifs. Trois répétitions de 1 100 ticks, sans chauffe excluant les premières affectations ; création, validation et agrégation des diagnostics hors chronométrage, collecte des compteurs de recherche incluse. Les noms historiques `cooked` et `activePawnTicks.cook` désignent ici l'exécuteur commun de fabrication, pas la cuisine de repas.

Le [témoin initial](../../artifacts/stonecutting-bench.json) à cent artisans donnait p95 **17,4435 ms**, p99 **32,2624 ms**, max **49,4636 ms**. Le profil CPU a identifié la recherche de réserve et ses calculs répétés de capacité et d'accès. L'évaluation des candidats à la demande, avec parcours de connectivité partagé pendant la décision, donne dans le [témoin optimisé](../../artifacts/stonecutting-bench-optimized.json) p95 **7,0269 ms**, p99 **9,8307 ms**, max **18,8911 ms**. Les empreintes finales de ces deux témoins sont identiques pour chaque population : gain sans changement de résultat dans cette comparaison.

Après ajout du coût Core de passage sur les blocs, [mesure du code final](../../artifacts/stonecutting-bench-final.json) :

| Artisans | Tick p95 / p99 / max, ms | Blocs obtenus | Empreinte finale |
|---|---|---:|---|
| 3 | 0,0279 / 0,3345 / 9,7341 | 180 | `0e3a0645` |
| 30 | 0,2117 / 5,8333 / 16,0238 | 1 800 | `45d1a4da` |
| 100 | 7,1411 / 10,5001 / 22,0633 | 6 000 | `3adc972b` |

Le coût de passage change légitimement les trajets temporels et donc les empreintes par rapport aux deux témoins précédents. La conservation fragment→blocs reste vérifiée à chaque répétition. Ce scénario d'ateliers homogènes n'évalue pas toutes les futures charges mixtes ni le coût GPU.

## Audit WebGPU natif

[Rapport complet](../../artifacts/stonecutting-render.json), Chromium natif, adaptateur AMD `rdna-1`, modèle précis non exposé, même CPU, viewport 1440×1000. Cent artisans, carte dégagée 250², worker à ×6 ; 90 frames de chauffe, aucun banc CPU lourd simultané. Trois cents opérations terminées, **6 000 blocs**, aucun fragment restant. Les champs historiques `mined`/`excavations` de l'outil partagé représentent les achèvements de recette dans ce mode explicite.

1 935 intervalles mesurés : p50 **6 ms**, p95 **6,1 ms**, p99 **12 ms**, max **18 ms**. Soumission CPU du rendu p95 6,5 ms, max 8,6 ; adoption du World p95 1,5 ms, max 1,7 ; callback complet de snapshot p95 5,4 ms, max 6,2. Draw calls p95 359, max 360, terrain et passes compris. Zéro erreur console/GPU, compilation tardive, croissance de capacité ou long animation frame signalé. Géométrie et buffers de terrain/roche stables ; les blocs rejoignent les lots existants.

Scène synthétique sans forêt : aucune garantie universelle de fluidité, de charge naturelle équivalente ou de performances sur un autre matériel. Aucun chronométrage GPU matériel n'est revendiqué.

## Build, documentation et suite

Build et typage réussis : 167 modules, worker 200,91 kB, entrée graphique 1 062,10 kB / 297,75 kB gzip. Aucune dépendance ajoutée ; avertissement de bundle supérieur à 500 kB conservé. Contrats, guide, catalogue, inventaire, migrations et ROADMAP actualisés ; originaux préservés et liens contrôlés.

**Production et stockage des cinq blocs livrés ; utilisation constructive encore absente.** Prochain lot : constructions en pierre, puis habitat G2. Factures individuelles par roche, lumière fonctionnelle, compétences/capacités, pièces/toits, climat variable, qualité, santé/combat et autres systèmes restent ouverts dans l'[inventaire](../gameplay/implementation-status.md). Le facteur extérieur fixe ne constitue pas une simulation complète de la vitesse de travail Core.
