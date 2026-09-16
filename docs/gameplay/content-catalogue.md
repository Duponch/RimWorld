# Catalogue de contenu : couverture connue

V47 ajoute un profil de compétence **Médecine**, les activités Patient/Repos au lit/Traitement et une politique individuelle autoriser/refuser. Aucun objet médical supplémentaire : les soins sans médicament utilisent les lits existants. Médicaments, consommables, lits d’hôpital et équipements restent absents ; ne pas compter les nouvelles actions comme de nouveaux objets. [Contrat](../development/tending.md).

V46 ajoute un **rôle médical aux lits existants**, conservé lorsque le meuble est emballé. Aucun nouvel objet lit d’hôpital, médicament ou sac de patient : une personne portée garde son identité. Les variantes bois/acier/cinq pierres gardent leurs propriétés existantes. [Contrat](../development/rescue.md).

V43 ajoute un profil numérique Construction aux personnes (aucun nouvel objet). Niveau, passion et XP sont des états individuels ; ils ne constituent ni un catalogue de biographies ni les douze compétences complètes. [Contrat](../development/skills.md).

V42 ajoute `wood-generator` (générateur à bois, CAT-047 partiel) et `standing-lamp` (mobilier lumineux). Recettes fixes : 100 acier + 2 composants et 20 acier. Puissances 1 000 W / 30 W ; aucune variante avancée, câble ou batterie implicite. [Contrat et limites](../development/power.md).

V41 ajoute `Tile.ore=machinery` (machines compactées, 2 000 PV, groupes 3–6) et `component` (deux unités par case, pile 50, transport/stockage, CAT-006 partiel). [Contrat](../development/components.md). V42 utilise deux composants dans le générateur ; fabrication de composants, usure et composants avancés restent absents.

V40 ajoute un objet : `passive-cooler`, bois fixe, 1×1, réservoir 50 bois et consommation 10/jour, seuil 17 °C ; recharge physique, déconstruction sans restitution, non réinstallable. [Contrat](../development/passive-cooling.md). Aucun appareil électrique ni équipement de protection thermique livré.

V39 ajoute croissance thermique et limites des nouveaux semis aux plantes de riz et buissons existants, sans nouvelle espèce. Mortalité et feuilles restent absentes.

V38 ajoute des propriétés au contenu existant, sans nouvel objet : chaleur du feu, échanges des murs/toits/portes, conservation locale des denrées. Réfrigérateurs électriques, radiateurs et équipement thermique restent à livrer ; aucun catalogue clos par ce lot.

V37 étend les effets des feux/toits existants aux travaux et déplacements ; aucun nouvel objet. Le catalogue reste ouvert, notamment plantes, terrains et éclairages supplémentaires.

Le feu présent éclaire maintenant aussi le décor et les colons en 3D ; aucun nouvel objet lumineux. Lampe électrique livrée V42 ; torches et lumières horticoles restent absentes. [Présentation](../development/environment-lighting.md).

V36 enrichit les propriétés des objets existants : lumière logique du feu allumé, rôle de lit/table/piquet/atelier et facteurs des deux recettes. Aucun nouvel objet ni catalogue lumineux complet. [Contrat](../development/work-environment.md).

V35 ajoute une famille de **toit construit**, couche de couverture indépendante des objets/piles et sans recette matérielle. Zones Construire/Retirer/Ignorer, supports et présentation procédurale livrés ; toits naturels minces/épais, colonnes porteuses, gravats et dégâts aux objets restent absents ; blessures de toit construit aux personnes livrées V45. [Contrat](../development/roofing.md).

État du 16 septembre 2026. Le jeu de base complet, y compris ses centaines d'objets et leurs variantes, reste la cible. Le bilan par [système](implementation-status.md) ne suffit pas à suivre ce contenu. Ce document distingue ce que contient notre référence et ce qui existe dans le jeu développé.

V24 permet de déconstruire les six bâtiments existants. V25 ajoute désinstallation et réinstallation de lit, table, tabouret et piquet sous forme entière ; **aucune nouvelle famille d’objet**. Le paquet conserve le bâtiment et son identité ; V26 ajoute rangement filtré, dégagement et réinstallation par Transport ; masse, qualité et dégâts restent absents. La présence de ces familles ne clôt ni leurs variantes ni les centaines de définitions attendues.

