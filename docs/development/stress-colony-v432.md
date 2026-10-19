# V432 — Les Forges, référence de charge en ×1

La demande humaine recentre les performances sur ×1 : dépasser 200 FPS et viser 220–230, y compris pendant les mouvements de caméra. Les Forges devient la référence de charge principale ; Les Aulnes, Les Éclaircies et le départ neuf restent nécessaires pour détecter les régressions dans d'autres contextes. Créer cette partie ne constitue pas un gain de performances. Schéma 263 inchangé.

## Partie préparée et travail réellement observé

La carte de 250×250 provient du départ géographique original V419, créé par les menus, au tick 35 (SHA-256 `748409f4b5ceba787fd59db233c2580433895cd530a077ac3fa9a1d885392df0`). Le générateur de fixture conserve cette source et produit une nouvelle partie distincte. Les scripts `create-stress-colony-v432.ts`, `stress-colony-layout-v432.ts`, `stress-colony-animals-v432.ts` et `stress-colony-observation-v432.ts` sont des outils de préparation, pas du code embarqué dans le jeu.

Au tick 335, la partie contient :

- 80 colons vivants : les trois personnes originales et 77 personnes préparées avec de nouvelles identités ; huit quartiers et 80 chambres.
- 241 animaux : 160 animaux préparés dans quatre enclos, le husky original avec son lien conservé, et 80 animaux sauvages, dont les 55 originaux. Les troupeaux réunissent muffalos, dromadaires, alpagas, yaks, canards et dindes.
- 32 champs, 4 498 cases de culture de riz, pommes de terre, coton et plantes médicinales, à différents stades de croissance.
- 7 512 structures, dont 144 lampes alimentées, 80 chauffages, 32 générateurs et 32 batteries ; huit cuisinières, huit ateliers de couture, huit ateliers de taille et huit établis de recherche. Ce total comprend 2 588 conduits et 516 clôtures, pas 7 512 bâtiments distincts.
- 256 travaux en cours ou en attente, dont 128 plans de sacs de sable ; 24 factures actives et 1 778 piles de biens finis.

Le terrain aménagé, les suppressions de végétation et de blocs sans rendement, les bâtiments, les personnes, leurs aptitudes et affectations, les stocks, le combustible, les recherches et la maturité des cultures sont **préparés**. Ils n'ont pas été acquis naturellement. Les stocks sont finis ; aucune autosuffisance ou couverture de toutes les mécaniques n'est annoncée. Les animaux utilisent les producteurs et règles actuels du jeu. Le husky, les animaux sauvages existants, les personnes et les structures d'origine ne sont pas supprimés ; les déplacements et adaptations initiaux sont consignés dans le reçu de préparation.

300 ticks ordinaires ont réellement été exécutés de 35 à 335, avec contrôles et checkpoints : 79 colons changent de case ; transport, nettoyage, récolte, semis, construction, traite et recherche sont observés. Les trajets de cuisine et confection sont observés, mais aucun repas, vêtement ou bloc fini n'est crédité par l'observateur pendant cette courte fenêtre. Les 144 lampes finissent leur démarrage ordinaire. Le World entier survit à la sérialisation, puis 12 ticks de continuation entre le World vivant et sa recharge produisent des sauvegardes exactement identiques.

Cette référence dépasse largement Les Aulnes pour les personnes (80 contre 14 colons), animaux (241 contre 19) et structures (7 512 contre 2 454). Elle n'est pas maximale sur tous les axes : le départ neuf conserve davantage de végétation naturelle. Les anciennes références restent donc utiles.

## Incident de sauvegarde corrigé

La première continuation valide atteint le tick 95, puis le contrôle au tick 125 refuse une arête animale. La reprise diagnostique isole le premier refus au tick 98 : un écureuil franchit une clôture, mouvement légal dans la simulation actuelle mais rejeté par le lecteur de sauvegarde. `wildlife-save.ts` emploie désormais la même classification native des espèces à partir du schéma 256. Les lecteurs historiques restent inchangés ; les murs, portes fermées et clôtures pour les animaux d'enclos restent refusés. Aucune règle de déplacement, horloge ou migration n'est modifiée.

Les cinq contrôles ciblés passent ; typecheck produit et outils passent. Les préparations refusées (capacité des piles, obstacles protégés, husky original et âge des biographies) restent conservées sous `tmp/stress-colony-v432`. Leurs fixtures ont été corrigées sans assouplir les validateurs. La reprise `continuation07` valide l'état final et sa continuation exacte.

## Première mesure native, avant optimisation des enclos

Chrome 155 natif, Ryzen 5 3600 / RX 5700 XT, 2560×1440 DPR1. Qualité équilibrée, ombres 2048 à 60 Hz ; textures, herbe, diorama, pièce et occlusion actifs. Fenêtres de 10 secondes, caméra large inclinée et rotation erratique au bouton droit. Sources gelées ; aucune campagne CPU simultanée. Aucun temps GPU direct n'est disponible.

