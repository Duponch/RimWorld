# V241 — mobilier résident et saccades

Un changement de stade dans un seul pot de fleurs reconstruisait tous les meubles. Le diagnostic [V240](scene-causal-phases-v240.md) a reproduit ce déclencheur dans Les Aulnes. V241 conserve le lot graphique existant et remplace seulement les six pièces du pot concerné lorsque la signature confirme cette transition. [Contrôles, mesures et limites](../history/validation-furniture-resident-v241.md).

## Contrat

La signature conserve son texte, ses lectures et ses exceptions historiques. Elle accumule les changements de fleurs depuis le dernier remontage réussi. Une différence dans un autre champ, le contenu des colis, l'axe d'une porte, l'ordre ou le nombre de structures, une remise à zéro ou un type numérique inconnu impose le parcours complet. Une différence brute qui produit le même texte reste une barrière jusqu'au prochain remontage ; une lecture supplémentaire ne l'efface pas.

`FurniturePresentation` possède les placements produits par le constructeur complet et les plages des pots. Le chemin public mutable conserve ce constructeur. Le chemin natif utilise le mandat readonly que Core détient déjà ; il vérifie aussi le groupe, le batch, les dimensions, la coupe des murs, la gestion des couleurs et l'activité des lampes horticoles. Aucune propriété de World ou nouvelle autorité de transport n'est créée.

`BoxBatches` révoque le reçu résident à chaque remplacement complet ou nettoyage. Toutes les plages sont vérifiées avant la première écriture. Plusieurs pots sont modifiés en une opération : mêmes matrices et couleurs Float32, mêmes slots et capacités, une publication des attributs et le même calcul ordonné de la sphère englobante. Les uploads complets nécessaires sont conservés ; aucune qualité, cadence, horloge ou règle n'est réduite.

L'état local est retiré avant un parcours qui peut échouer. Core acquitte la signature seulement après le succès du remontage. Le nettoyage et la reconstruction du périphérique graphique libèrent aussi cet état. Les propriétaires, sauvegardes, réservations, moteur, PRNG et schéma 198 restent inchangés.

## Portée et décision

Le gain vise les transitions visuelles de pots dans toutes les parties utilisant ce chemin natif. Il est particulièrement utile dans une colonie avec beaucoup de meubles ; il n'accélère pas toutes les applications de scène. Les événements communs du vrai GAME passent de 12,7–14,7 à 2,5–3,4 ms pour `buildStructures`. Les FPS moyens de l'ABBA restent identiques à la dispersion près : **104,94 → 104,63 RAF/s**. Ce lot est retenu pour la réduction des saccades, sans annoncer un gain FPS moyen.

Le coût du cache est payé sur les remontages complets. La contrepartie mixed trouve un surcoût de 0,02 puis 0,31 ms par remontage en moyenne sur deux cycles ; les résultats froids et les pointes varient. Cette limite accompagne la livraison. La cible proche de 240 FPS à 6× demeure ouverte ; la suite autorisée vise les matérialisations et calculs continus, avec coût complet mesuré avant adoption.
