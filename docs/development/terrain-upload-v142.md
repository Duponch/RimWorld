# Transfert local du pigment de sol — V142

## Problème et périmètre

Sur une carte de 250 × 250 cases, le sol et l'écume des rives partagent un atlas RGBA de 2 000 × 2 000 pixels, soit 16 Mo avant mipmaps. La cuisson V132 sait recalculer une case et sa marge de peinture (au plus 24 × 24 pixels), mais `DataTexture.needsUpdate` expédiait ensuite l'atlas entier au GPU. Three 0.186 ne consulte pas les `updateRanges` d'une `DataTexture` dans le rendu WebGPU ni dans son repli WebGL.

## Contrat de rendu

- L'atlas CPU reste complet et garde son identité pour le terrain, l'eau, les chunks et la vue générale. Une carte neuve, une remise en service des textures ou plusieurs cases modifiées utilisent encore l'upload complet.
- Pour **une seule case** modifiée, après que l'atlas a réellement été chargé sur le GPU, le renderer recuit la case et sa marge puis copie ce rectangle dans une petite texture de transit RGBA/sRGB de 24 × 24 pixels. `renderer.copyTextureToTexture` place cette région à ses coordonnées d'atlas, sans incrémenter la version de l'atlas résident. Les bords de carte utilisent un rectangle tronqué.
- Three régénère les mipmaps de l'atlas après la copie. Le gain porte sur le transfert CPU→GPU de la base, pas sur toutes les opérations GPU, ni sur la mémoire résidente. La texture de transit est unique et réutilisée ; aucune texture par case ou opération par image.
- La peinture déterministe, l'alpha d'écume, les UV, l'option sans textures, la topologie des berges, le monde, les décisions, les sauvegardes et le PRNG restent inchangés. L'upload local se produit seulement lors d'une édition confirmée du terrain.

## Validation attendue

Comparer les octets CPU après patch à une cuisson complète, puis les images du chemin local et du chemin complet en Chromium/WebGPU, y compris une rive. Instrumenter `GPUQueue.writeTexture` pour distinguer octets transférés et coût résiduel des mipmaps. Vérifier la carte neuve, la bascule des textures, la vue générale et une mise à jour de plusieurs cases. Le repli WebGL demande un parcours dédié avant d'affirmer sa parité visuelle.
