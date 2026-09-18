# Noyau d'émission et de vol — sous V54

18 septembre 2026. [Recherche et décisions de référence](../research/projectiles-reference.md). **Hors boucle normale et rendu** : noyau de neuf scénarios, désormais relié aux cibles d'une capture World par cinq scénarios supplémentaires. Toujours aucune commande de tir. Le schéma reste 54 ; une copie JSON du noyau n'est pas une sauvegarde de projectiles dans le jeu.

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

Les tests copient l'enveloppe par JSON puis continuent exactement avec le même état aléatoire. World ne contient pas encore cette enveloppe : migration stricte, phases préparation/récupération, identité persistante du projectile, défauts d'ancienne sauvegarde et observateur de présentation doivent être ajoutés ensemble. Le HUD et la géométrie resteront à la même date que les conséquences médicales ; aucun retrait à la réception réseau avant l'impact affiché.

## Validation et mesure

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
