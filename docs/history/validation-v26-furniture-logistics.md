# Validation courante — V26, logistique des meubles

15 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](../development/furniture-logistics.md), [recherche fraîche](../research/furniture-logistics-reference.md), [preuves V25 archivées](../history/validation-v25-furniture-transfer.md).

## Simulation et sauvegardes

Le [lot complet](../../artifacts/furniture-logistics-simulation.json) passe **89/89 tests**, en environ 72,5 secondes, dont le pilote de colonie huit jours sur la graine 42 et cinq jours sur 93/2048 en 250². Le pilote retire désormais son piquet, attend son rangement en réserve puis le réinstalle ; les bilans et reprises restent vérifiés. Les références utilisateur originales ne sont pas modifiées.

Ce lot précède l'ajustement du dégagement local relevé dans le code de référence : la [reprise ciblée](../../artifacts/furniture-logistics-clearance.json) passe **12/12** et vérifie qu'une réserve distante n'impose pas de détour au dégagement. Après réutilisation des capacités pendant une décision, les [cinq scénarios du domaine](../../artifacts/furniture-logistics-cache-check.json) passent. Le [contrôle des files](../../artifacts/furniture-logistics-final-core.json) passe **12/12**, y compris conservation du fournisseur accepté après désactivation de Construction. Ces lots recouvrent des cas du lot complet ; ils ne s'additionnent pas en tests indépendants.

Cinq scénarios profonds du domaine : meuble entier et case exclusive contre les matériaux, concurrence et files, changement de filtre/suppression, réserve de même priorité et réserve supérieure, saturation et refus atomiques, dégagement de chantier/semis, coexistence sur table, réinstallation par Transport, préemption d'un rangement non prélevé, annulation sur la source et migration V25 stricte. Identités, attribution du lit, bilans et continuation sont contrôlés. Aucune couverture exhaustive de tous les bugs n'est annoncée.

Le [premier lot ciblé](../../artifacts/furniture-logistics-targeted.json), 9/11, a détecté deux attentes de fixtures : stock dérivé non recalculé après remplissage synthétique du sol, et ancien schéma attendu. La [reprise](../../artifacts/furniture-logistics-targeted-rerun.json), 12/13, a révélé un vrai refus de changement de filtre sur une destination de dégagement : le garde d'occupation précédait la libération conservatrice. Corrigé avant le lot complet. Les preuves d'échec sont conservées.

Compilation TypeScript/Vite réussie : **149 modules**, worker **182,19 ko**, bundle principal **1 051,94 ko / 294,47 ko gzip**, module partagé **40,88 ko**. Avertissement de bundle >500 ko inchangé ; aucune dépendance ajoutée.

## Interface et parcours de colonie

Le [premier lot navigateur](../../artifacts/furniture-logistics-ui.json) passe les deux parcours courts de meubles (9,5 et 12,1 secondes), mais la colonie dépasse 480 secondes au deuxième jour. Les huit checkpoints montrent le piquet correctement emballé et rangé ; le clic sélectionnait un colon superposé et attendait indéfiniment le bouton Installer. Ce n'était pas un arrêt du transport. Correction : cycle des colons vers l'inspection de cellule, borne explicite des clics et délai par défaut de dix secondes pour les actions du pilote. Le délai global n'a pas été augmenté.

Le [contrôle de sélection et d'ordres](../../artifacts/furniture-logistics-selection-ui.json) passe **6/6 en 70 secondes** : groupe, projections, maintien, dégagement, cuisine, files et reprise. Le [contrôle d'objet superposé](../../artifacts/furniture-logistics-overlap-ui.json) passe en **11,3 secondes** : paquet sous un colon et sur un piquet, bonne identité ciblée par Installer, annulation sur cette source, filtre/rangement forcé, reprise exacte en plein portage, réinstallation avec Construction désactivée. Le piquet reste en place. Les boutons Installer et Désinstaller vérifient séparément paquet et meuble présent.

Le [parcours final de trois jours](../../artifacts/furniture-logistics-journey.json) passe en **365 secondes**, sans erreur console/GPU. Dix-neuf checkpoints sont conservés sous forme compacte avec empreintes ; les mondes complets sont extraits dans `tmp`. Au tick 18 174 : trois lits, une table, trois tabourets, six murs, feu, piquet réinstallé et quinze cultures. Vingt et un repas cuisinés, dix-huit ingestions observées, trois utilisateurs de lits, deux loisirs ; stock final de 42 bois et 21 unités alimentaires, dont six repas simples. Aucun paquet ni chantier restant ; bilans bois/aliments réconciliés. Le piquet est retiré après le tick 6 140 puis son installation est demandée au tick 7 176, après constat du rangement effectif.

