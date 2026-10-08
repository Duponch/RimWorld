# V209 — Continuité, validation et cadence de développement

## Consigne de méthode du 8 octobre 2026

La reprise fonctionnelle privilégie des lots larges réunissant une boucle jouable cohérente et ses dépendances.
Réutiliser les recherches locales ; compléter seulement les règles encore inconnues.
Implémenter le code avant de constituer le dossier de clôture ; garder les documents courts et utiles.
Vérifier les frontières sensibles par des tests ciblés, puis regrouper la régression commune après plusieurs sous-lots.
Réserver les campagnes lourdes aux jalons périodiques ou aux risques transversaux identifiés.
Cette méthode vise un meilleur rendement, sans promesse d’accélération de développement par dix.

Consolidation demandée le 4 octobre après l’[audit du code et de Core](../history/audit-code-core-2026-10-04.md). Schéma 190 conservé, aucune nouvelle mécanique. La [preuve V209](../history/validation-consolidation-v209.md) distingue corrections produit, réparation des oracles, mesures et contrôles encore ouverts. La [réponse au rapport externe](../history/analysis-external-agent-2026-10-04.md) motive la nouvelle méthode.

## Garanties de continuité

Une acquisition tactique retire la route stratégique avant la première recherche ; une recherche échouée restaure la route exacte. Le moteur ne change pas de contrôleur au milieu d’une arête capturée. Les réservations du planner utilisent la même capture de sources que les livraisons et reprises, y compris cuisine en file et corps à enterrer. Les lieux de loisirs empruntent la standabilité commune ; les plans et refus historiques restent distincts. L’épuisement des identifiants refuse une finition avant consommation des ingrédients et tirage de qualité. Les API de transfert et retraits locaux protègent l’identité d’un objet absent sans prétendre avoir reproduit une corruption naturelle dans les 29 anciens `splice`.

Un manhunter actif maintient la mobilisation selon le contrat de menace existant. Le pilote répond avec mobilisation, poste/refuge et attaque physiques, puis reprend son travail et ses soins après disparition de la menace. Il ne transforme pas les personnes en invulnérables et ne téléporte pas les attaquants.

Une réponse retardée de quinze secondes annonce une attente, conserve la promesse et la récupération ; elle ne prouve pas un refus. Un remplacement n’aboutit qu’après adoption du checkpoint corrélé et acquittement. Un arrêt explicite du transport ne prétend pas annuler les commandes déjà engagées. Une exception de tick, capture ou publication arrête le worker, remet la vitesse à zéro et interdit publication, commande et sauvegarde du World potentiellement partiel. Une nouvelle création ou un chargement validé permet de reprendre.

## Sauvegardes et affichage

Le dépôt asynchrone IndexedDB conserve les deux emplacements existants et leurs formats JSON ou enveloppe gzip. La migration des deux clés localStorage et de son marqueur utilise une transaction unique ; les originaux historiques sont conservés et ne sont plus réécrits en miroir. Une API IndexedDB absente permet le backend historique annoncé ; une erreur d’ouverture d’une base disponible ne substitue pas des originaux potentiellement périmés. Les échecs de transaction ou quota restent visibles et ne suppriment pas l’autre copie.

Une perte du périphérique ou une erreur fatale de rendu arrête l’animation et les interactions, libère le renderer et demande une pause acquittée. Le panneau d’incident permet de recréer l’affichage du dernier World confirmé ou de charger/créer une colonie. Cette reprise ne répare pas un tick partiel du worker. Échecs d’initialisation et de préparation libèrent le périphérique/canvas ; la perte réelle est exercée séparément des tests doubles.

Le menu est visible avant l’ouverture du dépôt : un refus de stockage au boot reste lisible et conserve les originaux. L’acceptation du remplacement est le seul point qui réarme l’état de simulation ; une faute survenant pendant la préparation graphique ne peut pas être effacée par son achèvement. La reprise du menu recontrôle également cet état après son attente.

Les matrices Travail/Horaires/Affectations gardent leur largeur et leur palette, mais leur bord inférieur se place au-dessus du bloc d’horloge réellement mesuré. Leur hauteur s’adapte avec défilement sous les portraits. Les boutons de vitesse restent accessibles à la souris lorsque la matrice est ouverte, y compris en affichage compact.

