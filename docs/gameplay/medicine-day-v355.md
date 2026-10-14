# Réserve médicale complète et aube suivante V355

Le lot poursuit exactement la [sortie naturelle V354](medicine-reserve-v354.md) à58206, schéma236, SHA256 `4ca356d81a0646f1aff0e721f237a3f8679f802cac5ba307e5f11879f755cb39`. Même Iris18530, Gaël18532 et Léonie18534, mêmes26médicaments et autres biens ; aucun besoin, incident ou compteur reconstruit. V354 est commité/poussé en `7a0be77f` après typage final16,140s et documentation1,350s.

## Réserve et transports

La réserve19675 est agrandie à124,114 par son vrai bouton d’expansion puis le clic de carte. Les deux cellules123,114 et124,114 restent de la même zone, sous toit, médecine seule/priorité3. Elles contiennent finalement1+25doses : la limite25d’une pile est respectée.

La source extérieure18695/25 est transportée par Iris en trois vrais ordres10/10/5. Le premier cargo alloué19678 reste comme pile intérieure à124,114. Les deux suivants19679/19680 fusionnent dans19678 puis disparaissent. La source garde15, puis5, puis disparaît ; les26unités globales restent conservées. Les destinations proviennent des tâches effectivement adoptées, pas d’une destination forcée dans le moteur.

| Lot | Portage observé | Dépôt observé | Source restante | Destination et identité persistante |
| --- | --- | --- | --- | --- |
| 10 | 58233, cargo19678 | 58247 | 15 | Cellule19677 à124,114 ; nouveau19678 |
| 10 | 58271, cargo19679 | 58287 | 5 | Même cellule ; fusion dans19678 |
| 5 | 58315, cargo19680 | 58331 | 0 | Même cellule ; fusion dans19678 |

À58333, réserve26 exportée et rechargée exactement. Aucun médicament administré ou soin de la branche blessée V344 n’est crédité.

## Continuation naturelle observée

Après les transports, la vitesse6 est choisie dans l’UI et les besoins, sommeil, cuisine et événements ordinaires restent actifs. Le parcours s’arrête à60031, après minuit et à l’aube du jour11. Le libellé de checkpoint tick60000 est un seuil de simulation, pas une preuve que l’heure locale de ce scénario serait minuit à60000 ; la capture finale affiche06:07.

Iris dort dans son vrai lit, repos88,926/hunger50,293 ; Gaël est disponible, repos98,353/hunger99,36 ; Léonie travaille à sa cuisinière avec10riz réellement placés et progrès79040. Les deux autres colons ont repris naturellement une ingestion sans table : tâches de Léonie/Gaël source19656, cargos19682/19683 et phases ingest observées, événements59997/60007, faim remontée et pile de repas simples6→4. Les trajectoires complètes de ces portions ne sont pas toutes capturées ; la provenance productive de chaque unité fusionnée n’est pas réattribuée. À60031 la nouvelle cuisson n’est pas achevée. Les15rations et26médicaments restent présents.

Ces observations qualifient cette fin de nuit, pas une autonomie alimentaire, guérison générale ou campagne entière. Le choixUI6 n’est pas un banc de débit réel×6/FPS. Les menaces futures66000/74100 restent de futurs contrôles, pas une garantie de sécurité. Aucune garde n’est supprimée pour faire réussir le camp.

## Qualification, rouges et livraison

ROOT seul, sources/tests/pilotes figés ; Chrome/WebGPU acquis par reprise PASS108,190s/body103,947s, erreurs[]/gardes actives. Quatre exports/recharges exacts58206/58233/58333/60031 ; trois captures inspectées ROOT. Typage initial16,452s et final16,291s PASS ; gel2929exact. Rapport/SHA/journal borné et trajectoires dans tmp/early-access-v355/native-confirmed/medicine-day-v355-V355-exi-e7b45-sses-naturally-to-tick60000/medicine-day-v355-summary.json. Sortie60031 SHA256 `94a322e69f6e80e3c4ee425a15eb40cac3c67d851d500f435468890c6991f2bd`, réserve58333 `69d7ff0b1a1ca46adf6c09f93a9042fd4db566d9ae9c0da6d27b42f55298daf5`.

Deux rouges préparatoires conservés :46,306s/body41,9s attendait le bouton d’expansion dans le mauvais enfant DOM cell-storage ;35,206s attendait un export égal à un témoin de snapshot lu avant l’adoption asynchrone du clic d’expansion. Le bon bouton vit dans l’inspecteur commun ; le pilote attend maintenant les deux cellules confirmées avant de prendre son témoin. Les exports d’arrêt sont conservés dans native/native-reprise, sans recharger ni présenter une réussite. Produit, sauvegardes et gardes inchangés.

QA-only : aucun moteur/bridge/rendu/public changé, aucun build/corpus/déploiement inchangé rejoué. ProduitV353 `8dc7bf70` et publication `f6ced911` conservés. Prêt au commit/push après documentation. Suite autonome : une journée naturelle plus longue depuis60031, avec examen du coin repas et de la préparation aux incidents, mêmes personnes et branche distincte de V344. Aucun résultat futur, FPS, parité exhaustive ou early access100% certifiés.
