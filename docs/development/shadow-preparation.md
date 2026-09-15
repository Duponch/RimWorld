# Préparation des ombres des lots résidents

15 septembre 2026, Three.js 0.186.0. Contrat de présentation, complété lors de V29 ; aucune règle, quantité, trajectoire ou sauvegarde ne change du fait de cette optimisation. Voir les [mesures courantes](validation.md) et les [preuves initiales V28](../history/validation-v28-mining-shadows.md).

## Cause vérifiée

Une première apparition de fragments dans des chunks de piles encore vides demandait huit pipelines `ShadowMaterial` synchrones pendant le minage. Une trace Chromium montre un traitement de commandes de 115,955 ms sur `CrGpuMain` juste avant une image retardée ; ce n’est pas une mesure directe du temps des shaders sur le matériel. L’adoption CPU et la méthode de rendu seules n’expliquaient pas cette attente.

Le [code officiel ShadowNode r186](https://github.com/mrdoob/three.js/blob/r186/src/nodes/lighting/ShadowNode.js) exclut expressément la mise à jour des cartes d’ombre pendant la précompilation. `compileAsync` des deux projections ne suffit donc pas à préparer les ombres des lots qui n’ont encore rien dessiné. Les [attributions Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames) localisent les scripts principaux, mais ne remplacent pas une trace GPU.

## Préparation et invariants

`BoxBatches.prepareEmptyShadows` expose temporairement une instance dégénérée dans chaque lot vide déjà alloué. `shadow-preparation.ts` exécute une passe réelle après la compilation des deux projections, pendant la préparation de la carte. La boucle ordinaire est suspendue et le culling temporairement désactivé par `preparePresentation`. L’attente de la file WebGPU est bornée à 30 secondes ; le repli WebGL n’appelle pas cette API.

Un `finally` restaure les comptes et les valeurs exactes des matrices, avec les mêmes objets GPU, sans réallocation de capacités. Si un snapshot a entre-temps mis à jour un lot, sa nouvelle version prime et n’est pas écrasée par la restauration. La préparation ne touche pas au World. Les lots non vides restent tels quels. Les compteurs de cadence sont réinitialisés après chargement, indépendamment du temps de simulation.

Ce choix déplace de la compilation vers le chargement initial. Il ne supprime ni son coût, ni les éventuelles compilations de nouveaux matériaux. À l’ajout d’un nouveau lot graphique, vérifier sa préparation et enrichir le même audit ; ne pas multiplier les meshes individuels ni désactiver silencieusement les ombres.

## Croissance des piles V29

Cent mineurs d’acier ont révélé un autre cas : `pile:7:7` passe de 256 à 512 éléments, et deux programmes sont créés en jeu. Le [diagnostic des sources shader](../../artifacts/steel-render-diff.json) montre des noms `NodeBuffer_<id>` différents. Le [WGSLNodeBuilder officiel r186](https://github.com/mrdoob/three.js/blob/r186/src/renderers/webgpu/nodes/WGSLNodeBuilder.js) génère effectivement ces noms pour les buffers anonymes. Passer simplement aux buffers storage ne suffit pas ; précompiler une autre instance de même capacité ne suffit pas non plus. Ces essais ne sont pas conservés dans le moteur.

`BoxMesh.ts` utilise désormais [InstancedBufferGeometry](https://threejs.org/docs/pages/InstancedBufferGeometry.html) et quatre colonnes de matrice dans un [InstancedInterleavedBuffer](https://threejs.org/docs/pages/InstancedInterleavedBuffer.html). Les noms d’attributs, strides et formules TSL sont stables, indépendants des IDs et capacités. Position et normale sont transformées sur GPU ; les ombres reprennent le même nœud de position. Les matériaux restent partagés, le nombre de lots et la capacité initiale 256 sont conservés, sans réserve de buffers géants. `geometry.instanceCount` est l’autorité du compte graphique, exposée par `activeCount` ; `Mesh.count` reste à sa valeur standard.

Chaque lot possède une copie des minuscules sommets/indices du cube, afin que sa croissance libère ses buffers sans invalider ceux d’un voisin. Cela ajoute 648 octets d’attributs/index CPU par lot, hors objets et miroir GPU, soit environ 162 KiB pour les 256 lots de piles d’une carte 250². Matrices et couleurs conservent leur taille précédente. La géométrie et ses buffers survivent aux variations de contenu sous la capacité ; seules une croissance et la destruction les libèrent. Les bornes spatiales sont recalculées après les placements, hors frames ordinaires. Le picking du jeu reste celui de la grille, pas un raycast individuel sur ces instances.

Le banc final observe effectivement 256→512, **zéro pipeline créé pendant le minage**, 400 extractions et 16 000 acier, avec le même maximum de 185 appels de dessin par image. Une capacité de buffer ne démontre rien seule : continuer à mesurer les nouveaux matériaux, styles et charges.

## Reproduction et limites

`scripts/mining-render-bench.mjs` observe les appels natifs de création de pipeline, les extractions, intervalles d’image et coûts d’adoption. `MINING_COUNTS=100` cible la charge haute. `MINING_SKIP_SHADOW_PREPARATION=1` remplace uniquement le helper de préparation dans la réponse du serveur au navigateur pour le témoin ; il ne modifie aucun fichier ni aucune règle du jeu. Hors témoin, le banc refuse toute compilation de pipeline observée pendant cette charge connue.

`MINING_TRACE=1` active une capture CDP bornée, décrite dans `scripts/render-trace.mjs`. Les traces brutes restent dans `tmp/render-traces`, avec taille, catégories et SHA-256 dans les preuves. `scripts/summarize-render-trace.py` extrait les événements GPU corrélés aux marqueurs. Les catégories détaillées de peinture et Dawn sont exclues du profil final : elles ont fortement perturbé un essai et fait dépasser le budget de 128 MiB d’un autre. Une trace instrumentée n’est pas un benchmark de cadence comparable au relevé sans trace.

Le scénario vérifie une colonie de mineurs sur un matériel donné, pas tous les usages futurs. Les invariants purs portent sur restauration, identité, capacité et réutilisation après préparation. Les parcours graphiques courts vérifient chargement/rechargement et backend ; les longues parties de simulation ne sont pas répétées pour cette correction de présentation.
