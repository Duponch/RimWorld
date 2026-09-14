# Travail sur Lisière

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
- Extraire une responsabilité cohérente avant d'allonger un module déjà volumineux. La simulation, les poses GPU, les objets de décor et les outils UI gardent des frontières explicites.
- Les commits expliquent le changement, sa validation et un court état du plan global G0–G5. Commit et push autorisés sur le dépôt du projet.

- Entretenir le pilote de colonie `tests/scenarios/colony-player.ts` et ses parcours de plusieurs jours lors des ajouts de gameplay. Il doit développer un camp par les commandes du joueur, contrôler résultats et bilans, et distinguer cohérence interne et fidélité à RimWorld. Le long parcours UI se lance aux changements de boucles/commandes/persistance, pas pour une retouche cosmétique.
- Tenir `docs/gameplay/implementation-status.md` à jour pour les systèmes livrés, partiels et absents ; le résumé conversationnel ne remplace pas cet inventaire. ROADMAP reste le seul calendrier.

## Catalogue et apparence (2026-09-13)
- Mettre à jour docs/gameplay/content-catalogue.md à chaque ajout de contenu ; les 95 familles CAT du corpus ne sont pas un catalogue individuel exhaustif. Une définition présente ne signifie pas que toutes ses recettes, variantes ou règles sont livrées.
- Inventaire personnel, équipement, vêtements et cargaison temporaire sont distincts. Le contrat cible de rendu commun carte/portraits figure dans docs/development/character-presentation.md ; ne pas annoncer ces systèmes déjà implémentés.
- Schéma courant 17 (types alimentaires introduits en V5) : conserver item et quantité lors des transferts. Les nouveaux producteurs alimentaires précisent leur ItemId ; le défaut legacy-portion des helpers sert à la compatibilité et aux anciennes fixtures, jamais aux nouveaux aliments. foodRules distingue explicitement parties historiques et nouveau profil adulte.


## Sol et déplacements (V6)
- V14 autorise le partage des cellules entre colons civils. Lits, repas et postes conservent des réservations d'utilisation distinctes du transit ; un effondrement au sol ne s'approprie pas le service. Valider V13 avec ses anciennes exclusions avant migration, sans déplacer les acteurs. Lire docs/research/civil-traffic-reference.md ; le combat exigera son profil explicite commun à recherche, suivi et validation.
- Une pile d’objets par cellule de sol ; une pile contient plusieurs unités compatibles. Les étagères à plusieurs piles ne sont pas implémentées. Réserver aussi le type de la destination et conserver la matière lorsqu’un dépôt est impossible.
- Navigation CPU pondérée sur huit voisins ; déplacement physique à durée euclidienne, coins solides exclus. L’historique d’arêtes et le tampon de présentation ne sont pas des données autoritaires de simulation. Ne pas réintroduire le lissage relancé par snapshot.
- Faire face au déplacement et à la cible du travail. Corps et cargaison partagent les poses GPU ; l’anneau de sélection suit le même trajet.
- Lire docs/development/spatial-motion-storage.md avant de modifier ces contrats, la migration V5→V6 ou la représentation distante. Le laboratoire de navigation GPU reste indépendant.
- Accès aux candidats et distance sont distincts : le parcours cardinal progressif prouve seulement l'existence sous le contrat de coins ; les routes restent pondérées sur huit voisins. Les deux parcours capturent la même occupation et ne survivent qu'à une décision synchrone. Ne pas partager ces buffers entre colons/ticks ni réutiliser un coût non finalisé.

## Conservation alimentaire (V11)
- Lire docs/development/food-preservation.md avant de modifier les transferts, les âges ou la température. Séparer copie l’âge, fusionner pondère les quantités, produire démarre frais. La pourriture précède les actions ; elle réconcilie les réservations et les pertes cumulées.
- La température actuelle est constante : un futur climat variable exige de revoir l’intégration des âges. Les effets du froid, de l’exposition et de l’intoxication ne sont pas livrés par ce contrat.

## Horaires (V12)
- Lire docs/development/schedules.md avant de modifier repos et priorités horaires. Conserver plages, profil de fatigue et état d’épuisement ; une intention ne donne jamais un bonus de besoin. V15 ajoute les plages Loisirs et deux activités physiques ; lire docs/development/recreation.md. Les attentes liées à la richesse restent absentes.

## Régimes alimentaires (V13)
- Lire docs/development/food-policies.md avant de modifier les autorisations ou le choix alimentaire. Régimes partagés filtrés avant préférence/accès ; aucune exception implicite de famine. Les repas engagés continuent, transport et ingrédients restent indépendants. Ne pas confondre cargaison de tâche et inventaire personnel.

## Loisirs (V15)
- Lire docs/development/recreation.md avant de modifier satisfaction, lassitude, places de service et horaires. Le drapeau de lassitude persiste entre 30 et 50 ; aucun gain pendant le trajet. Les piquets partagent une famille et admettent trois joueurs sur des places distinctes.
- V14 migre à 55 de satisfaction sans inventer de passé ni interrompre les tâches. Le profil de camp à attentes extrêmement basses est provisoire ; ne pas le présenter comme un calcul de richesse. Les fixtures de foule doivent cloner profondément les états des personnes.

## Construction (V16)
- Lire docs/development/construction.md : plan traversable, cadre après première livraison, finition après dégagement physique. Construction peut livrer même sans Transport ; Transport seul ne finit pas. Annuler libère les cargaisons de dégagement liées au parent.
- Protéger personnes, arêtes/coins et services avant livraison/achèvement. Le délai de cadre capturé appartient à l'arête sauvegardée. Valider V15 avec ses anciennes exclusions avant migration ; aucun cache d'obstacles de chantier ne survit à une décision synchrone.
- Tous les meubles dégagent encore les piles ; coexistence sur table et plans sur réserves restent des écarts ouverts, pas une règle universelle de RimWorld.

## Ordres et sélection (V17)
- Lire docs/development/player-orders.md avant de modifier priorité forcée, file ou sélection. La file réserve les travaux dès acceptation ; métier 0 interdit de nouveaux ordres mais conserve les ordres forcés déjà acceptés. Annulation explicite, effondrement et disparition de cible libèrent les engagements.
- Un ordre vise un travail exécutable, pas une chaîne de construction implicite. Transport, approvisionnement et cuisine forcés restent absents. Le menu interroge le worker hors des frames ; la commande revalide tout.
- Sélection multiple en présentation seulement ; anneaux instanciés partageant les trajectoires GPU. V16 validée avant migration vers des files vides.
