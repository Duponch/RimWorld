# Guide joueur

Ce guide décrit la version jouable actuelle. Le [bilan fonctionnel](implementation-status.md) distingue les systèmes livrés, partiels et absents.

## Commencer une colonie

Trois survivants, Ada, Noé et Mina, arrivent sur une carte de **250×250 cases par défaut**. Menu → Nouvelle colonie propose aussi 200×200, ou les cartes compactes 64×64 et 128×128, ainsi qu'une graine. Les cases et personnages gardent leurs dimensions : le territoire s'étend, les trajets lointains s'allongent et la caméra commence toujours près du camp. À taille et version de générateur identiques, la même graine redonne le même départ.

Vous commencez avec 12 unités de bois et 18 repas de survie déposées près des colons. Les nombres à gauche additionnent les objets au sol et portés ; les matériaux déjà livrés aux chantiers sont comptés séparément. Vos anciennes petites parties restent à leur taille originale, y compris les cartes 32×32 ; charger une partie ne l'agrandit pas.

Pour les premiers jours :

1. Mettez en pause et repérez des buissons mûrs ; désignez quelques arbres à abattre.
2. Prévoyez plusieurs cases de réserve, puis trois lits accessibles. Les matériaux doivent être récoltés et livrés avant construction.
3. Ajoutez une table et des tabourets adjacents pour les repas.
4. Semez un petit champ de riz ; continuez la cueillette pendant sa croissance.
5. Construisez un feu, activez Cuisine et réglez une facture de repas simples. Approvisionnez baies/riz et gardez son accès libre.

Il n’y a encore ni victoire ni événement hostile. Les règles suivantes décrivent le jeu présent ; les paramètres provisoires et systèmes manquants restent explicités.

Les colons peuvent se croiser dans un passage étroit et passer par la case d’un colon occupé ou endormi. Le lit, la place de repas ou le poste reste réservé à son utilisateur : traverser la case ne permet pas de l’utiliser. Les corps peuvent encore se superposer visuellement en 3D ; les portraits permettent de sélectionner chacun.

## Se repérer dans l’interface

Le compteur FPS reste dans le coin supérieur droit, même en pause ; il indique la cadence du rendu. Les portraits des colons sont en haut ; cliquer dessus centre la caméra et ouvre leur inspection en bas à gauche. Les stocks sont à gauche, les alertes à droite, l'heure et les vitesses en bas à droite. Les onglets de gestion occupent le bas de l'écran : Architecte pour les désignations et constructions, Travail pour les priorités de tous les colons, Horaires pour leurs plages quotidiennes, Affectations pour leurs régimes alimentaires, Historique pour les événements et Menu pour les sauvegardes. Un seul panneau de gestion est ouvert à la fois. Les onglets grisés correspondent aux domaines encore indisponibles.

Sur une fenêtre étroite, la barre des onglets se fait défiler horizontalement. Les panneaux occupent davantage de largeur, tout en conservant leur position dans l'interface.

## Sélection et ordres directs

Cliquez sur un colon pour le sélectionner ; **Maj-clic** ajoute ou retire un membre. Glissez un rectangle avec le bouton gauche pour sélectionner les colons qu'il encadre à l'écran ; Maj conserve la sélection précédente. Un double-clic sur un colon sélectionne les colons visibles. Les portraits permettent toujours de choisir précisément un colon ; l'inspection de groupe liste leurs activités.

Avec **un seul colon sélectionné**, cliquez droit sur un travail désigné pour le prioriser. **Maj** l'ajoute à la file après l'activité actuelle, même si le colon mange ou dort. Le travail est réservé dès l'acceptation. Un ordre direct remplace l'activité en cours ; les besoins continuent de diminuer, mais les pauses ordinaires attendent la fin des ordres et du travail priorisé. L'effondrement reste une urgence. Le bouton **Annuler les ordres directs** les retire sans supprimer les désignations.

Sur un chantier, le colon peut poursuivre dégagement, livraisons puis construction ; au poste de cuisine, il peut poursuivre les factures réalisables. La priorité reste sur la **même case**, indiquée dans l’inspection. Elle s’arrête faute de travail possible ou après douze heures en jeu, sans interrompre le sous-travail déjà commencé. La file explicite passe avant ces suites. Le dernier ordre de ce type remplace la cible maintenue ; un ordre ponctuel de récolte ou rangement ne la remplace pas. **Annuler les ordres directs** retire aussi cette priorité. Un transporteur seul ne devient pas constructeur.

