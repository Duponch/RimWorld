# Mobilisation et déplacements — V53

V99 : [contrat d’interaction courant](interaction-feedback.md). Mobiliser/Démobiliser se trouve dans les actions du dossier ; R et boutons excluent explicitement les membres indisponibles. Clic droit au sol : déplacement ; sur animal ou hostile : choix tactiques vérifiés, allié exclu du menu contextuel. File d’attaques absente. La référence locale 1.6.4871 affine les constats de la recherche historique ci-dessous.

18 septembre 2026. [Recherche confrontée aux sources](../research/drafting-reference.md), [état global](../ROADMAP.md), [preuves](validation.md). Corpus : chapitres 8/20/21, SYS/TEST-035 et 113..117, UI-007/008/011. Tir, couverture et ennemis ne sont pas livrés par ce contrat.

## Mode et commandes

`Pawn.draft` est sparse : absence = civil ; présence = horloge de dernière activité, destination active ou nulle et file de 32 intentions maximum. Ce n’est ni une tâche de Transport ni un nouvel inventaire. `draft`, `draft-move`, `draft-stop` visent un groupe d’identifiants uniques ; validation complète avant mutation. Un refus conserve tâches, objets, réservations et PRNG. L’ordre stable des identifiants détermine l’attribution des destinations.

Mobiliser/démobiliser interrompt les engagements civils et libère leur file/priorité maintenue. Aucune arme n’est requise. Une incapacité à terre ou un décès interdit la mobilisation et la supprime ; une perte de Manipulation seule n’interdit pas la marche. Le colon mobilisé ne choisit pas un travail, repas, lit ni loisir de sa propre initiative. Faim, repos, loisirs et santé continuent d’évoluer. Le sommeil involontaire d’épuisement libère la destination et la file, conserve le mode et récupère du repos seulement couché ; un nouvel ordre réveille. Ce choix suit les valeurs par défaut du miroir et reste de confiance moyenne pour les exceptions du binaire actuel.

Sans activité ni menace, démobilisation après 1 000 ticks locaux (10 000 Core), ancre persistée. Les déplacements et le sommeil involontaire repoussent cette échéance. **Aucun hostile n’existe encore** : son prédicat de menace devra intégrer ce contrat avant son activation ; ne pas utiliser aujourd’hui cette absence comme preuve de comportement en combat.

## Espace, files et continuité physique

Une destination tactique active est exclusive entre colons mobilisés, y compris après arrivée. Les intentions en file la réservent seulement lorsqu’elles deviennent actives ; elles sont alors revalidées. La prévalidation d’une file prouve seulement l’accès : elle ne construit pas une route pondérée destinée à être jetée. Les corps alliés présents et services réservés sont exclus au choix, sans bloquer le transit civil. Des colons peuvent toujours se croiser ou se superposer en passage ; collision hostile et dispersion restent ouvertes.

Le clic cherche d’abord un sol d’arrêt dans un rayon de 2,9 cases, puis une alternative accessible dans 30 cases. Adaptation explicite : classement distance géométrique puis z/x, sans score de couverture ni formation par glisser. Les cellules du groupe sont distinctes ; tous les membres doivent recevoir une destination, sinon refus atomique. Accès progressif cardinal pour l’existence, route pondérée à huit voisins pour la marche ; aucune route ne confond coût approximé et durée euclidienne.

Changer d’ordre conserve l’arête et sa durée capturées ; aucun retour à l’origine ni téléportation. La suite repart de sa destination logique après arrivée physique. Portes, lumière, capacités, terrain et mobilier conservent leurs coûts communs. Un arrêt sur meuble non admissible provoque sa sortie physique. Si le chemin devient inaccessible, l’ordre actif est libéré avec explication ; la suite de la file reste disponible. Les recherches pendant la simulation utilisent le budget partagé ; aucun cache ne survit au tick ou à une mutation.

## Interruption et conservation

Lors d’une interruption en plein pas, la cargaison reste sur la pose du porteur jusqu’à la fin de l’arête ; la cellule logique ne doit pas provoquer un dépôt visuel anticipé. Ensuite, un repas, ingrédient, médicament ou meuble entier est déposé selon les règles communes, avec identité, matière, âge et propriétaire de lit conservés. Le porteur de patient libère le secours ; le patient termine son arête déjà capturée, sans soin ou déplacement supplémentaire implicite.

Sol saturé : adaptation conservative explicite, le marqueur `interruptedCargo` retient l’unique cargaison et libère les engagements. La mobilisation autorise sa translation et le dépôt attend une pause physique entre mouvements ; ce n’est pas une capacité d’inventaire. Réessai borné au repos entre les arêtes, après navigation, afin qu’un échec de dépôt ne bloque pas indéfiniment le recalcul de chemin. Démobiliser conserve aussi une cargaison indéposable et termine l’arête en cours ; le travail civil attend ensuite un dépôt valide. Aucun objet n’est détruit pour rendre un ordre possible.

## UI, sauvegarde et présentation

Bouton Mobiliser/Démobiliser dans l’inspection individuelle et de groupe ; `R` lorsqu’un colon est sélectionné, récolte `R` conservée sans sélection. Clic droit au sol = déplacement, Maj = file, bouton Arrêter = libérer destination/file. Une sélection mixte refuse le déplacement jusqu’à mobilisation du groupe. Indicateur dans les portraits, destination et nombre d’ordres visibles ; aucun bouton de tir décoratif.

V52 est validée strictement avant V53 : aucun mode ou ordre inventé. Validation des ancres temporelles, cellules, limite de file, exclusions médicales/civiles et destinations concurrentes. Une cible devenue inaccessible reste une intention valide jusqu’à sa réévaluation ; sauvegarder n’exécute pas une commande cachée.

Les phases mode/destination/file sont publiées à leur tick. L’horloge de dernière activité seule n’impose pas de publication discrète. Corps, arme, cargaison et anneau utilisent toujours les mêmes attributs de trajectoire GPU. Pas de nouveau lot graphique ni de mise à jour squelettique CPU.

## Limites assumées

Tir dirigé et couvert utilisés en [V56](shooting.md). La rencontre V58 ajoute adversaire et fuite civile ; mêlée V59 et feu à volonté V60 complètent maintenant les ordres. Formation par glisser, orientation d’attente imposée et personnalité restent absentes. Voir le [contrat automatique](automatic-combat.md). Ordres d’équipement/soins civils pendant mobilisation encore refusés explicitement ; démobiliser permet ces actions. La boucle tactique est donc partielle, même si son déplacement est physique et persistant. Les modules `drafting-rules`, `drafting-destinations`, `drafting`, `drafting-save` séparent données, choix spatial, exécution et validation ; le tir V56 réutilise ces frontières et conserve sa récupération après annulation de l’ordre.

V58 : la démobilisation automatique exige l’absence de menace hostile active sur toute la carte. Le profil de collision adulte est désormais commun aux recherches et au suivi ; voir [rencontres](encounters.md).
