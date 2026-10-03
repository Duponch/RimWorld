# Départ des animaux affamés — relevé Core V186

Relevé du **3 octobre 2026**, Core local `E:/Steam/steamapps/common/RimWorld/Version.txt` : **1.6.4871 rev590**. Lecture XML de `Data/Core/Defs/ThinkTreeDefs/Animal.xml` et `SubTrees_Misc.xml`, puis ILSpy en lecture seule sur `Assembly-CSharp.dll` : `ThinkNode_ConditionalStarving`, `ThinkNode_ConditionalCanReachMapEdge`, `JobGiver_ExitMap`, `JobGiver_ExitMapRandom`, `JobDriver_Goto` et `ThinkNode_ConditionalMustKeepLyingDown`.

## Règles vérifiées

Le sous-arbre `LeaveIfStarving` exige une famine et un accès au bord. L'exclusion `HasFaction` inversée le réserve aux animaux sauvages. La catégorie famine correspond à une nutrition nulle : aucun délai de famine durable n'y est ajouté. La branche essaye d'abord une recherche alimentaire sur toute la carte, puis une sortie à l'allure Walk. Le job Goto porte une sortie à l'arrivée ; une disparition au centre de la carte ne remplit pas ce contrat.

La branche précède le nouveau choix ordinaire de nourriture/repos. Le sommeil déjà engagé est protégé par `MustKeepLyingDown` : sans aliment trouvé, un animal peut continuer à dormir même affamé. Les activités constantes de fuite/devoirs et les animaux domestiques relèvent d'autres branches. La sortie engagée n'a pas une réévaluation alimentaire constante démontrée par le sous-arbre constant étudié.

Le miroir de code [JobGiver_ExitMap](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse.AI/JobGiver_ExitMap.cs) montre aussi la création de Goto, la sortie à l'arrivée et ses restrictions. [Need_Food](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/Need_Food.cs) recoupe les catégories de nutrition. Ces pages sont primaires pour le code qu'elles reproduisent, mais leur version n'est pas attestée : la conclusion de version appartient aux XML/IL locaux, pas au nom du dépôt ou à sa date de crawl.

## Adoption et adaptations

**Adopter** : famine nulle, dernier essai alimentaire global, régime et nourriture accessibles, animaux sauvages uniquement, marche jusqu'au bord et sommeil déjà engagé. **Adapter** : sortie au bord le moins coûteux avec départage déterministe, cent ticks locaux entre recherches alimentaires pendant la sortie, dernier essai avant retrait, attente de la fin de l'arête 3D et de toute récupération de coup encore référente. Cette recherche pendant le trajet permet de rouvrir des réserves sans prétendre recopier la réévaluation Core.

**Différer** : saisons migratoires, animaux hors carte persistants, vols, destruction de portes, prédateurs et chasse de proies, reproduction sauvage et autres espèces. Le cadrage initial loup/renard a établi des dépendances supplémentaires — ingestion anatomique de cadavres, combat animal→animal et catalogue prospectif — qui ne sont pas livrées par V186.

Corpus utilisateur : chapitre 12, SYS/TEST-121..125 pour frontières animales et services alimentaires SYS-076..078 ; les identifiants rappellent les domaines, sans clôture de la prédation ou de l'élevage. Les besoins, contacts, réservations et reprise de la [recherche faune initiale](wildlife-reference.md) restent applicables. Le [contrat V186](../development/wildlife-exit-v186.md) et la validation locale doivent rester distingués de ce relevé de référence.
