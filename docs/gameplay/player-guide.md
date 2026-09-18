# Guide joueur

## Attaquer au corps à corps (V59)

Mobilisez le colon, choisissez **Attaquer au corps à corps**, puis cliquez le personnage ciblé. Le colon rejoint une place accessible et frappe avec ses outils naturels ou son arme. L’ordre peut viser explicitement un allié. Arrêter, déplacer ou démobiliser interrompt l’attaque, mais conserve la récupération entre deux coups. Une cible nouvellement à terre termine l’engagement.

La sentinelle riposte au contact. Les coups peuvent blesser, ralentir ou étourdir ; vue, manipulation, mouvement et compétence Mêlée comptent. Démobilisez les survivants pour leur rendre l’accès aux besoins et soins. Armures, autres armes, infections et poursuite autonome restent à venir.

## Rencontre armée (V58)

Dans **Menu → Nouvelle colonie**, choisissez **Rencontre armée**, sur une carte de 64 × 64 minimum. Ada commence équipée ; une sentinelle rouge attend à distance. Préparez lits médicaux, médecin et médicaments avant l’approche. « Menace armée · voir » centre la caméra sur elle. Elle tire sur les colons visibles à portée : les blessures, le saignement et le risque de décès sont réels.

Mobilisez un colon équipé puis utilisez **Tirer sur une cible** et cliquez la sentinelle. Après le combat, démobilisez les survivants pour leur permettre de manger, se reposer et soigner. Les blessés à terre sont transportés physiquement vers un lit accessible. L’ennemi ne devient pas un colon ni un patient civil ; capture et prisonniers restent à venir.

**Affectations → Réaction hostile** propose Fuir (défaut) et Ignorer. Un civil éveillé sans ordre imposé fuit une menace visible à moins de huit cases, cherche un refuge puis attend avant de reprendre ses activités. Un ordre direct ou la mobilisation prévaut. Les portes fermées protègent du passage hostile ; une porte ouverte, même interdite à vos colons, peut laisser passer l’ennemi.

**Limites importantes :** cette sentinelle reste sur place, sans poursuite autonome. Elle riposte au contact en V59. Le tir sur un adversaire debout adjacent est refusé ; utilisez la mêlée. Tir automatique des colons mobilisés, réaction Attaquer, raids, armures et diplomatie ne sont pas livrés. Le camp paisible reste le scénario par défaut.

## Commander un tir

Équipez un colon du revolver, sélectionnez-le et **Mobiliser/R**, puis **Tirer sur une cible**. Cliquez le personnage visé sur la carte ; Échap ou clic droit annule le ciblage. Cette commande peut réellement blesser un allié. Une sentinelle existe dans le scénario Rencontre armée ; le camp ordinaire reste paisible.

Le colon termine son pas en cours, vise, tire puis récupère avant de recommencer. Un déplacement ou **Arrêter l’ordre** interrompt la visée ; après une balle partie, la récupération reste obligatoire même en changeant d’ordre ou en démobilisant. Une cible devenue inaccessible, morte ou nouvellement à terre arrête la suite. La balle poursuit son trajet indépendamment du tireur ; couvert, précision, capacités et Tir déterminent le résultat. L’expérience vient du tir admissible, pas seulement d’un coup au but. La compétence est consultable dans Biographie · compétences.

Après un accident, démobilisez les personnes concernées et utilisez Patient/Médecin, un lit médical et les soins déjà disponibles. Le revolver ralentit temporairement un adulte touché, même pendant un pas : la marche reprend ensuite sans saut. Un nouvel impact renouvelle la durée sans cumuler les pénalités. Santé affiche cet effet séparément des blessures. Les ennemis, réactions automatiques, armures et mêlée restent absents. [Périmètre exact](../development/shooting.md).


## Commander les déplacements

Sélectionnez un ou plusieurs colons, puis **Mobiliser** ou **R**. Un clic droit au sol les déplace ; **Maj + clic droit** ajoute un déplacement à la file. Le bouton **Arrêter l’ordre** annule la destination et la file, sans téléportation. **Démobiliser/R** rend leur autonomie aux colons. R sans colon sélectionné conserve le raccourci Récolter.

Les mobilisés ne vont pas travailler, manger ou chercher un lit seuls. Leurs besoins et leur santé continuent : un épuisement peut les faire dormir au sol. Une longue attente sans menace les démobilise automatiquement. Les objets portés sont déposés ; si le sol est saturé, le colon conserve sa cargaison jusqu’à une place libre. Le tir dirigé du revolver est décrit ci-dessus ; adversaires et combat automatique restent absents.

## Équiper le revolver

Les nouvelles cartes possèdent un revolver près des réserves initiales. Sélectionnez un colon, puis clic droit sur l'arme et **Équiper**. Il la rejoint avant de la prendre ; s'il possède déjà une arme, il dépose l'ancienne sur un sol libre au contact. L'inspection **Équipement** affiche sa qualité, ses PV et sa cargaison séparée. **Déposer l'arme** prend un court temps sur place. Une arme volontairement déposée est interdite : sélectionnez-la et **Autoriser cette arme** pour permettre le rangement automatique dans une réserve acceptant **Armes**. Équiper directement l'autorise aussi.

Une chute hors lit, la perte de manipulation ou le décès fait tomber l'arme. Une chute dans un lit déjà utilisé la conserve. Si le sol est saturé, le colon garde l'arme désactivée jusqu'à un dépôt possible. Après rétablissement, il peut rejoindre sa propre arme mémorisée ; le bouton **Ne pas récupérer l'arme perdue** annule cette intention. Cette récupération attend les besoins et travaux engagés et ignore l'interdiction de sa propre arme.

Le revolver permet désormais le tir dirigé décrit plus haut, avec blessures et prise en charge médicale. La file d'équipement, les autres armes, vêtements et inventaires personnels restent à venir ; la cargaison de travail n'est pas un inventaire. L'arme procédurale est portée à la hanche puis levée vers la cible ; les modèles restent provisoires.


