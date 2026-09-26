# Validation V110 — coiffures et portraits du modèle

26 septembre 2026. La capture annotée par l'utilisateur sert d'oracle visuel : deux coiffures sombres paraissaient des bonnets d'hiver, les côtés et la barbe s'arrêtaient trop tôt, certaines franges ne couvraient que la moitié du front et se confondaient avec la surface derrière. Ces deux volumes sont bien des **cheveux** dans le modèle V109, pas des couvre-chefs. [Contrat actuel](../development/pawn-appearance.md), [recherche Core datée V109](../research/pawn-appearance-reference-v109.md). Aucun nouveau mécanisme RimWorld n'est déduit de la capture.

## Modification et frontières

- Couronne moins haute, arrière et tempes prolongés, deux mèches frontales décalées couvrant ensemble la largeur de la tête. Leur face avant est devant le visage au repos ; les joues de la barbe atteignent l'arrière et le bas de la mâchoire. Les styles réutilisent les **quinze pièces de cheveux résidentes** et cinq pièces de barbe ; une première variante plus dense a été réduite après mesure à cent colons.
- HUD et Bio projettent maintenant les faces de `pawnGeometry()` avec les proportions et couleurs du personnage, dans une vue orthographique fixe. Le résultat SVG est caché par identité et tenue. L'ancien dessin de portrait indépendant est supprimé ; aucune deuxième scène GPU ni rendu par image n'est introduit. La projection représente la pose au repos, pas les rotations/animations instantanées de la carte.
- Aucun changement de PRNG, d'IA, de besoin, de sauvegarde ou de contenu physique. Schéma **109** et douze colonies de test inchangés, sans migration. G0–G4 restent **partiels**, G5 **absent** ; les estimations par domaine restent dans ROADMAP.

## Contrôles groupés

[17/17 contrôles ciblés](../../artifacts/appearance-checks-v110.json) : géométrie sans face frontale coplanaire, cheveux et barbe couvrant les limites de la tête, portrait issu des faces communes, croissance/réordonnancement des buffers humains, sauvegarde du profil et instantanés du pont. Le premier lancement final a échoué au démarrage de Vite par `spawn EPERM` dans la sandbox ; le même groupe a été relancé avec l'autorisation de processus et a réussi. Typage et build de production réussis ; avertissement existant sur la taille du bundle conservé.

[Parcours Chromium natif/WebGPU](../../scripts/appearance-ui-v110.mjs), [résultat](../../artifacts/appearance-ui-v110.json) : cinq colons chargés par la bibliothèque réelle, portraits HUD/Bio issus du modèle, vues de face, profil et dos, aucune erreur JavaScript/WebGPU. Captures locales `artifacts/appearance-v110-{front,side,back,bio}.png` inspectées ; elles sont régénérables et exclues de Git. Les cartes utilisent la même silhouette, couleurs de peau, cheveux, barbe et vêtement que sur le terrain. Il reste des volumes voxel anguleux et une vue de portrait fixe : ce n'est pas une reproduction des sprites commerciaux.

La création froide de **cent** portraits dans la scène contrôlée a pris 27,5 ms contre 2,7 ms pour les dessins V109 ; la réutilisation des cent portraits cachés a pris **0,2 ms**. C'est un coût ponctuel lors d'une ouverture ou d'un changement de tenue massif, pas une dépense à chaque image. Le cache borné contient au plus 256 variantes ; un nouveau profil après éviction est recalculé.

## Charge native successive

[Protocole et mesures](../../artifacts/appearance-load-v110.json) : fixture mixte immuable de cent colons, carte entière à 375,553 cases, 1440×1000, WebGPU natif ; même simulation courante et rendu des humains V109 publié/V110/V110/V109. Chaque fenêtre pause puis ×6 dure six secondes après une seconde de stabilisation. Aucun test lourd concurrent, aucune modification des sources pendant la mesure. Le temps d'image RAF n'est pas un chronomètre GPU ; le CPU d'image et le débit simulé sont distincts.

| Rendu | Image p95 pause | Image p95 ×6 / pic | CPU image p95 ×6 | Débit effectif demandé 6× |
|---|---:|---:|---:|---:|
| V109, passage 1 | 4,3 ms | 20,9 / 74,9 ms | 20,3 ms | 2,68× |
| V110, passage 1 | 4,3 ms | 20,9 / 91,7 ms | 20,5 ms | 2,27× |
| V110, passage 2 | 4,3 ms | 25,0 / 95,8 ms | 22,0 ms | 2,27× |
| V109, passage 2 | 4,3 ms | 20,9 / 91,8 ms | 21,3 ms | 2,32× |

La pause ne montre pas de recul de p95 d'image ; sous ×6, un passage V110 monte à 25 ms et le débit est plus faible que le premier passage V109. La variabilité entre les deux témoins V109 empêche de quantifier un coût causal précis, mais **aucune équivalence de performance universelle n'est revendiquée**. La cible 240 FPS et le débit 6× à cent colons restent ouverts. Aucun saut de simulation ou allègement de règle n'a servi à ces mesures.

## Publication

Le build V110 est prêt, mais **Netlify refuse la création d'un nouveau déploiement** : `POST /sites/9c1b98b5-68a5-4242-b1ec-3bc193b93445/deploys` renvoie HTTP 403 avec le motif « Account credit usage exceeded - new deploys are blocked until credits are added ». Deux tentatives identiques ont confirmé ce blocage ; la lecture du site reste autorisée. [État consigné](../../artifacts/netlify-v110-blocked.json). Aucun identifiant de déploiement V110 ni contrôle public V110 n'est inventé. Le site public reste sur V109 ; le code V110, ses tests et ses captures locales peuvent être examinés depuis le dépôt jusqu'au rétablissement du compte. `deploy-netlify.mjs` affiche désormais le court motif d'une erreur API en masquant explicitement le jeton au cas où il serait reflété.
