# Émission, vol et persistance — V55

18 septembre 2026. [Recherche de vol](../research/projectiles-reference.md). V55 branche les projectiles dans `stepWorld`, sauvegardes et snapshots. **V56 ajoute le producteur, la commande et la présentation : [contrat du tir](shooting.md).** Adversaires, réactions, protections et dommages au décor restent ouverts ; le noyau V54 reste l’oracle de règles.

## Contrat World V55

`World.projectiles` est une collection sparse ordonnée par identifiant global. Chaque enveloppe conserve qualité de l'arme au départ, origine/destination, identités, permissions, dates Core d'émission et d'avancement, compte du vol et relations explicites. L'arme et le lanceur peuvent disparaître sans annuler une balle déjà émise. `registerWorldProjectile` copie les entrées et valide avant d'engager identifiant et PRNG de l'émetteur ; ce service interne ne vérifie pas une visée/commande et ne la remplace pas.

Après portes/environnement, avant actions civiles, `advanceWorldProjectiles` exécute dix sous-pas Core, dans l'ordre **sous-pas puis identifiant**. Terminer tous les pas d'une première balle avant la seconde donnerait un mauvais ordre d'impacts et de PRNG. Un résultat médical renouvelle immédiatement la scène mobile : décès, posture, patient lâché et objets déposés changent les candidats de la balle suivante. La santé garde son horloge locale entière ; la date Core du contact reste disponible séparément.

Un contact avec un adulte déclenche le résolveur anatomique V54. Un contact avec un objet porte explicitement `unsupported-object` : l'objet reste intact, aucun dégât fictif ni conversion en ressource. Sol et sortie sont distincts. Une enveloppe terminée reste inerte pendant le tick local de son impact, pour les snapshots et la reprise, puis disparaît au tick suivant. Elle ne réapplique jamais sa blessure. L'observateur publie naissance, arrivée et retrait, sans publier chaque décrément de vol. Le futur rendu doit consommer cette chronologie avant de rendre une commande disponible.

La liste d'amis et le facteur de tir ami sont capturés au départ, sans déduire que tout Pawn est allié. **Adaptation transitoire sans factions** : le futur fournisseur de relations devra préciser les changements diplomatiques en cours de vol. Pas de munition consommable ajoutée. Le service accepte uniquement le profil du revolver actuel ; autres vitesses/armes exigent un contrat de contenu.

V54 est strictement validée, avec tout champ de projectile interdit, avant passage V55 sans émission inventée. Le validateur refuse doublons/ordre/identifiants réutilisés, relations invalides, horloges ou comptes incohérents, arrivées prématurées et enveloppes terminales périmées. Une cible historique n'a pas à exister encore. Le décodeur de snapshots traite les champs dynamiques comme un remplacement complet : l'absence d'une collection sparse supprime aussi la copie distante, sans modifier un ancien snapshot.

## Capture au sein d'un lot médical

Le premier banc intégré a exposé une recapture de plus de 12 000 plantes et de toute la carte après chaque blessure. `projectile-batch` conserve maintenant le décor fixe **uniquement pendant le traitement synchrone des projectiles du tick** ; il reconstruit acteurs, piles et paquets après chaque impact. Les consultations restent immuables, dans le même ordre que la capture complète. Le couvert des objets mobiles lit les volumes pleins de la capture fixe.

Cette séparation repose sur une frontière vérifiable : la réconciliation médicale ne change ni terrain, ni plante, ni bâtiment/cadre ; les objets mobiles actuels ne sont jamais pleins. Un futur mobile plein déclenche une erreur explicite tant que le recouvrement mutuel n'est pas intégré. Les futurs dommages au décor devront invalider le décor fixe. Aucun cache ne passe au tick suivant, à une commande ou au rendu. Le scénario compare toutes les cellules à une capture complète avant/après posture, décès et dépôt, y compris tableaux réordonnés et anciennes vues conservées.

## Responsabilités

- `bullet-emission.ts` prend une ligne et un rapport déjà validés, le profil du revolver, les identités et une source aléatoire explicite. Il retourne branche, couvert potentiel et plan de vol. Il ne décide ni hostilité, disponibilité de l'arme, portée ni cadence.
- `projectile-rules.ts` sépare permissions, interception en vol et résolution de destination. La scène fournit les candidats actuels, leur recouvrement par objet plein, leur posture et la relation avec le tireur. Aucun accès caché à World.
- `bullet-flight.ts` copie l'état reçu, avance les sous-pas et retourne au plus une arrivée. Terminé signifie inerte : pas de second impact ni nouveau tirage. `bulletPosition` sert au futur rendu, sans horloge réelle ni mutation.

