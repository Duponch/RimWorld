# Faune affamée et départ physique — preuve V186

Relevé du **3 octobre 2026**, schéma **174**. Sources fonctionnelles après la consolidation graphique `62fa938`, avant le commit V186 ; [contrat](../development/wildlife-exit-v186.md), [recherche Core](../research/wildlife-exit-core-v186.md) et [stratégie](../development/testing.md). V186 ouvre une décision écologique pour les animaux existants, sans prédateur, reproduction sauvage ou suivi hors carte.

## Contrôles métier et continuation

La passe finale ciblée passe **77/77 tests dans dix-sept fichiers** en environ **14,93 s** : nouvelles transitions, migration/reprise, scénario public, faune/diversité, santé/mêlée/chasse, cadavres, domestiques, réservations, inspection et catalogue. Le dernier refus de forme `food > 0` a ensuite été ajouté après revue ; les **10/10 contrôles des trois nouvelles familles V186** repassent en **4,17 s**. Les quatorze autres familles ne sont pas rejouées après cette seule garde de sauvegarde.

Les témoins vérifient nourriture éloignée prioritaire avec ingestion au contact, aliment inaccessible et enceinte fermée, une seule recherche pondérée, obstacle ajouté pendant la route, retour vers un aliment nouvellement accessible, fin physique du segment d'arrivée, sommeil déjà engagé, domestiques et dangers. Ils préservent récupération de coup, matière, IDs et compteur de sortie, y compris à la limite numérique. Le schéma 173 est validé strictement avant migration neutre ; les champs de sortie futurs sont refusés. Un delta incohérent au même tick ne remplace pas le World témoin.

Deux reprises de préparation sont distinguées du produit : une attente historique de nouveau sommeil à nutrition nulle contredisait la priorité Core de sortie et a été actualisée, sans changer les assertions de sommeil déjà engagé ; une enceinte d'un nouveau test recouvrait des colons de préparation, désormais retirés de cette fixture dédiée. Aucun accès distant ni seuil assoupli. Le lanceur Vitest initial bloqué par `spawn EPERM` n'avait pas exécuté les contrôles ; les passes ci-dessus utilisent les sous-processus autorisés.

## Catalogue et navigateur

La nouvelle entrée **« Faune affamée · 3 colons »** est la **37e scène préparée**, carte 32², fichier `public/test-saves/v186/faune-affamee.json`, SHA-256 `d1e6d0b1228d62a16d2d4d0735e9cb3434658740680bd50caba88bea6736a8cf`. Le générateur est comparé exactement au JSON public. Il ne précrée ni route de sortie ni départ et relocalise les piles alimentaires existantes dans une réserve fermée, sans quantité supplémentaire. Le scénario poursuit les vraies transitions de `stepWorld`, avant et après sérialisation. Les anciens fichiers publics conservent leurs versions et empreintes ; seul le compte du catalogue devient commun aux contrôles concernés.

**Chromium natif, WebGPU : 1/1 parcours, 20,8 s au total**, sources servies gelées. Chargement par les menus réels, liste de 37 choix, départ à ×1 puis sauvegarde à **tick 2**, reprise exacte en marche et sortie observée à **tick 77**, sans cadavre ni disparition du lièvre sain ou du domestique. L'activité explique la sortie dans Faune et l'inspection. Capture inspectée : animal sélectionné, anneau et panneau lisibles. Aucune erreur observée ; les avertissements Three TSL inline préexistants sont distincts d'une erreur de parcours. Ce test n'est ni une campagne naturelle ni une mesure GPU ou une certification du matériel de rendu.

Sorties courantes sous `tmp/test-runs/wildlife-exit-v186-20261003/` : `artifacts/wildlife-exit-v186-browser.json`, `artifacts/wildlife-exit-v186-walking.png` et `browser/.last-run.json`. Les cinq anciens parcours natifs modifiés uniquement pour le compte de catalogue ne sont pas rejoués ; leurs assertions métier et fixtures restent conservées.

## Compilation, présentation et documents

`npm run build` passe : typage TypeScript et Vite, **639 modules**. Une première tentative termine sur le blocage de sous-processus `spawn EPERM` après le typage ; la reprise autorisée compile. L'avertissement de chunk supérieur à 500 ko reste présent.

`npm run test:presentation` passe ensuite, seul, sur **250²**, minage **7 808 images**, abattage **7 746 images** ; p95 RAF **6,1 / 6,2 ms**. Aucun saut, excès de trajet continu ou occupation solide observé, vitesses 6/1/3 vérifiées par le banc normal. Rapport `tmp/test-runs/wildlife-exit-v186-20261003/artifacts/harvest-sync-verification.json` et journal `presentation-log.txt`. Ce contrôle transversal n'est pas une mesure comparative de la nouvelle sortie animale.

`npm run check:docs` passe après intégration : **642 documents / 6 101 liens locaux**, six en-têtes au schéma 174, 25 domaines et cinq familles préservés, trois originaux strictement identiques. `git diff --check` passe. Le lot sépare d'abord cadrage/recherche, puis implémentation et contrôles courts ; compilation, banc CPU, navigateur et présentation sont successifs. Les reprises de préparation et de permissions décrites ci-dessus n'ont pas déclenché de campagne exhaustive.

## Sous-coût CPU isolé

Le banc `scripts/wildlife-exit-bench-v186.ts` exécute **successivement**, après compilation et avant navigateur, un premier tick animal sur terrain préparé plat **250×250**, nutrition nulle au centre. **AMD Ryzen 5 3600**, quatre échauffements et douze valeurs chronométrées par population. Clonage hors chronométrage, hashes de sources gelés, deux témoins préparés indépendants et continuation sérialisée exacts, World validé ; la seconde décision conserve le budget d'une recherche globale par tick.

| Animaux préparés | Premier tick animal p50 | p95 |
| --- | ---: | ---: |
| 1 | 10,38 ms | 24,54 ms |
| 64 | 10,47 ms | 16,30 ms |
| 256 | 12,82 ms | 15,09 ms |

Rapport courant `tmp/wildlife-exit-bench-v186.json`. C'est le coût de `advanceWildlife` dans un cas artificiel affamé ; il inclut une recherche vers le bord, pas seulement le booléen d'intention. Aucune comparaison avant/après, campagne naturelle, mesure du tick complet, worker, adoption, CPU image, RAF, GPU, mémoire ou gain de FPS n'en est déduite. Le rendu réutilise les lots animaux existants, mais cela ne prouve pas un coût général nul.

## Portée

Recherche Core, implémentation, réparation d'oracles et validation restent distinctes. La sortie au bord le moins coûteux, les contrôles alimentaires espacés et l'attente des récupérations sont des adaptations documentées. Régression exhaustive, campagnes naturelles longues, navigateur exhaustif et prédation complète ne sont pas exécutés/livrés par ce lot. Les mesures et contrôles graphiques de la consolidation `62fa938` restent une preuve séparée, pas un résultat V186.