## Le corpus ne contient pas un inventaire exhaustif à jour

Les trois originaux de [corpus original](../research/reference-adoption.md) contiennent un rapport HTML/PDF identique et un classeur. La feuille **Contenu** décrit **95 familles CAT**, jeu de base et extensions confondus : des exemples, des champs attendus et une provenance. Elle ne compte pas 95 objets individuels. Sa colonne G indique que les définitions ne sont pas acquises. Les 227 entrées STAT décrivent des champs à relever, sans valeurs de profils.

Les chapitres 1, 4, 11, 31 et 34 précisent eux-mêmes cette limite. Leur référence éditoriale est PC 1.6 ; aucun manifeste de définitions réellement chargées dans une installation identifiée n'accompagne les documents. Nous ne pouvons donc certifier ni un nombre total, ni l'actualité d'une liste individuelle. Les scripts d'inventaire et le squelette d'exporteur annoncés au chapitre 31 **ne font pas partie des trois fichiers reçus** ; ils n'ont pas été exécutés localement.

Une future acquisition devra conserver version exacte, modules et ordre de chargement, identifiants, héritage, références, définitions générées et erreurs. Un relevé XML brut ne suffit pas à résoudre les valeurs calculées. Matériau, qualité, usure et état d'un objet sont des variantes, pas nécessairement des définitions distinctes. Les valeurs inconnues restent inconnues. Aucun pourcentage de complétude n'est calculé sans dénominateur vérifié.

## Relecture des familles naturelles

L’[audit du 13 septembre](../research/environment-review.md) confirme que les familles **CAT-059..065** sont partielles : sols aux fertilités/supports/coûts distincts, cinq roches naturelles de base (granite, calcaire, marbre, grès, ardoise), minerais et produits séparés, arbres/plantes propres aux biomes. V27 livre les identités des cinq roches, leur distribution et leur apparence ; cela ne clôture aucune de ces familles. Les types exacts, propriétés et variantes ne sont pas encore acquis dans un manifeste résolu.

## Petit catalogue réellement disponible

