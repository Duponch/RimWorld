# Capsule civile et secours — recherche Core V187

Relevé du **3 octobre 2026**, Core local **1.6.4871 rev590**, XML et IL en lecture seule. `Incidents_Map_Misc.xml`, `Script_TransportPodCrash.xml`, `Humanlike.xml`, `QuestNode_Root_RefugeePodCrash`, `ThingSetMaker_RefugeePod`, `HealthAIUtility`, `JobDriver_TakeToBed` et `JobGiver_PatientGoToBed` fondent les règles de version ci-dessous. Un vieux `IncidentWorker_RefugeePodCrash` n'est pas présent dans ce binaire ; l'incident actuel utilise `IncidentWorker_GiveQuest`.

## Vérifié

`RefugeePodCrash` est Misc, ticket brut **1,5**, `IncreaseMedium`, colon présent ; le script autoaccepté et caché s'appuie sur une racine de quête spécifique. La génération tente au plus dix personnes puis `DamageUntilDowned` : une pose arbitraire `downed` ne remplace pas une vraie blessure. La faction peut être absente, hostile ou non hostile ; ce lot ne recopie pas toute cette distribution.

Le secours automatique n'admet pas les étrangers ; le secours forcé le peut. Le dépôt dans `TakeToBed` établit le statut d'invité de l'hôte. Dans la branche humaine d'invité, le repos médical précède la sortie `ExitMapBest` à l'allure Walk. Le premier relèvement ne suffit donc pas à finir la récupération. Le signal `pawn.PlayerTended` peut conclure la quête Core avant départ ; traiter et quitter vivant sont des états distincts. Le recrutement spontané relève de l'affiliation/faction et de `rescueesCanJoin`.

Recoupements publics : [racine de capsule](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld.QuestGen/QuestNode_Root_RefugeePodCrash.cs), [éligibilité du secours](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/HealthAIUtility.cs), [repos médical](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/JobGiver_PatientGoToBed.cs). Ces miroirs reproduisent le code, sans attester leur version exacte ; la version annoncée vient de l'installation locale.

## Décisions

**Adopter** : incapacité anatomique, choix forcé pour un étranger non accueilli, admission au dépôt, soins/repas réels, repos médical avant départ. **Adapter** : une seule famille civile neutre, profils adultes limités, enveloppe Misc locale, six ticks de chute et quatre d'ouverture, Pawn produit à l'ouverture, recherche déterministe de bord et archive bornée sans effacement. Les timings, règles de sélection ou inventaires locaux ne sont pas présentés comme paramètres universels Core.

**Différer** : naufragés hostiles/sans faction, mineurs, recrutement spontané, capture civile et effets diplomatiques, graphe exhaustif des quêtes, relations mondiales et visiteurs blessés génériques. La prédation complète demande encore régime carnivore, choix/poursuite/attaque animal→animal, ingestion anatomique et espèces prospectives ; l'écologie V186 n'est pas raffinée automatiquement à la place de cette ouverture médicale.

Corpus utilisateur relu : chapitres 12, 15, 24, 25 et 27 ; SYS/TEST-089..096, 121..125, 132..135 et 148..150 gardent leur provenance. Une catégorie d'invité et une arrivée ne clôturent ni la santé, ni les quêtes, ni les populations. Le [contrat](../development/pod-rescue-v187.md) doit être confronté à une preuve locale après implémentation.
