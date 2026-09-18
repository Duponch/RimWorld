# Portes manuelles — V34

[Recherche et décisions](../research/doors-reference.md). Corpus : chapitres 5/10/21, SYS-020..024 et SYS-113..117. Une porte modifie accès et temps de passage ; son animation ne décide jamais du trajet.

## Construction et passage

Une case, 25 unités du matériau choisi parmi bois, acier et cinq blocs de pierre. Base de construction : 850 ticks Core avant facteur/offset du matériau, puis conversion par dix et arrondi supérieur. Même chaîne plans/cadres/livraisons et protection des acteurs/arêtes que V33. Une pile et une réserve compatibles peuvent coexister sur la case. Une porte construite sur une pile démarre ouverte. Déconstruction avec récupération 12 ou 13 unités ; désinstallation/réinstallation refusées.

`readyDoorEntry` précède `startTravel`. Le colon arrivé au seuil ouvre puis attend sans consommer son chemin ni changer de case. Durées locales : bois 3,8 ticks, acier 4,5, pierre 10. L'arrondi d'observation peut ajouter moins d'un tick d'attente. L'arête conserve ensuite sa durée euclidienne ; traverser une porte déjà ouverte préserve les fractions de mouvement.

`holdOpen` attend un passage ; il ne commande pas l'ouverture à distance. Retirer l'option réarme la fermeture si le contact ami est récent, sinon un prochain passage est nécessaire. Délai de fermeture : 11 ticks. Corps et extrémités des arêtes actives repoussent ce délai ; piles et paquets empêchent la fermeture. Les index d'occupation sont construits une fois par tick en présence de portes. Aucun scan par paire porte/colon dans cette mise à jour.

`forbidden` exclut les nouvelles entrées même porte ouverte. Une arête déjà engagée finit physiquement et son occupant peut sortir. Ni téléportation ni perte de cargaison. Les réservations de services restent distinctes du passage civil partagé.

## Navigation, rendu et sauvegarde

La recherche ajoute une estimation de l'ouverture restante au terrain/objets ; pas de suppression de ce coût entre meubles. Le suivi revalide l'entrée car cette estimation peut évoluer. Cadres de porte exclus des coins diagonaux, même ouverts, dans recherche et suivi. Le validateur physique ignore l'interdiction tardive, jamais un mur ou un coin solide. L'accès progressif et le parcours pondéré capturent les mêmes permissions.

La case peut servir à une interaction ; son occupant maintient l'ouverture. Une porte fermée bloque le lancer des fers à cheval ; ouverte, elle laisse voir indépendamment de l'interdiction. L'observation du ciel exclut déjà les bâtiments.

Jambages dans le lot partagé de mobilier ; deux vantaux par porte dans un seul lot conservé, couleur par instance, mouvement TSL sur le temps de présentation des colons. Aucun objet Three par porte ni transform CPU par image. Capacités géométriques et matériaux conservés, variante d'ombre préparée au chargement. Hauteur et coupe suivent les murs. Orientation graphique selon les voisins, sans rotation de l'empreinte. Les vantaux coulissent sur les côtés ; cela ne crée pas une seconde case occupée.

Schéma 34 : V33 validée strictement avant changement de version, sans objet inventé ni régénération. `Structure.door` conserve ouverture, maintien, interdiction, segment temporel, échéance et dernier contact. Les autres objets ne peuvent porter cet état. Reprise exacte de la fraction d'ouverture, adaptation assumée face au rétablissement graphique complet du miroir Core.

Responsabilités séparées : `door-rules`, `doors`, `door-save`, `DoorLayer`, commandes UI. Le pilote ordinaire ajoute une porte après sa première journée. Les scénarios couvrent matériaux, manque d'une unité, attente, concurrence, obstruction, permissions, continuation, coins et migration ; l'audit suit construction puis récolte/transport à travers 100 portes.

## Limites explicites

Remplacement direct d'un mur, portes automatiques, sons, HP/réparation/incendie restent absents. V58 distingue la colonie des hors-la-loi : un hostile ne peut ouvrir une porte fermée, mais franchit une porte déjà ouverte même interdite. Propriétaires neutres et diplomatie restent absents. Les pièces et toits construits disposent désormais de leurs contrats distincts ; V38 ajoute les [échanges thermiques](temperature.md). Une porte ouverte échange plus rapidement, sans devenir une brèche dans le graphe des pièces. L'orientation couvre les axes des voisins présents ; les départages de clôtures et configurations complexes de portes restent à compléter. Aucune équivalence binaire ou conformité numérique complète revendiquée.
