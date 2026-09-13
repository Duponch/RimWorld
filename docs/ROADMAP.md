# Plan de développement

État : 13 septembre 2026. Le statut technique ci-dessous fait autorité ; la matrice de recherche décrit des cibles de gameplay, pas des fonctionnalités déjà disponibles.

## Direction retenue

Référence : RimWorld de base, extensions ensuite. Une grille de simulation plane est représentée en 3D low poly, avec une caméra orientable. Les mécaniques de référence sont conservées comme cible par défaut ; les simplifications temporaires sont indiquées dans le guide joueur et les décisions d'architecture. Le nom de travail est **Lisière**.

La première livraison privilégie une boucle étroite et vérifiable. Les conséquences de ressources, besoins, travaux et événements devront progressivement se relier. Une liste de bâtiments et de modèles n'est pas une équivalence de gameplay.

Les trois documents de `docs/new_docs` sont la référence fonctionnelle principale et le comportement visé par défaut, avec une [note d'adoption et de lecture critique](research/reference-adoption.md). Les libertés fonctionnelles et interprétations 3D sont consignées dans [les choix de gameplay](gameplay/decisions.md). Les techniques de navigation, représentation et calcul restent libres si elles conservent ces contrats et une qualité mesurée. **Les jalons G0–G5 ci-dessous sont le calendrier canonique**, également utilisé par la matrice ; les étapes 1–8 du corpus sont mises en correspondance, sans renuméroter le projet.

Un [inventaire du gameplay livré, partiel et absent](gameplay/implementation-status.md) détaille chaque domaine ; le [catalogue](gameplay/content-catalogue.md) distingue objets disponibles, familles de référence et contenu encore non recensé. Le [contrat sol/déplacement/vue distante](development/spatial-motion-storage.md) précise les corrections V6. Le [contrat inventaire/équipement/portraits](development/character-presentation.md) est prévu, non livré.

## État par chantier

| Chantier | État | Preuve ou limite |
|---|---|---|
| Recherche de référence | Livrée, première passe approfondie | Rapport de 30 sources ; 25 domaines ; versions et extensions vérifiées. Certaines formules et comportements nécessitent encore observation dans RimWorld. |
| Corpus utilisateur HTML/PDF/XLSX | Lu et intégré au plan | Rapport de 36 chapitres en deux formats, référentiel de systèmes/données/commandes/tests ; recommandations qualifiées dans reference-adoption.md. Aucun nouveau système déclaré livré par cette lecture. |
| Audit Antsystem et choix techniques | Livré | Code local consulté, VAT distinguée de l'évaluation squelettique ; technologies et compromis documentés. |
| Outils et versions | Livrés | TypeScript strict, versions npm exactes, lockfile, Vite, Vitest, Playwright. |
| Simulation indépendante du rendu | Livrée | Worker, tick fixe, graine, commandes, sérialisation complète. |
| Boucle matérielle | Livrée, consolidation G0 en cours | Piles physiques, portage, stockage filtré, réservations de quantité/capacité, matériaux livrés avant construction, interruptions et annulation conservatrices. Détails dans material-logistics.md. |
| Navigation et planification | Diagonales et progression temporisée livrées | Dijkstra pondéré sur huit voisins, invalidation et cession locale ; huit recherches et 32 768 couples logistiques examinés par tick, curseur sauvegardé. Congestion active et réservation des cases de travail encore ouvertes. |
| Sauvegarde matérielle et besoins | Schéma 7 livré | Transport, propriété, ingestion, couchage, trajets et progression persistés ; migrations V1–V6 explicites, types alimentaires, piles au sol uniques et trajets temporisés. Manifeste et journal complet restent ouverts. |
| Besoins physiques | Repas et couchages livrés | Réservation, trajet, prise en main et ingestion ; lit attribué/rejoint, sommeil effectif et repli au sol. Tables/tabourets, portion transportée vers une place réservée, confort et souvenir sans table livrés. Baies et rations distinctes, quantités ingérées et nutrition adulte livrées ; horaires, préférences alimentaires et effets sociaux/médicaux ouverts. Détails dans development/needs.md. |
| Présentation 3D | Livrée avec placeholders | Décor fusionné par chunks, retrait de ressources par indices conservés, lots persistants ; rig rigide huit os GPU TSL. Vue distante instanciée sans reconstruction au zoom, marche linéaire et orientation vers les actions. Caméra bornée au terrain. |
| Échelles et terrain | Cartes moyennes 250² livrées | Défaut 250², option 200², essais 32/64/128 conservés ; densité et proportions inchangées : 1 m/case, humain 1,75 m, mur 2,80 m, lit 1×2. Sauvegardes anciennes non agrandies. Comparaison dans map-scale.md. |
| Transfert des snapshots | Incrémental livré | Checkpoint init/load ; deltas terrain/ressources, epoch et révisions, références immuables, resynchronisation. Historique des arêtes entre snapshots pour conserver les virages au rendu. Les tableaux dynamiques et sauvegardes restent complets. |
| Organisation de l'interface | Livrée sur le périmètre actuel | Disposition RimWorld, Architecte avec réserves, lits/tables orientés et tabourets ; compteur FPS permanent, Travail collecte/construction/transport 0–4, inspection des matériaux et filtres. Les autres onglets restent désactivés jusqu'à leurs mécaniques. |
| Désignations rectangulaires | Livrées pour les ordres de terrain et les réserves | Abattage/récolte/coupe de buisson/annulation, création/retrait de réserves ; aperçu des cases compatibles, annulations de geste et bilan autoritaire. Cellules de stockage encore indépendantes. Contrat dans area-designations.md. |
| Observation du jeu | Première séance livrée | Séquences horodatées de la vidéo fournie ; interface, stocks, volumes et passages observés. Combat, fuite et congestion restent à observer en mouvement. |
| Navigation entièrement GPU | Laboratoire livré, intégration ouverte | Recherche pondérée, convergence et extraction GPU, oracle indépendant, 110 requêtes sur GPU matériel. Gains variables selon taille/lot ; navigation du jeu encore CPU. |
| Assets animés définitifs | Prévu | Import glTF, validation des rigs et clips, atlas d'os, sockets, équipements. Aucun asset Blender demandé pour ce démarrage. |
| Validation | V7 : rochers et buissons | 30 scénarios noyau, extension des rectangles, huit parcours UI courts et parcours de trois jours réussi. Audits comparatifs de rendu, douze retraits locaux et suivi des buissons ; [preuves et limites](development/validation.md). |
| Fidélité au jeu de base complet | En développement | Cette première tranche couvre une petite partie du socle. Aucun combat, agriculture ou storyteller livré. |

## Tranche V7 — rochers et croissance sauvage

[Contrat et limites](development/rocks-and-plants.md), [recherche renouvelée](research/plant-growth.md). Massifs facettés continus, sommets partagés, faces intérieures supprimées, retraits locaux et caméra préservée. Buissons persistants, maturité, rendement, coupe distincte et croissance diurne en environnement tempéré fixe ; schéma V7. Le minage reste absent. [Preuves courantes](development/validation.md).

**Prochaine tranche :** poursuivre G1 par semis et cultures alimentaires, après vérification des cycles, travail et terrain, puis cuisine ; consolider en parallèle les réservations de cases de travail G0. Météo, saisons et toits restent G2. Le preset de croissance ne vaut pas simulation de ces systèmes.

## Priorité : interactions de survie, puis consolidation G0

La remarque utilisateur sur les raccourcis élémentaires avance les vrais repas et couchages de G1 avant les zones nommées. [Cette tranche](development/needs.md) supprime consommation à distance et bonus de lit voisin, avec attribution et sauvegarde des actions. [Les repas à table](development/dining.md) ajoutent mobilier, réservations, confort et premier souvenir. **Aliments distincts, quantités et nutrition adulte sont livrés ([contrat](development/food-items.md)). Après les corrections V6 du sol, des déplacements et du rendu éloigné, la suite immédiate concerne persistance/croissance des buissons, choix alimentaire et horaires**, puis agriculture/cuisine ; G0 continue avec zones nommées, ordres contextuels et congestion. La [relecture de la collecte](research/colony-progression.md) confirme que détruire un buisson de baies récolté est un écart fonctionnel à corriger. Aucune interaction fondamentale ne doit devenir un simple ajustement de jauge pour aller plus vite.

Le transport physique est désormais implémenté et ses scénarios de conservation et reprise sont exécutés. **G0 reste en cours** : cette livraison ne couvre pas encore toutes les interactions, les outils et les garanties de continuité prévus. Le [contrat matériel](development/material-logistics.md) décrit le code livré ; la [liste des écarts](gameplay/decisions.md) rend ses simplifications explicites.

| Contrat G0 | Livré dans cette tranche | Suite nécessaire |
|---|---|---|
| Définitions et propriété | Petit catalogue immuable ; piles à propriétaire unique ; compteurs dérivés. | Manifeste de contenu et générateur, extension des définitions au besoin réel. Pas de catalogue universel préalable. |
| Empreintes | Nouveaux lits orientés 1×2, placement/inspection/accès cohérents ; anciens lits explicitement 1×1. | Réservation distincte des cases de service ; réglages de franchissement du mobilier. |
| Stockage | Cellules filtrées, priorités, capacité, transport fractionné, fusion et réévaluation ; création/retrait en rectangle. | Regrouper les cellules en zones nommées à politiques partagées ; filtres riches avec les futurs objets. |
| Chantier | Matériaux effectivement livrés, progression conservée, bâtiment créé après consommation unique. | États de chantier plus fins et déplacement des objets obstruant une empreinte ; minage et déconstruction en G2. |
| Travail et diagnostics | Collecte/construction/transport, priorités 0–4, placement partagé, raisons de livraison ou d'attente. | Sélection multiple et ordres contextuels forcés, explication de l'accès et de la destination ; distinguer clic droit et glissement caméra. |
| Navigation et charge | Navigation pondérée et recherche logistique bornées, fenêtre à curseur persistant, cession locale de passage. | Congestion entre agents actifs, cases de travail réservées et politique de passage ; profiler les index persistants et leurs invalidations. |
| Persistance | Schéma 7, migrations V1–V6, cargaison, chantier partiel, places de repas, confort et phases de besoins restaurés, données invalides refusées. | Journal complet des commandes datées et de leurs résultats, manifestes, export/import et reprise d'évolution des règles. |

Le scénario de livraison partielle attend réellement ses matériaux ; interrompre ne recrédite plus un stock abstrait. Les matériaux au sol peuvent toutefois empêcher de replacer immédiatement un plan annulé : le déplacement automatique de ces objets reste un écart connu. La consommation à distance et le bonus de lit voisin sont supprimés. Le blocage immédiat des plans de murs reste un écart à corriger.

La consolidation réunit contrôles noyau, parcours UI/worker et inspection GPU de la présentation. Les plafonds de recherches et de couples examinés ne prouvent pas à eux seuls le confort à centaines d'acteurs. La colonie locale utilise désormais 250² avec une navigation CPU ; le laboratoire GPU de même dimension reste indépendant. Les [mesures de passage aux grandes cartes](development/map-scale.md) séparent charge CPU, communication et rendu, sans extrapoler à un jeu complet.

**Acceptation G0 :** trois colons peuvent collecter, porter, stocker et construire un petit camp ; on peut expliquer leurs attentes ; une sauvegarde en cours de transport reprend exactement ; aucune double réservation ou duplication sur fixtures concurrentes et soak.

La [décision nutritionnelle V5](development/food-items.md) fixe la capacité adulte à une nutrition et distingue les aliments ; les anciens profils restent explicites. Pour chaque autre calibration G1, décider des unités temporelles et de nutrition. Le prototype à 10 Hz, jours de 6 000 ticks et jauges en pourcentage ne peut pas recevoir directement les constantes du référentiel. Tout changement conserve des conversions et une migration des durées ; aucune multiplication isolée de fréquence ne constitue une adoption fidèle.

## G1 — Survie quotidienne

Agriculture et croissance, récolte renouvelable, cuisine avec recettes et files de fabrication, conservation des aliments, couchages réservés et trajets vers les lits, horaires et vrais besoins. Les relations de temps et de ressources doivent créer des arbitrages lisibles. Introduire traits et compétences seulement avec leurs effets mesurables.

Le corpus précise cette tranche : croissance intégrée sur le temps favorable, factures avec critères d'ingrédients et de comptage, repas réellement accessibles/transportés/ingérés, besoins séparés des jobs qui les satisfont. Ajouter l'explication des statistiques sur les premières valeurs effectivement utilisées. L'expiration simple des aliments arrive ici ; les effets des pièces, du refroidissement et de l'électricité relèvent de G2.

**Acceptation :** colonie autonome plusieurs jours avec alimentation produite et consommée ; effets vérifiables de compétence, distance, stock insuffisant et interruption. Le tutoriel doit expliquer les raisons d'un échec de survie.

## G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, températures intérieur/extérieur, saisons, électricité et incendies. Les régions connectées serviront navigation et pièces ; leur invalidation doit rester locale et déterministe. Prévoir coupe visuelle des toits/murs dès l'introduction de pièces.

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

- **Assets :** production du décor en code ; remplacement progressif des placeholders ; Blender MCP lors des sessions d'assets demandées ; modèles de personnages fournis plus tard.
- **Performance :** index/algorithmes d'abord, caches invalidés explicitement ; données par lots ; TS/WASM et compute choisis par expériences comparables. Le signalement d'abattage a conduit à [conserver les objets et buffers graphiques](development/render-lifecycle.md) ; la mesure appariée sur douze arbres passe de 204,1 à 29,2 ms au maximum. Le contrôle des cent acteurs passe de 333,4 à 20,8 ms de pointe ; garder les premières allocations et les hausses de capacité dans les prochains audits ; voir [les mesures et leurs limites](development/validation.md).
- **Navigation GPU :** poursuivre depuis [le laboratoire](research/gpu-navigation.md), comparer à A* et aux régions, mesurer avec rendu concurrent, puis intégrer les révisions de terrain et l'adoption au tick. Ne pas remplacer le planner par une lecture GPU bloquante par colon.
- **Fidélité spatiale et interface :** suivre [les conventions](research/spatial-design.md) et [les observations horodatées](research/visual-reference.md). Garder la structure des menus de RimWorld à chaque nouveau système.
- **Documentation :** guide joueur à chaque règle, ADR à chaque décision structurante, statut et preuves à chaque jalon. Une hypothèse devient fait seulement après vérification.
- **Traçabilité de référence :** relier chaque chantier aux chapitres et IDs utiles du corpus ; enregistrer adoption, adaptation, report ou besoin de vérification. Ne pas recopier ses centaines d'entrées en autant de tickets ou de suites vides.
- **Test :** renforcer les familles existantes au lieu d'ajouter des dizaines de cas superficiels ; conserver les graines et fixtures de régression.

## Questions de conception ouvertes, sans bloquer le socle

Objectif d'une partie, tonalité fictionnelle, contraintes de verticalité, taille maximale de colonie/carte, profondeur des interactions sociales et matériel cible restent à préciser en jouant les prochains jalons. Aucun ajout d'étages, multijoueur, moteur physique global ou cloud obligatoire n'est présumé.
