# Validation du diagnostic végétal V238

Le 6 octobre 2026, ROOT qualifie des comptages privés sur le produit V233. Aucun src, test, package, payload ou métadonnée publique modifié ; schéma 198 et 62 références conservés. [Contrat et lecture](../development/natural-diagnostics-v238.md). Ce lot ne livre aucun gain FPS ; la [comparaison nocturne globale](autonomous-performance-2026-10-06.md) reste distincte.

## Gels et reprises

Les compteurs A04842F0 conservent les corps originaux par 22/21/43 substitutions inversibles. Un agenda diagnostique et un compteur virtuels sont uniques par realm ; la référence canonique indépendante est explicitement non instrumentée. Toutes les exécutions sont séquentielles, ROOT seul, via validate:logged, avec caches sur E: et sorties fraîches.

| Contrôle ROOT | Verdict | Portée |
| --- | --- | --- |
| aulnes-v238-nature-causal-type, 11:20:40Z | PASS, 3,284 s | Adaptateur initial GEL40B9C153 |
| aulnes-v238-nature-causal-replay, 11:20:55Z | FAIL, 204,665 s | Timeout180 au replay Aulnes A ; source65 préparée, replays vides |
| aulnes-v238-nature-causal-cold-type, 11:38:48Z | PASS, 3,276 s | Diagnostic distinct GELA313787F |
| aulnes-v238-nature-causal-cold, 11:39:02Z | PASS, 44,338 s | Aulnes A/index0 uniquement, suffixCertified=false |
| aulnes-v238-nature-causal-counterpart-type, 11:40:31Z | PASS, 3,423 s | Reprise complète GEL8520B6A2 |
| aulnes-v238-nature-causal-counterpart, 11:40:44Z | PASS, 413,512 s | Quatre replays complets A/B Aulnes et mixed, 65 paquets et 54 applications chacun |

Initial : tmp/performance-orientation-v237/nature-causal-replay-next/captures/run-2026-10-06T11-20-56.497Z-ozqenI/report.json, SHA256 **89AEB79522844FC77CC067043C3340D5892AAAC7CFBCCE39DE943F1DCC9CC914**. Ce rouge reste intact et ne fournit aucun compte complet ni invariance exécutée du suffixe.

Froid : nature-causal-replay-diagnostic-next/captures/run-2026-10-06T11-39-02.975Z-MzRNpo/report.json, SHA256 **8F89C006511497E20520779F1B40978460052B253C7F7A12D2CBC6FCB90768A4**. Les 19 repères franchissent imports, construction, application, exactGraph, shadow et validation de sauvegarde initiale. Cela exclut un blocage observé au froid, sans localiser à lui seul le timeout du suffixe.

Complet : nature-causal-replay-counterpart-next/captures/run-2026-10-06T11-40-45.490Z-7SHOBy/report.json, SHA256 **EE13D091F98D8921FBF2E63EE461A0CC5CF655AF26EB90A4BB37F3C57A480AE7**. Ces deux chemins sont également sous tmp/performance-orientation-v237. La reprise restaure l'oracle de scène AB873, sans augmenter le délai180. Les onze feuilles communes et corps source/dispatch restent RAW ; la revue indépendante rattache les 17 feuilles de chaque manifeste.

## Résultats du suffixe

Le froid est exclu de ce tableau. Chaque colonne représente 53 applications sur les mêmes 64 ticks réellement produits : Aulnes6934→6998, mixed2000→2064. P/E/K et opérations de heap ne sont pas des ensembles disjoints de plantes.

| Compte | Aulnes A | Aulnes B | mixed A/B |
| --- | ---: | ---: | ---: |
| Présents finaux parcourus P | 5 938 | 5 938 | 1 005 |
| Affectés/visités agenda | 14 746 | 14 746 | 0 |
| Captures d'Inputs | 11 663 | 11 663 | 0 |
| Prévisions conservées | 2 853 | 2 853 | 0 |
| Prévisions renouvelées | 8 810 | 8 810 | 0 |
| Renouvellements dueInputSame | 8 810 | 8 810 | 0 |
| Renouvellements inputChanged | 0 | 0 | 0 |
| Probes à échéance | 9 289 | 9 289 | 0 |
| Bissections / itérations binaires | 63 / 353 | 63 / 353 | 0 |
| Entrées K | 82 | 82 | 12 |
| Visites de matérialisation ID | 692 515 | 0 | 100 727 / 0 |
| Copies d'entrées fixes compactes | 0 | 82 | 0 / 12 |
| Swaps de heap | 105 942 | 105 942 | 0 |
| Itérations de merge des toits | 127 465 | 127 465 | 0 |

Les motifs métier et queries sont identiques A/B ; seules les entrées public/scene, matérialisations et façade compacte diffèrent. Au froid Aulnes A : 8 765 deadlines, 8 765 seeds retenus, zéro seedReforecast, 17 530 captures, 9 222 probes et 60 bissections. Les seeds retenus n'annulent pas le calcul historique préalable.

La plus grosse vague du suffixe contient 562 échéances au tick6973. Ces pics de volume ne mesurent pas une durée d'image. Les 8 810 endpoints donnent 63 recherches : 99,285 % n'ouvrent aucune bissection ; cela motive une meilleure certification des intervalles constants, sans autoriser de sauter un changement visuel.

## Exactitude et limites

Les quatre rapports certifient nativeWorldNatureGrowingAliasesExact, wholeAb873CpuSceneValuesAndIdentitiesExact, oldFirstGraphsAndInputsPreserved, finalProducerSaveExact et referenceCountersUnchanged. World/RNG, packets, Nature/K/ordre, références vers C, valeurs F32, counts/bounds, identités et topologies du contrat AB873, textures CPU et anciennes premières générations passent. Aucun read/materialize supplémentaire n'est forcé ; les scopes du vrai dispatch sont fermés.

Les trois runners conservent sources et 62 payloads/métadonnées ; cleanup closed/workers0, navigateurs et ports5230/5231/5232 fermés. Les rapports froid et complet ont errors=[] ; l'initial rouge ne reçoit pas ce crédit. Les compteurs restent sans overflow.

Les observers, copies, références et oracles ajoutent du travail. Les secondes du runner ne mesurent ni CPU du jeu ni FPS. Aucune cadence GAME, UI/audio/input, GPU physique, late refusal, reset GPU ou nouvelle récupération native n'est qualifiée. Le contrôle graphique par application revendique le contrat AB873, pas toutes les relations croisées treeParts↔geometry ; le graphe retenu initial est vérifié séparément une fois. Le shadow d'uploads ne simule pas le backend.

## Décision

Le volume de renouvellements dueInputSame justifie l'étude d'un certificat numérique privé plus durable. Il ne prouve pas encore quel pourcentage du coût parent est économisable. Le candidat compact demeure écarté ; aucun second GAME ou banc inchangé n'est lancé. Prochain candidat : ID seulement, seed/standalone littéraux, queries et tick de chaque changement exacts, coût complet/froid et continuation au-delà de son horizon avant promotion. Le produit reste V233 et la cible proche de 240 FPS à 6× est ouverte.

Documentation : aulnes-v238-documentation-2026-10-06T11-53-36.388Z-27332, PASS0,776s ; 801 documents, 7 875 liens, 25 IDs et cinq familles préservés. git diff --check passe. Aucun contrôle de build/régression produit n'est relancé pour ce lot documentaire sans changement produit.
