# Travail sur Lisière

## Cadence élargie (20 septembre 2026, mode jour)
- Clarification utilisateur : les sauvegardes RimWorld sont une source d'observations contextualisées parmi plusieurs, jamais le modèle unique d'une colonie ni le calendrier du projet. Croiser corpus, règles Core datées, sources Internet et parties observées ; ne pas transformer une trajectoire particulière en obligation universelle. Avancer plusieurs grandes lacunes compatibles sans rester centré sur le départ ou un site témoin.
- Les pilotes tournent déjà sans attente du temps réel. Choisir leur horizon selon les contrats touchés : un cycle annuel est pertinent pour les saisons, pas obligatoire pour chaque lot. Mesurer séparément moteur, oracles et diagnostics avant optimisation ; alléger les observations redondantes, préserver les invariants et reprises. Aucun gain de cadence ne justifie d'accélérer artificiellement les règles ou de sauter des pas dont les conséquences n'ont pas été prouvées équivalentes.
- L’utilisateur demande plusieurs gros chantiers compatibles développés en parallèle, puis une campagne de colonie commune sur plusieurs jours, pour amortir les parcours longs sur davantage de systèmes. Attribuer des fichiers distincts ; intégrer les contrats de persistance, commandes et besoins au centre.
- Regrouper les vérifications courtes du lot avant la campagne longue. Un défaut se diagnostique au checkpoint réel concerné, puis la continuation reprend ; ne pas rejouer sans motif les semaines déjà validées. Les cas rares ou dangereux gardent des frontières contrôlées distinctes, sans exiger leur occurrence à une date arbitraire.
- Préparer les références des domaines suivants pendant une validation longue stable, sans modifier les sources servies pendant une UI native. CPU, natif et pilotes lourds restent successifs ; éviter de saturer les ressources de mesure. ROADMAP reste le seul calendrier et distingue préparation, implémentation et livraison.

## Visiteurs, commerce et armes V88 — livrés dans leur périmètre
- Lire `docs/development/visitors.md`, `trade.md`, les recherches `trade-reference-v88.md`, `visitors-reference-v88.md` et `weapons-v88.md`. Petits visiteurs et passants, contact réel, argent physique et panier atomique forment une même boucle ; caravanes de gros, orbital et diplomatie complète restent absents. Les stocks omettent les contenus non livrés sans redistribuer leurs probabilités.
- Distinguer inventaire personnel, provisions non vendables, équipement et cargaison de travail. Disponibilité, devis, monnaie et tous les dépôts sont prévalidés ensemble ; un refus conserve identités, quantités, état et aléas. Les visiteurs neutres ne deviennent pas des colons dans les commandes, réserves ou statistiques.
- Argent : pile maximale 500 ; les nouvelles réserves proposent une capacité de 500, toujours plafonnée par la limite de chaque objet. Les réserves historiques conservent leur capacité, notamment 75, et un filtre Argent absent reste un refus jusqu'à modification explicite. Ne pas augmenter les piles alimentaires ou réécrire le stockage ancien par migration.
- V87 doit être strictement validée avant migration neutre V88. Aucun visiteur, argent ni arme ajouté aux anciennes parties ; adoption des visites explicite sans introduction rétroactive. Seul le nouveau Crashlanded révision 3 reçoit 800 argent, un fusil à verrou et un couteau en plastacier. Les révisions historiques et Trois survivants restent inchangés.
- Fusil et couteau utilisent les noyaux communs de tir/mêlée, blessures, dégâts, équipement et rendu. Conserver l'identité du profil balistique dans les tirs en cours et les PV propres à l'arme ; le classement hérité des gestes de mêlée reste une adaptation annoncée. Contrôles, UI, parcours commun et mesures successives sont consignés dans `docs/history/validation-trade-v88.md` : la vraie colonie poursuit J136,073→J159,493 avec quatre habitants, vend cinq revolvers ; les visiteurs repartent, puis le rangement des trois médicaments achetés se termine. Le débit natif à cent colons reste inférieur à la cible 6×. Les optimisations ne changent ni règles, ni ordre des décisions, ni PRNG.

## Environnement et survie V87
- Lire `docs/development/site-climate.md`, `docs/development/wind-heater.md`, `docs/development/fires.md` et leurs recherches avant tout changement du lot. Climat annuel, vie végétale, huit météos de surface, vent partagé, éolienne, radiateur et incendies sont livrés dans le périmètre de `docs/history/validation-environment-v87.md`. La vraie colonie continue de J76,283 à J136,073 avec ses quatre habitants, par reprises documentées ; extinction et froid létal gardent leurs frontières contrôlées distinctes. Les mesures mixtes ne garantissent pas 6× à cent colons.
- Le profil tempéré est un témoin documenté : 16,2 °C, 900 mm, 22,21° N et 18,23° O ; température/pluie issues de la même tuile historique 1.6.4633, coordonnées rapportées par l'utilisateur avec réserve. Ce n'est ni une moyenne mondiale ni un défaut Core. Temps écoulé, calendrier civil et origines météo/vent restent distincts. Valider V86 avant migration ; climat et expositions s'adoptent prospectivement sans hiver, âge végétal, feu ni énergie rétroactifs. Extinction est ajoutée à priorité 1.
- Croissance, solaire et rendu du jour partagent le calendrier ; les contrôles vitaux des cultures/baies gardent leur phase persistée. Météo, précipitations, vent et frappes d'orage ont une autorité commune, des conditions et des tirages sauvegardés. Pas de renormalisation arbitraire vers deux météos ni d'occurrence rare forcée dans un parcours. Variation Perlin de température, épaisseur de neige, horticulture artificielle et cycle biologique des arbres restent absents.
- Éolienne orientable : corps 7×2, dégagement 112 cellules, obstruction et coupe par travaux réels. Radiateur : 175/17,5 W, consigne et vrai volume thermique. `half:true` représente exactement le demi-quantum de batterie ; aucune énergie créée par charge, minification, extinction ou explosion. Les restes et états nouveaux sont refusés avant V87.
- Incendie et foyer de cuisine sont distincts. Extinction physique, brûlures anatomiques, dégâts des piles/ouvrages et mèche de batterie préservent cargaisons, réservations, identités et pertes. Toute destruction invalide les captures dérivées concernées. Pluie et dégâts ne livrent pas implicitement courts-circuits, EMP, fumée, toutes les explosions ou tous les dommages Core.
- Préflight commun puis campagne longue depuis la vraie colonie V86 ; frontières rares contrôlées distinctes. La borne de parcours est un plafond de diagnostic, pas une échéance de froid, récolte ou orage. Reprendre les checkpoints réels ; geler toutes les sources servies pendant chaque native. CPU, rendu et pilotes lourds restent successifs, preuves historiques conservées et publication centrale après validation.

## Captivité et performance V86
- Lire `docs/development/prisoners.md`, `docs/research/prisoners-reference.md` et `docs/research/performance-v86.md`. Capturer un assaillant à terre conserve sa personne ; admission seulement au lit de prison, récupération pendant portage admise et sortie interdite tant qu'il est porté. Pièce fermée indépendante de la toiture, rôle propagé aux lits ; prison médicale distincte de propriété personnelle.
- Geôlier nourrit et converse, Médecin traite les plaies. Le régime filtre les fournitures du personnel ; un captif choisit librement les aliments de sa pièce. Les stocks d'une prison ne nourrissent pas automatiquement les colons libres ou une autre prison. Un repas engagé continue si sa restitution au sol échoue pendant une tentative d'évasion.
- Résistance et rapports dirigés persistés, cinq effets puis entretien final ; deux conversations par jour et intervalle strict. Atteindre zéro ne recrute pas pendant le même entretien ; une visite ultérieure conserve identité, compétences et blessures lors de l'adhésion. Une porte bloquée un instant par un colon debout autorisé en passage ou approche ne devient pas libre pour l'évasion (`WillCloseSoon`) ; maintien explicite, corps incapable et objet restent distincts. Indéfectibles, arrestation debout, libération diplomatique et évasion organisée restent absents.
- Valider V85 avant migration additive Geôlier 3, sans prison/personne/résistance inventées. `prison-player` continue le vrai camp V85, ses stocks et événements ; le rayon de coupe doit suivre l'épuisement des arbres. Les checkpoints natifs cliniques ne prouvent pas une progression naturelle. Mesures `ENERGY=1` comparables à V85, puis `PRISONERS=1` avec 1/3/10 captifs ajoutés : CPU, UI et longs pilotes successifs, sources gelées pendant chaque native.
- Optimisation géométrique pure : enveloppe de rejet préalable, profils consultés après emprise, aucune nouvelle capture entre décisions. Les deux comparatifs CPU byte-identiques ne garantissent pas le débit 6× en navigateur. Mode jour : livrer le lot validé et publié, puis attendre.

## Habitat et énergie V85
- Lire `docs/development/power.md` et les recherches réseau/batterie/solaire. Conduits construits, superposition distincte des édifices, interrupteur cardinal, charge entière en 1/120000 Wd ; aucune batterie gratuite ni énergie à la migration. Déconstruction du conduit : aucune restitution. Refuser deux transmetteurs superposés dans les deux sens ; retrait explicite avant remplacement.
- La commande marche/arrêt réserve un travail physique de Tâches élémentaires, sans XP. Intention, interrupteur réel, alimentation et ravitaillement restent distincts ; interrompre le geste réinitialise sa courte attente, conserve les cargaisons et invalide la lumière après achèvement. Le conduit ne masque ni mur ni délai de cadre selon l'ordre des tableaux.
- Batteries 400 et solaire 600 : recherches indépendantes. Solaire 4×4, Construction 6, lumière naturelle et cases sans toit ; aucune moyenne de vent inventée pour ajouter l'éolien. Incendies et réparations des appareils étaient absents de V85 ; leur ajout relève du lot V87, avec le vrai vent partagé. Les pannes aléatoires restent absentes. V84 strictement validée puis basic 3, pas de ressources ni connexions nouvelles.
- `energy-player` poursuit le vrai checkpoint Lisière V84 J24 : extraction, recherche, cuisine/froid, nuit et coupures. La partie historique personnelle sert de repère, pas d'échéancier imposé. Banc `ENERGY=1 VALIDATION_VERSION=v85`, CPU/natif/pilote long successifs ; toutes les sources servies gelées pendant UI native. Mode jour : livrer le lot validé puis rendre la main.
- Reprise validée jusqu'à J42,21, explicitement depuis checkpoint, pas une nouvelle passe monolithique. Suivre les fichiers datés pour diagnostiquer la progression : stdout Vitest peut rester bufferé alors que le pilote avance. Conserver les preuves historiques V74/V75 ; les producteurs courants suffixent leur schéma. À cent personnes/lièvres, CPU p95 56,78 ms et débit natif ≈3,76× pour 6× demandé ; aucun jalon global clos.