| Registre / identifiant local | Usage livré | Limites |
|---|---|---|
| Objet `wood` | Bois récolté, piles, portage, construction et combustible du feu/refroidisseur passif/générateur ; CAT-005. | Espèces, masse, autres combustibles, dégâts et autres propriétés non implémentés. |
| Objet `berries` | Baies récoltées, 0,05 nutrition/unité, piles de 75, ingestion de plusieurs unités ; CAT-011. | Pourrit en 14 jours à température normale ; intoxication absente ; maturité et renouvellement du buisson livrés en V7. |
| Objet et plante `rice` | Riz semé/récolté ; croissance, fertilité, lumière et température locale ; 6 unités mûres, pile de 75, nutrition 0,05, malus de repas cru. Première culture alimentaire, domaine SYS-070..072. | Pourrit en 40 jours à température normale. Autres recettes, intoxication, santé du plant et compétences absents ; une seule culture sélectionnable. [Référence](../research/farming-reference.md). |
| Objet `simple-meal` | Repas simple cuisiné au feu : dix baies/riz, nutrition 0,9, pile dix, ingestion un ; première recette Core. [Source et contrat](../research/cooking-reference.md). | Pourrit en 4 jours à température normale. Autres ingrédients, compétence et intoxication absents. |
| Structure `horseshoes` | Piquet bois/acier V30 et cinq pierres V33, CAT-050 : dix unités livrées, sept ticks en bois ou dix en acier, trois utilisateurs et places visibles à cinq cases ; famille dextérité. [Référence et limites](../research/recreation-reference.md). | Autres matériaux que bois/acier/cinq pierres, capacités/compétence de tir, pièces et dégâts absents ; aucune qualité comme pour le piquet de référence. L’animation ne lance pas encore de projectile visible. |
| Structure `stonecutter` | Atelier 3×1, bois/acier : 75 bois + 30 acier ou 105 acier ; plan/cadre, rotation, déplacement entier, stockage, transit et restitution V31. [Référence](../research/stonecutter-reference.md). | Factures de taille et blocs livrés V32 ; recherche, statistiques complètes et effets complets du poste absents. La nouvelle famille est partielle. |
| Structure `passive-cooler` | 50 bois livrés devenant combustible, consommation continue, refroidissement vers 17 °C, recharges réelles, retrait sans restitution. | Recherche offerte au départ ; confort/santé et dégâts absents. Aucun froid alimentaire, éclairage, recette ou réinstallation. |
| Structure `campfire` | 20 bois livrés, combustible initial, combustion/ravitaillement, factures de repas simple, lumière locale et chaleur jusqu’à 28 °C. | Pluie, sociabilité et dégâts absents ; autres postes différés. |
| Objet `survival-meal` | Repas de survie du départ, 0,9 nutrition/unité, piles de dix ; CAT-015. | Ne pourrit pas. Recette, ingrédients, recherche et détérioration absents. Le scénario local donne 18 repas ; ce n'est pas Crashlanded. |
| Objet `legacy-portion` | Compatibilité des sauvegardes V1–V4 : 0,35 nutrition/unité, piles de 75. | Ce n'est aucun objet de RimWorld ; absent des nouvelles parties. |
| Ressources `tree`, `berries`, `rock` | Arbre générique, buisson générique, pierre au sol. | Pas un catalogue d'espèces ou de roches. Arbre abattable ; buisson persistant, récoltable selon maturité et supprimable par coupe ; les pierres Resource restent décoratives, distinctes des produits de minage V28. |
| Structures `wall`, `bed`, `table`, `stool` | Mur, lit, table 1×2, tabouret, construits en bois ou acier V30 et cinq pierres V33 ; les trois meubles sont réinstallables en V25. | Aucun ensemble complet de mobilier ; autres matériaux, qualité et dégâts absents. Le lit en pierre a un repos ×0,9, les ouvrages un travail spécifique. |
| Terrains `grass`, `soil`, `water`, `rock` | Prairie, sol, eau et massif procéduraux. | Quatre classes locales ; ne correspondent pas à quatre définitions exhaustives du jeu original. |

