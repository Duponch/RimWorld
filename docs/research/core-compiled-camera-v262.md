# V262 — identité compilée de la caméra et référence map native

**La reprise native privée est positive, sans mesure de pixels ou de coût. Produit V242, schéma 198 : 62 références et 65 fichiers publics inchangés, aucun FPS ajouté.** [Contrat](../development/core-compiled-camera-v262.md), [preuves](../history/validation-core-compiled-camera-v262.md).

Le [diagnostic V261](core-resident-admission-v261.md) refusait un UniformNode cameraPosition dans les sprites Action VFX.
Son nom, son updateType et son groupe étaient compatibles avec la caméra native, sans établir son identité.
V262 cherche cette identité dans les données compilées, puis conserve chaque nouvelle frontière inconnue.

## Sources et arête once

Les sources primaires sont les fichiers locaux épinglés de Three 0.186.0.
Camera.js construit les bases caméra dans des Fn once ; TSLCore conserve leur résultat dans les propriétés du ShaderNode global.
Le ShaderCall conserve aussi sa Stack de sortie, mais IsolateNode peut construire ce call dans un cache enfant ensuite quitté.
Le parcours des caches parents de V261 ne permettait pas de retrouver cet enfant.
La clé ShaderNode canonique donne donc une arête plus précise vers un résultat déjà compilé.

La liste est fermée aux exports Projection, ProjectionInverse, View, World, Normal, Position et Viewport.
Wrappers, fonction jsFunc, dispatchs et configuration sont capturés puis revérifiés.
La lecture porte sur un descriptor data `default` existant ; elle ne sollicite aucun calcul ni allocation native.
Une recherche générale des shaderNode ou un appel Fn/setup/getNodeProperties élargirait le domaine sans preuve et reste exclu.

Le callback update découvert est mémorisé par identité puis exigé inchangé.
Cette capture dépend du domaine construit canonique et de sa fermeture ; elle ne démontre pas la pureté de code hostile préexistant.
Les updates caméra restent natifs, dans leur ordre historique, avec leurs valeurs historiques.
Une lecture supplémentaire à froid ne constitue pas une économie mesurée.

## Ce qu'établit le rouge V262

Le rapport natif initial `9EFFF99F` est FAIL 32,799 s et reste intact.
Le refus caméra n'est plus le premier refus ; l'audit atteint un ReferenceNode map/texture OBJECT dans l'ombre.
Ce déplacement est compatible avec la correction de l'arête once, sans prouver tous les cas caméra ni un chemin SHARED utile.
Ses compteurs FULL/ACK/SHARED résidents nuls interdisent toute conclusion de coût ou de FPS sur ce premier parcours.

Renderer._getShadowNodes construit `reference('map', 'texture', material)` pour l'alpha d'ombre.
Le matériau source est celui du mesh ; il peut différer de l'override du builder, comme dans le refus observé.
ReferenceNode.js, TextureNode.js et Texture.js précisent les écritures et callbacks concernés.
Les SHA de ces sources et du rapport sont épinglés dans la provenance de la reprise privée.

## Hypothèse passive bornée

L'hypothèse nouvelle vise uniquement l'audit global : reconnaître cette référence native par identité et descriptors.
Elle ne change ni l'admission de famille ni `configuredMapReference` et ne rend pas l'objet source résident.
Le lien exige le matériau scalaire propre de l'objet et les deux identités object/reference du nœud.
La base TextureNode exacte ne doit avoir aucune redirection ou surcharge de son stockage natif.
La source map réelle est auditée avec la base compilée, y compris lorsqu'elles diffèrent après un changement de texture.

Une onUpdate inconnue ou accessoire refuse immédiatement ; une ancienne texture compilée ne doit pas cacher ce callback.
Seules les classes exactes Texture/DataTexture/CanvasTexture et les dispatchs canoniques entrent dans cette hypothèse.
Les getters, matériaux tableaux, overrides, graphes arbitraires et identités inconnues conservent leurs refus.
Les bornes privées de parcours et le repli conservateur restent nécessaires, même dans ce domaine fermé.

## Reprise positive et questions ouvertes

Le rapport distinct `E36FE1AC` est PASS 46,119 s : résidence froide au tick 6934, avec 15 FULL/ACK et 1 605 SHARED.
Les vrais parcours 1× puis 6× atteignent 6939 puis 6988 ; sauvegarde/reload exacts à 6988 sont vérifiés.
La perte réelle du device à 7031 remplace la génération 1 par 2 ; la continuation atteint 7084 avec 6 292 SHARED et 325 ACK.
Les deux owners sont fermés au cleanup, liveOwners/membres/pending et erreurs sont nuls, sources/public exacts.
L'abort musical observé appartient à owned-cleanup et est attendu pour cette reprise ; cette chronologie ne réécrit pas l'ancien rouge.
Ces observations qualifient l'acquisition et le lifecycle natifs, sans oracle de pixels, coût complet ou FPS.
Les vingt cas composants passent dans un fichier en 3,319 s ; ils complètent la lecture native sans établir pixels ou coût Core.
V263 doit contrôler le Core A/B complet borné : méthodes/writers, champs, compilations intercalées, pixels, froid et coût avant GAME.
La couverture des refus et changements de textures reste à établir ; aucune adoption ou promotion n'est présumée.
Les anciens gels et rapports rouges restent conservés ; aucune preuve V260 n'est automatiquement transférée au Core.
Relance automatique en pause, contrôles ROOT séquentiels, sessions/references_UI/caches E: préservés et aucun push.
