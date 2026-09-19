# Acquisition automatique et réponse civile — V60

V61 ajoute le [mandat mobile ennemi](pursuit.md), séparé du tir libre des colons et de la réaction civile. Les descriptions du profil fixe ci-dessous concernent les sentinelles historiques.

[Recherche, valeurs et limites](../research/automatic-combat-reference.md). Les mobilisés tirent à volonté par défaut, depuis leur poste, sur une menace hostile active et atteignable au tir. Le bouton de l’inspection suspend le tir automatique ; les ordres explicites restent disponibles. Couper le tir libre interrompt aussi leur visée, puis l’ordre conservé reprend une préparation entière ; adaptation au tick de commande local, sans réduire la récupération. Au contact, la défense en mêlée reste active même avec tir libre désactivé. Une destination/file de déplacement garde priorité ; aucune préparation pendant une arête capturée.

## Politique civile et action physique

Affectations et inspection exposent Fuir / Attaquer / Ignorer. Attaquer choisit dans huit cases sans arme, ou 0,66 de la portée de l’arme borné à 2–20. Mêlée au contact, approche réelle sans arme, sinon tir depuis la position. L’action civile de tir garde deux émissions restantes et une expiration de 200 ticks locaux ; récupération avant réévaluation. Une menace perdue/invalide termine l’intention, pas la récupération ni une balle en vol. Aucune mobilisation cachée.

L’interruption libère tâches/services et conserve les cargaisons via le contrat existant. Ordres forcés/file/intention de travail et acquisition d’équipement ne sont pas préemptés. Sommeil et repos médical engagés restent hors de cette réaction. Changer la politique retire l’intention automatique, en conservant récupération et arête déjà engagées. La fin du combat rend les décisions civiles ordinaires possibles.

## Architecture et persistance

`automatic-combat` décide, `automatic-targets` note les candidats, `automatic-combat-state/save` portent états et invariants. Tir et mêlée restent les seuls producteurs d’émissions/blessures ; aucun moteur de combat parallèle. Captures anatomiques/spatiales à durée synchrone, invalidées après mutation. Le rendu reçoit les mêmes phases et ne décide aucune cible.

Schéma 60 : validation stricte V59 avant migration neutre, sans cible ni passé inventés. `DraftState.holdFire?:true`, `Pawn.lastAttack?:{targetId,atCore}`, origine automatique facultative sur les ordres, compteur/expiration réservés à la réponse civile. Champ absent = comportement par défaut ; anciens ordres restent dirigés. La mémoire de dernière attaque vient d’une émission ou tentative réelle, jamais d’un clic ni d’un score. Les snapshots incluent discrètement les réglages d’interface.

Mouvement, arrêt, changement de cible, démobilisation et réglage conservent le cooldown. Réactivation de mobilisation et changement de principale rétablissent le tir libre. Une position tactique atteinte reste réservée pendant le tir automatique ; les automatismes ne consomment pas la file du joueur.

## Validation et portée

Les scénarios regroupent déclenchement/portée, ligne/alliés, scores/cône/mémoire, ordres/mouvement, interruption chargée, cycles civils, sauvegarde et refus stricts. Le compagnon de colonie rencontre utilise désormais l’autorisation de tir automatique pour défendre puis secourir, sans injecter de dommage. UI réelle à 1×/6×, charge mixte et garde de présentation ont leurs preuves dans [validation](validation.md).

Restent poursuite/positions autonomes, réveil défensif, armes/armures complètes, groupe/raid et conséquences sociales. Les limites de V59 sur soins, maladies et dépouilles ne sont pas effacées par l’acquisition d’une cible.

Limite d’ordres héritée de V56/V59 : un nouvel ordre civil donné pendant la récupération d’un tir/coup est refusé avec motif, sans mutation. Il faut le redonner après récupération ; sa mise en attente immédiate n’est pas encore reproduite. Un ordre civil accepté pendant la visée annule en revanche l’attaque automatique. Les ordres déjà acceptés restent prioritaires. Ne pas confondre cette limite avec une suppression du cooldown.

V60 : pendant la récupération d’un tir automatique, l’ordre peut déjà être retiré. Le rendu utilise alors la dernière cible réellement attaquée, persistée, pour restaurer l’orientation après chargement. Contrôle des attributs GPU dans le parcours natif ; aucun déplacement ou dégât déduit de cette orientation.
