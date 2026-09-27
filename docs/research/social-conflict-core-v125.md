# Paroles blessantes et bagarres sociales — relevé Core 1.6.4871 pour V125

Relevé du **27 septembre 2026** sur l'installation locale `E:/Steam/steamapps/common/RimWorld`, `Version.txt = 1.6.4871 rev590`, jeu de base seul. Les définitions de `Data/Core/Defs` et les classes ciblées de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll` ont été lues en lecture seule avec ILSpyCmd 8.2. L'assembly est celui de la [référence Core](core-reference-baseline.md), SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les faits ci-dessous reformulent des règles observées, sans publier de code ni de définitions propriétaires. Ils ne prouvent ni la fréquence vécue dans une colonie ni une parité de Lisière.

L'[annonce officielle des relations et bagarres](https://ludeon.com/blog/2016/04/alpha-13-released/) confirme le principe du système ; ses valeurs datent de 2016. Les paramètres précis ci-dessous proviennent de l'installation Core 1.6.4871.

Le [relevé V124](social-core-v124.md) situait déjà les loisirs sociaux et signalait les paroles blessantes comme lot suivant. Il faut corriger une nuance : dans Core, **l'humeur −5 de l'insulte n'hérite pas de l'impact social de son auteur**. Seule la mémoire d'opinion `Insulted` reçoit ce facteur ; la pensée d'humeur `InsultedMood` est créée séparément par `thoughtToMake`.

## Tirage d'une parole blessante

Sources : `InteractionDefs/Interactions_Social.xml`, `ThoughtDefs/Thoughts_Memory_Social.xml`, classes `InteractionWorker_Slight`, `InteractionWorker_Insult`, `NegativeInteractionUtility`, `Pawn_InteractionsTracker` et `SocialInteractionUtility`.

| Échange | Poids de base lors du choix pondéré | Effet sur la cible | Chance de base de bagarre |
|---|---:|---|---:|
| `Slight` (vexation) | 0,02 | opinion −5 × impact social de l'auteur | 0,005 |
| `Insult` | 0,007 | opinion −15 × impact social de l'auteur ; humeur −5 indépendante de cet impact | 0,04 |

Les deux poids sont multipliés par le **même facteur de négativité**. Celui-ci vaut zéro pour un initiateur ayant le trait `Kind` ; sinon il multiplie une courbe de **l'opinion de l'initiateur envers la cible** par une courbe de compatibilité, puis par 2,3 avec le trait `Abrasive`. Les points de la première courbe, `(opinion : facteur)`, sont `−100:6`, `−50:4`, `−25:2`, `0:1`, `50:0,1`, `100:0`. Ceux de la seconde sont `−2,5:4`, `−1,5:3`, `−0,5:2`, `0,5:1`, `1:0,75`, `2:0,5`, `3:0,4`, avec interpolation entre points. Un esclave n'initie ni `Slight` ni `Insult` vers un non-esclave. Les six traits actuellement présents dans Lisière n'incluent ni `Kind` ni `Abrasive` : leur facteur neutre de 1 n'autorise pas à annoncer leur comportement comme livré.

Le tracker Core cherche un partenaire admissible de sa propre faction, mélange les candidats, exclut l'hostilité et choisit **parmi tous les `InteractionDef` admissibles** selon les poids de leurs workers. `Chitchat` pèse 1 ; `DeepTalk` pèse 0,075 multiplié par sa courbe de compatibilité. Les nombres 0,02 et 0,007 ne sont donc ni une probabilité par tick ni une proportion garantie des conversations. Le rythme normal de tentative est un MTB de 6 600 ticks Core, accéléré à 550 pendant le rassemblement effectif V124, avec contrôle par lots et minimum entre échanges. Distance, vue, parole, éveil et états de travail/mentaux restent soumis au filtre commun ; `Slight` et `Insult` ne forcent pas une poursuite ou l'interruption d'une tâche pour atteindre quelqu'un. Leurs `InteractionDef` n'accordent **aucun XP Social** à l'un ou l'autre interlocuteur.

