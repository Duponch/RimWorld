# Propreté, nettoyage et revêtements

## Aspect des traces V107

Les six espèces utilisent maintenant des surfaces transparentes au sol, aux contours irréguliers et fondus : une surface par épaisseur physique, de 1 à 5. Terre et cendres sont poudreuses ; le sang et les fluides forment des projections avec petites gouttes satellites. La terre a une teinte alpha de 97/255, le sang et le vomi de 180/255 ; l'alpha final dépend aussi du motif. Les cendres s'étalent sur une base de trois cases. Ce principe vient du [Core local 1.6.4871](../research/filth-visual-reference-v107.md), les dessins restent originaux. L'opacité augmente là où les couches se recouvrent, pas uniformément sur toute la case.

Les offsets, rotations et variantes sont déterministes par cellule, espèce et couche, sans RNG métier. Ajouter ou nettoyer une couche ne déplace pas les autres. Un atlas RGBA de 24 motifs (1024×384), calculé une fois à la création du renderer, alimente un seul lot de plans instanciés avec lumière locale et ombres reçues. Les attributs restent résidents et ne sont réécrits que si des traces changent ; la caméra ne régénère rien. Précompilation sur carte vide et libération des ressources explicites. Les anciens petits volumes opaques sont supprimés.

Présentation seulement : schéma **106**, règles d'apparition, propreté par trace (indépendante de l'épaisseur), nettoyage, péremption et sauvegardes inchangés. `cleaned` compte les traces entièrement retirées, pas chaque couche. La traînée Core `BloodSmear`, distincte des éclaboussures, reste absente. [Validation et limites](../history/validation-filth-v107.md).

V89 **validée dans son périmètre**. [Recherche et valeurs Core](../research/cleanliness-floors-reference-v89.md), [preuves communes](../history/validation-hygiene-v89.md). Les contrôles physiques, la continuation, les clics et les mesures de charge sont distincts du pilote de colonie avec reprises : neuf sols et douze traces réellement nettoyées à son terme, sans prétendre assainir toute la carte.

## Frontières

`filth-rules.ts` définit espèces, couche au sol, pieds et PRNG privé. `filth.ts` gère dépôts, transfert au pied, pluie et disparition. `filth-room.ts` capture le score de pièce. `cleaning.ts` porte sélection, réservation et geste physique ; `filth-save.ts` valide les états. `flooring.ts` définit les sept revêtements et les transactions de finition/retrait ; `flooring-save.ts` valide la couche persistée et les cibles des chantiers.

Le World porte un état de traces facultatif. Une ancienne sauvegarde ne reçoit ni traces ni pieds sales inventés. Les traces ont identité globale, position, espèce, épaisseur de 1 à 5, date du dernier épaississement, durée d'expiration et échéance de contrôle. Elles coexistent avec les piles et les services, sans devenir un obstacle. Le PRNG dédié et les échéances sont persistés. Le registre d'entretien compte uniquement des actions réellement achevées, sans transformer les traces en matière transportable.

`Tile.floor` est une couche facultative ; `Tile.terrain`, minerai et pierre dessous ne changent pas à la pose. Un plan `lay-floor` utilise la même propriété matérielle `owner:job` et les mêmes livraisons/réservations que les bâtiments. Le revêtement fini n'est pas un bâtiment solide. `remove-floor` désigne la couche exacte ; les restitutions et pertes sont prévalidées avec la capacité réelle du sol. Un refus ne modifie ni matière, ni couche, ni RNG. Les piles, arêtes déjà capturées et bâtiments restent présents. Une zone agricole ne fait pas pousser à travers un revêtement.

## Actions et consommateurs

Nettoyage suit le foyer manuel et la priorité Travail `clean`, défaut 3. Une tâche ne réserve que ses traces, pas le transit civil. Les couches disparaissent une à une au contact après le travail vérifié ; les progrès incomplets appartiennent au geste interrompu. Un ordre de pièce vérifie accès et foyer et peut viser une trace fraîche ; la sélection automatique attend 600 ticks Core après son épaississement. L'ordre n'autorise pas une aspiration distante de toute la salle. Les besoins urgents, incapacité et cargaisons suivent les frontières ordinaires des interruptions.

`roomCleanliness(world,cell,capture?)` renvoie un nombre pour une pièce, `null` pour l'extérieur relié au bord, une porte seule ou un emplacement sans score de pièce. Il additionne revêtements/terrains, traces distinctes et objets à contribution vérifiée, sans multiplier la saleté par son épaisseur. Les consommateurs fixent leurs propres règles extérieures : intoxication lors de la production et capture médicale lors du soin. Aucun score d'hôpital propre n'est inventé.

`captureCleanliness(world)` est une vue **d'une seule décision synchrone**. Elle lit la topologie une fois et agrège localement les objets, puis peut servir à plusieurs requêtes de cette décision. Elle est abandonnée avant toute modification de trace, sol, mur ou porte. Pas de cache basé seulement sur le tick ni d'invalidation supposée par identité d'array. Les pieds se traitent à l'arrivée réelle de cellule ; le traitement des traces parcourt les traces actives, pas toute la carte pour chaque trace.

## Invariants et limites

- V88 est validée avec ses exclusions historiques avant migration V89 neutre ; les nouveaux champs sont interdits aux anciennes versions. La nouvelle priorité Nettoyage vaut 3 sans inventer de tâches ou de salissures passées.
- Une salissure ne consomme ni place de pile ni aliment ; une destruction réelle précède ses cendres. Les pertes de matériau restent dans les registres de destruction existants. Un plancher bois sous un feu au sol vieux de 7 500 Core devient un plancher brûlé, non inflammable, sans restitution ; trois bois sont comptés perdus. Retirer cette trace brûlée ne restitue rien.
- Annuler/interrompre libère uniquement les réservations concernées ; la matière déjà livrée ou portée reste identifiable.
- Construction, retrait, saleté et nettoyage partagent la continuation exacte sauvegarde/reprise ; les tirages filth ne modifient pas le PRNG de combat ou d'événements.
- Les autres sols, maladies, bénéfices médicaux d'équipements absents et nettoyages automatiques de confort restent hors tranche. La [recherche](../research/cleanliness-floors-reference-v89.md) explicite les différences d'ordonnancement par rapport à Core.

Les cadres de revêtement restent praticables sans délai de cadre ni interdiction d’arrêt ; les meubles, piles et arêtes conservent leurs règles. Pose sous mur/climatiseur refusée, sous porte/meuble permise. Taille de pierre (300 points) est connue seulement aux nouveaux Atterrissages forcés révision 4 ; Forge (700 points) reste à rechercher. Les anciennes parties ne reçoivent aucune connaissance rétroactive. Le sol construit est une couche : la zone agricole reste présente, avec fertilité nulle jusqu’au retrait.
