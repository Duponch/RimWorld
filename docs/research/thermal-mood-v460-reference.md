# Pensées thermiques de situation — référence V460

22 octobre 2026. **Recherche primaire et décisions de périmètre, pas qualification produit.** Cette note concerne les pensées de situation humaines EnvironmentCold/EnvironmentHot. Elle ne clôt ni les besoins, ni la clinique, ni les six ensembles Core ; les souvenirs de sommeil thermique restent un contrat distinct. Sources et extractions privées : `tmp/animal-hauling-v459/next-thermal-reference.md` et `thermal-core/`. Aucun code décompilé, XML, texte de description ou asset propriétaire n'est intégré au produit.

## Version, corpus et sources

Référence lue le22octobre : installation locale `E:/Steam/steamapps/common/RimWorld`, **1.6.4871 rev590**. Assembly `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 **5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a**, identique avant/après les lectures privées. Les XML et les classes de ce binaire constituent la source des nombres et conditions ci-dessous. Lecture avec ILSpyCmd8.2.0.7535 déjà acquis ; les18extractions réussies et l'essai de type inexistant restent distingués dans la note privée.

L'[annonce officielle Ludeon du12octobre2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), déjà vérifiée lors de l'audit transversal, distingue la branche principale1.6 et la1.7instable. Elle ne spécifie pas les seuils des pensées ; aucune règle1.7 ou mécanique d'extension n'est adoptée depuis cette annonce.

Corpus original relu : [documentation utilisateur](../reference/originals/Documentation_developpement.html), chapitres9/12/13/14/15. Le chapitre14 distingue besoin, situation et mémoire ; le chapitre15 distingue exposition et maladie. Correspondances conservées : **SYS/TEST081**, besoins076–080, habillement055, température126, conditions131 et capacités091/096. Adopter une pensée de situation ne valide pas ces domaines entiers. Les recherches [humeur](mood-reference.md), habillement et température antérieures restent leurs références historiques ; elles ne remplacent pas les workers fraîchement lus.

Sources primaires précises :

- `Data/Core/Defs/ThoughtDefs/Thoughts_Situation_General.xml`, defs EnvironmentCold/EnvironmentHot ; `Data/Core/Defs/NeedDefs/Needs.xml`, besoinMood.
- `Data/Core/Defs/ThingDefs_Races/Races_Humanlike.xml` ; `Data/Core/Defs/Stats/Stats_Pawns_General.xml` et `Stats_Apparel.xml` pour plage confortable et isolation.
- `ThoughtWorker_Cold`, `ThoughtWorker_Hot`, `ThoughtWorker`, `ThoughtUtility`, `StatPart_GearStatOffset`, `Thing.AmbientTemperature`, `ThingOwnerUtility`, `GenTemperature`, `Pawn_NeedsTracker`, `Need_Mood`, `ThoughtHandler`, `SituationalThoughtHandler`, `Need_Seeker`, `Need`, `NeedDef`, `RestUtility`.
- Seulement pour distinguer les contrats différés : `Thoughts_Memory_Misc.xml`, SleptInCold/SleptInHeat et `Toils_LayDown`.

## Situation actuelle, distincte de la maladie

Les deux defs sont valides hors carte (`validWhileDespawned`) et ciblent les stades humains représentés. Elles n'ajoutent aucune nouvelle jauge de confort, mémoire d'événement, durée, condition de pièce ou affection préalable. Leurs effets s'appliquent à **l'humeur**, pas au besoin de confort mobilier.

| Situation | Écart positif lu par le worker | Stades et humeur |
|---|---|---|
| Froid | minimum confortable effectif moins air reçu | écart≤0 : absent ; 0<écart<10 :−4 ; 10≤écart<20 :−8 ; 20≤écart<30 :−12 ; écart≥30 :−16 |
| Chaleur | air reçu moins maximum confortable effectif | mêmes bornes et offsets |

Le paramètre natif de lecture du stat effectif vaut10. Les calculs sont en flottantC# ; conserver les frontières0/10/20/30 sans promettre une égalité binaire avec les doublesJavaScript. Les workers ne lisent ni hypothermie/coup de chaleur, ni douleur, conscience, sommeil, mobilisation, faction ou lit. Les filtres génériques de pensée et la disponibilité du besoin restent distincts : ne pas exclure arbitrairement un captif humain de ces situations.

Une personne peut donc être mécontente sans maladie. Inversement, une affection résiduelle ne maintient pas la pensée quand l'air reçu redevient confortable. Ni médicament ni soin n'est consommé pour retirer cette pensée dérivée. La plage clinique sûre élargie de10°C de chaque côté par GenTemperature est un autre contrat ; ne pas attendre ce seuil pour appliquer la pensée.

Core humain : plage de base **16–26°C**. Les habits effectivement **portés** soustraient leur isolation froide au minimum et ajoutent leur isolation chaude au maximum. Les couches se cumulent. Qualité d'isolation :0,8/0,9/1/1,1/1,2/1,5/1,8 ; la matière intervient par ses stats. Les définitions lues n'appliquent ni facteurPV ni capacité corporelle à cette isolation. Un vêtement au sol, rangé, dans l'inventaire ou porté comme cargaison ne protège pas encore le porteur.

Les préceptesTemperature_Tough d'Ideology et les offsets génétiques sont des branches d'extension distinctes : ils ne sont pas ajoutés à ce lotCore. Leurs présences dans le code installé ne les rendent pas actifs en Core seul.

## Air du vrai propriétaire

L'ordre natif de résolution est : position de la personne spawnée ; température fixe éventuellement fournie par un détenteur ; position détenue d'un parent spawné ; température de la tuile valide ; enfin21°C si aucun lieu/détenteur valide n'existe. Une carte déjà présente à la tuile fournit son air extérieur ; sinon le monde fournit sa température saisonnière. Les températures fixes de certains transports/œufs ne sont pas un repli universel hors carte.

Conséquences retenues :

- **Carte et personne portée** : lire la vraie température locale de la personne ou du lieu de son porteur, avec topologie/portes/pièces existantes. Le toit influence l'air physique ; aucun coefficient supplémentaire de pensée «sous toit» n'est inventé.
- **Caravane** : utiliser sa tuile actuelle et les habits réellement portés parmi les biens de ce propriétaire, jamais l'ancienne chambre, le confort mobilier ou la beauté conservée. Le producteur courant `group-driver.ts` transmet déjà `groupAmbientTemperature256` dans `ambientTemperature259` pour les schémas259et suivants ; `group-provision-age.ts` calcule l'air de la vraie tuile et refuse une tuile inconnue. **Ce chemin ne possède pas de repli21°C.** Le raccord de pensée transmet ce même air pour le schéma282et suivants, sans reconstruire unWorld de la carte d'origine.
- **Archives/WorldPawns et suspension** : la validité d'une pensée hors carte n'autorise pas l'intégration des besoins d'un propriétaire non interactif. Conserver les gels/horloges et le repli21°C propre à l'ownerWorldPawn existant ; ne pas l'emprunter pour une caravane.

## Horloges et intégration de l'humeur

Need_Mood et ses pensées sont évalués via la cadence de besoins150ticksCore ; le cache social100ticks repéré dans SituationalThoughtHandler n'est pas une durée de la pensée chaude/froide. Need_Seeker fait converger la jauge : baseMood0,32, hausse0,12/heure, baisse0,08/heure dans les defs lues. L'énumération d'une situation courante et la progression de la jauge sont deux opérations distinctes.

Mood possède `freezeWhileSleeping`; il n'ajoute pas `freezeInMentalState`. L'éveil natif dépend de CanBeAwake puis du job réellement endormi. Être à terre ou en crise mentale n'est donc pas en soi une absence de sensation. Un voyageur au repos n'est pas automatiquement un job de sommeil sur carte. La cryostase, la mort et le gel actuel de l'humeur conservent leurs propres refus ; le nouveau lecteur ne doit déclencher ni dose clinique, ni anniversaire, ni tirage, ni avancement de mémoire.

**Adaptations Elsewhere conservées** : dixCoreticks par ticklocal, progression d'humeur et calendrier actuellement livrés, silhouettes/rendu originaux et catalogue d'habits existant. La situation est dérivée de l'état présent, sans nouvelle mémoire ni trace persistante ; schéma282inchangé pour le périmètre retenu. Les anciennes versions restent littérales avant282. Aucun jour d'exposition, humeur, maladie ou histoire n'est offert aux sauvegardes par ce raccord.

## Décisions et limites du lot

**Adopter** EnvironmentCold/Hot sur humains représentés carte/caravane, seuils et offsets, vraie température du propriétaire et isolation portée ; utiliser le même lecteur pour simulation et inspection. Préserver patients/captifs, horloges/RNG/clinique et évolution progressive de la jauge. Capturer/prêter les lecteurs thermiques de phase déjà disponibles ; aucun parcours global de terrain ou travail par image ajouté.

**Adapter** le calcul aux autorités locales de température/habillement et à l'horloge existante ; distinguer ces adaptations d'une reproduction des caches et tirages internes natifs. Une simple température extérieure générique n'est pas une pièce et21°C n'est pas une caravane.

**Différer** les souvenirs SleptInCold/SleptInHeat : ils ont−4, durée1jour et des observations de tâche de couchage distinctes. Leur comparaison native utilise la plage abstraite de race, **sans l'isolation des vêtements**, contrairement aux situations. Leurs échéances/interruptions/PRNG et reprises exigeraient un autre contrat ; ils ne sont pas implicitement livrés parV460. Aucun nouveau besoin thermique, précepteDLC, maladie ou chauffage ajouté.

**À vérifier dans la qualification du produit**, sans résultat acquis par cette note : frontières0/10/20/30 et valeurs confortables exactes ; port/retrait d'un habit réel au même tick ; air pièce/porte/porteur/extérieur ; même caravane avant/après vraie arête de tuile ; captif/patient conscient, sommeil/inconscience/suspension ; affection sans pensée et pensée sans affection ; cibleUI et simulation identiques ; sauvegarde entière, commandes et flux inchangés hors nouvelles situations. Les contrôles/natifs restent sous ROOT, muets et proportionnés. Aucun gainFPS, campagne complète ou domaine clos n'est annoncé ici.
