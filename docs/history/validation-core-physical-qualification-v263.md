# V263 — captures Core A/B achevées, qualification physique incomplète

**Clôturé sans promotion : produit V242, schéma 198, 62 références et 65 fichiers publics exacts ; aucun gain CPU/GPU/FPS ajouté.** [Contrat](../development/core-physical-qualification-v263.md), [recherche](../research/core-physical-qualification-v263.md). ROOT seul exécute les contrôles gelés séquentiels ; ce document provient de leurs rapports conservés.

## Construction et rouges conservés

A dérive de la façade commune V260, B du raccord V262 ; seuls les trois IDs MAIN/Colony/Core sont substitués. Source/Decoder/moteur/layers restent RAW, avec inverses entiers et entrées protégées.
Le premier typage reste [FAIL](../../tmp/performance-orientation-v263/captures/preflight-types-vBTm3h/report.json) : collision de métadonnées budget et écriture info.frame typée. La reprise distincte garde scene.capture et ajoute une assertion de type effacée, sans changement kernel.

| Étape conservée | Résultat et portée |
| --- | --- |
| Premier natif, GEL EDAAD029 | FAIL 16,522 s, Canonical DFG shader changed, avant capture A. |
| Générateur DFG initial puis reprise | FAIL 2,094 s sur targetSHA256/outputSHA256, puis PASS 4,203 s ; sorties initiales conservées. |
| Natif DFG anonyme, GEL0908C969 | FAIL 20,587 s, caméra de passe native output non recensée, avant capture A. |
| Helper output 7F61200F, GEL462743CE | FAIL au transport du premier checkpoint : borne1 024 chunks dépassée ; aucun allègement des données. |
| [Typage des corps root-output](../../tmp/performance-orientation-v263/captures/types-aosE9f/report.json) | PASS 9,069 s ; corps inchangés dans la reprise de transport. |
| [Syntaxe transport](../../tmp/performance-orientation-v263/captures/syntax-wEqj8e/report.json) | PASS 5,175 s. |
| Natif transport puis audit hors ligne | FAIL 201,952 s puis FAIL 45,945 s, détaillés ci-dessous. |

Le helper C05A0569 retire la découverte DFG nominative sans Fn/getter ajouté. Le helper 7F61200F observe ensuite les propres identités _quadCache de Three, sans modifier l'admission.
MAIN ferme aussi le Core existant après un échec avant loaded=true ; la restauration des hooks met à jour son flag diagnostic.
Le runner C95E36EB ne change que le transport : maximum65 536 chunks, lots16, blocs≤64KiB, capture≤64MiB. Compare C269090E, PNG et serveur restent ceux du parent output.

## Natif final et nettoyage

[Rapport natif](../../tmp/performance-orientation-v263/core-transport-reprise-controls-next/captures/run-physical-2026-10-08T18-39-59.063Z-bwCOyB/report.json), SHA256 `7740478b58070045b8ba10185c36dee0e3f7a8b20f9da9403cecb2f92467c2b8`.
GEL final `transport-reprise-GEL.json`, SHA256 `5427d3b7c105e2e3457468e001a9ef978017c7dde689c87b3b95a8155c2dbeff` ; sources historiques/public exacts avant/après.
A et B achèvent chacun14 captures Aulnes/baseline au tick6934/speed0. B observe FULL198/ACK198/SHARED180 avant cleanup, pending0/activefalse, sans disabledReason : comptes, pas durées ni FPS.
Le natif reste FAIL avec comparisons=[]/physical=false : l'assertion de cleanup B lit owner.membership.count, alors que la valeur réelle est owner.policy.membership.count.
Le bon chemin vaut0 ; owner fermé, ownersCreated1/ownersClosed1/liveOwners0, pending0/activefalse, hooks retirés, waiting0 et canvasCount0.
Les journaux erreurs/console/requêtes et cleanupErrors sont vides ; navigateurs/serveurs A/B sont fermés. A mesure workersAfterCleanup0 ; ce champ est absent pour B, l'assertion ayant interrompu sa mesure avant fermeture du navigateur.
Le diagnostic d'adaptateur retourne present=true/info={} : aucun nouveau certificat du modèle matériel n'est déduit de cette sérialisation.
Cette erreur d'oracle explique le FAIL natif de nettoyage sans le transformer rétroactivement en PASS physique.

## Audit distinct des données déjà capturées

[Audit hors ligne](../../tmp/performance-orientation-v263/captures/offline-completed-kwswq0/report.json), SHA256 `ad0328abf8122868e639449039d867db5afc735b4250d70848e2b48429ed1d5a`, FAIL45,945s : original natif et GEL vérifiés inchangés, comparateur C269090E réutilisé sans relaxation.
Treize paires sont exactes en scène, ordre des passes/draws, champs consommés, layouts/alias/offsets, bytes CPU et pixels RGBA.
Elles couvrent capture-cold, unchanged, stockpile on/off, textures off/on, cutaway off/on, foliage off/on, perspective, orthographic et resize-small.
La quatorzième, resize-original, conserve scène/pass exacts ; tous les asserts de champs et bytes précédents passent, puis l'assert final RGBA échoue. Aucune cause n'est attribuée à cette différence.
Le booléen consumedFieldsQualified=false de cette ligne reflète le non-retour du comparateur après l'assert pixel, pas un échec de champ identifié.
Le World final MAIN est byte-exact, SHA256 `db2c833e5511015490bbbc1f6cd495e965a14d56b266de066299489eda54b90d` ; il provient du clone du snapshot, sans save/reload native revendiqué.

## Décision de clôture

L'audit reste FAIL et fullPhysicalQualification=false ; il ne peut pas satisfaire la porte coût exigeant tous les scénarios physiques.
Compilation intercalée, custom object/node, throw, mixed, coût complet, GAME de performance et build ne sont pas exécutés ; aucune promotion ni gain livré n'en découle.
Les preuves V260/V262 gardent leur portée propre, sans transfert automatique. Aucune cause pixel, parité générale ou vraie cadence6×/240FPS n'est certifiée.
Consigne humaine : terminer ce lot, commit local ROOT puis STOP. Aucun banc supplémentaire, nouvelle version prescrite, push ou relance automatique ; sessions, references_UI et caches E: préservés.

Contrôle documentaire de clôture : lancement sandbox EACCES conservé, reprise autorisée PASS1,463s,870documents/8287liens/25IDs/5familles. Diff produit src/tests/public/package vide ; aucun build ou test moteur répété pour ces seuls documents. Les origines5290/5291 ne sont plus à l'écoute à la clôture.