Frustums et picking prennent la convention de profondeur de la caméra WebGPU/WebGL et sa profondeur inversée. Le champ sanguin de l’herbe exige quatorze mots par colonne : 250 colonnes demandent une texture de 3 500 pixels. Si le périphérique configuré ne la supporte pas, l’herbe décorative est désactivée avec message avant allocation, sans modifier le terrain ou les pigments simulés. Ce garde-fou n’est pas une optimisation mesurée.

L’événement de visibilité coupe directement les effets sans attendre une RAF. Le premier MP3 décodé ouvre le mix pendant que les autres chargent dans la limite existante ; requête, corps et décodage ont une échéance bornée et les demandes en cours sont interrompues à la fermeture. L’essai sonore attend uniquement son propre fichier, puis relance les fichiers échoués en arrière-plan.

## Fidélité et preuves

Les bureaux de recherche lisent les bases Core 0,75 simple et 1,0 avancé ; un analyseur ajoute 0,1 avant les autres facteurs, peut servir plusieurs bureaux, à portée de huit cellules entre centres avec le test de visibilité local. Un bureau retient un seul analyseur lié, le plus proche, même si celui-ci est éteint ; un ancien lien alimenté ne le remplace pas automatiquement. Géométrie et règle de partage sont vérifiées dans Core ; l’équivalence de tous les coins du test local avec GenSight n’est pas établie. La propreté de la pièce existante intervient, sans sols stériles fictifs. L’extérieur applique les deux facteurs Core 0,75. Les installations périmées dans une intention persistée restent valides comme état durable puis sont recontrôlées au travail.

Les fixtures d’anciens schémas retirent les champs futurs avant leur validation ; les attentes de migration ajoutent uniquement les familles neutres aux propriétaires actifs. Les archives restent historiques. Pour une personne de secours déjà sortie dont les deux clés télévision manquent, seule une copie de validation reçoit les valeurs neutres ; absence partielle/corrompue et champs futurs restent refusés. Un ledger alimentaire indépendant suit les échecs de récolte réels au lieu d’imposer un rendement maximal.

La recherche technique conserve les validateurs de snapshots. Une cache, une réduction de fréquence ou un nouveau moteur ne deviennent acceptables qu’avec preuve d’équivalence des décisions, conservation et chronologie, puis mesure du sous-coût concerné.

## Cadence des prochains lots

Les corrections de continuité ne valent pas clôture de toute la dette d’architecture. L’extraction des captures/services communs est progressive ; la grande composante cyclique, les orchestrateurs volumineux, les options TypeScript supplémentaires, le lint ciblé et la pression de la file worker restent des sujets suivis. La vitesse ×6 sur la grande scène chargée n’est pas atteinte ; le profiler fournit des cibles mesurées avant une optimisation nécessitant un contrat d’équivalence. Ces limites ne sont ni des fonctionnalités livrées ni des bugs déclarés corrigés.

Un lot fonctionnel doit ouvrir un arbitrage jouable et traiter ensemble les règles et contenus qui partagent la même chaîne : une migration, une capture de réservation, une validation groupée et un parcours UI cohérent. Les biographies/incapacités de travail, la diversité des crises et des menaces, puis le monde avec groupe/destination sont les candidats prioritaires selon leurs dépendances. Une autre variante de recette ou d’objet n’est pas le prochain chantier automatique.

Le contrat se limite aux décisions/règles touchées ; la recherche déjà versionnée est réutilisée et complétée sur ses inconnues. Les agents ont des propriétaires distincts ; lectures et implémentations indépendantes se déroulent en parallèle, les tests lourds/mesures/navigateur restent successifs. Contrôles courts réunis avant intégration ; une correction rejoue ses garanties touchées. Régression et campagnes sont périodiques ou motivées par une frontière globale, pas ajoutées à chaque changement cosmétique.

Le lanceur `validate:logged` mesure les commandes réellement exécutées et conserve leurs sorties sous `tmp/validation-runs`. Une durée d’outil ne mesure pas le temps de génération de l’agent. Les synthèses sont bornées, les fixtures/UI partent de préconditions cohérentes et les échecs se diagnostiquent au checkpoint disponible. Le budget de 90 minutes sert de cible de calibration pour une boucle cohérente, sans promesse de nombre de fonctionnalités ni de parité intégrale.
