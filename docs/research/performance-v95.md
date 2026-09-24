# CPU, transmission et commandes GPU — V95

**Correction de portée V96 :** les comparaisons V95 à caméra immobile ne détectaient pas une liste incomplète d’objets à actualiser après une passe d’ombres imbriquée. Le suivi de caméra est corrigé et mesuré dans les [preuves V96](../history/validation-camera-v96.md). Les anciens FPS rapprochés, obtenus avec des actualisations omises, ne constituent pas une référence de qualité égale. Les artefacts V95 restent conservés.

Audit du 24 septembre 2026, à la demande de l'utilisateur. Le gameplay est suspendu pour ce chantier. Cible : se rapprocher de 240 images/s en gardant les règles, les états et la qualité visuelle. Une cible n'est pas une garantie, notamment à cent acteurs et cent animaux.

## Sources et diagnostic

Sources primaires consultées avec le code installé de Three **0.186.0** : [BufferAttribute](https://threejs.org/docs/pages/BufferAttribute.html), [BundleGroup](https://threejs.org/docs/pages/BundleGroup.html), [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html), [commandes GPU réutilisables](https://developer.mozilla.org/en-US/docs/Web/API/GPURenderBundle), [WebAssembly et répartition du travail](https://web.dev/articles/webassembly-performance-patterns-for-web-apps?hl=en). Aucun changement de règle RimWorld dans ce lot.

Le profil local distingue le temps de simulation dans le worker, le décodage du message, la préparation de la scène, la soumission CPU et le temps GPU. Les FPS seuls ne permettent pas d'attribuer une chute à la carte graphique. Sur le premier diagnostic, le temps GPU de la carte entière est voisin de 0,92 ms ; le profil CPU trouve surtout des envois de buffers inchangés, la soumission des dessins, les matrices et l'adoption de la végétation. Cette scène ne justifie donc pas une migration générale vers WASM : elle laisserait intact le coût des commandes graphiques et des messages. Une extraction future d'un noyau calculatoire reste possible si une mesure en justifie le coût.

## Changements sans nouvelle règle

- Les attributs résidents passent de `DynamicDrawUsage` à des mises à jour explicites. Dans cette version de Three, l'usage dynamique provoque un envoi à chaque rendu même sans nouvelle version du buffer. Les changements de position/couleur continuent à signaler `needsUpdate`.
- `NaturalResourcePresentation` transmet les identifiants et tailles visuellement changés à `PlantClusterLayer`. Les touffes inchangées ne reconstruisent plus leur matrice ni leur couleur. L'alpha, les sept tiges, les ombres, les tailles et les espèces sont conservés.
- `LandscapeBatch` conserve les commandes WebGPU du terrain, des ressources, des roches, des touffes. La simulation, les acteurs, les portes et les lumières restent indépendants. Toute adoption de monde, bascule de distance, modification de feuillage et préparation des ombres invalide le lot. Les matrices locales statiques sont capturées une fois. Les piles restent hors du bundle après la comparaison de pixels ; leurs lots vides sont conservés en mémoire mais exclus de la soumission, et réactivés lors du dépôt ou de la préparation des ombres. Pour éviter une liste de visibilité périmée après mouvement de caméra ou de lumière, les objets du lot sont soumis conservativement ; le GPU les découpe. Le repli WebGL conserve son culling d'origine et ne revendique aucun gain des render bundles.
- Les piles transitent par deltas exacts (ajout, retrait, ordre, propriétaire et états imbriqués). La cadence de publication reste identique. La copie privée du cache détecte les mutations sur place ; le décodeur valide tout le paquet avant publication et conserve les instantanés antérieurs. Les petites colonies ne bénéficient pas forcément de ce surcoût de comparaison ; le gain vise les grandes collections.
- Le décodeur des ressources garde un index ID→position pour les deltas sans changement de membres. Il conserve l'ordre, les doubles exacts, les instantanés antérieurs et l'atomicité des refus.
- Le panneau Travail fermé ne reparcourt plus ses contrôles DOM à chaque actualisation du HUD. Son ouverture actualise immédiatement les valeurs.
- Les coûts de terrain sont capturés directement ; les définitions des sols restent lues, sans cache global périmé. Une recherche entièrement épuisée ne rebalaie plus sa grille pour réécrire les sentinelles déjà correctes. Le planificateur de travail diffère les coûts des recherches inutilisées, uniquement pendant son examen synchrone sans mutation de navigation. L'API générale conserve sa capture immédiate et son indépendance du masque fourni.

## Protocole reproductible

`scripts/performance-v95.mjs` mesure Chromium matériel, 1920×1080, près/intermédiaire/carte entière, pause/1×/6×, depuis le même état sauvegardé restauré avant chaque fenêtre. `PERF_GPU=1` active une passe diagnostique distincte de timestamps GPU ; `PERF_PROFILE=1` produit un profil CPU dans une fenêtre séparée. Aucun export complet du monde pendant les fenêtres. `PERF_WORLD` permet une charge mixte préparée. CPU lourd, natif et tests s'exécutent successivement, avec sources servies figées en natif.

Pour le témoin V94, extraire `git archive f993e3a src` dans `tmp/perf-v94`, puis utiliser `PERF_BASELINE=1`. Le serveur transforme cette copie isolée sans modifier les sources du travail courant. Les deux variantes doivent reprendre le même état et la même caméra. Les mesures courtes sont sensibles à l'échauffement, à la charge de la machine et à la synchronisation écran ; conserver les passages contradictoires.

Attention : les compteurs `renderer.info` de Three comptent les dessins encodés, sans réadditionner ceux rejoués depuis un bundle. Après cette refonte, leur baisse ne prouve **ni une réduction de géométrie ni une réduction des dessins exécutés sur le GPU**. Le temps GPU et la comparaison d'images sont les preuves pertinentes.

## Contrôles de conservation

`scripts/landscape-equivalence-v95.mjs` compare les PNG produits par la même scène avec commandes conservées et soumission ordinaire, puis isole le culling d’origine et conservateur, aux trois distances : initialisation, masquage des feuilles, retrait/restauration des plantes, retrait de piles et nuit. Les hashes stricts restent dans le rapport : une différence résiduelle d’un pixel de nuit sur 1 440 000 pixels interdit de qualifier toutes les captures de strictement identiques. Le seuil raster documenté est de deux pixels maximum, avec 32/255 par canal maximum ; les buffers et transformations gardent leurs propres contrôles de conservation. Les détails restants sont couverts par les tests de buffers, de croissance et les parcours UI.

Les replays CPU comparent les sauvegardes et le PRNG : recherche à trois acteurs sur 40 ticks, cent acteurs sur 80 ticks, puis cent colons/cent lièvres en activités mixtes sur 120 ticks. Cela vérifie les décisions exactes sur ces parcours ; ce n'est pas une preuve universelle sur toutes les parties possibles.

Correction de preuve ancienne : le test A/B des touffes V94 écrivait directement `plants.group.visible`, puis `frame()` rétablissait cette visibilité selon le zoom. Ce test ne permet donc pas d'isoler leur coût. Les fichiers historiques sont conservés, mais cette conclusion de coût est retirée du contrat courant.

Mesures finales, commandes exécutées et limites : [validation V95](../history/validation-performance-v95.md).

## Commandes de reprise des bancs

Extraire `src`, `scripts/research-bench.ts` et `tests/scenarios` du commit témoin dans `tmp/perf-v94`. `scripts/bridge-transport-v95.mjs` compare ce témoin au code courant, sans republier de sauvegarde propriétaire.

La charge native mixte est produite par `habitatApparelLoad(100)` dans `tests/scenarios/habitat-apparel-load.ts`, puis `serializeWorld(world)` est écrit dans `tmp/performance-v95-mixed.json`. La passer par `PERF_WORLD=tmp/performance-v95-mixed.json` ; `PERF_PHASES=far:0,far:6` sélectionne les deux fenêtres de charge. Le banc CPU utilise `HABITAT_APPAREL=1` et `VALIDATION_VERSION=v95` avec `scripts/research-bench.ts`. Les variables restent locales à leur processus PowerShell. Préserver les résultats antérieurs sous des suffixes distincts.
