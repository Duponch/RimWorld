# Sons de jeu et production SFX V149

**État : sept MP3 intégrés au dépôt et inscrits au manifeste après contrôle technique, dont `cooking.work`.** Un [parcours Chromium ciblé](../history/validation-audio-resume-v149.md) vérifie leur décodage et le démarrage d'un son de minage sur un vrai contact de travail. L'écoute humaine et le test du mix restent nécessaires : le décodage et l'appel à Web Audio ne valident ni le timbre ni l'audibilité en jeu. Le moteur audio lit `public/assets/audio/manifest.json` version 1. [Recherche API, coût et droits](../research/audio-elevenlabs-v149.md).

## Essai sonore dans les Options

**Essayer le son** est disponible dans les Options de l'accueil et le menu de la colonie. Un clic démarre le MP3 local publié `mining.hit` avec son gain de manifeste et le volume des effets, au centre de la sortie Web Audio, même lorsque la simulation ou le menu met le mix du monde en pause. Le bouton refuse l'essai si les effets sont désactivés ou si le volume est nul. Son message de réussite signifie que la source a démarré ; il ne garantit ni la sortie de l'appareil ni l'audibilité humaine.

Un manifeste inaccessible ou invalide fait échouer l'activation ; zéro MP3 décodé n'est plus annoncé comme un chargement réussi. Les fichiers échoués restent mémorisés, sans nouvelle requête à chaque image ni sur les gestes ordinaires. Chaque clic d'essai retente une fois chaque variante en échec, avec trois chargements au plus en parallèle, puis démarre `mining.hit` si son buffer est disponible. Les buffers déjà décodés sont réutilisés. Une seule source d'essai joue à la fois ; elle est arrêtée lors d'un nouvel essai, d'une coupure des effets, d'un changement de monde ou de la fermeture de la page. [Preuve ciblée](../history/validation-audio-selftest-v149.md).

## Direction sonore

Lisière vise une texture chaleureuse, tactile et lisible sous une scène 3D pastel/craie. Les petits impacts doivent informer du contact physique sans devenir percussifs à grande échelle. Les sons de combat restent sobres et distincts des gestes de travail. La pluie et le feu forment un fond doux, sans musique ni voix et sans masquer les ordres ou alertes. Aucun prompt ne demande une imitation de l'audio RimWorld ; les sons sont une adaptation propre au jeu.

Le plan de fabrication est [sfx-plan.json](../../scripts/audio/sfx-plan.json). Les IDs correspondent aux cues du bridge :

Pour un effet ponctuel futur marqué `spatial: false`, le runtime ignore ses coordonnées de monde lors de la sélection et le relie directement au gain Web Audio, sans atténuation ni `PannerNode`. Le correctif de contrat est couvert par `tests/audio-v149.test.ts` (13/13 tests ciblés après la correction) ; les sept MP3 actuellement publiés ne comprennent aucun effet ponctuel global, donc il ne change pas encore le mix audible.

| ID | Usage | Durée demandée | Boucle | Espace |
| --- | --- | ---: | :---: | --- |
| `mining.hit` | Contact outil/pierre | 0,6 s | Non | Local, 20 cases |
| `woodcutting.hit` | Contact hache/bois | 0,65 s | Non | Local, 22 cases |
| `weapon.gunshot` | Tir de revolver | 0,7 s | Non | Local, 36 cases |
| `weapon.melee` | Frappe rapprochée | 0,6 s | Non | Local, 18 cases |
| `ambient.fire` | Petit feu stable | 8 s | Oui | Local, 22 cases |
| `weather.rain` | Pluie douce stable | 10 s | Oui | Globale (`spatial: false`) |
| `construction.hit` | Petit coup de construction | 0,65 s | Non | Local, 20 cases |
| `cooking.work` | Travail de cuisine | 0,75 s | Non | Local, 16 cases |
| `crafting.work` | Travail d'établi | 0,7 s | Non | Local, 18 cases |
| `tailoring.work` | Couture | 0,65 s | Non | Local, 14 cases |
| `butchering.work` | Découpe de boucherie | 0,65 s | Non | Local, 18 cases |
| `research.work` | Recherche sur papier | 0,7 s | Non | Local, 14 cases |

