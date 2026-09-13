# Rendu 3D, animation et performance

État de la recherche : 13 septembre 2026. Ce document distingue les capacités vérifiées, les décisions du projet et les expériences restant à mesurer. Antsystem a été consulté en lecture seule. Aucun benchmark de ce projet n'a été exécuté pendant cet audit ; ses commentaires de performance ne constituent pas des mesures transférables à notre jeu.

## Décisions pour commencer

Construire le rendu avec **Three.js 0.186.0**, `three/webgpu`, matériaux Node et TSL. Cette version est celle du tag npm `latest` et de la dernière publication officielle GitHub r186, datée du 8 septembre 2026. Épingler la version et conserver le lockfile ; une mise à jour doit être un changement revu, avec lecture du guide de migration. Antsystem utilise localement 0.185.1 : ses recettes doivent être revalidées sur r186. [Registre npm](https://registry.npmjs.org/three/latest), [publication r186](https://github.com/mrdoob/three.js/releases/tag/r186).

Le premier rendu utilise une caméra orthographique orientable, une grille logique au sol, des géométries low poly produites en code et des objets répétitifs instanciés. La hauteur est visuelle au départ : ajouter des étages jouables serait une décision de gameplay, de navigation et de visibilité distincte.

Complément livré depuis cet audit : [conventions d'échelle et tailles de carte](spatial-design.md), lots de rendu par chunks de 16 cases et coupe de murs/feuillage. Un [laboratoire de navigation WebGPU](gpu-navigation.md) réalise désormais recherche, convergence et extraction entièrement sur GPU ; il reste indépendant de la simulation et de ce pipeline de rendu. Ses mesures ne valident pas le budget total d'une colonie affichée.

La simulation conserve l'autorité sur les ressources, déplacements, besoins, travaux et événements. Elle expose des snapshots au rendu ; elle ne dépend ni des FPS, ni de Three.js, ni d'un résultat GPU. Commencer en TypeScript avec un cœur testable sans navigateur, puis l'héberger dans un worker. Réserver Rust/WASM à un noyau identifié par le profilage. Aucune technologie ne peut être déclarée « la plus performante » indépendamment du travail effectué et du matériel.

Les personnages commencent avec un rig procédural simplifié et une déformation GPU TSL. Les futurs glTF doivent pouvoir remplacer leur présentation sans changer les données du personnage. La voie privilégiée pour les humanoïdes équipables est un **atlas d'animations d'os**, puis une palette calculée sur GPU si nécessaire. Un atlas de positions de sommets reste une option utile pour des animaux à cycles stables.

## Ce qui est réellement présent dans Antsystem

Fichiers consultés :

| Référence locale | Observations vérifiées | Conséquence pour notre projet |
|---|---|---|
| `E:/Code/Antsystem/package.json` et `node_modules/three/package.json` | Dépendance déclarée `^0.185.1`, installation 0.185.1. | Ne pas recopier une API en supposant qu'elle correspond à r186. |
| `src/vat.js`, `loadAntVAT` ligne 58, `loadVATMulti` ligne 413, `loadAntCasteVAT` ligne 704 | `AnimationMixer`, parcours du rig et `getVertexPosition` échantillonnent les animations **sur CPU au chargement**. `loadAntCasteVAT` vérifie les clips exacts et la compatibilité des indices/topologies entre castes. Une texture RGBA en demi-flottants est créée, sans mipmaps et à filtrage nearest ; le shader réalise l'interpolation temporelle. | Le coût CPU des squelettes n'existe plus par individu/par image ; il reste un coût de préparation et des lectures GPU proportionnelles aux sommets dessinés. |
| `src/vat.js`, `buildLodGeometry` ligne 619 | Clustering spatial de sommets dans la pose de référence ; chaque représentant conserve un index vers la VAT, les triangles dégénérés sont retirés. | Solution simple pour lointain, à valider sur toute l'animation ; un bon maillage au repos peut déchirer la silhouette en mouvement. |
| `src/pose.js`, `createPose` ligne 77, noyau `kPose` ligne 148, `qrot` ligne 34 | Une passe compute produit trois `vec4` par fourmi : position/échelle, quaternion, phase/teinte/drapeaux. Transformation commune calculée une fois par individu, consommée ensuite par les sommets. | Réutiliser le principe de palette/pose partagée ; distinguer données de présentation et autorité du jeu. |
| `src/ants.js`, `createAnts` ligne 40, `kReset`, `kClassify`, `kFinalize` | Trois listes LOD, culling caméra, compteurs atomiques, budgets par niveau avec rétrogradation. `IndirectStorageBufferAttribute` contient trois commandes indexées, cinq `u32` chacune. | Pipeline intéressant lorsque classement CPU et draw calls sont réellement limitants. Ne pas introduire trois passes pour trois personnages. |
| `src/ants.js`, `makeBodyMaterial` ligne 285, création des meshes lignes 435–450 | TSL lit l'ID compacté, puis la pose et deux images de VAT pour le niveau proche. Le niveau intermédiaire lit une image, le lointain peut figer la pose. `setIndirect` utilise un offset en octets ; le culling CPU du mesh est désactivé. Flat shading dérivé des triangles déformés. | Les normales et ombres doivent utiliser la pose déformée. Un mesh dont la position est entièrement GPU ne peut conserver naïvement ses bornes CPU de repos. |
| `src/ants.js`, `setActiveDispatchCount` ligne 753, `stepSimulation` ligne 775, `renderFrame` ligne 792 | Buffers à capacité fixe, nombre d'invocations ajusté aux individus actifs ; séparation du pas de simulation et de la préparation d'image. | Capacité et activité sont deux métriques distinctes ; éviter de dispatcher systématiquement tout le pool. |
| `src/bees.js`, `createBeeRenderer` | Attributs instanciés pose/quaternion/animation/blend, deux images de clip et transition optionnelle ; un buffer de présentation alimenté par une simulation CPU. | C'est une référence plus proche d'une colonie de quelques centaines d'acteurs que l'autorité GPU des fourmis. |
| `src/readback.js`, `tryAcquireReadback`, `acquireReadback`, `withReadback` | Verrou global et file FIFO pour sérialiser les lectures ; priorité aux demandes attendues plutôt qu'aux pollers. Les commentaires signalent un problème de concurrence rencontré par ce projet. | Ne pas transformer ce constat local en défaut général de r186. Surtout, éviter le readback dans le chemin critique du gameplay. |
| `src/simulation-authority.js`, `planGpuSimulationFrame` | Politique de sous-pas plafonnés et temps abandonné explicitement comptabilisé. | Utile pour un système visuel ; notre simulation de gestion doit rester définie par ses ticks, avec ralentissement explicite si nécessaire plutôt que perdre des effets de jeu. |
| `doc/chameleon-rendering-performance.md` | Contrat mesh/rig, limites LBS, LOD selon taille projetée et hystérésis, IK proche versus VAT lointaine. | Conserver des contrats d'assets et traiter les besoins des sujets proches séparément des foules. |

`MAX_ANTS = 65536` dans `src/config.js` est une **capacité configurée**, pas la preuve d'un framerate sur une machine donnée. Le commentaire « skinning ne coûte plus rien » de `vat.js` signifie disparition du calcul squelettique CPU runtime ; les fetchs, l'interpolation, la bande passante, le raster et les ombres coûtent toujours.

Autre lecture précise : `E:/Code/Antsystem/node_modules/three/src/nodes/accessors/Skinning.js` en 0.185.1. Les fonctions `skinning` et `computeSkinning` calculent le vertex skinné avec les matrices d'os, mais leurs callbacks appellent encore `skeleton.update()`. **Déplacer la déformation des sommets en compute ne déplace pas automatiquement l'évaluation des animations et de la hiérarchie sur GPU.**

## Pipeline Three.js praticable

`WebGPURenderer` peut sélectionner WebGPU et se replier sur WebGL 2. Vérifier le backend effectivement initialisé et le montrer dans les diagnostics ; la présence du constructeur ne prouve pas que l'on fonctionne sur WebGPU. Le repli reste utile pour la première tranche avec matériaux et géométrie simples. Les pipelines avancés doivent être conditionnés à leurs capacités : il n'existe pas de promesse de parité universelle du compute, des atomiques et de l'indirect entre backends. [Documentation WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html).

Utiliser `await renderer.init()` avant les appels synchrones de rendu/compute, puis précompiler la scène et les kernels avant les séquences interactives lorsque cela devient pertinent. `compileComputeAsync` est présent dans l'API actuelle. Ces précautions déplacent les à-coups de compilation vers un chargement explicite ; elles ne suppriment pas le coût de compilation. Prévoir également l'erreur d'initialisation et la perte du device. [API Renderer](https://threejs.org/docs/pages/Renderer.html).

TSL permet d'écrire `Fn`, attributs, uniforms, lectures de textures et buffers depuis JS/TS. Construire les graphes une fois ; mettre à jour leurs données ensuite. Pour les placeholders, une transformation articulée de position en `positionNode` suffit, avec normals correctement déformées ou flat shading. Les futurs kernels peuvent remplir une palette partagée consommée par le vertex shader. Cela garde matériaux et éclairage intégrés à Three.js. [Spécification TSL](https://threejs.org/docs/TSL.html).

`InstancedMesh` regroupe les objets partageant géométrie/matériau. Le sol, les arbres et constructions doivent être regroupés par famille et par chunks : un unique mesh couvrant toute la carte empêcherait un culling spatial utile. Mettre à jour uniquement les chunks modifiés et éviter un `Object3D` par brin d'herbe. [API InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).

Le nombre de dispatchs compute doit suivre le nombre actif. L'API documente `count` numérique et sa garde de bornes générée ; avec dispatch multidimensionnel ou indirect, vérifier soi-même les bornes et le layout. Les commandes indirectes appartiennent aux structures prévues par Three.js, sans accéder aux propriétés privées du backend. [ComputeNode](https://threejs.org/docs/pages/ComputeNode.html), [IndirectStorageBufferAttribute](https://threejs.org/docs/pages/IndirectStorageBufferAttribute.html).

## Animation : atlas de sommets ou atlas d'os

Propositions d'ingénierie à prototyper et mesurer, pas capacités déjà livrées :

| Approche | Usage | Limites importantes |
|---|---|---|
| Rig procédural rigide TSL | Placeholders humanoïdes ; six segments avec pivot et poids unique. | Pas de mixage glTF ni de déformation de peau élaborée. |
| VAT par sommet, comme les fourmis | Animaux répétés, cycles fixes, géométrie stable. | Mémoire liée au nombre de sommets × images × clips ; équipements et IK difficiles. |
| Atlas d'os pré-échantillonné, skinning vertex | Humanoïdes partageant un rig ; vêtements liés au même squelette. | Interpolation matricielle simple peut rétrécir ou déformer une articulation ; validation des transitions nécessaire. |
| Compute palette d'os puis skinning vertex | Plusieurs parties de mesh/ombres réutilisent une pose ; grand nombre d'acteurs. | Synchronisation de la hiérarchie, buffers additionnels, dispatchs et coût mémoire. |
| Échantillonnage TRS et composition hiérarchique GPU | Mixage plus riche, masques haut/bas du corps et sockets. | Préparer niveaux de hiérarchie ou dépendances explicites ; aucun ordre global implicite entre invocations. |

Exemple arithmétique, **sans valeur de benchmark** : une VAT de 2 000 sommets × 60 images × RGBA16F occupe 960 000 octets par clip, hors overhead. Un atlas de 40 os × 60 images × matrices 4×4 float32 occupe 153 600 octets. Les lectures par sommet, caches, normales et transitions changent le coût réel ; le plus petit fichier n'est pas automatiquement le pipeline le plus rapide. Des textures normales doublent certaines tailles. Quantifier l'erreur avant de passer en float16.

Préparation future : exporter des clips nommés `idle`, `walk`, `work`, `carry`, `sleep`, `hurt`, `death`, avec conventions d'axes et de taille explicites. Valider poids normalisés, influences, matrices inverses de bind, durée et bornes animées ; imposer un profil d'import plutôt que réparer silencieusement les assets. Les noms sont notre contrat, pas des exigences Three.js. Les meshes à squelette disposent de leurs propres règles de bornes ; ne pas supposer que le culling de pose de repos reste correct. [API SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html).

L'exemple officiel [WebGPU skinning instancing](https://threejs.org/examples/webgpu_skinning_instancing.html) existe et sert de point de comparaison. Son HTML source versionné n'a pas pu être récupéré lors de cet audit : nous ne lui attribuons donc pas un calcul intégral des clips sur GPU. L'implémentation devra être relue avant réutilisation.

## LOD, culling et qualité visuelle

Premier niveau : caméra orthographique, chunks statiques, objets instanciés, une lumière principale, palette de matériaux réduite, ratio de pixels plafonné et ombres maîtrisées. Le tri de transparence peut coûter plus qu'un modèle opaque détaillé : feuillage opaque low poly au départ.

Deuxième niveau seulement après profilage : LOD en taille projetée avec hystérésis, LOD d'ombres indépendant, priorité visuelle à l'entité sélectionnée, atlas partagés, mises à jour d'animation réduites pour le lointain. La simulation conserve la même précision hors caméra.

Troisième niveau : compute de culling/compaction, commandes indirectes, éventuellement culling d'occlusion. Recalculer les listes pour le frustum des ombres ou conserver les casteurs hors champ utiles : réutiliser uniquement la liste visible caméra peut faire disparaître leurs ombres. Les counters atomiques ne garantissent pas un ordre stable ; ne jamais utiliser l'ordre du rendu pour départager une décision de gameplay.

Notre monde a une grille d'autorité pour la sélection et la navigation. Préférer raycast sur le sol puis conversion de case plutôt qu'un readback GPU du personnage pour chaque mouvement de souris. La visibilité des toits/murs doit aider la lecture et ne modifier ni collision ni possession des ressources.

## TypeScript, workers et Rust/WASM

Décision : séparation des domaines dès le départ ; optimisation de chaque domaine selon mesure. Un worker reçoit des commandes identifiées par séquence, exécute les ticks, publie un snapshot numéroté. Les messages sont copiés ou transférés ; les `ArrayBuffer` transférables permettent de déplacer leur propriété. Un petit pool de buffers recyclés et une politique explicite de snapshots obsolètes évitent l'accumulation. [Workers, documentation Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

Les snapshots graphiques peuvent sauter des images ; les commandes de jeu ne doivent être ni perdues ni réordonnées. Interpoler uniquement des positions visuelles ; afficher l'état autoritaire pour la sélection, les stocks et les ordres. Une sauvegarde en cours de message requiert un tick et une version de schéma explicites.

Rust/WASM est candidat pour pathfinding, diffusion de chaleur, régions connectées ou génération de monde lorsque leur coût persiste après amélioration algorithmique. Prévoir une interface de tableaux et appels par lots ; des milliers d'appels JS↔WASM pour chaque objet ruineraient l'intérêt de cette frontière. Ne pas réécrire l'interface et le rendu Three.js en Rust. Commencer avec un module WASM monothread dans le worker si nécessaire, comparer à l'implémentation TS identique.

`SharedArrayBuffer` exige un contexte sécurisé et une isolation cross-origin dans les cas documentés ; il demande également un protocole atomique de propriété. Ne pas en faire une dépendance du premier jeu. [SharedArrayBuffer, conditions de sécurité](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

Le multithreading Rust dans le navigateur passe par des workers et une mémoire partagée ; `wasm-bindgen-rayon` fournit un adaptateur et documente sa configuration. Cela ajoute une chaîne d'outils et des en-têtes de déploiement. Aucun gain chiffré n'est présumé ; version de Rust et des crates à revalider lors de la décision d'intégration. [Dépôt de l'adaptateur](https://github.com/GoogleChromeLabs/wasm-bindgen-rayon).

## Protocole de validation et de benchmark

Objectif provisoire : interaction fluide à 60 Hz sur un ordinateur de bureau compatible, avec une dégradation graphique configurable. Ce n'est pas une garantie matérielle. Une scène avec trois colons sert à vérifier le jeu, pas à démontrer sa capacité finale.

1. Définir des fixtures seedées : 32×32/3 acteurs ; 128×128/100 acteurs ; 256×256/500 acteurs. Les deux dernières sont des cibles d'expérience, pas des modes annoncés. Varier acteurs visibles, travaux actifs, congestion, animaux, constructions et transitions d'animation.
2. Exécuter le même trajet de caméra et le même journal de commandes. Mesurer chargement froid, compilation, puis 20 secondes de chauffe et 60 secondes de collecte ; au moins cinq répétitions. Déclarer appareil, GPU/adaptateur, pilote si accessible, OS, navigateur, résolution et ratio de pixels.
3. Collecter temps CPU de simulation, publication/décodage des snapshots, soumission du rendu, frame p50/p95/p99 et pointes, draw calls, triangles, uploads, allocations/GC et mémoire estimée des buffers. Le taux d'images moyen masque les saccades.
4. Mesurer le GPU avec timestamps lorsque la fonctionnalité est disponible, hors boucle bloquante. À défaut écrire « durée GPU indisponible ». Les query sets permettent les requêtes temporelles, mais leur disponibilité doit être interrogée. [GPUQuerySet](https://developer.mozilla.org/en-US/docs/Web/API/GPUQuerySet).
5. Comparer A/B une seule variable : CPU/compute culling, VAT/atlas os, ombres, qualité, TS/WASM. Publier données brutes, percentile et observation visuelle. Vérifier rendu identique et même simulation avant de parler de gain.
6. Ne pas inférer des performances matérielles depuis Chromium headless avec rendu logiciel. Les tests CI valident le comportement et la compilation ; un passage navigateur sur GPU réel valide le pipeline, et une machine de référence stable valide les budgets de temps.

Les tests qualitatifs se concentrent sur quelques contrats approfondis : replay déterministe et continuation après sauvegarde ; conservation des ressources et réservation concurrente ; navigation bloquée et invalidation de chemins ; cohérence worker/commandes ; rendu initial et erreurs GPU ; animation de référence à des temps clés, bind pose, transitions et bounds. Pour le compute, tester 0, 1, taille de workgroup−1, taille exacte, +1 et capacité maximale ; vérifier bornes et absence de doublons dans la compaction. Un oracle CPU limité aux tests doit contrôler de petites fixtures, sans devenir un coût runtime.

Une modification de couleur exige une inspection visuelle ciblée. Une modification du planner de travaux exige la simulation de concurrence et le replay. Une modification d'atlas, culling ou de Three.js exige le test graphique et les fixtures GPU touchées. Aucun test ne peut promettre de détecter toute anomalie imaginable ; chaque invariant et risque connu doit avoir une vérification explicite.

## État de la première implémentation

`src/render/ColonyRenderer.ts` livre le rendu orthographique, les contrôles caméra, la sélection de case, les désignations et les modèles procéduraux. Le sol est découpé en chunks de 16 cases ; ressources et constructions sont, pour cette petite carte, des batches par famille. Les changements de snapshots ne reconstruisent ces géométries que si leur signature de contenu change.

Les personnages ont six os rigides, avec indice d'os, pivot de bind et influence unique par sommet. Le vertex shader TSL applique marche, travail et repos ; positions/yaw sont interpolés sur GPU à partir de deux snapshots. Aucune hiérarchie d'objets d'os ni aucun `AnimationMixer` n'est mis à jour sur CPU par image. Ce rig simplifié n'est pas encore un importateur de squelettes glTF, un atlas d'os ou une passe compute ; ces travaux restent au plan.

La première vérification dans le navigateur intégré, avec backend annoncé WebGPU, a détecté une vraie erreur de création de pipeline : neuf vertex buffers excédaient la limite de huit sur le device. Les attributs statiques ont été regroupés dans un buffer interleaved, ce qui laisse cinq buffers pour ce rig. Après correction : TypeScript valide, trois personnages et leurs ombres visibles, absence de nouvelles erreurs GPU dans la console observée. Un canvas présent et un compteur FPS actif ne suffisaient pas à détecter l'échec initial : les tests d'intégration doivent également examiner les erreurs du renderer.

Cette vérification visuelle valide le démarrage du pipeline observé ; elle ne remplace ni le protocole de benchmark, ni les tests d'animation sur les futurs assets.
