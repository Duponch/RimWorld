# Impacts anatomiques — V54

18 septembre 2026. [Recherche et limites](../research/bullet-impact-reference.md), corpus chapitres 15/19/20, SYS/TEST-089..091/105/111..112. Le producteur anatomique V54 est appelé par les vols V55 et le [tir commandé V56](shooting.md). Les anciennes scènes d'impact injecté restent distinctes du nouveau parcours UI de tir ; elles ne prouvaient pas seules préparation, vol ou interception.

## Frontières et déroulement

`bullet-impact.ts` résout une balle sur un adulte naturel avec frontière de protection facultative V63 : localisation pondérée par couverture des parties encore présentes, filtres hauteur/profondeur et repli, préservation de la partie extérieure non racine, puis couches internes → première extérieure. Entrée de dommage en PV, conversion en milli-PV avant application ; aucune vie globale. Une partie fournie sert aux impacts déjà localisés et aux fixtures, pas à une option joueur de visée anatomique.

Le résultat contient la partie choisie, le marqueur de préservation, les couches résolues et un nouveau dossier. Les couches diagnostiques peuvent inclure une partie ensuite supprimée par la destruction de son parent. Gunshot reste distinct sur peau, os et organe si l’impact traverse ; la conversion d’armure V63 produit une lésion contondante selon la partie ; le saignement, les pertes de capacités et les membres manquants utilisent le module médical commun.

`addResolvedInjuryBatch` ajoute les lésions déjà résolues d'un seul impact au même tick, puis évalue le décès. Prévalidation des types, bornes, quantité et identités avant mutation/PRNG du lot. L'appel unitaire conserve son comportement antérieur ; les couches d'un impact létal ne sont pas supprimées prématurément. Un dossier déjà décédé n'est jamais prolongé par un nouvel impact.

`bullet-damage.ts` est l'adaptateur World : vérifier l'entrée et l'appartenance, mettre la santé à l'heure si nécessaire, résoudre sur copie avec PRNG local, engager dossier/usure/PRNG ensemble, puis réconcilier état, tâches, arête engagée, cargaison et arme. Aucun calcul par image. Un refus de capacité du résolveur ne modifie ni le dossier actuel ni le PRNG World ; l'évolution médicale précédant l'impact reste une étape temporelle distincte.

Profil borné : protection naturelle nulle, chemise/gilet via le [résolveur V63](armor.md), aucun implant, facteur entrant 1 et réglage Core ordinaire de mort instantanée 100 %. Armure après sélection exacte et avant propagation, jamais reroulée sur les couches du même impact. Pas de changement de worker lors de la conversion en contondant. Ralentissement V57, réactions V58–V62, vols/tirs V55–V56 sont livrés ; dépouilles comme objets, dégâts aux objets et infections restent absents.

## Persistance et soins

Gunshot possède douleur et saignement de la coupure, sans fusion ; ses cicatrices utilisent les règles communes. Traitements, médicaments, auto-soins, guérison et examen Santé utilisent ce nouveau type sans conversion en coupure.

**V53 est validée strictement avant V54**, avec exclusion explicite de Gunshot dans ses dossiers. Migration sans lésion, compétence, cible ou tir inventé ; seule la version évolue. V54 conserve les mêmes IDs, horloges et représentation médicale. Une sauvegarde ancienne contenant déjà ce nouveau type est refusée, même si ses autres champs sont valides.

Le pilote de colonie relève les Gunshot dans son bilan médical. Son parcours civil ne crée pas artificiellement un combat ; l'épisode joueur arrivera avec une commande de tir réellement livrée. La validation clinique dédiée complète dès maintenant les scénarios de simulation et la vraie interface.

## Preuves

Six scénarios `bullet-impact.test.ts` : cent mille choix anatomiques comparés à la couverture attendue, filtres/parties manquantes ; overkill et dernier PV ; propagation complète et létale ; non-fusion/cicatrices/guérison sur un jour avec PRNG repris ; snapshots et traitements physiques ; migration stricte, incapacité et cargaison en déplacement, refus atomique.

Regrouper avec blessures, santé intégrée, traitements, médicaments, équipement et mobilisation. Le parcours navigateur médical vérifie accident réel de toit, poses au sol, puis Gunshot préchargé, soins et rechargement dans le worker. Il ne simule pas une émission visuelle de balle. Le banc dédié mesure seulement la copie/résolution du dossier à 3/30/100 impacts simultanés, 0/20 lésions préexistantes, mélange de sélection, overkill et propagation cérébrale. [Résultats et limites](validation.md).

[ROADMAP](../ROADMAP.md) conserve la suite : compétence Tir active, phases persistantes, projectile, adversaire et réactions, puis validation de la boucle entière avec soins et retour civil. Aucun jalon G0–G5 clos par ce producteur.
