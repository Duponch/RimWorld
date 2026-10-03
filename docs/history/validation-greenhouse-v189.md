# Preuve ciblée — Serre électrique V189

3 octobre 2026. [Contrat](../development/greenhouse-v189.md), [recherche Core](../research/greenhouse-core-v189.md). Schéma **177** : 176 validé strictement avant migration neutre. Une lampe horticole construite et alimentée ouvre la culture sous toit sur sol existant ; aucun plant, courant, ouvrage ni progression accordé aux anciennes parties.

## Contrôles ciblés

**114/114 tests uniques, vingt-six fichiers** acquis en trois groupes successifs, puis gardes finales : 65/65 dans seize fichiers, 42/42 dans sept autres, puis 2/2 du parcours préparé ; **30/30 dans huit fichiers** en garde finale, dont cinq tests nouveaux de catalogue public et cache d’ombre. Rapports `tmp/greenhouse-targeted-v189.json`, `tmp/greenhouse-regression-targeted-v189.json`, `tmp/greenhouse-flow-v189-corrected.json` et `tmp/greenhouse-final-guards-v189.json`. Construction/matière et accès, horaires stricts et origine civile, puissance/délestage, chauffage réel, diffusion/diagonales/obstacles, croissance intégrale, lampe ordinaire insuffisante, obscurité, coupure physique, intervalle capturé, reprise, semis/récolte, emballage, schéma ancien/futur, deltas au même tick et snapshot précédent immuable sont couverts. Gardes existantes réseau, toiture, navigation de mobilier, construction, température, secours, stockage et bridge exercées. Régression exhaustive et campagnes longues non rejouées.

Deux préparations ont d’abord été invalides : cinq conduits sans état électrique dans la colonie et soixante générateurs sans `burnRemainder` dans le banc. Champs corrigés selon les constructeurs ordinaires, sans assouplir les validateurs. Le parcours a été relancé prématurément avant la première correction : reprise évitable, conservée dans les rapports rouges sous `tmp/`.

## Interface réelle et préparation graphique

Chromium **natif WebGPU 1/1**, scène publique préparée **32×32**, 40e entrée « Serre électrique · 3 colons ». Rapport `tmp/test-runs/greenhouse-v189-native-selection/artifacts/greenhouse-v189-browser.json`, journal `tmp/greenhouse-native-selection.log` : portage tick2006 puis sauvegarde/recharge exacte, lampe construite/alimentée2339, extinction physique2349, redémarrage2368, trois récoltes et **18 riz au sol à2702**. Acier40 consommé une seule fois, une lampe, aucun résidu de culture ni erreur navigateur. Captures iso/perspective et fin relues ; UI indique2 900W, réseau3 000W, état et couverture prévue.

Les premiers parcours finissaient la boucle mais échouaient sur **78→79 pipelines**. Diagnostic par étapes et WGSL : nouvelle compilation du contour de sélection `MeshBasicMaterial`, pas de la lampe ni du champ horticole. Un triangle dégénéré conserve sa géométrie position-only sous chargement ; la sélection et le survol ne masquent plus la préparation pendant les attentes GPU. Garde finale inchangée : **zéro nouveau pipeline en jeu**. Aucun matériau, lumière Three ou mesh par lampe ajouté. Cette garde ne mesure pas le coût GPU ni les FPS globaux.

## CPU isolé

Banc `scripts/benchmark-greenhouse-v189.ts`, rapport `tmp/greenhouse-benchmark-v189.json`, exécuté seul avant build/native. Windows11 10.0.26300, Ryzen5 3600/12 processeurs logiques, environ16Gio, Node24.11.1. Deux scènes préparées **250²**, graine189, climat annuel adopté, **10 572 riz**, 1 100 structures, 2 420 cellules couvertes ; vingt lampes ordinaires puis vingt horticoles. Deux séquences **A/B/B/A**, dix échauffements, vingt échantillons de cinq appels. Valeurs en millisecondes par appel ; World/PRNG contrôlés, oracle indépendant par somme de ticks/ciel et facteurs thermiques. Sources simulation gelées ; la correction graphique ultérieure ne touche pas les modules mesurés.

| Sous-coût | Référence reconstruite p50 | Chemin courant p50 |
| --- | --- | --- |
| Réconciliation stable, sans horticole | 0,5941–0,6046 | 0,0620–0,0638 |
| Réconciliation stable, vingt horticoles | 0,5265–0,7253 | 0,0487–0,0503 |
| Champ lumineux stable, sans horticole | 1,3495–4,6449 | 0,0048–0,0051 |
| Champ lumineux stable, vingt horticoles | 1,5609–2,5409 | 0,0064–0,0090 |
| Champ changeant, vingt horticoles | 1,6257–2,1738 | 1,5619–1,8253 |
| Changement du régime de vingt horticoles | 0,8097–1,0673 | 1,5709–1,6390 |

Les références sont une réconciliation exhaustive du contrat courant et des caches lumineux neufs, **pas l’ancien moteur**. Le régime stable réutilise ses index et ne reconstruit aucun champ ; les changements en reconstruisent un. Le chemin sans horticole ne lit pas de lumière agricole. Le changement de régime est plus coûteux que le comparateur : pas de gain annoncé sur cette transition. Lecture lumineuse préalable exclue du temps de réconciliation, mais allocation/flood inclus dans diffusion ; reconstruction topologique exclue. Requêtes de croissance64 témoins : courant p50 environ0,0202–0,0368ms contre somme indépendante0,8159–1,0935ms ; cela prouve une requête bornée, pas un gain général.

## Présentation et livraison

**Build/typage final passés, 650 modules**, journal `tmp/greenhouse-build-v189.log`. Avertissement de taille des bundles existant conservé. **Présentation250² passée** successivement après le parcours natif, journal `tmp/greenhouse-presentation-v189.log` : minage7 802 images, p95 RAF6,2ms ; abattage7 772 images, p956,1ms ; zéro saut brut/corrigé, excès de trajet continu ou occupation solide dans les deux parcours. Ces fenêtres ne garantissent pas une cadence générale. Recherche, implémentation, correction de préparation, réparation des fixtures et mesures sont distinctes. Pas de suite complète, campagne naturelle longue, tick complet/worker, mesure GPU isolée ou écoute humaine nouvelle.

Hydroponie, nouvelles cultures, courts-circuits sous pluie, éclairage coloré et catalogue agricole exhaustif restent absents. Trois générateurs, toit, riz mûr prochainement et compétences de la scène sont préparés explicitement ; cette scène n’établit ni autonomie de colonie ni charge de jeu250².
