# Étangs peu profonds boréaux et ponts — V403

Qualifié le16octobre2026, schéma254. Publication en préparation ; dernière production V402/b5b83f4a.

Les nouveaux sites boréaux peuvent contenir des étangs statiques d’**eau peu profonde**, distincts de l’ancienne eau infranchissable. Un colon peut les traverser lentement et apporter les12bois d’un **Pont en bois** ; le chantier doit être réellement payé puis terminé pour supprimer le coût humide et fournir le support léger. Le retrait restitue6bois et révèle la même eau. L’ancien terrain water conserve exactement son sens et ses refus.

## Règles et adaptations

Relevés privés Core1.6.4871 rev590, DLL SHA2565cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a. WaterShallow : fertilité0,30ticks Core physiques ajoutés à l’arête entrante, pénalités de recherche distinctes180Core civil/18mobilisé après le maximum terrain/objet. L’échelle locale conserve+3ticks physiques, sans réécrire un mouvement déjà engagé. L’indication de terrain50% ne prédit pas la vitesse finale de chaque personne, ses capacités ou ses objets portés.

Marchable ne signifie pas constructible : aucun support ordinaire nu, culture, sol construit ou conduit ordinaire. Un pont fini apporte uniquement Light ; empreintes multi-case, plans, cadres et installations sont vérifiés. La fondation réemploie les paiements/travaux, restitutions, incendie et destruction [qualifiés V387](bridge-marsh-v387.md) ; aucun PV ou remboursement supplémentaire inventé. Eau nue : feu éteint à la cadence existante, neige et saleté non conservées, supplément d’usure×3 du taux de base pour les matières sensibles. Le pont retire ces effets du terrain sous-jacent ; sa disparition révèle le terrain et retire les couches devenues incompatibles.

Le biome boréal Core déclare des patchs d’étang avec fréquence0,015 et seuil WaterShallow0,76. Ces nombres ne sont pas des quotas. Le champ original local, ses octaves/décalages, sa forme et l’omission des franges Marsh/MossyTerrain restent des adaptations explicites. Seuls les bas terrains des nouveaux sites boréaux sont concernés, après roche et gravier ; ni minerai ni bloc de pierre n’est posé sur cette eau. Aucun sol asséché pour garantir l’arrivée. La revisite réutilise le vrai terrain, sans régénération.

Les [références V385](../research/marsh-core-v385.md) et [V387](../research/bridge-core-v387.md), puis le relevé ciblé WaterShallow/GenStep_Terrain, sont réutilisés. Corpus utilisateur : chapitres5–7/10/21 et identifiants SYS/TEST021/022/051–054/056/058/113–117 repris de V387, sans clôture générale. La [capture officielle Ludeon historique](https://rimworldgame.com/royalty/screenshots/royalty-shuttle.jpg) identifie tablier et circulation ; build inconnu, aucun pixel actuel4871 revendiqué ou copié. Sources propriétaires privées seulement.

La migration valide strictement253 sur les deux cartes avant le seul numéro254. Aucune eau, fondation, personne, matière, histoire ou consommation de RNG ajoutée aux anciennes cartes. Les anciens RAW/checkpoints/deltas refusent le terrain futur. Decoder vérifie aussi les propriétaires/plantes/bâtiments sur des cellules inchangées. Pas de nouvelle révision du globe ou du climat : seul le générateur local courant emploie le terrain prospectif. Les builders sans site et leurs anciens canaux restent littéraux.

Le rendu reprend le lot, le matériau et la hauteur d’eau existants ; un pigment plus clair distingue les étangs. Les deux profondeurs ne créent pas de fausse rive entre elles. Le tablier demeure dans le lot résident existant. Survol, Alt et inspection distinguent eau nue, pont et support ; sol nu toujours non sélectionnable. Aucun scan métier par image, nouvelle propriété de buffer ou texture introduit.

## Qualification ROOT

62cas distincts/13fichiers acquis par reprises, dont12nouveaux. Première passe58PASS/4RED23,744s : quatre témoins245/246 contenaient le calendrier d’usure futur252. Première reprise8,591s révèle aussi la permission/projet pemmican future248 ; seuls les témoins avant baseline sont préparés. La reprise suivante9,133s conserve neuf succès mais trois comparaisons attendaient encore une migration limitée à247, sans les horloges prospectives252 déjà livrées. Les trois attentes complètes sont actualisées explicitement, tous les autres domaines restent comparés ; trois cas PASS7,790s, neuf autres explicitement sautés. Aucun validateur ou règle produit détendu, rouges conservés.

Le typage initial RED18,447s signale deux problèmes QA : littéral247 donné comme World courant et accès tiles sans discriminer le checkpoint. Témoins corrigés sans valeur historique changée ; typage16,319s puis livraison16,293s. Le cas de génération a été renforcé par une vraie création Core boréale128² validée, mêmes cellules ; ce seul cas repasse6,433s, pas une nouvelle campagne.

Les66références publiques immuables passent migration/aller-retour/Decoder complet en120,512s, sans tick joué ni archive écrite. Sources/test/pilote/configuration figés dans tmp/shallow-water-v403/freeze06.json :3503 chemins exacts avant les contrôles matériels.

Présentation Chrome PASS132,746s. Court natif Chrome/WebGPU PASS57,775s, préparation32² déclarée : vrais refus de culture/mur, aller-retour mobilisé dans l’eau nue, segment16→22,75 avec délai+3capturé et vitesse de personne0,8. Le même adulte paie12bois, travaille réellement au contact et reprend exactement le cadre186 au72 ; pont fini constaté256. Source184 de10bois physiquement prise, nouveau cargo189 porté par182 sur le tablier au280, délai humide nul, mêmes10bois déposés305. Retrait terminé345,6bois restitués/16bois totaux, même eau retrouvée et recharge UI exacte finale. Deux reprises exactes, trois captures inspectées ROOT, erreurs vides/WebGPU sans incident. Les exports complets précèdent les assertions ; aucun étang naturel ni patrimoine initial naturellement acquis revendiqué dans cette scène.

## Coûts et limites

Mesure descriptive ROOT250² : trois paires de graines42/271828/314159, relief plat boréal, ordre alterné253/254 et un échauffement32² par variante. Ancienne génération229–283ms ; nouvelle240–304ms,3288–4624cellules humides sur ces trois nouvelles cartes. C’est le coût du paysage complet avec sa végétation, pas une isolation du seul bruit ; ressources différentes, GC/JIT non contrôlés. Node24.11.1/Windows/Ryzen5 3600 ; mesure PASS5,276s, rapport tmp/shallow-water-v403/generation-cost.json. Aucun pourcentage général, coût GPU ou FPS déduit.

Étangs statiques seulement : rivières mondiales, eau mobile, gel/séchage, hydrologie, franges complètes, plantes aquatiques, pensée mouillée et écologie Core exhaustive hors lot. Aulnes publiques V394 et branche blessée21483 inchangées ; aucun étang forcé dans cette forêt tempérée. Campagne98038 close partielle.

Build Pages PASS2,216s et documentation PASS2,050s ; gel de livraison freeze08 :3506 chemins exacts. Les produits sont inchangés depuis les unités, le corpus, la présentation et le parcours matériel ; seuls les documents et témoins QA expliqués ont évolué. Aucun nouveau build ou banc non affecté nécessaire après clôture documentaire.