Le métier doit être activé pour accepter un nouvel ordre. Passer ensuite sa priorité à 0 conserve les ordres directs et la priorité sur la cible déjà acceptés : annulez-les explicitement si vous voulez les arrêter. La file accepte au plus 32 travaux en attente et annonce tout refus. Redonner sans Maj un travail déjà en file le démarre immédiatement et remplace les autres ordres. Si un accès disparaît, le colon abandonne l'entrée impossible et le journal l'explique.

Le menu prend actuellement en charge abattage, coupe, récolte, semis sans pile gênante et finition d'un chantier déjà approvisionné et dégagé. Un clic droit sur une pile propose **Transporter vers le stockage**, sur un chantier non approvisionné **Livrer les matériaux**. Maj les ajoute à la même file que les autres travaux. Les quantités annoncées réservent dès acceptation la source et la place de dépôt. Une livraison reste un trajet ; la priorité maintenue permet d’enchaîner les apports admissibles sur ce chantier. Construction ou Transport autorisent la livraison, mais seul Construction permet la finition. Sur un chantier gêné, le menu propose **Couper la plante qui gêne le chantier** ou **Dégager le chantier**. Le constructeur peut les faire sans Collecte/Transport ; un transporteur seul peut déplacer une pile. Un gros tas nécessite plusieurs trajets de dix unités au plus. Sur un feu, **Ravitailler le feu** fonctionne même si le ravitaillement automatique est désactivé et avant son seuil habituel. Il exige Transport et du bois accessible ; le poste est réservé dès l’ajout en file, puis rechargé après transport et service. Désactiver l’automatisme ne supprime pas cet ordre manuel. Sur une cellule à semer encombrée, **Dégager avant de semer** exige Culture, même sans Transport. Sur un feu, **Cuisiner un repas simple** respecte les factures, ingrédients autorisés et rayon ; si le feu est vide, **Ravitailler avant de cuisiner** exige Cuisine et commence par cette recharge, puis peut poursuivre les factures. Maj réserve en file les ingrédients et le poste. Une modification de la facture ou du champ annule les ordres concernés avec conservation des objets portés. Le clic droit ne donne pas encore d'ordre de déplacement ou de combat.

## Vue, lumière et contrôles

Le bouton **Vue : iso**, près de l'heure en bas à droite, passe en **perspective** ; recliquer revient en vue iso (projection orthographique). Le point observé et son échelle sont conservés. La molette zoome, le glissement avec le bouton droit tourne la caméra ; le bouton ⌂ recentre sur les colons. Un changement de vue annule un rectangle en cours de tracé. Le masquage du feuillage reste utile aux angles rasants.

Le soleil, le ciel, les couleurs et les ombres évoluent avec l'heure affichée. La pause arrête ce cycle et un chargement restaure l'éclairage correspondant à la partie. Le départ actuel est à minuit. La nuit garde une lumière bleutée pour permettre l'inspection et la construction.

Ce rendu utilise pour l'instant un ciel clair fixe. **Saisons et météo ne sont pas encore jouables** ; les plantes gardent leur climat provisoire. Les effets complets de l'obscurité sur le travail, le déplacement et l'humeur, ainsi que lampes et toits, restent à développer. Arbres, sols et roches sont encore des contenus génériques : leur diversité n'est pas considérée comme terminée.

Les rivières forment des cours continus, les rochers pleins des massifs infranchissables et la végétation des groupes. Le départ possède un dégagement et des ressources de premier essai. La carte n'a pas encore de relief navigable, de ponts ou de minage.

La convention 3D est de 1 m par case, 1,75 m pour un humain et 2,80 m pour un mur. Les boutons près de l'horloge permettent de couper visuellement les murs ou de masquer le feuillage pour lire la scène. Ces options ne changent ni les obstacles ni les ordres. Le nouveau lit possède une empreinte 1×2 ; les lits d'une ancienne sauvegarde conservent leur emprise 1×1 pour éviter de recouvrir un voisin au chargement.

