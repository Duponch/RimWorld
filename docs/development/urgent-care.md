# Priorité médicale aux décisions — V50

17 septembre 2026. [Recherche et correction de portée](../research/urgent-care-reference.md), [auto-soins](self-tending.md), [soins communs](tending.md), [validation](validation.md).

## Règles jouables

Une plaie autorisée à traiter devient urgente si le saignement annonce une mort strictement avant trois quarts de jour. L'urgence n'est ni une maladie générique ni un seuil de PV. Lors d'une nouvelle décision, Patient ou Médecin passe avant faim, sommeil et loisirs seulement si sa priorité atteint la meilleure catégorie ordinaire activée. Ainsi Médecin 2 et Construction 1 ne donnent pas la priorité d'urgence, même sans chantier prêt. À égalité Patient précède Médecin ; dans Médecin, un autre patient urgent accessible précède les auto-soins urgents.

Le patient rejoint physiquement un couchage, même sans médecin disponible. Le médecin conserve les conditions de chevet, de capacité et de réservation. Les auto-soins exigent toujours leur permission. L'urgence capturée protège le traitement des besoins ordinaires ; l'effondrement de fatigue, l'incapacité, la politique et la disparition de cible gardent leurs règles. Aucun résultat pendant le trajet.

L'auto-soin urgent termine après **une** plaie : services libérés, nouvelle décision dès le tick suivant, puis traitement suivant, repas ou autre besoin selon le nouvel état. Les soins urgents à un autre patient conservent leur chaîne de plaies. Un ordre direct reste une demande de soin ordinaire complète ; le joueur peut toujours prendre la main.

Pendant le repos au lit, une revue urgente se produit sur une cadence de 211 ticks Core, représentée exactement à notre résolution par 21/22 ticks locaux alternés. Elle peut réveiller le soignant et lui faire quitter le lit. Une intention Patient prioritaire valide conserve son lit ; changer Médecin devant Patient peut permettre l'auto-soin à la prochaine revue. Le départ reste physique, sans téléportation ni bonus de lit debout.

## Frontières et persistance

`urgent-care.ts` choisit seulement les fournisseurs médicaux urgents. Il réutilise les propositions de patient/traitement et le budget de navigation progressif commun ; aucun parcours par image ni cache entre décisions. Les priorités forcées/file passent avant cette branche. Aucun travail engagé, repas, transport, cuisine, loisir ou déplacement de service n'est annulé par ce seul détecteur. Les reprises au lit constituent le point de réévaluation ajouté, pas une boucle de préemption globale.

`TendTask.urgent?:true` capture la voie de décision. L'absence conserve les traitements historiques, notamment après migration. V49 est validée avant V50 sans modifier une tâche, une route ou une permission. Le marqueur est transmis dans les snapshots ; aucune nouvelle pose ni pipeline. La fin de tâche est une phase déjà observée. La cadence du lit dépend exclusivement du tick sauvegardé et de l'identifiant du colon.

Un échec d'accès conserve le service précédent et laisse considérer les candidats suivants. L'épuisement de budget reporte la décision ; le dépôt physique précède tout remplacement d'une activité autorisée. Les quantités, l'âge et les propriétaires d'objets restent gérés par leurs contrats existants.

## Ce que ce lot ne clôture pas

La formulation V49 « préemption médicale générale à implémenter » était trop large : les sources ne décrivent pas une interruption universelle. Expiration des autres tâches et réévaluation après dégâts restent un chantier lié aux futurs comportements/combat. Maladies, médicaments, chirurgie, mobilisation, factions et hôpitaux spécialisés restent absents. Les sources connues ne garantissent pas une parité de tous les arbitrages de RimWorld.

Cinq scénarios croisés couvrent seuil/priorités, une plaie puis vrai repas, revue au lit, accès/budget, continuation/migration, politiques/incapacité et cent acteurs. Le parcours UI manipule Travail/Santé, laisse la décision automatique se produire, sauvegarde pendant le geste puis observe soin et ingestion sur les attributs GPU réels. Les audits partagent les bancs médicaux existants ; le pilote civil et la clinique de cinq jours restent complémentaires.
