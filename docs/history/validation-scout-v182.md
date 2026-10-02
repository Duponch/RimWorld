# Validation — Reconnaissance individuelle V182

Contrat : [reconnaissance](../development/caravan-scout-v182.md). Référence : [relevé Core](../research/caravan-core-v182.md). Schéma 171 après validation stricte de 170 ; le schéma historique 170 reste sans reconnaissance ajoutée. Cette preuve concerne un circuit abstrait de six heures par un colon, pas un globe ou les caravanes Core exhaustives.

## Sources et scène

Travail du 2 octobre 2026 depuis `7ba24d8` (V181). L'édition préexistante de `src/render/GpuGroundGrassLayer.ts` est conservée et exclue du commit. Aucune mise à jour de dépendance, aucun push, aucun fichier actif de session déplacé sur C:.

`public/test-saves/v182/reconnaissance-et-retour.json`, SHA-256 `991ff54400b0077386c33cde80047d71cb974fb8456d50bbdf86c34b858f9689` : scène **préparée**, schéma 171, graine 13312, 250 × 250, trois colons, tick zéro. Ada et quatre rations issues d'une pile initiale sont placées près d'une bordure, sans reconnaissance accomplie ni matière créée. Le catalogue comporte désormais 34 scènes ; les 33 fixtures antérieures gardent leurs octets.

## Contrôles acquis

La suite ciblée initiale passe **39/39 dans 12 fichiers** (`tmp/scout-v182-targeted.json`). Elle regroupe chargement, division et réservation, annulation et déchargement atomiques, migration stricte/future-fields, propriétaire unique, références sociales et deuil, politique engagée, retour fermé puis débloqué, reprise à chaque phase et adoption/refus de snapshots au même tick. Le retour reste possible si le résident du foyer meurt pendant le voyage. Une annulation pendant une arête a exposé un état impossible à sauvegarder ; l'état est corrigé sans changer l'arête, puis reprise exacte vérifiée.

La revue finale a trouvé une lecture prématurée de `owner.type` pour une pile de chargement malformée. Le garde est ajouté ; sauvegardes et checkpoints avec propriétaire nul, absent ou chaîne sont refusés sans exception ni engagement du décodeur. Les deux fichiers concernés passent ensuite **11/11**, dont deux nouveaux tests (`tmp/scout-v182-correction-targeted.json`), et le typage passe.

Le parcours **Chromium natif WebGPU passe 1/1 en environ une minute** (`tmp/scout-v182-native-final.log`). Le menu charge la scène depuis ses 34 choix, le bouton Monde lance trois rations au tick zéro, Ada quitte effectivement la carte au tick 9, la sauvegarde/reprise menu conserve exactement son état hors carte et le jeu la rend au foyer ; le contrôle observe le retour au tick 1513. Cinquante repas initiaux deviennent quarante-neuf après une ingestion. Pas d'erreur navigateur recueillie. Les captures prêt/voyage/retour et la preuve JSON sont sous `tmp/test-runs/scout-v182-native-final/artifacts/`. Le premier essai s'était arrêté sur le texte attendu « chargement » alors que l'UI annonçait correctement « pour charger ... au contact » ; cet oracle est corrigé, sans raccourci de simulation.

## Sous-coût de retour

Microbanc CPU **isolé**, Windows 10.0.26300, AMD Ryzen 5 3600, Node 24.11.1, carte préparée 250² étendue à soixante résidents pour la charge. `tmp/scout-perf-v182/before.ts` conserve la première implémentation du retour V182 (SHA-256 `63a58fd618cc7dcb2552b1366335735d2b44d4345251de1ba5f85b53352f8f40`) ; `bench.ts` compare la version avec captures de connectivité différées et réutilisées seulement dans cette décision. La fonction produit mesurée dans `src/sim/caravan-trip.ts` a le hash `5f83a87d0f3ae7f95572f4be729b2a674821ee57d09aa21ebdd91b2959749943`. Huit échauffements par fonction et scène, quatre séries A/B/B/A, vingt appels par bloc ; copie du World hors chronométrage. Deux scènes : bord ouvert ou entièrement fermé. L'oracle compare le **World exact, possessions et RNG compris**, pour chaque scène.

