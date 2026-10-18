# Réactivité des intentions confirmées — V426

18 octobre 2026. **Lot qualifié par reprise du pilote, prêt pour publication.** Suite de [V425](simulation-presentation-v425.md). Le retour humain concerne la réactivité générale : chemin d’un colon mobilisé, construction et zones apparaissent tard, en plus des ralentissements de caméra. Le schéma 263 reste inchangé. Aucune nouvelle mécanique ni cible de200images/s atteinte n’est annoncée.

## Résultat de la comparaison native

| Action×1 | Entrée→intention, avant→après | Après admission→intention, avant→après |
|---|---:|---:|
| Chemin mobilisé |323,2→73,3ms|269,8→9,2ms|
| Plan de mur |411,5→75,1ms|339,0→19,1ms|
| Zone de culture |360,6→128,9ms|281,0→23,3ms|

La séparation retire l’attente du tick visuel sur ces intentions confirmées. **Le départ physique n’est pas amélioré :482,3→571,1ms** dans ces deux occurrences. Les horloges et les règles de mouvement sont inchangées ; les gestes tombent à des phases de tick différentes. Ce relevé ne permet pas d’attribuer toute la variation au code, mais il interdit d’annoncer le déplacement immédiat du colon.

En pause, chemin102,4→96,0ms, mur63,8→73,9ms et culture138,3→145,1ms : aucun gain général établi. La mobilisation HUD passe100,3→100,9ms en pause et65,0→84,5ms au démarrage×1, encore sans dette établie dans le témoin. Les coûts de simulation, d’encodage et d’admission restent à réduire. Aucun nouveau relevé FPS ni gain de caméra n’est revendiqué pourV426.

## Diagnostic commun mesuré

Une session Chrome155 native, WebGPU AMD RDNA1,2560×1440/DPR1 réutilise le vrai départ trois colons250² au tick35. La page personnelle de l’utilisateur reste en pause. Les trois colons sont mobilisés par les boutons et la touche R pour éviter que le travail autonome ne consomme les plans mesurés. Le pilote effectue ensuite de vrais clics et relâchements pour un déplacement, un mur et une zone de culture de six cases, en pause puis à×1. Le deuxième mode utilise d’autres cellules naturellement valides. Le départ contient aussi56animaux,28371ressources,1630piles et162structures : ce n’est pas une scène vide.

La mesure part du dernier événement réel déclenchant la commande, avant son envoi. Les identifiants de requête et de publication relient réception Worker, application, encodage, admission MAIN et rendu. L’apparition est observée dans les buffers graphiques résidents du chemin, des plans et des surfaces de culture ; le départ physique utilise les poses du rendu. Ce n’est pas une mesure de photons à l’écran ni de durée GPU.

| Action×1 | Entrée→intention visible | Après admission MAIN→intention | Entrée→début du mouvement |
|---|---:|---:|---:|
| Déplacement mobilisé |323,2ms|269,8ms|482,3ms|
| Plan de mur |411,5ms|339,0ms|—|
| Zone de culture |360,6ms|281,0ms|—|

Les trois retards dominants surviennent après admission de l’état confirmé. La scène attend que l’horloge des acteurs franchisse le tick de la publication avant d’y inclure aussi les intentions. La réserve de deux ticks représente environ333ms à×1. Modifier seulement le calcul de chemin ne supprimerait donc pas ce retard commun.

En pause, les mêmes familles d’actions prennent102,4ms,63,8ms et138,3ms. Les coûts avant admission restent réels : dans les exemples×1, application Worker15,1/1,8/28,9ms, encodage14,9/13,1/21,9ms et Decoder13,9/13,0/14,6ms. Le mur attend également26,2ms avant réception Worker. Publication→MAIN inclut copie, transport et attente de tâche ; ce poste n’est pas présenté comme de l’IPC pur.

## Correction intégrée et limites

La correction sépare les intentions déjà admises — plans, désignations, zones et chemin sélectionné — de l’état physique présenté. Elle réutilise les lots graphiques résidents et leur cadence d’image. Elle n’avance ni les acteurs, ni le terrain ou la progression des travaux ; elle n’affiche pas les ordres refusés. Commandes, PRNG, schéma et sauvegardes restent inchangés.

Le lecteur privé du MAIN capture les intentions avant l’attente du tick et mémorise leur signature pour la file physique, sans second parcours. Les tableaux immuables des domaines inchangés sont réutilisés. Les lecteurs publics gardent leur comportement littéral ; aucun drapeau de paquet ou simple identité de World ne donne accès à cette admission privée.

Les trois lots résidents de jobs conservent plans et croix confirmés, avec cadres, progrès et couleur active issus du World exécuté. Zones, toiture demandée, permissions, foyer et déneigement utilisent les dernières cellules confirmées et les hauteurs/visibilité du terrain exécuté. Les pictogrammes gardent leurs supports physiques ; les demandes de transport de blocs restent sur leur chemin historique. Une empreinte de construction encore cachée n’est pas dessinée partiellement. Le chemin sélectionné conserve les slots et poses du rendu des acteurs. Aucun matériau ni propriétaire de buffer nouveau n’est ajouté.

