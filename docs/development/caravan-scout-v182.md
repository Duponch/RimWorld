# Reconnaissance et retour — V182

Première tranche de voyage bornée. [Recherche Core](../research/caravan-core-v182.md), [preuve V182](../history/validation-scout-v182.md). Le globe, les destinations commerciales, les animaux et les groupes restent différés. Le calendrier reste dans [ROADMAP](../ROADMAP.md).

## Boucle bornée

Monde permet de préparer une reconnaissance de six heures avec un seul colon et deux ou trois rations de survie existantes. Ces limites et le circuit abstrait de retour au même foyer sont des adaptations locales, pas des distances ou durées Core. Aucun gain, découverte, achat ou ressource ne récompense artificiellement cette sortie.

Le colon charge au contact d'une pile réellement accessible, conserve l'identité d'une pile entière ou crée une division avec les conditions conservées, puis marche jusqu'à une bordure accessible. L'intention réserve la quantité sélectionnée aux autres consommateurs. Les commandes concurrentes et l'annulation ne détruisent jamais les provisions : avant la sortie, les rations déjà chargées restent dans son inventaire personnel. Monde permet alors de les décharger sur la case actuelle libre du colon ; une case saturée refuse toute l'opération. Au retour normal, les restes sont déposés sur la case d'entrée, sans fusion ni perte d'identité. Les rations inventoriées ne sont plus disponibles dans le stock colonial. Le déchargement général d'autres cargaisons reste différé.

Le voyage n'est publié qu'une fois le colon arrivé à la bordure, sans arête active, travail, cargaison de travail ni état incompatible. Il doit être sain, mobile, suffisamment reposé (au moins 50 %) et nourri ; maladie, blessure, intoxication, crise, prison, mobilisation et combat sont exclus de cette première sortie. Les autres personnes doivent pouvoir rester en sécurité sur la carte. L'échec ou l'obstruction bloque ou annule la préparation sans téléportation.

Hors carte, un propriétaire unique conserve le Pawn et ses possessions originales. Faim et repos évoluent avec les facteurs existants ; une ration de survie est consommée lorsque la jauge de nourriture atteint 30 %. Les souvenirs et compétences périment au tick confirmé, et l'âge avance selon les règles existantes, y compris leur RNG d'anniversaire. La randonnée de six heures ne comprend ni camp ni sommeil ni nouvelle exposition climatique. Le retour attend une case de bordure réellement libre et admissible, reliée à un résident capable s'il en reste ; une carte fermée ne supprime pas le voyageur. L'attente de retour n'allonge pas artificiellement la marche : le voyageur attend hors carte avec les besoins conservés après la fin de ce circuit borné. Cette limite apparaît dans l'interface. Le patrimoine et la population des incidents restent ceux de la carte ; aucune simulation d'incidents mondiaux n'est ajoutée.

## Propriétaires et sauvegarde

Schéma 171 : valider strictement 170 avant migration neutre de version seule. Aucune sortie, provision ou histoire rétroactive. Le registre hors carte ne coexiste jamais avec une copie sur la carte. Les liens sociaux et souvenirs continuent de résoudre les mêmes identifiants. Les possessions, équipements et vêtements sont distincts ; meubles, animaux et objets de travail ne partent pas dans cette tranche. La possession d'un lit est libérée au départ pour ne pas conserver de réservation spatiale hors carte.

La validation réutilise les contrôles ordinaires des personnes et possessions dans une vue de registre unifiée sans mutation ; seul le voyageur hors carte est exclu des contraintes de position locale. Le manifeste et son propriétaire sont contrôlés séparément avant cette projection. Refus atomique et reprise exacte sont requis à chargement, sortie, consommation et retour. Aucun RNG ne sert au trajet abstrait.

## Présentation et coût

Le panneau Monde annonce explicitement la préparation, le voyage et l'attente de retour, avec besoins et possessions. Une personne hors carte n'a aucune instance rendue. L'avancement du circuit est déterministe, borné à un voyageur ; aucun traitement de route mondiale, maillage ou upload par image n'est ajouté. Cette borne n'est pas une mesure de coût CPU/GPU nul.

## Exigences de contrôle

Chargement physique, exclusion des réservations, conservation et division, annulation avant/après chargement, refus sans mutation, sortie réelle, alimentation identifiée, retour obstruction puis libération, reprise à chaque phase, anciennes sauvegardes sans voyage ajouté, rejet de champs futurs/identités dupliquées, passage worker/snapshot et parcours par le panneau Monde. Une colonie de test préparée doit exécuter ces transitions réelles.
