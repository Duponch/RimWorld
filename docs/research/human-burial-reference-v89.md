# Dépouilles humaines et sépultures — référence V89

Recherche du 20 septembre 2026, Core local **1.6.4871 rev590**, sans extension. État : règles vérifiées et implémentation en préparation ; ce document ne constitue pas une validation jouée. Le [contrat](../development/burial.md) sépare les adaptations et limites. La [référence commune](core-reference-baseline.md) distingue une règle de code, une observation et un choix du projet.

## Corpus et décisions

Les chapitres 8–9 imposent réservation puis prélèvement, transport et dépôt physiques ; les chapitres 14–15 distinguent personne, anatomie, incapacité, décès et conteneur. `SYS-048/051/052/054` et leurs `TEST` servent au scénario de concurrence, interruption et destination supprimée. `SYS-088/096/097` exigent la conservation des références au défunt et du dossier anatomique ; conserver ces références ne livre pas tous les effets sociaux du deuil. `CAT-087` classe le corps comme objet fonctionnel. Adoption de ces invariants, adaptation de leur représentation aux collections de Lisière. Aucune suite ni architecture n'est générée mécaniquement à partir du classeur.

## Preuves primaires et versions

L'installation est consultée en lecture seule : `Version.txt`, `Data/Core/Defs/ThingDefs_Buildings/Buildings_Misc.xml`, `ThingDefs_Races/Races_Humanlike.xml`, `Races_Animal_Base.xml`, `Stats/Stats_Basics_General.xml`, `TerrainDefs/Terrain_Natural.xml` et `WorkGiverDefs/WorkGivers.xml`. Lecture ciblée de `Assembly-CSharp.dll` : `Building_Grave`, `Building_CorpseCasket`, `Building_Casket`, `Corpse`, `ThingDefGenerator_Corpses`, `CompRottable`, `CompSpawnerFilth`, `CompAssignableToPawn_Grave`, `WorkGiver_HaulCorpses`, `Verse.AI.JobDriver_HaulToContainer`, `Thing.DoTick`, `ThingOwner` et `GasUtility`. Les extractions restent dans `tmp/burial-reference-v89`, exclu de publication. Aucun XML, code décompilé ou enregistrement personnel n'est reproduit ici.

Recherches Internet fraîches et confrontation :

