# Médicaments — recherche du 17 septembre 2026

Corpus relu : chap. 15 SYS/TEST-094 et 096 pour traitements/soins, chap. 8/9 SYS/TEST-051..054 pour engagements matériels, chap. 11 CAT-018 pour la famille de produits. **Adopter** soins physiques, plafonds, puissance, doses et qualités ; **adapter** contact cardinal et horloge entière ; **différer** acquisition complète, inventaire personnel, complications et ramassage opportuniste. Le [contrat V51](../development/medicines.md) est l'état local, pas une copie des statuts du classeur.

## Sources et degré de confiance

- [Herbal medicine](https://rimworldwiki.com/wiki/Herbal_medicine) : puissance 60 %, plafond 70 %, piles 25, pourriture 150 jours ; page consultée, révision indiquée 178686.
- [Glitterworld medicine](https://rimworldwiki.com/wiki/Glitterworld_medicine) : puissance 160 %, plafond 130 %, pile 25.
- [Doctoring](https://rimworldwiki.com/wiki/Doctoring) : comparaison des grades et traitement. La page principale Medicine a refusé une ouverture (403) ; ne pas la présenter comme entièrement lue.
- [Scenario system](https://rimworldwiki.com/wiki/Scenario_system) : trente médicaments dans les provisions Crashlanded. Repris seulement pour ce stock, pas comme validation de notre scénario complet.
- Implémentation primaire reproduite dans un miroir de code décompilé, commit identifié **2d508035082e7cb0c8e29e230d26bda6e546928f** : [TendUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/TendUtility.cs), [Medicine](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Medicine.cs), [HealthAIUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/HealthAIUtility.cs), [JobDriver_TendPatient](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobDriver_TendPatient.cs), [Toils_Tend](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Toils_Tend.cs), [MedicalCareUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/MedicalCareUtility.cs). Fichiers récupérés et lus, sans copier leur code dans le projet.

Confiance élevée sur les règles corroborées entre code et wiki ; moyenne sur la correspondance exacte de ce miroir avec un correctif commercial RimWorld 1.6 donné. Son commit n'identifie pas à lui seul l'exécutable. Les discussions communautaires trouvées pendant la recherche contredisent certains détails de multi-traitement et de qualité : elles servent de questions, pas d'autorité numérique. Aucun « 100 % conforme » déduit de ce corpus.

## Subtilités retenues

La sélection filtre par plafond du patient, puissance puis distance au patient, avec accès du médecin. Sans produit valide, le soin à sec reste possible si autorisé. Les inventaires de personnes et la récupération opportuniste figurent dans l'original mais n'existent pas encore dans nos contrats de portage ; leur absence est tracée.

Le groupe traité dépend du budget de vingt PV, **pas de la puissance du médicament**. La première cible est toujours incluse ; les suivantes trop grandes sont sautées, pas un arrêt définitif de l'énumération. Les membres manquants ne sont pas des `Hediff_Injury`, donc pas un groupe ordinaire. Le compteur de doses nécessaires simule ces groupes, une dose par opération. Le soigneur réserve la quantité nécessaire (dans la pile disponible), même pour un auto-soin urgent arrêté après la première opération ; conserver et déposer le reliquat est donc nécessaire.

L'expérience humaine est `500 × clamp(puissance × 0,7, 0,5, 1)` avant passion : 250/350/500 selon le produit. Le calcul a lieu avant la qualité. La qualité plafonnée reçoit une variation additive **distincte par plaie**, à nouveau bornée. La durée 600 ticks Core par vitesse n'est pas multipliée par la qualité ou le nombre de plaies traitées.

La réservation médicale d'une source accepte dix utilisateurs au maximum. Notre réservation quantitative reste partagée avec le transport ; cela ne certifie pas tous les arbitrages multi-factions ou tous les profils de réservations Core. La maladie, le tendable différé et les traitements chirurgicaux nécessiteront une nouvelle recherche avant leur ajout.