**Médicaments :** les nouvelles colonies disposent de trente doses industrielles. Dans Santé, choisissez le plafond du patient : aucun soin, à sec, plantes, industriel ou meilleur disponible. Le médecin rejoint une pile autorisée, prélève, porte puis travaille ; une dose peut traiter plusieurs plaies. Sans produit accessible, il soigne à sec si autorisé. Activez **Médicaments** dans une réserve pour les ranger. Les anciens sites ne reçoivent pas de stock au chargement. Culture et fabrication médicales restent absentes. [Règles et limites](../development/medicines.md).

**Urgences et priorités :** si le saignement menace la vie avant trois quarts de jour, Patient/Médecin peut passer avant les besoins à la prochaine décision, à condition d’atteindre la meilleure priorité activée. Médecin 2 avec Construction 1 ne suffit pas. Patient passe avant Médecin à égalité ; mettez Médecin devant Patient pour privilégier l’auto-soin autorisé. Le repos au lit est réexaminé périodiquement ; un auto-soin urgent traite une plaie puis réévalue. Les travaux déjà engagés ne sont pas tous annulés automatiquement. [Contrat et limites](../development/urgent-care.md).

**Se soigner :** sélectionnez le colon, cochez **Autoriser les auto-soins** dans Santé et activez Médecin dans Travail. Le clic droit sur ce même colon propose **Se soigner**. Aucun lit requis ; le colon quitte physiquement le lit s’il l’utilisait. Qualité de base réduite à 70 %, sans pénalité de vitesse spécifique. Décocher interrompt sans soin ni XP anticipés. L’option ne force pas une interruption générale des autres activités : [règles et limites](../development/self-tending.md).

**Nourrir un patient :** activez Médecin dans Travail et gardez de la nourriture autorisée par le régime du patient. À 26 % ou moins, un médecin prend une portion, la porte au lit et nourrit le blessé sur place. Le clic droit propose aussi **Nourrir**. Le patient peut être incapable ou simplement en récupération médicale ; un dormeur sain ne suffit pas. Interdire les traitements ne lui interdit pas la nourriture. Sauvegarde en cours possible ; file médicale encore absente. [Règles et limites](../development/feeding.md).

**Traiter une blessure :** dans Travail, activez **Patient** pour le blessé et **Médecin** pour le soignant. Le patient rejoint un lit admissible ; le médecin vient au chevet et traite les plaies, une par une à sec ou en groupes avec médicament. Un clic droit du médecin sur un patient couché propose de prioriser les soins selon le plafond du patient. **Repos au lit** permet de récupérer après traitement, même sans dormir. Santé affiche les qualités obtenues et cinq plafonds de soins ; Biographie affiche Médecine. Sauvegarder conserve un soin engagé. Médicaments disponibles en V51 ; files encore absentes ; alimentation assistée livrée en V48. [Règles et limites](../development/tending.md).

**Secourir un blessé :** activez Médecin dans **Travail**. Un colon disponible peut porter une personne à terre vers un lit admissible. Pour prioriser, sélectionnez le sauveteur puis faites un clic droit sur le blessé et choisissez **Secourir**. Dans l’inspection d’un lit, cochez **Usage médical** : ce lit est réservé aux patients et n’a plus de propriétaire ordinaire. Un lit normal libre ou appartenant au patient sert de repli. La sauvegarde conserve un transport engagé. Le secours seul ne soigne pas : les traitements avec ou sans médicament et l’alimentation assistée sont désormais disponibles au lit. Le patient continue à avoir faim. Maj ne met pas encore les secours en file. [Règles et limites](../development/rescue.md).

Si l’alerte **« cargaison à déposer »** apparaît après un effondrement de fatigue, le colon se repose et conserve son objet. Faites transporter une pile voisine par un autre colon vers une réserve libre : dès qu’une case proche se libère, la cargaison peut être déposée. Ce n’est pas un inventaire personnel supplémentaire. [Détails](../development/interrupted-cargo.md).

Sélectionnez un colon puis **Biographie · compétences** dans son inspection pour consulter Construction et Médecine, leurs passions et XP. Le tableau **Travail** affiche niveau et flammes sous Construction et Médecin ; le choix des priorités reste ici. Bâtir et déconstruire enseignent la compétence au contact ; voyager, livrer, poser un toit ou désinstaller un meuble ne donnent pas d’XP. La passion accélère l’apprentissage, pas directement le travail. Les autres compétences et la personnalité restent à développer. [Détails et limites](../development/skills.md).

**Première électricité** : dans **Architecte → Énergie**, placez un générateur à bois (2×2, 100 acier + 2 composants). Après sa construction, Transport doit lui apporter du bois : il produit 1 000 W et consomme 22 bois/jour, même avec peu de lampes. Dans **Meubles**, placez une lampe sur pied (20 acier, 30 W) à proximité. Elle se raccorde automatiquement à une source dans les six cases et éclaire aussi sous toiture ; inspectez-la pour lire son alimentation. Le démarrage peut être progressif, une surcharge laisse des lampes en attente. La lampe peut être désinstallée/réinstallée ; le générateur doit être déconstruit. Le réglage de ravitaillement automatique ne coupe pas le courant : marche/arrêt manuel, conduits, batteries et froid électrique restent à venir. [Règles et limites](../development/power.md).

**Composants industriels** : sur une nouvelle carte, repérez les machines compactées de teinte ocre, inspectez-les puis désignez **Miner**. Chaque case demande 25 coups au profil neutre et fournit deux composants au sol. Activez **Composants** dans une réserve pour les faire transporter ; une pile contient au plus 50 unités. Le compteur à gauche inclut aussi les composants portés. Ils servent notamment à construire le générateur à bois. Vos anciennes cartes sont préservées et ne reçoivent pas de nouveaux gisements au chargement. [Détails et limites](../development/components.md).

**Refroidir une pièce :** Architecte → Température → Refroidisseur passif. Livrez 50 bois ; le bâtiment démarre rempli pour cinq jours. Il rafraîchit au-dessus de 17 °C et consomme du bois même dehors ou quand il fait déjà frais. Transport le recharge automatiquement à 30 % ; son inspection permet de désactiver cet automatisme, et le clic droit d’un colon de le ravitailler manuellement. Vide, il reste en place. Il ne réfrigère pas la nourriture, ne se réinstalle pas et ne restitue aucun bois à la déconstruction.

