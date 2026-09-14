# Chantiers — contrat V16

Référence : corpus chap. 10, SYS-056/TEST-056, SYS-005/020..022/051/053/054 et [recherche renouvelée](../research/construction-reference.md). Ce contrat remplace le blocage immédiat des plans de murs/tables et le refus systématique des plantes/piles. Les [écarts](../gameplay/decisions.md) ne sont pas des comportements implicites du jeu commercial.

## Intention, matière et travaux

Chaque construction a un Job parent : `construction = blueprint | frame`. Le bâtiment terminé entre dans `World.structures` et le Job disparaît. La commande crée un plan sans prendre de matière. Elle peut recouvrir plantes, objets au sol et colons ; eau, massif rocheux, pierre décorative, bâtiment, autre ordre, réserve et certaines destinations engagées restent incompatibles. Empreinte et rotation gardent leurs définitions.

1. Une plante obstruant l'empreinte donne au constructeur un sous-travail `clearance {resourceId, progress}`. Il accède à une cellule adjacente, regarde la plante et coupe selon ses règles existantes. `gathering.ts` partage les producteurs entre collecte ordinaire et dégagement : quantité, fraîcheur et PRNG conservés ; un dépôt impossible n'enlève rien.
2. Une pile gênante est prélevée et portée hors des emprises/champs avec la destination `aside`. Le Job parent, le type et la quantité réservée persistent. Dix unités au plus par trajet selon notre capacité locale ; une pile de 23 unités exige trois voyages. Aucune réserve artificielle n'est créée.
3. Construction ou Transport peut livrer. La première livraison réelle transforme le plan en cadre. Le conteneur appartient au Job ; `escrow` reste une vue, pas une seconde matière. Seul Construction finit le cadre après coût entièrement livré.
4. La finition revalide l'empreinte, incorpore les matériaux, crée le bâtiment, libère le Job et invalide la grille d'obstacles du tick avant le prochain acteur.

Le choix se fait par les priorités du tableau Travail. Construction prend en charge son dégagement et son approvisionnement même si Collecte/Transport valent 0 ; Transport seul peut dégager une pile et apporter, pas couper une plante ni terminer. `forConstruction` mémorise la famille responsable de la cargaison engagée. Les deux familles actives ne produisent pas deux réservations sur les mêmes unités.

Le constructeur attend un colon ou service gênant ; il ne le téléporte pas. La vérification protège position, origine/arrivée/coins d'arête active et place de repas, de lit, de cuisine ou de loisirs déjà réservée. Une place de repas peut recevoir un plan, mais le cadre attend sa libération. Les plans ne réservent pas exclusivement le passage.

## Interruptions, annulation et âge

La progression de finition et les matériaux livrés restent au cadre lorsqu'un constructeur s'interrompt. La coupe interrompue libère son sous-travail sans détruire la plante ; elle redémarrera sa durée. La cargaison interrompue est déposée selon les règles de [conservation matérielle](material-logistics.md), avec son ItemId et son âge alimentaire.

Annuler le parent libère aussi les cargaisons de dégagement qui le référencent. Les dépôts sont préparés avant mutation ; si la place manque, le refus reste atomique. Le parent n'est pas annulé en laissant derrière lui une tâche invalide. La pourriture, les réservations concurrentes et la capacité de destination continuent d'être revalidées par les modules existants.

## Passage et rendu

Plan et cadre restent traversables. L'entrée dans un cadre ajoute **1,4 tick** à `3 × longueur euclidienne`. La recherche utilise 1000/1414 et +467 ; l'arrondi de recherche ne règle pas la vitesse physique. `terrainDelay` est capturé dans l'arête engagée et sauvegardé : supprimer le cadre pendant sa traversée ne change pas rétroactivement la durée.

`frameCosts` capture une carte clairsemée pour une recherche. La file de Dial dimensionne ses seaux sur le coût maximal de cette capture ; aucun coût de cadre ne s'ajoute à la connectivité cardinale. Le laboratoire GPU reste indépendant. Le rendu conserve l'interpolation GPU et ses buffers ; la clé visuelle inclut la phase. L'inspection affiche Plan/Cadre et la raison d'attente.

`construction-rules`, `construction-planner`, `construction-costs`, `construction-save` séparent règles, propositions, mouvement et persistance. L'index d'obstacles est commun à une décision synchrone, respecte l'ordre des ressources et disparaît avant mutation. La livraison et l'exécution font une vérification directe actuelle ; aucun cache global ne masque une plante retirée ou une pile déposée.

## Migration V15 → V16

V15 est d'abord validé avec ses anciens plans solides et ses interdictions de chevauchement. Une corruption historique n'est pas acceptée sous prétexte que V16 autorise cet état. Puis chaque Job constructible reçoit `frame` s'il a du bois livré ou du travail déjà accompli, `blueprint` sinon. Les anciens travaux sans matériaux des toutes premières versions restent conservés ; un cadre vide n'est donc pas déclaré universellement invalide.

Positions, routes, quantités, identités, besoins, graines et PRNG ne changent pas au chargement. Les prochains ticks appliquent les nouvelles règles. V16 valide phases, références de dégagement, propriété du sous-travail, durée et délai des arêtes. Même clé de stockage navigateur ; chargement invalide jamais adopté. Les étapes V1–V14 passent leurs validations/migrations historiques.

## Validation et portée

Trois scénarios approfondis couvrent transferts typés et fraîcheur, sauvegarde/annulation en cargaison, plante sur empreinte tournée, priorités, transporteur sans Construction, plans/cadres franchis, durée d'arête, coins protégés, repas réservé et migration stricte. L'oracle spatial indépendant comprend des cadres ; le pilote ordinaire doit terminer son camp et conserver ses bilans. L'UI courte exerce phases et reprise dans le vrai worker ; la partie longue suit trois jours par commandes réelles. Les [preuves courantes](validation.md) distinguent chaque passage et les audits.

Pas de nouveaux objets : états enrichis du mobilier existant. Coexistence avec objets sur table, plans dans réserves, déplacement des personnes gênantes, support du sol, compétences/qualité/échecs, minage, réparation, remplacement et déconstruction restent ouverts. Ne pas annoncer Construction terminée.
