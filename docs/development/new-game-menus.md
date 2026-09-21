# Accueil et création de partie — V88 validée dans son périmètre et parcours cible

V91 étend le choix local à forêt tempérée, forêt boréale et broussailles arides. Graine et relief restent conservés lors des retours entre écrans ; le milieu est transmis au moteur et sauvegardé. Le globe, les rivières et les personnages personnalisables restent absents. Les profils climatiques sont des témoins explicites, pas des défauts Core universels.

**V88 validée dans son périmètre.** La fiche de scénario décrit maintenant la dotation Crashlanded révision 3, avec argent, fusil à verrou et couteau en plastacier ; les anciennes sauvegardes gardent leur provenance et leurs possessions. Les [preuves V88](../history/validation-trade-v88.md) restent distinctes des [preuves V83](../history/validation-site-v83.md) pour le relief et des [preuves V82](../history/validation-new-game-v82.md) pour l'accueil et les chargements. Le scénario et Cassandra restent explicitement partiels. Le parcours mondial complet ci-dessous reste une cible. [ROADMAP](../ROADMAP.md) conserve seule le calendrier ; le [contrat du départ](scenario-start.md) et l'[inventaire fonctionnel](../gameplay/implementation-status.md) distinguent contenu présent et absent.

## Périmètre actuel

| Partie | Comportement et limite |
|---|---|
| Accueil | Nouvelle partie et Charger actifs ; Tutoriel, Options, Mods et Crédits visibles/grisés. Reprendre apparaît quand une colonie existe. Aucune colonie générée au démarrage froid. |
| Scénario | Atterrissage forcé seul choix actif, fiche « adaptation partielle » et fournitures réellement présentes. Les autres scénarios et l'éditeur sont indisponibles. |
| Histoire | Cassandra présélectionnée et décrite comme partielle ; difficulté et mode restent vides jusqu'au choix explicite de Récit d'aventure et Rechargeable. Autres possibilités grisées. |
| Préparer le départ | Graine numérique aléatoire et modifiable, bouton Aléatoire, carte 250². Site local en forêt tempérée, sans rivière ; choix effectif Plat / Petites collines / Grandes collines et deux ou trois roches dérivées de la graine. Trois personnes aux profils fixes. Les pages planète/huit candidats ne sont pas simulées par des contrôles décoratifs. |
| Création/chargement | Opération exclusive, publication après acceptation worker, colonie ouverte en pause ; sauvegarde manuelle et colonie précédente restent deux emplacements distincts. Une erreur de format ne remplace pas la colonie active. |
| Profil appliqué | Nouveau `crashlanded` révision 3 avec `site` révision 1 et `gameProfile` révision 1 ; les parties antérieures conservent cartes, possessions et provenances. Cible d'humeur +5, infection différée ×0,75 coloniale, tir ami 0,40 ; autres domaines de difficulté encore absents. |
| Alertes de calendrier | Les boutons d’activation accueil/raids/canicules historiques restent cachés avec `gameProfile`, comme les refus du moteur. Ils restent proposés sur une ancienne partie non profilée dépourvue du calendrier concerné. |
| Temps/événements | Débit nominal 6 ticks/s, jour de 16 min 40 s ; nouveau départ à 06 h civiles pour un temps écoulé nul, climat annuel du témoin documenté. Raid introductif à J5,4 et fenêtres majeures ; accueil fixe/canicule garantie désactivés. Grandes menaces limitées aux raids et budget local partiel ; V88 ajoute séparément visites et passants conditionnels. |

Les sections suivantes conservent les contrats de navigation, erreurs, accessibilité et extension du parcours. Contrôles du cycle complet, chargements historiques, clavier, présentation et mesures sont regroupés dans les preuves du lot. Les étapes monde/site/personnes complètes demeurent explicitement hors de cette tranche.

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

En V88, la fiche et la création révision 3 concordent : trois personnes, 300 bois, 450 acier, 30 composants, 800 argent, 50 repas emballés, 30 médicaments, fusil à verrou, revolver, couteau en plastacier, gilet pare-balles et trois chemises portées. Le [contrat de départ](scenario-start.md) fixe quantités et propriétés. Casque, pantalon pare-balles, familier, capsules et marchandises dispersées restent absents ; ce complément ne transforme pas la fiche en promesse de scénario Core complet. Le chargement d'une révision précédente n'applique jamais cette liste.

**Transition depuis V80 :** le libellé demandé n'autorise pas à transformer silencieusement `survivors` en Crashlanded complet. Si le nouveau menu précède l'achèvement de sa dotation, la fiche porte clairement « adaptation partielle » et indique les différences utiles au choix du joueur. La provenance des anciennes parties reste Trois survivants, avec sa révision et ses stocks inchangés. Un changement réel du profil initial exige un contrat de scénario et une révision explicite, pas seulement un nouveau texte.

### 2. Narrateur, difficulté et sauvegarde

La page conserve trois choix séparés : qui produit les incidents, quels paramètres règlent leurs conséquences, et comment la partie peut être rechargée.

- **Cassandra Classique** préselectionnée. Les autres narrateurs visibles restent indisponibles dans ce profil tant que leurs règles ne sont pas intégrées.
- Liste de difficultés dans l'ordre observé : Pacifique, Bâtisseur de communauté, Récit d'aventure, Lutte pour la survie, De sang et de poussière, Perdre est amusant, Personnalisation en détail. Seul Récit d'aventure est sélectionnable.
- Mode Rechargeable à tout moment sélectionnable ; mode Engagement grisé.
- Difficulté et mode commencent sans sélection, comme la création normale observée ; le joueur confirme les deux choix. Suivant explique précisément le choix manquant au lieu d'ignorer le clic.
- Infobulles lisibles au survol **et au clavier**. Elles expliquent le sens du réglage ; elles ne certifient pas des systèmes encore absents.

