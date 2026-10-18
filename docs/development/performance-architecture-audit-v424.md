# Audit critique de l’architecture et objectif 200 FPS — V424

18 octobre 2026. Demande humaine : reprendre du recul sur l’architecture, sans exclure une refonte ni une migration de technologie. Poste déclaré : Chrome, écran 1440p, Ryzen 5, Radeon RX 5700 XT ; fréquence d’écran et modèle précis du Ryzen non communiqués. Audit du HEAD `7c3060d4`, produit V423 inchangé, schéma 263 inchangé. Aucune nouvelle mécanique ni amélioration de fluidité livrée par cet audit.

## Conclusion

**L’architecture actuelle a des garanties fonctionnelles utiles, mais son chemin courant de présentation n’est pas adapté à un objectif de 200 images/s stables.** Elle sépare déjà simulation déterministe, Worker, commandes et rendu GPU instancié. Ces acquis sont à conserver. En revanche, son coût récurrent dépend encore trop de la taille du monde et de l’ensemble des règles, même lorsque peu de choses changent. Les corrections locales V420–V423 ne changent pas suffisamment cette propriété.

200 FPS donnent 5 ms entre images. Les dernières adoptions synchrones MAIN mesurées en V423 durent en moyenne 24,64 ms sur Les Aulnes et 16,74 ms sur le départ trois colons. Elles occupent le fil qui doit traiter les entrées et dessiner. Il ne suffit pas que leur coût moyen sur une seconde soit supportable : chaque bloc contigu peut faire manquer plusieurs échéances d’image. Leur réduction récente n’a pas démontré une meilleure fluidité du départ neuf.

**Choix recommandé : refondre la frontière simulation → présentation, puis traiter le runtime spatial de l’écologie et le coût fixe de soumission graphique.** Rust/WASM, un Worker de rendu et un moteur natif restent des candidats ; aucun gain n’est acquis pour ces options. Une migration doit emporter les données et les responsabilités qui causent le coût, pas simplement traduire les mêmes parcours dans un autre langage.

## Ce qui est établi, et ce qui ne l’est pas

- [V422](foundations-performance-regression-v422.md) situe un saut du Decoder public Node entre V407 et V408, sur une seule carte des Aulnes : médianes 34,654 → 58,305 ms. Le registre V407 seul ne montre pas ce saut. Cela identifie une régression de ce chemin, pas la cause exhaustive des FPS natifs.
- [V423](snapshot-adoption-v423.md) réduit le Decoder dans Chrome, mais le départ neuf passe de 120,26 à 93,56 RAF/s dans l’agrégat de deux courtes fenêtres par version. Les p99 et blocages restent mauvais. Une amélioration de microbanc ne constitue pas un résultat joueur.
- La partie neuve de référence contient trois colons, zéro ordre, 28 371 ressources, 162 structures, 1 630 piles et 56 animaux sur 250². Cette population explique des traitements possibles ; elle ne justifie pas de rescanner tous ces objets à chaque mise à jour.
- [V420](performance-foundations-v420.md) mesure des passes GPU d’environ 1,65–2,13 ms en moyenne. Uploads hors passes, attente et compositeur sont exclus. Ces chiffres à 1440×1000 ne disculpent pas le GPU en 2560×1440 : cette dernière surface a 2,56 fois plus de pixels, sans que les coûts doivent croître linéairement.
- Le ralentissement signalé en pause ne pourrait pas être expliqué uniquement par la simulation ou le Decoder : dans les fenêtres de pause historiques, ticks et adoptions sont nuls. V423 observe 217–234 RAF/s moyens et aucune image >33,3 ms en pause dans son banc, sans reproduire le signalement du joueur. Le rendu et sa soumission doivent être examinés séparément en 1440p.

## Défauts structurels observés dans le code

### 1. Le flux de présentation réplique trop de simulation

`src/bridge/snapshots.ts:470,797,890` : `DynamicWorld` retire quelques collections, mais conserve beaucoup de domaines de simulation, politiques, calendriers, dossiers et structures sous le seuil sparse de 1 000. Une petite mise à jour reste l’occasion de transporter et contrôler un état riche. Le départ neuf, avec 162 structures, les envoie intégralement.

`src/bridge/SimulationClient.ts:133` : chaque message est adopté synchroniquement, puis livré aux consommateurs. Aucune régulation par accusé de consommation ne borne les publications en vol. Le rendu peut différer l’application d’un état, mais le Decoder a déjà payé son coût.

