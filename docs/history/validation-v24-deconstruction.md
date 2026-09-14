# Validation courante — V24, déconstruction

14 septembre 2026. G0 en consolidation, G1 partiel. [Contrat](../development/deconstruction.md), [recherche et adaptations](../research/deconstruction-reference.md). Les [preuves V23](validation-v23-priority.md) restent historiques, notamment leur charge mixte à cent colons.

## Simulation et continuité

Le [lot complet initial](../../artifacts/deconstruction-core.json) passe **79 tests sur 80, dans 31 fichiers**. L’unique échec provenait d’une attente ancienne : un simple plan de mur était supposé détourner un trajet, alors que les plans sont franchissables depuis V16. Le scénario conserve ses vérifications de terrain et de replay, avec cette attente corrigée. Une relecture a également corrigé le chemin rapide du planner : la déconstruction doit précéder la récolte lorsque Construction a la priorité. Le [lot ciblé après correction](../../artifacts/deconstruction-corrected.json) passe **16/16**, incluant déconstruction, construction, maintien prioritaire, génération et pilote de colonie. Les 80 cas distincts ont donc passé entre ces exécutions ; il ne s’agit pas d’un nouveau lancement complet à 80/80.

Quatre nouveaux scénarios profonds vérifient file/annulation/interruption, ordre des fournisseurs, empreintes tournées, arrondis pairs et impairs, sol saturé, budget d’identités, réservations de lit/siège/piquet/feu, repas déjà tenu lors du retrait d’une table, combustible historique, restitution sans duplication, migration stricte et replay/snapshots. Le premier [essai ciblé](../../artifacts/deconstruction-targeted.json) avait aussi révélé une fixture alimentaire au-delà de sa limite de pile ; elle a été corrigée avant les lots ci-dessus.

Le pilote cœur joue huit jours sur la graine 42 et cinq jours sur 93/2048, cartes 250². Il ajoute un pan temporaire puis le déconstruit après la première journée, avec bilan du bois incluant les pertes, ouverture du passage, construction du camp, cultures, ingestions, lits, loisirs et reprises quotidiennes. Les modifications ultérieures concernent présentation et barrière de chargement, sans changement du moteur de simulation.

Compilation finale TypeScript/Vite réussie : 139 modules, worker 163,77 ko, bundle jeu 1 048,39 ko / 293,23 ko gzip. Avertissement de bundle >500 ko conservé ; aucune dépendance ajoutée.

## Interface et partie de trois jours

Le premier lot navigateur passe six parcours sur sept. La [partie de trois jours](../../artifacts/deconstruction-journey.json) réussit en environ six minutes, sans erreur console/GPU, avec reprises quotidiennes. Au tick 18 049 : trois lits, une table, trois tabourets, six murs, feu, piquet et quinze cultures ; 21 repas cuisinés, 18 ingestions, trois utilisateurs de lits, deux loisirs observés. 43 bois et 22 unités alimentaires dont six repas ; bilans réconciliés. Le septième mur temporaire du premier jour a bien été retiré ensuite. Le rapport compact conserve les décisions, résultats et empreintes des 19 checkpoints ; les volumineux snapshots restent locaux. Ce parcours long précède la correction du chemin rapide et la préparation graphique finale ; le pilote cœur et les parcours courts ont été rejoués ensuite.

L’échec initial du nouveau parcours provenait du helper de rectangle, qui interprétait toute action comme une zone agricole. Après sa correction, la préparation graphique a révélé une transition réelle : la simulation chargée était disponible avant la fin des opérations UI, autorisant des clics trop tôt. Les interactions de la coque sont maintenant suspendues pendant chargement/création et préparation ; elles sont restaurées dans le bloc de finalisation. Le lot intermédiaire devenu invalide a été arrêté, sans attendre ses timeouts successifs.

Le [lot natif final](../../artifacts/deconstruction-ui-final.json) passe **6/6 en 79,3 secondes**, sans test instable : Architecte → rectangle de retrait, annulation par la seconde cellule du lit, priorité directe, sauvegarde et reprise, puis trois retraits avant la récolte moins prioritaire. Un lit reste, les dix-sept bois restitués sont physiques, l’arbre voisin conserve ses douze unités ; replay cœur et nouveau chargement vérifiés. Les cinq autres parcours couvrent maintien de chantier, cuisine, services, files et logistique. Captures `artifacts/deconstruction-orders.png` et `artifacts/deconstruction-result.png` inspectées : marqueurs, inspection, matériaux et compteur FPS présents. Leurs FPS instantanés ne servent pas de benchmark.

## Audit CPU avec beaucoup de colons

