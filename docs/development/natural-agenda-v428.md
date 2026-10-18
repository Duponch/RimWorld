# Apparence naturelle géographique — V428

**Qualification ciblée acquise par reprises — 18 octobre 2026, schéma 263 inchangé.** Suite du [diagnostic des Éclaircies V427](resident-presentation-v427.md) : après réduction de l'admission, l'application des ressources représentait encore environ80% du temps de `applyWorld` dans le profil séparé. Dernière paire native en rotation×1 :106,34→131,16images/s, pire intervalle83,3→41,7ms. Gain partiel et fenêtres courtes ; premiers résultats mixtes conservés, aucun200FPS stable annoncé. Publication en préparation.

## Changement

Le module `natural-presentation-events.ts` étend l'agenda existant aux climats géographiques4. Les apparences déjà calculées restent résidentes ; les journaux de modifications et les échéances de changement permettent d'éviter le parcours de toutes les plantes immatures à chaque application. La formule publique de croissance et les tailles dessinées restent exactes, sans baisse de qualité ou changement de cadence de simulation.

Les cinq valeurs climatiques stockées, le calendrier, la révision, le site et le marqueur irrégulier sont capturés tels quels. L'amplitude issue du calcul géographique float32 n'est pas soumise à l'équation du climat2. Les dépendances comprennent aussi les trois types de toiture, le substrat autorisé, l'absence de dépendance à la fertilité pour certaines espèces et les plantes de grotte. Les mêmes échéances courtes, recherches par les requêtes originales, frontières de jour/année/éclipse, journaux et replis conservateurs sont utilisés.

Aucune sauvegarde, autorité métier, formule SIM, identité, propriétaire, PRNG ou capacité GPU n'est modifié. L'initialisation reste proportionnelle aux ressources ; les toitures et véritables changements thermiques peuvent encore imposer un travail large. Les rebases thermiques sont conditionnelles à un changement de facteur, pas un renouvellement inconditionnel de toute la forêt tous les six ticks. Ce lot ne réduit pas les parcours de l'encodeur ni la charge GPU.

## Vérifications

- Revue indépendante de la candidate privée : aucun bloqueur concret identifié, sans exécution par les agents. ROOT seul a exécuté les contrôles.
- Types privés acquis8,335s ; **23cas/3fichiers acquis49,641s**. Oracles publics et V225, contexte géographique exact, grotte, fertilité/substrat, toitures, jours/années, feuilles, rebase thermique préparée, checkpoints et éclipses. Le cas de la sauvegarde publique des Éclaircies vérifie sérialisation entière et continuation identique après un vrai tick.
- Intégration centrale de quatre fichiers vérifiés par SHA du texte normalisé : un module produit, trois fichiers de tests. Reçu `tmp/performance-eclaircies-v428/integration-receipt.json` ;1738sources gelées pour le navigateur.
- Build intégré Pages/typage acquis27,595s ; **18cas/2fichiers des consommateurs acquis27,555s**, dont géométrie, buffers et dirtiness. Avec les23cas privés distincts :41cas acquis, pas une suite complète.
- Aucun changement du bridge, de l'interpolation des acteurs ou des phases de travail depuis V427 ; parcours minage/abattage acquis sur ces mêmes composants en V427. La frontière temporelle modifiée ici concerne les observations naturelles, comparées aux requêtes exhaustives dans les cas ciblés.

## Premier relevé natif : résultat mixte conservé

`v428-eclaircies-native-2026-10-18T20-13-16.832Z-31788` passe99,107s. Même fichier public1730, même caméra large inclinée et qualité2560×1440 que V427/native03. Fixe74,01→88,06images/s, apply54,79→21,37ms, RAF maximum141,5→50,1ms. Orbite70,64→54,10images/s, apply47,08→33,41ms, RAF maximum124,9→162,5ms : ce relevé n'établit pas un gain général et interdit une publication motivée uniquement par le fixe.

La fenêtre fixe dure4,0312s/355images ; l'orbite7,7631s/420images. Worker déclaré en orbite29,49→48,80ms et encodeur22,23→33,55ms sont eux aussi plus lents, sans changement de ces composants. Après le relevé, Firefox consomme environ2,14cœurs et System0,76 dans l'instantané hôte ; cela ne mesure pas leur charge exacte pendant les fenêtres. L'utilisateur met Firefox au repos ; une nouvelle paire séquentielle V427/V428 est décidée pour cette incertitude précise, sans effacer le résultat initial. Le code suggère aussi une vague de recertifications32–63ticks après l'import ; ce n'est pas encore une cause mesurée du pic145,3ms d'apply au1777.

