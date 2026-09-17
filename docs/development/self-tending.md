# Auto-soins ordinaires — V49

17 septembre 2026. [Recherche fraîche](../research/self-tending-reference.md), [traitement commun](tending.md), [alimentation assistée](feeding.md), [validation](validation.md).

## Jouer

Santé propose **Autoriser les auto-soins**, désactivé initialement. Il faut aussi activer Médecin dans Travail et autoriser les traitements. Cocher l'option avec Médecin désactivé est possible ; l'inspection explique pourquoi aucun travail ne démarre. Un adulte mobile capable de manipuler peut traiter ses propres lésions admissibles, sans lit obligatoire. Incapacité, décès et perte totale de manipulation empêchent cette action ; elle ne remplace pas les secours.

Dans Médecin, le traitement des autres humains couchés précède les auto-soins, puis vient l'alimentation des patients. Les priorités numériques et Patient/Repos au lit restent distincts. Un ordre direct **Se soigner**, au clic droit sur le colon sélectionné, engage la même action. Il peut terminer après désactivation du métier ; décocher l'option ou interdire les soins arrête aussi un ordre forcé, avant résultat. File médicale toujours refusée.

Le colon se soigne sur sa cellule actuelle si elle accepte l'arrêt. S'il utilisait un lit ou un meuble, il quitte ce service et rejoint physiquement une cellule cardinale libre avant de travailler. Cette sortie est une adaptation explicite au volume 3D et au contrat de transit du mobilier. En l'absence de sortie, la commande refuse sans modifier le monde. Il n'obtient aucun bonus de lit pendant les auto-soins. Geste GPU de travail encore générique, orientation précédente conservée ; aucun calcul d'angle vers sa propre position.

Le traitement commun conserve cadence capturée, progression, saignement arrêté par lésion traitée, guérison ultérieure, XP à l'achèvement et absence de PV immédiats. **La qualité de base est multipliée par 0,7 avant plafonnement et variation additive** ; aucune pénalité de vitesse propre à l'auto-soin. Une opération traite une seule plaie sans médicament. Blessures, manipulation, vue, lumière et Médecine continuent à contribuer à leurs statistiques normales.

## État, réservations et continuation

`Pawn.selfTend?:true` est la permission persistante ; absence signifie désactivé. `Pawn.tend.patientId === Pawn.id` distingue l'auto-soin dans la tâche commune. Même réservation de patient que soins et nourrissage, plus cellule de travail exclusive ; pas de deuxième dossier médical. Le validateur distingue chevet cardinal d'un autre patient et cellule propre de l'auto-soin. Ni besoin de sommeil ni autre activité simultanée autorisés.

V48 est strictement validée avant passage à V49, sans permission inventée ni route modifiée. Champs V49 rejetés dans V48 ; continuation pendant la sortie du lit et pendant le travail sauvegardée. Politique, handicap, décès et annulation libèrent les engagements ; les dépôts volontaires gardent leur prévalidation commune. Le bridge observe les phases de traitement existantes ; le réglage est une donnée de HUD, pas une mutation graphique par frame.

## Limites et contrôles

[V50](urgent-care.md) ajoute la voie urgente, la réévaluation après une opération et la revue au lit selon les priorités. Cocher n'interrompt pas universellement toutes les activités : la recherche a corrigé cette cible trop large. Patient prioritaire peut toujours maintenir l'attente au lit ; le clic droit commande l'auto-soin immédiatement. Les expirations/réactions aux dégâts des autres tâches restent distinctes. Médicaments ajoutés en [V51](medicines.md), avec collecte physique avant auto-soin. Maladies, chirurgie, mobilisation et incapacités biographiques restent absents.

Cinq scénarios croisés vérifient formule/ordre des facteurs, opt-in, priorités, autres patients, interruptions, sortie réelle du lit, obstacle, sauvegarde/snapshots, migration stricte et cent adultes soignés simultanément. Le parcours navigateur utilise Santé, Travail et clic droit, annule puis recharge pendant l'action, et observe les vrais attributs GPU. Il ne déduit pas la chronologie visible du seul résultat de simulation.