## Filière alimentaire V84
- Lire `docs/development/food-crops.md`, `food-workstations.md`, `malnutrition.md` et leurs recherches. Pommes de terre/maïs gardent les temps biologiques, sols, produits et âges propres ; aucune récolte forcée à J7. Cuisinières et table construites en 3×1, matières/carburant/courant/services physiques ; table bois 95 unités et 1400 Core, rendement 1 contre 0,7 au poste gratuit. Cuisinière bois : 160 bois/jour de préparation, rien au repos ; électrique 350 W. Hygiène/intoxication restent une chaîne distincte absente.
- V83 strictement validée avant migration neutre ; nouvelles ressources/postes/malnutrition refusés dans les schémas anciens. Filtres absents restent des refus. La malnutrition humaine/lièvre progresse à faim nulle et récupère après ingestion, avec incapacité/décès physiologiques ; aucune guérison instantanée ni médicament fictif. Faire avancer le dossier avant une première lésion/exposition pour ne pas sauter une pulsation ; réconcilier le courant avant les files après retrait du générateur.
- `crashlanded-colony` suit 24 jours et deux cycles sur les mêmes 80 cases de riz ; ses checkpoints d'instrumentation 2 distinguent disparition d'un plant, travail achevé, ingestion hors rations et riz réellement cuisiné. Rejouer les checkpoints réels en cas d'échec. Garder les chevets accessibles : le pilote alimentaire tourne les têtes vers l’allée, conserve son ancre par emprise et réinstalle les lits hérités sans doublon. Ne pas assouplir les règles de soin pour cacher un dortoir inaccessible. L'audit des 87 sauvegardes personnelles est anonymisé dans `docs/research/colony-progression-observed.md` : repères de J5 à J210, trois segments, tutoriel/Phoebe/Easy historique, pas une moyenne Cassandra ni un historique exhaustif.
- Charge `FOOD_CHAIN=1 VALIDATION_VERSION=v84` : mesures CPU, natives et pilote long successives. Rapports initiaux au cadrage recherche conservés distincts du cadrage alimentaire. Mode jour : terminer ce lot, valider/publier puis rendre la main. Les prochains grands ensembles habitat/énergie, croissance de colonie, saisons sont programmés uniquement dans ROADMAP.

## Site V83 et cadence de progression
- Lire `docs/development/world-generation.md`, `docs/research/map-calibration-reference.md` et `site-soils-reference.md`. Nouveau Crashlanded révision 2 : site tempéré explicite, trois reliefs, sans rivière ; fragments physiques et budget commun de minerais. Les absents ne sont pas remplacés par davantage de ressources utiles. V82 strictement validée avant migration neutre, aucune carte historique régénérée.
- `soil` historique garde 70 %, nouveaux sols ordinaire/riche/gravier : 100/140/70 %. Aucun changement arbitraire de lumière ou durée pour récolter à J7. Le pilote prouve la récolte par ses produits et les repas par leurs ingrédients ; vingt cases ne démontrent pas une autonomie alimentaire.
- Instruction utilisateur du 20 septembre : terminer ce lot de départ, puis privilégier les boucles élémentaires encore absentes ou trop partielles avec plusieurs capacités jouables par livraison. Recherches indépendantes en parallèle, intégration centrale et campagnes regroupées ; pas une suite de petits commits de menus. Core sans extensions ni mods dans le périmètre actuel. ROADMAP contient seule les priorités.

## Création et rythme V82
- Lire `docs/development/new-game-menus.md`, `scenario-start.md` et leurs recherches. Démarrage normal à l’accueil ; `?e2e` seul garde ce parcours. Seuls les liens explicites `scenario=camp/survivors/sentry` ouvrent directement un diagnostic historique. Le menu public appelle `crashlanded`, provenance distincte et adaptation partielle visible.
- Six ticks locaux/s, toujours 6 000 ticks/jour et dix Core/local. `calendarTick` ajoute 06 h seulement au nouveau profil ; échéances, vieillissement et sauvegardes restent en ticks écoulés. Conversion commune corps/cargaison/faune/frappes ; aucune durée `/10` en secondes réintroduite.
- `game-session` préserve sauvegarde manuelle et récupération, charge à froid sans monde factice, valide avant remplacement ; préparation graphique échouée conserve le monde accepté. V81 strictement validée avant migration neutre, sans dotation ni nouvelle horloge civile.
- Cassandra partielle : intro J5,4 et fenêtres indépendantes des fins de raid ; variété, budget/richesse/adaptation restent absents. Aucun accueil fixe/canicule garantie sur ce nouveau profil. Humeur +5 et facteur infectieux .75 au second tirage des plaies des colons ; progression de maladie inchangée. Le pilote partagé copie x/z, jamais le kind d’une ressource dans une désignation.

## Référence de partie et menus (20 septembre 2026, mode jour)
- Lire `docs/research/core-reference-baseline.md` et ses enquêtes rythme/cartes/observations avant de recalibrer le départ. L'utilisateur demande les preuves avant les changements, et non tous les systèmes démontrés en sept jours. RimWorld local 1.6.4871, Defs/classes et sauvegardes se consultent en lecture seule ; sources de versions plus anciennes et tutoriel restent identifiés. Aucun XML propriétaire, code décompilé ou sauvegarde personnelle brute à publier.
- Profil choisi explicitement par l'utilisateur : Atterrissage forcé, Cassandra Classique, Récit d'aventure, Core sans extensions. Ce choix ne constitue pas une difficulté présélectionnée dans RimWorld. Menus : Nouvelle partie et Charger actifs, Options seulement si fonctionnelles ; autres boutons/scénarios/difficultés visibles et grisés. Lire `docs/development/new-game-menus.md`, contrat du parcours, partiel en V82. Ne pas renommer Trois survivants pour prétendre livrer la dotation ou la difficulté complètes.
- Distinguer défaut, choix requis, tirage aléatoire, règle conditionnelle et observation de partie. Demander une vérification précise dans le jeu pour une inconnue que les sources ne permettent pas de résoudre. Conserver les anciennes cartes et leurs calendriers à la migration. ROADMAP programme seule les corrections ; ne pas accélérer croissance/événements pour satisfaire un test à J7.

## Infection V81
- Lire `docs/development/infections.md` et sa recherche. Risque réservé aux nouvelles plaies, double tirage daté, maladie séparée de la lésion, immunité commune aux parties. Soins renouvelables avec dose physique distincte ; repos/alimentation persistent après cicatrisation si nécessaires. Capture de pièce au soin de la plaie, terrain seul sans hôpital propre inventé. Noyau humain/lièvre commun, soins vétérinaires absents.
- V80 strictement validée avant migration neutre, aucune exposition rétroactive. `infection-player` part de combattants sains et suit une infection réellement acquise ; checkpoints natifs distincts d’une partie complète. Audit `INFECTIONS=1 VALIDATION_VERSION=v81` sur activités mixtes, mesures successives. Mode jour : terminer la livraison puis attendre la prochaine instruction.


## Nouvelle partie V80
- Lire `docs/development/scenario-start.md` et sa recherche. `createScenarioWorld` est l'usine applicative ; `createWorld` garde le camp historique des fixtures. Défaut Trois survivants, stocks physiques et connaissances initiales sans XP ; ne pas confondre ce départ avec Crashlanded complet. Génération naturelle distincte, arrivée sur composante reliée au bord, aucune ressource effacée pour les stocks.
- Provenance facultative et migration V79 strictement neutre : aucun monde ancien régénéré/réapprovisionné. Les fixtures UI historiques demandent explicitement `scenario=camp`, jamais un comportement caché lié à `e2e`. Le compagnon `survivor-player` développe ce départ depuis sa vraie dotation ; aucune urgence alimentaire inventée en retirant ses rations. Le profil ne certifie pas une difficulté Core.

## Filière animale V79 et départ cohérent
- Lire `docs/development/hunting.md`, `corpses.md`, `butchery.md` et la recherche chasse. Chasse civile au revolver, réserve exclusive, récupération avant transport, `forHunting` autorise le rangement même sans Transport. Le corps conserve identité/anatomie/âge, attend sa chute et une place physique ; aucune téléportation si sol encombré. Boucherie transactionnelle viande/cuir, Cuisine et XP de finition ; rendement .70 du poste, pas vitesse .70. V78 strictement validée avant migration neutre et priorité Chasse 0.
- Validation groupée, pilote commun adapté aux nouveaux clics ; audit mixte `HUNTING=1 WILDLIFE=1`, mesures CPU/natives successives. Ajouter les preuves à l'historique V79 sans réécrire celles des versions antérieures.
- Objectif utilisateur persistant : une nouvelle partie cohérente avec scénario, possessions/technologies, spawn et distributions de biome, végétation, minerais, animaux et difficulté conçus ensemble. `docs/research/scenario-start-reference.md` prépare ce chantier ; ROADMAP seule le programme. 250² est déjà une taille standard, ne pas agrandir arbitrairement. Le camp actuel sans technologie n'est pas le Crashlanded original.
- L'utilisateur autorise et demande désormais les sous-agents pour plusieurs sous-étapes indépendantes d'une boucle, avec fichiers attribués et intégration centrale. Mode jour demandé le 20 septembre 2026 après interruption de V81 : terminer le lot médical, valider et publier, puis attendre la prochaine instruction. Automatisation nocturne suspendue.

## Mêlée animale V78
- Lire `docs/development/animal-melee.md` et sa recherche. Coup partagé entre espèces, menace récente 400 Core / distance² ≤9 et riposte d'un coup avec échéance 200 Core, récupération indépendante 120 Core. Manhunter et hostilité civile généralisée distincts ; chasse civile ajoutée V79. Tronc du lièvre 16 PV pour l'étourdissement, pas la constante humaine 40.
- V77 strictement validée avant migration neutre ; menace/travail/frappe/stun distincts, aucune activité après incapacité. Approche locale bornée, arêtes ralenties/arrêtées et rig résident commun. Audit mixte `ANIMAL_MELEE=1 WILDLIFE=1`, avec un mineur sur six engagé et les autres ateliers maintenus. Estimations par système dans ROADMAP ; chasse → dépouille → viande → repas livrée V79 ; prochain lot dans ROADMAP.

## Cadence de livraison (19 septembre, après V76)
- Livrer une boucle jouable cohérente regroupant ses sous-étapes ; ne pas demander de relance entre ses briques internes. Mode jour : retour après la boucle validée et publiée, sans activer le mode nuit. Une dépendance majeure peut justifier une tranche visible plus petite ; expliquer ce choix.
- Suivre la procédure courante en tête de `docs/development/testing.md` : recherche ciblée par domaine, contrôles courts du pilote commun avant parcours longs, campagne regroupée par contrats touchés, reprise des checkpoints en cas d'échec. Ne pas modifier les sources servies pendant une UI native, même pour un commentaire. Mesures de performance et longs pilotes successifs.
- Réduire lectures, sorties d'outils et répétitions : index/état courant/contrat concerné, résultats compacts et diagnostic détaillé seulement en cas d'échec. Documenter une décision à son emplacement canonique et actualiser les résumés liés. Pas de recherche répétée sur une règle inchangée au sein du même lot ; nouvelle recherche à chaque mécanique et aux relectures rétroactives pertinentes. Comparer le temps de recherche/implémentation/validation des prochains lots avant d'annoncer un gain de cadence ou de consommation.

## Santé animale et tirs V77
- Lire `docs/development/animal-combat.md` et sa recherche. Modèles humains/lièvres partagés, 28 parties quadrupèdes, HP arrondis au plafond, échelle 0,4 ; pas de jauge globale ni membres humains substitués. Incapacité violente et chute par hémorragie sont distinctes. Dossier médical absent tant que sain ; profil animal interdit sur un colon. V76 strictement validée avant migration neutre.
- Cibles `animal:` distinctes, overlay mobile renouvelé entre impacts, taille 0,2 et tir manuel via Faune. Fuite/repas partagent le budget de navigation ; chute conserve l'arête capturée, fractions de ralentissement communes au bridge/GPU. Pas de nouveau graphe TSL par blessure. Mêlée interespèces livrée V78 ; chasse automatique, dépouilles physiques, boucherie et viande ajoutées V79.
- `animal-combat.spec.ts` utilise le pilote UI commun et attend la pause acquittée avant comparaison exacte. Audit mixte `ANIMAL_COMBAT=1 WILDLIFE=1 VALIDATION_VERSION=v77` dans les bancs recherche ; moitié des animaux blessés, pas cent tireurs simultanés. Mesures CPU/natives et longs pilotes successifs.

