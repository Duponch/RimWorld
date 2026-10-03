# Validation V195 — culture médicinale domestique

3 octobre 2026, parent V194 `6602049`, schéma **182**. [Contrat](../development/healroot-domestic-v195.md), [recherche Core](../research/healroot-domestic-core-v195.md), [stratégie](../development/testing.md). Cette preuve distingue production, fixtures réparées, parcours préparés et mesures isolées ; elle ne ferme ni G1 ni le catalogue agricole.

## Périmètre et référence

Plantes 8 est une garde d'admission du semis, automatique ou forcé, sans minimum de récolte/dégagement et sans interruption d'une réservation déjà acceptée pour la seule baisse de niveau. Semis/récolte physiques 80/40 ticks neutres, croissance nominale sept jours biologiques, PV60, produit `herbal-medicine` existant, rendement physique et tirages confirmés V179. Dépôt positif prévalidé ; refus conserve plante, identités et PRNG, résultat nul consomme le pied sans dose. Coupe stérile et naissance à fin de semis sont des adaptations déclarées. Froid sans mort immédiate, pâture du plant vivant et produit non alimentaire restent distincts.

XML et IL Core locaux **1.6.4871 rev590**, recoupements Internet primaires et corpus figurent dans la recherche. Nouveau relevé `WorkGiver_GrowerSow` ; autres IL V178/V179 réutilisés. Aucun parcours du vrai RimWorld, aucune nouvelle empreinte de son assemblage, ni difficulté agricole complète n'est revendiqué. Ancien181 validé strictement avant migration de numéro seule ; futur identifiant refusé dans plantes, zones, pertes de feu et bridge anciens, même à quantité nulle.

## Contrôles ciblés

**82 réussis, un microbanc ignoré, 21 fichiers uniques**, par composition des rapports `tmp/v195-targeted-sim.json`, `tmp/v195-targeted-render.json` et `tmp/v195-targeted-final.json`, sans compter deux fois les reprises. Le benchmark ignoré préexistant est `benchmark immutable mixed resources`, non activé par ce lot. Régression exhaustive et campagnes naturelles longues non exécutées.

- Première préparation courte :23 cas,19 réussis/4 échecs. Deux oracles suivaient une pile source retirée lors du transport au lieu de l'identité de cargaison ; seed10000 avait un premier tirage0,596291 inférieur à0,60, donc une réussite ; une contusion2 milliPV guérissait avant soin. Checkpoints acquis avant correction : propriétaire/quantité/contact, oracle xorshift indépendant seed12345 et vraie contusion2PV. Aucune règle produit détendue. Le fichier métier repasse10/10 (`tmp/v195-domain-final.json`).
- Groupe simulation :62 cas,59 réussis/3 échecs dans des copies historiques V166/V167. Retrait des seules politiques futures viande/fourrure de renard via helpers existants ; préparation de la faune sous son vrai ancien profil, sans relabeller une population moderne. Checkpoint bridge cloné comme le transport, témoin immuable, même révision après refus. Validateurs et JSON historiques intacts. Le précédent test V83 des cultures reçoit aussi le filtre historique approprié.
- Groupe de réparation/rendu :23 réussis et un ignoré. Après le correctif final de couleur GPU, seuls les contrats graphiques touchés et le catalogue sont rejoués :15/15. Les autres résultats sont réutilisés pour leurs sources inchangées.

Niveaux7/8, deux chemins planner, ordre forcé/file et baisse après acceptation, XP/contact, obstruction transportée, saturation atomique, succès/échec/zéro, PV, coupe, pâture, gel/reprise, sauvegarde, migration et bridge au même tick sont couverts. Matrices/bornes, slots libérés, changement de catégorie, croissance, préparation restaurable et option sans texture sont contrôlés séparément. Typage et build passent : **677 modules**, avertissements existants de chunks dépassant500kB et de temps des plugins ; aucune dépendance modifiée.

## Parcours public dans Chromium matériel

