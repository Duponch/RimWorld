# Référence de partie Core — 20 septembre 2026

Cette enquête remplace l'objectif « tout observer dans la première semaine ». La cible est le déroulement de RimWorld, avec ses choix initiaux, son contexte et ses variations. Les règles relevées ici ne constituent pas une nouvelle version jouable de Lisière. [ROADMAP](../ROADMAP.md) programme seule les corrections ; [état livré](../gameplay/implementation-status.md).

## Profil retenu par l'utilisateur

**Atterrissage forcé, Cassandra Classique, Récit d'aventure**, jeu de base sans extension active. Le 20 septembre, l'utilisateur a fourni huit premières captures de RimWorld 1.6.4871 et demandé que seul ce scénario et cette difficulté soient actifs dans les premiers menus ; les autres choix restent visibles et grisés. Nouvelle partie et Charger sont actifs, Options seulement pour des réglages réellement disponibles. [Contrat cible des menus](../development/new-game-menus.md).

Récit d'aventure est désormais **un choix explicite de périmètre**, pas un prétendu réglage par défaut de RimWorld ni une estimation de ce qu'utiliserait un « joueur moyen ». Cassandra est préselectionnée par le jeu ; aucune difficulté ni mode de sauvegarde n'est préselectionné dans la création normale. Les captures confirment les boutons radio vides. Le profil rechargeable sera notre première possibilité ; le mode Engagement reste distinct et indisponible tant qu'il n'existe pas.

## Sources et hiérarchie de preuve

