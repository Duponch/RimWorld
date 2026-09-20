# Accueil et création de partie — contrat cible

**Cible définie le 20 septembre 2026, NON LIVRÉE.** Ce document précise le parcours demandé par l'utilisateur ; il n'annonce ni des menus déjà fonctionnels, ni un scénario Core complet, ni une difficulté déjà appliquée. [ROADMAP](../ROADMAP.md) reste l'unique calendrier. Le [départ Trois survivants V80](scenario-start.md) et l'[inventaire fonctionnel](../gameplay/implementation-status.md) décrivent l'existant.

## Référence et choix retenus

Dix-sept captures utilisateur ont été effectivement examinées : les huit premières montrent accueil de RimWorld **1.6.4871**, choix du scénario, choix du narrateur, puis cinq infobulles de difficulté. Elles montrent le menu vertical à droite ; une liste de scénarios à gauche et leur description à droite ; les narrateurs à gauche, difficultés et mode de sauvegarde au centre, illustration à droite ; Retour et Suivant en bas. Les boutons radio de difficulté et de mode sont vides. Quatre captures supplémentaires montrent paramètres du monde, sélection du site, préparation des personnes et message d’arrivée. Enfin, cinq captures accompagnent le nouveau témoin sauvegardé : monde, site boréal/grandes collines, candidats, arrivée et vue dézoomée. Une capture établit une présentation, pas l’application des règles après lancement.

Lecture locale complémentaire de `Assembly-CSharp.dll`, version **1.6.4871 rev590**, sans modification du jeu :

| Classe/méthode | Fait vérifié utile au contrat |
|---|---|
| `MainMenuDrawer.DoMainMenuControls` | Nouvelle colonie ouvre le choix de scénario ; chargement et options ouvrent leurs dialogues. Le menu de partie distingue sauvegarde, chargement et retour à l'accueil. |
| `Page_SelectScenario.EnsureValidSelection` | Première entrée du catalogue retenue initialement ; sélection et description sont distinctes. |
| `Scenario.GetFirstConfigPage`, `PageUtility.StitchedPages` | Parcours Core : narrateur → paramètres du monde → site → personnes ; liens Retour/Suivant entre pages. |
| `Page_SelectStoryteller.PreOpen/CanDoNext` | Premier narrateur visible selon `listOrder`, ici Cassandra ; choix explicite de difficulté et de mode requis hors outils de développement. |
| `Page_CreateWorldParams.Reset/CanDoNext` | Graine de monde aléatoire, paramètres propres au monde ; génération lancée explicitement. Les valeurs Core sont détaillées dans la recherche. |
| `Page_SelectStartingSite.CanDoNext` | Site valide nécessaire ; choix aléatoire et validation de l'admissibilité distincts. |
| `Page_ConfigureStartingPawns` | Consultation/sélection des personnes, relance d'un candidat et contrôles avant départ. |
| `Dialog_SaveFileList_Load` | Liste destinée au chargement, avec vérification de version avant remplacement. |

Provenance de l'assembly, constat des valeurs et écarts : [base Core vérifiée](../research/core-reference-baseline.md). Les captures supplémentaires confirment les pages monde/site/personnes et l’arrivée : paramètres à gauche et factions à droite, globe avec fiche de site, trois personnes sélectionnées et cinq laissées en arrière, fiche individuelle et compétences d’équipe. La page de chargement reste établie par les classes et le contrat du projet, sans capture utilisateur de cette page. Dans le premier groupe de quatre vues, le site affiché est plat et tempéré, tandis que l’arrivée paraît aride : ces vues ne prouvent pas un même site. Le dernier groupe correspond au témoin `Reference-Core-4871`, vérifié en forêt boréale/grandes collines ; [observation séparée](../research/colony-observation-reference.md#nouveau-départ-contrôlé-par-sa-sauvegarde).

