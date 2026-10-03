# Validation V197 — continuité de poursuite en mêlée

Correction du combat existant, sans nouveau contenu ni migration ; schéma **182**. Recherche, diagnostic produit, réparation des pilotes et contrôles exécutés sont distingués ci-dessous. Les sources Core sont décrites dans la [recherche](../research/melee-pursuit-core-v197.md), les invariants dans le [contrat](../development/melee-pursuit-v197.md).

## Signalement et reproduction préparée

Le joueur décrit un assaillant à mains nues qui s’arrête régulièrement derrière un colon blessé dans « Colonie avancée ». La sauvegarde publique `public/test-saves/v98/colony-v90.json` a été lue sans modification : conteneur SHA-256 `cdb9785ac60965254a57aea3dbe97b7568f738926511635026d497bfaa2d5a2a`, contenu décompressé `7025d79c235224b789ae4361974a2a7c81952cfd920b927a748b442939d93a03`, identique au manifeste. Son checkpoint initial ne contient aucun raid actif. La continuation jouée par l’utilisateur n’est pas disponible ; le diagnostic n’est donc pas une reprise de son assaillant exact.

La reproduction commune prépare une piste ouverte 96² en journée, tick 3000, écart de huit cellules. Deux contusions réelles de 13 PV aux jambes produisent une capacité de mouvement **0,47**, contre **1** pour le poursuivant sain. Ensuite mouvements, fuite, budgets, décisions, attaques et sauvegardes suivent les vrais systèmes. La variante de vitesse égale retire les blessures avant le début du témoin ; aucune vitesse ou santé n’est corrigée pendant la course.

| Scène préparée | Ancien code avant correction | Code corrigé |
| --- | --- | --- |
| Tactique désarmée, cible blessée | Aucun coup en 180 ticks ; mouvement 26,67 % ; 89 ticks immobiles malgré début de trajet sûr. | Premier coup au tick 45 ; mouvement 96,09 % ; zéro attente indue de préfixe. |
| Raid désarmé, cible blessée | Aucun coup en 180 ticks ; mouvement 45,69 % ; 98 ticks immobiles malgré début de trajet sûr. | Premier coup au tick 45 ; mouvement 96,09 % ; zéro attente indue de préfixe. |
| Raid face à une fuite civile | Aucun coup en 180 ticks ; 98 attentes de préfixe sûr. | Premier coup au tick 45 ; mouvement 96,09 % ; zéro attente de préfixe. |
| Raid, écart de quatre | Aucun coup en 80 ticks ; 31 attentes de préfixe sûr. | Premier coup au tick 21 ; mouvement 91,63 % ; zéro attente de préfixe. |

Ces délais décrivent seulement ces pistes, pas un délai universel de rattrapage. La validation finale stricte est vide dans chaque diagnostic. Traces sous `tmp/v197/pursuit-diagnostic-baseline.json` et `pursuit-diagnostic.json` ; aucune preuve historique n’est réécrite.

## Deux causes produit, tests et oracles

`processMelee` confondait destination obsolète et début de trajet impraticable : le délai de recherche bloquait le pas disponible. La première correction laisse exécuter les pas sûrs sans consommer de nouvelle recherche et libère le délai après le dernier pas d’une route réussie. Un échec conserve sa temporisation. Un prochain pas bloqué libère la route ; conserver cette route avec l’état idle aurait violé la validation des mobilisés, défaut trouvé et corrigé pendant les nouveaux contrôles.

Le témoin sain à vitesse égale a ensuite trouvé une seconde cause, même après le premier correctif : la révision tactique effaçait l’engagement et le trajet mais conservait un délai de recherche. Immobilité de **17,76 ticks** ; occupation de mouvement 78,54 % sur 120 ticks. La révision effective conserve maintenant l’engagement si la cible reste la même ; sous budget ou délai elle est différée sans bloquer le trajet sûr. Le témoin final parcourt des arêtes durant **119/120 ticks, soit 99,17 %**, sans attaque inventée et avec écart final 8,06 cellules. Une échéance de révision n’est pas une requête exécutée : l’oracle compte séparément les revues effectives et vérifie aussi le mouvement au-delà de l’échéance différée.

Les anciennes poursuites à mains nues visaient une cible immobile ; le témoin mobile concernait un tireur. Leurs assertions de contact ou de blessure finale laissaient passer ces attentes. La [stratégie de tests](../development/testing.md) explicite désormais la nécessité d’observer les intervalles entre arêtes et leurs causes physiques.

