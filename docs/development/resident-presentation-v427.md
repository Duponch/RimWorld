# V427 — Les Éclaircies : admission et apparence de présentation

**Lot qualifié par reprises — 18 octobre 2026.** Le lot intégré réduit fortement le coût d'admission MAIN et améliore l'orbite dans le relevé court des Éclaircies ; le confort global reste ouvert. La progression en vue fixe est faible et `applyWorld` demeure coûteux. Schéma 263 inchangé ; produit publié `6e06f474`, déploiement `a831993d`.

Le retour humain concerne les ralentissements globaux en jouant, particulièrement dans une vue perspective large et inclinée. Une caméra fixe en pause ne représente pas ce confort : la même scène passe ici de 214,92 images/s en pause fixe à 29,16 images/s en rotation à ×1, avec un intervalle RAF maximal de 479,1 ms. Le diagnostic isole l'admission MAIN, l'application des scènes, la simulation Worker et le GPU avant de modifier ces responsabilités.

## Scène et mesures de départ

Entrée publique **Les Éclaircies — fondations V419**, tick 1730, une carte 250², trois colons, 28 208 ressources, 416 structures, 56 animaux. Fichier `public/test-saves/v419/les-eclaircies.json`, SHA-256 `49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f`. Chrome natif headless 155, WebGPU AMD RDNA-1, Ryzen 5 3600, 16 Go, surface 2560×1440, DPR 1. L'identification du périphérique GPU renvoyée par le navigateur est vide. Textures, herbe, diorama, pièces et occlusion du décor actifs ; ombres 2048/60 Hz, son et musique coupés.

Les orbites utilisent le même geste réel de 300 mouvements et repartent de la même pose après un véritable import UI ; position, quaternion, cible, span et zoom sont comparés à une tolérance absolue de 10⁻⁴. La durée demandée est de quatre secondes, mais la trajectoire est ralentie par les blocages et les allers-retours du pilote : la durée réellement acquise est conservée.

| Produit normal | Durée réelle | Images/s | CPU image moyen | RAF p95 / p99 / max |
| --- | ---: | ---: | ---: | ---: |
| Pause, fixe | 4,0155 s | 214,92 | 3,81 ms | 8,4 / 8,4 / 8,5 ms |
| Pause, orbite | 4,2017 s | 127,33 | 6,63 ms | 12,5 / 12,6 / 16,6 ms |
| ×1, fixe | 4,0895 s | 69,20 | 9,41 ms | 54,2 / 112,4 / 141,6 ms |
| ×1, orbite | 13,7865 s | 29,16 | 18,18 ms | 120,8 / 166,8 / 479,1 ms |

À ×1 fixe, 24 adoptions coûtent en moyenne **28,85 ms** dans le Decoder fermé, et 22 applications **49,52 ms** dans `applyWorld`. En orbite, 83 adoptions coûtent **33,86 ms** et 66 applications **60,23 ms**. Les lots Worker avancent respectivement de 24 et 83 ticks pendant ces fenêtres ; le pas déclaré moyen vaut 33,01 / 45,53 ms, l'encodage 22,54 / 32,59 ms et le lot complet d'avancement 60,95 / 89,50 ms. Le lot inclut simulation, observateurs, encodage et publication ; ces durées, celles du Decoder et du CPU image se recouvrent et ne s'additionnent pas.

## Ablations et profil : diagnostic seulement

Deux gates temporaires QA gardent commandes, réponses et progression Worker, après réimportation réelle. `no-delivery` conserve le Decoder mais omet la livraison des nouvelles scènes au renderer/HUD ; `no-decode` ignore seulement les snapshots avant le client, après leur arrivée IPC. Elles ne font partie d'aucun produit et ne constituent pas des gains livrables.

| Gate QA, ×1 orbite | Durée réelle | Images/s | CPU image moyen | RAF p95 / p99 / max | Ticks Worker observés |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sans livraison des nouvelles scènes | 5,3011 s | 89,23 | 7,74 ms | 33,4 / 54,2 / 120,8 ms | 32 |
| Sans décodage des nouveaux snapshots, reprise 02 | 4,7188 s | 94,52 | 8,67 ms | 16,6 / 24,9 / 100,0 ms | 28 |

