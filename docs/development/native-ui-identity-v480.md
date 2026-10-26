# Identité matérielle et lisibilité de l’interface V480

## Portée et état

**Qualification locale acquise par reprises :** 124 cas ciblés distincts, les parcours natifs de fixture puis de vraie colonie, le typage final, le build et deux comparaisons encadrées sont acquis ci-dessous. La matière et la lecture sont harmonisées ; de petits surcoûts CPU et des ouvertures plus longues restent mesurés. Aucun coût nul, gain FPS global, déploiement ou accomplissement de l’objectif global n’est revendiqué.

La demande humaine porte sur l’interface de la partie : uniformiser sa matière avec les boutons de la barre du bas, corriger les chevauchements et améliorer la présentation des informations. Les huit captures jointes sont les exemples de défauts à traiter ; elles ne limitent pas les corrections aux seules fenêtres photographiées. La barre native du bas et le prototype carton fourni restent la référence visuelle de découpe, de peinture, de tranche et d’interaction. Les contenus du jeu, les commandes et leurs gardes restent l’autorité fonctionnelle.

La base est le commit **`a67ed80a`**, V479. Une archive de HEAD est conservée sous `tmp/ui3d-identity-v480/baseline/`, avec **2 031 fichiers source**, sans recopier les références humaines non suivies. Le témoin de mesure reproduit désormais les empreintes brutes de la V479 qualifiée, y compris ses fins de ligne mixtes ; le reçu est détaillé plus bas. L’aperçu 5196 et `references_UI/` sont préservés. Core, simulation, règles de recherche, contenu des sauvegardes et schéma 293 ne font pas partie de ce lot. Aucune publication n’est demandée.

## Réponses aux captures humaines

| Demande | Traitement intégré et couvert par les contrôles ci-dessous |
|---|---|
| Météo, capture 1 | Une silhouette native découpée illustre le soleil, les nuages, la pluie ou la neige ; le petit rectangle coloré de gauche disparaît. |
| Vitesse, capture 2 | Pause, lecture et accélérations utilisent des tracés peints à la main. Le carton actif se soulève et s’incline vers le joueur, selon le langage de la barre du bas. |
| Survol, capture 3 | Le placement du texte tient compte de l’espace pris par Ordres/Zones ; le texte doit rester lisible sur le jeu. |
| Plateau, capture 4 | Les actions restent sur une seule ligne. La largeur disponible détermine leur taille et, sur petit écran, un défilement horizontal remplace le retour à la ligne. |
| Matière et Architecte, capture 5 | Panneaux, encadrements et boutons partagent le carton épais, la tranche et la peinture sèche du prototype. Catégories et constructions deviennent des cartes compactes avec picto et bande de légende. |
| Listes, capture 6 | Les fiches de liste sont distinguées, les titres et valeurs alignés, et les actions courtes restent à droite des informations correspondantes. |
| Lecture, capture 7 | Le texte courant demeure neutre ; personnes, objets, actions, valeurs et avertissements reçoivent une encre cohérente et une emphase mesurée. |
| Dossiers, capture 8 | Les sous-parties gagnent de l’espace et les onglets d’un colon gardent une seule taille de fiche, de rangée d’onglets et de pied portrait/actions. |

Le clic hors d’une fenêtre emprunte sa voie normale de fermeture, avec consommation du geste pour ne pas transmettre un ordre au terrain. Les espaces transparents internes restent des zones d’UI. Les intitulés de la barre principale et d’Ordres/Zones conservent leur propre bascule d’ouverture/fermeture ; ils n’effectuent pas une fermeture suivie d’une réouverture accidentelle.

## Charte matérielle

Le carton est une géométrie native Three.js, avec une face peinte et une tranche visible. Les nouvelles pièces de panneau et de contrôle utilisent une profondeur **`.046`** et une irrégularité de bord **`.038`** en unités de scène. Le fond blanc/beige est une couche de gouache sur kraft : coups de pinceau, traces de peinture et grain borné remplacent le grand motif de polygones d’aplat. Les bandes de légende claires et les pictos au feutre reprennent le langage des cartons de la barre du bas.

La peinture reste procédurale. Elle utilise les surfaces et le cache existants ; les textes sémantiques sont peints dans le canvas de la fiche, sans créer de nœud DOM, de texture ou de géométrie par mot. Les surfaces inchangées et les ressources conservées de V478/V479 restent réutilisées. Ces choix limitent les ajouts ; ils ne prouvent pas à eux seuls une équivalence de coût.

