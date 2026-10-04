# Validation V201 — animal local en rage

Contrôles du 4 octobre 2026, schéma 183. Le [contrat](../development/manhunter-v201.md) et la [recherche Core](../research/manhunter-core-v201.md) distinguent les règles vérifiées dans Core 1.6.4871 rev590 des adaptations d'agenda, d'horloge et de navigation. Ce lot ajoute une menace d'animal déjà présent, sans Scaria, meute ou nouvel asset.

## Contrôles ciblés et frontières

La passe finale regroupe **180 tests réussis dans 28 fichiers uniques**, sans ignoré ni échec (`tmp/v201/targeted-final.json`). Elle couvre sélection/agenda ThreatSmall et Misc voisin ; rage, navigation et combat ; fuite/défense automatiques avec l'animal comme seule menace ; tir et mêlée, poursuite V197 ; prédation, soins domestiques et sauvegardes ; bridge/snapshots, raids, audio/inspection, feu/flore, vomissement, déconstruction et catalogue public. Ce n'est ni la régression quotidienne complète, ni une campagne naturelle longue.

Les parcours exigent déplacement et contact réels, récupération conservée après tentative, fin des deux arêtes avant morsure, cible humaine endormie admissible et cible portée/downed refusée. Une cible qui continue de marcher est poursuivie au-delà du premier trajet sans pause de décision de 25 ticks. La frappe de porte est bornée ; sa destruction ou déconstruction libère l'intention sans retirer la récupération déjà engagée. La fin de rage annule uniquement la défense automatique. Mort, corps et produit suivent les producteurs existants, sans ingestion de la victime humaine.

La revue a trouvé deux conflits avec les occupations existantes : l'allumage effaçait une récupération et permettait une nouvelle attaque pendant la brûlure ; le vomissement pouvait supprimer le coup ou autoriser un nouveau coup dans les sous-pas. Les corrections sont exercées avec dégâts de feu et intoxication produits réellement, échéance physique, refus historique 182 et reprise exacte. L'effondrement d'épuisement décidé pendant une arête attend aussi son arrivée ; repos nul et PRNG mental restent privés.

Le schéma 182 est validé strictement avant changement du seul numéro vers 183. Aucun incident, calendrier, animal, état mental ou tirage n'est accordé à la migration. Champs futurs, combinaisons incompatibles, identités, horloges et PRNG invalides sont refusés. Changement de rage au même tick, adoption immutable et refus atomique de snapshot sont exercés ; le témoin précédent reste intact.

Un test historique Misc fabriquait un monde courant puis l'étiquetait 168 avec des permissions et états futurs. Sa préparation est réparée localement (politiques, faune, permissions de facture et champs ultérieurs), sans modifier une fixture publique, le produit, les migrations ni les assertions de refus. Les erreurs de typage des nouvelles fixtures de porte sont corrigées avec `orientation` et `footprint` réels. Les premiers journaux d'échec restent sous `tmp/v201/` ; seule la passe finale est annoncée verte.

Le build TypeScript/Vite final passe : **693 modules**, avertissement existant de chunks supérieurs à 500 ko (`tmp/v201/build-final.log`). Les **47 payloads publics** passent hash du contenu décodé, validation stricte, sérialisation exacte et **un tick réel de reprise comparée** (`tmp/v201/payloads.json`). Les 46 fiches historiques du manifeste sont identiques ; leurs sauvegardes ne sont pas régénérées. Ce contrôle court ne remplace pas leurs campagnes.

## Parcours Chromium préparé

Le fichier `tests/integration/manhunter-v201.spec.ts` passe **1/1**, en Chromium natif WebGPU, sans drapeau SwiftShader (`tmp/v201/native-r1.log`). Chargement par le vrai catalogue, première rage à **20400** depuis la scène préparée à **20399**, inspection/alerte, contexte musical `tension`, occupants sains derrière la porte fermée, poursuite à **20402**, sauvegarde/rechargement exact puis ordre bridge de défense et blessure réellement produite à **20407**. Le cue de menace n'est émis qu'une fois et reste silencieux au rechargement. **77 pipelines avant/après reprise et au contact**, zéro erreur observée. Captures et rapport : `tmp/test-runs/v201-native/artifacts/manhunter-v201-*`.

Ce parcours vérifie une chronologie préparée et les branchements audio ; il n'établit ni fréquence naturelle, écoute humaine, parité exhaustive, coût GPU ou FPS général. La 47e fiche « Animal en rage · abri et défense » prépare seulement acteurs, refuge et horloge, sans rage, chemin, blessure ou victoire injectés.

## CPU isolé et limites de charge

Sources produit gelées avant les passes successives : build/contrôles courts, **CPU**, parcours natif puis présentation. Microbanc `scripts/profile-manhunter-v201.ts`, Node 24.11.1, AMD Ryzen 5 3600, carte préparée **250×250** ; captures navigation/occupation réutilisées, 12 chauffes et quatre blocs de 40 consultations par cas (`tmp/v201/cpu-acquisition.json`). Génération, préparation des captures, tick complet, worker, bridge, rendu et GPU sont exclus ; aucune comparaison avant/après n'est prétendue.

| Consultation | Médianes des quatre blocs | p95 des quatre blocs | Champs / cellules visitées |
| --- | --- | --- | --- |
| Humain exposé à quatre cellules, trajet réel de trois cellules | 0,659–0,782 ms | 0,926–2,677 ms | 1 / 29 |
| Humain inaccessible dans une enceinte 5×5 | 11,252–11,324 ms | 11,612–12,079 ms | 1 / 62475 |

Le cas inaccessible reste coûteux : le champ peut épuiser la composante accessible. Le budget tournant conserve **une recherche animale principale par tick**, partagée avec les occupations existantes, avec attente après refus et sans recherche dans les sous-pas de combat. L'agenda lit les points seulement à l'ouverture d'un cycle et collecte les animaux seulement à une occasion ; les colons partagent une liste clairsemée des menaces vivantes pour leur phase de décision. Aucun nouveau lot GPU, modèle ou asset n'est créé, mais la stabilité des pipelines ne prouve pas un coût GPU nul.

## Présentation et entretien documentaire

`npm run test:presentation` passe après le parcours V201, sur sources inchangées : graine 42, carte **250×250**, trois colons, minage puis abattage pendant 45 secondes chacun, changements 1×/6×/1×/3×. Chromium WebGPU matériel **AMD / rdna-1**, viewport 1440×1000 ; **10804 / 10665 images**, p95 intervalle image **4,3 ms** pour chaque action. Zéro erreur, saut, dépassement continu de trajet confirmé, occupation solide ou starvation détectée. Les compteurs bruts de piste future (`gapCount`) restent 153/186 ; ils ne constituent pas une preuve d'absence universelle d'attente. Rapport et captures : `tmp/test-runs/v201-presentation/artifacts/harvest-*`. Ces intervalles d'image ne mesurent ni durée GPU ni gain causal du tick ; la scène de travail n'est pas une campagne de rage animale.

Le contrôle documentaire passe : **689 documents, 6663 liens locaux**, 25 domaines et cinq familles de validation conservés, six en-têtes au schéma 183 et trois sources originales inchangées. Roadmap, inventaire, guide, catalogue, adoption du corpus et instructions renvoient au contrat et à cette preuve. `git diff --check` passe. La recherche est paraphrasée ; la décompilation propriétaire reste sous `tmp/`.

Régression exhaustive, campagne naturelle longue, fréquence finale des incidents et mesure GPU/worker globale restent non exercées. G3/G4 restent ouverts ; après commit local, attendre la relance en mode jour.