Le riz et les buissons croissent normalement entre 6 et 42 °C, plus lentement en approchant 0 ou 58 °C, et cessent de croître au-delà. Les nouveaux semis sont suspendus à 0 °C et moins, ou à 58 °C et plus. L’inspection explique ces contraintes et le manque de lumière ; réchauffer une pièce partiellement découverte peut rétablir la croissance. Mortalité au gel et saisons ne sont pas encore simulées.

Le panneau de temps indique la température extérieure. Sélectionner une cellule affiche la température locale de son air. Une enceinte dont moins de 25 % des cases restent découvertes peut retenir la chaleur ; un feu allumé la chauffe jusqu’à 28 °C. Portes ouvertes et trous du toit augmentent les échanges. Les denrées vieillissent moins vite entre 0 et 10 °C et cessent de vieillir au gel, sans retrouver leur fraîcheur passée. Le délai affiché suppose la température actuelle constante. Le refroidisseur passif peut rafraîchir une pièce vers 17 °C, sans réfrigérer les aliments ; le climat quotidien tempéré ne gèle pas naturellement.

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

Les rivières forment des cours continus, les rochers pleins des massifs infranchissables et la végétation des groupes. Le départ possède un dégagement et des ressources de premier essai. La carte n'a pas encore de relief navigable ni de ponts. Les massifs peuvent être minés selon les règles ci-dessous.

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

Le déplacement, le travail et la disparition des ressources partagent un court tampon d’affichage. Une pause arrête la simulation immédiatement ; la scène termine les instants déjà confirmés, puis se fige. Les passages entre 1×, 3× et 6× répondent dès confirmation, sans attendre la fin du tampon. Le démarrage et la reprise après une pause entièrement vidée conservent une courte réserve de mouvement.

La mise à jour du décor après récolte utilise désormais un transport moins coûteux ; elle ne modifie ni les durées de travail ni les quantités obtenues. Le contrôle courant sur carte 250×250 ne détecte plus d’immobilité pendant minage/abattage, avec changements répétés de vitesse. Cela reste une mesure sur la machine de développement, pas une garantie pour toute charge ou tout matériel.

Un jour dure dix minutes à vitesse normale (6 000 ticks). Le compteur FPS mesure le rendu ; une simulation chargée peut avancer plus lentement malgré une bonne cadence d’image.

En vue très éloignée, les détails minuscules du décor sont remplacés par des silhouettes plus légères. Le terrain, les obstacles et les ordres restent les mêmes. Le compteur FPS continue de mesurer le rendu, y compris en pause.

Les massifs ont maintenant des sommets et parois irréguliers qui se raccordent entre cases. Ils gardent leurs obstacles au sol. Le minage retire les cases localement, révèle le sol brut et conserve les fragments typés ; les toits naturels restent absents ; perdre un support de toit construit peut désormais blesser les colons ; la couverture construite est disponible.

## Désigner et construire

Ouvrir Architecte, choisir Ordres pour abattre/récolter/annuler, Zones pour le stockage, Structure pour le mur, Meubles pour les lits, tables et tabourets, ou Température pour le feu de camp et le refroidisseur passif. Pour les ordres de terrain et les réserves, **cliquer ou maintenir le bouton gauche et tracer un rectangle**, dans n'importe quel sens. Les cases compatibles sont surlignées ; un compteur distingue les cases retenues et ignorées. Relâcher sur la carte applique l'ensemble. Échap ou clic droit annule le tracé ; changer d'outil ou quitter la fenêtre l'abandonne également. Relâcher au-dessus d'un panneau n'envoie aucun ordre.

L'abattage cible les arbres ; la récolte cible les buissons et cultures récoltables. Les ressources incompatibles, obstacles et ordres déjà présents sont ignorés, avec un bilan après application. Le rectangle crée du travail futur : les matériaux ne sont produits qu'après le travail des colons. Pour les constructions, cliquer sur un sol compatible : un plan peut recouvrir une plante ou une pile d’objets, que les colons dégageront. Roches et bâtiments existants restent refusés ; les réserves suivent les compatibilités du meuble. Le lit et la table occupent deux cases : Q/E ou le bouton Tourner change leur orientation avant placement. Le fantôme indique un placement refusé. Dans Architecte, choisissez **Bois** ou **Acier** avant de placer mur, lit, table, tabouret ou piquet. Le coût affiché suit ce choix ; le feu reste en bois. Les matériaux peuvent manquer au moment de poser un plan ; leur livraison précède le travail de construction. Le type choisi reste visible dans l’inspection, après emballage et réinstallation. Les ouvrages d’anciennes sauvegardes signalés « ancien » gardent leurs coûts historiques.

| Action | Règle actuelle |
|---|---|
| Abattre | Le colon travaille à côté de l'arbre ; toute sa quantité devient une ou plusieurs piles de bois au sol. |
| Récolter | Le buisson reste à 30 % de croissance et dépose ses baies ; récoltable au-dessus de 65 %. |
| Couper les buissons | Le buisson est retiré ; sa récolte éventuelle reste au sol. |
| Construire un mur | 5 bois ou acier, 10 / 14 ticks de travail ; seul le mur terminé bloque le passage. |
| Construire un lit | 45 bois ou acier livrés, 56 / 80 ticks de travail ; empreinte orientée 1×2, attribution à un colon et repos dans le lit. |
| Construire une table | 28 bois ou acier livrés, 53 / 75 ticks de travail ; empreinte orientée 1×2. Plan, cadre et table achevée se traversent ; l’entrée sur le plateau ralentit le colon. |
| Construire un tabouret | 25 bois ou acier livrés, 32 / 45 ticks de travail ; une case, une place de repas à côté d’une table. |
| Construire un feu | 20 bois livrés, 20 ticks de travail ; une case et une place de service orientée devant. |
| Annuler | Retire l'ordre et libère ses engagements ; les matériaux restent localisés au sol. Ne détruit pas un bâtiment achevé. On peut cliquer sur chacune des cases de son empreinte. |

