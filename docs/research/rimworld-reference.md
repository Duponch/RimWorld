# RimWorld : référence de gameplay et transposition en 3D

**Place de cette première recherche.** Depuis le 13 septembre 2026, le rapport HTML/PDF et le classeur fournis dans `docs/new_docs` constituent la référence fonctionnelle principale. Lire [la note d'adoption critique](reference-adoption.md) pour leurs apports, limites et correspondances avec le plan. Le présent rapport reste un complément de synthèse et de sources ; le calendrier canonique est [ROADMAP](../ROADMAP.md).

## Périmètre et niveau de certitude

La cible initiale est une simulation de colonie solo pour navigateur, inspirée des systèmes du jeu de base RimWorld PC, avec représentation 3D low poly. Les extensions constituent un réservoir de directions futures. La fidélité recherchée porte sur les décisions, règles et interactions, ainsi que sur la structure et l'organisation de l'interface, explicitement demandées par l'utilisateur. Le style visuel, les contenus, personnages, textes et assets sont créés pour ce projet. Ce document décrit une référence et des choix proposés, pas des fonctionnalités déjà livrées.

Compléments du 13 septembre 2026 : [observations vidéo horodatées et structure de l'interface](visual-reference.md), [échelles, grille et navigation de référence](spatial-design.md), [expérience de navigation GPU réellement exécutée](gpu-navigation.md). Ces notes précisent la différence entre observation, choix de projet et comportement encore à vérifier.

Les sources ont été consultées le **13 septembre 2026**. Le dernier correctif identifié dans les publications officielles consultées est **1.6.4850, publié le 8 juin 2026**. Il faut donc prendre le jeu de base 1.6 comme référence provisoire et recontrôler sa version avant toute campagne de comparaison. Le billet confirme notamment des corrections touchant les tâches, les déplacements, la construction et les vitesses de simulation.[^1]

Trois catégories distinguent les affirmations : **officiel** désigne les descriptions et annonces de Ludeon ; **communautaire** désigne les règles documentées sur RimWorld Wiki, utiles mais non certifiées pour chaque correctif ; **proposition projet** désigne une décision de conception à valider dans notre prototype. Aucune formule interne de RimWorld n'a été vérifiée par expérimentation sur un exemplaire exécuté du jeu. Les pages communautaires signalent elles-mêmes plusieurs lacunes : ce dossier ne promet donc ni exhaustivité de tous les contenus ni parité numérique.

## 1. L'expérience à retrouver

**Officiel.** RimWorld se présente comme une simulation de colonie et un générateur d'histoires. Les colons ont des compétences et histoires personnelles distinctes ; survie, psychologie, relations, climat, médecine et conflits contribuent à la partie. Le joueur construit, organise et réagit aux événements plutôt qu'il ne suit un scénario unique écrit à l'avance. La diversité des personnages et les conséquences durables des accidents sont centrales.[^2]

**Analyse.** La valeur du système réside dans ses couplages. Une blessure du cuisinier réduit la production, les repas deviennent insuffisants, la faim dégrade l'humeur, une crise mobilise d'autres travailleurs et la récolte prend du retard. Cette chaîne devient une histoire quand le joueur peut identifier ses causes et reconnaître les personnes impliquées. Une vaste liste d'objets sans ces relations produirait un constructeur de bases beaucoup moins proche de la référence.

**Proposition projet.** Organiser la progression en trois boucles : minute par minute, observer puis désigner des actions ; sur quelques jours, équilibrer main-d'œuvre, nourriture, abri et soins ; sur une saison, augmenter la capacité de la colonie tout en absorbant des crises. La pause et l'accélération font partie de l'interface stratégique. Le premier critère de plaisir sera une petite colonie dont on comprend les réussites et les problèmes, avant la richesse visuelle.

## 2. Colons, travail et autonomie

**Communautaire.** Le travail peut être configuré par catégories et priorités manuelles de 1 à 4, 1 étant prioritaire. À priorité égale, l'ordre des catégories intervient ; des sous-tâches ont également leur ordre. Certaines tâches sont interdites par les incapacités du personnage. Construire inclut notamment la livraison et l'assemblage ; transporter couvre aussi des approvisionnements. Un ordre forcé et une désignation globale ne sont pas équivalents.[^3]

L'emploi du temps influence l'arbitrage entre travail, repos et loisirs. Les politiques déterminent notamment les aliments, vêtements et soins autorisés ; les zones restreignent les lieux utilisables. Les changements de programme ne signifient pas nécessairement une interruption instantanée de chaque tâche. Les règles exactes de préemption et leurs exceptions doivent être observées en jeu avant de viser une reproduction fidèle.[^4]

**Proposition projet.** Séparer quatre niveaux : intention du joueur, tâches disponibles, attribution à un agent, exécution en étapes. Un chantier reste une intention persistante ; un colon reçoit une mission temporaire de livraison ou d'assemblage. L'inspecteur doit expliquer « manque 4 bois », « accès bloqué », « repos urgent » ou « travail désactivé ». Une priorité numérique sans justification de l'inactivité est insuffisante pour ce genre de jeu.

Les réservations demandent un contrat propre au projet : réserver une quantité dans une pile, une destination et éventuellement un poste ; valider au prélèvement ; transférer réellement l'objet ; libérer sur succès, annulation, destruction, incapacité ou changement de mission. Les sources consultées ne suffisent pas à établir le protocole interne exact de RimWorld. Il serait trompeur de le prétendre reproduit.

Prévoir des égalités déterministes pour éviter que l'ordre de parcours des entités change les décisions. Ne pas rechercher tous les travaux de toute la carte à chaque image. Une tâche inaccessible doit avoir un motif de blocage et être réévaluée lors d'un changement pertinent ; répéter indéfiniment une recherche identique gaspillerait les ressources et masquerait le défaut au joueur.

## 3. Besoins, humeurs et relations

**Communautaire.** Faim, repos, loisirs et qualité de l'environnement influencent le quotidien. L'humeur actuelle tend vers une cible construite à partir de pensées positives et négatives ; elle ne se confond pas avec leur somme instantanée. Une humeur basse peut provoquer des crises et une humeur favorable des inspirations. Les traits et les événements vécus modifient ces effets.[^5]

Les opinions entre personnages reposent notamment sur les interactions, traits et relations. Elles peuvent contribuer à des insultes, bagarres et romances. Une bagarre sociale peut produire des blessures permanentes : le système social touche donc directement la santé et le travail. L'opinion de A envers B doit être considérée séparément de celle de B envers A.[^6]

**Proposition projet.** Commencer par faim et repos, puis confort et deux ou trois pensées lisibles. Conserver dès le départ une structure de souvenirs avec cause, intensité, durée et règle d'empilement. Un événement social devra mémoriser les participants par identifiant stable. Les conséquences visibles doivent rester cohérentes après sauvegarde, disparition d'un personnage ou recrutement d'un ancien visiteur.

Les crises mentales ne doivent pas devenir un simple dé aléatoire punitif. Une trajectoire de dégradation compréhensible, une alerte et plusieurs moyens de récupération sont nécessaires. Pour équilibrer, mesurer le temps passé dans chaque zone de besoin, les motifs d'interruption et les causes d'effondrement. Les seuils numériques seront d'abord les nôtres, documentés comme tels, avant toute comparaison détaillée.

## 4. Santé, anatomie et soins

**Communautaire.** La santé repose sur des parties corporelles, blessures et capacités fonctionnelles. Vue, mouvement, manipulation, conscience et fonctions vitales influencent d'autres activités. L'incapacité n'est pas toujours la mort : elle peut permettre secours, capture et traitement. Les affections, prothèses et opérations ajoutent des conséquences durables aux dégâts.[^7]

**Proposition projet.** Introduire d'abord un modèle réduit mais extensible : torse, tête, bras, jambes ; blessures, saignement et douleur ; déplacement et travail affectés ; état au sol ; transport vers un couchage et soins. Séparer perte de capacité, perte de sang et état vital évite de devoir remplacer une simple barre de points de vie lorsque la médecine devient importante.

Le squelette graphique et l'anatomie logique seront indépendants. Une animation de marche ne calcule pas une vitesse médicale ; elle affiche une vitesse décidée par la simulation. La suppression d'un membre visuel pourra être ajoutée ultérieurement sans redéfinir les blessures sauvegardées. Un résultat de chirurgie devra expliquer ce qui a été consommé, quelles parties ont changé et quels effets persistent.

Les tests de soins couvriront notamment un médecin indisponible, le décès pendant le transport, la destruction du lit, l'épuisement du médicament et deux soignants visant le même patient. Aucun succès ne doit consommer deux fois un produit ni rendre un mort actif. Les maladies, immunités, addictions et greffes complètes viennent ensuite, avec des scénarios couvrant leurs interactions.

## 5. Combat et conséquences

**Communautaire.** La mobilisation permet de contrôler les combattants. Les tirs dépendent des obstacles et des couvertures ; un engagement proche peut conduire au corps-à-corps. La pause permet les décisions tactiques. Après le combat, soins, secours, réparation et gestion des corps prolongent l'événement. Le modèle général des armes portées n'est pas un inventaire universel de munitions ; il existe des exceptions consommables.[^8]

**Proposition projet.** La première escarmouche doit vérifier position, portée, ligne de tir, cadence, couvert, blessure, fuite et secours. La balistique logique sera indépendante des traînées et impacts GPU. Il faut pouvoir rejouer exactement la décision d'un tir, même si les particules ou animations diffèrent. La hauteur graphique ne devra jamais suggérer une protection absente du modèle logique.

Introduire les comportements adverses progressivement : avancer vers une cible, utiliser un obstacle, changer de cible si le chemin disparaît, puis battre en retraite. Siège, démolition, débarquement au cœur de la base et menaces particulières viendront lorsque la défense simple fonctionne. Les ennemis doivent interagir avec les mêmes portes, couvertures et capacités médicales que les colons.

Le test représentatif est une bataille suivie de sa récupération, pas seulement une arme tirant sur une cible immobile. Observer également les emplois abandonnés pendant la mobilisation, les matériaux transportés, les morts, les pertes de nourriture et le retour aux tâches civiles. C'est dans ces transitions que les anomalies auront le plus de conséquences.

## 6. Économie physique, production et recherche

**Communautaire.** Les zones de stockage acceptent des objets selon des filtres et des priorités. Les transporteurs peuvent déplacer un objet déjà stocké vers une destination plus prioritaire. Placer les réserves près des postes réduit les déplacements ; les étagères constituent aussi des emplacements de stockage.[^9]

Les ordres de production peuvent demander un nombre d'exécutions, un stock cible ou une production continue. Leur ordre, les ingrédients admissibles, le rayon de recherche et les restrictions de travailleurs affectent l'exécution. Certaines productions inachevées sont liées à leur auteur. La page communautaire sur ces ordres réclame une réécriture : les détails du comptage de stock doivent être confirmés.[^10]

Le commerce met en relation stock, monnaie, négociateur et spécialité du marchand. Les marchandises acceptées et la liquidité disponible sont limitées ; prix d'achat et de vente diffèrent. Des communications et balises permettent le commerce orbital. Les capacités du négociateur peuvent influencer les prix.[^11]

La recherche débloque constructions et équipements à travers des prérequis. Elle requiert des postes et du travail intellectuel ; plusieurs chercheurs peuvent contribuer au projet actif. Certains systèmes d'extension ajoutent des conditions spécifiques d'accès à la recherche.[^12]

**Proposition projet.** Les ressources doivent exister dans le monde, en transport ou dans un chantier ; un compteur global constitue une vue, jamais une seconde vérité. Un registre de mouvements permettra de vérifier les bilans : stock initial, collecte, consommation, pertes et stock final. Réserver n'est pas consommer. Annuler un plan doit produire une règle de restitution visible et stable.

Commencer par bois, aliment brut et repas, une recette et un stock cible. Ajouter ensuite pierre, métal, composants, qualité et usure. Définir les recettes et objets en données versionnées avec identifiants stables. Les variantes de matériaux doivent modifier coûts et propriétés à travers des règles communes, sans multiplier des classes particulières.

Le commerce sera un échange atomique simulé : aucune partie ne doit payer si le transfert échoue. Les transactions devront réévaluer les quantités disponibles au moment de l'engagement. Le déblocage technologique ne supprime ni les coûts ni les exigences physiques du poste ; il ouvre une possibilité dont la logistique doit encore permettre l'exploitation.

## 7. Construction, pièces, température, énergie et feu

**Communautaire.** Les pièces dépendent de l'enclosure par murs, portes et obstacles. La distinction intérieur/extérieur varie selon le système concerné : température, travail ou expérience psychologique. Il ne faut donc pas la réduire automatiquement à « une case possède un toit ».[^13] La température influence notamment conservation, croissance, travail et santé. Les portes, toits, volumes et échanges entre espaces jouent un rôle.[^14]

Les appareils électriques dépendent de réseaux reliés à des producteurs et éventuellement des batteries. Deux réseaux séparés sont indépendants. Production instantanée, demande et énergie stockée doivent être distinguées ; les consommations de veille existent pour certains appareils.[^15] Le feu peut détruire ressources, cultures et bâtiments, chauffer les pièces et perturber le comportement des personnages. La page correspondante avertit que plusieurs mécanismes numériques nécessitent une vérification après des modifications du jeu.[^16]

**Proposition projet.** Construire par étapes : plan, ressources livrées, assemblage, ouvrage terminé. Une porte mérite des propriétés distinctes : franchissable par tel agent, obstacle au tir, frontière de pièce et conductance thermique. Un mur nouvellement construit doit invalider les chemins concernés et le découpage des pièces ; un simple rafraîchissement visuel ne suffit pas.

La simulation thermique initiale peut travailler par pièce, avec température extérieure et échanges agrégés, sans résoudre un fluide 3D. En revanche, le volume doit modifier la capacité thermique. Un réseau électrique se traite comme un graphe connecté ; sa topologie change sur construction, destruction et interrupteur. Tester scission et fusion est plus utile que vérifier uniquement une lampe allumée.

L'interaction emblématique sera une réserve froide dont la panne provoque une détérioration progressive des aliments, puis une urgence alimentaire. Une autre sera un incendie interrompant un chantier. Conserver les bâtiments simples en géométrie procédurale facilite les variations, dégâts et prévisualisations. Les toits doivent pouvoir s'effacer ou se découper pour que la 3D garde les intérieurs lisibles.

## 8. Agriculture, faune et environnement

**Communautaire.** La croissance végétale dépend notamment du sol, de la lumière, de la température et du cycle de la plante. Les cultures alimentent plusieurs chaînes : nourriture, textile, médicaments ou bois. Une durée de croissance affichée ne représente pas nécessairement le temps réel jusqu'à récolte, puisque les conditions varient et que des périodes sans croissance existent.[^17]

Les animaux possèdent besoins, capacités et comportements ; ils peuvent consommer des cultures. Espèces, régime, reproduction, apprivoisement, entraînement et liens avec les colons créent des usages variés. Certaines espèces domestiques sont gérées par enclos, d'autres par zones. Les animaux peuvent fournir nourriture, transport, protection ou compagnie.[^18]

**Proposition projet.** Retenir d'abord une culture comestible, un arbre récoltable et un herbivore qui mange et dort. Leur comportement devra être autonome et partager les primitives de navigation et de consommation. Pour les populations plus grandes, espacer les décisions coûteuses sans changer la quantité de nourriture consommée par heure simulée. L'économie ne doit pas dépendre du niveau de détail graphique.

Le calendrier devra rendre les risques anticipables : croissance ralentie, réserves insuffisantes, dépendance à une seule récolte. La météo ne sera pas uniquement un effet : pluie, froid et chaleur devront alimenter des systèmes identifiés. Le premier biome doit être indulgent pour tester les règles ; des biomes extrêmes servent ensuite de tests de contraintes et de variété stratégique.

## 9. Narrateur, richesse et rythme

**Communautaire.** Les trois narrateurs proposés dans le jeu modifient la fréquence et le rythme des événements ; la difficulté constitue un réglage distinct. L'évaluation des menaces tient compte de plusieurs caractéristiques de la colonie.[^19] Le système de points de raid décrit par le wiki combine notamment richesse, population et modificateurs de difficulté, de début de partie et d'adaptation. Les objets, personnages et bâtiments n'ont pas nécessairement le même poids.[^20]

**Proposition projet.** Construire un directeur d'événements déterministe à partir de la graine, de préconditions et de budgets. D'abord une petite table : visite, réserve trouvée, intempérie et menace limitée. Un incident exige un endroit valide, une cible pertinente et une conséquence durable ; s'il ne peut être créé, il doit échouer proprement, sans inventer une récompense ni bloquer l'horloge.

Séparer le rythme des crises, leur ampleur et l'aide de récupération. La richesse matérielle est un signal utile mais imparfait de capacité défensive : beaucoup de bois n'équivaut pas à des combattants bien équipés. Prévoir des coefficients configurables et journaliser le calcul. Reproduire le principe de pression croissante n'oblige pas à reproduire chaque courbe communautaire non vérifiée.

Ne pas corriger le narrateur à partir d'une seule défaite spectaculaire. Comparer plusieurs graines sur survie, sévérité des pertes, intervalles de récupération et diversité des événements. La possibilité de perdre fait partie de l'histoire ; une cascade sans explication ou sans action possible peut, elle, révéler une conception défectueuse.

## 10. Monde, voyages, prisonniers et fins

**Communautaire.** La génération du monde relie graine, biomes, climat et terrain de départ.[^21] Les caravanes réunissent personnages, animaux et marchandises ; elles quittent une carte locale pour commercer, explorer ou attaquer. Capacité de transport, nourriture et conditions du trajet importent. La préparation physique peut elle-même demander du travail.[^22] Capture et recrutement mobilisent espace, nourriture et interactions sociales, avec des risques de révolte.[^23]

**Proposition projet.** Donner à chaque entité une localisation exclusive : carte, conteneur, voyage ou état terminal. Ce contrat doit exister avant les caravanes, car les sauvegardes, secours et inventaires en bénéficient déjà. À terme, les cartes inactives auront un modèle temporel explicite ; elles ne pourront ni dupliquer les objets au retour ni cesser arbitrairement de consommer des vivres.

Une première version complète pourra proposer un objectif de stabilité choisi pour notre jeu, puis une extraction ou un projet collectif final. Le monde entier et les fins alternatives ne sont pas nécessaires pour valider la boucle locale. Il faut toutefois distinguer « continuer librement », « objectif atteint », « colonie perdue » et « aucune personne contrôlable momentanément ».

## 11. Extensions disponibles et conséquences architecturales

Les cinq extensions suivantes sont proposées sur les pages officielles consultées au 13 septembre 2026. Elles requièrent le jeu de base. Leur présence dans cette comparaison ne signifie pas qu'elles entrent dans la première version du projet.

| Extension | Sortie vérifiée | Apports caractéristiques | Conséquence à anticiper |
| --- | --- | --- | --- |
| Royalty | 24 février 2020 | Titres, exigences de prestige, pouvoirs psychiques, permis impériaux, quêtes et groupes mécaniques fortifiés.[^24] | Système générique de capacités, récompenses et obligations ; pas de règles impériales codées dans le noyau. |
| Ideology | 20 juillet 2021 | Croyances personnalisables, rôles, rituels, préférences et quête de reliques.[^25] | Préférences contextuelles, modificateurs de pensées et événements collectifs extensibles. |
| Biotech | 21 octobre 2022 | Enfants, développement, génétique, travailleurs et combattants mécaniques.[^26] | Espèces et étapes de vie en données ; capacités et besoins composables. |
| Anomaly | 11 avril 2024 | Menaces horrifiques, capture et étude d'entités, rituels et progression particulière.[^27] | Incidents à états persistants ; plusieurs chemins de recherche possibles. |
| Odyssey | 11 juillet 2025 | Colonie mobile sur gravship, exploration planétaire et orbitale, nouveaux biomes et animaux ; survie dans le vide.[^28] | Transfert de groupes d'entités, frontières atmosphériques et cartes multiples. |

Anomaly propose aussi, depuis une mise à jour officielle du 3 mai 2024, des modes d'intégration permettant notamment des événements horrifiques ambiants sans progression centrée sur le monolithe.[^29] Cette distinction illustre l'intérêt de modules capables de contribuer au monde sans imposer une campagne entière. L'annonce de 1.6 distingue explicitement mise à jour gratuite du jeu de base et extension Odyssey : une fonctionnalité apparue à cette période n'est pas automatiquement réservée au DLC.[^30]

**Proposition projet.** Garder des points d'extension pour contenu, capacités, besoins, recettes et incidents. Ne pas construire dès maintenant cinq sous-jeux ni promettre une compatibilité universelle avec des règles encore inconnues. Chaque extension conceptuelle devra justifier son coût par une nouvelle décision intéressante pour le joueur.

## 12. Libertés utiles pour la 3D et premiers jalons

**Proposition projet.** Adopter au départ une grille logique plane rendue en 3D, avec déplacement continu interpolé entre cases. La verticalité jouable, étages, escaliers, effondrements volumétriques et tirs à hauteur libre changent ensemble navigation, construction, visibilité et thermodynamique. Ils méritent une décision ultérieure dédiée ; une représentation 3D n'impose pas de les simuler immédiatement.

La caméra doit permettre rotation, déplacement, zoom, sélection derrière les murs et lecture des zones. Les informations importantes demandent des surimpressions : réservations, chemins, obstacles, portée, fertilité et température. Les silhouettes doivent rester identifiables à distance. L'animation GPU doit rendre visible le travail, la marche, le repos et les blessures, tout en restant sans autorité sur l'économie ou les combats.

Le premier jalon jouable vise trois colons, une carte, de la nourriture et du bois accessibles, un stock et quelques chantiers. Le joueur doit pouvoir modifier le plan, constater la réaffectation, interrompre puis reprendre la partie et comprendre un travail bloqué. Le second ajoute production alimentaire, couchages et conséquences du manque. Le troisième introduit blessure, secours et incident local. Chaque jalon doit fermer une boucle, pas seulement augmenter le nombre de boutons.

La [matrice des systèmes](../gameplay/systems-matrix.md) transforme ces propositions en dépendances et critères vérifiables. Les priorités s'ajusteront après les premières sessions jouables, en conservant une distinction stricte entre fonctionnalité envisagée, implémentée et validée.

## 13. Inconnues à résoudre et validation de la référence

Les règles fines de choix de tâche, réservation de piles partielles, reprise d'ouvrage et préemption ne sont pas établies ici. Les formules de dégâts, couvert, maladies, humeur, prix, richesse et croissance ne constituent pas encore une spécification. Les pages « Rooms » et « Temperature » contiennent notamment des formulations différentes sur les proportions de toit : choisir un seuil sur cette seule base serait fragile. Les règles d'intérieur doivent être observées séparément selon le système.

Pour une future vérification, noter version, DLC actifs, scénario, graine, réglages et actions reproduites. Construire de petites expériences : deux colons et une pile insuffisante ; porte fermée pendant une livraison ; changement d'horaire en plein travail ; fermeture progressive d'une pièce ; nourriture stockée puis détériorée ; blessé déplacé pendant un soin. Consigner observations et écarts à côté de la règle concernée. Les chiffres de notre prototype restent explicitement provisoires tant qu'une décision de fidélité n'a pas été prise.

Le correctif officiel 1.6.4850 mentionne des défauts de tâches de livraison, de plans impossibles, d'ordres forcés, de déplacement et d'effets progressant incorrectement à fréquence réduite.[^1] Ces exemples étayent une priorité : vérifier d'abord les transitions et les invariants transversaux. Ils ne permettent pas de promettre des tests détectant toutes les anomalies possibles. Un petit nombre de scénarios profonds, des graines reproductibles et des journaux explicables seront plus utiles qu'une quantité élevée de tests superficiels.

## Sources

Toutes les URL ci-dessous ont été consultées le 13 septembre 2026. Les entrées RimWorld Wiki sont communautaires, sans certification de correspondance avec le correctif 1.6.4850. Les dates de publication sont indiquées lorsqu'elles sont établies ; une page vivante sans date n'est pas assimilée à une publication de 2026.

[^1]: Ludeon Studios, Tia Young. [Update 1.6.4850 released](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), 8 juin 2026. État actuel identifié et exemples de corrections.
[^2]: Ludeon Studios. [RimWorld — page officielle Steam](https://store.steampowered.com/app/294100/RimWorld/), page vivante. Positionnement, boucle et domaines simulés.
[^3]: RimWorld Wiki. [Work](https://rimworldwiki.com/wiki/Work), page vivante ; avertissement d'article incomplet. Priorités et catégories.
[^4]: RimWorld Wiki. [Menus — Schedule et Assign](https://rimworldwiki.com/wiki/Menus#Schedule), page vivante, consultée via la redirection Schedule. Horaires, zones et politiques.
[^5]: RimWorld Wiki. [Mood](https://rimworldwiki.com/wiki/Mood), page vivante ; fréquence exacte de mise à jour signalée incomplète. Humeur cible et actuelle.
[^6]: RimWorld Wiki. [Social](https://rimworldwiki.com/wiki/Social), page vivante. Opinions et relations.
[^7]: RimWorld Wiki. [Health](https://rimworldwiki.com/wiki/Health), page vivante. Anatomie et capacités.
[^8]: RimWorld Wiki. [Combat](https://rimworldwiki.com/wiki/Combat), page vivante ; article proposé à réécriture. Mobilisation, couvert et conséquences.
[^9]: RimWorld Wiki. [Stockpile zone](https://rimworldwiki.com/wiki/Stockpile_zone), page vivante, consultée via Stockpile ; catégorie de contenu non vérifié. Filtres et priorités.
[^10]: RimWorld Wiki. [Bill](https://rimworldwiki.com/wiki/Bill), page vivante ; article incomplet proposé à réécriture. Production et comptage.
[^11]: RimWorld Wiki. [Trade](https://rimworldwiki.com/wiki/Trade), page vivante ; actualisation et vérification demandées. Commerce et négociation.
[^12]: RimWorld Wiki. [Research](https://rimworldwiki.com/wiki/Research), page vivante. Déblocages et postes de recherche.
[^13]: RimWorld Wiki. [Rooms](https://rimworldwiki.com/wiki/Rooms), page vivante ; plusieurs règles de travail signalées incomplètes. Pièces et classifications d'intérieur.
[^14]: RimWorld Wiki. [Temperature](https://rimworldwiki.com/wiki/Temperature), page vivante ; vérification demandée. Interactions thermiques.
[^15]: RimWorld Wiki. [Power](https://rimworldwiki.com/wiki/Power), page vivante ; règles détaillées de mise à jour et pénurie signalées incomplètes. Réseaux et stockage.
[^16]: RimWorld Wiki. [Fire](https://rimworldwiki.com/wiki/Fire), page vivante ; mise à jour postérieure à 1.5.4062 demandée. Propagation et conséquences.
[^17]: RimWorld Wiki. [Plants](https://rimworldwiki.com/wiki/Plants), page vivante ; réécriture de clarté demandée. Conditions de croissance.
[^18]: RimWorld Wiki. [Animals](https://rimworldwiki.com/wiki/Animals), page vivante. Besoins et gestion animale.
[^19]: RimWorld Wiki. [AI Storytellers](https://rimworldwiki.com/wiki/AI_Storytellers), page vivante. Rythme et difficulté.
[^20]: RimWorld Wiki. [Raid points](https://rimworldwiki.com/wiki/Raid_points), page vivante. Signaux de dimensionnement des menaces ; chiffres non repris comme contrat.
[^21]: RimWorld Wiki. [World generation](https://rimworldwiki.com/wiki/World_generation), page vivante. Génération et terrain de départ.
[^22]: RimWorld Wiki. [Caravan](https://rimworldwiki.com/wiki/Caravan), page vivante ; interactions de repos signalées incomplètes. Voyage et logistique.
[^23]: RimWorld Wiki. [Prisoner](https://rimworldwiki.com/wiki/Prisoner), page vivante. Capture et recrutement.
[^24]: Ludeon Studios. [RimWorld — Royalty, page officielle Steam](https://store.steampowered.com/app/1149640/RimWorld__Royalty/), sortie affichée le 24 février 2020. Contenu actuel et statut.
[^25]: Ludeon Studios. [RimWorld — Ideology, page officielle Steam](https://store.steampowered.com/app/1392840/RimWorld__Ideology/), sortie affichée le 20 juillet 2021. Contenu actuel et statut.
[^26]: Ludeon Studios. [RimWorld — Biotech, page officielle Steam](https://store.steampowered.com/app/1826140/RimWorld__Biotech/), sortie affichée le 21 octobre 2022. Contenu actuel et statut.
[^27]: Ludeon Studios. [RimWorld — Anomaly, page officielle Steam](https://store.steampowered.com/app/2380740/RimWorld__Anomaly/), sortie affichée le 11 avril 2024. Contenu actuel et statut.
[^28]: Ludeon Studios. [RimWorld — Odyssey, page officielle Steam](https://store.steampowered.com/app/3022790/RimWorld__Odyssey/), sortie affichée le 11 juillet 2025. Contenu actuel et statut.
[^29]: Ludeon Studios, Tia Young. [New ambient horror setting and tribal Anomaly support](https://ludeon.com/blog/2024/05/new-ambient-horror-setting-and-tribal-anomaly-support/), 3 mai 2024. Modes d'intégration d'Anomaly.
[^30]: Ludeon Studios, Tia Young. [Announcing Odyssey and update 1.6!](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/), 11 juin 2025. Distinction extension et mise à jour gratuite.
