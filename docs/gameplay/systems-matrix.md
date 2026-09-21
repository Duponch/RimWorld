# Matrice des systèmes et critères de réalisation

**Revue V92 :** la présentation est réorganisée en dossiers de personne et habillée d’une identité commune. Netlify, brins GPU et billboards ne complètent aucun système métier absent. Catalogue/biomes/production restent au périmètre V91 ; monde, caravanes, quêtes, fin de partie et audio restent absents. [Estimations par aspect](../ROADMAP.md#estimation-davancement), [contrat visuel](../development/visual-identity.md).

**V88 validée dans son périmètre :** S21 reçoit une première chaîne de commerce au stock fini avec monnaie, prix, contact et transfert atomique ; S15/S17 et équipement reçoivent fusil à verrou/couteau et calendrier non hostile de visiteurs/passants. Corpus chapitre 27 SYS/TEST-145, UI-032 et chapitres 20/21 SYS/TEST-113..117 : contrats partiellement servis, aucune validation globale implicite. La diplomatie du critère S21, les caravanes et la sélection complète des incidents restent ouvertes. La campagne commune J136,073→J159,493, ses reprises, les contrôles, les clics et les mesures sont consignés dans les [preuves V88](../history/validation-trade-v88.md). Les optimisations mesurées préservent les états comparés ; la charge native finale n’atteint pas 6× à cent colons. [Commerce](../development/trade.md), [visiteurs](../development/visitors.md), [armes](../research/weapons-v88.md). G0–G5 et le calendrier restent ceux de [ROADMAP](../ROADMAP.md).


**V87 validée dans son périmètre :** l’environnement relie cultures, calendrier/lumière, température, énergie variable, protection des réserves et extinction. Les contrats et preuves sont communs au lot ; leurs frontières rares ne valent pas des événements survenus dans la colonie. La continuation documentée J76,283→J136,073 conserve quatre habitants jusqu’à la récolte du printemps suivant ; aucune extinction par colon n’y est observée. Les mesures mixtes à cent colons restent sous 6× (environ 2,05×), sans comparaison causale avec la charge V86. G0–G5 restent ouverts selon ROADMAP. [Climat](../development/site-climate.md), [énergie/météo](../development/wind-heater.md), [preuves](../history/validation-environment-v87.md).

**V86 livrée :** S13/S17/S19 relient assaillant à terre, portage, prison, soins, nourriture, résistance et recrutement de la même personne. SYS/TEST-148/149 et UI-017/018 sont servis dans ce périmètre ; arrestation debout, indéfectibles, évasions organisées et diplomatie restent absents. [Contrat](../development/prisoners.md), [preuves V86](../history/validation-prisoners-v86.md). La croissance du camp et les limites de performance sont suivies dans la même livraison, sans clôture de G0–G5 ; [ROADMAP](../ROADMAP.md) reste le seul calendrier.

**V85 livrée et validée :** S06/S10/S11/S12/S20 relient conduits construits, commutation civile physique, stockage en batterie, production solaire et recherches aux appareils de cuisine et de froid. [Contrat](../development/power.md), [preuves V85](../history/validation-energy-v85.md). Contrats, natif ciblé, reprise naturelle jusqu'à J42,21 et charges mixtes réussis dans leurs périmètres ; 6× n'est pas tenu à cent colons et aucun jalon G0–G5 n'est clos. Éolien/météo/incendies sont réunis dans V87, validée dans son périmètre ; les pannes généralisées restent distinctes. Calendrier uniquement dans [ROADMAP](../ROADMAP.md).

**V84 livrée :** les cultures, ateliers alimentaires et besoins médicaux progressent ensemble : pommes de terre/maïs, cuisinières et table de boucherie, malnutrition et récupération par ingestion. [Preuves V84](../history/validation-food-v84.md). Le site local V83 garde ses trois reliefs, sols et anciennes cartes préservées ; [preuves V83](../history/validation-site-v83.md). Aucun jalon G0–G5 clos. Les prochains ensembles élémentaires sont programmés uniquement dans [ROADMAP](../ROADMAP.md).

**V82 :** accueil/création/chargement et profil de partie réel, sans colonie cachée au démarrage. Le nouveau `crashlanded` conserve scénario, Cassandra partielle, Récit d'aventure et Rechargeable ; difficulté et mode exigent un choix. Six ticks locaux/s, arrivée civile à 06 h séparée du temps écoulé, humeur +5, acquisition infectieuse coloniale ×0,75 au second tirage. S17 reçoit introduction et fenêtres de raids persistantes, avec compositions locales, sans budget ni sélection complète des menaces. Les anciens profils ne sont ni renommés ni réétalonnés à la migration V81. Le pilote de huit jours exerce abri, baies cuisinées et défense, sans démontrer une économie autonome ; acceptation native réussie dans le périmètre V82. Monde/site/candidats, catalogue et difficulté complète restent ouverts. Aucun jalon G0–G5 clos ; [ROADMAP](../ROADMAP.md) conserve seule les estimations et le calendrier. [Contrat de départ](../development/scenario-start.md), [menus](../development/new-game-menus.md), [inventaire](implementation-status.md).

V81 étend la santé S13 avec infection après plaie, immunité partagée et soins physiques renouvelables. Douleur/capacités et besoins restent communs aux boucles existantes ; une maladie ne clôt pas le domaine santé. Autres maladies, chirurgie, hôpital spécialisé et soins vétérinaires restent ouverts. [Contrat](../development/infections.md), [état détaillé](implementation-status.md).

V80 ajoute un départ identifiable avec stocks/technologies et paysage calibré ; aucun jalon G0–G5 n'est clos par ce scénario. Les critères mondiaux, catalogue et difficulté restent distincts. [Contrat](../development/scenario-start.md).

[Estimations courantes par système](../ROADMAP.md#estimation-davancement), distinctes des critères d'acceptation et des anciennes notes datées ci-dessous.

V77 étend S13/S17/S18 : anatomie quadrupède, tirs manuels, lésions, fuite, incapacité/mort inspectables et rig GPU. V76 conserve alimentation/broutage et sommeil physiques. V78 ajoute la mêlée interespèces et la riposte locale. V79 relie chasse civile, dépouilles transportables, boucherie, viande/cuir et repas. Élevage et autres espèces restent absents. Ce sous-ensemble ne clôt aucun jalon G0–G5. [Contrat](../development/animal-combat.md), [état détaillé](implementation-status.md).

V75 : S10/S12/S13/S16 reçoivent conservation froide obtenable, appareil/recherche et hypothermie. Deux situations de l’étape proche 5 sont jouables ; gelures, saisons, environnement et arbre technologique complets restent ouverts. [Contrat](../development/cold-store.md).

V74 : S11/S13/S16 reçoivent canicule, isolation et santé thermique chaude avec refuge/secours. Aucun de ces domaines n’est complet ; saisons, autres météos, incendies et gelures restent ouverts ; froid/réfrigération ajoutés V75. [Contrat](../development/heatwave.md).

État V73 : S20 relie désormais une recherche collective physique à une chemise fabriquée et portée, après la culture de coton S09. L’étape proche 4 est livrée dans ce périmètre ; S20 reste partiel (un projet, catalogue limité). [Contrat](../development/research.md) ; calendrier uniquement dans [ROADMAP](../ROADMAP.md).


État V70 : SYS/TEST-086/087 partiellement servis par deux échanges passifs, opinions dirigées inspectables, proximité/état et continuation. SYS/TEST-085 ajoute Social avec gain/impact ; SYS/TEST-088 conserve les IDs après décès mais deuil absent. S13/S14/S19 et G3 demeurent partiels. [Contrat](../development/social.md).

État V69 : SYS/TEST-084 et 085 partiellement servis par six traits à effets actifs, exclusivités, inspection et continuation. Les domaines S14 et Personnes restent partiels ; V70 sert partiellement SYS/TEST-086/087 (opinions/interactions) ; deuil SYS/TEST-088 ouvert. [Contrat](../development/traits.md). Les notes datées suivantes décrivent les étapes historiques ; l’inventaire courant prime.

État V68 : S15/S17 disposent d’un premier raid jouable dans la colonie ordinaire, avec approche, brèche, issue et reprise. S13 gère les victimes coloniales ; S19 capture et devenir complet des corps restent ouverts. Cette tranche ne clôt aucun domaine. Prochain ordre canonique : [ROADMAP](../ROADMAP.md).

V67 : chapitres 10/20/22, SYS/TEST-057 réparation et SYS/TEST-058 distinction de déconstruction partiellement servis pour murs/portes. G2/G3 progressent avec une brèche physique et son entretien ; SYS-132..135 reste une dépendance de l'incident hostile à venir. Aucun jalon clos. [Contrat](../development/barriers.md).

V66 : chapitres 23/24, SYS/TEST-132..135 partiellement servis par un calendrier persistant et la demande d’accueil volontaire ; population variable reliée aux besoins/travaux/objets. Ni narrateur complet, ni recrutement de prisonniers SYS-148, ni jalon clos. [Contrat](../development/arrivals.md).


**Revue du 19 septembre :** G0–G5 conservent leur périmètre ; les premières boucles de population/incidents G4 ne nécessitent pas la clôture de G3. [Priorité canonique](../ROADMAP.md), [motif de la réorientation](../research/progression-review-2026-09-19.md). Les entrées de versions ci-dessous sont historiques ; l’état livré est consolidé dans [l’inventaire](implementation-status.md).

V65 : SYS/TEST-082 partiellement servis par l’errance triste, ses interruptions, perte de contrôle direct, besoins et récupération. S14 reste partiel : six traits ajoutés V69 ; autres crises et liens familiaux/amoureux absents, premières opinions V70. [Contrat](../development/mental-break.md).

V64 : S14 progresse avec des pensées de situation et souvenirs consultables, une cible et une jauge progressive. Crises, traits et relations restent ouverts ; [contrat](../development/mood.md).

V63 : SYS/TEST-055, UI-014/015, CAT-034..037 et GAP-007 partiellement servis par chemise/gilet physiques, protection anatomique et apparence partagée. Tenues automatiques, inventaire, textiles et catalogue complet restent ouverts ; aucun jalon clos. [Contrat](../development/armor.md).

V60 : acquisition automatique à l’arrêt, réaction civile Attaquer et priorité des ordres enrichissent S02/S15. Ces sous-parties ne clôturent ni Combat ni G3 ; [contrat](../development/automatic-combat.md), [inventaire courant](implementation-status.md).

V59 : sous-parties Combat/Santé/Compétences/Navigation utilisées par la mêlée actuelle, avec ordre réel, contact, outils, XP, lésions et sauvegarde. Aucun SYS complet ni jalon fermé ; [état consolidé](implementation-status.md) et [contrat](../development/melee.md). Les bilans numérotés ci-dessous sont historiques.

V58 : sous-parties SYS/TEST-035/098..107/111..117 et UI-007..011 enrichies par la première menace autonome, contrôle/hostilité séparés, collision, permissions et fuite. G3 reste partiel : une sentinelle statique ne valide ni mêlée, ni tactique de groupe, ni raid. [État et limites](implementation-status.md).

V57 : SYS/TEST-099..107 et 111..117 enrichis par la conséquence temporaire du projectile, les coûts variables pendant une arête et la continuité GPU. Aucun domaine fermé ; [contrat et limites](../development/stagger.md).

V56 : sous-parties SYS/TEST-085/099..107/111..112 et UI-009/010 désormais utilisées par une commande de tir visible, avec XP, phases, vol, impact et reprise. Pouvoir d’arrêt ajouté en V57 ; factions/adversaires, réactions et UI complète restent ouverts. Aucun domaine G3 complet ; [état exact](implementation-status.md).

V53 : [mobilisation/déplacements physiques](../development/drafting.md), SYS-035/UI-007/008/011 partiellement intégrés à G0/G3. Tir dirigé V56 livré ; hostiles et formations restent absents ; propriétés/requêtes de couvert V54 intégrées au tir ; G0–G2 partiels, G3 fondations, G4/G5 non livrés. Calendrier exclusif dans ROADMAP.

V52 prolonge les domaines objets/personnages par une première principale physique : revolver, transfert d’identité, dépôt/incapacité et attache GPU. Équipement reste partiel ; combat contre une menace et inventaire personnel ne sont pas livrés. [État détaillé](implementation-status.md), [contrat](../development/equipment.md). ROADMAP conserve l’ordre canonique G0–G5.

S13 / CAT-018 : [V51](../development/medicines.md) ajoute les doses physiques, plafonds individuels et soins groupés ; acquisition complète, maladies et chirurgie restent ouvertes. Équipement V52 livré ; prochain lot selon ROADMAP : premier combat.

S13 : [santé active V45](../development/health.md), blessures localisées, capacités, incapacité/décès et dégâts de toiture construite ; [secours et lits médicaux V46](../development/rescue.md), [traitements sans médicament et repos médical V47](../development/tending.md), [alimentation assistée V48](../development/feeding.md). [Auto-soins ordinaires V49](../development/self-tending.md). [Décisions urgentes et revue au lit V50](../development/urgent-care.md). Domaine encore partiel : expirations/dégâts des autres tâches, acquisition médicale complète, chirurgie/pathologies et dépouilles complètes absents. Aucun jalon clôturé.

V44 consolide S04/S07 : sommeil forcé avec cargaison indéposable, engagements libérés, conservation et récupération après dégagement. Les transitions médicales de S13 sont ajoutées en V45 ; [contrat](../development/interrupted-cargo.md).

V43 commence les différences humaines par Construction et son apprentissage ; V47 ajoute Médecine. V56/V59 ajoutent Tir/Mêlée, V69 six traits ; huit compétences, autres traits et santé complète restent ouverts. [Priorité et limites](../research/skills-reference.md).

V42 enrichit SYS/TEST-127/128 et CAT-047 avec [générateur, carburant et lampes](../development/power.md). Connexions directes et réseaux de générateurs présents ; conduits, interrupteurs, batteries et incidents restent ouverts. Aucun jalon G0–G5 clôturé.

V41 : CAT-006 partiel et SYS-061 enrichi par les [composants industriels](../development/components.md), extraits/rangés dans la chaîne commune ; autres acquisitions et usages électriques ouverts.

V40 : S10/S12 intègrent le [refroidisseur passif](../development/passive-cooling.md), sa construction et son combustible. Réseau complet et confort thermique général restent ouverts ; réseau local V42, exposition chaude V74 et réfrigération/hypothermie V75 ajoutés depuis ; G2 n’est pas déclaré complet.

V39 : températures de croissance et de semis intégrées à S09, avec conservation du passé et inspection ; maladies/mortalité restent ouvertes. [Contrat](../development/plant-temperature.md).

V38 : thermique quotidienne/locale, chauffage du feu et âge alimentaire variable ajoutés à S10/S11/S12 et aux contrats alimentaires ; systèmes toujours partiels. G0 en consolidation, G1 partiel, G2 en cours, conformément à ROADMAP.

Cette matrice traduit les références de RimWorld en exigences de gameplay pour notre simulation de colonie 3D. Les trois documents de `docs/reference/originals` constituent désormais le corpus fonctionnel principal, utilisé selon la [note d'adoption et de lecture critique](../research/reference-adoption.md), avec la [première recherche](../research/rimworld-reference.md) en complément. Elle décrit une cible et un ordre de construction, **pas une déclaration de fonctionnalités livrées**. Le [plan de développement](../ROADMAP.md) définit le calendrier canonique G0 à G5 et l'état technique ; les résumés ci-dessous s'y conforment. Les extensions viennent après G5.

Révision : **20 septembre 2026**, V87 validée dans son périmètre. Périmètre par défaut : jeu de base avant les systèmes comparables aux extensions. Les règles chiffrées du prototype sont nos paramètres provisoires ; elles ne doivent pas être présentées comme des valeurs certifiées de RimWorld.

V36 branche lumière logique et premiers rôles de pièce sur les deux recettes, puis leur présentation locale 3D ; les critères globaux de S10–S12 restent des cibles ouvertes.

L’[inventaire d’implémentation](implementation-status.md) donne l’état livré et les absences par domaine. Les critères ci-dessous restent des cibles.

## Décisions de périmètre

1. Solo, carte locale unique et terrain logique plan pour la première boucle ; rendu 3D, caméra mobile et géométrie procédurale.
2. Trois colons au démarrage ; architecture et mesures permettant ensuite plusieurs centaines d'agents en incluant la faune.
3. Ressources physiques, travail autonome et besoins ; les compteurs d'interface proviennent du même état que les objets du monde.
4. Simulation à temps fixe et graine reproductible, séparée du rendu et des animations GPU.
5. Contenu défini en données, identifiants stables et sauvegarde versionnée ; les futurs assets remplacent des représentations, sans modifier les règles.
6. Ordres forcés, priorités et annulations expliqués au joueur ; les tâches impossibles restent diagnostiquables.

Ces choix sont des propositions du projet. Le principe de priorités de travaux s'appuie sur la référence communautaire [Work](https://rimworldwiki.com/wiki/Work) et celui des filtres de réserves sur [Stockpile zone](https://rimworldwiki.com/wiki/Stockpile_zone), consultés le 13 septembre 2026. Les détails internes de réservation restent à définir et vérifier dans notre propre moteur.

## Dépendances et critères par domaine

P0 = socle prioritaire ; P1 = boucles fondamentales de survie, habitat et personnages ; P2 = profondeur et campagne du jeu de base ; P3 = extensions après G5. Ces priorités sont locales au projet : elles ne reprennent ni le statut des fiches du classeur, ni le marqueur « P » de proposition du corpus. Les dépendances indiquées sont celles de notre conception, pas une description du code de RimWorld.

Les identifiants locaux S00 à S24 désignent les domaines de cette matrice. Ils sont distincts des sources S01 à S47 du classeur et de ses contrats SYS-001 à SYS-181. Pour citer le corpus, préciser le préfixe et la feuille, par exemple `Systemes / SYS-048` ou `Sources / S27`. Les familles locales F1 à F5 gardent leur sens défini ci-dessous, notamment F5 pour la charge représentative.

| ID | Système | Priorité / jalon | Dépendances | Critère de réalisation observable | Validation profonde / cas limites | Inconnue ou décision restante |
| --- | --- | --- | --- | --- | --- | --- |
| S00 | Horloge, graine, commandes | P0 / G0 | Aucune | Une même graine et les mêmes commandes produisent la même histoire logique. | Pause sans progression ; accélération sans changement de résultat ; commande invalide rejetée ; reprise au milieu d'un cycle. | Politique d'arriéré quand le navigateur suspend un onglet. |
| S01 | Entités, définitions, sauvegarde | P0 / G0 | S00 | Chaque objet a une identité et une localisation ; restauration sans perte d'état autoritaire. | Identifiant absent, dupliqué ou invalide ; schéma inconnu ; aller-retour en pleine livraison ; état aléatoire restauré. | Stratégie de migration et durée de support des anciennes sauvegardes. |
| S02 | Carte, occupation, navigation | P0 / G0 | S00, S01 | Les colons atteignent des points de travail accessibles et expliquent les autres. | Couloir fermé pendant trajet, diagonale interdite, frontière carte, destination réservée, groupe bloquant une porte en combat. | Passage civil livré ; profils hostiles et arbitrage de combat ouverts. |
| S03 | Sélection, caméra, ordres | P0 / G0 | S00, S02 | Sélection et désignation restent correctes après rotation et zoom. | Interface capturant la souris, clic derrière un mur, rectangle hors carte, annulation, mauvais destinataire. | Raccourcis et règles de visibilité des toits. |
| S04 | Tâches, priorités, réservations | P0 / G0 | S01, S02 | Une intention est prise en charge, terminée ou explicitement bloquée. | Deux agents, même ressource ; quantité partielle ; annulation à chaque étape ; agent indisponible ; reprise et libération. | Ordre précis urgences / ordre forcé / horaire / métier. |
| S05 | Récolte, transport, stock | P0 / G0 | S02, S04 | Récolter crée des unités transportables et les dépose dans une réserve valable. | Pile fractionnée puis fusionnée, stock plein, filtre modifié en trajet, destination détruite, objet perdu. | Comptage des stocks cibles : accessible, réservé, porté, en fabrication. |
| S06 | Plans et construction | P0 / G0 | S04, S05 | Le chantier reçoit ses matériaux, puis du travail, avant de devenir un obstacle réel. | Ressources insuffisantes, plan annulé après livraison, dernier accès fermé, plans superposés, bâtisseur dans l'emprise. | Déconstruction V24 : remboursement physique des bâtiments présents. V25–V26 : réinstallation de quatre meubles, rangement filtré et dégagement des paquets ; propriétés et catalogue encore partiels. Restent échec de construction, réparation et matériaux multiples. |
| S07 | Faim, repos, couchage | P0 / G1 | S04, S05, S06 | Les colons rejoignent nourriture et couchage, interrompent leurs activités selon des besoins explicables et récupèrent après exécution réelle. | Repas disparu, dernier lit réservé, faim pendant sommeil, aucune nourriture, reprise de travail sans boucle d'interruption. | Unités temporelles et de nutrition, seuils, priorités relatives et conséquences initiales de la privation. |
| S08 | Horaires et politiques | P1 / G1 | S04, S07 | Le joueur règle métier, zones, nourriture et périodes de repos ou de loisirs. | Zone vide ; interdictions incompatibles ; changement en cours de mission ; ordre manuel contraire à une politique. | Exceptions aux restrictions par les ordres forcés ; attentes et autres loisirs à compléter après les deux familles V15. |
| S09 | Agriculture et cuisine | P1 / G1 | S05, S07 | Semer, croître, récolter, produire et manger constituent une chaîne durable. | Fin de saison, récolte partielle, ingrédients réservés, poste supprimé, stock cible atteint par deux producteurs. | Courbes de croissance et définition du rendement. |
| S10 | Pièces, toits et mobilier | P1 / G2 | S02, S06 | Une chambre reconnue modifie le confort ; coupe des murs et toits permet d'inspecter l'intérieur sans changer ses règles. | Fusion et division, porte ouverte, frontière carte, coin diagonal, toit incomplet, mobilier déplacé. | Définitions d'intérieur selon température, travail et humeur ; mobilier et empreintes préparés dès G0. |
| S11 | Température et conservation | P1 / G2 | S09, S10, S12 | Stocker, isoler et refroidir modifie la durée utile des aliments et le confort. | Panne en pleine nuit, pièce ouverte, températures extrêmes, fusion de volumes, nourriture portée puis reposée. | Modèle simplifié d'échanges et gestion de l'énergie thermique ; expiration simple des aliments dès G1. |
| S12 | Énergie et combustible | P1 / G2 | S05, S06 | Un réseau alimente ses appareils ; pénurie et séparation ont un effet visible. | Scission/fusion du réseau, batterie vide/pleine, charge durant changement de vitesse, combustible réservé puis perdu. | Politique de délestage, veille, stockage et geste physique livrés V85 ; variantes de production et risques restent ouverts. |
| S13 | Santé, secours et soins | P1 / G3 | S04, S07 | Une blessure anatomique affecte les capacités ; un blessé peut être secouru et traité avec résultat expliqué. | Deux médecins ; patient déplacé ou mort ; lit détruit ; médicament épuisé ; saignement pendant transport. | Première anatomie et modèle d'infection ; blessures injectées pour valider les soins avant le combat. |
| S14 | Humeur, pensées, traits | P1 / G3 | S07, S10, S13 | L'humeur a des causes consultables ; l'environnement produit des conséquences durables. | Expiration et cumul, chargement pendant crise, cause supprimée, sommeil, bornes des valeurs. | Seuils de crise, durée, empilement et moyens de récupération ; premiers effets de traits/compétences possibles dès G1. |
| S15 | Mobilisation et combat | P1 / G3 | S02, S04, S13 | Une escarmouche relie couvert, blessures, retraite et retour au travail ; émission, impact et santé sont distincts de l'animation. | Cible supprimée, tir à travers obstacle, allié dans l'axe, coin, portée limite, mort simultanée, ordre interrompu. | Modèle de précision, couvert, cible mobile et dégâts à vérifier avant d'adopter les coefficients du corpus. |
| S16 | Feu, météo, incidents locaux | P1 / G2 ; dégâts aux personnes G3 | S10, S11, S12 ; S13 pour les dégâts aux personnes en G3 | Feu, énergie, température et stocks interagissent ; les événements de test peuvent être injectés sans narrateur. | Feu sans combustible, pluie, pièce close, panne électrique, annulation de tâche urgente, bord de carte ; agent blessé à partir de G3. | Propagation et extinction en G2 ; secours et dommages anatomiques associés à S13 en G3. |
| S17 | Directeur d'événements | P1 / G4 | S00, S13, S15, S16 | Un cycle de tension et récupération fonctionne sur plusieurs graines, avec causes et conditions observables. | Aucune cible valide, événement concurrent, colonie très faible, richesse extrême, recharge en cours d'incident, récompense déjà remise. | Pression issue de richesse, population et pertes récentes ; événements, notifications et états de quête distincts. |
| S18 | Animaux et élevage — cinq herbivores, populations et produits propres V91 ; élevage absent | P2 / G3 | S02, S07, S09, S13 | La faune vit, consomme et apporte des choix d'élevage ou de chasse. | Enclos ouvert, régime incompatible, croissance du troupeau, prédateur, famine, animaux malades. | Espèces de départ, entraînement et budget maximal de population. |
| S19 | Relations et recrutement | P2 / relations G3, recrutement G4 | S13, S14 ; S17 pour l'intégration aux événements en G4 | Les interactions créent opinions et conflits en G3 ; les parcours de recrutement et d'accueil prolongent la population en G4. | Opinion asymétrique, relation avec mort/absent, prison ouverte, nourriture indisponible, recrutement interrompu. | Séparation opinion, lien familial, faction et statut de contrôle ; les relations n'attendent pas le narrateur. |
| S20 | Artisanat, qualité et recherche | P2 / G4 | S05, S09, S12 | Une chaîne de fabrication débloquée produit des choix d'équipement et de spécialisation. | Recette invalide, prérequis manquant, travail inachevé, poste éteint, changement de projet, qualité bornée. | Coûts, matériaux et dépendance à l'auteur d'une fabrication ; prolonger les recettes de survie G1. |
| S21 | Commerce et factions | P2 / G4 | S05, S19, S20 | Un marchand échange un stock limité et la relation politique a des effets ; le panier est validé avant transfert atomique. | Monnaie insuffisante, stock réservé, marchand parti, transfert annulé, prix hors bornes. | V88 validée dans son périmètre : stocks du petit visiteur, prix et panier ; progression diplomatique et autres familles commerciales restent ouvertes. |
| S22 | Monde, caravane, cartes | P2 / G5 | S01, S18, S21 | Un groupe part, consomme, rencontre un événement puis revient sans duplication. | Mort en voyage, chargement interrompu, groupe divisé, capacité réduite, carte quittée et restaurée. | Simulation des cartes inactives et représentation du monde ; sites étrangers abstraits par défaut. |
| S23 | Objectifs et fins | P2 / G5 | S17, S20, S22 | Le joueur peut poursuivre un objectif collectif et continuer après réussite. | Dernier colon hors carte, échec d'extraction, objectif atteint deux fois, état sans agent contrôlable. | Objectif original et conditions d'une fin de partie. |
| S24 | Systèmes inspirés des extensions | P3 / après G5 | Campagne G5 validée ; dépendances précisées par module | Chaque ajout ouvre une nouvelle stratégie et reste désactivable proprement. | Sauvegarde avec module absent, identifiant obsolète, capacités superposées, incident persistant. | Choix éditorial : croyances, génétique, pouvoirs, horreur ou nomadisme. |

Les règles communautaires de [Bill](https://rimworldwiki.com/wiki/Bill), [Rooms](https://rimworldwiki.com/wiki/Rooms), [Power](https://rimworldwiki.com/wiki/Power) et [Raid points](https://rimworldwiki.com/wiki/Raid_points), consultées le 13 septembre 2026, motivent des domaines distincts. Elles ne constituent pas une autorité suffisante pour fixer nos nombres ni pour garantir le comportement de chaque version du jeu de référence.

## Critères de sortie des jalons

Ces critères résument le calendrier de [ROADMAP](../ROADMAP.md). Une ligne cible ou une fiche du corpus ne suffit pas à déclarer un jalon livré ; il faut ses résultats de jeu et ses preuves de validation.

### G0 — La boucle matérielle

Trois colons peuvent collecter, porter, stocker et construire un petit camp. Définitions et instances sont distinctes ; chaque objet a un propriétaire unique ; piles, inventaires portés, stockage et matériaux livrés au chantier sont conservés. Les empreintes orientées et leurs accès sont cohérents, notamment pour le lit 1×2. Les réservations couvrent quantités, capacités et cellules de travail.

Les attentes ont une cause explicable. Une interruption libère les intentions futures sans annuler les transformations passées. Une sauvegarde au milieu de chaque étape de transport reprend exactement ; annulation et concurrence ne créent aucune duplication ou réservation orpheline. La conversion des stocks du schéma 1 en piles est documentée et testée. L’ancien prototype à stock global ne satisfaisait pas ce contrat ; l’[inventaire courant](implementation-status.md) distingue les éléments maintenant livrés des critères du jalon encore ouverts.

### G1 — Survie quotidienne

Première partie livrée avant la clôture de G0 : [repas et couchages physiques](../development/needs.md), avec réservations, trajets et reprise sauvegardée. Le reste de cette section demeure la cible de G1.

La colonie est autonome plusieurs jours grâce à la croissance agricole, aux récoltes renouvelables, aux recettes et aux aliments réellement accessibles, transportés puis ingérés. Les couchages sont réservés et rejoints ; les horaires orientent les activités sans satisfaire directement les besoins. Les premiers effets de traits et compétences sont mesurables.

Le joueur peut provoquer une pénurie, comprendre sa cause et la corriger. Distance, ingrédients, seuil de production, interruption et expiration simple des aliments ont des conséquences vérifiables. Les unités temporelles et de nutrition sont décidées explicitement avant calibration ; les constantes du corpus ne sont pas injectées telles quelles dans les ticks du prototype. Refroidissement passif et premiers effets des pièces livrés pendant G2 ; climatiseur V75 livré, radiateur V87 validé dans son périmètre ; autres appareils et pensées thermiques restent ouverts.

### G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, saisons, températures, électricité et incendies forment une boucle cohérente. Une pièce fermée modifie température et confort ; une porte détruite ou reconstruite invalide les bonnes régions. Coupe des murs et toits, navigation et points de travail restent cohérents avec l'état logique.

V85 livre la séparation du réseau, le stockage et les conséquences sur cuisson/froid ; cette tranche est validée par les contrats, le natif et la reprise naturelle documentés dans les [preuves V85](../history/validation-energy-v85.md). La commutation reste civile. V87 relie éolien, radiateur, feu et stocks dans une campagne commune validée dans son périmètre ; les pannes généralisées demeurent absentes. Elle peut injecter l'incident pour tester le système avant le narrateur G4. Les dommages aux personnes dépendent du système de santé G3 et ne sont pas exigés pour la première tranche environnementale.

### G3 — Personnages et conflits

Identité, anatomie et capacités précèdent les blessures, secours et soins, puis pensées, relations et combat. Une blessure affecte réellement déplacement, travail et combat ; un soin ou un équipement modifie le résultat. Les animaux utilisent les services communs avec leurs propres besoins, comportements et reproduction.

Les ordres tactiques, lignes de tir, couverture et projectiles restent reproductibles aux frontières d'obstacle et de portée. Intention, préparation, émission, vol, impact et santé sont distingués ; les animations ne décident pas des dégâts. Pensées et relations ont des causes consultables, des durées et des conséquences persistantes. Le recrutement et son intégration aux événements arrivent en G4.

### G4 — Histoires et progression

Incidents, rythme de tension, visiteurs, recrutement, factions, commerce, recherche et artisanat général prolongent la colonie locale. Les conditions, poids et causes du narrateur restent observables. Les quêtes gardent état, participants, échéances et récompenses indépendamment de leur texte et de leurs notifications.

Des parties seedées produisent des chaînes de conséquences variées mais expliquées, sans incident impossible, récompense répétée ni blocage de progression. Une transaction commerciale refusée ne transfère rien. La richesse repose sur les objets effectivement présents ; les règles de difficulté et coefficients adoptés sont documentés.

### G5 — Monde et consolidation

Carte mondiale, caravanes, rencontres, transferts entre cartes et objectifs longs étendent la campagne. Personnes et objets conservent identité, états et propriétaire unique lors des départs et retours. Les règles des cartes inactives sont explicites ; une simulation intégrale des colonies étrangères n'est pas présumée.

La validation porte sur les longues parties, les migrations et reprises après versions, les transferts entre cartes et les budgets de performance sur appareils choisis. Accessibilité, configuration graphique, assets définitifs et optimisation à centaines d'acteurs font partie de la consolidation. Les mécaniques livrées sont documentées, y compris les objectifs, la réussite, la défaite et la continuation.

### Après G5 — Extensions justifiées par le jeu

Les systèmes comparables aux DLC restent une réserve d'idées après validation de la campagne du jeu de base. Chaque module doit ajouter une décision utile et préciser ses prérequis, effets sur les sauvegardes, budget de simulation et règles de désactivation. La présence de contrats DLC dans le corpus n'avance pas leur réalisation dans le calendrier.

## Stratégie de validation : peu de familles, scénarios riches

Ces familles sont une **organisation proposée**, pas une liste de suites déjà présentes. Ajouter un cas à une famille pertinente est préférable à créer une suite par objet ou couleur.

| Famille | Contrat vérifié | Déclencheur pertinent | Preuve attendue |
| --- | --- | --- | --- |
| F1 — Conservation et transitions | Ressources, réservations, tâches, annulation, identité. | Changement de collecte, transport, construction, craft, soins ou sauvegarde. | Bilan par ressource ; transitions valides ; zéro réservation orpheline ; scénario reproduit depuis sa graine. |
| F2 — Simulation prolongée | Besoins, production, population, horloge et déterminisme. | Changement de vitesses, IA, économie, maladie, directeur d'événements ou animaux. | Séries temporelles ; invariants vérifiés pendant la simulation ; arrêt sur première anomalie avec état reproductible. |
| F3 — Topologie et interaction | Navigation, occupation, pièces, réseaux et combat. | Changement de bâtiments, portes, chemins, tir ou règles environnementales. | Scénarios construisant/détruisant des obstacles ; comparaison avec solution de référence indépendante sur petites cartes. |
| F4 — Parcours navigateur | Rendu, sélection, commandes, Worker, pause, chargement. | Changement de protocole, interface de commande, caméra, renderer ou persistance. | Parcours utilisateur réel ; contrôle des erreurs ; cohérence objet sélectionné / commande / résultat. |
| F5 — Charge représentative | Temps de simulation, débit, mémoire, rendu et animation. | Ajout d'une famille d'agents, modification des recherches de tâches ou de l'animation GPU. | Taille de scène, appareil, navigateur, backend GPU, percentiles et comparaison au budget mesuré. |

Un scénario long qui termine sans exception n'est pas une preuve suffisante : il faut contrôler les invariants en cours d'exécution. Les cas aléatoires gardent leur graine et leur journal ; les cas minimisés deviennent des régressions ciblées. Les scénarios de référence fixes servent à suivre l'équilibre ; les variantes explorent les limites. Les attentes ne doivent pas simplement recopier les fonctions testées.

Les invariants transversaux prioritaires sont : quantités finies et non négatives ; chaque objet à un seul endroit ; somme des quantités réservées inférieure ou égale au disponible ; chaque réservation liée à une mission valide ; absence d'activité pour un mort ; progression bornée des besoins ; position logique valide ; résultat économique indépendant du nombre d'images affichées. Toute exception permise, comme une pile temporairement au sol après annulation, doit être explicitement définie.

Les mesures de performances distinguent débit des ticks et fréquence d'image. Une scène fluide dont la simulation prend du retard est un échec de cadence. Inversement, un gain d'images obtenu en supprimant des besoins hors caméra change le jeu. Les budgets matériels doivent être mesurés sur les appareils ciblés avant de promettre un nombre maximal d'agents.

Une modification de couleur ou d'un matériau demande une vérification visuelle proportionnée. Elle ne justifie pas de rejouer toute la campagne de simulation. Une modification de réservation ou d'horloge justifie les scénarios transversaux concernés. Après des tests réussis, les relancer sans changement ni nouvelle incertitude n'apporte pas de preuve supplémentaire.

## Discipline documentaire

Pour chaque domaine modifié, mettre à jour ensemble la règle joueur, le statut de réalisation et sa validation. La note de livraison doit préciser comportement réel, limites restantes et mode d'essai. Les valeurs d'équilibrage doivent avoir un nom, une unité, une justification et une version ; les identifiants sauvegardés restent distincts des libellés traduits.

Une anomalie doit conserver graine, version, commandes, état pertinent et différence attendue/observée. Une divergence volontaire avec RimWorld est une décision de design, pas une erreur, dès lors qu'elle est annoncée dans la documentation. Une propriété non encore vérifiée reste marquée comme hypothèse, même si son code paraît plausible.

## Livraison repas/mobilier — 13 septembre 2026

S06/S07 : table et tabouret construits après livraison, repas avec transport à une place réservée. S10/S14 sont partiellement anticipés : confort des meubles normaux et souvenir sans table, sans pièces ni humeur complète. S03 : compteur FPS permanent. La [recherche](../research/dining-reference.md), le [contrat](../development/dining.md) et les [preuves](../development/validation.md) précisent la portée ; G1 et G0 restent ouverts.

V27 : [régions et identités géologiques](../development/geology.md) livrées dans la génération locale ; SYS-061 minage, CAT-059 sols et le reste de CAT-060 demeurent partiels. V28 ajoute minage physique, sol brut et fragments transportables ; V29 ajoute acier compacté et piles d’acier ; V32 ajoute la taille, V35 les toits construits et V41 les composants industriels ; toits naturels et autres minerais restent ouverts. Le calendrier reste ROADMAP.

S10, sous V34 : reconnaissance des enceintes, seuils et inspection livrées ; fusion/division, coins, eau et reprise contrôlés. Toits construits V35, premiers rôles V36 et thermique V38 sont ajoutés dans leurs contrats ; confort et autres effets de pièce restent ouverts ; ce lot ne satisfait pas encore l’acceptation G2. [Contrat](../development/rooms.md).

V37 étend la lumière aux travaux et déplacements des domaines S02/S04/S06/S09/S10 ; [contrat](../development/light-work.md). G0/G1 restent partiels et G2 en cours. Ni catalogue, compétences, psychologie ni thermique livrés par cette extension.

V43 commence S13/S14 via Construction et son apprentissage individuel ; [contrat](../development/skills.md). Les fondations humaines passent avant l’approfondissement électrique, conformément à la ROADMAP. Aucun jalon ni domaine de personnalité n’est déclaré complet.

Socle santé sous V43 : SYS/TEST-089..091 et 096 alimentent l’arbre et les calculs de capacités [codés/testés isolément](../development/body.md). V45 active producteurs de toit, persistance et transitions ; secours livrés en V46 ; soins physiques restent à livrer.
