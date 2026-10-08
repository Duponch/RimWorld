# Bilan des performances — 8 octobre 2026

Point demandé par l'utilisateur après plusieurs jours d'optimisation. V263 est clos au stade de qualification privée partielle ; le produit reste V242 `b92c2fb1`, schéma 198. Arrêt après le commit de ce bilan, aucun nouveau lot ni reprise autonome avant un nouveau signal humain. La relance automatique reste en pause ; aucun push.

## Résultats acquis

Le gain le mieux établi sur une comparaison cumulative directe est **107,822→143,640 images RAF/s (+33,22 %), CPU d'image 5,498→3,780 ms (−31,24 %)** entre V225 et V233. La vitesse source reste presque identique5,9224→5,8928× ; les règles, qualité et population sont conservées. Moyenne des p95 CPU19,60→13,45 ms, mais décodeur p956,65→7,55 ms défavorable. [Preuve cumulative et protocole](autonomous-performance-2026-10-06.md).

Ce total ne couvre pas toute la période : V224/V225 sont déjà dans A, et V241/V242 arrivent après B. Aucun avant/après unique V224→V242 n'est disponible. Les pourcentages ci-dessous proviennent de bancs distincts et **ne s'additionnent pas**.

| Livraison | Modification effectivement intégrée | Résultat mesuré et limite |
| --- | --- | --- |
| [V224](validation-aulnes-performance-v224.md) | Sièges/écrans et premières consolidations de la référence | Simulation26,705→23,618 ms/tick Aulnes(−11,6 %), mixed sans gain ; aucun gain FPS stable. |
| [V225](validation-snapshot-presentation-v225.md) | Journal des changements confirmés et composition des publications sautées | RAF64,375→70,859/s et CPU image9,953→8,911 ms dans ce banc local. |
| [V227](validation-plant-presentation-events-v227.md) | Agenda végétal exact | Candidat final93,334→98,105 RAF/s(+5,11 %) ; pointes et froid parfois défavorables. |
| [V228](validation-scene-decoding-performance-v228.md) | Registre strict collectif et index de scène | Autre vue colonie96,915→107,816 RAF/s(+11,25 %), CPU5,521→4,830 ms ; froid Aulnes défavorable. |
| [V229](validation-scene-reconciliation-v229.md) | Captures végétales conservées et signatures entières | Deux cycles locaux+6,88/+7,07 % RAF ; une pointe B51,4 ms demeure. |
| [V230](validation-scene-render-core-v230.md) | Core séparé de l'hôte DOM | Préparation structurelle livrée, aucun gain FPS stable propre démontré. |
| [V233](validation-resource-structural-presentation-v233.md) | Journal structurel et consommateurs par ID | Deux cycles GAME112,094→116,125 RAF/s(+3,60 %), CPU4,699→4,416 ms ; décodeur moyen défavorable. |
| [V241](validation-furniture-resident-v241.md) | Mobilier résident, mises à jour des pots ciblées | Événements communs12,7–14,7→2,5–3,4 ms ; aucun gain FPS moyen établi. |
| [V242](validation-natural-scene-v242.md) | Présentation naturelle sans liste intermédiaire entière | Paire plus comparable113,75→120 RAF/s(+5,49 %), source5,086→5,125× et application11,569→10,672 ms. |

Les deux cycles complets V242 trouvent+5,64/+12,88 % RAF, mais avec doses et états de chauffe différents ; la paire plus comparable ci-dessus est plus prudente. Les chargements froids et certaines pointes ne progressent pas partout. Ce sont des optimisations générales dans les lecteurs/couches communs, sans sélection spéciale des Aulnes ; leur bénéfice varie selon carte, état et caméra.

Les mesures citées utilisent Chromium headless/WebGPU matériel AMD,1920×1080/DPR1, des chauffes3s et fenêtres8s. Le cumul cadre104/89/zoom2 ; les GAME récents129/122/zoom1. Elles ne certifient ni les FPS de la fenêtre utilisateur, ni240Hz, toutes les vues ou un vrai6× durable. Aucun total CPU de tous les threads ne se déduit du CPU moyen d'image.

## GPU et coûts encore ouverts

**Aucun gain GPU global avant/après n'a été validé et livré dans cette campagne.** Le [diagnostic V231](validation-render-throughput-attribution-v231.md) trouve environ3,48–3,52 ms par image dans les passes GPU connues à6×, p95environ4,06–4,13 ms. Uploads, utilitaires non chronométrés et compositor sont hors cette somme. Ce diagnostic est un niveau de coût, pas un gain ; le temps CPU passé dans Three.js n'est pas du temps GPU.

Les [profils MAIN V258](validation-main-v8-attribution-v258.md) conservent encore des coûts dans la préparation du rendu, l'application de scène et le lecteur strict. Les [vrais ticks V253](validation-source-step-attribution-v253.md) coûtent22,808 ms en moyenne instrumentée, dont acteurs10,098 ms. Ces profils sont taxés, pris dans des fenêtres distinctes, avec parents parfois imbriqués : leurs temps ne s'additionnent pas en budget par image.

