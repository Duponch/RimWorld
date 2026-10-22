# Vie quotidienne du couple adulte — référence Core V463

Référence établie les 22–23 octobre 2026. **V463 est en qualification, sous schéma prospectif 285 ; cette note n'annonce pas sa livraison.** Elle distingue les règles du Core installé, les adaptations locales et les domaines restant hors périmètre.

## Sources et provenance

Installation lue en place : **Core 1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/Version.txt`. Assembly : `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 contrôlé avant/après les lectures ciblées :

`5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`

Les classes nommées ont été examinées avec l'outil ILSpyCmd 8.2 déjà disponible, sans décompilation globale ni intégration de code ou d'assets propriétaires. Les extraits privés sont conservés dans `tmp/trade-request-v462/couple-core/`, `tmp/couple-v463/clinical-core/` et `tmp/couple-v463/primary/`. Les références antérieures sous `tmp/double-bed-v313-reference/` et `tmp/bereavement-reference-v181/` proviennent du même assembly. Les recherches initiales de noms de classes incorrects, conservées dans leurs journaux, ne constituent pas des preuves d'absence.

Principaux propriétaires primaires : `JobGiver_DoLovin`, `JobDriver_Lovin`, `ThinkNode_ChancePerHour`, sa spécialisation Lovin, `Pawn_MindState`, `Toils_LayDown`, `LovePartnerRelationUtility`, `Pawn_RelationsTracker`, `PawnCapacitiesHandler`, `Pawn_JobTracker`, `ReservationManager`, `Pawn_HealthTracker`, `StatPart_BedStat`, `StatPart_Resting`, `ImmunityRecord`, `Thought_MemorySocial`, `MemoryThoughtHandler`, `ThoughtHandler`, `ThoughtDef`, `GenMath` et `Rand`.

XML recoupés dans `Data/Core/Defs/` : `ThinkTreeDefs/Humanlike.xml`, `ThingDefs_Races/Races_Humanlike.xml`, `JobDefs/Jobs_Misc.xml`, `ThoughtDefs/Thoughts_Memory_Social.xml`, `Stats/Stats_Pawns_General.xml` et `ThingDefs_Buildings/Buildings_Furniture.xml`.

Repères des lectures conservées ; les numéros des classes désignent les extraits privés nommés ci-dessus, ceux des XML l'installation identifiée :

| Question | Repères primaires |
|---|---|
| Posture, stade adulte, partenaire | `Humanlike.xml:9` ; `Races_Humanlike.xml:127` ; `LovePartnerRelationUtility:21,131` ; `JobGiver_DoLovin:9` |
| Cadence et calcul de chance | `ThinkNode_ChancePerHour:7–25` ; `LovePartnerRelationUtility:258,313` ; `GenMath:189` ; `Rand:509,536` |
| Deux tâches et fin de l'étape | `JobDriver_Lovin:64–110` ; `JobDriver:274` ; `Toil:62` |
| Éveil, famine, rôle de lit | `PawnCapacitiesHandler:25` ; `Need_Food:19–35` ; `RestUtility:72,117,146` |
| Horloge et finalisation de chambre | `Toils_LayDown:44,91,125,160` ; `Pawn_MindState:95,450,510` |
| Guérison et immunité | `Pawn_HealthTracker:1128,1150` ; `StatPart_BedStat:29` ; `StatPart_Resting:31` ; `Stats_Pawns_General.xml:260` ; `Buildings_Furniture.xml:162,173,230` |
| Mémoire, groupes et limite | `Thoughts_Memory_Social.xml:622` ; `Thought_MemorySocial:34,68,74` ; `MemoryThoughtHandler:166–178` ; `ThoughtHandler:82–102,159–194` |
| Cooldown absolu et persistance | `JobDriver_Lovin:110,136–158` ; `JobGiver_DoLovin:9` ; `Pawn_MindState:420,437` |