| Commande |Effet |
|---|---|
| Molette | Zoom |
| Bouton droit maintenu | Rotation de caméra |
| Bouton central maintenu | Déplacement de caméra |
| Flèches | Déplacement de caméra ; utiliser les flèches lorsque les lettres servent aux outils |
| Espace | Pause/reprise |
| 1 / 2 / 3 | Vitesses 1× / 3× / 6× |
| C / R / B / L / X | Abattre / récolter / mur / lit / annuler |
| S | Désigner une réserve |
| Q / E avec un meuble orientable | Tourner le meuble |
| Tab / F1 | Ouvrir ou fermer Architecte / Travail |
| Échap | Annuler le rectangle en cours ; sinon fermer le panneau et revenir à l'inspection |
| Ctrl+S | Sauvegarder |

Un jour dure dix minutes à vitesse normale (6 000 ticks). Le compteur FPS mesure le rendu ; une simulation chargée peut avancer plus lentement malgré une bonne cadence d’image.

En vue très éloignée, les détails minuscules du décor sont remplacés par des silhouettes plus légères. Le terrain, les obstacles et les ordres restent les mêmes. Le compteur FPS continue de mesurer le rendu, y compris en pause.

Les massifs ont maintenant des sommets et parois irréguliers qui se raccordent entre cases. Ils gardent leurs obstacles au sol. **Le minage n'est pas encore jouable** ; leurs retraits locaux sont actuellement un test technique préparant cette mécanique.

## Désigner et construire

Ouvrir Architecte, choisir Ordres pour abattre/récolter/annuler, Zones pour le stockage, Structure pour le mur, Meubles pour les lits, tables et tabourets, ou Température pour le feu de camp. Pour les ordres de terrain et les réserves, **cliquer ou maintenir le bouton gauche et tracer un rectangle**, dans n'importe quel sens. Les cases compatibles sont surlignées ; un compteur distingue les cases retenues et ignorées. Relâcher sur la carte applique l'ensemble. Échap ou clic droit annule le tracé ; changer d'outil ou quitter la fenêtre l'abandonne également. Relâcher au-dessus d'un panneau n'envoie aucun ordre.

L'abattage cible les arbres ; la récolte cible les buissons et cultures récoltables. Les ressources incompatibles, obstacles et ordres déjà présents sont ignorés, avec un bilan après application. Le rectangle crée du travail futur : les matériaux ne sont produits qu'après le travail des colons. Pour les constructions, cliquer sur un sol compatible : un plan peut recouvrir une plante ou une pile d’objets, que les colons dégageront. Roches et bâtiments existants restent refusés ; les réserves suivent les compatibilités du meuble. Le lit et la table occupent deux cases : Q/E ou le bouton Tourner change leur orientation avant placement. Le fantôme indique un placement refusé. Les matériaux peuvent manquer au moment de poser un plan ; leur livraison précède le travail de construction.

| Action | Règle actuelle |
|---|---|
| Abattre | Le colon travaille à côté de l'arbre ; toute sa quantité devient une ou plusieurs piles de bois au sol. |
| Récolter | Le buisson reste à 30 % de croissance et dépose ses baies ; récoltable au-dessus de 65 %. |
| Couper les buissons | Le buisson est retiré ; sa récolte éventuelle reste au sol. |
| Construire un mur | 5 bois, 70 ticks de travail ; seul le mur terminé bloque le passage. |
| Construire un lit | 8 bois livrés, 120 ticks de travail ; empreinte orientée 1×2, attribution à un colon et repos dans le lit. |
| Construire une table | 28 bois livrés, 53 ticks de travail ; empreinte orientée 1×2. Plan, cadre et table achevée se traversent ; l’entrée sur le plateau ralentit le colon. |
| Construire un tabouret | 25 bois livrés, 32 ticks de travail ; une case, une place de repas à côté d’une table. |
| Construire un feu | 20 bois livrés, 20 ticks de travail ; une case et une place de service orientée devant. |
| Annuler | Retire l'ordre et libère ses engagements ; les matériaux restent localisés au sol. Ne détruit pas un bâtiment achevé. On peut cliquer sur chacune des cases de son empreinte. |

