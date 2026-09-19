# Validation V61 — approche ennemie et postes de tir

19 septembre 2026. [Contrat](../development/pursuit.md), [sources et adaptations](../research/pursuit-reference.md). Lot sur `main`, après V60 `7e62106`. Mandat mobile seulement dans les nouvelles rencontres ; anciennes sauvegardes neutres, même chaîne mouvement/arme/blessure/soins.

## Scénarios et intégration

- **285/285 tests, 68 fichiers**, 133,87 s. Comprend le pilote civil sur plusieurs cartes et le compagnon de rencontre fixe/mobile sur une journée. Puis **20/20 ciblés** après durcissement de validation des postes et de la récupération, 4,82 s. Build final réussi ; avertissement de bundle principal >500 ko conservé, aucun seuil simplement relevé.
- Six scénarios de poursuite : hors portée → chemin → arrêt → visée/tir ; cible mobile ; couvert/route inaccessible ; deux postes distincts ; porte fermée puis ouverte ; perte d'arme, incapacité et cible morte ; continuations exactes et strict V60/V61. Dommages injectés uniquement dans le test isolé d'interruption ; les parcours de combat et de secours utilisent de vrais tirs.
- **UI native finale de poursuite 1/1**, 16,5 s, 1×/6× : trajet sauvegardé/rechargé, vrais attributs GPU à chaque frame, orientation, absence de pose de tir en marche, vol visible et déplacement de repli commandé via la carte. [Rapport](../../artifacts/pursuit-ui-v61.json). Capture locale `artifacts/pursuit-v61.png` inspectée.
- **UI de rencontre existante 1/1**, 19 s : création du nouveau scénario, autorité, politiques, tirs, secours/soins et sauvegarde du portage à 1×/6×. **Charge native 1/1**, 39,7 s, 3/30/100 acteurs. Pas de compilation GPU pendant la mesure ni erreur navigateur. [Rapport de rencontre réexécuté](../../artifacts/encounter-ui-v61.json), conservé séparément des preuves V58.
- La longue UI civile de trois jours n'est pas rejouée : elle vient de passer en V60 ; ce lot ajoute un mandat absent du camp paisible. Le parcours multi-cartes de simulation et le compagnon médical sont rejoués. Cela ne remplace pas une future partie longue mêlant raids et construction.

## Échecs diagnostiqués et contrôles améliorés

L'ajout du mandat mobile au compagnon médical a d'abord échoué : le médecin a été blessé et s'est mis au repos. Le pilote attendait uniquement de ce médecin qu'il sauve la victime ; un survivant valide restait inactif, puis la victime mourait de saignement. Correction **du joueur simulé** : après démobilisation et disparition de la menace active, affecter un survivant disponible à Médecin si aucun médecin disponible ne reste. Même graine 6, même combat, aucune blessure effacée, aucun médicament ajouté. Les assertions exigent toujours transport physique de la victime, soin réel et survie sur la journée ; elles ne privilégient plus arbitrairement l'identité du soignant initial.

La première UI de poursuite passe (19 s), puis la passe groupée échoue après le repli parce que l'oracle attend un tableau de route non vide au moment du polling. Les tableaux peuvent disparaître à l'arrivée entre deux observations en accéléré. La trace ne fournit pas de checkpoint complet permettant d'affirmer rétrospectivement cette cause avec certitude. L'oracle final exige d'abord **l'acceptation de la destination du joueur**, puis un **déplacement GPU observé et mémorisé dans les vraies frames**. Il n'accepte pas un ennemi immobile et conserve désormais un checkpoint si le parcours échoue. Reprise réussie (16,5 s), sans changement du contrôleur de poursuite pour faire passer le test.

Les premières fixtures ont également révélé un texte d'événement trop long, des attentes de schéma historiques à mettre à jour et une porte sans état/matériau dans le nouveau test ; corrigés avant la passe globale. Un test de blessure utilisait initialement des unités HP au lieu des unités entières médicales : corrigé avec `HP_UNIT`, pas en relâchant l'arrêt d'engagement.

