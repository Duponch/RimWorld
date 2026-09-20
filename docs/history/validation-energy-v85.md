# Énergie V85 — preuves du 20 septembre 2026

**V85 validée.** Base précédente : V84 `a84a919`. Le lot regroupe réseau construit, stockage, production solaire et commutation physique autour de la cuisine et du froid. [Contrat](../development/power.md), [réseau](../research/power-grid-reference.md), [batteries](../research/power-battery-reference.md), [solaire](../research/solar-power-reference.md).

## Référence et périmètre

Installation Core 1.6.4871 rev590 consultée en lecture seule, confrontée aux sources publiques et aux chapitres 10/22 du corpus, SYS/TEST-127/128 et CAT-047. Aucun fichier propriétaire ou sauvegarde personnelle brute n'est ajouté. Les documents de recherche distinguent paramètres vérifiés, anciennes versions et adaptations.

Décision du joueur : investir acier, composants et recherche dans une source solaire et des batteries, raccorder les appareils puis isoler et rétablir une ligne par intervention réelle. Invariants : aucune production avant construction, bilan de matière conservé, énergie bornée, travail exclusif au contact, anciennes cartes et connexions conservées. Le vent commun et la météo manquent encore pour l'éolien. Courts-circuits, incendie/extinction, casse générale et réparation des appareils restent absents.

Le [relevé historique](../research/colony-progression-observed.md) observe batterie à J16,74, cuisine électrique à J24,57 et solaire à J37,02 dans une ancienne partie tutoriel/Phoebe/Easy. Il motive la chaîne d'investissement ; il ne donne ni dates exactes de construction ni calendrier moyen Cassandra à imposer.

## Campagne de contrats

Campagne centrale : **54/54 contrôles dans 13 fichiers**, 15,57 s. `power-grid`, `power-battery`, `power-flick`, `power-layer-review`, `power`, `solar-power`, `construction`, `furniture-logistics`, `priority-work`, `research`, `food-workstations`, `cooler` et `player-orders`. Elle couvre emprises et superpositions, connexion retenue ou nouvelle, pont et contournement, charge/décharge, redémarrage, minification, commutation interrompue, Construction 6, recherche et vraie migration V84.

Campagne indépendante de migrations et régressions : **22/22 contrôles**, cinq fichiers (`malnutrition`, `game-profile`, `infection-save`, `site-save`, `food-crops`), 7,49 s. Les attentes ajoutent explicitement Tâches élémentaires 3 après validation de la version source ; aucune permission nouvelle n'est injectée dans les fixtures anciennes.

Campagne croisée : **57 réussites et deux attentes historiques à corriger sur 59 contrôles**, 15 fichiers, 14,40 s. Les deux échecs concernent l'ajout de priorité élémentaire attendu après migration V44 et une fixture V79 contenant déjà ce champ futur ; ils ne justifient pas d'assouplir la validation de source. Après correction des fixtures, la clôture ciblée passe **15/15 contrôles dans quatre fichiers**, 4,72 s : `health-world`, `scenario-save`, `bridge-snapshot` et `power-flick`, enrichi d'un prélèvement réel de combustible interrompu. Ce dernier prouve dépôt conservatif, refus atomique sur sol saturé, blocage automatique en attente/éteint et ravitaillement forcé distinct, avec deux continuations exactes. Ces campagnes se recouvrent : leurs nombres ne s'additionnent pas en couverture unique.

Échecs conservés et corrections :

- Le premier oracle de raccord confondait meilleur nouveau parent et parent déjà retenu. À distance carrée 13 contre 16, le nouveau choix est le conduit, tandis que l'attache historique à la batterie reste valide.
- Une interruption après dix Core de commutation libérait le colon sans remettre le court geste à zéro : sauvegarde invalide. La libération réinitialise désormais ce travail ; reprise exacte après interruption vérifiée.
- Le cache de lumière local au tick restait utilisable après extinction d'une lampe : invalidation ajoutée à l'achèvement du geste.
- Un conduit sous un cadre de mur masquait le coût physique du cadre, alors que le routeur le conservait. Les deux chemins emploient de nouveau le même ralentissement ; mur, coins, tirs, piles et cultures vérifiés dans les deux ordres d'insertion.
- La nouvelle validation de recherches supposait des paquets présents dans les anciens schémas : accès facultatif corrigé, sans rendre facultatifs les paquets des schémas qui les imposent.
- Deux fixtures contrôlées introduisaient batterie/solaire sans leur recherche ; une fixture V83 était sérialisée avec le validateur courant après suppression de champs futurs. Préparations et sérialisation historiques corrigées ; assertions de verrouillage conservées.
- La réserve de redémarrage était soustraite deux fois : une pour autoriser le groupe, une pour son candidat. Le second test utilise désormais le stock réel, comme les classes locales ; frontière exacte de 5 Wd couverte. Le blocage possible d'un producteur avec une batterie entre 0,1 et 5 Wd est documenté, pas contourné.
- Les contrôles historiques de recherche et de froid écrivaient encore leurs sorties sous V74/V75. Les nouvelles sorties sont conservées sous V85 ; les quatre références publiées ont été restaurées exactement depuis Git. Les producteurs choisissent désormais le schéma du monde pour leurs noms de sortie. L'UI de froid garde explicitement sa préparation V75 pour éprouver cette migration.

