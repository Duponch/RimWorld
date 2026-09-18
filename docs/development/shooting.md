# Tir commandé — V56

18 septembre 2026. [Sources et décisions](../research/shooting-reference.md), [guide joueur](../gameplay/player-guide.md), [preuves](validation.md). Premier ordre de tir utilisable avec le revolver équipé. Ce lot n'ajoute ni ennemi ni raid ; tous les personnages actuels appartiennent à la colonie.

## Intention, cadence et conséquence

`shoot` vise un autre personnage présent avec un groupe de tireurs mobilisés. Le worker revalide arme, manipulation, état, portée et ligne avant toute mutation ; le groupe est accepté entièrement ou refusé avec motif. Le tireur ne poursuit pas une cible hors de portée. Un déplacement déjà engagé se termine physiquement avant la préparation. La ligne, l'arme et la cible sont recontrôlées pendant la visée ; disparition, décès ou chute d'une cible initialement debout arrêtent l'ordre. Viser volontairement une personne déjà à terre reste possible.

Une case réservée au transit (table, lit, cadre, fragment…) ne devient pas un poste de tir. Si le pas engagé aboutit sur cette case, l'ordre est refusé sans modifier le trajet ; le joueur peut viser après dégagement. C'est une adaptation explicite au contrat d'arrêt V22, pas une affirmation que RimWorld applique notre interprétation 3D. La capture des cases d'arrêt est partagée pendant la seule décision synchrone et renouvelée après un impact.

`shooting-state` sépare ordre et posture. Préparation : **18 ticks Core**. Émission réelle, puis récupération : **96 ticks Core**. Dix sous-pas Core par tick local ; aucune conversion systématique en deux/dix ticks locaux. La série sans interruption émet aux dates 18, 132, 246… à partir de son origine. À chaque sous-pas, les tireurs sont traités par identifiant, puis les vols/impacts ; cette convention déterministe est une adaptation du moteur. Un décès dans un sous-pas empêche les tirs suivants, pas ceux déjà partis.

Déplacement, arrêt, changement de cible ou démobilisation annulent la préparation et l'intention ; **ils ne suppriment pas une récupération engagée**. Un déplacement attend donc sa fin. Les ordres civils sont refusés pendant cette récupération. Incapacité ou perte complète de manipulation termine la posture, sans retirer un projectile émis. Les besoins et la santé évoluent ; l'effondrement involontaire de fatigue interrompt immédiatement aussi la récupération, puis le colon dort réellement au sol. Ce n'est pas une annulation douce par le joueur. La reprise de la marche reste ordonnancée au tick local après libération, soit moins d'un tick de quantification supplémentaire.

L'émission emploie les règles déjà séparées de ligne/couvert/précision et le projectile V55 ; elle engage son PRNG avec l'identifiant et la balle. L'impact médical provient du vol, jamais du bouton ou du mesh. Tout le monde étant actuellement non hostile, les permissions emploient le profil allié et le facteur de tir ami 0,4. Pas de consommation de munition ordinaire.

## Tir et expérience

`skills.shooting` suit le contrat commun niveau/passion/milli-XP, fatigue d'apprentissage et oubli. La précision lit réellement le niveau, la Vue et la Manipulation. Les nouvelles personnes reçoivent les profils de scénario 8/5/3 et passions 1/0/0, sans prétendre générer les biographies Core.

Une émission contre un personnage non à terre donne une base de 20 XP par seconde Core du cycle, soit **38 XP avant passion** pour le revolver. Aucun gain pendant trajet/préparation annulée ; un impact réussi n'est pas requis. V58 ajoute l’appartenance explicite : 170 XP/s de cycle sur une cible hostile non à terre (323 XP avant passion pour le revolver). Le piquet de loisirs ne produit pas encore d'XP Tir : cette interaction reste explicitement ouverte.

## Persistance et présentation

V55 est validée dans son propre contrat avant V56. La migration ajoute uniquement Tir 8, sans passion/XP, et n'invente aucun ordre ni tir passé. L'ordre garde cible, arme et posture initiale de la cible ; les postures gardent leurs dates Core. Une phase inconnue, un champ parasite ou une activité simultanée incompatible est refusé.

`ShootingControls` expose un mode de ciblage explicite ; sélection ordinaire et clic droit de déplacement restent distincts. Échap/clic droit annulent le ciblage sans tir. Le corps et l'arme utilisent le rig GPU existant et font face à la cible. Les balles utilisent **un lot instancié TSL**, préparé au chargement, sans mesh individuel ni squelette CPU. Les attributs stables ne changent qu'aux émissions/arrivées, retraits et recalages ; la translation utilise l'horloge de présentation. La croissance libère les anciens buffers et conserve le programme. Temps rebases par blocs de 1 024 ticks pour limiter les pertes de précision Float32.

Les traces confirmées sont retenues brièvement afin de montrer aussi une balle née et arrivée entre deux ticks locaux. Le vol respecte la durée fractionnaire et le décalage du compte Core arrondi ; une interception raccourcit l'affichage sans ralentir rétroactivement la balle. Les phases World/HUD et les blessures restent publiées au tick local contenant l'événement ; leur résolution ne doit pas être confondue avec la position continue du projectile. Aucun rendu ne modifie World.

## Périmètre encore incomplet

V58 ajoute deux affiliations fixes, une sentinelle qui tire, la fuite civile et les collisions hostiles. Mêlée, armure, objets endommagés et dépouille transportable restent absents. Le [ralentissement temporaire du pouvoir d’arrêt](stagger.md) est ajouté en V57. Jauge graphique de visée/récupération, son et effets d’impact restent absents. La sentinelle reste statique et le tir automatique des colons mobilisés reste absent. Portraits encore schématiques, vêtements et inventaire personnel absents.

Le pilote civil conserve ses bilans et vérifie l'absence de tirs spontanés entre colons ; le parcours compagnon de tir utilise une scène contrôlée explicitement alliée. Il ne représente pas le comportement moyen consistant à attaquer ses propres colons. V58 ajoute un pilote compagnon de rencontre : blessure ennemie réelle, défense dirigée, secours, médicaments et suivi du rétablissement.
