# V289 — comparaison primitive des parents électriques

Les deux candidats de ce lot sont écartés. Le produit reste exactement [V288](aulnes-performance-v288.md), `ca88ffab` : le petit gain CPU de la reprise ne démontre pas un gain stable en jeu. Aucun FPS supplémentaire livré ; moteur, rendu, règles, schéma 218 et 63 sauvegardes publiques restent inchangés.

## Changement essayé

Le cache des parents électriques vit dans une seule adoption du décodeur. Chaque appel conserve le filtre historique et les lectures des dimensions puis des six champs de chaque transmetteur, dans leur ordre. Un témoin privé de primitives canoniques permet de comparer ces valeurs sans reconstruire leur texte. Le premier écart ouvre une capture locale ; les objets atypiques sont convertis immédiatement, avant le champ suivant. La clé historique entière reste le repli, avec ses collisions antérieures.

Le premier candidat réécrit deux tableaux puis les compare. La reprise garde un témoin engagé immuable : un hit complet ne copie rien, ne réécrit rien et ne refait pas les contrôles de domaine. Au premier écart, elle copie seulement le préfixe déjà lu. Une lecture récursive peut engager un autre index sans modifier le témoin externe ; la comparaison finale utilise l'état courant. Longueurs, suppressions, doublons, `NaN`, `-0`, getters, Proxy, coercitions et exceptions conservent leurs observations historiques. La reconstruction des empreintes garde ses propres relectures.

Le domaine est celui des intrinsics et d'une instance de cache ordinaires ; aucune équivalence JavaScript universelle pour Array species, monkeypatches ou Proxy du cache n'est revendiquée. Il n'y a ni cache inter-paquets, ni suppression de garde, ni mandat natif inféré d'un booléen.

## Coût complet

Deux corpus proviennent de 32 ticks ordinaires : Aulnes intégrées 8434→8466 et ancienne référence 6934→6966. Chaque variante est chargée à l'URL canonique dans des processus neufs A/B/B/A ; quatre deltas de chauffe, puis 28 mesures de clonage et adoption complète. Les 33 vues conservées, graphes initial/final, sauvegarde/rechargement et véritable tick suivant 8467/6967 restent exacts. Le froid est séparé.

Le premier candidat est exact mais plus lent sur l'intégrée : adoption +1,65 %, total +1,63 %, p95 total 28,032→32,319 ms. Il est rejeté sans GAME. Gel `98D97E14`, `tmp/performance-v289/decoder/freeze-Jcj835/manifest.json`, rapport `decoder/cost-v1aCKT/report.json`, PASS 91,787 s. Typage 5,530 s et 83 cas dans neuf fichiers, 11,436 s. Ces preuves restent distinctes de la reprise.

| Reprise, moyenne chaude | V288 | Candidat | Variation |
|---|---:|---:|---:|
| Intégrée : adoption |16,759 ms|16,444 ms|−1,88 %|
| Intégrée : clone + adoption |22,030 ms|21,693 ms|−1,53 %|
| Ancienne : adoption |10,854 ms|10,404 ms|−4,14 %|
| Ancienne : clone + adoption |15,597 ms|15,144 ms|−2,91 %|

Sur l'intégrée, les deux B sont inférieurs à chacun des A, mais le p95 total augmente de 27,695 à 28,957 ms et le maximum de 28,750 à 34,361 ms. Sur l'ancienne, B2 ne dépasse favorablement A2 que de 0,007 ms ; aucun gain général de cette ampleur n'est assuré. Les froids anciens sont défavorables, donc aucun gain froid général annoncé.

Reprise : gel `DA6DCF7F`, `tmp/performance-v289/decoder/freeze-EZUVRA/manifest.json`, feuille `6C7841CA`, rapport `decoder/cost-v4rHCy/report.json`, PASS 89,810 s. Ces timings Node ne mesurent ni dispatch du navigateur, ni rendu, GPU ou FPS.

## Chrome et décision

Quatre parcours GAME neufs A/B/B/A, Chrome matériel AMD/WebGPU, 2560×1440/DPR1, Vite dev, checkpoint 8434, caméra orthographique 129/122/zoom1. Mêmes réglages, chauffe 3 s puis mesure 10 s ; aucun profil CPU additionnel dans ce lot.

