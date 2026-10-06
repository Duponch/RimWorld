# V235 — ports, horloges et images effectivement soumises

Refonte technique privée sans règle RimWorld nouvelle. Produit V233, schéma 198
et 62 sauvegardes conservés ; [contrat](../development/direct-render-distribution-v235.md),
[preuves et rejet](../history/validation-direct-render-distribution-v235.md).

Sources primaires vérifiées le 6 octobre 2026 : les
[MessagePorts HTML](https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports)
ont leurs propres files de tâches. Deux ports ne fournissent pas un ordre global
de livraison. Le join doit retrouver le tuple admis et garder la séquence source,
sans supposer que l'ACK précède le paquet sur l'autre canal. Chaque destination
conserve une sérialisation et une désérialisation à mesurer.

Le [RAF des workers dédiés](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)
utilise le fournisseur d'animation du worker, avec un propriétaire Document dans
son ensemble de propriétaires. Exiger ce callback natif et un document actif ne
certifie ni fréquence physique de 240 Hz ni présentation de chaque soumission.
Un RAF principal observé en parallèle ne compte pas les dessins du worker.

Le [canvas Offscreen transféré](https://html.spec.whatwg.org/multipage/canvas.html#the-offscreencanvas-interface)
possède un placeholder mis à jour par les étapes de rendu de l'agent. Son
transfert est unique ; une surface déjà transférée ou dotée d'un contexte ne
peut pas être traitée comme un premier transfert. Compteur de vrais dessins et
capture opaque non vide sont deux observations distinctes, sans preuve de
scan-out pour chaque soumission.

Sources locales primaires : SimulationClient et protocole V209, SnapshotEncoder/
Decoder et journaux V233, SceneRenderCore V230, Three 186 installé, banc natif
V231 et rapports gelés V235. Le producteur conserve la publication canonique ;
les deux lecteurs conservent gardes, namespace, commit planète et journaux
locaux. Horloges, FIFO, refus et remplacement d'epoch exigent une qualification
réelle, pas une estimation fondée sur le langage ou le nombre de threads.

Les quatre passes V235 mesurent moins d'images avec la distribution directe.
Le second clone et lecteur restent des coûts malgré le retrait du forwarding.
Cette observation ne démontre pas qu'une refonte native différente serait
impossible ; elle écarte ce montage précis. Aucun gain de langage n'est présumé.

Pour la tranche suivante, `RoomTopologyCache.read` et `EnvironmentLightField`
sont les sources locales du calcul historique. Le changement visuel de surface
ne suffit pas à prouver l'absence de changement topologique : une roche minée
peut garder une surface pierreuse tout en ouvrant une pièce. Utiliser les indices
terrain bruts confirmés et le World réellement consommé ; un stamp de décodeur
n'est pas à lui seul une preuve de forme native ou de propriété immuable.
