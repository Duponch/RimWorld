# Audit de Lisière au 4 octobre 2026

Lisière possède un noyau de simulation sérieux et de nombreuses interactions physiques déjà jouables. La séparation simulation, bridge, rendu et interface est adaptée à ce projet. Les migrations strictes, les flux aléatoires persistés, les contacts réels et la conservation des propriétaires sont des qualités importantes.

Mon avis est néanmoins de **consolider avant d’ajouter une nouvelle mécanique**. Deux défauts peuvent compromettre la sauvegarde ou la récupération d’une partie ; des réservations concurrentes annulent des intentions acceptées ; les campagnes et leurs pilotes ont pris du retard sur les fonctionnalités récentes. La grande carte expose aussi des coûts que les petites scènes et les bancs synthétiques masquent.

Le jeu est une **alpha riche de simulation coloniale en 3D**, avec une fidélité souvent précise à l’échelle d’une action. Il reste loin d’une reproduction complète du Core à l’échelle d’une campagne : diversité humaine, narration, monde, économie et fin de partie sont inégalement couverts. Cette distinction compte davantage que le numéro V208 ou le nombre de bâtiments.

## Référence et méthode

L’audit porte sur le checkout `820a1401`, V208, schéma 190. Aucun fichier produit n’a été corrigé. Le dossier utilisateur `references_UI/`, présent avant l’audit et non suivi, est préservé. Les nouvelles mesures et sondes vont dans `tmp/audit-20261004/`, les sorties de tests dans les dossiers datés de `tmp/test-runs/`, dont `audit-20261004-campaign/` ; les anciennes preuves versionnées ne sont pas remplacées.

Trois volets indépendants ont examiné architecture, rendu et fidélité avec des sous-agents GPT‑6.1 Sol. L’intégration centrale a exécuté successivement régression, campagnes diagnostiques, build, sondes et mesures. Les sources servies restent gelées. Les sondes utilisent les vraies fonctions du produit ; celles qui remplacent Worker, audio ou stockage par des doublures sont identifiées comme contrôlées, sans prétendre reproduire une fréquence native.