Choix explicites de l'utilisateur : **Atterrissage forcé seul scénario actif**, **Récit d'aventure seule difficulté active**, Nouvelle partie et Charger, Options éventuellement. Cassandra Classique reprend la présélection originale. Le **mode Rechargeable à tout moment** seul disponible est notre limitation initiale de périmètre, cohérente avec les sauvegardes déjà prises en charge ; ce dernier choix n'a pas été demandé explicitement par l'utilisateur. Récit d'aventure est une décision de périmètre, pas « la difficulté par défaut de RimWorld ». Les autres choix restent visibles et grisés.

## Accueil

Le démarrage normal ouvre l'accueil de Lisière. Une ancienne sauvegarde n'est ni chargée automatiquement ni remplacée par une colonie nouvelle. Aucune simulation de colonie ne progresse derrière cet écran.

| Entrée | Action et état cible |
|---|---|
| Nouvelle partie | Active ; ouvre le choix de scénario, sans créer le monde jouable immédiatement. |
| Charger une partie | Active ; ouvre les sauvegardes réellement disponibles. Si aucune n'existe, état vide explicite avec Retour, sans faux fichier sélectionnable. |
| Options | Active seulement si elle ouvre des réglages déjà opérants. Sinon grisée, sans boîte vide. |
| Tutoriel, Mods, Crédits et autres entrées non réalisées | Visibles et grisées ; aucune action cachée. Ne pas prétendre que le camp historique est le tutoriel Core. |
| Retour au bureau, si repris dans la composition | Indisponible dans le navigateur tant qu'aucune action pertinente n'existe ; ne pas tenter de fermer arbitrairement un onglet. |

Conserver l'organisation générale de référence avec notre titre, notre fond et nos visuels. Aucun faux lien vers un Workshop, achat d'extension ou compte Steam. Les éléments de communication propres à RimWorld ne deviennent pas des fonctions fictives de Lisière.

Le menu reste utilisable si WebGPU est indisponible : expliquer la limite au lancement d'une colonie, permettre de consulter les possibilités de récupération réellement fournies. Ne pas installer un moteur de rendu complet par page de menu. Le compteur FPS reste lié à un rendu réel ; aucune valeur copiée d'une capture ou d'une ancienne partie.

## Nouvelle partie

### 1. Scénario

Liste à gauche, description et contenu à droite ; Retour vers l'accueil et Suivant vers le narrateur. Atterrissage forcé est sélectionné initialement. Tribu perdue, Riche explorateur, Brutalité nue, scénarios personnalisés et éditeur restent indisponibles tant que leur comportement n'existe pas. Les contenus d'extensions ne sont pas ajoutés au parcours Core.

La fiche décrit **ce que le lancement produit réellement** : personnes, matériel, connaissances, lieu et limites. La cible Core complète est conservée dans la recherche ; elle ne doit pas être affichée comme une liste de fournitures promises si certains objets n'existent pas.

**Transition depuis V80 :** le libellé demandé n'autorise pas à transformer silencieusement `survivors` en Crashlanded complet. Si le nouveau menu précède l'achèvement de sa dotation, la fiche porte clairement « adaptation partielle » et indique les différences utiles au choix du joueur. La provenance des anciennes parties reste Trois survivants, avec sa révision et ses stocks inchangés. Un changement réel du profil initial exige un contrat de scénario et une révision explicite, pas seulement un nouveau texte.

### 2. Narrateur, difficulté et sauvegarde

La page conserve trois choix séparés : qui produit les incidents, quels paramètres règlent leurs conséquences, et comment la partie peut être rechargée.

- **Cassandra Classique** préselectionnée. Les autres narrateurs visibles restent indisponibles dans ce profil tant que leurs règles ne sont pas intégrées.
- Liste de difficultés dans l'ordre observé : Pacifique, Bâtisseur de communauté, Récit d'aventure, Lutte pour la survie, De sang et de poussière, Perdre est amusant, Personnalisation en détail. Seul Récit d'aventure est sélectionnable.
- Mode Rechargeable à tout moment sélectionnable ; mode Engagement grisé.
- Difficulté et mode commencent sans sélection, comme la création normale observée ; le joueur confirme les deux choix. Suivant explique précisément le choix manquant au lieu d'ignorer le clic.
- Infobulles lisibles au survol **et au clavier**. Elles expliquent le sens du réglage ; elles ne certifient pas des systèmes encore absents.

