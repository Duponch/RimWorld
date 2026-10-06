# Validation V236 — terrain des pièces, candidat non intégré

6 octobre 2026. [Contrat](../development/render-room-terrain-v236.md),
[recherche](../research/render-room-terrain-v236.md).
Produit V233 `42be79ad`, schéma 198, 62 sauvegardes/65 fichiers publics conservés.
Aucun changement src, test produit, cadence, qualité, moteur, règle ou RNG.
Tous les contrôles lourds ROOT sont successifs, gelés et journalisés.

## Gels et résultats initiaux distincts

Le premier helper privé `room-terrain-next`, GEL90A7, avait une erreur de copie
du voisin nord du BFS. Elle a été détectée statiquement ; ce corps n'a jamais
été exécuté. La reprise `room-terrain-reprise-next` corrige seulement deux
signes, GEL `5743D54D2C00E6E07723898838985031D6B4FC06648E95D6450A232D25442E8C`,
helper `1BF414095317C815C1E4A3D8519549F539C7E631424982DE4232EFCA358A8069`.
Barrières, dimensions, terrain dense et solver entier sont comparés aux corps
historiques ; les deux Env inversent leurs seules substitutions vers les RAW originaux.

Le raccord Core repris, GEL `E72FEC94907A91DA4074015A3EE81019C59145BE39B8953553D85339BAED20DB`,
inverse 83 imports et l'unique appel ajouté retrouve le RAW original. Le callsite
réel emploie C, son mandat readonly existant et le vrai reset. Le cache public
Room et le journal canonique ne sont pas remplacés.

Core types : `aulnes-v236-room-core-reprise-types-2026-10-06T09-13-30.401Z-5316`,
PASS2,579s. Premier banc BEE2 : types
`aulnes-v236-room-terrain-type-2026-10-06T09-24-00.034Z-7844`, FAIL3,552s :
le paramètre error masquait le listener error lors de son retrait. Aucun runtime
de ce banc. La reprise distincte conserve les anciens bytes ; renommage failure
et URLindex repris seulement dans les corps exécutés.

Banc repris GEL `D43454917219DD12D2F45708F84100089D1620360923D761FF13DE63CA75421D`,
revue indépendante et inverses RAW. Types repris
`aulnes-v236-room-terrain-type-reprise-2026-10-06T09-27-28.833Z-27084`, PASS3,203s.

## Oracles natifs et coût CPU

`aulnes-v236-room-terrain-cpu-reprise-2026-10-06T09-27-45.314Z-4028`,
**PASS221,489s**. Rapport privé
`tmp/performance-orientation-v236/room-terrain-controls-reprise-next/captures/run-2026-10-06T09-27-45.804Z-F6SycH/report.json`,
SHA256 `44E1CD1717BE053DD9112124813C671D4448EF5DD8C25A5E2C96C4DA9BA122C3`.
Sources/public62 inchangés, erreurs vides, workers/browser/serveur possédés fermés.

Deux sources authentiques 250² jouent 64 vrais ticks, produisent chacune65
paquets natifs : Aulnes6934→6998 (5935 patches lifecycle, six publications de
membership) et mixed2000→2064 (987 patches, huit membership). Encoder/décodeur
et façade/journal V233 uniques ; pas de transport JSON/CDP des graphes.
87 publications préparées32² couvrent C avant D, roche→rough-stone, naissance,
barrières ordonnées, lumière/fuel/toits/portes, reset, éviction et epoch. Elles
ne sont pas présentées comme une partie jouée ou une sauvegarde certifiée.

Oracles : graphes/aliases/own keys/anciens Worlds et paquets, labels et RoomSpace,
identités, F32/Uint8, géométries/ordres/slots/bounds/références actuelles,
révisions/versions et marques CPU nécessaires exacts. 34 777 147 vérifications
Aulnes et24 036 718 mixed, plus corpus préparé. Les entrées false incluent
mutations au même tick, copies, dimensions de même aire, Proxy/lectures/exception,
caches partiels puis reprise valide. Refus précoce schemaNaN, stale et checkpoint
à la même révision passent. Aucun nouveau refus tardif ou domaine raw+true certifié.
Sauvegarde et un vrai tick après reprise des deux sources sont exacts, RNG compris.
Restauration compile CPU uniquement ; pas de mesure d'upload/pixels GPU.