La cible de comparaison est **RimWorld Core 1.6.4871 rev590**, sans DLC, principalement Atterrissage, Cassandra et Récit d’aventure. `Version.txt`, XML et classes nécessaires ont été relus dans l’installation locale. Le SHA‑256 recalculé de `Assembly-CSharp.dll` est `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. La décompilation temporaire sert à vérifier des règles, sans intégrer le code Core au produit.

La recherche Internet confronte cette installation à la présentation et aux annonces officielles, ainsi qu’aux documentations techniques primaires. Les publications historiques établissent l’existence de grandes boucles ; les coefficients actuels sont vérifiés dans les données installées. L’[annonce 1.6 de Ludeon](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) distingue explicitement mise à jour gratuite et Odyssey : les vaisseaux mobiles, l’orbite ou les nouveaux biomes de cette extension ne sont donc pas des manques Core imputés au projet.

Pour replacer les boucles dans le jeu de base, la recherche a aussi consulté les annonces officielles [loisirs Alpha 10, avril 2015](https://ludeon.com/blog/2015/04/rimworld-alpha-10-joy-system-released/), [animaux Alpha 12, août 2015](https://ludeon.com/blog/2015/08/rimworld-alpha-12-animal-taming-released/), [voyages et quêtes Alpha 17, mai 2017](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/) et [sortie 1.0, octobre 2018](https://ludeon.com/blog/2018/10/rimworld-1-0-released/). Ces références historiques ne servent pas de preuve des chiffres 1.6. Les miroirs publics du code et des XML sont secondaires face à l’installation relue : plusieurs pages précises ont échoué à la lecture Web, et aucune vérification fraîche de leur contenu n’est prétendue.

Une réussite préparée ne prouve ni équilibre naturel, ni campagne longue, ni couverture de toutes les interactions. Un refus par un validateur peut être un oracle historique obsolète ou une faute du moteur : cet audit distingue les deux. P1 signifie à traiter avant une utilisation régulière ; P2, défaut significatif ou risque de résilience ; P3, défaut limité ou dette locale. La gravité ne remplace pas le degré de preuve.

## Défauts prioritaires

### P1 Un trajet de raid rend la sauvegarde impossible

**Reproduit dans une continuation légitime.** La campagne Énergie échoue à tick 145860 avec `Tactical path misses its post.`. Une sonde reprenant son scénario et s’arrêtant au premier état tactique invalide situe la transition à **145842**, après 1 842 ticks depuis son départ. Elle contrôle la tactique à chaque tick, puis le monde complet à l’anomalie.

L’assaillant 7636, équipé d’un revolver, possède un trajet stratégique vers `(117,111)`. Lorsqu’il acquiert Ada comme cible, son nouvel état tactique a `post=null`, mais son ancien trajet reste présent. Il engage même un déplacement vers `(99,106)`. Le validateur tactique refuse cette combinaison et le sérialiseur de production refuse de sauvegarder le monde courant.

La chaîne est dans [raid-behavior.ts](../../src/sim/raid-behavior.ts), lignes 23–25, puis [tactics.ts](../../src/sim/tactics.ts), acquisition et choix de poste : un trajet déjà non vide fait sauter la recherche d’un poste de tir. [tactics-save.ts](../../src/sim/tactics-save.ts), ligne 19, détecte correctement l’incohérence. Il faut corriger la transition entre marche stratégique et engagement tactique, en conservant les règles d’arêtes engagées. Détendre le validateur masquerait le défaut.

La preuve brute `energy-tactics-current.json` conserve avant, après et monde. L’arrêt au premier refus ne mesure pas sa durée ultérieure. Aucune disparition d’un fichier existant ni tentative UI native de sauvegarde n’est prétendue ; **le refus du sérialiseur produit est établi**.

### P1 Un timeout de chargement peut perdre la copie de récupération

**Reproduit par orchestration contrôlée des vraies classes.** [SimulationClient.ts](../../src/bridge/SimulationClient.ts) retire une demande de ses opérations en attente après quinze secondes ; cela ne retire pas le travail déjà reçu par le worker. Les snapshots continuent d’être adoptés indépendamment de cette demande.

[game-session.ts](../../src/ui/game-session.ts), lignes 59–80, préserve d’abord la colonie active A, puis restaure l’ancienne copie B sur toute erreur de chargement. La sonde fait expirer une demande de C puis livre son acceptation tardive : C devient active, B reste dans la récupération, A n’y est plus et la préparation graphique attendue n’a pas été appelée. Le verrou `busy` avait déjà été libéré.

Le problème est une confusion entre **résultat encore inconnu** et **refus confirmé**. Il faut corréler transaction de remplacement, checkpoint adopté et acquittement, préserver la récupération jusqu’au résultat autoritatif et bloquer une nouvelle opération incompatible pendant l’incertitude. Une annulation simplement postée après un travail synchrone ne suffit pas ; une relance automatique d’une commande non idempotente serait également fragile.

La sonde déclenche le timer manuellement et remplace transport/codecs/décodeur par des doublures. Elle prouve l’ordre fautif, pas sa fréquence sur le navigateur ou un véritable chargement de quinze secondes.

### P2 Le transport automatique reprend des sources déjà réservées

**Deux reproductions physiques.** [work-planner.ts](../../src/sim/work-planner.ts), lignes 169–194, reconstruit les quantités réservées mais omet les ingrédients des ordres de cuisine en attente et la prise d’un corps pour enterrement. Le calcul autoritatif de [materials.ts](../../src/sim/materials.ts), lignes 102–162, les compte.

Dans une carte valide, un ordre de cuisine réserve dix riz. Le second colon reçoit ensuite un transport des mêmes dix riz : vingt sont réservés sur dix disponibles. Le validateur détecte `Invalid queued work reservation.` ; la réconciliation suivante annule la cuisine acceptée. Un ordre d’enterrement et un transport du même corps produisent le même conflit, puis l’enterrement est annulé.

Il n’y a pas de duplication ni de perte de matière démontrée. Le défaut détruit une intention acceptée et provoque un travail concurrent illégitime. Les sondes `probe-reservations.ts` et `probe-burial-reservation.ts` utilisent les commandes réelles. Une source commune de capture des réservations, confrontée à l’oracle scalaire existant, réduirait cette dérive. Le contrôle doit observer l’instant de planification, avant qu’une réconciliation ne cache l’incohérence par annulation.

### P2 Visibilité et chargement des effets sonores

**Visibilité confirmée par sonde contrôlée.** L’événement `visibilitychange` de [main.ts](../../src/main.ts), ligne 1132, informe la musique, tandis que les effets attendent `onAudioFrame`. Si les images cessent, une boucle d’effet continue avec son volume actif. La sonde laisse une boucle en cours sans RAF : musique cachée, effets encore actifs ; une mise à jour explicite coupe ensuite correctement la voix. Le navigateur peut suspendre RAF dans un onglet masqué, comme le documente [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). Transmettre directement la visibilité aux deux directeurs rendrait ce contrat indépendant du rendu.

**Chargement bloqué confirmé par sonde contrôlée.** [AudioDirector.ts](../../src/audio/AudioDirector.ts) attend tous les téléchargements avant de publier le catalogue ; aucun délai ni abort n’encadre chaque `fetch` et son corps. Un fichier dont le corps ne finit jamais bloque le catalogue entier, y compris les deux sons déjà décodés dans la sonde. Le manifest comporte 133 fichiers MP3 uniques pour environ 4,49 Mo compressés ; ce chiffre n’est pas la mémoire PCM. Prévoir disponibilité progressive, erreur bornée par asset et libération lors du disposal. La musique possède déjà ses propres délais et reprises.

### P2 La perte du périphérique GPU manque d’une récupération produit

**Risque établi par lecture, injection native non effectuée.** Le renderer du jeu ne relie pas la perte du device ou du contexte à un parcours de récupération. Le Three r186 installé marque un device perdu puis cesse de rendre ; la simulation peut continuer. Le repli WebGL concerne surtout l’initialisation, pas un appareil perdu pendant une partie.

Il faut conserver l’état autoritatif, arrêter proprement l’avancée selon acquittement et reconstruire la vue depuis un snapshot, avec une erreur visible si la reprise échoue. [GPUDevice.lost](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost) et [webglcontextlost](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event) sont les points d’entrée documentés. Aucun plantage GPU réel ni fuite mémoire n’est affirmé dans cet audit.

### P3 Deux divergences locales de géométrie

L’index de [recreation-space.ts](../../src/sim/recreation-space.ts), lignes 35–40 et 91–97, réplique partiellement la liste des cellules où l’on peut rester debout. Il considère disponible une position occupée par une lampe que l’oracle [furniture-travel.ts](../../src/sim/furniture-travel.ts) refuse. La sonde planifie une activité puis l’annule avant déplacement et gain : détour de planification, pas loisir gratuit. Partager la capacité de stationnement éviterait cette désynchronisation.

Les frustums CPU de `MapLabelsOverlay` et `StructureVfxLayer`, ainsi que les gardes z de projection de `ColonyRenderer`, conservent les conventions WebGL malgré une caméra WebGPU. Dans une sonde mathématique, un point avant le plan proche est accepté par le frustum par défaut et rejeté par celui qui reçoit le système de coordonnées de la caméra. `DayNightLayer` transmet déjà les bons paramètres. La [signature Three de Frustum](https://threejs.org/docs/pages/Frustum.html) prévoit ce système et la profondeur inversée. L’impact natif visible n’a pas été observé ; il reste borné à cette zone proche.

Un cas artificiel supplémentaire achève une construction avec `nextId=Number.MAX_SAFE_INTEGER`, consomme ses matières puis produit un compteur invalide. Il justifie une garde d’allocation centralisée, mais n’a pas la priorité des transitions ordinaires ci-dessus.

## Architecture et pratiques

### Les fondations à préserver

Le domaine `src/sim` ne dépend effectivement ni de DOM, ni de Three, ni d’horloge réelle ou de hasard global. Les nombres aléatoires persistés permettent une continuation déterministe ; les mutations au contact et les drafts transactionnels donnent une bonne base pour conservation et reprise. Les migrations valident l’ancien format avant transformation et les archives gardent leur histoire.

Le worker protège la réactivité du thread principal. Les snapshots et tracks séparent autorité de simulation et présentation interpolée. L’instanciation et les lots résidents sont appropriés au grand nombre d’acteurs et de cellules. La gestion de propriété/disposal est généralement explicite ; aucun motif de fuite systématique n’a été démontré. Les saisies issues de sauvegardes passent souvent par `textContent`, et la décompression est bornée : bonnes protections à maintenir.

Cela ne justifie pas une réécriture générale en ECS, Rust/WASM ou un pathfinding GPU. Le laboratoire GPU reste distinct du jeu. Une modification de moteur aurait un coût de preuve élevé et ne corrigerait pas, par elle-même, les transitions et réservations identifiées.

### La séparation des dossiers masque un couplage interne important

Le relevé statique compte 474 modules de simulation, 32 325 lignes physiques, environ 2,48 Mo UTF‑8 et 2 652 arêtes d’import runtime. **141 modules appartiennent à la plus grande composante cyclique.** Ce n’est pas une preuve de lenteur ou de panne à l’initialisation ; c’est un indicateur de responsabilités moins indépendantes que ne le laisse penser leur nombre.

`serialization.ts` a 147 dépendances runtime directes et environ 117 Ko ; `engine.ts`, 157 et 85 Ko. Certaines lignes approchent 3 000 caractères. La concision des fichiers en nombre de lignes rend ici les transitions difficiles à relire et les diffs peu explicites. Les cycles planner/construction, planner/rescue/work-release et engine/furniture-commands compliquent les extensions locales.

Extraire progressivement des services purs de réservation, capacités et transitions, puis laisser l’orchestrateur appeler ces services. Un module de service ne devrait pas réimporter le planner qui le consomme. Commencer par les cycles qui interviennent dans les défauts reproduits, sans refaire tout le graphe. Des registres typés pour les capacités des bâtiments réduiraient les listes concurrentes : blocage, stationnement, couvert, toiture, travail et transport doivent rester des propriétés distinctes.

### Types et contrôles automatiques

TypeScript est strict et les versions sont épinglées avec lockfile. Activer graduellement `noUncheckedIndexedAccess` dans des périmètres sensibles aiderait à rendre visibles les lectures absentes ; `exactOptionalPropertyTypes` aide à distinguer absence historique et valeur explicitement écrite. Les [options officielles TypeScript](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html), [dont les propriétés facultatives exactes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html), expliquent ces garanties. Elles ne remplacent pas les validateurs runtime ni une migration.

Aucun workflow CI versionné n’a été trouvé dans `.github`, ni script de lint. Le point prioritaire est une exécution reproductible de typecheck, contrôles courts et régression avec résultats conservés. Des règles ciblées sur frontières sim/rendu, cycles et usages non justifiés de casts auraient plus de valeur qu’un nettoyage stylistique global. Garder un contrôle rapide utile, puis des campagnes périodiques, plutôt qu’une commande unique extrêmement longue rarement lancée.

La régression dure environ 8 min 44 ; son diagnostic indique une forte part d’imports et d’isolation. L’option Vitest `isolate:false` pourrait réduire un sous-coût, mais modifierait les garanties. La [documentation Vitest](https://vitest.dev/guide/improving-performance) présente ces compromis ; l’adopter sans vérifier la pollution inter-tests serait une mauvaise réparation du rouge.

### Sauvegardes et exploitation

Le codec compresse les grands mondes, vérifie ses métadonnées et borne à 32 Mio le monde décompressé. C’est utile. Deux emplacements `localStorage` restent toutefois une capacité finie et synchrone : le plafond logique du codec n’est pas une garantie de stockage de deux colonies. [MDN décrit les quotas et erreurs](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), et [le caractère synchrone de Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).

Pour des parties longues : expliciter l’espace occupé et l’erreur de quota, vérifier import/export et récupération, puis envisager IndexedDB si la croissance réelle le nécessite. Une demande de stockage persistant et un export utilisateur ont des rôles différents. Cet audit n’a pas reproduit une saturation native ; la limite est un risque de capacité, distinct du défaut de transaction confirmé.

## Validation réellement obtenue

| Contrôle courant | Résultat | Portée et interprétation |
| --- | --- | --- |
| Régression hors 13 campagnes | 479 fichiers : 436 passent, 43 échouent ; 2 114 tests passent, 55 échouent, 1 ignoré | Suite rouge, intégralement terminée. Nombreux oracles/fixtures historiques à reprendre. |
| Cinq campagnes diagnostiques | 2 fichiers passent, 3 échouent ; 17 tests passent, 3 échouent | Trois graines Survie sur trois jours et Raid cinq jours passent ; pas toutes les campagnes. |
| Build avec typecheck | Passe | N’assure pas correction fonctionnelle. Avertissement de gros chunk conservé. |
| Contrôle documentaire initial | Passe | 710 documents et 7 022 liens contrôlés ; originaux vérifiés inchangés. |
| Audit npm | Aucune vulnérabilité connue signalée | Dépend des bases et versions du relevé ; pas un audit de sécurité du produit. |
| Mutations contrôlées du validateur | 1 116 mutations, 1 074 refus, 42 valeurs compatibles acceptées, aucun throw | Monde 32² et champs sélectionnés ; pas fuzzing combinatoire exhaustif. |
| Présentation native | Passe : minage et coupe, 45 s chacun sur 250², vitesses 1/6/3 | Aucun saut, occupation de roche ou retrait anticipé détecté dans ces parcours à trois personnes. |
| Parcours UI natif | Passe en 32,9 s | Repas tenu/ingéré, deux lits orientés occupés, attribution, sauvegarde et reprise exacte ; fixture 32². |
| Catalogue public complet | 54/54 passent | Codec ordinaire, hash du monde décodé, migration, validité, roundtrip exact et continuation exacte d’un tick ; pas parcours joué de chaque scène. |

Les 55 échecs de régression sont **dominés par une dette d’oracles et de fixtures V208** : égalités de migration n’attendant pas `television:0/false`, ou monde courant rétrogradé fictivement qui garde des champs futurs. Le rejet strict de ces faux anciens mondes est souhaitable. Deux attentes de catalogue sont également périmées : 73/74 icônes et 17/20 projets. Les contrôles courts récents réussis ne rendent pas la régression verte ; l’audit ne classe pas chaque échec comme inoffensif sans son triage.

La campagne Atterrissage échoue à son observation tick 23000 : Noé est mort à 22836 d’hémorragie après le lièvre en rage déclenché à 20400. **Il reste 32 rations ; les repos sont positifs.** Le pilote ne réagit tactiquement qu’à `w.raids.active` et continue ses ordres de soins sous menace animale. Ces ordres préemptent la fuite selon le contrat existant. Le pilote doit intégrer cette menace avant qu’on utilise ce rouge comme preuve de famine, de repos cassé ou d’un mauvais équilibrage. La bonne conduite autonome pendant tout l’épisode reste à vérifier par trace ; aucune correction produit n’en est déduite.

La campagne `simulation` perd dix unités dans son compte à tick 2608. La sonde exacte montre une récolte ratée : Ada, Plantes 8 et Manipulation 0,6, a 88 % de réussite ; le tirage la fait échouer. Le buisson conserve son identité mais repasse à 30 % de croissance, sans nouvelle pile. L’oracle comptait ses dix baies potentielles puis cesse de les compter. Bois conservé, aucune pile perdue, aucune ingestion/pourriture/faune impliquée, monde valide. **Réparer ce bilan indépendant**, sans inventer dix aliments ou supprimer la règle Plantes V179 pour faire passer le test.

La campagne Énergie, à l’inverse, révèle le défaut produit de tactique décrit plus haut. Une grande suite doit couvrir explicitement ces transitions entre nouveaux et anciens systèmes, plutôt que les tester seulement en silos.

## Performances actuelles

### Grande carte dans Chromium natif

Machine : Windows x64, Ryzen 5 3600, environ 16 Gio de RAM ; Chromium 153, WebGPU matériel AMD `rdna-1` (le nom exact de la carte n’est pas exposé). Vue 1 920×1 080, DPR 1, textures/herbe/ombres/nuages/labels actifs. La même sauvegarde `public/test-saves/v98/mixed-100.json`, SHA‑256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`, est rechargée avant chaque phase : 250×250, 104 personnes, 100 animaux. Son ancien schéma 91 migre vers 190 ; la migration est hors fenêtre mesurée. Cinq secondes de chauffe puis huit de mesure par vue/vitesse. Sources servies depuis le checkout courant, sans correction produit.

