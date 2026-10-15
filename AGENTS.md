# Travail sur Elsewhere

## Consigne courante — 15 octobre 2026 au soir

Autonomie reprise par l’utilisateur ; commits et pushes sur `origin/main` autorisés explicitement. Une nouvelle pause humaine prime. Livrer plus de gameplay concret en réduisant fortement le cadrage et les campagnes de tests répétées ; qualité, règles et performances restent requises.

**État V376, schéma 239 :** [toundra et neige physique](docs/gameplay/tundra-snow-v376.md) livré : produit872afdbb poussé et publié712fc270/106HTTPS exacts. Départ natif, travail au contact et trois recharges exactes acquis sur Chrome ; corpus63 inchangé. Campagne98038 close partielle, sans blocage des extensions.

**Ordre courant :** second site persistant modifié/revisité, puis catalogue utile. Voir [la feuille de route](docs/ROADMAP.md). Sous-métiers reportés. Références humaines, `references_UI`, branche UI papier `codex/ui-papier-v317` et sessions humaines préservées.

## Méthode de livraison

- Cadrer une fois chaque boucle : résultat joueur, quelques invariants, fichiers concernés et critères de fin. Réutiliser les helpers et résultats existants. Pas de nouveau protocole de preuve pour chaque incident, portion ou checkpoint.
- Comparer régulièrement règles ET expérience utilisateur au RimWorld Vanilla courant : recherche Internet ciblée, sources primaires et captures/vidéos identifiées. Réutiliser les références datées tant que la règle ne change pas ; distinguer fait vérifié, adaptation et inconnu. Ne pas copier de code ou d’assets propriétaires dans le produit.
- Agents sur tâches indépendantes bornées (recherche, revue, code), ROOT seul pour contrôles lourds séquentiels. Geler les sources servies avant le navigateur ; les agents peuvent préparer des copies privées pendant les contrôles.
- Une passe ciblée regroupée et un court parcours UI pertinent suffisent aux risques qu’ils couvrent. Régression élargie uniquement pour frontières transversales ; campagne longue périodique ou motivée, jamais condition automatique de chaque lot. Un échec est conservé et diagnostiqué avant reprise.
- Penser coûts CPU/GPU/mémoire dès l’implémentation ; réutiliser index, cadence et lots existants. Mesurer le chemin changé si le risque le justifie, sans relancer un banc FPS inchangé. Aucun 100 %, parité exhaustive ou 240 FPS sans preuves.
- Une note canonique par lot ; les index donnent seulement le résultat et un lien. L’historique ne doit plus envahir les consignes courantes. [Historique antérieur](docs/history/agents-through-v373.md), à lire seulement pour une question précise.

## Référence et périmètre

- RimWorld Core d’abord, extensions après G5 sauf demande utilisateur ultérieure. Référence Core des derniers relevés : 1.6.4871. Conserver ses boucles et interactions ; toute adaptation doit être motivée, documentée et distinguée d’une règle vérifiée. Ne jamais promettre une parité exhaustive.
- Le [corpus utilisateur](docs/research/reference-adoption.md) est la référence fonctionnelle principale, à confronter aux recherches et observations de parties. Lire les chapitres du domaine ; conserver les identifiants SYS/TEST/CONST/UI/STAT/GAP, provenance et décision adopter/adapter/différer/vérifier. Ne pas appliquer automatiquement ses architectures, nombres ou priorités ; ses statuts ne prouvent pas une validation locale. Préserver les originaux.
- À chaque nouvelle mécanique, effectuer une recherche Internet précise, vérifier version, détails et cas limites et consigner certitudes/divergences. Une sauvegarde observée n’est ni une règle universelle ni le calendrier du projet.
- Développer le catalogue avec les mécaniques : acquisition, matières, production, usage, effets, stockage et sauvegarde. Une définition, une couleur ou un bouton grisé ne vaut pas contenu jouable. Mettre à jour catalogue et guide joueur ; distinguer livré, partiel, proposé et absent.
- Échelle dans `src/world/scale.ts`, carte jouable par défaut 250×250 dans `src/sim/map-config.ts`. Les petites cartes de fixtures ne sont pas la référence de charge. La 3D interprète explicitement volumes et interactions ; esthétique low poly, pigments pastel/craie et effets BD selon les contrats de présentation existants.

## Frontières et invariants