1. Installation locale, lue sans modification : `E:/Steam/steamapps/common/RimWorld`, **Version.txt = 1.6.4871 rev590**. Defs de Core et classes de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`. SHA-256 de l'assembly : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Configuration observée : seul `ludeon.rimworld` actif ; son en-tête 1.6.4633 ne remplace pas la version installée.
2. Captures utilisateur : dix-sept images au total, menus, scénarios, narrateur, difficultés et infobulles, monde, site, personnes et arrivée ; version 1.6.4871 visible. Les cinq dernières accompagnent le témoin `Reference-Core-4871`, en forêt boréale et grandes collines avec grottes. Elles confirment une présentation, pas tous les résultats d'une simulation.
3. Sauvegardes locales : versions/scénarios/paramètres relevés individuellement, chronologies et comptages anonymisés ; [observations et biais](colony-observation-reference.md). Aucun original modifié, aucune sauvegarde brute ou source propriétaire ajoutée au dépôt.
4. Sources externes : [présentation du développeur](https://rimworldgame.com/), [annonce officielle 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), pages et historiques spécialisés référencés dans les trois enquêtes ci-dessous. Les fichiers locaux 1.6.4871 sont postérieurs au miroir public du 20 mai et à cette annonce ; ces sources plus anciennes ne certifient plus à elles seules les valeurs actuelles.
5. Corpus utilisateur, chapitres **3, 5–7, 8/9, 11–15, 23/24 et 32**, via [adoption](reference-adoption.md). SYS/TEST-016..019, 062..064, 070..072, 076..085, 121..125, 132..135 structurent les questions ; leurs statuts R/P/V ne sont pas des validations de Lisière.

Inspection locale de classes avec ILSpyCmd **8.2.0.7535**, outil temporaire hors dépendances du projet. [Paquet officiel](https://www.nuget.org/packages/ilspycmd/8.2.0.7535), [projet](https://github.com/icsharpcode/ILSpy). SHA-256 du paquet reçu : `d7cd4f2b6d03875db8228cc2d5a4dc76e000dd64ba625a735848454f346445fd`. Les sorties de travail restent dans `tmp`; les présentes notes conservent faits, méthodes, provenance et incertitudes. Une reconstruction de classe reste à confronter aux Defs, conditions et observations, surtout aux branches ambiguës.

## Création : défaut, choix et aléatoire

| Élément | Comportement vérifié dans 1.6.4871 Core | Lisière V81 |
|---|---|---|
| Scénario | Premier scénario défini : Crashlanded / Atterrissage forcé. | Trois survivants, adaptation nommée avec matériel manquant. |
| Narrateur | Cassandra préselectionnée ; difficulté et mode de sauvegarde à choisir. | Calendriers distincts d'accueil, raid et canicule, sans narrateur unifié. |
| Monde | Graine textuelle aléatoire ; couverture 30 %, pluie/température/population normales sans DLC. | Graine numérique 42 par défaut, carte locale sans monde. |
| Site | Proposition aléatoire sous contraintes ; le joueur peut choisir un autre site. Ni relief montagneux ni rivière systématique. | Vallée tempérée avec rivière systématique, sans choix de relief. |
| Taille | 250×250 par défaut ; menus 200, 225, 250, 275, 300, 325. Avertissement au-delà de 280. | 250×250 par défaut ; tailles plus restreintes. |
| Personnes | Trois personnes parmi huit candidats ; possibilité de relancer un candidat. Génération sous contraintes et couverture de métiers, pas huit tirages de nombres indépendants. | Trois profils locaux ; choix de candidats/biographies incomplet. |
| Début du calendrier | Heure locale 6 h ; saison initiale selon site, ou choix explicite. Temps écoulé depuis le début distinct de la date absolue. | Tick 0 confondu avec minuit, lumière fixe à 45° et équinoxe. |

Classes lues : `Page_SelectScenario`, `ScenarioLister`, `Scenario.GetConfigPages`, `Page_CreateWorldParams`, `GameInitData`, `Page_ConfigureStartingPawns`, `ScenPart_ConfigPage_ConfigureStartingPawns`, `StartingPawnUtility`, `GenTicks`; narrateur/site détaillés dans leurs enquêtes. Le flux normal est scénario → narrateur/difficulté/sauvegarde → monde → site → personnes ; les pages propres aux extensions ne sont pas ajoutées à Core.

Les paramètres de développement rapide ne sont pas les valeurs du menu normal. La proposition d'un site n'est pas un biome « moyen ». La graine de monde, la sélection du site et la génération des candidats ne doivent pas être assimilées à notre seul entier de génération locale.

## Dotation et connaissances : contrôle de version courant

`Data/Core/Defs/Scenarios/Scenarios_Classic.xml` confirme : trois personnes parmi huit, arrivée en capsules, maladie de cryptosommeil pour 50 % des personnes initiales ; **800 argent, 50 repas emballés, 30 médicaments, 30 composants ; fusil à verrou, revolver, couteau en plasteel ; pantalon et gilet pare-balles, casque avancé en plasteel ; un animal domestique lié ; 450 acier et 300 bois proches ; 720 acier, sept repas et trois débris de vaisseau dispersés**. Les captures du scénario corroborent ces quantités.

Le tag de recherche initial `ClassicStart` de la faction industrielle confirme : mobilier complexe, refroidissement passif, taille de pierre, vêtements complexes, électricité, pâte nutritive et climatisation. Les connaissances de départ ne donnent pas d'XP fictive. Le détail des vêtements/candidats exige les producteurs correspondants ; une dotation XML seule ne décrit pas toutes les possessions générées.

La V80 reprend seulement les éléments annoncés dans son [contrat](../development/scenario-start.md). **Renommer ce profil ne livre pas les éléments manquants.** Les anciennes sauvegardes gardent leur provenance et leur matériel ; aucune correction de scénario ne doit régénérer ou réapprovisionner une colonie existante.

## Temps réel et temps de partie

Constantes locales 1.6.4871 : 60 ticks Core/s réelle à vitesse normale, 60 000 ticks/jour. Un jour dure donc **1 000 secondes, soit 16 min 40 s**, à débit nominal 1× et sans pause. `TickManager` demande normalement 1×/3×/6× ; des branches d'inactivité, d'absence de carte et de ralentissement forcé modifient ce débit. Une machine chargée peut ne pas atteindre le débit demandé.

Lisière V81 : 6 000 ticks locaux/jour et dix ticks/s, soit **10 minutes par jour**. Les règles emploient souvent dix ticks Core pour un tick local : les proportions en jours peuvent être justes tout en avançant **5/3 fois trop vite en temps réel**. C'est un écart démontré, pas une préférence de joueur.

Correction à prévoir sous contrat : conserver une conversion explicite Core↔local ; séparer date locale/temps écoulé ; synchroniser worker, interpolation, attaques et animations. Changer seulement `TICKS_PER_SECOND` laisserait notamment les conversions actuelles `/100` et `/10` des poses de combat incohérentes. Ni cette enquête ni un réglage cosmétique de l'horloge n'ont corrigé ce point.

## Rythme, paysage et progression observée

- [Narration, difficulté, conditions et budgets](colony-pacing-reference.md) : l'introduction classique prévoit un premier raid à **5,4 jours écoulés**, sous ses conditions, pas « jamais dans la première semaine ». Le tutoriel et Randy ont d'autres chemins. Une durée moyenne entre incidents n'est pas un rendez-vous garanti ; les catégories, admissibilités et poids comptent autant que le calendrier.
- [Carte, végétation et géologie](map-calibration-reference.md) : conserver 250². Distinguer roche naturelle, gisement dans la roche, fragments au sol, végétation basse et arbres ; relief et contexte du site doivent expliquer leurs distributions. Comparer surfaces praticables et distances avant d'agrandir.
- [Parties observées](colony-observation-reference.md) : les 88 fichiers historiques ne représentent que deux mondes, dont 87 états d'un tutoriel avec ressources supplémentaires et retours en arrière. Le nouveau témoin fournit un troisième monde au tick 283, sous Cassandra/Récit d'aventure. Ce sont des exemples de trajectoires et d'implantations, pas une moyenne statistique, ni la preuve d'une difficulté par défaut.
- [Recherche alimentaire initiale](first-week-reference.md) : une durée biologique de riz n'est pas une date de première récolte. Date de semis, fertilité, latitude, saison, température et travail comptent. Ne pas accélérer le riz ou retirer les rations pour fabriquer une démonstration à J7.

## Méthode adoptée et limites ouvertes

Pour chaque règle : conserver **version, source précise, contexte, valeur/condition, confiance, écart actuel et décision**. Distinguer ce que le jeu propose initialement, ce qu'un joueur choisit, ce qui est tiré au hasard et ce que l'historique provoque. Une observation ne remplace pas un algorithme ; un algorithme ne prouve pas le résultat visuel d'une carte. Corriger rétroactivement la recherche concernée lorsqu'une preuve nouvelle contredit une ancienne valeur.

Les prochains pilotes suivent une politique de colonie et des transitions naturelles sur plusieurs graines. Ils conservent nourriture, stocks, survie, occupations, conséquences et continuation comme invariants. La fin d'une période d'observation ne déclenche pas artificiellement les événements manquants. Les branches rares restent testées dans des scénarios explicitement contrôlés, séparés du déroulement ordinaire.

Le témoin demandé a été reçu : **`Reference-Core-4871`, 1.6.4871 rev591, tick 283, Atterrissage forcé, Cassandra, Medium/Récit d'aventure, Core seul, 250², forêt boréale et grandes collines**. L'en-tête de sauvegarde porte rev591 tandis que `Version.txt` reste rev590 ; cette différence est conservée, sans prétendre en connaître la cause. Les captures et grilles identifient son contexte ; il ne remplace pas le témoin tempéré/petites collines initialement proposé. Il est exploitable tel quel, sans demander une recréation pour pouvoir avancer. Les mesures détaillées et leur portée sont dans l'[audit de carte](map-calibration-reference.md#témoin-actuel-fourni-par-lutilisateur).

Restent à observer pour estimer une distribution : d'autres **nouvelles** cartes de version et contexte comparables ; distances parcourues ; historique d'une partie ordinaire au-delà des seules infrastructures des sauvegardes disponibles. On peut déjà corriger les écarts certains sans attendre une prétendue enquête exhaustive. Une question que ni les fichiers ni les captures n'établissent doit devenir une demande de vérification en jeu précise, pas une hypothèse dissimulée.

Cette base permet de choisir les corrections ; elle ne certifie ni toute la génération, ni le narrateur complet, ni une équivalence globale de difficulté. Aucune hausse des estimations fonctionnelles ou clôture de G0–G5 ne résulte de cette recherche seule.
