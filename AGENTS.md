# Travail sur Lisière

## Intentions persistantes

- Référence : RimWorld de base d'abord, extensions ensuite. Garder ses boucles et interactions par défaut ; documenter chaque simplification et divergence.
- Le corpus utilisateur docs/new_docs (Documentation_developpement.html, Documentation_developpement.pdf, Referentiel_developpement.xlsx) est notre référence fonctionnelle principale, en complément des recherches antérieures. Avant un chantier, lire ses chapitres et entrées de domaine via docs/research/reference-adoption.md. Orienter le plan vers ses contrats, sans appliquer automatiquement ses architectures, nombres, priorités ou tests. Ses statuts R/P/V ne valent pas validation locale ; une divergence motivée reste possible. Ne pas confondre le comportement actuel du prototype avec la cible.
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

- Lire docs/ROADMAP.md et les documents du domaine avant modification.
- ROADMAP est l'unique calendrier canonique G0–G5 ; la matrice en reprend les jalons. Les étapes 1–8 et priorités P0/P1 du corpus sont des repères de dépendance, pas un second planning. Les extensions viennent après G5, sauf décision utilisateur ultérieure.
- Pour une règle issue du corpus, conserver chapitre, identifiant SYS/TEST/CONST/UI/STAT/GAP pertinent, provenance et décision (adopter, adapter, différer, vérifier). Les entrées de tests servent à enrichir nos scénarios existants, pas à créer automatiquement une suite par ligne. Les originaux restent préservés ; notre analyse et nos écarts sont dans les documents du projet.
- Peu de scénarios profonds avec résultats métier, invariants et diagnostics reproductibles. Ne jamais annoncer une couverture exhaustive de tous les bugs.
- Choisir les contrôles selon docs/development/testing.md : une couleur n'exige pas toute la suite ; planner, sauvegarde et worker exigent les contrôles de leur contrat.
- Mettre à jour guide joueur pour les règles, architecture pour les décisions, ROADMAP pour l'état, validation pour les preuves. Distinguer livré, testé, proposé et inconnu.
- Ne pas annoncer des performances depuis une capacité de buffer, un commentaire Antsystem ou Chromium logiciel. Conserver matériel, conditions et données de mesure.
- Pas de gros moteur physique, ECS générique, dépendance Rust ou compute de foule sans besoin démontré. Préférer une frontière claire à une abstraction speculative.