| Vue à vitesse demandée ×6 | Vitesse réellement atteinte | RAF p95 | CPU d’image p95 | Simulation déclarée p95 |
| --- | --- | --- | --- | --- |
| Iso proche | ×3,50 | 37,4 ms | 25,5 ms | 66,9 ms/tick |
| Iso large | ×2,87 | 41,7 ms | 24,4 ms | 77,0 ms/tick |
| Perspective basse | ×3,05 | 41,8 ms | 28,6 ms | 69,6 ms/tick |
| Iso avec labels | ×3,42 | 41,7 ms | 28,6 ms | 63,4 ms/tick |

**×6 n’est pas atteint dans cette charge.** Les vitesses observées correspondent à environ 17–21 ticks locaux/s, pour 36 demandés. Le p95 RAF décrit des intervalles d’image ; son inverse ne constitue pas une moyenne FPS. En pause, les quatre vues ont un RAF p95 d’environ 4,3 ms et un CPU d’image p95 de 2,2–3,1 ms, avec quelques pointes. Le résultat en pause ne permet pas d’annoncer 240 FPS constants en jeu.

Le callback des snapshots a un p95 de 7,6–9,2 ms, le décodage seul de 2,8–3,4 ms ; ces durées concernent des appels différents et ne s’additionnent pas directement aux percentiles des images. Les captures ont relevé aucune erreur page/console/GPU. Les compteurs Three de dessins/triangles peuvent omettre le rejeu de bundles WebGPU : ne pas les prendre pour un comptage complet du travail GPU.

