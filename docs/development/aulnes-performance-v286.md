# V286 — supprimer les validations répétées des Aulnes

La nouvelle colonie intégrée exposait une régression CPU importante : dans Chrome, en développement et en 2560×1440, le banc reproduit **7,10 images RAF/s à ×6**, contre 240 en pause. La cause principale mesurée est la validation répétée des états reçus sur le thread principal. Le rendu et le schéma 218 restent inchangés.

## Corrections

- Une adoption partage une capture des parents électriques admissibles. Elle conserve les empreintes, portées, interrupteurs et règles de connexion, sans reconstruire sept fois les composantes du réseau. Ce chemin ne calcule plus le graphe de distribution et son parcours, inutilisés par ces contrôles. Le moteur électrique garde son graphe complet.
- Le contrôle des chevauchements hydroponiques indexe une fois les occurrences des structures par cellule. Les doublons de liste, exclusions par identité, empreintes tournées et erreurs aux bords gardent leur sens historique.
- Une tâche de production réutilise le résultat géométrique d'une même cellule de dépôt entre ses portions. Quantités, propriétaires, réservations et capacités restent vérifiés pour chaque portion.

Ces données dérivées restent locales à la validation d'un état. Les appels ordinaires des validateurs de fichiers conservent leur parcours historique ; les nouvelles captures servent les graphes reconstruits du transport. Les anciens états publiés, refus de paquets, reprises et checkpoints restent contrôlés. Aucun changement de règles, cadence, caméra, qualité, population ou RNG.

## Mesures dans le jeu

Comparaison avec `ac68ab45` (V285), même fichier public V284 au tick 8434, 250×250 ; Chrome 155 matériel AMD/WebGPU, 2560×1440/DPR1, `npm run dev`, caméra orthographique 129/122/zoom 1, réglages initiaux identiques. Chaque contexte recharge le même checkpoint ; chauffe 3 s puis mesure 10 s. Les observations RAF sont indépendantes du compteur affiché. La vitesse effective utilise les ticks confirmés, ce qui peut donner un léger dépassement de 6 sur une fenêtre courte lorsque les messages arrivent par groupes.

| Référence intégrée | Avant | V286 | p95 des intervalles avant → après |
|---|---:|---:|---:|
| Pause |240,00 RAF/s|non remesurée|4,7ms → —|
| ×1 |189,05 RAF/s|207,44 RAF/s|13,6 →12,6ms|
| ×6 |7,10 RAF/s|55,99 RAF/s|160,0 →39,4ms|

À ×6, le débit confirmé passe de 5,366 à 6,166× ; sauvegarde/recharge exacte aux ticks 8512 et 8890 dans le candidat. **240 FPS et une fluidité constante ne sont pas atteints.** Ces résultats locaux headless ne certifient ni un écran 240 Hz ni toutes les vues ou colonies. Les systèmes corrigés sont communs au jeu, mais leur bénéfice dépend du contenu et des tâches actifs.

Une seconde exécution indépendante à ×6 confirme **63,28 RAF/s**, débit **6,022×**, p95 **33,6 ms**, avec reprise exacte au tick 8911. La plage observée est donc 56–63 RAF/s, sans moyenne choisie pour masquer la dispersion. L'ancienne référence V224, migrée par le lecteur courant et avec les mêmes réglages, passe également de 34,50 à 99,38 RAF/s ; débit 5,866× pratiquement identique et p95 57,9→24,2 ms, reprise 7417. Le bénéfice n'est donc pas réservé au seul checkpoint intégré.

Le profil MAIN séparé attribuait environ 67 % de son poids à `SnapshotDecoder.adopt` avant correction, contre 47 % dans la nouvelle continuation. Les durées de ces deux fenêtres et leurs états finaux diffèrent : ces proportions localisent les coûts restants, elles ne constituent pas une mesure A/B de temps par adoption. Le GPU n'a pas été chronométré et aucun gain GPU n'est annoncé.

## Essais et limites

Le premier candidat, limité au partage du cache électrique complet et des empreintes, passe un coût CPU ABBA : adoption 42,32→33,88ms (−19,95%), clone+adoption 49,10→40,81ms (−16,88%). Ses 33 états retenus sont exacts. Le produit final ajoute l'index électrique minimal, l'index hydroponique et le mémo de production ; son résultat de référence est le parcours Chrome ci-dessus.

Le moteur seul traite les 144 ticks ordinaires préparés de chaque essai sans divergence. Les candidats agriculture/déplacement sont exacts mais plus lents dans le contrôle complet ; ils ne sont pas intégrés. La simulation reste donc inchangée. WASM n'a pas été ajouté : le problème dominant est ici le travail répété sur des graphes d'objets et leurs validations, pas un noyau numérique isolé dont l'accélération aurait été démontrée. Un essai ciblé reste possible après attribution des coûts résiduels, en comptant les conversions et transferts.

## Validation

117 cas uniques dans 15 fichiers, dont 22 nouveaux, passent par reprises ciblées. Le typage/build passe en 9,645 s, puis le typage final en 6,362 s. Les premiers rouges concernent trois fixtures : deux schémas historiques contenaient déjà l'aliment V217 ; la saturation de stockage préparée par le planificateur était empêchée par ce même planificateur. La reprise intermédiaire a révélé l'ordre d'ajout historique de l'aliment et le refus du second helper de fabriquer un dépassement ; les attentes et la fixture négative ont été corrigées, sans changer le produit.

Les 63 sauvegardes publiques passent en 46,721 s : hash décodé, migration stricte, sauvegarde/recharge exacte, checkpoint et delta, ancien état retenu intact, puis même continuation ordinaire d'un tick. Aucun payload ou catalogue modifié.

Les essais natifs baseline 405,608 s, candidat 108,749 s et confirmation 90,241 s passent, avec sauvegarde/recharge et sans erreurs de console ou GPU ; navigateurs et serveur privé 5319 fermés. Les empreintes sources et sauvegardes sont identiques avant/après chaque parcours.

Preuves privées conservées sous `tmp/performance-v286` :

- `sim-profile/runs/run-cgsycu` : diagnostic moteur ; `cpu-candidates-reprise/runs/run-fZpymt` : candidats rejetés. Première génération syntaxiquement invalide conservée dans `cpu-candidates/runs/run-hbtNjH`.
- `decoder/cost-qLlhDg` : premier ABBA CPU exact.
- `native/baseline-reprise-1Dd5MS`, `native/candidate-V0Il5Y` et `native/confirmation-02laPU` : rapports, profils MAIN, captures et sauvegardes. Essai initial `baseline-xmZJSb` refusé à l'ouverture du serveur dans le bac à sable, avant chargement du jeu ; reprise matérielle autorisée distincte.
- `public-check-iVEFhu` : 63 références et continuations exactes.
- Journaux `aulnes-v286-*` et `performance-v286-*` sous `tmp/validation-runs`. Les échecs initiaux sont conservés.
- Vérification documentaire : alias Python refusé dans le bac à sable, puis en-tête courant sans espace de schéma corrigé ; les deux journaux initiaux sont conservés avant reprise.

La priorité suivante reste la charge MAIN mesurée, notamment validations de production, scans hydroponiques résiduels et réception/application des états, puis le débit simulation si nécessaire. Aucun retour automatique aux prototypes de rendu ou de migration précédemment rejetés.
