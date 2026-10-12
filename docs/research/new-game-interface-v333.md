# Nouvelle partie — références d’interface V333

Recherche du 12 octobre 2026. La clarification humaine fixe **les mêmes structures, menus, boutons, agencements, écrans et interactions que RimWorld, avec la charte actuelle d’Elsewhere**. La palette sombre, les illustrations, les textures, le code et les assets propriétaires ne sont pas à recopier. Une correspondance de structure ne certifie pas la parité des règles ou du contenu.

Cette note documente les références. Les changements livrés, contrôles, résultats et limites du produit sont consignés par ROOT dans la note gameplay unique.

## Vidéo primaire : pixels effectivement consultés

[MysteriousFawx, « New to Rimworld? Start HERE! Play Along Tutorial [1.6] »](https://www.youtube.com/watch?v=Vmg5dzonKq4), 23 septembre 2025. Aucun mod/DLC annoncé à 2:12 ; échelle 1,25 à 3:18 ; chargement 13:36 : Core seul, « Mods: None ».

| Repère | Nature de l’observation |
|---|---|
| [4:36](https://www.youtube.com/watch?v=Vmg5dzonKq4&t=276s) | Pixels : scénarios à gauche, description à droite ; quatre scénarios de base, Custom, Steam Workshop. |
| [7:23–9:33](https://www.youtube.com/watch?v=Vmg5dzonKq4&t=443s) | Transcription : monde, Generate 7:49, site, Next 9:27, confirmation 9:30, colons 9:33. |
| [9:40](https://www.youtube.com/watch?v=Vmg5dzonKq4&t=580s) | Pixels : Selected 3, Left behind 5, Drag to reorder ; dossier central ; Randomize en haut à droite ; Back/Start en bas. |
| [10:03](https://www.youtube.com/watch?v=Vmg5dzonKq4&t=603s) | Pixels : candidats modifiés ; geste complet non attesté. |
| [13:41](https://www.youtube.com/watch?v=Vmg5dzonKq4&t=821s) | Pixels : carte jouable après chargement. |

Dossier 9:40 : trois champs de nom/portrait, parcours/traits/incapacités à gauche, douze compétences au centre, santé/relations à droite, Team skills 4×2. Boutons d’information visibles ; dialogues non consultés.

Patch exact inconnu ; montage susceptible d’omettre un dialogue. Les pixels monde/narrateur/site n’ont pas été acquis avant l’indisponibilité du navigateur externe. Aucun récapitulatif général attesté.

## Installation Core : faits établis par les classes et définitions

L’installation lue est `E:/Steam/steamapps/common/RimWorld`, dont `Version.txt` indique **1.6.4871 rev590**. Les classes proviennent des sorties temporaires d’inspection de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, confrontées aux XML installés. La [référence Core](core-reference-baseline.md#sources-et-hiérarchie-de-preuve) consigne la provenance, l’outil et l’empreinte de l’assembly ; cette empreinte n’a pas été recalculée pour la présente note. Aucune sortie de classe ou ressource du jeu n’est ajoutée au dépôt.

Les [captures utilisateur historiquement examinées](../development/new-game-menus.md#référence-et-choix-retenus) corroborent, dans 1.6.4871, narrateurs à gauche, difficulté/mode de sauvegarde au centre, illustration à droite et Retour/Suivant en bas. Elles ne constituent pas de nouvelles captures obtenues pendant V333.

| Classes / définitions | Faits retenus |
|---|---|
| `Page_SelectScenario`, `Scenario.GetConfigPages`, `GameInitData` | Parcours Core : scénario → narrateur/difficulté/mode de sauvegarde → paramètres du monde → site → personnes. Les extensions peuvent ajouter des pages. |
| `Page_SelectStoryteller` | Narrateur initial selon l’ordre des définitions ; hors développement, difficulté et mode de sauvegarde doivent être choisis. Cassandra/Récit d’aventure est le périmètre humain retenu, pas une difficulté universellement préselectionnée. |
| `Page_CreateWorldParams` | Graine textuelle aléatoire ; couverture Core sans Odyssey 30 %, pluie/température/population normales ; génération explicite. La branche Odyssey choisit 50 %, donc ses captures ne certifient pas les valeurs sans DLC. |
| `Page_SelectStartingSite` | Proposition aléatoire et sélection d’un site admissible ; validation du site avant la page suivante. |
| `Scenarios_Classic.xml`, `ScenPart_ConfigPage_ConfigureStartingPawns` | Crashlanded : **trois sélectionnés parmi huit candidats**. Ce nombre dépend du scénario ; ce n’est pas une propriété de tout départ. |
| `Page_ConfigureStartingPawns` | Liste verticale à gauche, dossier à droite, résumé d’équipe dessous, Retour/Démarrer en bas. Valeurs de mise en page dans les classes : liste 140 unités UI, ligne 60, résumé 127 de hauteur ; elles ne sont pas des pixels physiques indépendants de l’échelle. |
| `StartingPawnUtility.DrawPortraitArea` | Santé puis relations si présentes, possessions si présentes ; ces sections varient réellement avec le candidat. Aucun éditeur manuel de relation n’est établi par cette page. |

### Sélection, relance et résumé de compétences

Les **trois premières places** de la liste sont les personnes sélectionnées. Le glisser réordonne candidats et requêtes de génération ; passer la frontière Selected/Left behind change l’équipe. Cliquer une personne ouvre son dossier sans l’ajouter automatiquement au départ. `RandomizePawn` régénère le candidat courant avec des tentatives bornées pour la couverture des travaux ; ce n’est pas un simple tirage indépendant de douze scores.

`StartingPawnUtility.DrawSkillSummaries` ne présente que les huit compétences marquées `pawnCreatorSummaryVisible` dans `Skills.xml` : Tir, Mêlée, Construction, Minage, Cuisine, Plantes, Médecine et Intellect. La disposition est quatre colonnes de deux lignes. Animaux, Artisanat, Art et Social restent dans le dossier individuel.

`FindBestSkillOwner` choisit, **parmi les trois sélectionnés**, une compétence utilisable plutôt qu’une compétence totalement interdite, puis le niveau supérieur ; à niveau égal, la passion supérieure départage. Une égalité restante conserve l’ordre de la sélection. Le résumé désigne donc le **meilleur titulaire utilisable**, avec son identité, et non une somme, une moyenne ou le maximum brut d’une personne incapable d’exercer cette compétence.

### Les neuf travaux requis et l’avertissement de départ

Le XML installé `Data/Core/Defs/WorkTypeDefs/WorkTypes.xml` marque exactement neuf types `requireCapableColonist` :

| Identifiant Core | Travail |
|---|---|
| `Firefighter` | Lutte contre le feu |
| `Warden` | Surveillance des prisonniers |
| `Construction` | Construction |
| `Growing` | Culture |
| `Mining` | Minage |
| `PlantCutting` | Coupe des plantes |
| `Crafting` | Artisanat |
| `Hauling` | Transport |
| `Cleaning` | Nettoyage |

Médecine, cuisine, chasse et recherche ne sont pas marquées requises dans ce XML. Cette couverture de travaux est distincte des huit compétences du résumé et des éventuelles compétences imposées par un scénario.

`RequiredWorkTypesDisabledForEveryone` examine seulement les sélectionnés. En partie normale, `Page_ConfigureStartingPawns.DoNext` ouvre une **confirmation conditionnelle** si un de ces travaux est interdit à toute l’équipe. En mode tutoriel, cette situation bloque le départ. Les contraintes propres au scénario et la validité des noms font l’objet de contrôles supplémentaires.

**Aucune page de récapitulatif générale n’est ajoutée après les colons.** La confirmation d’une équipe incapable de certains travaux ne doit pas être transformée en étape systématique.

## Portée pour Elsewhere

L’objectif porte sur l’ordre des écrans, les zones, libellés, boutons, sélections, retours, glisser et dialogues établis ci-dessus, avec les composants graphiques actuels. Les données montrées doivent correspondre à ce que le moteur adopte réellement.

La planète originale d’Elsewhere contient 162 tuiles ; elle ne reproduit ni le maillage, ni la génération, ni les pourcentages de couverture Core. Le choix de départ est borné aux trois biomes disponibles, aux reliefs locaux pris en charge et à l’accès terrestre au comptoir existant. Température, pluie, coordonnées et saison doivent provenir de la tuile choisie ; les profils historiques des campagnes restent distincts.

Les réglages et contenus encore indisponibles peuvent rester visibles avec leur indisponibilité explicite : ils ne doivent pas produire des factions, rivières, reliefs, dates ou statistiques fictifs. Copier un écran ne rend pas fonctionnels tous les scénarios, narrateurs, difficultés, extensions, affections ou catalogues de candidats. Les divergences effectives et leur validation appartiennent à la note gameplay V333, pas à une promesse de parité globale dans cette recherche.

L’[annonce officielle de la version 1.6 et d’Odyssey](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) distingue mise à jour et extension ; elle ne constitue pas une preuve des positions de chaque bouton.
