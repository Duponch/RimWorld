# Plan de développement

État : 15 septembre 2026. **ROADMAP est l’unique calendrier G0–G5.** Le [bilan fonctionnel](gameplay/implementation-status.md) fait autorité sur le contenu livré ; les [preuves](development/validation.md) indiquent ce qui a réellement été testé. Voir l’[index documentaire](README.md) pour les contrats et recherches.

## Direction et état

RimWorld de base d’abord, extensions après G5. Grille plane en 3D low poly, interactions physiques, organisation de l’interface de référence. Le [corpus utilisateur](research/reference-adoption.md) définit la cible par défaut ; chaque mécanique exige une vérification récente. Les adaptations sont [explicites](gameplay/decisions.md). Les algorithmes restent libres sous les contrats et budgets mesurés.

**G0 est en consolidation, G1 partiel.** Le camp dispose de récolte, portage, stockage, constructions, repas et couchages physiques, tables et culture de riz. V10 a ajouté feu, combustible et factures ; V11 ajoute fraîcheur, pourriture et reprise des tâches affectées ; V12 ajoute horaires, fatigue adulte et réveils ; V13 ajoute les régimes alimentaires partagés, V14 corrige le passage entre colons civils en préservant les réservations. V15 ajoute observation du ciel, fers à cheval, satisfaction/lassitude et plages Loisirs. V16 distingue plans/cadres, permet leur traversée et dégage physiquement les piles/plantes avant construction. V17 ajoute sélection multiple, menu de travail individuel, ordres directs et files réservées pour travaux exécutables. V18 ajoute transport vers stockage et livraison de chantier forcés, avec files quantitatives. V19 ajoute dégagement manuel des chantiers et ravitaillement forcé. V20 ajoute cuisine forcée et dégagement manuel avant semis avec ingrédients et poste réservés. V21 ajoute les profils objets/zones et la suppression conservatrice des cellules incompatibles sous plans. V22 rend les tables franchissables, distingue arrêt et transit, calibre les suppléments du mobilier et partage la hauteur GPU corps/cargaison/sélection. V23 ajoute maintien prioritaire sur la cellule : chaîne de construction, factures au poste, expiration et reprise. V24 ajoute déconstruction et récupération ; V25 ajoute désinstallation et réinstallation des quatre meubles admissibles. V26 complète rangement filtré, dégagement des paquets et réinstallation par Transport. V27 introduit les cinq identités de roche Core et leur distribution régionale, sans minage encore jouable. V28 livre minage, dégâts persistants, sol brut et fragments typés avec rangement désigné. V29 ajoute les gisements d’acier et leurs piles transportables. V30 ajoute les constructions bois/acier, coûts et travail de nouveaux ouvrages revérifiés, livraisons et restitutions typées. V31 ajoute la table de taille 3×1, ingrédients mixtes, circulation et transfert entier ; V32 complète la fabrication physique de blocs typés, Artisanat, factures, réservations et sorties fractionnées. V33 ajoute les constructions en cinq pierres, le repos des lits et les pertes typées. V34 ajoute les portes manuelles, permissions et attente physique, rendu GPU et reprise exacte. Schéma 34 et migrations V1–V33. Cartes par défaut 250², rendu GPU, déplacements temporisés, ciel jour/nuit et deux projections sont livrés avec les limites de leurs contrats.

## Prochains lots

1. **Compléter les commandes de base G0** : sélection multiple et ordres directs sur travaux exécutables livrés en V17. Transport/approvisionnement forcés et réservations quantitatives livrés en V18. Dégagement de chantier et combustible forcés livrés en V19, avec correction de la production sur plan de mur. Cuisine forcée et dégagement des piles sur semis livrés en V20. Coexistence meubles/piles et plans dans les réserves livrés en V21. Circulation des six meubles, coûts d’entrée, exclusions d’arrêt et hauteurs GPU livrés en V22. Maintien sur la cellule livré en V23. Déconstruction avec récupération physique livrée en V24. Réinstallation des quatre meubles admissibles livrée en V25. Logistique des paquets livrée en V26 ; autres fournisseurs contextuels au rythme du gameplay. Les plans/cadres et dégagements sont livrés en V16 ; autres profils de transit et déplacement des personnes immobiles gênantes restent à compléter.
2. **Poursuivre la survie G1** : deux familles de loisirs livrées avec satisfaction, lassitude et activités physiques ; compléter activités sans bâtiment, lieux, social et contenu. Cuisine, conservation à climat fixe, horaires et régimes restent partiels. Les attentes riches exigent l’économie future ; vérifier chaque ajout avant implémentation.
3. **Compléments de G1, puis habitat G2** : identités géologiques V27 livrées ; minage physique, sol découvert et produits livrés en V28 ; acier extractible/stockable livré en V29 ; matériau bois/acier et exigences typées livrés en V30 ; atelier à ingrédients mixtes livré en V31 ; taille et blocs typés livrés en V32 ; constructions en pierre livrées en V33 ; portes manuelles livrées en V34 ; audit CPU des accès/placements livré sous V34 (requêtes différées et empreintes sans allocations, pointes résiduelles documentées) ; prochain lot : toits/pièces ; autres recettes, ateliers, statistiques utiles et catalogue progressivement enrichi. Toits/pièces, températures variables et chaîne du froid restent ouverts. Le feu ne chauffe pas encore les pièces.

