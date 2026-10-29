# Réveil des mécanoïdes du temple : frontière physique

Le correctif transmet au réveil la frontière réellement jouée, au lieu de l'arrondir au dernier tick civil. Il conserve le déclencheur existant : un mécanoïde de temple endormi, vivant et devenu visible après une véritable révélation. Il ne change ni la découverte, ni les membres du groupe réveillé, ni son assaut, ni l'événement enregistré.

En schéma297, le temps courant est `tick * 10 + phaseCore297`. Le receveur `wakeTempleMechGroup256` exige déjà que sa date soit exactement `effectiveCore297(world)`. Son appelant `wakeUnfoggedTempleMechs256` lui envoyait pourtant toujours `tick * 10`. Aux phases1–9, cet appel devenait donc contradictoire et levait `Invalid actual Temple mechanical wake`. Par exemple, après sept vrais Core, l'appelant transmettait encore la frontière0 au lieu de7. Une révélation produite par la destruction réelle d'un mur pouvait rencontrer ce défaut après ses premières écritures.

Une seule expression de l'appelant est remplacée : pour297, elle lit `effectiveCore297(world)` ; pour les schémas historiques, elle garde littéralement `world.tick * 10`. La lecture physique est placée au moment du vrai réveil, après les conditions existantes. Aucun appel supplémentaire à cette primitive n'est ajouté pour une collection sans dormeurs, un dormeur encore sous le fog ou un mort. Le garde du receveur et la boucle ne sont pas élargis. Le cas phase0 conserve sa date antérieure.

Ce raccord ferme une incohérence interne avec la frontière physique introduite dans les déplacements. Il ne constitue pas une nouvelle règle de déclenchement inspirée de RimWorld, ni une affirmation d'identité exhaustive avec son jeu. Les faits natifs déjà acquis sur le déclencheur ne sont pas réinterprétés.

## Vérifications acquises et limites

Root a reproduit deux nouveaux cas rouges avec l'exception exacte avant le correctif. L'un passe par `damageStructure` sur un vrai mur après sept Core réellement joués ; aucune conversion d'un ancien World en297 ni phase injectée n'est utilisée pour fabriquer ce constat. Les trois contrats ciblés passent ensuite avec la seule expression candidate79eeed48, en12,400s. Ces préparations diagnostiques partielles ne sont pas revendiquées comme sauvegardes Whole, campagnes ou preuves Native.

Sur dix-huit voisins exécutés, quatorze passent et quatre échouent dans leurs préparateurs anciens. Les quatre mêmes cas ont été reproduits sur la source avant correctif ; Les noms et les premiers messages des quatre refus sont strictement identiques avant/après, comparaison enregistrée. Ils restent des échecs conservés, sans promotion de cette sélection en suite globale verte.

Aucun benchmark FPS/GPU ou de coût CPU identique n'est fourni. La modification n'ajoute aucun mécanisme par frame, timer ou pas de simulation ; elle effectue la lecture bornée au seul réveil effectif. Cette portée ne prouve pas un coût global nul.

La priorité reste l'avancement des six ensembles. Le futur port privé298 devra reprendre le prédicat physique fermé297|298 de sa propre source ; il ne doit pas copier aveuglément le seul test `===297` du produit. Source10 et les lots physiques privés restent inchangés par ce correctif produit.

Les deux fichiers produit ont été intégrés avec leurs octets qualifiés ; les2077 autres sources restent exactes. Typage produit complet PASS14,431s ; compilation Pages PASS4,252s, sortie surC. Avertissements de taille de chunks/import dynamique et de dossier de sortie externe conservés. Au total17 cas ciblés distincts passent, quatre anciens refus restent reproduits à l'identique ; aucune suite globale verte n'est affirmée. Les sauvegardes QA d474/Core98409 et humaines94de/T3328 n'ont pas été chargées ni modifiées.

Les reçus sont conservés sous Cvisualizations/victory-resume-v493/temple-fine-wake-root-v2 : source-fence, red/green, neighbors, baseline-neighbors, old-neighbor-comparison, installation, types-control et pages-control. Premier essai de géométrie et refus de création de jonction conservés séparément ; aucune validation rétroactive. Enregistrement Git du lot autorisé après contrôle documentaire. Aucun déploiement Cloudflare ; dernière production attestéeV491, dette PERF-V492-X6 et Home2089ms inchangées.
