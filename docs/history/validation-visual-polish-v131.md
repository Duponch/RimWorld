# Validation — fiche, assise et détail peint V131

## Périmètre

Le lot corrige la présentation de la fiche du colon, la pose de loisirs avec siège et le détail des pigments. Il ne modifie ni le worker, ni les règles, ni les sauvegardes : le schéma reste 127. La scène `public/test-saves/v124/rencontre.json` a servi de témoin pour Basile, à une table et sur un siège réellement réservés.

## Contrôles exécutés

- 48 tests ciblés dans 10 fichiers Vitest : poses et transitions, détente sociale/échecs, toiture et bardage, texture et variation, ancienne sauvegarde de toiture. Tous passent.
- Parcours Chromium/WebGPU V131 : la partie préparée est reprise, Basile pratique effectivement la détente sociale sur son siège, puis Journal et sa fiche sont vérifiés à 1522 × 1195 et 1366 × 768. Les images montrent le corps assis et les commandes contenues dans la fiche ; aucune erreur JavaScript/WebGPU. Le parcours des six dossiers et des commandes en mode mobilisé/non mobilisé passe également aux deux tailles.
- Parcours de toiture et de l'option de textures : tous deux passent. Les oracles d'anciens tests ont été remis à jour pour la règle V129 : une case de sol nu n'ouvre plus de fiche de sélection. La fixture V34 du test unitaire ne transporte plus des champs V120/V122/V124 impossibles dans cet ancien schéma.
- `scripts/timber-visual-v114.mjs` : vues rapprochées des trois portes, vue du toit et arbre texturé inspectés après le changement. Les larges plages sont conservées et les fines fibres/touches sont visibles. Aucun message d'erreur JS/GPU ; le nombre de dessins du script est inchangé entre les états avec/sans texture correspondants.
- `npm run build` : typage et bundle de production réussis. `git diff --check` : aucune erreur d'espacement.

## Coût et limites

Les nouveaux motifs sont calculés une fois dans les octets des atlas existants. Dimensions inchangées : 64² pour surface, végétation et bardage ; 128² pour le toit ; 256² pour la pierre. Aucun deuxième calque, matériau, maillage, passe ou nœud de prélèvement par pixel n'a été ajouté. Le choix « Textures 3D stylisées » désactivé continue à utiliser les matériaux sans carte. Les mipmaps désormais générées pour le bardage et le toit coûtent un calcul initial et environ un tiers de mémoire supplémentaire pour ces deux petits atlas ; leur filtrage peut avoir un coût GPU marginal. Le nombre de dessins et les contrôles visuels ne constituent pas une mesure de temps GPU : aucune égalité de FPS, tenue à 240 FPS ou vitesse ×6 sous charge n'est déduite de ce lot.

La pose est une interprétation 3D de l'activité et du siège existants, sans changement de cellule ou de réservation. Les autres dossiers et les longues listes peuvent encore défiler à faible hauteur ; ils ont été contrôlés sans empiètement sur la barre de gestion aux deux tailles indiquées. La parité visuelle de tous les éléments du jeu reste hors de ce lot.