La documentation est reclassée en contrats courants, recherches, sources originales, décisions et preuves historiques. Les prochains ajouts enrichissent les scénarios de colonie existants ; les lots de tests sont regroupés selon les contrats touchés.

Audit V28 complété : les premières piles déclenchaient des compilations synchrones d’ombres. Leur préparation au chargement ramène le maximum observé à 24,1 ms avec 100 mineurs, contre 107,9 ms dans le témoin sans préparation. Le chargement initial coûte environ quatre secondes supplémentaires sur le matériel mesuré. La chaîne de la pierre peut reprendre ; conserver ce contrôle à l’introduction de nouveaux lots et capacités, sans promesse de fluidité parfaite.

Les lots V25–V26 ajoutent retrait, portage, rangement, dégagement et pose du même meuble ; les propriétés et filtres du catalogue complet restent ouverts. Le lot V24 a ajouté retrait physique et récupération. L’audit de 100 colons a réduit une partie des pointes graphiques du premier dépôt en préparant les lots au chargement ; des pointes résiduelles et les limites du planner à charge mixte restent mesurées dans [validation](development/validation.md). Le minage V28 possède un audit de 3/30/100 mineurs ; les futurs ateliers devront enrichir les mêmes conditions de charge.

## G0 — Socle et continuité

Contrats livrés : définitions immuables ciblées, propriété unique, pile au sol par cellule, réservations quantitatives, livraison avant construction, reprise exacte, commandes ordonnées et refus atomiques. Navigation CPU à huit voisins, progression euclidienne ; le laboratoire GPU est indépendant.

À compléter :

- Zones nommées et politiques partagées ; filtres enrichis au rythme du contenu.
- V17 : sélection multiple et file de travaux exécutables avec motifs de refus livrées. V18 complète transport et approvisionnement avec réservations quantitatives. V19 ajoute dégagement des chantiers et combustible forcés. V20 ajoute dégagement des piles sur semis et cuisine forcée. V23 complète le maintien sur la cellule pour les familles présentes. Restent autres familles sélectionnables et fournisseurs liés aux contenus absents ; [contrat](development/player-orders.md).
- Construction V16 : plan/cadre/ouvrage, dégagement des piles/plantes et approvisionnement par bâtisseur livrés. V21 ajoute coexistence par définition et plans dans les réserves. V22 ajoute franchissement/coûts/arrêt du mobilier présent. Restent autres profils et déplacement des personnes gênantes ; voir [contrat](development/construction.md).
- Étendre les profils de franchissement et cases de travail à mesure que les activités arrivent ; passage civil et distinction avec les réservations de lits/repas/postes livrés en V14. La présence d’un colon ne ferme plus un couloir. Collisions hostiles à développer avec G3 ; lisibilité 3D des superpositions encore partielle.
- Manifeste de contenu/générateur, journal complet des commandes datées, export/import et garanties d’évolution.

**Acceptation G0 :** trois colons développent un camp par des commandes explicables ; matériaux conservés à chaque transition, engagements sans duplication, continuation exacte pendant les transports, contrôle de charge reproductible. Les premiers scénarios passent ; les manques ci-dessus empêchent de déclarer le jalon clos.

## G1 — Survie quotidienne

Agriculture et croissance, récolte renouvelable, cuisine avec recettes et files de fabrication, conservation des aliments, couchages réservés et trajets vers les lits, horaires et vrais besoins. Les relations de temps et de ressources doivent créer des arbitrages lisibles. Introduire traits et compétences seulement avec leurs effets mesurables.

Le corpus précise cette tranche : croissance intégrée sur le temps favorable, factures avec critères d'ingrédients et de comptage, repas réellement accessibles/transportés/ingérés, besoins séparés des jobs qui les satisfont. Ajouter l'explication des statistiques sur les premières valeurs effectivement utilisées. L'expiration des trois aliments périssables est livrée ici ; les effets des pièces, du refroidissement et de l'électricité relèvent de G2.

**Acceptation :** colonie autonome plusieurs jours avec alimentation produite et consommée ; effets vérifiables de compétence, distance, stock insuffisant et interruption. Le tutoriel doit expliquer les raisons d'un échec de survie.

## G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, températures intérieur/extérieur, saisons, météo persistante, électricité et incendies. Développer les types de sols, les cinq roches naturelles de base et les minerais, les espèces et biomes locaux avec leurs propriétés ; différencier sol découvert, bloc rocheux, chunk et matériau taillé. Le cycle visuel déjà livré ne vaut pas simulation de ces systèmes. Les régions connectées serviront navigation et pièces ; leur invalidation doit rester locale et déterministe. Prévoir coupe visuelle des toits/murs dès l'introduction de pièces.

