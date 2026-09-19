# Départ cohérent — référence et décisions V80

Recherche renouvelée le **20 septembre 2026**, après la filière chasse–boucherie V79. Objectif : une nouvelle partie dont scénario, personnes, dotation, technologies, paysage et pression forment un ensemble explicable. Le [contrat de scénario](../development/scenario-start.md) porte les choix locaux ; [ROADMAP](../ROADMAP.md) reste le calendrier. Une référence vérifiée ne constitue ni une implémentation ni une preuve d'équilibrage.

## Corpus et niveau de preuve

Les originaux sont abordés via [reference-adoption](reference-adoption.md). Chapitres 5–7 : taille/génération ; 11 : production/recherche ; 12 : alimentation/faune ; 13 : personnes ; 24 : narrateur/incidents.

| Entrées | Décision |
| --- | --- |
| SYS-016/017 | Adopter graine/version, séparation terrain–scénario et contraintes spatiales ; adapter l'algorithme 3D. |
| SYS-018/019 | Rivière locale partielle ; monde, côtes, grottes et ruines différés. Ne pas assimiler le contenu Odyssey au Core. |
| SYS-084/085 | Traits compatibles et compétences utiles ; huit candidats, biographies et génération complète différés. |
| SYS-121..125 | Prédateurs, revanche, dressage, enclos et reproduction distincts. Ces lignes ne spécifient pas un budget de faune sauvage. |
| SYS-132..135 | Séparer scénario, calendrier, composition et lettre ; narrateur selon richesse/population/adaptation différé. |

Sources confrontées : présentation officielle, wiki communautaire relu et classes Core épinglées au [commit du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f). Le [correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) est postérieur : ce miroir ne certifie pas les branches actuelles. Le [XML historique de scénario](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/Scenarios/Scenarios_Classic.xml), daté de septembre 2018, corrobore les quantités, sans remplacer les Defs de la version actuelle. Copies de travail dans `tmp/scenario-start-reference`, sans dépendance du jeu.

## Crashlanded Core et décisions locales

