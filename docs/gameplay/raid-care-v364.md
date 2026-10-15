# Contre-assaut et premiers soins V364

La même campagne survit à son deuxième raid : l’assaillant est réellement à terre au74801 et le moteur marque le raid2 defended, killed0/downed1. Iris traite l’infection du visiteur puis donne un premier traitement à Gaël dans un vrai couchage. Les blessures, la brèche et une infection toujours active restent présentes. Ce lot QA ne certifie pas une guérison globale, la fin de tous les soins ou une campagne entière.

## Fil canonique et trois interventions distinctes

Après [V363](shooting-lean-v363.md), le seul point de départ est74567/SHA `04957b3d519c6fa73ffbb5738164937fc237c2538e6b555c546a442300148804`. Les anciens inputs74106 et74421 ne sont pas rejoués pour obtenir un autre résultat ; leurs dégâts et leurs rouges sont conservés. Chaque nouveau mandat garde les anciens ledgers interdits et exige le vrai export suivant.

| Mandat réel | Issue observée | Contrôle ROOT |
| --- | --- | --- |
| Flanc depuis74567 | Poste120116 atteint74614, mur18663 détruit74616, tir746242 constaté sans impact attribué ; repli74628 puis deux coupes de Gaël au74653. Conservation74657 non rechargée. | Chrome/WebGPU RED51,059s ; body29,956s/overall46,081s, erreurs[]/lifecycle[], gel2967 exact. |
| Mêlée depuis74657 | Ordre contextuel réel, motion/stagger conservés au clic ; première riposte746685 et blessures réelles des deux combattants. Infection préexistante attendue du visiteur19771 apparaît74723, conservation74727 non rechargée. | Chrome/WebGPU RED40,363s ; body20,405s/overall35,453s, erreurs[]/lifecycle[], gel2972 exact. |
| Soin pendant la mêlée héritée depuis74727 | Aucun réordre offensif : les deux engagements/horloges restent identiques au même tick. Infection traitée74813 ; ennemi à terre et raid terminé74801 ; Gaël au lit et premier traitement74948. Issue74950 exportée/rechargée exactement. | Chrome/WebGPU PASS73,237s ; body53,458s/overall68,245s, erreurs[]/lifecycle[], gel2977 exact. |

Gaël est le seul combattant légal : Iris et Léonie gardent leurs passés pacifistes. Son fusil18558 et son gilet18555 ne sont pas remplacés par des équipements inventés. L’échec du flanc et ses blessures ne justifient aucun changement de précision, dégâts, RNG ou ciblage ennemi. La mêlée utilise les vrais outils et le véritable contact diagonal ; une frappe ne peut commencer avant la fin physique du segment. Les coups supplémentaires de Gaël sont journalisés dans le même mandat, sans microversion ni réessai favorable par coup.

Les scripts n’envoient aucune commande par API cachée : import fichier, clics contextuels, boutons tactiques et services UI réels. Projection et lectures du monde servent seulement à constater les états. Chaque wrapper réserve un segment inédit parwx avant Playwright et refuse d’écraser sorties, reporter ou réservation existants.

## Soin urgent et repos réellement obtenus

Au74727, Villageois19771 est à terre en123111, sans lit ni need.sleep, malgré son admission médicale72942. Le soin civil exige toujours un vrai lit. Le soin mobilisé sec, déjà disponible depuis237 sur un humain local à terre, est admissible ; Iris124111 est déjà adjacente. Les douze plaies non traitées sont des contusions/fissures sans saignement : l’infection1 est la vraie cible prioritaire. L’ordre sec est accepté74727, sans réémettre la mêlée engagée.

Traitement observé74813 : qualité385/1000 et expiration785630Core, événement exact « Iris a traité une infection de Villageois5.2 sans médicament » (le texte réel conserve ses espaces). Aucune dose consommée pour ce traitement. L’infection reste présente : à74950, severity27718998, immunity24221352 ; ce premier soin ne prouve pas l’issue de leur course. Le visiteur reste à terre au sol et ses douze anciennes plaies restent non traitées.