Un arbre prend 100 ticks de travail, un buisson 60, hors déplacement et interruptions. La simulation avance à 10 ticks/seconde à vitesse normale. Les durées de construction indiquées sont bois / acier, converties au pas local avec vitesse neutre. Les valeurs de collecte restent provisoires ; compétences, qualité et échecs sont absents.

## Déconstruire un ouvrage

Dans **Architecte → Ordres → Déconstruire**, cliquez ou tracez un rectangle sur les bâtiments. L’inspection propose également Déconstruire et Annuler cet ordre. Un meuble de deux cases reste un seul objet. Le bâtiment subsiste jusqu’à la fin du travail ; un colon rejoint une case adjacente et l’enlève par le travail Construction, après les chantiers ordinaires. Le clic droit permet de le prioriser ou de le mettre en file avec Maj.

Environ la moitié du matériau revient **au sol** : un mur de 5 bois rend 2 ou 3 bois ; un lit neuf de 45 acier rend 22 ou 23 acier. Le feu de camp ne rend rien, y compris son combustible. Un meuble utilisé peut attendre la libération de sa réservation. Un lit retiré perd son propriétaire. Un retrait sans place pour ses matériaux attend ; il ne les efface pas.

Annuler conserve le bâtiment. Interrompre remet le travail de retrait à zéro ; sauvegarder/recharger conserve l’action exactement. Déconstruire détruit le meuble. Pour le conserver entier, utilisez Désinstaller ou Réinstaller sur un meuble admissible.

## Répartir le travail

Ouvrir Travail pour régler Collecte, Construction, Transport, Culture et Cuisine. **1 est la priorité la plus forte, 4 la plus faible, 0 désactive la famille.** Transport approvisionne chantiers et réserves ; Construction peut aussi dégager les piles et apporter ses matériaux même si Transport vaut 0. Le constructeur coupe les plantes gênant son chantier même si Collecte vaut 0. Désactiver Construction n'empêche donc pas un colon dont Transport reste actif d'apporter du bois à un plan. Une modification entre priorités actives s'applique lors du prochain choix de travail ; désactiver une famille interrompt son activité.

Un transporteur réserve une quantité de pile et de la place à destination, se déplace jusqu'à la source, prélève, porte et dépose. Sa cargaison est visible. Deux colons peuvent se partager une pile sans promettre les mêmes unités. La première livraison réelle transforme le plan en cadre. Un constructeur finit seulement quand tous les matériaux sont livrés et que rien ne gêne l’empreinte. Plans et cadres laissent passer, avec un ralentissement à l’entrée dans un cadre. Les piles gênantes sont portées ailleurs et les plantes réellement coupées ; un colon immobile ou une place de repas réservée fait attendre le chantier. Une interruption conserve la progression et les matériaux déjà déposés ; une cargaison abandonnée devient une pile au sol.

Les chemins contournent eau, terrain rocheux et murs. Tables, lits et feux se traversent avec un ralentissement d’entrée ; le colon choisit une case libre pour travailler ou attendre. Le lit reste utilisable pour le sommeil réservé. Passer directement entre deux tables/lits/feux/tabourets ne répète pas le supplément. Le déplacement sur table, lit ou tabouret adapte aussi sa hauteur visuelle. Les colons civils se traversent sans déplacer ceux qui restent sur place ; l'utilisation d'un lit ou d'un poste reste réservée. Inspecter un chantier indique notamment ses livraisons et ce qu'il attend. V58 ajoute le blocage des corps hostiles debout et les permissions de porte ; la navigation tactique complète reste à développer.

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

Construisez un **feu de camp** dans Architecte → Température : vingt bois doivent être livrés. Il démarre rempli et brûle dix bois par jour. L’inspection indique son combustible et permet de désactiver son ravitaillement automatique. Le feu vide reste en place et ne permet plus de cuire. Il éclaire localement et chauffe une pièce retenant son air jusqu’à 28 °C.

Activez **Cuisine** dans Travail, puis inspectez le feu et ajoutez une facture « repas simple ». Choisissez un nombre de fabrications, un stock cible ou une répétition sans limite. Le détail permet d’autoriser baies/riz, limiter le rayon de recherche et choisir rangement ou dépôt au sol. Cliquez **Appliquer la facture** après modification. Les flèches ordonnent les factures ; une facture suspendue ou impossible laisse passer la suivante.

Le cuisinier rassemble dix unités admises, les porte au poste puis travaille avant de créer un repas à 0,9 nutrition. Gardez libre la case de service devant le feu et prévoyez des réserves pour les repas, distinctes des piles de riz/baies. Le mode « jusqu’à X » compte les repas stockés et portés ; ceux posés au sol hors réserve ne suffisent pas à maintenir ce seuil.

L’inspection du colon indique collecte des ingrédients, progression de cuisson ou livraison du repas. Chaque facture explique ses blocages connus : Cuisine désactivée, combustible, ingrédients admis dans le rayon ou place de travail obstruée. Si assez d’ingrédients sont présents, vérifiez aussi les chemins et les cases libres autour du poste ; le compteur ne garantit pas leur accès.

Un cuisinier peut ravitailler son feu vide même avec Transport désactivé. Interrompre une préparation conserve les ingrédients, mais son travail partiel recommence ; sauvegarder puis recharger conserve au contraire le travail actif. Autres recettes, compétences et intoxications restent à développer.

## Nourriture, repos et humeur

