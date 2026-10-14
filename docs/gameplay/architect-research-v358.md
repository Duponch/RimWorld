# Architecte et constructions débloquées V358

Demande humaine du **15 octobre 2026** : vérifier pourquoi une nouvelle partie propose des constructions qui refusent ensuite leur placement pour recherche manquante. Ce lot corrige cette incohérence avant les quatre étapes early access autorisées. Schéma **236**, coûts, recherches, règles de placement et sauvegardes conservés.

## Référence et comportement

Lecture statique primaire du Core installé **1.6.4871 rev590**, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, provenance dans `tmp/architect-v358/reference-plan.md`. Aucun code ou asset propriétaire adopté. `Designator_Build.Visible` masque une construction si ses recherches requises ne sont pas toutes terminées ; le tiroir Architecte ignore les commandes invisibles. Les dropdowns gardent seulement leurs enfants visibles et disparaissent si aucun enfant ne l'est. Une catégorie peut aussi avoir ses propres prérequis. Le « god mode » contourne ces conditions ; le simple mode développeur n'est pas assimilé à cette exception.

La quantité de matériaux et les compétences des colons ne déterminent pas cette visibilité. Une construction débloquée reste proposée même sans stock ; terrain, voisinage, occupation, matériaux et compétences gardent leurs refus ou avertissements habituels. Recherche conserve les futurs projets pour expliquer la progression. D'autres restrictions Core existent, notamment scénario, technologie de faction, découverte et DLC : aucune parité exhaustive n'est annoncée.

Elsewhere filtre les boutons existants d'Architecte par recherches **terminées**, avec les bornes de compatibilité déjà utilisées par les commandes. Sélectionner un projet ou atteindre son coût sans événement de fin ne suffit pas. Le bouton apparaît dès l'adoption du snapshot achevé, même avec Architecte déjà ouvert ; une reprise adopte les propres acquis du checkpoint. Les raccourcis utilisent le même garde. Si une nouvelle adoption verrouille l'outil actif, son tracé est annulé et la sélection ordinaire reprend.

Les adaptations existantes sont conservées : lit simple, tables ordinaires, table de taille, générateur à biofuel et appareils de retraitement ont leur admission locale actuelle. Les modes de réinstallation et replantation d'objets possédés restent distincts d'une nouvelle construction. Ordres/Zones gardent leur dock, leurs interactions et leur fermeture. Les catégories locales n'ont pas de verrou propre ni de dropdown de variantes de recherches à reproduire.

## Implémentation et défaut associé

`architect-availability.ts` réutilise les définitions de mobilier/sols et les prédicats de recherche du moteur. Les autres constructions ont leurs prérequis explicites ; aucune disponibilité n'est déduite du texte d'un tooltip ou d'un test sur une case arbitraire. Le lecteur est pur, ne crée pas de progression, ne consomme aucun ID, RNG ou trajet et ne touche aucun propriétaire.

Les nœuds, images et handlers du catalogue restent résidents. Une clé texte combine schéma, catégorie et 23 états de fin de recherche ; les progrès, le projet sélectionné et les dates de fin ne provoquent pas de réécriture du catalogue. Seul un changement utile réévalue les boutons. Le calcul borné intervient à l'adoption/UI, sans parcours de carte ni travail dans la boucle GPU ; coût faible attendu, aucun gain FPS mesuré.

Le test de concordance a révélé un défaut antérieur : **Atelier de sculpture** omettait sa matière dans `placementMaterial`. Son contrôle est ajouté aux meubles à matériau variable, avec les recettes bois/acier existantes. Coûts et admission moteur ne sont pas assouplis. La fixture de trémie a aussi été déplacée hors de l'empreinte du distributeur ; ce second défaut appartient au test, pas au jeu.

## Qualification

ROOT seul, sources/tests/public/pilotes figés, **gel2937 exact**. Groupe ciblé **79 cas/8 fichiers acquis par reprises**, dont8 nouveaux cas du catalogue :95 définitions,38 outils verrouillés sans recherche,30 projets individuellement achevés, sélection/progrès sans fin, dates de fin0, versions historiques, immutabilité gelée et indépendance terrain/stock/personnes. Reprise finale du fichier8/8 **PASS8,956s** ; les sept autres fichiers avaient passé sur le même produit dans le groupe25,424s. Recherche, guide, matériaux et production artistique existants restent qualifiés.

