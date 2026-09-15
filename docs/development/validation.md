# Validation courante — éclairage local 3D sous V36

15 septembre 2026. [Contrat](environment-lighting.md), [recherche](../research/environment-lighting-reference.md), [état fonctionnel](../gameplay/implementation-status.md). Les règles de simulation restent V36 ; [preuves de production et du pilote de trois jours](../history/validation-v36-work-environment.md) conservées avec leur date, sans les présenter comme un nouveau passage.

## Contrôles ciblés

Le dernier lot de sept tests dans cinq fichiers a passé en **2,89 s** : lumière de gameplay, topologie associée, rétention des ressources graphiques, changements de source/obstacle/toiture, restauration, dimensions 64×32 puis 32×64, projections et ciel. Aucun World modifié par le nouveau champ. La suite complète et le pilote de plusieurs jours ne sont pas relancés pour cette tranche de présentation sans modification des règles/commandes/persistance.

Le parcours natif de construction du feu, taille de vingt blocs et sauvegarde/reprise a passé en **8,9 s**. Le contrôle de pixels a passé en **6,5 s**, soit deux tests en 18,2 s avec préparation : intérieur nocturne éteint/allumé, côté extérieur d’un mur inchangé, masquage du toit, perspective, extinction et couverture à midi. Aucune erreur de page/console/WebGPU. Captures inspectées : [nuit sans feu](../../artifacts/interior-night-dark.png), [nuit éclairée](../../artifacts/interior-night-lit.png), [perspective](../../artifacts/interior-night-perspective.png).

Le premier contrôle de pixels a atteint son watchdog de 90 s : il injectait la sauvegarde après le calcul initial de disponibilité du bouton Recharger, qui restait désactivé. Injection déplacée avant démarrage, comme les autres fixtures ; timeout d’action limité à 15 s. Aucune règle produit ni assertion de couleur n’a été relâchée. La première commande Playwright sandboxée n’a pas pu créer son processus enfant ; lancement natif autorisé ensuite.

## Audit cent artisans / cent feux

[Rapport brut](../../artifacts/environment-lighting-render.json), [banc](../../scripts/environment-lighting-render-bench.mjs). **AMD RDNA-1, Ryzen 5 3600, Windows, Chromium natif, Node 24.11.1, viewport 1440×1000, carte synthétique 250²**. Production physique de 300 fragments en 6 000 blocs, pic de cent artisans au travail dans les deux passages. Le témoin retire seulement le nouveau nœud de sortie : texture/cache et règles restent identiques. Aucune charge lourde concurrente de cet agent.

| Charge | Témoin : p95 / p99 / max image | Éclairée : p95 / p99 / max image | Draw calls max, identiques |
|---|---|---|---:|
| Production à 6× | 4,3 / 8,4 / 20,8 ms | 4,3 / 8,4 / 16,7 ms | 73 |
| Pause iso | 4,3 / 4,3 / 4,3 ms | 4,3 / 4,3 / 4,3 ms | 67 |
| Pause perspective | 4,3 / 4,3 / 4,3 ms | 4,3 / 4,3 / 4,3 ms | 73 |
| LOD distant vérifié | 4,3 / 4,3 / 4,3 ms | 4,3 / 4,3 / 4,3 ms | 58 |
| Huit bascules simultanées de cent feux | 4,3 / 8,3 / 29,2 ms | 4,3 / 8,3 / 20,9 ms | 58 |

**Zéro création de pipeline pendant toutes les fenêtres mesurées**, zéro erreur GPU. L’envoi du champ ne suit pas les ticks : deux révisions depuis le lancement (petite carte puis carte 250²), ensuite exactement huit envois pour les huit bascules. Ces bascules sont un stress de présentation injecté, pas une commande du joueur. Elles réutilisent les références du terrain, comme les snapshots ordinaires.

Adoption des snapshots de production avec éclairage : p95 **2,5 ms**, maximum **3,5 ms** ; bascules simultanées : maximum **21,6 ms**. Des pointes subsistent. Le relevé précédent clonait toute la carte dans chaque mutation de diagnostic et mesurait donc aussi ces allocations artificielles ; il a été corrigé. Le LOD lointain est désormais affirmé explicitement avant la mesure, au lieu de supposer qu’un seul événement molette suffit.

Ces courtes séries sont plafonnées par l’affichage autour de 240 Hz ; elles ne démontrent ni un shader gratuit, ni une amélioration causale sur les maxima. Boucle CPU de rendu en production : p95 3,8 ms témoin, 3,5 ms avec éclairage ; ce passage seul ne prouve pas une accélération. Pas de timestamps GPU isolant le shader. Les nombres de ticks finaux diffèrent légèrement selon les lots du worker, avec les mêmes objectifs métier atteints. Les coûts de préparation restent hors fenêtres mesurées.

## Panorama naturel et compilation

[Panorama naturel final](../../artifacts/environment-lighting-overview.json), [banc](../../scripts/environment-lighting-overview-bench.mjs) : graine 42, 250², **12 411 ressources**, un feu près du camp, 430 137 triangles et **18 draw calls**, 1 200 images après chauffe. Avec et sans shader : **4,3 ms p95/p99** ; maxima 4,3 ms avec et 8,3 ms témoin. Affichage proche de 240 Hz, sans preuve de coût nul.

La [première mesure](../../artifacts/environment-lighting-overview-before.json), sans feu, relevait 12,4 ms p95 avec shader contre 4,3 ms témoin. L’exclusion spatiale/verticale seule n’a pas résolu le coût. Le [profil CPU](../../artifacts/environment-lighting-upload-diagnosis.json) a identifié les écritures de buffers ; végétation distante et roches ont été corrigées pour garder leurs allocations sans envois continus. La mesure finale inclut un feu afin que le shader reste actif localement : les premiers et derniers relevés ne sont pas un A/B de scène strictement identique. Le témoin interne de chaque relevé, lui, garde la même scène.

Contrôle natif après correction : **zéro envoi de buffers de décor pendant les 1 200 images immobiles**. Retirer puis restaurer un arbre et une cellule rocheuse envoie leurs matrices/positions/couleurs/indices à chaque modification, puis revient à zéro transfert. Cette injection teste la présentation, pas une partie jouée.

Compilation finale TypeScript/Vite réussie : 185 modules, bundle jeu 1 074,67 kB (301,73 kB gzip), worker 221,13 kB. L’avertissement existant de chunk supérieur à 500 kB reste présent ; aucune dépendance ajoutée. Le contrôle documentaire vérifie 130 documents, 1 374 liens locaux, 25 domaines et cinq familles de validation ; les trois originaux restent identiques octet par octet. Température, météo, autres sources lumineuses et ombres locales restent absentes ; le prochain lot concerne les facteurs lumineux des autres métiers et déplacements.
