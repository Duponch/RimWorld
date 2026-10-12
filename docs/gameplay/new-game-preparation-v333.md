# Préparer une nouvelle colonie — V333

## Demande et références

Suite à la préparation d'une version jouable V332, la demande humaine porte sur
les structures, écrans, boutons et interactions de RimWorld, **avec la charte
actuelle d'Elsewhere**. Le parcours comporte désormais cinq pages : scénario,
narrateur, monde, lieu de départ, personnages. Démarrer suit les personnages ;
aucune page de récapitulatif supplémentaire n'est ajoutée.

La [recherche d'interface](../research/new-game-interface-v333.md) distingue les
pixels réellement consultés dans une vidéo Core 1.6 sans mods/DLC, la
transcription et les faits établis dans les classes/XML de l'installation
1.6.4871 rev590. Elle précise les limites de ces sources. Les trois sélectionnés
parmi huit, le glisser, les douze compétences individuelles, les huit compétences
du résumé et les neuf travaux requis sont établis. Les classes ne certifient pas
une identité de pixels à toutes les échelles. Aucun asset, XML ou code propriétaire
extrait de Core n'entre dans le dépôt.

## Ce qui change pour le joueur

- **Scénario** : liste à gauche et description à droite ; Atterrissage forcé
  reste le scénario disponible. Personnalisé et Steam Workshop sont visibles
  avec leur indisponibilité, comme les autres scénarios non livrés.
- **Narrateur** : choix à gauche, difficulté et mode de sauvegarde au centre,
  illustration originale et description à droite. Cassandra Classique, Récit
  d'aventure et Rechargeable à tout moment restent le périmètre actif. Les deux
  choix de difficulté/mode doivent être faits avant Suivant.
- **Créer un monde** : graine textuelle et bouton Aléatoire, paramètres à gauche,
  factions à droite, Réinitialiser tout et Générer en bas. La couverture réelle
  du globe original est 100 % ; pluie/température/population restent fixes.
  Paramètres avancés ouvre la taille 250×250 et la saison automatique actuellement
  prises en charge. Les réglages absents restent explicitement indisponibles.
- **Lieu de départ** : données réelles à gauche, globe à droite, sélection au
  clic, rotation par glissement/flèches, zoom par molette et proposition
  aléatoire. Suivant demande confirmation du site. Une liste accessible permet
  également de choisir une case admissible.
- **Personnages** : trois sélectionnés puis cinq laissés sur place à gauche,
  dossier individuel à droite et résumé d'équipe dessous. Un clic inspecte ;
  le glisser change l'ordre, donc l'équipe des trois premiers. Le clavier
  Alt+↑/↓ et une poignée tactile complètent ce geste. Aléatoire renouvelle
  uniquement la personne inspectée, son nom est modifiable et le portrait
  utilise notre modèle actuel. Retour conserve les choix tant que la graine
  du monde n'est pas remplacée.

Les dossiers affichent les vraies biographies, incapacités, douze compétences,
passions, traits, âge, santé et relations de l'équipe. Le résumé d'équipe présente
le meilleur titulaire **utilisable**, puis niveau et passion, avec ordre stable
en cas d'égalité. Il ne moyenne pas les compétences et ne retient pas un haut
niveau interdit par la biographie. Les neuf travaux requis déclenchent une
confirmation si toute l'équipe est incapable d'un travail ; le joueur peut
continuer. Ce contrôle ne confond pas niveau zéro, priorité de travail et
incapacité. Le mode tutoriel n'est pas ajouté.

Le panneau conserve palette, fontes, infobulles et portraits d'Elsewhere. À
1440×1000, huit lignes, dossier et résumé sont visibles ensemble ; les écrans
plus petits utilisent le défilement sans débordement horizontal. Les champs
restent éditables ; le double clic hors édition ne sélectionne pas le texte.
Les dialogues restaurent le focus et sont détruits à la navigation. Une erreur
de création laisse le dossier utilisable pour réessayer, et un démarrage en
cours rend le contenu inerte jusqu'à son résultat.

## Autorité, climat et reprise

La graine des candidats est indépendante de celle du monde et de la carte locale.
Une identité prospective contient une place durable, un compteur de renouvellement
et éventuellement un nom. Les huit dossiers sont dérivés de ces données sans
consommer les PRNG de terrain ou de simulation. Lors de la création, seuls les
trois choisis sont matérialisés, avec leurs profils annoncés ; IDs et relations
sont remappés vers les personnes physiques. Le tirage est original et borné sur
notre catalogue de biographies/traits, pas une reproduction de tout le générateur
de personnes Core. La couverture de travaux utilise au plus 21 générations.

Le worker reçoit un choix strict `{version, seed, tile}`, reconstruit lui-même
le globe et refuse un site incohérent. Il ne reçoit pas la géographie comme
autorité de l'UI. Les terrains admissibles sont les trois biomes existants, hors
océan, montagne et comptoir, avec un accès terrestre au comptoir civil actuel.
L'ancre locale, la graine des roches, le biome et le relief proviennent du choix.
Les coordonnées, pluie et température de la tuile sont effectivement adoptées ;
le globe de voyage conserve ce lieu comme maison.

Le **schéma 230** introduit le profil prospectif Atterrissage révision9 et le
climat révision2. Celui-ci conserve les cinq paramètres locaux et l'origine du
calendrier, recoupés avec la tuile maison. Il est requis pour ce nouveau départ ;
le supprimer ou le remplacer par le climat historique est refusé, y compris
dans un snapshot avant adoption. Un refus conserve le monde précédemment confirmé
et permet la reprise par un checkpoint valide. La migration229 valide strictement
l'ancien monde avant la seule hausse du numéro de schéma : ni dotation, ni
personne, ni climat nouveau rétroactifs. Le chemin historique révision8 et les
climats révision1 restent compatibles.

Les prévisions de présentation capturent les mêmes paramètres primitifs que le
moteur. La mise en cache annuelle conserve au plus huit profils, pour éviter
qu'une succession de nouvelles latitudes retienne sans borne des tableaux
annuels. Il s'agit d'une borne mémoire, pas d'un gainFPS mesuré. Le globe est
calculé au changement de graine ; ses faces SVG sont résidentes et la rotation
ne demande des RAF que pendant le geste. Le nouvel écran est libéré à sa fermeture.

## Contrôles ROOT et acquisitions par reprises

Sources, tests, publics et pilote natif sont gelés pendant les contrôles ;
**2825 entrées exactes** après le parcours final et le corpus, puis **2827** avec
les deux pilotes de présentation ajoutés au gel. Les agents ont
produit/relu des composants distincts ; ROOT seul exécute les validations.
Les sorties actuelles sont sous `tmp/`, les preuves historiques restent intactes.

| Contrôle | Résultat acquis |
|---|---|
| Unités et frontières | 119 cas uniques/11 fichiers acquis par reprises, dont 36 nouveaux. Dernier groupe58cas/5fichiers PASS19,191s. Candidats stricts, renommage stable, séparation des graines, équipe utilisable, trois biomes/reliefs, climat, forecast, migration229, refus atomique du Decoder et relais réel du client. |
| Corpus public | PASS75,004s,63références/66fichiers byte-identiques : chargement strict, checkpoint, vrai tick sur deux reprises indépendantes, snapshot suivant et sauvegarde. Rapport `tmp/new-game-v333/public-corpus-report.json`. |
| Chrome matériel | PASS41,654s, WebGPU : cinq pages, dialogues, relance d'un candidat, vrai glisser souris5→1, noms invalides, portrait, deux tailles, retours conservés, texte protégé, création250² puis ticks0→7, copie/export/recharge exacte. Console vide. |
| Présentation temporelle | Rouge52,499s sur attente de recharge30s, puis rouge67,147s dès la préparation native : allocation WebGPU refusée. Les gestes45s ne sont pas acquis pour V333. |
| Typage/build Pages finaux | PASS24,383s/3,448s après le correctif de glisser et de mise en page. Gel2827exact. |

Captures et export du parcours final :
`tmp/new-game-v333/native/new-game-v333-V333-five-na-21560-al-selected-people-and-site/`.
Monde42, tuile0, graine locale3398550437 ; sélection finale Marin, Équipe333, Eden.
Les assertions comparent les profils effectivement affichés au monde créé,
sans imposer ces noms au générateur. Les captures monde/site/personnages1440 et
personnages960 ont été inspectées par ROOT. Le petit écran défile : toutes les
lignes ne tiennent pas simultanément à960×720.

### Rouges conservés et corrections

- Typage sandbox7,450s/6,358s : manque de mémoire native1455 ; reprise native
  sans restriction de mémoire, `GOMAXPROCS=2`. Typage16,302s puis16,059s rouges
  sur trois signatures/typage du pilote corrigées ; premier passage15,360s.
- Premier groupe118cas rouge73,929s : timeout30s du témoin Aulnes, ancien nombre
  d'arguments du client, hypothèse d'un seul monde contenant tous les biomes et
  révision initiale de l'encodeur dans le pilote. Ces oracles sont corrigés,
  sans modification des règles pour les faire passer. La reprise historique
 57,952s acquiert le témoin Aulnes avec budget60s, tout en restant rouge sur deux
  cas de fixture195 contenant des aliments futurs. La fixture générée aujourd'hui
  puis étiquetée195 retire ces champs futurs ; aucun fichier public195 ni garde
  de migration n'est assoupli. Reprise intermédiaire15,843s également conservée.
- Natif16,271s : sélecteur de dialogue trop large ;37,360s puis37,734s : vrai
  défaut du glisser, car `pointercancel` natif annulait le drag souris. Le produit
  réserve maintenant cette annulation au geste tactile portant le même pointerId.
  La reprise44,650s atteint la carte et les profils exacts, puis refuse seulement
  la casse incorrecte du backend attendu dans le pilote ; reprise finale41,654s.
- Corpus1,424s : le manifeste désigne le JSON décompressé, pas les octets gzip.
  Reprises40,005s/50,511s : représentation historique `gatherId:undefined` omise
  par les codecs, puis son alias `animalHandling`. Le pilote n'admet que ce champ
  absent et conserve toutes les autres comparaisons strictes. Le rapport final
  relève une omission dans la resauvegarde d'enclosV119 ; le moteur de conduite
  et le codec historique ne sont pas modifiés.

Tous ces journaux restent sous `tmp/validation-runs/v333-*`. Les échecs ne sont
pas réétiquetés PASS ; les garanties sont acquises par les reprises indiquées.

Le contrôle obligatoire `test:presentation` a été exécuté deux fois, sans
réduire les réglages ou remplacer le backend matériel. Le premier s'arrête
après une préparation14,845s et attend la recharge, sans diagnostic conclusif.
Le pilote conserve désormais état/capture des refus de recharge et attend60s,
comme sa préparation initiale, hors fenêtres de mesure ; ses assertions de
travail, continuité et réponse restent intactes. La seconde tentative échoue
avant les gestes, avec `Instance dropped in popErrorScope` et un refus
`createBuffer` pour288octets. Capture et rapport sont conservés sous
`tmp/test-runs/v333-presentation-reprise-2026-10-12T22-16-47.608Z-22680/`.
Ce refus d'allocation n'établit ni une régression du nouveau parcours, ni une
cause mémoire/driver précisément attribuée. Aucune réparation GPU n'est
prétendue, aucune session de l'utilisateur n'est fermée. Le contrôle long reste
non acquis malgré le passage WebGPU du nouveau départ et son export/recharge.

## Limites et suite

La structure et les interactions principales sont branchées et jouées. La parité
exhaustive des pixels, boutons, contenus et dialogues Core **n'est pas certifiée**.
Le nom reste un champ unique, sans prénom/surnom/nom distincts ; cinq laissés sur
place ne deviennent pas des personnes persistantes de la planète. Le générateur
de candidats et le globe sont originaux. Couverture, climat global, population,
édition de factions, dates/taille alternatives, autres scénarios, narrateurs et
difficultés ne sont pas livrés. Aucune rivière, grotte, ruine ou nouveau biome
n'est ajoutée. Des contrôles visibles grisés ne valent pas du contenu.

Le nouveau pilote remplace les hypothèses de navigation trois pages pour ce
contrôle ciblé. Les anciens pilotes Playwright `scenario-start`, `biomes`,
`visual-identity` et `interface-polish` contiennent encore des sélecteurs de cette
navigation historique ; ils ne sont ni rejoués ni annoncés verts pour V333.
La suite complète, une campagne naturelle entière et les performances Aulnes
ne sont pas certifiées par ce lot. Aucun gainCPU/GPU/FPS,240FPS ou vrai×6 constant
n'est annoncé.

La suite prioritaire est l'arrivée physique et l'accompagnement des premiers
jours, puis la qualification des trois biomes et d'une campagne longue avec
reprise. Les capsules d'arrivée et le tutoriel ne sont pas livrés ici.
Commit/push du lot utile sont autorisés, publication unique regroupée avecV332 ;
relance planifiée **PAUSED**, sous-métiers reportés et UI papier sur branche séparée.

## Publication groupée et clôture

Le 13 octobre 2026, le produit `54d20193397ea77a3c4920463f58f206c24c6c81` est
commité/poussé puis publié **une seule fois avec les sauvegardes V332** en
`82fbe736` : [adresse stable](https://elsewhere-cq7.pages.dev/) et
[déploiement](https://82fbe736.elsewhere-cq7.pages.dev/).

Le package commité passe1,857s :515fichiers/119349148octets,63références/66fichiers
publics exacts, laboratoire et sources privés absents ; rapport
`tmp/elsewhere-pages/v333-package-0RlZoM/report.json`. Le package candidat avait
déjà passé1,874s avant commit ; seule la preuve portant le bon HEAD est retenue
pour cette clôture. Typage24,383s et compilationPages3,448s portent les dernières
sources. Documentation PASS3,202s puis PASS2,030s après publication et contrôle
final des liens. Aucun build n'est lancé après le déploiement.

Wrangler4.149.0 passe15,386s : quatre fichiers envoyés/509déjà présents, puis
en-têtes/redirections. L'avertissement Git dirty concerne uniquement le dossier
humain `references_UI/`, intact, non suivi et absent du package. HTTPS passe7,810s :
51chemins sur deux origines,102réponses200/MIME/octets exacts ; le rapport
`tmp/elsewhere-pages/v333-http-4dFymc/report.json` est conservé. Le package et les
publics restent inchangés. Tous les66fichiers
distants ne sont pas téléchargés ; ces réponses prouvent la disponibilité du
package, pas une nouvelle partie jouée en ligne ni un gainFPS.

Le gel final2827reste exact. Chrome de test et Vite5406 possédés sont fermés ;
aucune session humaine n'est touchée. La consolidation documentaire est poussée
sans seconde publication. Le contrôle long de présentation reste non acquis
pour les raisons conservées ci-dessus ; le passage natif du nouveau départ et
la migration/reprise du corpus ont la portée explicitement décrite.
