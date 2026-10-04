# Validation V206 — repas de survie renouvelables

Lot du 4 octobre 2026, schéma **188**, baseline **f2b6d62**. [Contrat](../development/packaged-survival-v206.md), [recherche Core 1.6.4871 et adaptation](../research/packaged-survival-core-v206.md). Production unitaire du `survival-meal` existant ; parent Pâte nutritive et distributeur, recette par quatre et cuisine/caravanes exhaustives restent différés. Ce préalable omis localement est une adaptation explicite, pas une règle Core.

## Simulation, sauvegardes et reprises

**147 scénarios ciblés uniques dans 24 fichiers passent par reprises**, dont **17 nouveaux cas dans quatre fichiers** rejoués sur les sources finales. Le premier ensemble a exécuté 138 cas/23 fichiers avec deux échecs de préparation ; les rapports `tmp/v206/world-b.json`, `persistence-b.json` et `targeted-final.json` remplacent les résultats des fichiers repris. Le dernier ensemble passe **65/65 dans six fichiers**, incluant les 17 nouveaux cas, snapshots et bruitages. Décompte dédupliqué : `tmp/v206/targeted-summary.json`. Aucune suite exhaustive ou campagne naturelle supplémentaire n'est annoncée.

Recherche physique sur bureau simple et avancé alimenté, sélection/pause/reprise, coût 500 points et absence de multi-analyseur obligatoire sont exercés. La recette respecte recherche, Cuisine 7/8, cuisinières, quotas indépendants de six protéines et six végétaux, lait et piles distinctes, fraîcheur, accès, combustible et réservations. Collecte, staging, transformation, comptage de facture et dépôt ont lieu réellement. Saturation, annulation et restitutions n'accordent aucune ration ; un ingrédient pourri ne devient pas un repas impérissable.

Le scénario préparé à faim 65 fabrique réellement trois rations depuis 36 crus, les dépose, les fait charger à Mina, garde son identité et ses vêtements hors carte, consomme **une** ration pendant le circuit puis rend les **deux** restantes. Les reprises après sortie et ingestion sont exactes. Un autre flux PRNG préparé à 1 déclenche la contamination **à la vraie finition** ; sa fusion dans le lot stocké conserve la fraction et le chargement de reconnaissance est refusé atomiquement. Aucun état de sortie n'est nettoyé ou doté pour réussir ces contrôles.

Le premier témoin sain employait le flux issu de la génération et obtenait une contamination extérieure réelle de 1/3 ; son attente « sain » était incorrecte. Le flux **0x12345678** est désormais explicitement préparé pour ce couloir et la scène publique, tout en gardant les vrais tirages de cuisson et le témoin contaminé séparé. L'ordre de construction initial était refusé parce que les bois restaient au sol : le pilote commande maintenant leur **livraison physique**, avant de placer la cuisine en file. Aucune règle de matériaux ou contamination n'a été assouplie.

Le schéma 187 est strictement validé avant migration neutre. Les nouveaux projets, factures, tâches et ordres sont refusés sous 187, y compris poste emballé ; les rations historiques déjà acquises restent permises sans recherche. Recherche future, progression impossible, clés supplémentaires et ordres numériques sont contrôlés. Sauvegardes pendant collecte, travail, sortie et chargement poursuivent exactement état et PRNG.

Une relecture indépendante a identifié la garde bridge initialement limitée à recherche/version : les quotas 5+7 auraient été acceptés dans un snapshot courant. La garde V206 vérifie désormais station/facture, enveloppe, quotas, phases/progrès et produit unitaire porté, avec tests de checkpoints et deltas au même tick, ancien World inchangé et adoption valide suivante. Elle reste **bornée au nouveau contenu** ; validation intégrale des réservations, capacités de dépôt/stockage, sources et conflits d'acteurs appartient au validateur de sauvegarde. Aucune prétention de validateur bridge culinaire exhaustif.

## Parcours réel et présentation

**Chromium matériel WebGPU 1/1 passe**, version **153.0.8010.12**, AMD **rdna-1**, sans fallback logiciel. La candidate 32² est importée par le menu réel avant publication. Travail, Recherche, Architecte/réserve, facture et Monde/reconnaissance déclenchent les transitions ; aucune mutation du World depuis le navigateur ne remplace les actions du joueur.