Un arbre prend 100 ticks de travail, un buisson 60, hors déplacement et interruptions. La simulation avance à 10 ticks/seconde à vitesse normale. Ces valeurs sont nos paramètres de prototype, pas des valeurs prétendument identiques à RimWorld.

## Déconstruire un ouvrage

Dans **Architecte → Ordres → Déconstruire**, cliquez ou tracez un rectangle sur les bâtiments. L’inspection propose également Déconstruire et Annuler cet ordre. Un meuble de deux cases reste un seul objet. Le bâtiment subsiste jusqu’à la fin du travail ; un colon rejoint une case adjacente et l’enlève par le travail Construction, après les chantiers ordinaires. Le clic droit permet de le prioriser ou de le mettre en file avec Maj.

Environ la moitié du bois revient **au sol** : un mur de 5 bois rend 2 ou 3 bois. Le feu de camp ne rend rien, y compris son combustible. Un meuble utilisé peut attendre la libération de sa réservation. Un lit retiré perd son propriétaire. Un retrait sans place pour ses matériaux attend ; il ne les efface pas.

Annuler conserve le bâtiment. Interrompre remet le travail de retrait à zéro ; sauvegarder/recharger conserve l’action exactement. Déconstruire détruit le meuble : **le déplacer entier par réinstallation n’est pas encore disponible**.

## Répartir le travail

Ouvrir Travail pour régler Collecte, Construction, Transport, Culture et Cuisine. **1 est la priorité la plus forte, 4 la plus faible, 0 désactive la famille.** Transport approvisionne chantiers et réserves ; Construction peut aussi dégager les piles et apporter ses matériaux même si Transport vaut 0. Le constructeur coupe les plantes gênant son chantier même si Collecte vaut 0. Désactiver Construction n'empêche donc pas un colon dont Transport reste actif d'apporter du bois à un plan. Une modification entre priorités actives s'applique lors du prochain choix de travail ; désactiver une famille interrompt son activité.

Un transporteur réserve une quantité de pile et de la place à destination, se déplace jusqu'à la source, prélève, porte et dépose. Sa cargaison est visible. Deux colons peuvent se partager une pile sans promettre les mêmes unités. La première livraison réelle transforme le plan en cadre. Un constructeur finit seulement quand tous les matériaux sont livrés et que rien ne gêne l’empreinte. Plans et cadres laissent passer, avec un ralentissement à l’entrée dans un cadre. Les piles gênantes sont portées ailleurs et les plantes réellement coupées ; un colon immobile ou une place de repas réservée fait attendre le chantier. Une interruption conserve la progression et les matériaux déjà déposés ; une cargaison abandonnée devient une pile au sol.

Les chemins contournent eau, terrain rocheux et murs. Tables, lits et feux se traversent avec un ralentissement d’entrée ; le colon choisit une case libre pour travailler ou attendre. Le lit reste utilisable pour le sommeil réservé. Passer directement entre deux tables/lits/feux/tabourets ne répète pas le supplément. Le déplacement sur table, lit ou tabouret adapte aussi sa hauteur visuelle. Les colons civils se traversent sans déplacer ceux qui restent sur place ; l'utilisation d'un lit ou d'un poste reste réservée. Inspecter un chantier indique notamment ses livraisons et ce qu'il attend. Les règles de blocage liées aux ennemis et au combat restent à développer.

Les colons se déplacent dans huit directions. Une diagonale mesure √2 cases et prend proportionnellement plus de temps ; elle ne coupe pas les coins solides. Ils font face au trajet puis à leur travail. Le rendu utilise un petit tampon temporel pour conserver une marche régulière entre les messages du worker. Un retard exceptionnel peut encore arrêter brièvement l’affichage au dernier état connu.

## Organiser les horaires

Ouvrez **Horaires (F2)** : choisissez Libre, Travail ou Sommeil, puis cliquez ou glissez sur les heures d’une ligne. Copier/Coller reproduit une journée sur un autre colon. Un tracé ne traverse pas minuit ; peignez les deux extrémités séparément. Tab parcourt les boutons, Entrée/Espace peint une case et Échap annule le tracé.

