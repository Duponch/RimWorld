# Reprise productive et nouveau raid V367

La même campagne continue du vrai75566 au vrai85531. Le retrait de l’assaillant précédent est désormais attesté, les soins de l’infection de Gaël ont réellement lieu et les coupes reprennent après réglage des priorités. Le bois disponible au sol atteint141. **Batteries n’a encore aucun point et aucun élément de l’annexe n’est payé** : le troisième raid naturel interrompt le parcours avant cette progression. Ce lot ajoute un pilote QA opt-in et sa preuve partielle, aucune nouvelle mécanique produit.

## Parcours réel, sans reprise favorable

Chaque continuation part de l’export réellement produit par la précédente. Les trois rouges, leurs sauvegardes et leurs ledgers interdits restent conservés ; une revue ROOT distincte autorise seulement le nouveau mandat. Origine75566 et horizon111566 sont maintenus, sans remise à zéro du budget après un arrêt.

| Entrée → conservation réelle | Faits acquis | Contrôle ROOT |
| --- | --- | --- |
| 75566 →79065 | Quatre arbres désignés, sans coupe achevée. Sortie physique de l’assaillant2 en1190 au76481. Nouvelle infection du torse de Gaël née79040, détectée79049 ; Iris commence spontanément le soin. | Chrome/WebGPU RED152,892s, body132,638s/overall147,354s ; export non rechargé, gel2985 exact. |
| 79065 →81148 | Tâche héritée d’Iris conservée, médicament19963 pris dans19678 puis infection traitée79227, qualité1000. Léonie termine sa cuisine puis commence le chop19888, progress94 à l’issue. | PASS153,895s, body133,914s/overall148,637s ; deux exports/recharges exacts, gel2987 exact. |
| 81148 →84190 | Bois78→124 constaté81222 ; douze plans de murs créés. Soins, repas et repos ordinaires continuent. Aucun frame entièrement payé, aucun bâtiment neuf. | PASS154,485s, body134,603s/overall149,426s ; export/recharge exact, gel2990 exact. |
| 84190 →84405 | Gaël nourri au lit84402 ; garde conservatrice à faim12,493 d’Iris au84404. Elle est déjà en ingestion physique, progress48/50, avec son vrai repas19935. | RED47,565s, body26,422s/overall41,860s ; conservation non rechargée, gel2993 exact. |
| 84405 →85531 | Même ingestion achevée84407, repas disparu, faim100 ; coupes d’Iris et bois141. Raid3 arrivé85500 : un nouvel assaillant20141, encore loin au sud. | RED77,534s, body57,144s/overall71,976s ; entrée84405 exportée/rechargée exactement, conservation85531 non rechargée, gel2988 exact. |

Les cinq parcours enregistrent erreurs[] et lifecycle[]. Quatre exports sont effectivement rechargés :79065,81148,84190,84405. Sept captures larges sont inspectées ROOT. L’entrée75566 et les entrées déjà rechargées ne reçoivent aucun crédit supplémentaire par leur simple import. Le contrôleur de trois fenêtres successives s’arrête au premier rouge05 ; les fenêtres06/07 ne sont pas lancées.

Le raid3 est un événement légitime, pas un défaut de recherche. Les originaux restent vivants, sans nouvelle blessure pendant ces continuations. Gaël reste blessé et infecté ; l’immunité à son maximum chez le visiteur ne suffit pas à déclarer sa disparition clinique. Aucune guérison globale ou récupération de l’ancienne branche V344 n’est créditée.

## Priorités, matière et soins

Iris avait Culture1 et Foresterie2 ; Léonie Cuisine1, Foresterie2, Construction2 et Recherche3. Les quatre désignations seules ne rendaient donc pas la coupe prioritaire. Le pilote règle positivement Foresterie1/Construction1 de Léonie pour la phase bois, puis Construction1/Foresterie2 pour l’annexe. Cuisine1, Médecin1, Culture2, besoins et tâches déjà engagées sont conservés. Les sources `work-types`, `work-planner` et `engine.priority` montrent que ces réglages positifs ne libèrent pas la cuisine courante ; aucune compétence ou règle n’est augmentée.

Les premiers vrais progrès de chop, leurs réservations et les hausses de bois sont consignés avant le seuil120. Une hausse nette de quantité n’est pas requalifiée en chaîne complète de rendement et transport : productionLineageQualified reste false. Les matières des visiteurs ne financent pas l’annexe. Le tabouret19695 demeure emballé, les douze plans ne deviennent pas des murs construits dans le bilan et les anciens dégâts ne sont pas effacés.

Iris n’est pas réordonnée pendant son soin79065 ; Gaël ne reçoit aucun ordre de travail. Les médicaments sont réellement consommés par les soins ordinaires, sans exiger une quantité coloniale invariante. Le dernier instant idle de Léonie au84405 n’était pas un blocage démontré : planCooldown17 après le nourrissage84402 correspond au délai20 de libération du service. Aucun correctif moteur n’est déduit de cette seule observation.

## Réparations de pilote et contrôles