| Rôle de texte | Encre | Emphase |
|---|---|---|
| Phrase ordinaire | Brun neutre `#261e18` | Normale |
| Personne connue | Bleu `#365e77` | Gras |
| Objet connu | Vert `#456444` | Gras |
| Action | Brun chaud `#86532f` | Gras |
| Nombre ou valeur | Prune `#754e76` | Gras |
| Avertissement | Terre cuite `#9b3e32` | Gras |

Un prénom provient d’une entité explicitement connue du jeu ; une majuscule ne suffit pas à classer un mot comme personne. Le contenu et les signes de ponctuation sont conservés. Les lignes calculées par la mise en page restent les lignes de peinture : le gras ne doit pas ajouter une ligne de texte sans réserver sa hauteur.

## Proportions et disposition

- Texte courant **14 px**, ligne **20 px**, texte secondaire **12 px** ; boutons et onglets ordinaires **34 px**, espacements **10 px**, marge **14 px**. Les matrices conservent leurs colonnes alignées.
- Architecte garde trois régions indépendantes : catégories, catalogue et options. Sa largeur plafonne à **1 180 px**. Les catégories forment deux colonnes de cartes proches de **95×96 px** ; le catalogue emploie des cartes hautes de **104 px**, larges de **96–104 px**, sans les étirer pour remplir l’espace restant. Les régions se réorganisent sur les petits écrans et conservent leur défilement.
- À 1440×1000, un catalogue court de sept cartes tient dans un panneau **1180×476 px** ; vingt cartes demandent **508 px** de haut. Les dimensions sont calculées depuis le contenu et plafonnées par le viewport. Ces chiffres décrivent les calculs de disposition, pas une acquisition de présentation.
- Ordres/Zones restent sur une rangée de **46 px**. Douze icônes occupent **642 px** aux viewports 1440/960 ; sur un viewport plus étroit, les icônes ne descendent pas sous **42 px** et la région expose sa largeur de contenu pour le défilement horizontal.
- Le dossier de colon garde **700×620 px** à 1440×1000, et **700×600 px** à 960×800, pour tous ses onglets. À taille de viewport égale, le corps, les onglets et le pied de fiche ne changent pas de dimensions selon le contenu. Les douze compétences occupent **388 px** dans un corps de 426/406 px. Les informations longues restent conservées et accessibles par défilement.
- Pendant l’affichage d’un dossier, les intitulés Ordres/Zones restent visibles en 1440×1000 et se masquent en 960×800 pour ne pas couvrir les commandes de temps. Les quatre vitesses restent atteignables par le raycast natif dans les deux dispositions. Le survol de terrain conserve ses accents et caractères UTF-8 ; ce correctif d’affichage ne change pas les règles du terrain.
- Les listes de l’Historique et des Animaux utilisent respectivement des largeurs maximales de **720** et **900 px**. Une voie de texte réservée empêche l’action à droite de recouvrir les valeurs ou les détails du même enregistrement.

La demande actuelle autorise une fiche modérément plus large et plus stable. Les anciennes limites strictes de 514×489 ou les anciennes cartes de 148 px ne sont donc pas reprises comme objectifs V480. Les contrôles doivent conserver les informations, jauges, commandes et tooltips ; ils ne doivent pas imposer les anciennes dimensions contre la nouvelle demande.

## Acquisitions fonctionnelles disponibles

Les heures de cette section sont en UTC le **26 octobre 2026**. Les contrôles lourds sont exécutés successivement par ROOT ; les agents n’exécutent ni navigateur ni benchmark en parallèle.

