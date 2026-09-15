# Matrice des systèmes et critères de réalisation

V40 : S10/S12 intègrent le [refroidisseur passif](../development/passive-cooling.md), sa construction et son combustible. Réfrigération électrique, réseau et santé/confort thermiques restent ouverts ; G2 n’est pas déclaré complet.

V39 : températures de croissance et de semis intégrées à S09, avec conservation du passé et inspection ; maladies/mortalité restent ouvertes. [Contrat](../development/plant-temperature.md).

V38 : thermique quotidienne/locale, chauffage du feu et âge alimentaire variable ajoutés à S10/S11/S12 et aux contrats alimentaires ; systèmes toujours partiels. G0 en consolidation, G1 partiel, G2 en cours, conformément à ROADMAP.

Cette matrice traduit les références de RimWorld en exigences de gameplay pour notre simulation de colonie 3D. Les trois documents de `docs/reference/originals` constituent désormais le corpus fonctionnel principal, utilisé selon la [note d'adoption et de lecture critique](../research/reference-adoption.md), avec la [première recherche](../research/rimworld-reference.md) en complément. Elle décrit une cible et un ordre de construction, **pas une déclaration de fonctionnalités livrées**. Le [plan de développement](../ROADMAP.md) définit le calendrier canonique G0 à G5 et l'état technique ; les résumés ci-dessous s'y conforment. Les extensions viennent après G5.

Révision : **15 septembre 2026**. Périmètre par défaut : jeu de base avant les systèmes comparables aux extensions. Les règles chiffrées du prototype sont nos paramètres provisoires ; elles ne doivent pas être présentées comme des valeurs certifiées de RimWorld.

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
| S12 | Énergie et combustible | P1 / G2 | S05, S06 | Un réseau alimente ses appareils ; pénurie et séparation ont un effet visible. | Scission/fusion du réseau, batterie vide/pleine, charge durant changement de vitesse, combustible réservé puis perdu. | Politique de délestage et consommation de veille. |
| S13 | Santé, secours et soins | P1 / G3 | S04, S07 | Une blessure anatomique affecte les capacités ; un blessé peut être secouru et traité avec résultat expliqué. | Deux médecins ; patient déplacé ou mort ; lit détruit ; médicament épuisé ; saignement pendant transport. | Première anatomie et modèle d'infection ; blessures injectées pour valider les soins avant le combat. |
| S14 | Humeur, pensées, traits | P1 / G3 | S07, S10, S13 | L'humeur a des causes consultables ; l'environnement produit des conséquences durables. | Expiration et cumul, chargement pendant crise, cause supprimée, sommeil, bornes des valeurs. | Seuils de crise, durée, empilement et moyens de récupération ; premiers effets de traits/compétences possibles dès G1. |
| S15 | Mobilisation et combat | P1 / G3 | S02, S04, S13 | Une escarmouche relie couvert, blessures, retraite et retour au travail ; émission, impact et santé sont distincts de l'animation. | Cible supprimée, tir à travers obstacle, allié dans l'axe, coin, portée limite, mort simultanée, ordre interrompu. | Modèle de précision, couvert, cible mobile et dégâts à vérifier avant d'adopter les coefficients du corpus. |
| S16 | Feu, météo, incidents locaux | P1 / G2 ; dégâts aux personnes G3 | S10, S11, S12 ; S13 pour les dégâts aux personnes en G3 | Feu, énergie, température et stocks interagissent ; les événements de test peuvent être injectés sans narrateur. | Feu sans combustible, pluie, pièce close, panne électrique, annulation de tâche urgente, bord de carte ; agent blessé à partir de G3. | Propagation et extinction en G2 ; secours et dommages anatomiques associés à S13 en G3. |
| S17 | Directeur d'événements | P1 / G4 | S00, S13, S15, S16 | Un cycle de tension et récupération fonctionne sur plusieurs graines, avec causes et conditions observables. | Aucune cible valide, événement concurrent, colonie très faible, richesse extrême, recharge en cours d'incident, récompense déjà remise. | Pression issue de richesse, population et pertes récentes ; événements, notifications et états de quête distincts. |
| S18 | Animaux et élevage | P2 / G3 | S02, S07, S09, S13 | La faune vit, consomme et apporte des choix d'élevage ou de chasse. | Enclos ouvert, régime incompatible, croissance du troupeau, prédateur, famine, animaux malades. | Espèces de départ, entraînement et budget maximal de population. |
| S19 | Relations et recrutement | P2 / relations G3, recrutement G4 | S13, S14 ; S17 pour l'intégration aux événements en G4 | Les interactions créent opinions et conflits en G3 ; les parcours de recrutement et d'accueil prolongent la population en G4. | Opinion asymétrique, relation avec mort/absent, prison ouverte, nourriture indisponible, recrutement interrompu. | Séparation opinion, lien familial, faction et statut de contrôle ; les relations n'attendent pas le narrateur. |
| S20 | Artisanat, qualité et recherche | P2 / G4 | S05, S09, S12 | Une chaîne de fabrication débloquée produit des choix d'équipement et de spécialisation. | Recette invalide, prérequis manquant, travail inachevé, poste éteint, changement de projet, qualité bornée. | Coûts, matériaux et dépendance à l'auteur d'une fabrication ; prolonger les recettes de survie G1. |
| S21 | Commerce et factions | P2 / G4 | S05, S19, S20 | Un marchand échange un stock limité et la relation politique a des effets ; le panier est validé avant transfert atomique. | Monnaie insuffisante, stock réservé, marchand parti, transfert annulé, prix hors bornes. | Progression diplomatique et règles de génération des stocks. |
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

Le joueur peut provoquer une pénurie, comprendre sa cause et la corriger. Distance, ingrédients, seuil de production, interruption et expiration simple des aliments ont des conséquences vérifiables. Les unités temporelles et de nutrition sont décidées explicitement avant calibration ; les constantes du corpus ne sont pas injectées telles quelles dans les ticks du prototype. Refroidissement passif et premiers effets des pièces livrés pendant G2 ; appareils réfrigérants et effets psychologiques restent ouverts.

### G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, saisons, températures, électricité et incendies forment une boucle cohérente. Une pièce fermée modifie température et confort ; une porte détruite ou reconstruite invalide les bonnes régions. Coupe des murs et toits, navigation et points de travail restent cohérents avec l'état logique.

Une scène de panne et de feu relie réseau électrique, température et stocks sans dépendre des FPS. Elle peut injecter l'incident pour tester le système avant le narrateur G4. Les dommages aux personnes dépendent du système de santé G3 et ne sont pas exigés pour la première tranche environnementale.

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

V27 : [régions et identités géologiques](../development/geology.md) livrées dans la génération locale ; SYS-061 minage, CAT-059 sols et le reste de CAT-060 demeurent partiels. V28 ajoute minage physique, sol brut et fragments transportables ; V29 ajoute acier compacté et piles d’acier ; toits, autres minerais et taille restent ouverts. Le calendrier reste ROADMAP.

S10, sous V34 : reconnaissance des enceintes, seuils et inspection livrées ; fusion/division, coins, eau et reprise contrôlés. Toits construits V35, premiers rôles V36 et thermique V38 sont ajoutés dans leurs contrats ; confort et autres effets de pièce restent ouverts ; ce lot ne satisfait pas encore l’acceptation G2. [Contrat](../development/rooms.md).

V37 étend la lumière aux travaux et déplacements des domaines S02/S04/S06/S09/S10 ; [contrat](../development/light-work.md). G0/G1 restent partiels et G2 en cours. Ni catalogue, compétences, psychologie ni thermique livrés par cette extension.
