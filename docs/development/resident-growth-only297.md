# Reconstruction des ressources : croissance seule, schéma 297

**31 octobre 2026 — correctif intégré et qualifié sur son chemin ; résultat en jeu encore à compléter.**

Les mises à jour contenant uniquement des tuples de croissance utilisent une reconstruction plus directe : une copie paresseuse du tableau et les seuls objets modifiés. Elles évitent le Map temporaire et les parcours répétés des mêmes identifiants. Une insertion, suppression, permutation ou modification complète d'une ressource conserve le chemin générique.

Une seule source change : `src/bridge/resident-presentation-assembler.ts`, de `7a52127aede3539d4c23324bbebf77244fba7165274c4848bd266eccb071759b` à `46fed3805209619dba26f31be65acc5af36f4227fca95f68523da877080af6dd`. Aucun changement de schéma, de vitesse physique, de ticks ou de commande.

## Conservation et validation

La nouvelle voie conserve les gardes de type, prototype, longueur, identité, doublon, valeur, tick et facteur. Elle préserve les doubles, la présence des propriétés et le signe de zéro. Un facteur NaN retire la propriété comme auparavant. Un index de prédécesseur incohérent retourne au chemin générique.

Les anciennes versions restent intactes. Un refus tardif ne publie aucun journal. Le journal FULL conserve les ressources réellement mises à jour ; le journal BASE conserve ses mises à jour structurelles vides pour une croissance seule. Une colonne vide garde l'identité du tableau précédent.

- Trois contrats privés : **3 PASS**. Ils couvrent les valeurs exactes et l'ordre, quinze corruptions refusées sans consommer le prédécesseur, puis une croissance après modification réelle de la population et de son ordre, et un refus tardif sans publication.
- Contrôles intégrés : **28 PASS et un refus ancien de référence crop**. Ce refus a été reproduit sur le témoin avec le même nom et le même message ; seuls les numéros de ligne ont été normalisés pour la comparaison. La sélection n'est donc pas présentée comme entièrement verte.
- Typage : **PASS, 17,009 s**.
- Build Pages CODE : **PASS, 3,756 s**, assets publics résolus sans recopie. Un build ne constitue pas une publication.

## Coût mesuré de la fonction

Comparaison W/C/W déjà acquise : 300 appels par bras sur la même projection de ressources contenant 17 918 tuples de croissance. Les sorties finales ont les mêmes empreintes et les entrées sont restées inchangées.

| Mesure, millisecondes | Témoin1 | Candidat | Témoin2 |
| --- | ---: | ---: | ---: |
| Temps écoulé | 3002,398 | 1618,591 | 3060,768 |
| CPU processus | 3374 | 2062 | 3281 |
| CPU du fil | 3016 | 1609 | 3063 |

Un comptage distinct, hors mesure temporelle, observe un Map temporaire en moins. Les autres allocations ne sont pas intégralement comptées. Le cas générique mixte reste fonctionnellement identique ; sa mesure courte et variable ne prouve pas un gain causal.

Ces résultats portent uniquement sur `patchCollection`. Ils ne mesurent ni une Full complète, ni les FPS, ni la fluidité globale et ne suffisent pas à déclarer les saccades résolues.

## Observation en jeu après intégration

Une continuation à ×6, depuis ea793/Core116100, a produit **524 soumissions et 605 échantillons d’horloge** en quatre secondes. Noé marche dans232soumissions, Sacha travaille et Ada dort dans les524. Pause300ms et recharge propre sont exactes. Ada reste àY=0,5, sans pose de marche. Le commit420d826e est poussé ; CloudflareV491 reste la dernière publication attestée.

La fluidité reste **ouverte** : huit intervalles dépassent33,33ms pendant la marche, dont trois dépassent50ms ; le plus long atteint100,4ms. Dix-huit paires ont une position inchangée et une pose de marche active, dont quinze au démarrage et trois vers1588–1600ms. Ces cas sont conservés, sans les transformer en succès global ni en gain causal face à un autre essai.

Le grand intervalle contient un traitement Full MAIN de88,2ms, dont69,7ms avant Timeline. Les six mesures privées ont zéro incident, débordement ou stage laissé ouvert ; elles sont jointes à33Full et utilisent la même horloge MAIN. Elles comprennent aussi le démarrage et les opérations de pause/export en fin de collecte.

| Étape observée | Médiane, ms | Maximum, ms |
| --- | ---: | ---: |
| Préflight Native | 0,0 | 0,2 |
| Forme et transports Resident | 6,1 | 13,2 |
| Reconstruction des collections | 0,5 | 36,8 |
| Contrôles World et callbacks suivants | 18,7 | 22,0 |
| Préparation Core, incluse dans la ligne précédente | 2,6 | 5,1 |

