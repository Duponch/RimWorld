# Interruption et cargaison conservée — V44 à V53

[Référence et écarts](../research/interrupted-cargo-reference.md). L'épuisement ne peut plus laisser un colon travailler parce que son objet ne trouve pas de dépôt. Cette tranche sécurise les interactions existantes avant les blessures ; les incapacités médicales sont ajoutées en V45. La [mobilisation V53](drafting.md) réutilise cette conservation en autorisant un déplacement tactique avec cargaison indéposable.

## Transition physique

À l'effondrement de fatigue, `interruptWork` annule la file et la priorité maintenue, tente le dépôt existant et libère travail, poste et destinations. Les désignations restent disponibles pour les autres personnes. Une recette abandonnée ne termine pas sa facture ; ses ingrédients déjà posés restent au sol. Les coups miniers et progressions qui se réinitialisaient le font toujours ; les dégâts à la roche ne sont pas réparés.

En cas d'échec de dépôt, `Pawn.interruptedCargo: true` conserve **un seul objet**, pile ou meuble entier, avec son propriétaire actuel. Aucun matériau, âge, identité, matériau de meuble ou propriétaire de lit n'est perdu. Ce marqueur n'est pas un inventaire personnel, n'augmente aucune capacité et ne réserve plus l'ancienne destination. Les autres colons ne prélèvent pas cet objet porté.

Le colon dort sur sa case. Le réveil suit ses règles horaires même si le dépôt est toujours impossible ; il attend alors au repos, sans prendre une autre activité. Une tentative locale se répète toutes les vingt étapes de simulation, déphasée initialement selon l'identifiant du colon. Les commandes qui réveillent les planners peuvent provoquer une réévaluation immédiate. Une case libérée par un autre transport permet le dépôt avec la même identité, sans annuler le sommeil. L'alerte et l'inspection expliquent l'encombrement. Les aliments portés vieillissent et pourrissent normalement ; l'expiration enlève le marqueur sans réveiller le dormeur ni créer de nutrition.

Les commandes civiles volontaires conservent leur prévalidation atomique : si le changement exige un dépôt impossible, elles sont refusées sans mutation. Les nouveaux ordres de travail sont refusés tant que la cargaison interrompue demeure. L'arête de déplacement déjà capturée se termine avant l'effondrement, sans seconde arête ni livraison. Ce comportement conserve la continuité V38 ; l’arrêt médical V45 conserve la translation de chute mais interdit tout nouveau pas. V53 permet aussi la fin d’une arête lors de la démobilisation avec objet conservé.

## Propriété, sauvegarde et présentation

V43 est validée strictement avant passage à V44, sans ajout de marqueur, passé inventé ou modification des objets/routes. V44 n'accepte le marqueur que s'il vaut `true`, avec exactement un objet porté et aucune tâche de travail, file, mouvement actif ou réservation de service étrangère. Le sommeil est la seule activité permise pendant cette rétention. Une sauvegarde invalide ne remplace pas la partie.

`releaseAssignments` sépare engagements et propriété ; les interruptions involontaires et le changement tactique V53 peuvent l’appeler avec un objet restant. `releaseWork` continue de conserver ses engagements tant que le dépôt volontaire échoue. `PresentationChanges` observe le nouveau marqueur ; scène, pose et cargaison suivent l'horloge commune. Les lots GPU existants lisent le propriétaire, sans nouvelle géométrie ni calcul médical par image.

Le dépôt parcourt les cases connectées dans le même ordre cardinal, rayon Manhattan douze. Un index des cellules portant une pile est construit **pendant une seule décision**, puis abandonné : pas de cache périmé après mutation. Cela évite une recherche linéaire dans toutes les piles pour chaque case candidate. Les meubles utilisent le même rejet rapide sans modifier leur exclusion des cases réservées.

## Limites et contrôles

Le rayon local, le dépôt conservant l'identité sans fusion et l'attente de libération sont des adaptations logistiques explicites, pas une preuve de parité exacte avec `ThingPlaceMode.Near`. Pas de largage à distance, nouvelle capacité d'inventaire, secours médical, portage de personne, équipement, décès ou cadavre dans V44.

Huit scénarios regroupent cargaison saturée, réveil, dégagement par un deuxième colon, repas et pourriture, production, meuble entier, migration/états corrompus/bridge, arête engagée et comparaison des dépôts contre l'ancien parcours. Le pilote de colonie relève les porteurs en attente dans son bilan. Le test navigateur rejoue sommeil, sauvegarde et dégagement par commandes réelles. La charge 3/30/100 sépare interruption initiale, ticks, copie de snapshots et résultats métier ; [preuves et limites](validation.md).