| État | FPS moyens | Vitesse de simulation observée | RAF p99 / maximum |
|---|---:|---:|---:|
| Pause, caméra fixe | 173,58 | pause | 6,6 / 6,7 ms |
| ×1, caméra fixe | 115,58 | ×0,483 | 62,8 / 114,6 ms |
| ×1, rotation | 96,31 | ×0,528 | 72,0 / 131,5 ms |

Le coût moyen déclaré d'un pas Worker atteint 283,60 ms en fixe et 260,52 ms en rotation. L'application MAIN coûte respectivement 39,28 et 33,50 ms par publication. Le moteur ne tient donc pas encore la vitesse physique ×1, en plus de manquer la cible d'affichage ; augmenter les FPS en ralentissant les colons serait un faux succès.

Les trois fenêtres et les exports/recharges entiers au tick 405 sont acquis dans `native01`. Le parcours initial échoue ensuite sur le repositionnement de caméra demandé pour la dernière capture, après la recharge : la translation converge trop lentement en douze corrections. Le relevé FAIL est conservé. Une vérification séparée après l'échec confirme les 1 760 fichiers gelés sans différence. La reprise de qualification visuelle est distincte des mesures et ne transforme pas rétrospectivement ce parcours en PASS.

## Qualification complémentaire et catalogue

La reprise `v432-native-qualification` passe en 73,726 s : même export 405 importé par l'interface, nouveau contrôle entier exact et capture visuelle inspectée à une pose séparée, explicitement différente de la caméra des mesures. Les trois fenêtres ne sont pas rejouées. Le complément PASS est lié par SHA au FAIL initial conservé et à son audit de gel ; il ne remplace aucun reçu.

La 68e fiche **Les Forges · crash-test 80 colons** est ajoutée au catalogue. Le RAW public sélectionné reste au tick 335, SHA-256 `54e261830e5c803d66f98709ed413b851a43ab3051e97428e2d9aebd7b3cd52d`, 15 639 385 octets avant compression. Le codec public conserve exactement ce RAW. Les 67 anciennes fiches gardent leurs valeurs et leur ordre relatif ; les 69 anciens fichiers de sauvegarde gardent leurs octets. Le répertoire public compte désormais 71 chemins, catalogue compris. La publication vérifie à nouveau les quatre enclos physiques, les effectifs et les activités observées avant toute écriture.

Le premier outil de publication expire pendant un import Vite SSR : sa configuration privée sans exclusions déclenche une découverte des HTML historiques sous `tmp` et la surveillance du dépôt. Aucune écriture publique n'a lieu. La découverte et la surveillance inutiles sont désactivées dans cet outil ; la reprise passe en 19,167 s. Cette réparation d'outillage n'est pas une optimisation du jeu.

## Première optimisation de la charge animale

Le profil Node séparé de 24 ticks attribue 828,53 ms inclusives à `reconcileDomesticWork`. Les 160 affectations animales cherchaient leur marqueur dans les 7 512 structures, à trois phases du tick. Un index local des marqueurs, construit au premier besoin de chaque passage puis jeté, remplace ces scans répétés. Les filtres sont lus à leur valeur actuelle ; aucun cache ne survit à une commande, à un tick ou à un changement de carte. Les trois phases et leurs interruptions restent en place.

Les quatre tests ciblés passent : changement de filtre au même tick, retrait du marqueur, remplacement par un autre type et conservation d'une vraie tâche de tonte. Les états complets 335 puis 336–359 sont sauvegardés avant modification et comparés octet par octet après modification ; chaque état et la recharge finale sont strictement admis. Un premier lancement du pilote Node échoue avant son exécution à cause d'un import UI sans extension ; le pilote lit ensuite directement le RAW déjà acquis, sans changement produit.

Deux exécutions séparées, sans profileur et sans validation/sérialisation/écriture dans la fenêtre chronométrée, donnent **5 203,99 → 4 349,10 ms pour les mêmes 24 ticks**, soit −16,43 %. Ce sont des temps Node, sensibles au démarrage/JIT/GC, pas des FPS ni une preuve de débit Chrome. Les temps intercalant les contrôles de sauvegarde ne sont pas employés comme preuve de vitesse. Reçus : `tmp/stress-colony-v432/domestic-pair01` ; neuf cas ciblés au total avec les cinq cas du lecteur de clôtures. Ce n'est pas une suite complète.

La comparaison Chrome du candidat emploie le même RAW 335, la même caméra à 1e-4 près et les mêmes fenêtres/gestes. La capture illustrative après recharge ne demande plus un retour inutile à la pose de mesure ; toutes les assertions de caméra des fenêtres restent présentes. Les états successifs évoluent selon le débit réellement obtenu, pas selon un tick artificiellement imposé.

`v432-native-candidate` passe en 209,161 s, y compris les exports/recharges entiers et le vrai choix de la nouvelle fiche dans le catalogue, son chargement en pause et son export exact au tick 335. Les captures sont inspectées. Cette paire courte donne :

