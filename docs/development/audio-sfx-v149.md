# Sons de jeu et production SFX V149

**État : 12 MP3 inscrits au manifeste, un pour chacun des 12 cues du plan ; musique et voix absentes.** Les quatre derniers fichiers couvrent fabrication, couture, boucherie et recherche, après cuisine et construction ; les deux anciens fichiers de minage restent conservés. Un [parcours Chromium ciblé](../history/validation-audio-audibility-v149.md) mesure le signal PCM après le mix d'un vrai contact de travail. Cette mesure ne remplace pas une écoute sur l'appareil du joueur. Le moteur audio lit `public/assets/audio/manifest.json` version 1. [Recherche API, coût et droits](../research/audio-elevenlabs-v149.md), [suivi des quatre derniers SFX](../history/validation-audio-all-work-v149.md).

## Essai sonore dans les Options

**Essayer le son** est disponible dans les Options de l'accueil et le menu de la colonie. Un clic démarre le MP3 local publié `mining.hit` avec son gain de manifeste et le volume des effets, au centre de la sortie Web Audio, même lorsque la simulation ou le menu met le mix du monde en pause. Le bouton refuse l'essai si les effets sont désactivés ou si le volume est nul. Son message de réussite signifie que la source a démarré ; il ne garantit ni la sortie de l'appareil ni l'audibilité humaine.

