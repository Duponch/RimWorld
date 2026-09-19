# Validation V64 — humeur et pensées explicables

19 septembre 2026. Contrôles du lot, avec échec de fixture et reprise consignés. [Contrat](../development/mood.md), [sources et corrections](../research/mood-reference.md).

Première passe ciblée : 22/22 scénarios réussis sur humeur, repas/confort, loisirs, alimentation assistée et vêtements. Quatre scénarios d’humeur regroupent seuils, couches/états médicaux, progression/gel, manipulation physique, mémoire/expiration, continuation/migration et snapshots. Passe globale : **306/307**, l’unique échec venait du test de sommeil nouvellement étendu qui conservait un horaire Travail : le colon se réveillait normalement, puis son humeur reprenait sa progression. La fixture fixe explicitement une plage Sommeil, sans modifier les règles. Reprise 22/22 puis 4/4 après ajout des seuils anatomiques complets et de la saturation basse. Les trois graines du pilote cœur passent sur cinq à huit jours avec les nouvelles bornes de variation et la continuation exacte.


## Vraie interface

Parcours natif à 1×/6× réussi (25,6 s) : faim au départ, approche et ingestion réelles, sauvegarde pendant le repas, absence de souvenir prématuré, apparition des deux mémoires après consommation, retrait temporisé d’un gilet usé, disparition de cette cause puis remontée progressive de la jauge ; sauvegarde/rechargement final exact. Cible et jauge sont observées séparément. Aucun diagnostic navigateur ; capture inspectée, liste lisible et compteur FPS présent. [Preuve](../../artifacts/mood-ui-v64.json). Les captures restent dans les artefacts locaux.

La longue UI complète de trois jours n’est pas rejouée : aucune nouvelle commande de colonie et aucune modification des décisions physiques. La continuation de son checkpoint V63 sous V64 est contrôlée séparément par les commandes Charger/Sauvegarder et la phase de maintenance partagée. Le pilote cœur complet est couvert ci-dessus.

## Performance

Même Ryzen 5 3600, Node 24.11.1, Windows 11 10.0.26200, carte 250², acteurs armés/vêtus et activités mixtes que V63 ; CPU puis WebGPU natif successifs, sources gelées pendant les mesures. Les pensées consomment les faits présents ; aucun cache géographique, squelette CPU ni traitement de besoin par frame ajouté. Un seul passage par variante, pas de conclusion statistique sur quelques dixièmes de milliseconde.

| Acteurs | Tick CPU p95 / p99 / max (ms) | Encodage p95 (ms) |
|---|---|---|
| 3 | 7.13 / 14.01 / 26.57 | 3.29 |
| 30 | 16.60 / 31.41 / 40.37 | 4.02 |
| 100 | 43.56 / 56.57 / 71.50 | 3.96 |

Cent acteurs : tick p95 43,56 ms contre 43,27 dans le passage V63 ; résultats métier inchangés (371 émissions, 119 impacts échantillonnés, 14 cases minées, 150 vêtements dont 40 usés, deux décès et dix-sept à terre). Aucun coût nouveau justifiant un cache mutable n’est isolé par ce passage. Le budget 6× reste dépassé par la simulation : pas de promesse de cadence soutenue. [Données CPU](../../artifacts/shooting-cpu-v64.json), [données natives](../../artifacts/shooting-native-v64.json).


WebGPU natif AMD RDNA1, fenêtre 1440×1000, même carte et séquence mixte ; trois charges successives en 40 s. Pas de nouveau pipeline ni erreur navigateur pendant les fenêtres observées.

| Acteurs | Image p95 / p99 / max (ms) | CPU de frame p95 / max (ms) | Draw calls max |
|---|---|---|---|
| 3 | 6,1 / 6,7 / 86,1 | 5,5 / 12,4 | 168 |
| 30 | 11,5 / 12,1 / 104,4 | 7 / 11,8 | 171 |
| 100 | 12 / 23,6 / 131,9 | 7,7 / 16 | 171 |

Ces pointes sont conservées ; les percentiles ne prouvent ni une fluidité parfaite ni cent acteurs à vitesse maximale. Pas de changement de shader, de trajectoire ou d’ordre de récolte : la garde de présentation minage/abattage réussie en V63 n’est pas rejouée ici. La nouvelle transition causale est couverte par sa vraie UI ; rejouer la garde lors d’un prochain changement de ces contrats.

## Continuation du camp et contrôles finaux

`COLONY_MAINTENANCE_CHECKPOINT=tmp/apparel-colony-checkpoint-v63.json VALIDATION_VERSION=v64` : reprise par le vrai bouton Charger, migration V63, maintenance et sauvegarde/rechargement final réussis (58,3 s de scénario). Ticks 18078 → 21091 ; les trois colons reprennent leur activité après le sommeil prévu. Cinquante acier entièrement rangés et cent cinquante incorporés aux constructions, un fragment restant rangé, trente-cinq blocs stockés, quatre vêtements conservés. Les trois humeurs atteignent leur cible 67 avec leurs causes courantes. [Preuve de continuation](../../artifacts/colony-maintenance-v64.json). Cette reprise n’efface pas l’échec historique du parcours UI V63 et ne constitue pas une nouvelle passe monolithique de trois jours.

Précision rétroactive : les pilotes cœur actuels durent cinq jours pour les graines 93/2048 et huit pour 42. Les mentions antérieures de « trois jours » pour ces trois graines étaient erronées ; trois jours désigne le parcours UI, distinct du pilote cœur.

Build TypeScript/Vite final réussi ; avertissement connu sur le bundle >500 kB. Les dernières modifications après les mesures ne touchent que les preuves/documents et les seuils de test. Aucun original utilisateur modifié. Catalogue d’objets inchangé ; premières pensées documentées dans le contrat et l’inventaire des systèmes, sans prétendre livrer les traits, crises, relations ou attentes dynamiques.

État du plan : G0 en consolidation, G1/G2 partiels, G3 humain enrichi par les premières causes d’humeur ; G4/G5 ouverts. Prochain lot à vérifier : une première crise non violente avec comportement physique et continuation, puis traits/relations selon leurs producteurs.

Contrôle documentaire final : 229 documents, 2455 liens locaux, 25 identifiants de domaine et cinq familles de validation ; trois originaux byte-identiques. `git diff --check` passe. Inventaire rétroactif corrigé : quatre compétences branchées (Construction, Médecine, Tir, Mêlée), huit encore absentes, au lieu de l’ancien compte dix.
