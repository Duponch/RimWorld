# Chantiers — contrat V24

V67 ajoute les PV/réparations des murs et portes et le foyer manuel ; les autres bâtiments restent hors de ce contrat. Voir [ouvrages et entretien](barriers.md).

V37 module finition et défrichage par la [lumière du travailleur](light-work.md), avec fractions persistantes. Le dégagement garde sa progression distincte ; la livraison ne gagne aucun travail de finition.

Référence : corpus chap. 10, SYS-056/TEST-056, SYS-005/020..022/051/053/054 et [recherche renouvelée](../research/construction-reference.md). Ce contrat remplace le blocage immédiat des plans de murs/tables et le refus systématique des plantes/piles. Les [écarts](../gameplay/decisions.md) ne sont pas des comportements implicites du jeu commercial.

## Intention, matière et travaux

Chaque construction a un Job parent : `construction = blueprint | frame`. Le bâtiment terminé entre dans `World.structures` et le Job disparaît. La commande crée un plan sans prendre de matière. Elle peut recouvrir plantes, objets au sol et colons ; eau, massif rocheux, pierre décorative, bâtiment, autre ordre et certaines destinations engagées restent incompatibles. Une zone compatible subsiste ; les cellules incompatibles sont retirées au placement du plan, avec conservation des objets. Empreinte et rotation gardent leurs définitions.

1. Une plante obstruant l'empreinte donne au constructeur un sous-travail `clearance {resourceId, progress}`. Il accède à une cellule adjacente, regarde la plante et coupe selon ses règles existantes. `gathering.ts` partage les producteurs entre collecte ordinaire et dégagement : quantité, fraîcheur et PRNG conservés ; un dépôt impossible n'enlève rien.
2. Une pile gênante selon le profil du bâtiment est prélevée et portée hors des emprises/champs avec la destination `aside`. Le Job parent, le type et la quantité réservée persistent. Dix unités au plus par trajet selon notre capacité locale ; une pile de 23 unités exige trois voyages. Aucune réserve artificielle n'est créée.
3. Construction ou Transport peut livrer. La première livraison réelle transforme le plan en cadre. Le conteneur appartient au Job ; `escrow` reste une vue, pas une seconde matière. Seul Construction finit le cadre après coût entièrement livré.
4. La finition revalide l'empreinte, incorpore les matériaux, crée le bâtiment, libère le Job et invalide la grille d'obstacles du tick avant le prochain acteur.

Le choix se fait par les priorités du tableau Travail. Construction prend en charge son dégagement et son approvisionnement même si Collecte/Transport valent 0 ; Transport seul peut dégager une pile et apporter, pas couper une plante ni terminer. `forConstruction` mémorise la famille responsable de la cargaison engagée. Les deux familles actives ne produisent pas deux réservations sur les mêmes unités.

Le constructeur attend un colon ou service gênant ; il ne le téléporte pas. La vérification protège position, origine/arrivée/coins d'arête active et place de repas, de lit, de cuisine ou de loisirs déjà réservée. Une place de repas peut recevoir un plan, mais le cadre attend sa libération. Les plans ne réservent pas exclusivement le passage.

## Profils de coexistence V21

[Sources et degré de certitude](../research/occupancy-reference.md). `occupancy.ts` décrit séparément le dégagement d’objets, leur présence, la coexistence avec une zone et l’admissibilité d’un apport de stockage. Ces propriétés ne sont pas déduites des maillages ni de la grille de navigation actuelle.

| Construction | Pile pendant la construction | Zone sous plan/ouvrage | Apport de stockage |
|---|---|---|---|
| Mur | Dégager | Retirer/refuser | Refuser |
| Lit | Dégager | Retirer/refuser | Refuser |
| Table | Conserver | Retirer/refuser | Refuser |
| Tabouret | Conserver | Autoriser | Autoriser |
| Piquet | Conserver | Autoriser | Autoriser |
| Feu | Dégager | Autoriser | Refuser |

Une table peut garder des objets déjà présents, sans devenir une réserve. Tous les producteurs/transferts conservent pile unique, capacité et réservations typées ; les nouveaux dépôts dans les lits ou feux achevés sont interdits. Les places de service engagées restent protégées par les règles existantes. La coupe des plantes gênantes reste commune à ces constructions.

`construction-zones.ts` prépare les cellules et destinations concernées. Le placement d’un plan incompatible retire uniquement les cellules couvertes des réserves/champs. Les cargaisons des transporteurs sont déposées selon un plan conservatif préparé avant mutation ; s’il n’existe pas de place, toute la commande est refusée. Les recettes qui portent un produit vers une réserve retirée recherchent un autre dépôt. Les ordres quantitatifs en file sont réconciliés. Annuler ensuite le plan ne recrée pas les cellules de zone. Les politiques des cellules restantes sont conservées ; division en zones connexes non livrée.

Pour un feu posé sur une réserve, la zone reste tracée mais les apports actifs/en attente sont libérés : elle ne doit pas alimenter une boucle rangement/dégagement. Pour un tabouret, les apports compatibles restent valides. L’index rectangulaire distingue réserves et cultures : dessiner un champ après un bâtiment/plan interdit les mêmes empreintes incompatibles, tout en autorisant la végétation à défricher. Un meuble compatible peut recouvrir le tracé agricole sans permettre de semer sous son volume.

## Interruptions, annulation et âge

La progression de finition et les matériaux livrés restent au cadre lorsqu'un constructeur s'interrompt. La coupe interrompue libère son sous-travail sans détruire la plante ; elle redémarrera sa durée. La cargaison interrompue est déposée selon les règles de [conservation matérielle](material-logistics.md), avec son ItemId et son âge alimentaire.