Les nouvelles parties prévoient huit heures de sommeil, de 22 h à 6 h. Libre laisse le colon gérer ses besoins et continuer à dormir jusqu’à récupération complète. Travail autorise toujours les repas. Une personne épuisée peut finir par s’effondrer malgré son horaire. La plage Loisirs donne priorité aux activités accessibles ; deux familles sont disponibles, décrites plus bas. Les anciennes sauvegardes gardent leurs anciennes règles de fatigue et des plages libres, indiquées dans le panneau.

## Stocker et transporter

Dans Architecte → Zones → Réserve, choisir les filtres Bois/Nourriture, une priorité et une capacité, puis cliquer ou tracer un rectangle. Les nouvelles cases reçoivent ces réglages ; **les réserves existantes traversées par le rectangle gardent leurs réglages**. Une capacité de 75 unités et une priorité normale de 2 sont proposées. Pour les **réserves**, 4 est la priorité la plus forte : les transporteurs déplacent les objets vers un stockage de meilleure priorité, sans va-et-vient entre réserves équivalentes.

Fermer Architecte et inspecter une case de réserve pour modifier ses filtres, sa priorité ou sa capacité. Appliquer un nouveau filtre invalide les livraisons incompatibles ; les objets déjà présents restent physiques et peuvent être déplacés vers une autre réserve valable. Retirer une réserve supprime sa règle de stockage, sans effacer les objets. Une réserve pleine n'accepte plus de nouvelle quantité.

Un trajet transporte au plus dix unités, limite actuelle du projet. Le rectangle crée plusieurs cases indépendantes ; **les zones nommées à réglages communs ne sont pas encore implémentées**. L'outil Retirer accepte lui aussi un rectangle et conserve tous les objets au sol ou déposés par les porteurs interrompus. Les livraisons aux chantiers peuvent prélever directement une pile au sol ; un passage préalable par une réserve n'est pas obligatoire.

Une case du sol accueille une seule pile : jusqu’à 75 bois, baies ou riz ; dix repas simples ou rations. Des types différents demandent des cases différentes. Prévoir plusieurs cellules de réserve pour les aliments ; les 18 rations initiales occupent deux cases. Les surplus se déposent à proximité, sans être perdus. Une annulation nécessitant un dépôt impossible est refusée. Les étagères ne sont pas encore disponibles.

## Cueillir et abattre

Une récolte mûre donne dix baies dans les nouvelles colonies. Le buisson reste en place à 30 % de croissance ; il redevient récoltable au-dessus de 65 %, avec un rendement réduit tant qu'il n'est pas mûr. Inspectez sa case pour voir croissance, rendement et repos nocturne. Sa croissance avance pendant le jour, plus lentement sur terre nue que sur prairie. Le climat actuel reste fixé à un extérieur tempéré ; saisons et météo ne sont pas encore simulées.

Architecte → Ordres → **Couper les buissons** libère leur case en supprimant la plante. La coupe récupère les baies déjà récoltables ; un buisson immature ne donne rien. Les piles produites restent au sol et peuvent demander un transport avant construction. La récolte et la coupe exigent toujours un colon au contact et du travail.

## Cultiver du riz

Dans **Architecte → Zones → Zone de culture**, tracez un champ. Activez **Culture** dans le tableau Travail. Les colons dégagent les plantes qui gênent, sèment sans consommer de graines, puis récoltent automatiquement le riz mûr. Il pousse plus lentement sur terre nue que sur prairie, s’arrête la nuit et donne six unités par plant mûr. Comptez environ sept jours par cycle sur prairie dans le climat fixe actuel, davantage sur terre : prévoyez des repas ou de la cueillette pendant l’attente.

Inspectez une cellule du champ pour autoriser les semis et la coupe des plantes indésirables. Désactiver les semis conserve la récolte du riz mûr. Retirer la zone conserve les plants déjà semés. Un ordre manuel Récolter fonctionne au-dessus de 65 % de croissance, avec un rendement réduit. Couper les plantes libère leur case.

Prévoyez plusieurs cellules de réserve alimentaire : baies, repas et riz sont des objets différents qui ne partagent pas une même pile au sol. Le cultivateur déplace les piles gênantes hors du champ avant de semer, même sans réserve et avec Transport désactivé. Si aucun sol de dépôt n’est disponible, il attend. Plusieurs trajets peuvent être nécessaires. Ces objets pourront ensuite être transportés vers vos réserves.

