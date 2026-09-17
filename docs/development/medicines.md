# Médicaments et plafonds individuels — V51

17 septembre 2026. [Recherche recoupée](../research/medicines-reference.md), [soins](tending.md), [auto-soins](self-tending.md), [conservation](food-preservation.md), [validation](validation.md). Corpus chapitres 8/9/11/15, SYS/TEST-051..054 et 094/096, CAT-018.

## Chaîne jouable

Santé propose cinq plafonds pour le **patient** : aucun soin, sans médicament, plantes médicinales, médicament industriel, meilleur disponible. La politique du médecin ne filtre pas ce qu'il peut donner à autrui. À défaut de produit autorisé et accessible, les soins autorisés se font sans médicament. Aucun objet n'est créé par le plafond. Les nouvelles colonies reçoivent trente médicaments industriels en piles de 25 et 5 ; les anciens sites restent intacts. Le filtre Médicaments permet leur rangement automatique et leur compteur comprend aussi les doses portées.

Le médecin réserve patient, chevet et quantité disponible dans une pile au sol, choisit la meilleure puissance autorisée puis la distance **au patient**, vérifie l'accès depuis sa propre position, rejoint la source et prélève réellement. Il transporte les doses jusqu'au chevet avant de travailler. Pour se soigner, il collecte aussi le produit puis travaille à sa position de prélèvement, sans revenir artificiellement à son ancienne case. Une source accepte au plus dix réservations médicales simultanées et jamais plus que sa quantité ; les réservations de transport ordinaires participent au même bilan.

La quantité demandée correspond aux opérations nécessaires pour les lésions actuellement admissibles, bornée par la pile disponible et 25. Une opération avec médicament traite la première lésion du classement même si sa sévérité dépasse 20 PV, puis les lésions suivantes qui tiennent dans vingt PV cumulés. Une lésion trop grande est sautée sans exclure une petite suivante. Une partie manquante fraîche est traitée seule. Sans produit, une opération reste limitée à une plaie. Chaque opération consomme **une dose**, quel que soit le nombre de plaies qu'elle traite ; aucune consommation ni XP pendant trajet/ramassage.

| Produit | Puissance | Qualité maximale | XP humaines de base par opération | Pile |
|---|---|---|---|---|
| Aucun | 0,3 | 70 % | 250 | — |
| Plantes médicinales | 0,6 | 70 % | 250 | 25 |
| Médicament industriel | 1 | 100 % | 350 | 25 |
| Médicament avancé | 1,6 | 130 % | 500 | 25 |

La qualité de base combine Médecine, capacités, puissance et le facteur d'auto-soin éventuel de 0,7. Après le plafond initial, chaque plaie reçoit sa propre variation additive −0,25..+0,25, puis un nouveau plafonnement. XP une seule fois par opération, avant consultation de la statistique de qualité, avec passion/saturation communes. La durée capturée du traitement ne dépend pas de la puissance. Le traitement arrête le saignement et aide la guérison ultérieure, sans PV instantanés.

Après épuisement du lot, une nouvelle collecte physique utilise le budget de navigation commun ; faute de dose accessible, la chaîne continue à sec. L'auto-soin **urgent** s'arrête après une opération, éventuellement plusieurs plaies : les doses inutilisées sont déposées avant une nouvelle décision. Les autres interruptions conservent aussi la matière ; si tout le sol est saturé, `interruptedCargo` garde l'objet et libère patient/chevet. Une baisse de plafond qui interdit le produit engagé annule avant soin/XP.

Terminer le soin ou annuler son service conserve les autres travaux déjà acceptés dans la file du colon. Seul le repli d'urgence quand le dépôt est impossible libère cette file ; une fin normale n'est pas un effondrement. Les soins eux-mêmes ne peuvent toujours pas être ajoutés en file.

## État, présentation et reprise

`medicine-rules.ts` porte contenu, plafonds et statistiques ; `medicine-logistics.ts` porte choix, réservation, prélèvement et consommation. La tâche `tend` ajoute `pickup` et `find-medicine`, le produit/quantité/identités de source et cargaison, et un marqueur de chaîne approvisionnée. Ni le patient ni un inventaire implicite ne deviennent propriétaires de la dose. Le schéma V50 est validé **avant** V51 ; seuls le numéro change et les états déjà présents continuent. `careDisabled` historique reste reconnu, absence de nouveau plafond signifie soins à sec. Les nouvelles parties ont le plafond industriel ; la première commande remplace explicitement le réglage historique.

Les trois produits ont des modèles procéduraux simples dans les lots de boîtes/cargaisons existants. Ramassage, travail, disparition de dose et résultat suivent la même horloge de présentation ; aucun nouveau lot graphique, mais les variantes augmentent la géométrie statique du lot et ne sont donc pas annoncées gratuites. Pas de calcul squelettique CPU individuel. Le HUD automatique reste limité en fréquence.

Les plantes médicinales pourrissent après 150 jours à taux normal et réutilisent température, ancrage de l'âge, séparation/fusion et expiration **avant** action. Leur perte est enregistrée séparément du bilan alimentaire. Les produits industriels/avancés ne pourrissent pas. Aucun médicament n'a de nutrition.

## Limites explicites

Les trente doses industrielles sont disponibles au joueur sur les nouveaux sites ; culture de healroot, fabrication et commerce restent absents. Les plantes médicinales et médicaments avancés sont définis et exécutables, testés en scénarios contrôlés, mais **pas encore obtenables par une boucle normale**. Ce départ ne prétend pas reproduire toutes les provisions Crashlanded. Inventaires personnels, collecte opportuniste de doses sur plusieurs piles voisines pendant un trajet, chirurgie, propreté, infections/maladies/immunité, hôpital spécialisé et détérioration des objets dehors restent ouverts. Ici le médecin retourne chercher après le lot ; la différence de tournée est assumée, sans changement du bilan ni du résultat des doses utilisées.

Six scénarios profonds croisent plafonds, qualité, groupes de plaies, source inaccessible, dix utilisateurs, réservations communes, réapprovisionnement, auto-soins urgents, interruptions, saturation, péremption, migration stricte et cent acteurs. Le pilote civil range/conserve les trente doses sans inventer de blessure ; la clinique UI distincte observe prélèvement, portage, annulation, travail, résultat et rechargement. Ces contrôles ne garantissent pas une couverture exhaustive.