Une valeur de nourriture élevée signifie que le colon est rassasié. À 30 ou moins, il réserve une portion accessible, marche jusqu'à la nourriture puis la prend en main. Après prélèvement, il cherche une place disponible avec tabouret adjacent à une table, à 32 cases au plus de sa position actuelle. Il y transporte sa portion et s’assied. Sans siège accessible, il mange debout à proximité. Il mange pendant 50 ticks : la portion reste physique jusqu'à la fin, puis est consommée : cinq points par baie ou 90 par ration, avec une jauge plafonnée à 100. Un obstacle peut empêcher le repas ; réserver ou porter ne satisfait jamais la faim. Une interruption dépose la portion intacte là où se trouve le colon. À 20 ou moins sans repas accessible, il abandonne les travaux non vitaux et peut récolter les baies désignées. Les nouvelles parties commencent avec 18 repas de survie, et les buissons donnent des baies. La quantité de baies prélevée dépend de la faim et du stock disponible. L'interface distingue leurs quantités et la nutrition totale. Les repas simples peuvent être cuisinés au feu de camp. Les régimes d’Affectations filtrent les aliments ; les intoxications restent absentes. Les anciennes parties conservent des « Portions historiques » à 35 points et leur ancien rythme de faim. Un repas terminé sans plateau adjacent laisse un souvenir de −3 humeur pendant une journée ; il se renouvelle sans se cumuler. Manger ensuite à table ne supprime pas le souvenir déjà présent.

Sous 30 de repos en plage Libre, ou sous 75 en plage Sommeil, le colon termine son travail engagé puis rejoint son lit accessible ou s’attribue un lit libre. Une plage Travail empêche le départ volontaire au lit et réveille un dormeur ayant au moins 20 de repos. La réservation est exclusive et le sommeil commence une fois arrivé ; le personnage est allongé sur le matelas dans son orientation réelle. Inspecter un lit permet de modifier son propriétaire. Sans couchage utilisable, il dort au sol ; l'épuisement peut aussi interrompre le trajet. Il se réveille une fois reposé à 100, ou pour une faim critique si une portion accessible existe. Il doit se lever pour manger seul ; un médecin peut nourrir un patient couché selon les règles V48. Un lit voisin ne donne aucun bonus. Le confort augmente progressivement pendant l’utilisation du lit ou d’un tabouret, jusqu’au plafond du meuble, puis baisse en dehors de son utilisation. L’humeur combine encore les besoins avec ces premiers effets ; les autres pensées, relations et crises mentales restent absentes.

Les personnages provisoires possèdent des animations de marche, travail, ingestion debout/assise et sommeil calculées sur le GPU. Le profil adulte consomme au rythme de base de 1,6 nutrition/jour, réduit sous les seuils de faim ; traits absents, capacités physiques et blessures intégrées V45. Voir [les aliments](../development/food-items.md) et le [catalogue de contenu](content-catalogue.md).

Les colons choisissent les aliments accessibles en tenant compte du goût et de la distance. Des baies fraîches proches peuvent être préférées à une ration de survie ; le riz cru est moins apprécié, mais reste consommé lorsque les alternatives sont trop loin ou inaccessibles. Un aliment qui va pourrir dans moins d’une demi-journée bénéficie d’une préférence supplémentaire, tout en tenant compte du trajet. Les autorisations du régime sont appliquées avant ces préférences, y compris si la faim devient critique.

## Régimes alimentaires

Ouvrez **Affectations (F3)** et choisissez un régime pour chaque colon. « Gérer les régimes alimentaires » permet de créer, dupliquer, renommer et cocher les aliments autorisés ; cliquez sur Appliquer. Modifier un régime agit sur tous ses utilisateurs. Pour le supprimer, affectez d’abord un autre régime à ses colons.

« Sans restriction » autorise tout le catalogue actuel ; « Repas uniquement » autorise les repas préparés, rations et portions historiques ; « Sans rations » permet de conserver les repas de survie ; « Rien » interdit de choisir toute nouvelle portion. Ces préréglages locaux couvrent uniquement les aliments présents. Un colon ne contourne pas automatiquement un régime qui l’empêche de manger, même à faim zéro. Le tableau signale ce blocage ; réautorisez un aliment ou approvisionnez un aliment permis.

Un repas déjà engagé peut être terminé après le changement. Transport et ingrédients des factures restent indépendants : le cuisinier peut préparer un repas qu’il n’est pas autorisé à manger. Aucun inventaire personnel de nourriture ni filtre de provenance des ingrédients n’est encore disponible.

## Conserver la nourriture

À une température de 10 °C ou plus, les baies se gardent 14 jours, le riz 40 jours et les repas simples 4 jours. Inspectez une pile pour voir le temps restant. Les rations de survie ne pourrissent pas.

Transporter ou fractionner conserve la fraîcheur ; mélanger des unités du même aliment produit un âge moyen pondéré. Une nourriture pourrie disparaît, y compris dans les mains d’un colon. La faim n’est pas satisfaite si cela arrive avant la fin du repas. Un ingrédient perdu interrompt la cuisine ; les autres restent physiques. Évitez de cuire une énorme réserve : le mode « jusqu’à X » permet de renouveler progressivement les repas.

Le site conserve son cycle quotidien tempéré, sans saisons ni météo. Réfrigérateurs et dégâts d’exposition ne sont pas encore jouables ; la toiture construite ne réfrigère pas les aliments. Les anciennes sauvegardes démarrent leurs aliments frais au tick chargé, faute d’âge historique ; les nouvelles sauvegardes conservent leur âge réel.

## Sauvegarder et reprendre

Menu → Sauvegarder conserve le monde, les travaux, les réservations, les trajets et les besoins. Elle occupe un emplacement local à ce navigateur. Recharger remplace la partie courante par la dernière sauvegarde ; une sauvegarde invalide est refusée. La vitesse et l'angle de caméra ne font pas partie de la sauvegarde. Il n'y a pas encore d'autosauvegarde ni d'export de fichier.

Avant de créer une nouvelle colonie, le jeu conserve aussi l'état courant dans un emplacement « Colonie précédente », distinct de la sauvegarde manuelle. Cette copie contient la dernière colonie remplacée, pas tout l'historique des colonies. La création est refusée si cette copie ne peut pas être enregistrée. Les anciennes sauvegardes gardent leurs dimensions, leur terrain et leurs ressources ; leur ancien stock global, lorsqu'il existe, est converti en piles et leurs matériaux réservés sont localisés aux chantiers. Les nouvelles sauvegardes conservent également les cargaisons et les réserves. Créer ou charger un grand territoire prépare toute sa carte ; la durée de cette opération dépend de l'appareil.