Les colons peuvent manger le riz cru : 0,05 nutrition par unité, avec un souvenir −7 humeur pendant un jour. Le feu peut transformer dix unités de riz et/ou de baies en un repas simple. Les denrées peuvent pourrir ; les intoxications ne sont pas encore disponibles. Seul le riz est cultivable ; les arbres, sols et buissons génériques ne constituent toujours pas un catalogue complet des espèces et biomes.

## Préparer des repas au feu

Construisez un **feu de camp** dans Architecte → Température : vingt bois doivent être livrés. Il démarre rempli et brûle dix bois par jour. L’inspection indique son combustible et permet de désactiver son ravitaillement automatique. Le feu vide reste en place et ne permet plus de cuire. Son chauffage et son éclairage sur les règles de jeu ne sont pas encore simulés.

Activez **Cuisine** dans Travail, puis inspectez le feu et ajoutez une facture « repas simple ». Choisissez un nombre de fabrications, un stock cible ou une répétition sans limite. Le détail permet d’autoriser baies/riz, limiter le rayon de recherche et choisir rangement ou dépôt au sol. Cliquez **Appliquer la facture** après modification. Les flèches ordonnent les factures ; une facture suspendue ou impossible laisse passer la suivante.

Le cuisinier rassemble dix unités admises, les porte au poste puis travaille avant de créer un repas à 0,9 nutrition. Gardez libre la case de service devant le feu et prévoyez des réserves pour les repas, distinctes des piles de riz/baies. Le mode « jusqu’à X » compte les repas stockés et portés ; ceux posés au sol hors réserve ne suffisent pas à maintenir ce seuil.

L’inspection du colon indique collecte des ingrédients, progression de cuisson ou livraison du repas. Chaque facture explique ses blocages connus : Cuisine désactivée, combustible, ingrédients admis dans le rayon ou place de travail obstruée. Si assez d’ingrédients sont présents, vérifiez aussi les chemins et les cases libres autour du poste ; le compteur ne garantit pas leur accès.

Un cuisinier peut ravitailler son feu vide même avec Transport désactivé. Interrompre une préparation conserve les ingrédients, mais son travail partiel recommence ; sauvegarder puis recharger conserve au contraire le travail actif. Autres recettes, compétences et intoxications restent à développer.

## Nourriture, repos et humeur

Une valeur de nourriture élevée signifie que le colon est rassasié. À 30 ou moins, il réserve une portion accessible, marche jusqu'à la nourriture puis la prend en main. Après prélèvement, il cherche une place disponible avec tabouret adjacent à une table, à 32 cases au plus de sa position actuelle. Il y transporte sa portion et s’assied. Sans siège accessible, il mange debout à proximité. Il mange pendant 50 ticks : la portion reste physique jusqu'à la fin, puis est consommée : cinq points par baie ou 90 par ration, avec une jauge plafonnée à 100. Un obstacle peut empêcher le repas ; réserver ou porter ne satisfait jamais la faim. Une interruption dépose la portion intacte là où se trouve le colon. À 20 ou moins sans repas accessible, il abandonne les travaux non vitaux et peut récolter les baies désignées. Les nouvelles parties commencent avec 18 repas de survie, et les buissons donnent des baies. La quantité de baies prélevée dépend de la faim et du stock disponible. L'interface distingue leurs quantités et la nutrition totale. Les repas simples peuvent être cuisinés au feu de camp. Les régimes d’Affectations filtrent les aliments ; les intoxications restent absentes. Les anciennes parties conservent des « Portions historiques » à 35 points et leur ancien rythme de faim. Un repas terminé sans plateau adjacent laisse un souvenir de −3 humeur pendant une journée ; il se renouvelle sans se cumuler. Manger ensuite à table ne supprime pas le souvenir déjà présent.

