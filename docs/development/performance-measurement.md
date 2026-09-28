# Mesurer la référence actuelle

Deux bancs existants répondent à des questions différentes : [`npm run bench`](../../scripts/benchmark.ts) mesure la simulation Node sur une carte synthétique 64 × 64 ; [`performance-audit-v140.mjs`](../../scripts/performance-audit-v140.mjs) observe le jeu dans Chromium natif/WebGPU à partir d'une même sauvegarde. Exécuter les mesures CPU, les campagnes longues et le navigateur **successivement**, sur des sources servies gelées. Conserver le commit, la machine, le runtime, la sauvegarde et son hash, les paramètres, ainsi que les rapports sous `tmp/`.

Dans chaque terminal PowerShell utilisé, depuis la racine du dépôt :

```powershell
$env:TEMP = 'E:\Code\RimWorld\tmp\host-cache\temp'
$env:TMP = $env:TEMP
$env:NPM_CONFIG_CACHE = 'E:\Code\RimWorld\tmp\host-cache\npm-cache'
New-Item -ItemType Directory -Force $env:TEMP, $env:NPM_CONFIG_CACHE | Out-Null
```

## Simulation CPU

```powershell
npm run bench -- --counts=3,30,100,300 --samples=5 --check-fixture
npm run bench -- --counts=3,30,100,300 --samples=5
```

`--counts` accepte des effectifs distincts de 1 à 300 (défaut 3,30,100,300) ; `--samples` accepte 1 à 10 (défaut 5). `--check-fixture` valide chaque monde actif/inactif, sa sérialisation exacte et sa continuation d'un tick, puis s'arrête **sans chronométrer**. Une mesure écrit `tmp/simulation-benchmark-current.json` et remplace le précédent rapport : le copier sous un autre nom dans `tmp/` avant une autre passe. Elle sépare le premier tick de répartition, la moyenne par tick des lots actifs de 20 ticks, et les ticks inactifs ; les achèvements, le bois rangé et la conservation sont contrôlés hors chronométrage. Son p95 actif porte sur les **moyennes des lots**, pas sur les ticks individuels. Ce banc ne mesure ni worker, ni navigateur, ni rendu/GPU.

La fabrique actuelle construit des `Pawn` complets et une réserve en piles admissibles. L'ancien artefact `schema2` employait une autre fixture : ses chiffres ne forment pas un A/B contrôlé avec ceux-ci. Pour comparer deux révisions, mesurer la **même** fixture et les mêmes options sur chacune, sans modifier le banc entre les passes ; si cela n'est pas possible, présenter deux références distinctes.

## Navigateur natif

Le script charge par défaut `public/test-saves/v98/mixed-100.json`, avec hash SHA-256 du fichier et du monde décodé dans son rapport. Un premier contrôle ne démarre pas Chromium :

```powershell
node scripts/performance-audit-v140.mjs reference --dry-run
```

Ensuite, lancer `npm run dev -- --port 5173` dans un terminal, attendre le serveur, puis lancer dans un second terminal :

```powershell
$env:PERF_ORIGIN = 'http://127.0.0.1:5173'
$env:PERF_WORLD = 'public/test-saves/v98/mixed-100.json'
$env:PERF_SCENES = 'iso-near,iso-wide,perspective-low,iso-labels'
$env:PERF_SPEEDS = '0,6'
$env:PERF_WARMUP = '5'
$env:PERF_SECONDS = '8'
$env:PERF_GPU = '0'
node scripts/performance-audit-v140.mjs reference
```

Le rapport va dans `tmp/performance-audit-v140-reference.json` ; changer le label pour conserver chaque passe. `PERF_SCENES` accepte les quatre vues ci-dessus ; `PERF_SPEEDS` accepte 0, 1, 3, 6. `PERF_SHADOWS`, `PERF_SHADOW_CACHE`, `PERF_CLOUDS`, `PERF_LABELS`, `PERF_TEXTURES`, `PERF_GRASS` et `PERF_WIND` acceptent `on/off` pour des paires diagnostiques. Le protocole recharge la même sauvegarde avant chaque phase, fixe caméra et présentation, chauffe, puis mesure une fenêtre de temps réel à 1 920 × 1 080 et DPR 1. Un A/B entre révisions se fait séquentiellement, idéalement A–B–B–A, avec même sauvegarde, réglages, matériel et serveurs de sources figées.

Le rapport distingue intervalle RAF, CPU d'image et soumission, temps de tick déclaré par le worker, adoption/décodage des snapshots, débit de ticks et compteurs de dessin. RAF dépend de l'écran ; le temps CPU d'image n'est pas le temps GPU ; les compteurs peuvent omettre des bundles WebGPU conservés. `PERF_GPU=1` lance une **passe instrumentée séparée** pour les timestamps GPU, seulement si l'adaptateur les prend en charge ; ne pas mélanger ses chiffres avec les passes RAF/CPU ordinaires. Une scène, un microbanc ou une pointe observée ne garantit ni 240 FPS constants ni débit ×6 général. Les [mesures V140 datées](../history/validation-performance-v140.md) restent une preuve historique, pas une référence chiffrée de ce code.