[Rapport reproductible](../../artifacts/deconstruction-cpu.json), `scripts/deconstruction-bench.ts` : Ryzen 5 3600, Node 24.11.1, Windows ; terrain synthétique 250², un bâtiment à retirer et un arbre par colon. Trois répétitions de 500 ticks, préchauffage séparé de 100 ticks ; commandes, setup et validation hors mesure. Pas de compilation ou de navigateur lourd concurrent.

| Colons | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0,008 ms | 0,104 ms | 2,051 ms | 14,070 ms |
| 30 | 0,026 ms | 3,057 ms | 7,482 ms | 35,500 ms |
| 100 | 0,121 ms | 5,954 ms | 15,619 ms | 26,947 ms |

Tous les retraits et abattages se terminent, bilans valides. À cent, les seuls ticks comportant un retrait représentent 165 échantillons : p95 11,394 ms, p99 17,695 ms, maximum 18,768 ms. La fenêtre globale comporte aussi des ticks inactifs après achèvement. Ce relevé isole cette opération ; il ne remplace pas la charge mixte V23 dont le p95 de 40,443 ms reste un problème ouvert. Il ne mesure ni les FPS ni le GPU.

## Audit de présentation et optimisation retenue

`scripts/deconstruction-render-bench.mjs` utilise Chromium normal, WebGPU matériel AMD RDNA 1 (modèle exact non relevé), Ryzen 5 3600, fenêtre 1 440×1 000, cent colons, cent retraits et cent arbres, vrai worker à ×6. Soixante images de préchauffage puis une courte capture de l’activité avec soixante images de fin ; aucune sérialisation du monde dans la mesure. Les résultats ci-dessous sont des captures exploratoires comparables, pas des statistiques répétées sur plusieurs machines.

| Mesure | [Avant réservation des lots](../../artifacts/deconstruction-render-current.json) | [Lots résidents, retenu](../../artifacts/deconstruction-render-resident.json) |
|---|---:|---:|
| Images mesurées | 198 | 228 |
| Intervalle entre images, p95 / maximum | 25,0 / 208,3 ms | 24,9 / 120,8 ms |
| Travail CPU par image, maximum | 80,2 ms | 21,6 ms |
| Créations de pipelines pendant la capture | 16 | 8 |
| Draw calls, maximum | 176 | 176 |

Les lots de piles sont préalloués par chunk lors du chargement : le premier dépôt n’a plus à créer ces objets et buffers. Coût explicite : environ 4,75 Mio de tableaux CPU sur 250² ; VRAM non mesurée. Les lots vides ne sont pas réécrits. Les marqueurs ont été extraits dans `JobLayer.ts` et ne sont pas reconstruits pour la seule progression d’un retrait. Dans la capture retenue : mise à jour des piles ≤0,9 ms, reconstruction du mobilier ≤1,3 ms, application du snapshot ≤3,6 ms. Les cent retraits se terminent sans erreur ; tous les abattages n’ont pas encore fini à l’arrêt de cette capture courte.

La [compilation seule après chargement](../../artifacts/deconstruction-render-prewarmed.json) n’avait pas supprimé les pics. Une [variante de préchauffage supplémentaire](../../artifacts/deconstruction-render-resident-warm.json) n’apportait rien de convaincant et a été retirée. Ces fichiers conservent les mesures des versions intermédiaires ; leurs libellés ne permettent pas de recréer automatiquement ces anciennes implémentations avec le script final.

**Fluidité encore partielle :** la capture retenue contient des intervalles de 95 à 121 ms, parfois hors retrait, et huit créations de pipelines. Le temps CPU observé inclut la soumission, pas une mesure GPU par timestamps. Ces gains ne démontrent ni absence de saccades ni absence de coût supplémentaire dans toutes les situations. Prochains audits : attribution des retards résiduels et charge mixte, avec budgets distincts simulation/communication/rendu.

## Portée

V24 livre déconstruction et restitution physique pour les six bâtiments présents. Les règles générales de restitution sont recoupées avec RimWorld ; coûts/durées historiques des murs et lits et compétences restent à calibrer. Aucune nouvelle famille d’objet. Réinstallation, minage/pierre, puis portes/toits/pièces sont les prochaines étapes du [plan](../ROADMAP.md). Le [bilan fonctionnel complet](../gameplay/implementation-status.md) distingue les autres systèmes partiels et absents ; il ne faut pas assimiler ce camp à un clone terminé.

Contrôle documentaire final : 85 documents et 915 liens locaux/fragments ; les trois sources originales restent identiques octet pour octet. Diff vérifié sans erreur d’espacement.