Sous 30 de repos en plage Libre, ou sous 75 en plage Sommeil, le colon termine son travail engagé puis rejoint son lit accessible ou s’attribue un lit libre. Une plage Travail empêche le départ volontaire au lit et réveille un dormeur ayant au moins 20 de repos. La réservation est exclusive et le sommeil commence une fois arrivé ; le personnage est allongé sur le matelas dans son orientation réelle. Inspecter un lit permet de modifier son propriétaire. Sans couchage utilisable, il dort au sol ; l'épuisement peut aussi interrompre le trajet. Il se réveille une fois reposé à 100, ou pour une faim critique si une portion accessible existe. Il ne mange jamais en dormant et un lit voisin ne donne aucun bonus. Le confort augmente progressivement pendant l’utilisation du lit ou d’un tabouret, jusqu’au plafond du meuble, puis baisse en dehors de son utilisation. L’humeur combine encore les besoins avec ces premiers effets ; les autres pensées, relations et crises mentales restent absentes.

Les personnages provisoires possèdent des animations de marche, travail, ingestion debout/assise et sommeil calculées sur le GPU. Le profil adulte consomme au rythme de base de 1,6 nutrition/jour, réduit sous les seuils de faim ; traits et santé ne sont pas encore simulés. Voir [les aliments](../development/food-items.md) et le [catalogue de contenu](content-catalogue.md).

Les colons choisissent les aliments accessibles en tenant compte du goût et de la distance. Des baies fraîches proches peuvent être préférées à une ration de survie ; le riz cru est moins apprécié, mais reste consommé lorsque les alternatives sont trop loin ou inaccessibles. Un aliment qui va pourrir dans moins d’une demi-journée bénéficie d’une préférence supplémentaire, tout en tenant compte du trajet. Les autorisations du régime sont appliquées avant ces préférences, y compris si la faim devient critique.

## Régimes alimentaires

Ouvrez **Affectations (F3)** et choisissez un régime pour chaque colon. « Gérer les régimes alimentaires » permet de créer, dupliquer, renommer et cocher les aliments autorisés ; cliquez sur Appliquer. Modifier un régime agit sur tous ses utilisateurs. Pour le supprimer, affectez d’abord un autre régime à ses colons.

« Sans restriction » autorise tout le catalogue actuel ; « Repas uniquement » autorise les repas préparés, rations et portions historiques ; « Sans rations » permet de conserver les repas de survie ; « Rien » interdit de choisir toute nouvelle portion. Ces préréglages locaux couvrent uniquement les aliments présents. Un colon ne contourne pas automatiquement un régime qui l’empêche de manger, même à faim zéro. Le tableau signale ce blocage ; réautorisez un aliment ou approvisionnez un aliment permis.

Un repas déjà engagé peut être terminé après le changement. Transport et ingrédients des factures restent indépendants : le cuisinier peut préparer un repas qu’il n’est pas autorisé à manger. Aucun inventaire personnel de nourriture ni filtre de provenance des ingrédients n’est encore disponible.

## Conserver la nourriture

À la température actuelle de 21 °C, les baies se gardent 14 jours, le riz 40 jours et les repas simples 4 jours. Inspectez une pile pour voir le temps restant. Les rations de survie ne pourrissent pas.

Transporter ou fractionner conserve la fraîcheur ; mélanger des unités du même aliment produit un âge moyen pondéré. Une nourriture pourrie disparaît, y compris dans les mains d’un colon. La faim n’est pas satisfaite si cela arrive avant la fin du repas. Un ingrédient perdu interrompt la cuisine ; les autres restent physiques. Évitez de cuire une énorme réserve : le mode « jusqu’à X » permet de renouveler progressivement les repas.

Le climat reste fixe. Toits, réfrigérateurs et dégâts d’exposition ne sont pas encore jouables. Les anciennes sauvegardes démarrent leurs aliments frais au tick chargé, faute d’âge historique ; les nouvelles sauvegardes conservent leur âge réel.

## Sauvegarder et reprendre

Menu → Sauvegarder conserve le monde, les travaux, les réservations, les trajets et les besoins. Elle occupe un emplacement local à ce navigateur. Recharger remplace la partie courante par la dernière sauvegarde ; une sauvegarde invalide est refusée. La vitesse et l'angle de caméra ne font pas partie de la sauvegarde. Il n'y a pas encore d'autosauvegarde ni d'export de fichier.

