# Conserver le débit confirmé pendant le démarrage

31 octobre — correctif intégré et qualifié ; la priorité de fluidité générale reste ouverte. Source [MotionTimeline](../../src/render/MotionTimeline.ts), schéma 297 : préimage `62ad650d`, candidat `42054a08`, cinq spans. Ce lot concerne uniquement la présentation du temps confirmé ; le moteur, les trajectoires, la vitesse physique, les commandes et les ACK ne changent pas.

La Timeline pouvait mesurer un sous-débit réel pendant le remplissage initial, puis effacer cette mesure au moment où sa réserve devenait prête. Elle repartait alors au débit nominal demandé, consommait son avance trop vite et pouvait atteindre la dernière frontière disponible. La trace produit conserve dix positions immobiles après 200 ms à ×6, dans un groupe sans nouvelle frontière disponible dans MAIN ; cela ne prouve ni un problème GPU ni une cause CPU particulière. Voir [le diagnostic de livraison](delivery-frontier297.md) et [la mémoire du débit confirmé](confirmed-supply-memory297.md).

Le correctif ancre l'estimation au **premier vrai progrès** reçu après un reset, un changement de propriétaire ou de vitesse. L'attente avant ce premier Core, sa quantification et les doublons ne constituent donc pas un faux débit lent. Les réceptions suivantes mesurent le débit entre progrès confirmés. Au remplissage, une cadence compatible avec le nominal conserve le reset historique ; un sous-débit effectivement mesuré est gardé. Le démarrage est terminé dans les deux branches, sans ignorer le premier progrès suivant. Aucun seuil, tampon, branche de pause ou algorithme de calcul d'itinéraire n'est modifié ; aucune donnée future n'est prédite.

La première proposition privée conservait trop largement l'attente froide : **39 PASS / 3 FAIL**, notamment sur les cadences régulières ×3/×6 et le début nominal d'une récupération. Source, rapports et attentes de cette V1 adverse sont conservés ; elle n'a pas été installée. La V2 garde le contrat capturé de 538 appels inchangé et ses mêmes voisins : **43 PASS / 0 FAIL**, soit un contrat de trace et 42 finalités voisines. Ce résultat ne représente pas une suite globale verte.

Le replay numérique témoin reproduit exactement les ticks enregistrés et leurs 25 arrêts, dont 10 après 200 ms. Le candidat donne 11 arrêts au total et **aucun après 200 ms** dans cette trace ; les pauses restent exactes. Ce sont des états de Timeline rejoués, pas de nouvelles images ou observations géométriques : les 25 arrêts du Native produit restent dans la preuve historique. La fluidité du candidat doit encore être observée dans le vrai rendu.

Le coût scalaire borne seulement ce petit chemin : 322800 appels par bras W/C/W, sans World ni moteur.

| Mesure | Témoin1 | Candidat | Témoin2 |
|---|---:|---:|---:|
| Temps écoulé total | 21,0053 ms | 18,5597 ms | 11,6524 ms |
| CPU processus, granularité grossière | 77 ms | 0 ms | 16 ms |

La dérive des témoins/JIT est forte ; le candidat se situe entre leurs temps écoulés. Le compteur CPU à zéro ne signifie pas un coût nul. Ces nombres ne prouvent ni gain stable, ni absence de régression globale, ni FPS, latence de commande ou amélioration du débit moteur. Le trou source de 91,6 ms et la dette PERF-V492-X6 ne sont pas clos par cette modification.

Les preuves privées sont `startup-confirmed-supply-author-v2`, `startup-confirmed-supply-v2-qualification-root-v1/report.json` et `startup-supply-scalar-cost-root-v3/run/report.json`, sous le checkpoint courant. Aucun Core réel n'a été joué par ces contrôles numériques. Le parent de la nouvelle observation est `0a9933b3` / Core118680 ; la nouvelle autorité et ses limites sont décrites ci-dessous. Les anciens entiers restent des références historiques, jamais des parents de continuation automatique. Le contrôle intégré confirme 43 PASS / 0 FAIL en 30,375 s, le typage passe en 17,416 s et le build Pages CODE en 4,138 s ; les assets publics sont résolus sans être dupliqués.

## Observation réelle du produit corrigé

Une continuation exclusive depuis 0a993 a observé les mêmes trois humains à ×1, ×3 puis ×6 : Noé marche sur trois vrais ordres, Sacha travaille, Ada dort. Ce contrôle instrumenté qualifie les états géométriques soumis, les pauses de 300 ms et les recharges exactes ; il ne mesure pas la fin GPU, les FPS globaux ni les animaux.