| Contrôle | Résultat acquis à ce checkpoint | Preuve |
|---|---|---|
| Groupe initial ciblé, 13 fichiers | 115 cas passent ; un ancien oracle attend encore 514×489 et échoue ; commande **40,022 s** | `tmp/validation-runs/ui480-targets-first-2026-10-26T00-26-53.006Z-9132/` |
| Reprise du fichier d’inspecteur | **10 cas passent, 19,539 s**, dont neuf déjà acquis | `tmp/validation-runs/ui480-inspector-oracle-2026-10-26T00-28-46.202Z-25732/` |
| Typage après première réparation | PASS, **19,656 s**, avant les derniers petits correctifs d’interaction et d’affichage | `tmp/validation-runs/ui480-type-repaired-2026-10-26T00-35-14.788Z-4480/` |
| Fixture native WebGPU, 1440×1000 et 960×800 | PASS, **37,600 s** | `tmp/ui3d-identity-v480/fixture-2026-10-26T00-43-03.434Z-32044/` |
| Première vraie GameSession Éclaircies 250×250 | PASS, **108,957 s** pour la commande, **106,183 s** internes ; preuve antérieure conservée | `tmp/ui3d-identity-v480/game-2026-10-26T00-45-03.213Z-1740/` |
| Reprise de disposition/conservation et cas de politique unique | **38 cas passent dans 6 fichiers, 19,460 s**, dont le nouveau cas du doublon | `tmp/validation-runs/ui480-final-layout-retention-2026-10-26T00-59-45.325Z-24656/` |
| Derniers contrôles disposition et affichage du terrain | **14 cas passent dans 2 fichiers, 16,686 s** ; sept cas de disposition déjà acquis et sept nouveaux cas terrain | `tmp/validation-runs/ui480-display-final-targets-2026-10-26T01-18-54.317Z-21792/` |
| Vraie GameSession finale, après dégagement du dock et UTF-8 | PASS, **96,356 s** pour la commande, **93,650 s** internes | `tmp/ui3d-identity-v480/game-2026-10-26T01-22-58.387Z-4940/` |
| Typage final | PASS, **15,665 s** | `tmp/validation-runs/ui480-type-acquired-2026-10-26T01-32-15.388Z-29076/` |
| Build Vite final | PASS, **4,706 s** | `tmp/validation-runs/ui480-build-acquired-2026-10-26T01-33-13.049Z-12396/` |

**124 cas distincts sont acquis par reprises :** 116 cas initiaux qualifiés par les 115 premiers cas passants et l’ancien oracle corrigé, puis un nouveau cas sur le doublon de politique et sept nouveaux cas d’affichage du terrain. Les neuf doublons du premier fichier repris, les cas voisins des 38 contrôles et les sept cas de disposition des 14 derniers ne sont pas ajoutés à nouveau au total. Le groupe initial n’est pas présenté comme un rejeu intégral sur les sources finales.

La fixture utilise un World préparé 32×32 et des états de lecture déclarés ; elle ne prouve aucune acquisition de gameplay. Elle contrôle les silhouettes météo natives, les glyphes et la pose des quatre vitesses, le dégagement du texte de survol, les plateaux sur une ligne, les cartes d’Architecte, la fermeture extérieure, les sept onglets de dossier, les encres sémantiques et les groupes des listes. Les couleurs de chacun des six rôles sont observées dans les pixels peints. La préparation du prisonnier emploie un état Core valide et déclaré pour vérifier le septième onglet. Les sources et le pilote sont figés pendant le parcours ; les sources critiques servies sont vérifiées.

Le parcours réel importe Éclaircies au tick **1730**, schéma historique **263**, puis utilise sa migration normale vers le schéma courant **293**. Les contrôles de vitesse envoient de vraies commandes **1, 3, 6 puis 0** : la simulation progresse jusqu’au tick **1782** dans le parcours final. La sauvegarde témoin d’exactitude des seules sélections UI est donc capturée **après ces vitesses**, au tick1782 ; elle n’est pas comparée comme si aucun temps n’avait passé depuis l’entrée1730. Le premier parcours avait atteint le tick1786 et reste une preuve distincte, sans jointure de ses sauvegardes avec celles de la reprise finale.

Les plateaux, les matériaux/orientations d’Architecte, les six onglets ordinaires du colon aux deux viewports, les listes, la sélection de recherche sans mutation et les vrais lancement/suspension sont acquis dans cette session finale. Elle ajoute la vérification du dock masqué en 960, conservé en 1440, des quatre commandes de vitesse non obstruées et du texte de survol sans séquences UTF-8 corrompues. Sept exports entiers figurent dans son rapport. `before-ui`, `after-ui-only`, `before-research` et `after-research-selection` ont le même SHA256 `6eca57d1e7baef0f78185b0feaa9bbff2396c22eaa6d2f719b59934caf4cb99d`. Après suspension et recharge, la sauvegarde entière conserve exactement le SHA256 `92cb686224f7f7a41ab47056490a2907af2e3cb3a4c8b5775f889ff65ab08e3b`, au même tick1782 ; les préférences UI sont conservées également. Les commandes de vitesse ne sont ni une réparation de World ni une dotation de ressources.