Avant de créer une nouvelle colonie, le jeu conserve aussi l'état courant dans un emplacement « Colonie précédente », distinct de la sauvegarde manuelle. Cette copie contient la dernière colonie remplacée, pas tout l'historique des colonies. La création est refusée si cette copie ne peut pas être enregistrée. Les anciennes sauvegardes gardent leurs dimensions, leur terrain et leurs ressources ; leur ancien stock global, lorsqu'il existe, est converti en piles et leurs matériaux réservés sont localisés aux chantiers. Les nouvelles sauvegardes conservent également les cargaisons et les réserves. Créer ou charger un grand territoire prépare toute sa carte ; la durée de cette opération dépend de l'appareil.

## Limites et suite

Pas encore d'autres cultures, autres postes/recettes de cuisine, chaîne du froid, minage, réinstallation, autres familles de loisirs, animaux, armes, combat, blessures, médecine, relations, traits, recherche, commerce, électricité, toit, température, incendie, météo dynamique, carte du monde ou storyteller. Les coûts de sols et autres profils de déplacement, les réserves à plusieurs cases partageant une politique, les autres familles sélectionnables, les fournisseurs supplémentaires de travail lié sur une case et les tournées logistiques restent à développer. Les modèles sont provisoires ; la congestion entre agents actifs et la calibration des besoins restent ouvertes. La faim ne cause pas encore de malnutrition ni de décès.

La suite est suivie dans [le plan de développement](../ROADMAP.md). Les détails de la référence et les futures interactions sont dans [la matrice des systèmes](systems-matrix.md).

Les équipements, vêtements et portraits associés restent prévus. Les modèles sont provisoires ; les sols, roches, plantes et biomes génériques ne constituent pas un catalogue complet. Consultez l’[inventaire des systèmes](implementation-status.md), le [catalogue](content-catalogue.md) et les [écarts assumés](decisions.md).

## Prendre le temps de se divertir

Dans **Architecte → Loisirs**, placer un piquet de fers à cheval : dix bois doivent être livrés et l’ouvrage construit. Les douze cases indiquées autour sont à cinq cellules du piquet. Jaune signifie place géométriquement libre avec vue dégagée ; un colon doit encore pouvoir la rejoindre. Trois colons peuvent jouer, chacun à sa place réservée. Un mur coupe le lancer, une table entre le joueur et le piquet ne coupe pas sa vue.

Sans installation, les colons peuvent rejoindre un emplacement du voisinage et s’allonger pour observer le ciel. Ce loisir appartient à la détente solitaire, les fers à cheval à la dextérité. Multiplier les piquets ne crée pas une nouvelle famille. La météo et les pièces ne modifient pas encore ces activités.

Dans **Horaires**, la plage Loisirs cherche une activité sous 95 % de satisfaction ; Libre sous 35 %. Le colon finit son travail engagé et satisfait ses besoins prioritaires. Il ne gagne rien en chemin. Pendant les premières deux heures de jeu, les loisirs ne démarrent pas. L’inspection montre satisfaction, effet d’humeur et lassitude de chaque famille : au-dessus de 50 %, le colon cesse de choisir cette famille jusqu’à ce qu’elle retombe sous 30 %. Sommeil et variété l’aident à conserver une journée équilibrée ; dormir ne fait toutefois pas baisser la lassitude. Les attentes restent celles d’un petit camp, sans calcul de richesse.

## Construire dans une réserve

Vous pouvez poser un plan dans une réserve. Mur, lit et table retirent les cellules couvertes de la zone, mais laissent les objets présents. Les transporteurs concernés déposent leur cargaison ; si aucun dépôt conservatif n’est possible, le plan est refusé. Annuler le plan ne rétablit pas la réserve.

La table conserve une pile déjà présente, affichée sur son plateau, mais n’accepte pas de zone de stockage. Tabouret et piquet peuvent garder une réserve utilisable. Le feu peut recouvrir son tracé, mais aucun objet ne sera rangé sur sa cellule ; le combustible utilise l’ordre de ravitaillement. Murs, lits et feux attendent le déplacement des piles gênantes. La table se traverse mais ne sert pas de poste de travail ou de repos. Après interruption pendant une traversée, le colon finit son arête puis rejoint une case admissible ; il ne se téléporte pas.
