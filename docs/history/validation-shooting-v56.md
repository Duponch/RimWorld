# Preuves du premier tir commandé V56

18 septembre 2026. [Contrat courant](../development/shooting.md), [sources revérifiées](../research/shooting-reference.md). Ces observations portent sur le premier tir manuel entre personnages de colonie, pas sur un adversaire/raid inexistant.

## Scénarios et erreurs effectivement détectées

La régression complète passe : **252/252 scénarios, 63 fichiers, 200,59 s**, dont migrations, corps/soins, stockage/travaux, bridge et pilote de cinq à huit jours sur trois cartes naturelles. Les cinq scénarios de tir croisent préparation/cadence exacte, annulation sans XP/RNG, récupération conservée, groupe refusé atomiquement, ligne perdue, arête capturée, cible à terre, incapacité après émission, reprise à chaque tick et sauvegardes invalides.

La première passe ciblée a refusé deux anciennes fixtures V52/V54 auxquelles le nouveau profil Tir avait été ajouté par leur fabrique. Les fixtures retirent désormais ce champ avant migration ; la validation ancienne n'a pas été affaiblie. Une injection d'incapacité employait des PV au lieu des milli-PV attendus ; corrigée. Puis **71/71** scénarios ciblés et, après enrichissement du scénario de cadence/incapacité, **5/5** passent avant la régression complète.

L'oracle de présentation initial confondait date Core de fin de visée et date de publication du World. Il supposait aussi qu'un World continu était publié à chaque tick, alors que ses valeurs sont regroupées à 5 Hz. Le contrat reste : la posture et la santé changent au tick local de leur événement, la trajectoire utilise la date fractionnaire confirmée. L'oracle vérifie maintenant la limite `ceil(finCore / 10)`, les attributs réellement envoyés au GPU, l'orientation et l'absence de nouvelle compilation. Aucun retard de simulation n'a été masqué par un délai d'attente accru.

Le build TypeScript/Vite passe ; avertissement existant de taille du chunk de rendu conservé. Les trois sources originales demeurent byte-identiques. La revue documentaire remplace les anciennes absences de commande/Tir/rendu dans les contrats actuels ; les preuves historiques gardent leur portée d'origine.

La revue a ensuite détecté un cas non discriminé : viser pendant la traversée d'une table pouvait immobiliser le colon sur une case sans arrêt. Un refus atomique conserve désormais le trajet ; **15/15 scénarios** tir/mobilisation/franchissement repassent en 5,44 s après ce correctif ciblé. La récupération est également indiquée quand le colon vient d'être démobilisé. La longue partie civile n'est pas répétée pour cette garde limitée au tir.

## Audit natif de charge

Ryzen 5 3600, Windows 11 `10.0.26200`, Node 24.11.1 ; Chromium natif WebGPU, adaptateur AMD RDNA 1, fenêtre 1440×1000. Carte 250² avec forêt naturelle, couloirs de tir dégagés et zone minage/abattage. Un tiers tire, un tiers sert de cible mobilisée, les autres travaillent. Les ordres réels sont acceptés avant chargement de la fixture, puis le worker exécute 240 ticks à 6×. Quatre-vingt-dix images de chauffe. Pas de remise à zéro des blessures ni de tir automatique inventé.

| Acteurs | Image p95 / p99 / maximum, ms | CPU image p95, ms | Scène p95, ms | Callback snapshot p95, ms | Appels de dessin max |
|---:|---:|---:|---:|---:|---:|
| 3 | 20,6 / 25,1 / 137,6 | 15,4 | 10,7 | 3,5 | 168 |
| 30 | 29,1 / 38,7 / 158,5 | 16,7 | 9,2 | 6,7 | 171 |
| 100 | 58,7 / 87,6 / 195,6 | 22,0 | 11,8 | 19,5 | 171 |

**Zéro nouveau pipeline GPU et zéro erreur navigateur** dans les trois cas. Le lot de balles croît réellement de 32 à 64 puis 256 emplacements sans nouveau programme ; des balles sont observées sur les frames de présentation. La géométrie corporelle garde son lot existant. [Relevé brut](../../artifacts/shooting-native-v56.json).

Les pointes restent significatives, surtout à cent acteurs/6×. Le coût de scène est inclus dans le CPU image ; le callback snapshot exclut transport/décodage et ne doit pas être additionné aveuglément à toute image. La mesure contient les transitions de vitesse et leur interaction UI. Ce relevé ne permet ni d'attribuer toutes les pointes au GPU ni de promettre une fluidité parfaite. Prochain audit : profiler snapshots/scène sous cette charge avant de densifier l'affrontement.

## Parcours et relevés complémentaires