Un manifeste inaccessible ou invalide fait échouer l'activation ; zéro MP3 décodé n'est plus annoncé comme un chargement réussi. Le manifeste est revalidé au premier chargement ; si une page garde une version sans `mining.hit`, un clic d'essai obtient une réponse fraîche et charge le fichier manquant, sans recharger les buffers réussis. Les fichiers échoués restent mémorisés, sans nouvelle requête à chaque image ni sur les gestes ordinaires. Chaque clic d'essai retente une fois chaque variante en échec, avec trois chargements au plus en parallèle, puis démarre `mining.hit` si son buffer est disponible. Les buffers déjà décodés sont réutilisés. Une seule source d'essai joue à la fois ; elle est arrêtée lors d'un nouvel essai, d'une coupure des effets, d'un changement de monde ou de la fermeture de la page. [Preuve initiale](../history/validation-audio-selftest-v149.md) et [reprise d'un manifeste incomplet](../history/validation-audio-manifest-recovery-v149.md).

## Contacts à faible cadence d'image

L'observateur de la simulation émet les contacts de travail sur ses ticks confirmés. L'ancien ordonnanceur audio écartait tout contact vieux de plus de deux ticks au moment de l'image : à vitesse 6×, ou lorsque le rendu est lent, plusieurs ticks peuvent défiler entre deux images et rendre un mineur visuellement actif mais silencieux. La file conserve désormais au plus **un contact récent âgé d'au plus douze ticks** à rattraper par image lorsqu'aucun contact plus frais n'est dû. Elle ne rejoue pas une rafale d'anciens coups ; les événements plus vieux sont abandonnés. La file reste bornée à 256 entrées et ne parcourt que les contacts arrivés à échéance. Le panneau **Menu → Diagnostics** montre l'état Web Audio, les MP3 chargés, le nombre de contacts ponctuels effectivement lancés et le dernier type ; il ne mesure pas les haut-parleurs.

Le premier MP3 de minage avait peu de corps ; son dérivé `mining-hit-soft-compressed-v1.mp3` a ensuite été jugé trop râpeux et rétro par l'utilisateur. Le manifeste joue désormais `mining-pickaxe-ping-v2.mp3`, une nouvelle génération courte demandant un impact métallique clair, sans grattement. Son niveau PCM est beaucoup plus haut : son gain a été abaissé à **0,55** et sa portée à **16 cases** avant publication. La hauteur et le zoom de la caméra entrent dans la distance d'atténuation. Les contacts actifs d'un même travail à moins de cinq cases ne superposent pas deux fois son enregistrement ; trois voix simultanées au plus sont admises par type de travail. Les tirs et la mêlée ne sont pas soumis à ce regroupement. Cette règle couvre aussi les futurs MP3 de production déjà associés à leurs événements. L'ancien original et son dérivé, leur [journal de traitement](../../scripts/audio/processing-log.json), ainsi que le [journal des générations](../../scripts/audio/generation-log.json) restent conservés pour la provenance et une réversion. Le contrôle `generate-sfx.mjs --dry-run` vérifie le MP3 directement publié contre ce dernier journal. Aucun traitement audio supplémentaire ne tourne pendant le jeu. L'écoute comparative du nouveau timbre par l'utilisateur reste à faire.

## Direction sonore

Lisière vise une texture chaleureuse, tactile et lisible sous une scène 3D pastel/craie. Les petits impacts doivent informer du contact physique sans devenir percussifs à grande échelle. Les sons de combat restent sobres et distincts des gestes de travail. La pluie et le feu forment un fond doux, sans musique ni voix et sans masquer les ordres ou alertes. Aucun prompt ne demande une imitation de l'audio RimWorld ; les sons sont une adaptation propre au jeu.

Le plan de fabrication est [sfx-plan.json](../../scripts/audio/sfx-plan.json). Les IDs correspondent aux cues du bridge :

Pour un effet ponctuel futur marqué `spatial: false`, le runtime ignore ses coordonnées de monde lors de la sélection et le relie directement au gain Web Audio, sans atténuation ni `PannerNode`. Le correctif de contrat est couvert par `tests/audio-v149.test.ts` (13/13 tests ciblés après la correction) ; les 12 MP3 actuellement publiés ne comprennent aucun effet ponctuel global, donc il ne change pas encore le mix audible.

| ID | Usage | Durée demandée | Boucle | Espace |
| --- | --- | ---: | :---: | --- |
| `mining.hit` | Contact outil/pierre | 0,75 s | Non | Local, 16 cases |
| `woodcutting.hit` | Contact hache/bois | 0,65 s | Non | Local, 22 cases |
| `weapon.gunshot` | Tir de revolver | 0,7 s | Non | Local, 36 cases |
| `weapon.melee` | Frappe rapprochée | 0,6 s | Non | Local, 18 cases |
| `ambient.fire` | Petit feu stable | 8 s | Oui | Local, 22 cases |
| `weather.rain` | Pluie douce stable | 10 s | Oui | Globale (`spatial: false`) |
| `construction.hit` | Petit coup de construction | 0,65 s | Non | Local, 16 cases |
| `cooking.work` | Travail de cuisine | 0,75 s | Non | Local, 16 cases |
| `crafting.work` | Travail d'établi | 0,7 s | Non | Local, 16 cases |
| `tailoring.work` | Couture | 0,65 s | Non | Local, 14 cases |
| `butchering.work` | Découpe de boucherie | 0,65 s | Non | Local, 16 cases |
| `research.work` | Recherche sur papier | 0,7 s | Non | Local, 14 cases |

Les durées de la table sont des **demandes de génération** ; les mesures des fichiers sont précisées ci-dessous. `cooking.work` a été généré avec les paramètres effectifs du connecteur : durée décodée de 1,00 s et influence de prompt 0,3, au lieu des 0,75 s et 0,65 demandés dans le plan. Ce fichier est publié avec un gain de 1,2 ; son écoute artistique et son audibilité dans le mix restent à vérifier. Une première génération de `construction.hit` est revenue sans URL exploitable et n'a pas été récupérée. Le MP3 publié provient d'une **génération distincte**, demandée à 0,65 s, sans boucle et avec influence de prompt 0,75. Il se décode sur 0,64 s ; sa crête élevée motive un gain de manifeste de 0,25 et une portée de 16 cases. Les quatre derniers fichiers (`crafting.work`, `tailoring.work`, `butchering.work`, `research.work`) ont été générés ensuite, avec un candidat retenu par ID et les paramètres consignés dans le journal. Leurs gains et portées sont calibrés séparément ci-dessous ; le timbre, le niveau en scène et les boucles publiées demandent encore une écoute humaine. Le manifeste ne contient que des fichiers réels, avec `variants: [{src, gain}]`, `gain`, `loop`, `maxDistance` si local et `spatial: false` si global. [Suivi de construction](../history/validation-audio-construction-v149.md), [suivi des quatre derniers travaux](../history/validation-audio-all-work-v149.md).

## Retrouver un SFX déjà généré

Dans le **même compte et espace ElevenCreative** que celui utilisé par la connexion OAuth, ouvrir Sound Effects → **History**, chercher le candidat, l'écouter et utiliser l'icône de téléchargement si elle est présente ([guide officiel](https://elevenlabs.io/docs/eleven-creative/playground/sound-effects)). S'il a été produit dans un Flow, ouvrir le projet sauvegardé dans ce même espace et examiner ses nœuds de résultat, qui permettent le téléchargement ([guide Flows](https://elevenlabs.io/docs/eleven-creative/products/flows)). Ne pas relancer un nœud pour cette recherche : une nouvelle exécution consomme des crédits.

L'[API `/v1/history`](https://elevenlabs.io/docs/api-reference/history/list) exclut les SFX ; une liste vide n'est pas une preuve de perte. Sans entrée dans History ou Flows ni identifiant, URL ou fichier conservé, aucune récupération n'est garantie. Cette démarche concerne le **premier candidat** de `construction.hit`, resté introuvable ; le MP3 désormais publié vient d'une génération distincte, enregistrée avec son identifiant et son empreinte. [Détails et sources](../research/audio-elevenlabs-v149.md#récupération-dun-sfx-sans-identifiant--vérification-du-29-septembre-2026).

## Procédure de production

Depuis la racine du dépôt :

```powershell
$env:TEMP='E:/Code/RimWorld/tmp/host-cache/temp'
$env:TMP=$env:TEMP
$env:NPM_CONFIG_CACHE='E:/Code/RimWorld/tmp/host-cache/npm-cache'
node scripts/audio/generate-sfx.mjs --dry-run
```

Le contrôle est en lecture seule et n'utilise aucune clé. Les 12 fichiers publiés ont été générés via OAuth MCP, sans clé API locale ; [generation-log.json](../../scripts/audio/generation-log.json) conserve leurs IDs, prompts, paramètres effectifs, coûts et SHA-256, sans URL signée. Le script Node avec `ELEVENLABS_API_KEY` est une solution de repli si le flux MCP n'est pas disponible. Sous Windows, l'[assistant de connexion](../../scripts/audio/connect-elevenlabs.ps1) peut alors demander cette clé sans écho une seule fois et la conserver chiffrée avec DPAPI sous `tmp/host-cache/audio/`, répertoire ignoré par Git :

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

Contrôle initial avant le dérivé : `--dry-run`, wrapper PowerShell sans clé et [inspecteur MP3](../../scripts/audio/inspect-mp3.mjs) ; [rapport PCM](../../scripts/audio/check-sfx.py) avec `soundfile` et NumPy. Les sept MP3 de ce contrôle historique étaient décodables, stéréo 44,1 kHz, MP3 128 kb/s. Les six premiers avaient les durées attendues ; la cuisine dure effectivement 1,00 s. La construction et les quatre derniers travaux ont ensuite été contrôlés techniquement à part. Mesures **des fichiers isolés**, avant gain du manifeste ; la ligne de minage concerne son original V1, et non le nouveau fichier publié :

| Son | Durée décodée | Crête | RMS | Remarque |
| --- | ---: | ---: | ---: | --- |
| Minage | 0,60 s | -17,0 dBFS | -48,8 dBFS | Transitoire bref, 81 % proche du silence |
| Bois | 0,64 s | -18,8 dBFS | -42,6 dBFS | Transitoire bref |
| Tir | 0,68 s | -29,4 dBFS | -54,1 dBFS | Fichier faible ; gain de lecture 7 |
| Mêlée | 0,60 s | +0,2 dBFS | -19,6 dBFS | 0,021 % au-dessus de 0,999 en PCM décodé ; écouter une éventuelle distorsion |
| Feu | 8,00 s | -9,2 dBFS | -44,6 dBFS | Joint : saut d'échantillon max 0,00121, écoute requise |
| Pluie | 10,00 s | -16,7 dBFS | -39,3 dBFS | Joint : saut d'échantillon max 0,00565, écoute requise |
| Cuisine | 1,00 s | -12,4 dBFS | -41,4 dBFS | 74,3 % proche du silence ; aucune saturation PCM mesurée, écoute requise |
| Construction | 0,64 s | +1,0 dBFS | -22,7 dBFS | 0,019 % des échantillons PCM près de l'écrêtage ; écoute requise |
| Fabrication | 0,68 s | -4,4 dBFS | -23,6 dBFS | Lime sur pièce métallique demandée ; écoute requise |
| Couture | 0,64 s | -1,1 dBFS | -28,9 dBFS | Aiguille/ciseaux demandés ; écoute requise |
| Boucherie | 0,64 s | -0,6 dBFS | -20,9 dBFS | Coupe contrôlée demandée ; écoute requise |
| Recherche | 0,68 s | -9,0 dBFS | -30,8 dBFS | Crayon sur papier demandé ; écoute requise |

Les gains actuels du manifeste sont **0,55 minage**, 1,8 bois, 7 tir, 0,12 mêlée, 1 feu, 0,5 pluie, 0,25 construction, 1,2 cuisine, **0,3 fabrication, 0,7 couture, 0,25 boucherie et 0,8 recherche**. Sur le **dérivé antérieur** du minage, la durée restait 0,600 s, la crête était à -14,86 dBFS et le RMS total à -43,87 dBFS, contre -16,98 et -48,81 dBFS pour l'original ; le meilleur intervalle de 50 ms gagnait 3,96 dB. Le manifeste joue désormais `mining-pickaxe-ping-v2.mp3`, décrit plus haut. Ces valeurs décrivent des fichiers isolés décodés, sans constituer une écoute ni une mesure du mix final sur l'appareil. Le moteur retente la reprise d'un contexte Web Audio suspendu lors des gestes suivants et signale un échec d'activation ; le [contrôle ciblé](../history/validation-audio-resume-v149.md) vérifie cette reprise en Chromium, sans établir de débit FPS ni de coût CPU/GPU.