Des scènes déjà en attente terminent encore leur application : deux appels `applyWorld` dans la première gate, trois dans la seconde. Leurs histoires temps réel et leurs durées diffèrent ; ces résultats désignent les coûts MAIN comme un levier important sans fournir une soustraction causale exacte entre Decoder et rendu, ni exclure les coûts Worker/GPU.

Le profil MAIN pondéré séparé à ×1 fixe attribue **1 559,825 ms** à `applyWorld`, dont **1 230,133 ms** à `updateResources` et **792,419 ms** à `NaturalResourcePresentation`. Les groupes inclusifs `plants` (532,634 ms) et `flora-presentation` (573,349 ms) se recouvrent avec ces appels. Le profil dure 7,159 s autour d'une capture de 4,0501 s et inclut préparation/restitution, dont un premier échantillon `(program)` de 1 313,723 ms non attribué ; ne pas diviser ces totaux par quatre secondes ni comparer ses FPS aux fenêtres sans profil.

La capture GPU indépendante de 2,0506 s, sans profiler CPU, couvre 85 images résolues : **5,729 ms** de somme moyenne des passes, p95 7,312 ms, maximum 8,778 ms. Il s'agit des requêtes de passes fraîches et couvertes, pas du temps de tout l'appareil. Le coût du GPU demeure matériel pour l'objectif de 200 images/s ; ces seules modifications CPU ne démontrent pas cet objectif.

## Deux changements intégrés

1. **Projection résidente issue du Worker fixe.** MAIN choisit dans son code un entrypoint Worker dédié et un assembleur de lecture. Le même moteur autoritaire émet une enveloppe distincte ; l'assembleur contrôle forme, révisions, indices, références, continuité et commit atomique, sans rejouer toutes les règles métier d'une sauvegarde sur chaque publication. Aucun flag du paquet public n'accorde cette voie. Le Decoder public, l'import strict et l'export complet du Worker restent leurs autorités ; journaux WeakMap, géographie, eau, ordre natif, refus tardif et resynchronisation conservent leurs contrats.
2. **Passe commune d'apparence naturelle.** Une évaluation synchrone partage croissance, taille quantifiée, maturité et perte de feuilles entre le propriétaire naturel, les chunks détaillés et la vue éloignée. Substrats et intégrales identiques sont calculés une fois par combinaison/ancre dans cette passe, avec fertilité hydroponique individuelle et la formule publique inchangée. La passe est abandonnée à chaque lecture/reset ; le parcours conservateur du climat géographique 4 reste en place. Aucun changement de cadence SIM, PRNG, qualité visuelle ou sauvegarde n'est proposé.

Ce premier périmètre conserve le format World de lecture, les copies de tableaux modifiés, les parcours de l'encodeur, le structured clone et la cadence actuelle sans contre-pression. Il ne constitue pas encore la projection numérique persistante complète recommandée par l'audit V424. Les mesures ci-dessous portent sur le couple intégré ; aucun gain global isolé n'est attribué à la passe naturelle.

## Échecs, reprise et conservation

`native01` reste **rouge au timeout de 240 s** après cinq fenêtres acquises. Le quatrième import, destiné à `no-decode`, avait fini ; la préparation caméra n'a pas terminé avant la limite. Les imports prennent environ 48–52 s. Les cinq captures sont conservées : ce rouge n'est ni effacé, ni présenté comme un bug produit démontré, ni transformé en campagne verte.

`native-resume02` acquiert seulement la fenêtre manquante, puis un véritable réimport de récupération, le profil MAIN et le GPU distincts. Sa preuve est complète, `errors: []`. L'export final au **tick 1803** est validé strictement et sa représentation entière est identique à celle adoptée dans le navigateur ; SHA-256 `4d07f55ae2c47cbe62f16fca964af4f825abe2d3831eb89b07938256f66680f6`. Cette conservation qualifie cette reprise ; elle ne prouve pas une campagne exhaustive ni une nouvelle recharge après cet export final.

## Résultats après intégration

