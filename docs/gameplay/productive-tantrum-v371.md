# V371 — annexe partiellement payée et crise naturelle

Schéma 238 conservé. Même campagne réelle86535→87812, sans nouvelle partie ni dotation : cinq murs d’annexe ont une chaîne de paiement/fin qualifiée. Le lot s’arrête sur une vraie crise de destruction de Gaël. Aucun établi, annexe close, recherche Batteries ou énergie utile n’est encore acquis. Aucun produit, règle, rendu ou UI de jeu modifié.

## Continuité après les soins

Le vrai86535 est importé, exporté et rechargé exactement. Avant tout réglage de priorité ou ordre productif, seuls Play×1 et lectures laissent finir le feeding hérité de Léonie : cargo20155/simple-meal1 sous sa possession physique, progress69/75. Événement86541 puis pause/constat86544 : cargo consommé, fin du feed et faim du visiteur19768 remontée. Ce jalon conserve sourceChainQualified:false et pickupSourceQualified:false ; le pickup ancien20101 n’est pas rétroqualifié.

La cuisine d’Iris est comparée intacte avant Play : ingrédients20144×10 placés, progress270400/work65. Elle termine naturellement un repas à86543 puis en cuisine un autre à86810. Les repas ordinaires de Léonie86853 et Iris87104, puis le feeding de Gaël87588 et du visiteur19771 à87647 sont des événements réels conservés, sans prétendre reconstituer ici toutes leurs chaînes source/cargo.

Léonie passe ensuite réellement en phase Construction1/Cueillette2 ; Cuisine1/Médecin1/Culture2 restent disponibles. Gaël ne reçoit aucun ordre de recherche ou construction et garde ses besoins et sa récupération naturelle.

## Cinq paiements physiques

Chaque recette de mur utilise cinq bois ; le témoin voit le cadre complètement fourni avec sa vraie pile sous propriétaire job, puis un ouvrage d’un autre ID et la disparition du job/matières. Les ticks ci-dessous sont les constats du témoin, distincts des événements de fin parfois antérieurs.

| Mur (x,z) | Job et pile payée | Cadre complet constaté | Ouvrage constaté |
| --- | --- | --- | --- |
|(124,119)|20054 /20158×5bois|86616|20159 à86650|
|(123,119)|20053 /20160×5bois|86672|20161 à86689|
|(125,119)|20055 /20163×5bois|86708|20165 à86743|
|(122,119)|20052 /20166×5bois|86760|20169 à86926|
|(125,118)|20061 /20170×5bois|86962|20171 à87005|

Ces cinq fins consomment25bois : total physique143→118. Le HUD compte114bois disponibles, quatre autres restant en livraisons partielles de chantier. Sept jobs d’annexe restent, dont20051/20059 sont des frames partiellement fournis ; aucune preuve de paiement complet n’est ajoutée pour eux. Les douze plans ne sont donc plus tous impayés, mais l’annexe est encore incomplète. Aucun ancien mur n’a encore été démonté pour sa porte sud. Pas d’établi, Batteries0, réseau ou charge.

Iris reprend aussi une coupe existante19887, réservée87675 et travail constaté87723. Cela ne qualifie pas le rendement/transport intégral de cette coupe.

## Incident conservé

Gaël commence une crise de destruction à87758 ; motif affiché « Douleur intense ». La garde original-unavailable la constate87773. Le jeu avance encore avant l’acquittement de pause : la **vraie conservation est87812**, pas87773. Aucun de ces39ticks n’est effacé ni remplacé par un état plus favorable.

Au87812, Gaël est en déplacement126116, crise kindtantrum/age540/targetId20171, attempted:false ; la cible est le nouveau mur125118. Les cinq murs sont encore présents sans dommage à ce vrai export. Le comportement lu dans le moteur courant a des attaques/récupérations et changements de cibles réels ; ce constat ne démontre aucun bug. Aucune action d’arrestation, coup, soin, déplacement ou augmentation d’humeur ne lui est imposée.

