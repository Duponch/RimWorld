# Un roman acheté puis réellement lu — V482

**Qualification ciblée acquise le 26 octobre 2026 — schéma 295, non publié.** 76 nouveaux cas et 119 voisins distincts sont acquis par reprises ; deux anciens rouges sont reproduits sur V481. Parcours natif final, sauvegardes entières, typage, compilation et présentation sont acquis. Les six ensembles, SYS-069 et les campagnes longues restent ouverts.

## Résultat pour le joueur

Un exemplaire de roman apparaît dans les futurs stocks orbitaux de gros ou exotiques. La colonie le paie, reçoit la capsule et peut ranger ou faire lire ce même livre. Le lecteur doit le prendre puis rejoindre une place accessible ; seuls les instants de lecture réelle donnent des loisirs et de l’expérience en Intellectuel. Le roman n’est pas consommé : il reste réutilisable, avec son identité, son titre, sa qualité et ses dégâts après dépôt, interruption, transport ou recharge.

L’option **Lire un roman** concerne un adulte libre capable de voir et de manipuler, physiquement présent et disponible. Une personne rétablie mais encore portée par quelqu’un n’est pas disponible pour cette action. Un livre au sol doit être connu, autorisé et accessible ; un ordre direct peut aussi employer le propre inventaire du lecteur, jamais le livre détenu par quelqu’un d’autre.

Dans **Assignations**, deux politiques partagées fixes proposent **Romans autorisés** et **Aucune lecture**. Elles règlent la sélection automatique. Un ordre de lecture manuel reste possible et n’est pas annulé par la seconde politique ; **Effacer les ordres** l’interrompt et dépose le même objet selon les règles physiques ordinaires.

## Référence, règles et adaptations

La primaire est le Core installé **1.6.4871 rev590**, DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. La [lecture datée avec ses XML et sources publiques](../../tmp/novel-v482/primary-notes.md) et la [proposition initiale](../../tmp/novel-v482/model-proposal.md) séparent faits, adaptations et limites. Aucun code, texte, grammaire ou asset propriétaire n’est copié dans le produit.

Le livre est un objet indivisible de **0,5 kg**, **60 PV**, valeur de base **160**, détérioration moyenne **5 PV par jour** et inflammabilité **1**. Les dégâts de la pile sont l’unique autorité de PV. Le prix final conserve qualité, état et négociation. Chaque futur stock des deux familles orbitales compatibles génère un seul roman après les anciens tirages ; les anciens stocks ne sont pas complétés au chargement. La qualité commerciale suit la distribution bornée **Normal à Chef-d’œuvre**, avec deux tirages du flux commercial privé existant. Le titre et le court récit sont des textes originaux déterministes, fixés une fois et sauvegardés.

La référence distingue un genre de loisir **Lecture**. Une séance automatique dure au plus **800 pas locaux**, une séance manuelle **500**, à raison de dix ticks Core par pas. La séance automatique peut finir lorsque les loisirs sont pleins ; la séance manuelle n’est pas écourtée pour ce seul motif. Les déplacements, la prise, les recherches différées et le retour au stockage n’accordent aucun gain.

Pendant la lecture active, le gain de base est **0,144 point de loisirs par pas local**, multiplié par le facteur de qualité et la tolérance au genre Lecture. L’apprentissage demande **1 XP brut en Intellectuel par pas**, soumis aux passions, incapacités et plafonds habituels. **ReadingSpeed ne multiplie pas ces deux gains communs.** La passion intellectuelle donne une pensée de situation de **+4 ou +6**, seulement pendant la lecture active ; le confort et l’usage de salle gardent leurs règles ordinaires.

La navigation et les réservations existantes réalisent prise, trajet, siège et rangement. La sélection locale choisit un livre accessible par coût de trajet puis identité ; c’est une adaptation déclarée du choix aléatoire natif entre candidats favoris. La place préfère une vraie chaise accessible à 32 cases au plus, puis une surface ou une place debout. Les bibliothèques et leur bonus ne sont pas livrés : une étagère ordinaire n’accorde aucun bonus de bibliothèque. Les deux politiques fixes sont une projection du catalogue natif sur le seul type de livre présent, sans éditeur général de politiques.

Sont différés : manuels, schémas, bibliothèques, écriture de livres, récompenses spécifiques, lecture autonome hors carte et branches DLC. La quête potentielle du roman dépend d’Odyssey dans la primaire ; aucun tirage de quête n’est donc importé dans ce lot Core.