| Passage | RAF/s | Vitesse effective | p95 des intervalles | Reprise exacte |
|---|---:|---:|---:|---:|
| V288 A1 |73,10|6,075×|33,2 ms|8903|
| Candidat B1 |83,36|6,080×|28,5 ms|8909|
| Candidat B2 |86,89|6,009×|26,5 ms|8913|
| V288 A2 |85,35|6,113×|27,4 ms|8910|

L'agrégat donne 79,224→85,125 RAF/s (+7,45 %), débit 6,094→6,045× (−0,81 %) et moyenne des p95 30,30→27,50 ms. Cependant **A2 atteint déjà la moyenne B** : l'écart agrégé dépend fortement du premier A, plus lent. Les maxima B sont 74,9/42,6 ms, contre 93,8/50,1 ms pour A. Ce cycle ne permet pas d'attribuer un gain FPS stable au candidat. Le petit gain moyen Node ne suffit pas à sa promotion, avec des pointes Node défavorables.

Décision : **restaurer exactement le lecteur V288, archiver les deux prototypes et les treize tests différentiels, puis fermer cette piste sans deuxième banc inchangé**. Aucun gain GPU ou 240 FPS certifié. Les mesures headless restent locales et ne certifient pas un écran 240 Hz ni toutes les cartes et caméras.

## Validation

La reprise passe le typage en 6,169 s, 85 cas dans neuf fichiers en 11,496 s et le build en 1,944 s. Treize tests différentiels couvrent le lecteur, dont deux ajoutés pour la réentrance sur un hit chaud et les champs `undefined` au-delà d'un ancien témoin. Les validateurs de snapshots, énergie, hydroponie, biocarburant, hôpital, pâte nutritive et commerce orbital sont contrôlés ensemble. Revues indépendantes et prototypes restent sous `tmp/performance-v289` ; les journaux sous `tmp/validation-runs/performance-v289-*`.

GAME PASS 193,417 s, `tmp/performance-v289/native/abba-jK3OcL/report.json`. Les quatre sauvegardes/reprises sont exactes, les erreurs vides et les sources/publics inchangés. Les navigateurs et serveurs privés sur le port 5322 sont fermés. Aucun contrôle lourd supplémentaire après restauration : les campagnes publiques et de présentation de V288/V287 ne sont pas rejouées pour un produit identique. La note et les documents canoniques seuls constituent la livraison V289.

Contrôle documentaire PASS 0,854 s : 896 documents, 8 520 liens locaux, six en-têtes au schéma 218. Sources produit restaurées exactement ; seuls les documents changent dans ce lot.

## Suite bornée

La piste électrique s'arrête après cette reprise et sa comparaison GAME. Le profil MAIN valide V287 place toujours le lecteur strict et l'application de scène avant les petits postes isolés ; les poids inclusifs ne s'additionnent pas. Une fermeture réelle des références MAIN et des validations groupées nécessite d'abord un audit concret des écrivains et références exposées. Les Workers et le freeze incrémental V247/V248/V251 ont déjà été mesurés : aucun banc inchangé à relancer. CropBatch constitue au plus un petit poste distinct ; journaux V233, lecture compacte V237 et certificats V239 ne sont pas de nouvelles pistes.

L'audit ciblé `tmp/performance-v289/main-world-ownership.md` relève neuf sites : reconstruction du décodeur, callbacks publics, aliases UI/menus async, scènes retenues, partitions naturelles, audio et diagnostic DEV. Aucun écrivain du World n'est trouvé dans les consommateurs inspectés ; le diagnostic DEV en retourne une copie. Cela rend une fermeture constructive privée plausible, mais ne la prouve pas : callbacks publics remplaçables, descendants partagés et helpers transitifs restent à traiter. Ni un type readonly ni le booléen de rendu existant ne peuvent donner cette autorité.

Le diagnostic moteur Node existant donne 26,555 ms moyens par tick intégré, avant observateurs et publication. Il ne prouve pas un plafond Chrome, mais interdit de présumer une marge gratuite pour déplacer le lecteur strict sur le Worker source. Aucun noyau numérique dominant ne justifie encore WASM ; conversions, transferts et coût complet resteraient à mesurer.
