# Index de réservations alimentaires animales — preuve V153

V153 optimise uniquement la lecture des réservations de piles pendant `animalFoods`. Le [contrat](../development/wildlife-reservation-index-v153.md) décrit la portée et l'invariant. Les profils [V145](validation-performance-reference-v145.md), [V146](validation-performance-v146.md), [V147](validation-firefighting-performance-v147.md) et [V151](validation-cooking-performance-v151.md) motivent des retouches mesurées et bornées ; leurs nombres ne sont pas extrapolés à V153. Schéma **152**, règles de jeu inchangées.

## Oracles

`tests/wildlife-reservations-v153.test.ts` confronte l'index à `reservedSource` sur l'ensemble des familles de réservations actives de cet oracle : repas animal, enterrement, chasse, équipement, ingrédients de cuisine tenus ou à prendre, manipulation et soin animal, traitement médical, nourrissage, gardien, transport, repas humain et ordres de transport ou cuisine en file. Il vérifie explicitement l'exclusion d'un acteur dont les propres ordres en file restent comptés. Un second cas compare la liste **ordonnée** des aliments, avec identités et quantités, à la copie figée pré-V153 de `animalFoods` dans `scripts/benchmark-wildlife-reservations-v153.ts`.

Sur `public/test-saves/v98/mixed-100.json` (SHA-256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`), les 100 animaux ont des propositions complètes identiques entre l'ancien code et V153. Le World sérialisé et les PRNG monde/faune/feu restent inchangés par ces lectures. Une trace distincte de **80 ticks**, 2 001 à 2 080, obtenue avant puis après la modification avec `scripts/trace-mixed-v147.ts`, compare à chaque tick l'empreinte SHA-256 du World sérialisé et les PRNG monde/faune : **80/80 lignes identiques**. Les fichiers de travail sont sous `tmp/trace-mixed-v147-{baseline,candidate}-v153.json`. Typage `npm run typecheck` et tests ciblés `wildlife-reservations-v153.test.ts` + `wildlife.test.ts` : **8/8 réussis**.

`npm run build` réussit sur la source V153 : TypeScript sans erreur et 609 modules transformés par Vite ; l'avertissement préexistant de taille des chunks subsiste. `npm run test:regression` réussit hors campagnes longues : **288/288 fichiers, 1 244 tests réussis et un ignoré** en 207,25 s, journal `tmp/v153-regression.log`. Le pilote de colonie est exécuté séparément car ses scénarios longs ne font pas partie de cette commande.

## Mesure du sous-coût

Node 24.11.1, Windows, AMD Ryzen 5 3600. Le banc migre la sauvegarde au schéma 152 et prépare deux scènes **hors chronométrage**, chauffe les deux variantes, puis alterne ancien/V153/V153/ancien sur quatre tours. Les propositions restent en lecture seule. Le rapport `tmp/benchmark-wildlife-reservations-v153.json` contient les 16 échantillons par scène, empreintes des deux sources, matériel et métadonnées.

| Scène figée | Piles alimentaires au sol | Appels par lot | Ancien, moyenne | V153, moyenne | Ratio |
| --- | ---: | ---: | ---: | ---: | ---: |
| `mixed-100`, 250×250, tick 2 000 | 51 | 100 | 98,15 ms | 52,46 ms | ×1,87 |
| Préparée, proposition seule | 307 | 50 | 174,40 ms | 30,30 ms | ×5,76 |

La seconde scène ajoute 256 piles de riz pour isoler ce sous-coût ; ce montage n'est **pas** une sauvegarde de colonie valide à poursuivre ni une estimation de sa fréquence naturelle. Les résultats ne mesurent que les appels à `animalFoods` dans des mondes figés : ils ne mesurent ni tick complet, ni worker, ni navigateur, ni GPU, ni FPS. Aucune accélération globale ne peut en être déduite.