L'appelant possède le PRNG local et engage son état avec le résultat. Un refus tardif (couvert disparu, entrée invalide, budget dépassé) ne doit jamais engager des tirages seuls dans World. Une scène doit rester cohérente pendant chaque appel, puis être renouvelée après déplacement, porte, destruction ou impact. Pas de cache global par identité de monde/tick. `captureWorldProjectileTargets` fournit maintenant les candidats du contenu actuel ; `captureWorldShotGrid` reste la capture distincte du meilleur couvert.

## Scène du monde et relations

`projectile-world.ts` capture massifs/filons, ouvrages et cadres, plantes, toutes les piles au sol, paquets posés et adultes vivants non portés. Objets de remplissage nul encore présents comme cibles intentionnelles, plans exclus. Patients portés, cargaisons de tâche/chantier, équipement et meubles portés ne sont pas des cibles supplémentaires sur la carte. Personnes endormies, au repos médical ou à terre sont allongées ; leur taille adulte reste 1. La cellule logique sauvegardée pilote la présence, jamais la position interpolée du mesh. L'identité d'un bâtiment emballé utilise `packed:id`, pas `structure:id` ; son ancienne empreinte ne reste pas exposée.

`anchor(key)` renvoie l'ancre copiée ; toutes les cellules d'empreinte d'un meuble pointent vers le même objet. `scene(friendlyPawnIds, friendlyFireFactor)` copie une relation explicite du tireur, sans supposer que tous les Pawn sont alliés. Plusieurs tireurs peuvent partager la capture géométrique avec des vues de relations différentes. Le futur système de factions doit fournir les personnes non hostiles ayant une faction, et conserver la relation du lanceur lorsque celui-ci n'est plus sur la carte. Cette entrée ne livre pas les factions ni leur sauvegarde.

Recouvrement : un autre objet plein de couche logique supérieure ou égale doit recouvrir **chaque cellule** de l'empreinte. La porte ouverte garde son remplissage/couche pour cette seule règle. Une plante basse peut donc être recouverte par une porte ouverte ; la présence dans la même case ne rend pas automatiquement personne/pile inatteignable. Couches de définition et hauteurs 3D restent distinctes. Les relations d'ordre testées sont plante basse < porte < bâtiment/arbre < objet < adulte ; les réserves de provenance figurent dans la recherche.

Les petits cailloux décoratifs sont exclus. Les paquets gardent leur profil nul antérieur, avec confirmation du XML contemporain encore ouverte. Le Pawn décédé cesse d'être une cible vivante ; **aucun objet de dépouille n'est inventé**. Sa projection en objet et ses dégâts restent absents, tout comme les dégâts aux autres objets. Ne pas annoncer une résolution complète du décor ou des morts.

Stockage : colonnes numériques, listes d'incidence par cellule et objets immuables matérialisés à la demande. Les plages par catégorie sont contiguës ; leur ordre d'identifiants est vérifié pendant la capture. Recherche binaire si ordonné, index d'identité créé au premier besoin sinon. Aucun tri de World, ni hypothèse d'identifiants 32 bits. Ordre de candidats stable par catégorie puis identifiant, adaptation assumée de l'ordre d'enregistrement non persisté de Core. Coordonnées, tableaux de candidats et vues exposés sont immuables ; aucun accès ne touche au PRNG.

## Émission

Les identités du lanceur, de l'arme au départ, de la cible intentionnelle et de la cible utilisée sont séparées. Changer d'arme après départ ne remplace pas l'origine du projectile. Un couvert de plusieurs cellules utilise son **ancre d'objet** comme destination, pas la cellule voisine qui contribuait au rapport.

Le jet emploie `aimIgnoringPosture`. Les branches conservent leurs masques : cible ordinaire 1 + personnes autorisées 2 ; ajout de 4 pour cible pleine/cellule ; couvert et raté 4 + personnes selon leurs conditions. Pour le raté, le jet de 50 % existe même si toucher d'autres personnes est finalement interdit. Décalage final borné sur chaque axe ; les ratés peuvent finir hors carte. Les entrées proviennent des rapports/profils typés communs, pas de nombres fournis par l'UI.

## Interceptions et probabilités

Les clés doivent identifier une entité présente sur la même carte ; le lanceur et les entités recouvertes sont exclus. La cible intentionnelle pleine a une exception de permission, sauf masque nul. `covered` n'est ni le couvert voisin ni le toit.

