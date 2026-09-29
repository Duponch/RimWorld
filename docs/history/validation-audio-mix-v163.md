# Validation du mix sonore V163 — 29 septembre 2026

Le schéma de sauvegarde reste **162**. Le [contrat du lot](../development/audio-mix-v163.md) et la [recherche dans les définitions Core 1.6.4871](../research/audio-core-v163.md) distinguent le comportement vérifié de RimWorld des coefficients adaptés à la caméra 3D de Lisière. Ce lot ne modifie ni `src/sim` ni les sauvegardes.

## Parcours acquis

| Contrôle | Résultat | Ce qu'il établit |
| --- | --- | --- |
| `npm exec vitest run tests/audio-v149.test.ts tests/bridge-audio-cues.test.ts tests/audio-ambience.test.ts` | **3 fichiers, 46/46 tests passés** | Distances des deux caméras, alternance de prises disponibles, budgets de voix, démarrage/reprise des boucles, modulation de la météo et transitions réelles de portes. |
| `npm run build` | TypeScript et Vite passés, **610 modules** ; avertissement de chunks > 500 ko. | Typage et bundle, sans mesure de débit en jeu. |
| `node scripts/audio/generate-sfx.mjs --dry-run` et `python scripts/audio/check-sfx.py` sur les neuf nouveaux MP3 | **15 événements inscrits**, tous les fichiers publiés et empreintes contrôlés ; neuf nouveaux MP3 décodables en stéréo 44,1 kHz, sans saturation détectée. | Provenance et cohérence technique des fichiers ; pas leur qualité artistique à l'oreille. |
| `npm exec playwright test tests/integration/audio-v149.spec.ts` | **3/3 Chromium passés en 1,4 min** ; 21 MP3 décodés, manifeste et préférences contrôlés, vrai contact de minage mesuré après le mix avec crête > 0,02 et meilleur RMS sur 100 ms > 0,002. | Signal PCM numérique audible dans le navigateur de test, seuils conservés ; ne prouve pas le niveau sur le casque du joueur. |
| `npm run test:presentation` | Minage **10 616 images**, coupe **10 519 images** ; p95 image **4,3 ms** pour chacune, zéro saut et zéro occupation solide. | Chronologie de présentation préparée sur carte 250² ; pas un A/B audio ni une mesure GPU. |
| `npm run test:regression` | **318 fichiers passés, 1 376 tests réussis et un ignoré sur 1 377**, en **424,56 s**. | Régression hors campagnes naturelles longues ; pas une preuve d'écoute ou de débit GPU. |

La première calibration iso de ce lot avait rendu le minage réel trop faible dans Chromium : crête PCM **0,00348**, sous le seuil existant de 0,02. Le rayon iso a été recalé en gardant la montée de l'oreille virtuelle au dézoom ; le même test PCM passe ensuite sans abaisser son seuil. Le contrôle mathématique vérifie qu'une vue iso très éloignée coupe encore le minage local. La perspective emploie la vraie position de la caméra, sans seconde réduction de portée due au zoom. Ces deux modèles restent une adaptation, à ajuster après une écoute de terrain.

## Coût borné

Le manifeste contient **21 MP3 pour 15 événements** : **993 107 octets compressés** et **13 590 120 octets** estimés une fois décodés en PCM flottant 32 bits stéréo. Les **neuf nouveaux MP3** ajoutent **378 865 octets compressés** et environ **4 798 080 octets PCM**. Ils sont chargés et décodés une fois ; la sélection des variantes n'analyse pas le PCM à chaque coup. Le vent ajoute au plus une voix continue globale aux limites de voix existantes. La force du vent est lue sur les snapshots et les sources proches sont reconstruites lors d'un changement utile de vue ou de monde, pas par image. Aucun coût CPU/GPU nul n'est revendiqué.

Le [journal de génération](../../scripts/audio/generation-log.json) rattache les neuf fichiers publiés à quatre lots ElevenLabs Sound Effects v2. Les coûts déclarés par ces lots totalisent **146,67 crédits**, candidats non retenus compris ; ce relevé n'est pas une facture du compte. Le jeu lit uniquement les MP3 locaux et ne contacte pas ElevenLabs à l'exécution.

Microbanc isolé de `AudioCueRecorder.capture` sur un `World` **250×250**, 3 colons, structures synthétiques stables dont 20 % de portes manuelles, Node 24.11.1 : 1 000 échauffements puis dix séquences A/B/B/A de 250 captures, médiane des blocs. Pour **200 structures/40 portes**, la capture donne **3,50 µs** contre **1,14 µs** avec 200 murs ; pour **1 000/200**, **15,27 µs** contre **3,46 µs** ; pour **5 000/1 000**, **90,38 µs** contre **19,72 µs**. Au pire de ces scènes synthétiques, 36 captures par seconde représenteraient environ **3,25 ms de CPU par seconde** pour la capture entière. Le bridge observe les ticks confirmés et les publications, jamais le RAF ; le `World` sérialisé et son PRNG sont restés identiques dans ce microbanc. Celui-ci exclut simulation, snapshots, rendu, Web Audio et coût du navigateur natif ; il ne démontre pas le coût général d'une colonie réelle.

## Limites ouvertes

Les prises de bois/minage, les portes et la boucle du vent n'ont pas encore reçu d'écoute subjective sur l'équipement du joueur. Le joint du MP3 de vent et ses niveaux ont été inspectés numériquement, sans validation perceptive. Le mix ne couvre pas encore le transport d'objets, l'ingestion, les portes automatiques, les animaux, l'eau, toute l'UI, la musique ou les voix. La météo globale suit la caméra mais n'a pas d'occlusion acoustique par les bâtiments. Les contrôles de présentation et le microbanc isolé ne permettent pas d'attribuer un gain ou une perte de FPS au son.
