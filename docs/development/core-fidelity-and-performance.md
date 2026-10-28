# Fidélité Core et coût des évolutions

Reprise humaine explicite du28octobre2026 après les déplacements V492(cf7526e). Les [six ensembles](core-completion-plan-20261020.md) restent ouverts. La prochaine chaîne retenue par l'arbitrage est l'acquisition physique d'un cœur d'IA, l'ordinateur et les capteurs payés/recherchés, puis un départ vivant rechargeable. Les propositions anciennes297 restent privées, à rebaser après Movement297 ; elles ne constituent pas une fonctionnalité livrée.

## Référence et limites

La cible mécanique est le Core sans mods de RimWorld1.6.4871rev590, installé localement ; Assembly-CSharp.dll SHA256 5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a. Lire les définitions XML effectives, leur héritage, puis les méthodes et leurs appelants pertinents. Les faits sont reformulés et réimplémentés dans notre modèle ; aucun code ou asset propriétaire n'est intégré. L'[annonce officielle Ludeon du12octobre](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue encore la1.6 principale de la1.7 instable : ne pas mélanger les références.

Une lecture isolée ne prouve pas le comportement complet. Noter les entrées, propriétaires, coûts réellement consommés, temps, interruptions, refus, perte/destruction et reprise. Vérifier les appelants, pas seulement les constantes. Les descriptions Internet/vidéos peuvent révéler une incohérence ou un cas oublié ; elles ne remplacent pas la primaire versionnée. Distinguer Core, DLC, mods et témoignages anciens. Les divergences doivent rester explicites, sans choisir la source qui arrange le candidat.

## Travail par lot et réexamen de l'ancien

Avant chaque lot, identifier les règles ajoutées et les règles anciennes dont il dépend. Leur ancienneté ou un ancien test vert ne prouve pas leur fidélité : relire les hypothèses réellement touchées, en priorité temps/ordres, propriétaires/transferts, coûts/prérequis, combat, interruption et sauvegarde. Réarbitrer entre les six ensembles après un jalon utile ; ne pas transformer la victoire ou un audit en file interminable de variantes.

Pour chaque règle concernée, consigner : version/source primaire, comportement observé dans notre code, écart ou adaptation, cas limites et preuve acquise. Une règle non examinée reste non vérifiée. Les adaptations nécessaires au modèle local doivent être nommées ; ne pas les présenter comme une identité littérale. Les mouvements V492 alignent les règles étudiées et leurs cas qualifiés, sans prouver une identité exhaustive de tous les trajets, obstacles et interactions possibles.

Utiliser des tests de comportement/conservation et des parcours réels lorsque la frontière le demande. Couvrir la nouvelle règle, ses refus, les interruptions pertinentes et sauvegarde/recharge au véritable point physique. Distinguer fixture préparée, parcours joué de QA et campagne réelle. Préserver les échecs, reproduire les anciens rouges avant de les classer historiques, ne pas affaiblir une garde pour obtenir du vert.

## Performance et réactivité

Avant un commit produit, vérifier le coût du chemin changé face à une source précédente exacte, avec charge et qualité comparables. Selon le changement : commande→adoption→affichage, coût CPU et allocations, débit de simulation, cadence et blocages ; FPS/GPU exigent leur propre mesure. Un microbenchmark ou un typage réussi ne prouve pas la fluidité générale. Conserver la dispersion des témoins et les charges externes connues ; ne pas transformer un résultat variable en gain causal.

Optimiser les coûts démontrés, notamment éviter scans du monde dans les lecteurs UI/ticks fins, calculs répétés et invalidations générales. Préférer une échéance ou un propriétaire précis avec reconstruction sûre ; un cache ne devient jamais l'autorité des biens, du temps ou de l'issue. Tester son invalidation, chargement, retrait et remplacement. Ne pas baisser la qualité, anticiper un résultat autoritaire ou sauter du temps joué pour améliorer la mesure.

La dette [PERF-V492-X6](movement-parity-v492-status.md) reste ouverte : recul accepté temporairement de9,98–11,28% du débit de simulation à×6. Rythmes×1/×3 tenus ne prouvent pas CPU égal ;×4 non mesuré. Les comparaisons futures partent du produit V492 accepté et isolent toute régression supplémentaire. Elles ne réparent pas rétroactivement cette dette.

## Première remise en question après la reprise

Le [réacteur V493](ship-reactor-core-frontier-v493.md) est le premier cas concret : la dépendance ancienne conservait l'horloge macro alors que le nouveau moteur joue les phases Core. Lecture primaire fraîche, régression reproduite puis correction ciblée ; cela ne clôt ni la victoire ni un audit global du Core.
