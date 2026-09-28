# Validation du transfert local de pigment — V142

## Cause et correction

Une modification d'une case sur une carte 250² recuisait 576 pixels CPU mais `texture.needsUpdate` faisait écrire par Three 0.186 l'atlas RGBA entier de 2 000², soit 16 000 000 octets, puis recalculait ses mipmaps. Les `DataTexture.updateRanges` ne sont pas suivies par le backend WebGPU utilisé ici. V142 garde le même atlas CPU et la même peinture ; lorsque l'atlas est déjà résident, une seule case est transférée par la texture de transit réutilisée de 24² pixels et l'API publique `copyTextureToTexture`. Les changements multiples, la nouvelle carte et la réactivation des textures gardent l'upload intégral.

## Mesure appariée

Le [banc reproductible](../../scripts/terrain-upload-audit-v142.mjs) emploie la même sauvegarde mixte V140 (250², 104 personnes, 100 animaux), Chromium WebGPU matériel, pause, caméra fixe à 1 920 × 1 080/DPR 1, ombres coupées. Cinq blocs copie–plein–plein–copie donnent dix éditions par chemin, en alternant herbe et sol. Lancer le serveur Vite puis le script avec `PERF_ORIGIN` si besoin ; ses mesures JSON sont écrites sous `tmp/` ignoré. Le rapport de ce passage reproductible est `tmp/terrain-upload-audit-v142-final.json` sur l'hôte, avec SHA-256 de sauvegarde `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`. L'instrumentation ne modifie ni les sources du jeu ni la sauvegarde et force l'upload complet seulement pour le bras témoin.

| Mesure | Copie locale | Upload entier forcé |
| --- | ---: | ---: |
| `GPUQueue.writeTexture` par édition | 1 × 2 304 octets | 1 × 16 000 000 octets |
| Copie GPU de 24² pixels | 1 | 0 |
| Première image, CPU médian | 1,20 ms | 2,90 ms |
| Attente `queue.onSubmittedWorkDone`, médiane | 4,90 ms | 10,10 ms |
| `applyWorld`, médiane | 3,6 ms | 3,5 ms |

Le transfert CPU→GPU de l'atlas descend donc d'environ 16 Mo à 2,3 Ko pour cette édition isolée. La différence de la première image favorise la copie dans ce banc, mais `applyWorld` varie avec les autres calques. L'attente de queue comprend rendu, copie, mipmaps et ordonnancement : elle n'est pas un temps GPU isolé. Les mipmaps **entières** restent régénérées après chaque copie ; aucune égalité FPS, garantie 240 FPS/×6 ou absence de coût GPU n'est déduite. L'édition de terrain n'est pas continue à chaque image et n'explique donc pas seule une chute permanente sur une carte stable.

## Contrôles

- Les tests du pigment vérifient l'égalité de l'atlas CPU avec une cuisson neuve, y compris l'alpha des rives, et la version stable du grand atlas quand l'upload est différé.
- Les tests du tampon de transit vérifient les rectangles centraux, de bord et d'angle, la résolution plafonnée, le pas des lignes et les quatre canaux RGBA.
- Les **15 tests ciblés** du pigment, de l'eau, des textures de surface et du tampon de transit passent dans cinq fichiers. Le build et le typage passent.
- Le parcours Chromium/WebGPU sur 250² observe effectivement une écriture staging de 2 304 octets, aucune écriture de 16 Mo pour cette case, une version stable du grand atlas et une capture de rive **identique pixel pour pixel** à une réémission complète. Deux cases modifiées reviennent au chemin intégral ; textures désactivées/réactivées et changement de graine de carte reconstruisent l'atlas avant qu'une nouvelle édition isolée utilise à nouveau le transit. Aucune erreur navigateur/GPU n'est relevée.
- Le parcours Chromium avec `navigator.gpu` masqué sélectionne le repli **WebGL 2** ; pour une case centrale, un angle (0,0) et une nouvelle rive, chaque capture après copie locale égale pixel pour pixel sa réémission complète. Aucune erreur navigateur n'est relevée. Ces parcours couvrent leurs scènes précises, pas toutes les cartes ni tous les GPU.

La logique, la cadence de simulation, le schéma 141, les sauvegardes et le PRNG restent inchangés.
