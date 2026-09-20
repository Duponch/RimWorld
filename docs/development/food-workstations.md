# Cuisinières et table de boucherie — V84

Lot livré ; [preuves V84](../history/validation-food-v84.md). Les trois postes prolongent les [factures physiques](cooking.md), la [boucherie](butchery.md), la [construction](construction.md) et l'[électricité](power.md). [Recherche locale 1.6.4871, corpus, sources et divergences](../research/food-workstations-reference.md). Ils ne remplacent pas les feux ni les emplacements déjà construits.

## Contenus et accès

| Poste | Coût réellement livré | Travail de construction neutre | Fonctionnement |
|---|---|---|---|
| Cuisinière à bois |80 acier|200 ticks locaux|50 bois maximum, vide à l'achèvement, consommation pendant la préparation|
| Cuisinière électrique |80 acier+2 composants|200 ticks locaux ; Construction 4 pour finir|350 W continus quand alimentée|
| Table de boucherie en bois |95 bois|140 ticks locaux après facteur bois 0,7|rendement du poste 1 au lieu de 0,7 sur l'emplacement|

Chaque poste occupe 3×1, se tourne dans les quatre directions et garde une place de service devant son centre. Les plans restent traversables ; livraisons, dégagement et finition suivent le même contrat que les ateliers existants. Le meuble fini est traversable avec 50 ticks Core de supplément et interdit l'arrêt ordinaire. Il porte des objets sur ses trois cellules, mais aucune réserve n'est créée dessous. Les trois postes peuvent être désinstallés, emballés puis transportés et réinstallés en conservant identité et factures ; le bois contenu reste dans la cuisinière emballée. Le courant est détaché tant que le poste est emballé.

L'accès à la cuisinière électrique reprend les bases électriques disponibles dans le jeu actuel. Il ne simule pas un arbre de recherche Electricity complet. Les variantes matérielles de la table restent absentes. Les composants de production des cuisinières ne les rendent pas lumineuses : prévoir une source de lumière réelle si nécessaire.

## Travail, repas et boucherie

La priorité est Cuisine dans Travail. Les deux cuisinières utilisent les factures ordinaires de repas simple : ordre, Xfois/Jusqu'àX/Toujours, suspension, filtres, rayon et destination. La table utilise les mêmes factures de dépouille que l'emplacement, avec le compteur de viande déjà défini. La recette simple accepte les ingrédients livrés : riz, baies, viande de lièvre, [pomme de terre et maïs](food-crops.md). Une nouvelle facture les autorise ; les filtres manquants dans une facture ancienne restent des refus.

Les ingrédients sont prélevés puis portés et déposés sur l'emprise du nouveau poste, avec réservation quantitative du sol et réservation exclusive du service. Une seule cargaison est portée. Les cellules de surface contiennent au plus une pile chacune. L'atelier ne consomme que les ingrédients effectivement rassemblés ; dix unités brutes deviennent un repas neuf, et les restes conservent leurs âges. Une surface saturée peut empêcher une recette ; elle n'est pas un stockage infini.

Les cuisinières ont un facteur de poste 1 ; le feu historique garde 0,5. Cuisine, capacités, lumière, extérieur et température modulent le débit. La table garde le travail de boucherie450 Core / 45 locaux et applique1 au rendement anatomique ; l'emplacement conserve0,7. Les rendements du travailleur et les arrondis restent ceux de `butchery.ts`, avec viande/cuir prévalidés ensemble avant la transaction. Apprentissage à la réussite seulement, selon le temps effectivement travaillé.

`WorkEnvironment` calcule le rôle Cuisine avec 28 points par cuisinière. Une chambre ou un autre rôle dominant entraîne le facteur 0,8 du poste intérieur mal situé ; une pièce extérieure a son propre facteur 0,8, sans cumuler un rôle incorrect. La table de boucherie n'a pas de rôle exigé. Les trois nouveaux postes subissent le facteur thermique0,7 sous 9 °C ou au-dessus 35 °C. La température est celle du poste et n'est pas déduite d'une icône.

## Bois, électricité et chaleur

`fuel.ts` conserve 600 unités entières de réserve par bois. La cuisinière a une limite 30000 unités, sans réserve gratuite à la construction. Elle consomme 16 unités par tick local de travail, soit160 bois pour un jour de travail ininterrompu. Elle n'en consomme ni pendant collecte, ni au repos, ni pendant la livraison du repas. La dernière fraction disponible ne donne que sa fraction de progression et de chaleur active. Les trajets et vitesses peuvent donc changer le coût en bois d'un repas.

L'automatisme de recharge démarre à 30 % de capacité et le service dure 24 ticks locaux au contact. Cuisine peut apporter le bois pour une facture même si Transport est désactivé. Les ordres manuels et leurs réservations restent valables ; l'automatisme désactivé ne contourne pas la politique. Chaque recharge apporte des unités entières et n'en jette aucune au remplissage. Le bilan distingue bois extérieur, réserve, bois brûlé et matériaux de construction incorporés. L’emballage conserve la réserve ; la déconstruction retire sa réserve et son historique dans le registre prévu, séparément du remboursement des matériaux.

La cuisinière électrique utilise le réseau local commun et demande 350 W même inactive. Une pénurie de courant ou de bois empêche la préparation. Une interruption libère les réservations et garde les matières comme pour les autres recettes sans ouvrage ; le progrès actif chargé depuis une sauvegarde est conservé. Le transport d'un repas déjà produit continue malgré la coupure.

Une cuisinière à bois avec réserve chauffe sa pièce de 4 unités par seconde Core ; une électrique alimentée de 3. La préparation ajoute 6 par seconde Core, appliqués immédiatement dans la température autoritaire de la pièce. La présentation ne produit aucune chaleur. L'intégration continue existante remplace les impulsions de la référence ; les échanges de pièces et l'énergie du refroidisseur restent indépendants. Une cuisinière extérieure ne crée pas de volume d'air artificiel.

## Persistance et frontières

V83 est validée strictement avant migration 84. Aucun poste, combustible, facture ou connaissance n'est ajouté à une partie ancienne. Les trois identifiants de bâtiment et les filtres/réservations pomme de terre/maïs sont refusés dans un format antérieur. Matériaux et emprises sont explicites ; les deux cuisinières imposent acier, la table bois. La réserve entière est contrôlée aussi dans le bâtiment emballé ; une cuisinière électrique emballée doit être sans connexion et éteinte.

Les cinq contrôles regroupés de `tests/food-workstations.test.ts` couvrent construction réelle et niveau 4, recharge par Cuisine et mélange de cultures, collecte sur surface/continuation/emballage, rôle/chaleur/coupure/réserve finale/migration, comparaison des rendements table/emplacement et coupure par déconstruction du générateur pendant une cuisson en file, avec cargaisons et continuation conservées. `tests/scenarios/food-workstations.ts` fournit une scène de construction réellement exécutée et des fixtures déclarées pour les frontières ; ces matières contrôlées ne décrivent pas la dotation d'une nouvelle partie. Pilote long, clics natifs et performances sont intégrés dans la validation centrale du lot.

Restent absents : propreté −15 de la table comme effet, salissures et nettoyage, intoxication, recettes avancées et lots, variantes métalliques, autres espèces et réseau électrique complet. Le mot Cuisine désigne le rôle de la pièce ; il ne certifie aucune hygiène ni immunité à la maladie. Les nouvelles stations améliorent les moyens du joueur, sans annoncer que son économie alimentaire devient automatiquement autonome.