## Limites et suite

Pas encore d'autres cultures, autres postes/recettes de cuisine, chaîne du froid, autres minerais que l’acier et les machines compactées, autres familles de loisirs, animaux, autres armes, combat complet, médecine complète, relations, traits, recherche, commerce, câbles/batteries/interrupteurs électriques, toit naturel, santé thermique, incendie, météo dynamique, carte du monde ou storyteller. Les coûts de sols et autres profils de déplacement, les réserves à plusieurs cases partageant une politique, les autres familles sélectionnables, les fournisseurs supplémentaires de travail lié sur une case et les tournées logistiques restent à développer. Les modèles sont provisoires ; la congestion entre agents actifs et la calibration des besoins restent ouvertes. La faim ne cause pas encore de malnutrition ni de décès.

La suite est suivie dans [le plan de développement](../ROADMAP.md). Les détails de la référence et les futures interactions sont dans [la matrice des systèmes](systems-matrix.md).

Les équipements, vêtements et portraits associés restent prévus. Les modèles sont provisoires ; les sols, roches, plantes et biomes génériques ne constituent pas un catalogue complet. Consultez l’[inventaire des systèmes](implementation-status.md), le [catalogue](content-catalogue.md) et les [écarts assumés](decisions.md).

## Prendre le temps de se divertir

Dans **Architecte → Loisirs**, placer un piquet de fers à cheval : dix bois doivent être livrés et l’ouvrage construit. Les douze cases indiquées autour sont à cinq cellules du piquet. Jaune signifie place géométriquement libre avec vue dégagée ; un colon doit encore pouvoir la rejoindre. Trois colons peuvent jouer, chacun à sa place réservée. Un mur coupe le lancer, une table entre le joueur et le piquet ne coupe pas sa vue.

Sans installation, les colons peuvent rejoindre un emplacement du voisinage et s’allonger pour observer le ciel. Ce loisir appartient à la détente solitaire, les fers à cheval à la dextérité. Multiplier les piquets ne crée pas une nouvelle famille. La météo et les pièces ne modifient pas encore ces activités.

Dans **Horaires**, la plage Loisirs cherche une activité sous 95 % de satisfaction ; Libre sous 35 %. Le colon finit son travail engagé et satisfait ses besoins prioritaires. Il ne gagne rien en chemin. Pendant les premières deux heures de jeu, les loisirs ne démarrent pas. L’inspection montre satisfaction, effet d’humeur et lassitude de chaque famille : au-dessus de 50 %, le colon cesse de choisir cette famille jusqu’à ce qu’elle retombe sous 30 %. Sommeil et variété l’aident à conserver une journée équilibrée ; dormir ne fait toutefois pas baisser la lassitude. Les attentes restent celles d’un petit camp, sans calcul de richesse.

## Construire dans une réserve

Vous pouvez poser un plan dans une réserve. Mur, lit et table retirent les cellules couvertes de la zone, mais laissent les objets présents. Les transporteurs concernés déposent leur cargaison ; si aucun dépôt conservatif n’est possible, le plan est refusé. Annuler le plan ne rétablit pas la réserve.

La table conserve une pile déjà présente, affichée sur son plateau, mais n’accepte pas de zone de stockage. Tabouret et piquet peuvent garder une réserve utilisable. Le feu peut recouvrir son tracé, mais aucun objet ne sera rangé sur sa cellule ; le combustible utilise l’ordre de ravitaillement. Murs, lits et feux attendent le déplacement des piles gênantes. La table se traverse mais ne sert pas de poste de travail ou de repos. Après interruption pendant une traversée, le colon finit son arête puis rejoint une case admissible ; il ne se téléporte pas.

## Déplacer un meuble entier

Inspectez un lit, une table, un tabouret ou un piquet et cliquez sur **Réinstaller**. Choisissez sa nouvelle case ; **Q/E** tourne son empreinte. Un bâtisseur dégage si nécessaire l’emplacement, rejoint le meuble, le retire, le porte puis le pose. Il ne consomme pas de nouveau bois. Le propriétaire du lit reste le même, mais le couchage est indisponible pendant le déplacement. Un meuble occupé attend la fin de son usage.

**Désinstaller**, dans l’inspection ou Architecte → Ordres, dépose un paquet au sol. Sélectionnez ce paquet puis **Installer** pour le remettre en service. Si un colon masque sa sélection, cliquez successivement au même endroit pour atteindre l’inspection de la cellule. Un paquet posé sur un meuble compatible reste la cible du bouton Installer ; Désinstaller concerne le meuble déjà présent. Annulez un déplacement sur son plan ou sur son meuble source encore présent : si le meuble est déjà porté, il est déposé entier ; faute de place, l’annulation est refusée. Sauvegarde et rechargement conservent le portage.

Mur et feu ne sont pas déplaçables de cette façon. Désinstaller séparément relève de Construction ; réinstaller peut être effectué par Construction ou Transport. Dans les réglages de réserve, cochez **Meubles emballés** pour les ranger automatiquement. Un paquet occupe une case entière. Le clic droit permet de prioriser son transport et Maj de le mettre en file. Les réserves de même priorité ne provoquent pas de déplacement ; une priorité supérieure attire le paquet. Les anciennes réserves gardent leurs filtres : activez cette nouvelle catégorie pour les meubles.

Un constructeur ou cultivateur dégage à proximité un paquet qui gêne son chantier ou semis, même sans Transport ordinaire. Le rangement vers une réserve est ensuite une tâche séparée. Annuler le parent ou rendre la destination incompatible libère ce transport et dépose le paquet conservé, si une place est disponible. Table, tabouret et piquet peuvent garder un objet compatible sur leur cellule.

## Reconnaître les roches