Les invalidations sont séparées : changer une route seule ne reconstruit ni plans, ni zones, ni toiture, ni teinte du sol. Annulation, remplacement et retrait de la dernière zone de permission ne peuvent pas être écrasés par l’application ultérieure d’un ancien World. Le repli conservateur remplace tous les domaines lorsqu’une capture complète n’est pas possible. La capture parcourt encore les routes de tous les acteurs mobiles à chaque admission ; ce coût résiduel est explicite.

Le chemin récent doit conserver une origine compatible avec la pose effectivement présentée. Si le colon a déjà changé d’arête, un raccord arbitraire couperait potentiellement un mur ou un virage : ce cas conserve le parcours physique confirmé en attendant son rattrapage. La réserve de mouvement et le coût d’admission ne sont pas supprimés par cette tranche. Les performances de rotation déjà mesurées enV425 ne sont pas réattribuées à ce changement.

## Contrôles acquis avant intégration

- Référence native : `v426-interaction-baseline-native-2026-10-18T18-38-28.847Z-17468`, PASS70,233s. Huit commandes corrélées, preuve complète sans erreur, export entier au tick53 identique à l’état navigateur canonique : SHA256 `bc14777a79bd26c2dafa872b7768b42bf3d05c4c82facb17b6825f75157689d8`. Reçus sous `tmp/interaction-latency-v426/native-baseline01/`.
- Microbanc Node du chemin de commande : `v426-command-cost-native-node-reprise-2026-10-18T18-36-50.663Z-32572`, PASS62,030s. Trois reprises fraîches pour déplacement mobilisé, mur, stockage et culture ; douze commandes plus trois mobilisations acceptées, campagnes finales entières identiques entre répétitions d’une même variante. Médianes application20,822/9,877/24,410/24,437ms et encodage17,464/16,070/17,004/18,084ms. Ce banc n’inclut ni file Worker réelle, ni MAIN, ni rendu, ni FPS.
- Première tentative de ce microbanc via Vite SSR interrompue sans résultat : `v426-command-cost-baseline-2026-10-18T18-34-09.732Z-11668`. Elle ne constitue pas un passage acquis. Le remplacement utilise les imports TypeScript Node existants ; aucune cause de blocage SSR n’est affirmée.

## Contrôles du lot intégré

- Revue indépendante des dix fichiers : aucun blocage résiduel après correction du brouillard exécuté, de la suppression des permissions et du repli de capture. Aucun contrôle exécuté par les agents.
- Typage initial : PASS17,815s, `v426-confirmed-intents-typecheck-2026-10-18T18-52-50.915Z-27292`.
- Suite ciblée : **42cas/dixfichiers**, PASS35,504s, `v426-confirmed-intents-targeted-reprise-2026-10-18T18-54-25.548Z-26864`. Inclut16nouveaux cas, file historique, routes, surfaces et latence de présentation. Le premier lancement via `npx` a échoué ENOENT avant tout test ; reprise par l’exécutable Node installé, mêmes cibles.
- Build Pages avec typage des tests : PASS17,252s, `v426-confirmed-intents-build-pages-2026-10-18T18-55-10.790Z-1904`. Instrumentation privée absente de ce build.
- Candidate native : PASS66,298s, `v426-interaction-candidate-native-2026-10-18T18-55-39.913Z-29052`. Même import, plan et commandes réelles que la référence, huit témoins corrélés ; export final entier au tick57 identique à l’état canonique du navigateur, SHA256 `0750923ba5cc42b81bea6a348fe7b7a528677427b2e8e6114a3d8474968f03e4`. Les états finaux53et57 ne sont pas comparés entre eux : leurs histoires en temps réel diffèrent. Sources servies gelées,1733fichiers vérifiés avant/après ; reçus `tmp/interaction-latency-v426/native-candidate02/`, comparaison `baseline01-candidate02.json/.md`.
- Premier `test:presentation` : échec38,953s avant observation, zéro phase ; adresse fournie sans `e2e`, alors que `src/main.ts` expose le témoin seulement avec ce paramètre. Correction de l’adresse du pilote uniquement, critères inchangés.
- Reprise `npm run test:presentation` : **PASS157,490s**, `v426-confirmed-intents-presentation-reprise-2026-10-18T18-59-00.075Z-31280`. Minage puis abattage45s chacun, alternances×6/×1/×3, même oracle de contacts et déplacements : aucun saut brut, saut de transition, excès de trajet continu ou occupation du rocher détecté. Les compteurs de premières arêtes futures ne sont pas assimilés à des pauses visibles. Sources1733 toujours exactes après contrôle. Pas de nouvelle campagne longue ni de suite complète.

Ces observations sont une occurrence native par action, avec histoires de simulation réelles et charge hôte non entièrement neutralisée. Elles ne sont pas une distribution de latence ni une garantie de confort général. Le mouvement physique, les coûts de publication/admission, les longues images pendant la caméra et l’objectif200images/s restent ouverts.
