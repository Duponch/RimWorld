# Distance caméra et nouveau son de minage — suivi V149, 29 septembre 2026

Après la reprise du manifeste, l'utilisateur entend les sons mais rapporte deux défauts : le minage reste audible depuis une caméra haute ou dézoomée, et son timbre évoque un grattement rétro plutôt qu'un coup de pioche métallique. Plusieurs mineurs voisins empilent aussi la même prise.

La sélection des sources et le `PannerNode` emploient maintenant une distance en trois dimensions. En perspective, l'oreille suit la position réelle de la caméra. La caméra orthographique reste physiquement éloignée pour afficher la carte ; sa hauteur acoustique est donc dérivée du zoom et de l'angle, au-dessus de sa cible. La hauteur est transmise au listener Web Audio quand elle change et déclenche la re-sélection des boucles. La portée du minage passe de **20 à 16 cases**. Les contacts actifs d'un même groupe à moins de cinq cases ne se superposent plus ; trois voix de minage au plus peuvent jouer sur l'ensemble de la scène. La sélection ne parcourt que le lot borné des contacts échus et les voix actives, sans recherche métier par image.

Le manifeste publie `mining-pickaxe-ping-v2.mp3`, unique candidat ElevenLabs généré pour un impact métallique clair, court et sans grattement. Modèle `eleven_text_to_sound_v2`, durée demandée 0,75 s, influence 0,75, boucle désactivée, **un candidat**, coût rapporté **2,5 crédits**. SHA-256 : `62be267f59f944908d7f12f3945615f1efbc3a5158a3206cd79378665f8e47f2`. Le MP3 44,1 kHz / 128 kb/s se décode sur 0,72 s, sans échantillon écrêté selon le contrôle local ; sa crête mesurée est −2,1 dBFS. Plus fort que l'ancien fichier, il reçoit un gain de manifeste de **0,55** au lieu de 2,5. L'original V1 et son dérivé restent conservés. Le [journal des générations](../../scripts/audio/generation-log.json) enregistre la provenance ; le plan et le manifeste portent la nouvelle version.

## Contrôles et limites

- Tests audio et bridge ciblés : **41/41**, dont distance proche/haute et orthographique, mise à jour du listener, groupement de mineurs et reprise du manifeste.
- Provenance : `generate-sfx.mjs --dry-run` passé ; tests du validateur local **8/8**, avec un nouveau refus si le hash d'un MP3 directement publié ne correspond plus au journal.
- Build final avec typage : passé sur **609 modules** transformés.
- Chromium sur le nouveau MP3 : **3/3**, dont récupération du manifeste, réglages et PCM après le mix lors d'un vrai contact. Après la correction du cache de hauteur du listener, le parcours PCM concerné a été rejoué **1/1**.

Les sondes numériques ne disent pas si le nouveau timbre plaît à l'oreille ; l'utilisateur doit l'écouter dans sa scène. Aucun A/B contrôlé de FPS, de CPU image ou de coût GPU n'a été effectué. Le correctif garde un buffer par variante jouée et réduit le nombre potentiel de voix de minage ; cela ne constitue pas une mesure de performance globale.