## Audit reproductible

Ryzen 5 3600, Windows 11 build 26200, Node 24.11.1, Three 0.186.0 ; navigateur Chromium natif, GPU AMD RDNA-1, viewport 1440×1000. `PURSUIT=1 VALIDATION_VERSION=v61` sur les bancs CPU et natif de tir. Carte naturelle 250², couloir dégagé, un tiers de combattants hostiles mobiles initialement à 35 cases, colons mobilisés/automatiques, réactions civiles et travailleurs. 240 ticks par taille, vraies blessures/XP/PRNG, aucun soin forcé. Exécutions successives, sources gelées pendant le natif.

| Acteurs | CPU tick p95 / p99 / max, tous ticks (ms) | Encodage p95 (ms) | Images natives p95 / p99 / max (ms) | CPU frame p95 (ms) |
|---:|---:|---:|---:|---:|
| 3 | 6,06 / 16,04 / 34,18 | 3,41 | 6,2 / 6,6 / 92,5 | 5,0 |
| 30 | 15,87 / 32,24 / 38,88 | 3,67 | 11,5 / 12,1 / 103,4 | 7,5 |
| 100 | 38,72 / 47,54 / 68,47 | 3,69 | 12,1 / 23,0 / 116,2 | 7,8 |

Sources : [CPU final](../../artifacts/shooting-cpu-v61.json), [CPU première mesure](../../artifacts/shooting-cpu-v61-initial.json), [worker/rendu natif](../../artifacts/shooting-native-v61.json). Le banc conserve désormais les vingt premiers ticks séparément **et dans un total** : pointes initiales de 34,18 / 32,88 / 47,54 ms. Les anciennes séries après chauffe restent disponibles pour comparaison du protocole, sans dissimuler la première planification. À cent acteurs : 471 émissions CPU, 13 cellules excavées ; 41 personnes blessées par balle et 6 162 échantillons de vol natifs. Ce sont des activités réellement exécutées, pas une capacité de buffer annoncée.

La scène native atteint 171 draw calls au maximum ; p95 d'application de scène 5,6 ms et callback snapshot 0,5 ms à cent acteurs. Le callback exclut le décodage IPC ; l'application est incluse dans la frame, donc ne pas additionner ces postes. Les poses restent dans les lots GPU existants.

**Limites conservées :** pointes >90 ms, CPU de cent acteurs au-delà du budget de 16,7 ms d'un tick à 6×. Cette mesure ne garantit ni 6× soutenu ni fluidité parfaite. La charge diffère de V60, donc aucune comparaison causale de gain global n'est annoncée. Profilage à poursuivre avant d'augmenter le nombre d'adversaires. Pas de benchmark universel de tous les objets, maladies, tactiques ou machines.

## Garde de présentation et documents

Garde finale **réussie**, 45 s de minage puis 45 s d’abattage sur 250²/3 colons : zéro attente après amorçage, saut ou occupation solide ; 44 changements de vitesse, délai maximal 15.5 ms. Images p95 6,5 ms, maximum 17,5 ms. [Rapport complet](../../artifacts/harvest-sync-v61.json). Les seuils historiques n’ont pas été relâchés.

219 documents, 2 360 liens locaux, 25 domaines et cinq familles de validation contrôlés ; trois originaux byte-identiques. Les ajouts de liens du bilan final sont revérifiés avant commit.

## État global

G0 en consolidation ; G1/G2 partiels ; G3 premières boucles humaines ; G4/G5 largement absents. Aucun jalon clos. Estimation globale conservée autour de 20 % (15–25 %), pas un comptage de commits. Prochaine mécanique : réveils défensifs et réactions aux dommages selon recherche fraîche, avant d'ajouter les stratégies de raid ; vêtements/armures et relations restent des chantiers fondamentaux distincts.
