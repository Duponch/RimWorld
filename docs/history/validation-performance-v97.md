# Paysage visible et végétation incrémentale — V97

Livraison du 24 septembre 2026. Le rendu rapproché ne met plus à jour toute la carte hors champ ; les limites des touffes et les couches de ressources suivent leurs changements. [Diagnostic, architecture et sources](../research/performance-v97.md). V96 reste le témoin avec caméra correcte. Schéma 91, catalogue V91, règles et PRNG inchangés.

## Contrôles regroupés

**13/13 tests**, dans `landscape-batch`, `render-retention`, `gpu-landscape`, `flora-deltas-v97` et `resource-deltas-v97` : identités des allocations, transformations, croissance, retrait/retour, changement d'espèce/type/chunk, masquage du feuillage, PRNG et enveloppes contenant tous les sommets. Durée finale 4,10 s. Le premier contrôle de flore échouait parce que son lecteur supposait une couleur instanciée sur un lot vide ; le lecteur distingue désormais l'absence de buffer, sans retirer de comparaison métier.

À l'intégration, le flux de changements non filtré contenait aussi l'herbe exclue du monde reçu par `OverviewLayer`. Le filtrage est maintenant identique dans les deux chemins et le test vérifie qu'une croissance de touffe ne reconstruit pas la vue globale. Typage et build réussis ; aucun test annuel nécessaire sans changement temporel.

GPU natif, sources gelées et campagnes successives :

- [64/64 images de caméra exactes](../../artifacts/camera-v97-transitions.json), projections orthographique/perspective, proche/loin, vrais gestes panoramique/rotation/molette et frontières préparées de changement de détail. Première image puis trois images d'amortissement, sans reconstruction préalable du paysage ; contrôle des listes et caméras des bundles encore utilisés. Le [premier passage à 48 images](../../artifacts/camera-v97.json) est conservé.
- [18/18 comparaisons exactes](../../artifacts/landscape-equivalence-v97.json) entre parcours ordinaire avec et sans rejet hors champ : jour/nuit, ressources retirées/restaurées, feuillage masqué et piles, trois distances. La caméra d'ombres garde son propre rejet. Cette preuve porte sur le rejet ; elle n'affirme pas une équivalence universelle des tris ordinaire/bundle, limite déjà consignée en V96.

## Comparaison répétée à trois colons

Ryzen 5 3600, GPU AMD RDNA1, Chromium matériel, 1920×1080, départ 250² graine 42 restauré avant chaque phase. Panoramique sinusoïdal commun ; aucun export pendant les fenêtres. V96 provient d'une archive de `c9010ec/src`, pas d'un contournement du correctif caméra. Sources gelées, exécutions successives.

Le [premier témoin](../../artifacts/performance-v97-reference-v96.json) et la [première version finale](../../artifacts/performance-v97-final.json), dix secondes après 1,3 s d'échauffement, présentent une forte variabilité : 99/184 FPS en pause proche, 63/199 proche ×6 et 154/198 loin ×6. Une comparaison en ordre inversé avec cinq secondes d'échauffement et huit secondes mesurées est donc conservée ci-dessous, sans sélectionner seulement les meilleurs gains.

| Vue / vitesse | V96 FPS | V97 FPS | Image p95 V96 → V97 | Pic V96 → V97 |
|---|---:|---:|---:|---:|
| Proche, pause | 141,3 | 210,0 | 8,4 → 8,4 ms | 16,7 → 16,6 ms |
| Carte entière, pause | 236,8 | 231,5 | 4,3 → 4,3 ms | 8,4 → 11,2 ms |
| Proche, ×6 | 101,8 | 201,3 | 29,1 → 8,5 ms | 45,8 → 45,8 ms |
| Carte entière, ×6 | 200,1 | 204,0 | 8,4 → 8,4 ms | 29,3 → 29,3 ms |

[Témoin répété](../../artifacts/performance-v97-reference-v96-repeat.json), [V97 répétée](../../artifacts/performance-v97-repeat.json). Débit final : **5,98× proche, 5,97× loin** pour 6× demandé. L'adoption végétale p95 passe de 22,2 à 12,7 ms de près, de 19,7 à 12,1 ms de loin. L'adoption totale du monde passe de 25,9 à 18,0 ms de près. Les pics restent réels ; aucune garantie de 240 FPS constants et pas de gain significatif démontré sur la petite colonie entièrement dézoomée.

Reproduction : archiver `git archive c9010ec src` dans `tmp/perf-v96`, puis lancer `scripts/performance-v95.mjs` avec `PERF_MOTION=1`, `PERF_SECONDS=8`, `PERF_WARMUP=5`, `PERF_PHASES=near:0,far:0,near:6,far:6`. `PERF_REFERENCE=v96` sélectionne l'archive ; l'omettre sélectionne V97. Le nom historique du script n'est pas celui de la référence mesurée.

## Colonie mixte et GPU

Même checkpoint instrumenté V95, tick 2000, 104 personnes, 100 animaux, 266 piles et 11 009 ressources, restauré avant chaque fenêtre de huit secondes après cinq secondes d'échauffement ; panoramique et ×6 demandés. [V96](../../artifacts/performance-v97-mixed-reference.json), [V97](../../artifacts/performance-v97-mixed-final.json).

| Vue | FPS V96 → V97 | Image p95 V96 → V97 | Pic V96 → V97 | Débit V96 → V97 |
|---|---:|---:|---:|---:|
| Proche | 41,2 → 109,8 | 58,3 → 20,9 ms | 79,0 → 41,6 ms | 2,93× → 2,75× |
| Carte entière | 125,8 → 142,9 | 25,1 → 16,7 ms | 54,1 → 37,6 ms | 3,34× → 3,18× |

Les temps worker p95 passent de 81,47 à 84,57 ms de près, de 69,90 à 75,35 ms de loin. Ce lot n'améliore donc pas le débit du worker : les valeurs observées sont même un peu moins bonnes sur ces fenêtres courtes. Un rendu plus fluide ne vaut pas une simulation 6× tenue. Aucune causalité générale ni amélioration CPU de simulation n'est revendiquée.

[Passage de timestamps GPU distinct](../../artifacts/performance-v97-gpu.json), petit départ ×6 : proche p95 **1,57 ms**, loin **0,98 ms**, pour environ 201 FPS et 8,4 ms d'intervalle d'image p95. Ces timestamps mesurent le travail GPU résolu par Three ; ils ne comprennent pas tout le temps CPU, l'attente d'image et la présentation. Les compteurs Three d'encodage ne comptent pas les bundles rejoués ; ils ne servent pas à prétendre que les triangles visibles ont disparu.

## Périmètre et publication

G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent. Aucun nouveau contenu jouable ni estimation fonctionnelle augmentée. Simulation, catalogue, migrations et sauvegardes restent ceux de l'[inventaire](../gameplay/implementation-status.md). Les grands systèmes absents restent ouverts ; cette livraison poursuit la pause gameplay demandée pour les performances.

Netlify : déploiement **`6ab58e97dabdfb48f402dd22`**, 23 fichiers, état `ready`. [Résultat](../../artifacts/netlify-v97.json), [parcours public natif réussi](../../artifacts/netlify-smoke-v97.json), [empreinte du bundle public identique au build testé](../../artifacts/netlify-v97-bundle.json). Création, dossiers, curseurs, sauvegarde et reprise à froid passent sans erreur JS/GPU. La limitation API initiale GET a été attendue puis levée, sans créer de déploiement en double. Vérification documentaire et diff réussis, trois originaux inchangés. Mode jour : livraison puis retour à l'utilisateur.