## Propriété et sauvegarde

Un seul exemplaire passe du vaisseau à la cargaison, au sol, au porteur puis au stockage. Les prises et transports intégraux conservent son ID ; aucun split, fusion, faux vêtement ou création générique ne remplace cet original. Si un dépôt est impossible, la cargaison interrompue conserve l’objet. Pendant un segment de mouvement déjà capturé, ni gain ni dépôt n’utilise la future position logique.

La migration valide strictement la campagne 294 puis ne change que le numéro en 295. Aucun roman, stock, politique, tolérance, humeur, XP ou effet passé n’est offert à une ancienne partie. Les champs futurs restent refusés avant leur version, et 296 reste fermé. Les gardes couvrent l’objet, son détenteur, la tâche et les jointures après application des deltas ; deux récepteurs indépendants font partie des contrôles de conservation.

Le scénario de contrôle déclare au tick zéro un terrain, deux adultes issus des vrais constructeurs avec leurs désavantages conservés, des fonds, les recherches et les bâtiments préparés. Il ne prétend pas avoir joué leur construction. En revanche, l’achat débité, la capsule, la prise et la lecture passent ensuite par les vrais chemins du jeu.

## Contrôles acquis et échecs conservés

Les durées ci-dessous sont celles des commandes de validation, distinctes du seul temps interne des tests.

| Contrôle | Résultat et portée |
| --- | --- |
| Premier typage | Échec en **15,266 s**, puis reprise acquise en **14,145 s**. Dispatch des deux nouvelles commandes, clé de matériau Livre, libellé et annotations historiques corrigés séparément. |
| Premier groupe de 63 nouveaux cas | **53 réussites, 10 échecs**, **19,831 s**. Préparation et gardes réellement incomplètes ; ce groupe n’est pas présenté comme passant. |
| Reprise groupée de 67 cas | **64 réussites, 3 échecs**, **20,101 s**. Les **14 cas physiques et 16 cas de lecture** passent. Les trois autres échecs restent des négatifs de conservation à isoler. |
| Reprise des sauvegardes | **41 cas réussis**, **16,742 s**, après correction de leurs préparations/oracles et fermeture des gardes de filtres. |
| Typage avant le correctif d’annulation natif | Acquis en **13,682 s** ; ce n’est pas encore le typage consolidé des dernières sources. |
| Reproduction de l’annulation native | **1 échec et 1 réussite sur 2 cas**, **14,992 s** ; après correction, **2 réussites**, **15,572 s**. |

Les journaux conservent le [premier groupe](../../tmp/validation-runs/v482-new-contracts-first-2026-10-26T04-53-53.044Z-30464/output.log), la [reprise groupée](../../tmp/validation-runs/v482-contracts-reprise-2026-10-26T05-00-16.869Z-3312/output.log), les [41 cas de sauvegarde](../../tmp/validation-runs/v482-save-reprise-2026-10-26T05-07-05.794Z-28480/output.log), puis la [reproduction de l’annulation](../../tmp/validation-runs/v482-native-cancel-reproduction-2026-10-26T05-14-54.535Z-12336/output.log) et sa [reprise corrigée](../../tmp/validation-runs/v482-native-cancel-fixed-2026-10-26T05-16-30.843Z-5308/output.log). Ces groupes se recouvrent : ils ne s’additionnent pas en une suite globale acquise sur les dernières sources.

Les premiers échecs ont distingué plusieurs causes :

- La chaise préparée n’avait pas son préalable Mobilier complexe et chevauchait la seconde case de la table. Seule la préparation déclarée a été corrigée : recherche achevée à zéro et table adjacente, sans guérison ni progression offerte.
- Les gardes de portage et de commerce orbital ne représentaient pas encore le roman, ses métadonnées et son dommage nul explicite. Elles ont été étendues uniquement au schéma 295, sans ouvrir les anciens catalogues ni le futur 296.
- Une revue indépendante a trouvé le cas d’un lecteur récupéré mais toujours porté. L’admission, le début et la continuation vérifient désormais le vrai porteur ; un cas dédié conserve cette relation physique.
- Les trois négatifs de sauvegarde suivants utilisaient un aliment sans état de pourriture ou attendaient un message particulier alors qu’un autre contrôle refusait déjà le mauvais original. Les préparations ont été isolées et les refus de conservation maintenus ; aucune assertion utile de sauvegarde n’a été retirée.