Le reçu `tmp/ui3d-identity-v480/final-source-custody.json` confirme **2 034 sources finales exactes** entre cette GameSession et la dernière comparaison de coût. Les **1 766 sources hors UI** restent exactement celles de V479. Le rapport GameSession final a le SHA256 `7befced1cbd8281f6dfb52ef64bf147b788faebf8baf200d07c5483fc193da88`. Les typage/build15,230s/6,271s antérieurs sont conservés dans leurs journaux, mais les résultats15,665s/4,706s ci-dessus portent les derniers correctifs.

## Échecs et reprises conservés

Le premier typage échoue en **21,119 s** sur l’inférence trop large de `presentation` dans un tableau de lignes. Le typage19,656s ci-dessus acquiert sa correction, sans requalifier ce premier essai.

Deux fixtures natives échouent puis restent conservées : **28,423 s** dans `fixture-2026-10-26T00-36-43.446Z-29052/`, puis **18,448 s** dans `fixture-2026-10-26T00-38-37.752Z-30112/`. La première trouve une vraie interaction de fermeture : un clic sur l’intitulé actif fermait le panneau comme clic extérieur, puis le réouvrait par sa bascule. Le raccord distingue maintenant les boutons de navigation de cette fermeture extérieure. La seconde fournissait un booléen à la place d’un dossier de prisonnier ; la fixture est corrigée avec `createPrisonerState`. Ce dernier échec de préparation n’est pas attribué à une partie réelle. La fixture37,600s porte les deux reprises.

## Provenance du témoin et mesures du coût

La première tentative de coût s’arrête **avant les fenêtres de mesure**, en **3,926 s**, car les octets du témoin extrait ne satisfont pas le garde strict des seules modifications UI : les fins de ligne brutes mixtes n’avaient pas été reproduites exactement. Le lot reste exclu de toute comparaison. Le témoin est ensuite reconstruit contre les empreintes de la V479 acquise : **2 031 sources exactes**, dont huit fichiers rétablis depuis leurs variantes d’octets qualifiées plutôt que la seule extraction Git. Le reçu `tmp/ui3d-identity-v480/baseline-qualified-restoration.json` référence le rapport V479 SHA256 `298af29847a2fc2e41e5f23f405ada5be426ce114c77793ff7577a619279b0d7`. Cette réparation de témoin ne constitue pas un changement Core produit.

La seconde tentative s’arrête également avant acquisition, en **7,964 s**, sur `ERR_CONNECTION_TIMED_OUT` vers le serveur local5197. Elle reste exclue. Le serveur privé est relancé hors du job qui restreignait la connexion ; les deux ports renvoient HTTP200 avant la reprise. Les reçus `baseline-restart-identity.json` et `baseline-network-restart.json` conservent son identité ; aucun navigateur humain n’est arrêté.

Le premier lot **W/C/W**, **148,522 s**, est acquis dans `tmp/ui3d-identity-v480/identity-ui-ready-2026-10-26T00-56-07-303Z-10392/`, rapport SHA256 `69630a2c57ca59099ec87b6b3ed1f6d61bdd32c51dc70ccd4832c274abe66ebd`. Il emploie une seconde de chauffe. Le survol de Recherche y consomme **2,088 ms CPU/image**, contre **1,182–1,411 ms** entre les deux témoins : **+0,677–0,906 ms**, conservés. Le survol d’Architecte repeint environ74% de pixels en moins mais consomme2–5% de CPU supplémentaire dans ce premier lot. Les conclusions ne sont pas remplacées par celles du lot suivant.

Un unique diagnostic CPU borné est ensuite acquis en **38,319 s**, sous `tmp/ui3d-identity-v480/research-cpu-2026-10-26T01-12-56.719Z-32092/`. Chaque variante reçoit quatre secondes de chauffe puis quatre secondes de survol sous profileur V8 à1ms. Le CPU instrumenté par image **1,725→1,701 ms** ne reproduit pas le surcoût précédent. Le self du suivi de dommages augmente, tandis que les familles complètes de rendu/cache et de matrices diminuent ; le seul self `updateMatrixWorld` ne permet pas de conclure au coût de toutes les matrices. GC mineur et aucune compilation dominante sont observés. Les profils incluent des franges temporelles analysées séparément ; ils ne constituent pas une nouvelle qualification de vitesse. **La cause des +0,677–0,906 ms n’est pas établie**, et aucun correctif de performance n’est inventé à partir de ce diagnostic. Le pilote exact est conservé dans son dossier sous `driver-acquired.mjs`.

