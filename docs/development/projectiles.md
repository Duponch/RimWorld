# Noyau d'émission et de vol — sous V54

18 septembre 2026. [Recherche et décisions de référence](../research/projectiles-reference.md). **Isolé de la boucle World et du rendu** : neuf scénarios profonds et un banc CPU, aucune commande de tir. Le schéma reste 54 ; une copie JSON du noyau n'est pas une sauvegarde de projectiles dans le jeu.

## Responsabilités

- `bullet-emission.ts` prend une ligne et un rapport déjà validés, le profil du revolver, les identités et une source aléatoire explicite. Il retourne branche, couvert potentiel et plan de vol. Il ne décide ni hostilité, disponibilité de l'arme, portée ni cadence.
- `projectile-rules.ts` sépare permissions, interception en vol et résolution de destination. La scène fournit les candidats actuels, leur recouvrement par objet plein, leur posture et la relation avec le tireur. Aucun accès caché à World.
- `bullet-flight.ts` copie l'état reçu, avance les sous-pas et retourne au plus une arrivée. Terminé signifie inerte : pas de second impact ni nouveau tirage. `bulletPosition` sert au futur rendu, sans horloge réelle ni mutation.

L'appelant possède le PRNG local et engage son état avec le résultat. Un refus tardif (couvert disparu, entrée invalide, budget dépassé) ne doit jamais engager des tirages seuls dans World. Une scène doit rester cohérente pendant chaque appel, puis être renouvelée après déplacement, porte, destruction ou impact. Pas de cache global par identité de monde/tick. L'adaptateur des candidats reste à écrire : `captureWorldShotGrid` expose le meilleur couvert, pas toutes les personnes/objets interceptables.

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

La prévention et le facteur de difficulté des tirs amis ne sont pas ajoutés au dernier chemin. L'adaptateur devra fournir la relation réelle, pas supposer que tous les Pawn sont des colons alliés. Les sorties sont des **clés d'impact**, pas des destructions automatiques. La santé V54 s'applique seulement aux adultes naturels sans armure admissibles à son contrat ; autres dommages et protections restent nécessaires.

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