Les journaux de diagnostic locaux restent sous `tmp/power-*-v85.log`. Le nombre de contrôles n'est pas une mesure d'exhaustivité.

## Parcours de colonie et natif

`tests/fixtures/colony-v84.json.gz` est le camp Lisière effectivement obtenu à J24, pas une sauvegarde personnelle RimWorld. SHA-256 du JSON décompressé : `9bb392418c5748913d5c6a3acead5fb18e778b03bff3ea4d2ae14419a45ba298`. La migration n'ajoute que schéma 85 et priorité élémentaire 3. Préflight : commandes acceptées, vrai chantier/recherche/minage, deux continuations de 120 ticks identiques.

Le compagnon `energy-player` suit recherches, extraction et construction depuis ce camp. Critère de fin : repas électriques, nourriture réellement gelée, alimentation nocturne par batterie après extinction physique du générateur, interrupteur ouvert/fermé, conduit retiré/reconstruit et reprise. La borne de 24 jours supplémentaires est diagnostique ; aucune croissance ni recherche accélérée.

Le premier parcours a échoué à 144 250 ticks : un arbre empêchait de peindre la cellule centrale de la réserve. Le pilote renvoyait le rectangle déjà presque entièrement peint. Il désigne maintenant la coupe physique de cet arbre et interroge les cases réellement admissibles avant de repeindre. Le checkpoint et le journal d'échec sont conservés. La première reprise a été interrompue à tort sur la seule absence de messages console : Vitest les retenait, tandis que les fichiers quotidiens avaient déjà progressé jusqu'à J31. La reprise suivante utilise leurs ticks et dates, avec diagnostics intermédiaires, pour distinguer lenteur et arrêt réel. Aucune assertion de survie, de production ou de bilan n'est retirée.

**Reprise réussie : 1/1 en 550,14 s**, depuis 144 250 ticks jusqu'à **253 280 ticks, J42,21**. Le préflight corrigé depuis la fixture d'origine a aussi réussi en 3,04 s ; le parcours long reste déclaré `resumed:true`, pas une nouvelle passe monolithique. Il suit 151 commandes, 104 repas préparés dont **11 électriques**, 1 351 unités récoltées, 280 acier et quatre composants extraits. Les trois personnes restent vivantes, avec 36/36/35 ingestions, faim finale 66,7–69,2 et repos 76,3–78,1. Les bilans bois/aliments/métaux et continuations de 120 ticks aux jours et transitions passent. [Rapport de colonie](../../artifacts/energy-colony-v85.json).

Jalons réellement observés : batteries à 194 204 ticks (J32,37), solaire à 241 680 (J40,28), denrées gelées à 243 250, alimentation nocturne pendant 120 ticks confirmée à 249 685, interrupteur ouvert à 249 822 puis circuit rétabli à 252 100, conduit retiré à 252 318 et reconstruit à 252 680. État final : réserve à −5 °C, batterie 600 Wd, panneau 1 700 W, générateur physiquement arrêté, interrupteur fermé. Le réseau continue 600 ticks après reconstruction. L'horizon initial J48 n'a pas nécessité d'extension ; recherche et soins après raid gardent leurs durées normales. SHA-256 du monde final : `514086e50ea7a571dbdc8e5540e5c9cdcaa8113cc3dba51a7e06d69df1611fa3`.

La fixture UI prépare explicitement matériaux et recherches presque achevées, puis exige les clics du pilote commun et le travail ordinaire. Le passage à la nuit est un checkpoint de frontière déclaré, séparé du parcours naturel.

**UI native : 1/1 réussi, 52,1 s**, Chromium/WebGPU, deux colons, carte contrôlée 32², fenêtre 1440×1000, aucune erreur console/GPU. Recherches terminées au bureau, construction des quatre nouvelles familles et d'une lampe, un toit réel sur 16 cellules, demande de coupure sauvegardée avant exécution à 1×, fermeture à 6×, retrait/reconstruction du conduit sous mur et reprise exacte. La nuit contrôlée garde la lampe alimentée, solaire 0 W, réserve de 48,2989 à 47,8789 Wd. [Rapport](../../artifacts/power-native-v85.json).

