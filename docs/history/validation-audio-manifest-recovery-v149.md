# Reprise du manifeste pour l'essai sonore — suivi V149, 29 septembre 2026

L'utilisateur voyait « Le son d’essai est absent du manifeste audio. » en cliquant sur **Essayer le son**, sans entendre le MP3. Ce message signifie que le manifeste déjà conservé par la page ne contenait pas d'entrée `mining.hit` utilisable ; il précède la lecture du fichier sonore. Le manifeste du dépôt, celui du build et les réponses vérifiées sur `localhost:5173` et `127.0.0.1:5173` contenaient tous cette entrée. La provenance exacte de la réponse incomplète dans l'onglet de l'utilisateur n'a pas été observée.

Le chargement initial revalide désormais le manifeste HTTP. Si l'entrée d'essai manque dans le manifeste en mémoire, **un clic explicite** demande une réponse fraîche sans cache, la valide, puis charge le MP3 ajouté en conservant les buffers déjà décodés. Une réponse encore incomplète laisse les autres sons disponibles et conserve le message d'absence ; une erreur d'activation Web Audio conserve sa propre cause. Aucune requête de reprise n'est lancée par image. Le manifeste publié et les fichiers MP3 n'ont pas changé ; aucune génération payante n'a été effectuée dans ce correctif.

## Contrôles

- Tests audio et bridge ciblés : **39/39**. Ils couvrent la réponse initiale incomplète puis corrigée, la réponse toujours incomplète, la conservation des buffers et l'erreur d'activation.
- Build avec typage : passé, **609 modules** transformés.
- Chromium ciblé : **3/3** sur le code final. Le nouveau parcours intercepte le premier manifeste avec une entrée `mining.hit` retirée, constate le second chargement, puis observe le démarrage d'un `AudioBufferSourceNode`. Les deux autres parcours vérifient les réglages et le PCM d'un vrai contact de minage. Un premier lancement s'est arrêté sur une assertion de test qui interprétait le point de `mining.hit` comme un chemin de propriété ; l'assertion a été réparée et les trois parcours ont été rejoués verts.

Le signal numérique ne prouve pas la sortie du casque. L'utilisateur a ensuite confirmé entendre les sons, tout en signalant deux défauts distincts : atténuation insuffisante lorsque la caméra s'éloigne et timbre de minage trop râpeux. Ces points exigent leur propre correction et validation.
