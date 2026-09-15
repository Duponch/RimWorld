# Préparation des ombres des lots résidents

15 septembre 2026, Three.js 0.186.0, schéma de jeu V28 inchangé. Contrat de présentation ; aucune règle, quantité, trajectoire ou sauvegarde ne change. Voir les [mesures](validation.md).

## Cause vérifiée

Une première apparition de fragments dans des chunks de piles encore vides demandait huit pipelines `ShadowMaterial` synchrones pendant le minage. Une trace Chromium montre un traitement de commandes de 115,955 ms sur `CrGpuMain` juste avant une image retardée ; ce n’est pas une mesure directe du temps des shaders sur le matériel. L’adoption CPU et la méthode de rendu seules n’expliquaient pas cette attente.

Le [code officiel ShadowNode r186](https://github.com/mrdoob/three.js/blob/r186/src/nodes/lighting/ShadowNode.js) exclut expressément la mise à jour des cartes d’ombre pendant la précompilation. `compileAsync` des deux projections ne suffit donc pas à préparer les ombres des lots qui n’ont encore rien dessiné. Les [attributions Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames) localisent les scripts principaux, mais ne remplacent pas une trace GPU.

## Préparation et invariants

`BoxBatches.prepareEmptyShadows` expose temporairement une instance dégénérée dans chaque lot vide déjà alloué. `shadow-preparation.ts` exécute une passe réelle après la compilation des deux projections, pendant la préparation de la carte. La boucle ordinaire est suspendue et le culling temporairement désactivé par `preparePresentation`. L’attente de la file WebGPU est bornée à 30 secondes ; le repli WebGL n’appelle pas cette API.

Un `finally` restaure les comptes et les valeurs exactes des matrices, avec les mêmes objets GPU, sans réallocation de capacités. Si un snapshot a entre-temps mis à jour un lot, sa nouvelle version prime et n’est pas écrasée par la restauration. La préparation ne touche pas au World. Les lots non vides restent tels quels. Les compteurs de cadence sont réinitialisés après chargement, indépendamment du temps de simulation.

Ce choix déplace de la compilation vers le chargement initial. Il ne supprime ni son coût, ni les éventuelles compilations de nouveaux matériaux ou de capacités encore inconnues. À l’ajout d’un nouveau lot graphique, vérifier sa préparation et enrichir le même audit ; ne pas multiplier les meshes individuels ni désactiver silencieusement les ombres.

## Reproduction et limites

`scripts/mining-render-bench.mjs` observe les appels natifs de création de pipeline, les extractions, intervalles d’image et coûts d’adoption. `MINING_COUNTS=100` cible la charge haute. `MINING_SKIP_SHADOW_PREPARATION=1` remplace uniquement le helper de préparation dans la réponse du serveur au navigateur pour le témoin ; il ne modifie aucun fichier ni aucune règle du jeu. Hors témoin, le banc refuse toute compilation de pipeline observée pendant cette charge connue.

`MINING_TRACE=1` active une capture CDP bornée, décrite dans `scripts/render-trace.mjs`. Les traces brutes restent dans `tmp/render-traces`, avec taille, catégories et SHA-256 dans les preuves. `scripts/summarize-render-trace.py` extrait les événements GPU corrélés aux marqueurs. Les catégories détaillées de peinture et Dawn sont exclues du profil final : elles ont fortement perturbé un essai et fait dépasser le budget de 128 MiB d’un autre. Une trace instrumentée n’est pas un benchmark de cadence comparable au relevé sans trace.

Le scénario vérifie une colonie de mineurs sur un matériel donné, pas tous les usages futurs. Les invariants purs portent sur restauration, identité, capacité et réutilisation après préparation. Les parcours graphiques courts vérifient chargement/rechargement et backend ; les longues parties de simulation ne sont pas répétées pour cette correction de présentation.