**1/1**, `tests/integration/healroot-domestic-v195.spec.ts`, AMD RDNA‑1, Chromium **153.0.8010.12**, viewport1440×1000. Rapports/captures sous `tmp/test-runs/healroot-domestic-v195-native/artifacts/`. Chargement par le vrai menu parmi45 entrées ; UI, worker et commandes ordinaires, sans mutation du World par l'instrumentation.

La 45e scène **« Champ médicinal et soins · 3 colons »**, 32², seed42, tick0, prépare trois profils8/7/8, besoins hauts, une case de riz vide, une réserve médicale, un autre pied médicinal mûr et une contusion5PV. Elle n'a ni travail, trajet, dose herbal, semis, récolte ou soin préacquis. SHA-256 du payload : `dd0def3f182ee1b9b535613d97395cb657049a799d9b7558bfb4d791d98c0b12`. La maturité préparée ne démontre pas sept jours de croissance naturelle.

Refus Plantes7 dans le vrai menu contextuel, marche et semis8, XP au contact/progression tick28, naissance effective tick121 ; récolte7 au contact tick151, dose réelle tick200, prise tick201, stockage tick215, soin avec médicament porté tick227 puis consommation tick320. Reprises exactes au semis, naissance, récolte, portage, stockage, collecte de soin, soin et résultat. Deux caméras en gros plan, captures relues ; aucune erreur JS/GPU.

Acteurs et quatre lots agricoles gardent objets/capacités, pipelines **78→78** dans ce parcours. Cette acquisition précède le dernier renommage isolé du buffer de couleur de la vue éloignée ; clinique, travail, sauvegarde/bridge, scènes et rendu proche sont inchangés. Le contrôle matériel suivant exerce ce correctif final et la croissance du lot éloigné. Les chunks médicinaux changent légitimement lors de naissance/récolte : aucun oracle de géométrie immuable abusif.

Reprises de pilote distinctes : le cadrage initial zoomait de nouveau vers l'extérieur, puis demandait un panoramique au-delà des bornes de la petite carte. Correction pour zoomer sur une cellule réellement découverte, sans toucher la caméra du produit. Une préparation initiale dépassait15s ; attente explicite bornée60s et diagnostic conservé. Le parcours final passe en2,5min ; ces reprises ne sont pas de nouveaux résultats fonctionnels.

## Vue éloignée : GPU puis CPU successifs

`tests/integration/overview-residency-v195.spec.ts`, rapport final `tmp/test-runs/overview-residency-v195-final/artifacts/overview-residency-v195.json`. AMD Ryzen5 3600, Windows10.0.26300, Node24.11.1, Chromium153.0.8010.12, AMD RDNA‑1. Monde250² explicitement préparé,10000arbres,16 puis17 racines médicinales ; trois acteurs du World non rendus. Huit modules empreintés avant/après, sources gelées.

Première apparition ne reconstruit plus les quatre lots et toute la forêt. Slots libres réemployés, seul buffer du lot concerné agrandi en puissance de deux, même Mesh/matériau/nœuds nommés ; `geometry.instanceCount` fait autorité. Les géométries minuscules sont copiées avec leurs couleurs, sans disposer celles des voisins. Les quatre cultures historiques gardent leurs allocations ; pas de cinquième buffer pleine carte pour healroot.

Le premier contrôle matériel échoue sur des couleurs noires, sans erreur GPU. Capture et pixels conservés sous `tmp/test-runs/overview-v195-diagnostic/`. Source Three r186 `NodeMaterial.setupDiffuseColor` vérifiée : le champ `instanceColor` active un varying implicite même sur le Mesh personnalisé ; renommage `colorBuffer`, conservant le vrai attribut TSL. L'oracle vert/brun n'est pas détendu. Lecture des pixels corrigée séparément pour le padding WebGPU de256octets par ligne. Un second diagnostic est arrêté avant toute mesure à la demande centrale, puis le contrôle final passe.