Dans `tmp/scout-perf-v182/results.json`, les moyennes des huit blocs A/B sont **4,42 → 2,91 ms** au bord ouvert et **3,26 → 1,87 ms** au bord fermé. Les médianes de blocs vont de 3,53–4,28 à 2,47–2,84 ms (ouvert), et de 2,40–3,02 à 1,69–2,03 ms (fermé). La colonne du script nommée `p95` prend l'indice 19 sur vingt appels, donc leur maximum ; ces pointes restent bruitées, jusqu'à 24,35 ms, et ne valent pas un percentile sur une campagne longue. Ces chiffres décrivent seulement une tentative de rentrée préparée, pas le tick complet, le worker, le coût d'une image ou le GPU. Une attente fermée ne retente que toutes les vingt ticks ; aucun graphe permanent ni parcours mondial n'est ajouté. Le dernier garde de propriétaire concerne la validation, sans changement de la fonction mesurée.

## Régression et compilation

La régression hors campagnes longues a terminé ses **359 fichiers en 325,6 s : 1 574 réussis, un ignoré et un échec** (`tmp/scout-v182-regression.json`). L'unique échec est l'oracle de `bereavement-demo-v181.test.ts` qui comparait le monde **après migration** au schéma historique 170. Il contrôle maintenant séparément le schéma 170 du JSON original et `SCHEMA_VERSION` du monde migré. Son SHA historique et toutes les assertions de décès, identité, pensées et reprise sont conservés ; ses **deux tests passent** après correction (`tmp/scout-v182-schema-oracle.json`). Le code produit n'a pas changé après la série générale ; celle-ci n'a pas été entièrement rejouée pour ce seul oracle.

Le test de la nouvelle fixture distingue lui aussi le schéma 171 de son JSON original du schéma courant après migration, pour éviter de reproduire cette attente figée au prochain lot. Ses **2/2 contrôles** sont rejoués après cet ajustement (`tmp/scout-v182-final-demo.json`), sans changement de fixture ou de code produit.

Build TypeScript/Vite passé, **624 modules** (`tmp/scout-v182-build.log`) ; avertissement connu de chunks dépassant 500 kB, sans échec. Les contrôles ont été exécutés successivement, sans lancer de nouvelle campagne longue ni mesure GPU dédiée.

## Présentation et documentation

`npm run test:presentation` passe après la compilation : 45 secondes de minage puis 45 secondes d'abattage sur carte naturelle 250², trois colons, vitesses 1/6/1/3. **Zéro saut et zéro occupation solide** pour les deux actions (`tmp/scout-v182-presentation.log`). Intervalles d'images p95 4,3 ms pour chaque scène, maxima 25 ms au minage et 37,5 ms à l'abattage ; ces intervalles RAF ne mesurent pas le coût GPU. Le voyage lui-même est observé par son parcours natif préparé, et ses changements de propriétaires par les tests de bridge ; ce contrôle générique de travaux ne remplace pas ces deux preuves.

Le contrôle documentaire passe : **629 documents, 6 005 liens locaux**, six en-têtes au schéma 171, 25 domaines et cinq familles conservés, trois originaux du corpus byte-identiques. Les captures prêt/voyage/retour ont été inspectées : sélecteurs lisibles, voyageur retiré de la barre locale, mêmes possessions annoncées et provisions restantes déposées au point d'entrée. `git diff --check` ne signale pas d'erreur.

Les campagnes naturelles longues, le navigateur exhaustif, le coût général de tick et un chronométrage GPU dédié ne sont pas acquis par ces ciblés ou le parcours préparé. Les maladies, incapacité/assistance et incidents mondiaux restent différés avec la planète, les groupes et destinations. Une rentrée fermée conserve les besoins à la fin du circuit, adaptation explicite du premier lot.
