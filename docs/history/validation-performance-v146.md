# Profil CPU et publication du worker V146 — 28 septembre 2026

Le schéma reste 144. Ce lot mesure la reprise d'une même colonie mixte et retire une recapture inutile au moment où le worker publie un tick. Il ne change ni une décision de la simulation, ni la sauvegarde, ni les lots GPU. Le code de départ est `7f9bb9a` ; la modification locale de largeur d'herbe déjà présente dans `GpuGroundGrassLayer.ts` est extérieure à ce lot et reste hors de ses commits.

## Charge et séparation des mesures

La sauvegarde `public/test-saves/v98/mixed-100.json` (SHA-256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`) contient une carte 250², 104 personnes et 100 animaux au tick 2 000. Sa migration stricte du schéma 91 au 144 est hors chronométrage. Les temporaires et le cache npm sont sur E:. Les relevés locaux utilisent Node 24.11.1 sur Ryzen 5 3600, 20 ticks de chauffe puis 60 ticks consécutifs. [`profile-worker-v146.ts`](../../scripts/profile-worker-v146.ts) distingue `stepWorld`, captures, encodage et clone structuré d'un message par tick. Ce clone Node n'est qu'un substitut partiel à `postMessage` ; il ne mesure ni sa file, ni l'adoption du navigateur, ni le rendu ou le GPU. La publication réelle est commandée par l'horloge et les phases, et peut publier moins ou davantage de messages que ce protocole local.

Avant la retouche, le profil local non instrumenté donnait, en moyenne par tick, **54,43 ms** pour `stepWorld`, **1,56 ms** pour deux captures de phases, **0,21 ms** pour deux captures de mouvement, **8,00 ms** pour l'encodage et **9,64 ms** pour le clone substitut. Les p95 par tick respectifs étaient 77,94, 1,95, 0,38, 13,18 et 12,10 ms. Ce ne sont pas des termes à additionner pour obtenir un FPS. Une autre répétition de l'ancien code a donné `stepWorld` à 45,38 ms en moyenne : la machine et les états de chauffe varient suffisamment pour interdire une attribution naïve à un petit changement.

Le profil CPU instrumenté de ce même scénario, limité aux échantillons attribués à `stepWorld`, place `advanceWildlife` vers **24,6 %** du temps échantillonné, `planWork` vers **17,0 %**, la température de surface vers **7,1 %**, la cuisine vers **6,8 %** et la sortie de transit vers **6,1 %**. `wildlife-navigation.route` représente environ **13,7 %** de `stepWorld` dans ce prélèvement, sans être pour autant un gain disponible : la recherche et ses coûts dominent la sélection finale d'une cible. Ces pourcentages proviennent d'un profil CPU échantillonné, pas d'une somme exhaustive ni d'une mesure GPU.

## Changement conservé

À chaque tick confirmé, le worker capture déjà le mouvement et la signature de phase. Il répétait exactement ces deux captures avant l'envoi, sans mutation du monde entre les appels. La voie de publication de tick utilise désormais l'état capturé ; les requêtes (`init`, `load`, commande, changement de vitesse, sauvegarde, `resync`) conservent une capture fraîche au même tick. L'ordre et le nombre des messages, révisions, checkpoints et segments de mouvement sont inchangés. Dans les profils locaux distincts à un message par tick, la somme des captures descend d'environ **1,77 à 0,88 ms par tick**, ce qui correspond à la suppression du second passage ; l'écart de temps total entre ces exécutions **ne** constitue **pas** une preuve de gain de débit du jeu.

Sur le code final, sans les essais de navigation, les 60 ticks donnent `stepWorld` **49,92 ms** de moyenne et **76,64 ms** de p95 ; capture de mouvement **0,11 ms**, capture de phases **0,77 ms**, encodage **7,60 ms**, clone substitut **8,23 ms**, total local **66,68 ms** en moyenne. Ces coûts sont ceux de ce protocole volontairement plus dense en messages que le vrai worker. Ils confirment le travail restant dans la simulation et l'encodage, sans isoler un gain global par rapport aux exécutions précédentes.

## Essais écartés et limites

Deux raccourcis CPU ont été mesurés puis retirés. La déduplication des objectifs et le remplacement du tri final dans la route animale préservaient les chemins comparés, mais le microbanc alterné sur objectifs alimentaires réels variait selon le cas : ratio médian nouveau/ancien d'environ **0,84 à 1,19**. En navigateur, un A–B–B–A court donnait aussi un dernier témoin ancien plus rapide que les candidats dans une vue ; l'ordre et la chauffe dominent le signal. L'inversion des prédicats du stationnement préservait les 4 518 résultats sondés, mais huit lots alternés prenaient **104,69 ms** contre **68,79 ms** pour l'ancien ordre : le rejet rapide des empreintes lointaines était déjà moins cher. Aucun de ces essais n'est conservé dans le produit.

L'encodage examine encore exactement les 62 500 tuiles et les quelque 11 000 ressources de la scène. Une sonde stabilisée situe ces balayages à environ 2,60 et 1,94 ms de médiane ; éviter la comparaison par simple identité raterait des mutations en place. Retirer `home` du message n'a montré aucun gain dans une courte comparaison. L'encodeur reste inchangé. Le débit ×6 général et 240 FPS restent ouverts ; la prochaine optimisation devra partir d'un sous-coût isolé, préserver l'égalité des snapshots décodés et résister à un A–B–B–A sur la même charge.

## Mesures natives et contrôles

Deux passes Chromium/WebGPU de la version finale utilisent les scènes `iso-near` et `iso-wide`, vitesse demandée ×6, trois secondes de chauffe **en pause** puis cinq secondes de mesure par scène, sur le même serveur et la même sauvegarde. Elles ne portent pas de timestamps GPU. Le débit observé varie sensiblement entre passes :

| Vue | Débit atteint A / B | p95 `stepWorld` déclaré A / B | p95 CPU image A / B |
| --- | --- | --- | --- |
| Iso proche | ×2,51 / ×2,08 | 83,67 / 86,32 ms | 21,90 / 24,70 ms |
| Iso large | ×1,95 / ×2,92 | 115,08 / 81,05 ms | 18,70 / 19,50 ms |

Les quatre phases se terminent sans erreur navigateur ou GPU rapportée. Ces fenêtres comprennent la reprise et n'établissent ni une amélioration de débit due au changement, ni une cadence soutenue. Les rapports complets restent sous `tmp/performance-audit-v140-v146-final*.json` ; les versions antérieures de ce diagnostic sont conservées sous `tmp/` et les écarts A–B–B–A sont la raison de la conclusion bornée.

Les tests ciblés worker/bridge passent **11/11** dans quatre fichiers ; les contrats de stationnement/navigation sondés avant retrait de leur essai passent **14/14**. La régression finale hors campagnes longues passe **275/275 fichiers, 1 179 tests réussis et un microbanc optionnel sauté** (`tmp/regression-v146.log`). Le parcours natif `npm run test:presentation` passe pour minage et abattage, sans saut ni occupation solide ; le build avec typage passe. Le contrôle documentaire final passe sur **515 documents et 5 132 liens locaux**, avec six en-têtes au schéma 144 et les trois sources originales intactes. Les campagnes naturelles longues de V145 ne sont pas déduites de ces contrôles.