Annuler le parent libère aussi les cargaisons de dégagement qui le référencent. Les dépôts sont préparés avant mutation ; si la place manque, le refus reste atomique. Le parent n'est pas annulé en laissant derrière lui une tâche invalide. La pourriture, les réservations concurrentes et la capacité de destination continuent d'être revalidées par les modules existants.

## Passage et rendu

Plan et cadre restent traversables. L'entrée dans un cadre ajoute **1,4 tick** à `3 × longueur euclidienne`. La recherche utilise 1000/1414 et +467 ; l'arrondi de recherche ne règle pas la vitesse physique. `terrainDelay` est capturé dans l'arête engagée et sauvegardé : supprimer le cadre pendant sa traversée ne change pas rétroactivement la durée.

`navigationCosts` capture les coûts des cadres et du mobilier pour une recherche ; voir [profils V22](furniture-travel.md). La file de Dial dimensionne ses seaux sur le coût maximal de cette capture ; aucun coût de cadre ne s'ajoute à la connectivité cardinale. Le laboratoire GPU reste indépendant. Le rendu conserve l'interpolation GPU et ses buffers ; la clé visuelle inclut la phase. L'inspection affiche Plan/Cadre et la raison d'attente.

`construction-rules`, `construction-planner`, `construction-costs`, `construction-save` séparent règles, propositions, mouvement et persistance. L'index d'obstacles est commun à une décision synchrone, respecte l'ordre des ressources et disparaît avant mutation. La livraison et l'exécution font une vérification directe actuelle ; aucun cache global ne masque une plante retirée ou une pile déposée.

## Migration V15 → V16

V15 est d'abord validé avec ses anciens plans solides et ses interdictions de chevauchement. Une corruption historique n'est pas acceptée sous prétexte que V16 autorise cet état. Puis chaque Job constructible reçoit `frame` s'il a du bois livré ou du travail déjà accompli, `blueprint` sinon. Les anciens travaux sans matériaux des toutes premières versions restent conservés ; un cadre vide n'est donc pas déclaré universellement invalide.

Positions, routes, quantités, identités, besoins, graines et PRNG ne changent pas au chargement. Les prochains ticks appliquent les nouvelles règles. V16 valide phases, références de dégagement, propriété du sous-travail, durée et délai des arêtes. Même clé de stockage navigateur ; chargement invalide jamais adopté. Les étapes V1–V14 passent leurs validations/migrations historiques.

## Migration V20 → V21

V20 est d’abord validée selon ses interdictions de superposition de zones. Les nouvelles combinaisons ne peuvent pas se cacher dans une ancienne sauvegarde. Puis les rares piles déposées dans un lit/feu par l’ancien code sont déplacées sur une cellule libre proche en gardant ID, ItemId, quantité et fraîcheur ; sans place, chargement refusé avant adoption. Les références de source restent attachées à l’ID ; les ordres en file incompatibles sont libérés. Les anciennes cellules de culture recouvertes par un bâtiment/plan incompatible sont retirées ; les tâches générées de la zone modifiée sont libérées puis seront redécouvertes sur ses cellules restantes. Les dégagements forcés liés à cette zone déposent leur cargaison après précontrôle ; aucun espace disponible entraîne un refus avant adoption. Identités et politiques des zones restantes sont conservées. Positions des colons, horloges et PRNG restent inchangés ; seuls les engagements concernés sont interrompus. Les autres sauvegardes traversent leurs migrations historiques.

## Validation et portée

Cinq scénarios approfondis couvrent transferts typés et fraîcheur, sauvegarde/annulation en cargaison, plante sur empreinte tournée, priorités, transporteur sans Construction, plans/cadres franchis, durée d'arête, coins protégés, repas réservé et migration stricte. L'oracle spatial indépendant comprend des cadres ; le pilote ordinaire doit terminer son camp et conserver ses bilans. L'UI courte exerce phases et reprise dans le vrai worker ; la partie longue suit trois jours par commandes réelles. Les [preuves courantes](validation.md) distinguent chaque passage et les audits.

Pas de nouveaux objets : états enrichis du mobilier existant. V22 livre le [transit et l’arrêt du mobilier présent](furniture-travel.md). Déplacement des personnes gênantes, support du sol, qualité/échecs, réparation des autres bâtiments et remplacement restent ouverts ; minage livré en V28. V23 permet de maintenir un ordre de Construction sur sa cellule pour enchaîner les sous-travaux admissibles ; [règles de priorité et limites](player-orders.md). Ne pas annoncer Construction terminée.

## Commandes contextuelles V19

V19 corrige aussi la création des produits sur un plan de mur : le contrôle de dépôt ne le confond plus avec un mur construit. V19 ajoute le clic droit pour la coupe de plante gênante et le transport de dégagement, avec file réservée et annulation liée au parent. Chaque ordre vise un sous-travail ; les règles physiques ci-dessus restent communes aux travaux automatiques. Voir [commandes directes](player-orders.md) et [vérification V19](../research/context-services-reference.md).

## Déconstruction V24

Le [contrat de retrait](deconstruction.md) complète les six bâtiments actuels : ordre au contact, réservations, récupération au sol et annulation. La [réinstallation](furniture-transfer.md) V25–V26 et le [minage](mining.md) V28 ont leurs contrats distincts ; la réparation des murs/portes est livrée en V67 et la construction en pierre en V33. V30 calibre les nouveaux murs/lits et ajoute bois/acier : [matériaux et compatibilité historique](construction-materials.md). Les anciens ouvrages gardent leurs coûts et durées, y compris lors du remboursement.