| Vitesse | Images soumises | Positions répétées avec marche, après 200 ms | Plus grand intervalle entre soumissions |
|---|---:|---:|---:|
| ×1 | 587 | 0 | 44.3 ms |
| ×3 | 479 | 0 | 50.7 ms |
| ×6 | 451 | 0 | 68.9 ms |

Les échantillons froids et défavorables restent conservés : ×1 : 0 positions répétées avec marche au total ; ×3 : 12 positions répétées avec marche au total ; ×6 : 16 positions répétées avec marche au total. Ada conserve Y = 0,5 et aucun drapeau de marche dans les trois fenêtres. Les longues périodes entre soumissions restent un problème distinct ; l’absence de positions répétées ne prouve pas une cadence d’image régulière. Aucun gain causal ne se déduit de deux essais successifs sans charge identique contrôlée.

ACTUAL à la fin de cet essai (historique) : **5ca1ed3167c84d0da1154ec07be7a8461a63021bfe1b0cb386921e5799659a5b**, gzip **4adc9fea907ffdaddfa307c39b9f26dfea5da56ecff416b20fd5a7b0dafaa05f**, Core120270 / RNG3509307909 / nextId30333, propre recharge exacte. Le rapport `input` atteste le parent 0a993 ; le champ auxiliaire `final.parentRawSHA256` hérité du harnais répète l’empreinte finale et ne constitue pas une preuve de filiation. Aucun retour à 0a993 ni rejeu de latch. Campagnes humaines et d474 intactes.

Preuves privées sous le checkpoint courant : `startup-supply-integration-root-v1/qualified-component.json`, `startup-supply-integrated-validation-root-v1/report.json`, `final-startup-c2-native-author-v1/native-final-startup-c2-v1/report.json` (SHA 79a4b561b6ebd8b2c41f5636a3dbd543c2a0eedba86928683a53d0acd0ce9c01) et son `three-speed-submission-analysis.json` (SHA b4777aaa609001ce936922b09ae357983cd096ca9e457f9e85b35ea574a71c2a). La carte produit compte 2080 sources, SHA8007a08c, schéma297. Aucun déploiement Cloudflare ; dernière publication attestée V491. Les six ensembles et la victoire restent suspendus.

## Contrôle animal non concluant (historique)

Un essai suivant du même produit a conservé 590 soumissions à ×1 et 456 à ×3, mais **aucun animal n’a été acquis** parmi les vrais animaux marchants et visibles dans le cadrage initial. À la préparation ×6, Sacha avait naturellement terminé son travail et quitté le poste : la garde de rôle humain du contrôleur a interrompu l’essai. Son statut FAILED_PRESERVE_ACTUAL reste inchangé. Ce résultat ne démontre ni défaut du jeu ni fluidité des animaux ; la fenêtre ×6 est absente. Le contrôle doit être séparé des rôles humains et cadrer les animaux par les actions UI ordinaires avant un autre essai.

Le lecteur hors ligne conserve les 2 092 lignes de suffixes sans animal, ainsi que toutes les paires, et conclut NOT_ACQUIRED à ×1/×3 et ABSENT à ×6. Aucune qualification animale n’est promue depuis des valeurs manquantes. La géométrie animale en pause n’était pas instrumentée séparément et reste inconnue.

**Autorité historique de cet essai :** RAW a5b3d318bdab82d6f1592323688eaf3c4150e40cc04db63b50fcbf0f6c1b318e, gzip c7e14eba4fe1c77a6f9b9ef08ac97876b49b062e1ba3bfd58d4729d81dac1dcd, Core121130 / RNG3618896615 / nextId30350, propre recharge exacte. Elle remplace 5ca1, sans retour à un ancien état et sans rejeu du latch. Aucun état n’a été forcé pour conserver les rôles. Sources et campagnes humaines intactes. Rapport privé : final-passive-animals-native-author-v1/native-final-passive-animals-v1/report.json (SHA f65c805b728e4fd0a381167425db4019e16859facb3f494e005cc24cc2ced64b) ; diagnostic : passive-animals-offline-author-v1/result/analysis.json (SHA bdd2d0beb0bea23e9dc373a17f3a671c70dd08ef588d7f7df7dd4b95e71935bc).

## Blocage restant et piste rejetée

