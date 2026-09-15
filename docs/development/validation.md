# Validation courante — requêtes CPU sous V34

15 septembre 2026. [Contrat](spatial-queries.md), [recherche renouvelée](../research/spatial-query-reference.md), [livraison des portes archivée](../history/validation-v34-doors.md). Schéma 34 inchangé ; G0 en consolidation, G1 partiel, habitat G2 en cours.

## Contrats et gameplay

**109 tests passants, aucun échec final**, [rapport complet](../../artifacts/spatial-query-core.json). L'oracle indépendant porte sur 120 cartes ; le nouveau scénario vérifie égalités de choix, réserve supérieure inaccessible puis rendue accessible, priorité/réservation et budgets inchangés. L'index d'arrêt est comparé au test ponctuel sur emprises tournées, cadres, terrain et limites. Les loisirs testent les fragments au sol puis leur retrait.

Le [premier lot ciblé](../../artifacts/spatial-query-focused.json) comportait une erreur de fixture : priorité 5 de stockage, alors que nos commandes acceptent 1–4. Correction en 4, [rejeu ciblé réussi](../../artifacts/spatial-query-navigation.json), puis lot complet. Aucun seuil de gameplay n'a été relâché. Une première exécution complète précédait le correctif de loisirs ; le rapport final ci-dessus a été renouvelé après ce correctif.

Pilote naturel conservé : huit jours sur graine 42, cinq sur 93 et 2048, repas/sommeil/loisirs, agriculture et construction, conservation des ressources et reprises quotidiennes. Quarante blocs produits = cinq incorporés au mur + trente-cinq rangés ; quatre-vingts acier = trente atelier + cinquante rangés. Le correctif écarte dès la sélection une place de loisirs qu'un fragment rendait déjà invalide à l'exécution.

## Comparaison CPU

[Avant](../../artifacts/spatial-query-before.json) et [après](../../artifacts/spatial-query-after.json), même script [spatial-query-bench.ts](../../scripts/spatial-query-bench.ts), Ryzen 5 3600, Node 24.11.1, carte 250² dégagée. Une exécution par population, besoins actifs, échauffement séparé de 100 ticks ; chaque colon construit une porte de 25 bois, coupe son arbre intérieur puis range douze bois à l'extérieur. Borne 3 200 ticks, snapshots tous les cinq ticks, empreintes du monde entier tous les vingt-cinq ticks et à la fin. Hash, snapshots et validation hors mesure du tick.

Après l'interruption de session, les deux mesures finales ont été rejouées successivement : témoin exporté du commit **018cb788d00c877445adfe0b1bbde682b0cf0e75** par `git archive` dans `tmp/spatial-v34`, puis code courant. Aucun benchmark lourd concurrent piloté par l'agent ; environnement bureau non isolé. Les premiers relevés sont conservés localement dans `tmp/spatial-query-early-before.json` et `tmp/spatial-query-resumed-after.json`, sans les mélanger à la paire finale.

| Colons | Tick avant p95/p99/max (ms) | Tick après p95/p99/max (ms) | Snapshot p95 avant → après (ms) |
|---|---|---|---|
| 3 | 1.667/3.888/8.233 | 1.138/2.874/6.162 | 0.738 → 0.446 |
| 30 | 19.932/33.248/34.116 | 11.178/17.494/23.286 | 2.512 → 1.909 |
| 100 | 39.073/63.081/113.803 | 20.401/35.725/67.741 | 0.632 → 0.648 |

À 100 colons, p95 diminué d'environ **48 %** dans cette paire ; 100 portes et 1 200 bois rangés au même tick 4 621 (2 621 ticks simulés). **130 empreintes de mondes complets identiques** sur les trois populations. Les conditions sont synthétiques et une seule répétition ne mesure pas toute la variabilité du bureau. Pointes résiduelles jusqu'à environ 68 ms ; pas de promesse de simulation 6× constante ou de fluidité universelle. Snapshots non optimisés par ce lot.

## Intégration et limites

Build et typage réussis : 175 modules, worker 207,64 kB, entrée graphique inchangée 1 067,57 kB / 299,30 kB gzip. Avertissement historique du bundle supérieur à 500 kB conservé. Une assertion de test, rétrécie à `null` par TypeScript après remise à zéro du transport, lit maintenant le colon depuis le monde après planification ; aucune modification du moteur pour résoudre cette erreur de typage. Aucun changement de rendu, d'UI, de commande ou de format persistant ; les derniers parcours UI porte/colonie et l'audit GPU sont ceux du commit témoin, explicitement historiques dans l'archive. Le présent lot n'annonce pas de nouveau résultat FPS. Les contrôles CPU et la correction de sélection ciblée justifient de ne pas répéter le long parcours graphique.

Guide, contrats, inventaire, calendrier et adoption du corpus actualisés ; catalogue d'objets inchangé. **118 documents, 1 263 liens** et intégrité des trois originaux vérifiés. Les toits/pièces sont le prochain lot ; climat, énergie, santé/combat, faune, social, économie/narrateur, monde et catalogue complet restent partiels ou absents selon l'[inventaire](../gameplay/implementation-status.md).