La cible reçoit un souvenir dirigé de **20 jours Core**, plafonné à **10 par auteur et 300 par catégorie**, avec multiplicateur de pile **0,9**. `Slighted` n'a pas de pensée d'humeur. `Insulted` déclenche une pensée d'humeur distincte de **−5 pendant 2 jours**, au plus **10 piles globales** avec multiplicateur 0,9. Le souvenir d'opinion est ajusté par l'impact social de l'auteur dans `Pawn_InteractionsTracker.AddInteractionThought`, tandis que `MemoryThoughtHandler.TryGainMemory` crée la pensée d'humeur neuve avec sa valeur propre. Ainsi, calculer l'humeur comme un tiers de l'opinion −15 déjà ajustée par l'impact serait incorrect. Ces jours valent 60 000 ticks Core ; Lisière conserve son échelle de 6 000 ticks locaux par jour.

## Décision de bagarre

Sources : classes `Pawn_InteractionsTracker`, `SocialInteractionUtility`, `NegativeInteractionUtility`, `InteractionDef` ; `InteractionDefs/Interactions_Social.xml`. Le tracker ajoute d'abord le souvenir `Slighted` ou `Insulted` à la cible, **puis** la cible décide si elle commence la bagarre contre l'auteur. Son opinion utilisée pour cette décision inclut donc la vexation ou l'insulte qui vient de se produire. La décision ne se fait pas depuis l'opinion de l'auteur, qui régissait le poids de la parole.

Core n'essaie pas de bagarre si les états mentaux aléatoires sont désactivés, pendant le tutoriel, ou si la cible n'a pas de besoin d'humeur. La possibilité physique exige deux êtres humains capables d'un verbe de mêlée utilisable, aucun à terre, et la capacité de violence de la **cible**. Un prisonnier cible ne s'en prend pas à un non-prisonnier ; même restriction esclave/non-esclave pour la cible. Les règles d'âge du Core excluent notamment les bébés et certaines paires enfant/adulte ; Lisière ne possède pas encore ce modèle d'âge humain. Les facteurs génétiques relèvent des extensions et ne sont pas revendiqués pour ce relevé Core seul.

La chance, bornée entre 0 et 1, part du `socialFightBaseChance` de l'échange et multiplie :

- la **manipulation** puis le **déplacement** de la cible, chacun par une rampe de 0 à 1 entre capacité 0,3 et 1 ;
- les facteurs des états de santé de la cible ;
- l'opinion **de la cible envers l'auteur** : facteur 4 à −100, 1 à 0, puis 0,6 à +100 ;
- les facteurs des traits de la cible (par exemple `Bloodlust` ×4), puis une réduction liée à l'écart d'âge après dix ans, jusqu'à ×0,25 à cinquante ans ;
- ×0,5 si la cible est esclave, ainsi que les éventuels facteurs génétiques quand leur système est actif.

Les chances 0,005 et 0,04 ne sont donc pas des taux finaux. À capacités normales, opinion initiale 0, impact de l'auteur 1 et sans autre facteur, le souvenir fraîchement ajouté rend illustrativement la chance **0,00575** après `Slight` et **0,058** après `Insult` ; une opinion préalable, une autre valeur d'impact ou un facteur physique change ce résultat. Il faut faire le tirage **après** l'écriture du souvenir, avec un flux aléatoire persisté et un ordre de décision stable à la reprise.

## Combat, fin et conséquences

Sources : `JobDefs/Jobs_Misc.xml` (`SocialFight`), `MentalStateDefs/MentalStates_Special.xml` (`SocialFighting`), `ThoughtDefs/Thoughts_Memory_Social.xml`, classes `MentalState_SocialFighting`, `JobGiver_SocialFighting`, `JobDriver_AttackMelee`, `SocialInteractionUtility` et `MentalState`.