La jointure du Native C2 trouve 84 en-têtes uniques, aucun ambigu ou manquant. Les 12 longs intervalles pendant la marche à ×6 recouvrent une union de **340,6 ms** de traitements Full MAIN, dont **317,5 ms avant Timeline**. Ces durées sont imbriquées et ne doivent pas être additionnées. À ×1 et ×3, cette instrumentation n’était pas armée : aucune attribution n’est inventée. Le maximum global de 68,9 ms à ×6 se produit après l’arrivée, pendant idle ; le maximum en marche est 40,1 ms. Preuve : startup-c2-moving-interval-delivery-author-v1/result/analysis.json (SHA58207199).

Le format privé transmettant un World matérialisé complet est écarté, sans récepteur MAIN ni modification produit. Le contrôle V3 reste FAILED sur son budget de 180 s : premier témoin complet de 30 appels, seulement neuf appels candidat mesurés, second témoin absent. Les 39 préparations reproduisent exactement les valeurs canoniques du V2. Sur ces neuf mêmes images, les deux copies candidat prennent 230,8–304,4 ms contre 5,79–6,03 ms pour le premier témoin ; la charge passe d’environ 0,744 à 7,178 Mo. Ces observations partielles suffisent à refuser cette intégration ; elles ne deviennent pas un W/C/W complet ni une mesure navigateur/FPS. Les sorties défavorables et les échecs sont conservés. Aucune variante de ce format n’est relancée.

La suite doit isoler le coût à l’intérieur des contrôles World déjà mesurés, puis traiter une cause démontrée. Répéter les mêmes gros chronomètres, profils ou essais sans nouvel élément n’est pas une optimisation. Le produit reste au correctif de code 345560ed, carte8007a08c ; la fluidité générale et les dettes de performance restent ouvertes.


## Coût World localisé dans la voie Native réelle

Deux observations nouvelles utilisent le vrai récepteur Native du produit, sans remplacer NativeCloneAssembler, sans rôle humain imposé et sans modifier les règles, la vitesse physique ou les sources produit. Chaque fenêtre dure quatre secondes à ×6. Elles mesurent des parties de validation et ne qualifient ni géométrie animale, ni FPS, ni fluidité générale. Les sources instrumentées le sont en mémoire dans un serveur privé ; aucun observateur n’est installé dans le produit.

La première observation décompose les quinze conditions du groupe World de RPA : 47 appels par condition, tous en contexte ×6/delta. Le membre dynamique `guards.world` prend 466,9 ms au total, soit 9,934 ms par appel et 12,6 ms au maximum. Les autres conditions les plus coûteuses prennent individuellement 31,6–55,0 ms au total. Cela établit un coût dans la vraie voie Native, contrairement au diagnostic Node précédent où le membre virtuel par défaut était `false`. La source Native reste 0a8eef2b et RPA reste 800bccba. Preuve privée : `native-world-members-cost-root-v1/root-qualification.json`, rapport Native SHA4e4c88d1.

La seconde observation subdivise seulement ce membre World. Elle conserve 43 appels par partie exécutée, tous avec le lecteur Native ; une seule carte est rencontrée et le propriétaire racine est identique à l’entrée.

| Partie | Total pour 43 appels | Moyenne | Maximum |
|---|---:|---:|---:|
| Parcours des propriétaires |226,9 ms|5,277 ms|6,5 ms|
| Parcours clinique complémentaire |149,2 ms|3,470 ms|4,0 ms|
| Recensement des identifiants |31,4 ms|0,730 ms|2,5 ms|
| Recherche |0,3 ms|0,007 ms|0,1 ms|
| Sémantique locale après admission |3,9 ms|0,091 ms|0,2 ms|

Le parcours d’un autre propriétaire local n’a pas été exécuté : son compteur reste zéro. Les deux premiers parcours dominent ce membre dans cette observation ; cela ne démontre pas qu’ils expliquent seuls chaque blocage de rendu. L’instrumentation ajoute son propre coût. Les deux fenêtres successives ne forment pas un comparatif causal d’optimisation. Les durées de cette subdivision ne doivent pas être ajoutées aux chronomètres parents de la première observation. Preuve : `native-firefoam-parts-cost-root-v1/root-qualification.json`, rapport Native SHA3428bfa7.

Un inventaire du RAW historique C48 trouve 2 441 structures sans lane de possession propre sur 2 454, et 13 structures portant des bills. Il ne prouve pas leurs identités ou capacités privées au rendu. Une piste de cache des lectures adjacentes est donc laissée de côté : ces feuilles sortent déjà du parcours avant ces lectures. Une proposition distincte sautant seulement les corps sémantiques de feuilles ordinaires sans marqueur a été revue en privé. Sa garde de 19 descripteurs par feuille est trop coûteuse dans le petit comparatif de helpers : 97 640 évaluations par bras W/C/W prennent 118,555 / 244,780 / 117,742 ms ; CPU processus 125 / 265 / 125 ms.

