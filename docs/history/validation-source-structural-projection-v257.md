# V257 — validation et rejet de la projection structurelle

**Seuil préalable non atteint : rejet sans grand oracle natif, GAME, build ou promotion.** Dix composants et coût complet passent, sans constituer une qualification graphique/native complète. Produit V242, schéma 198 et 62 références/65 fichiers publics exacts ; aucun FPS ajouté. [Contrat](../development/source-structural-projection-v257.md), [recherche](../research/source-structural-projection-v257.md).

## Préparation et composants

Le miroir reprend les 855 fichiers privés V256, manifeste parent `791F0BBD…`. Seule `src/bridge/source-vegetal-projection.ts` change relativement à V256 ; les 42 feuilles différentes du produit comprennent la base couplée non promue. Manifest V257 `4883A3782F9CF2C9942D78F62F341D5F8A76DDA9188F99891276E473F1012033`. Les autres corps sont vérifiés littéraux, les éditions ont un inverse entier et le préfixe math/agenda reste exact.

GEL kernel `B288592E…`. Le [premier typage](../../tmp/performance-orientation-v257/captures/run-types-2026-10-07T21-54-49.981Z-WKjZyw/report.json) reste FAIL après 7,561 s sur une fixture négative width et sa corrélation d'union TypeScript. Une reprise distincte ne change que la copie de cette fixture par une assertion de type effacée ; aucun corps candidat/runtime n'est corrigé. GEL repris `769CF4D8…`.

| Contrôle | Verdict | Durée |
|---|---|---:|
| Premier typage, fixture width | FAIL conservé | 7,561 s |
| [Typage repris](../../tmp/performance-orientation-v257/captures/run-component-reprise-types-xnvbvD/report.json) | PASS, candidat inchangé | 12,293 s |
| [Dix composants](../../tmp/performance-orientation-v257/captures/run-component-reprise-components-wGqMTF/report.json) | PASS, sept Source et trois consommateurs | 21,443 s |
| [Typage du coût](../../tmp/performance-orientation-v257/captures/run-cost-types-2026-10-07T21-58-11.658Z-j0DFpw/report.json) | PASS | 5,932 s |
| Coût complet ABBA | PASS d'exécution, seuil de poursuite non atteint | 73,898 s |

Les composants préparent de petits Worlds avec vrai SnapshotEncoder, strict Decoder et queries RAW. Ils vérifient suppressions/ajouts/classes, ordre agricole et rangs survivants, valeurs/math, croissance/feuilles/toiture/terrain, C après D, 96 publications et éviction, retour A→C, suppression/renaissance, full de contexte/ordre/checkpoint/epoch, absence de relecture des membres intacts, copie PlantLife, erreurs locales et révocation. Les trois consommateurs comparent ordre des changes, références propres à C et restauration historique. Deux lecteurs témoins sont nécessaires à ces oracles ; ils ne sont pas ajoutés au coût.

Ces tests sont des composants préparés, pas des ticks ordinaires joués ou une preuve de provenance MessageEvent/factory MAIN. Le garde de dépassement des rangs est relu statiquement, sans accès artificiel aux champs privés. Les anciennes limites V256 de qualification mixed et de raccord natif ne sont pas levées par ces cas.

## Banc de coût et critère déclaré

[Rapport complet](../../tmp/performance-orientation-v257/cost-controls-next/captures/run-cost-2026-10-07T21-58-28.831Z-mpQgAJ/report.json), SHA `C8F8F442BCE5BB4E46EB351D142500D6034B295ABAA137F914CE852C21B5902A`. Le [contrôleur](../../tmp/performance-orientation-v257/captures/run-cost-2026-10-07T21-58-28.354Z-R77AmQ/report.json) passe sur GEL `5533B774…`, 4 552 fichiers, avec sources/public et anciens échecs exacts. Les étapes de préparation/kernel/coût sont chaînées avant gel.

A conserve le produit V242 ; B paie le candidat couplé entier, pas seulement la Source leaf V257. Une source réelle, une publication native, un unique strict Decoder MAIN et le sous-pipeline CPU de scène. Huit cohortes fraîches A/B/B/A, Aulnes6934→7030 et mixed2000→2096, tous deux 250×250 : 96 vrais ticks forcés, 97 publications, chauffe huit ticks puis 88 mesures, 81 applications choisies. Aucun shadow, scalaire RAW d'oracle ou capture de graphe dans le coût ; leurs gardes de non-chargement restent actives.

