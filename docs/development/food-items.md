# Aliments et nutrition — contrat courant V11

Corpus : chapitres 4/10/11/14, CAT-005/011/015, SYS-076..078, TEST-076..078, CONST-001..007. [Recherche nutritionnelle](../research/food-items-reference.md) et [nouvelle vérification du choix alimentaire](../research/food-clearing-reference.md). Les nombres sont adaptés à notre horloge ; ils ne certifient pas tous les profils de RimWorld.

| Objet | Nutrition/unité | Pile maximale | Ingestion maximale |
|---|---:|---:|---:|
| Baies | 0,05 | 75 | 75 |
| Riz cru | 0,05 | 75 | 75 |
| Repas de survie | 0,9 | 10 | 1 |
| Repas simple | 0,9 | 10 | 1 |
| Portion historique | 0,35 | 75 | 1 |

## Contrat livré

`items.ts` contient les définitions immuables. `MaterialPile.item` conserve l'identité de contenu ; `kind` reste la catégorie bois/nourriture pour les premiers filtres. Deux objets différents ne fusionnent jamais. La limite de pile dépend de l'objet ; les capacités de cellule et le transport de travail restent mesurés en unités provisoires, au plus dix unités par trajet de transport.

Le repas a sa propre `NeedTask.quantity`, partagée avec les réservations logistiques et validée au chargement. Il peut donc contenir seize baies même si le transport de travail est encore limité à dix unités. C'est une quantité d'ingestion dérivée de la faim, pas un inventaire personnel caché. Le colon prend exactement les unités réservées, choisit/rejoint sa place puis les consomme ensemble après 50 ticks. Interrompre conserve la cargaison, son type et sa quantité au sol. Lorsqu’un colon remplace son transport par un repas, sa propre réservation de transport est libérée dans la même transition ; les réservations des autres restent opposables. Une régression vérifie seize baies disponibles au lieu des six laissées à tort après déduction de son ancien transport. Aucun gain avant la fin.

Le besoin adulte utilise une capacité actuelle d'une nutrition, affichée par une jauge 0–100. Une baie vaut cinq points, une ration 90 ; l'excès au-delà de 100 n'est pas conservé. Baisse de base : `160 / 6000` points/tick, facteurs 0,5 sous 24 et 0,25 sous 12, zéro à saturation nulle. Le seuil de recherche reste 30. Intégration continue à 10 Hz adaptée à notre horloge, au lieu des intervalles de 150 ticks du miroir ; de petits décalages de seuil sont assumés. Santé, traits, âge, race et lits particuliers ne sont pas implémentés et n'ont pas de modificateurs inventés.

Les nouvelles parties commencent avec 18 repas de survie, répartis en piles de dix et huit. Le départ reste local et ne prétend pas reproduire l'ensemble Crashlanded. Les récoltes produisent `berries`. L'UI affiche nutrition totale puis quantités de chaque aliment ; l'inspection et le journal identifient les aliments. Les rations et baies ont des couleurs de piles distinctes, et la ration portée a un paquet GPU distinct. Les lots et matériaux restent conservés.

## Choix alimentaire

Le profil adulte neutre classe les aliments frais avec un score de préférence moins la distance de Manhattan : repas simple +16, baies 0, ration −5, riz cru −82. Ce score choisit une cible accessible ; le trajet garde sa durée euclidienne. En cas d’égalité, l’ID départage de façon déterministe, adaptation locale explicitée dans la recherche. Un aliment préféré inaccessible ne masque pas les autres. Le porteur compare aussi son aliment tenu ; interrompre dépose sa cargaison de façon conservatrice.

La [conservation V11](food-preservation.md) ajoute un bonus de 12 au score adulte quand la durée restante est strictement inférieure à une demi-journée. L’âge est conservé dans les transferts.

Le profil historique conserve le choix par coût de trajet. Les récoltes de baies ne détruisent plus le buisson depuis V7 ; le riz, introduit en V8, est semé, récolté et ressemé. Voir [plantes](rocks-and-plants.md) et [culture](farming.md).

## Migration et frontières

Les schémas V1–V4 sont validés avant migration. `foodRules: legacy` conserve 0,015 point/tick, les anciennes récoltes et portions à 35 points, sans transformer leurs stocks en rations plus riches. Les anciennes ingestions gardent progression et quantité un ; IDs, positions, cargaisons, chantiers et jauges ne changent pas. Ces objets apparaissent comme « Portion historique ». Les nouvelles parties utilisent `foodRules: adult`. Les deux profils sont explicites, sérialisés et testés ; aucune conversion silencieuse à la reprise. Tout nouveau producteur alimentaire passe son `ItemId` explicitement : le défaut `legacy-portion` des helpers est réservé à la compatibilité et aux anciennes fixtures.

Le schéma courant est 11 ; les étapes antérieures sont validées avant migration. Identité d’objet inconnue, catégorie incohérente, capacité dépassée, quantité d’ingestion invalide ou engagements contradictoires provoquent un refus. Le worker n’adopte jamais une sauvegarde invalide.

La première [recette de cuisine](cooking.md) transforme dix baies/riz en un repas simple. Intoxications, régimes, traits, compétences, repas personnel de secours et collecte de plusieurs piles pour un seul repas restent absents. Le classement présent couvre seulement les aliments et le profil ci-dessus.

## Validation

Les scénarios alimentaires vérifient arrondi pair, faim, réservations concurrentes, ingestion, interruption, identité, préférence/distance/inaccessibilité et continuation. L’oracle de sélection couvre 120 cartes avec obstacles. Le pilote multi-jours rapproche ressources, récoltes et quantités réellement consommées. Les [preuves courantes](validation.md) distinguent simulations, parcours UI et limites.
