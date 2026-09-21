# Performance V90 — habitat et habillement

**21 septembre 2026 : CPU et natif mesurés.** Les objets préparés
du banc restent distincts des acquisitions de la colonie. Les charges différentes
des versions précédentes interdisent de leur attribuer un gain causal.

## Périmètre de mesure

V90 ajoute des meubles de qualité, des effets de confort et de beauté, une chaîne
de confection, des politiques d'habillement, une usure quotidienne et des
remplacements physiques. La mesure doit vérifier le coût réel de ces décisions
sans modifier leur ordre, leurs règles ou leurs tirages :

1. simulation CPU séparée, avec le même état accepté et le même nombre de ticks ;
2. encodage des instantanés et coût du worker, séparés de la simulation ;
3. navigateur natif et rendu, après gel des sources servies ;
4. campagne coloniale longue, reprise depuis un checkpoint réel, avec oracles
   métier indépendants.

Les parcours CPU, natif et coloniaux restent successifs pour éviter que les
mesures se contaminent. Une campagne contrôlée peut préparer des matières ou une
recherche pour vérifier une chaîne ; elle n'est pas une mesure de progression
naturelle.

## Ce qui est mesuré et ce qui ne l'est pas encore

Le pilote de deux jours décrit dans
[`validation-habitat-apparel-v90.md`](../history/validation-habitat-apparel-v90.md)
est valide pour ses invariants métier ; il n'est pas une mesure de progression
naturelle. Le [rapport CPU](../../artifacts/habitat-apparel-cpu-v90.json) conserve
la charge complète : 100 colons, 100 lièvres, visiteurs, hygiène, énergie, feux,
habitat et vêtements. Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1 ; 100 ticks
d'échauffement sur copie séparée, 650 mesurés, encodage tous les cinq ticks.

| Coût en ms | Médiane | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| Pas simulé | 41,66 | 79,65 | 100,66 | 121,54 |
| Pas après les 20 premiers | 41,38 | 74,27 | 98,11 | 121,54 |
| Encodage | 6,57 | 14,33 | 16,59 | 18,32 |

Monde final valide, trois remplacements, cinq candidats portés, 46 vêtements
touchés par l'usure préparée. Aucune confection achevée sur cet intervalle court.
À 6×, 36 pas locaux/s imposent environ 27,78 ms par pas avant les autres coûts :
la charge mesurée ne permet pas de promettre ce débit.

Le [rapport natif](../../artifacts/habitat-apparel-render-v90.json) mesure ensuite
654 ticks en 46,899 s dans Chromium WebGPU, AMD RDNA 1, 1440×1000 : **2,324× pour
6× demandé**. L'image médiane vaut 8,4 ms, p95 33,4 ms, p99 45,9 ms et maximum
112,5 ms (3 730 intervalles). Le CPU de rendu p95 vaut 22,4 ms. Les 626 valeurs
worker sont des moyennes de pas par lot publié, pas des percentiles indépendants
de chaque tick : médiane 52,9 ms, p95 97,88 ms, maximum 209,7 ms. L'adoption des
snapshots a une médiane de 0,1 ms et un p95 de 17,5 ms.

Monde et oracles métier valides, aucune erreur navigateur, aucun pipeline créé
pendant la mesure, géométrie des personnages stable et caméra de mesure fixe.
Les appels de dessin ont un p95 de 90. Les vues rapprochées prises ensuite sont
exclues de la mesure. Les objets préparés et les besoins dégradés de ce banc ne
décrivent pas la progression naturelle de la colonie à quatre habitants.
La baisse de débit face au chiffre V89 n'est pas une comparaison isolée : la
charge est enrichie. Elle reste un problème observé, et aucune fluidité parfaite
ni amélioration globale chiffrée n'est annoncée.

