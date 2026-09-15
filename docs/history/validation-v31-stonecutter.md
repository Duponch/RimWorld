# Validation historique — V31, atelier de taille à ingrédients mixtes

15 septembre 2026. G0 en consolidation, G1 partiel ; chaîne pierre G2 en cours. [Contrat](../development/stonecutter.md), [recherche](../research/stonecutter-reference.md), [preuves V30 archivées](../history/validation-v30-materials.md).

## Simulation et continuité

**68 scénarios distincts passants**, union des lots : [construction/transferts](../../artifacts/stonebench-focused.json), [pilote et frontières communes](../../artifacts/stonebench-suite.json), [reprise des deux scénarios de circulation](../../artifacts/stonebench-travel.json), [19 scénarios supplémentaires de sauvegardes/snapshots/plantes/ordres](../../artifacts/stonebench-boundaries.json). Les lots se recouvrent ; leurs totaux ne s'additionnent pas. Deux échecs intermédiaires dans le scénario de circulation venaient d'une référence de fixture ajoutée hors de sa boucle ; corrigés puis rejoués. Aucun échec restant dans ces contrats.

Deux scénarios profonds enrichissent construction-matériaux : deux fournisseurs simultanés, manque d'une unité empêchant la finition, agrégation de 105 acier en exigence unique et livraison en piles 75+30, présence alimentaire conservée sous l'atelier, zone retirée, annulation pendant portage, reprise au-delà de 119 de progression, rotation, paquet porté/reposé, restauration de l'identité, déconstruction typée. Saturation du sol : deux remboursements de types différents ne réservent pas la même cellule, refus sans mutation ni tirage consommé. Anciens schémas et matériau manquant refusés. L'oracle dirigé inclut les trois cellules et quatre orientations.

Le pilote joue **huit jours sur la graine 42, cinq sur 93 et 2048**, cartes naturelles 250². Il prépare son atelier avec du bois récolté et l'acier extrait : **80 acier = 30 incorporés + 50 rangés**. Camp, riz, nourriture, sommeil, loisirs, réorganisation et six extractions restent cohérents. Bilans et continuation quotidienne identiques. Aucune augmentation artificielle des stocks initiaux ; aucune affirmation de couverture exhaustive.

## Interface réelle et inspection visuelle

- [Colonie naturelle trois jours](../../artifacts/stonebench-ui.json) : **362,968 s**, réussie au premier passage, sans erreurs console/GPU ; atelier construit, stocks entretenus et rechargements quotidiens identiques. Dix-neuf checkpoints complets conservés dans `tmp/stonebench-ui-checkpoints`, tailles et SHA-256 dans le rapport suivi.
- Le parcours court initial lisait le plan avant de l'observer. Correction du parcours : rendre la cellule visible, placer le focus clavier sur le canvas et attendre l'acquittement visible du plan. [Reprise réussie](../../artifacts/stonebench-ui-recheck.json). Ce passage héritait des arguments de rendu logiciel du runner ; il ne prouve pas les performances natives.
- L'inspection de sa capture a repéré une étiquette erronée « 1×1 ». La description utilise maintenant les dimensions de l'empreinte tournée. [Parcours final WebGPU natif](../../artifacts/stonebench-ui-native.json), arguments logiciels explicitement retirés : **12,687 s**, choix 75 bois + 30 acier / 105 acier, rotation 1×3, sauvegarde pendant un travail supérieur à 119, finition, réinstallation 3×1, matériau/identité et compteur FPS vérifiés. Zéro erreur console/GPU.

Captures locales `stonebench-ui.png`, `colony-three-days.png` et `stonebench-render-100.png` inspectées : dimensions correctes, matériaux visuellement distincts, plateau à hauteur de travail et organisation UI conservée. Ces images ne remplacent pas des mesures de FPS. La longue colonie n'a pas été répétée pour la seule correction du libellé.

## Audit CPU et snapshots

[Données brutes](../../artifacts/stonebench-cpu.json). Windows, Ryzen 5 3600, Node 24.11.1. Carte dégagée 250², 3/30/100 bâtisseurs ; un atelier chacun, alternance bois + acier / acier seul. Onze livraisons au minimum par atelier, vrais transports puis construction. Trois répétitions jusqu'à achèvement, borne 3 000 ticks, 100 ticks de chauffe distincts. Snapshots toutes les cinq étapes, validation hors chronométrage.

| Colons | Tick p95 / p99 / max, ms | Snapshot p95, ms | Résultat de chaque répétition |
|---|---|---:|---|
| 3 | 1,064 / 2,179 / 15,509 | 0,428 | 3 ateliers en 475 ticks ; 150 bois + 165 acier |
| 30 | 5,667 / 8,964 / 18,139 | 0,378 | 30 ateliers en 876 ticks ; 1 125 bois + 2 025 acier |
| 100 | 13,025 / 16,332 / 22,776 | 0,406 | 100 ateliers en 1 287 ticks ; 3 750 bois + 6 750 acier |

Les trois répétitions atteignent les mêmes résultats matériels. Ce workload est plus long que mur + tabouret V30 ; pas de comparaison présentée comme un gain ou une régression à comportement identique. Le coût du planner reste à surveiller avec la future fabrication.

## Audit WebGPU natif

[Rapport complet](../../artifacts/stonebench-render.json), Chromium natif, adaptateur AMD `rdna-1`, modèle précis non exposé, même CPU, viewport 1440×1000. Cent bâtisseurs, carte dégagée 250² et worker à ×6 ; vue élargie, 90 frames de chauffe. Aucun autre banc lourd simultané. Les noms internes d'événements de minage de l'outil partagé représentent ici des **achèvements d'ateliers**, comme indiqué dans le protocole.

3 335 intervalles mesurés : p50 **6 ms**, p95 **12 ms**, p99 **18 ms**, max **24 ms**. Soumission CPU du rendu p95 7,4 ms ; adoption de World p95 2,1 ms, callback complet de snapshot p95 6,1 ms. Draw calls p95 383, max 387, terrain et passes compris : aucun appel individuel par nouvel atelier. Cent ateliers achevés, zéro erreur GPU/console, zéro compilation de pipeline pendant la mesure, zéro long animation frame signalée. Le lot de mobilier passe de 256 à 512, 1 024 puis 2 048 instances sans compilation tardive. Géométrie/buffers de roche et objets de terrain conservent leurs identités.

Scène synthétique sans forêt : ces chiffres ne garantissent pas toute la carte naturelle, tous les matériels ou les futurs ateliers actifs. L'éclairage des menus et les besoins de cent personnes après la fenêtre de construction ne sont pas évalués par cette mesure.

## Build, documentation et suite

Build/typage réussis : 164 modules, worker 195,65 kB, entrée graphique 1 061,07 kB / 297,45 kB gzip. Aucune dépendance ajoutée ; avertissement de bundle supérieur à 500 kB conservé. Contrats, guide, catalogue, inventaire et ROADMAP actualisés ; originaux byte-identiques et liens contrôlés.

**Production de blocs encore absente** : le prochain lot ajoute métier, ingrédients, travail et produits typés à l'atelier. Recherche, pièces/toits, lumière fonctionnelle des postes, climat variable, qualité, compétences, santé/combat et autres grands systèmes restent détaillés dans l'[inventaire](../gameplay/implementation-status.md). Un bâtiment construit n'est pas une filière de production terminée.
