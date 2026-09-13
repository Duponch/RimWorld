# Passage aux cartes de 250 × 250 cellules

Chantier du 13 septembre 2026, dans G0. La [comparaison de référence](../research/spatial-design.md#taille-de-carte-et-résolution) motive le passage du défaut 64² à 250² : même résolution logique, 15,26 fois la surface. La demande utilisateur corrige une taille de prototype ; elle ne demande pas de modifier les proportions humaines ou de concentrer artificiellement les ressources près du joueur.

## Contrats

- 250² par défaut, 200² disponible, cartes compactes et fixtures conservées. La carte locale reste entièrement simulée ; le culling graphique n'endort pas les objets hors écran.
- Un mètre conventionnel par cellule, mêmes empreintes et modèles, génération à densité inchangée. Les chunks 16² peuvent être partiels au bord d'une carte de 250 cases.
- Les sauvegardes existantes ne sont ni agrandies ni régénérées. Le schéma 2 accepte les nouvelles dimensions ; le validateur V1 garde sa borne historique avant migration.
- Nouvelle colonie et chargement remplacent l'état à une frontière explicite. Une commande ou sauvegarde invalide laisse la partie courante intacte.

## Comparaison reproductible

La référence technique est le commit `5a27d9e4d3add190459dd5fc96a7a784af050060`. Une copie locale isolée sert aux mesures. Une expérience à 250² sur cette référence doit être qualifiée comme **version ancienne avec seules bornes étendues** : la version publiée initialement refusait cette taille. Les scripts et rapports distinguent cette expérience, le vrai ancien défaut 64² et le nouveau moteur.

Comparer à graines, populations, viewport, niveau de zoom et action identiques. Mesurer séparément démarrage, simulation, communication du worker, adoption graphique, frames en vue locale, déplacement et panorama. Le nombre de cellules est une charge persistante supplémentaire : temps de génération et mémoire ne peuvent pas être supposés constants.

Les percentiles de frames décrivent une mesure navigateur sur le matériel communiqué ; ils ne sont pas des temps GPU de kernel. Un p95 de moyenne par lot de ticks n'est pas un p95 de ticks individuels. Les diagnostics ne remplacent ni les tests de conservation ni les essais de transitions entre cartes.

## Mesure du noyau CPU

Le [rapport du 13 septembre 2026 à 13:16:02 UTC](../../artifacts/map-simulation-benchmark.json) vient de [scripts/map-simulation-bench.ts](../../scripts/map-simulation-bench.ts), sous Node v24.11.1, Windows 10.0.26200, Ryzen 5 3600 (12 processeurs logiques). Les mesures de rendu ont été arrêtées pendant ce passage. Le protocole alterne l'ordre contrôle/nouveau moteur, effectue deux échauffements pour les opérations de carte et un pour la simulation, puis **trois répétitions mesurées**. Les deux variantes reçoivent des copies identiques des fixtures ; leur préparation et leur validation restent hors chronométrage.

La graine est 42. Les scénarios actifs désignent huit ressources proches pour trois colons, cent pour cent colons, puis exécutent 400 ticks. Les trois répétitions de chaque variante terminent ces collectes. Les scénarios inactifs exécutent 1 000 ticks. Génération et continuation sont comparées par **égalité du JSON complet hors chronométrage**, sans se limiter au hash de diagnostic 32 bits. Les états finaux sont strictement identiques dans toutes les paires 64²/128²/250², trois/cent colons, actif/inactif. La comparaison de génération à 250² utilise nécessairement le contrôle dont seules les bornes ont été étendues ; elle ne prouve pas que l'ancienne version publiée acceptait cette carte.

| Carte | Colons | Temps total médian des 400 ticks actifs, contrôle → actuel | p95 des moyennes par lot de 20 ticks, contrôle → actuel |
|---|---:|---:|---:|
| 64² | 3 | 26,55 → 3,11 ms | 0,097 → 0,025 ms/tick |
| 250² | 3 | 399,64 → 56,88 ms | 1,256 → 0,490 ms/tick |
| 64² | 100 | 303,81 → 253,96 ms | 1,156 → 0,992 ms/tick |
| 250² | 100 | 3 073,66 → 2 303,89 ms | 15,366 → 12,632 ms/tick |

Ces p95 portent sur les **moyennes de lots**, jamais sur les ticks individuels ou les frames. À 250² et cent colons, le temps total actuel correspond à 5,76 ms/tick en moyenne sur cette fenêtre. La carte reste donc plus coûteuse que 64² à charge active comparable : ce passage ne garantit pas un coût constant quel que soit le monde, la population ou les obstacles. Les huit recherches BFS par tick bornent leur nombre, mais chacune peut encore parcourir une grande partie de la carte.

La suppression du scan de terrain pendant les ticks sans navigation réduit fortement le coût inactif : pour trois colons et 1 000 ticks, le total médian passe de 62,33 à 1,06 ms en 64² et de 984,52 à 0,39 ms en 250². Ces petites durées sont sensibles au bruit de mesure. Avec cent colons en 250², le même total passe de 882,54 à 7,14 ms. Ce sont des mesures du noyau pur, sans simulation de frames ou communication du worker.

| Carte initiale | Ressources | JSON UTF-8 | Génération actuelle, médiane | Sérialisation actuelle, médiane | Désérialisation actuelle, médiane | BFS complet, contrôle → actuel |
|---|---:|---:|---:|---:|---:|---:|
| 64² | 736 | 119 428 octets | 8,63 ms | 2,62 ms | 2,75 ms | 0,203 → 0,090 ms |
| 128² | 3 375 | 501 463 octets | 10,36 ms | 3,91 ms | 6,19 ms | 0,387 → 0,216 ms |
| 250² | 12 411 | 1 894 438 octets | 36,83 ms | 12,35 ms | 20,06 ms | 1,337 → 0,694 ms |

Le générateur ne change que sa borne d'entrée dans cette tranche : aucune accélération de génération n'est revendiquée depuis les variations entre répétitions. Les temps de sérialisation incluent la validation ; la désérialisation inclut parsing et validation. Le poids JSON n'est **pas** une mesure du heap JavaScript, de la mémoire GPU ou du pic de mémoire au chargement. La carte contient 62 500 cellules et davantage d'objets vivants ; sa mémoire augmente. À titre de format, un champ BFS emploie deux tableaux `Int32Array` de 62 500 entrées, soit 500 000 octets, en plus de la grille transitoire de blocage de 62 500 octets et des autres objets. Aucun budget mémoire global ni résultat FPS ne se déduit de ces capacités.

## Reproduction du contrôle CPU

Depuis la racine du dépôt, les commandes PowerShell suivantes créent une copie de référence dans un nouveau répertoire, sans modifier le checkout courant ni supprimer de fichiers :

```powershell
$mapReferenceCommit = '5a27d9e4d3add190459dd5fc96a7a784af050060'
$mapReferenceRun = Join-Path (Get-Location).Path ('tmp/map-reference-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $mapReferenceRun | Out-Null
$mapReferenceArchive = Join-Path $mapReferenceRun 'reference.zip'
$mapReferenceDirectory = Join-Path $mapReferenceRun 'reference'
git archive --format=zip --output=$mapReferenceArchive $mapReferenceCommit
if ($LASTEXITCODE -ne 0) { throw 'Impossible de créer la référence Git.' }
Expand-Archive -LiteralPath $mapReferenceArchive -DestinationPath $mapReferenceDirectory
node --experimental-strip-types scripts/map-simulation-bench.ts $mapReferenceDirectory |
  Set-Content -LiteralPath (Join-Path $mapReferenceRun 'map-simulation-benchmark.json') -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'Le benchmark CPU a échoué.' }
```

Le script copie ensuite le noyau de référence dans `tmp/map-benchmark/bounds-only` et n'y modifie que les gardes de dimensions de `generation.ts` et du validateur de schéma 2 : 128 devient 250. Le validateur historique V1 garde sa borne. La référence extraite reste intacte. Ne pas exécuter plusieurs instances de ce script simultanément, puisqu'elles partagent ce répertoire de contrôle. Les compteurs de progression sortent sur stderr ; le fichier de résultat contient le JSON final. Ne pas lancer simultanément un test navigateur, une compilation ou une autre mesure de charge. Conserver le rapport avec son environnement et ses limites ; les mesures du rendu et du transport des snapshots restent des contrôles distincts.

## Rendu WebGPU : protocole et preuves retenues

Les rapports retenus sont [la référence](../../artifacts/map-render-baseline.json), commencée le 13 septembre 2026 à 13:24:38 UTC, et [le rendu actuel](../../artifacts/map-render-current.json), commencé à 13:29:16 UTC. Le [pilote Playwright](../../scripts/map-render-bench.mjs) utilise Chromium 153 normal en mode headless, **WebGPU sur AMD/RDNA-1**, sans adaptateur logiciel imposé. L'information provient du device effectivement configuré sur le canvas ; le nom précis du GPU et son pilote ne sont pas communiqués. Le viewport mesure 1440×1000. Chaque carte utilise la graine 42 et trois colons ; 64² contient 736 ressources, 250² en contient 12 411 dans les deux versions.

Le passage retenu comprend une mesure par taille et variante : référence 64²/128²/250², rendu actuel 64²/250². Les anciennes observations du rendu actuel en 128² restent exploratoires ; aucun résultat final 128² n'est inventé par interpolation. Aucune autre suite de tests ou mesure du projet ne tournait simultanément. **Il s'agit d'une seule machine et d'une seule graine de rendu**, avec l'activité ordinaire du poste ; ces chiffres ne sont ni une garantie sur tous les appareils, ni un essai de rendu de cent colons.

La copie graphique du commit de référence dans `tmp/map-baseline` ajoute 250 à la liste de tailles de `main.ts` et du worker, puis élève uniquement la borne du générateur de 128 à 250. Pour comparer une même scène visible, le pilote aligne aussi la distance de caméra, son plan lointain et le zoom panoramique sur le rendu actuel. Cette correction de présentation évite de favoriser une référence qui couperait des coins de carte. Elle ne modifie ni les ressources, ni la simulation, ni les anciens algorithmes de rendu. L'ancienne application publiée ne proposait pas 250².

Chaque vue reçoit **60 frames de chauffe**, puis au moins **240 frames chronométrées et six secondes**. Les fenêtres lentes peuvent donc durer plus longtemps. Les phases sont : vue locale en pause, vue locale à vitesse 6 avec une coupe réelle, panorama en pause, puis déplacement panoramique circulaire dont le centre reste à l'intérieur de la carte. Le zoom local et les silhouettes ne changent pas avec la taille du monde. Le panorama de comparaison utilise `zoom = 24 / taille` ; le minimum de zoom proposé au joueur tient aussi compte du ratio de fenêtre.

Le pilote mesure séparément la durée CPU de `frame`, la durée CPU d'adoption de `setWorld`, les reconstructions de ressources et les intervalles `requestAnimationFrame`. **Le CPU de rendu inclut la préparation et la soumission Three ; il n'est pas un temps GPU.** Les intervalles RAF comprennent l'ordonnancement du navigateur. Les soumissions et triangles viennent de `renderer.info` après un rendu et incluent les ombres. Le getter du monde n'est pas interrogé pendant les fenêtres de mesure. Aucun FPS du HUD ni conversion inverse du p95 n'est présenté comme cadence garantie.

## Résultats du rendu

| Vue | CPU rendu p50, référence → actuel | CPU rendu p95, référence → actuel | Intervalle RAF p95, référence → actuel |
|---|---:|---:|---:|
| Locale, pause, 64² | 3,7 → 1,4 ms | 4,7 → 1,8 ms | 4,3 → 4,3 ms |
| Locale, coupe, 64² | 3,8 → 1,5 ms | 4,9 → 2,1 ms | 8,3 → 4,3 ms |
| Locale, pause, 250² | 8,0 → 3,3 ms | 10,3 → 4,3 ms | 12,5 → 4,3 ms |
| Locale, coupe, 250² | 8,5 → 3,3 ms | 10,5 → 4,5 ms | 29,1 → 4,3 ms |
| Panorama, pause, 250² | 44,1 → 8,0 ms | 51,0 → 9,8 ms | 50,1 → 12,5 ms |
| Panorama, déplacement, 250² | 71,7 → 8,6 ms | 95,6 → 10,4 ms | 100,0 → 12,5 ms |

Dans cette mesure, le nouveau défaut 250² présente un p95 CPU local de **4,3 ms**, contre **4,7 ms** pour l'ancien défaut 64². La proximité de ces valeurs ne constitue pas une garantie statistique hors de cette fenêtre. Le nouveau panorama 250² reste plus coûteux que son cadrage local. En panorama fixe 250², les soumissions passent de **2 496 à 866**, et les triangles soumis de **1 778 473 à 1 199 109**. La densité de ressources est identique.

L'ancienne coupe recréait toutes les ressources et leurs matériaux graphiques. À 250², sa reconstruction mesurée passe de **159,5 à 16,5 ms** ; le p95 de `setWorld` pendant la phase active passe de **10,9 à 0,8 ms**. Le pic CPU de frame diminue de **1 046,5 à 52,7 ms**, et le plus long intervalle RAF de **4 591,6 à 141,5 ms**. Deux intervalles dépassent encore 33,4 ms dans la phase active actuelle, contre neuf dans le contrôle : la première coupe conserve donc une saccade mesurée. Les phases actuelles 250² en pause, panorama et déplacement n'ont aucun intervalle supérieur à 33,4 ms ; leurs maxima sont respectivement 8,4, 16,7 et 16,7 ms. Les maxima et le nombre d'observations figurent dans les rapports, en complément des percentiles.

## Optimisations et coûts assumés

Le rendu exploite l'identité immuable des collections fournies par le client du worker : les snapshots ordinaires de colons ne reconstruisent plus une chaîne de 62 500 terrains ni l'inventaire graphique des ressources. Lorsqu'une ressource change, les signatures par chunk conservent les meshes des autres chunks. Les ressources statiques sont fusionnées en deux meshes par chunk, avec un matériau graphique partagé ; les couronnes restent masquables séparément. Le terrain utilise des surfaces supérieures et des faces de berges/pourtour, jointes au socle, au lieu de six faces par case. Les rochers, herbes et couleurs restent procéduraux. Les dimensions et l'occupation logique ne proviennent jamais de ces meshes.

Cette fusion réduit le nombre de soumissions et de programmes graphiques, mais duplique davantage de sommets statiques que l'ancien instancing. Les personnages et les cargaisons gardent leur rig et leur interpolation **sur GPU** ; ils ne sont pas fusionnés dans le terrain. La navigation continue d'appartenir au noyau, avec le laboratoire GPU séparé.

| Coût à 250² | Référence | Actuel | Portée |
|---|---:|---:|---|
| Construction CPU du terrain | 127,3 ms | 248,1 ms | Préparation initiale des géométries, hors navigation. |
| Construction CPU des ressources | 100,3 ms | 462,8 ms | Préparation initiale ; coût supérieur assumé pour les meshes fusionnés. |
| Navigation jusqu'au DOM prêt | 1 240,4 ms | 1 754,8 ms | Ne signifie pas que tous les panoramas ou tous les shaders sont déjà prêts. |
| Attente des 60 frames de chauffe du panorama | 59 198,2 ms | 1 034,8 ms | Première visite de cette vue dans la page mesurée ; comprend des frames et de la compilation, pas un temps de kernel ni un démarrage à froid certifié du pilote. |
| Mémoire graphique estimée, vue locale | 53,37 Mo | 58,05 Mo | Comptabilité `renderer.info.memory.total`. |
| Mémoire graphique estimée, panorama fixe | 72,23 Mo | 129,28 Mo | Davantage de géométrie a été soumise et chargée en panorama. |

**Les Mo sont décimaux : un Mo vaut 1 000 000 octets.** La comptabilité de Three estime ses ressources graphiques ; elle ne mesure ni toute la mémoire du pilote, ni le heap JavaScript, ni le pic temporaire de chargement. Après le déplacement panoramique, le total actuel atteint 129,32 Mo. La création initiale et la mémoire augmentent ; l'agrandissement n'est donc pas gratuit. Les futures évolutions doivent surveiller ces coûts, la saccade de première coupe, les grandes colonies et les appareils plus modestes, sans supprimer des ressources de gameplay pour améliorer un chiffre.

Les trois rapports de mise au point sont **exclus des comparaisons** : [première exploration](../../artifacts/map-render-exploratory.json), [audit du contrôle](../../artifacts/map-render-instrumentation-audit.json) et [audit du rendu actuel](../../artifacts/map-render-current-instrumentation-audit.json). Le pilote y renvoyait involontairement son objet diagnostic, qui contenait le renderer ; sa sérialisation via CDP injectait une longue tâche proportionnelle à la scène. Le premier passage avait aussi un préchauffage insuffisant et une trajectoire quittant la carte. Les fichiers portent `eligibleForComparison: false` et expliquent leur exclusion. Le pilote retenu ne renvoie plus cet objet, préchauffe en frames et maintient le trajet à l'intérieur de la carte.

## Reproduction du rendu et contrôle spatial

Avec la copie de référence préparée et ses seules bornes graphiques étendues comme décrit ci-dessus, démarrer ses serveurs Vite et celui du projet sur deux ports distincts, puis exécuter les mesures **successivement** depuis la racine :

```powershell
node scripts/map-render-bench.mjs http://127.0.0.1:5174 baseline 64,128,250
node scripts/map-render-bench.mjs http://127.0.0.1:5173 current 64,250
```

Chaque commande lance un navigateur normal, écrit un rapport et ferme son navigateur. Le pilote utilise le code de développement pour instrumenter `ColonyRenderer` ; il ne constitue pas un benchmark du bundle de production. Les captures PNG sont des sorties locales ignorées par Git. Garder les sources stables entre les deux passages et ne pas lancer d'autres tests ou compilations pendant les mesures.

Hors chronométrage, le passage actuel vérifie les **quatre coins de 250² dans quatre orientations**, avec projection à l'intérieur des plans de coupe et sélection logique de la bonne cellule, à 1440×1000 puis 600×900. Les 32 observations passent ; les captures panorama et portrait ont été inspectées. La caméra conserve la taille apparente locale des modèles, recule pour éviter de couper la carte derrière son plan proche, adapte son dézoom au ratio d'écran et borne sa cible aux bords. Le parcours complet portage/construction/chargement à 250² via `render-smoke.mjs` a ensuite réussi séparément à 13:41:17 UTC, avec réinitialisation exacte des poses lors d'un chargement de même terrain et IDs. Voir [la validation graphique](render-validation.md) ; le benchmark ne remplace pas ce contrôle.

## Communication du worker

Le [microbenchmark du protocole](../../artifacts/map-bridge-benchmark.json), capturé à 13:08:57 UTC sous Node sur le même Ryzen 5 3600, utilise 20 échauffements et 60 échantillons appariés alternés. À 250², le clone complet prend 48,67 ms en médiane, contre 0,714 ms pour encodage, clone et adoption d'un delta stable ; à 64², 3,108 contre 0,073 ms. Ce test mesure `structuredClone` en processus Node, **pas l'IPC du navigateur ni un gain de FPS**. Les checkpoints et les sauvegardes restent complets ; l'encodeur parcourt encore le terrain et les ressources, et les tableaux dynamiques sont transmis intégralement.

Reproduction : `node --experimental-strip-types scripts/map-bridge-bench.ts`. Les options et limites de payloads sont détaillées dans [testing.md](testing.md), le contrat dans [ADR-013](architecture.md#adr-013--cartes-250²-et-publications-de-monde-incrémentales). Le script permanent a aussi passé un contrôle court 64²/10 échantillons, destiné à vérifier sa reproduction et non à remplacer le rapport de performance. Après les profils, le codec a reçu un correctif de préservation de l'ordre des clés JSON lors de l'adoption ; le scénario de reconstruction, les trois parcours navigateur et le contrôle graphique final ont été rejoués. Les chiffres ci-dessus et les profils de rendu restent datés de leurs passages antérieurs à ce petit correctif ; ils n'ont pas été artificiellement actualisés.
