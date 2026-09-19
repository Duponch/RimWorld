# Conservation au froid — confrontation du 19 septembre 2026

Périmètre V75 : recherche, appareil à deux faces, provision réellement transportée et conservée, panne et reprise de vieillissement. L’hypothermie est une dépendance de l’accès humain au congélateur ; cela ne livre pas l’hiver, la totalité des lésions thermiques ou l’électricité détaillée.

## Provenance et décisions

Corpus relu : chapitre 22 « Température et électricité », scène E du chapitre 32, chapitres 10/14/15 ; feuille Systèmes et Tests, **SYS/TEST-023..025, 077, 126..128**. Adopter séparation air/occupation, deux faces et interruption des appareils ; adapter horloge, recherche et graphes à notre moteur ; différer stockage électrique, câbles, pannes de composants, météo générale. Les liens généraux/annonces associés à ces lignes ne prouvent pas les coefficients. Les propositions de tests enrichissent les parcours existants.

Sources confrontées, aucune n’est une exécution du jeu original :

- [Cooler, wiki communautaire](https://rimworldwiki.com/wiki/Cooler) : acquisition, coût, fonctionnement, blocages et destruction. Page encore marquée partiellement incomplète. Coûts recoupés par les définitions historiques ci-dessous.
- [Building_Cooler, miroir daté](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Building_Cooler.cs), [placement](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PlaceWorker_Cooler.cs), [thermostat](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/CompTempControl.cs). Commit du 20 mai 2026, assembly indiqué 1.6.9438.38202 ; ne certifie pas toutes les branches de la [mise à jour officielle 1.6.4850 du 8 juin](https://ludeon.com/blog/2026/06/update-1-6-4850-released/).
- [Buildings_Temperature.xml historique](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings/Buildings_Temperature.xml) et [recherches électriques](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ResearchProjectDefs/ResearchProjects_2_Electricity.xml), septembre 2018 : provenance ancienne annoncée, jamais assimilée à un export actuel.
- [Hypothermie humaine, données publiées](https://rimworldwiki.com/wiki/Hediffs/Core/Global/Temperature/Hypothermia), [température confortable minimale](https://rimworldwiki.com/wiki/Minimum_Comfortable_Temperature), [HediffGiver_Hypothermia daté](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/HediffGiver_Hypothermia.cs) et [définition historique des stades](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/HediffDefs/Hediffs_Global_Temperature.xml). Distinguer le ralentissement des insectes, qui a d’autres effets.

## Règles retenues et incertitudes

Appareil 1×1 solide et non transportable, 90 acier + 3 composants, 1 600 ticks Core de construction, compétence Construction 5. Recherche Climatisation 500 points, prérequis Électricité. **Scénario adapté : bases électriques déjà connues**, cohérent avec les générateurs/lampes disponibles depuis V42. La climatisation reste à rechercher ; pas de déblocage rétroactif gratuit. Ce n’est pas la distribution technologique exacte du scénario Crashlanded.

Consigne initiale 21 °C, bornée −273,15..1 000 ; contrôle direct ±1/±10/réinitialisation. Alimentation 200 W quand l’appareil refroidit, 20 W au repos. Un obstacle plein à une face bloque le fonctionnement ; piles, mobilier franchissable et porte fermée ne sont pas un mur. Les plans d’ouvrages solides empêchent aussi la désignation initiale dans ces directions.

Le miroir calcule l’efficacité `max(0, 1 − max(Thot − Tcold, Thot − 40)/130)`, multiplie le flux nominal de 21 unités/s et restitue 125 % du flux demandé à la face chaude. Le wiki résume l’arrêt par un seuil chaud de 165 °C : **ce seuil unique ne reproduit pas la formule**. La formule datée est retenue, désaccord conservé. La chaleur rejetée utilise le flux demandé même dans le dernier pas limité par la consigne. Deux faces dans la même pièce peuvent donc la réchauffer. Air extérieur = réservoir imposé, pas de volume froid persistant dehors.

**Adaptation temporelle :** intégration par pas local (10 ticks Core), comme nos autres sources, au lieu de `TickRare` tous les 250 ticks Core. Cela évite un thermostat à une autre horloge que l’air local mais ne prétend pas reproduire ses oscillations numériques. Réseaux directs V42 réutilisés, sans conducteurs supplémentaires. Modèle des échanges/pièces V38 conservé, aucune simulation CFD.

Hypothermie : au-dessous du confort minimal −10 °C, augmentation toutes les 60 ticks Core, `max(.00075, écart × .0000645)` ; au-dessus du confort minimal, diminution `clamp(.027 × sévérité, .0015, .015)`. Bande intermédiaire neutre. Seuils .04/.20/.35/.62, décès à 1. Capacités, douleur et manipulation appliquées à l’anatomie existante ; la jauge peut coexister avec un coup de chaleur. Isolation vestimentaire V74 réutilisée. **Gelures localisées >.37 sous zéro présentes dans la source mais non livrées ici** ; ajout requis avant de considérer l’exposition froide complète. Ni terrain chauffant ni profils non humains n’existent encore.

## Recul sur le pilote

Premier parcours rouge : une réserve générique de deux cellules s’est remplie de bois ; les repas laissés dehors ont pourri. Le test a gardé son assertion de conservation. Politique corrigée en réserve alimentaire de neuf cellules, dimensionnée aux piles réelles. Deux autres attentes de fixture ont été corrigées : une case de porte non couverte peut être un refuge thermique valide ; une récupération de .4 n’est pas instantanée. Les preuves distinguent ces erreurs de scénario des corrections du moteur.