| Chemin | Règle du noyau |
|---|---|
| Distance de vol | Facteur borné `(distance² − 25) / 119`, du point d'origine au centre de cellule ; destination exclue |
| Volume plein admissible | Certain après la zone proche, sauf porte ouverte |
| Personne traversée | 0,4 × taille bornée 0,1–2 ; allongée ×0,1 ; amie × difficulté ou zéro si prévention ; puis distance |
| Objet traversé | Remplissage >0,2 ; ×0,15 normalement, ×1 près de destination ; porte ouverte 0,05 ; puis distance |
| Cible utilisée | Identité encore admissible ; personne allongée à distance ≥4,5 : jet 0,5 ; échec au sol sans autre candidat |
| Autres candidats finaux | Mélange local ; personne 0,5 × taille, allongée lointaine ×0,5, amie × distance ; objet 1,5 × remplissage |

La prévention et le facteur de difficulté des tirs amis ne sont pas ajoutés au dernier chemin. La vue de scène reçoit la relation réelle du futur pilote de combat. Les sorties sont des **clés d'impact**, pas des destructions automatiques. La santé V54 s'applique seulement aux adultes naturels sans armure admissibles à son contrat ; autres dommages et protections restent nécessaires.

## Temps, reprise et présentation future

Le compte à rebours est entier en ticks Core, la durée géométrique reste flottante. Le premier incrément peut donc être résiduel ; ne pas répartir artificiellement la distance par le nombre arrondi de pas. Position de départ copiée, aucune poursuite visuelle vers la nouvelle position d'une cible mobile. À la sortie de carte, le compte est restauré et la position terminale reste intérieure.

Un tick local vaut dix pas Core selon le rapport des journées. `advanceBulletFlight` les parcourt tous et s'arrête au premier résultat ; vitesse ×3 du jeu ne permet pas de sauter des cellules. Les cellules visitées sont dédoublonnées seulement au sein d'un sous-pas diagonal/long ; une arrivée cardinale teste uniquement sa nouvelle case. Regrouper 1 ou 10 pas produit le même résultat si la scène n'a pas changé. Cela ne dispense pas la future boucle d'intercaler ses mutations et de résoudre les événements dans leur ordre.

Les tests isolés copient l'enveloppe par JSON ; V55 ajoute la vraie sérialisation World, l'identité persistante, la migration et l'observateur décrits plus haut. Préparation/récupération et rendu sont ajoutés en [V56](shooting.md). Le HUD et la géométrie suivent le temps des conséquences médicales ; aucun retrait à la réception réseau avant l’impact affiché.

## Validation et mesure

V55 : `projectile-system.test.ts` ajoute cinq scénarios profonds. Les sauvegardes utilisent réellement le sérialiseur World pendant le vol et après arrivée ; les clones continuent à l'identique jusqu'au retrait. Le scénario multi-projectile prouve qu'une balle de plus grand ID arrive avant une autre et que le décès change le contact suivant. Enregistrement invalide sans consommation d'ID/PRNG, relations copiées et mutations d'enveloppe sont contrôlés. Le défaut de suppression d'une collection optionnelle dans les deltas a été détecté par cette chaîne, puis corrigé dans `SnapshotDecoder`.

`projectile-system-bench.ts` mesure des pas World sur cartes minières 250², avec 3/30/100 acteurs. Rafale : cinq chauffes, trente premiers ticks indépendants ; une émission proche injectée par acteur, génération/copie/enregistrement exclus. Parcours mixte et témoin : 240 ticks, vingt premiers exclus, rafale tous les soixante ticks ; blessures, décès, besoins et travaux conservés. Ni visée/commande, ni worker/rendu. Le retrait d'arbres reste nul sur cette courte fenêtre : il s'agit d'activité engagée, pas d'un bilan de colonie développé.

Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1. [Initiale](../../artifacts/projectile-system-baseline-v55.json) et [passe après partage du décor](../../artifacts/projectile-system-v55.json), mêmes nombres de contacts et bilans médicaux :

| Acteurs | Rafale p95 avant → après | p99 rafale après | Mixte p95 avant → après | Mixte p99 avant → après | Maximum mixte après |
|---|---:|---:|---:|---:|---:|
| 3 | 19,192 → 20,832 ms | 23,297 ms | 2,244 → 2,485 ms | 12,165 → 10,562 ms | 26,417 ms |
| 30 | 105,998 → 47,265 ms | 51,628 ms | 3,138 → 3,574 ms | 56,933 → 8,960 ms | 12,356 ms |
| 100 | 284,789 → 65,738 ms | 85,904 ms | 7,106 → 15,865 ms | 200,176 → 27,811 ms | 35,179 ms |

Le coût des grandes rafales diminue nettement, mais **le p95 mixte ne s'améliore pas** dans ces deux passes. Le témoin sans balle varie lui aussi (cent acteurs p95 21,449 → 28,217 ms). Les pointes du premier tick incluent le démarrage des décisions civiles et leurs caches ; les chiffres ne doivent pas être attribués entièrement aux balles. Pas de garantie de fluidité ; poursuivre la décomposition worker/scène et l'audit de combat réel lors de l'ajout du déclencheur. Cent contacts simultanés restent un scénario coûteux, conservé comme limite connue.