| Famille | Champs attendus |
|---|---|
| Exécution | commit, schéma, commande, machine, navigateur, backend WebGPU, résolution |
| Charge | habitants, animaux, visiteurs, meubles, vêtements portés, travaux, jours/ticks |
| CPU | médiane, p95, p99, maximum par pas ; coût après échauffement |
| Worker/snapshots | médiane, p95, maximum, taille et fréquence des instantanés |
| Rendu | image p50/p95/p99, maximum, pipelines et buffers créés |
| Natif | ticks exécutés, durée murale, facteur demandé et facteur mesuré |
| Validité | erreurs navigateur, oracles métier, empreinte finale, checkpoint de reprise |

## Diagnostics à ne pas confondre

### Extinction d'une flamme partagée

Le premier banc CPU échoue sur deux états de marche sans tâche. Le diagnostic
au tick 2014 retrouve un pompier encore sur une arête capturée lorsque son
collègue éteint leur cible commune. Le retrait de la cible supprimait sa tâche
mais conservait à tort l'état `moving`. La correction remet l'activité à
`idle` et conserve le déplacement déjà capturé ; elle ne téléporte personne.
Une régression reproduit l'approche partagée et sa continuation exacte.

### Durée d'un vêtement

La durée d'un vêtement est une propriété de simulation en ticks et en jours
locaux, distincte du temps mural d'un test ou du nombre d'images rendues. Pour
chaque pièce observée, le checkpoint doit conserver son identifiant, sa matière,
son porteur, ses PV, `apparelWear.nextWearAt` et, si nécessaire, le tirage privé
correspondant. Le seuil de remplacement, un dépôt au sol et une destruction ne
doivent pas être confondus avec une simple augmentation du coût CPU.

Le pilote contrôlé de deux jours contient une pièce confectionnée et un
remplacement, mais il ne permet pas d'estimer une durée moyenne : la mécanique
est quotidienne et probabiliste. Une conclusion sur la durée demande une
campagne plus longue et plusieurs pièces, avec les tirages conservés.

## Optimisations et limites

Les candidats vestimentaires sont filtrés par catégorie, propriété et
disponibilité avant toute navigation. La vérification de visibilité des
chevets/commodes partage une grille capturée à la demande pendant le pas,
invalidée après changement de l'environnement ; les bâtiments sans effet
sur le lit sont éliminés avant calcul d'emprise. Les nouvelles couches de
vêtements utilisent les attributs des personnages GPU résidents, sans nouveau
graphe de matériau par pièce. Ces changements ne modifient pas les règles,
les priorités ni les tirages. La charge V90 ajoute des activités à V89 :
elle ne constitue pas une comparaison isolée avant/après de ces optimisations.

Les échéances persistées (`nextWearAt`, contrôles de politique et travaux) sont
les premiers points à mesurer : aucune politique ne doit être recalculée à chaque
tick ou chaque image. Les recherches de remplacement peuvent borner leurs
candidats par réserve et appliquer ensuite les réservations et la navigation
communes. Le rendu doit réutiliser les personnages GPU résidents et les données
de matière déjà projetées. Toute optimisation doit conserver l'empreinte finale,
les identités, les réservations, les tirages et la cadence de simulation ; un
saut de ticks ou une croissance accélérée serait un changement de règle.

Les coûts de beauté/confort, d'invalidation de pièce, de recherche de candidat,
de pathfinding et de création de ressources graphiques seront mesurés séparément
avant une optimisation. Une amélioration d'un p95 isolé ne suffit pas à conclure
sur le débit 6×.

## État G0–G5

| État | Niveau | Preuve et limite |
|---|---|---|
| G0 — socle et continuité | en consolidation | migrations et continuation contrôlées ; montée en charge incomplète |
| G1 — survie quotidienne | partiel | habillement et production enrichis, catalogue incomplet |
| G2 — habitat et environnement | partiel | mobilier/confort/beauté, autres pièces et biomes incomplets |
| G3 — personnages et conflits | partiel | couches et effets physiques, compétences/social/conflits incomplets |
| G4 — histoires et progression | engagé | recherche et contenu enrichis, narrateur/quête/économie incomplets |
| G5 — monde et consolidation | absent | aucun système mondial livré par ce lot |