Le passage à6× augmente le travail de simulation et les changements à transmettre/décoder/appliquer. [Le moteur](../../src/sim/types.ts) vise6ticks locaux/s à1×, donc36à6× : budget moyen27,78 ms/tick source. Le rendu dispose d'une autre horloge ;240images/s exige une période4,167 ms et des pointes courtes. Worker source, MAIN et GPU ont chacun leurs limites et peuvent se chevaucher. Un cœur saturé ou des interruptions MAIN suffisent à réduire les FPS même si le pourcentage CPU global reste modéré. L'écart pause/6× est cohérent avec un coût CPU important ; il ne prouve pas seul une saturation exclusivement CPU ou l'absence de régression dans la configuration utilisateur.

## Rendement des derniers lots

La dernière optimisation intégrée est V242, le6octobre au soir. V243–V263 sont des diagnostics ou prototypes privés, **aucun FPS supplémentaire livré**. Des économies isolées ont disparu ou se sont inversées dans le jeu complet : [V250](validation-source-mutation-v250.md) réduit le circuit source Aulnes mais RAF−0,68 % ; [V255](validation-source-room-capture-v255.md) augmente la vitesse source d'environ13 % et réduit RAF d'environ7 %.

Le temps écoulé ne signifie donc pas que les principaux problèmes sont résolus. Une part importante a été consacrée à la qualification, aux réparations d'observateurs et à des pistes finalement écartées. Ces travaux protègent l'exactitude et renseignent les causes, mais leur rendement récent en performances effectivement livrées est faible. La cible240FPS/6× reste ouverte ; aucune nouvelle campagne n'est engagée à la clôture.

## Pourquoi certains jeux supportent de fortes accélérations

Le nombre de contenus ne mesure pas le coût d'un tick. Des moteurs évitent de revisiter les entités inactives, planifient leur prochaine échéance, regroupent les données, réutilisent des requêtes/index et séparent simulation et affichage interpolé. La [documentation Godot](https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/physics_interpolation_introduction.html) explique cette séparation entre ticks et images ; elle existe déjà partiellement dans Lisière.

Un exemple primaire concret : [Factorio FFF421](https://www.factorio.com/blog/post/fff-421) rapporte des roboports passant1→0,025 ms/tick en cessant de les mettre à jour inutilement, et des robots planifiés/interpolés améliorant une sauvegarde d'environ15 %. Le même billet décrit une tentative de parallélisation qui consomme davantage de CPU sans accélérer globalement la partie, à cause du débit mémoire. Factorio rencontre lui aussi un plafond de vitesse. Ces exemples montrent le poids de l'architecture, sans fournir de facteur transférable à Lisière ou autoriser une réduction de ses règles/cadences.

Un réglage×100 ne garantit pas cent fois la même simulation précise à coût faible. Certains moteurs changent le pas de temps ou agrègent les systèmes ; [Unity documente explicitement](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-timeScale.html) le lien entre accélération, nombre de mises à jour et pas fixe. Les conséquences sur précision et règles dépendent du jeu. Les fortes accélérations restent limitées par la charge et le matériel.

## Langage et décision à discuter

TypeScript est effacé en JavaScript ; ses annotations ne constituent pas une surcharge de calcul à l'exécution. [Documentation TypeScript](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types). V8 compile le JavaScript fréquent en code machine optimisé ; il ne se limite pas à l'interpréter. [Documentation V8/Maglev](https://v8.dev/blog/maglev).

C++ offre une meilleure maîtrise du stockage mémoire, des allocations et du parallélisme pour construire un cœur natif performant. Cela peut ouvrir une marge réelle, mais traduire les mêmes parcours/copies et appels de rendu ne garantit pas un gain suffisant. Même [Epic](https://dev.epicgames.com/documentation/unreal-engine/balancing-blueprint-and-cplusplus?application_version=4.27) distingue les coûts de logique susceptibles de profiter de C++ des appels moteurs coûteux qui demeurent après traduction. Ce parallèle ne constitue pas un benchmark JavaScript/C++ de Lisière.

Python pur sous CPython ne serait pas mon choix pour accélérer ces boucles. La [FAQ officielle Python](https://docs.python.org/3/faq/programming.html#my-program-is-too-slow-how-do-i-speed-it-up) recommande d'abord algorithmes et structures, puis extensions compilées pour les limites du Python pur. Un moteur natif piloté depuis Python peut être rapide, mais son travail lourd bénéficie du code natif.

Aucun prototype C++/Rust/WebAssembly/Python comparable n'a été mesuré ici : aucun facteur de gain ou équivalence «AAA» n'est démontré. Mon avis est que le flux de données simulation→MAIN→scène reste un problème architectural important, auquel s'ajoutent les coûts du runtime et du rendu. Une décision de migration gagnerait à comparer un noyau représentatif complet, avec son transport et ses reprises, avant de réécrire tout le jeu. **Cette étude n'est pas lancée : discussion et nouvelle autorisation d'abord.**

Sources Internet consultées le8octobre2026. Les [preuves de clôture V263](validation-core-physical-qualification-v263.md) détaillent les treize paires exactes et la différence restante après redimensionnement ; aucun coût complet, GAME, adoption ou nouveau gain n'en est déduit. Les62références/65fichiers publics restent exacts ; aucun contenu, règle, qualité ou schéma n'est changé.