- `src/sim` est déterministe : pas de DOM, Three, horloge réelle ou `Math.random`. Persister tout état influant sur la continuation et préserver les flux PRNG. `src/bridge` ordonne/acquitte les commandes ; on peut sauter des snapshots, jamais des commandes.
- Manger, dormir, produire, transporter, soigner et combattre exigent accès, réservations, déplacements et contacts réels. Conserver identité, item, quantité et propriétaire ; refus, annulation et restitutions atomiques. Inventaire, équipement, vêtements et cargaison sont distincts. Aucun raccourci à distance pour satisfaire un test.
- Toute évolution persistante exige un schéma et une migration explicite. **Valider strictement l’ancien schéma avant migration neutre**, rejeter ses champs futurs, n’accorder ni ressource, recherche, progression, maladie, personne ni histoire rétroactive. Les fixtures historiques restent immuables ; une sauvegarde invalide ne remplace jamais le monde courant.
- `src/render` ne modifie pas le World. Présentation et pause suivent le tick confirmé. Acteurs, décor et effets restent dans des lots GPU résidents ; pas de scène, AnimationMixer ou mise à jour de squelette par acteur et par image. Éviter les recherches métier et uploads par image. Textures désactivées : aucun prélèvement de pigment.
- Avant de changer les capacités/propriétaires des buffers, lire [la préparation des ombres](docs/development/shadow-preparation.md). `BoxMesh` conserve ses attributs TSL stables ; `geometry.instanceCount`, pas `Mesh.count`, pilote le compte graphique. Les normales, indices, poses et portraits doivent rester cohérents.
- Navigation GPU : laboratoire isolé avec oracle indépendant, pas un système déjà branché sur les colons. Aucun moteur physique, ECS générique, Rust/WASM ou compute de foule sans besoin mesuré ; extraire une responsabilité cohérente avant d’allonger un module volumineux.
- Interface : colons en haut, ressources à gauche, alertes à droite, inspection en bas à gauche, gestion en bas, temps en bas à droite. Priorités dans Travail et construction dans Architecte. Sol nu non sélectionnable ; survol informatif distinct de sélection. Les panneaux couvrent les HUD monde. Chaînes issues des sauvegardes via `textContent`. Compteur FPS discret toujours visible.

## Validation et performances

- Suivre [la stratégie de tests](docs/development/testing.md). Grouper les contrôles courts pertinents ; campagnes naturelles longues périodiques ou motivées par les contrats touchés, **pas systématiquement à chaque lot**. Les scénarios préparés doivent être nommés comme tels puis exécuter les vraies transitions.
- Entretenir le pilote commun de colonie et les contrôles de conservation, reprise, migrations, commandes et UI réelle. Diagnostiquer un échec au checkpoint conservé avant de rejouer la préparation. Corriger un oracle obsolète sans détendre les règles ni retirer une assertion métier utile. Les pilotes doivent fournir les filtres réellement requis par les recettes.
- Les nouvelles sorties de tests vont sous `tmp/`, pas dans les preuves historiques versionnées. Distinguer suite ciblée, régression, campagnes longues, contrôles sautés et suite complète ; ne pas annoncer verte une suite interrompue.
- Lire [les critères de jouabilité](docs/development/playability-validation.md). Un état final et des FPS ne prouvent pas la chronologie visible. `npm run test:presentation` est requis pour horloge, bridge, interpolation ou phases de travail ; pas pour une retouche cosmétique. Les encodeurs comparent aussi les changements au même tick, sans garder une référence mutable comme témoin.
- Mesurer séparément génération, simulation/worker, adoption des snapshots, CPU image, RAF et GPU. Conserver scène, matériel, paramètres, percentiles et limites. Mesures CPU, campagnes lourdes et navigateur natif **successives**, sources servies gelées. Le navigateur logiciel, une capacité de buffer ou un microbanc ne prouvent ni coût GPU nul, ni 240 FPS, ni débit ×6 général.
- Réutiliser les preuves acquises et rejouer seulement les contrats touchés par une correction. Une économie de temps/tokens ne justifie pas une affirmation non vérifiée. Garder recherche, implémentation, correction produit, réparation de pilote et exécution des contrôles distinctes dans le bilan.

## Collaboration et environnement

- L’utilisateur demande désormais des sous-agents **GPT‑6.1 Sol** pour réduire sa consommation, avec raisonnement élevé, ou très élevé pour un diagnostic complexe. Missions bornées, propriétaires de fichiers distincts, intégration centrale ; ne pas déléguer ces contrats à Luna. Avancer de manière autonome sur les travaux autorisés, sans lancer un nouveau chantier pendant une consolidation demandée.
- Commits et pushes sur origin/main explicitement autorisés par l’utilisateur le 15 octobre 2026 au soir. Livrer les lots cohérents après leurs contrôles pertinents ; pas de force push. Regrouper les publications produit autorisées, aucune publication pour QA seule.
- C: est contraint. Pour les commandes de cette session, définir `TEMP` et `TMP` sur `E:/Code/RimWorld/tmp/host-cache/temp`, `NPM_CONFIG_CACHE` sur `E:/Code/RimWorld/tmp/host-cache/npm-cache`. Ne pas déplacer à chaud journal de conversation, pièces jointes ou runtimes actifs. Les anciens déplacements vérifiés et jonctions sont décrits dans l’archive V135.
- `E:/Code/Antsystem` est une référence en lecture seule. Blender seulement sur demande ou tâche d’asset explicitement prévue. Dépendances stables vérifiées avant mise à jour, versions épinglées avec lockfile.
- À la livraison, expliquer ce qui change pour le jeu, ce qui reste partiel/absent et les preuves/limites de performance. Pour une consolidation sans nouvelle mécanique, le dire simplement ; ne pas présenter l’entretien documentaire comme une progression fonctionnelle.
