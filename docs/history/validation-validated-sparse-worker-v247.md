# Validation isolée par paquet original V247

Prototype privé qualifié puis écarté : produit V242, schéma 198, 62 sauvegardes et 65 fichiers publics conservés. Aucun FPS ajouté. [Contrat](../development/validated-sparse-worker-v247.md), [recherche](../research/validated-sparse-worker-v247.md). L'autonomie autorisée continue ; relance automatique en pause, commits locaux sans push.

## Domaine et artefacts

Le validateur isolé applique le SnapshotDecoder RAW entier ; MAIN reçoit le paquet original et son verdict, reconstruit les mêmes valeurs et ferme les nouveaux objets. Aucun World complet reconstruit n'est transmis. MAIN possède les deux Workers ; requêtes, snapshots, réponses et défauts suivent le même circuit FIFO. ACK après APPLIED et callback, sans gate ni cadence modifiée. Standalone reste RAW et mutable. Le contrat natif change explicitement les droits d'écriture et isole ses catalogues de règles de MAIN.

Sous `tmp/performance-orientation-v247`, composants GEL FE144939 : typage PASS 1,914 s, trois fichiers/26 cas PASS 2,546 s. Propriétaire constructif, receipts de copies/écritures et gate de realm sont contrôlés ; aucun de ces cas seuls ne prouve l'admission d'un World natif. Source et client dérivés ont des inverses RAW entiers. Le Worker utilise une copie RAW acyclique, sans factory.

Le premier Core CB49B67C passe le typage, puis une revue trouve les index Map construits avant le gate. Il n'est pas exécuté. Reprise distincte 198DB783, codec FEE78321 : gate premier, constructeurs d'index capturés ; typage PASS 3,212 s. Les journaux natifs privés ont leurs propres stores capturés, et trois lecteurs canoniques routent leurs stamps avant tout magasin RAW. Aucun writer, receipt ou codec brut n'est exporté.

## Échecs de banc conservés

| Gel | Résultat | Correction distincte |
|---|---|---|
| 69E660CB | Typage FAIL 3,654 s, 14 erreurs de narrowing/types | Deux annotations effacées, aucun changement de corpus ou chrono |
| E1D02752 | Typage PASS 3,877 s ; oracle FAIL 127,074 s, initialisation ESM circulaire | Construction standalone différée ; aucun Worker créé dans ce rouge |
| 890DFD05 | Typage PASS 3,266 s ; oracle FAIL 55,768 s après deux corpus ordinaires exacts | Contrepartie Shared déplacée vers mixed, qui émet réellement growth |
| BF06C50B | Typage PASS 3,151 s ; oracles et coût PASS | Noyau, source, page, math et cadence inchangés |

Aulnes 6934→6998 n'émet aucun growth dans ce corpus ; mixed 2000→2064 en émet 12 pour 48 valeurs, premier au paquet 53. Le rouge 890D n'est pas renommé en succès. Les anciens dossiers, gels et rapports restent intacts ; les inverses des seules annotations, initialisation et chemins privés sont documentés dans chaque reprise.

## Oracles natifs

BF06C50B contient 2 034 fichiers gelés. Contrôle ROOT via `validate:logged` PASS 108,215 s, sortie `native-validated-controls-growth-reprise-next/captures/run-oracles-2026-10-06T22-25-14.557Z-DFhZaD`.

Quatre cohortes de 65 publications : Aulnes, mixed, mixed avec premier growth en SharedArrayBuffer, Aulnes avec constructeur Map interposé uniquement pendant la construction. Chaque paquet passe par le vrai MessagePort, le validateur RAW et la factory MAIN fermée. Un lecteur RAW indépendant compare graphes complets, alias, ordre, primitives et bytes ; les anciennes vues sont conservées et revérifiées. Les deux corpus ordinaires restent entièrement readonly. Shared impose le repli mutable sur les 12 dernières vues ; Map n'est jamais appelé par les index natifs et impose le repli mutable sur les 65 vues, même après restauration du constructeur.

