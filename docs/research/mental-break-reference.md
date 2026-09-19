# Crise mentale : recherche du 19 septembre 2026

Corpus relu via [adoption](reference-adoption.md) : chapitre 14, **SYS-082 / TEST-082** ; besoins SYS-076..081, ordre physique chapitres 8/9, sauvegarde 29. Adopter un comportement qui remplace vraiment travail/contrôle ; adapter cadence/navigation/présentation 3D ; différer le catalogue, traits SYS-084 et relations SYS-086..088. Les statuts du corpus ne constituent pas des preuves locales.

## Sources confrontées

- [Crises mentales, RimWorld Wiki](https://rimworldwiki.com/wiki/Mental_break) et [seuil](https://rimworldwiki.com/wiki/Mental_Break_Threshold) : descriptions, sommeil et niveaux. La première page contient des valeurs incompatibles avec les sources ci-dessous ; confiance limitée pour ses nombres.
- [Table des pensées](https://rimworldwiki.com/wiki/Thought) : catharsis +40, trois jours ; la formulation sur les interruptions ne concorde pas avec la branche médicale du miroir.
- [Classes, instantané du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) : MentalBreaker, MentalState/Handler/Def, MentalBreakWorker, WanderSad, JobGiver_Wander/Anywhere/GetFood/GetRest/ReactToCloseMeleeThreat, Pawn_HealthTracker, Pawn_FoodRestrictionTracker, FoodUtility, Pawn_PathFollower, Rand, classes de pensées/mémoires. Code communautaire dérivé, pas certification du binaire commercial.
- [Données Core, instantané du 26 avril 2026](https://github.com/GAarsin/Rimworld_Data/tree/673f1fc1792faf998cb40418bf5e01592e4a7966/Core/Defs) : MentalStates_Mood, Humanlike, SubTrees_Misc, Thoughts_Memory_Misc, Needs. Dépôt sans description, import annoncé de Defs/Patches ; dossiers Core/DLC distincts mais provenance moins forte qu’une distribution officielle. Ce miroir n’est pas une expérience indépendante.
- [Ludeon, correctif 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : postérieur aux miroirs et comprenant une correction de pensée. L’absence de mention d’une branche n’en certifie pas l’identité.

Les copies de travail ignorées sont dans `tmp/mental-break-reference` et `tmp/thoughts-reference`, avec commits figés. Le contrat publié porte les décisions, pas la préparation historique de tmp. Aucun code/asset du jeu n’est livré dans notre implémentation ; les règles sont réécrites dans nos frontières.

## Décisions et contradictions conservées

Le wiki des crises donne MTB **10/3/0,7 jours** et catharsis **+30**. Les classes datées donnent **4/0,8/0,5** et les XML modernes **+40**, également présent dans la table Thought. V65 retient ces derniers, avec confiance moyenne faute d’observation du build exact. Les seuils ordinaires sont 35, 35×4/7 et 35/7. Tests séparés, expositions strictes, plus de 2 000 Core, cooldown 15 000 Core éveillés ; pas une jauge qui déclenche automatiquement à zéro.

L’arbre SadWander contient un **PrioritySorter** avec nourriture ≤0,05 et repos ≤0,15. Relire uniquement TryGiveJob aurait manqué GetPriority : ce dernier refuse le sommeil volontaire sous Travail. Correction intégrée et testée ; le planning reste configurable sans ordonner directement le personnage. `Pawn_FoodRestrictionTracker.GetCurrentRespectedRestriction` renvoie null en état mental, y compris via FoodUtility/getter : exemption alimentaire adoptée explicitement, distincte d’une exception de famine.

L’état déclare `blockNormalThoughts=true`, mais une recherche sur les classes de cet instantané ne trouve que déclaration et affichage de diagnostic, aucun consommateur actif. Need_Mood n’a pas freezeInMentalState ; Joy l’a. V65 gèle les loisirs et garde la pensée/humeur normale selon éveil. Ce résultat ne prouve pas l’inutilité du champ dans toutes les versions.

La réaction de mêlée précède la branche non critique dans Humanlike, mais **son fournisseur refuse IsHavingMentalBreak** : ne pas déduire une riposte simplement depuis l’ordre de l’arbre. L’errance actuelle n’attaque/fuit donc pas automatiquement. Les autres dangers non implémentés ne sont pas simulés implicitement.

`MentalState.RecoverFromState` attribue la mémoire aux épisodes causés par humeur et arrête les jobs en conservant le coucher. La transition Downed de Pawn_HealthTracker appelle cette récupération avant nettoyage ; V65 donne donc catharsis après incapacité, malgré le wiki qui décrit autrement les interruptions. Le décès n’en reçoit pas. Arrestation utilise un autre nettoyage : **différée**, aucune extrapolation à tous les motifs d’arrêt.

Mémoire Catharsis : trois jours, cinq occurrences, facteur de groupe 0,75 ; au plafond, renouvellement de la plus ancienne. Une seule ligne agrégée dans l’inspection. Différence de cadence connue : échéances absolues locales, pas vieillissement Core à chaque intervalle de 150.

Les durées 40 000–60 000 Core ne sont pas une durée minimum absolue : recoverFromSleep permet la sortie anticipée. La marche Walk double le coût avec plancher 50 Core dans la référence ; ici facteur capturé, diagonales euclidiennes et délai terrain additif. Navigation uniforme parmi arrêts accessibles locaux plutôt que reproduction de RCellFinder. L’arête déjà engagée finit sans saut, cargaisons saturées conservées : adaptations physiques annoncées.

Un unique type de crise réduit fortement la distribution. Repli vers intensité inférieure conforme à la structure observée, **contenu partiel assumé** ; la fréquence globale et toutes les réponses humaines ne sont pas déclarées conformes à RimWorld. Les [contrats V65](../development/mental-break.md) et [preuves locales](../history/validation-mental-break-v65.md) précisent ce qui est réellement livré/testé.