Ce dernier contrôle est un composant Node isolé, avec des objets JSON ordinaires dans un WeakSet local comme entrée explicite de benchmark. Il ne crée aucune provenance Native, ne fait aucune adoption, ne valide aucun World et ne lance ni Worker, moteur ou rendu. Le candidat reste **NO GO**, non installé ; son pilote navigateur préparé n’a pas été exécuté. Aucun gain global ni absence de régression ne sont annoncés. Le premier échec de préparation, dû à une ancienne hypothèse sur l’API locale TypeScript 7, est conservé avant tout latch ou mesure ; le harness corrigé utilise seulement le retrait de types de Node 24. Preuves : `native-empty-leaf-qualification-root-v1/isolated-cost.json` SHA83e2b391 et `root-no-go.json`. Aucune autre variante de cette piste n’est lancée sans fait nouveau.

**Autorité historique de cette mesure :** RAW `dfb438c564e096198bbb9da9db87961d29b479111b7ea726edcb3b8d264b2bf4`, gzip `7ce1b411522a4d71839bf011276ecfab2cc344bee628f297ae0737d24ad41ac8`, Core 122320 / phase 0 / RNG 3649308944 / nextId 30369, propre recharge exacte. Elle provient de C48/Core 121747, qui provenait d’A5b ; aucun retour à ces parents ni rejeu des latches. Pauses de 300 ms, Whole et sources exacts, aucune incertitude de conservation. La campagne humaine 94de et QA d474 restent protégées.

La suite immédiate est un contrôle animal indépendant des rôles humains, cadré par Faune/Repérer puis les gestes ordinaires de caméra. Son observateur privé n’acquiert qu’une fois, après un vrai progrès Core ; il conserve les états PENDING, repos, hors champ ou non acquis et n’allonge pas la fenêtre pour obtenir un résultat favorable. Il n’est pas encore exécuté. Les longs intervalles de rendu et la qualification animale restent ouverts ; six ensembles/victoire suspendus, code 345560ed et carte 2080/8007a08c inchangés, Cloudflare V491 dernière publication attestée.


## Animal suivi à ×1 ; cadrage restant à ×3/×6 (essai intermédiaire)

Un contrôle animal indépendant des rôles humains a été exécuté depuis DFB, avec la vraie UI Faune/Repérer pour centrer le cerf 19899 avant la première fenêtre. Les trois fenêtres fixes conservent 573 / 472 / 506 soumissions. Un seul animal a été acquis au premier vrai progrès Core ; aucun autre ID ni durée n’a été cherché pour améliorer le résultat.

À ×1, le lecteur trouve 198 paires consécutives actives, visibles et avec drapeau de marche, dont 167 après 200 ms : **aucune position répétée** dans ces paires. Les trois premiers échantillons PENDING, les états sans marche et le deuxième emplacement non acquis restent conservés. Le maximum entre soumissions pendant cette marche est 43,3 ms ; ce contrôle ne prouve donc pas une cadence parfaitement régulière. Il ne mesure ni la fin GPU ni les FPS globaux.

À ×3 et ×6, les 472 et 506 échantillons du même animal sont tous hors cadre, malgré 112 et 121 échantillons portant un drapeau de marche sur une arête active. Aucun résultat de déplacement visible ne peut être attribué à ces fenêtres. Le contrôle a révélé un défaut de son propre cadrage : sa propre recharge entre les vitesses passe par `replaceColony`, qui recentre sur le premier colon ([Main](../../src/main.ts)). La preview avant ×1 place le cerf dans le cadre ; celle après la première recharge le place hors cadre alors qu’il n’a bougé que d’environ une case. Ce n’est pas un défaut de mouvement du jeu établi par cet essai.

Le protocole, les pauses de 300 ms, Whole, horloges et entrées de présentation animales sont conservés exactement ; les propres recharges sont exactes et aucune source produit n’a changé. **Autorité historique de cet essai :** RAW `4727feb757a199c69bb16f620d931f4dfc6941e0ae983f38de046fe0efd84a01`, gzip `7be4db8ae1bf356bff12795883f467d78ade250ebc22840df6154406c82e814a`, Core 123810 / RNG 2929850488 / nextId 30405. Elle remplace DFB ; jamais de retour à ce parent ou de rejeu du latch. Rapport privé 9a92eece, `animal-only-native-author-v1/root-closed-summary.json`, et lecteur exécuté `animal-only-offline-author-v1/result/analysis.json` (SHA43e6e5f7c131b778c943313e728096b148dff1d07b725b37353b3d0b3fec2731). Toutes les lignes et paires, y compris les clips, restent disponibles.