## Parcours natif : acquisitions puis reprise du même état

Le [premier parcours natif](../../tmp/novel-v482/native-2026-10-26T05-08-46.456Z-12044/report.json) **échoue**, après une commande de **60,189 s**. Avant cet échec, il a effectivement acquis contact à la console, achat de **280 argent** débité, arrivée de la capsule et du même livre, ordre par l’inspection 3D, prise et trajet sans gain, puis lecture avec loisirs et XP. Les captures existent en **1440 × 1000** et **960 × 800**. Le code d’activité de lecture **14** est observé dans l’entrée du rendu GPU. La politique 2 et une recharge entière exacte en pause sont également acquises au tick 64.

Le défaut restant est réel : **Effacer les ordres** ignorait une lecture manuelle parce qu’elle ne figurait pas dans le prédicat des ordres actifs. La reproduction ciblée a conservé un échec avant correction. Le prédicat reconnaît désormais la lecture manuelle 295 et passe par la transaction ordinaire de dépôt ; le refus conserve l’objet si le sol ne peut le recevoir.

La [reprise native depuis le checkpoint](../../tmp/novel-v482/native-2026-10-26T05-18-08.378Z-11268/report.json) passe en **35,337 s**. Elle joint par empreintes le rapport, les exports et les captures déjà acquis ; **l’achat n’est pas rejoué**. Le checkpoint exact est `reloaded-manual-reading-exact.json`, SHA256 `cdeeee40b28d591f1f0295ab9b6020e5601f9668681d9742bf4d3f25e60551f8`. La reprise contrôle l’interruption et le dépôt du même livre sans perte d’XP acquise, puis importe l’authentique campagne 294 de V481 et vérifie sa migration par seul numéro et son état entier en pause. Le premier rapport reste marqué en échec.

Ce parcours interrompt une vraie séance manuelle après ses gains ; il ne raccourcit pas les durées de 500 ou 800 pas et ne prétend pas les achever dans le navigateur. La fin de séance et le rangement réussi appartiennent aux contrats SIM distincts.

## Rendu, coût et travaux restant à clore

Le roman utilise un modèle original de **neuf petits volumes** de couverture et de papier. La pose de lecture et l’ouverture du livre utilisent le chemin de données du rig existant, avec l’activité 14 ; aucun nouveau buffer GPU ni scène par acteur n’est ajouté. Les candidats et accès de simulation réutilisent les recherches bornées existantes. Cela décrit l’implémentation ; **aucun coût GPU chiffré, gain FPS global ou consommation physique de VRAM n’est mesuré par ce parcours**.

Les résultats finaux et leurs limites figurent ci-dessous. Le premier échec natif, ses reprises et les anciens rouges restent conservés ; aucune suite globale verte ou publication n’est déduite de cette qualification ciblée.

## Clôture ciblée et coût courant

Les **76 nouveaux cas distincts** comprennent 14 physiques, 16 d’activité, 41 de sauvegarde, deux régressions du vrai checkpoint natif et trois de fret. Les **119 voisins** couvrent notamment les retombées toxiques encore actives en 295, les anciennes règles orbitales et de transport, et les étagères liées. Le groupe initial de 123 voisins contient 13 échecs ; la reprise des [98 cas de conservation](../../tmp/validation-runs/v482-adjacent-save-reprise-2026-10-26T05-34-59.882Z-22400/output.log) passe en 21,405 s après correction ciblée et mise à jour de quatre oracles de version. Les admissions explicites 294 et 295 restent positives, le futur fermé est désormais 296. Aucun ancien résultat historique n’est réécrit.

Les deux tests de migrations 215 et 17 conservaient les registres de cartes d’un constructeur courant, interdits avant 255. Ils échouent aussi sur la [copie exacte V481](../../tmp/novel-v482/witness-v481-custody.json) : deux mêmes erreurs, « Invalid historical map registry. », en 19,351 s, avec 14 cas sautés. Les 4 168 blobs Git, soit 32 007 864 octets, sont vérifiés exacts après exécution. Ces deux échecs restent des limites, pas des migrations acquises ni des succès.