Preuve native01 complète, errors vide, export strict entier au **tick1813**, SHA-256 `1449f15a98635afe0673798db36e92c24d72b2cb88c86597a7516ef3266a13d0`, comparaison navigateur entière exacte. Traces dans `tmp/performance-eclaircies-v428/native01/native-public-Eclaircies17-13b53--normal-x1-stable-and-orbit/`.

## Reprise après mise au repos de Firefox

Instantané hôte préalable conservé dans `tmp/performance-eclaircies-v428/quiet-host-before.json` : Firefox absent des dix processus les plus actifs, environ7,6Go de mémoire physique libre. Les1738sources V427 puis V428 sont vérifiées intégralement, avec un seul module alterné et historique des SHA. `quiet-baseline02` passe71,367s, puis `quiet-candidate03`70,958s ; mêmes gestes/réglages, vrais imports distincts. La charge système n'est pas neutralisée expérimentalement pendant chaque image.

| ×1, paire reprise | V427 → V428 images/s | CPU image moyen | RAF p99 / maximum | Application moyenne |
| --- | ---: | ---: | ---: | ---: |
| Fixe | 138,82 → 181,71 | 5,76 → 4,28ms | 45,7 / 100,0 → 20,9 / 37,6ms | 39,12 → 13,77ms |
| Orbite | 114,33 → 100,77 | 6,92 → 7,58ms | 41,8 / 75,0 → 37,6 / 62,5ms | 31,26 → 19,80ms |

Fenêtres fixes4,070/4,023s (565/731images) et orbites4,9504/5,1504s (566/519images). Les mêmes300mouvements ne donnent pas une vitesse angulaire ni une histoire SIM instantanée identiques. Les pas Worker moyens en orbite sont23,67/28,63ms et l'encodage18,95/20,82ms ; leurs sources restent identiques. Le coût d'application et les longues images diminuent, mais la moyenne d'orbite reste défavorable dans cette deuxième paire. Publication V428 différée pour diagnostic MAIN/rendu, V427 demeure publiée.

Exports finaux stricts et comparaisons navigateur entières exactes, preuves complètes sans erreur : référence au1793, SHA-256 `c88e6572916ed9d41c1f8122eda22e1e2fc18d23ea941dab4ff7e64d57f78c62` ; candidate au1794, SHA-256 `62451109b80e9c3fa0d7a0ccf4b4897a5e47e924661039eedc281187d6e7766f`. Traces dans les dossiers `quiet-baseline02` et `quiet-candidate03`. Aucun gain200FPS stable, aucune nouvelle recharge après ces exports, aucune extrapolation générale×6 annoncée.

## Profil du coût restant

`v428-main-profiles-2026-10-18T20-22-20.074Z-1544` passe70,030s : deux profils distincts après un seul import, fixe puis orbite ; pas de GPU simultané ni comparaison de leurs FPS instrumentés. Dans le profil orbite4,981s autour d'une capture4,3172s, `renderScene` représente2744,864ms inclusifs, `_renderObjectDirect`2207,731ms et les ombres897,122ms, contre145,336ms pour `NaturalResourcePresentation` et116,679ms pour son agenda. Ces temps se recouvrent. Le premier échantillon couvre466,854ms de programme non attribué ; le total programme est1066,178ms. Le GC représente39,751ms.

Dans le profil fixe5,687s, autour de4,0179s capturées, `renderScene` représente2571,978ms et `applyWorld`371,004ms, avec1335,655ms non attribuées au premier échantillon. Les captures/profils n'ont pas les mêmes histoires ni la même durée que les relevés V427 ; aucun ratio causal de gain n'est tiré de leurs totaux. Ils désignent désormais la soumission de rendu comme levier principal, pas une nouvelle micro-optimisation de croissance.

Preuve complète sans erreur, export entier strict exact au1801, SHA-256 `985abd169167ecb6cc09a591827f3e174eb9c2ac3cf7478019ab5957c11b6bbc`. Sources toujours gelées ; analyse pondérée `tmp/performance-eclaircies-v428/main-weighted.json`. Une ablation privée de rétention du paysage détaillé est préparée, avec GPU séparé et oracle pixels ; elle reste hors produit et n'est pas un gain acquis.

