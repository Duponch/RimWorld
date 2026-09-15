# Mises à jour graphiques sans reconstruction systématique

## Diagnostic du 13 septembre 2026

L'abattage de douze arbres proches du camp, graine 42 sur carte 250², reproduit des frames jusqu'à 204,1 ms dans Chromium normal WebGPU AMD/RDNA-1. La simulation tourne réellement à 6× ; trois colons accomplissent les ordres. Le test enregistre le rendu, les mises à jour de ressources/travaux/piles et les créations synchrones de pipelines du périphérique utilisé par ce canvas.

Le coût comporte deux mécanismes observables : reconstruction des géométries du chunk à chaque arbre retiré, et destruction/création des meshes et matériaux de travaux ou piles. Même le progrès invisible de l'abattage provoquait une reconstruction des marqueurs. L'instrumentation relève 75 créations de pipelines pendant cette courte séquence. Elle ne chronomètre pas toute compilation différée du pilote ; nous ne lui attribuons donc pas chaque milliseconde de gel.

La lecture du code installé Three.js 0.186.0, `nodes/accessors/Instance.js`, montre que les petits lots peuvent devenir des tableaux uniformes dont la longueur dépend de la capacité d'instance. Reconstruire un lot à chaque quantité crée donc aussi des variations de layout. Les [contrats InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) permettent de modifier les matrices/couleurs et le nombre actif en gardant les allocations, à condition de signaler les données modifiées et mettre à jour les bornes. La [documentation de mise à jour](https://threejs.org/manual/en/how-to-update-things.html) et la [précompilation du Renderer](https://threejs.org/docs/pages/Renderer.html) rappellent respectivement l'invalidation des buffers et la possibilité de préparer des shaders. Nous supprimons d'abord les reconstructions récurrentes observées.

## Responsabilités

- `StaticGeometry.ts` fabrique les volumes fusionnés, couleurs et normales procédurales ; le terrain demeure statique et découpé spatialement.
- `ResourceLayer.ts` conserve les plages d'indices de chaque ressource. Retirer un arbre compacte le buffer d'indices existant et réduit la plage dessinée ; positions, normales, couleurs, mesh et matériau survivent. Les bornes initiales restent conservatrices. Un checkpoint peut rétablir les plages d'origine, y compris après vidage complet du chunk. L'ajout, le déplacement ou le changement de type reconstruit uniquement le chunk concerné.
- `BoxBatches.ts` partage les matériaux pour mobilier, plans, progression, réserves et piles. Depuis V29, `BoxMesh.ts` porte les attributs instanciés explicites, la forme de cube et les bornes de chaque lot ; [raison et propriété des buffers](shadow-preparation.md#croissance-des-piles-v29). Chaque lot conserve ses matrices/couleurs GPU, même lorsqu'il devient vide. La capacité commence à 256 et double au besoin ; ce nombre est une allocation, pas une promesse de performance. Le nombre réellement dessiné correspond au contenu. Une croissance de capacité libère explicitement l'ancienne allocation, sans créer un nouveau matériau.
- Les couches calculent leurs placements ; elles ne modifient jamais `World`. Les variantes de transparence restent distinctes. `clearGroup` respecte la propriété des ressources partagées ; le renderer les libère en fin de vie.

Les compteurs et signatures n'incluent plus le progrès de collecte lorsqu'il n'a aucun effet graphique. La progression des constructions reste quantifiée visuellement ; sa valeur logique et sa sauvegarde ne changent pas. Pas de changement du schéma 4 ou de la simulation dans cette tranche.

## Preuves et limites

`tests/render-retention.test.ts` exerce retrait de plusieurs ressources, frontière de chunk, vidage puis restauration, conservation exacte des faces restantes et buffers, changement de contenu, croissance de capacité, bornes et destruction. Ce test manipule les données Three sans GPU ; les parcours navigateur contrôlent les pipelines réels et la présentation.

`node --experimental-strip-types scripts/tree-render-bench.mjs current` produit un rapport daté. Le [contrôle avant](../../artifacts/tree-render-before.json) et le [premier résultat après](../../artifacts/tree-render-after.json) conservent conditions, intervalles de frames, coûts CPU, événements et compteurs. Pas de GPU logiciel, ni de sérialisation du monde dans les frames chronométrées. Le budget visé est 16,7 ms pour 60 images/s ; les maxima restent publiés, même lorsque le p95 est bon.

Les ajouts de ressources, changements de carte, premières variantes de pipeline et hausses de capacité restent des chemins distincts à mesurer lors de leur extension. Le parcours utilisateur de plusieurs jours n'est pas un benchmark : les inspections et clics du pilote ajoutent leur propre charge. Aucun résultat local ne garantit une fluidité parfaite sur tous les appareils et toutes les charges.

## Recontrôle alimentaire V5

L’ajout de baies et rations conserve les lots de piles par chunk ; leur signature comprend l’identité de l’objet. Les couleurs par instance et les formes de cargaison sont présentes dans les buffers dès la création, sans nouvelle variante de matériau à chaque changement de repas. [Audit matériel](validation.md) : cent colons, p95 de frame 4,3 ms, maximum 16,7 ms, aucune tâche longue observée ; état final et scénario différents du profil historique, sans comparaison de vitesse artificielle.

## Recontrôle sous V36 : transferts réellement conditionnels

Le nouvel éclairage a révélé le coût des buffers de décor marqués DynamicDrawUsage : Three 0.186.0 les envoie aussi lorsque leur version reste inchangée. Les matrices du LOD végétal et attributs/indices de RockLayer gardent désormais StaticDrawUsage, avec needsUpdate et les plages explicitement modifiées après abattage/minage. Le [banc natif du panorama](../../scripts/environment-lighting-overview-bench.mjs) vérifie zéro envoi de ces buffers au repos, puis un envoi après suppression/restauration réelle de chaque présentation. Aucun changement de capacité ni de propriété des buffers ; les contrôles de rétention restent actifs. Voir [contrat lumineux](environment-lighting.md) et [mesures](validation.md).
