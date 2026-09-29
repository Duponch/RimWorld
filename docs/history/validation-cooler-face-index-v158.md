# Index local des faces de climatiseur — preuve V158

V158 réduit seulement le coût des vérifications de faces pendant `advanceCoolers`. Le [contrat](../development/cooler-face-index-v158.md) conserve la règle de la [conservation froide V75](../development/cold-store.md), la validation des plans et le schéma **157**. Code de départ `4a20c73` ; la modification préexistante de `src/render/GpuGroundGrassLayer.ts` reste extérieure à ce lot. Aucune nouvelle mécanique de jeu ni migration n'est ajoutée.

Sur la sauvegarde versionnée `public/test-saves/v98/mixed-100.json` (SHA-256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`, 250×250, 104 personnes, 100 animaux), le microbanc migre le schéma 91 vers 157 puis exécute 20 vrais ticks pour établir l'alimentation. Il trouve 670 structures et 17 climatiseurs, dont 14 alimentés. Le contrôle scalaire examine leurs 28 faces, sans obstacle sur cette scène. Le nouveau calcul produit exactement le même World sérialisé après une étape thermique, y compris températures et états `high`. Les tests ciblés ajoutent faces barrées, roche, hors carte, plan, empreinte non solide et mutation entre deux appels. La fonction scalaire historique demeure l'oracle indépendant.

Une trace complète de **80 ticks**, 2 001 à 2 080, compare à chaque tick l'empreinte SHA-256 du World sérialisé et les PRNG monde/faune avant et après la retouche : **80/80 lignes identiques**, même fixture. Sorties `tmp/trace-mixed-v147-v158-{baseline,cooler}.json`. La trace n'est pas une mesure de vitesse.

Le microbanc `scripts/benchmark-cooler-v158.ts` alterne ancien/nouveau/nouveau/ancien sur quatre tours, 80 appels par lot et 40 appels de chauffe. La géométrie est figée ; chaque lot repart des mêmes températures et états `high`, et la remise en état restitue exactement le World et les PRNG initiaux. La construction de l'index local est **incluse** dans le temps nouveau. Node 24.11.1, Windows, Ryzen 5 3600 ; rapport `tmp/benchmark-cooler-v158.json` avec 16 échantillons et empreinte du source :

| Sous-coût isolé | Ancien | V158 | Rapport |
| --- | ---: | ---: | ---: |
| 80 appels, moyenne de huit lots | 103,45 ms | 5,50 ms | ×18,82 |
| Un appel équivalent sur cette scène | 1,293 ms | 0,069 ms | — |

Le profil local du chemin worker, 20 ticks de chauffe puis 60 ticks consécutifs avec un message cloné par tick, donne `stepWorld` 36,49 ms de moyenne / 59,06 ms p95 avant et 32,10 / 46,65 ms après. Ces deux exécutions séparées ne forment **pas** un A/B contrôlé de tick complet ; chauffe, autres systèmes et machine peuvent expliquer une part de l'écart. L'encodage, le clone et le rendu restent des coûts distincts. Le microbanc établit le gain de la vérification des faces sur cette charge, **pas** un facteur d'accélération du jeu, du navigateur, du GPU ou des FPS.

Contrôles finaux : tests thermiques ciblés **7/7** dans trois fichiers (cinq cas historiques volontairement non lancés car hors du sous-coût ou campagne longue), build TypeScript/Vite **609 modules**. La régression hors campagnes longues passe **302/302 fichiers, 1 328 tests réussis et un ignoré** en 223,37 s (`tmp/v158-regression.log`). Le contrôle documentaire passe sur **556 documents et 5 442 liens locaux**, six en-têtes au schéma 157 et les trois originaux inchangés. Les campagnes naturelles longues, la suite navigateur et une comparaison native A/B/B/A ne sont pas rejouées ; la preuve du microbanc CPU ne les remplace pas.