La base mesurée est `81d917022e2c099993943fa20af3838bfc54f211`. Le candidat correspond aux sources de travail intégrées puis gelées, déclarées `v427-integrated-frozen-source`, encore sur ce même HEAD ; le reçu d'intégration distingue les fichiers avant/après. `native-resident03` passe en **95,576 s**, avec un seul import, les deux fenêtres normales ×1, la même référence caméra/réglages et aucune ablation ni profil.

| ×1 normal | Images/s avant → après | CPU image moyen avant → après | RAF p95 / p99 / max avant → après |
| --- | ---: | ---: | ---: |
| Fixe | 69,20 → 74,01 | 9,41 → 10,33 ms | 54,2 / 112,4 / 141,6 → 50,0 / 79,4 / 141,5 ms |
| Orbite | 29,16 → 70,64 | 18,18 → 10,93 ms | 120,8 / 166,8 / 479,1 → 41,7 / 87,4 / 124,9 ms |

L'admission complète passe de **28,85 à 2,60 ms** en moyenne en vue fixe (24 → 25 adoptions), et de **33,86 à 2,54 ms** en orbite (83 → 37). `applyWorld` reste à **54,79 ms** en vue fixe (23 appels ; avant 49,52 ms/22) et **47,08 ms** en orbite (32 appels ; avant 60,23 ms/66). Le geste de 300 mouvements dure 13,7865 → 6,2001 s ; les fenêtres fixes 4,0895 → 4,1211 s. Les histoires SIM diffèrent : candidat fixe1736–1761, orbite1763–1800, avec25/37ticks Worker observés. Les pas Worker déclarés moyens sont40,64/29,49ms et les lots complets72,36/57,68ms ; ce relevé ne démontre pas d'amélioration générale de la simulation.

La baisse du coût de l'admission est mesurée sur le lecteur remplacé. Le gain de cadence en orbite est acquis pour cette paire courte avec le couple intégré ; il ne prouve pas un confort général rétabli. La vue fixe progresse peu, son CPU moyen augmente et son pire intervalle RAF reste presque identique. Les durées différentes, le ralenti du pilote pendant les blocages et l'absence de répétitions interdisent une attribution FPS précise à chaque changement.

`native-resident-profile04` passe séparément en **93,064 s** : une seule capture MAIN fixe de4,038s, sans GPU ni gate. Sur un profil de7,364s, `applyWorld` représente **1 901,019 ms**, dont `updateResources` **1 515,640 ms**, soit environ80% ; `NaturalResourcePresentation` représente970,395ms inclusifs. Le premier échantillon `(program)` couvre1 987,615ms non attribués. Ces groupes se recouvrent, incluent les marges de profilage et ne se divisent pas par les seules quatre secondes. Les FPS instrumentés ne sont pas comparés au natif normal. Ce profil oriente la suite vers l'application des ressources ; il n'établit aucune amélioration globale isolée de la passe naturelle.

Les preuves03/04 sont complètes, `errors: []`. L'export final03 est strictement validé et entièrement identique à la vue admise au **tick1802**, SHA-256 `dfd34662628c273ccb0920b6d0ed50c15b7b81ef5a808b4fcb6ffe7630a8c385`. Après profil04, même conservation entière au **tick1782**, SHA-256 `4bc897cfaa5ce07dc350ea9817ac5bc999d287e831cb2a7e8df34b2fbaefde37`. Ces exports ne prétendent pas démontrer une nouvelle recharge après leur acquisition.

## Contrôles acquis et suite attendue

`build:pages` intégré passe en reprise en **23,749s**, typage inclus, avec les deux entrypoints Worker émis. Les **75 cas ciblés distincts** sont acquis par reprises : première passe14fichiers,51/75verts et24rouges conservés ; reprise des quatre fichiers réparés26/26verts, dont deux cas déjà verts (51+26−2=75). Les13nouveaux cas de projection et les6d'apparence figurent dans cette qualification. Ce n'est ni une suite complète ni une unique passe75/75.

Les réparations restent des corrections de doubles/oracles : méthode `discardDraftPreview` absente du mock Worker ; fixture d'éclipse qui sautait l'horloge sans actualiser `deterioration.lastTick` ; comparaison des journaux/index au World SIM au lieu de la vraie projection enregistrée. Les assertions de refus, faute, conservation, ordre, buffers et uploads sont conservées ; ces corrections ne justifient aucun assouplissement produit.