Recherche achevée au tick **3071**, cuisson observée au tick **3116** avec six riz et six viandes placés et progrès **7040**. Trois rations saines sont produites, déposées puis chargées physiquement ; départ hors carte au tick **3499**, retour au tick **5000** avec trois rations. Les besoins de la scène sont préparés à 100 : **aucune consommation de voyage n'est revendiquée dans ce parcours natif**, distinct du scénario CPU à faim 65. Sauvegarde/recharge exactes pendant cuisson, chargement, sortie et circuit. Rapport `tmp/test-runs/v206-native-a/artifacts/packaged-survival-v206-native.json`.

Géométries résidentes mobilier **505** et acteurs **624** conservées, pipelines **76→76**, aucune erreur relevée. Cette stabilité ne mesure pas le temps GPU. Captures iso/perspective inspectées dans le même dossier : pile rendue au sol, compteur de trois repas/2,7 nutrition, modèles et UI cohérents.

`npm run test:presentation` passe sur carte **250×250**, minage et abattage observés chacun 45 s : **10 765/10 636 images**, aucun saut, excès de trajet ou occupation solide détectés. RAF p50 **4,2/4,2 ms**, p95 **4,3/4,3 ms**, p99 **4,3/8,2 ms**. Rapport `tmp/test-runs/v206-presentation/artifacts/harvest-sync-verification.json` ; ces parcours temporels ne prouvent pas les FPS généraux.

## Publication et compilation

La **52e** scène publique **« Repas de survie · production et voyage »** prépare trois adultes, ingrédients, combustible, infrastructure existante et **498/500** points de recherche, sans ration, facture, chargement ni voyage accompli. Sa préparation ne prouve ni autonomie naturelle ni acquisition complète du projet. SHA du payload : `52d1d9f86933e94b25458afba76e3866079f62a057378ed7266c80d099c0d377`.

Les **51 entrées et payloads historiques restent byte-identiques** au commit f2b6d62. **52 payloads** passent décodage strict, hash du manifeste, sérialisation exacte et un tick réel repris (`tmp/v206/payloads.json`), séparément de toute campagne. Typage et build TypeScript/Vite passent après intégration, **702 modules** (`tmp/v206/build-final.log`). L'avertissement historique de chunks supérieurs à 500 kB demeure. Les liens/en-têtes courants suivent le schéma 188 et les trois sources originales restent byte-identiques ; les preuves historiques ne sont pas réécrites. La régression périodique et le pilote commun acquis en V204 ne sont pas annoncés comme rejoués.

## CPU et limites

Microbanc successif après navigateur, sources gelées, Node **24.11.1**, Windows, **AMD Ryzen 5 3600**, scène historique **250²**, 104 humains, 670 structures et 266 piles. A/B/B/A, quatre tours, huit lots par variante, **49 propositions** chacune ; accès indépendants préparés hors chronométrage. Les plans, budgets, signatures de lots, World et PRNG restent exacts face au commit f2b6d62. Rapport `tmp/v206/cpu.json`, outil `scripts/benchmark-packaged-survival-v206.ts`.

Moyenne des lots : baseline **212,60 ms**, V206 **221,70 ms**, soit **+4,28 %** sur ce seul sous-coût ; médianes **212,81/215,07 ms**, p95 **241,77/269,59 ms**. Cette observation unique et dispersée ne démontre ni cause robuste, ni coût de tick général, ni gain. Elle porte sur les factures historiques : la baseline ne sait pas proposer la nouvelle recette. Aucun correctif spéculatif du solveur n'est appliqué à partir de ce seul signal.

La nouvelle garde partagée parcourt réellement les entités à chaque publication. Mesure **absolue séparée** sur la même scène sans contenu V206, 10 000 chauffes et 32 échantillons de 5 000 appels : p50 **0,00920 ms**, p95 **0,01002 ms** par garde. Ce résultat exclut adoption complète, tâche V206 active, worker, CPU image et GPU. La recette réutilise les lots/VFX/sons existants ; aucune affirmation de coût supplémentaire nul ou d'accélération générale.

Recherche, implantation, correction produit de la garde, réparations des préparations/oracles et exécution des contrôles sont distinguées. Les sorties restent sous `tmp/`, sans réécriture des preuves ou payloads historiques. Après livraison et commit local, attendre une nouvelle relance en mode jour.