`src/bridge/simulation.worker.ts:419` : chaque changement discret peut publier ; sinon la fin du batch publie sa confirmation. Les vitesses réellement proposées sont ×1/×3/×6, avec 6/18/36 ticks locaux/s visés. Augmenter la vitesse augmente donc aussi le travail de publication. Le clone natif par `postMessage` n’emploie pas de liste de transfert (`:82`). Son coût et le transit ne sont toujours pas isolés par `stepMs`.

**Attention : jeter arbitrairement des deltas n’est pas une correction.** Le protocole exige un prédécesseur adjacent exact (`snapshots.ts:1182`). Il faut construire une fusion valide ou un état relatif à une base acquittée. Commandes, ACK, alertes, sons et changements de phases visibles doivent conserver leurs règles et leur chronologie ; les événements de contact ne sont pas de simples positions écrasables.

### 2. Différentiel en données ne signifie pas différentiel en travail

`tile-snapshot-cache.ts:46` relit toutes les cases. `snapshots.ts:817,863,896` parcourt ressources, piles et structures ; les structures utilisent une égalité profonde avec `Object.keys` (`:568`). Le Decoder recrée deux Maps à partir de toutes les structures même pour un delta vide (`:605`) ; un remplacement reconstruit encore le tableau (`:636`). Une modification de ressources copie le tableau de références (`:1271`).

Le plancher de publication dépend donc de la surface A, des ressources R, des piles P et du contenu des structures S, pas seulement du nombre K de changements. Les witnesses privés V423 réduisent des validations répétées, mais sont des exceptions locales à ce modèle général.

**Responsabilité à extraire :** des mutations déclarées par domaine, avec révisions, journal des changements et indices possédés. Les producteurs connaissent déjà ce qu’ils viennent de modifier ; le transport ne devrait pas devoir le redécouvrir en comparant tout le monde.

### 3. L’écologie reconstruit un contexte global pour une décision locale

`wild-plant-runtime-256.ts:88,105,115`, `wild-plant-runtime-map-256.ts:36` et `actual-plant-physical-masks-256.ts:17` : une tentative locale peut provoquer une capture des masques de toute la carte, sept grilles typées et deux tableaux de métadonnées, puis leur validation. `wild-plant-spawner-256.ts:28` reconstitue occupation et compteurs depuis les plantes existantes.

Le profil natif V421 conserve 656,160 ms inclusifs dans la flore sur sa courte fenêtre B, avec recouvrement des sous-fonctions. Ce n’est pas un coût par tick ; cela confirme néanmoins que la responsabilité mérite une refonte, au-delà de quelques allocations retirées.

**Responsabilité à extraire :** un runtime spatial persistant et invalidé par les vrais changements de terrain, support, occupation et population. Reconstruction complète à l’import, mises à jour locales ensuite. Même ordre de décision, mêmes valeurs et même flux PRNG : aucune réduction arbitraire de cadence, simplification des règles ou croissance rétroactive.

### 4. Des lots graphiques sans contenu ont encore un coût CPU

`WildlifeLayer.ts:164,200,343,355` crée un rig pour toutes les espèces, laisse les meshes visibles sans frustum culling, refiltre animaux et piles par espèce lors d’une adoption et parcourt les rigs à chaque image. Dans Three 0.186 épinglé, un lot à zéro instance peut entrer dans la liste de rendu et traverser nodes/bindings/pipeline avant le refus tardif de dessin (`Renderer.js:3290,3871`, `WebGPUBackend.js:2222`). Son coût précis n’est pas encore mesuré.

**Responsabilité à extraire :** appartenance aux espèces actives calculée une fois, lots vides réellement exclus de la soumission, préparation des shaders conservée. C’est un candidat local pour vérifier le coût fixe du rendu ; ce correctif seul ne résoudrait pas les publications longues.

### 5. La visibilité et les mises à jour graphiques restent trop globales

`FurnitureLayer.ts:94` utilise un lot global pour de nombreux meubles ; un objet visible peut donc entraîner la soumission d’instances de toute la carte. `BoxBatches.ts:152,183` conserve des parcours complets de bornes et des uploads globaux lors de certains patches/rebuilds. Ces coûts ne sont pas systématiquement par image.

