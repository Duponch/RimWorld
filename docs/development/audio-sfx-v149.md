# Sons de jeu et production SFX V149

**État : six MP3 du premier lot intégrés au dépôt et inscrits au manifeste après contrôle technique.** L'écoute humaine et le test du mix dans le navigateur restent nécessaires ; la seule présence des fichiers ne valide pas leur qualité artistique ou leur audibilité en jeu. Le moteur audio lit `public/assets/audio/manifest.json` version 1. [Recherche API, coût et droits](../research/audio-elevenlabs-v149.md).

## Direction sonore

Lisière vise une texture chaleureuse, tactile et lisible sous une scène 3D pastel/craie. Les petits impacts doivent informer du contact physique sans devenir percussifs à grande échelle. Les sons de combat restent sobres et distincts des gestes de travail. La pluie et le feu forment un fond doux, sans musique ni voix et sans masquer les ordres ou alertes. Aucun prompt ne demande une imitation de l'audio RimWorld ; les sons sont une adaptation propre au jeu.

Le plan de fabrication est [sfx-plan.json](../../scripts/audio/sfx-plan.json). Les IDs correspondent aux cues du bridge :

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

Les durées de la table sont des **demandes de génération** ; les durées décodées des six premiers fichiers sont mesurées ci-dessous. Les six travaux supplémentaires sont préparés, sans entrée au manifeste tant que leurs fichiers ne sont pas contrôlés. Une génération de `construction.hit` est revenue sans URL exploitable et reste absente du dépôt ; les cinq autres travaux n'ont pas été générés. Les boucles publiées doivent encore être écoutées au joint et sur plusieurs répétitions. L'absence d'un ID dans le manifeste est un silence volontaire. Le manifeste ne contient que des fichiers réels, avec `variants: [{src, gain}]`, `gain`, `loop`, `maxDistance` si local et `spatial: false` si global.

## Procédure de production

Depuis la racine du dépôt :

```powershell
$env:TEMP='E:/Code/RimWorld/tmp/host-cache/temp'
$env:TMP=$env:TEMP
$env:NPM_CONFIG_CACHE='E:/Code/RimWorld/tmp/host-cache/npm-cache'
node scripts/audio/generate-sfx.mjs --dry-run
```

Le contrôle est en lecture seule et n'utilise aucune clé. Les six premiers fichiers ont été générés via OAuth MCP, sans clé API locale ; [generation-log.json](../../scripts/audio/generation-log.json) conserve leurs IDs, prompts, paramètres et SHA-256, sans URL signée. Le script Node avec `ELEVENLABS_API_KEY` est une solution de repli si le flux MCP n'est pas disponible. Sous Windows, l'[assistant de connexion](../../scripts/audio/connect-elevenlabs.ps1) peut alors demander cette clé sans écho une seule fois et la conserver chiffrée avec DPAPI sous `tmp/host-cache/audio/`, répertoire ignoré par Git :

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

Contrôle local effectué : `--dry-run`, wrapper PowerShell sans clé et [inspecteur MP3](../../scripts/audio/inspect-mp3.mjs) ; [rapport PCM](../../scripts/audio/check-sfx.py) avec `soundfile` et NumPy. Les six premiers MP3 sont décodables, stéréo 44,1 kHz, MP3 128 kb/s, aux durées attendues. Mesures avant gain du manifeste :

| Son | Durée décodée | Crête | RMS | Remarque |
| --- | ---: | ---: | ---: | --- |
| Minage | 0,60 s | -17,0 dBFS | -48,8 dBFS | Transitoire bref, 81 % proche du silence |
| Bois | 0,64 s | -18,8 dBFS | -42,6 dBFS | Transitoire bref |
| Tir | 0,68 s | -29,4 dBFS | -54,1 dBFS | Fichier faible ; gain de lecture 7 |
| Mêlée | 0,60 s | +0,2 dBFS | -19,6 dBFS | 0,021 % au-dessus de 0,999 en PCM décodé ; écouter une éventuelle distorsion |
| Feu | 8,00 s | -9,2 dBFS | -44,6 dBFS | Joint : saut d'échantillon max 0,00121, écoute requise |
| Pluie | 10,00 s | -16,7 dBFS | -39,3 dBFS | Joint : saut d'échantillon max 0,00565, écoute requise |

Les gains provisoires du manifeste sont 1,5 minage, 1,8 bois, 7 tir, 0,12 mêlée, 0,5 feu et 0,5 pluie. Avec le master par défaut à 0,75, les crêtes calculées avant atténuation spatiale sont environ -16, -16, -15, -20, -18 et -25 dBFS. Ce calcul n'est pas une écoute ni une mesure du mix final. Aucun fichier n'a été transcodé ou normalisé. Les contrats d'horloge, bridge et performance appartiennent au moteur audio et doivent être validés en navigateur avec de vrais sons ; aucun débit FPS ou coût CPU/GPU n'est établi par ce seul pipeline.
