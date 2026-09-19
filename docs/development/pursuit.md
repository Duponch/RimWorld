# Approche autonome et positions de tir — V61

V62 complète ce contrat par les [réveils après impacts et dommages](disturbance.md). Sommeil, repos médical, incapacité et deux échéances sont distincts ; les interruptions générales des autres emplois restent partielles. Les absences mentionnées dans les bilans anciens ci-dessous sont historiques.
[Recherche fraîche et limites](../research/pursuit-reference.md). Dans une nouvelle **Rencontre armée**, l'adversaire rejoint un poste depuis lequel il peut tirer sur une cible humaine visible ; désarmé, il rejoint le contact. Ce mandat individuel ne déclenche aucun raid ni spawn. Les anciennes sentinelles sans mandat restent fixes.

## Propriété et phases

`Pawn.tactics` est optionnel : `{targetId, post, reviewAtCore}`. Le mandat vide est conservé après incapacité, décès ou sommeil ; cible/poste sont libérés, l'arête capturée finit selon la règle de chute existante. Aucun besoin ne gagne pendant le trajet. Les colons ne peuvent porter ce mandat.

`tactics.ts` choisit l'intention après une arête ; `tactical-positions.ts` choisit un poste ; `shooting.ts`, `melee.ts`, santé, mouvement et rendu gardent leurs responsabilités. Les nouvelles cibles doivent être hostiles, actives, non portées et visibles, dans 56 cases ; une cible à plus de 65 est libérée. Les tirs possibles utilisent le score pondéré existant, sinon l'approche prend le plus proche accessible au contact. Le mandat recherche seulement des personnes : pas de connaissance automatique des bâtiments derrière une paroi.

Chaque décision conserve une échéance Core, tirée dans 450–550 (tir/marche) ou 360–480 (mêlée). À expiration, nouvelle acquisition visible et choix de poste. Pas de nouvel itinéraire à chaque tick ou frame ; récupération et arête ne sont pas raccourcies. Perte de cible, arme, obstacle ou poste empêché conduit à abandon/replanification. Un échec coûte au plus le budget accordé et introduit une attente locale de 20 ticks (4 pour un chemin nouvellement bloqué). Les recherches partagent le budget tournant du camp ; ces délais et l'ordre stable des égalités sont des adaptations du moteur.

Le poste reste fixe pendant les tirs. Le personnage ne commence sa visée qu'après la fin de sa marche. Au contact il utilise les coups communs, même avec revolver ; sans arme il approche en mêlée. Mort/état à terre de la cible termine l'engagement lors de la décision physique suivante. La récupération d'un tir/coup reste conservée quand l'intention est annulée.

## Espace et coûts

Distance et couvert reçu orientent le poste, mais ne prouvent pas son accès. On classe les cases admissibles, vérifie ligne et accès progressif, puis construit la route pondérée du seul gagnant. Un bon couvert inaccessible ne masque pas un autre poste valide. Le poste actuel est privilégié quand le tir est valide et son couvert utile, ou à très courte distance. Les services, destinations mobilisées, postes ennemis et extrémités de mêlée sont exclus des destinations concurrentes ; le transit civil garde ses permissions existantes.

Chaque pas revalide obstacles et coins ; les portes coloniales fermées restent infranchissables au NPC. Pas de téléportation, destruction implicite de porte ou coût de diagonale modifié. Les captures de navigation et de tir restent locales à une décision synchrone. Fenêtres de tir bornées, aucun cache de règle fondé seulement sur le tick, aucune nouvelle animation/squelette CPU ou pipeline GPU.

## Persistance, bridge, UI

Schéma **61**, validation stricte de **60 avant migration neutre**. Le mandat est créé seulement par le nouveau scénario. Validation de forme, dates, appartenance, cible, chemin/poste, propriété des attaques et absence de doublon de postes. Les références à une cible qui vient de tomber restent admissibles jusqu'à la décision suivante, comme pour les autres activités interrompues par un autre acteur du même tick.

Le bridge publie les changements de cible/poste comme phases discrètes, sans considérer la simple échéance comme un changement graphique. Poses, corps, arme et sélection utilisent les arêtes GPU existantes. L'inspection affiche l'approche en cours ; les ennemis restent exclus des tableaux de gestion coloniale. FPS reste visible.

## Contrôles et limites

`pursuit.test.ts` : approche hors portée, visée/récupération et reprise exacte, cible mobile, paroi opaque, couvert inaccessible, concurrents, porte fermée puis ouverte, arme perdue, incapacité et strict V60/V61. Le compagnon du pilote teste désormais sentinelle fixe et combattant mobile sur une journée après blessure. Si le médecin est lui-même indisponible, il réaffecte un survivant par la commande Travail : les secours doivent finir, pas seulement être acceptés.

`pursuit.spec.ts` observe les attributs GPU dans les vraies frames à 1×/6×, marche/orientation/absence de pose de tir en marche, vol visible, retraite commandée par l'UI et chargement en cours de trajet. `PURSUIT=1 VALIDATION_VERSION=v61` réutilise les bancs CPU et navigateur de tir avec 3/30/100 acteurs et activités mixtes. [Résultats et limites de mesure](../history/validation-pursuit-v61.md).

Pas de raids, retraite/groupes, poursuite des objectifs invisibles, armures, nouveaux objets ni autonomie complète du NPC. La partie civile paisible conserve ses boucles antérieures. Aucun jalon G0–G5 clos.
