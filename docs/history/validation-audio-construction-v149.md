# Huitième SFX : contact de construction — suivi V149, 29 septembre 2026

`construction.hit` est inscrit au manifeste avec `construction-hammer-wood-v1.mp3`, un gain de **0,25**, une portée de **16 cases** et aucune boucle. Le cue de contact de construction existait déjà dans le bridge ; ce lot ajoute son fichier local, sans nouvel objet, recette, état de sauvegarde ni règle de construction. Les quatre IDs de travail `crafting.work`, `tailoring.work`, `butchering.work` et `research.work` restent sans MP3.

## Provenance et contrôle du fichier

Le candidat de construction décrit dans la [recherche précédente](../research/audio-elevenlabs-v149.md#récupération-dun-sfx-sans-identifiant--vérification-du-29-septembre-2026) était revenu sans URL exploitable et n'a pas été récupéré. **Le fichier présent est issu d'une génération distincte**, une seule pour ce nouveau candidat, via le nœud SFX MCP ElevenLabs. Le [journal de génération](../../scripts/audio/generation-log.json) conserve l'identifiant `HUYuzJ6AxRFxj0EZrM8t`, le modèle `eleven_text_to_sound_v2`, la demande de **0,65 s**, `loop: false`, l'influence de prompt **0,75**, le prompt et le coût rapporté de **2,1666666667 crédits**. Ce coût est celui annoncé par le connecteur, sans vérification indépendante de la facture du compte.

Empreinte SHA-256 du MP3 : `ab46685534fa70369f986ba19427ca09c4b04ccde95eba5bce5fdb4d06ea6d0e`. Le contrôle local indique **28 164 octets**, **27 frames**, **0,64 s** décodée, stéréo **44,1 kHz**, débit encodé **128 kb/s**, crête PCM **+1,0 dBFS**, RMS **−22,7 dBFS** et **0,019 %** d'échantillons près de l'écrêtage. La crête et cette fraction justifient une écoute attentive ; le gain de lecture 0,25 réduit le niveau demandé au mix mais ne répare pas une éventuelle distorsion déjà contenue dans le fichier.

## Validation de l'intégration

- `generate-sfx.mjs --dry-run` passé : **huit fichiers publiés, quatre IDs en attente**. `inspect-mp3.mjs` confirme l'empreinte et les propriétés du fichier ci-dessus. Tests du validateur d'assets : **8/8**.
- Tests audio et bridge ciblés : **41/41 dans deux fichiers** (`tests/audio-v149.test.ts`, `tests/bridge-audio-cues.test.ts`) ; le bridge couvre le cue de construction.
- Build avec typage passé ; Vite a transformé **609 modules**. `npm run check:docs` passé : **551 documents, 5 400 liens, 25 IDs de domaine et cinq familles de validation** ; schéma courant 156 et trois sources originales byte-identiques.
- Chromium audio : **3/3 en 1,1 min** sur récupération du manifeste, réglages et vrai contact de minage avec PCM après le mix. Le navigateur a décodé **huit MP3** ; ce parcours n'a pas observé de contact de construction en scène.

Le décodage et les mesures PCM ci-dessus portent sur le **fichier isolé**. Aucune écoute humaine du timbre, du niveau ou de la répétition en scène n'a été faite pour ce nouveau son. Aucun coût CPU, RAF ou GPU, ni gain FPS, n'a été mesuré. Les campagnes longues et la régression complète n'ont pas été rejouées pour ce suivi. Les preuves V149 antérieures gardent leurs décomptes et leurs limites propres.