Quatre appels standalone RAW par cohorte conservent leurs droits historiques. Sur les voies natives ordinaires, les trois lecteurs restent exacts sous hooks WeakMap/Map/Array ; les magasins RAW capturés puis empoisonnés ne certifient ni Worlds natifs ni paires mixtes. Le paquet suivant reste natif après restauration. Deux suffixes composés par cohorte sont vérifiés, sans utiliser la vue D comme base du suffixe présenté A→C.

Le vrai SimulationClient, sans fixture corpus, charge Aulnes, avance réellement 6934→6972, pause, sauvegarde exactement, refuse un chargement invalide sans changer sa base, recharge, arrête une requête en issue inconnue, puis redémarre et recharge. 35 publications vérifiées, dont 35 en-têtes motion et 22 audio ; metadata propres/ordre/valeurs exacts. Les grands graphes sont observés au froid/remplacement/final, les autres paquets par RAW/verdict et journaux K. Le débit instrumenté de ce parcours n'est pas un FPS ni une vitesse GAME ordinaire.

## Coût complet sans oracle

Nouvelle invocation ROOT PASS 61,924 s ; un cycle A/B/B/A par corpus, contextes et Workers frais. Checkpoint froid, huit deltas de chauffe, 56 mesurés. Pas de lecteur d'oracle, clone témoin ou scans de graphes dans ces cohortes. Callback commun : index actuel puis Nature.readScene sous son vrai frame, 54 lectures de scène par passe, aucun repli legacy. Ce callback ne contient pas le GPU, le GAME ni applyWorld entier.

| Moyennes des deux passes, ms | Aulnes A→B | mixed A→B |
|---|---:|---:|
| Requête→fin callback MAIN | 9,154→23,682 (+158,71 %) | 8,886→32,666 (+267,59 %) |
| Requête→réponse, ACK posté inclus | 9,227→23,776 | 8,933→32,757 |
| Adoption MAIN inclusive | 3,825→10,878 | 1,767→17,819 |
| Checkpoint froid, requête→callback | 203,657→511,738 | 79,475→312,830 |

Les p95 d'adoption MAIN Aulnes passent de 8,73/7,99 à 27,56/26,65 ms. Le strict Worker paie encore 3,59/3,72 ms moyens sur les deux passes Aulnes. Outstanding maximal 1 et aucun ACK invalide sur ces livraisons sérielles ; cela ne certifie pas une file bornée sous charge réelle. Les chronos de livraison, adoption et callback se recouvrent, ils ne s'additionnent pas. Le SHA final apparié est une provenance, pas le remplacement des oracles de graphes.

Rapport de coût `run-cost-2026-10-06T22-27-12.060Z-3vf2qf/report.json`, SHA C663B8B1. Sources, tests, package et références publiques exacts avant/après ; erreurs de console/HTTP vides. Tous Workers, navigateurs et origines possédées 5250/5251 sont fermés, y compris aux sorties rouges. Sessions utilisateur préservées.

Documentation ROOT PASS 0,884 s via `validate:logged` : 821 documents, 7 981 liens locaux, 25 IDs et cinq familles conservés. `git diff --check` passe ; aucun contrôle produit lourd relancé pour cette clôture documentaire.

## Décision et limite

Le transfert ne libère pas MAIN : son adoption devient plus chère, et la latence complète augmente aussi. Aucun GAME, build produit, promotion ou second banc lourd inchangé. Les textes du GAME conditionnel restent non générés. Le contrôle proposé stale/refus tardif/checkpoint-epoch reste un design non exécuté, sans preuve attribuée ; aucune perte GPU ou panne fatale source promise.

L'adoption complète est minutée ; le propriétaire seul n'a pas de profil causal exclusif dans ce banc. La fermeture générique est une piste statique de coût, pas une attribution chiffrée démontrée. Une prochaine variante pourra exploiter le vrai clone privé et la reconstruction data-only pour éviter des descripteurs par champ, avec propriété lexicale, replis avant freeze et coût complet à requalifier. Ce design ne constitue ni un gain acquis ni un avantage présumé du langage.