La dernière série **W/C/W**, **180,279 s**, porte les sources finales après les deux corrections de présentation du dock et du texte UTF-8, dans `tmp/ui3d-identity-v480/identity-ui-warm-final-2026-10-26T01-28-50-011Z-16080/`. Son rapport a le SHA256 `624b12b24659455de4b250e0135a7674ca5fce04b03d7816463fb398b2452e4f`. Les quatre cas reçoivent désormais **quatre secondes de chauffe**, puis trois secondes au repos et quatre secondes de survol/20mouvements sur les mêmes actions. Les24RAW et leurs empreintes permettent de conserver chaque fenêtre. Le changement de chauffe distingue les protocoles ; la différence entre lots ne mesure pas un gain causal du code.

| Survol, CPU du thread par image | Témoin1 V479 (ms) | V480 (ms) | Témoin2 V479 (ms) | Lecture limitée au banc final |
|---|---:|---:|---:|---|
| HUD et vitesses | 1,117 | 1,141 | 1,089 | +0,024 à0,051ms |
| Ordres | 1,063 | 1,093 | 1,065 | +0,028 à0,030ms |
| Architecte/Mobilier | 1,350 | 1,197 | 1,268 | −5,6 à−11,4% ; pixels≈64,85M contre249,97–251,67M, soit≈−74% |
| Recherche | 1,282 | 1,300 | 1,211 | +0,018 à0,089ms ; le fort écart initial n’est pas reproduit |

Le repos d’Ordres reste plus coûteux : **0,624 ms/image**, contre **0,496–0,546 ms**, soit **+0,078–0,129 ms**. Les ouvertures coûtent aussi davantage en modèle et peinture : Architecte **46,4 ms**, contre **35,9–36,6 ms**, et Recherche **83,3 ms**, contre **41,9–46,2 ms**. Ces coûts ponctuels et ce surcoût au repos sont conservés comme limites ; une faible différence de cadence ne les efface pas.

Toutes les fenêtres finales au repos gardent **deux appels UI et zéro recapture** ; les recaptures au survol restent partielles. Les p99 d’intervalle restent proches de4,3–4,6ms dans ce petit hôte proche de240Hz ; ce n’est pas une mesure de la partie entière. Objets et textures restent stables dans chaque phase, avec un objet et, après chauffe, une texture supplémentaires par rapport au témoin. Ces compteurs ne prouvent ni mémoire vidéo physique ni absence générale de fuite. Le CPU inclut la frange CDP de39,7–97,9ms autour des fenêtres, sans soustraction artificielle. Les trente collectes League/Riot/Brave ne trouvent aucun processus correspondant ; elles ne certifient pas l’absence de toute charge externe. Les tables complètes et recalculs des24RAW figurent dans `analysis.md` et `analysis.json` du dernier dossier. Les chemins des deux dernières corrections de source ne sont pas exercés par ces quatre cas de coût : ni leur causalité ni celle de la chauffe n’est déduite des différences entre lots.

Cette comparaison est limitée à l’UI native isolée ; les résultats V479 ne remplacent pas une mesure de V480. La présence des clients League ou de Brave ne prouve pas une charge identique. Aucun gain FPS global, coût GPU causal, équivalence HTML ou absence générale de surcoût ne sera déduit d’un simple nombre d’objets ou d’appels de dessin.

Le seul serveur témoin5197, PID12040, est fermé après revalidation exacte de son identité à **01:34:37,213 UTC** ; le reçu est `tmp/ui3d-identity-v480/baseline-server-closed.json`. L’aperçu5196 et les serveurs humains5173/5184 restent préservés. La vérification documentaire passe en **11,963 s** (`ui480-docs-final-2026-10-26T01-38-48.161Z-24040`). Le lot cohérent est destiné à son propre commit, sans référence humaine ni prototype privé. La reprise humaine des six ensembles après enregistrement est une priorité distincte ; elle ne constitue pas une publication supplémentaire ou un accomplissement de l’objectif global. Les preuves précédentes restent conservées séparément.