La page libère les Worlds attendus et termine le worker d'oracle avant les
mesures. Chaque worker A/B neuf reçoit seulement packets/name/finalSave ; aucun
observer O(N), copie d'ancienne vue ou second pipeline entre samples. Clone,
lecteur strict et scène concernée/Lighting/barrières/suffixe sont chronométrés.
Ce sous-ensemble exclut dessin structures/acteurs/piles/UI/audio. Huit ticks
chauffent, 56 publications sont mesurées, dont47 applications selon le gate
index%6≠2. Construction/checkpoint/froid sont séparés et restent dans allInclusive.
Source/encodage et livraison native du corpus précèdent les timers.

| Entrée / cycle | Total A ms/publication | Total B | Variation |
| --- | ---: | ---: | ---: |
| Aulnes1 | 11,1652 | 10,7768 | −3,48 % |
| Aulnes2 | 11,4661 | 10,5884 | −7,65 % |
| mixed1 | 10,0536 | 9,5098 | −5,41 % |
| mixed2 | 9,9643 | 9,4402 | −5,26 % |

Moyennes des quatre passes : Aulnes11,316→10,683ms (−5,59 %),
mixed10,009→9,475ms (−5,33 %). AllInclusive froid/chauffe/construction compris
baisse d'environ3,3 % sur les deux sources. Froid Aulnes435,95→444,65ms (+2 %)
et certaines durées decode B sont défavorables malgré son corps inchangé :
aucun gain ou causalité du décodeur attribué à ce candidat.

## GAME ordinaire et décision

Banc ROOT distinct `ordinary-game-room-next`, GEL
`0F4E583F88675AF4547E4A9CB7E3B696772AFED3CD3F87ACDD146E282F15EE06`.
Parent nocturne RAW inverse ; harness V224/V225 inchangé SHA65A88980.
A produit V233, B quatre corps repris Room/Env/Core, IDs canoniques et journal
unique. Quatre loads attestés. Deux origines possédées5223/5224, HMR/watch off,
A/B/B/A successifs, même Aulnes6934, iso-near104/89/zoom2,1920×1080/DPR1,
AMD WebGPU matériel,3s chauffe/8s mesure/6× demandé, qualités communes conservées.

`aulnes-v236-room-game-2026-10-06T09-36-32.790Z-20068`, **PASS97,936s**.
Rapport `tmp/performance-orientation-v236/ordinary-game-room-next/native-abba-report.json`,
SHA256 `59BE71E59B7B095F77753EA1833BD95AC98F08B857315E5F7AF21C0B86E9D6DA`.
Sources/harness/entrée stables, zéro erreur, serveurs et navigateurs possédés fermés.

| Passe | RAF/s | Vitesse réelle | CPU moyen ms | p95 CPU ms |
| --- | ---: | ---: | ---: | ---: |
| A1 | 145,296 | 5,9103× | 3,792 | 13,2 |
| B1 | 143,030 | 5,9423× | 3,829 | 13,4 |
| B2 | 145,047 | 5,9318× | 3,795 | 13,5 |
| A2 | 142,407 | 5,9255× | 3,868 | 13,5 |

Moyennes143,8516→144,0382 RAF/s : **+0,1866/s, +0,13 %**, plages chevauchées.
CPU3,8297→3,8116ms (−0,47 %), p95 moyen13,35→13,45ms défavorable.
Vitesse5,9179→5,9370× (+0,32 %). Ce seul cycle local ne démontre pas de gain
FPS utile, de fréquence physique240Hz ou de toutes vues. Aucune nouvelle
recovery GPU/GAME n'est exercée par ce banc ; les reprises CPU restent distinctes.

**Candidat écarté, produit V233 conservé.** Pas de second banc lourd ou intégration
de cette piste sans changement causal. Le gain global nocturne
[V225→V233](autonomous-performance-2026-10-06.md) n'est pas augmenté par V236.
Suite privée : résultat naturel compact, suppression du parcours complet O(N)
quand la voie indexée ne requiert que les changements exacts. Aucun gain futur
ou nouveau contenu acquis ; autonomie et commits locaux sans push continuent.