Le [registre d'objets](../../src/sim/items.ts) est utilisé par simulation, piles et interface. [Definitions](../../src/sim/definitions.ts) contient les constructions et commandes actuelles. Une entrée présente ne signifie pas que tous ses comportements sont livrés : par exemple, un repas disponible au départ ne signifie pas que sa recette existe.

Le contenu restant comprend notamment métaux et pierres, composants avancés et autres filières de composants ordinaires, textiles et cuirs par espèce, aliments/cultures/viandes/œufs, repas et ingrédients, médicaments/drogues, organes/prothèses, armes/projectiles, vêtements/armures, mobilier, sols/portes/toits, ateliers, énergie, dispositifs défensifs, art, plantes et animaux. Le détail individuel et ses liens aux recettes, recherches, biomes et systèmes seront acquis et implémentés progressivement. Les DLC restent après G5.

Chaque ajout doit avoir un identifiant stable, famille CAT, source/version et champs confirmés, règles réellement disponibles, variantes encore absentes, référence de test et représentation. Les noms traduits ne servent jamais d'identifiants de sauvegarde.

L'inventaire des personnes, leurs vêtements et les portraits ont un [contrat distinct](../development/character-presentation.md), actuellement prévu et non livré.


V9 enrichit les interactions des objets existants : bois et aliments peuvent être déplacés hors des cultures ; baies, riz et rations ont un classement alimentaire neutre vérifié. Aucun nouvel objet ni fragment de roche collectable n’est ajouté par cette tranche. Voir [sources et limites](../research/food-clearing-reference.md).

## Couverture des régimes alimentaires

V13 ajoute des [régimes partagés](../development/food-policies.md), aucun objet supplémentaire. Ils couvrent les cinq types alimentaires déjà définis, dont la portion historique de compatibilité. Les préréglages et filtres de provenance complets restent à compléter avec les familles alimentaires ; la présence d'un filtre ne signifie pas qu'un aliment possède une recette ou que l'inventaire personnel existe.

## États de chantier V16

Aucun nouvel objet : mur, lit, table, tabouret, feu et piquet disposent de phases plan/cadre avant leur état construit. Plantes, bois et aliments existants participent au dégagement physique. L’état de chantier n’est pas une nouvelle famille CAT. Compatibilité meuble/objet et plans sur réserve livrés en V21 ; matériaux alternatifs, qualité et chaîne pierre restent absents ou partiels ; voir [construction](../development/construction.md).

## Portée des tranches V17–V18

Aucun nouvel objet individuel. La sélection multiple, les ordres directs et les livraisons forcées concernent les colons, piles et travaux du catalogue existant ; ils ne livrent ni équipement, ni autre espèce ou matériau. [Ordres et limites des fournisseurs](../development/player-orders.md).

## Commandes contextuelles V20

V19 et V20 ne créent aucun objet. Bois et feu disposent du ravitaillement manuel ; les plantes et piles présentes sur un chantier peuvent être dégagées au clic droit. V20 rend aussi le repas simple commandable au poste avec ses ingrédients réels, et les piles des champs dégageables manuellement. Cela ne complète ni la diversité végétale ni les roches, recettes ou autres combustibles. [Règles et limites](../development/player-orders.md).

V21 précise les profils des six constructions existantes : table/tabouret/piquet conservent les piles, mur/lit/feu les dégagent ; zones et apports ont leurs propres permissions. Affichage des objets adapté aux surfaces 3D. Aucun objet ni type de stockage supplémentaire. [Tableau des profils](../development/construction.md).

V22 ne crée aucun objet : elle renseigne transit, arrêt, coûts d’entrée et répétition pour les six constructions existantes. Table/lit/tabouret ont une hauteur de passage GPU. [Profils actuels](../development/furniture-travel.md) ; autres matériaux et centaines d’objets individuels restent à inventorier/intégrer.

## Roches naturelles V27 — CAT-060

| Identité | Nom | Livraison actuelle |
|---|---|---|
| granite | Granite | Massif et pierre décorative typés |
| limestone | Calcaire | Massif et pierre décorative typés |
| marble | Marbre | Massif et pierre décorative typés |
| sandstone | Grès | Massif et pierre décorative typés |
| slate | Ardoise | Massif et pierre décorative typés |

Distribution régionale, persistance et apparence sont livrées. V28 ajoute les PV et produits ci-dessous, sans blocs utilisables. L’acier compacté et son produit sont livrés en V29 ; autres minerais hors machines compactées et compétences de minage restent absents ; taille livrée V32, construction en pierre V33 ; [contrat du minage](../development/mining.md).

## Produits et sols V28 — CAT-059/060

| Identifiant | Livraison | Limites |
|---|---|---|
| `granite-chunk` | Fragment après minage du granite (900 PV), pile 1, transport et stockage filtré. | Taille V32 : vingt blocs de granite. Masse fonctionnelle, dégâts et couverture absents. |
| `limestone-chunk` | Fragment après minage du calcaire (700 PV), mêmes contrats. | Idem. |
| `marble-chunk` | Fragment après minage du marbre (450 PV), mêmes contrats. | Idem. |
| `sandstone-chunk` | Fragment après minage du grès (400 PV), mêmes contrats. | Idem. |
| `slate-chunk` | Fragment après minage de l’ardoise (500 PV), mêmes contrats. | Idem. |
| `legacy-chunk` | Produit d’une roche historique sans type, profil local 500 PV. | Compatibilité explicite, pas une sixième roche Core. |
| Terrain `rough-stone` | Sol découvert, cinq identités ou type historique, fertilité zéro, coût de marche. | Lissage, sous-sols alternatifs et sols construits absents. |

## Acier V29 — CAT-060 et matériaux Core

| Identifiant | Livré | Limites |
|---|---|---|
| `Tile.ore='steel'` | Acier compacté, 1 500 PV, gisements connectés de 30–40 cases ; minage et sol encaissant conservé. | Profil de site local ; aucune injection sur anciennes cartes, compétences/rendements variables, dégâts externes et toits naturels absents. |
| Objet `steel` | 40 unités par gisement au profil neutre ; piles de 75, portage, rangement filtré, compteur et barres procédurales ; matériau de construction V30. | Atelier et recette constructive mixte livrés en V31 ; fabrication de blocs livrée V32 ; capacité générale de portage provisoire de dix unités. |

[Sources et décisions](../research/steel-reference.md). Argent, or, plasteel, uranium, jade et leurs filières restent absents ; V41 ajoute les composants industriels extractibles. Ni ces deux entrées, ni les cinq roches ne constituent un inventaire exhaustif.

## Variantes constructives V30

`wood` et `steel` sont admissibles pour mur, lit simple, table 1×2, tabouret et piquet ; feu fixe en bois. Cinq variantes en acier ajoutées en V30, aucune nouvelle famille de bâtiment dans ce lot. Matériau et recette conservés dans le paquet et après repose ; couleur rétablie sur l’objet, bande de caisse distincte au sol ; moitié restituée avec arrondi pour les ouvrages ordinaires. Les anciennes recettes restent identifiées par absence de matériau. [Contrat et quantités](../development/construction-materials.md). V31 ajoute la famille atelier avec deux variantes constructives et ingrédients mixtes ; blocs taillés livrés V32, constructions en pierre V33 ; autres matériaux, qualité, résistance et inflammabilité restent absents.

## Blocs V32

| Objet | Production et usage livré | Limites |
|---|---|---|
| `granite-blocks` | Vingt par fragment de granite, Artisanat au poste, pile 75, réserve filtrée. | Construction disponible depuis V33 ; HP/détérioration et masse fonctionnelle absents. |
| `limestone-blocks` | Même chaîne pour le calcaire, identité et couleur propres. | Même périmètre. |
| `marble-blocks` | Même chaîne pour le marbre. | Même périmètre. |
| `sandstone-blocks` | Même chaîne pour le grès. | Même périmètre. |
| `slate-blocks` | Même chaîne pour l'ardoise. | Même périmètre. |

SYS-062..064 / matériaux manufacturés du chapitre 11. Aucune nutrition ni pourriture ; passage autorisé, supplément 1,4 tick local, arrêt autorisé. Cinq définitions supplémentaires ne ferment pas le catalogue Core. [Recette, sources et réserves](../research/stonecutting-reference.md).

V33 ajoute **25 variantes constructives** des familles présentes, aucune nouvelle définition d’objet : cinq pierres × mur/lit/table/tabouret/piquet. Les cinq ItemId de blocs V32 restent les mêmes dans piles, chantier et restitution. Table de taille non admissible en pierre ; matériaux absents et propriétés non simulées restent explicites dans la [recherche](../research/stone-buildings-reference.md).

## Porte manuelle V34

Nouvelle famille `door`, sept variantes : bois, acier, granite, calcaire, marbre, grès, ardoise. Une case, 25 unités, travail de base 850 Core avant matériau ; restitution 12/13, non réinstallable. Trois cadences d'ouverture (bois/acier/pierre), maintien/interdiction, coexistence des objets. Autodoors, résistance et isolation fonctionnelle encore absentes. [Sources](../research/doors-reference.md), [contrat](../development/doors.md).

## Corps humain : socle encore non actif

[Définition anatomique](../../src/sim/body-definition.ts) : 64 entrées dont un emplacement utilitaire conceptuel, parties symétriques, organes et doigts/orteils. Il ne s’agit ni de 64 objets transportables ni d’un inventaire médical déjà jouable. [Capacités et limites](../development/body.md). Quatre profils de lésions sont codés dans le [module médical](../development/injuries.md) : coupure, écrasement, fissure, contusion ; ce ne sont pas des objets ni un catalogue médical complet. V45 active les blessures persistantes de Pawn et les chutes de toit construit. Autres races/corps, implants, pathologies, médicaments utilisables et équipement restent absents du contenu actif. Une dépouille est encore le Pawn décédé, pas un nouvel objet transportable.

## Cargaison interrompue V44

Aucun objet ajouté : la pile ou le meuble déjà porté garde son identité quand la fatigue impose le sommeil sans dépôt libre. Cela ne livre ni inventaire personnel, ni équipement, ni corps transportable. [Contrat et limites](../development/interrupted-cargo.md).
