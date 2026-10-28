# Déplacement des colons et changement de destination

## Mise à jour V492 — comportement Source12 retenu, schéma 297

L’accord humain du 28 octobre autorise l’intégration locale de Source12 testée, avec une dette acceptée provisoirement de 9,98–11,28 % de débit à ×6. Le lot local est intégré et ses contrôles sont consignés ; aucune publication nouvelle n’est attestée et Cloudflare reste V491. [État, mesures et réserves](../development/movement-parity-v492-status.md).

Pour les nouvelles arêtes humaines297, la base neutre Jog est dérivée de60/4,6 Core par case cardinale, soit environ0,217 s nominal ; la diagonale applique1,41421, soit environ0,307 s avant autres facteurs. Le temps physique avance à 60 Core/s à×1, séparé des systèmes macro à 6 Hz. Les facteurs, le mode et la durée sont capturés pour chaque arête ; un segment ancien chargé garde son coût historique. Ce ne sont pas des chronométrages universels de partie.

Un premier ordre valide peut engager sa première arête au point sûr de la commande, sans attendre un pas macro. Le reclic ordinaire pendant une arête déjà payée conserve cette arête et son temps restant, puis prend la nouvelle route depuis son extrémité. Les cas sans coût encore payé et les pas devenus impossibles ont leurs interruptions propres. Le clic simple de l’unique colon vers la case encore occupée au départ ne crée pas un nouveau Goto universel. L’ordre explicite Arrêter, distinct du reclic, coupe le chemin au temps physique confirmé ; la présentation enregistre cet arrêt au lieu de conserver indéfiniment un ancien tracé. La clinique, les collisions et les détenteurs conservent leurs gardes.

Le World complet conserve son identité et sa date ; les acteurs affichés peuvent avancer via une scène confirmée distincte. Le lissage n’autorise aucune prédiction de trajet ni réponse anticipée. Les fenêtres ×1/×3 tiennent leurs cibles mesurées ; ×4 n’a pas été mesuré. Le parcours au premier plan est acquis, la visibilité native reste non acquise, et une identité totale à tous les cas RimWorld n’est pas revendiquée.

Le rapport du27octobre ci-dessous décrit l’état V491 et la lecture primaire qui a motivé ces adaptations. Ses valeurs de3ticks/6Hz=0,5s sont historiques ; elles ne décrivent pas les nouvelles arêtes297.

L'observation du joueur est confirmée dans Elsewhere : un colon en marche termine normalement le segment déjà engagé entre deux centres de cases avant de suivre sa nouvelle route. La lecture de RimWorld 1.6 retrouve ce principe pour un ordre ordinaire de déplacement qui en remplace un autre. Le ressenti ne peut cependant pas être déclaré identique : la vitesse de base et le lissage de l'image diffèrent sensiblement.

## État historique V491 observé le 27 octobre

Prenons une marche de A vers B. Le colon est encore visuellement entre ces deux cases lorsque le joueur clique vers C. La commande peut être acceptée et la route vers C calculée immédiatement ; elle part de B, extrémité du segment engagé. Le colon termine A→B puis commence le nouveau trajet depuis B. Il n'attend pas d'atteindre son ancienne destination finale.

Le [démarrage du segment](../../src/sim/movement.ts) enregistre son départ, son arrivée et sa durée ; il affecte dès cet instant la position logique du colon à B. Le [nouvel ordre tactique](../../src/sim/drafting.ts) remplace la cible et le chemin, mais conserve ce segment et son temps restant. Le [traitement de simulation](../../src/sim/engine.ts) attend que ce temps soit épuisé avant d'engager le prochain segment. Ce comportement existe indépendamment du coût de traitement du clic et du nouveau style graphique.

Un premier ordre donné à un colon immobile n'est pas exactement le même cas : le chemin peut être accepté immédiatement, puis le premier segment est engagé au prochain vrai tick de simulation. Une file d'ordres ajoute des destinations au lieu de remplacer le trajet actif. L'arrêt tactique et la démobilisation annulent les intentions suivantes mais conservent, dans le fonctionnement V491 décrit ici, le segment physique déjà capturé. Les récupérations de combat, portes, collisions, étourdissements et incapacités ont leurs gardes propres.

## Fonctionnement ordinaire de RimWorld 1.6

La référence primaire est l'installation locale **1.6.4871 rev590**, assemblage Assembly-CSharp.dll de 15777280 octets, SHA256 5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a. Les méthodes actuelles ont été examinées directement, sans copier leur code ni leurs assets dans le projet.

Un clic droit de déplacement mobilisé crée un ordre Goto. La chaîne PawnGotoAction → TryTakeOrderedJob interrompt normalement l'ancien travail et remplace l'intention. Le nettoyage d'un Goto remplacé par un autre ne fait pas automatiquement un StopDead. StartPath change la destination tout en conservant normalement nextCell et le coût restant du pas commencé. GenerateNewPathRequest prend précisément cette prochaine case comme origine du nouveau calcul.

PatherTick paie ensuite le coût restant. C'est seulement lorsqu'il est épuisé que TryEnterNextPathCell affecte la position à nextCell et peut engager le segment suivant. **Le nouveau trajet peut donc être demandé avant la fin du pas, sans que le colon coupe librement ce pas au milieu de deux cases.**

