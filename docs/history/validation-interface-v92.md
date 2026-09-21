# V92 — interface, paysage GPU et publication

Validation des 21–22 septembre 2026, depuis V91 `c84c594`, sur `main`, en mode jour. Schéma de sauvegarde **91** conservé : aucun état métier, calendrier, ressource ou règle modifié. Aucun jalon global clos : **G0–G4 partiels, G5 absent**. Estimations fonctionnelles et priorités uniquement dans [ROADMAP](../ROADMAP.md#estimation-davancement).

## Livré et références

- Publication réelle sur **https://lisiere-duponch.netlify.app**. Connexion Netlify locale réutilisée via API officielle, sans secret dans les sources ou rapports. Projet `9c1b98b5-68a5-4242-b1ec-3bc193b93445`. [Procédure](../development/deployment-netlify.md).
- Structure d'inspection : résumé, cinq dossiers, Prisonnier conditionnel et commandes existantes. Recherche Core 1.6.4871 en lecture seule, captures et sources publiques recoupées dans la [référence](../research/colonist-interface-reference-v92.md). Aucun âge, passé personnel, opération ou inventaire fictif.
- Identité bois/parchemin/feuilles issue du mockup fourni : cadres adaptatifs, atlas de vingt pictogrammes, six portraits, curseurs et fond planétaire régénéré. [Dimensions et limites](../development/visual-identity.md). Fond livré 1672×941, pas 4K ; reproduction pixel pour pixel non revendiquée.
- Brins résidents inspirés du code AntSystem consulté en lecture seule, et quatre désignations en billboards instanciés. Racines/forme/vent et orientation sont calculés dans les shaders ; masques et liste d'ordres restent issus des snapshots CPU. [Contrat](../development/gpu-landscape.md).
- Le clic droit navigateur est supprimé sur le jeu ; les ordres contextuels réels restent disponibles. Les limites des panneaux sont contrôlées sur trois résolutions de bureau.

Le catalogue et les boucles de V91 restent jouables. V92 n'ajoute ni recette, ni objet physique, ni maladie, ni espèce ; il ne faut pas compter les illustrations comme du contenu obtenable.

## Vérifications regroupées

| Contrôle | Résultat et portée |
|---|---|
| `gpu-landscape`, `colonist-inspector`, `habitat-render` | **16/16** contrôles courts : masque, sols, ouvrages, espèces remplacées, hauteurs/atlas, dossiers et contrats de rendu/équipement |
| Typage / build | `npm run typecheck` et `npm run build` réussis ; build Vite de production, 499 modules |
| UI V92 native | Création réelle 250², cinq dossiers, persistance de l'onglet entre personnes, dispositions 1280×720 / 1440×1000 / 1920×1080, ordres mine/coupe par vrais clics, billboards, menu contextuel et sauvegarde exacte : **réussi**, 44,3 s pour la passe finale |
| UI équipement native | Contact physique, arme GPU, reprise pendant approche, dépôt différé et état du portrait : **réussi**, 22,3 s |
| UI captivité native | Capture réelle, soins, politiques, conversations, recrutement et reprise ; dossier Prisonnier et restauration historique : **réussi**, environ 1,2 min ; situations contrôlées, pas campagne naturelle |
| UI compétences native | Priorité de construction, travail/XP réels, Bio, sauvegarde exacte et lit terminé : **réussi**, 14,8 s après correction du cadrage du pilote |
| Version publique | HTTP 200 ; création de trois colons, cinq dossiers, sauvegarde/rechargement, créneau après rechargement de page, quatre illustrations disponibles et aucun diagnostic de test exposé : **réussi**, aucune erreur JS/GPU |

Les quatre parcours finaux distincts passent. La première passe regroupée a eu trois succès et un échec de cadrage dans le pilote compétences ; seul ce dernier a été rejoué. Les 25 anciens pilotes utilisant les accordéons ont été adaptés aux dossiers, mais **ils n'ont pas tous été réexécutés**. Une campagne de simulation annuelle n'a pas été relancée : aucun contrat temporel n'est changé.

Rapports conservés : [interface et mesures](../../artifacts/interface-native-v92.json), [compatibilité des commandes](../../artifacts/interface-compatibility-v92.json), [déploiement initial V91](../../artifacts/netlify-v91.json), [déploiement V92](../../artifacts/netlify-v92.json), [contrôle public](../../artifacts/netlify-smoke-v92.json). Les sorties historiques V43/V52/V86 produites par les anciens pilotes sont restaurées à leurs octets publiés après copie des nouvelles observations dans le rapport V92.

## Mesures de rendu, portée et limites

Chromium avec GPU natif, sources gelées, mesures successives. Scène de départ 250×250 à trois personnes, caméra et résolution constantes pour le comparatif d'herbe. **13 317 instances de brins**, **deux désignations**, 211 appels de rendu pour l'ensemble de la scène. Une seule géométrie résidente pour les brins et un seul lot de billboards ; aucun calcul CPU de matrice par brin et par image.

Comparaison finale en pause, quatre fenêtres d'environ 2,5 s :

| Herbe | Images | p50 | p95 | maximum |
|---|---:|---:|---:|---:|
| désactivée | 354 | 8,3 ms | 8,4 ms | 12,6 ms |
| activée | 331 | 8,3 ms | 12,5 ms | 12,6 ms |
| désactivée | 339 | 8,3 ms | 12,4 ms | 12,6 ms |
| activée | 356 | 8,3 ms | 8,5 ms | 12,6 ms |

La variation entre fenêtres empêche d'attribuer un gain chiffré à l'herbe. Une passe antérieure avait p95 8,4 ms dans les quatre fenêtres ; elle ne remplace pas la mesure finale plus variable. La comparaison n'est ni un profil GPU détaillé ni une preuve sur toutes les machines.

En activité, fenêtre finale de **798 images**, p95 **37,5 ms**, maximum **245,9 ms**. 371 ticks en 11,017 s, soit environ **5,61× pour 6× demandé** sur ce petit camp, avec instrumentation/commandes. La passe antérieure donnait 29,2 ms / 241,6 ms et environ 5,67×. Ces pics sont conservés ; aucune garantie de fluidité parfaite ou d'amélioration causale générale.

La dernière charge lourde reste celle de [V91](../research/performance-v91.md) : cent colons/cent animaux, CPU p95 131,95 ms, image p95 25 ms et débit 2,414×/6×. Elle n'est pas remplacée par la petite scène V92. Le coût général de simulation/navigation reste un chantier ouvert.

## Corrections et limites explicites

- Premières illustrations avec faux damier opaque rejetées ; atlas et cadre finaux possèdent un vrai canal alpha. Les visages restent des illustrations limitées à six variantes.
- Le centre de la nappe d'herbe suit l'intersection de la visée caméra avec le sol ; l'ancien décalage fixe pouvait placer la nappe hors champ en vue haute. Les sols construits et emprises d'ouvrages excluent les brins.
- Les désignations de coupe sont placées au-dessus de la canopée ; les minerais ont une hauteur propre. Les carrés blancs de coupe et anciennes croix des quatre ordres sont remplacés ensemble.
- Alertes positionnées à partir de la hauteur réelle de l'horloge ; hauteur du registre de ressources réduite lorsque l'inspection apparaît. La priorité CSS des nouveaux portraits remplace aussi les anciens fonds numérotés.
- Les pilotes de désignation conservaient initialement une mauvaise cible de minage (ressource au lieu de tuile rocheuse), ou fermaient Architecte avant le clic, annulant l'outil. Corrigés pour suivre les commandes réelles, sans changer les règles. Le pilote compétences déplace maintenant réellement la caméra avant de poser le lit, au lieu de cliquer à travers le panneau.
- Netlify injectait un badge qui interceptait Menu. Son réglage officiel est désactivé pour ce seul site ; le parcours public a ensuite été entièrement rejoué avec des clics ordinaires.
- Les sauvegardes restent propres au navigateur et à l'origine du site ; pas de compte ni cloud. Pas de CI Git automatique. Les interfaces des systèmes absents restent grisées.

Les durées ci-dessus mesurent les parcours, pas toute la recherche, les générations d'images, l'intégration et les corrections. Ces phases n'ont pas été chronométrées séparément de manière fiable ; aucun gain de temps ou de tokens chiffré n'est revendiqué.
