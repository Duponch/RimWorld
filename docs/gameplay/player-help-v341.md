# V341 — aide accessible avant une partie

13 octobre 2026. **Sources et pilote figés ; build/typage et deux parcours natifs acquis après correction clavier.** Le guide conservait des passages antérieurs aux capsules d'arrivée, à la bibliothèque de sauvegardes et au choix des trois personnes. Ce petit lot actualise ces explications et ouvre l'aide depuis l'accueil, avant tout chargement de campagne. ROOT seul exécute les contrôles et décidera de la livraison.

## Même aide à l'accueil et en partie

L'action **Aide** de l'accueil appelle directement le callback onHelp commun avec le bouton **?** en partie. Les gardes busy/operationPending restent appliquées ; le bouton Tutoriel reste distinct et indisponible. Le dialogue unique #help est déplacé sous #app, hors de la game-shell cachée ou inert. L'accueil reste présent et le plateau reste désactivé lorsqu'il l'était déjà. L'ouverture de l'aide ne demande ni World, ni chargement de partie, ni allocation de Renderer.

Le dialogue garde showModal, son nom accessible lié au titre et sa fermeture native. Le bouton Fermer ou Échap ferme l'aide ; le handler close rend le focus au déclencheur s'il est encore connecté, visible et hors d'un ancêtre hidden/inert. Le dialogue est un frère de l'accueil : son clavier ne traverse pas le handler racine du menu. Les raccourcis MAIN et l'inspecteur Alt refusent leur activation lorsqu'un dialogue est ouvert ; l'ouverture remet aussi l'état Alt à zéro. Aucun deuxième contenu d'aide n'est créé.

## Guide et contenu actualisés

Le [guide joueur](player-guide.md) décrit les noms et profils réellement choisis, le départ en pause et la descente/ouverture des capsules par Reprendre. Son parcours court distingue **Couchage au sol** immédiat gratuit et lit construit, puis travail, réserves, abri, cuisine, santé et lecture des blocages. L'aide décrit les outils disponibles sans donner d'ordres ou de fournitures au joueur.

La conservation est expliquée selon les systèmes livrés : douze copies nommées, trois automatiques à intervalle de minutes réelles de jeu actif, cinq par défaut ; export du checkpoint courant et import JSON. Les copies sont locales au navigateur et à son origine. La pause ne déclenche pas les captures périodiques ; fermer l'onglet ne garantit pas une dernière automatique. Le guide retire aussi des absences de systèmes et références de présentation devenues historiques, sans annoncer de parité Core exhaustive.

## Contrôles et limites

La relecture statique ciblée de MAIN/layout ne trouve aucun défaut concret bloquant dans l'ordre d'initialisation, l'absence de World requis, le déplacement du dialogue unique, les gardes clavier et le retour conditionnel du focus. Cette lecture ne constitue pas une preuve du comportement natif du navigateur.

| Contrôle ROOT | Verdict acquis |
| --- | --- |
| buildPages et typage | **PASS21,842s**, v341-build-pages-2026-10-13T19-28-29.378Z-24284 |
| Gel initial des sources/tests/pilote | **2861exact**, avant création de cette note |
| Chrome natif, deux cas d’aide | **PASS40,345s**, v341-native-keyboard-2026-10-13T19-31-34.039Z-15400 |
| Build Pages et typage après correction clavier | **PASS21,682s**, v341-build-keyboard-2026-10-13T19-30-51.444Z-7620 |
| Gel après reprise | **2862exact** |
| Documentation et livraison Git | À clôturer par ROOT |

Le premier natif est **rouge37,940s** (`v341-native-2026-10-13T19-29-13.130Z-6580`), deux cas arrêtés sur Tab quittant le dialogue. Ses captures et sorties sont conservées sous `tmp/early-access-v341/native/`. ROOT ajoute un bouclage clavier local au dialogue ; il parcourt ses contrôles seulement sur Tab, sans traitement par frame. Le navigateur garde ses comportements modaux natifs de fermeture. Les oracles du pilote sont conservés.

La reprise sous `tmp/early-access-v341/native-keyboard/` passe les deux cas. À l’accueil : World et backend inexistants, shell masquée/inert, ouvertures clic/Entrée/Espace, Tab/ShiftTab dans le modal, fermetures ×/Échap et focus rendu à Aide ; l’accueil reste ouvert. En partie : vraie création250×250 par les cinq pages, trois capsules ouvertes et personnes originales18530/18532/18534 conservées, même nœud/contenu d’aide avant/après création et recharge, raccourcis1/2/3/F1/F2 refusés dans le dialogue, Space sur Fermer sans reprise. Export/recharge exactement au **tick28**, SHA256 `80e43aa0db4afa6f996082199231ed0e908be106dd4bd485375495f04ecfcc3f`, erreurs[] dans les deux résumés. Ce départ distinct du camp V340 n’en récupère aucun blessé.

ROOT inspecte `initial-help.png` et `ingame-help.png` : dialogue lisible, accueil/carte atténués derrière et focus du bouton Fermer visible. Ces deux captures ne constituent pas un contrôle responsive exhaustif ou une mesure FPS. Aucun corpus moteur ni banc de performance inchangé n’est rejoué pour ces textes et le câblage d’aide.

Schéma, simulation, bridge, rendu et publics sont hors du périmètre de changement. Aucun gainFPS, nouvelle campagne, autonomie alimentaire, survie durable ou early access100% acquis. Cette note n'annonce aucun commit, push ou déploiement V341. Après qualification et livraison, les produits V339/V341 sont prévus pour une publication regroupée sous contrôle ROOT.

Clôture ROOT : documentation **PASS1,473s** (`v341-docs-2026-10-13T19-34-27.106Z-18244`), gel2862exact et diff sans erreur d’espacement ; simulation, rendu, bridge et publics inchangés. Les contrôles restent bornés aux parcours décrits.
