# Repas et couchages physiques — origine V3, état courant V4

Livraison du 13 septembre 2026. Référence : chapitre 14 du corpus utilisateur, SYS-026..027/039/044/076..080, UI-016/026, TEST-189 ; adoption des actions effectives, des réservations et de la continuation. La demande utilisateur interdit de remplacer ces interactions élémentaires par des raccourcis. Leur correction passe avant les zones nommées, sans déclarer G1 terminé.

## Règles et portée

`src/sim/needs.ts` distingue les jauges et les tâches qui les satisfont. Une tâche de besoin est exclusive du travail et du transport. Le colon réserve une portion au sol, s'en approche par la navigation du jeu, la prend en main, choisit une place, y transporte sa portion puis l'ingère pendant une durée définie. La nutrition n'est accordée qu'à la fin. Une interruption avant ce point dépose l'objet intact, sans bonus partiel ; une reprise recommence l'action. Les réservations de nourriture et de transport partagent les mêmes quantités disponibles.

Un colon fatigué préfère son lit accessible, sinon choisit un lit inoccupé par un propriétaire. Attribution durable et réservation temporaire sont distinctes. La destination de sommeil est la case d'ancrage, jamais une simple case voisine. Un obstacle permanent exclut le couchage ; une occupation temporaire est gérée lors du déplacement. Réattribuer un lit libère l'ancien dormeur, qui peut quitter l'emprise avant de se coucher ailleurs. Sans lit admissible le repli est le sol ; à repos nul, le colon peut s'effondrer sur place. Les embouteillages entre agents actifs restent un problème général de navigation.

La référence permet de manger sans table et de dormir au sol. Les [tables](https://rimworldwiki.com/wiki/Table_(1x2)) offrent un lieu de repas avec siège et des conséquences d'humeur ; elles peuvent être ignorées lorsqu'elles sont trop éloignées. Le [repos](https://rimworldwiki.com/wiki/Rest) distingue fatigue et effondrement. Le [menu des horaires](https://rimworldwiki.com/wiki/Menus) sépare décisions de tâches, sommeil et réveil pour faim critique. Ces pages ont été consultées le 13 septembre ; elles ne certifient pas tous les coefficients de notre moteur.

## Paramètres connus, sans prétention de parité complète

| Paramètre | Décision actuelle |
|---|---|
| Temps | 10 Hz, 6 000 ticks/jour inchangés. |
| Faim et repos éveillé | 0,015 et 0,008 points/tick conservés depuis V2 ; aucune conversion des jauges chargées. Calibration nutritionnelle et profils encore ouverts. |
| Aliments | Une portion générique, +35 points, 50 ticks d'ingestion. Le résultat d'une récolte n'est pas encore un type nutritionnel distinct de repas cuisiné. Paramètres provisoires, pas des valeurs RimWorld vérifiées. |
| Décision | Cherche à manger à 30 ; cherche à dormir à 30 ; faim critique pendant sommeil à 12,5. Horaires, alimentation autorisée, inventaire de repas de secours, température et danger ne sont pas implémentés. |
| Repos en lit | `100 / (6000 × 10,5 / 24)` points/tick : durée de récupération totale de 10,5 h de jeu convertie à notre journée. Lit sans qualité ni modificateurs. |
| Repos au sol | 80 % du lit, coefficient local à vérifier avec le futur mobilier. Fin de sommeil à 100. |
| Épuisement et faim simultanés | Effondrement déterministe à zéro. Au réveil pour faim critique, un minimum de 5 points de repos évite une boucle dormir/se relever avant toute ingestion. Adaptation provisoire explicite ; l'effondrement probabiliste et ses profils de référence restent à étudier avec santé/horaires. |

Tables/tabourets, transport vers une place réservée, confort progressif et souvenir sans table sont désormais livrés : [contrat et recherche](dining.md). Cuisine, types d'aliments, pourrissement, horaires, malnutrition et maladies restent **absents**. Cette tranche livre les actions physiques actuelles ; elle ne clôt pas tout le domaine survie.

## Persistance et limites de ressources

`Pawn.need`, `bedId` et `needCooldown` entrent dans le schéma 3. Les phases, propriétaire de portion, progression, destination, route et cadence sont sérialisés. La validation refuse tâches simultanées, ingestion sans portion, nourriture surréservée, propriétaire de lit dupliqué et dormeur hors de sa destination. Un trajet devenu bloqué reste valide à sauvegarder : sa réévaluation appartient au tick suivant.

V2 est validé avant migration : terrain, tick, IDs, piles, quantités, trajets de travail, cargaisons et progression restent identiques. Les nouveaux champs sont initialisés ; un ancien dormeur sur place devient disponible et réévalue son couchage au prochain tick, sans changer de case ni de jauge au chargement. V1 conserve sa migration matérielle et initialise aussi ces champs. Les clés locales restent identiques. Le schéma courant est V4 : migration des repas, confort et souvenirs dans [dining.md](dining.md). La continuation est exacte au sein de V4, pas entre les règles de V2 et V3.

Déposer un objet porté change son propriétaire en conservant son ID ; aucune nouvelle identité n'est nécessaire. Prendre une portion entière réutilise aussi son ID. Un fractionnement vérifie les plafonds de piles et d'identités avant toute mutation. La sélection des besoins partage le plafond de huit recherches par tick avec les travaux et réessaie toutes les vingt ticks si nécessaire ; un budget épuisé n'est jamais assimilé à un chemin inaccessible.

## Représentation et validation

Le rig huit os utilise TSL sur GPU, avec pose d'ingestion et nourriture en main. Les dormeurs utilisent le centre du lit, la hauteur du matelas et son orientation ; seules les poses d'instances sont transmises, sans animation osseuse CPU. Les lits V1 gardent leur ancienne emprise 1×1 : le personnage adulte peut visuellement en dépasser.

Les deux scénarios de besoins existants sont enrichis : accès fermé puis ouvert, dernière portion disputée, concurrence repas/transport, ingestion interrompue, allocation d'identités épuisée, lit distant ou inaccessible, réattribution pendant sommeil, étapes sauvegardées, reprise exacte et mutations invalides. La fixture V2 a été produite avec le moteur du commit `489b98a`, pas en supprimant arbitrairement les nouveaux champs. Le soak des cinq graines continue de vérifier les bilans à chaque tick.

Le parcours navigateur dédié passe par les commandes UI, le worker, la sauvegarde et le rendu, avec deux orientations de lits. `node --experimental-strip-types scripts/needs-bench.ts` mesure séparément la simulation sur 64²/250², trois/cent colons, chacun avec nourriture et lit. Il contrôle les repas consommés et les lits effectivement occupés. Ce scénario ouvert n'est ni un test de foule congestionnée ni une mesure de FPS. Résultats exécutés et limites : [validation](validation.md).
