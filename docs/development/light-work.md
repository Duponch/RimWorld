# Lumière des travaux et déplacements — V37

V43 applique désormais la [compétence Construction](skills.md) aux phases concernées : vitesse relative, apprentissage seulement lors de la finition d’un cadre approvisionné et de la déconstruction à coût. Les durées du catalogue restent des unités de travail neutre.

15 septembre 2026. [Recherche précise](../research/light-work-reference.md), [lumière et ateliers](work-environment.md), [validation](validation.md). Cette tranche étend les consommateurs du champ V36 ; aucun nouveau contenu ni shader.

## Règles exécutées

Pour les adultes civils actuels, le facteur vaut 0,8 dans le noir, 0,9 à 15 % et 1 dès 30 % de lumière. La lumière est lue au colon, indépendamment de la cible et de l'apparence 3D. Finition de construction, déconstruction, retrait du meuble avant réinstallation, semis, récolte, coupe et défrichage, pose/retrait des toits incrémentent le travail au taux courant. Les recettes gardent les facteurs V36, sans double application. Aucune pénalité extérieure/pièce ajoutée aux travaux qui ne passent pas par un atelier.

Le minage capture les 100 à 125 ticks Core du coup (division flottante et mi-valeurs arrondies vers l’entier pair), puis les convertit à l'horloge locale. Extinction/allumage ne change que le coup suivant. Les dégâts restent 80 ; quantités, PRNG, dépôts et réservations suivent le contrat minier. Le report du reliquat conserve une cadence de deux coups en 25 ticks dans le noir, au lieu de deux arrondis indépendants à 13 ticks. Le dernier coup ne crée toujours aucun produit avant prévalidation du dépôt.

À chaque départ d'arête, le facteur est capturé à l'origine **après** l'attente éventuelle de porte. Durée = `3 × distance euclidienne / facteur + délai terrain/objet`. Le délai additionnel garde ses règles de non-répétition. À lumière égale, diagonale/côté conserve √2 pour la composante de marche ; un supplément fixe ne suit pas ce rapport. Une source retirée pendant le passage ne change ni l'arrivée ni la pose engagées ; l'arête suivante prend le nouveau taux. Les sorties de mobilier et tous les trajets de besoins, production et portage utilisent le même chemin.

Les règles d'ingestion, de repos, de loisirs, de prélèvement/dépôt et de recharge ne changent pas. La lumière n'altère ni capacité portée ni rendement. La pose finale d'un meuble entier reste sans travail artificiel. La croissance des plantes garde sa propre intégrale solaire, distincte de la vitesse de travail du jardinier.

## Persistance et validation

Schéma 37. `Job.progress` reste en ticks neutres entiers ; `workRemainder` représente 1 à 9 999 fractions de tick, zéro omis. Le sous-travail `clearance` possède son propre reliquat. Les incréments sont arrondis à 1/10 000 tick, pas au tick entier. Les règles d'interruption de chaque famille s'appliquent aussi à la fraction ; annulation/refus ne peuvent conserver un reliquat appartenant à une autre phase.

`Job.pickTicks` capture la cadence minière. `TravelSegment.speedFactor`, facultatif, conserve le facteur de l'arête ; absence = 1, y compris pour les anciennes arêtes. Le validateur compare la durée capturée et les délais autorisés, sans recalculer la lumière d'un passé inconnu. Les nouvelles formes sont interdites avant V37 ; NaN, infinis, fractions hors borne et durées incohérentes sont refusés.

V36 est validée strictement avant migration. Les routes, arêtes, matériaux, réservations et unités de travail restent inchangés. Un coup déjà partiellement préparé garde une durée neutre de 100 ticks Core ; les suivants utilisent la règle nouvelle. Une progression en attente acceptée par V36 reste acceptée et conservée ; les nouvelles interruptions réinitialisent le travail suivant le contrat de leur famille. Aucune fraction de travail passée n'est inventée. Les sauvegardes V37 reprennent exactement, sans persister le cache lumineux.

## Coûts et frontières

`light-environment.ts` possède le contexte de lumière seul ; `work-environment.ts` ajoute les rôles quand un atelier en a besoin. L'exécution conserve un cache dérivé par World, et au plus un contexte utile à la fois pendant le tick. Une mutation de toit/support/obstacle/source l'invalide avant le prochain consommateur. Aucun cache basé uniquement sur l'identité d'un tableau ou le numéro de tick ne cache une mutation en place.

Les trajets ne calculent aucun rôle de pièce. Le champ artificiel n'est rediffusé que si les sources ou obstacles changent ; ciel et couverture se combinent à la lecture. Le contrôle du masque reste linéaire à la carte lors d'une lecture utile. Le helper de départ d'arête peut être utilisé isolément avec son propre contexte ; la boucle de simulation lui injecte le contexte partagé. Un coup minier final réussi ne capture pas de coup suivant inutile ; un dépôt refusé conserve cette capture. Les mesures et leurs limites sont dans la [validation](validation.md). Pas de calcul par frame, nouveau compute ou changement des programmes GPU.

Les coûts de recherche restent neutres et les routes sont revérifiées physiquement. Leur coût n'est pas une ETA lumineuse. La vitesse de base locale reste provisoire (3 ticks par case) ; les capacités physiques influencent désormais la marche en [V45](health.md) ; météo et urgences de locomotion restent ouvertes. Les durées agricoles ne reproduisent pas encore tous les facteurs de croissance du consommateur Core relevés dans la recherche.

L'inspection donne le facteur dû à la lumière sur la cellule. Pendant une arête, son taux capturé peut différer de celui de la cellule logique d'arrivée. L'animation, le corps, la cargaison et la sélection suivent toujours l'arête temporelle commune.