L'étiquette Récit d'aventure ne peut pas recouvrir les calendriers provisoires de V81 sans distinction. Les paramètres des mécaniques présentes doivent être reliés au profil réellement appliqué ; les pans de difficulté encore absents sont annoncés une fois clairement dans la fiche. Même exigence pour Cassandra : nom, réglage d'introduction et budget d'incidents sont des états distincts, pas un simple changement d'illustration.

Retour conserve les choix de cette création. Il ne remet pas secrètement les personnes ou l'aléatoire à zéro.

### 3. Monde, site et personnes

La structure cible continue par **monde → site → personnes → départ**, selon la référence Core. Elle ne force pas l'implémentation immédiate de la planète, de tous les biomes ou des biographies : ROADMAP décide du périmètre effectivement livré.

| Étape | Contrat lorsqu'elle est proposée au joueur |
|---|---|
| Monde | Graine éditable et relance explicite. N'afficher comme actifs que des paramètres ayant un effet réel. Monde et carte locale ne sont pas des synonymes. |
| Site | Site sélectionné et renseignements cohérents avec la carte produite ; admissibilité contrôlée. Un bouton Aléatoire choisit dans les possibilités réelles, sans promettre tous les biomes. |
| Taille/paramètres avancés | 250×250 reste la référence standard. Les autres tailles ne deviennent disponibles qu'avec génération et budgets pris en charge ; aucun agrandissement motivé seulement par l'apparence du menu. |
| Personnes | Montrer les personnes réellement destinées à la partie, leurs aptitudes et limites présentes. Choix de trois parmi huit et relance individuelle n'apparaissent actifs qu'avec génération, sélection et transfert de leurs données réellement branchés. |
| Départ | Récapitulatif fidèle des choix, puis action explicite pour créer la colonie. Aucun objet promis ne reste seulement dans la fiche. |

Si une première livraison utilise encore la configuration locale existante, cette étape est nommée et expliquée comme telle ; elle ne prend pas la forme d'un faux globe interactif ou de huit candidats décoratifs. L'absence d'une page cible reste documentée. Les paramètres disponibles doivent tout de même être effectivement appliqués au départ.

## Retour, annulation et opérations asynchrones

Le parcours de création possède un **brouillon distinct de la partie active et des sauvegardes**. Retour préserve les valeurs de ce brouillon. Revenir à l'accueil puis abandonner la création ne modifie aucune colonie. Une nouvelle création recommencée explicitement reçoit un nouveau brouillon ; conserver un brouillon volontairement doit être visible, pas implicite.

Un changement de graine ou de monde invalide les choix qui en dépendent, notamment un site ancien. Cette invalidation est expliquée et ciblée ; elle ne conserve pas un site inexistant ni ne relance arbitrairement un candidat en parcourant les pages.

La génération expose un état occupé, désactive le double lancement et produit un résultat unique. Une erreur conserve les choix éditables et la partie précédente. Un résultat arrivé après abandon ou après le lancement d'une opération plus récente ne remplace rien. L'annulation n'a pas à interrompre un calcul dans une instruction particulière, mais elle doit empêcher sa publication tardive.

Depuis une partie en cours, ouvrir le menu suspend effectivement la simulation par une commande acquittée. Annuler/retourner à la colonie reprend son état et sa vitesse antérieure. Passer à une nouvelle partie ne détruit pas les progrès courants avant le succès de la transaction et leur préservation. Le menu conserve l'accès à sauvegarder puis quitter, et distingue clairement le retour sans sauvegarde si cette option existe.

Une erreur de préparation graphique après création ou chargement reste différente d'une sauvegarde invalide : la partie valide et sa copie de récupération restent conservées. L'interface expose une reprise/récupération possible sans redonner le matériel de départ ni relancer le scénario.

## Charger et préserver les sauvegardes

Le chargement s'effectue aussi depuis l'accueil, **sans générer d'abord un monde factice pour satisfaire le worker**. La liste montre uniquement les données présentes, avec les métadonnées disponibles : provenance, version, jour et emplacement. Une donnée ancienne sans métadonnée ne reçoit pas une identité inventée. Un emplacement de récupération reste distingué d'une sauvegarde choisie par le joueur.