## Faune V76
- Lire `docs/development/wildlife.md` et sa recherche. Animaux distincts des colons, PRNG privé, ingestion au contact et broutage de croissance réelle. Une seule espèce adulte ; V77 ajoute santé, tirs et fuite. Riposte de mêlée ajoutée V78 ; chasse automatique et dépouilles transportables ajoutées V79. Aucune donnée humaine inventée. V75 strictement validée avant migration neutre ; introduction explicite dans les anciennes parties.
- Partager réservations de piles, obstacles/coins, protection des chantiers et maintien des portes ; ne pas ouvrir les portes pour un animal sauvage. Arêtes/historique/clock confirmée communs, rig TSL résident préchauffé. Mesures mixtes `WILDLIFE=1`, CPU et rendu successifs. Le pilote de colonie compte les aliments consommés par les animaux séparément. Le pilote UI exécute aussi le choix de culture ; utiliser `COLONY_JOURNEY_CHECKPOINT` pour reprendre son état réel avant le troisième jour. Geler les sources, y compris les commentaires, pendant une exécution native pour éviter le HMR.

## Conservation froide V75
- Lire `docs/development/cold-store.md` et `docs/research/cold-store-reference.md`. Climatiseur solide à deux faces, 90 acier/3 composants, finition Construction 5, recherche Climatisation 500 points distincte des vêtements. Chauffage rejeté, 20/200 W et alimentation réelle partagés ; aucune conservation fictive ni remise à zéro des âges.
- `cooler-adjust` applique les incréments au worker pour conserver les clics rapides. Déconstruction moitié ; destruction quart prévalidée avant dernier dommage/RNG, pertes nettes. Aucun support de toit ni paquet.
- Hypothermie sparse, exposition entière commune, intervalle neutre et manipulation spécifique ; refuge dans les deux sens sans annuler ordres/crises/combat. V74 strictement validée avant migration neutre. Gelures localisées et choix complet des lits restent absents ; les saisons, absentes de V75, relèvent maintenant de V87. Charge mixte `COLD_STORE=1`, mesures CPU/natives et longs pilotes successifs.

## Canicule V74
- Lire `docs/development/heatwave.md` et `docs/research/heatwave-reference.md`. Offset partagé, calendrier privé, isolation distincte de l’armure ; exposition entière tous les six ticks locaux, seuils stricts et intervalle neutre. V73 strictement validée avant migration sans chaleur/calendrier inventés. Refuges physiques et cargaisons conservées ; ordres/crises/combat prioritaires. V75 ajoute hypothermie et conservation froide ; V87 ajoute le cycle annuel du profil. Gelures, dangers complets des lits et narrateur restent partiels/absents. Audits mixtes via `HEATWAVE=1` dans les bancs recherche ; mesures et longs pilotes successifs.

## Recherche V73
- Lire `docs/development/research.md` et `docs/research/research-reference.md`. Projet collectif en micro-points, bureau et service exclusifs, Intellect sur travail réel ; suspendre conserve l’acquis. V72 validée strictement avant priorité Recherche 3 sans compétence/projet inventés.
- Tailleur/chemise ne sont disponibles qu’après le projet ; tenue tribale initiale. Confection commune, chemise 45 tissus/270 ticks neutres, inachevés par recette. Bureau 3×2 et tailleur 3×1 dans les lots résidents. Coefficients et scénario initial explicitement documentés ; ne pas généraliser un projet à un arbre complet. La faim ne doit pas interrompre en boucle le combustible d’une facture culinaire.

## Confection V72
- Lire `docs/development/tailoring.md` et `docs/research/tailoring-reference.md`. Emplacement gratuit instantané, 60 tissus rassemblés, ouvrage physique avec auteur/progression/piles incorporées. Transport conserve son identité ; interruption ne remet pas le travail à zéro. Facture liée attend son auteur et contourne les nouveaux filtres/rayon ; reprise non liée les respecte. Annulation 75 % par pile, sol/identités/bilan/PRNG prévalidés.
- XP Artisanat sur travail réel, qualité transactionnelle à la fin ; aucune XP/qualité ajoutée aux blocs. Profil absent neutre 0, pas de biographie inventée à la migration. V71 strictement validée avant V72 ; V73 ajoute recherche et chemise ; autres recettes restent absentes. Tenue portée/portrait/cargaison partagent la projection GPU ; aucune compilation ajoutée par vêtement.

## Culture textile V71
- Lire `docs/development/textiles.md` et `docs/research/textile-reference.md`. Coton produit `cloth`/`textile`, jamais nourriture ; changement d’espèce conserve les plants et annule les travaux liés avec dépôt conservatif. Commande sans espèce la conserve. Filtre absent = refus ; V70 validée strictement avant migration neutre V71.
- `CropLayer` garde deux lots résidents préchauffés et des attributs statiques explicitement actualisés. Pas de reconstruction de forêt ni d’envoi de matrices au repos. V72 ajoute confection, ouvrages et qualité Artisanat ; recherche selon ROADMAP, sans verrou fictif pour la tenue tribale.


## Social V70
- Lire `docs/development/social.md` et sa recherche. Échanges passifs sans annuler le travail, opinions dirigées et compétence Social sparse ; bavardage cumulatif sans rajeunissement, discussions décroissantes après quatorze jours, expiration à vingt. Impact de l’autre personne capturé avant XP. PRNG social indépendant persisté, vue locale sans lean, souvenirs nettoyés même sur corps retenus. V69 strictement validée avant migration neutre. Insultes/bagarres, romance/deuil et profils sociaux complets absents ; étape 4 prioritaire selon ROADMAP.

## Personnalité V69
- Lire `docs/development/traits.md` et sa recherche. Six traits seulement, trois familles exclusives ; effet d’humeur distinct des seuils et de l’apprentissage. Mineur modifié puis majeur ×4/7 et extrême /7 ; pas trois offsets indépendants. Gains positifs des cinq compétences actifs, oubli inchangé. Profils neufs seulement au bootstrap du camp, traits annoncés dans les nouvelles offres puis copiés à l’entrée. Valider V68 avant migration neutre, personnes/offres existantes inchangées. Premiers échanges/opinions ajoutés V70 ; suite canonique dans ROADMAP.

## Raids V68
- Lire `docs/development/raids.md` et la recherche liée. Calendrier privé, groupe et registre des sorties persistants ; migration V67 strictement neutre. Ne jamais parcourir le graphe hypothétique des brèches : seule la navigation réelle engage une arête. Victimes retenues, pertes cumulées, retrait au bord après mouvement/récupération ; objets portés exportés une seule fois. Échéance/composition provisoires, narrateur et corps transportables absents.

## Ouvrages et réparations V67
- Lire `docs/development/barriers.md` et sa recherche. Murs/portes seulement : PV par matériau, dégâts sparse, frappe et projectile, pertes sans remboursement distinctes de la déconstruction. Le retrait remplace `structures` et invalide les captures de tir, projectile, contact et son même au sein du tick Core ; la chute du toit peut arrêter le frappeur et avancer le PRNG. Ne recréer ni son attaque ni l'ancien PRNG ensuite.
- Foyer manuel trié, recherche binaire, réparation Construction gratuite au contact (80 puis 20 Core, vitesse ×1,7), réservations/files communes. Déconstruction prioritaire ; sortie du foyer libère le travail, pas les PV acquis. V66 strictement validée avant migration neutre. V68 ajoute incident hostile et brèches autonomes ; autres dégâts d’objets, extension automatique du foyer et gestion complète des victimes restent absents.

## Accueil V66
- Lire `docs/development/arrivals.md` et la recherche liée. Calendrier sparse à PRNG privé, offre sans acteur sur carte, délai strict d’un jour ; acceptation atomique à une bordure accessible, avec identité et chemise extérieure. Refus explicite : pensée six jours, cinq occurrences décroissantes ; expiration sans cette pensée. Migration V65 neutre, activation explicite sur ancienne partie. Le profil de cadence/personne est provisoire, pas un narrateur complet. Le pilote adapte lits, repas et affectations à la population. Journal borné à 80 événements. `PawnLayer` conserve meshes/matériaux en cas de variation de population ; `pawn-buffers.ts` agrandit les géométries avec poses partagées et comptes actifs exacts. Ne pas reconstruire les graphes TSL à chaque arrivant.


## Crise mentale V65
- Lire `docs/development/mental-break.md` et sa recherche. État sparse persisté, exposition probabiliste et cooldown éveillé ; sommeil/incapacité distincts du décès. Interruption conserve arête/cargaison, réserve libérée et aucune commande individuelle pendant crise. Repas ≤5 %, repos ≤15 % hors Travail ; catharsis datée, groupe décroissant de cinq. V64 strictement validée avant migration neutre ; borne de vitesse V65 abaissée pour blessure + errance. Le catalogue ne contient qu’une crise ; ne pas annoncer toute la psychologie.

## Humeur V64
- Lire `docs/development/mood.md` et la recherche liée. Cible dérivée et humeur persistée distinctes ; sommeil/inconscience gèlent la jauge, pas tout état à terre. Causes partagées simulation/inspection ; souvenirs expirés nettoyés même après décès. V63 strictement validée avant migration neutre. Attentes fixes annoncées ; V65 ajoute l’errance triste ; six traits actifs V69 ; autres crises et relations restent absents.

## Habillement physique V63
- Lire `docs/development/armor.md` et `docs/research/apparel-reference.md`. V63 branche les vêtements physiques, propriétaire `apparel`, compatibilité anatomique et transaction PRNG/usure/blessures. Préserver les temps d’habillage, le dépôt avant remplacement, l’identité sol/porté et les attributs GPU partagés carte/portrait. V62 strictement validée avant migration sans objet inventé. Usure quotidienne, politiques et fabrication textile restent absentes.

## Intentions persistantes

- Référence : RimWorld de base d'abord, extensions ensuite. Garder ses boucles et interactions par défaut ; documenter chaque simplification et divergence.
- Le corpus utilisateur docs/reference/originals (Documentation_developpement.html, Documentation_developpement.pdf, Referentiel_developpement.xlsx) est notre référence fonctionnelle principale, en complément des recherches antérieures. Avant un chantier, lire ses chapitres et entrées de domaine via docs/research/reference-adoption.md. Orienter le plan vers ses contrats, sans appliquer automatiquement ses architectures, nombres, priorités ou tests. Ses statuts R/P/V ne valent pas validation locale ; une divergence motivée reste possible. Ne pas confondre le comportement actuel du prototype avec la cible.
- Les nouvelles docs définissent le comportement de gameplay par défaut. Toute liberté fonctionnelle doit être connue, motivée et documentée ; la 3D demande une interprétation explicite des volumes et interactions. Les algorithmes internes restent libres : navigation, navmesh, flow fields, compute ou WASM n'ont pas à reproduire les techniques de RimWorld, mais doivent satisfaire nos contrats et budgets mesurés.
- Les interactions élémentaires ne doivent pas être remplacées par des raccourcis de prototype : manger exige accès, prélèvement et ingestion ; dormir utilise un couchage accessible et réservé, avec un repli au sol justifié. Ne pas réintroduire une consommation à distance ou un bonus de lit voisin. Un contenu absent reste explicitement absent, et une calibration provisoire ne constitue pas une parité numérique.
- Conserver la structure et l'organisation de l'interface de RimWorld : colons en haut, ressources à gauche, alertes à droite, inspection en bas à gauche, onglets de gestion en bas, temps en bas à droite. Le style peut évoluer. Ne pas déplacer les priorités hors du tableau Travail ni les constructions hors d'Architecte.
- Échelles et monde : conventions centralisées dans src/world/scale.ts, empreinte de collision cohérente avec le modèle. Génération reproductible avec structures spatiales et accessibilité contrôlées. Voir docs/research/spatial-design.md et docs/development/world-generation.md.
- Dimensions : défaut jouable 250×250 centralisé dans src/sim/map-config.ts ; 32/64/128 sont des tailles compactes ou de fixtures, pas la référence moyenne de RimWorld. Ne pas confondre le défaut 32 de createWorld pour les tests avec celui de l'application. Mesurer génération, simulation, communication et rendu séparément avant d'étendre les bornes ; préserver les dimensions des sauvegardes existantes.
- Étudier et mesurer les techniques de navigation entièrement GPU. Le laboratoire WebGPU est une expérience isolée ; ne pas annoncer qu'il pilote déjà les colons. Préserver les contrats de déterminisme, réservations, révisions et résultats périmés avant intégration.
- Jeu navigateur Three.js/WebGPU, esthétique 3D low poly. Versions stables récentes, vérifiées avant mise à jour, épinglées dans package.json et package-lock.json.
- Personnages animés sur GPU. Éviter AnimationMixer et skeleton.update par personnage et par image. Les futurs assets squelettiques remplacent la présentation, pas la simulation.
- Décor, bâtiments et objets générés en code. Blender MCP seulement lorsque demandé ou serveur annoncé pour une tâche d'asset. Ne pas modifier E:/Code/Antsystem, référence en lecture seule.
- Prendre les décisions ordinaires de mise en œuvre en co-lead, documenter les compromis, mesurer avant d'ajouter de la complexité.
- À chaque livraison de développement, donner dans la réponse un état du gameplay : nouveautés, fonctionnalités déjà jouables, simplifications et grands systèmes non implémentés. Ne pas limiter le bilan aux détails techniques ou aux tests. Cette demande utilisateur est persistante.

