# Adoption des structures inchangées — V399

16 octobre 2026, schéma 252 inchangé. Le décodage MAIN évite une seconde lecture profonde de structures dont le transport vient de prouver qu’elles sont exactement inchangées. Cette consolidation CPU accompagne les [alertes hors carte V398](../gameplay/remote-danger-alerts-v398.md) ; aucune mécanique, durée ou sauvegarde ne change.

## Frontière conservée

Le certificat est privé à l’adoption MAIN fermée sans autre écrivain. Il exige le prédécesseur confirmé, le même tableau structures, un delta sparse contigu sans aucun upsert, les mêmes schéma/graine/dimensions. Full, upsert même identique ou au même tick, remap, ordre, adhésion, mauvaise époque ou prédécesseur absent repassent au parcours complet. Les imports RAW et historiques restent stricts. L’horloge d’usure et tous les autres domaines sont vérifiés à chaque adoption. Confirmation seulement après adoption complète ; refus, stale, resync et exception écartent le candidat. Pas d’index, de copie de tableau ni de travail par image ajouté.

Cette optimisation réemploie le contrat MAIN existant (propriété fermée, intrinsèques ordinaires) ; sa fabrique ne rend pas fiable un World mutable quelconque. Les huit nouveaux cas couvrent notamment les fausses identités/prédécesseurs, upserts, changements au même tick, calendriers, refus tardifs et reprise. Résultats groupés et réparations de témoins dans la note V398. Revue indépendante statique finale : aucun défaut bloquant trouvé.

## Mesure CPU bornée

Rapport complet : `tmp/deterioration-structure-bench/run-ZiZm2c/report.json`, PASS25,500s, sources exactes avant/après. Windows/Node24.11.1, Ryzen5 3600. Classe MAIN avant/après textuellement vérifiée, mêmes Decoder et autres propriétaires ; trois vrais états250² en lecture seule. Cinq paires alternées, huit deltas contigus au même tick par paire. Construction, migration, clonage, encodage et assertions sont hors des temps d’adoption. Aucun tick de simulation, commande ou tirage RNG.

| État | Moyenne avant ms/adoption | Après | Différence |
| --- | ---: | ---: | ---: |
| Aulnes publiques10733 | 18,834 | 15,857 | 2,976 |
| Vraie branche21483, foyer | 19,513 | 16,099 | 3,414 |
| Même branche, site peu construit | 6,401 | 6,190 | 0,210 |

Les issues et champs dynamiques sont comparés à un témoin indépendant ; identité des grands tableaux et absence de mutation du prédécesseur contrôlées. Les upserts et checkpoints complets sont mesurés séparément et gardent le parcours strict : ils ne bénéficient pas de cette économie. Le gain utile observé porte donc sur les structures nombreuses sans modification, pas sur toutes les réceptions.

Cinq mesures courtes, GC/JIT non contrôlés ; le p95 du rapport est celui de cinq moyennes de lots, pas des ticks individuels. Ce banc Node mesure l’adoption CPU et son cycle de validation, pas le temps MAIN natif, DOM/HUD, le worker complet, le GPU ou les FPS. Aucun gain de fréquence d’images ni débit×6 général établi. Les15–18ms natifs observés en V397 restent les mesures d’avant ; le coût résiduel justifie une prochaine analyse ciblée, pas une promesse de fluidité.

Présentation Chrome commune PASS130,591s ; typage final PASS12,152s, Pages PASS2,212s. Natif V398 réutilisé pour la bascule réelle ; corpus et campagnes non affectés réutilisés. Les gels et échecs sont conservés sous `tmp/remote-alerts-v398/` et `tmp/validation-runs/`.
