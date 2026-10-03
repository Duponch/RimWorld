# Musiques et contacts sonores — V175

Le [lot V196](visual-blood-v196.md) ajoute trois râles masculins et trois féminins,
choisis par le sexe visuel du colon, ainsi que deux prises de douleur du renard.
Il détecte les blessures par le compteur médical confirmé, sans voix au
chargement. Le manifeste courant contient 54 événements/133 prises ; cette
section V175 conserve son relevé historique. Musiques et autres règles de mix
restent inchangées.

Le [correctif V185](visual-audio-v185.md) module désormais le bruissement par la canopée locale, sans nouveau MP3, musique ni voix par arbre. Les autres contrats V175 restent applicables.

Ce lot enrichit la présentation sonore sans modifier la simulation, son PRNG, le schéma 166 ou les sauvegardes. Il prolonge le [mix V165](audio-mix-v165.md) et la [couverture V166](audio-coverage-v166.md), à partir des [recherches musicales](../research/audio-music-core-v175.md) et de l'[audit des effets jouables](../research/audio-coverage-core-v175.md). Sa [preuve](../history/validation-audio-v175.md) distingue les contrôles techniques d'une écoute humaine.

## Catalogue musical publié

Les trois pistes V165 restent disponibles. Sept nouvelles compositions instrumentales ElevenLabs Music v2 durent **4 min 30 s chacune** ; dix titres totalisent **42 min 56 s**. Leur charte commune associe guitare nylon, piano feutré, violoncelle et quelques accents doux : mélodique et chaleureuse le jour, espacée la nuit, pulsée mais retenue face à une menace. Aucun morceau ou asset RimWorld n'est fourni comme référence au générateur.

| Contexte | Titres disponibles |
| --- | --- |
| Jour | Aube, Clairière, Atelier, Sentier |
| Nuit | Veille, Lucioles, Brume, Constellations |
| Tension | Alerte, Veilleurs |

Douze nouvelles prises étaient demandées dans trois familles de quatre variations. Sept ont abouti ; **Moisson, Foyer, Orage lointain, Passage difficile et Frontière ont été refusés pour crédits insuffisants**. Ces cinq fichiers ne figurent pas au catalogue, et aucune régénération ni acquisition de crédits n'est lancée. Le [journal musical V175](../../scripts/audio/music-generation-v175.json) garde les prompts complets, identifiants, empreintes, durées et prix rapportés du connecteur, sans URL signée. Les trois générations anciennes conservent leur [journal V165](../../scripts/audio/music-generation-log.json).

Le contexte jour/nuit/menace reste calculé depuis les snapshots confirmés dans `main.ts`. Le lecteur choisit **dans la bonne famille**, couvre ses titres avant de les répéter et écarte les trois derniers en jour/nuit ; les deux pistes de tension alternent. Le passage jour/nuit laisse finir le morceau calme. Une menace introduit un fondu de 3,6 secondes ; le retour au calme attend 8 secondes, puis fond de même. Des silences de 24, 37 ou 29 secondes séparent les morceaux calmes, de 7 secondes en tension. Ce sont des choix Lisière, sans prétendre reproduire l'ordonnanceur propriétaire Core.

Un geste joueur déverrouille la lecture ; les gestes suivants ne coupent pas un morceau calme lors d'un changement d'heure. Désactivation, volume nul ou onglet masqué suspendent les flux ; la réactivation reprend ou choisit le contexte courant. Un fichier en erreur est écarté, un chargement bloqué expire après 20 secondes, et l'échec de toute une famille entraîne une attente de 15 secondes. La famille est réouverte après la fin normale d'une piste ou un nouveau geste après échec complet.

## Huit événements supplémentaires

Chaque nouveau groupe possède **quatre prises indépendantes**, soit 32 MP3 : le manifeste passe à **51 événements et 125 fichiers SFX**. Tous restent localisés, ponctuels et soumis à la courbe des deux caméras et aux budgets du lecteur existant.

| Événement | Déclencheur confirmé | Portée nominale, en cases |
| --- | --- | ---: |
| Impact dans le sol | Première arrivée `impact/ground` du projectile, à son point d'arrivée | 24 |
| Impact sur une barrière | Première arrivée `impact/barrier` | 24 |
| Impact organique | Première arrivée `impact/pawn` ou `impact/animal` | 20 |
| Extinction manuelle | Avancement du cooldown d'un coup observable sur le même feu | 16 |
| Interrupteur allumé / éteint | Changement physique `switchOn` corrélé au job `flick` antérieur | 14 |
| Travail de déconstruction | Progression effective au contact du même job | 16 |
| Déconstruction achevée | Disparition des jobs/cibles corrélée au delta du registre de réussite | 20 |

Le son de barrière est un timbre bois générique : le projectile conserve la catégorie de l'impact, pas une preuve sonore de toutes les matières. Annulation et destruction étrangère ne doivent pas produire un succès de déconstruction. Une reprise initialise les observations sans rejouer ce qui existe déjà. Les identifiants et les plafonds de file dédupliquent les événements ; aucune rafale n'est créée pour reconstituer un intervalle manquant.

**Limite d'extinction :** le coup final peut retirer le feu et effacer immédiatement `pawn.firefighting` avant publication. Il reste silencieux car les snapshots seuls ne permettent pas de le distinguer d'une disparition par pluie ou eau. Le simuler sonore à partir de la seule disparition du feu annoncerait un faux geste. Loisirs sans lancer physique, vocalises animales spontanées, rivière contextuelle, timbre par arme/matière et interface exhaustive restent différés dans l'audit.

## Coûts et préparation

Les musiques utilisent `HTMLAudioElement`, avec **au plus deux éléments chargés ou actifs**, y compris lors d'une interruption de fondu. Les dix titres ne sont pas préchargés ensemble ni placés dans le pool PCM des SFX. `preload=auto` autorise le navigateur à télécharger le fichier choisi ; son cache et sa mémoire native ne sont pas des limites en octets garanties par le code. Les sept MP3 nouveaux occupent 45 486 231 octets, le catalogue musical total 62 005 290 octets. Les décoder tous en flottants stéréo ajouterait plus de 900 Mo : ce chemin n'est pas utilisé.

Les 32 SFX ajoutent **7 056 000 octets de PCM flottant stéréo** à 44,1 kHz dans le cache, décodés une fois avec trois chargements concurrents au maximum. Le lecteur conserve 24 voix totales, 12 départs ponctuels au plus par image et trois voix proches par groupe de travail ou impact. Les ambiances gardent leur budget séparé existant. Le recorder travaille lors des snapshots confirmés, jamais par image rendue ; ses parcours sont mesurés séparément dans la preuve.

Les [mesures PCM et gains V175](../../scripts/audio/pcm-balance-v175.json) lisent tous les échantillons par blocs. Les nouveaux morceaux visent −25 dBFS RMS avant bus musique, −27 la nuit ; les SFX visent −23, avec une crête après gain limitée autour de −4 dBFS, donc certains impacts restent plus faibles en moyenne. Les gains effectifs des prises sont le produit événement × variante ; la petite commutation très faible reçoit une compensation spécifique. Les buses et curseurs abaissent encore ces niveaux. Ce calcul ne prouve ni le confort sonore ni la qualité artistique : l'écoute du joueur reste à faire. Aucun gain FPS, coût GPU nul ou mémoire native fixe n'est déduit du nombre de fichiers.