Ces intervalles sont imbriqués : ils ne s’additionnent pas. Le lecteur conserve leurs unions et leurs segments de recouvrement. La préparation Core ne peut pas expliquer à elle seule le pic. Le coût des contrôles World et les pointes de reconstruction restent les prochaines voies à examiner. Les scopes mesurent du temps écoulé dans les handlers, pas un temps CPU exclusif, la fin GPU ou les FPS.

L’instrumentation n’est pas installée dans le produit. Deux surcouches privées, Native5c8 et Residentcd73, sont liées exactement à Native0a8 et RPA46fed. Huit contrôles de préservation et six pannes injectées ont été vérifiés avec le vrai collecteur et des callbacks métier déclarés opaques ; cela ne remplace pas une validation de toutes les règles du jeu.

Dernier état QA réellement persisté : **RAW98238a1bb4e0186d8f0fd89c56cedadb8a9968fe3cf120af120d5addb9bf90ee**, gzipa32a52f04b4c24281eeb9ffd269283a6155dbd8ce2d2bf03d1956ce97e796c3c, **Core116940/RNG700965858/nextId30026**, propre recharge exacte. Le parent ea793 et son latch consommé ne sont plus des reprises autorisées.

Preuves privées : full-main-cost-stages-native-author-v1/native-full-main-cost6-v1/report.json (e87bb046), full-main-stage-submission-analysis.json (25742c05), puis checkpoint privé courant. La campagne humaine et la QA d474 restent intouchées ; cette mesure porte sur trois rôles humains et ne qualifie pas des animaux en marche.

## Extension aux mises à jour mixtes

Après cette acquisition Native, la même reconstruction directe a été étendue aux upserts de ressources dont les identifiants existent déjà, accompagnés de tuples de croissance disjoints. Les insertions, suppressions et ordres explicites gardent le chemin générique. FULL retient upserts puis croissance ; BASE retient seulement les upserts. Les collisions upsert/croissance et les refus tardifs restent transactionnels.

Source courante RPA800bccba, carte2080 f6d82c77, schéma297. Trois nouveaux contrats privés PASS15,409s ; intégré6PASS14,192s (trois nouveaux et trois cas de croissance seule touchés), type15,615s et PagesCODE3,676s. Les autres contrôles acquis ne sont pas rejoués.

Une seule comparaison W/C/W cible la forme mixte à17 922tuples et un upsert existant, ainsi qu’une insertion générique à un tuple :300appels par cas et par bras, huit échauffements, dix blocs conservés. Projection de ressources uniquement depuis98238, sans Engine ni nouvelle campagne.

| Cas et mesure, ms | Témoin1 | Candidat | Témoin2 |
| --- | ---: | ---: | ---: |
| Mixte : temps écoulé | 2171,757 | 1092,463 | 2202,277 |
| Mixte : CPU processus | 2483 | 1453 | 2624 |
| Mixte : CPU du fil | 2173 | 1078 | 2204 |
| Insertion générique : temps écoulé | 929,217 | 875,519 | 921,673 |
| Insertion générique : CPU processus | 984 | 921 | 1109 |
| Insertion générique : CPU du fil | 937 | 860 | 921 |

Les sorties complètes, indices, slots et journaux sont identiques ; le RAW reste inchangé. Un Map temporaire disparaît seulement dans la branche mixte. Le premier brouillon du benchmark avait un accès à indices.length invalide pour le cas générique : détecté et corrigé avant toute exécution, sans changer les oracles.

Cela reste un gain de fonction, pas une preuve de fluidité globale. Le Native524 ci-dessus exécutait46fed : il ne qualifie pas800b. Aucune charge utile par collection n’avait été capturée ; le pic Native de36,8ms ne peut pas être attribué avec certitude à la forme mixte. La préparation hors du fil de dessin n’est à ce stade qu’une proposition privée, pas une fonctionnalité livrée.

Le complément d’horloge acquis observe801Core confirmés sur4021,1ms entre ses deux horodatages réels, soit199,2Core/s pour une consigne nominale360Core/s à×6. C’est le débit admis de cet essai instrumenté, pas une perte CPU ou une régression mesurée contre un témoin. Les trois arrêts après200ms atteignent le front confirmé11639 pendant une arête encore active ; la prochaine publication n’était pas encore arrivée. Ces attentes ne doivent pas être masquées par une prédiction de mouvement.
