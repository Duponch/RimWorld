# Validation V107 — salissures transparentes

26 septembre 2026, depuis `834ce7e` (V106). Demande utilisateur : remplacer le sang et les saletés rectangulaires par des formes naturelles et vérifier l'empilement Core. [Recherche datée](../research/filth-visual-reference-v107.md), [contrat](../development/cleanliness.md#aspect-des-traces-v107). Recherches et relecture indépendantes, intégration et validation centrales.

## Résultat et périmètre

Un seul lot instancié remplace les trois boîtes opaques de chaque trace. Atlas original de 24 motifs à bords transparents, une surface par épaisseur, poussière légère, projections et gouttes, cendres étendues. Teintes alpha Core pour terre/sang/vomi/cendres ; silhouettes et couleurs de texture propres à Lisière. Rotation, retournement et décalage stables par cellule/espèce/couche ; aucun PRNG de simulation touché. Lumière locale et ombres reçues conservées, aucune ombre émise par une tache, aucun chargement d'image réseau.

Schéma **106**, catalogue et règles de propreté/nettoyage inchangés. Aucun fichier `src/sim` modifié. Les onze colonies de bibliothèque sont préservées. Pas de parité pixel Unity ni de `BloodSmear` nouvellement implémenté. G0 en consolidation ; G1–G4 partiels, G5 absent ; aucun jalon global clos. Le [cadrage industriel](../research/industry-reference-v108.md) prépare la suite sans constituer une fabrication jouable.

## Contrôles courts et gestes réels

[Campagne groupée](../../artifacts/filth-tests-v107.json) : **26/26 contrôles**, six fichiers, dont sept nouveaux contrôles de rendu. Les 24 motifs ont des bords transparents, des silhouettes non rectangulaires et des alpha intermédiaires ; la terre est moins dense que le sang. Placement/tailles, stabilité du préfixe lors d'épaississement/nettoyage, absence de tirage global et d'upload inutile, mutation en place des traces et restauration versionnée après précompilation vide sont contrôlés. Propreté, alimentation contaminée, sols, éclairage commun et commandes de paysage conservées gardent leurs contrôles existants.

[Parcours Chromium WebGPU](../../tests/integration/filth-visual.spec.ts), [rapport](../../artifacts/filth-native-v107.json), sources gelées : scène explicitement préparée à midi, six espèces × trois épaisseurs, sols clairs/sombres et sang/terre au même endroit. Rotation et zoom par vrais gestes ; les 65 plans initiaux ne réécrivent pas leurs attributs. Ordre de nettoyage par UI : les épaisseurs **5, 4, 3, 2, 1, 0** sont toutes observées, 60 plans restent après retrait du sang ciblé. Sauvegarde, rechargement à froid et monde exact au tick 3037 ; aucune erreur JS/GPU. [Vue témoin](../../artifacts/filth-chart-v107.png), [caméra](../../artifacts/filth-camera-v107.png), [nettoyage](../../artifacts/filth-cleaned-v107.png).

Le [premier échec conservé](../../artifacts/filth-native-failure-v107.json) venait du pilote : `cleaned` compte les traces entièrement retirées, et non cinq couches. L'attente a été corrigée vers une trace, en gardant l'observation obligatoire des six épaisseurs. La première préparation était nocturne ; le parcours final à midi rend les couleurs plus lisibles. Aucun changement de règles ni suppression d'assertion de conservation.

## Coûts natifs, successifs

[Comparatif](../../artifacts/filth-render-v107.json) et [vue entière](../../artifacts/filth-render-overview-v107.json), reproductibles avec `node scripts/filth-render-v107.mjs` puis `FILTH_OVERVIEW=1`. Chromium natif, WebGPU AMD RDNA1, 1440×1000, source figée. Fixture historique `mixed-100` décodée sans modification du fichier : **100 colons, 2 visiteurs, 2 morts et 100 lièvres**, activités mixtes, puis contamination artificielle préparée. **2 869 traces / 13 899 couches** au départ, qui évoluent librement en simulation. Chaque fenêtre dure six secondes après stabilisation.

| Rendu / vue | Pause : image p95 / max | ×6 : image p95 / max | ×6 : CPU d'image p95 | Débit réel |
|---|---:|---:|---:|---:|
| Anciennes boîtes V106, vue large (184,32 cases) | 4,3 / 4,4 ms | 29,1 / 83,4 ms | 27,3 ms | 2,32× |
| Nouvelles couches V107, même vue large | 4,3 / 8,3 ms | 20,9 / 95,8 ms | 21,1 ms | 2,25× |
| V107, dézoom maximal (375,55 cases) | 4,3 / 4,3 ms | 20,8 / 83,3 ms | 18,6 ms | 2,65× |

La pause est proche de la limite écran de 240 Hz ; la simulation active reste très loin de 240 FPS constants et de ×6. Le CPU d'image inclut l'adoption du monde ; ce n'est pas un temps GPU isolé. L'ancien rendu est restauré depuis Git dans la réponse HTTP du test, avec un simple adaptateur précompilation/libération ; aucune source servie n'est éditée pendant la mesure. La qualité visuelle diffère intentionnellement et les étapes métier ne sont pas identiques aux mêmes instants réels : **pas de gain causal général ou de régression moteur attribué à ce seul passage**. Les pics restent publiés. Les mesures V106 antérieures utilisaient une autre charge et ne sont pas une référence interchangeable.

Le nouveau lot a 2 triangles par couche (27 798 ici), contre 36 par trace pour les trois anciennes boîtes (103 284 ici). Les surfaces alpha augmentent cependant le coût des fragments superposés : le nombre de triangles seul ne prouve pas la performance. Atlas RGBA de 1,5 Mio avant mipmaps, géométrie partagée et attributs résidents ; pas de bruit procédural par fragment. À chaque changement de traces, les attributs sont réécrits ensemble ; une optimisation par plages n'est pas revendiquée.

Réparations du banc, avant ses mesures finales : enveloppe de sauvegarde compressée décodée par le codec commun ; sols préparés exclus de l'eau/roche ; attente de 104 acteurs et non 100 colons ; lecture portable de l'adaptateur WebGPU. La première vue large n'était pas la carte entière : étiquette corrigée et mesure additionnelle au dézoom maximal. Aucun état métier invalide accepté pour obtenir un résultat.

## Validation de livraison

Typage et build passent ; avertissement existant de taille des bundles Vite conservé. Aucun contrat temporel n'a changé : pas de nouvelle campagne annuelle. Le parcours natif réussi a pris 22 secondes ; les reprises de pilotes et fenêtres de mesure sont distinctes du travail d'implémentation. La revue indépendante n'a identifié aucun défaut bloquant de cycle de vie ou de persistance.

Documentation vérifiée : 392 documents, 4 294 liens locaux, identifiants et trois sources originales préservés.

## Publication

Production Netlify **`6ab78cd1cbfca039739970d1`**, 36 fichiers, état ready. [Déploiement](../../artifacts/netlify-v107.json), [contrôle public](../../artifacts/netlify-smoke-v107.json). Création avec trois personnes, schéma 106, 62 outils illustrés, panneaux sans dépassement horizontal, sauvegarde et restauration à froid ; aucune erreur JS/GPU, aucun export de diagnostic en production. Le rendu des salissures et les mesures détaillées sont éprouvés localement sur les mêmes sources de build ; le contrôle public couvre le parcours général et la nouvelle compilation à carte vide.