La passe GPU instrumentée est distincte et ne sert pas à comparer ses FPS avec le tableau. Les timestamps remontés par Three ont un p95 de **3,34 ms en pause / 4,65 ms à ×6 demandé** en iso proche, et **3,47 / 4,78 ms** en perspective basse ; aucune erreur n’est relevée. Ce périmètre ne mesure pas la consommation, la mémoire GPU ni toutes les scènes. Il renforce néanmoins le diagnostic : dans ces fenêtres, la cadence et le débit souffrent bien au-delà du temps graphique observé. Les rapports `native-performance.json` et `native-gpu.json` gardent les échantillons et paramètres séparés.

Ces fenêtres courtes sur une scène préparée donnent une référence actuelle, sans comparaison A/B avec une autre révision. Elles ne prouvent ni équilibre d’une colonie naturelle de cet effectif, ni comportement sous incendie/orage/longue campagne, ni résultat sur un autre matériel. Les mesures sont des observations de l’audit, pas des benchmarks de RimWorld : aucune affirmation de supériorité sur le moteur original n’est possible.

### Le coût de publication compte aussi

Le profil Node séparé, même sauvegarde, vingt ticks de chauffe puis soixante ticks consécutifs mesurés, force un snapshot par tick. Il relève :

| Étape | Moyenne | p95 |
| --- | --- | --- |
| `stepWorld` | 37,37 ms | 56,61 ms |
| Encodage du snapshot | 6,93 ms | 9,88 ms |
| Clone structuré Node du message | 7,97 ms | 9,46 ms |
| Captures mouvement/audio/présentation et historique | Environ 1,32 ms au total | Percentiles propres à chaque étape dans le JSON |
| Chemin local total | 53,60 ms | 76,10 ms |

