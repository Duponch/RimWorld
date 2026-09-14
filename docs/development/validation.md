# Validation courante — V11 conservation alimentaire

14 septembre 2026. [Référence vérifiée](../research/food-preservation-reference.md), [contrat et migration](food-preservation.md). G0 reste en consolidation et G1 partiel. Les lots se recouvrent ; leurs comptes ne représentent pas des couvertures indépendantes à additionner.

## Contrats et colonie simulée

Le [groupe final 19/19](../../artifacts/core-preservation-final.json) couvre conservation, aliments, production, sol/déplacements, plantes et snapshots. Les trois scénarios de fraîcheur exercent copie et mélange d’âge, portion ingérée au seuil, références expirées dans les phases de cuisine, cargaison survivante sur sol saturé, reprise exacte, durées de 4/14/40 jours, migration V10, corruption et expiration groupée de 256 piles. La sélection alimentaire existante est enrichie par un vrai choix au seuil d’une demi-journée.

Le [groupe colonie 13/13](../../artifacts/core-preservation-colony.json) inclut le pilote de cinq à huit jours sur trois cartes naturelles, les scénarios de simulation et l’oracle de navigation. Les pertes sont intégrées au bilan alimentaire ; les ingestions ne sont comptées que lorsqu’elles ont effectivement eu lieu. Les checkpoints quotidiens reprennent exactement.

Le [premier groupe](../../artifacts/core-preservation-first.json) avait 18/19 réussites : la nouvelle fixture attendait un portage de douze unités, supérieur à la capacité actuelle de dix. L’attente a été corrigée sans modifier le transport. Aucun scénario long déjà vert n’a été relancé pour cette correction de fixture.

## Navigateur réel

Le [premier lot UI](../../artifacts/ui-preservation-first.json) valide cuisine et partie de trois jours. Sur Chromium WebGPU natif, le pilote atteint le tick **18 082** en **328,8 secondes** : trois lits, table, trois tabourets, six murs, feu, quinze plants ; **20 repas préparés, 18 ingestions, trois dormeurs**. Il reste cinq repas simples et quinze rations ; bois 47, aucune tâche en attente, jauges minimales de nourriture 68,45 et repos 85,94. [Bilan détaillé](../../artifacts/colony-preservation-three-days.json). Les bilans sont exacts, aucune erreur console/GPU observée. Aucun aliment n’a pourri dans cette partie correctement approvisionnée ; les scénarios de seuil prouvent séparément les pertes.

Le parcours UI court de cuisine passe en 10,1 secondes. Le [parcours des frontières](../../artifacts/ui-preservation-final.json) passe en 31,3 secondes, dont sauvegardes anciennes et refus atomiques. Le [cas de conservation vérifié](../../artifacts/ui-preservation-verified.json) passe en 6,4 secondes : V10 chargée via Menu, fraîcheur visible, 120 ticks de durée restante écoulés par le worker, dix baies perdues, sauvegarde/reprise et âge invalide refusé sans remplacer le monde.

Les essais intermédiaires conservent leurs erreurs : comparaison JSON sensible à l’ordre des propriétés après migration, pile placée sous Mina et donc clic sur le colon, puis bouton Recharger recherché dans le menu déjà fermé par le chargement. La [dernière attente bloquée](../../artifacts/ui-preservation-retry.json) s’est arrêtée à la borne de 60 secondes. Ces fixtures et actions UI ont été corrigées ; la limite d’attente d’action est désormais dix secondes pour ce scénario. La partie longue n’a pas été rejouée pour ces corrections.

Capture finale inspectée : camp, cultures, piles et organisation UI conservés, FPS toujours visibles. Aucun changement de géométrie ne dépend de l’âge. La valeur instantanée de FPS sur une capture n’est pas un audit de rendu.

## Audit de charge et optimisation ciblée

Machine : **AMD Ryzen 5 3600**, Node 24.11.1, carte 250² graine 42, 300 ticks depuis le premier travail, trois populations. Tests, compilation et audits exécutés successivement. Temps ci-dessous : simulation CPU, hors création, validation et agrégation des diagnostics ; collecte des compteurs de recherche comprise dans le tick. Une passe par condition, sans préchauffage.

| Colons | Médiane ms/tick | p95 | p99 | Maximum |
|---:|---:|---:|---:|---:|
| 3 | 0,0195 | 1,31 | 2,79 | 10,16 |
| 30 | 1,19 | 15,76 | 25,89 | 30,07 |
| 100 | 22,60 | 30,04 | 33,35 | 36,02 |

[Rapport habituel](../../artifacts/preservation-bench.json). Les tâches/résultats à 300 ticks restent ceux de l’audit V10 correspondant ; la légère variation avec sa médiane 22,38/p95 29,59 ne permet pas d’isoler un surcoût de fraîcheur du bruit de mesure. Ces chiffres ne sont ni des FPS ni une promesse de vitesse ×6 à cent colons.

Le [stress séparé](../../artifacts/preservation-expiry-bench.json) fait pourrir **700 baies et 1 500 riz ensemble au tick 150**, pendant les activités de cent colons. Il conserve toutes les unités dans le bilan et un état final valide, sans recette fantôme. Le coût du tick complet d’expiration est 45,81 ms ; p95 45,81, p99 74,40. Ce scénario change les décisions et ne constitue pas un A/B de gameplay avec le stock frais.

Le [profilage instrumenté](../../artifacts/preservation-expiry-profile.json) situe l’essentiel dans navigation et recherche de postes. `expireFood` apparaît dans seulement sept échantillons, environ 4 ms cumulées : estimation grossière, pas chronométrage de sa pire exécution. Les cases de dépôt étaient parcourues même sans aucun ingrédient admissible.

L’optimisation évite cette recherche inutile. [Quinze états sérialisés comparés octet par octet](../../artifacts/preservation-staging-exact.json), avant/pendant/après expiration à 3/30/100 acteurs, sont identiques à la [capture préalable](../../artifacts/preservation-staging-baseline.json). [Six scénarios ciblés](../../artifacts/core-preservation-optimized.json) passent ensuite. Dans le [stress optimisé](../../artifacts/preservation-expiry-optimized.json), médiane 23,72, p95 **37,33**, p99 **51,04 ms** ; le tick d’expiration complet prend 40,36 ms. Le maximum froid initial reste 73,39 ms. Les recherches larges et la congestion restent un chantier G0 identifié ; aucune fluidité parfaite n’est déclarée.

## Compilation et documentation

Compilation de production et typage réussis. Le jeu conserve son avertissement de bundle supérieur à 500 ko ; worker environ 102,5 ko, paquet jeu environ 1 021 ko avant gzip. Aucun nouveau moteur, réseau externe ou dépendance n’est ajouté.

Contrat, sources, catalogue, guide, inventaire et calendrier sont mis à jour. Les preuves V10 sont archivées avec leurs conditions. Le vérificateur documentaire contrôle liens/fragments, 25 domaines, cinq familles de validation et les trois originaux intacts ; il ne certifie pas la véracité de RimWorld.

## Preuves précédentes

- [V10 — cuisine, diagnostics et navigation](../history/validation-v10-cuisine.md)
- [V9 — alimentation et reclassement](../history/validation-v9-alimentation.md)
- [V8 — cultures](../history/validation-v8-cultures.md)
- [V6–V7 — présentation](../history/validation-v6-v7-presentation.md)
- [V3–V5 — besoins](../history/validation-v3-v5-besoins.md)
- [Fondations G0](../history/validation-g0-fondations.md)
- [Grande carte V2](../history/map-scale-v2.md), [premières inspections graphiques](../history/render-validation-g0.md)
