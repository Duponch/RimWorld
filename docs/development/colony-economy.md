# Patrimoine, attentes et menaces — V105

Références : [richesse](../research/wealth-reference-v105.md), [menaces](../research/threat-reference-v105.md), [commerce artistique](../research/art-trade-reference-v105.md). Core local 1.6.4871 rev590, corpus et sources publiques recoupés. Le périmètre reste une adaptation partielle, sans valeur de personne inventée.

## Biens physiques et attentes

Le relevé partagé compte objets admissibles au sol et possédés, équipements, ingrédients incorporés aux ouvrages, meubles minifiés, bâtiments et sols. Un meuble compte une seule fois : objet emballé ou bâtiment installé. La valeur des bâtiments ignore leurs dégâts, celle des objets les conserve. Inventaire marchand et ennemis exclus ; minerai non extrait et végétation sauvage ne deviennent pas richesse acquise. Les personnes et objets sans prix vérifié sont signalés et exclus du montant : « Patrimoine évalué » est une borne inférieure, pas un total Core certifié.

Un relevé tous les 501 ticks locaux reprend la frontière stricte Core de plus de 5000 ticks. Il est persisté et partagé, jamais recalculé pour chaque colon ou image. Historique affiche son contenu. Les paliers à 15000 / 31000 / 81000 / 182000 / 308000 déterminent le bonus d'attentes +30 / +24 / +18 / +12 / +6 / 0 et la diminution quotidienne de lassitude 18 / 13 / 11 / 10 / 8 / 7 points. Les seuils supérieurs sont exclusifs. La baisse de la jauge de loisirs reste indépendante. Seules deux familles de loisirs sont jouables ; les nombreuses familles Core restent absentes.

## Menaces et pertes

Les raids ordinaires Cassandra des colonies ayant adopté ce profil utilisent la richesse connue pondérée, le nombre de colons libres, leur santé représentée, le temps écoulé, Récit d'aventure et une adaptation persistée. Courbes, minimum et plafond 10000 dans la recherche liée. Le minimum utilise un mélange déterministe local par tranche de 250 ticks, distinct du PRNG Core. Le calendrier n'est pas déplacé par les variations de richesse.

L'adaptation évolue par demi-journée ; sa croissance positive attend J30. Une chute sous violence externe et une mort ont des conséquences distinctes, une mort remplaçant la chute du même tick. Les notifications en attente survivent aux sauvegardes. Aucun décès antérieur à l'adoption n'est reconstruit ; enlèvement absent.

La composition ordinaire utilise quatre rôles projetés à 35, 50, 50 et 65 points, avec armes physiques disponibles (couteau plastacier, revolver, fusil). Limite de coût individuel, reliquat et ressources de création sont validés ensemble. Cela ne reproduit pas tout le catalogue pirate : notamment le couteau de plastacier n'est pas l'arme pauvre typique du profil Core à 35 points. Introduction et anciens raids du camp conservent leur composition historique ; les contraintes Core « un ennemi forcé à terre » et toutes les stratégies ne sont pas livrées. Les métadonnées de groupes et bilans rendent vérifiable l'effectif variable.

## Commerce et continuité

Un petit visiteur achète les sculptures minifiées au sol dans les lieux admissibles. Une œuvre posée, portée ou réservée doit d'abord être libérée. Qualité, matière, auteur, création et identité restent attachés à l'œuvre ; aucun ItemId artificiel. Le marchand peut revendre l'œuvre qu'il détient, mais ne génère pas spontanément de sculptures. Argent, objets et emplacements sont prévalidés dans le même panier. Le départ archive l'œuvre ; la destruction du corps détruit les possessions attachées avec comptabilité des pertes. Les autres meubles emballés restent hors commerce.

Schéma 105 : validation stricte V104 puis changement de version seul. Aucune richesse passée, ressource, attente ou menace nouvelle activée par migration. Les nouvelles parties Atterrissage forcé révision 7 adoptent le profil ; Historique permet une adoption prospective des anciennes colonies. Le camp garde son calendrier de raids historique. Fixtures V98/V101/V103/V104 immuables.

[Preuves et limites](../history/validation-economy-v105.md). Dix colonies dans Charger, dont « Art et commerce », une préparation contrôlée avec visiteur réel du moteur, œuvre et matières fournies, pas une colonie autonome.
