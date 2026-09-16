# Repas et couchages physiques — origine V3, état courant V18

V47 ajoute le [repos médical volontaire](tending.md) : rejoindre un lit ne donne rien à distance ; posture allongée, sommeil réel et faim restent distincts. Le choix médical est aussi disponible au coucher d’un blessé ; les colons sains conservent le sommeil ordinaire.

V46 exclut les lits médicaux du sommeil ordinaire et introduit leur utilisation physique après un [secours](rescue.md). Posture médicale, sommeil, propriétaire et réservation restent distincts.

Livraison du 13 septembre 2026. Référence : chapitre 14 du corpus utilisateur, SYS-026..027/039/044/076..080, UI-016/026, TEST-189 ; adoption des actions effectives, des réservations et de la continuation. La demande utilisateur interdit de remplacer ces interactions élémentaires par des raccourcis. Leur correction passe avant les zones nommées, sans déclarer G1 terminé.

## Règles et portée

`src/sim/needs.ts` distingue les jauges et les tâches qui les satisfont. Une tâche de besoin est exclusive du travail et du transport. Le colon réserve une quantité de nourriture au sol, s'en approche par la navigation du jeu, la prend en main, choisit une place, y transporte sa portion puis l'ingère pendant une durée définie. La nutrition n'est accordée qu'à la fin. Une interruption avant ce point dépose l'objet intact, sans bonus partiel ; une reprise recommence l'action. Les réservations de nourriture et de transport partagent les mêmes quantités disponibles.

Un colon fatigué préfère son lit accessible, sinon choisit un lit inoccupé par un propriétaire. Attribution durable et réservation temporaire sont distinctes. La destination de sommeil est la case d'ancrage, jamais une simple case voisine. Un obstacle permanent exclut le couchage ; une occupation temporaire est gérée lors du déplacement. Réattribuer un lit libère l'ancien dormeur, qui peut quitter l'emprise avant de se coucher ailleurs. Sans lit admissible le repli est le sol ; à repos nul, le colon peut s'effondrer sur place. Depuis V14, le transit civil permet le partage des cellules ; lits, repas et postes conservent leurs réservations d’utilisation.