Continuité minimale avec l'existant : conserver et savoir lire les emplacements `lisiere.save.v1` et `lisiere.previous.v1`. Un futur index ou plusieurs emplacements ne rendent pas ces parties invisibles. Leur migration est non destructive ; aucune création de menu n'efface ces clés.

Choisir une entrée ne la charge pas encore. Charger valide et migre strictement les données avant leur publication ; annuler ne remplace rien. Le monde, ses identités, ses ressources, ses recherches, ses calendriers et ses aléas proviennent de la sauvegarde. La configuration du formulaire de nouvelle partie n'est jamais appliquée rétroactivement.

En cas de format corrompu, version future inconnue, stockage refusé ou quota dépassé : message intelligible, sauvegarde originale conservée, partie active conservée, possibilité de revenir ou choisir une autre entrée. Ne pas afficher une réussite avant la fin réelle de l'écriture. Les clics concurrents sauvegarder/charger/créer sont sérialisés ; un retour tardif ne doit pas écraser le monde choisi ensuite.

Au chargement réussi, afficher la colonie en pause afin que le joueur puisse s'orienter avant reprise ; adaptation navigateur explicite. Sauvegardes et sauvegarde de récupération restent indépendantes. Import/export, suppression de fichiers, renommage, cloud et synchronisation multi-appareils ne sont pas induits par la présence d'une liste : leurs boutons restent absents ou indisponibles tant qu'ils n'ont pas de contrat réalisé.

## Accessibilité et présentation

- Ordre de tabulation conforme à l'ordre visuel, focus visible, noms accessibles des boutons et groupes radio, état sélectionné lisible sans dépendre de la seule couleur.
- Éléments indisponibles effectivement non activables au clic comme au clavier, avec motif visible ou description accessible ; un survol ne les sélectionne pas.
- Échap ferme d'abord la sous-fenêtre active ou revient d'une étape ; il ne quitte pas la colonie ni n'efface le brouillon par une succession de gestionnaires concurrents.
- Retour du focus au bouton déclencheur après fermeture ; aucune commande de carte ne traverse une fenêtre de menu.
- Mise en page défilante adaptée aux petites fenêtres et au zoom ; Retour/Suivant demeurent atteignables. Une grande illustration ne masque ni la description ni les choix.
- Texte de sauvegarde et noms issus des données affichés comme texte. Messages de chargement/échec annoncés sans avalanche de notifications par image.

## Critères d'acceptation du lot qui l'implémentera

1. Démarrage froid : accueil utilisable, sans colonie qui avance ou remplace une sauvegarde ; Nouvelle partie et Charger ont de vraies destinations ; états vides et options grisées sont cohérents.
2. Parcours réel au clic et au clavier : scénario → narrateur → configuration effectivement disponible → départ ; choix obligatoires, Retour, abandon et double clic. Le profil affiché correspond à celui reçu par la simulation.
3. Création réussie et génération refusée : ressources exactes du profil, provenance conservée, sauvegarde antérieure récupérable ; résultat tardif ignoré après abandon. Aucun monde créé deux fois.
4. Chargement depuis accueil et depuis une partie : données actuelles et anciennes prises en charge, exactitude de la continuation, refus d'une donnée invalide/future, sauvegarde et récupération toujours distinctes. Pas de seconde dotation.
5. Contrôle natif de la présentation et des états occupés, viewport étroit, focus et annonces d'erreur. Mesures ciblées démarrage/génération/préparation ; aucune suite de simulation complète relancée seulement pour un changement de couleur de menu.
6. Recherche, contrat de scénario/profil réellement appliqué, guide, inventaire et preuves mis à jour ensemble. Les pages et mécanismes restant partiels sont nommés dans le bilan, sans déclarer le scénario Core ou le narrateur entier terminés.

Ces contrôles se regroupent selon les contrats touchés dans [testing](testing.md). Ce document n'ajoute ni calendrier parallèle, ni promesse de couverture exhaustive, ni statut de livraison à la seule présence d'un écran.