La suite ne rejoue pas ×1 acquis sur ce produit. Un contrôleur privé limité à ×3/×6 doit conserver les sauvegardes actuelles intermédiaires, mais reporter sa propre recharge au final afin de garder le cadrage. L’observation passive pourra fixer une seule fois des animaux visibles même initialement au repos ; les paires ne seront considérées comme marche que si les vrais flags, états, géométries et arêtes le confirment. Aucun état n’est forcé, aucun repos ne devient un succès de déplacement, aucune fenêtre n’est prolongée pour réussir. Le nouveau contrôleur reste à qualifier ; fluidité générale, longues périodes de rendu et coût World restent ouverts.


## Complément visible à ×3/×6

Le contrôle suivant part exclusivement du dernier état 4727. Il ne rejoue pas ×1. Le cadrage est de nouveau acquis par Faune/Repérer, puis les deux fenêtres gardent leurs CURRENT et pauses de 300 ms, sans recharge intermédiaire ; la recharge exacte du dernier état se fait au final. Les deux cerfs 19899/19903 sont choisis une seule fois au premier progrès confirmé, parmi les animaux visibles avec des flux et une arête existante finis. Le repos ou une arête déjà terminée sont permis à cette acquisition : ils ne deviennent jamais des paires de marche. Les critères de géométrie, visibilité, drapeau de marche et arête active restent inchangés pour mesurer ces paires.

| Vitesse et animal | Paires de marche visibles | Dont après 200 ms | Positions répétées au total | Répétées après 200 ms |
|---|---:|---:|---:|---:|
| ×1, cerf19899 (essai antérieur) |198|167|0|0|
| ×3, cerf19899 |150|150|0|0|
| ×3, cerf19903 |114|114|0|0|
| ×6, cerf19899 |132|124|4|0|
| ×6, cerf19903 |145|145|0|0|

Les quatre répétitions à ×6 restent présentes avant 200 ms, simultanément à une Timeline et un front confirmés tenus. Elles ne sont ni retirées ni transformées en gain causal. Les 477/503 soumissions à ×3/×6 n’ont aucun clip des animaux suivis ; les 17 images PENDING initiales de ×3 sont conservées. Tous les autres états, lignes et paires restent dans les artefacts, sans extrapolation ni remplacement des valeurs manquantes.

Cette observation complète la preuve de déplacement continu des animaux **échantillonnés après démarrage**, pas une promesse pour toutes les espèces, cartes, vitesses transitoires ou charges. Les intervalles maximum entre soumissions sont 43,3 ms à ×1 dans l’essai antérieur, 46,7 ms à ×3 et 49,3 ms à ×6 dans le complément ; les maximums pendant la marche visible du complément sont 45,8/45,2 ms. La cadence reste donc irrégulière, même sans positions répétées après 200 ms. Aucune mesure de fin GPU ou FPS globaux, ni comparaison causale entre vitesses, n’est annoncée.

**Dernière autorité QA exclusive :** RAW `3f395e79ecf483d05fd70e4701de3b4da01391c21e47e3d4cc842ce81b9770a5`, gzip `7ed3dbc2433c65094fa2a95852523d70b6f53dbd568c4043edb39ff6c6d95739`, Core 125070 / RNG 3893170585 / nextId 30425, propre recharge exacte et incertitude nulle. Pas de retour 4727/DFB/anciens ni de rejeu des latches. Rapport Native 34780011, `animal-visible-any-state-native-author-v2/root-qualified-observation.json`, et lecteur exécuté `animal-visible-any-state-offline-author-v2/result/analysis.json` SHAfd06eb842e6833ff36b26f21f83c55b60cda24f364e6c9e41036c3e0af8f575e. La preuve ×1 demeure un essai antérieur distinct. Source produit 2080/8007 inchangée ; six ensembles/victoire toujours suspendus et Cloudflare V491 sans nouvelle publication.

La prochaine optimisation doit réduire une partie du coût MAIN démontré sans modifier les règles, les ACK ou la qualité. Une lecture privée étudie seulement la propriété de copies nouvelles de structures plates, analogue aux preuves de construction déjà employées pour les filths. Aucun constructeur n’est installé : getter/Proxy, alias du prédécesseur et point d’observation doivent être résolus explicitement avant toute qualification. Ce n’est pas une reprise des relais ou des formats World matérialisés rejetés, et aucun gain n’est encore mesuré pour cette hypothèse.