Le [scénario décrit actuellement](https://rimworldwiki.com/wiki/Scenario_system) sélectionne trois personnes parmi huit, arrivant en capsules avec un animal lié et un profil industriel New Arrivals. Maladie de cryptosommeil possible, biographies et habillement dépendent de la génération. Le [site officiel](https://rimworldgame.com/) confirme le trio de survivants et le rôle du narrateur, pas chaque quantité.

| Catégorie | Référence recoupée wiki/XML |
| --- | --- |
| Provisions | 800 argent, 50 repas emballés, 30 médicaments industriels, 30 composants. |
| Matériaux proches | 450 acier, 300 bois. |
| Matériel distant | 720 acier, 7 repas, 3 débris de vaisseau. |
| Combat | Fusil à verrou, revolver, couteau en plasteel, qualité normale ; gilet/pantalon pare-balles et casque en plasteel. |
| Personnes | Vêtements en synthétoffe et animal domestique, en plus des armures. |

New Arrivals connaît déjà refroidissement passif, taille de pierre, vêtements/mobilier complexes, électricité, climatisation et pâte nutritive. **Nos deux recherches disponibles sont acquises dans le nouveau départ** ; conserver leurs verrous uniquement pour imposer une démonstration serait une divergence supplémentaire. Le camp pédagogique reste un autre scénario.

Décision V80 : **Trois survivants**, scénario propre, reprend le stock proche compatible, trois chemises en tissu portées, un revolver et un gilet au sol. Stock distant, argent, armes/armures absentes, synthétoffe, animal domestique, capsules et cryptosommeil ne sont pas remplacés silencieusement. La réserve totale et la défense diffèrent : ce n'est pas un Crashlanded identique.

Les [repas emballés](https://rimworldwiki.com/wiki/Packaged_survival_meal) ne pourrissent pas mais se détériorent exposés. Des repas simples ne constituent pas un remplacement neutre. L'autonomie doit être mesurée avec notre ingestion et les convives réels : l'approximation de huit jours du wiki n'est pas une garantie universelle.

## Placement et taille

[GenStep_FindPlayerStartSpot](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/GenStep_FindPlayerStartSpot.cs) et [CellFinderLoose](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/CellFinderLoose.cs) recherchent un point plutôt central, praticable, ouvert, relié au bord et hors emplacements réservés, puis élargissent la recherche. Le paysage détermine ce point, pas une clairière carrée et trois ressources imposées. Notre validation peut refuser un départ invalide sans recopier les replis approximatifs du miroir.

`ScenPart_StartingThing_Defined`, `ScenPart_PlayerPawnsArriveMethod` et [ScenPart_ScatterThings](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/ScenPart_ScatterThings.cs) séparent possessions, dispersion proche et distante. Les objets sont physiques ; les capsules les interdisent initialement. Lisière les rend disponibles immédiatement faute de ce système, sur des cellules accessibles et compatibles, sans stock abstrait ni réserve construite. Aucun rayon exact de dispersion du patch courant n'est certifié ici.

[World generation](https://rimworldwiki.com/wiki/World_generation) répertorie 200²/225², 250²/275², 300²/325² et les très grandes 350²/400². **250² = 62 500 cellules** est déjà notre défaut ; le lot n'exige aucune extension des bornes locales 8..250. La note précédente omettait les deux dernières tailles : correction documentaire, pas besoin de les implémenter. Densité, caméra et distances perçues en 3D sont distinctes de la surface logique.

## Tempéré, végétation et faune

La [forêt tempérée](https://rimworldwiki.com/wiki/Temperate_forest) associe arbres feuillus, clairières, herbes et buissons. Coefficients publiés : plantes 0,65, faune 3,7. Chêne/peuplier ont chacun une pondération de 0,5, contre 5 pour l'herbe et 2 pour les herbes hautes ; baies/healroot chacun 0,05. Ce ne sont **ni des probabilités brutes de pose par cellule ni des comptages**. Les variantes d'extensions sont exclues de cette comparaison Core.

[WildPlantSpawner](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WildPlantSpawner.cs) combine densité du biome, facteur du site/conditions, fertilité et capacité locale, avec plafond d'une plante/cellule. Habitat, concurrence et regroupements interviennent dans le choix d'espèce. Les arbres ne sont qu'une fraction : couvrir 65 % de la carte d'arbres serait une mauvaise transposition.

[WildAnimalSpawner](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WildAnimalSpawner.cs) utilise `surface × densité effective / 10000`. La densité effective dépend notamment des espèces admissibles à la saison/température et des conditions ; chaque individu consomme son `ecoSystemWeight`, les groupes ont leurs tailles. À 250² au facteur neutre, 3,7 donne **23,125 unités de poids écologique**, pas 23 individus. Poids actuel du lièvre/composition non certifiés ici ; remplir tout ce budget de lièvres donnerait une fausse équivalence alimentaire.

V80 retient une vallée locale, une végétation moins uniformément arborée et des mesures multigraines des arbres/baies/minerais, surfaces et distances. Le plafond de **12 lièvres sur 250²** est une calibration explicite de notre espèce unique, avec poses admissibles ; il ne découle pas d'un compte Core. Espèces d'arbres, diversité animale, migrations et climat saisonnier restent incomplets. Aucun nombre universel d'arbres/minerais par carte n'est revendiqué.

## Difficulté et premiers jours

Le [narrateur officiel](https://rimworldgame.com/) module les événements ; scénario et difficulté sont d'autres choix. La [table des difficultés](https://rimworldwiki.com/wiki/AI_Storytellers) donne pour Community Builder menace 30 %, humeur +10, récolte/minage/recherche 120 % ; Adventure Story utilise 60 %, +5 et 100 %. La difficulté ne se résume pas au délai du premier raid. Les libellés du jeu recommandent Community Builder aux débutants du genre ; le [Quickstart communautaire](https://rimworldwiki.com/wiki/Quickstart_Guides) recommande Cassandra/Strive to Survive : recommandations différentes, pas règle unique.

Notre départ conserve une **pression prototype annoncée**, sans nom Community Builder, bonus de difficulté inventé ni points de raid selon richesse. Saisons, maladies, prédateurs, catalogues et narrateur absents empêchent la parité globale. Site tempéré et dotation suffisante rendent les systèmes abordables, sans prouver une difficulté équivalente.

Le pilote doit obtenir couchages, abri, rangement et source renouvelable engagée par les commandes ; relever consommations, distances, dépenses, production et santé. Avec 50 repas/300 bois, faim ou abattage immédiats ne sont pas des exigences du départ. Chasse/agriculture peuvent être anticipées sans retirer artificiellement la dotation. Mesurer plusieurs graines, conserver les checkpoints, comparer progression et coûts. Une survie isolée ou un laboratoire ne certifie pas l'équilibrage d'une nouvelle partie.
