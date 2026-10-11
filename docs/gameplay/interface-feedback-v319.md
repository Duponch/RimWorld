# Infobulles, sélection et alertes — V319

V319 répond aux corrections d’interface demandées le 11 octobre2026. Le schéma228, les règles de simulation, les portraits et l’interface précédente conservée sur main restent en place. L’UI papier demeure sur la branche distante `codex/ui-papier-v317` ; les sous-métiers sont toujours reportés.

## Infobulles et textes

Le registre des ressources attend **1700ms** de survol continu avant d’afficher son explication. Quitter la cible annule le délai ; traverser rapidement plusieurs lignes ne fait pas apparaître de popup. Un clic sur une catégorie de ressources conserve ce délai. Les autres infobulles gardent450ms ; le focus clavier fournit immédiatement l’explication.

Les attributs `title` natifs des anciens contrôles sont transférés au système personnalisé puis retirés, sans restauration au départ du curseur. Cela inclut les ancêtres, contrôles ajoutés ultérieurement, titres actualisés et formes SVG du globe. Les nœuds SVG référencés par le globe restent présents ; leur nom accessible est porté par la forme. Le texte reste littéral, sans interprétation de HTML. Un observateur cible les titres et insertions ; aucun scan de l’interface ne se fait par frame.

Les textes du jeu, des HUD, des panneaux et dialogues ne peuvent plus être sélectionnés par double clic, glissement ou Ctrl+A. Les champs réellement éditables conservent sélection, remplacement et édition ; les éléments `contenteditable=false` et champs en lecture seule restent protégés. Les clics, gestes de carte et accès au clavier restent disponibles.

## Alertes et incidents

Les alertes de personnes sélectionnent et centrent leurs véritables cibles. Chaque alerte a son propre cycle : les clics suivants passent à la personne suivante ; retirer ou ajouter une cible ne réinitialise pas systématiquement le cycle. L’hypothermie et les autres alertes médicales ouvrent Santé. Les crises ouvrent Besoins ; décès et dépouilles suivent l’identité physique, leur porteur ou leur tombe, sans centrer une ancienne position après disparition du corps.

Les assauts actifs ou terminés ciblent les membres du groupe concerné, y compris les assaillants à terre. Pour un assaillant humain mort, le corps, le porteur ou la tombe sont utilisés lorsqu’ils existent. Une carcasse mécanique suit son identité si le groupe a été observé pendant l’assaut. **Les carcasses mécaniques ne mémorisent pas leur groupe dans le format existant** : charger seulement un résultat mécanique ancien sans cette observation ne permet pas d’en déduire une association exacte ; les détails restent accessibles, sans emprunter un corps d’un autre assaut.

Le bouton principal des incidents localisables centre la cible ; un petit bouton **i** ouvre les détails séparément, afin de préserver les clics répétés et la visibilité de la carte. Sans cible physique, l’action ouvre l’information. Feux, fléaux et menaces parcourent leurs cibles réelles ; froid, canicule, orage et court-circuit suivent leur contexte. Le commerce conserve son dialogue utile et centre le visiteur. Les alertes sans cible ouvrent la gestion pertinente, par exemple Travail, couchages ou outil de réserve ; les lettres globales conservent leur information.

Les cibles sont calculées à partir du snapshot confirmé avec des clés explicites, sans analyser les libellés. Les nœuds d’alerte et leur focus sont conservés entre publications ; un texte identique n’est pas réécrit. Les cycles de partie sont réinitialisés lors du remplacement du monde. Aucune commande de simulation ni migration ne résulte de ces actions de lecture.

## Validation et portée

Les rapports courants sont sous `tmp/validation-runs/` et `tmp/functional-v319-reference/`. Le premier groupe court passe27cas sur28 ; sa fixture de paludisme annonçait une urgence à90%, alors que le seuil existant est91%. La fixture est corrigée à95% et un cas indépendant vérifie la frontière909999999/910000000. La reprise de cette seule famille passe12cas en11,325s, soit29cas uniques acquis dans quatre fichiers. Le premier typage identifie des IDs de corps optionnels dans les fixtures ; les assertions de type sont précisées sans changement de comportement, puis le typage passe7,847s. Les rouges restent conservés.

Le premier lancement natif isolé n’atteint aucune assertion et ne rend pas son serveur local disponible. Les processus exacts de ce contrôle sont identifiés et arrêtés, sans toucher aux autres sessions ; son échec322,814s est conservé. La reprise sur le poste utilise les mêmes sources et des sorties distinctes.

Le premier parcours sur le poste échoue161,850s sur trois erreurs de pilote : bouton Sauvegarder encore caché avant Menu, dossier médical absent dans une fixture historique, et charset omis dans la page DOM isolée. Les pilotes seuls sont corrigés, sans modifier le jeu. Reprise Chrome **PASS65,710s**, `v319-native-fixtures-reprise-2026-10-11T15-44-18.324Z-9720`, trois parcours : timers réels et annulation des tooltips, titres natifs dynamiques/SVG et édition protégée ; assaillant original à terre après adjudication ordinaire, cycles médicaux et recharge exacte au tick1 ; Les Aulnes historiques8434/250×250, état original exact puis deux hypothermies d’affichage déclarées, trois centrages19869/19871/19869 ouvrant Santé. Les mondes sérialisés restent exactement égaux avant/après les interactions ; erreurs navigateur vides et captures inspectées. Cette préparation médicale ne certifie pas une campagne naturelle de froid.

Build Pages final avec typage **PASS12,640s**, `v319-build-pages-2026-10-11T15-51-14.370Z-16664`. Sources, tests, pilotes et publics sont figés pendant les contrôles ; [gel final](../../tmp/functional-v319-reference/freeze-l4hzlG/manifest.json) vérifié après leur achèvement. La simulation et le bridge restent inchangés, ainsi que les63références/66fichiers publics ; leur corpus lourd déjà qualifié V318 n’est pas rejoué pour ce lot d’interface. Chrome et Vite du pilote se ferment à la sortie. Les rouges restent conservés sous `tmp/validation-runs/` et `tmp/functional-v319-reference/`.

La demande d’étagères est prioritaire pour le lotV320 préparé : elles sont absentes deV319 et ne sont pas présentées comme livrées ici. Aucun gainFPS, vrai×6constant ou campagne naturelle n’est certifié par ces corrections d’interface. Commit/push puis poursuite humaine autorisés ; publication Cloudflare regroupée, relance planifiée PAUSED.

Gel final **2729entrées exactes**. Contrôle documentaire : alias Windows `python` indisponible dans l’isolation, ERROR/EACCES0,019s conservé ; reprise avec le runtime Python réel **PASS1,705s**, `v319-docs-python-reprise-2026-10-11T15-53-49.986Z-11736`.
