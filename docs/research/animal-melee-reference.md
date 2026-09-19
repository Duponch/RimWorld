# Mêlée animale — confrontation du 19 septembre 2026

Corpus relu : chapitres 11/12 (production et chaîne alimentaire), 13–15 (corps/capacités), 20/21 (combat/navigation) ; SYS/TEST-089..091,096,098..112,121..125. **Adopter** contact, anatomie, conséquences et séparation fuite/riposte/manhunter ; **adapter** représentation 3D, horloge ×10 et recherche spatiale ; **différer** chasse/dépouille/boucherie, écologie et élevage ; **vérifier** chiffres et incompatibilités avec plusieurs sources. S13/S15/S18 restent partiels.

Sources relues/téléchargées pour ce lot, et non simple reprise de V77 :

- [Hare](https://rimworldwiki.com/wiki/Hare), [Melee Hit Chance](https://rimworldwiki.com/wiki/Melee_Hit_Chance), [Melee Dodge Chance](https://rimworldwiki.com/wiki/Melee_Dodge_Chance) : outils, absence de manhunter ordinaire, score de toucher sans compétence +4, courbes de capacité. Wiki communautaire et page Dodge incomplète ; ne constitue pas le binaire de référence.
- Classes du [miroir daté du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) : `RimWorld/Verb_MeleeAttack.cs`, `RimWorld/Pawn_MeleeVerbs.cs`, `RimWorld/JobGiver_ReactToCloseMeleeThreat.cs`, `Verse.AI/Pawn_MindState.cs`, `Verse/DamageWorker_Blunt.cs`. Copie de travail dans `tmp/animal-melee-reference`, non requise pour construire le projet. Miroir public, pas une source officielle de patch ni une dépendance incorporée.
- [Correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : postérieur au miroir. Il comprend notamment une correction du rendement de boucherie affectant les blocs. Ne pas annoncer la parité du patch courant à partir du seul miroir de mai.
- [Hunt](https://rimworldwiki.com/wiki/Hunt), [Corpse](https://rimworldwiki.com/wiki/Corpse), [Butcher spot](https://rimworldwiki.com/wiki/Butcher_spot), [Butcher table](https://rimworldwiki.com/wiki/Butcher_table) : vérifiés pour la dépendance suivante ; chasse avec arme à distance, achèvement au contact, transport et transformation du corps distincts. Aucune de ces recettes n'est livrée par V78.

## Décisions et incertitudes

| Règle | Vérification et décision |
|---|---|
| Riposte malgré manhunter nul | `Verb_MeleeAttack` enregistre la menace **avant** toucher/esquive ; le job de réaction commande une attaque, pas une crise. Adopté, avec test d'un coup manqué suivi d'une morsure réelle. |
| Mémoire | `MeleeThreatStillThreat` exige une cible présente, active/éveillée, dans trois cellules, vue directe ; temps inclusif jusqu'à dernier dommage +400 Core. Adopté ; visibilité réutilise notre tracé commun, non le moteur propriétaire. |
| Attaque réactive | Job `AttackMelee`, une attaque, échéance 200 Core. Adopté avec récupération séparée ; la mémoire peut susciter un nouveau job. Notre recherche locale limite les détours aux trois cellules, divergence spatiale assumée pour cette réaction courte. |
| Toucher/dégâts | Lièvre : dents 3,4 Bite et tête 1,5 Blunt, récupération 120 Core ; sélection des outils par DPS pondéré dans la classe datée. Score sans compétence +4 → 62 % sain, pas l'ancienne constante 60 %. Pénétration conservée à 1,5 % du dommage de l'outil, avant variation aléatoire. |
| Étourdissement | `DamageWorker_Blunt` divise par les PV maximum du tronc de la race. Correction de généralisation : 16 chez le lièvre, 40 chez l'humain ; les règles humaines existantes ne changent pas. Durée 45 Core toujours calibration V59, sources historiques divergentes. |
| Fuite/besoins | Tentative de mêlée interrompt l'ingestion et le sommeil ; nouveau tir peut remplacer la menace par la fuite, en conservant la récupération déjà engagée. Besoins continuent ; pas de nutrition acquise par interruption. Pas de copie du think tree complet. |
| Filière suivante | Corpus et sources imposent corps physique puis transport/boucherie ; aucune ressource créée directement au coup fatal. Ne pas interpréter cette tranche comme une chasse complète. |

Certitude élevée sur les branches observées du miroir et leurs tests internes ; moyenne sur les chiffres/contenus confrontés au wiki ; parité binaire de la dernière version non certifiée. Les cas contrôlés du prototype ne prouvent pas une couverture exhaustive.