Les durées de la table sont des **demandes de génération** ; les durées décodées des six premiers fichiers sont mesurées ci-dessous. `cooking.work` a été généré ensuite avec les paramètres effectifs du connecteur : durée décodée de 1,00 s et influence de prompt 0,3, au lieu des 0,75 s et 0,65 demandés dans le plan. Ce fichier est publié après contrôle technique, avec un gain de 1,2 ; son écoute artistique et son audibilité dans le mix restent à vérifier. Une génération de `construction.hit` est revenue sans URL exploitable et reste absente du dépôt. Les quatre autres travaux préparés (`crafting.work`, `tailoring.work`, `butchering.work`, `research.work`) n'ont pas été générés. Les boucles publiées doivent encore être écoutées au joint et sur plusieurs répétitions. L'absence d'un ID dans le manifeste est un silence volontaire. Le manifeste ne contient que des fichiers réels, avec `variants: [{src, gain}]`, `gain`, `loop`, `maxDistance` si local et `spatial: false` si global.

## Retrouver un SFX déjà généré

Dans le **même compte et espace ElevenCreative** que celui utilisé par la connexion OAuth, ouvrir Sound Effects → **History**, chercher le candidat, l'écouter et utiliser l'icône de téléchargement si elle est présente ([guide officiel](https://elevenlabs.io/docs/eleven-creative/playground/sound-effects)). S'il a été produit dans un Flow, ouvrir le projet sauvegardé dans ce même espace et examiner ses nœuds de résultat, qui permettent le téléchargement ([guide Flows](https://elevenlabs.io/docs/eleven-creative/products/flows)). Ne pas relancer un nœud pour cette recherche : une nouvelle exécution consomme des crédits.

L'[API `/v1/history`](https://elevenlabs.io/docs/api-reference/history/list) exclut les SFX ; une liste vide n'est pas une preuve de perte. Sans entrée dans History ou Flows ni identifiant, URL ou fichier conservé, aucune récupération n'est garantie. `construction.hit` demeure absent du dépôt et du manifeste tant qu'un MP3 réel n'a pas été récupéré puis contrôlé. [Détails et sources](../research/audio-elevenlabs-v149.md#récupération-dun-sfx-sans-identifiant--vérification-du-29-septembre-2026).

## Procédure de production

Depuis la racine du dépôt :

```powershell
$env:TEMP='E:/Code/RimWorld/tmp/host-cache/temp'
$env:TMP=$env:TEMP
$env:NPM_CONFIG_CACHE='E:/Code/RimWorld/tmp/host-cache/npm-cache'
node scripts/audio/generate-sfx.mjs --dry-run
```

Le contrôle est en lecture seule et n'utilise aucune clé. Les sept fichiers publiés ont été générés via OAuth MCP, sans clé API locale ; [generation-log.json](../../scripts/audio/generation-log.json) conserve leurs IDs, prompts, paramètres effectifs, coûts et SHA-256, sans URL signée. Le script Node avec `ELEVENLABS_API_KEY` est une solution de repli si le flux MCP n'est pas disponible. Sous Windows, l'[assistant de connexion](../../scripts/audio/connect-elevenlabs.ps1) peut alors demander cette clé sans écho une seule fois et la conserver chiffrée avec DPAPI sous `tmp/host-cache/audio/`, répertoire ignoré par Git :

```powershell
./scripts/audio/connect-elevenlabs.ps1 -Connect
./scripts/audio/connect-elevenlabs.ps1 -DryRun
```

Avec ce chemin de repli, lancer **un seul** ID :

```powershell
./scripts/audio/connect-elevenlabs.ps1 -Generate -Id mining.hit
```

Le helper déchiffre uniquement dans le processus PowerShell courant, transmet la clé au processus Node enfant via `ELEVENLABS_API_KEY`, puis restaure l'environnement. Il ne transmet ni n'affiche la clé comme argument. On peut aussi appeler directement le script Node après avoir défini cette variable soi-même.

La réponse MP3 est contrôlée puis sauvegardée sous `public/assets/audio/sfx/`, avec date, paramètres et empreinte SHA-256 dans le journal ; le manifeste n'est pas encore changé. Pour un MP3 généré via MCP, [register-mcp-sfx.mjs](../../scripts/audio/register-mcp-sfx.mjs) inscrit la provenance et le hash après récupération. Écouter le candidat seul, en particulier le joint des boucles. Pour publier un fichier déjà contrôlé :

```powershell
./scripts/audio/connect-elevenlabs.ps1 -Publish -Id mining.hit
```

Cette deuxième commande vérifie le MP3 et sa trace de génération, puis ajoute l'entrée au manifeste. Elle ne consomme aucun crédit. Vérifier dans le jeu les vitesses normale/accélérée, la répétition et les superpositions représentatives ; retirer l'entrée du manifeste si l'écoute échoue. Le script refuse l'écrasement d'un candidat ou d'une entrée publiée ; une nouvelle variante demande un nom distinct et une modification examinée du plan. La clé ne doit figurer ni dans un fichier du dépôt ni dans la sortie des commandes. Le jeu ne contacte jamais ElevenLabs à l'exécution.

## Vérification et limites

Contrôle local effectué : `--dry-run`, wrapper PowerShell sans clé et [inspecteur MP3](../../scripts/audio/inspect-mp3.mjs) ; [rapport PCM](../../scripts/audio/check-sfx.py) avec `soundfile` et NumPy. Les sept MP3 publiés sont décodables, stéréo 44,1 kHz, MP3 128 kb/s. Les six premiers ont les durées attendues ; la cuisine dure effectivement 1,00 s. Mesures avant gain du manifeste :

| Son | Durée décodée | Crête | RMS | Remarque |
| --- | ---: | ---: | ---: | --- |
| Minage | 0,60 s | -17,0 dBFS | -48,8 dBFS | Transitoire bref, 81 % proche du silence |
| Bois | 0,64 s | -18,8 dBFS | -42,6 dBFS | Transitoire bref |
| Tir | 0,68 s | -29,4 dBFS | -54,1 dBFS | Fichier faible ; gain de lecture 7 |
| Mêlée | 0,60 s | +0,2 dBFS | -19,6 dBFS | 0,021 % au-dessus de 0,999 en PCM décodé ; écouter une éventuelle distorsion |
| Feu | 8,00 s | -9,2 dBFS | -44,6 dBFS | Joint : saut d'échantillon max 0,00121, écoute requise |
| Pluie | 10,00 s | -16,7 dBFS | -39,3 dBFS | Joint : saut d'échantillon max 0,00565, écoute requise |
| Cuisine | 1,00 s | -12,4 dBFS | -41,4 dBFS | 74,3 % proche du silence ; aucune saturation PCM mesurée, écoute requise |

Les gains provisoires du manifeste sont **2,5 minage** (1,5 auparavant), 1,8 bois, 7 tir, 0,12 mêlée, **1 feu** (0,5 auparavant), 0,5 pluie et 1,2 cuisine. Avec le master par défaut à 0,75, les crêtes calculées d'une source isolée avant atténuation spatiale sont environ -11,5, -16, -15, -20, -11,7, -25 et -13,3 dBFS. Ces relèvements prudents répondent aux faibles niveaux PCM mesurés, sans constituer une écoute ni une mesure du mix final ou des sources superposées. Aucun fichier n'a été transcodé ou normalisé. Le moteur retente la reprise d'un contexte Web Audio suspendu lors des gestes suivants et signale un échec d'activation ; le [contrôle ciblé](../history/validation-audio-resume-v149.md) vérifie cette reprise en Chromium, sans établir de débit FPS ni de coût CPU/GPU.