Le premier parcours a échoué à l'oracle du pilote : la désignation de toiture était acceptée, mais le helper attendait par défaut une zone de culture. Le helper vérifie maintenant chaque case de toiture et l'absence de l'ordre opposé ; l'assertion de construction effective du toit est conservée. Le parcours complet a ensuite été rejoué. Les pipelines GPU restent à 30 pendant les nouvelles constructions ; le compteur final atteint 31 après les étapes suivantes. Ce contrôle ne prouve donc pas l'absence universelle de compilation tardive.

Captures inspectées : [réseau de jour](../../artifacts/power-day-v85.png), [réserve nocturne](../../artifacts/power-night-v85.png), [toiture partielle](../../artifacts/power-roof-v85.png), [câble sous le mur](../../artifacts/power-under-wall-v85.png).

## Charge et clôture technique

Le banc `ENERGY=1 VALIDATION_VERSION=v85` mesure 3/30/100 colons et autant de lièvres, activités alimentaires, recherche, solaire/batterie et appareils réels. CPU, natif et pilote long ont été successifs, sources servies gelées pendant le natif. Matériel : Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1 ; Chromium/WebGPU natif, adaptateur AMD RDNA-1, 1440×1000. La description précise du GPU n'est pas exposée par l'adaptateur. [CPU](../../artifacts/energy-cpu-v85.json), [worker/rendu](../../artifacts/energy-render-v85.json).

| Colons / lièvres | Tick CPU p95 / maximum | Image native p95 / maximum | Moyenne de lot worker p95 | Débit observé |
|---|---|---|---|---|
| 3 / 3 | 3,38 / 11,84 ms | 12,4 / 29,2 ms | 5,10 ms | ≈5,93× |
| 30 / 30 | 20,17 / 60,06 ms | 29,2 / 66,6 ms | 24,70 ms | ≈5,81× |
| 100 / 100 | 56,78 / 127,70 ms | 16,7 / 54,2 ms | 64,72 ms | ≈3,76× |

CPU : 650 ticks par charge après 100 ticks de chauffe séparée ; encodage tous les cinq ticks, p95 3,38/7,83/7,85 ms. Natif : 90 images de chauffe, 668/659/665 ticks réellement avancés, 2 764/1 166/4 275 intervalles d'image ; temps total incluant clics et pause pour le débit ci-dessus. Le p95 worker porte sur des moyennes de lots publiés, pas sur chaque tick indépendant. Adoption des snapshots p95 0,8/4,8/10,3 ms. Aucun état invalide, erreur console/GPU, échec des résultats métier ou pipeline tardif pendant les fenêtres mesurées ; géométrie des personnages conservée.

Le cadrage englobe toute la charge et reste fixe ; 3/30/100 centres de personnages sont encore visibles en fin de mesure. Les niveaux de zoom diffèrent entre effectifs : l'image p95 plus basse à cent acteurs ne prouve pas une meilleure fluidité générale. [Vue complète à cent](../../artifacts/energy-load-v85-100.png) et [détail des ateliers hors mesure](../../artifacts/energy-stations-v85-100.png) inspectés. Les chambres, cultures, batteries et panneaux sont présents. Charge synthétique, pas une colonie autonome : malnutrition initiale contrôlée et ateliers fournis sont explicités dans le protocole. Les charges diffèrent de V79/V84 ; aucune amélioration comparative chiffrée n'est déduite. Le débit 6× n'est pas tenu à cent acteurs, et les pointes CPU/navigation restent à traiter.

Typage et build réussis ; le build conserve l'avertissement de chunk principal supérieur à 500 kB (1 188,30 kB minifié, 339,03 kB gzip), sans en déduire un coût de jeu mesuré. Contrôle documentaire réussi : 305 documents, 3 238 liens locaux, 25 identifiants de domaine, cinq familles et trois originaux byte-identiques. Durées précisément mesurées : reprise naturelle 9 min 10 s, UI 52,1 s, campagnes courtes consignées ci-dessus. Les durées globales de recherche/implémentation n'ont pas été instrumentées ; aucun gain de cadence n'est revendiqué. L'interruption évitable du pilote a ajouté environ quatre minutes de travail rejoué.

## État de livraison

UI native, reprise naturelle, contrôles métier/migrations, typage, build et charge ont réussi dans les limites ci-dessus. G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent. Ce lot avance G2 et ses interfaces avec G1/G4 sans fermer un jalon entier. Éolien, incidents électriques, incendies/extinction, saisons, commerce, prisonniers et monde global ne sont pas livrés par V85.