Une nouvelle carte répartit les massifs et pierres voisines en régions de granite, calcaire, marbre, grès ou ardoise. Sélectionner leur case affiche le type. Un ancien massif peut afficher « type historique non défini » : le chargement préserve sa carte. Les massifs sont exploitables par le minage décrit ci-dessous. Les petites pierres décoratives ne sont pas encore transportables ; les blocs taillés au poste servent aux constructions admissibles décrites plus bas.

## Miner et ranger les fragments

Dans **Architecte → Ordres**, choisir **Miner** (M), puis cliquer ou tracer sur les massifs. Activer **Minage** dans Travail. Le colon rejoint la roche, lui fait face et frappe ; ses PV sont inspectables et les dégâts restent acquis après annulation. Un massif extrait découvre un sol rocheux non fertile. Il laisse un fragment de la même roche dans 25 % des cas, sans donner directement des blocs de construction.

Créer une réserve avec **Fragments de roche** autorisés, puis désigner les fragments via **Transporter les fragments** dans Ordres. Un fragment occupe une case entière et se porte individuellement ; les types ne fusionnent pas. Le clic droit du colon peut aussi imposer son rangement. Une interruption après prise conserve le fragment mais peut nécessiter une nouvelle désignation. L’atelier de taille peut être construit en V31 ; ses recettes de blocs sont livrées en V32 ; les autres minerais que l’acier et les machines compactées et les toits naturels restent absents.

## Extraire une réserve d’acier

Les **nouvelles colonies** peuvent présenter de l’**acier compacté**, reconnaissable à ses teintes brunes et son inspection. Architecte → Ordres → **Miner** le désigne comme un massif ; le métier Minage doit être actif. Le colon rejoint le gisement, frappe et produit 40 unités d’acier dans la case libérée. Les dégâts restent après annulation et sauvegarde.

Créer une réserve autorisant **Acier** : les transporteurs le rangent automatiquement, sans outil « Transporter les fragments ». Une pile contient au plus 75 unités ; le total apparaît à gauche. Les anciennes réserves refusent ce nouveau matériau jusqu’à modification de leur filtre. Les anciennes cartes conservent leur géologie, sans apparition rétroactive de gisements.

L’acier est extractible, stockable et utilisable pour les constructions à matériau sélectionnable dans Architecte, dont la table de taille V31. Le rendement est encore neutre, les compétences n’étant pas simulées.

## Préparer un atelier de taille

**Architecte → Production → Table de taille de pierre** : choisir Bois (75 bois + 30 acier) ou Acier (105 acier), puis tourner l’emprise 3×1 avec Q/E. Tous les matériaux doivent être livrés avant la finition. Le plateau garde les piles compatibles, mais retire les zones sous son empreinte. Les colons peuvent le franchir, sans s’y arrêter pour une autre activité.

L’inspection permet de désinstaller ou réinstaller l’atelier comme un meuble entier, ou de le déconstruire pour récupérer environ la moitié des matériaux. **La fabrication de blocs est disponible** : activer Artisanat dans Travail puis ajouter une facture dans l’inspection de l’atelier. La recherche reste absente ; les facteurs de lumière et de pièce sont décrits ci-dessous.

## Tailler et ranger les blocs

La facture générale propose cinq filtres de roche, un rayon, la suspension, la répétition et la destination. Un artisan va chercher un fragment accepté, le porte au plateau, travaille puis range **vingt blocs de la même pierre**. Il n'est pas nécessaire de désigner le fragment au transport. Les fragments historiques non typés sont exclus.

**Faire X fois** compte les fragments taillés ; **Jusqu'à X** compte les blocs stockés ou portés. Attention : cette facture générale compte tous les blocs, même lorsque ses ingrédients sont filtrés sur une seule pierre. Cocher **Blocs de pierre** dans une réserve pour accueillir les produits ; un manque de place conserve la cargaison ou conduit à un dépôt au sol. Une livraison peut remplir plusieurs piles successives.

Clic droit sur le poste avec un colon sélectionné : prioriser la taille ; Maj ajoute en file. Désinstaller/réinstaller l'atelier conserve ses factures. Un atelier déjà réservé attend avant d'être déplacé. Les blocs servent aux constructions décrites ci-dessous ; la lumière et la pièce influencent désormais la vitesse ; compétences et recherche restent à venir.

## Construire avec la pierre

Dans Architecte, mur, lit, table, tabouret et piquet proposent aussi granite, calcaire, marbre, grès et ardoise. Chaque chantier exige les blocs choisis : les autres pierres ne les remplacent pas. La table de taille reste en bois ou acier ; le feu reste en bois.

La construction en pierre demande davantage de travail, le grès moins que les autres pierres disponibles. Un lit en pierre restaure le repos à **90 %** de l’efficacité du lit bois/acier ; l’interface indique ce choix. Déplacer le meuble conserve ce comportement. Déconstruction rend environ la moitié du matériau d’origine, sans transformer la pierre. Résistance, beauté et inflammabilité des ouvrages ne sont pas encore simulées.

## Portes manuelles

Dans **Architecte → Structure → Porte**, choisissez un matériau. Une porte coûte 25 unités et s'oriente selon les murs voisins. Le colon s'arrête au seuil pour l'ouvrir ; le bois est plus rapide que l'acier, lui-même plus rapide que la pierre.

Inspectez-la pour **Maintenir ouverte** après le prochain passage ou **Interdire le passage**, même si elle est ouverte. Retirer le maintien peut attendre un nouveau passage. Les occupants et objets empêchent la fermeture ; dégager ou ranger l'objet libère la porte. Le colon déjà engagé termine son mouvement.

La porte se déconstruit mais ne s'emballe pas. Il faut encore déconstruire un mur avant d'y poser une porte. La toiture construite est disponible ; les murs et portes échangent de la chaleur. Une porte ouverte échange plus rapidement ; fermée, elle conserve une fuite thermique.

Les fragments au sol peuvent être traversés, mais ne servent pas de place pour observer le ciel ou jouer aux fers à cheval. Dégagez la case pour la rendre disponible.

## Inspecter une pièce