Terrain, roches, ressources et piles ont déjà des découpages ; il serait faux de prétendre que le jeu ne possède aucun chunking. Le paysage retient ses commandes seulement en vue distante (`SceneRenderCore.ts:1368`). Il manque une politique spatiale cohérente entre couches et entre les vues principale/ombres.

`SceneRenderCore.ts:1276` poursuit beaucoup de présentation même en pause. Des gardes évitent plusieurs calculs ; les ombres et le rendu/blur de la pièce ont déjà des caches. Le composite couleur/profondeur de la pièce demeure plein écran (`RoomBackdrop.ts:97`). Le HUD est limité à 5 Hz et les labels disposent de gardes : « le DOM entier est reconstruit à chaque image » serait une explication erronée.

**Responsabilité à extraire :** projection visuelle persistante, invalidations distinctes pour monde/horloge/caméra/interaction, ensembles visibles par couche et mises à jour de plages de buffers. Rendre sur demande en pause peut réduire la consommation, mais ne doit pas servir à fabriquer un compteur de 200 FPS.

## Robustesse, évolutivité et maintenance

Les acquis utiles sont la simulation déterministe, les sauvegardes strictes, les migrations explicites, les commandes ordonnées, les propriétaires physiques et les buffers GPU résidents. Rien dans les observations ne justifie leur abandon.

Le problème de maintenance est le couplage : chaque nouveau domaine métier peut alourdir le transport et les lecteurs de présentation, même hors usage. Au HEAD audité, `main.ts` a 2 276 lignes/233 lignes d’import, `snapshots.ts` 1 663/193, `SceneRenderCore.ts` 1 671/114. Ces nombres ne prouvent pas seuls une mauvaise architecture ; les dépendances entre validation métier, adoption et dessin, visibles ci-dessus, sont le problème concret. Ajouter un propriétaire/certificat privé par symptôme rend cette frontière plus difficile à maintenir.

La cible doit avoir trois modèles distincts : état autoritaire du jeu, format de sauvegarde/versionnement, modèle de lecture de l’interface et du rendu. Un panneau peut demander des détails à l’autorité quand il s’ouvre ; chaque image n’a pas besoin de tous les dossiers. Conserver les contrôles stricts RAW/import/migration et les gardes complets du checkpoint ; le Decoder actuel n’exécute pas `validateWorld` entier, mais ses gardes de transport explicites. Définir les transitions du flux privé par un contrat validé et atomique, sans refaire chaque règle inchangée sur MAIN.

## Choix de technologie, sans exclusion de principe

Sources primaires consultées le 18 octobre 2026 ; les recommandations ci-dessous sont des inférences, pas des performances mesurées.

