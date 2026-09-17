# Impacts anatomiques — V54

18 septembre 2026. [Recherche fraîche et limites](../research/bullet-impact-reference.md), corpus chapitres 15/19/20, SYS/TEST-089..091/105/111..112. **Le producteur est disponible dans la simulation et testé, mais aucun tir ne peut encore être ordonné en partie.** Les scènes de validation injectent explicitement un impact pour exercer la suite médicale existante ; elles ne prouvent pas préparation, vol, interception ou combat jouable.

## Frontières et déroulement

`bullet-impact.ts` résout une balle sur un adulte naturel **sans protection** : localisation pondérée par couverture des parties encore présentes, filtres hauteur/profondeur et repli, préservation de la partie extérieure non racine, puis couches internes → première extérieure. Entrée de dommage en PV, conversion en milli-PV avant application ; aucune vie globale. Une partie fournie sert aux impacts déjà localisés et aux fixtures, pas à une option joueur de visée anatomique.

Le résultat contient la partie choisie, le marqueur de préservation, les couches résolues et un nouveau dossier. Les couches diagnostiques peuvent inclure une partie ensuite supprimée par la destruction de son parent. Gunshot reste distinct sur peau, os et organe ; le saignement, les pertes de capacités et les membres manquants utilisent le module médical commun.

`addResolvedInjuryBatch` ajoute les lésions déjà résolues d'un seul impact au même tick, puis évalue le décès. Prévalidation des types, bornes, quantité et identités avant mutation/PRNG du lot. L'appel unitaire conserve son comportement antérieur ; les couches d'un impact létal ne sont pas supprimées prématurément. Un dossier déjà décédé n'est jamais prolongé par un nouvel impact.

`bullet-damage.ts` est l'adaptateur World : vérifier l'entrée et l'appartenance, mettre la santé à l'heure si nécessaire, résoudre sur copie avec PRNG local, engager dossier/PRNG ensemble, puis réconcilier état, tâches, arête engagée, cargaison et arme. Aucun calcul par image. Un refus de capacité du résolveur ne modifie ni le dossier actuel ni le PRNG World ; l'évolution médicale précédant l'impact reste une étape temporelle distincte.

Profil borné : protection naturelle nulle, aucun vêtement/implant, facteur de dommage entrant 1, réglage Core ordinaire de mort instantanée 100 %. Ce n'est pas un résolveur générique d'armures. Autres profils doivent faire évoluer cette frontière avant utilisation. Ralentissement d'impact, réaction aux tirs/dégâts, dépouilles, dégâts aux objets, infection, déclenchement et projectile restent absents.

## Persistance et soins

Gunshot possède douleur et saignement de la coupure, sans fusion ; ses cicatrices utilisent les règles communes. Traitements, médicaments, auto-soins, guérison et examen Santé utilisent ce nouveau type sans conversion en coupure.

**V53 est validée strictement avant V54**, avec exclusion explicite de Gunshot dans ses dossiers. Migration sans lésion, compétence, cible ou tir inventé ; seule la version évolue. V54 conserve les mêmes IDs, horloges et représentation médicale. Une sauvegarde ancienne contenant déjà ce nouveau type est refusée, même si ses autres champs sont valides.

Le pilote de colonie relève les Gunshot dans son bilan médical. Son parcours civil ne crée pas artificiellement un combat ; l'épisode joueur arrivera avec une commande de tir réellement livrée. La validation clinique dédiée complète dès maintenant les scénarios de simulation et la vraie interface.

## Preuves

Six scénarios `bullet-impact.test.ts` : cent mille choix anatomiques comparés à la couverture attendue, filtres/parties manquantes ; overkill et dernier PV ; propagation complète et létale ; non-fusion/cicatrices/guérison sur un jour avec PRNG repris ; snapshots et traitements physiques ; migration stricte, incapacité et cargaison en déplacement, refus atomique.

Regrouper avec blessures, santé intégrée, traitements, médicaments, équipement et mobilisation. Le parcours navigateur médical vérifie accident réel de toit, poses au sol, puis Gunshot préchargé, soins et rechargement dans le worker. Il ne simule pas une émission visuelle de balle. Le banc dédié mesure seulement la copie/résolution du dossier à 3/30/100 impacts simultanés, 0/20 lésions préexistantes, mélange de sélection, overkill et propagation cérébrale. [Résultats et limites](validation.md).

[ROADMAP](../ROADMAP.md) conserve la suite : compétence Tir active, phases persistantes, projectile, adversaire et réactions, puis validation de la boucle entière avec soins et retour civil. Aucun jalon G0–G5 clos par ce producteur.
