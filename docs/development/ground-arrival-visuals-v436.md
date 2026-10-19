# Sol inconnu, murs, herbe et capsules — V436

19 octobre 2026, schéma263 inchangé. Correctifs de présentation demandés par
l’utilisateur après V435 ; aucun terrain physique, minerai, règle de découverte,
propriétaire ou format de sauvegarde ajouté.

Le sol non découvert porte un pigment original sombre dans la texture ordinaire
du terrain. Il réutilise le grain et les frontières irrégulières existants ; le
plan uni posé au-dessus du sol est supprimé. Le mode sans textures utilise le
même pigment dans les couleurs des sommets. Avant découverte, eau, pierre et
terre cachées produisent le même sol opaque, sans consulter leurs propriétés
secrètes ni dessiner leur écume ou relief aquatique. Les champs privés de
toiture et lumière intérieure ne dessinent pas leur empreinte dans ce pigment.
Une découverte réelle actualise la texture locale et rétablit la vraie surface,
y compris la hauteur de l’eau. Les roches gardent le pigment V409.

Les faces d’un mur connu ne sont plus découpées parce que leur position tombe
exactement dans la cellule inconnue voisine. Les surfaces opaques concernées
échantillonnent leur côté propriétaire ; les finitions en bois utilisent leur
ancre résidente, y compris leurs débords. Objets et personnes entièrement
cachés conservent leurs masques. Aucune double face de camouflage ajoutée.

Le tapis d’herbe GPU reconnaît désormais Terre fertile, Terre moussue et Terre
marécageuse, en plus des trois anciens sols. Les masques existants de bâtiment,
revêtement, neige et découverte restent applicables. Boue, gravier et alluvions
restent distincts ; la Terre tassée est une véritable surface de route à
fertilité nulle et reste nue. Budgets, géométries et cadence d’upload sont
inchangés ; davantage de brins deviennent visibles, sans gain FPS revendiqué.

Les capsules initiales lisaient une hauteur adoptée par paliers et des
coefficients d’animation retenus à distance. Descente et charnières lisent
maintenant le curseur fractionnaire commun, borné par le dernier tick confirmé,
à toutes les distances. Les phases physiques d’impact sont publiées comme
transitions discrètes, sans publier chaque décrément du compte à rebours. Un
reçu visuel éphémère accompagne chaque ouverture réellement confirmée, sans
réapparition des anciennes capsules au dernier reçu. Aucun personnage ni bien
n’est libéré par l’animation. Une recharge n’invente pas l’heure d’une ancienne
ouverture partielle. L’exception de détail concerne trois capsules,24boîtes,
pendant ces seules animations ; aucun upload de géométrie par image ajouté.

## Qualification

- 51 cas ciblés / 8 fichiers acquis par reprises : pigment, secret du terrain,
  patch exact, legacy, masques, herbe et phases des capsules. Le groupe final
  donne50PASS/1RED59,154s, puis le seul cas réparé PASS36,182s. Son ancienne
  préparation exigeait un Site1/2 sur un monde sans site ; elle utilise maintenant
  un site explicite résolu, sans retirer les 500 comparaisons atlas incrémental /
  recalcul complet. Les deux premières réparations et leur rouge restent conservés.
- Typage initial PASS68,420s, livraison PASS67,923s après trois erreurs de types corrigées, sans changement de
  validateur. Aucun schéma ou source physique SIM modifié.
- Chrome155/WebGPU AMD RDNA1, témoin préparé12² PASS9,395s :32faces de murs,
  quatre orientations, bois/pierre et deux hauteurs, textures activées/désactivées.
  Zéro pixel de différence avec leurs références connues ; objets entièrement
  cachés invisibles. Sol caché identique pour eau/pierre/minerai/terre, grain et
  éclairage actifs, toit caché sans empreinte, révélation et patch exacts.
  Trois captures inspectées ROOT. Ce témoin isolé n'active pas les ombres.
