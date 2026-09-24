# Caméra et commandes GPU — V96

Correctif de la régression signalée par l’utilisateur après V95, le 24 septembre 2026. Déplacement, rotation et zoom doivent déplacer ensemble paysage, acteurs et stocks dès la première image. Aucun changement de simulation, de catalogue V91 ou de sauvegarde de schéma 91.

## Cause et correction

Dans Three **0.186.0**, l’enregistrement du premier objet éclairé du paysage déclenche un rendu d’ombres imbriqué. Le moteur remplace alors `_currentRenderBundle`, puis le remet à `null` sans restaurer le contexte extérieur. Les dessins suivants existent dans les commandes GPU, mais manquent dans la liste dont les uniforms sont actualisés au rejeu. Sur le cas rapproché : **1 objet enregistré pour 824 dessins**, contre **824/824 après correction**. L’adoption suivante du monde reconstruit le lot et donne l’impression que le paysage rattrape la caméra avec retard.

`ReentrantRenderer` isole le contexte à l’entrée de chaque `render()` et le restaure dans `finally`, y compris pour les passes imbriquées. Les objets d’ombre hors bundle ne polluent donc pas non plus la liste principale. Les commandes, buffers, ombres et géométries sont conservés ; aucun réenregistrement systématique à chaque mouvement. `static=false` n’aurait pas restauré les objets absents de la liste. Le diagnostic sans ombres retrouvait déjà 824 objets, mais supprimer les ombres n’est pas le correctif livré.

Audit croisé avec le code installé : `Renderer._renderBundle`, `_renderObjectDirect`, `ShadowNode.renderShadow`, `NodeMaterialObserver` et les bindings de Three. [API officielle BundleGroup](https://threejs.org/docs/pages/BundleGroup.html). L’adaptateur utilise un champ interne identifié, sous version exactement épinglée ; son garde de révision impose une nouvelle vérification lors d’une montée de Three. Aucun fichier de dépendance installé n’est modifié.

## Preuves caméra

`node scripts/camera-retention.mjs v96-camera-final` : **48/48 images strictement identiques** à un bundle fraîchement enregistré à la même pose, sans aucune actualisation du paysage entre l’entrée souris et les quatre images testées. Douze gestes réels (panoramique au bouton central, rotation au bouton droit, molette), aux distances proche/lointaine, en projections orthographique/perspective ; première image et trois images d’amortissement. Les listes contiennent tous les dessins (824 de près, 6 en vue globale) pour la bonne caméra ; la version du bundle reste constante durant le mouvement. [Rapport final](../../artifacts/camera-v96-camera-final.json).

Contrôle négatif : `CAMERA_BASELINE=1` remplace seulement le constructeur par celui de V95. **24/48 échecs**, jusqu’à **1 198 375 pixels différents** sur 1 440 000 ; mêmes entrées et oracle. [Témoin V95](../../artifacts/camera-v95-camera-control.json). Cette détection n’existait pas dans le test V95, qui reconstruisait le bundle avant chaque capture et ne prouvait donc pas le suivi de caméra.

Les premiers essais sont conservés : [avant correction](../../artifacts/camera-v95-before-light-matched.json), [diagnostic imbriqué](../../artifacts/camera-v95-diagnostic.json), [diagnostic sans ombres](../../artifacts/camera-v95-diagnostic-no-shadow.json), [comparaison initiale au rendu ordinaire](../../artifacts/camera-v96-first.json), [confirmation par réenregistrement](../../artifacts/camera-v96-fresh-bundle.json). La comparaison au rendu ordinaire change aussi le tri global des dessins et présentait des écarts, surtout en perspective lointaine : elle ne permet pas d’affirmer une équivalence visuelle universelle entre ces deux chemins. L’oracle de mouvement conserve désormais l’ordre et exige zéro pixel différent, au lieu d’élargir une tolérance. Les positions de lumière et de caméra sont rejouées ensemble et le survol est exclu ; les artefacts initiaux restent identifiés comme diagnostics.

## Performance pendant un panoramique

Chromium matériel, AMD RDNA1, 1920×1080, même départ 250² de graine 42 restauré avant chaque fenêtre. Quatre fenêtres successives de six secondes après échauffement, trajectoire sinusoïdale commune ; aucun export de monde pendant la mesure, sources gelées. `PERF_MOTION=1 PERF_PHASES=near:0,far:0,near:6,far:6 node scripts/performance-v95.mjs <suffixe>`, avec `PERF_BUNDLE_BASELINE=1` pour le témoin V95. Mesures CPU de soumission et intervalles RAF, pas des timestamps GPU.

| Vue / vitesse | V95 avec défaut, FPS | V96 corrigée, FPS | V96 image p95 | V96 débit |
|---|---:|---:|---:|---:|
| Proche, pause | 219,4 | 142,1 | 8,4 ms | pause |
| Carte entière, pause | 228,2 | 239,5 | 4,3 ms | pause |
| Proche, ×6 | 136,0 | 107,3 | 25,1 ms | 5,97× |
| Carte entière, ×6 | 162,6 | 187,4 | 8,4 ms | 5,96× |

[Mesure témoin](../../artifacts/performance-v95-camera-motion-control.json), [mesure corrigée](../../artifacts/performance-v96-camera-motion.json). La baisse rapprochée révèle le coût des actualisations précédemment omises : le gain V95 ne peut pas servir de référence de qualité équivalente dans ces conditions. Les fenêtres courtes ne prouvent ni un gain universel ni 240 FPS constants. La charge à cent colons n’est pas remesurée dans ce correctif ciblé ; ses limites antérieures restent ouvertes.

## Validation et périmètre

Build et typage réussis ; **10/10 contrôles** ciblés de `landscape-batch`, `render-retention` et `gpu-landscape` (3,61 s). Vérification documentaire réussie, corpus originaux inchangés et `git diff --check` sans erreur. Revue indépendante du contexte imbriqué et de l’oracle, sans défaut bloquant. Pas de campagne de plusieurs jours : règles, événements, PRNG, fichiers de simulation et migrations inchangés.

G0 reste en consolidation ; G1/G2/G3 partiels, G4 engagé, G5 absent. Le lot corrige le rendu en mouvement ; il n’ajoute aucun contenu ni aucune boucle de gameplay. Le gameplay déjà jouable et les grands systèmes absents restent ceux de l’[inventaire](../gameplay/implementation-status.md). Mode jour : livraison puis retour à l’utilisateur.

## Publication

Netlify : déploiement **`6ab5816e3f833a295c8b395e`**, 23 fichiers, état `ready`. [Résultat](../../artifacts/netlify-v96.json), [contrôle public réussi](../../artifacts/netlify-smoke-v96.json), [empreinte du bundle public identique au build validé](../../artifacts/netlify-v96-bundle.json). Création, dossiers, sauvegarde/rechargement à froid et interface publique passent ; aucune erreur JS/GPU. Le contrôle exact de caméra utilise l’instrumentation locale, tandis que le fichier de production est vérifié par son SHA-256.
