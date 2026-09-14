# Validation courante — V25, meubles conservés

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](../development/furniture-transfer.md), [recherche fraîche](../research/furniture-transfer-reference.md), [preuves historiques V24](validation-v24-deconstruction.md).

## Simulation et sauvegardes

Le [lot cœur initial](../../artifacts/furniture-transfer-core.json) passe **79/84 tests dans 29 fichiers**. Les cinq échecs sont des attentes de fixtures lors de la migration : trois états attendus n'incluaient pas encore `packed: []` et deux bilans de bois avaient été changés par erreur de 24 à 25 en actualisant le numéro de schéma. Le [lot corrigé](../../artifacts/furniture-transfer-core-corrected.json) passe **16/16** et couvre ces cinq cas. Les 84 cas distincts ont donc passé entre ces exécutions ; cela ne constitue pas un nouveau lancement complet à 84/84.

Le [premier lot ciblé](../../artifacts/furniture-transfer-targeted.json) avait révélé deux défauts réels : cible de trajet ne prenant pas l'empreinte du meuble et attribution de lit supprimée pendant son emballage. Ils ont été corrigés avant le lot cœur ci-dessus ; [reprise ciblée](../../artifacts/furniture-transfer-corrected.json). La relecture de la chaîne de référence a ensuite retiré une durée de pose déduite à tort du WorkTotal d'inspection. Les tests corrigés et le navigateur exercent cette pose finale.

Quatre scénarios profonds : identité et bois conservés, retrait/prise/interruption/dépôt/rotation/pose, sauvegarde et snapshots exacts, source utilisée, rotation sur place, saturation et refus atomiques, paquets/identités/cibles corrompus, migration V24 stricte. L'annulation depuis la source et les rectangles a été reprise avec déconstruction et désignation : [9/9](../../artifacts/furniture-transfer-final-core.json). Les bornes de l'empreinte emballée et états impossibles de sauvegarde sont couverts par le [dernier contrôle ciblé, 4/4](../../artifacts/furniture-transfer-save-final.json). Ces contrôles ne prétendent pas couvrir tous les bugs.

Le pilote cœur joue huit jours sur la graine 42 et cinq jours sur 93/2048, en 250². Il inclut désormais le bois des meubles emballés et réinstalle son piquet après le premier jour. Ces parcours ont passé dans le lot initial ; la partie UI ci-dessous vérifie aussi le déroulement après correction de la durée de pose.

Compilation TypeScript/Vite : 144 modules, worker 174,83 ko, bundle principal 1 051,05 ko / 294,21 ko gzip, module partagé 40,37 ko. Une annotation de type du validateur a été corrigée après un échec de compilation ; la compilation suivante passe. Avertissement de bundle >500 ko maintenu ; aucune dépendance ajoutée.

## Interface et trois jours de colonie

Deux lots initiaux ont été arrêtés après dépassement du délai de démarrage de 15 secondes. Le diagnostic court retrouve WebGPU matériel AMD et l'interface, sans erreur JavaScript/GPU. Les reprises réussissent sans rallonger ce délai ; cause exacte de cette lenteur transitoire non attribuée.

Le [parcours dédié initial](../../artifacts/furniture-transfer-ui-final.json) passe en 15,4 secondes : lit tourné, sauvegarde en plein portage, reprise exacte, désinstallation puis installation d'un piquet. Le [parcours final](../../artifacts/furniture-transfer-ui-corrected.json), enrichi de l'annulation depuis la source, passe en 14,2 secondes. Captures `artifacts/furniture-carried.png` et `artifacts/furniture-installed.png` inspectées : cargaison procédurale, plan, meuble reposé et compteur FPS présents. Les FPS instantanés ne sont pas un benchmark.

Le [lot long et commandes](../../artifacts/furniture-transfer-journey.json) passe **7/7 en 7,5 minutes**, dont environ 6,1 minutes pour la colonie de trois jours. Aucun échec ni erreur console/GPU. Dix-neuf checkpoints avec empreintes sont conservés dans le rapport compact ; les mondes complets restent dans `tmp`.