Chrome/WebGPU, **deux cas PASS66,604s**, bodies27,674s et32,268s ; erreurs[]/lifecycle[]. Première scène : vraie création par les cinq pages, carte250² en pause au tick0 avec capsules contenues, quatre recherches initiales conservées. Tous les onglets sont comparés, Tailleur reste disponible, Usinage reste caché, Ordres/Zones restent accessibles. Export/recharge0 exact SHA `5dc5cb2605e3111c38a2a69de7ac7bce8ce08835c6c7ceaa8c8cde371ad7d478`.

Deuxième scène32² explicitement préparée : recherche Vêtements complexes à600points moins0,2point, bureau fourni, priorité initiale0. Le joueur crée réellement un blueprint d'atelier de sculpture en bois, choisit le projet et Recherche1 dans Travail ; le chercheur finit la recherche au3029 et les deux boutons Tailleur apparaissent dans Production **déjà ouvert**. Aucun délai de recherche naturel n'est crédité. Reprises exactes3000 SHA `bbccc899b0d886acead634491e57cec58a97fbfd338d973e91d2ab1880603d56`,3029 SHA `9cf10ead29f0d30c49df1a5cac0686e14a60fc75bcbbd001fe509db257357272`, puis départ Survivors32²0 SHA `6342f3d540ce0f141cb2fff741ed14efe21a0b059dfc1122a5163af6a9083578` avec ses propres acquis. Le chargement passe par Menu, qui normalise aussi l'outil ; ce n'est pas une isolation artificielle de la garde de remplacement de snapshot. Trois captures inspectées ROOT dans `tmp/architect-v358/native-reprise/`.

Build Pages **PASS2,868s**. Le moteur, bridge, rendu, atlas/publics et schéma sont conservés ; aucun corpus codec inchangé n'est rejoué pour cette UI. Typage de livraison **PASS18,635s** ; gate documentaire/livraison en cours. La campagne naturelle66037 n'est pas avancée par les fixtures de ce lot.

Les premiers rouges sont conservés dans `tmp/validation-runs/` : erreur de type dans un argument de coût du nouveau test ; inventaire95 au lieu de92 ; omission réelle de matière pour l'atelier ; trémie de fixture à l'intérieur du distributeur. Le premier pilote natif importait indirectement une CSS dans Node ; il s'arrêtait avant tout test. Le natif76,771s conservé dans `tmp/architect-v358/native/` rejetait deux mauvaises attentes du pilote : Vêtements complexes est déjà une recherche de départ et choisir un outil ferme normalement Architecte. La reprise conserve ces règles et rouvre le panneau avant de tester son contrôle de matériau. Les corrections restent distinguées du produit.

## Suite autonome convenue

1. **Survie durable des premiers jours** : renouvellements alimentaires, réserves accessibles, bois/combustible, travail/repos et reprises ; corriger les blocages réellement observés.
2. **Incidents et récupération** : réaction, défense/repli, secours, soins et alimentation jusqu'à une issue constatée. Cette étape peut interrompre la première si une menace arrive ; les critères alimentaires inachevés restent ensuite à terminer.
3. **Progression productive** : recherche achevée naturellement, poste débloqué payé/construit, produit obtenu puis utilisé.
4. **Essai joueur fiable** : trois biomes actuels, plusieurs graines, sauvegardes/redémarrages, mémoire et performances en jeu actif, limites connues explicites.

Après ces résultats, poursuivre sans relance humaine les nouveaux biomes, le monde multicartes et le catalogue. Garder des lots cohérents, pas une version par portion ou checkpoint. Préparation privée V359 depuis le vrai export V35666037/SHA `1fcd423d4371197f5e9d6f7c3da2185b9d9743cde33d32dd9c0bcdf22aeecfd9` ; mêmes personnes, possessions et mémoires, anciennes branches blessées distinctes. Aucun résultat futur, campagne entière, EA100% ou240FPS crédité.