## Rétention du paysage détaillé : piste écartée

Les deux exécutions privées `retention-normal05` et `retention-force06` mesurent la même sauvegarde, les mêmes300gestes et le même départ large incliné. Elles importent de nouveau la carte avant chaque orbite et effectuent un GPU fixe2s distinct avant celle-ci : ce protocole diffère de la paire fixe→orbite précédente. Aucune comparaison de gain produit n'est faite entre ces deux protocoles. Le seul changement QA force la politique de rétention du paysage ; qualité, géométrie, cadence et options restent constantes. Les sources produit sont gelées et inchangées.

| Orbite agressive | Normal → rétention forcée | CPU image moyen | RAF p99 / maximum |
| --- | ---: | ---: | ---: |
| Pause | 190,49 → 193,94images/s | 4,40 → 4,19ms | 8,4 / 12,6 → 8,4 / 16,8ms |
| ×1 | 141,93 → 132,95images/s | 5,56 → 5,24ms | 25,0 / 33,3 → 29,2 / 41,6ms |

Les sommes GPU des passes résolues, dans les fenêtres fixes séparées, augmentent : pause2,803→3,397ms et×1 3,412→3,868ms ; p95×1 6,468→7,625ms. Ce ne sont ni le temps GPU de tout le périphérique ni des mesures pendant l'orbite. Les vrais bundles sont rejoués : en×1 forcé25enregistrements et593rejeux MAIN, contre25/592en ombre. Le léger gain CPU n'améliore pas la cadence×1 dans cette paire : **piste écartée, aucun raccord produit**.

Les exécutions restent **rouges** (`v428-retention-normal`,116,973s ; `v428-retention-force`,121,083s) : l'oracle pixels normal→retenu diffère de65357puis65014pixels. Rejeu retenu et réenregistrement frais sont exacts, mais ne prouvent pas l'équivalence avec l'ordre de dessin ordinaire. Lecture du Three186 installé : les sous-listes de bundle ne passent pas par le tri global et les bundles précèdent tous les objets ordinaires. Une cause précise par mesh ou ombre n'est pas établie ; l'assertion n'a pas été assouplie et aucun correctif spéculatif n'est intégré. Caméra/lumière/World constants et70objets MAIN correctement enregistrés ne suffisent pas à garantir l'image.

Les exports entiers stricts, réalisés avant l'assertion pixels, sont néanmoins exacts : normal au1783, SHA-256 `250ddbbe321a0526b37f117b50408a9b0b9f0fed9635dd2fe9af4b7f1ded320e` ; forcé au1785, SHA-256 `d2805d52976f8fa578c2e16a5c20df92bd3cbd64925795e097d68558fb1f57bf`. Les preuves restent incomplètes à cause de l'image ; PNG, captures, phases, GPU et échecs sont conservés dans `tmp/performance-eclaircies-v428/retention-normal05` et `retention-force06`.

## Parcours terrain de l'encodeur : prototypes différés

Le cache terrain relit62500cases par publication, y compris2322propriétaires minables dans Les Éclaircies. Deux prototypes privés ont été mesurés successivement : lecteur strict capturant une seule fois les trois descripteurs du propriétaire, puis même lecteur avec cinq bits par case pour éviter les recherches dans des Maps dont les entrées précédentes sont absentes. Ils ne sont **pas intégrés au produit** : le gain sur l'envoi complet est faible par rapport à la priorité de livraison. Leur revue statique ne trouve pas de bloqueur concret ; leurs18cas préparés ne sont pas annoncés exécutés.

Le même microbanc Node/Vitest emploie la sauvegarde publique1730, seize échauffements par côté puis96appels mesurés par côté en cohortesABBA/BAAB. Il mesure le cache terrain puis le vrai `SnapshotEncoder.encode` entier. Import, validation, clones et égalités strictes des paquets restent hors chronométrage ; le World entier demeure strictement inchangé. Ce n'est ni le débit du Worker en simulation, ni le transit, ni des FPS.