La simulation dépasse déjà en moyenne le budget indicatif de **27,8 ms par tick** nécessaire pour 36 ticks/s. Encodage et copie ont en plus un poids significatif. Le clone Node est un proxy, sans `postMessage` réel, attente de file, adoption navigateur ou GPU ; la publication forcée ne représente pas la cadence événementielle exacte du worker. Le profil inclut soixante deltas et aucun checkpoint chronométré. Le champ automatique `commit` est `null` dans ce rapport ; l’identité du checkout est conservée au début du présent audit.

L’encodeur balaie les 62 500 cellules et les collections nécessaires à chaque publication. Comparer même au même tick est requis par les mutations possibles ; supprimer arbitrairement ce contrôle casserait le contrat. Les copies des états dynamiques et le coût d’adoption restent après les optimisations du cache terrain.

Le worker et le navigateur n’ont pas de véritable contrôle de pression de la file de messages. La file de présentation bornée à 64 ne borne pas les messages encore en attente de livraison. Priorité : instrumenter taille/fréquence/attente, distinguer commandes et snapshots, et conserver les acquittements. La [documentation des workers](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage) décrit le transfert par messages ; sa présence ne supprime pas le coût de copie ou d’ordonnancement.

### Le banc simplifié montre une capacité différente

Sur carte ouverte 64×64, trois répétitions, coupe puis transport seulement, les médianes actives sont **0,071 / 0,344 / 1,583 ms par tick** pour 3 / 30 / 100 personnes ; les p95 **des moyennes de lots de vingt ticks** sont 0,093 / 1,072 / 3,646 ms. Les achèvements, le bois déposé, la conservation, la sérialisation et la continuation de la fixture sont contrôlés hors chronométrage.