La garde faim≤12,5 était une précaution QA, plus stricte que la malnutrition du jeu. Au vrai84405 elle refusait Iris alors que le cargo alimentaire lui appartient déjà et que l’ingestion atteint48 des50 unités requises. La reprise corrigée garde un plancher strict>10 et autorise seulement une ingestion ou un nourrissage physiquement en cours : positions et cargo exacts, progrès monotone, GAP≤8, stagnation≤16ticks et fenêtre absolue160ticks persistée. Aucun trajet, pickup, recherche de nourriture ou simple réservation ne bénéficie de l’exception. Les autres gardes de danger, santé et patrimoine restent actives. Le repas hérité ne qualifie pas une nouvelle chaîne source complète ; son achèvement seul est observé84407. INGEST_TICKS vaut50, FEED_TICKS75 ; les unités de soin progressent par10 par tick local et restent distinctes.

Les diagnostics roulants sont séparés de l’autorité : les16 derniers samples ne rendent plus le ledger causal tronqué. Actions, segments et observations de recherche sont bornés sans suppression de reçus ; le dépassement interdit une continuation. La capacité de recherche16384 remplace256 pour ne pas perdre la preuve pendant un projet long. L’ancien drapeau truncated du rouge01 reste littéral : l’audit établit que seuls les diagnostics avaient tourné, pas ses quatre actions et son segment. Le nouveau mandat enfant conserve la référence exacte à ce parent.

Guard et observation restent exécutés après la dernière pause, avant tout export/recharge ; la finalisation ne désactive que bornes et modulation de vitesse. Un nouveau bâtiment doit avoir son frame physiquement payé observé et un ID distinct de celui du chantier. Le plan de l’annexe préserve la cuisinière et le champ : coin rentrant124116, lampe prévue123116. Le ravitaillement manuel garde destination.forced et le lien au vrai ordre UI ; un trajet automatique engagé doit finir avant de couper son automatisation.

ROOT exécute les contrôles successifs sur sources/pilotes/inputs figés : premier typage RED13,255s sur une variable locale déclarée deux fois, corrigée avant tout natif ; typages suivants PASS12,735s,12,393s,13,367s. Aucun validateur, simulation, bridge, rendu ou sauvegarde produit modifié. Les tests opt-in restent ignorés par défaut avant allocation navigateur. Aucun build, corpus ou banc fuel inchangé n’est rejoué ; aucune publication QA seule. ProduitV36528a2e8a9/publication2f42e85c et schéma238 conservés. Aucun gain FPS, campagne entière, parité exhaustive ou EA100% acquis.

## Preuves et reprise

Les dossiers sont sous `tmp/early-access-productive-research/`, conservés avec leurs entrées et réservations exclusives. Sources privées adoptées03,04 et05 restent distinctes ; aucune source propriétaire RimWorld n’est copiée dans le produit ou les tests.

- `adopted-03/native-01/early-productive-research--961a2-energy-goal-only-in-summary/` : conservation79065 SHA `9bd6247c7eb41f5a6b7d3ce499c1e81ea5deb2e3018b227368ccd59e78941f80`, ledger `2d0a7b368f4206e36a480c1d659ab9c2aec6eefef9d17eae7cb2ecc8c07b5ef5`.
- `adopted-04/native-02/early-productive-research--961a2-energy-goal-only-in-summary/` : final81148 SHA `1f7a18d5b47e82a0f01421cce305a497fcafe3dadcf794233903066fd8b28a47`, ledger `6b3a5f108e8a16506dc40f9896ae375d33581a3195defb2c1b8ee9ec571c15ec`.
- `adopted-04/native-03/early-productive-research--961a2-energy-goal-only-in-summary/` : final84190 SHA `81eece4a4554fe7d94839017aabebe962474a70955cbf577a0f748ff08fc2a39`, ledger `9231739af636169ada7a916323425c3c44ebe35d4e537a55e080d92c33f7ed2a`.
- `adopted-04/native-04/early-productive-research--961a2-energy-goal-only-in-summary/` : conservation84405 SHA `46f2e18b7503c4209e6bda4084794e9a81784b3a4c0ed328c7d92505cb1f4399`, ledger `57fb967410132b2cb0fa20470e3095c8168c2421ec9f503d1916f70c05228dc6`.
- **Nouveau canonical** `adopted-05/native-05/early-productive-research--961a2-energy-goal-only-in-summary/conservation.json` :85531, SHA `42f10aa54dc62842f95d0a045dd2fff2856ef51b7e70321ae9a3995913669e8e`, ledger `fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591` **resumeAllowed:false**, summary `2f6e644a22ca92e1083da9b2901d08e254fae455adbbd66c639fe5e825165ab6`.

Reprendre seulement85531 par un nouveau mandat de défense, sans réactiver les anciens ledgers ou rejouer84405/84190 favorablement. Ensuite, reprendre l’objectif productif réel : annexe/bureau payés, Batteries400, réseau payé, charge20Wd, générateur réellement arrêté puis lampe sur batterie160ticks. Aucun de ces jalons énergétiques n’est encore acquis. La matrice des trois biomes a une révision privée statiquement corrigée, sans essai exécuté ; toundra, multicartes et catalogue restent les extensions suivantes autorisées. Références humaines, UI papier et sessions préservées ; sous-métiers reportés.