| État | FPS avant → index d'enclos | Vitesse physique avant → après | RAF p99 / maximum après |
|---|---:|---:|---:|
| Pause fixe | 173,58 → 179,58 | pause | 8,4 / 12,6 ms |
| ×1 fixe | 115,58 → 110,13 | ×0,483 → ×0,765 | 54,2 / 95,8 ms |
| ×1 rotation | 96,31 → 88,89 | ×0,528 → ×0,813 | 62,6 / 162,5 ms |

Le candidat ne constitue donc **pas un gain de FPS**. Les pas Worker moyens passent à 174,77/165,43 ms, mais les applications augmentent de 30 à 46 en fixe et de 32 à 49 en rotation. Leur total passe d'environ 1 179 à 1 363 ms en fixe et de 1 072 à 1 438 ms en rotation. Le coût par application diminue, tandis que le travail total de présentation augmente. Le pic de rotation régresse aussi. La seule accélération Node ne justifie pas de présenter ce candidat comme une fluidité livrée ; le prochain contrôle isole le coût MAIN avant sélection finale.

## Sélection livrée et prochaine priorité

**L'index d'enclos est retiré du produit**, avec ses quatre tests conservés dans `tmp/stress-colony-v432/domestic-candidate`. Son gain Node reste exploratoire. Après restauration, 1 751 fichiers de source et de dépendances sont identiques à ceux du relevé initial `native01` (`product-restoration.json`). Il n'est pas nécessaire de rejouer cette même mesure inchangée. Le lot livré contient la nouvelle partie, ses outils de préparation et la correction de lecture des clôtures ; **aucun nouveau gain de FPS n'est annoncé**.

Un premier profil MAIN court échoue à qualifier la rotation : le pilote place la souris sur la carte, puis clique sur la vitesse et commence le bouton droit au mauvais endroit. Le fichier CPU est conservé comme diagnostic en vue fixe, sans preuve d'orbite. La reprise replace le pointeur après ce clic et passe en 72,321 s, avec rotation réelle, même qualité et sources gelées. Sur cette fenêtre instrumentée, `renderScene` totalise environ 1 517 ms et `applyWorld` 809 ms ; ces durées inclusives appartiennent à des branches mesurées, pas à un budget GPU. Les coûts d'application sont répartis entre salissures, piles, cultures, éclairage, effets, signatures et acteurs. Le coût du listener QA peut aussi inclure la matérialisation différée de `event.data` : il ne peut pas être retranché comme une économie produit.

La priorité suivante reste une projection visuelle cohérente : préparer les données des couches coûteuses en dehors du rendu, mutualiser leurs lectures et borner leur application, en conservant séparément la confirmation exacte des mouvements et intentions. Une simple baisse de cadence de publication ou une accélération de la simulation seule ne résout pas ce problème. La référence principale est désormais **Les Forges en ×1**, avec FPS, p95/p99/pic et vitesse physique ; les trois anciens contextes servent toujours de contre-exemples. Ces observations ne démontrent ni la nécessité d'une migration de langage ni son inutilité.

Les cinq cas du correctif de sauvegarde sont acquis ; les quatre cas d'enclos et leurs comparaisons ne sont pas crédités au produit retenu. Les imports/recharges entiers et le parcours catalogue sont acquis par reprises, pas par une suite complète. Le contrôle de présentation V431 n'est pas rejoué : ce lot ne change ni horloge, bridge, interpolation ni phases de travail. Aucun objectif de 200 FPS stables ou de 220–230 FPS n'est déclaré atteint.

## Publication

Produit commité et poussé sur `origin/main` : `f15d6fd4e7ccc734d86c79bd0aa6106787250940`. Build Pages avec typage réussi en 17,659 s ; paquet vérifié dans `tmp/elsewhere-pages/v432-package-U3yRcx` : les 71 chemins du catalogue public correspondent aux octets du build, les anciennes entrées/sauvegardes restent exactes et les sondes DEV/QA sont absentes. Le dossier non suivi `references_UI` est laissé intact et exclu du paquet.

Déploiement Cloudflare Pages **`33ec3b62`**, [version immuable](https://33ec3b62.elsewhere-cq7.pages.dev) et [version stable](https://elsewhere-cq7.pages.dev). Contrôle `tmp/elsewhere-pages/v432-http-efG674` : **140 réponses HTTPS exactes** sur les deux origines, dont la nouvelle partie, le catalogue et les fichiers d'entrée/Workers sélectionnés. Cela prouve les octets disponibles en ligne ; les mesures de jeu ci-dessus viennent de Chrome local, pas d'un nouveau benchmark distant. La sauvegarde compressée publique mesure 3 651 576 octets, SHA-256 `cac80d70b366db579fddefde6f892abdfd07f81fe16f64aaf8f4b6e874ebabf1` ; son RAW reste celui du tick 335 indiqué plus haut.