Ce banc retire la santé, simplifie la carte et les activités. Son bon résultat est utile à son périmètre, mais ne contredit pas la grande carte ni ne justifie une capacité générale de cent colons à ×6. Une carte 250² contient environ quinze fois plus de cellules qu’une 64² ; effectif, nature des décisions et accessibilité importent aussi.

### Optimisations à envisager après profilage

La navigation pondérée utilise des tableaux denses : environ 25 octets/cellule, soit 1,56 Mo pour 250² par espace de recherche, hors autres masques/caches. C’est un calcul de capacité, pas une mesure d’allocation par tick. Le budget de huit recherches limite un nombre, pas leur durée : un cas inaccessible peut encore explorer une grande composante. Mesurer expansions, destinations refusées et réutilisation avant de choisir un cache ou une représentation différente.

L’instanciation GPU n’efface pas les parcours CPU des acteurs/tracks et les clés allouées à chaque image. Les lots globaux d’humains et de faune ont `frustumCulled=false` ; hors champ et cadavres peuvent augmenter vertex/ombres. La division spatiale n’est justifiée qu’après comparaison GPU et doit conserver les casteurs hors caméra. Le HUD général est cadencé à 5 Hz et plusieurs panneaux sont conditionnels/signés, mais `renderState` reste un grand agrégateur avec des écritures DOM souvent identiques. Extraire des vues dérivées ciblées, sans créer une seconde autorité du monde.

Les champs graphiques ont un coût mémoire réel : atlas terrain environ 16 Mo RGBA sans mipmaps ; masque dense sang/herbe environ 3,5 Mo côté CPU et autant de payload GPU à 250². Une modification isolée peut uploader un champ complet ; une rafale de changements terrain peut reconstruire l’atlas. Tester construction, croissance et incendie, au-delà d’une scène stable. La texture du champ mesure 3 500×250 texels sur cette carte ; la garde doit suivre les capacités configurées du backend, pas seulement l’atlas terrain. Aucun appareil incompatible n’a été rencontré ici.

Le build principal produit environ **1,78 Mo JS minifié, 526 Ko gzip**, le worker 1,23 Mo et le chunk simulation 365 Ko (tailles non additionnées comme trafic initial mesuré). C’est une dette potentielle de démarrage et de déploiement ; le warning Vite n’est pas une preuve de mauvais FPS. Mesurer chargement froid/cache chaud et premiers contrôles utilisables avant un découpage supplémentaire.

Le journal du serveur isolé montre aussi des avertissements Three répétés à l’initialisation : `Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.` Les filtres des rapports natifs enregistrent les erreurs, pas tous les warnings ; les résultats sans erreur restent compatibles avec ce bruit. Le rendu a fonctionné, sans panne shader établie. Localiser les fonctions concernées et rendre leurs layouts explicites améliorerait la conformité TSL et la lisibilité des diagnostics, sans en déduire un gain de performances non mesuré.

## Fidélité au Core

### Une fidélité locale souvent substantielle

La nutrition vient de l’ingestion, le repos du couchage réellement occupé, les soins et la production du contact. Identité, quantités, paquets, contenu incorporé et déplacements restent matérialisés. L’anatomie influence des capacités distinctes ; les douze compétences ont des usages effectifs. Ce sont des éléments structurants du clone, plus importants qu’un HUD ressemblant à RimWorld.

Plusieurs ajouts sont précis : CRT 80 acier/quatre composants/Construction 7/200 W, sièges frontaux 5×3, cap huit et gain ×1,2 ; sacs cinq tissus/300 PV/couvert 0,55, distinct de la ligne de vue ; repas de survie six protéines/six végétaux/Cuisine 8 ; effets du lit clinique à l’occupation. Les [recherches CRT](../research/television-core-v208.md), [couvert](../research/defensive-cover-core-v207.md) et [survie](../research/packaged-survival-core-v206.md) conservent les détails et adaptations.

Six ticks locaux par seconde et 6 000 par jour conservent un jour nominal de 16 min 40 à vitesse normale, avec conversion de dix ticks Core par tick local. Il ne faut pas confondre cette règle d’horloge avec la vitesse atteinte sous charge.

### Trois divergences confirmées dans la recherche déjà jouable

| Règle | Lisière courant | Core installé et effet |
| --- | --- | --- |
| Vitesse du bureau avancé | 1,5, simple 0,75 : rapport ×2 ; test verrouillant ce choix | Avancé 1,0, simple 0,75 : rapport ×4/3. Facteur avancé local 50 % supérieur, donc deux tiers du temps de travail Core à autres facteurs égaux. |
| Partage du multi-analyseur | Réservé à un chercheur ; second usage interrompu | Une installation peut servir plusieurs bureaux. `maxSimultaneous=1` borne les analyseurs liés à un bureau, pas le nombre de consommateurs d’un analyseur. |
| Propreté intérieure | Ignorée ; commentaire ancien disant sols/salissures absents | Facteur de propreté de la pièce : 0,75 à −5 ; 0,85 à −2,5 ; 1 à 0 ; 1,15 à 1. Nettoyer le laboratoire a un effet Core absent ici. |

