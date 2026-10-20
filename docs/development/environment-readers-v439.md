# V439 — lectures locales de l’environnement

20 octobre 2026. Schéma263 inchangé. Premier lot du [mandat de complétion Core](core-completion-plan-20261020.md) : réduire les lectures coûteuses du dossier Besoins sans changer règles, cadence, commandes ou sauvegardes. Ce lot consolide l’existant ; il n’ajoute pas de mécanique et ne ferme pas l’objectif200FPS.

## Résultat et périmètre

Les inspections de pièce, plante, chauffage, refroidisseur et case lisent directement leur température courante au lieu de construire une Map de toutes les cellules thermiques. Le lecteur ponctuel consulte les listes originales à chaque appel, sans cache d’horloge ou d’identité ; les listes publiques non triées, éditions au même tick et priorité de la dernière région restent celles de `TemperatureView`. Les lecteurs groupés de simulation sont conservés.

La propreté de l’inspection réemploie la topologie fraîche de son environnement. Son oracle reste `CleanlinessCapture` : les contributions des pièges, bacs hydroponiques et scories ne sont pas remplacées par celles de `RoomQualityCapture`, qui diffèrent déjà sur ces termes.

Le cache de qualité retient une seule pièce et les valeurs de ses contributeurs effectifs, dans leur ordre d’addition. Les changements éloignés ne reconstruisent plus son score. Sols, ponts et toits édités en place, qualité/dégâts/fleurs, saletés, scories/cadavres, propriétaires, arbres, cadres et paquets sont relus. Changer de pièce ou de topologie recrée le résultat depuis le World courant ; aucun ancien World n’est retenu. Le cas scorie est distingué par sa valeur consommée et corrige l’ancienne signature limitée au `kind` de la pile.

Les collections sont encore parcourues pour filtrer les contributeurs. Rôles, éclairage, propreté et une partie de la géométrie gardent leurs coûts existants ; aucun index spatial général ou journal de transport supplémentaire n’est livré. Les panneaux masqués gardent leur garde V438.

## Mesures isolées

Lecture Node sur les trois sauvegardes publiques exactes, sans tick ou commande, huit échauffements puis32lectures par variante en ordre alterné. Témoin issu du HEAD V438 `c13755ca`, copies privées avec seuls imports rebasés. Les deux variantes sont dans la même passe ; ne pas comparer directement avec le premier témoin préparatoire `baseline.json`.

| Référence, cellule sélectionnée | CPU moyen avant→après | p95 avant→après |
|---|---:|---:|
| Forges335,63/94 extérieur |6,635→4,275ms|8,789→5,720ms|
| Aulnes10733,139/120 |1,928→1,254ms|2,131→1,491ms|
| Éclaircies1730,135/142 |1,685→1,055ms|2,324→1,435ms|

Textes strictement égaux et sérialisation entière inchangée sur les trois mondes. Le lecteur thermique ponctuel est comparé au lecteur groupé sur chaque case de chaque carte. La température seule coûte en moyenne0,446→0,011ms sur Forges dans cette passe. Rapport `tmp/hud-point-v439/candidate.json` ; scripts et copies privées conservés dans le même dossier.

Chrome155 Windows, contrôle Browser Use, même Forges335/80colons/241animaux/1778piles immobile, huit échauffements puis32lectures avant/après alternées avec le vrai DOM :

| Case | CPU moyen avant→après | p95 avant→après |
|---|---:|---:|
| Extérieur63/94 |4,366→3,128ms|5,3→3,8ms|
| Chambre42/47,25cases |13,509→7,084ms|17,6→8,8ms|

Les deux panneaux sont strictement identiques et les mondes inchangés. Chambre affichée :21°C, propreté−0,20, beauté−2,28, impression−14,1, richesse527,7, espace31,4, lumière50%. Capture inspectée dans Browser Use ; résultats transcrits du rapport visible dans `tmp/hud-point-v439/browser-results.json`. Ce sont des mesures CPU de lecteurs sur un monde statique, **pas les FPS du jeu, la vitesse physique, le GPU ou le coût complet du HUD**. Elles ne sont pas comparables directement aux fenêtres V438 en simulation.

## Contrôles et limites

- Groupe initial :17PASS/8RED en29,06s. Sept rouges anciens concernent registres de migrations, horloges de détérioration et projection de snapshot. Leur comparaison sur une archive exacte du HEAD précédent donne les **mêmes sept échecs**,6PASS/7RED en22,29s. Aucun validateur assoupli ; la suite élargie n’est pas annoncée verte. Premier lancement du témoin refusé avant tests par chemin de configuration doublé, puis chemin absolu corrigé ; rapports conservés.
- Le huitième rouge était un nouveau scénario essayant de déposer de la saleté sur un mur, action normalement refusée. Le scénario teste désormais un mur diagonal bois→marbre : beauté+1 et propreté inchangée, sans affaiblir l’assertion de frontière. Groupe ciblé12PASS en18,24s ; après correction du remplacement d’un champ readonly dans cette fixture, ses six cas sont rejoués et acquis en13,71s. Aucun code produit changé par ces deux réparations de test.
- Les tests comparent les scores complets à `RoomQualityCapture`, y compris mutations locales/distantes à tick constant et changement de World avec même topologie. La lecture ponctuelle est confrontée à `TemperatureView`, y compris régions chevauchantes et réordonnées. Zéro mutation du World exigée.
- Typage puis build Pages acquis ensemble ; build Vite6,96s. Premier typage refusé sur le champ readonly de la fixture, réparé sans changement de contrat.
- Vrai jeu ouvert depuis les menus : Les Forges en pause, dossier Besoins d’Eden, environnement ouvert, passage×1 puis pause, Bio puis retour Besoins. Température actuelle0,9→1,3°C et lumière87→92% visibles ; aucune erreur console relevée. Le premier clic Robin n’a pas ouvert de dossier ; la sélection d’Eden et les étapes suivantes sont acquises, sans cause attribuée à ce premier clic. Les captures sont inspectées dans Browser Use. Aucun débit physique, FPS global ou parcours entier de sauvegarde n’est revendiqué par ces gestes.
- Le premier serveur local était inaccessible depuis le navigateur à cause des sockets du bac à sable ; relance locale autorisée hors bac puis accès acquis. Aucune protection de navigateur modifiée. Sources produit gelées durant les contrôles graphiques, empreintes dans `frozen-sources.json`.
- Horloge, bridge, interpolation et phases de travail inchangés : contrôle de présentation et campagne longue non rejoués. Aucune sauvegarde publique/personnelle modifiée. Revue indépendante du diff : aucun défaut actionnable identifié.

## Suite

La consolidation apporte une économie CPU locale et deux invalidations plus précises, sans annoncer de confort général rétabli. Le prochain lot fonctionnel retenu est la géothermie : recherche et placement sur geyser existant, construction payée, courant utile, chaleur sans double émission, pannes/réparation, retrait et continuation. La recherche Core1.6.4871 et les recoupements Internet sont préparés sous `tmp/geothermal-v440/research.md`, sans mécanique ou progrès rétroactif crédité. Les six ensembles du mandat restent actifs.

## Livraison

Commit, paquet, publication et vérification distante restent à consigner après leur acquisition.