Après la cessation réelle de l’ennemi au74801, les seules attaques futures de Gaël sont arrêtées puis il est démobilisé74803. Récupération, motion et stagger sont comparés au même tick, sans annulation magique. Patient/Repos l’amène réellement au couchage médical19797/122114, constaté74847. Iris est alors démobilisée pour son vrai ordre civil Soigner au chevet. Au74948, l’événement et les données attestent deux plaies traitées avec médicament. À74950, elle poursuit cette tâche, progress28/duration852, en122113 avec les deux doses restantes du cargo19845.

Gaël a neuf blessures dont seulement deux traitées ; **les coupes17/18 ne font pas encore partie des deux traitées**, il saigne toujours et son sang perdu atteint21311820. Sa faim24,19 et celle de Léonie23,71 imposent maintenant soins et alimentation ; Léonie est encore mobilisée. Iris et Léonie restent indemnes. Les médicaments coloniaux passent légitimement21→20 (18 au sol et2 portés par Iris) ; les trois personnels19776 du visiteur restent distincts. Le lot atteste cette dose physique/événement et l’état courant, pas un nouvel oracle intégral source→cargo→dose pour chaque médicament. Le premier visiteur19768 garde ses quinze plaies traitées, sans guérison complète revendiquée.

## Sauvegardes et contrôles

Schéma238 conservé. ROOT seul, contrôles lourds séquentiels sur sources/tests/publics/pilotes/inputs figés. Typage du flanc PASS16,534s, puis PASS12,892s et final PASS12,965s après les pilotes suivants. Six captures larges acquises et inspectées ROOT, quatre recharges UI exactes sur ces trois interventions. Les conservations dangereuses74657/74727 restent non rechargées par leurs pilotes. Les bornes/rouges et les branches blessées historiques, notamment V344, restent distinctes.

Les six fichiers de pilotes suivis sont opt-in. Aucun moteur de combat ou de soin n’est modifié par ce lot QA. Les derniers contrôles sont exécutés avec le petit correctif de menu de combustible indépendant [V365](manual-refuel-v365.md), sans changement de ces règles. Aucun corpus/build inchangé ou publication pour QA seule ; les preuves natives suffisent à cette continuation bornée, pas aux240FPS ou à l’ensemble d’une partie.

Preuves privées :

- Flanc : `tmp/early-access-defense/flank-74567/native-01/raid-defense-flank-Real-cr-2fb64-l-flank-from-preserved74567/`, conservation74657 SHA `df4468f853618497268be2469e7a6fe5e209f1e82a95dc37976cb50a8e0bf330`, ledger `475b3b6ccac7fd4e376769606d94399951b678df728c5877454eeb95b68861aa`.
- Contact : `tmp/early-access-defense/contact-74657/native-01/raid-defense-contact-Real--3a717-ical-care-from-injured74657/`, conservation74727 SHA `93a013da2fcd85964af6f47ab592b0fafc223fa75f9ed900044e035175309090`, ledger `4a92616e2e7547a76a01900fa5ac465c3af5ad8a27393a5bd6a97f6bb3656d48`.
- Infection/soin : `tmp/early-access-defense/infection-74727/native-01/raid-defense-infection-Rea-8a9ca-ited-contact-care-from74727/`, **issue74950** SHA `976b0045ca170b4ebef30058ae3f62db24be323252fe55eccd9d5b165c735663`, ledger `b903a3706adb849e3ca43cff00ffe259cdc20110fb4eb33546544121fbf9848f`, summary `9a13cf8a98e4955444ec1435aaffb056e4cf792f7fff66988f6c2d15a3fe693a`.

Le dernier export est rechargé exactement, mais son ledger demeure resumeAllowed:false pour revue ROOT. Le prochain mandat doit partir de ce vrai74950, conserver la tâche/cargo d’Iris, démobiliser Léonie, traiter les saignements de Gaël, protéger les repas et remettre le visiteur dans un vrai couchage admissible. La brèche doit être réparée par travail réel si retenue, pas réapparue dans le JSON. Batteries utiles et les trois biomes suivent ces besoins ; extensions déjà autorisées ensuite.