Sources locales : [research.ts](../../src/sim/research.ts), lignes 95–115, [test V123](../../tests/research-v123.test.ts), ligne 88 ; `Buildings_Production.xml`, lignes 1333/1394, `Stats_Building_Special.xml`, ligne 95, `RoomStats.xml`, ligne 257 de l’installation. La lecture fraîche de `CompAffectedByFacilities.CanPotentiallyLinkTo` et `CompFacility` tranche le sens de `maxSimultaneous`. La portée locale neuf cases entre cellules diffère également des huit unités entre centres vrais Core, mais cette adaptation est déclarée.

Le bureau avancé est documenté comme local dans [Industrie V123](../development/industry-v123.md), sans motivation retrouvée pour son accélération. Une adaptation déclarée n’est pas nécessairement adaptée à l’objectif de clone. Le malus extérieur provisoire de 0,9 et la propreté neutre sont aussi des dettes à réexaminer. À l’inverse, les seuils de température **9/35 °C** et le mauvais rôle ×0,8 sont bien confirmés dans l’assembly : ne pas les modifier selon un résumé secondaire disant 10 °C.

Corriger ces règles demandera une décision de fidélité explicite et des contrôles de progression ; les points déjà obtenus ne doivent pas être retirés rétroactivement. Ces corrections ne sont pas entreprises pendant l’audit.

### Les grands écarts concernent la campagne