Cette règle n'est pas absolue : StartPath peut réinitialiser le pas lorsque la prochaine case est devenue impraticable, en présence de certaines collisions ou portes, ou lorsqu'aucune progression significative n'a encore été payée. Un ordre vers la position logique courante peut arrêter le déplacement ; un ordre vers la même destination peut ne rien changer. Les ordres mis en file suivent une autre logique. Il ne faut donc pas généraliser la conservation du pas à tout ordre, obstacle, état de combat, mod ou incapacité.

La représentation interne diffère également : RimWorld garde la position de départ et nextCell séparées pendant la marche ; Elsewhere avance sa position logique dès le début et conserve le départ dans le segment. Comparer seulement les champs nommés « position » conduirait à une conclusion trompeuse.

## Une différence de vitesse qui rend notre attente plus sensible

Les valeurs suivantes supposent un humain sans ralentissement, une marche normale, aucun surcoût de terrain ou bâtiment et un rythme de simulation nominal. Ce sont des calculs de calibration, pas un chronométrage de partie.

| Paramètre | Elsewhere V491 historique | RimWorld 1.6 examiné |
| --- | --- | --- |
| Fréquence nominale à ×1 | 6 ticks/s | 60 ticks/s |
| Traversée cardinale neutre | 3 ticks, soit 0,5 s | 60/4,6 ticks, soit environ 0,217 s |
| Traversée diagonale neutre | Environ 0,707 s | Environ 0,307 s |
| Reclic en cours de pas | Conserve normalement le segment | Conserve normalement le segment |
| Rendu courant | Segments confirmés et réserve de présentation | Interpolation entre cases puis lissage du personnage |

Le Def humain de RimWorld donne une vitesse de base de 4,6 cases par seconde. Le Goto mobilisé ordinaire utilise Jog ; son coût reste flottant, sans arrondi ajouté dans cette branche. Terrain, état de santé, météo, équipement, charge et autres facteurs peuvent changer le résultat. L'entrée en case reste tickée et le dépassement fractionnaire est reporté au pas suivant. Nos propres facteurs changent eux aussi la durée.

Sous les seules hypothèses du tableau, notre segment est **environ 2,3 fois plus long**. Un reclic juste après son engagement peut attendre presque 0,5 s avant le nouveau cap, contre environ 0,22 s de coût nominal dans RimWorld. Une même règle peut ainsi sembler beaucoup moins réactive chez nous sans que le clic ait été ignoré. Cet écart ne signifie pas que toute marche réelle conserve ce ratio.

## Centre logique et image du personnage

RimWorld construit une position entre les centres de la case courante et de nextCell, puis PawnTweener rapproche progressivement l'image du personnage de cette position. À vitesse normale et rapide, un lissage supplémentaire est présent ; certaines vitesses et situations utilisent un recalage direct.

On peut donc déduire du code que, lorsque le segment logique suivant commence, la silhouette peut encore être légèrement en retard sur le centre précédent. Elle peut amorcer une inflexion sans que tous ses pixels aient visiblement atteint ce centre exact. C'est une **inférence du lissage**, pas une observation vidéo mesurée ni une analyse complète de l'orientation du personnage. La formulation fidèle est : « le segment engagé est généralement conservé », plutôt que « l'image doit toujours toucher exactement le centre avant de tourner ».

## Ce que corrige la V491 et ce qui reste distinct

La V491 ne modifie ni la vitesse ni cette règle de déplacement. Elle corrige deux attentes de présentation : le nouveau chemin confirmé n'attend plus que l'acteur rendu rejoigne son origine pour être affiché ; la pause autoritaire reçue n'attend plus de vider l'ancienne réserve visuelle. Les [mesures détaillées](../development/action-latency-v486.md#réactivité-visuelle-des-ordres-et-de-la-pause--v491) donnent 47–75 ms pour les quatre ordres isolés à ×1, contre 280–367 ms pour les trois reclics du témoin ancien.

Il reste des phénomènes différents : attente de traitement dans le Worker, fin physique du segment courant, et réserve de deux ticks lors de la reprise visuelle, soit environ 333 ms à ×1 nominal. La pause après quatre ordres rapprochés a encore pris 299,5 ms dans le test de rafale. Il serait faux d'annoncer une instantanéité générale à partir du gain d'affichage.

À la rédaction initiale du 27 octobre, aucune modification de gameplay n’avait été faite sur la base de ce rapport. Si l'on veut rapprocher la sensation de déplacement de RimWorld, la prochaine comparaison utile concerne d'abord la calibration des durées et les facteurs de vitesse, puis le lissage et les interruptions ; autoriser arbitrairement un virage au milieu d'un segment ne reproduirait pas le fonctionnement ordinaire examiné.

## Sources et portée

Les lectures primaires et leurs repères sont conservés dans les [notes de déplacement](../../tmp/action-latency-v491/movement-reclick-reference-terminal-v491.md) et de [coût et lissage](../../tmp/action-latency-v491/movement-urgency-tweener-primary-console-v491.md). Elles portent sur la version locale identifiée, pas sur une ancienne copie non attestée du jeu.

Ludeon confirme que le calcul des chemins a été remanié en travaux groupés et multithreadés en 1.6 ; son annonce ne documente pas la règle du reclic entre deux cases. [Annonce officielle de la 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/).

Au 27 octobre 2026, l'annonce officielle distingue la branche principale 1.6 de la 1.7 en test avec le moteur Waylith. La présente lecture détaillée n'atteste pas les méthodes internes de la 1.7, même si Ludeon annonce une continuité de comportement. [Annonce officielle de la 1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/).