- Vraie création250² par les menus, case26790, puis reprise de la même graine
  et case après oubli du lecteur DEV dans le premier paquet privé. Au second
  parcours :887variations entre ticks en descente,90en ouverture,1101témoins
  pausés, aucune erreur d'horloge, personnes visibles seulement après sortie
  confirmée. Vue proche/intermédiaire et trois captures inspectées ROOT.
  Ce sont les entrées GPU réelles et une évaluation indépendante, pas un
  relevé des sommets GPU ni une mesure FPS.
- L'export réel final40 est validé ; la recharge dépasse le délai local30s du
  pilote, rouge208,340s conservé. Reprise limitée à cet export en PAUSE,
  PASS82,900s : campagne entière exactement égale, aucun tick rejoué. Son atlas
  couvre25521cases de Terre fertile et1483de Terre riche après leurs masques ;
  gravier/sable/pierre restent nus. Le lot ne prétend pas corriger les temps
  de préparation graphique de ces chargements.

Les deux fichiers historiques `starting-arrival-bridge` et
`starting-arrival-save`, également lancés, conservent34RED hors du groupe
ci-dessus : leur producteur de personnes legacy reçoit `mental.wander` moderne
hors provenance géographique, et le faux schéma230 conserve un registre apparu
en255. Refus initiaux conservés, aucun validateur assoupli. Ils n'appellent pas
l'observateur `PresentationChanges` modifié ici. Cette identification statique
ne constitue pas une réparation de ces producteurs historiques ni une suite
complète verte. La création géographique réelle et sa recharge restent
distinctes de ces préparations.

Rapports, captures, exports, entrées et gels sous `tmp/visual-fixes-v436/` et
journaux `tmp/validation-runs/visual436-*`. Premier natif surfaces refusé sur
connexion au serveur isolé ; reprise sur serveur accessible sans changer les
sources. Premier parcours de présentation générale resté au menu faute du
paramètre `scenario=camp` ; reprise avec son URL complète, sans jouer ce parent.

La reprise du contrôle commun termine ses deux phases de 45 secondes, puis
l'enveloppe expire à 180,200s. Les deux rapports et captures complets sont
conservés : minage9758images, abattage8179images,22changements de vitesse chacun,
zéro saut/traversée/starvation et erreurs[]. Les assertions communes originales
sont réappliquées hors navigateur à ces mêmes résultats : PASS0,203s, sans
rejouer une phase ni changer un seuil. Les deux captures sont inspectées ROOT.
L'enveloppe reste rouge ; les deux phases sont acquises par cette reprise,
sans annoncer une commande générale entièrement verte. Reçu
`tmp/visual-fixes-v436/presentation-acquired.json`.

Revue indépendante statique des sols/murs et des capsules sans défaut bloquant
après correction des champs privés d’éclairage et des corniches. Aucun banc
FPS non affecté ni campagne longue rejoué pour ce lot. Les objectifs de confort
et de performances de V435 restent ouverts.

## Publication

Produit `05de177655f00380a6bade0b463d8da4fd9e3e43` commité et poussé sur
`origin/main`. Typage final acquis séparément ; build Pages de ce HEAD
PASS7,599s, paquet PASS7,157s :542fichiers/151647161octets,68fiches et71chemins
publics exacts, sondes privées absentes. Rapport
`tmp/elsewhere-pages/v436-package-8i1TCK/`.

Publication Wrangler4.149.0 [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
PASS17,850s ; [déploiement c113c1a0](https://c113c1a0.elsewhere-cq7.pages.dev)
et [site public](https://elsewhere-cq7.pages.dev). Contrôle distant140réponses
HTTPS200/MIME/octets exacts, rapport `tmp/elsewhere-pages/v436-http-7Zsffz/`.
Ces contrôles d'octets ne sont pas un nouveau parcours distant ni une mesure
FPS. Les Aulnes, Les Éclaircies, Les Forges et les archives publiques restent
inchangées ; `references_UI/` reste hors commit. Aucun serveur ou navigateur
humain fermé.
