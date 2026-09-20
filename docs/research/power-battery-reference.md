# Stockage électrique et recherches — V85

Enquête du 20 septembre 2026, **intégration V85 validée**. Le [contrat électrique](../development/power.md) et les [preuves V85](../history/validation-energy-v85.md) distinguent les règles, le parcours observé et leurs limites. Ni parité électrique complète ni autonomie universelle de colonie ne sont annoncées.

## Corpus et provenance

Corpus : chapitre 22 (production, consommation, stockage, réseaux et coupures distinctes), chapitre 10 (matériaux transportés, cadres, travail physique), SYS127/TEST127 et SYS128/TEST128. Décision : adopter les invariants ; adapter l'arithmétique ; différer les pannes sans système causal. Les statuts du corpus ne sont pas des preuves locales. Le lien Odyssey de SYS128 n'établit pas les coefficients Core.

Source primaire : installation **RimWorld 1.6.4871 rev590**, `Data/Core/Defs/ThingDefs_Buildings/Buildings_Power.xml`, `Data/Core/Defs/ResearchProjectDefs/ResearchProjects_2_Electricity.xml`, classes `RimWorld.CompPowerBattery`, `CompProperties_Battery`, `CompPower`, `PowerNet`, `Building_Battery`, `ShortCircuitUtility`, `MinifiedThing`, `Verse.Thing`, `ThingWithComps`. DLL SHA256 : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Lecture seule ; aucune publication d'XML, code décompilé ou sauvegarde brute.

Recherches web renouvelées : [Battery](https://rimworldwiki.com/wiki/Battery), [Power](https://rimworldwiki.com/wiki/Power), [publication officielle 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/). Le wiki recoupe les valeurs principales mais reconnaît des lacunes sur les détails d'exécution de Power. La publication officielle documente un correctif antérieur, sans garantir les coefficients de 4871. Les nombres adoptés viennent des définitions/classes locales.

Les observations [Solar panels and batteries: number nerdiness](https://ludeon.com/forums/index.php?topic=1212.0), de 2013, et [B18 Vanilla-Friendly Battery Expansion](https://ludeon.com/forums/index.php?topic=37236.0), de 2017–2018, restent datées. Cette dernière mentionne 50 acier/1 000 Wd pour la batterie d'alors, contre 70 acier/600 Wd dans la version installée. Aucun rythme moyen actuel n'est tiré de ces récits. L'[enquête V42](power-reference.md) reste historique, fondée sur d'autres versions.

## Valeurs effectives

| Propriété | Core local 1.6.4871 | Lisière |
|---|---|---|
| Emprise | 1×2 | Adoptée, rotations cardinales |
| Coût | 70 acier, 2 composants | Livraisons physiques |
| Construction | 800 ticks Core, aucun seuil Construction dans la Def | 80 ticks locaux neutres |
| Traversée | PassThroughOnly, coût 50 Core | Coût 5 locaux ; pas d'arrêt |
| Capacité | 600 watt-jours | Adoptée |
| Rendement entrant | 50 % | Pas de seconde perte à la décharge |
| Fuite | 5 W continus | 5 Wd par jour de simulation, même emballée |
| Débit maximal | Aucun plafond additionnel dans le composant | Capacité et énergie disponibles limitent le transfert |
| Batteries | 400 points, Electricity préalable | Projet `batteries` |
| SolarPanels | 600 points, Electricity préalable | Projet indépendant `solar-power` |

Le défaut de classe `CompProperties_Battery` est 1 000 Wd ; la Def concrète le remplace par **600**. Le seul constructeur aurait fourni un mauvais chiffre. La construction ne crée aucune charge.

Electricity fait déjà partie des connaissances initiales du profil Atterrissage forcé. L'ancien camp accède historiquement au générateur et à la lampe sans arbre électrique. V85 conserve cet accès global partiel ; les nouveaux projets exigent leur travail propre, sans prérequis inventé de bureau avancé ni progression migrée.

## Partage et représentation

Un Wd est l'énergie fournie par un watt pendant un jour, distincte des watts et des watt-heures. Core compte 60 000 ticks par jour ; Lisière 6 000, avec dix frontières électriques Core par tick local.

Le surplus se partage également entre batteries admissibles, puis se redistribue lorsqu'une se remplit. Le déficit se partage entre batteries non vides, puis se redistribue lorsqu'une se vide. Il n'y a pas d'égalisation spontanée des niveaux au repos. L'énergie sortante ne repasse pas par le rendement de charge.

Core distingue batteries et appareils producteurs/consommateurs. Le démarrage progressif emploie les périodes de 30 à 200 ticks Core selon les candidats ; le délestage se produit aux frontières de 20 Core. Avec des batteries et au moins 0,1 Wd dans le réseau, le contrôle de redémarrage réserve 5 Wd. Une faible réserve peut donc maintenir une lampe déjà allumée sans pouvoir la redémarrer.

Lisière persiste `BatteryState.stored` en unités entières de **1/120 000 Wd** ; capacité 72 000 000. À chaque frontière Core, un surplus W ajoute W unités après rendement ; un déficit W prélève 2W unités ; chaque batterie perd au maximum 10 unités. Le potentiel solaire est arrondi au watt entier avant ce bilan. L'ordre stable tournant distribue les parts indivisibles sans nouveau tirage du PRNG historique. Conservation exacte au quantum, sans prétendre reproduire les flottants, epsilon ou mélanges Unity bit à bit. Les réseaux historiques sans nouveau contenu gardent leurs frontières et ordre de tirage.

## Transport et risques distincts

La batterie transmet même vide. Batterie et solaire ne possèdent pas de composant d'interrupteur individuel : une isolation volontaire passe par le réseau. Un générateur arrêté reste aussi transmetteur.

La minification conserve l'objet intérieur et son énergie. `Thing.DoTick` fait progresser le contenu détenu, sans suspension propre à `MinifiedThing`. La fuite continue donc dans le paquet. Lisière la compte une fois par batterie, placée, emballée au sol ou portée ; pause sans ticks = aucune fuite. Caravanes et contenants suspendant le temps ne sont pas livrés.

Les classes locales distinguent casse vidant la batterie, EMP temporaire, flamme pouvant amorcer une batterie de plus de 500 Wd, court-circuit de pluie nécessitant plus de 100 Wd et incident du réseau pouvant vider toutes les batteries quand l'une dépasse 20 Wd. Ces seuils ne prouvent pas la fréquence de pluie ou du narrateur, non auditée ici.

Pluie, casse, EMP, feu, fusibles, explosions et incidents électriques restent **différés**. Aucune panne arbitraire ne les remplace dans V85. Toits naturels et transfert électrique entre cartes restent également absents.

## Persistance et vérification

V84 est validée avant migration additive V85. Aucun appareil, charge, projet ou passé n'est créé. Nouveaux états refusés dans les versions sources antérieures ; énergie entière bornée, portée uniquement par une batterie ; paquet déconnecté ; recherche correspondante exigée.

Les contrôles regroupent frontières vide/plein, rendement, fuite, réserve de redémarrage, coupures, minification/transport, reprises exactes et recherches indépendantes. Les résultats des campagnes centrales, vrais clics et mesures appartiennent à l'historique du lot ; l'existence d'un scénario ne vaut pas son succès.
