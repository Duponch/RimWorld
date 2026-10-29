# Phase physique des instantanés de campagne sans carte

Le producteur de campagne transmettait déjà `phaseCore297`, la fraction réellement jouée du tick civil. Le lecteur de campagne sans carte omettait ce champ dans son contrat strict. Depuis le schéma297, une publication normale pouvait donc être refusée lorsque la présentation passait à une campagne sans carte locale sélectionnée. Le transport géographique conserve ce champ ; le retirer aurait perdu une partie de l'horloge réelle.

Le [lecteur de projection](../../src/sim/world-map-projection-save.ts) admet maintenant ce champ pour297 et applique son [contrôle de phase existant](../../src/sim/core-phase-297.ts). La phase reste une donnée propre, énumérable et entière comprise entre0 et9, liée à un tick sûr. Le contrat historique conserve l'absence du champ. Les propriétaires locaux, budgets de chemins et champs inconnus restent refusés dans cette projection.

Le correctif comprend trois changements ciblés dans un lecteur. Le garde des origines WorldPawns297 demeure identique. Schéma, horloge, propriétaires matériels et règles de simulation restent inchangés.

## Vérification

Les deux nouveaux contrats ont échoué sur le lecteur précédent puis réussi avec le correctif, avec les mêmes corps de tests :

- [Publication réelle aux phases0 et7](../../tests/world-map-campaign-phase-v297.test.ts) : sept Core sont effectivement joués dans la seconde branche, puis une commande normale sélectionne la vue sans carte. Le producteur, l'encodeur et le décodeur public doivent conserver cette phase sans modifier l'entier source, les personnes, les biens ou les budgets.
- [Refus et continuité du lecteur](../../tests/world-map-campaign-phase-admission-v297.test.ts) : absence, valeur indéfinie, phase hors limites, fraction, propriété masquée, accesseur et faux budget local sont refusés. Aucun accesseur n'est lu ; la même révision valide reste ensuite admissible.

Le nom historique du générateur de test contient255, mais sa préparation crée ici le schéma courant297. Ces contrats ne prétendent pas certifier une recharge historique255 ou263. Les contrôles intégrés couvrent aussi les six contrats voisins de [transport des cartes](../../tests/world-map-transport-v255.test.ts).

## Coût et limites

Le chemin modifié ajoute un contrôle scalaire de taille constante à l'admission d'une publication de campagne sans carte. Il ajoute un champ conditionnel à la liste de clés déjà vérifiée. Il n'ajoute aucune tâche à la boucle de simulation, aucun parcours du monde ni cache conservé. Cette analyse de portée et les contrôles fonctionnels ne constituent pas une mesure d'égalité du coût CPU, des FPS ou du GPU.

La dette `PERF-V492-X6` demeure ouverte : recul mesuré de9,98 à11,28% du débit de simulation à×6, temporairement accepté. La latence froide Home observée à2089,7ms conserve également son diagnostic à mener. Ce correctif ne clôt aucune de ces deux limites.

Les reçus détaillés et la reprise du chantier de victoire restent désignés par le [checkpoint courant](../../tmp/victory-resume-v493/progress.md). Les sept contrats privés acquis pour l'entrée de Site et le transport298 sont distincts de ces contrats produit297. La campagne humaine exclusive94de/T3328 reste préservée. Une publication Cloudflare doit être attestée séparément du commit.