Le nouveau fichier `tests/melee-pursuit-v197.test.ts` couvre quatre contrôleurs, route courte, absence de budget, délai actif, blocage cardinal/diagonal, recherche inaccessible et temporisation, récupération, continuation exacte, vitesse égale et révision même cible avec budget zéro/une unité. **13/13 passent**, puis **11 échouent et deux passent** lorsqu’un plugin temporaire charge les deux anciens modules du commit `f4ac8ee`. La preuve rouge n’écrase pas les sources de travail. Logs sous `tmp/v197/` ; les préparations de fixture et corrections d’oracle sont détaillées dans `tmp/v197-tests-notes.md`.

## Contrôles de livraison

**83 tests uniques dans quinze fichiers passent par reprises**, pas une régression exhaustive. La première exécution donne 78 réussis et cinq échecs de migrations anciennes ; la reprise des cinq fichiers réparés passe **29/29**, puis le nouveau fichier après correction de typage passe **13/13**. Les autres fichiers couvrent mêlée, tirs automatiques, raids/arrivées, barrières, animaux, bagarres sociales, portes, mobilier et mouvement. Logs `tmp/v197/targeted-regression.log`, `legacy-replay.log`, `new-tests-final.log`.

La cause commune des cinq rétro-fixtures est indépendante de la poursuite : le helper pré-V79 conservait la permission alimentaire `red-fox-meat` introduite au schéma178. Le helper de test la retire ; chacun des cinq tests réinjecte explicitement cette permission et exige toujours le refus de sa version33/59/60/66/67. Aucun validateur de production, oracle métier ou payload historique n’est assoupli. La lecture typée de l’attaque après `stepWorld` corrige aussi une inférence TypeScript `never` dans le nouveau test, sans changer son assertion de contact.

**Build et typage passent**, 679 modules transformés, 1,62 s de bundling ; `tmp/v197/build-final.log`. L’avertissement historique de gros bundle demeure. Deux relectures indépendantes des règles de cible, arme, récupération et budget n’ont pas identifié de nouveau défaut ; cela ne remplace pas les exécutions.

**Chromium matériel WebGPU préparé : 1/1 passe**, à 1× puis 6× dans un même pilote de 33,2 s (commande36,0 s). Le geste UI normal donne la destination, la sauvegarde/reprise a lieu pendant une arête, puis le test attend le contact réellement présenté avec pose de coup. Le rendu est observé dans les attributs GPU existants et l’horloge de scène ; recevoir un snapshot ne suffit pas à valider la chronologie.

| Vitesse | Checkpoint repris | Horloge de poursuite avant coup observée | Hiatus rendu maximal | Images observées |
| --- | ---: | ---: | ---: | ---: |
| 1× | tick3008 | 42,61 ticks | 0,0252 tick | 2 003 |
| 6× | tick3011 | 43,22 ticks | 0 | 400 |

Les deux tentatives sont confirmées au temps local **+44,3 ticks (443 ticks Core)** et deviennent visibles vers +45, après fin de l’arête de l’assaillant à +44,2426. Distance graphique au contact ≈1,28 cellule ; aucun coup pendant une arête engagée, trace non saturée et aucune erreur navigateur. L’approche locale de pose n’est pas confondue avec un segment de carte. Rapport, checkpoints et captures sous `tmp/test-runs/v197-native/artifacts/`. Ces images ne mesurent ni les FPS ni le coût GPU général.

**Présentation250² minage/abattage passe** : 10 784/10 638 images, p95RAF4,3ms pour les deux, zéro saut brut/corrigé, excès de déplacement continu ou occupation solide. Les fenêtres alternent les vitesses6/1/3 ; sortie `tmp/v197/presentation.log`. Ce contrôle porte sur les phases et segments des travaux existants, séparément du pilote de poursuite ; il ne mesure pas une campagne générale de combat.

## Performance et périmètre

Aucun renderer, attribut GPU, buffer, atlas ou shader n’est changé. Les recherches restent budgétées et temporisées ; le mouvement utilise les arêtes capturées existantes. Les tests de budget assurent qu’un préfixe exécuté ne déclenche pas une recherche par tick. Ce constat de structure ne mesure pas le coût CPU complet : une poursuite désormais active peut exécuter plus de pas que son témoin défectueux immobilisé. Aucun gain général, coût GPU nul, campagne naturelle ou parité exhaustive de l’IA n’est établi. Aucun payload public ni fixture historique n’est régénéré.