La référence permet de manger sans table et de dormir au sol. Les [tables](https://rimworldwiki.com/wiki/Table_(1x2)) offrent un lieu de repas avec siège et des conséquences d'humeur ; elles peuvent être ignorées lorsqu'elles sont trop éloignées. Le [repos](https://rimworldwiki.com/wiki/Rest) distingue fatigue et effondrement. Le [menu des horaires](https://rimworldwiki.com/wiki/Menus) sépare décisions de tâches, sommeil et réveil pour faim critique. Ces pages ont été consultées le 13 septembre ; elles ne certifient pas tous les coefficients de notre moteur.

Les [ordres directs V17](player-orders.md) retardent les besoins ordinaires pendant leur exécution, sans figer les jauges. L’effondrement reste une interruption ; Maj derrière un repas attend sa fin physique.

## Paramètres et domaines associés

Le temps reste à 10 Hz et 6 000 ticks/jour. La faim adulte baisse de 160/6 000 points/tick, pondérés par catégorie ; l'ancien profil alimentaire conserve 0,015. Quantité ingérée, aliments et sélection sont décrits dans [aliments](food-items.md). La nourriture reste physique pendant les 50 ticks d'ingestion.

Le [contrat Horaires V12](schedules.md) définit désormais le départ au lit, les réveils, la baisse de repos adulte par catégorie, l'épuisement différé et la migration historique. Il remplace les anciens coefficients de fatigue et le verrou de cinq points pour les nouvelles parties. Le lit normal récupère 100 points en 10,5 h ; le sol à 80 %. L'intégration et la cadence des interruptions restent adaptées à notre moteur.

Tables, confort et souvenirs : [repas à table](dining.md). Cuisine : [feu et factures](cooking.md). Fraîcheur et pourriture : [conservation](food-preservation.md). Les régimes partagés et [deux familles de loisirs](recreation.md) sont livrés ; les autres activités, les préférences contextuelles complètes, la malnutrition et les maladies restent absentes ; cette chaîne ne clôt pas tout le domaine survie.

## Persistance et limites de ressources

`Pawn.need`, `bedId` et `needCooldown` entrent dans le schéma 3. Les phases, propriétaire de portion, progression, destination, route et cadence sont sérialisés. La validation refuse tâches simultanées, ingestion sans portion, nourriture surréservée, propriétaire de lit dupliqué et dormeur hors de sa destination. Un trajet devenu bloqué reste valide à sauvegarder : sa réévaluation appartient au tick suivant.

V2 est validé avant migration : terrain, tick, IDs, piles, quantités, trajets de travail, cargaisons et progression restent identiques. Les nouveaux champs sont initialisés ; un ancien dormeur sur place devient disponible et réévalue son couchage au prochain tick, sans changer de case ni de jauge au chargement. V1 conserve sa migration matérielle et initialise aussi ces champs. Les clés locales restent identiques. La tranche V4 a introduit places, confort et souvenirs ([dining.md](dining.md)). Cette évolution atteignait V16 : V5 a introduit types et quantités alimentaires, profils adulte/historique ([food-items.md](food-items.md)), puis V6–V9 ont étendu sol/déplacement/plantes/cultures et dégagement, V10 les recettes et le combustible, V11 la fraîcheur et les pertes alimentaires ([conservation](food-preservation.md)), V12 les horaires et le profil de repos ([migration](schedules.md)), V13 les régimes alimentaires partagés ([migration](food-policies.md)), V14 le passage civil et les réservations de service distinctes ([migration](spatial-motion-storage.md)), V15 les loisirs et V16 les chantiers ([migration](construction.md)). La continuation est exacte au sein de ce schéma ; les migrations conservent les champs et règles explicitement décrits.

Déposer un objet porté change son propriétaire en conservant son ID ; aucune nouvelle identité n'est nécessaire. Prendre une portion entière réutilise aussi son ID. Un fractionnement vérifie les plafonds de piles et d'identités avant toute mutation. La sélection des besoins partage le plafond de huit recherches par tick avec les travaux et réessaie toutes les vingt ticks si nécessaire ; un budget épuisé n'est jamais assimilé à un chemin inaccessible.

## Représentation et validation

Le rig huit os utilise TSL sur GPU, avec pose d'ingestion et nourriture en main. Les dormeurs utilisent le centre du lit, la hauteur du matelas et son orientation ; seules les poses d'instances sont transmises, sans animation osseuse CPU. Les lits V1 gardent leur ancienne emprise 1×1 : le personnage adulte peut visuellement en dépasser.

Les deux scénarios de besoins existants sont enrichis : accès fermé puis ouvert, dernière portion disputée, concurrence repas/transport, ingestion interrompue, allocation d'identités épuisée, lit distant ou inaccessible, réattribution pendant sommeil, étapes sauvegardées, reprise exacte et mutations invalides. La fixture V2 a été produite avec le moteur du commit `489b98a`, pas en supprimant arbitrairement les nouveaux champs. Le soak des cinq graines continue de vérifier les bilans à chaque tick.

Le parcours navigateur dédié passe par les commandes UI, le worker, la sauvegarde et le rendu, avec deux orientations de lits. `node --experimental-strip-types scripts/needs-bench.ts` mesure séparément la simulation sur 64²/250², trois/cent colons, chacun avec nourriture et lit. Il contrôle les repas consommés et les lits effectivement occupés. Ce scénario ouvert n'est ni un test de foule congestionnée ni une mesure de FPS. Résultats exécutés et limites : [validation](validation.md).

V44 complète l’épuisement : le travail cesse même si l’objet porté ne peut être déposé. Le colon dort avec une cargaison conservée, puis la pose lorsque le sol proche est libéré ; sommeil/réveil et pourriture sont indépendants de l’ancienne tâche. [Contrat et migration courants](interrupted-cargo.md).