Cliquez sur le sol ou un meuble pour lire **Pièce non couverte** et son nombre de cases dans l’inspection, en bas à gauche. Un colon sélectionné indique l’espace de sa cellule. Les murs achevés, roches et portes séparent les pièces ; une porte ouverte reste un seuil. Plans et cadres ne les ferment pas encore. Une brèche latérale peut ouvrir l’espace jusqu’au bord de la carte ; un coin diagonal manquant ne suffit pas.

Le nombre compte le sol intérieur, y compris sous les meubles, sans les murs ni les portes. Ce n’est pas une statistique de confort. La toiture construite est disponible et son compte figure ici. La couverture permet de retenir un air distinct, que le feu peut chauffer. Lumière, extérieur et rôle de pièce influencent les ateliers. Les besoins psychologiques de logement restent à développer.

## Poser ou retirer un toit

Dans **Architecte → Zones**, tracer **Construire un toit**. Les bâtisseurs rejoignent la zone et travaillent sans consommer de matériau. Murs terminés, portes et roches portent le plafond ; il faut une couverture reliée aux supports. Un arbre gênant doit être abattu. Fermer une petite enceinte peut créer automatiquement la zone, mais les colons doivent toujours poser le toit.

**Retirer un toit** commande son retrait et empêche sa repose automatique. **Ignorer le toit** efface les zones sans enlever la couverture. Le bouton **Toits : masqués/visibles** change seulement la vue. L’inspection indique les cases couvertes, indépendamment de ce bouton.

Le riz et les baies ne poussent plus sans soleil sous un toit ; les colons cherchent ailleurs pour regarder le ciel. Les pièces ont une température locale et les ateliers tiennent compte de leur milieu. Les dégâts thermiques sur les plantes restent à développer avant les contenus froids/chauds. Retirer un support peut faire tomber la couverture et blesser les colons dessous. Les dégâts aux objets et les gravats restent absents. Les toits naturels des montagnes ne sont pas présents.

## Éclairer les ateliers

La lumière de gameplay figure dans l’inspection. Un toit coupe la lumière du ciel. Un feu allumé éclaire les cases proches, jusqu’à 50 %, même la nuit ; murs, roches et portes arrêtent cette diffusion. Plusieurs feux ne dépassent pas 50 % : ils ne permettent pas de faire pousser du riz sous un toit.

Éclairez **la place du colon devant le poste**. À 30 % de lumière, sa vitesse de production ne subit plus de pénalité lumineuse ; dans l’obscurité complète, elle tombe à 80 %. La taille demande 160 ticks de travail dans un atelier éclairé, 200 dehors éclairé, 250 dehors dans le noir. Le feu éclairant son cuisinier demande 60 ticks par repas à l’intérieur, 75 dehors.

Le rôle est calculé depuis les meubles : un lit peut transformer un atelier en chambre, plusieurs tables en salle à manger. La taille subit alors une pénalité de mauvaise pièce de 20 %. L’inspection détaille les facteurs ; une petite cour fermée et un auvent ouvert ne sont pas traités de la même manière. Aucun bonus d’humeur de chambre ou de salle à manger n’est encore associé à ces rôles.

Le ciel et les flammes restent stylisés. Les halos sur le décor et l’assombrissement des intérieurs sont visibles aussi en vue coupée ; l’inspection donne les valeurs de gameplay. La lumière module cuisine et taille, ainsi que les travaux et déplacements décrits ci-dessous.

## Voir les intérieurs et les feux

Un feu allumé éclaire le sol, le mobilier et les colons à proximité. Son halo respecte les obstacles lumineux ; une porte ouverte ne transmet pas la lumière du feu dans cette version de référence. Les bâtiments couverts restent sombres sans éclairage, même lorsque **Toits : masqués** permet d’en voir l’intérieur. Couper les murs ne supprime pas non plus leur obstacle logique. Ces réglages fonctionnent en iso et en perspective, sans modifier la colonie.

Les couleurs chaudes servent à lire la scène : consultez l’inspection pour le pourcentage exact et les effets sur la production. Les lampes sur pied peuvent être alimentées par un générateur à bois. Le chauffage électrique et les ombres projetées par les feux restent à développer.

## Travailler et circuler dans l’obscurité

La lumière agit aussi sur l’abattage, les récoltes, les semis, les constructions/retraits et les toits : 80 % du rythme dans le noir, retour à 100 % dès 30 % de lumière. Éclairer le colon compte ; éclairer seulement sa cible ne suffit pas. L’inspection indique ce facteur, distinct des autres propriétés encore absentes.

Les mineurs préparent leurs coups plus lentement dans le noir. Les colons marchent aussi plus lentement, y compris pour porter un objet, manger ou rejoindre leur lit. Un coup ou un passage déjà engagé conserve sa cadence ; le suivant prend le nouvel éclairage. Les besoins et quantités produites ne sont pas eux-mêmes réduits de 20 %.


## Blessures et incapacité

Évitez de déconstruire ou miner le dernier appui d’un toit construit sous lequel se trouvent des colons. Retirez d’abord la toiture depuis Architecte. Un effondrement peut causer des lésions, une hémorragie ou une perte de partie corporelle. Sélectionnez le colon : **Santé** affiche ses blessures, sa douleur, son sang perdu et ses principales capacités. Les alertes signalent blessés à terre et saignements.

Une blessure peut ralentir déplacements, travaux et ingestion. Un colon à terre cesse ses actions et conserve sa cargaison si le sol empêche le dépôt. Il reste dans son lit s’il l’utilisait déjà ; sinon un sauveteur peut l’y porter. Les blessures non permanentes guérissent progressivement, avec avantage à la posture allongée et au lit réel ; la famine bloque cette guérison. Les cicatrices et parties perdues persistent. **Traitements à sec ou avec médicament et alimentation assistée sont disponibles** selon les politiques décrites plus haut. Ramper vers un lit reste absent.

Un colon décédé reste visible et inspectable sur place, sans agir. Transport des dépouilles, enterrement et décomposition seront ajoutés. La santé thermique, la malnutrition, les maladies et les autres producteurs de blessures restent à développer ; les balles de revolver causent déjà de vraies blessures.
