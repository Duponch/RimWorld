# Preuve ciblée audio V175 — 30 septembre 2026

Lot de [musiques et contacts V175](../development/audio-v175.md), schéma 166 inchangé. Sept musiques supplémentaires et 32 bruitages originaux sont disponibles ; cinq générations musicales refusées pour crédits insuffisants restent exclues. Sources et provenance sont précisées dans le contrat et les recherches, sans reprise d'assets Core.

## Contrôles acquis

- Génération : sept MP3 Music v2 de 270 secondes décodées, stéréo 48 kHz, sept empreintes distinctes ; 32 SFX v2 de 0,5 à 1 seconde, stéréo 44,1 kHz. Les métadonnées MPEG contiennent aussi le padding d'encodage. Les niveaux sont mesurés sur tous les échantillons, par blocs, et conservés dans `scripts/audio/pcm-balance-v175.json`.
- Pipeline local : le manifeste publie 51 événements et 125 prises SFX. Vérification à sec et neuf tests de chemins/empreintes/provenance du pipeline, sans appel de génération.
- Lecture et bridge : après l'optimisation, la famille recorder V175 + son voisin historique donne 46/46 ; elle traverse les vrais impacts, coups d'extinction observables, commutations, déconstruction, annulation et reprise. La playlist couvre petit catalogue, échecs, chargement bloqué, gestes, contexte, volume et cycle de vie. Le dernier correctif distingue silence normal et backoff d'erreur : un clic de jeu ne saute pas la pause prévue, mais peut réessayer immédiatement une famille entièrement en échec. La passe finale regroupée donne **103/103 dans six fichiers**, 7,25 s. Typage/build passent (**613 modules**, avertissement habituel de bundle >500 ko). Présentation minage/coupe passe sans saut ni occupation solide ; p95 image 4,3 / 8,2 ms, sur les deux scènes préparées de ce contrôle, sans attribution de ces variations au son.

## Navigateur et assets

La passe Chromium ciblée exécute **9/9 parcours en 1,9 minute**, après gel des sources et à la suite des mesures CPU/build/présentation. Elle couvre les dix vrais MP3 et leurs métadonnées, l'absence de préchargement des dix titres au démarrage réel, le lecteur natif et ses fondus/retour temporisé, les réglages séparés, la récupération du manifeste, les deux courbes de caméra et un vrai contact de minage avec PCM après le mix. Les fichiers et le catalogue musical sont distincts d'une playlist fictive de test. Le contrôle de fondus utilise le vrai lecteur avec une séquence de contextes préparée ; il n'est pas une partie longue avec météo/raids naturels.

Les 32 nouvelles prises sont décodées et rendues séquentiellement par `OfflineAudioContext`, avec gain événement × variante × 0,55 × 0,75 × curseur 0,5. Leur PCM ajoute exactement **7 056 000 octets** ; les crêtes du mix de chaque prise sont entre **0,05445 et 0,13023**, RMS entre **0,00289 et 0,01462**, sans silence ou saturation détectés par les assertions. Ce contrôle nominal ne cumule pas toutes les voix ni l'atténuation spatiale. Les MP3 SFX nouveaux pèsent 892 908 octets, tous les SFX publiés 4 385 299 octets.

Les mesures utilisent le Chromium du projet avec les options de rendu logiciel du harness ; elles ne prouvent pas un coût GPU matériel. Les traces courantes sont sous `tmp/test-runs/audio-v175-browser/` et le journal sous `tmp/host-cache/audio/browser-v175.txt`. Après la dernière correction des silences sur geste, les **quatre parcours musicaux concernés passent à nouveau, en 30,3 s**, avec build final réussi ; les cinq contrôles SFX/spatialisation/manifeste non touchés conservent leur résultat précédent. Ce replay est sous `tmp/host-cache/audio/browser-v175-music-replay.txt`.

## Capture CPU isolée

Node 24.11.1, A/B/B/A contre le recorder de `310324c`, même World/snapshots, sources hachées avant/après, aucun navigateur ni campagne concurrent. Les scripts et rapports courants sont sous `tmp/host-cache/audio/bench-capture-v175*`. Les captures inactives ne produisent pas de nouveaux cues ; World et PRNG sont exactement conservés.

La première version V175 ajoutait une seconde passe de jobs et surveillait tous les interrupteurs. Sur la scène préparée valide 250², 60 ouvrages, 12 jobs et trois colons, p50 V174 **2,2 / 1,5 µs** contre V175 **4,8 / 4,6 µs**. Sur le stress synthétique 5 000 ouvrages et 2 000 jobs, **138,7 / 118,2 µs** contre **582,3 / 549,3 µs**. Ce signal a motivé un correctif avant livraison.

La version retenue fusionne l'index des jobs, évite les tableaux intermédiaires de cibles, suit les cibles de commutation/déconstruction après leur premier progrès réel et partage la passe d'ouvrages avec les portes. Le replay A/B/B/A final mesure p50 V174 **2,2 / 1,5 µs** contre V175 **2,7 / 2,6 µs** sur l'ordinaire préparé, et **135,6 / 113,9 µs** contre **101,2 / 96,9 µs** sur le stress de jobs en attente. Les anciens cues inactifs, le World et le PRNG restent identiques. Ces nombres sont des coûts de capture sur snapshots répétés, avec chauffe/JIT propres au banc ; ils ne prouvent ni accélération de tick complet ni gain FPS. Le stress n'est pas une partie naturelle et ne mesure pas 2 000 actions sonores simultanées.

## Limites

Pas d'écoute humaine des nouvelles compositions ou des raccords prolongés. Le confort, l'absence absolue de syllabes générées et le choix artistique des prises restent à apprécier en jeu. Le dernier coup d'extinction non observable et les autres lacunes de l'audit restent ouverts. Aucun profil GPU, débit ×6, campagne naturelle ou suite exhaustive n'est annoncé. Les budgets de lecteurs/voix et la taille PCM théorique ne remplacent pas une mesure de toute la mémoire native du navigateur.