## Frontières

- src/sim : simulation déterministe, pas de DOM, de Three, d'horloge réelle ni de Math.random. Sérialiser tout état qui affecte la continuation.
- src/bridge : messages worker, horloge à pas fixe, gestion des erreurs. Les commandes sont ordonnées et acquittées ; le rendu peut sauter des snapshots, pas des commandes.
- src/render : présentation, caméra, interpolation GPU, géométrie procédurale. Aucune modification du World fourni.
- src/navigation-gpu : expérience de recherche et extraction GPU, oracle de validation indépendant ; src/navigation-lab.ts est son interface de diagnostic, pas un système de gameplay.
- src/main.ts et style.css : interface. Afficher les chaînes issues d'une sauvegarde avec textContent.
- Les changements de données persistantes nécessitent une version de schéma et une décision de migration explicite. Une sauvegarde invalide ne remplace jamais l'état courant.

## Qualité et continuité

- Lire docs/README.md pour l’index, docs/ROADMAP.md et les documents du domaine avant modification. Les sources originales sont dans docs/reference/originals ; history contient les preuves historiques, decisions les ADR. Mettre à jour les contrats courants sans empiler des mises à jour contradictoires.
- ROADMAP est l'unique calendrier canonique G0–G5 ; la matrice en reprend les jalons. Les étapes 1–8 et priorités P0/P1 du corpus sont des repères de dépendance, pas un second planning. Les extensions viennent après G5, sauf décision utilisateur ultérieure.
- Pour une règle issue du corpus, conserver chapitre, identifiant SYS/TEST/CONST/UI/STAT/GAP pertinent, provenance et décision (adopter, adapter, différer, vérifier). Les entrées de tests servent à enrichir nos scénarios existants, pas à créer automatiquement une suite par ligne. Les originaux restent préservés ; notre analyse et nos écarts sont dans les documents du projet.
- Peu de scénarios profonds avec résultats métier, invariants et diagnostics reproductibles. Ne jamais annoncer une couverture exhaustive de tous les bugs.
- Choisir les contrôles selon docs/development/testing.md : une couleur n'exige pas toute la suite ; planner, sauvegarde et worker exigent les contrôles de leur contrat.
- Mettre à jour guide joueur pour les règles, architecture pour les décisions, ROADMAP pour l'état, validation pour les preuves. Distinguer livré, testé, proposé et inconnu.
- Ne pas annoncer des performances depuis une capacité de buffer, un commentaire Antsystem ou Chromium logiciel. Conserver matériel, conditions et données de mesure.
- Pas de gros moteur physique, ECS générique, dépendance Rust ou compute de foule sans besoin démontré. Préférer une frontière claire à une abstraction speculative.

## Règles permanentes de développement (2026-09-13)
- À chaque mécanique livrée, refaire une recherche Internet précise : confronter le corpus aux sources récentes, vérifier les cas limites et consigner divergences, version et degré de certitude. Corriger notre documentation et le code si nécessaire ; ne jamais promettre une conformité certaine à 100 %.
- Maintenir un compteur FPS discret toujours visible. Il mesure le rendu réel, indépendamment du temps de simulation.
- Faire de petits audits de performance pendant le développement, avec scénario reproductible, matériel et percentiles. Optimiser les coûts observés sans changer silencieusement les règles de jeu.
- Lots de boîtes V29 : `BoxMesh` garde des attributs instanciés TSL stables ; ne pas réintroduire des uniforms de matrices nommés par ID à chaque croissance. Lire `docs/development/shadow-preparation.md` avant de modifier capacités, préparation ou propriété de leurs buffers. `geometry.instanceCount` pilote le compte graphique, pas `Mesh.count`.
- Extraire une responsabilité cohérente avant d'allonger un module déjà volumineux. La simulation, les poses GPU, les objets de décor et les outils UI gardent des frontières explicites.
- Les commits expliquent le changement, sa validation et un court état du plan global G0–G5. Commit et push autorisés sur le dépôt du projet.

- Entretenir le pilote de colonie `tests/scenarios/colony-player.ts` et ses parcours de plusieurs jours lors des ajouts de gameplay. Il doit développer un camp par les commandes du joueur, contrôler résultats et bilans, et distinguer cohérence interne et fidélité à RimWorld. Le long parcours UI se lance aux changements de boucles/commandes/persistance, pas pour une retouche cosmétique.
- Tenir `docs/gameplay/implementation-status.md` à jour pour les systèmes livrés, partiels et absents ; le résumé conversationnel ne remplace pas cet inventaire. ROADMAP reste le seul calendrier.

## Catalogue et apparence (2026-09-13)
- Mettre à jour docs/gameplay/content-catalogue.md à chaque ajout de contenu ; les 95 familles CAT du corpus ne sont pas un catalogue individuel exhaustif. Une définition présente ne signifie pas que toutes ses recettes, variantes ou règles sont livrées.
- Inventaire personnel, équipement, vêtements et cargaison temporaire sont distincts. Le contrat cible de rendu commun carte/portraits figure dans docs/development/character-presentation.md ; ne pas annoncer ces systèmes déjà implémentés.
- Schéma courant 88 (types alimentaires introduits en V5). Conserver item et quantité lors des transferts. Les nouveaux producteurs alimentaires précisent leur ItemId ; le défaut legacy-portion des helpers sert à la compatibilité et aux anciennes fixtures, jamais aux nouveaux aliments. foodRules distingue explicitement parties historiques et nouveau profil adulte.


## Sol et déplacements (V6)
- V14 autorise le partage des cellules entre colons civils. Lits, repas et postes conservent des réservations d'utilisation distinctes du transit ; un effondrement au sol ne s'approprie pas le service. Valider V13 avec ses anciennes exclusions avant migration, sans déplacer les acteurs. Lire docs/research/civil-traffic-reference.md ; le combat exigera son profil explicite commun à recherche, suivi et validation.
- Une pile d’objets par cellule de sol ; une pile contient plusieurs unités compatibles. Les étagères à plusieurs piles ne sont pas implémentées. Réserver aussi le type de la destination et conserver la matière lorsqu’un dépôt est impossible.
- Navigation CPU pondérée sur huit voisins ; déplacement physique à durée euclidienne, coins solides exclus. L’historique d’arêtes et le tampon de présentation ne sont pas des données autoritaires de simulation. Ne pas réintroduire le lissage relancé par snapshot.
- Faire face au déplacement et à la cible du travail. Corps et cargaison partagent les poses GPU ; l’anneau de sélection suit le même trajet.
- Lire docs/development/spatial-motion-storage.md avant de modifier ces contrats, la migration V5→V6 ou la représentation distante. Le laboratoire de navigation GPU reste indépendant.
- Accès aux candidats et distance sont distincts : le parcours cardinal progressif prouve seulement l'existence sous le contrat de coins ; les routes restent pondérées sur huit voisins. Les deux parcours capturent la même occupation et ne survivent qu'à une décision synchrone. Ne pas partager ces buffers entre colons/ticks ni réutiliser un coût non finalisé.

## Conservation alimentaire (V11)
- Lire docs/development/food-preservation.md avant de modifier les transferts, les âges ou la température. Séparer copie l’âge, fusionner pondère les quantités, produire démarre frais. La pourriture précède les actions ; elle réconcilie les réservations et les pertes cumulées.
- V38 intègre les taux locaux variables : lire aussi docs/development/temperature.md ; un taux change après ancrage de l’ancien intervalle. Les effets du froid, de l’exposition et de l’intoxication ne sont pas livrés par ce contrat.

## Horaires (V12)
- Lire docs/development/schedules.md avant de modifier repos et priorités horaires. Conserver plages, profil de fatigue et état d’épuisement ; une intention ne donne jamais un bonus de besoin. V15 ajoute les plages Loisirs et deux activités physiques ; lire docs/development/recreation.md. Les attentes liées à la richesse restent absentes.

## Régimes alimentaires (V13)
- Lire docs/development/food-policies.md avant de modifier les autorisations ou le choix alimentaire. Régimes partagés filtrés avant préférence/accès ; aucune exception implicite de famine. Les repas engagés continuent, transport et ingrédients restent indépendants. Ne pas confondre cargaison de tâche et inventaire personnel.

## Loisirs (V15)
- Lire docs/development/recreation.md avant de modifier satisfaction, lassitude, places de service et horaires. Le drapeau de lassitude persiste entre 30 et 50 ; aucun gain pendant le trajet. Les piquets partagent une famille et admettent trois joueurs sur des places distinctes.
- V14 migre à 55 de satisfaction sans inventer de passé ni interrompre les tâches. Le profil de camp à attentes extrêmement basses est provisoire ; ne pas le présenter comme un calcul de richesse. Les fixtures de foule doivent cloner profondément les états des personnes.

## Construction (V16)
- Lire docs/development/construction.md : plan traversable, cadre après première livraison, finition après dégagement physique. Construction peut livrer même sans Transport ; Transport seul ne finit pas un cadre ordinaire ; la réinstallation d’un meuble entier est aussi accessible à Transport en V26. Annuler libère les cargaisons de dégagement liées au parent.
- Protéger personnes, arêtes/coins et services avant livraison/achèvement. Le délai de cadre capturé appartient à l'arête sauvegardée. Valider V15 avec ses anciennes exclusions avant migration ; aucun cache d'obstacles de chantier ne survit à une décision synchrone.
- V21 : profils de coexistence dans src/sim/occupancy.ts ; table/tabouret/piquet gardent les piles compatibles, mur/lit/feu les dégagent. Les plans retirent les cellules de zone incompatibles après préplanification des cargaisons ; un feu peut recouvrir une zone sans accepter le rangement. V22 livre transit/coûts/arrêt des meubles présents ; autres profils restent ouverts. Lire docs/research/occupancy-reference.md.