Adapter la scène E du corpus : porte détruite/reconstruite, pièce fusionnée, alimentation coupée et feu déclenché. Les causes de panne et les changements de topologie doivent être partagés avec les travaux et la navigation. Les dégâts aux personnes attendent le système de santé G3 ; une injection de feu de test n'exige pas déjà le narrateur G4. Les environnements complexes des extensions restent ultérieurs.

**Acceptation :** une pièce fermée change effectivement température et confort ; une porte ou brèche invalide la bonne région ; feu, énergie et stocks interagissent sans simulation liée aux FPS.

## G3 — Personnages et conflits

Santé anatomique, capacités dérivées, soins, blessures et douleur ; combat avec ordres directs, visibilité, couverture et projectiles ; moral avec pensées, relations et crises. Animaux avec alimentation, comportement et reproduction pourront utiliser le même socle d'acteur avec des besoins distincts.

Ordre interne : identité/corps/capacités et blessures injectées → secours/soins → pensées/relations → combat. Le résolveur sépare intention, préparation, émission, projectile, impact et santé. Les scènes B/C du corpus sont des réserves de cas ; les coefficients et règles de cible mobile issus du miroir de code demandent vérification avant adoption. L'animation et les collisions de meshes n'ont aucune autorité sur les dégâts.

**Acceptation :** une blessure affecte réellement déplacement/travail/combat ; un soin et un équipement changent le résultat ; comportements et règles de ciblage restent reproductibles aux frontières d'obstacle et de portée.

## G4 — Histoires et progression

Incidents, rythme de tension, menace liée au contexte de colonie, factions, visiteurs, commerce, recherche et événements sociaux. Garder conditions, poids et causes observables pour équilibrer le storyteller. La difficulté doit être une décision de conception documentée, sans prétendre recopier des coefficients non vérifiés.

Séparer événement de domaine et notification, état de quête et texte, panier commercial et transfert confirmé. Enregistrer échéances, identité des participants, choix de récompenses et RNG nécessaires. La richesse et les budgets d'incidents lisent les objets existants ; une récompense déjà remise ne peut être rejouée au chargement. L'artisanat général et les déblocages prolongent les recettes de survie de G1.

**Acceptation :** des parties seedées produisent des chaînes de conséquences variées mais expliquées, sans événements impossibles, seuils absurdes ou blocage de progression.

## G5 — Monde et consolidation

Carte du monde, voyages et caravanes, échanges entre cartes, objectifs longs, migrations de sauvegarde, accessibilité, optimisation à centaines d'acteurs, configuration graphique et intégration des assets définitifs. Comparer à la matrice des domaines du jeu de base avant d'étendre le périmètre aux DLC.

La scène D du corpus guide les transferts : une personne ou pile garde son identité et un propriétaire unique entre carte, caravane et rencontre. Les sites mondiaux peuvent être abstraits ; aucune simulation intégrale des colonies étrangères n'est présumée. Le monde devient jouable à ce jalon, mais le contrat de génération locale doit déjà pouvoir recevoir un contexte de site versionné sans exiger sa réalisation immédiate.

**Acceptation :** partie longue, reprise après versions, tests multi-cartes, budgets de performance sur appareils choisis, documentation de toutes les mécaniques livrées.

## Chantiers transversaux

- **Assets et 3D** : décor/bâtiments/objets en code, placeholders remplacés progressivement, personnages squelettiques GPU et apparence commune carte/portraits. Blender seulement lors des sessions demandées. Les [échelles](research/spatial-design.md) et empreintes doivent rester cohérentes.
- **Performance** : audits courts aux changements de boucle/rendu, percentiles et machine consignés. Distinguer simulation, snapshots, rendu et GPU ; aucune garantie depuis une capacité de buffer. V22 : poursuivre le coût de planification à cent acteurs et surveiller l’erreur ponctuelle d’allocation au chargement WebGPU 250², non reproduite dans les deux contrôles suivants. Les [ressources graphiques conservées](development/render-lifecycle.md) restent le contrat pour l’abattage.
- **Navigation GPU** : [laboratoire](research/gpu-navigation.md), comparaison CPU et régions, rendu concurrent, révisions et adoption déterministe au tick. Pas de lecture GPU bloquante par colon.
- **Fidélité** : nouvelle recherche par mécanique et relectures rétroactives ; conserver chapitre/ID, provenance et décision. Plusieurs sols, roches, plantes et biomes restent prévus en G2 ; le ciel ne clôture pas météo/climat.
- **Tests et docs** : peu de scénarios profonds, pilote de colonie entretenu ; contrôles regroupés suivant [testing](development/testing.md). Mettre à jour contrats, guide, inventaire et preuves sans recopier les mêmes règles dans tout le dossier.

## Questions de conception ouvertes, sans bloquer le socle

Objectif d'une partie, tonalité fictionnelle, contraintes de verticalité, taille maximale de colonie/carte, profondeur des interactions sociales et matériel cible restent à préciser en jouant les prochains jalons. Aucun ajout d'étages, multijoueur, moteur physique global ou cloud obligatoire n'est présumé.