Le parcours UI ciblé joue les commandes, Échap, sauvegarde de visée, rendu du projectile, orientation et impacts à 1×/6× ; puis démobilisation et soins du blessé réellement produit. [Relevé du tir](../../artifacts/shooting-ui-v56.json), [visée](../../artifacts/shooting-v56.png), [soin](../../artifacts/shooting-care-v56.png). Les parcours de colonie et déplacement ainsi que le banc CPU sont consignés dans la validation courante après leur dernière exécution.

Le banc CPU `scripts/shooting-bench.ts` mesure séparément acceptation des commandes, `stepWorld` et encodage, avec un témoin sans tirs et ordre de mesure alterné. Les ticks d'activité incluent le démarrage ; les statistiques mixtes excluent les vingt premiers ticks. [Données](../../artifacts/shooting-cpu-v56.json). Le témoin, les morts et incapables sont conservés ; les simulations ne sont pas artificiellement équivalentes après les blessures. Ce banc n'est pas un relevé de frame.

Dernière passe CPU : 3 acteurs, tick mixte p95/p99/max 7,0/9,2/30,5 ms, encodage p95 7,5 ms ; 30 acteurs, tick mixte p95/p99/max 13,1/30,5/56,4 ms, encodage p95 10,4 ms ; 100 acteurs, tick mixte p95/p99/max 28,7/66,8/110,2 ms, encodage p95 12,5 ms. Les 516 émissions et 216 contacts médicaux du cas cent acteurs produisent 18 décès et 15 incapacités ; les renouvellements volontaires de cible sont revalidés et peuvent être refusés. Le banc n’annonce aucune extraction achevée à partir de son seul nom « minage » : il mesure également des travaux encore engagés.

## Contrôle de fluidité et conditions de mesure

La garde minage/abattage est restée stricte ; une phase s’arrête après son échec. Le [premier passage](../../artifacts/harvest-sync-v56-first.json) détecte une seule frame sans avance confirmée (12,4 ms), sans saut ni occupation d’une roche encore visible ; les contrôles répondent au plus en 41,4 ms. Le [passage tracé](../../artifacts/harvest-sync-v56-trace.json) en détecte deux pendant le minage. Worker : encodage p95 10,4 / p99 21,5 / max 71,1 ms ; simulation p95 3 / p99 8,7 / max 73,7 ms. L’absence d’une longue tâche principale autour des attentes oriente le diagnostic vers la livraison du worker, sans prouver la cause de chaque pointe.

Observation système ultérieure, vers 21:44 heure de Paris : une autre application 3D consomme 25,39 secondes de CPU sur 5 secondes écoulées. Aucun processus utilisateur n’a été arrêté. La présence de cette charge concurrente empêche d’interpréter ces chronométrages comme une régression isolée de Lisière ; elle ne prouve pas non plus que tous les retards viennent de l’extérieur. La charge GPU des autres applications n’a pas été mesurée. Les percentiles des bancs plus haut restent des observations de cette session, avec conditions concurrentes non maîtrisées.

Un essai de spécialisation du parcours géologique de l’encodeur a conservé 78 paquets/reconstructions identiques, sans gain utile généralisé : il a été **retiré**, l’encodeur reste celui de V55. [Comparaison rejetée](../../artifacts/snapshot-encoder-v56.json). Aucun tampon ni cadence de publication modifié pour cacher l’attente. La garde de fluidité demeure à reprendre dans des conditions disponibles, avant de densifier les combats.

La dernière revue fonctionnelle découvre et corrige une interaction distincte : une récupération pouvait différer le sommeil forcé. Le chemin commun d’épuisement interrompt désormais la posture ; 23/23 scénarios tir/mobilisation/cargaison/bridge passent en 5,11 s. Les trois variantes visée, récupération mobilisée et récupération démobilisée reprennent exactement après sauvegarde ; une balle émise conserve sa vie indépendante. La suite complète de 252 scénarios et la longue colonie précèdent cette correction ciblée ; elles ne sont pas annoncées comme rejouées ensuite.

La [phase abattage complémentaire](../../artifacts/harvest-sync-v56-chop.json) passe ensuite : 7 190 images, zéro attente de trajectoire, zéro saut/pénétration et zéro erreur ; frame p95 8,4 / p99 12,6 / max 33,3 ms. Elle complète la phase non atteinte dans les deux passages arrêtés au minage et ne transforme pas ces échecs en succès. Le dernier parcours UI tir/soins repasse en 18,4 s (20,9 s avec lancement) après déplacement du masque « arme absente » en fin de calcul de posture GPU ; aucune posture de tir ne doit réafficher un objet non équipé.