Les captures `artifacts/furniture-logistics-stored.png` et `artifacts/furniture-logistics-installed.png` montrent les paquets/meubles, l'inspection et l'organisation de l'interface. Les images ne constituent pas une mesure de FPS ; le compteur reste visible.

## Audit de simulation

[Avant réutilisation des capacités](../../artifacts/furniture-logistics-cpu-before-cache.json) et [après](../../artifacts/furniture-logistics-cpu.json), `scripts/furniture-logistics-bench.ts` : Ryzen 5 3600, Windows, Node 24.11.1, carte synthétique 250². Un paquet et une cellule de réserve par colon, quatre types de meubles, trois répétitions ; préchauffage séparé, puis phase active et 200 ticks après rangement par répétition. Commandes, validation et sauvegarde hors mesure, aucune suite lourde simultanée.

| Colons | Ticks actifs | Médiane active | p95 actif | p99 actif | Maximum actif | p95 après rangement |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 90 | 0,241 ms | 1,531 ms | 7,149 ms | 7,149 ms | 0,041 ms |
| 30 | 153 | 0,487 ms | 7,968 ms | 13,696 ms | 16,364 ms | 0,239 ms |
| 100 | 138 | 6,593 ms | 20,187 ms | 25,761 ms | 31,156 ms | 1,657 ms |

À cent colons, le premier p95 actif était 124,812 ms, maximum 168,432 ms. Les mêmes destinations étaient revérifiées pour chaque source ; leur résultat est désormais partagé seulement dans une décision synchrone puis abandonné avant la réservation suivante. Tous les essais rangent tous les paquets avec identités et bois conservés. Le rejet rapide des réserves déjà satisfaites évite également une navigation inutile. Ces chiffres ne remplacent pas une colonie mixte avec tous ses besoins ; aucun FPS n'est déduit du temps CPU de simulation.

## Audit graphique natif

[Capture du rendu](../../artifacts/furniture-logistics-render-current.json), commande `node scripts/furniture-transfer-render-bench.mjs current logistics` : Chromium natif, backend WebGPU, AMD RDNA 1 (modèle exact non relevé), même CPU, 1 440×1 000. Cent transporteurs et cent paquets, worker réel à ×6 ; soixante images de préchauffage et soixante après rangement. Instrumentation des méthodes de présentation, sans sérialisation du monde pendant la mesure.

230 intervalles : médiane **8,3 ms**, p95 **16,7 ms**, p99 **50 ms**, maximum **58,3 ms**. Travail CPU par image : p95 **8,4 ms**, maximum **11,4 ms**. Au plus **162 draw calls**, **103 421 triangles**, reconstruction du mobilier ≤0,3 ms et adoption du snapshot ≤1,2 ms. Aucun appel synchrone createRenderPipeline observé pendant cette fenêtre ; ce crochet ne mesure pas tous les chemins asynchrones du pilote. Cent paquets rangés, aucune erreur console/GPU.

Les champs historiques `removed`/`removalFrames` du banc indiquent ici les changements signés de propriétaire au sol, pas la destruction d'objets. Il n'y a pas de comparaison graphique avant/après à scénario identique. **Des pointes de frame restent présentes** ; la fluidité parfaite n'est pas acquise. Cette capture brève ne mesure ni timestamps GPU ni VRAM. Les lots GPU restent résidents et il n'y a pas de squelette CPU par personnage.

## Portée et suite

Rangement filtré et forcé, dégagement local, réinstallation par Transport et accès aux contenus superposés sont livrés pour quatre meubles. Catalogue, propriétés physiques, filtres détaillés et étagères restent partiels ou absents. Minage et chaîne de la pierre viennent ensuite selon [ROADMAP](../ROADMAP.md). Voir l'[inventaire](../gameplay/implementation-status.md) pour tous les grands systèmes manquants.

Contrôle documentaire : 91 documents, liens/fragments valides et trois originaux inchangés octet pour octet. Les preuves V25 sont archivées et les contrats courants sont actualisés.