L'étiquette Récit d'aventure ne recouvre pas les calendriers provisoires de V81 : le nouveau profil applique les coefficients des mécaniques présentes et son agenda propre. Les pans de difficulté encore absents sont annoncés une fois clairement dans la fiche. Cassandra reçoit l'introduction hostile à J5,4 et les fenêtres majeures à partir de J11 ; ces grandes menaces restent des raids, sans équivalence de budget, composition ou sélection complète Core. V88 ajoute séparément les [agendas de visites et de passants](visitors.md), dont l'occasion introductive à J2,5 sur une nouvelle partie. Accès et tirages restent nécessaires ; cette occasion ne promet pas un marchand garanti. Les groupes historiques demeurent disponibles uniquement dans leurs anciennes parties/scénarios de diagnostic.

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

### Configuration locale V83

La page **Préparer le départ** garde deux colonnes : graine et choix du relief à gauche, renseignements du site et récapitulatif de la colonie à droite. Les trois reliefs sont des boutons radio réellement reliés à la génération. **Petites collines** est la proposition initiale de Lisière, annoncée comme telle, et non un site prétendument imposé par RimWorld. Le jeu original fait choisir une tuile de monde valide, avec un choix aléatoire distinct ; notre carte locale ne simule pas ce globe.

Le milieu reste **Forêt tempérée**, la carte **250×250** et l'hydrographie **Sans rivière**. Ce sont les limites visibles du départ pris en charge, pas des valeurs universelles de RimWorld. Il n'existe pas de contrôle actif pour changer de biome, inventer une rivière ou modifier une densité sans contrat de génération. Les massifs, filons et sols sont produits par le profil réellement sélectionné ; aucun quota de ressources n'est promis dans la fiche.

Les deux ou trois **roches locales** sont calculées par le même `resolveSite(seed, options)` que l'usine de monde. Changer la graine actualise leur liste immédiatement, tout en conservant le relief choisi. Une graine invalide remplace ce renseignement par une invitation à corriger la saisie ; elle ne laisse pas croire que l'ancienne liste correspond à la valeur invalide. Retour conserve graine, relief, difficulté et mode. Recommencer explicitement une nouvelle création réinitialise ces choix et propose une nouvelle graine.

Le lancement transmet `{seed, size, site: {hilliness}}` ; la simulation résout et persiste la provenance du site. Ce contexte reste une propriété de la colonie créée : charger une carte V82 ne lui applique ni le relief du formulaire, ni les nouveaux sols, ni une nouvelle géologie. La validation native V83 reprend un véritable checkpoint V82 compressé, en plus du camp V81 déjà utilisé, pour contrôler cette frontière sans fabriquer une ancienne version par simple changement de numéro.

Référence : [enquête sur la génération](../research/map-calibration-reference.md), corpus HTML chapitres 5–7 et entrées `SYS-016` à `SYS-019`, `TEST-016` à `TEST-019`, `UI-005` via [reference-adoption](../research/reference-adoption.md). La cohérence monde/site et l'information utile au choix sont adoptées ; globe, rivières, grottes et ruines complètes restent différés selon ROADMAP. Les sources historiques de génération sont distinguées des classes locales 1.6.4871 et des observations individuelles.

## Retour, annulation et opérations asynchrones

Le parcours de création possède un **brouillon distinct de la partie active et des sauvegardes**. Retour préserve les valeurs de ce brouillon. Revenir à l'accueil puis abandonner la création ne modifie aucune colonie. Une nouvelle création recommencée explicitement reçoit un nouveau brouillon ; conserver un brouillon volontairement doit être visible, pas implicite.

Un changement de graine ou de monde invalide les choix qui en dépendent, notamment une tuile de monde ancienne quand le globe sera disponible. Dans la configuration locale V83, il recalcule les roches sans remettre le relief à zéro. Cette invalidation est expliquée et ciblée ; elle ne conserve pas un site inexistant ni ne relance arbitrairement un candidat en parcourant les pages.

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

## Critères d'acceptation de la tranche en cours

1. Démarrage froid : accueil utilisable, sans colonie qui avance ou remplace une sauvegarde ; Nouvelle partie et Charger ont de vraies destinations ; états vides et options grisées sont cohérents.
2. Parcours réel au clic et au clavier : scénario → narrateur → configuration effectivement disponible → départ ; choix obligatoires, relief non présélectionné, roches actualisées avec la graine, Retour, abandon et double clic. Le profil et le site affichés correspondent à ceux reçus par la simulation.
3. Création réussie et génération refusée : ressources exactes du profil, provenance conservée, sauvegarde antérieure récupérable ; résultat tardif ignoré après abandon. Aucun monde créé deux fois.
4. Chargement depuis accueil et depuis une partie : données actuelles et anciennes prises en charge, exactitude de la continuation, refus d'une donnée invalide/future, sauvegarde et récupération toujours distinctes. Pas de seconde dotation.
5. Contrôle natif de la présentation et des états occupés, viewport étroit, focus et annonces d'erreur. Mesures ciblées démarrage/génération/préparation ; aucune suite de simulation complète relancée seulement pour un changement de couleur de menu.
6. Recherche, contrat de scénario/profil réellement appliqué, guide, inventaire et preuves mis à jour ensemble. Les pages et mécanismes restant partiels sont nommés dans le bilan, sans déclarer le scénario Core ou le narrateur entier terminés.

Ces contrôles se regroupent selon les contrats touchés dans [testing](testing.md). Ce document n'ajoute ni calendrier parallèle, ni promesse de couverture exhaustive, ni statut de livraison à la seule présence d'un écran.
