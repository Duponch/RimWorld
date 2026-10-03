# Faune affamée et sortie physique — V186

## Décision du joueur et périmètre

V186 complète la présence renouvelée de la faune : un animal sauvage qui n'a plus de nutrition et ne trouve aucun aliment accessible peut chercher à quitter la carte. Le joueur peut protéger les réserves du foyer, chasser ou apprivoiser avant son départ, ou remettre un aliment admis sur une route accessible. Une désignation de chasse ne réserve pas l'animal sur la carte. Les animaux domestiques demeurent sous leur gestion existante et **ne sont jamais supprimés par cette sortie**.

Ce lot ne livre pas de prédateur, reproduction sauvage, migration saisonnière ou simulation écologique hors carte. La [recherche Core](../research/wildlife-exit-core-v186.md) distingue le sous-arbre de famine vérifié de nos adaptations. Il complète [faune](wildlife.md), [diversité](fauna-diversity.md), [santé animale](animal-combat.md), [chasse](hunting.md) et [élevage](domestic-animals.md), sans changer leurs filières viande, cuir, lait ou laine.

## Contrat de transition

Le seuil de déclenchement est la catégorie famine, soit une nutrition nulle, sans délai de famine inventé. Au prochain choix alimentaire admissible, l'animal cherche d'abord un aliment réel sur toute la carte. Les réservations, propriétaires, régimes, portes et obstacles restent applicables. Un aliment éloigné mais accessible prime sur la sortie. Sinon, un bord praticable et atteignable devient une destination, à l'allure de marche propre à l'espèce. Une enceinte fermée ne peut être franchie ni cassée pour réussir la sortie.

Le chemin au bord le moins coûteux avec départage déterministe adapte le choix aléatoire Core. Le même champ de navigation sert au dernier essai alimentaire et au repli vers la bordure ; pas de seconde inondation globale après un échec. Un obstacle ajouté est revalidé sur chaque arête. La cellule logique peut déjà être celle d'arrivée, mais le retrait attend **la fin physique du segment**, puis un dernier contrôle alimentaire.

Pendant le trajet, la nourriture est réexaminée tous les cent ticks locaux, sous le budget partagé. Une route vers un aliment réel peut annuler le départ sans gain de nutrition à distance. Ce retour alimentaire est une adaptation locale explicite ; il n'est pas présenté comme une réévaluation Core constante du job de sortie. Le compteur de cent ticks est le rythme local déjà employé pour une recherche affamée en échec.

Fuite, feu, riposte, étourdissement, incapacité et interaction physique tenue priment sur la sortie. Le sommeil déjà engagé reste protégé ; une famine ne réveille pas artificiellement l'animal. Une intention de départ, un repas et un danger ne peuvent posséder simultanément ses routes.

Au bord, les ordres humains ciblant l'identité doivent être annulés sans matière créée, travail réussi fictif ni récupération de coup supprimée. Une récupération de mêlée qui référence encore l'animal retarde le retrait jusqu'à son expiration. Le départ ne produit ni cadavre ni viande et ne réutilise jamais son ID. Les liens de parentage historiques ne supposent pas qu'un parent soit encore présent sur la carte.

## Sauvegarde et présentation

Schéma **174**, avec validation stricte de **173 avant migration neutre**. Aucun animal, destination, départ, compteur ou tirage n'est ajouté à la migration. L'intention facultative `exiting` conserve destination de bord et prochain contrôle alimentaire ; les chemins et segments existants conservent la marche. `exitedAnimals` est absent avant le premier départ, puis compte les sorties effectivement achevées, sans registre d'animaux hors carte. Les champs futurs sont refusés sous 173.

Le bridge publie les débuts et fins d'intention au tick confirmé ; le contrôle de forme du départ refuse atomiquement un snapshot incohérent. L'inspection et la liste Faune expliquent l'activité. Aucun modèle, squelette CPU, matériau, draw ou système de particules n'est ajouté : les animaux marchent dans leurs lots GPU existants.

## Validation ciblée et coûts

Contrôler alimentation prioritaire et concurrente, bord inaccessible, obstacle ajouté, segment d'arrivée inachevé, dangers/sommeil/domestiques, annulation de références humaines, compteur atomique et reprise en trajet. Rejouer les familles faune, santé/mêlée/chasse et élevage touchées ; migration stricte et delta de même tick ont leurs témoins négatifs indépendants. La scène de menu préparée et son parcours UI/worker se distinguent d'une campagne naturelle.

Le budget partagé reste **une recherche potentiellement mondiale par tick animal**, avec priorité tournante. Une recherche et les vérifications de nourriture ont un coût CPU ; aucun coût nul ni gain général n'est annoncé. Rendu, simulation et transport se contrôlent séparément. La [preuve V186](../history/validation-wildlife-exit-v186.md) consigne les résultats exécutés et leurs limites ; cette description du contrat ne constitue pas une validation.