## Ordres et sélection (V17)
- Lire docs/development/player-orders.md avant de modifier priorité forcée, file ou sélection. La file réserve les travaux dès acceptation ; métier 0 interdit de nouveaux ordres mais conserve les ordres forcés déjà acceptés. Annulation explicite, effondrement et disparition de cible libèrent les engagements.
- Un ordre vise un travail exécutable, pas une chaîne de construction implicite. V18 ajoute transport et approvisionnement forcés, avec quantités réservées dès acceptation ; V19 ajoute dégagement des chantiers et combustible forcés ; V20 ajoute cuisine et dégagement des piles sur semis ; un ordre de cuisine sur feu vide ravitaille sans promettre la recette suivante. Le menu interroge le worker hors des frames ; la commande revalide tout.
- Sélection multiple en présentation seulement ; anneaux instanciés partageant les trajectoires GPU. V16 validée avant migration vers des files vides ; V17 validée avant autorisation des entrées quantitatives V18, sans modifier les ordres numériques existants. V18 validée avant les destinations quantitatives V19 ; combustible forcé ignore l’automatisme mais conserve réservation exclusive du poste et phases physiques.
- V19 validée strictement avant V20 : les recettes en file réservent ingrédients, staging et poste. Un dégagement forcé de semis conserve zone/cellule, jamais un ID agricole renouvelable ; modification de zone/politique libère la cargaison. Lire docs/research/cooking-orders-reference.md.

## Transit mobilier V22
- Lire docs/development/furniture-travel.md avant de changer coûts, destinations ou poses. La non-répétition vaut entre objets qualifiants différents. Table/lit/feu traversables, arrêt ordinaire exclu ; le lit garde son service réservé. Ne pas confondre transit et destination.
- Migration V21 stricte, arêtes engagées conservées ; `transitExit` persisté pour les sorties physiques. Corps/cargaison/sélection partagent la formule TSL et les attributs existants ; hauteur graphique sans effet autoritaire.

## Priorité maintenue V23
- Lire docs/development/player-orders.md : priorité sur une cellule/famille, sans rayon autour de la cible. Dure au plus une demi-journée depuis le dernier ordre persistant accepté ; la file passe avant les suites. Ne pas confondre affectation désactivée et incapacité. Expirer l’intention ne supprime pas le travail déjà commencé.
- État facultatif Pawn.priorityWork ; V22 validée strictement avant migration sans intention inventée. Les décisions réutilisent les fournisseurs et budgets communs.

## Déconstruction V24
- Lire docs/development/deconstruction.md avant de toucher aux retraits, restitutions ou réservations de bâtiments. Déconstruction est un Job ciblant un Structure.id ; désignation seule ne bloque pas les usages, réservation oui. Progression réinitialisée après interruption, conservée après sauvegarde.
- Une restitution n’avance le PRNG et ne supprime le bâtiment qu’après prévalidation des dépôts. Le bilan world.deconstructed conserve pertes et historique combustible retiré. V23 est strictement validée avant migration. Réinstallation des quatre meubles admissibles livrée en V25 ; minage V28 distinct ; autres matériaux et compétences restent absents.

## Meubles entiers V25
- Lire docs/development/furniture-transfer.md avant de modifier installation, paquet, portage ou annulation. Le bâtiment garde son identité et le propriétaire de son lit entre structures et packed ; une seule représentation autoritaire et un seul propriétaire.
- Le plan de réinstallation réutilise les règles de chantier, avec exclusion du meuble source. Un paquet occupe une cellule exclusive. Interruption et annulation prévalident le dépôt ; un refus conserve le portage. V24 est strictement validée avant ajout de packed vide.
- V26 : lire docs/development/furniture-logistics.md. Transport seul, rangement filtré et dégagement des paquets sont livrés. HaulTask.whole réserve la case entière, active ou en file ; pas de conversion en matériau. installationWork conserve le fournisseur de réinstallation. Valider V25 strictement avant migration, filtre absent = meubles refusés. Les capacités peuvent être réutilisées pendant une décision synchrone seulement. Le dégagement reste local avant le rangement ordinaire. La valeur WorkTotal 150 du plan de référence n'est pas une durée de pose : voir la recherche fraîche et la chaîne HaulToContainer.

## Géologie V27
- Lire docs/development/geology.md et docs/research/geology-reference.md. Tile.stone et Resource.stone identifient les cinq roches Core, uniquement sur leurs porteurs rocheux ; absence = contenu historique non typé. Valider V26 strictement avant migration sans régénérer le site. Les couleurs et identités ne livrent pas le minage, le sol découvert, les chunks, les recettes ou les toits. Les futurs transferts doivent conserver le type.

## Minage V28
- Lire docs/development/mining.md et docs/research/mining-reference.md. Dégâts sur Tile.miningDamage, cadence de coup sur Job.progress ; annuler ne répare pas la roche. Dernier coup, RNG et produit engagés seulement après prévalidation.
- `rough-stone` conserve le type, reste non fertile ; fragments `chunk` pile 1, rangement après désignation, pas de conversion en bois/aliment/bloc. Le maximum terrain/objet conserve le coût du sol entre répétiteurs. V27 strictement validée avant migration. Les roches historiques restent non typées (500 PV provisoires). Toits naturels, autres minerais que l’acier et pierres décoratives transportables restent absents ; taille V32 dans son contrat distinct.

## Acier V29
- Lire docs/development/steel.md et docs/research/steel-reference.md. Tile.ore est distinct de la roche encaissante ; 1 500 PV, dégâts naturels de 80, produit neutre 40 acier, piles 75. V28 est validée avant migration sans ajout de gisement ni de filtre. Acier automatiquement transportable, filtre absent = refus ; usages constructifs décrits dans le contrat V30. Avant compétences/rendement variable ou dégâts externes, faire évoluer le suivi des contributions minières. Le coût continu de pile n’est pas supprimé par la non-répétition du mobilier.

## Matériaux constructifs V30
- Lire docs/development/construction-materials.md et docs/research/construction-materials-reference.md. Job/Structure.material facultatif : absent = recette historique ; nouveaux ordres bois/acier et cinq pierres V33 pour les familles admissibles, feu fixe bois. Les nouveaux lits coûtent 45. JOB_WOOD_COST/DURATION sont historiques, pas les recettes des ouvrages typés.
- Exigences, piles et réservations par ItemId ; escrow reste une vue bois/nourriture. Conserver le matériau dans paquets, réinstallation et restitution ; lostSteel est un bilan, pas un stock. V29 validée avant migration sans réécrire les ouvrages. Le lot V30 n'introduisait pas encore recettes mixtes ni propriétés qualité/HP/feu ; leurs ajouts ultérieurs suivent leurs contrats propres, notamment incendies/dégâts V87. Agréger les ingrédients identiques avant ajout d’un atelier.

## Atelier mixte V31
- Lire docs/development/stonecutter.md et docs/research/stonecutter-reference.md. Table centrée 3×1, 75 bois + 30 acier ou 105 acier agrégés ; pas de recette historique non typée pour cette nouvelle définition. Surface Item, zones interdites, passage 5 ticks sans arrêt, transfert entier conservé.
- V30 strictement validée avant migration ; la forme des progressions longues V31 précède leur validation par jobDuration. V32 ajoute la taille : lire le contrat de production avant modification. Le pilote incorpore 30 de ses 80 acier dans l’atelier.

## Production commune V32
- Lire docs/development/stonecutting.md et docs/research/stonecutting-reference.md. Artisanat distinct de Cuisine, cinq fragments typés → vingt blocs correspondants ; aucun type inventé pour legacy-chunk. Les blocs passent au sol avec délai 1,4 et restent des piles compatibles de 75.
- `pawn.cooking` / `orders.active='cook'` sont les enveloppes historiques communes ; `recipe='stone-blocks'` les discrimine. Factures conservées sur le bâtiment emballé, IDs uniques. `storageQuantity` réserve le dépôt partiel réel ; conserver le reliquat porté.
- Valider V31 strictement avant priorité Craft 2 et factures vides d’atelier. Compte général jusqu'à X = tous les blocs stockés/portés, X fois = opérations. Travail extérieur neutre 200 ticks ; lumière fonctionnelle/capacités restent absentes. Recherche, pièces et construction en pierre ne sont pas implicitement livrées.
- Le choix de réserve parcourt les candidats par priorité/distance avec l'accès progressif partagé, pendant une décision synchrone seulement. Ne pas construire toutes leurs routes/goals ni réutiliser un coût non finalisé. Le pilote maintient vingt blocs produits sans injection de matériaux.

## Constructions en pierre V33
- Lire docs/development/construction-materials.md et docs/research/stone-buildings-reference.md. Cinq blocs pour mur/lit/table/tabouret/piquet ; table de taille limitée bois/acier, feu bois fixe. `building-materials.ts` sépare WorkToBuild (base × facteur + 140) de WorkToMake ; repos des lits pierre ×0,9, sans inventer qualité ni résistance.
- Valider V32 strictement avant migration, sans réécrire un ouvrage, un stock ou une route. `lostBlocks?` suit les pertes par ItemId ; capacité, ID, bilan et PRNG prévalidés avant tout retrait. Une chaîne de caractères `legacy` n'est jamais un matériau accepté : seule l'absence de champ conserve la recette ancienne.

## Portes manuelles V34
- Lire docs/development/doors.md et docs/research/doors-reference.md. Attendre au seuil avant une arête ; permission et animation sont distinctes. Maintenir ouverte ne commande pas une ouverture distante. Corps/arêtes et objets empêchent la fermeture ; une interdiction tardive conserve le passage engagé et sa sortie.
- V33 strictement validée avant migration. Structure.door conserve temporisations et progression ; les autres objets ne portent pas cet état. Cadres solides pour les coins diagonaux même ouverts ; coût estimé séparé de l'attente physique. Jambages partagés et vantaux TSL sur l'horloge des colons. V36 ajoute les rôles de pièces et V38 les échanges thermiques ; toits naturels, remplacement direct, factions et autodoors restent absents.

## Requêtes CPU sous V34
- Lire docs/development/spatial-queries.md. Comparer le classement avant capacité/accès sans modifier ordre des couples, curseur, budgets ou réservations. Une destination mieux classée mais inaccessible ne supprime pas le meilleur candidat valide.
- Capture d’arrêt locale à l’énumération des sorties, après libération du service ; ne pas conserver la fermeture après mutation ni partager les buffers de navigation entre décisions. Les fragments interdisent aussi les places de loisirs dans leur index de sélection.

## Pièces — inspection sous V34
- Lire docs/development/rooms.md et docs/research/rooms-reference.md. Connectivité cardinale de l’espace, murs/roches pleins, portes séparées même ouvertes ; eau, plans/cadres et meubles ne ferment pas une enceinte. Ce graphe n’est ni la navigation ni un booléen universel d’intérieur.
- Cache possédé par l’appelant, masque vérifié à chaque lecture utile, mutations en place et dimensions incluses ; aucun travail par frame. Le recalcul global mesuré garde les instantanés précédents immuables. IDs dérivés non persistants. V36 ajoute les rôles du mobilier présent et leurs facteurs de production ; V38 ajoute les échanges thermiques ; toits naturels et psychologie restent absents. Pas de bonus d’abri par simple enceinte.