La reprise des étagères a trouvé une vraie délégation encore forcée à 286 ; elle utilise maintenant la version réelle. Seul le cas historiquement construit en 286 emploie le constructeur de cette version ; les autres gardent les vraies étagères 295 avec leur filtre Livre. Le [fret de roman](../../tests/novel-freight-v482.test.ts) ferme ensuite masse de 500 g, exemplaire indivisible, reçu chargé et déchargement en 295 ; les trois cas passent en 16,768 s. Achat, formation locale, prise au contact, annulation, retour au sol et recharges gardent le même ID, titre, qualité et dégâts. Un voyage planétaire lointain ou une campagne de camp n’est pas revendiqué.

Après ces derniers raccords, le [parcours natif complet final](../../tmp/novel-v482/native-2026-10-26T06-01-04.814Z-3752/report.json) passe en **45,249 s** sur les sources gelées : 11 exports, cinq captures, deux résolutions, quatre contrats métier et aucune erreur console ou de page. Il confirme achat et capsule, vraie lecture et entrée GPU de la pose, politique, annulation, dépôt et recharge, puis migration de la condition active 294 sans enrichissement. Les parcours précédents de 45,201 s et de reprise de 35,337 s restent intermédiaires, avec leurs sources propres. Le manifeste final contrôle **2 050 entrées** ; 2 048 entrées du banc de coût appartiennent au même ensemble de 2 043 sources produit.

Le **typage final passe en 14,475 s**, puis la **compilation Vite en 4,176 s**. Le [contrôle commun de présentation](../../tmp/test-runs/v482-presentation-2026-10-26T05-20-11.402Z-14600/artifacts/harvest-sync-verification.json) est acquis en **155,378 s** : deux phases de 45 s, 22 changements chacune, maxima 33,8 / 37,6 ms sous la borne inchangée de 100 ms, sans starvation, saut, traversée solide ni erreur. Les derniers raccords de validation et de fret ne modifient ni les poses, ni l’horloge, ni les phases de travail de ce parcours.

La [mesure ciblée finale](../../tmp/novel-v482/cost-current-2026-10-26T06-04-08.713Z-8040/analysis.md) passe en **9,789 s**. JavaScript Node observe en moyenne **0,225 ms par sélection de livre**, avec 100 choix réellement admissibles et 100 recherches ; **0,0102 ms par pas actif** sur un noyau de 300 pas ; **0,208 / 0,0862 ms par appel** des gardes checkpoint / delta sur 500 acceptations chacune. Les entrées, paquets, neuf RAW et empreintes sont vérifiés ; livre entier, propriétaire, PV, RNG et IDs restent exacts.

Ces durées murales incluent GC et préemption. Le choix commence après le tirage de l’activité Lecture ; le noyau n’exécute pas une simulation clinique complète ; les gardes mesurées ne sont pas l’assemblage et l’adoption complets. Les moyennes de lots ne sont pas des percentiles individuels. Le banc Node ne se compare pas causalement au précédent Chrome V481 et ne fournit ni FPS, ni coût GPU, ni CPU système, ni garantie globale de performance. Les neuf primitives du livre et sa déformation utilisent le cargo et les attributs existants, sans nouvelle création de mesh ou texture par image ; cette lecture du code n’est pas une mesure GPU.

Le lot est prêt à être enregistré et poussé, sans déploiement. Le [réarbitrage après V482](../development/audit-core-20261022.md#réévaluation-après-v482) prépare une autre base ordinaire ; il n’enchaîne pas automatiquement d’autres livres.
## Reprise de continuité anti-incendie — 26 octobre

Après l’enregistrement de V482, la préparation du lot suivant a révélé un oubli dans `thing-damage.ts` : le garde des dégâts de diffuseur admettait les schémas290…294, tandis que le reste du système admettait déjà295. Les dégâts de feu ne déclenchaient plus la mèche et un coup mortel ne produisait plus la vague de mousse dans une partie actuelle. Deux cas historiques existants ont reproduit le défaut avant correction (`v483-firefoam-continuity-before-2026-10-26T08-04-59.482Z-8144`,17,622s,2échecs/14nonexécutés).

Le garde admet désormais explicitement295, sans ouvrir une version future. L’oracle exige aussi une vraie mèche après le premier dégât de feu. Les16cas du fichier `tests/firefoam-runtime-v469.test.ts` passent en27,265s (`v482-firefoam-continuity-fixed-2026-10-26T08-08-47.042Z-16484`). Typage18,900s et build6,115s acquis séparément. Cette correction de continuité ne constitue ni un gain de performance ni une qualification globale supplémentaire de V482. Aucun déploiement.