| Prototype | Médiane cache terrain A → B | Médiane encodeur entier A → B | Moyenne encodeur entier A → B |
| --- | ---: | ---: | ---: |
| Lecteur strict seul | 13,707 → 13,116ms | 26,067 → 25,437ms | 26,142 → 25,742ms |
| Lecteur et présence sparse | 13,714 → 11,681ms | 25,773 → 24,263ms | 25,971 → 24,910ms |

Le p95 de l'encodeur complet ne s'améliore pas :27,768→28,183ms puis27,522→28,618ms. `v428-reader-bench` passe26,883s et `v428-presence-bench`26,766s, un cas de banc chacun ; ce ne sont pas deux qualifications produit. Copie initiale et résultat conservés dans `reader-bench-original01`, seconde copie dans `reader-bench`, sous `tmp/performance-eclaircies-v428/`. Les sources de ces prototypes, préimages et tests préparés restent dans `mineable-reader-candidate` et `mineable-presence-candidate`. La V428 livrable demeure limitée à l'agenda naturel.

## Paire finale de rotation, à protocole identique

La paire `final-baseline07` puis `final-candidate08` réutilise les deux imports, la préparation caméra, les300gestes agressifs et les fenêtres GPU fixes séparées du pilote précédent. La rétention reste **normale pendant tout l'essai** ; l'oracle qui force temporairement cette piste écartée est explicitement omis. Cela ne transforme pas ses rouges en succès. Les1738sources V427 puis V428 sont vérifiées avant/après, avec le seul module d'agenda alterné. Chrome155 natif WebGPU AMD, Ryzen5 3600,2560×1440DPR1, qualité et ombres2048/60Hz identiques, après fermeture des applications signalées. Serveur local de développement, pas mesure du paquet Pages compilé.

| Rotation agressive, V427 → V428 | Images/s moyens | CPU image moyen | RAF p99 / maximum | Images >50ms |
| --- | ---: | ---: | ---: | ---: |
| Pause | 184,89 → 185,51 | 4,56 → 4,54ms | 8,4 / 12,5 → 8,4 / 8,5ms | 0 → 0 |
| ×1 | 106,34 → 131,16 | 7,33 → 5,43ms | 54,2 / 83,3 → 29,1 / 41,7ms | 7 → 0 |

L'application moyenne d'un état passe34,36→15,49ms, son maximum69,2→22,0ms. Les fenêtres pause comptent742/746images en4,0131/4,0214s ; ×1 compte553/575images en5,2003/4,3839s. Le départ×1 est au1756 dans les deux cas ; la fin est1787/1782, car le même nombre de gestes n'impose pas la même durée. Les captures ne sont donc pas des histoires SIM ni vitesses angulaires identiques à chaque instant. Gain moyen de rotation observé :+23,3% dans cette paire, avec moins de longues images ; pas une garantie générale ni une extrapolation×6.

`v428-final-baseline` passe115,861s, puis `v428-final-candidate`115,409s. Preuves complètes, erreurs vides, aucune commande perdue ni livraison écartée. Exports complets stricts et comparaison navigateur entière exacts : référence au1788, SHA-256 `23e31a42b152d7ff690aaaa769af56254c0d6704f61fefca396b39333a39cdc0` ; candidate au1784, SHA-256 `f36f0f987e97b08e30bb7bccaf11b87deecc5612a5bbd05f044fcaa77ec4fe7b`. Pas de nouvelle recharge de ces deux exports ; les imports initiaux stricts utilisent la sauvegarde publique1730 inchangée.

## Décision et suite

Livrer l'agenda naturel seul : un module produit, trois fichiers de tests, aucune nouvelle mécanique ou migration. Les essais de rétention et d'encodeur restent privés. La paire finale permet de livrer un progrès de rotation et de longues images, sans effacer la paire précédente défavorable ni attribuer à ce lot tous les gains dus à la mise au repos des autres applications.

Les200images/s stables restent hors d'atteinte démontrée : le budget est5ms, alors qu'une application d'état peut encore coûter22ms et qu'une image de cette dernière fenêtre atteint41,7ms. Les deux responsabilités suivantes sont les mises à jour graphiques précalculées et bornées, puis un vrai journal des mutations du terrain à la place des62500comparaisons par publication. Le premier vise les coupures de MAIN ; le second vise le débit et le coût fixe du Worker. Déplacer le même parcours dans un autre thread ou langage ne suffit pas à établir un gain ; aucune migration globale n'est lancée pour ce lot.