- L'[annonce officielle de la mise à jour gratuite 1.4](https://ludeon.com/blog/2022/10/biotech-expansion-announced-update-1-4-on-unstable-branch/), 5 octobre 2022, distingue les gaz de putréfaction et leur maladie des seules salissures. Son contexte mêle présentation de Biotech et mise à jour Core : la localisation de l'annonce n'est pas une preuve de dépendance à l'extension. V89 ne revendique pas cette chaîne gazeuse.
- La [présentation officielle des robots de travail](https://ludeon.com/blog/2022/10/biotech-preview-1-mechanitor-infrastructure-and-labor-mechs/), 8 octobre 2022, confirme le lien transport de corps → tombe. Les robots appartiennent à Biotech et restent exclus ; la valeur de cette source porte uniquement sur l'interaction décrite, pas sur les coefficients Core actuels.
- La [mise à jour officielle 1.1.2647](https://ludeon.com/blog/2020/05/update-may-2020/), 27 mai 2020, décrit la méditation morbide près de sépultures. Cela ne justifie ni un bonus de repos ni l'ajout de Royalty au périmètre Core de Lisière.

Ces articles établissent le contexte fonctionnel, pas les valeurs de la version installée. Les discussions de forums, anciens miroirs décompilés et synthèses secondaires repérés ne certifient pas 1.6.4871. Les règles ci-dessous viennent des Defs/classes locales. Une lecture statique est une preuve de comportement programmé, pas une observation d'une partie exécutée.

## Tombe Core

| Propriété | Valeur vérifiée | Adoption Lisière |
|---|---|---|
| Emprise | 1×2, orientation possible | Même convention d'ancre que le lit |
| Construction | Aucun matériau, 800 unités de travail Core | 80 ticks locaux de travail neutre, vitesse Construction commune |
| Dépôt du corps | 500 ticks Core, attente fixe | 50 ticks locaux au contact ; aucune XP inventée |
| Terrain | Affordance `Diggable` | Terre, herbe, terre riche, gravier ; pas roche/eau/sol artificiel |
| Passage | `Standable` | Traversable ; aucune couverture ni support de toit |
| Résistance | Aucun PV | Pas de cible destructible par dégâts ; déconstruction possible |
| Zones | Superposition interdite | Stockage/culture incompatibles sous l'emprise |
| Capacité | Un seul corps | Réservation exclusive corps + tombe |
| Acceptation initiale | Corps humains, priorité `Important` | Colons et étrangers activés, réglages explicites |
| Affectation | Colon vivant ou dépouille coloniale présente | Affectation nominative ; priorité sur filtre générique |
| Déconstruction | Restitue le contenu à proximité | Préplanifie une cellule libre avant tout retrait ; aucun remboursement matière |

Le transport appartient au travail Transport (`Hauling`), avec capacité de manipulation. Le conducteur de tâche réserve le corps et une place dans le conteneur, prend physiquement l'objet, rejoint la tombe, attend le délai puis transfère le contenu. Construire une tombe vide et y déposer le corps sont deux opérations.

## Vieillissement : distinction importante de version

Les définitions de corps charnels utilisent 2,5 jours thermiques avant putréfaction, puis 5 jours thermiques avant dessiccation. Le débit dépend de la température : nul à ≤0 °C, linéaire entre 0 et 10 °C, plein à ≥10 °C. Le cadavre humain conserve la personne et l'anatomie ; ses 100 PV d'objet sont distincts des PV de chaque partie corporelle. Masse de base 60, inflammabilité 0,7. La destruction du cadavre retire aussi les équipements, vêtements et inventaires encore attachés ; elle ne doit pas retirer une arme déjà déposée.

**La tombe locale 1.6.4871 suspend le contenu.** `Building_CorpseCasket.ShouldTickContents` renvoie faux ; `Thing.DoTick` s'arrête avant de faire avancer ce contenu, et `Building_Grave` n'ajoute pas de progression de remplacement. La phase de pourriture est donc conservée pendant l'inhumation. L'âge civil depuis le décès continue d'augmenter. Séparément, `preventDeteriorationInside` interdit les dégâts de pourriture quand un composant est effectivement avancé. Ne pas confondre ces deux protections ni extrapoler des descriptions plus anciennes d'un corps qui pourrit en tombe.

Le Core possède aussi une détérioration extérieure de 1 PV/jour et des dégâts par jour thermique entier : 2 PV en putréfaction, 0,7 PV arrondi aléatoirement après dessiccation. Ces dégâts spontanés ne sont pas encore présents dans le contrat historique V79 de Lisière ; leur adoption ou report doit rester explicite, sans transformer l'âge seul en disparition. Le feu suit le système de dommages d'objet partagé.

La bile est une salissure au sol distincte d'une infection et du gaz de putréfaction. `CompSpawnerFilth` prépare une échéance d'un jour au premier contrôle admissible, puis émet quotidiennement seulement au stade putréfié. Le rayon 0,1 revient à la cellule du corps. Un corps porté n'a pas de cellule de carte propre pour ce dépôt, mais son échéance de composant continue d'avancer ; la tombe suspend le composant entier. L'état d'échéance persiste ; aucun dépôt rétroactif n'est reconstruit pour les morts historiques.

## Limites de cette tranche

Sarcophages, art funéraire, visites de tombe comme loisir, rituels, crématorium, boucherie humaine, ingestion de cadavres, prélèvement chirurgical, résurrection, gaz de putréfaction et maladie pulmonaire restent distincts. Les références sociales sont conservées ; la totalité des pensées de deuil n'est pas annoncée. Les anciens morts n'ont aucun historique thermique exploitable : l'adoption débute au premier pas V89, conserve la date réelle du décès et ne fabrique pas leur état antérieur.