Le [contrat préalable](../../tmp/performance-orientation-v257/cost-admission-contract.json) autorise une suite de qualification si Aulnes circuit B/A≤0,95, **ou** callback B/A≤0,80 avec circuit≤1,02 et source≤1,10. Un PASS du runner indique seulement que le coût s'est exécuté correctement. Mixed, froid et toute régression restent rapportés ; l'équivalence des états finaux ne suffit pas à une qualification graphique.

| Moyenne des deux cohortes par variante | Aulnes A→B | Variation | mixed A→B | Variation |
|---|---:|---:|---:|---:|
| Request→fin callback | 41,683→40,854 ms | −1,99 % | 49,434→49,306 ms | −0,26 % |
| Request→reply | 41,761→40,929 ms | −1,99 % | 49,507→49,378 ms | −0,26 % |
| Callback MAIN inclusif | 7,382→6,536 ms | −11,46 % | 5,181→4,780 ms | −7,73 % |
| Adoption stricte MAIN | 4,058→4,079 ms | +0,52 % | 2,087→2,110 ms | +1,10 % |
| Source complète | 32,376→32,368 ms | −0,02 % | 40,539→40,745 ms | +0,51 % |

La source comprend step/Room, encode, projection et appel postMessage ; callback comprend strict adopt et sous-pipeline CPU. Ces parents se recouvrent et ne s'additionnent pas. Le circuit forcé ne mesure ni vitesse naturelle 6× ni FPS. Les états finaux/RNG sont exacts dans les huit cohortes ; aucun oracle complet de graphes intermédiaires n'est exécuté en V257.

Chaque cohorte B émet un seul full sur 97 paquets : Aulnes 110 009 triplets/2 640 216 octets, soit 2,640216 MB décimaux ; mixed 16 121 triplets/386 904 octets. Ces bytes portent sur les tableaux de valeurs, hors autres champs du message. Les tableaux agricoles complets et les bornes MAIN restent payés. La dose dépasse 64 publications ; les composants, et non ce seul nombre, établissent les cas d'éviction ciblés.

Les deux p95 Aulnes de circuit sont 59,67/61,67 ms en A, contre 61,00/61,91 en B ; callback 14,86/13,47 contre 12,55/12,60 ms. Mixed circuit 75,27/73,13 contre 78,36/75,66 ms. Les maxima mixed de circuit sont plus favorables en B (100,13/102,42 contre 129,83/131,95 ms), sans transformer le faible gain moyen en succès du critère.

Le froid est rapporté séparément : Aulnes A : 1 601,79/1 344,58 ms, B : 1 510,67/1 234,77 ms ; mixed A : 3 922,64/3 980,58 ms, B : 3 867,38/3 864,88 ms. Deux chargements par variante ne certifient pas un gain froid stable. Les niveaux absolus diffèrent du banc V256 ; on n'additionne pas leurs gains ni n'en déduit un effet causal isolé V256→V257.

## Verdict et conservation

Aulnes circuit −1,99 % est inférieur aux 5 % requis ; callback −11,46 % est inférieur aux 20 % de l'alternative. Les plafonds de source/circuit ne compensent pas ce second échec. Le critère fixé avant mesure est donc non satisfait, malgré l'amélioration locale réelle du callback.

**Rejet sans grand oracle de scène, GAME, build, promotion ou second coût inchangé.** Les preuves acquises restent les dix composants et l'exécution de coût avec états finaux/RNG exacts. Factory MAIN native, reprise de bout en bout, Core complet, dessins/pixels GPU et FPS ne sont pas qualifiés ; l'audit Aulnes V256 ne se transfère pas automatiquement à ce nouveau producteur.

Erreurs console/HTTP vides, aucun Worker restant dans les huit cohortes, navigateur possédé et origines 5275/5276 fermés. Sources, 62 références/65 fichiers publics, sauvegardes, sessions utilisateur et references_UI préservés. Aucun push ou changement de règle, cadence, population, horloge ou qualité. Aucun 240 FPS, moniteur 240 Hz ou gain toutes parties certifié.