Le [site officiel](https://rimworldgame.com/) situe les relations, partenaires, conjoints et réactions d'humeur parmi les systèmes du jeu. L'[annonce Alpha 13](https://ludeon.com/blog/2016/04/alpha-13-released/) atteste historiquement l'activité et les lits partagés, sans établir les constantes actuelles. L'[annonce officielle du 12 octobre 2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), relue le 23 octobre, situe 1.7 sur la branche instable et conserve 1.6 sur la branche principale. Les règles détaillées ci-dessous viennent de l'installation identifiée, pas de l'annonce ni de sources secondaires.

## Adoption et croisement du corpus utilisateur

Lecture du [cadre principal d'adoption](reference-adoption.md), des chapitres originaux [3 — temps](../reference/originals/Documentation_developpement.html#chap-03), [8 — commandes](../reference/originals/Documentation_developpement.html#chap-08), [9 — décisions et interruptions](../reference/originals/Documentation_developpement.html#chap-09), [13 — identité](../reference/originals/Documentation_developpement.html#chap-13), [14 — besoins et social](../reference/originals/Documentation_developpement.html#chap-14), [15 — santé](../reference/originals/Documentation_developpement.html#chap-15), [22 — pièces](../reference/originals/Documentation_developpement.html#chap-22), [29 — représentation](../reference/originals/Documentation_developpement.html#chap-29), [30 — sauvegardes](../reference/originals/Documentation_developpement.html#chap-30) et [32 — critères](../reference/originals/Documentation_developpement.html#chap-32). Les IDs ci-dessous ont été relus dans les cellules du [classeur original](../reference/originals/Referentiel_developpement.xlsx), pas déduits des anciennes notes de lot. Les empreintes des originaux sont conservées dans leur [manifeste](../reference/originals/manifest.json) ; les originaux restent inchangés.

Les marques R/P/V du corpus conservent leur sens : relevé sourcé, proposition et point à vérifier. Ses entrées SYS sont des contrats proposés et ses TEST des critères, sans qualification automatique du produit. Les colonnes de statistiques proposent des champs et n'apportent pas leurs valeurs d'instance. Ce croisement n'impose donc ni architecture nouvelle, ni une suite de développement fermée aux exemples.

| Domaine du lot | IDs et cellules réellement relus | Adoption, adaptation ou réserve face au primaire installé |
|---|---|---|
| Horloge et reprise | SYS/TEST-002, 003 et 009 (`Systemes`/`Tests`, lignes 3, 4, 10) ; CONST-001/002/004/005/006 (`Constantes`, lignes 2, 3, 5–7) | **Adopter** unités logiques, débit distinct et reprise sans double effet. **Adapter** le pas local de dix Core ticks et les échéances personnelles littérales. CONST-002 donne l'unité horaire ; la cadence effective d'essai vient de `ThinkNode_ChancePerHour`, pas de cette seule constante. |
| Place, intention et interruption | SYS/TEST-044, 047, 049, 079 et 087 (lignes 45, 48, 50, 80, 88) ; STAT-058/059/062/069 (`Statistiques`, lignes 59, 60, 63, 70) | **Adopter** place réservée, présence physique, horaire distinct de l'action et conservation du passé. **Adapter** les deux places civiles affectées et la fermeture atomique. **Vérifier** l'ordre particulier du nœud : la chaîne de décision proposée au chapitre 9 ne remplace pas l'ordre primaire qui enregistre le check avant partenaire, cooldown et éveil. |
| Identité et âges | SYS/TEST-083 (ligne 84) ; STAT-005/006/007/014 (`Statistiques`, lignes 6–8, 15) | **Adopter** âge biologique distinct du chronologique et identité conservée en cryostase. **Adapter** l'admission adulte biologique réelle à 18 ans et le namespace des mêmes propriétaires ; aucun âge de secours ni relation créée au chargement. |
| Humeur, mémoire et opinion | SYS/TEST-081, 086, 087 et 088 (lignes 82, 87–89) ; STAT-063/064/065/068 (`Statistiques`, lignes 64–66, 69) | **Adopter** situation/mémoire distinctes, effets dirigés et références conservées. **Vérifier** les règles propres à `Thought_MemorySocial` : dix événements globalement, groupes par ID, pas renouvellement du repas ni pondération d'une conversation. SYS-088 reste plus large : conserver la référence du partenaire ne livre pas de nouvelles notifications de proches ou de quêtes. |
| Éveil et clinique | SYS/TEST-090, 091 et 096 (lignes 91, 92, 97) ; STAT-026/037/038 (`Statistiques`, lignes 27, 38, 39) ; SYS/TEST-076 et STAT-053/056/057 pour nutrition et malnutrition | **Adopter** conscience, douleur, saignement et incapacité distincts. Le primaire confirme qu'immobilité et inconscience ne sont pas équivalentes. **Corriger** l'ancienne inférence retirant les effets cliniques du lit : repos restauré, guérison et immunité sont des consommateurs différents. La restriction aux colons civils et hors crise est locale. |
| Chambre et géométrie | SYS/TEST-023 (`Systemes`/`Tests`, ligne 24), avec SYS/TEST-079/081 et STAT-062/065 | **Adopter** invalidation des pièces après changement de mur et observation au contexte réel. **Adapter** le transfert de RoomRest et la relecture avant commit. La séparation pièce/extérieur/toiture du chapitre 22 ne crée pas une nouvelle exigence de toit pour cette activité. Les valeurs et finalisations viennent de `Toils_LayDown` et du lecteur de chambre concerné. |
| Inspection, ordres et représentation | UI-001/011/026/034/035/036 (`Commandes`, lignes 2, 12, 27, 35–37) ; TEST-192 (`Tests`, ligne 193) | **Adopter** inspection sans exécution, interruption autorisée, horaire non instantané et représentation sans autorité sur les règles. **Adapter** les libellés et la posture 3D aux mêmes tâches. UI-026 concerne l'horaire ; UI-017/018/028 concernent soins, capture et chirurgie. Aucun de ces IDs n'autorise une commande instantanée d'activité du couple. TEST-192 propose l'indépendance cosmétique, pas une identité du PRNG natif. |

**Provenance et divergences à conserver.** Le corpus renvoie notamment à S23 (`GenDate`), S24 (`Need_Food`), S27 (`ReservationManager`), S28 (`Pawn_PathFollower`), S29 (`RaceProperties`), S33 (`Pawn_HealthTracker`), S39 (`Pawn_RelationsTracker`) et S46 (`PawnGenerator`), avec une correspondance binaire annoncée à revalider. Ces sources cadrent les domaines sans prouver chaque contrat : S28 ne décrit pas à lui seul la topologie des chambres, ni S27 la sérialisation complète d'une tâche. Comme le signale le cadre d'adoption, `Statistiques!H59:I74` cite trop largement S24 pour repos, confort, humeur, mémoires et opinion ; les propriétaires de chambre, mémoire sociale et cooldown ont donc été relus séparément dans le Core 1.6.4871 identifié ci-dessus. Les nombres propres au couple ne reçoivent aucun ID CONST inventé. L'erratum RNG de la figure 7 est conservé : sa référence pertinente est S22 (`Rand`), et non S19 (`ArmorUtility`).

**Différer et vérifier sans clôture générale.** GAP-001 (version binaire) est documenté pour cette installation seulement ; GAP-004 (profils humains), GAP-011 (bâtiments), GAP-014 (santé), GAP-015 (RNG exact), GAP-017 (priorités et interruptions), GAP-024 (voyages), GAP-026 (interface), GAP-027 (extensions croisées) et GAP-028 (3D finale) gardent leurs périmètres plus larges. Les contrôles de reprise, interruptions, réservations, géométrie, propriété et absence de gain rétroactif servent la qualification locale ; ils ne ferment pas ces écarts. Fiançailles, profils et implants non représentés, pensées de lit restantes et combinaisons de DLC demeurent différés. Aucune ligne SYS, TEST, STAT, CONST, UI ou GAP n'est déclarée globalement close par cette adoption.

## Admission : vraie présence et âge biologique

L'arbre humain place l'opportunité sous la **posture allongée**, avant la continuation ordinaire du repos, la branche Downed et les branches de travail. Il n'exige ni une heure nocturne, ni un horaire Sommeil, ni que la personne dorme déjà. Le JobGiver vérifie un lit actuel non médical, un partenaire réellement dans ce lit, la capacité d'éveil et les échéances des deux, puis les réservations mutuelles. Le driver possède ensuite ses propres réservations et contrôles d'utilisabilité.

Le partenaire natif est Lover, Fiance ou Spouse ; une bonne opinion ou le partage d'une chambre ne suffisent pas. La recherche porte sur les occupants réels d'un lit de plusieurs places. **Occupation et affectation permanente sont deux notions distinctes** : la recherche native n'impose pas préalablement les deux propriétaires permanents ; le driver revendique ensuite le lit non médical.

Le périmètre local est plus étroit et explicite : deux humains libres de la colonie, présents sur la même carte, liés lover/spouse, dans le même double-lit civil construit et utilisable, sur deux places stables distinctes et réellement affectées. Les cellules doivent correspondre exactement et le mouvement être terminé ; les propriétaires et réservations existants de campagne restent autorité d'exclusivité. Une caravane, deux bedrolls, un bâtiment emballé, un plan ou un nom connu hors carte ne constituent pas cette présence. Les captifs, visiteurs, pillards et crises mentales sont exclus de cette tranche civile ; ce sont des restrictions locales, pas des clauses universelles attribuées au JobGiver natif.

Les deux participants doivent avoir **18 ans biologiques réels ou plus**. Ce seuil local correspond au stade humain Adult, mais n'est pas déduit des courbes de fréquence, qui contiennent aussi des points plus jeunes. L'âge chronologique, une relation déjà enregistrée ou un défaut historique de trente ans ne remplacent pas cette preuve. Le propriétaire natif d'âge, lorsqu'il existe, fournit le biologique Core avec son reste ; un en-tête natif invalide ne retombe pas sur un âge arrondi de secours.

CanBeAwake est distinct de l'état sommeil, de la capacité de marcher et de la manipulation. Pour l'humain ordinaire vérifié, le seuil de conscience est inclusif à 0,3. Un adulte immobile mais conscient, déjà dans sa place, n'est pas refusé pour sa seule locomotion ou son état Downed. Les transitions cliniques et les interventions prioritaires conservent leurs vraies interruptions ; aucune capacité corporelle n'est inventée au chargement.

## Ordre de l'opportunité et cadence

Le dernier contrôle et le prochain délai autorisé sont deux faits personnels distincts. L'ordre natif vérifié dans `ThinkNode_ChancePerHour` est le suivant :

1. Atteindre réellement le nœud en posture allongée.
2. Vérifier que **2 500 ticks Core** se sont écoulés depuis le dernier essai ; l'égalité est admise.
3. Enregistrer immédiatement la date actuelle comme dernier essai.
4. Chercher le partenaire et calculer le délai moyen entre opportunités, ou MTB.
5. Pour un MTB positif fini, effectuer la comparaison de chance ; seulement en cas d'opportunité positive, appeler le giver qui contrôle notamment cooldowns, éveil et réservations.

Un partenaire absent, un MTB négatif ou infini, un cooldown futur ou un refus ultérieur d'éveil n'effacent donc pas le contrôle déjà enregistré. Un changement de tranche horaire n'autorise pas d'essai anticipé. Il n'y a ni rattrapage des essais manqués ni activité garantie à chaque séjour au lit.

Les refus de fréquence concernent notamment mort, famine et saignement positif de l'un des deux. **Famine signifie nutrition courante à zéro ou moins**, selon `Need_Food.Starving` : la faim ordinaire à nutrition positive et la malnutrition clinique résiduelle après un repas ne la remplacent pas. Localement, cette seule admission lit `hunger <= 0`, sans réutiliser les seuils de pensée ou de planification des repas.

Le MTB part de 12 heures. Il est multiplié par les facteurs individuels de douleur, conscience et âge des deux participants, divisé par leurs attractions secondaires respectives avec minimum 0,1, puis multiplié par leurs deux facteurs d'opinion. La douleur intervient par `1 / (1 − douleur)` ; sous 0,5 de conscience, le facteur reçoit aussi le diviseur `2 × conscience`. La courbe d'âge monte entre 14 et 16, reste à un entre 16 et 25, puis descend à 0,2 à 80 ans ; le facteur individuel **divise** par cette courbe. Dans le domaine adulte admis, les âges élevés ralentissent donc l'opportunité. Le facteur d'opinion va linéairement de 1,3 à −100 à 0,7 à +100, dans chaque sens.

La probabilité du contrôle horaire est linéaire : `min(1, 1 / MTB)`, et non une loi exponentielle. Un MTB infini ne consomme pas le tirage de valeur natif. Les très petites probabilités possèdent un mécanisme natif à deux tirages ; sa consommation n'est pas reproduite par le tirage temporaire local unique. Orientation et beauté restent les adaptations neutres déjà déclarées de la romance locale ; seuls les facteurs d'âge relatif et de parenté représentés sont réemployés.

## Deux tâches coordonnées et fin de l'étape commune

Le driver natif de l'initiateur lance un second job chez le partenaire. L'initiateur tire une seule durée entière, par troncature de `2 500 × Uniforme[0,1 ; 1,1]`, avec bornes de référence de 250 à 2 750 ticks Core. Le partenaire déjà coordonné attend la fin de l'autre ; il ne tire pas une seconde durée de l'activité.

L'étape commune garde les deux participants allongés et éveillés, sans restauration de jauge repos ni recherche de travail ordinaire parallèle. Le confort et les observations de chambre continuent. Les besoins et la clinique conservent leurs propriétaires distincts.

Le souvenir et le cooldown appartiennent aux actions de fermeture de cette étape. Le nettoyage natif du toil les appelle aussi lorsqu'une interruption survient **après son entrée**, sans condition de succès naturel. Une simple tentative, un trajet ou une interruption avant l'étape ne les acquièrent pas. Le départ réel, la perte du lit/de place/de partenaire, la perte d'éveil et les interventions forcées doivent fermer les deux tâches selon leurs propriétaires ; une animation seule ne crée aucune activité.

La coordination locale finalise les deux originaux dans une même opération admise, avec mémoire et cooldown individuel pour chacun. Ce choix atomique ne promet pas l'ordre de sous-tick exact des deux drivers natifs. Les préflights privés de départ et retrait préparent leurs écritures et leurs refus avant de muter les personnes ; leurs clones de projection ne deviennent pas de nouveaux propriétaires humains.

## Correction explicite : repos et santé ne sont pas le même effet

La première note privée inférait trop largement de `gainRestAndHealth=false` une suppression de la guérison de repos. **Cette inférence est corrigée par les consommateurs primaires** : le flag retire la restauration de la jauge et l'indication visuelle associée, mais la guérison naturelle consulte séparément la posture et le lit actuel.

| Effet | Règle dans le lit réellement occupé |
|---|---|
| Jauge repos | Pas de restauration pendant l'activité éveillée ; la fatigue continue selon ses règles. |
| Guérison naturelle | Base 8 par jour, bonus 4 de posture allongée et bonus du lit civil 4 conservés, avant les autres facteurs cliniques. |
| Blessures pansées | Leurs règles supplémentaires et les contrôles de famine continuent indépendamment du flag du toil. |
| Immunité du bâtiment | Facteur civil 1,07 conservé par le vrai lit. |
| Immunité liée à la posture | Facteur distinct 1,1 conservé par InBed, y compris chez un Downed conscient. |
| Confort | Avance dans le helper de posture, hors de la garde de restauration du repos. |

Ces deux seules parts d'immunité donnent 1,177 ; elles ne neutralisent ni filtration, âge, faim, niveau de repos ni maladie. Aucun pansement, médicament ou soin instantané supplémentaire n'est créé. Après mouvement, portage ou perte de la vraie place, un ancien champ de tâche ne suffit plus à fournir les services du lit.

## Chambre : préserver l'horloge, finaliser chaque transition

Le propriétaire natif de l'attente de chambre est `Pawn_MindState`, pas le driver de sommeil. Le premier délai de 2 500–10 000 ticks Core n'est tiré que lorsque sa date est absente. L'observation suivante conserve cette horloge et son drapeau acquis. Le confort et l'observation ne demandent pas que la personne dorme ou restaure du repos.

**Chaque transition de LayDown finalise l'ancien usage**, y compris sommeil → activité et activité → sommeil. La finalisation répète l'observation de chambre seulement si elle avait déjà eu lieu ; elle ne crée pas une première mémoire gratuite. Elle ne remet ni la date ni le drapeau à zéro. Le reset normal natif intervient lorsque la posture n'est plus allongée.

Localement, le couple transfère le `RoomRest {nextAt, applied}` existant avec le même contexte réel, puis le rend au sommeil continu. Une transition ne redessine donc pas l'attente, ne décale pas sa date et ne fabrique pas une phase debout. Une mémoire de chambre déjà observée peut réévaluer son palier et sa date selon la pièce présente à chaque fermeture ; la chambre demeure distincte du souvenir du couple. Les préflights doivent relire une observation dépendante de la géométrie avant d'appliquer leurs résultats. Une vraie sortie de carte ne transporte pas un service spatial de chambre vers un détenteur hors carte.

## Souvenir : identité du partenaire, limite globale et effets distincts

La définition `GotSomeLovin` fixe trois jours, humeur +8, opinion +6, multiplicateur 0,6 et limite dix. La lecture de `Thought_MemorySocial` ferme une ambiguïté de la première note : **ce type ne fusionne pas l'événement en renouvelant une ancienne date**. La limite dix porte sur toute la définition, pas sur chaque partenaire. À saturation, l'événement d'âge actif le plus élevé est évincé ; le premier de la liste départage les égalités.

Les groupes d'humeur et d'opinion exigent le **même partenaire réel**. Deux personnes de même nom restent deux groupes. Les dates d'acquisition et les références de partenaire restent factuelles après départ ou décès.

- Humeur : pour les offsets représentés tous égaux à huit, `8 × somme(0,6^i)` dans le groupe ; pas de décroissance finale de l'humeur avant expiration.
- Opinion : contribution dirigée vers ce partenaire, pleine pendant les premiers 70 % de l'âge actif, puis décroissance linéaire sur les derniers 30 %. Les événements sont ordonnés par âge actif croissant, pondérés par 0,6, puis le total est arrondi au plus proche avec égalités vers le pair ; une contribution totale positive conserve au moins un.

La suspension peut inverser l'ordre des âges actifs par rapport aux dates civiles. Le contrat local conserve les dates originales et corrige seulement cet âge par `suspendedTicks`, avec les mécanismes personnels déjà présents. Son expiration au délai corrigé et ses lecteurs continus ne reproduisent pas la cadence native de vieillissement des mémoires par intervalles de 150 Core ticks.

Les noms affichés proviennent des vrais propriétaires. Le lecteur du couple cherche d'abord localement, puis résout le namespace réel à la demande. Le calcul SIM peut omettre ces seuls nouveaux libellés tout en conservant identités, valeurs et échéances ; aucune lecture ne crée de mémoire, d'activité ou de tirage.

## Échéances absolues, hasard personnel et quantification

Chaque personne reçoit son prochain délai à la fermeture. La moyenne native en heures est interpolée sur les points 16→1,5 ; 22→1,5 ; 30→4 ; 50→12 ; 75→36. Le domaine local commence à 18 ans, où cette moyenne vaut encore 1,5. Le délai est gaussien autour de cette moyenne, écart-type 0,3 heure, minimum 0,5 heure, puis tronqué en ticks Core. Ce cooldown n'est pas le MTB initial de 12 heures.

`canLovinTick` est une **échéance globale absolue** : écriture date actuelle plus délai, comparaison directe à l'horloge globale, persistance littérale. Il n'est pas gelé par analogie avec une mémoire. Localement, ni `lastAttemptAtCore` ni `nextAllowedAtCore` ne sont décalés au cryptosommeil ; une échéance devenue passée reste passée. La mémoire reçoit séparément sa correction d'âge actif.

Le flux local de durée/cooldown est personnel, sauvegardé, initialisé prospectivement depuis seed et ID réel. Il est distinct du RNG monde et du social. La durée utilise le flux de l'initiateur ; chaque cooldown utilise celui de son titulaire. La normale locale emploie exactement deux tirages sans valeur secondaire cachée. L'opportunité possède un flux temporaire personne/heure distinct. Ce sont des **adaptations originales explicites**, sans identité de seed, suite, consommation ou résultat avec le Rand natif.

La simulation locale confirme un tick pour dix ticks Core. L'entrée est datée sur cette grille ; la durée, la fin prévue et les cooldowns sont conservés en entiers Core, sans arrondi destructif à la sauvegarde. La fermeture intervient au premier tick SIM confirmé atteignant la date prévue, donc avec une quantification de zéro à neuf ticks Core. Les mémoires et nouveaux délais partent de cette vraie fermeture confirmée. Il n'existe pas de sous-tick physique promis ni de recharge permettant de redessiner la durée.

## Représentation prospective et limites

Les propriétaires en qualification sont [les tâches et horloges](../../src/sim/couple-state-285.ts), [les règles](../../src/sim/couple-rules-285.ts), [le hasard personnel](../../src/sim/couple-random-285.ts), [les mémoires](../../src/sim/couple-memories-285.ts), [les gardes de sauvegarde](../../src/sim/couple-save-285.ts), [le moteur](../../src/sim/couple-runtime-285.ts) et [la fermeture](../../src/sim/couple-release-285.ts). Les champs suivent les mêmes originaux humains ; seules les personnes présentes sur carte peuvent porter une tâche physique. Les propriétaires hors carte, suspendus ou terminaux conservent leurs seuls faits passifs admissibles.

Le schéma 284 doit être strictement validé avant migration neutre vers 285 : aucun contrôle passé, durée, cooldown, souvenir, rapprochement ou compétence n'est offert. Les champs prospectifs ont des formes exactes, des références factuelles et des gardes de descripteurs ; les schémas futurs ne sont pas admis par simple borne inférieure. Les lecteurs et validateurs ne corrigent ni les personnes ni leur clinique pour rendre une paire admissible.

Le modificateur natif **LoveEnhancer**, présent dans le driver examiné, peut amplifier l'humeur lorsqu'il est effectivement porté par un participant ; il n'est pas représenté par les prothèses ordinaires livrées localement et n'est pas inventé pour elles. Fiançailles, profils complets de genre/orientation/beauté, autres implants ou hediffs spécifiques, effets psychiques, gènes, grossesse et autres voisins DLC restent hors de ce contrat. La présence de branches natives voisines n'en ouvre pas les propriétaires locaux.

Cette référence porte sur l'activité ordinaire du couple adulte et ses interactions déjà représentées. Elle ne déclare terminés ni les pensées de lit du Core, ni le système social, la clinique, les autres bases ou les six ensembles de complétion. La qualification du produit demeure distincte de l'établissement de ces règles.