La [présentation officielle de RimWorld](https://rimworldgame.com/) décrit des personnes avec histoire, relations, santé, dépendances, un narrateur, des factions et une planète traversable. La [publication Alpha 16](https://ludeon.com/blog/2016/12/rimworld-alpha-16-wanderlust-released/) situe caravanes et migration dans le jeu de base depuis longtemps. Ce ne sont pas des embellissements d’extensions récentes.

| Boucle | État de Lisière | Écart principal à une campagne Core |
| --- | --- | --- |
| Survie et habitat | Nombreuses chaînes physiques, alimentation, agriculture, stockage, froid, énergie, confort et soins | Catalogue, biomes et contraintes encore partiels ; durée et autosuffisance ne sont pas établies par chaque scène publiée. |
| Personnes | Douze compétences, anatomie, capacités, humeur, opinions et quelques mémoires | Biographies/incapacités de travail, famille/romance adultes, addictions et diversité des crises restent absents ou très limités. |
| Santé | Blessures, infections, soins, médecine et chirurgie thérapeutique ciblée | Organes, prothèses, greffes et catalogue médical général manquent ; aucun hôpital exhaustif. |
| Menaces et narration | Raids, première quête locale, rage animale, canicule, orage, capsule, éruption solaire | Diversité et distribution conditionnelle Core incomplètes ; mécanoïdes hostiles, insectes, sièges et stratégies restent à couvrir. |
| Recherche et industrie | Vingt projets, ateliers et plusieurs débouchés réels | Arbre et débouchés limités ; vitesse avancée divergente accélère une progression déjà plus courte. |
| Économie et monde | Textile renouvelable vendu à monnaie finie ; reconnaissance et comptoir individuel avec retour physique | Planète, groupes, camps, factions, diplomatie, destinations et rencontres ne forment pas encore une boucle monde. |
| Fin de partie | Survie et développement locaux | Pas encore d’objectif final comparable à une campagne Core complète. |

La richesse omet encore la valeur des humains et des animaux domestiques (`pawnsKnown=0`) ; son total connu reste une borne basse. Comme cette valeur intervient dans attentes/menaces, il faut mesurer le biais de difficulté au lieu de présenter cette estimation comme richesse Core totale.

Misc conserve une enveloppe de 16,9 tickets, dont 2,9 ouverts et les autres silencieux. Cela évite de transformer chaque événement absent en canicule, mais ne reproduit pas la sélection conditionnelle Core complète. Les voyages individuels imposent 3 h/1 h/3 h, le scout six heures abstraites et aucune vraie découverte de planète. Ils préservent bien l’identité, sans fournir les arbitrages d’une caravane de groupe.

Les crises ont surtout errance triste et frénésie alimentaire comme issues effectives. Rabattre des crises plus graves sur ces variantes réduit la diversité de leurs conséquences et modifie la tension de campagne ; c’est une adaptation actuelle, pas un bug de programmation démontré. Famille/romance désignent ici les adultes du Core : enfants, génétique et mécanoïdes contrôlés sont exclus du périmètre, conformément à l’[annonce officielle de Biotech](https://ludeon.com/blog/2022/10/biotech-expansion-announced-update-1-4-on-unstable-branch/). Les camps de secours des caravanes, en revanche, appartiennent à la mise à jour gratuite 1.6 citée plus haut.

Il serait faux d’en déduire simplement « le jeu est plus facile ». Recherche accélérée et risques absents peuvent faciliter une partie, tandis que l’exclusivité de l’analyseur, certaines restrictions de voyage et une dotation initiale partielle la durcissent. L’écart est une **expérience différente et encore peu calibrée**, pas un coefficient universel de difficulté.

## Priorités conseillées

1. **Protéger la partie.** Corriger transition stratégique/tactique et remplacement après timeout. Accepter seulement après continuation sauvegardable et scénario acquittement tardif/refus explicite/erreur graphique, avec récupération conservée.
2. **Unifier les invariants concurrents.** Réservations cuisine/enterrement/transport, puis capacité de stationnement. Vérifier annulation, prise, interruption et sources exactes avant et après réconciliation.
3. **Rendre la validation à nouveau utile.** Trier les 55 échecs, réparer les fixtures sans champs futurs et les égalités de migration sans affaiblir l’ancien schéma ; mettre le pilote à jour pour toutes les menaces présentes et corriger l’oracle de récolte. Relancer les seuls contrôles concernés, puis la régression ; étendre ensuite les campagnes restantes.
4. **Réduire le coût réellement limitant.** Profiler décisions/planning/faune, encodage et adoption avec les mêmes scènes ; vérifier invariants et traces avant un A/B/B/A. Ne pas chercher d’abord un nouveau moteur ou des FPS annoncés sans débit de simulation.
5. **Réparer les divergences anciennes de fidélité.** Bureau avancé, partage de l’analyseur et laboratoire propre. Pour chaque adaptation restante : règle Core/version, justification locale, conséquence sur les choix et condition de réexamen.
6. **Compléter des boucles, puis leur catalogue.** Après consolidation, un prochain lot devrait ouvrir une décision dans les domaines les moins couverts : personnes et crises, diversité de menace/progression, ou voyage de groupe et destination. Choisir selon leurs dépendances, sans lancer automatiquement ces chantiers ni raffiner une seule famille de recettes.

Un critère de maturité plus utile qu’un pourcentage serait : plusieurs départs naturels sur 250², traces de décisions et contacts, trente jours ou davantage avec soins/production/menaces, sauvegarde-reprise à des phases critiques, et débit/mémoire mesurés à plusieurs effectifs. Ce seuil est une **proposition d’acceptation**, pas une preuve obtenue ici. Les objectifs G0–G5 de la [roadmap](../ROADMAP.md) restent correctement ouverts.

## Présentation et intérêt de la 3D

Une inspection native complémentaire ouvre un nouveau départ Atterrissage 250², graine 42, puis le met en pause. Les captures iso, perspective et Travail sont examinées ; elles montrent un état initial à trois personnes, pas une colonie développée ni une campagne jouée. Le parcours UI de besoins contrôle séparément la reprise et les occupants des lits.

Mon appréciation visuelle est favorable : identité low poly cohérente, palette douce, matériaux et végétation reconnaissables, portraits et HUD bien hiérarchisés. Le panneau Travail présente priorités et compétences réelles avec une légende utile. Il donne déjà l’impression d’un jeu construit, même si les choix de gestion dépassent encore les chaînes disponibles dans certains domaines.

La lisibilité tactique doit guider les prochains raffinements 3D. Au zoom initial, les trois personnes et certaines piles sont petites dans une végétation dense ; arbres et volumes peuvent masquer des cibles. Renforcer contraste local, silhouette/contour de sélection, survol et compréhension de l’objet sous le curseur serait plus utile qu’une augmentation générale du détail. Préserver la palette voulue. Le tableau Travail, déjà dense avec trois lignes, mérite un contrôle spécifique à petit écran et avec davantage de personnes ; la capture actuelle ne démontre pas une défaillance responsive.

La 3D n’impose pas de changer la simulation plane Core ni d’ajouter des étages ou un moteur physique. Elle exige en revanche une preuve propre pour cellule sélectionnée, proxy d’acteur, empreinte, couvert et ligne de vue, caméra basse, murs/toits masqués, ombres et feedback de contact. Le joueur doit voir pourquoi une commande est refusée ou pourquoi un colon attend. Les défauts de frustum/projection identifiés font partie de cette frontière.

Les boutons donnant accès à des domaines encore partiels et les adaptations de règles devraient être expliqués dans l’aide sans laisser croire à une boucle complète. Le contrôle documentaire passe, mais quelques phrases de priorité de la roadmap mentionnent encore V207 sous un en-tête V208 : entretien éditorial à distinguer d’un manque fonctionnel.

## Limites et preuves consultables

L’audit ne couvre pas toutes les campagnes longues, les parcours joués des 54 entrées du catalogue public, tous les biomes, appareils et navigateurs, la saturation locale, une perte GPU injectée, une campagne de plusieurs saisons ou une écoute humaine complète. Aucune absence de bug générale, parité exhaustive, accélération générale ou coût GPU nul n’est conclue.

Les fichiers temporaires principaux sont `regression.log`, `regression-analysis.json`, `campaign.log`, les logs de `tmp/test-runs/audit-20261004-campaign/`, `energy-tactics-current.json`, `crashlanded-failed-current.json`, `campaign-conservation-probe.json`, `catalogue-probe.json`, `validation-probe.json`, `architecture-metrics.json`, `render-probes.json`, `profile-worker.json`, `simulation-benchmark.json`, `native-performance.json`, `native-gpu.json` et `visual-review.json`. Les captures naturelles et les artefacts UI/présentation restent dans leurs dossiers temporaires. Ils sont datés pour distinguer les mesures de cet audit des fichiers roulants historiques de `tmp/`.

Les volets détaillés `architecture.md`, `render-performance.md`, `rimworld-fidelity.md` et les compléments de campagnes sont conservés dans le même dossier. Le présent rapport porte l’avis intégré ; la documentation du jeu et les preuves antérieures conservent leur statut. **Ce travail améliore le diagnostic, sans ajouter de fonctionnalité au jeu.**