`npm run test:presentation` passe en **176,227s**, Chrome natif, minage puis abattage45s chacun avec alternances×6/×1/×3. Aucun saut brut/de transition, excès de déplacement continu ni occupation solide détecté. Ce parcours utilise sa fixture naturelle250² et ne remplace pas les mesures des Éclaircies. Journal `tmp/validation-runs/v427-presentation-2026-10-18T20-04-04.131Z-25524/output.log`. Les prototypes privés de la suite V428 ne font pas partie de ce lot ; leur gain reste à établir.

Le commit produit `6e06f4744422bbe1b0210d1eccd6bbc17e5cbee6` est poussé sur `origin/main`. Son nouveau build Pages passe en35,013s, typage des fixtures réparées inclus ; paquet inspecté dans `tmp/elsewhere-pages/v427-package-OU73ih`, 70fichiers publics de sauvegarde/catalogue exactement conservés, aucun laboratoire ni marqueur QA connu. Publication16,462s : [déploiement a831993d](https://a831993d.elsewhere-cq7.pages.dev), [adresse stable](https://elsewhere-cq7.pages.dev). Les138réponses HTTPS des adresses stable et immuable sont exactes (statut200, MIME, SHA-256), rapport `tmp/elsewhere-pages/v427-http-4Ik6WK/report.json` ; paquet, sauvegardes publiques et HEAD inchangés pendant le contrôle. Cette vérification prouve la disponibilité des fichiers, pas de nouveaux FPS en ligne. Le contrôle inclut désormais les deux entrypoints Worker compilés, soit69chemins par origine. Aucune nouvelle mécanique, migration ou modification des sauvegardes publiques ; aucune suite complète ni campagne longue nouvelle revendiquée.

## Traces conservées

- [Baseline native01](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native01/native-public-Eclaircies17-22bf6-unded-normal-and-QA-windows/summary.json) et [preuve initiale incomplète](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native01/native-public-Eclaircies17-22bf6-unded-normal-and-QA-windows/proof.json).
- [Reprise02](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native-resume02/resume-public-Eclaircies17-69761--decode-and-MAIN-x1-profile/summary.json), [preuve complète et export1803](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native-resume02/resume-public-Eclaircies17-69761--decode-and-MAIN-x1-profile/proof.json), [GPU distinct](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native-resume02/resume-public-Eclaircies17-69761--decode-and-MAIN-x1-profile/gpu-separate-x1-stable.json).
- [Analyse MAIN pondérée](E:/Code/RimWorld/tmp/performance-eclaircies-v427/baseline-main-weighted.json), [contrat de projection](E:/Code/RimWorld/tmp/performance-eclaircies-v427/projection-candidate/README.md), [contrat d'apparence](E:/Code/RimWorld/tmp/performance-eclaircies-v427/natural-candidate/README.md).
- [Comparaison normale03](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native-resident03/native-public-Eclaircies17-a5f0c--normal-x1-stable-and-orbit/summary.json) et [preuve/export1802](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native-resident03/native-public-Eclaircies17-a5f0c--normal-x1-stable-and-orbit/proof.json) ; [profil04 et export1782](E:/Code/RimWorld/tmp/performance-eclaircies-v427/native-resident-profile04/profile-public-Eclaircies1-34baa-MAIN-x1-stable-profile-only/proof.json), [analyse pondérée candidate](E:/Code/RimWorld/tmp/performance-eclaircies-v427/candidate-main-weighted.json), [reçu d'intégration](E:/Code/RimWorld/tmp/performance-eclaircies-v427/integration-receipt.json).
- [Build intégré repris](E:/Code/RimWorld/tmp/validation-runs/v427-integrated-build-reprise-2026-10-18T19-50-34.908Z-26608/output.log), [51/75 et rouges initiaux](E:/Code/RimWorld/tmp/validation-runs/v427-integrated-targeted-2026-10-18T19-51-05.344Z-34288/output.log), [reprise26/26](E:/Code/RimWorld/tmp/validation-runs/v427-repaired-regression-2026-10-18T19-56-10.303Z-30728/output.log).