### Preuves historiques V54

`bullet-flight.test.ts` regroupe permissions sur les huit masques, probabilités distinctes, cible déplacée/supprimée/recouverte, posture, portes modifiées en cours de vol, bords, trajets rapides, arrêt/idempotence, erreur de données, 72 continuations dans tous les octants, ordre des tirages, dispersion/penchement/ancre et liaison de fixture au producteur Gunshot. L'état médical utilise le vrai sérialiseur ; l'enveloppe de vol reste explicitement propre au test. Pas d'attaque artificiellement présentée comme une commande joueur.

Le banc `scripts/bullet-flight-bench.ts` possède une scène indexée 250² et 3/30/100 plans sur des couloirs de 25 cases : profils dirigé/raté/couvert, portes, fragments et personnes debout/allongées/amies. Cinquante lots de chauffe, trois cents mesurés. Chaque lot crée puis **termine tous les vols** ; ce n'est pas le coût d'une frame ni d'un tick. Construction de scène, émission/visée, santé, simulation World, worker et rendu exclus. Les couloirs sont partagés dans la charge cent ; cela ne représente pas cent combattants indépendants.

[Données brutes](../../artifacts/bullet-flight-v54.json), Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1 :

| Vols par lot | p50 | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0,0322 ms | 0,1186 ms | 0,4169 ms | 0,8122 ms |
| 30 | 0,1503 ms | 0,6076 ms | 0,8238 ms | 1,6066 ms |
| 100 | 0,5648 ms | 1,3412 ms | 1,8975 ms | 2,5924 ms |

Une passe finale ; petites durées sensibles à l'ordonnanceur/JIT. L'interception ponctuelle est une fonction partagée, sans closure créée à chaque sous-pas. Ces résultats ne justifient ni promesse de FPS ni dépendance compute/WASM. La charge mixte et la garde visible restent exigées lors de l'intégration des attaques. Aucun parcours UI/colonie complet rejoué pour ce noyau non branché.

### Capture et cibles réelles

Cinq scénarios ajoutés à `combat-world.test.ts` contrôlent candidats superposés, identités/propriétaires/empreintes, recouvrement complet et couches, relations copiées, carte rectangulaire/entiers sûrs/réordonnancement, puis secours réels avec disparition du patient porté et retour au lit après sauvegarde. Le cinquième relie ligne/émission/cible déplacée par commande V53/impact médical, avec continuation exacte du World et de l'enveloppe de test séparée. Les fixtures géométriques artificielles sont distinctes des parcours sérialisés valides. TypeScript et **18/18 scénarios** de décor/projectile passent après optimisation (3,03 s).

`projectile-world-bench.ts` mesure une capture partagée et la terminaison de plans de vol sur les cartes minières 250² (12 120–12 217 ressources, 8 449–8 837 massifs), à 3/30/100 acteurs. Cinquante chauffes puis trois cents lots ; génération et pas World exclus. Les plans synthétiques dirigés/ratés partent d'un tireur vers les autres acteurs, sans commande ni calcul de portée/visée. Une mesure séparée de cent échantillons inclut le premier accès d'identité aux plantes et cent consultations ; elle exclut la capture. Ce ne sont pas des combats ni une mesure worker/rendu.

Sur le même Ryzen 5 3600 / Windows 11 / Node 24.11.1, l'[initiale](../../artifacts/projectile-world-baseline-v54.json) a exposé le coût des index de chaque plante et des objets temporaires par cellule. Index à la demande puis recherche binaire vérifiée et coordonnées numériques réduisent ce travail. Résultats métier et sommes des dates d'impact identiques. [Passe finale](../../artifacts/projectile-world-v54.json) :

| Acteurs/plans | Capture p95 avant → après | Total capture + vols p95 | p99 total | Maximum total |
|---|---:|---:|---:|---:|
| 3 | 9,0148 → 2,4493 ms | 2,5546 ms | 2,9837 ms | 3,5383 ms |
| 30 | 8,1350 → 2,5424 ms | 2,9598 ms | 3,7486 ms | 3,8492 ms |
| 100 | 8,0959 → 1,8939 ms | 3,1338 ms | 3,7564 ms | 4,5183 ms |

Premiers accès aux plantes dans la charge cent : p95 0,1487 ms, p99 0,2222 ms, maximum 0,2276 ms. Le repli d'identités non ordonnées est testé fonctionnellement ; ces chiffres du générateur ordonné ne mesurent pas son coût spécifique. Comparaison de passes successives, sans prétendre isoler toute variabilité JIT/ordonnanceur. La scène ne doit pas être reconstruite par projectile ou frame lors du branchement.
