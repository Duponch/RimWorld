# Coûts Worker au repos — V421

18 octobre 2026, schéma263 inchangé. Diagnostic acquis et deux corrections ciblées en qualification sur une seule colonie. Aucun nouveau gameplay ni gain général de confort annoncé. Ce lot poursuit le [bilan V420](performance-foundations-v420.md) sur Les Aulnes et la vraie création à trois colons avant patrimoine ; leurs parties publiques et archives restent préservées.

## Mesures acquises

La paire Chrome compilée PASS308,586s conserve son **résultat mixte** : sur A, Decoder moyen32,917→27,983ms ; sur B,23,697→30,662ms, avec29adoptions contre30 et une fenêtre d'image dégradée. Cette paire compare l'extension sparse MAIN déjà livrée, pas les quatre SRC proposés ici. B162structures reste sur transport complet. Le même binaire Worker donne aussi un pas déclaré39,05→65,70ms sur B : cela n'attribue la variation ni au correctif MAIN ni à une cause système. Ordre fixe référence/puis courant, courtes fenêtres, JIT/GC et charge extérieure non contrôlés ; aucun rejeu favorable ni gain global retenu.

`stepMs` est la moyenne d'un pas `stepWorld(...,1)` sur le préfixe du lot courant, échantillonnée à chaque publication. Ce n'est pas la durée totale d'un batch ou du Worker ; les captures de présentation, l'encodage et l'envoi du bridge restent hors de ce chronomètre.

Le profilage du véritable DedicatedWorker est ensuite acquis : PASS201,453s, deux entrées exactes250², ×1,1s de chauffe exclue puis5s demandées. Les isolates Worker/MAIN sont distincts, le binaire compilé est vérifié, les sessions sont fermées et les exports/recharges entiers restent exacts aux10773 et74. Les profils bruts durent5,617s et5,966s, avec3406 et3412samples, marges de protocole comprises ; intervalle demandé1000µs. Les poids `timeDelta` sont statistiques, les coordonnées sont celles du JS compilé et les inclusifs se recouvrent : ne pas les additionner ni les transformer en durées CPU exclusives, IPC ou GPU.

Sur B, `advanceWildFlora256` porte595,141ms inclusifs, dont `captureBound`419,819 et la capture du lecteur317,384 ; `validatePlantMap256` pèse41,607ms inclusifs/40,090ms self. Une autre branche `considerFlee → nearby → hostiles → readGrid` porte246,039ms inclusifs, avec99,561ms self dans `captureWorldShotGrid`. « Sans ordre » conserve donc un travail réel. Les acteurs8/9/7 n'ont pas de menace personnelle ; les quatre mécanoïdes présents ne sont ni effacés ni désactivés pour les mesures.

## Deux corrections bornées

`wild-plant-runtime-map-256.ts` et `wild-plant-generation-256.ts` retirent les tableaux temporaires de six grilles, trois nombres et six bits par cellule ; le prédicat de tags devient stable. Les valeurs sont toujours lues dans le même ordre avant chaque groupe de vérifications, avec les mêmes refus stricts0/1, chaînes vides et comportement de `.every`. Substrat/DTO, grilles, classification physique, espèces, spawner et ordre des tirages restent inchangés.

Le banc ROOT capture+validation sur la vraie B35 est PASS18,170s : Node24.19/Ryzen5 3600, cinq paires alternées, dix appels par version après chauffe. Moyenne57,545→55,613ms, soit environ3,4% de moins ; quatre paires meilleures, une pire. DTO entier, grilles typées, tags, ordre et résolutions de toutes les définitions sont comparés hors temps ; World canonique, sources et entrée restent exacts. Le gain est faible et local : allocations d'oracle, JIT et GC non isolés, pas de mesure du tick complet, du navigateur, du Worker natif ou des FPS.

`combat-target.ts` et `threats.ts` diffèrent la lecture de grille jusqu'au véritable contrôle de ligne de vue, après les gardes de menace, âge, attaquant, distance et portage. Le quatrième argument explicite reste prioritaire ; le cinquième lecteur facultatif réemploie l'arrow existante de `shootingQueries`. Les vrais hostiles proches continuent de demander leur LOS, même sans menace personnelle. Aucun autre appelant ou prédicat n'est changé. Le banc ROOT est PASS15,181s : trois vraies requêtes `nearby` successives dans l’ordre8/9/7 sur B35, quatre mécanoïdes conservés, cinq paires alternées de deux batches par version. Moyenne13,345→0,035ms pour ces trois requêtes ; sorties complètes, identités, ordre et World canonique exacts. Les listes sont vides sur cette entrée réelle. Ce temps Node porte uniquement sur les requêtes, pas sur le tick entier, le Worker natif ou les FPS ; GC/JIT non contrôlés.

Ces quatre SRC ne changent ni règles de jeu, propriétaires, sauvegardes, schéma, migrations, RNG, cadence ou protocole. Aucun cache/index ou nouvelle architecture ajouté. Ce travail de performances ne constitue pas une progression fonctionnelle ni une parité supplémentaire.

## Qualification

Quatre nouveaux cas plantes et quatre nouveaux cas menace sont exécutés dans les fichiers existants : valeurs malformées en dernière cellule, ordre des lectures et refus sans mutation ; guards de menace, grille explicite prioritaire, lecteur défectueux, obstacles et véritables queries. Les huit ajouts passent. Première passe :28PASS/1RED sur29cas/trois fichiers en36,922s. Le rouge ancien vient du témoin de commerce qui saute à sa date de visite sans ancrer son calendrier d’usure. Seul ce témoin est ancré avant la mécanique et les assertions ; aucun validateur détendu. Reprise de ce seul cas PASS26,460s :29cas distincts acquis par reprises, rouge initial conservé.

