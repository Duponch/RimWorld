# Validation V63 — vêtements physiques

19 septembre 2026. Résultats du lot intégré, avec échecs et reprises explicités. [Contrat](../development/armor.md), [sources](../research/apparel-reference.md).

Premiers contrôles : six scénarios profonds vêtements réussis ; seize contrôles voisins équipement/armure/impacts réussis ; build TypeScript/Vite réussi (avertissement de taille du bundle conservé). UI native à 1×/6× passée : trajet, attente avec objet au sol, couches, retrait, chargements et attributs GPU/portrait. Capture inspectée visuellement. Revue finale : 38/38 contrôles ciblés armure, équipement, impacts, mêlée, santé et toiture réussis, y compris destruction du vêtement pendant son retrait et refus d’un habillage à distance sauvegardé.


## Charge mesurée

Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1 ; WebGPU AMD RDNA1, fenêtre 1440×1000. Carte 250², poursuite visible, combat réel et mineurs/travaux ; tous portent une chemise et un acteur sur deux un gilet. Aucune guérison ou remise à neuf durant le passage. CPU et natif successifs, sources gelées. Un seul passage : ni garantie de cadence 6× ni estimation de coût isolé des vêtements.

| Acteurs | Tick CPU p95 / p99 / max (ms) | Encodage p95 (ms) | Image p95 / p99 / max (ms) |
|---|---|---|---|
| 3 | 6.73 / 12.18 / 28.80 | 3.34 | 6.20 / 11.50 / 93.80 |
| 30 | 16.53 / 31.05 / 37.68 | 4.06 | 11.60 / 17.10 / 111.30 |
| 100 | 43.27 / 54.79 / 70.51 | 4.07 | 12.10 / 22.70 / 128.20 |

À cent acteurs : 150 vêtements conservés, 40 usés, combats et blessures effectifs ; au plus 171 draws, aucun pipeline créé durant la mesure, aucune erreur navigateur. Le p95 CPU dépasse le budget d’un tick à 6× ; la cadence soutenue reste limitée par la simulation. Le scénario a des trajectoires/PRNG et survivants différents de V62, donc son augmentation CPU ne prouve pas un coût propre de l’armure. Rendu p95 comparable au passage V62, avec une pointe de 128,2 ms conservée. Les pièces partagent le lot corporel et les huit buffers existants, sans draw par vêtement.

Données : [CPU](../../artifacts/shooting-cpu-v63.json), [worker/rendu](../../artifacts/shooting-native-v63.json), [UI vestiaire](../../artifacts/apparel-ui-v63.json).

## Première passe et corrections de validation

Passe globale : 294/303 réussis, neuf échecs de fixtures historiques (numéro courant encore 62 ou fournitures V63 artificiellement introduites dans un schéma ancien). Le chargeur les a correctement refusées. Les fixtures retirent explicitement les contenus futurs ; aucune règle de production assouplie. Reprise ciblée : 46/46 réussis sur les neuf fichiers. Les trois graines du pilote cœur avaient déjà passé leurs trois jours avec quatre vêtements portés et conservation du camp. La migration V62 dédiée reste testée avec refus des vêtements futurs.


## Pilote de colonie et reprise ciblée

La vraie UI a parcouru trois jours (6,4 minutes réelles), puis échoué au tick 18 078 sur l’attente de 50 acier **déjà rangés à minuit**. Les trois colons dormaient ; les 50 unités existaient dans deux piles accessibles et réservables, aucun matériau perdu. Le checkpoint a été diagnostiqué sans injection ni changement de priorité : transport repris après le sommeil, 50 acier rangés vers le tick 21 078. L’habillement et les trajets supplémentaires modifient le calendrier du pilote.

Correction du scénario : exiger les 50 unités conservées à minuit, puis leur rangement pendant la même phase de maintenance du matin déjà utilisée pour les fragments/travaux. L’assertion finale de rangement reste obligatoire, ainsi que l’achèvement des travaux acceptés et la production éventuelle du lot de blocs. Budget inchangé : trois intervalles de 1 000 ticks. Aucun sommeil sauté, ressource ajoutée ou assertion métier retirée.

Reprise du **checkpoint exact par Charger dans la vraie UI** : réussie en 58,4 s, tick 18 078 → 21 092 ; 50 acier rangés, 150 incorporés aux bâtiments, quatre vêtements toujours portés, bâtiments inchangés, bois conservé, validation et sauvegarde/rechargement exacts, aucune erreur navigateur. Le test opt-in réutilise la fonction de maintenance du parcours principal. Le parcours complet n’a pas été rejoué après cette correction : la preuve est composée d’un passage de trois jours et de sa continuation native, pas d’un parcours monolithique vert.

[Passage initial et décisions](../../artifacts/apparel-colony-initial-v63.json), [reprise native](../../artifacts/apparel-colony-recovery-v63.json). Checkpoint volumineux local : `tmp/apparel-colony-checkpoint-v63.json`, rejouable avec `COLONY_MAINTENANCE_CHECKPOINT` et le test `checkpoint maintenance`.


## Contrôles finaux

Build final TypeScript/Vite réussi ; avertissement historique de bundle >500 kB conservé. UI d’habillement rejouée après revue : 1×/6× réussis en 33,4 s, aucune erreur. Garde native minage/abattage : deux passages de 45 s, zéro attente après amorçage, zéro saut, zéro occupation rocheuse, aucun retrait anticipé ni erreur ; 44 changements de vitesse, délai visible maximal 15,4 ms. Images max 11,5 ms (minage), 16,9 ms (abattage). [Mesure complète](../../artifacts/harvest-sync-apparel-v63.json). Ce scénario à trois colons ne remplace pas l’audit de charge à cent acteurs. Le diagnostic brut compte 198/204 lectures dont la première arête mémorisée commence dans le futur ; ce compteur n’est pas une assertion de saut ou d’attente et n’est pas annoncé nul. Les garde-fous vérifient les poses effectivement affichées et l’avancement de présentation.

Aucun jalon G0–G5 clos : G0 consolidation, G1/G2 partiels, G3 premières boucles humaines, G4/G5 ouverts. La suite est la révision de l’humeur et des pensées explicables ; habillement automatique/textiles et catalogue complet restent ouverts.
