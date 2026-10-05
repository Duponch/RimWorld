# Preuve V222 — mesurer avant d'optimiser

5octobre2026, référence `415e3472`, schéma198 inchangé. [Contrat et outils](../development/wildlife-reconciliation-v222.md). **Livraison : profils paramétrables, oracle de réconciliation et diagnostic de charge. L'essai d'indexation est retiré ; aucun changement du moteur, règle Core ou payload public n'est livré.** La demande utilisateur suivante corrige le format et la richesse de la colonie de test : carte250², davantage de systèmes existants, avant toute nouvelle boucle humaine.

Windows/Node24.11.1/Ryzen53600. Contrôles lourds successifs via `validate:logged`, TEMP/TMP sous `tmp/host-cache`. Les sessions utilisateur sont conservées. La copie privée complète de `src` avant l'essai est sous `tmp/simulation-baseline-v222`, avec commit et packages ; les deux scripts de profil sont identiques dans les deux arbres. L'essai ne changeait que quatorze lignes de `wildlife.ts` ; sa copie privée est conservée dans `tmp/simulation-v222/wildlife-index-candidate.ts`. Le fichier moteur final est restauré à l'identique de la copie initiale, SHA256 vérifié.

## Entrées et équivalence

| Sauvegarde inchangée | Population initiale | Plage de comparaison | SHA256 du payload |
| --- | --- | --- | --- |
| Les Aulnes64² | Sept humains/huit animaux | 21001–21080 puis reprise21081 | `81b08a46e2250650c2ed08b100abeb17de3d0fa4082fa5d627865d4a0b0baca2` |
| Mixte250² | 104humains/100animaux, migration91→198 hors temps | 2001–2080 puis reprise2081 | `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b` |

Le [banc V222](../../scripts/benchmark-wildlife-reconciliation-v222.ts) compare les chaînes complètes du World à **chacun des160ticks**, PRNG compris, valide les états, puis vérifie les roundtrips et reprises du checkpoint final dans les deux moteurs : tout est identique. Les traces JSONL conservent le World complet ; aucune reconstruction d'historique ou injection de ressource. Rapports, sources avant/après et checkpoints : `tmp/simulation-v222/wildlife-2026-10-05T18-52-29.312Z-18220/`. Sources gelées sur toute l'exécution.

Les quinze nouveaux cas confrontent la réconciliation à la boucle scalaire V221 : 0/1/15/16/100repas, intentions concurrentes dans les deux ordres, premier ID de ressource, changements de ressources/travaux au même tick, captures fournies, vrais ordres de transport et arêtes engagées, accouplement, sortie et prédation. Les corruptions transitoires de revendications sont distinguées des checkpoints admissibles. L'annulation d'un repas doit libérer sa revendication avant le suivant ; un ensemble figé de ces intentions serait faux.

## Mesures et décision

Les profils initiaux gardent20ticks de chauffe/60mesurés et une publication Node par tick. Moyennes `stepWorld`/total des étapes : Les Aulnes6,85/11,08ms, mixte53,95/75,42ms. Le profil séparé attribue à la réconciliation animale5,33% inclusifs sur la grande scène ; les catégories se chevauchent et l'Inspector ajoute son coût. Le premier profil après essai donne41,25/58,25ms : **cette paire seule ne prouve pas un gain**, notamment puisque encode/clone baissent aussi.

Deux cycles A/B/B/A, modes successifs, clones/codec/migration/validation/IO hors fenêtres. Chaque variante mesure240ticks complets et80réconciliations isolées par scène. A est le moteur initial, B l'essai d'index frais à partir de seize repas.

| Charge | Réconciliation A/B, moyenne | Tick complet A/B, moyenne | Tick complet A/B, p95 |
| --- | --- | --- | --- |
| Les Aulnes, aucun repas végétal au checkpoint20 | 0,0091/0,0129ms | 5,572/5,069ms | 9,449/7,968ms |
| Mixte, dix-neuf repas végétaux au checkpoint20 | 1,453/1,477ms | 52,519/53,527ms | 82,882/87,905ms |

Le coût isolé moyen n'améliore pas la grande charge ; sa médiane baisse1,328→1,201ms, mais p95 et moyenne montent. Les blocs complets varient49,84–56,48ms. La petite charge fluctue également malgré l'absence d'index actif. **Gain stable non établi, essai retiré.** Les limites de débit de la grande colonie restent ouvertes. Ces observations Node ne mesurent ni cadence native/event-driven, ni transfert réel, adoption, GPU ou FPS ; aucune vitesse×6 générale certifiée.

## Commandes terminées

| Reçu `tmp/validation-runs/` | Résultat |
| --- | --- |
| `simulation-v222-aulnes-before-2026-10-05T18-38-56.052Z-19468` | Profil exact et sources stables,6,136s |
| `simulation-v222-mixed-before-2026-10-05T18-39-11.798Z-11756` | Profil exact et sources stables,24,135s |
| `simulation-v222-mixed-after-2026-10-05T18-42-25.457Z-20708` | Essai, mêmes checkpoints/reprise que référence,22,546s |
| `simulation-v222-targeted-2026-10-05T18-45-43.036Z-19800` | 37fichiers/198cas passent sur l'essai,38,861s |
| `simulation-v222-abba-2026-10-05T18-52-27.581Z-17528` | Deux charges, oracles et mesures complets,230,791s |
| `simulation-v222-type-final-2026-10-05T18-58-49.943Z-23132` | Typage final passe,8,730s |
| `simulation-v222-build-2026-10-05T18-59-03.247Z-28200` | Build final passe,3,485s ; warning de taille existant |
| `simulation-v222-oracle-final-2026-10-05T18-59-16.361Z-7772` | Quinze nouveaux oracles passent après restauration exacte,8,237s |
| `simulation-v222-docs-2026-10-05T19-02-20.182Z-27332` | Liens, en-têtes et archives passent,1,524s |

Aucune nouvelle régression exhaustive, campagne longue ou validation native n'est annoncée pour cette livraison d'outils : le moteur final est inchangé. Les preuves V221 restent celles de la scène64², dont le format et la richesse ne satisfont pas la nouvelle demande utilisateur.
