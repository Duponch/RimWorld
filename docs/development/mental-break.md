# Errance triste — V65

Première crise réellement jouée : un colon cesse ses activités, abandonne ses engagements et erre lentement. Commandes individuelles, mobilisation et attaques sont refusées ; zones, horaires et politiques restent modifiables. Portrait ↝, alerte et inspection indiquent la crise. Ce contenu ne représente pas le catalogue complet des crises. [Recherche](../research/mental-break-reference.md), [preuves](../history/validation-mental-break-v65.md).

## Déclenchement et conséquences

Trois expositions indépendantes sous humeur **strictement inférieure à 35/20/5** sont échantillonnées tous les 150 ticks Core (15 locaux). Au-delà de 2 000 Core, un tirage a lieu suivant le niveau éligible le plus intense : MTB 4/0,8/0,5 jours. Ce sont des probabilités, jamais un déclenchement instantané au seuil. Les compteurs sont saturés à 2 100 car seul le franchissement intervient. Aucun nouveau déclenchement pendant sommeil, incapacité ou crise ; cooldown après récupération de 15 000 Core **éveillés**. La jauge réelle, pas sa cible, détermine l’exposition.

Le catalogue actuel contient seulement l’errance triste, mineure. Un niveau supérieur se replie sur ce contenu disponible : **distribution volontairement incomplète**, ni rage ni errance psychotique inventées. Le journal choisit une cause négative importante pondérée, pas nécessairement l’événement le plus récent.

Les travaux, files, postes et réservations sont libérés. Arête engagée et poses restent continues ; une cargaison garde son propriétaire jusqu’à fin d’arête et dépôt autorisé. Sol saturé : conservation et nouvelles tentatives de dépôt pendant l’errance, jamais destruction silencieuse. Le patient porté suit le contrat existant de libération sûre. L’arme et les vêtements restent équipés. Le départ est une interruption forte, y compris des postures de combat ; les projectiles déjà émis continuent.

## Besoins, déplacement et récupération

- La faim et le repos diminuent. Recherche d’un repas à 5 % ou moins ; le régime est ignoré pendant la crise, accès/prélèvement/portage/ingestion restent physiques. Les repas en cours ne reçoivent aucun bonus distant.
- Sommeil volontaire à 15 % ou moins, avec l’horaire encore respecté : **Travail l’empêche**, Libre/Loisirs/Sommeil l’autorisent. Un lit accessible/réservé reste nécessaire, sinon repli réel au sol. L’épuisement involontaire reste possible. Une cargaison impossible à déposer retarde les besoins ordinaires mais pas l’effondrement d’épuisement.
- Loisirs gelés pendant la crise ; les causes ordinaires et l’humeur continuent selon V64. Aucun gel universel des pensées supposé depuis un drapeau XML inutilisé dans les classes vérifiées.
- Choix d’un arrêt accessible dans un rayon de 7 cases, route pondérée commune, attente de 125–200 Core. Places de service exclues, destination revalidée. Marche lente : moitié du facteur ordinaire, plancher de 50 Core par côté hors surcoûts ; diagonales euclidiennes. Les surcoûts du terrain restent additifs, adaptation 3D explicite.
- Pas de riposte/fuite automatique pendant cette crise non violente. Elle ne rend pas invulnérable : anatomie, impacts et blessures continuent.
- Âge par pas de 30 Core : récupération aléatoire après 40 000, MTB 0,166 jour, forcée à 60 000. Sommeil ou incapacité peuvent terminer **avant** ce minimum. Décès termine sans catharsis. Arrestation absente.
- Fin naturelle : interruption du travail de crise, y compris repas porté, avec conservation. Fin par sommeil conserve le couchage. Les travaux disponibles redeviennent admissibles après récupération, sans restaurer une ancienne file abandonnée.

Catharsis : +40, trois jours, jusqu’à cinq souvenirs datés ; groupe avec multiplicateurs 1, 0,75, 0,75²… Une sixième occurrence renouvelle la plus ancienne. Expiration même pendant sommeil ou après décès. Notre échéance absolue/expiration au tick reprend l’adaptation V64 ; la catharsis après incapacité suit la branche de code vérifiée malgré la contradiction du wiki, explicitée dans la recherche.

## Architecture, persistance et coût

`mental-state.ts` possède état sparse et fin, `mental-break.ts` orchestration/errance, `mental-save.ts` validation. V64 est strictement validée avant V65, sans passé inventé : aucun compteur, épisode ou souvenir n’est ajouté au chargement. PRNG, compteurs, cooldown éveillé, âge, cible, attente et échéances affectant la continuation sont persistés. Les états incompatibles, échéances impossibles et chemins sans destination sont refusés.

Navigation : un accès progressif synchrone pour les candidats, puis une route pondérée vers le seul choix ; budget partagé avec les autres colons. Aucun parcours par frame ni cache survivant à une mutation. Mouvement utilise les poses GPU existantes ; `PresentationChanges` observe début/fin et cible. Pas de squelette CPU, nouveau draw call ou nouvelle géométrie par crise. Les coûts réels de simulation/worker/images et leurs limites restent dans les preuves.

À compléter : traits influant les seuils, autres crises et leur distribution, facteurs de difficulté, attentes selon richesse, relations, arrestation, comportements NPC et pensées de ces événements. G0–G5 restent ouverts.
