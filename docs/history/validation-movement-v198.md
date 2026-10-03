# Validation de continuité et diagnostic CPU — V198

3 octobre 2026, schéma182 inchangé. [Contrat](../development/movement-continuity-v198.md), [recherche Core/Web](../research/navigation-cpu-gpu-v198.md). Correction de trois contrôleurs existants, pas nouvelle mécanique. Mode jour, commit local puis arrêt ; aucune poussée automatique.

## Simulation et témoins

Les nouveaux contrôles utilisent blessures réelles, trajets effectivement calculés, budgets et véritables productions. Fuite saine/blessée : continuité interne aux routes et réobservation au refuge séparées, absence de dommage/stagger, sauvegarde/reprise exacte. Cas isolés : hash non échu, observation sous budget épuisé, porte en ouverture, route bloquée et délai d'échec conservé. Prédateur : cible mobile, budget consommé par un autre animal, prochain pas sûr ou obstacle/route absente. Repas et sculpture : fabrication réelle puis encombrement des voisins, trajet vers un dépôt au-delà, destination occupée entre décisions, reprise et identité conservées.

Les premiers rouges du pilote de fuite utilisaient un oracle incorrect sur les frontières de refuges. La lecture Core les a séparés de la continuité interne ; ils ne prouvent pas un défaut. Le témoin isolé de nouvelle décision après observation est renforcé à partir de cette référence, sans suppression de la cadence hash35. Les mesures de frontières conservent aussi le début physique d'arête : l'overshoot existant peut le précéder d'au plus un tick, sans antidater l'admission logique.

Deux anciens tests ont échoué : le pilote de migration animale attendait encore178 après une migration jusqu'au schéma courant182 ; la rétro-fixtureV35 déclarait un filtre `red-fox-meat` futur. Correction des attentes/préparations, originaux publiés immuables et validation production inchangée. Le testV35 exige toujours le refus explicite de ce filtre futur.

**100 tests uniques dans 17 fichiers passent par reprises**, dont 16 nouveaux dans les deux fichiers V198. Régression initiale76:74réussis/deux attentes historiques en échec ; reprise de ces deux fichiers8/8, puis nouveaux témoins et contrôleurs ordinaires40/40dans six fichiers (24contrôles supplémentaires uniques). Les deux dépôts conservent aussi la route sous délai de planification, sans appel supplémentaire à `WeightedSearch.advance` ; reprise dédiée 7/7 après ce renforcement. Le témoin chargeant les trois modules du commit `e00aa9f` fait échouer **9/16** nouveaux tests,7passant aussi sur l'ancien code. Ne pas assimiler les trois premiers rouges de fuite mal spécifiés à ces neuf témoins corrigés.

Build et typage679modules passent, puis typage final incluant les nouveaux pilotes et le profil. Présentation250² minage10796frames/abattage10709, p95RAF4,3ms dans les deux cas, zéro saut, excès ou occupation solide. Pas de suite exhaustive ni campagne naturelle longue.

## Navigateur et présentation

Chromium matériel WebGPU : deux parcours ciblés uniques passent par reprises. Le parcours V197 du poursuivant passe à1×/6×,34,0s ; la première passe du nouveau fuyard a expiré sans trace finale exploitable. La capacité de la sonde était insuffisante pour la reprise suivante : son plafond de 5 000 frames était inférieur aux5 791 frames finalement capturées à1×. Plafond résident borné à 16 000 et sauvegarde des traces en cas d'échec, sans changer une règle du jeu ni détendre l'oracle temporel. Reprise du seul nouveau parcours :1/1,50,7s de test (53,9s de commande).

La relecture des captures de cette reprise montrait que le corps pouvait sortir du champ. Le pilote a été renforcé : piste entière cadrée par la véritable caméra et proxy corporel sur le canvas à chaque frame, avec borne de visibilité ≥98 %. Reprise finale du seul V198 :1/1, environ1,1min. Captures relues : les deux corps sont visibles.

**Passe finale V198** :1× sain : 4 972 frames, deux renouvellements de refuge,4 460 intervalles mobiles, attente maximale interne présentée de 0,993 tick ;6× blessé réel : 1 459 frames, deux renouvellements,1 264 intervalles mobiles, maximum de 0,9828 tick. Corps du fuyard visible sur le canvas dans 100 % des frames des deux vitesses. Borne de 1,25 tick inchangée pour le suivi GPU/clock ; les attentes légitimes au refuge sont séparées dans les tests de simulation. Sauvegarde/reprise pendant la marche, absence de coups et erreurs console, overflow faux. Ces scènes96² préparées ne sont ni la sauvegarde personnelle de l'utilisateur ni une campagne autonome.

Journaux sous `tmp/v198`, `tmp/v198-flee` et `tmp/test-runs/v198-native-replay` et `tmp/test-runs/v198-native-visible`; premier V197 dans `tmp/test-runs/2026-10-03T15-20-33.492Z-25216`. Contrats graphiques des dépôts/prédation non rejoués exhaustivement : simulation ciblée, présentation commune et renderer inchangé. Aucun bancGPU général ni nouvelle mesure native de performance.

## CPU actuel, successif au navigateur

`scripts/profile-navigation-v198.ts`, Node24.11.1, AMD Ryzen5 3600. Fixture publiée `public/test-saves/v98/mixed-100.json`,250²,104 humains/100 animaux, strictement migrée182 avant chronométrage. SHA256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`;20 ticks de chauffe puis60 mesures,2000→2080. Les hashes de sources et rapport complet sont dans `tmp/v198/navigation-cpu.json`.

Passe sans instrumentation : `stepWorld` moyenne53,63ms, p50 47,54, p95 84,27, maximum144,57. Passe séparée avec instrumentation et échantillonnage : moyenne50,44ms, p95 78,80. Cette différence n'est pas un gain A/B : JIT/chauffe/échantillonnage diffèrent. Les deux continuations sérialisées ont le même hash `1acf4d7c519fdad74f11291a48ca3407159577b0d2b2deb3eca7c1647b0f1c6d`.

La passe instrumentée compte143 champs et188 appels `advance`,114 598 visites ;77,44ms cumulées, soit1,29ms/tick et2,56% du tick instrumenté. Ce **sous-coût** exclut construction/allocation du champ, capture des coûts/topologie, reconstruction et classement des candidats. Ne pas appeler ce nombre coût total de navigation. L'échantillonnage situe aussi `findRoute`, `canStandAt`, `planWork`, la faune et les règles d'occupation parmi les postes visibles ; ses pourcentages self et l'overhead inspecteur ne constituent pas des temps de sous-systèmes complets.

Une seule fenêtre préparée, pas campagne naturelle, test du worker complet, RAF, GPU ni comparaison avant/après deV198. Les anciens relevésV146 sont datés ; aucune accélération générale, coûtGPU nul ou débit6× annoncé. Le laboratoireGPU n'a pas été relancé ; ses chiffres historiques et ses limites figurent dans la recherche.

Documentation :680 documents/6 553 liens, six en-têtes courants au schéma 182 et trois originaux inchangés contrôlés. `git diff --check` passe. Les sorties restent dans `tmp/`, aucun artefact historique remplacé.
