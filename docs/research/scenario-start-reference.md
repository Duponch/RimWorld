# Début de partie cohérent — préparation du 19 septembre 2026

Objectif utilisateur durable : transformer les systèmes isolés en une vraie nouvelle partie, avec scénario, personnages, possessions, conditions de départ, biome, ressources et pression calibrés ensemble. Ce document est une préparation ; le calendrier reste exclusivement dans [ROADMAP](../ROADMAP.md). Il ne remplace pas le générateur courant ni ne déclare sa difficulté fidèle à RimWorld.

Corpus à adopter : chapitres 6/7 (génération), 11/12 (ressources et écologie), 13 (personnes) et 24 (incidents), SYS-016..019,084/085,121..125,132..135. **Adopter** scénario et site distincts, placements admissibles et distribution contrôlée ; **adapter** moteur et métrique 3D ; **différer** choix de planète complète et catalogue de tous les départs ; **vérifier** densités, budgets et difficulté sur plusieurs parties comparables.

## Référence de départ

[Scenario system](https://rimworldwiki.com/wiki/Scenario_system), relu, et [Scenarios_Classic.xml historique](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/Scenarios/Scenarios_Classic.xml) se recoupent sur Crashlanded : trois survivants choisis parmi huit, arrivée en capsules, profil technologique « New Arrivals », animal de compagnie et possessions séparées du terrain.

Les quantités de référence indiquées sont 800 argent, 50 repas de survie emballés, 30 médicaments industriels, 30 composants ; 450 acier et 300 bois proches du point d'arrivée. Armes : fusil à verrou, revolver, couteau en plasteel ; armures de départ et vêtements s'ajoutent. Des ressources dispersées ailleurs sont une autre catégorie : trois débris de vaisseau, 720 acier et sept repas. Le XML ancien confirme ces nombres, mais ne suffit pas à figer tous les matériaux, qualités et règles du patch actuel. Une partie de ces objets et l'animal domestique n'existent pas encore dans Lisière.

**Point de conception important :** New Arrivals connaît déjà notamment vêtements complexes, mobilier complexe, électricité et climatisation. Nos déblocages pédagogiques actuels ne constituent donc pas un départ Crashlanded identique. Il faudra soit livrer ce profil avec ses technologies initiales, soit nommer et documenter un scénario propre à Lisière, sans mélanger silencieusement les avantages de plusieurs départs.

Les [repas emballés](https://rimworldwiki.com/wiki/Packaged_survival_meal) ne pourrissent pas, mais se détériorent dehors. Les remplacer par des repas simples périssables n'est pas un échange neutre. L'objectif consiste à préserver les marges de survie et les choix initiaux, pas à copier seulement une liste de quantités.

## Taille, végétation, minerais et animaux

[World generation](https://rimworldwiki.com/wiki/World_generation) confirme les tailles normales 200², 225², 250², 275² et les grandes 300²/325². **250², soit 62 500 cellules**, est déjà le défaut jouable de Lisière ; aucune multiplication arbitraire de surface n'est justifiée par cette recherche. La lisibilité 3D, la distance de déplacement et la densité peuvent donner une impression différente à taille identique. Comparer ces paramètres avant d'agrandir ; une extension exige un intérêt ludique et des mesures simulation/worker/rendu avec le contenu cible.

La [forêt tempérée](https://rimworldwiki.com/wiki/Temperate_forest) mélange clairières fertiles, herbes, arbustes et arbres feuillus ; ce n'est pas une grille uniformément remplie de grands conifères. Ses coefficients publiés de plantes et d'animaux ne sont **pas des nombres d'arbres ou de lièvres**. Ne pas transformer directement une densité végétale en probabilité de poser un arbre sur chaque case.

Les classes [Core datées du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f), téléchargées de nouveau (`WildAnimalSpawner`, `WildPlantSpawner`, `GenStep_Animals`, `GenStep_Plants`, `GenStep_ScatterLumpsMineable`, `BiomeDef`), distinguent :

- Animaux : budget écologique pondéré, proportionnel à la surface et au coefficient du site, filtré par saison/température et conditions ; espèces, poids écologiques et tailles de groupes distincts. Le nombre d'individus varie selon la composition, pas seulement la taille de carte.
- Plantes : fertilité, habitat, concurrence, espèce, maturité aléatoire et densité locale. Les arbres ne sont qu'un sous-ensemble de la population végétale.
- Minerais : amas dans la roche admissible, fréquences pondérées, tailles d'amas et espacement. Ni saupoudrage uniforme d'objets ni stock garanti identique autour du camp.

Ces sources cadrent les contraintes, mais ne fournissent pas ici de comptage certifié du nombre d'arbres/minerais/animaux d'une carte actuelle. Aucun objectif numérique de densité n'est inventé. Les copies locales `tmp/scenario-start-reference` ne sont pas des dépendances du jeu.

## Lot de conception à intégrer après la filière alimentaire

Recommandation : consacrer un lot visible au **départ de survie cohérent** avant d'étendre massivement le catalogue. La chasse et la conservation donnent précisément les leviers nécessaires pour calibrer ce départ. Le contenu manquant du scénario doit être livré ou explicitement substitué avec un scénario nommé ; aucune migration ne doit régénérer une ancienne carte.

Le profil versionné devrait fixer scénario, population, dotation, technologies et état initial indépendamment de la seed du terrain. La génération devrait décrire biome, relief, sols, climat, végétation, géologie et écologie, puis valider les conditions de pose. Le camp n'exige pas nécessairement une solution gratuite à tous ses problèmes : contrôler l'accessibilité et éviter les impasses accidentelles sans supprimer la difficulté choisie.

Critères d'acceptation proposés : plusieurs seeds documentées, possessions exactement comptées, point d'arrivée admissible, accès raisonnable aux premières boucles, composition visuelle crédible, progression jouée sur plusieurs jours et budgets mesurés. Observer temps jusqu'à l'abri, autonomie alimentaire, distances de collecte, pénuries, blessures et coût de défense. Comparer à une référence choisie explicitement (version Core, biome, taille, narrateur et difficulté). Une colonie survivante seule ne prouve pas un équilibrage similaire.

Les mécanismes absents — saisons, maladies, prédateurs, richesse/narrateur adaptatif, notamment — empêchent encore de promettre une difficulté globale équivalente. Il faut maintenir cette différence tout en donnant au prototype un départ complet, explicable et plaisant à tester.
