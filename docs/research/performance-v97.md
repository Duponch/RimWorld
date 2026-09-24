# Coûts du paysage après correction caméra — V97

Audit du 24 septembre 2026, Three **0.186.0**, après le signalement de gains jugés trop faibles. Référence correcte : V96 `c9010ec`, avec `ReentrantRenderer`. V95 omettait des mises à jour de caméra ; son débit rapproché n'est pas un témoin de qualité équivalente.

## Mesures avant choix

Les profils natifs du [panoramique](../../artifacts/performance-v97-baseline-profile.json) et de la [vue proche](../../artifacts/performance-v97-near-profile.json) montrent deux coûts distincts : rejeu des bindings/matrices de **824 dessins** du paysage proche et adoption de végétation. Le lot conservé soumettait toute la carte, même hors champ. `NodeMaterialObserver` traite les matériaux avec `outputNode` d'éclairage comme dynamiques ; les déclarer statiques ne supprimerait pas proprement ces mises à jour.

Le premier [diagnostic sans bundle](../../artifacts/performance-v97-culling-diagnostic.json) conservait accidentellement `frustumCulled=false` : il mesurait une régression, pas le bénéfice du rejet hors champ. Le [diagnostic corrigé](../../artifacts/performance-v97-culling-enabled.json) monte à 235,5 FPS de près en pause et 155,4 à ×6, mais tombe à 144,7 en vue globale ×6. Il motive deux chemins selon le niveau de détail déjà existant, sans déplacer ses seuils.

Sources primaires : [BundleGroup](https://threejs.org/docs/pages/BundleGroup.html), [Frustum](https://threejs.org/docs/pages/Frustum.html), code installé de `Renderer._projectObject`, `Renderer._renderBundle`, `ShadowNode` et `NodeMaterialObserver`, consultés le 24 septembre. Le choix découle des profils locaux ; ce n'est pas une promesse générale de performance de Three.

## Implémentation

- De près, le paysage utilise le parcours ordinaire avec le rejet hors champ propre à chaque caméra. La passe d'ombres garde sa propre caméra : aucun masquage global des objets d'après la seule vue du joueur.
- De loin, les quelques dessins de la représentation globale conservent leurs commandes WebGPU. Le changement de chemin restaure les propriétés de visibilité initiales et invalide le bundle. Géométries, matériaux, éclairage, silhouettes et seuils de détail restent inchangés.
- Les limites géométriques des touffes sont une enveloppe conservatrice agrandie à chaque transformation modifiée, puis reconstruite au chargement. On évite de reparcourir 13 350 instances pour une seule croissance. Les tests vérifient chaque sommet transformé dans cette enveloppe.
- `ResourceLayer` recalcule signatures et géométrie des seuls anciens/nouveaux chunks concernés. `OverviewLayer` consomme les mêmes changements, en excluant les touffes qui ont leur propre couche. Les parcours complets restent des oracles ; ajouts, suppressions, retours et changements d'espèce gardent les buffers attendus.

Le contrat des commandes conservées et son adaptateur V96 restent nécessaires de loin. Aucun fichier de simulation, worker, stockage ou migration ne change. Il n'y a ni ralentissement volontaire des instantanés ni dégradation des règles pour améliorer le compteur FPS.

## Limites et suite du diagnostic

Les [preuves V97](../history/validation-performance-v97.md) séparent débit de simulation, intervalles d'image, coût CPU et timestamps GPU. La comparaison répétée confirme surtout le gain rapproché. Sur le petit départ, la vue globale ×6 reste autour de 200 FPS ; les pics ne disparaissent pas. À 104 personnes et 100 animaux, le worker reste loin de 6× et son débit ne progresse pas dans ce lot.

Sur le départ, les timestamps GPU p95 valent environ 1,57 ms de près et 0,98 ms de loin, alors que les intervalles d'image p95 valent 8,4 ms. La cible 240 FPS implique 4,17 ms par image : le temps GPU seul ne suffit donc pas à la garantir. Adoption/décodage des instantanés, pics du thread principal et calcul de simulation restent à examiner selon la priorité de ROADMAP. WASM n'est pas choisi sans noyau coûteux identifié et comparaison exacte.