## Toiture construite V35
- Lire docs/development/roofing.md et docs/research/roofing-reference.md. Couverture, zone de pose et zone de retrait sont distinctes du sol ; V34 validée avant migration sans toit inventé. Rayon de pose 6,9 avec connexion ; retrait volontaire par composantes sans rayon ; perte d’un support recontrôle la portée locale. Les meubles ordinaires ne sont pas porteurs.
- Travaux Construction sans matériau/cadre, vrais trajets et défrichage, file réconciliée ; les intentions non réservées tournent pour éviter la monopolisation par des cibles inaccessibles. Les contextes ne survivent ni au tick ni à une mutation de couverture/support. Checkpointer la croissance avant modification du toit.
- Deux lots graphiques préparés même vides, programmes stables ; masquer la toiture ne change pas World. V45 ajoute les blessures de toit aux personnes ; toits naturels, dommages aux objets et gravats restent absents ; V38 ajoute la thermique et V36 ajoute les facteurs intérieurs de production, avec éclairage local 3D dans la tranche de présentation suivante. Le pilote couvre 28 cases autour du repas sans couvrir le champ.

## Lumière et production V36

- Lire `docs/development/work-environment.md` et sa recherche avant de toucher lumière/rôles/taux. Lumière au colon, extérieur psychologique au poste, rôle séparé. Les portes bloquent la lumière des foyers même ouvertes ; ce contrat d'éclairage ne définit pas la propagation des incendies. Émetteurs actuels plafonnés à 50 %, jamais du soleil agricole.
- `CookingTask.progress` est en unités entières de travail neutre (10 000/tick), V35 strictement validée avant conversion du pourcentage (repas ×5 000, blocs ×8 000). Caches dérivés par propriétaire, contexte partagé seulement sans mutation du milieu. Pas de calcul par image ni par colon pour la diffusion.
- Les deux recettes utilisent les facteurs. V37 étend la lumière aux travaux/déplacements et V38 ajoute la thermique. Rôles sociaux et statistiques complètes restent explicitement absents. Les chambres actuelles concernent les lits civils simples et adultes sans relations.

## Présentation lumineuse sous V36
- Lire docs/development/environment-lighting.md avant les changements de matériaux, feux ou coupe. Texture partagée dérivée, sans mutation de World ; diffuseur logique commun, coefficients visuels artistiques. Recalcul aux changements de source/obstacle/toiture, jamais par frame ; identité texture/nœuds conservée au rechargement.
- Matériaux configurés explicitement à leur création, y compris corps/cargaison/LOD. Toits masqués et murs coupés ne modifient pas le champ. Pas de PointLight/ombre par feu ; vérifier les pipelines réels et les pixels lors des changements du shader.
- Buffers du LOD végétal et de RockLayer : StaticDrawUsage avec needsUpdate/plages lors des mutations. Three 0.186.0 renvoie DynamicDrawUsage même sans version nouvelle ; ne pas réintroduire ces envois par frame. Le banc panorama vérifie absence au repos et transferts après retrait/restauration.

## Lumière des travaux et marche V37
- Lire `docs/development/light-work.md` et sa recherche. `workRemainder` conserve les fractions de travail sans changer les ticks historiques ; réinitialiser aussi cette fraction lorsqu'une famille interrompt sa progression.
- `Job.pickTicks` capture le coup minier, `motion.speedFactor` capture la marche à l'origine après attente de porte. Ne pas retimer un coup/une arête engagés. Le délai terrain/objet reste additif ; conserver le reliquat temporel entre arêtes et coups.
- V36 validée strictement avant migration ; ancien coup entamé = 100 ticks Core, anciennes arêtes intactes. Les contextes de lumière sont partagés seulement sans mutation, les rôles de pièce calculés uniquement pour les consommateurs qui les demandent. Pas de diffusion par colon ou par frame.

## Température V38
- Lire docs/development/temperature.md et sa recherche. Seuil thermique : au moins 25 % découvert ou accès au bord = extérieur, distinct des autres critères. Murs/toits/portes échangent ; les feux de camp chauffent avec plafond 28 °C, distinct de la chaleur des incendies V87. Le site quotidien historique 14–28 °C est conservé sans adoption ; saisons et météo relèvent de V87.
- thermal.regions conserve les cellules d’air, pas les IDs de pièce. Reconciliation par recouvrement avant intégration. Le parcours thermique borné vérifie toutes les cellules utilisées dans sa preuve, y compris les parois ; ne pas le remplacer par un cache d’identité/tick.
- rot.rate absent = 1. Ancrer l’âge avant changement de taux/propriétaire, conserver fractions/mélanges, expiration avant action. V37 strictement validée avant V38 sans passé thermique inventé. L’intégrale agricole froide/chaude doit précéder un contenu sortant de 6–42 °C ; ni santé thermique ni chaîne du froid équipées ne sont implicites.

## Synchronisation de présentation sous V38
- Lire docs/development/presentation-timing.md. Les vitesses positives s’appliquent dès confirmation à la prochaine frame, sans changer le curseur ni réamorcer le tampon. Quatre ticks confirmés seulement au démarrage/reprise vidée ; publication en fin de lot actif de 20 ms en plus des phases. FixedClock consomme le temps à l’ancien taux avant changement et conserve les fractions. Seul RAF avance la présentation. Sous V52, intégrer les sous-intervalles aux dates des confirmations de vitesse ; ne pas appliquer un nouveau taux rétroactivement à toute la frame ni consommer un timestamp de réception futur par rapport au RAF.
- Publier les phases discrètes au tick simulé, puis appliquer la scène entière au temps des poses. Ne pas retirer une ressource à la réception avant le corps. Garder les snapshots immuables, les commandes/révisions toutes traitées, le HUD automatique à 5 Hz et les interactions immédiates.
- Onglet masqué, file excessive ou historique périmé : recalage global explicite. Le benchmark distingue réception/application ; ignorer les callbacks sans rendu durant préparation. Toute nouvelle transition visuelle enrichit l’observateur et un scénario métier.
- Les publications actives à 20 ms alimentent les trajectoires ; `PresentationQueue` regroupe les valeurs continues de scène à 5 Hz. `PresentationChanges` compare les phases par valeur pour le worker et les snapshots décodés ; une transition discrète reste appliquée dès son tick. Conserver le dernier état continu en attente même en pause.

## Critères de partie jouable
- Encodeur sous V52 : copies ordonnées pour le chemin stable, recherche par ID après permutation ; seules les mutations structurelles reconstruisent les ensembles. Comparer tous les champs à chaque publication, y compris au même tick ; ne jamais conserver une référence mutable de simulation comme valeur témoin. Vérifier l’égalité des paquets, les anciens snapshots et les suppressions avec `scripts/snapshot-encoder-bench.ts` et les scénarios bridge avant la garde native.
- Lire docs/development/playability-validation.md. État final et FPS ne prouvent pas la chronologie visible. Fixer les attentes joueur avant l’oracle ; ne pas valider un délai parce qu’il correspond au buffer interne.
- `npm run test:presentation` impose les vérifications sur zones naturelles et vitesses répétées ; requis aux changements d’horloge, bridge, interpolation ou phases de travail. Il appartient au contrôle complet, pas aux retouches cosmétiques. Distinguer exécution réelle, observation de présentation, mesure matérielle et cas non exercés.

## Plantes V39
- Lire docs/development/plant-temperature.md et sa recherche. Croissance thermique neutre 6–42 °C, nulle aux bornes 0/58 ; semis strictement entre 0/58, récolte et travail accepté indépendants. Resource.growthThermalFactor porte le facteur de l’intervalle sauvegardé ; absent = 1. Checkpointer avant changement, sans appliquer la température au passé.
- Groupes dérivés par World, tableau de ressources et disposition thermique ; les producteurs remplacent les tableaux. Valider V38 avant migration sans histoire froide inventée ; transmettre le facteur dans les deltas. Mortalité, feuilles et saisons étaient absentes de V39 ; leurs états prospectifs sont introduits en V87.

## Refroidissement passif V40
- Lire docs/development/passive-cooling.md et sa recherche. Une case fixe, 50 bois de construction devenant le réservoir initial ; combustion continue 10/jour, y compris dehors ou sous 17 °C. Refroidissement sans lumière, recettes ou bonus alimentaire. Pas de restitution de déconstruction ni minification.
- Capacités par définition dans fuel.ts, transferts physiques communs ; aucune confusion avec les besoins Cuisine. V39 strictement validée avant migration sans objet inventé. thermal-sources.ts partage l’intégration V38 ; bornes continues adaptées explicitement.
- Seize parties dans le lot de mobilier existant. Préparer aussi le curseur double face au chargement, puis restaurer son état depuis le pointeur courant ; le test navigateur exige zéro pipeline nouveau pendant construction et recharge.

## Composants industriels V41

- Lire `docs/development/components.md` et sa recherche. Gisement `machinery`, objet/famille `component` : 2 000 PV, coups naturels 80, deux unités, pile 50 ; ni acier ni combustible. Filtre absent = refus ; génération secondaire indépendante après l’acier, sans injection aux anciennes cartes.
- V40 strictement validée avant migration. Dépôt final et PRNG prévalidés, transferts communs conservatifs. V42 ajoute générateur et lampe ; composants avancés, fabrication et usure restent absents. Coût de passage 1,4 provisoire, pas une parité numérique certifiée. Rendu dans les lots existants et poses GPU communes.

## Électricité V42
- Lire docs/development/power.md et sa recherche. Générateur 2×2, 100 acier + 2 composants, réservoir neuf vide ; capacité 75 bois, 22/jour via reste entier sur cinq. Lampe 20 acier/30 W, minifiable, sans rotation ; générateur 1 000 W non minifiable. Réservoir, matériaux et pertes de déconstruction restent distincts.
- Raccordement carré de six cases, empreinte du transmetteur puis classement par ancre ; garder un parent valide. Réseaux cardinaux dérivés, consommateurs non transmetteurs. Démarrage/délestage progressifs et PRNG persistés. Réseaux équilibrés sans attente ne refont pas dix recherches de candidats par tick ; ordre des autres tirages inchangé.
- Planification et livraison de combustible emploient toute l’empreinte. Tester chaque face d’un appareil multiple : la route vers la seconde case ne doit pas bloquer le porteur. Les phases power.on/parent sont observées par le bridge.
- V41 strictement validée avant migration sans appareil injecté. La lampe emballée perd connexion/alimentation. Conduits, interrupteurs physiques, batteries, froid électrique, prérequis de recherche/compétence et incidents restent absents ; rayon brut 12 de lampe provisoire.
- Diffusion lumineuse V42 : une nouvelle topologie n’exige pas de diffusion si sources/dimensions et obstacles dans leurs bornes de portée sont identiques. Les topologies comparées restent immuables. Le canal d’opacité de la texture doit toutefois suivre chaque changement topologique, indépendamment de l’identité du tableau lumineux.

## Compétences V43

- Lire docs/development/skills.md et sa recherche. Construction est la première compétence branchée, pas une personnalité complète. Milli-XP entières, saturation strictement après 4000 XP nets, dette −1000 avant perte de niveau, cadence déphasée et remise à zéro sauvegardée.
- Gains seulement en finition de cadre approvisionné et déconstruction à coût ; pas pendant trajet, transport, dégagement, toiture ou désinstallation. Ces deux derniers travaux utilisent néanmoins la vitesse. Les anciennes durées restent explicitement calibrées ; qualité/échecs, seuils, humeur de passion et autres compétences demeurent ouverts ; capacités physiques livrées V45.
- V42 strictement validée avant profil 8/sans passion/0 XP et dernière remise inconnue (-1), sans passé inventé ni modification des routes/ressources. Cloner profondément skills dans les fixtures de foule. La ROADMAP privilégie désormais corps/capacités, soins puis équipement/combat avant de poursuivre les appareils électriques.

- Emprises V43 : le rejet rapide de `footprintContains` suppose les branches actuelles dans le voisinage immédiat de l’ancre. Étendre sa borne lors de futurs volumes et conserver la comparaison de tout le catalogue/rotations/enveloppes contre `footprintCells`. Les directions de sortie sont constantes, sans changer leur ordre.

