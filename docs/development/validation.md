# Validation courante — V34, portes manuelles

15 septembre 2026. G0 en consolidation, G1 partiel, premiers usages d'habitat G2. [Contrat des portes](doors.md), [recherche](../research/doors-reference.md), [preuves V33 archivées](../history/validation-v33-stone-buildings.md).

## Simulation, navigation et reprise

**108 tests passants, aucun échec dans le lot final** : [rapport complet](../../artifacts/doors-core.json), 38 suites rapportées. Les premiers lots ciblés puis le [pilote enrichi](../../artifacts/doors-colony.json) ont guidé les corrections ; leurs tests se recouvrent et ne s'additionnent pas. Le premier rapport a révélé deux attentes de fixture incorrectes (un dépôt proche d'une porte interdite n'est pas nécessairement sur elle ; une fermeture peut précéder l'arrivée au lit) et un champ `door` manquant dans le résumé de colonie. Corrections ciblées puis succès ; aucune couverture exhaustive revendiquée.

Trois scénarios profonds : sept variantes construites avec livraisons exactes, manque d'une unité, non-réinstallation et récupération ; seuil temporel, passages simultanés, interdiction après engagement, sortie physique, blocage par objet, maintien puis réarmement ; lit accessible par couloir, sauvegarde pendant ouverture, coins et vue des fers à cheval. Construction sur pile conservée et porte ouverte vérifiées. V33 migrée strictement ; états futurs, temporisations et empreintes invalides refusés. L'oracle indépendant sur 120 petites cartes intègre portes fermées/ouvertes/interdites. Le scénario de rétention passe aussi 300 portes, agrandissement, transitions et retrait sans renouveler matériau ou allocation résidente.

Le pilote naturel développe son camp **huit jours sur 42, cinq sur 93 et 2048**, cartes 250². Une porte en bois est ajoutée après la première journée. Sept murs (dont un en pierre), trois lits, table/tabourets, feu, loisirs, riz et atelier sont conservés. Blocs **40 produits = 5 incorporés + 35 rangés**, acier **80 = 30 atelier + 50 rangés**. Bilans alimentaires, sommeil, loisirs et continuation quotidienne passent.

## Interface native

[Parcours porte](../../artifacts/doors-ui.json) : **1 test passant**, 19,43 s environ, Chromium WebGPU natif, viewport 1440×1000, sans arguments SwiftShader. Construction d'une porte en granite via Architecte, sauvegarde en cours d'ouverture, franchissement, maintien et interdiction par inspection ; aucun message d'erreur GPU/console. Capture inspectée. Le compteur FPS reste visible.

[Parcours de trois jours par la vraie interface](../../artifacts/doors-journey.json) : **1 test passant en 375,13 s**, 146 décisions, 19 points de contrôle, aucune erreur. Sept murs, une porte, trois lits, table et trois tabourets, feu, piquet, atelier et quinze cultures ; 21 repas cuisinés, 18 repas observés, trois dormeurs identifiés. Bilans bois/aliments et trois reprises quotidiennes validés. Au troisième jour, 20 blocs produits = 5 dans le mur + 15 rangés ; le pilote désigne réellement un nouveau minage pour compléter la réserve, puis vérifie sa sauvegarde. Les commandes et sauvegardes restent celles du joueur, sans injection de ressources. Les snapshots volumineux sont conservés localement hors Git, avec empreintes dans le rapport compact.

## Audit de charge

[CPU](../../artifacts/doors-cpu.json) : Ryzen 5 3600, Node 24.11.1, carte 250² dégagée. Chaque colon construit une porte à 25 bois dans une petite enceinte, coupe l'arbre intérieur puis range ses 12 bois dehors. Besoins actifs, une exécution par population, échauffement séparé de 100 ticks, snapshots chaque cinq ticks, validation hors chronométrage. La première borne 1 600 ticks était trop courte à 100 colons : progression mesurée jusqu'à achèvement, puis borne finale 3 200, sans modification des règles.

| Colons | Tick p95 / p99 / max (ms) | Snapshot p95 (ms) | Résultat |
|---|---|---|---|
| 3 | 1,633 / 3,088 / 4,038 | 0,531 | 3 portes, 36 bois rangés, 251 ticks |
| 30 | 16,251 / 25,232 / 30,887 | 2,055 | 30 portes, 360 bois rangés, 251 ticks |
| 100 | 32,768 / 54,561 / 102,243 | 0,510 | 100 portes, 1 200 bois rangés, 2 621 ticks |

**Budget CPU à améliorer à forte charge.** Les pointes ne sont pas masquées par une moyenne ni assimilées aux FPS. Le [profil échantillonné](../../artifacts/doors-profile.json) charge surtout accès, sortie/arrêt du mobilier et capacité de dépôt. Son exécution instrumentée dure environ 41 s ; les temps attribués aux fonctions peuvent inclure du code optimisé/inliné et ne prouvent pas une cause exclusive. Prochain lot : indexer/éviter les requêtes répétées observées, avec comparaisons de continuation avant/après. Pas de cache persistant sans invalidation explicite.

[Rendu natif](../../artifacts/doors-render.json), même CPU, adaptateur AMD `rdna-1` (modèle non exposé), 1440×1000, worker 6×, 100 colons et 1 500 murs présents au départ. Les 100 portes sont réellement construites après échauffement de 90 images. **7 412 intervalles**, p95 **6,1 ms**, p99 **12 ms**, max **24,1 ms** ; coût CPU du rendu p95 **3,4 ms**, adoption p95 **4 ms**. **350 transitions**, buffers de vantaux conservés, **aucune création de pipeline natif pendant la mesure**, aucune erreur ; 1 200 bois rangés. Jusqu'à 86 draw calls pour toute la scène et ses passes. Ce terrain synthétique ne mesure pas une forêt naturelle ni tous les angles/équipements ; pas de promesse universelle de fluidité.

## Build et documentation

Typage/build réussis : 175 modules, worker 206,90 kB, entrée graphique 1 067,57 kB / 299,30 kB gzip. Aucune dépendance ajoutée ; avertissement historique du bundle supérieur à 500 kB maintenu. Contrats, guide, catalogue, inventaire, plan, recherche et règles de reprise actualisés. Les trois originaux restent inchangés.

**Jouable :** portes manuelles des sept matériaux, attente réelle, autorisations, blocage et déconstruction. **Absents :** remplacement direct, portes automatiques, sons, HP/réparation/feu, permissions de factions, pièces/toits/thermique ; grands systèmes et catalogue incomplet restent dans l'[inventaire](../gameplay/implementation-status.md). Le prochain lot traite les pointes CPU relevées avant de poursuivre l'habitat.