Au tick 18 145 : trois lits, une table, trois tabourets, six murs, feu, piquet déplacé et quinze cultures ; 21 repas cuisinés, 18 ingestions observées, trois utilisateurs de lits, deux loisirs observés. Stock final : 42 bois et 21 unités alimentaires, dont six repas simples. Bilans réconciliés, aucun paquet ou chantier de construction restant. Ce lot précède la correction limitée à l'annulation sur source et aux refus de données invalides ; les contrôles dédiés suivants couvrent ces changements.

## Audit CPU

[Mesure reproductible](../../artifacts/furniture-transfer-cpu.json), `scripts/furniture-transfer-bench.ts` : Ryzen 5 3600, Windows, Node 24.11.1, carte synthétique 250², quatre types de meubles, une réinstallation par colon. Trois répétitions de 500 ticks, préchauffage séparé de 100 ticks ; commandes/setup/validation hors mesure, sans autre suite lourde simultanée.

| Colons | Ticks actifs | Médiane active | p95 actif | p99 actif | Maximum actif |
|---|---:|---:|---:|---:|---:|
| 3 | 90 | 0,050 ms | 1,408 ms | 4,631 ms | 4,631 ms |
| 30 | 150 | 0,898 ms | 10,298 ms | 20,687 ms | 20,836 ms |
| 100 | 126 | 6,204 ms | 15,458 ms | 21,048 ms | 21,501 ms |

Chaque répétition installe tous les meubles et conserve le bois et les identités. Le rapport donne aussi la fenêtre entière, qui comporte des ticks inactifs, et les ticks de changement de propriétaire. Ce scénario bref isole cette opération ; il ne remplace pas l'audit mixte V23 dont les pointes de planner restent ouvertes. Aucun chiffre de FPS n'en est déduit.

## Audit de présentation

[Capture WebGPU](../../artifacts/furniture-transfer-render-current.json), `scripts/furniture-transfer-render-bench.mjs` : Chromium natif, AMD RDNA 1 (modèle exact non relevé), même CPU, fenêtre 1 440×1 000, cent meubles et cent bâtisseurs, worker réel à ×6, soixante images de préchauffage puis soixante images après achèvement. Pas de sérialisation du monde pendant la mesure.

Sur 181 intervalles : médiane **8,3 ms**, p95 **20,8 ms**, p99 **58,3 ms**, maximum **100,1 ms**. Travail CPU par image : p95 **9,1 ms**, maximum **10,8 ms**. Au plus **164 draw calls** et 108 413 triangles ; reconstruction du mobilier ≤0,9 ms, marqueurs ≤0,5 ms et adoption du snapshot ≤2,6 ms. Une création de pipeline observée. Les cent meubles sont installés, aucun paquet/intention restant, aucune erreur console/GPU.

Les paquets au sol et portés réutilisent les lots existants, avec deux volumes procéduraux ; pas de squelette CPU individuel ni de scène par colon. Il ne s'agit pas d'une comparaison avant/après identique : aucun gain global ni coût nul n'est déduit. **Des saccades restent présentes**, dont un intervalle de 100 ms hors des retraits. Cette capture unique ne mesure ni temps GPU par timestamps, ni VRAM. Continuer l'attribution des pointes et les audits de charge mixte aux prochains changements significatifs.

## Portée et documentation

Quatre meubles déplaçables, identité/propriété/portage/reprise ; pas de nouveau catalogue. Transport seul, rangement en réserve et dégagement automatiques des paquets restent partiels/absents, puis viennent minage et chaîne de la pierre. [Inventaire complet](../gameplay/implementation-status.md) et [plan](../ROADMAP.md) restent les références sur les nombreux autres systèmes manquants.

Contrôle documentaire : 88 documents ; liens et fragments vérifiés, trois originaux préservés octet pour octet. Les preuves V24 sont archivées ; les contrats courants et le schéma sont actualisés, sans transformer les statuts du corpus en validation locale.