## Interruptions V44

- Lire docs/development/interrupted-cargo.md. Une interruption involontaire libère les engagements même si le dépôt échoue ; Pawn.interruptedCargo conserve un seul objet, jamais un inventaire. Sommeil/réveil et pourriture continuent, travail bloqué jusqu’au dépôt proche. Les commandes volontaires gardent leur refus atomique.
- V43 strictement validée avant migration sans marqueur inventé. Le nouveau marqueur est une phase observée par le bridge ; arêtes capturées terminées avant effondrement de fatigue, arrêt médical immédiat ajouté en V45 selon son contrat.
- Les index de cellules de piles ne survivent qu’à une décision de dépôt. Tentatives déphasées, vingt ticks entre échecs ; commandes explicites peuvent réveiller la planification. Conserver ordre des cellules, quantités, identités, âge et meuble entier.

## Module médical, intégré sous V45

- Lire docs/development/injuries.md, docs/development/health.md et leurs recherches. Pawn.health est actif en V45 ; traitements physiques ajoutés V47, combat encore absent. Le module reçoit un impact déjà localisé/résolu, pas les dégâts bruts d’une arme ou d’un toit.
- Milli-PV et unités sanguines entières ; racines manquantes sans descendants redondants ; Cut ne fusionne pas, Crush peut fusionner. Famine bloque guérison naturelle et contribution du soin ; cicatrices décidées avant guérison, douleur permanente activée au seuil.
- `MedicalRecord.tick` est figé au décès. L’appelant doit couper les intervalles aux changements de contexte ; l’intégration applique interruptions et présentation au tick effectif. Validation du dossier isolé ne vaut pas validation/migration de World.
- Le seuil sanguin de 0,1/jour suit le miroir identifié, malgré la formulation générale du wiki ; stade extrême = offset −0,4 et plafond 0,1, ne pas restaurer le vieux XML. Aucun cache d’anatomie par frame ; copies des dossiers très chargés restent un coût à traiter à l’intégration worker.


## Santé active V45

- V44 validée strictement avant migration sans dossier inventé. Santé sparse, horloge vivante au tick World, dossier figé au décès. Incapacité libère immédiatement engagements/file/services ; cargo indéposable conservé. Ne jamais réactiver un blessé depuis releaseAssignments ou un nettoyage de fin de job.
- Fin de l’arête capturée pendant la chute = adaptation 3D explicite ; aucun nouveau pas ni travail. Repos et guérison allongée après arrêt. medicalSleep distingue sommeil et posture, doit être sauvegardé. Un lit n’est gardé que s’il était réellement utilisé.
- Réutiliser les capacités uniquement dans la décision courante après évolution médicale, pas entre ticks ni après dommage. Dégâts de toiture construite Top/Outside/Crush, distincts de Blunt et montagnes ; retrait volontaire sans blessure. Cadavre encore Pawn sur place, aucun transport de dépouille implicite.

## Secours V46

- Lire docs/development/rescue.md et la recherche associée. Relation sur le porteur, patient unique, réservation patient/lit, approche et transport physiques. Santé/faim continuent ; ni soin ni nourriture donnés implicitement. Dépôt passif de la cargaison propre au patient suspendu pendant portage.
- Le rôle medical appartient seulement à un lit et survit à son emballage. Exclure sommeil ordinaire, distinguer usage temporaire et propriétaire. Interruption et invalidation libèrent aussi le patient ; aucune nouvelle arête autonome pendant portage.
- V45 validée strictement avant priorité doctor 1, sans patient ni secours inventé. Corps/cargaison/anneaux partagent les attributs GPU du sauveteur ; observer les phases et invalider le mobilier au changement de rôle. File de secours encore ouverte ; traitement sans médicament ajouté V47, alimentation assistée V48.

## Traitements V47

- Lire docs/development/tending.md et sa recherche. Patient, Médecin et Repos au lit sont distincts ; allongé n’est pas endormi. Le choix médical reste disponible à l’heure du coucher. Pas de soin/XP pendant trajet ni de PV instantanés.
- Réserver patient et chevet cardinal, capturer la durée au début du travail, conserver reliquat et continuation. Une plaie sans médicament par opération ; XP avant qualité, variation additive et plafond 70 %. Politique, accès, incapacité et mort libèrent avant résultat.
- V46 validée strictement avant Patient 1, Repos au lit 3 et Médecine 8/sans passion/0 XP. La migration V42→43 ne doit pas introduire ce nouveau profil trop tôt. Alimentation assistée ajoutée V48 ; auto-soins ordinaires ajoutés V49 ; médicaments ajoutés V51, files et expirations des autres tâches restent ouvertes.
- Incapacité dans un lit déjà utilisé : retirer l'intention volontaire mais conserver le service physique ; fin de traitement et priorité Patient 0 ne doivent pas déclencher un second secours. Valider les affections admissibles et la place au chevet.
- Fabrique des colons séparée dans starting-pawns.ts : lire docs/development/starting-pawns.md avant réintégration au générateur. L'indépendance entre créations doit résister aux mutations fractionnaires et imbriquées ; ne pas contourner les erreurs par une remise à zéro des sauvegardes.

## Alimentation assistée V48
- Lire docs/development/feeding.md et sa recherche. Seuil adulte 26 % selon le miroir (0,3 × 0,8 + 0,02), pas 27 % déduit du wiki. Patient réellement au lit avec besoin médical, également mobile en récupération ; politique de traitement indépendante du régime alimentaire.
- Médecin possède Pawn.feed, le patient conserve son lit. Patient/chevet exclusifs communs aux traitements, source quantitative commune aux repas/transports/cuisine. Prélèvement, portage et 75 ticks au contact avant consommation/nutrition ; ni XP ni facteur de vitesse d’ingestion du patient. Pas de nouveau souvenir sans table en posture couchée.
- Invalidation libère les services, conserve l’objet indéposable via interruptedCargo. Reprise exacte des trois phases ; V47 strictement validée avant V48 sans donnée inventée. Inventaires personnels, médicaments, auto-soins, distributeurs et malnutrition ne sont pas livrés par cette action.

## Auto-soins ordinaires V49
- Lire docs/development/self-tending.md et sa recherche. Permission sparse désactivée, métier Médecin et politique de soins distincts. Même tâche de traitement avec patientId égal au médecin ; qualité de base ×0,7 avant plafond/variation additive, vitesse et XP communs.
- Lit facultatif ; quitter physiquement son service pour une case cardinale d’arrêt si nécessaire (adaptation 3D). Réservation du patient commune, pas de sommeil simultané, pas de bonus de repos. Désactiver l’option arrête aussi un ordre forcé. Décisions urgentes ajoutées V50 ; ne pas les confondre avec une préemption universelle.
- V48 strictement validée avant V49, sans permission inventée. L’orientation graphique récupère la dernière arête au rechargement ; ne pas viser sa propre position.

## Décisions médicales urgentes V50
- Lire docs/development/urgent-care.md et sa recherche. La branche urgente n'est disponible qu'à la meilleure priorité de travail activée ; Patient avant Médecin à égalité. Seuil strict de saignement avant 0,75 jour, pas toutes les lésions.
- TendTask.urgent capture la voie ; auto-soin urgent termine après une plaie puis réévalue, ordre direct garde sa chaîne complète. Revue au lit 211 ticks Core, alternance 21/22 ticks locaux dérivée du tick/ID. Pas d'annulation universelle des travaux engagés ; expirations/dégâts restent ouverts.
- V49 validée strictement avant V50 sans marqueur inventé. Navigation progressive et réservations communes ; budget épuisé reporte, accès impossible conserve le service. Aucun gain pendant trajet ni bonus de lit debout.

## Médicaments V51
- Lire docs/development/medicines.md et sa recherche. Plafond du patient parmi cinq grades, puissance puis distance au patient, accès du médecin. Réservations quantitatives communes ; dix médecins maximum par source. Prélèvement/portage physiques, une dose par opération, premier dommage puis autres lésions tenant dans vingt PV. Sans dose, une seule plaie.
- XP une fois avant qualité, variation par plaie. Auto-soin urgent termine après une opération et dépose le reliquat ; politique invalide/cargaison indéposable conserve la matière via interruptedCargo. Pas d'inventaire personnel implicite.
- V50 strictement validée avant V51 sans doses ni plafond inventés. Absence du champ = ancien soin à sec ; nouveaux colons plafond industriel, nouvelles cartes trente doses industrielles. Herbal/avancé définis et testés mais acquisition normale encore absente ; plantes médicinales pourrissent en 150 jours via le taux local, bilan distinct de la nourriture.

## Équipement V52
- Lire docs/development/equipment.md et sa recherche. Propriétaire equipment distinct de pawn/cargaison ; une arme principale, identité/qualité/PV préservés. Réserver avant approche, échanger au contact après prévalidation du dépôt, délai de dépôt trois ticks locaux. File d’équipement différée ; file ordinaire suivante conservée.
- Chute hors lit, décès ou perte de manipulation déposent l’arme ; lit déjà utilisé conservé sauf manipulation perdue. Sol saturé conserve via equipmentDropPending, sans destruction ; récupération de l’arme mémorisée seulement après besoins/ordres (adaptation documentée). Recontrôler l’exception du lit avant sauvegarde après changement de service.
- V51 strictement validée avant V52 sans arme injectée. Nouvelle carte : un revolver normal ; combat/inventaire/vêtements absents. Attache rigide GPU dans le lot corporel, géométrie isolée et projection commune UI/carte ; ne pas ajouter de squelette CPU par arme.


## Mobilisation V53
- Lire docs/development/drafting.md et sa recherche. Mode sparse distinct des tâches civiles ; destination active exclusive, file réservée seulement à activation. Transit allié reste commun, collision hostile à intégrer avant ennemis. Arête capturée intacte lors des changements d’ordre.
- Faim/fatigue/santé continuent, sommeil involontaire au sol possible ; aucune prise de besoin/travail autonome. Démobilisation après 1 000 ticks locaux d’attente sans menace ; ajouter son prédicat au premier combat. Incapacité supprime le mode, Manipulation seule n’interdit pas la marche.
- Saturation conserve une seule cargaison via interruptedCargo, autorisée en déplacement tactique ; tentative de dépôt après navigation et hors arête pour éviter la famine de recalcul avec planCooldown partagé. Démobilisation finit l’arête, travail civil ensuite bloqué jusqu’au dépôt. V52 validée strictement avant migration sans mode inventé.
- Repli spatial sans couvert/formation et ordres civils mobilisés refusés : limites documentées, pas parité complète. Bouton/R sur sélection, clic droit/Maj, arrêt ; aucune option de tir décorative. Mode/destination/file sont des phases bridge, dernière activité seule ne l’est pas.

## Impacts anatomiques V54
- Lire docs/development/bullet-impact.md et sa recherche avant les dégâts d'arme. Producteur adulte naturel avec protection V63 via apparel-protection, sans facteur entrant ni protection personnalisée de mort instantanée ; réglage Core ordinaire 100 %. Préserver le choix anatomique avant armure et la propagation sans nouveau jet ; les profils d’implants restent absents.
- Localisation pondérée, préservation extérieure sauf racine, propagation complète jusqu'à la première couche extérieure. Gunshot reste Gunshot sur os ; aucun second jet de préservation sur les couches dupliquées. Le dossier copié et le PRNG s'engagent ensemble, puis l'incapacité est réconciliée une fois. Une lésion létale interne ne supprime pas les autres couches du même impact.
- V53 validée strictement avec Gunshot interdit avant V54 ; migration sans blessure ou tir inventé. Traitements/sauvegardes/UI testés, mais déclencheur joueur, phases/vol, ralentissement, armures et ennemis restent absents. Une fixture d'impact ne prouve pas une attaque jouable.