- Adoption centrale de quatre sources SIM et trois fichiers de tests après revues indépendantes ; typage PASS17,135s. Schéma263 inchangé.
- Deux bancs Node bornés acquis ci-dessus, sans addition de leurs économies ni extrapolation au navigateur.
- Compilation QA privée PASS3,273s, même MAIN sauf nom du Worker, même CSS et observation. Natif Chrome03 PASS204,597s sur les deux entrées exactes : recharges complètes identiques10774/75, erreurs[], sessions de profil fermées et gel1744sources+8entrées/binaires exact après.

La tentative native02 reste RED18,972s avant toute entrée World ou mesure : délai d’accès localhost. Son résumé conserve zéro profil/zéro checkpoint. Le seul serveur QA ROOT est relancé avec accès réseau local autorisé ; index et Worker HTTP200 vérifiés, sans changement de code, de test ou d’entrée. La reprise03 utilise un nouveau dossier. Les sessions humaines ne sont pas touchées.

## Résultat Chrome après correction

Chrome155 natif/WebGPU, Ryzen5 3600/AMD-RDNA1,1440×1000/DPR1, même caméra orthographique et réglages équilibrés, textures/herbe/pièces/diorama, ombres60Hz/2048, son coupé. La sonde GPU reste désactivée et seul l’isolat Worker est profilé. Une seconde de chauffe exclue puis cinq secondes ×1 demandées par partie ; pas de nouveau banc FPS ou campagne.

| Mesure | Aulnes avant | Aulnes après | Départ3colons avant | Départ3colons après |
|---|---:|---:|---:|---:|
| Ticks dans la fenêtre MAIN |10740→10771|10741→10772|42→73|43→73|
| Adoptions |31|31|31|30|
| Pas déclaré moyen, ms |35,413|33,765|41,939|37,073|
| Decoder moyen, ms |28,219|27,390|19,187|23,827|
| CPU image moyen, ms |4,253|3,670|3,931|5,088|
| RAF/s |130,67|147,78|153,83|113,60|
| Intervalle d’image p99, ms |41,7|45,8|37,5|54,2|

Le résultat navigateur reste **mixte** : le pas déclaré baisse dans ces deux fenêtres, mais le départ neuf adopte un état de moins et sa fenêtre d’image se dégrade. Les Aulnes ont davantage d’images et un p99 moins bon. Ces fenêtres instrumentées headless ne démontrent aucun gain général de confort ou débit garanti sur le poste du joueur. Les champs `stepMs` ont le sens borné expliqué plus haut, pas une distribution indépendante de tous les pas.

Les profils bruts après durent5,839/5,973s,3524/3433échantillons, avec marges CDP. Poids sous `stepWorld` A1133,372→1164,128ms et B1240,816→1085,248ms ; le nombre d’appels et les marges ne sont pas contrôlés identiques. Sur B, la branche `considerFlee/nearby/hostiles/captureWorldShotGrid` n’est plus échantillonnée après ; cela soutient la suppression du travail observé, sans prouver un coût nul. La flore reste coûteuse et son poids inclusif augmente595,141→656,160ms, capture419,819→466,683 ; le microbanc plantes n’est donc pas une preuve de gain de cette branche dans Chrome. Encodage, adoption MAIN et rendu restent ouverts. Les poids inclusifs se superposent et les résultats des deux corrections ne s’additionnent pas.

Comparaison bornée de deux exécutions successives : mêmes entrées et observation, mais frontières de ticks, JIT/GC, charge extérieure et marges protocole non isolés. Les noms et coordonnées des fonctions sont relus dans chaque binaire compilé exact ; absence d’échantillon ne vaut pas absence d’exécution. Aucun nouveau gain GPU, temps total Worker/IPC ou causalité générale annoncé.

Preuves locales acquises sous `tmp/world-foundations/demonstration-v419/` : `cpu421-pair-acquired01.json`, `worker421-acquired01.json`, `worker421-analysis01.json` et `plant421-capture-bench01-report.json`, `threat421-nearby-bench01-report.json`, `worker421-acquired03.json`, `worker421-analysis03.json`, `worker421-window-comparison01-03.json` et `worker421-refused02.json`, avec leurs gels et sorties privées. Les gains des postes ne s'additionnent pas ; le confort global reste ouvert.

Contrôles de livraison : Pages PASS5,542s, documentation PASS3,918s. Présentation V418, archives et catalogue V419 réutilisés car ces contrats ne changent pas ; aucun corpus complet, campagne longue ou mesure GPU inchangée rejoué. Publication produit groupée après contrôle du paquet, sans paquet QA.

## Publication et suite

Produit `9fa50df7333f0484d2018a994010e55abd8186cc` commité/poussé sur main, déploiement unique `df037b33` sur elsewhere-cq7.pages.dev. Pages reconstruit sur ce HEAD en3,985s, paquet local vérifié3,818s, déploiement14,305s,136réponses HTTPS200/MIME/octets exacts13,648s. Paquet540fichiers/143932726octets,67fiches/70chemins de sauvegarde exacts ; rapports `tmp/elsewhere-pages/v421-package-VTl0UN` et `v421-http-8wdBGY`. Archives, Les AulnesV394 et démonstrationV419/tick1730 inchangées ; aucun paquet QA publié.

Nouvelle précision humaine : la chute perçue coïncide avec l’arrivée du multicarte. La priorité suivante est donc d’isoler les coûts communs introduits par les fondations sur **une seule carte**, en distinguant registre/campagne, géographie/écologie, transfert et adoption MAIN. Les profils actuels établissent des points coûteux, pas encore le commit responsable de cette régression historique. Ne pas présenter une suite de petites optimisations indépendantes comme son diagnostic causal ; aucun contenu secondaire.