Le déclenchement demande un état `SocialFighting` **réciproque**, chacun enregistrant l'autre comme adversaire. Le donneur de tâche attaque physiquement l'adversaire au contact, un coup par tâche, puis peut en donner d'autres tant que l'état se maintient. Un coup suit le système ordinaire de mêlée et peut blesser, mettre à terre ou tuer. Core choisit parmi **tous les verbes de mêlée utilisables**, y compris ceux d'une arme équipée, avec un poids lié aux dégâts ajustés et au `chanceFactor` de l'outil. Le drapeau de tâche `neverShowWeapon=true` affecte la présentation : il n'interdit pas les coups d'arme. Une implémentation limitée aux poings doit être décrite comme adaptation de Lisière, sans l'attribuer au Core.

L'état ordinaire ne peut se résoudre par son tirage de durée avant **420 ticks Core** ; passé ce seuil, il teste une récupération avec MTB **0,02 jour Core** à intervalles de 30 ticks. Il peut s'arrêter plus tôt si l'autre disparaît, meurt, tombe ou ne combat plus réciproquement. La fin arrête la tâche de combat et clôt l'état de l'autre combattant encore engagé. La bagarre ne se résout pas par un nombre fixe de coups ou par une simple notification.

À la fin, **chaque combattant vivant dont l'adversaire vit encore et qui possède un besoin d'humeur** tire indépendamment à 50/50 un souvenir dirigé : `HadCatharticFight` **+38** ou `HadAngeringFight` **−22** d'opinion. Être à terre n'est pas exclu par cette condition si le combattant reste vivant. Ces deux souvenirs durent 20 jours Core, ont chacun une limite de 5 par adversaire et 300 au total, avec piles ×0,9. Ils sont ajoutés directement, **sans facteur d'impact social**. Les blessures sont des conséquences physiques supplémentaires ; il serait trompeur de livrer une « bagarre » faite seulement d'un journal et de ces souvenirs.

## Traduction bornée pour Lisière

`src/sim/social.ts` et `social-state.ts` ont déjà un flux PRNG social par personne, des souvenirs dirigés, l'impact, la compatibilité et la cadence accélérée du rassemblement V124. `src/sim/melee.ts`, `melee-statistics.ts`, `health.ts` et les tâches médicales gèrent un combat physique mais leur propriété actuelle est liée aux ordres mobilisés ou à l'hostilité ; une bagarre entre deux colons alliés réclame une voie explicite, persistée et réciproque qui réutilise dégâts, trajets, interruptions et soins sans fabriquer un ennemi de faction. Les tirs automatiques et ordres ordinaires ne doivent pas adopter cette cible alliée par accident. Le rendu peut lire les acteurs et poses résidents existants ; aucun acteur ou maillage propre à la rencontre n'est requis.

Pour V125, conserver le choix parmi les échanges réellement disponibles, l'opinion d'auteur pour la sélection et l'opinion **mise à jour de la cible** pour la bagarre. Séparer le souvenir d'humeur `InsultedMood` du souvenir d'opinion, vérifier les deux sens de l'état de combat et supprimer immédiatement les réservations/tâches incompatibles. Une sauvegarde V124 doit être validée strictement avant une migration V125 neutre : aucune ancienne insulte, humeur, blessure ni bagarre inventée. Valider les adversaires réciproques, les durées et les horodatages, puis comparer sauvegarde et PRNG après reprise, y compris une bagarre en trajet, après un coup et à sa fin. Les traits `Kind`, `Abrasive`, `Bloodlust`, les âges humains et la voie de crise `InsultingSpree` restent à traiter explicitement si absents ; leurs effets Core ne doivent pas être attribués à une implémentation neutre. La fréquence, les coûts CPU et les limites de parité doivent être consignés dans la preuve V125, sans extrapoler un objectif général de FPS ou de débit.