| Option | Intérêt ici | Limite et condition de choix |
|---|---|---|
| TypeScript, projection compacte et indices persistants | Peut supprimer les rescans redondants et réduire allocations/GC tout en conservant les règles actuelles | Premier prototype recommandé. Son coût complet, y compris la production des deltas, doit être mesuré |
| ArrayBuffer transférables | Format numérique compact, transfert de propriété plutôt que copie des gros tableaux | Réutilisation/retour des buffers à concevoir ; le graphe World ne devient pas transférable par magie. [Standard HTML](https://html.spec.whatwg.org/multipage/structured-data.html#transferable-objects) |
| SharedArrayBuffer + Atomics | Partage de stockage de présentation sans recopies répétées | Cohérence de publication et durée de vie des lecteurs explicites ; isolation COOP/COEP absente actuellement de nos en-têtes. Ne supprime aucun scan. [Standard HTML](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal) |
| Rendu en Worker/OffscreenCanvas | Peut isoler la boucle graphique des longues tâches DOM/MAIN | Déplacer le même Decoder dans le worker qui dessine recréerait le blocage. Protocole entrées/assets/labels et adoption à séparer ; compatibilité Three 0.186/WebGPU et couches actuelles à qualifier. L’[exemple GPUWeb](https://webgpu.github.io/webgpu-samples/?sample=worker) démontre WebGPU en worker ; le [tutoriel Three](https://threejs.org/manual/pages/offscreencanvas.html) utilise WebGLRenderer. |
| Rust/WASM ciblé, puis éventuellement simulation entière | Disposition mémoire, calcul dense de grilles/écologie/navigation, noyau partageable avec du natif | Données résidentes et peu de conversions ; certains échanges wasm-bindgen copient les tableaux. Le portage complet exige sémantique numérique, ordre et PRNG identiques. [wasm-bindgen](https://wasm-bindgen.github.io/wasm-bindgen/reference/types/boxed-number-slices.html), [Rust target](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html) |
| Godot natif avec C++/GDExtension | Moteur, outils et ordonnancement natifs ; buffers MultiMesh | Portage conséquent règles/UI/rendu/sauvegardes. Une scène par plante recréerait une autre surcharge. L’export Godot web est une option différente : documentation stable consultée en WebGL2, sans WebGPU. [GDExtension](https://docs.godotengine.org/en/stable/engine_details/engine_api/gdextension/what_is_gdextension.html), [export web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) |
| Rust/wgpu ou C++/wgpu-native | Contrôle explicite de mémoire, threads, soumission et backends natifs | Plus grande maîtrise, mais reconstruction des outils/UI/audio/shaders/packaging ; wgpu est une bibliothèque graphique. [wgpu officiel](https://wgpu.rs/) |

Un ECS à données compactes peut aider si ses frontières et propriétaires répondent à ces problèmes ; adopter un framework générique n’est pas une preuve de gain. Un moteur comme Unity/Unreal ou un client natif sur mesure reste évaluable par une tranche représentative, mais aucun profil actuel ne démontre qu’il serait le meilleur investissement. Un emballage desktop du même rendu web ne change pas à lui seul ses parcours CPU.

## Suite concrète et critères de décision

1. **Établir le budget de bout en bout en 1440p**, pause/×1/×3/×6, sur ce départ et Les Aulnes : intervalles p50/p95/p99/max et nombre de blocages, temps CPU image, adoptions, débit réel de simulation, mémoire/GC, GPU séparé. Fréquence écran/compositeur et délai entrée→image restent distincts des RAF headless. Mesurer WorkerTOTAL, encodage et transit, actuellement absents ; ne pas additionner des chronomètres qui se recouvrent.
2. **Prototyper la projection persistante et la régulation du flux.** Séparer données statiques, changements, poses et événements datés ; coût proportionnel aux changements, file bornée, consommation acquittée. Les imports/sauvegardes complets gardent leurs oracles. Les contrôles de contact, pause, changement de vitesse et commandes deviennent les critères fonctionnels de cette tranche.
3. **Refondre le runtime écologique et les ensembles graphiques actifs**, sans changer de règles ni baisser silencieusement la qualité. Comparer les charges identiques ; ne pas attribuer à cette tranche le gain de la précédente.
4. **Choisir la technologie sur la limite restante.** Calcul dense dominant : prototype Rust/WASM incluant conversion/retour. MAIN/soumission dominant malgré projection compacte : rendu isolé. Limite durable navigateur/Three ou priorité à une application installée : tranche équivalente native Godot ou wgpu avant migration globale.

Le budget cible de 5 ms doit couvrir les pointes, pas seulement la moyenne. Il faut aussi conserver 6/18/36 ticks locaux/s effectifs selon la vitesse et une réponse aux entrées réactive ; afficher 200 images d’un état qui n’avance plus ne satisfait pas la demande. Des plafonds par sous-système sont à fixer à partir des mesures complètes, sans addition naïve de CPU et GPU qui peuvent se chevaucher.

Une ablation ultérieure peut isoler le coût de propagation : pipeline normal, Decoder conservé avec consommateurs coupés, puis réception périodique coupée avant Decoder tout en gardant simulation/encodage/transit. Ce serait un diagnostic à scène figée, jamais une preuve de jouabilité ni un mode de production. Après coupure, rétablir un checkpoint avant les deltas normaux ; mesurer le débit aux ticks autoritaires/exportés, puisque les ticks reçus lus par la sonde seraient volontairement figés. Les règles, commandes, recharges et états publics restent intacts.

## Vérification locale de cette passe

Revue statique et relecture par trois sous-agents GPT-6.1 Sol ; ROOT seul pour compilation et navigateur successifs. Build privé PASS 5,596 s, binaire MAIN identique au paquet V423 instrumenté. Les 1 726 sources restent exactement identiques au gel après les contrôles. Entrée originale au tick35 inchangée, SHA256 `748409f4b5ceba787fd59db233c2580433895cd530a077ac3fa9a1d885392df0`.

Chrome155 natif headless/WebGPU AMD RDNA1, Ryzen5 3600, 16 Gio, 2560×1440/DPR1 ; caméra orthographique initiale du départ réel, réglages équilibrés, textures/herbe/pièce/diorama actifs, ombres60Hz/2048, son coupé. Une seconde de chauffe exclue puis cinq secondes par fenêtre. Aucun profileur CPU ni timestamp GPU ; sonde CPU/RAF historique réutilisée. Aucune mesure sur l’affichage physique ni sur la session personnelle du joueur.

| Fenêtre | RAF/s | CPU image moyen | Decoder moyen | Intervalle p99 / max | Vitesse observée aux ticks reçus |
|---|---:|---:|---:|---:|---:|
| Pause |234,00|3,27 ms|aucune adoption|8,3 / 8,5 ms|0|
| ×1 |109,02|6,56 ms|16,68 ms|45,7 / 66,6 ms|0,964×|
| ×3 |68,09|8,05 ms|18,05 ms|66,7 / 70,9 ms|2,859×|
| ×6 |88,05|7,24 ms|118,17 ms|141,6 / 154,2 ms|2,997×|

Pause :1 172 images. ×1 :547 images/29ticks/29adoptions ; ×3 :342/86/59 ; ×6 :442/90/10. Le ×6 a davantage d’images que le ×3 dans ces fenêtres, mais n’approche pas son débit demandé et présente de bien plus longues coupures. Cela illustre pourquoi une moyenne de FPS seule est un mauvais critère. Les fenêtres de vitesse suivent la même copie qui avance ; ce n’est pas une comparaison causale à histoire identique. Les durées image/réception/adoption peuvent se recouvrir, le pas Worker exclut encodage/transit et sa distribution est échantillonnée par publication. Le coût Decoder ×6 est observé ; aucune cause unique de son augmentation n’est isolée ici.

Le relevé de pause ne reproduit pas les100FPS signalés. Fréquence d’écran, composition, paramètres personnels et charge de la session restent à rapprocher. Les appels RAF d’une fenêtre réelle suivent généralement le rafraîchissement de l’écran ; les RAF headless ne prouvent pas200images physiquement affichées. [Documentation requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

Les deux premières tentatives échouent avant toute mesure : réseau localhost refusé39,494s, puis serveur lancé dans le contexte restreint inaccessible14,863s. Le serveur local et Chrome reçoivent ensuite l’accès adéquat, sans changer le code produit. Native03 conserve la fenêtre de pause, puis **échoue après désactivation UI de la pièce : zéro frame observée**, avant expiration globale300s, wrapper317,064s. L’export d’échec au35 est exactement identique à l’original ; le contrôle complet de cet export n’a pas terminé. Aucune erreur navigateur n’est remontée dans le reçu, ce qui n’établit pas la cause de l’absence de frames. Aucun gain du décor désactivé n’est retenu ; cette ablation reste ouverte.

Native04 exécute uniquement les trois vitesses encore manquantes, en réimportant la même source intacte avec le décor actif. Les trois fenêtres satisfont leurs assertions locales et sont écrites avant l’export final. Cet export est présent, mais **aucun reçu de fin ni recharge exacte finale n’a été obtenu** ; la session d’exécution n’est plus disponible et aucun processus correspondant n’est trouvé lors du contrôle de clôture. Aucune suite native entièrement verte n’est annoncée, aucune reprise favorable de l’ablation n’a lieu.

Analyse hors ligne PASS0,599s : quatre fenêtres effectivement acquises, formules RAF/débit et comptes bruts exacts, dimensions/une carte/visibilité contrôlées, originaux et gel de sources exacts. Reçu `tmp/performance-architecture-v424/summary-acquired.json`, scripts et sorties `native01`, `native02`, `native03`, `native04-speeds` dans ce même répertoire. Les rouges et la qualification finale incomplète restent conservés. Ce diagnostic n’est ni une comparaison avant/après optimisation, ni un gain produit, ni une preuve d’endurance. Aucun paquet QA publié.

Contrôle documentaire PASS3,490s avec le runtime Python fourni ; la première invocation de l’alias Windows `python` est refusée EACCES avant exécution, conservée au ledger. Relecture indépendante des trois fenêtres de vitesse et des recommandations acquise. Aucun test gameplay, changement de schéma, modification des sauvegardes publiques ou déploiement pour ce lot d’audit.