Ses neuf plaies restent, orteil gauche perdu et pansé ; sang perdu revenu naturellement à0. Infection1 du torse encore présente, severity434394458/immunity1e9 : pas de guérison globale. Faim94,03/rest89,93/mood21. Iris et Léonie restent saines ; Iris coupe et Léonie travaille. L’ennemi20141 est encore à terre, vivant. Le cas infectieux du visiteur19771 est désormais absent du RAW final ; ses autres blessures persistent. Cette absence exacte ne signifie pas que tous les patients sont guéris. Sept médicaments coloniaux et trois personnels restent, sans invariance future imposée.

## Contrôles et autorité

ROOT seul : typage PASS12,628s ; Chrome/WebGPU RED110,889s/body89,633s/overall104,469s. Errors[], lifecycle[] et artifactErrors[]. Une recharge UI initiale86535 exacte et deux captures inspectées ROOT ; conservation87812 non rechargée. Gel3006 chemins uniques exact avant/après. Gate documentaire PASS1,121s. Aucun ancien banc, corpus, build ou publication produit rejoué ; V36528a2e8a9/2f42e85c et106HTTPS exacts conservés. Aucun gain FPS ou campagne entière certifié.

Le mandat post-soins lie le FULL productif V367 et les parents de soins/défense entiers. L’ancien false reste immuable. ROOT corrige avant contrôle les gardes nextInjuryId pour les blessures fusionnées, la réservation unique de chaque SHA d’entrée et le gel avant navigateur. Le ledger sur disque reste non reprenable pendant validation finale/rapport/attachment ; sa version finale est publiée atomiquement. Le rouge actuel garde resumeAllowed:false. L’option explicitement nommée de décès naturel du seul ennemi20141 déjà à terre ne lui ordonne aucune action ; tout relèvement reste un danger. Aucun oracle de recette/recherche/énergie ni règle du jeu changé.

## Preuves et prochaine entrée

Dossier `tmp/early-access-productive-research/post-care-adopted-01/native-post-care-01/early-productive-research--961a2-energy-goal-only-in-summary/` :

- **Canonical87812** : vraie conservation.json, non rechargée, SHA `b30671efd17b4b2a8820e291a980c0ea74f3407ede7e98ffc8839b43d0ca9a92`.
- Ledger `9e3a83fd406cb5a026f823d0ac823e71a11fbe550a5d1d15778dd9009f837bba`, six segments, resumeAllowed:false ; summary `1a35a39f91b678b62d398cd0dd6588e577fe0aca045cb2491f4d0bffe396c60f`.
- Adopté ROOT driver851a718a/review1c64c150 ; préparation02c8b1e623 et revue indépendante511bae0b conservées séparément.

Origine75566/horizon111566 restent inchangés, avec les cinq nouveaux paid/finished et toutes actions/mémoires/biens de la chaîne. Ne pas rejouer86535 ni réactiver cet ancien ledger. Reprendre par nouveau mandat ROOT depuis le vrai87812 : observation bornée à×1 de la crise héritée, sans ordre à Gaël ni RNG préjoué. Dégâts réels des seuls bâtiments en bois présents admis tant qu’ils restent présents et strictement au-dessus de50%PV ; toute autre perte/dégât, nouveau dommage humain, autre crise, relèvement hostile ou danger arrête. Attendre la fin réelle de cette même crise puis une courte fenêtre ordinaire, sans catharsis donnée ni succès garanti. La copie privée suivante doit réutiliser les oracles matériels existants et garder le FULL ledger courant ; aucun résultat de cette suite acquis.

Revenir ensuite à Batteries payées/utiles, essais des trois biomes puis extensions autorisées. Références, UI papier, saves historiques, personnes/biens/mémoires et sessions préservés ; sous-métiers reportés.