**GPU matériel final1/1** : capacité16→32, pipelines **7→7**, objets/nœuds/matériaux stables, voisins intacts,470408 sommets contrôlés dans leurs bornes, World/PRNG inchangés, aucune erreur de shader/validation. Vert/brun visibles et nouvelle silhouette confirmée dans les deux projections (105/102 pixels changés). Captures finales relues. Les textures sont désactivées dans ce harness ; cela ne prouve pas toutes les variantes matérielles ou une durée GPU nulle.

Après attente et destruction du renderer, microbanc **CPU d'adoption isolé** A/B/B/A,20 échauffements puis50 mesures par rotation. A ajoute la naissance par delta ; B émule le reset complet avec le **code courant**, pas une archive historique. Oracle sémantique indépendant des slots et mêmes World/PRNG, empreinte `795d3f7a` partout. Seul `update` est chronométré, hors génération, rendu et validation.

| Rotation | p50 ms | p95 ms |
| --- | --- | --- |
| A — delta | 0,2 | 0,5 |
| B — reset complet émulé | 20,5 | 37,7 |
| B — reset complet émulé | 19,6 | 34,8 |
| A — delta | 0,1 | 0,3 |

Ces nombres établissent une différence de sous-coût sur cette forêt préparée, avec résolution d'horloge limitée ; ils ne prouvent ni gain général du tick/worker/RAF/FPS, ni causalité face à l'ancienne révision, ni coût GPU nul. Les buffers ont une réserve de capacité, les changements et croissances restent des allocations/uploads réels.

## Présentation, catalogue et documentation

**Présentation finale passée**, `tmp/v195-presentation-delivery.log` et `tmp/test-runs/healroot-domestic-v195-presentation-delivery/artifacts/harvest-sync-verification.json` : carte250² seed42, trois colons, deux phases45s, vitesses6/1/3 alternées toutes2s. Minage186→162 et abattage262→238 tâches ;9764/10573 images, p95 RAF8,3/4,3ms, aucune famine de présentation, saut, occupation solide ou erreur. Réponse visible maximale des commandes50,9/30,5ms. Ce sont deux fenêtres mesurées, pas une cadence globale garantie ; une image de minage atteint200ms.

Le premier essai échoue avant phase active sur la préparation initiale. Attente explicite bornée60s et diagnostic ajoutés au harness, sans changer le produit ni les assertions. Le second échoue uniquement sur deux `ERR_INSUFFICIENT_RESOURCES` sans URL : tâches, contacts, suppressions et contrôles sont cohérents, mais le passage reste rouge. Capture des requêtes échouées ajoutée ; une relance est interrompue après le minage lorsque son handle disparaît, arrêt du processus vérifié avant tout nouveau lancement. Un refus local de lancement `spawn EPERM` précède ce parcours natif et ne constitue pas un test exécuté. Conservation immédiate de chaque phase ajoutée hors mesure. Le passage final minage/abattage est complet, sans requête échouée ni erreur ; la cause des deux anciennes erreurs réseau n'est pas établie.

Les **45 payloads publics** passent empreinte SHA-256, désérialisation avec validation/migration stricte et reprise exacte (`tmp/v195-catalogue.json`, `tmp/v195-catalogue.log`). Aucun ancien payload n'est réécrit. **Contrôle documentaire passé** :671 documents,6447 liens locaux, six en-têtes courants au schéma182 et trois originaux identiques en octets (`tmp/v195-docs.log`). L'archive des instructions n'est pas modifiée. Aucun passage interrompu n'est annoncé réussi.

## Limites et reprise

Hydroponie, maladies végétales, difficulté agricole générale, nouvelles recettes/doses, fabrication médicale et autonomie médicale naturelle restent différées. Temps total de recherche/implémentation non chronométré ; les commandes/captures conservent leurs durées. La validation a nécessité des reprises évitables de fixtures et de cadrage, puis un diagnostic GPU utile ; aucune économie chiffrée de temps/tokens n'est annoncée.

À la demande utilisateur, **arrêter l'autonomie après ce commit**. Le prochain chantier est [sang, herbe, carcasses animales, râles et franchissement visuel](../development/visual-blood-next.md), uniquement après relance. La rage animale reste une piste de recherche non livrée, sans priorité sur cette demande.
