# Boucherie physique et Cuisine — V79

Le lot relie une dépouille réelle à la viande, au cuir puis au repas simple. La [recherche fraîche](../research/hunting-reference.md) reprend les contrats SYS-062..064 et SYS-121..125 du corpus, les pages actuelles de statistiques, le miroir Core daté et les écarts de version. Ce premier contenu n'implémente ni élevage ni catalogue animal complet.

## Poste, ingrédients et conservation

L'emplacement de boucherie est gratuit et immédiatement posé ; il n'utilise ni combustible ni recherche. Il porte les mêmes factures ordonnées, filtres, rayon, suspension et destinations que les autres ateliers. La priorité reste **Cuisine** dans Travail. Une facture rassemble une dépouille fraîche de lièvre, physiquement portée puis déposée sur une case proche de la place de travail réservée. Un corps n'est jamais consommé à distance ni traité par deux travailleurs. Pour cette recette, « Jusqu’à X » compte la viande en réserve, sans ajouter les quantités portées ; ni cuir ni corps ne satisfont le seuil, contrairement au compteur générique des autres recettes.

`corpseFresh` exclut un cadavre pourri, même si son objet reste transportable. Le contrôle se répète pendant la tâche et lors de la reprise d'un ordre en file. Une interruption conserve le corps, sa santé, son identité et son âge ; le travail sans ouvrage inachevé redémarre à zéro. Le rechargement d'une tâche active conserve son progrès et son temps effectivement travaillé.

Le travail demande 450 ticks Core, soit 45 ticks locaux neutres, divisés par les facteurs réels du travailleur et du poste. L'emplacement applique **70 % au rendement**, pas à la vitesse. Lumière, extérieur et température restent ceux du contrat environnemental commun. Une place inaccessible ou réservée ne fournit aucun travail.

À la finition, la transaction projette l'apprentissage, les rendements anatomiques et les deux arrondis aléatoires, puis vérifie les identités, les capacités et chaque sortie avant toute consommation. Le premier produit est porté (viande ; cuir si lui seul existe). Le second produit est déposé à portée physique, y compris sur la case libérée par la dépouille. Il n'existe jamais deux cargaisons dans les mains d'un colon. Le transport courant range ensuite la viande ; le cuir au sol peut être rangé par Transport.

Un sol entièrement occupé peut libérer la case du corps pour le cuir et laisser la viande portée en attente de place : rien n'est jeté. Si les limites d'identités, de piles ou de compteurs interdisent la transaction, corps, PRNG et compétence restent inchangés ; la finition peut être réessayée. Une facture X fois se décrémente une seule fois. Les sorties partielles conservent l'identité de la partie portée.

`world.butchery` conserve les comptes de dépouilles traitées et les quantités de viande/cuir effectivement créées. Ce bilan distingue transformation et disparition par pourriture. Aucun rendement fixe « 31 viandes » n'est garanti : blessures, parties manquantes, capacités, Cuisine, emplacement et arrondis interviennent.

## Compétence Cuisine et repas

Cuisine est un profil facultatif, comme Artisanat. Une ancienne personne sans profil est évaluée au niveau zéro ; sa première recette achevée crée le profil et apprend, sans inventer de travail antérieur. Les nouveaux profils initiaux sont des choix explicites du scénario, pas une distribution générale de RimWorld.

Pour le repas simple, la vitesse utilise le score `niveau + 16 × (min(Manipulation,1,5) − 1) + 4 × (min(Vue,1,5) − 1)`, borné entre −20 et 20. La courbe vaut `0,4 + 0,015 × score` sous zéro et `0,4 + 0,06 × score` sinon. La boucherie emploie une formule différente : `(0,4 + 0,06 × niveau) × Manipulation × (0,6 + 0,4 × min(Vue,1))`, bornée à au moins 0,1. Les multiplicateurs du poste sont appliqués séparément, sans doubler les capacités.

Le rendement du travailleur est `(0,75 + 0,025 × niveau) × (0,1 + 0,9 × Manipulation) × (0,6 + 0,4 × min(Vue,1))`, borné entre zéro et 1,5. L'anatomie et les blessures affectent les rendements de base avant ce facteur et le facteur 0,70 de l'emplacement ; `corpseYield` en conserve le calcul indépendant. L'arrondi tire un nombre même pour une quantité entière, viande puis cuir.

Repas et boucherie apprennent à leur **finition réussie**, selon les ticks réellement travaillés : `ticks locaux × 10 × 0,1 XP`, avant passions, traits et saturation quotidienne. `CookingTask.workTicks` conserve ce temps ; trajets, interruption et attente après 100 % n'ajoutent aucune XP. Pour la boucherie, l'éventuel nouveau niveau influence le rendement, comme dans la chaîne de référence. Une transaction bloquée ne donne pas d'XP gratuite.

La viande de lièvre rejoint riz et baies pour dix unités par repas simple. Les anciennes factures sans filtre viande continuent à la refuser ; une nouvelle facture l'admet par défaut. Le filtre manquant signifie refus, pas permission. Le repas finit frais ; viande restante et corps gardent leurs âges propres. La compétence corrige le débit de cuisson auparavant provisoire : les anciennes attentes de durée fixe ne constituent plus la règle.

## Frontières et validation

- `cooking-statistics.ts` porte les formules et l'apprentissage projeté ; `butchery.ts` porte la transaction à deux produits.
- `cooking-*` conserve les tâches, factures, collecte, réservations et validation commune. `production-output.ts` réutilise le transport partiel.
- Schéma 78 strictement contrôlé avant 79 : aucune dépouille, recette, viande, compétence Cuisine ou durée de travail nouvelle n'est acceptée comme donnée historique. La migration n'invente aucun corps ni acquis.
- `tests/butchery.test.ts` couvre les formules, collecte/interruption, continuation exacte, apprentissage différé, deux sorties, saturation et consommation d'un repas issu de viande. Les preuves regroupées de la livraison complètent les scénarios de chasse et dépouilles.

Restent distincts : table de boucherie, autres espèces, filière de vêtements en cuir, intoxication, recettes avancées et découpe des corps humains. Le cuir livré est un matériau réel conservé et stockable ; son existence ne livre pas sa confection.