## Requêtes de combat V53–V54
- Lire docs/development/combat-queries.md et docs/research/combat-preparation.md. combat-space/combat-report gardent leur frontière de requêtes ; combat-world ajoute la capture du décor, sans tir jouable. Lire docs/development/combat-world.md et sa recherche avant modification du catalogue tactique. Une probabilité ne prouve pas la ligne ; portée avant penchement, visibilité distincte de navigation, couverture et posture séparées des branches de projectile.
- Grille détenue par l'appelant pour un lot synchrone ; aucune réutilisation après mutation. Une capture du monde partagée par lot, jamais par colon ou frame ; colonnes numériques et rapports à la demande. Remplissage brut maximal par cellule, porte ouverte encore candidate mais blocage nul ; cadre 0,20 distinct du bâtiment fini. Cailloux décoratifs sans couvert, fragments posés 0,50. Rapports sans mutation ni PRNG caché. Valeurs synthétiques des tests/bancs ne sont pas les définitions de contenu ; ne pas présenter les requêtes de cent candidats comme cent combattants intégrés.
- `ranged-statistics` prépare les qualités du revolver et le calcul adulte de précision, sans compétence Tir persistée ni attaque. Lire docs/research/ranged-statistics-reference.md : dommage arrondi et pénétration distincts ; vitesse brute /100 par tick Core, journée Core/locale facteur 10. Conserver les fractions de phase lors de l'intégration ; le cycle d'XP utilise la préparation de base et le cooldown flottant, pas les durées arrondies. Gunshot et ses propagations sont ajoutés en V54 selon le contrat précédent.

## Projectile isolé sous V54
- Lire docs/development/projectiles.md et sa recherche. Le noyau reste indépendant de World/UI ; V55 ajoute son enveloppe persistante ci-dessous, sans commande de tir. Cible intentionnelle/utilisée, arme du départ et lanceur distincts ; PRNG local engagé avec le résultat, jamais seul après refus.
- Cardinal : seulement la nouvelle case ; diagonal/long : échantillons de 0,2 avec dédoublonnage limité au sous-pas. Ne pas sauter les dix pas Core par tick local. Identité de cible mobile conservée, posture résolue une fois ; tirs amis finaux et en vol suivent des facteurs distincts. Ne pas ajouter toutes les permissions de collision aux tirs directs.
- projectile-world capture les cibles actuelles, recouvrement complet par couche logique, patients/objets portés exclus et relations copiées explicites ; la capture du meilleur couvert reste distincte. Colonnes/incidences, identifiants ordonnés vérifiés puis recherche binaire ou index différé ; pas d'hypothèse 32 bits ou d'ordre World. Recréer après mutation et partager par lot. Dépouilles et dommages aux objets absents. V55 ajoute vols persistants/migration et observateur. Prochain branchement : phases du tireur, vraie commande/XP et adversaire, avec garde UI et charge mixte. Les coûts de lots de vols complets ne sont pas des coûts par frame.

## Vols persistants V55
- Lire docs/development/projectiles.md et sa recherche. World.projectiles sparse, identité globale, dates Core, qualité/relations du départ, arrivée inerte un tick ; migration V54 stricte sans projectile inventé. Enregistrement interne seulement : commande, XP, préparation/récupération, adversaire et rendu restent absents.
- Avancer par sous-pas puis ID ; un impact médical renouvelle acteurs/piles/paquets avant le projectile suivant. projectile-batch ne conserve le décor que pendant cette transaction synchrone, jamais au tick suivant. Dommages au décor ou nouveaux mobiles pleins exigent une invalidation adaptée. Contacts d'objet non résolus explicitement, pas de destruction fictive.
- Publication naissance/arrivée/retrait ; DynamicWorld remplace ses champs optionnels absents au décodage. Les futures commandes doivent préserver cette chronologie et ajouter une preuve visible. Le banc intégré mesure des émissions injectées dans des activités minières, pas une UI de combat.

## Tir commandé V56
- Lire docs/development/shooting.md et docs/research/shooting-reference.md. Ordre et récupération distincts ; annuler/démobiliser ne supprime pas un cooldown. L’effondrement involontaire de fatigue reste une interruption forte, y compris pendant la récupération. Arête engagée terminée avant visée. Dix sous-pas Core, 18 puis 96 sans arrondir le cycle ; tireurs puis projectiles par ID à chaque sous-pas.
- V55 strictement validée avant Tir 8/sans passion/0 XP, sans ordre inventé. XP seulement à l’émission admissible, cible non à terre, taux non hostile 20 × durée Core du cycle ; les personnages actuels sont tous alliés. Ne pas appliquer le taux hostile sans appartenance explicite.
- ProjectileLayer partage l’horloge de présentation ; buffers instanciés stables, préparés même vides, libérés à la croissance. Traces reçues avant application mais visibles seulement à leur date. Phases World/médical au tick local, trajectoire continue au sous-pas.
- Ennemi/réactions, collision hostile, pouvoir d’arrêt, armures, mêlée, jauges graphiques et audio restent ouverts. Le pilote civil ne doit pas attaquer ses propres colons pour fabriquer une étape de combat ; parcours de tir allié contrôlé distinct jusqu’à une vraie menace.

## Pouvoir d’arrêt V57
- Lire docs/development/stagger.md et sa recherche. Ralentissement distinct des blessures et postures de tir : adulte naturel, 95 ticks Core, facteur 0,17 avec paiement minimal de l’arête/450 Core. Renouveler la durée sans addition ni facteur empilé.
- Ne pas retimer le passé : fenêtres persistées sur l’arête, morceaux linéaires seulement en présentation. Lumière/anatomie/terrain restent la base capturée ; patient porté partage toutes les fenêtres. V56 strictement validée avant V57, sans impact inventé. Autres corps, factions/réactions et armures restent ouverts.


## Première rencontre V58
- Lire docs/development/encounters.md et sa recherche. Propriétaire et relation distincts ; champ absent = colonie historique. Sentinelle statique optionnelle, jamais un raid implicite. Les suites V59/V60/V61 livrent mêlée, Attaquer et approche du nouveau scénario ; V62 ajoute le réveil défensif ; autonomie NPC complète reste ouverte.
- Profil hostile commun à accès progressif, route et suivi, extrémités d’arêtes protégées. Porte de colonie fermée infranchissable au hostile, ouverte accessible même interdite ; les corps bloquent la fermeture sans renouveler le contact amical.
- Fuite conserve cargaison et arête active ; refuge avec score de pièce/distance, attente persistée. Le tir utilise le même résolveur et 170 XP/s de cycle sur hostile, 20 sur non-hostile. Minimum 1,421 pour la cible hostile debout, pas interdiction universelle à cause d’un tiers adjacent.
- V57 strictement validée avant migration ; aucun scénario injecté au chargement. Exclure adversaires des commandes/portraits/gestion/soins civils. Les captures de combat ne survivent pas à une décision avec mutation. Pilote de rencontre complémentaire au camp, sans injection de blessures.

- Captures V58 : lire combat-world.md et encounters.md. `combat-shot-batch` ne vit que dans `advanceWorldCombat`, où les impacts ne modifient pas le décor fixe. Vérifier les couvertures mobiles après chaque impact et recapturer cibles/places ; tout futur dommage d’objet exige extension de l’invalidation. Topologie de refuge revérifiée par masque complet, jamais par tick seul.

## Mêlée V59

- Lire `docs/development/melee.md` et sa recherche : contact diagonal distinct du transit, outils naturels/revolver, toucher puis esquive, récupération conservée après annulation. Ne pas réduire les coups à une vie globale ni faire dépendre les dégâts de l’animation.
- V58 validée strictement avant Mêlée neutre ; nouvelles formes melee/stun/stuns et morsure interdites auparavant. Arrêt au milieu d’une arête sans saut, propagation commune corps/cargo/patient/sélection. Durée du stun calibrée à 45 ticks Core, divergence documentée.
- Les capacités et portages capturés par shootingQueries ne survivent qu’à la transaction synchrone ; renouveler après chaque impact, avant le combattant/projectile suivant. Aucune réutilisation entre ticks ou après mutation médicale.
- La sentinelle historique riposte au contact sans poursuite. V60 ajoute tir automatique/réaction Attaquer ; V61 ajoute le mandat mobile du nouveau scénario. La tactique générale reste ouverte ; maintenir le bilan exact.

## Acquisition automatique V60

- Lire `docs/development/automatic-combat.md` et sa recherche. Mobilisé immobile : tir libre par défaut, déplacement/file prioritaires, défense en mêlée même tir libre désactivé. Civil Attaquer : rayon 8 sans arme ou 0,66 de portée borné 2–20 ; deux tirs puis réévaluation, sans mobilisation cachée.
- État automatique distinct des ordres explicites ; couper la permission annule la visée automatique, réamorce celle d’un ordre explicite conservé, jamais la récupération. Les refus d’ordres civils pendant récupération restent une limite documentée. Cargaison et arête engagées restent physiques.
- V59 strictement validée avant migration neutre V60. Origine de l’ordre, compteur/expiration et dernière attaque réelle sont sauvegardés ; aucun passé ni cible inventés. Les politiques sont des phases discrètes du bridge.
- Capture tactique bornée à portée +3 pour l’acquisition (penchement/couverture/cône inclus), fermeture hors fenêtre, identités de couverture inchangées. Renouveler après interruption ; aucun cache de monde par tick ou entre acteurs. Grille de contact paresseuse seulement à proximité ; ne pas modifier le classement ou le PRNG pour gagner du temps.

## Approche ennemie V61

- Lire `docs/development/pursuit.md` et sa recherche. Mandat NPC optionnel, cible/poste/échéance Core persistants. Nouveau scénario mobile ; absence de mandat = sentinelle historique fixe, migration V60 stricte et neutre.
- Classement des postes, visibilité, accès progressif puis route pondérée unique. Réservations de postes distinctes du transit ; revalider chaque pas, conserver arêtes et récupérations. Aucun cache de décision entre mutations/acteurs/ticks.
- Ne pas confondre approche visible et raid/stratégie collective. V62 ajoute le réveil défensif ; cibles invisibles, destruction de portes, retraite et besoins autonomes NPC restent ouverts. Les corrections officielles de juin sont postérieures au miroir de mai : conserver les incertitudes.
- Le pilote de rencontre réaffecte un survivant si le médecin est indisponible. Exiger secours et traitements achevés ; préserver les échecs et leurs diagnostics. Les audits incluent les pointes initiales de planification.


## Réveils défensifs V62
- Lire `docs/development/disturbance.md` et sa recherche. Bruit d’impact à l’arrivée, rayon strict 12 × audition ; Harm NPC alliés endormis, rayon 18. Portes fermées et masses isolent, portes ouvertes connectent les espaces. Adaptation explicite par espaces, pas reproduction des quinze régions Core.
- Deux délais persistés : bruit → sommeil volontaire 1 000 Core ; violence reçue couché → coucher volontaire/entrée en sommeil 400 Core. Repos médical éveillé distinct du sommeil ; morts/à-terre/portés ne se lèvent pas. Effondrement involontaire conservé.
- V61 strictement validée avant migration neutre V62. Réveil conserve lit attribué, file, arête, récupération et cargaison ; il libère seulement le service actuel. Ancrer santé avant posture et renouveler les captures combat après un réveil même sans blessure.
- Capture acoustique possédée par la transaction, invalidable aux futurs dommages d’objets. Aucun parcours par image. Préemption générale des autres jobs, autres bruits, pensées et réveils de groupe restent ouverts ; ne pas généraliser l’interruption de repos à tous les travaux.
