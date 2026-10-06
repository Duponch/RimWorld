# V237 — sources de la présentation compacte et de ses oracles

6 octobre 2026. [Contrat](../development/natural-compact-v237.md), [qualification et rejet](../history/validation-natural-compact-v237.md). Recherche limitée à la représentation de scène et à l'observation des buffers ; aucune règle RimWorld, adaptation de gameplay ou gain de langage n'est ajouté.

## Sources primaires du projet

Le [contrat V233](../development/resource-structural-presentation-v233.md) fixe la composition finale A→C, les changements par ID, la provenance privée et les replis. `NaturalResourcePresentation`, `natural-presentation-events`, `scene-resource-index`, `SceneRenderCore.updateResources` et les vrais corps PlantCluster/Resource/Overview constituent les références d'implémentation.

L'entrée delta non-reset de PlantCluster consomme K sans parcourir `world.resources`. Le gate de frame permet déjà à Resource et Overview de recevoir C complet avec leurs exclusions historiques. La sortie publique Nature effectue cependant encore le filter/map de N sources puis le spread World lorsqu'une forme change : c'est le travail supprimé dans cette expérience. Les queries, heap, tri et forecasts sont conservés ; leur coût restant ne doit pas être attribué à la matérialisation seule.

Les corps RAW du Core, de Nature publique et des fonctions mesurées sont comparés par inversion textuelle complète, pas par hashes pris comme oracles de valeurs. Les paquets des deux références proviennent de 64 vrais ticks moteur et traversent les ports natifs. Des publications préparées distinctes exercent les frontières que ce court suffixe ne contient pas naturellement.

## Sources primaires Three installées

Version locale : Three 0.186.0, verrouillée dans package-lock. Lecture du code installé plutôt que supposition sur le comportement du backend :

- `RenderObject.js` donne priorité à `geometry.instanceCount` pour une InstancedBufferGeometry, puis utilise `Math.max(0, object.count)` ; un count nul ne produit pas de draw.
- `Instance.js` lit une matrice Storage/mat4 à `instanceIndex`. Cette preuve ne s'étend pas à un stockage custom arbitrairement indexé par un shader.
- `Attributes.js` crée au premier update, puis soumet lorsque la version augmente ou lorsque l'usage est `DynamicDrawUsage`.
- `WebGPUAttributeUtils.js` copie initialement l'array entière ; un update sans ranges copie plein, sinon il écrit les ranges puis les efface réellement. Conversion de types et padding de certains layouts restent des branches supplémentaires.
- `InstancedBufferAttribute.js` définit `meshPerAttribute`. `OverviewBatch.ts` possède son propre shader et son interleaved de matrices ; le seul nom `instanceMatrix` ne lui confère pas le contrat Storage/mat4 standard.

Ces sources motivent l'union des domaines et le shadow résident du contrôle CPU. Une nouvelle array sur le même attribute ne prouve pas une nouvelle allocation GPU. Le replay sans renderer ne consomme pas les ranges du source et ne démontre pas leur re-déclaration après un véritable draw ; cette limite est explicite. Les corps et empreintes des références sont capturés dans la provenance privée du helper.

Le [diagnostic V236](../history/validation-render-room-terrain-v236.md) a déjà écarté le census terrain des pièces faute de gain FPS utile. Aucun de ses helpers n'est monté ici. Les anciennes variantes de workers et de réception propriétaire restent également écartées. Le comptage causal Nature préparé ensuite est une instrumentation hors chrono, à qualifier séparément ; il ne justifie pas encore une optimisation.
