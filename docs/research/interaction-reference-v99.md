# Sélection, gestes visibles et mobilisation — référence V99

Relecture du 24 septembre 2026, sans mods. Périmètre : gestes de sélection, dossiers d'un animal sauvage, barres de progression, chemin d'un pion sélectionné et commandes tactiques. Corpus concerné : chapitres 8, 13, 20 et 21 ; UI-001..011, UI-017/018, SYS/TEST-035 et SYS/TEST-113..117. Les identifiants délimitent les questions, sans attester que leur contrat est déjà satisfait.

## Provenance et hiérarchie

La source déterminante est l'installation locale **Core 1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/Version.txt`, `Data/Core/Defs/ThingDefs_Races/Races_Animal_Base.xml`, `Data/Core/Defs/Misc/KeyBindings/KeyBindings.xml` et `RimWorldWin64_Data/Managed/Assembly-CSharp.dll` (SHA-256 déjà relevé dans la [référence V92](colonist-interface-reference-v92.md) : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`). Lecture seule ciblée avec ILSpyCmd 8.2.0.7535 ; sorties de travail dans `tmp/interaction-reference-v99/`, sans code ni XML propriétaire reproduit dans cette note.

Recoupements publics consultés le 24 septembre : [contrôles du wiki](https://www.rimworldwiki.com/wiki/Controls), [ordres du wiki](https://www.rimworldwiki.com/wiki/Orders), [Drafting](https://rimworldwiki.com/wiki/Draft), [annonce officielle de Core 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) et [correctifs officiels 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/). Les pages wiki ne fixent pas à elles seules les détails de 1.6.4871. La [recherche V53](drafting-reference.md), basée sur un miroir antérieur, est corrigée ici par les classes locales. Aucun lancement du jeu ni capture native n'a été fait pour cette note : les couleurs de textures intégrées, l'ordre visuel des onglets et la sensation d'usage restent à vérifier par l'UI.

## Sélection de la carte

`Selector`, `ThingSelectionUtility` et `SelectionDrawer` donnent les règles suivantes :

| Geste | Constat Core local | Conséquence V99 |
|---|---|---|
| Clic simple | Prend un objet sélectionnable sous le pointeur ; un colon de la barre est prioritaire. Sans Maj, remplace la sélection ; avec Maj, ajoute ou retire. Un clic répété au même emplacement parcourt les objets superposés, y compris pion, pile et bâtiment. | Ne pas forcer la priorité permanente d'une pile devant un animal ou inversement ; permettre le cycle. |
| Double clic | Ajoute les objets équivalents **visibles à l'écran**. Pour les pions : même faction, même faction d'accueil et race équivalente (avec condition supplémentaire de mutation) ; pour les autres : même définition. | Un double clic sur animal sauvage sélectionne ses congénères visibles, sans mélanger animaux domestiqués et sauvages. |
| Rectangle | Prend la première catégorie non vide, dans l'ordre : colons humains/méchanoïdes joueur, humains, ressources, tous pions, autres objets. Les colons sont triés comme la barre. Maj ajoute au lieu d'effacer. | Un rectangle mêlant colons et animaux ne sélectionne que les colons ; un rectangle sans humains peut sélectionner les animaux. |
| Éligibilité | Définition sélectionnable, pion non caché, objet présent et non occulté par brouillard ; `neverMultiSelect` exclut du rectangle/double clic, pas nécessairement du clic simple. | Le rendu ou la silhouette seule ne décide pas de l'identité sélectionnée. |

Le wiki corrobore clic, double clic, glisser, Maj et touche de cycle des piles ; les priorités et équivalences ci-dessus proviennent du binaire local. Core n'assure pas qu'un choix unique reste possible quand plusieurs objets occupent exactement le même pixel : le cycle et la sélection par liste sont les voies vérifiables.

## Animal sauvage ordinaire, sans faction

`BasePawn` déclare de nombreux dossiers candidats. Leurs prédicats dans `ITab_Pawn_*` et l'initialisation par `PawnComponentsUtility` donnent le résultat **Santé, Social et Journal** pour un animal sauvage non ToolUser. Le bouton d'informations générales est distinct des dossiers.

| Dossier candidat | État sauvage Core 1.6.4871 | Cause |
|---|---|---|
| Santé | visible | Pas de prédicat de visibilité supplémentaire ; montre corps, lésions et états médicaux. La présence du dossier n'autorise pas automatiquement une opération. |
| Social | visible | Animal charnel (`RaceProps.IsFlesh`), hors entité Anomaly. Des champs sociaux peuvent être vides. |
| Journal | visible | Dossier déclaré sur BasePawn, sans prédicat propre. Entrées seulement si événements enregistrés. |
| Besoins | masqué | `ITab_Pawn_Needs.IsVisible` refuse explicitement `RaceProps.Animal && Faction == null`, même si des besoins existent en simulation. |
| Bio | masqué | Exige `story`, initialisé pour Humanlike uniquement. |
| Dressage | masqué | Exige entraînement et faction du joueur ; l'entraînement n'est pas initialisé pour animal sans faction. |
| Équipement | masqué normalement | Exige inventaire non vide, vêtement porté ou équipement. L'animal ordinaire non ToolUser n'a pas les deux trackers de port. |
| Invité/Prisonnier | masqué | Conditions d'accueil/captivité non satisfaites. |

La [référence d'interface V92](colonist-interface-reference-v92.md) décrivait les dossiers d'une personne ; sa liste ne doit pas être appliquée telle quelle à la faune. Afficher une jauge faim/soif d'animal sauvage dans Lisière peut être utile, mais serait un choix local et non la disposition Core vérifiée.

## Barres et trajets

`ToilEffects.WithProgressBar` attache une barre à un **geste explicite** pendant son exécution, seulement si l'acteur appartient à la faction du joueur. L'ancre par défaut est la cible du travail, avec option de placer la barre entre acteur et cible ; elle n'est pas systématiquement au-dessus du pion. `Toils_Recipe` la met au poste de recette, `JobDriver_Mine` à la roche, `JobDriver_TendPatient` sur le patient et `JobDriver_FoodFeedPatient` sur la cible du court geste. `JobDriver_ConstructFinishFrame` n'appelle pas ce helper pour son travail principal. `Toils_General.WaitWith` ne l'ajoute que lorsque le demandeur passe `useProgressBar=true`. La valeur est bornée entre 0 et 1, l'effet est nettoyé à la fin du geste. `MoteProgressBar` a un fond gris sombre et un remplissage jaune doré translucide (RGBA environ `0.9, 0.85, 0.2, 0.65`). Il apparaît au zoom **Closest** et hors mode capture ; l'option `alwaysShow`/classe dédiée le permet aussi aux autres zooms. Ainsi, généraliser une barre à manger, transport ou chaque activité serait une adaptation non prouvée de Core. Une limite de distance équivalente dans la caméra 3D devra être choisie et annoncée comme adaptation.

`SelectionDrawer` demande les compléments de **chaque objet sélectionné**. Pour un pion `IsPlayerControlled`, `Pawn.DrawExtraSelectionOverlays` dessine le chemin calculé courant s'il existe, puis les liens vers les cibles et ordres en file. `PawnPath.DrawPath` trace les nœuds restants et relie la position visuelle du pion au prochain nœud ; aucun tracé si chemin absent, non trouvé ou terminé. Cette vue concerne donc le trajet réellement suivi d'un colon sélectionné, civil ou mobilisé, et pas une destination simplement envisagée. Le traçage de débogage `Pawn_PathFollower.PatherDraw` a une garde distincte `DebugViewSettings.drawPaths`, sans remplacer le tracé normal de sélection. Le matériau normal `GenDraw.DrawLineBetween` est `ThingLine` teint **blanc** dans la DLL ; la texture empaquetée n'a pas été inspectée visuellement. Un trait bleu explicite est une adaptation de présentation demandée pour Lisière, pas une couleur RGB établie par cette lecture.

## Mobilisation et clic droit

`KeyBindings.xml` donne **R** à `Command_ColonistDraft`. `Pawn_DraftController` fournit un bouton bascule Mobiliser/Démobiliser à un pion contrôlable ; il est désactivé si à terre ou en repos mortuaire, avec exceptions liées aux extensions. Le contrôleur ne conditionne pas le bouton à la possession d'une arme. Basculer efface les priorités et la file précédentes, interrompt le travail admissible ; démobiliser libère les réservations de destination, puis la logique civile reprend. Plusieurs colons sélectionnés reçoivent chacun le bouton groupable ; le refus d'un colon incapable ne doit pas autoriser indirectement son action.

`Selector` obtient les options du clic droit pour les pions sélectionnés. `FloatMenuOptionProvider_DraftedMove` propose Aller ici vers une cellule de station admissible proche du clic, après contrôle de chemin. Une option unique auto-prenable peut être exécutée immédiatement ; un groupe utilise le contrôleur de déplacement réparti. Maj permet de mettre des ordres successifs en file, conformément aux [contrôles](https://www.rimworldwiki.com/wiki/Controls) et aux [ordres](https://www.rimworldwiki.com/wiki/Orders) publics, mais le comportement de chaque action dépend de son option et du planificateur ; une file n'est pas une réservation de tous les segments futurs.

`FloatMenuOptionProvider_DraftedAttack` donne des options d'attaque sur cible destructible hostile, bâtiment spécial attaquable ou pion non humain/homme sauvage même neutre. Un humain allié ordinaire ne passe pas ce filtre. En sélection simple, tir et mêlée sont des choix **distincts**, sous réserve de capacité/arme/accès ; une option impossible peut exposer sa raison. La cible hostile a priorité élevée et peut être auto-prise, l'animal neutre priorité très basse et demande normalement le choix explicite. En groupe, une option commune applique le meilleur geste disponible pour chaque pion (tir puis mêlée). Le tir automatique à volonté est un autre état : `FireAtWill` appartient au contrôleur de mobilisation et n'est pas l'ordre contextuel d'attaquer une cible. Les détails d'acquisition de cible, dommage et hostilité sont traités dans les recherches combat ; cette note ne les réouvre pas.

## Limites utiles à l'intégration

- Haute confiance : structure et prédicats lus dans Core local, touche R, catégories de rectangle, équivalence de double clic, cible des barres et chemin des pions joueur sélectionnés.
- Moyenne confiance : rendu perçu de `ThingLine`, correspondance d'un seuil `Closest` avec la caméra 3D, contenu social/journal effectivement rempli sur un animal donné. Ces points réclament une observation UI si la fidélité visuelle est revendiquée.
- Dans Lisière V99, un trait bleu et des barres au-dessus des travailleurs sont des adaptations de présentation explicites. L'absence de données Social/Journal pour la faune locale justifie de ne pas créer des dossiers vides ; l'Informations générales et la Santé exposent les données réelles disponibles.
- La recherche n'autorise ni import de code décompilé, ni ajout de données non simulées à un dossier, ni affirmation d'une parité complète de l'interface ou du combat.
