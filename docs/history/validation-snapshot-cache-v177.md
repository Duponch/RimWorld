# Cache terrain des snapshots V177 — 1er octobre 2026

Lot interne à partir de `ac1f067`, sans nouvelle mécanique ni migration : schéma 166. Le [contrat](../development/snapshot-cache-v177.md) et la [recherche Web](../research/snapshot-cache-web-v177.md) conservent la comparaison de tous les champs à chaque publication, même au même tick. Les éditions utilisateur de `GpuGroundGrassLayer.ts` et le statut préexistant d'`engine.ts` restent hors du lot.

## Exactitude et périmètre

Le cache terrain regroupe cinq primitives copiées par case dans un tableau privé réutilisé au checkpoint ; aucune référence mutable ne sert de témoin. Le scan complet O(N), les tuples, les epochs/révisions, les commandes, le décodeur et la cadence du worker restent inchangés. Le nouveau contrôle bridge exerce les cinq champs au même tick, le checkpoint, les anciennes frames et les remplacements de cartes 32² → 16² → 48² → 16².

Le banc compare le module Git figé `ac1f067:src/bridge/snapshots.ts` au candidat, avec seulement les imports déplacés pour le témoin sous `tmp/`. Son oracle passe **21 publications**, paquets clonés, mondes décodés, PRNG et anciennes frames exacts : commandes, terrain, pierre, dégâts, minerai, sol, ressources/piles, suppressions, ordre, trous de révision et nouveau monde. Une première préparation ajoutait une copie de plante invalide ; le témoin la refusait également. Elle a été remplacée par un rocher admissible avant toute mesure, sans relâcher les assertions.

## Mesures CPU

Windows, Node **24.11.1**, AMD Ryzen 5 3600 ; sauvegarde commune `public/test-saves/v98/mixed-100.json`, SHA-256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`, 250 × 250, 104 personnes et 100 animaux, schéma 91 migré strictement en 166. Sources gelées ; pas de navigateur ou campagne lourde concurrente. Les applications utilisateur ne sont pas arrêtées.

Deux A/B/B/A du candidat final utilisent **100 ticks de chauffe et 100 mesurés** par bloc ; la sonde de scan utilise séparément **200 appels de chauffe et 200 mesurés**. Le reset terrain répété, hors simulation et sans encodage du checkpoint complet, passe de **6,090 à 3,241 ms** moyens puis de **6,930 à 3,661 ms**, soit **−46,8 % et −47,2 %** sur ce seul sous-coût. Hash du cache final : `c80ab0e2b143c3041f6eae3a8517b227a35c2728311eb70daeb6b1bb5d0415cd`.

Le scan delta donne environ **2,514/2,507 ms**, puis **3,181/2,898 ms** moyens témoin/candidat : aucun gain stable établi. L'encodage complet du chemin local donne **7,162/6,696 ms**, puis **7,728/8,805 ms** ; la simulation varie elle aussi fortement. Ces sens opposés ne prouvent aucune accélération continue du worker. Le clone Node reste un substitut de copie, sans `postMessage`, ordonnancement, adoption, RAF ou GPU.

Les rapports de travail sont `tmp/v177-bench-second.json` et `tmp/v177-bench-third.json`. Le premier candidat allouait un tableau neuf par `push` à chaque reset ; son relevé court et sa chauffe de scan insuffisante restent dans `tmp/v177-bench-first.json`, hors preuve du candidat final. Ni mémoire gagnée, ni coût de chargement complet réduit, ni FPS supplémentaires ne sont déduits du reset isolé.

## Navigateur natif

Chromium **153**, WebGPU **AMD RDNA-1**, 1 920 × 1 080, DPR 1, même sauvegarde et pose iso proche, ×6 demandé. Chaque passe recharge le monde au tick 2000, chauffe le rendu **5 s en pause**, puis mesure **8 s actives** : ce n'est pas un régime de simulation long stabilisé. L'orchestrateur de travail sous `tmp/v177-native-abba.mjs` applique la référence par alias Vite sur un serveur dédié 5191 ; avant chaque passe, il vérifie l'import de l'URL réelle du module worker. Aucun fichier produit servi n'est réécrit, et le serveur utilisateur 5173 reste intact. Les hashes de `src`, `public`, HTML, configuration, référence et banc restent identiques avant/entre/après les quatre passes.

| Passe | Débit obtenu | RAF moyen (images/s) | CPU image p95 (ms) | Tick déclaré p95 (ms) | Décodage p95 (ms) |
| --- | --- | --- | --- | --- | --- |
| A1 | ×3,176 | 81,16 | 24,0 | 71,45 | 2,8 |
| B1 | ×3,226 | 81,66 | 23,0 | 75,60 | 2,6 |
| B2 | ×3,278 | 83,04 | 22,7 | 70,13 | 2,4 |
| A2 | ×3,221 | 82,58 | 23,8 | 66,86 | 2,4 |

Zéro erreur navigateur/GPU sur ces fenêtres. Les différences modestes ne démontrent aucun gain général ; le tick déclaré mesure la simulation, sans l'encodage et l'envoi. Aucun timestamp GPU n'est relevé : le code rendu n'a pas changé, mais cela ne constitue pas une mesure de son coût. Ni ×6 ni 240 FPS constants ne sont atteints. Rapports : `tmp/performance-audit-v140-v177-{a1,b1,b2,a2}.json` ; manifeste figé `tmp/v177-native-abba-manifest.json`.

## Validation finale

Régression hors campagnes longues : **342/342 fichiers, 1 512 réussis et un ignoré sur 1 513**, **341,66 s**. Le typage et le build passent, **614 modules**, avec l'avertissement préexistant de taille de chunk. Les contrôles courts du bridge initiaux passent et sont repris dans la régression finale. `npm run test:presentation` passe : minage **10 786 images**, abattage **10 733**, p95 **4,3 ms** chacun, zéro saut et zéro occupation solide, avec changements de vitesse. Campagnes naturelles longues, suite navigateur exhaustive, mémoire native et performance générale ne sont pas déduites de ce lot ; les parcours naturels V176 restent une preuve distincte réutilisée.

Les mesures CPU, la régression, le build, les quatre fenêtres natives et la présentation ont été exécutés successivement. La régression prend environ six minutes ; la présentation deux fenêtres de 45 s, hors préparation. Recherche, implémentation et rédaction n'ont pas été chronométrées séparément. Les reprises évitables portent sur la préparation végétale invalide du banc et sa chauffe initiale insuffisante, pas sur un échec produit.

Le contrôle documentaire final passe : **614 documents, 5 866 liens locaux**, six en-têtes au schéma 166 et trois sources originales conservées sans changement d'octets. Catalogue et guide joueur ne changent pas : aucune commande ni mécanique supplémentaire n'est livrée.
