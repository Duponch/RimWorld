# V445 — Masses dans les six matières

État : **publiée9de7122f, déploiement5d140817 ; qualification ciblée, présentation et interface acquises par reprises, avec réserves nommées**. Schéma 269. Ensemble2 toujours principal ; aucune clôture des six ensembles, parité Core exhaustive ou amélioration FPS annoncée.

## Résultat joueur et périmètre

La recette `make-mace` utilise les deux forges existantes et produit une masse en bois, acier, plastacier, uranium, argent ou or. Elle exige la recherche Forge et Artisanat3. Les matières doivent appartenir au joueur, être autorisées, accessibles et transportées au contact ; une facture ne prélève rien à distance. Le même auteur commence un `unfinished-mace`, conserve sa progression après interruption, puis termine une arme avec qualité et état. Le produit rejoint les chemins d’équipement, combat, rangement, fret, économie et récupération applicables.

Ce lot ne crée ni poste, ni recherche, ni seconde famille de marteaux. L’emplacement d’artisanat et le poste d’usinage ne fabriquent pas les masses. Les épées et les autres matières de couteaux restent différées.

## Référence vérifiée et corpus

Relevé du21octobre2026 : **RimWorld Core1.6.4871rev590**, installation locale identifiée dans `tmp/melee-v444/reference-construction.md`, complément ciblé `tmp/mace-v445/reference-construction.md`. Lectures primaires : `MeleeMedieval.xml`, parents hérités de `BaseWeapons.xml`, matières de `Items_Resource_Stuff.xml`, ouvrages et recettes de récupération. Aucun code ni asset propriétaire intégré au produit.

La recherche officielle datée réutilise [l’annonce Ludeon du12octobre sur1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) : branche principale1.6 et bêta instable1.7 restent distinctes. Aucun changement implicite de référence ; le dernier numéro public exact n’est pas attesté par manifeste Steam. Les nombres ci-dessous proviennent du Core local identifié, pas de cette annonce.

Corpus humain : chapitres11,20 et29 de `Documentation_developpement.html` ; SYS/TEST-062..066/068 et UI-025 pour la production, SYS/TEST-055 et UI-014 pour l’équipement, SYS/TEST-085/089..091/098..117 et UI-009/010 pour les contacts et la mêlée. Adopter les matières physiques, l’auteur, la progression et la qualité ; adapter l’horloge et la représentation originale ; différer les autres armes. Ces identifiants ne sont pas clos globalement par ce lot.

## Règles retenues

Le coût nominal est50Stuff et le travail6000ticks Core, ajustés par la matière. Les métaux précieux ont un volume unitaire0,1 : leur quota physique atteint500. Une seule matière homogène est admise par ouvrage.

| Matière | Unités physiques | Travail local nominal | PV |
| --- | ---: | ---: | ---: |
| Bois |50|420|65|
| Acier |50|600|100|
| Plastacier |50|1320|280|
| Uranium |50|1140|250|
| Argent |500|600|70|
| Or |500|540|60|

Travail local =6000×facteur matière÷10 ; PV =100×facteur matière. La qualité ne change pas les PV. Le filtre initial autorise acier, plastacier et uranium ; bois, argent et or sont désactivés mais activables. Ce résultat vient de l’héritage réel du parent de la masse, qui reprend le filtre des armes tranchantes. Jade et blocs de pierre ne sont pas admissibles.

Chaque masse pèse1,25kg. Le manche utilise une attaque de base9Poke et la tête15,7Blunt, avec délai de base2secondes ; matière, qualité et règles de contact ajustent ces valeurs. La récupération en cours conserve l’identité de l’outil et sa matière même si l’arme change ensuite. Ces données ne promettent aucun DPS garanti contre une armure.

La fusion accepte les cinq masses métalliques :25% du coût physique, soit12ou13unités pour les métaux usuels,125pour argent/or, avec arrondi stochastique. Qualité et usure n’en modifient pas le rendement. La masse en bois est refusée. Annuler un ouvrage rembourse75% **par reçu réel** ; le détruire ne déclenche pas ce remboursement.

## Adaptations et conservation

Artisanat reste la priorité locale commune aux productions de forge ; le découpage des métiers Core n’est pas reproduit intégralement. L’horloge locale conserve dix ticks Core par tick local. Les durées du tableau précèdent capacités, environnement et interruptions. Le travail réutilise GeneralLaborSpeed, sans appliquer deux fois les facteurs physiques ; les forges restent soumises à leurs conditions de service.

Les producteurs actuels de PNJ restent provisoires : aucun tirage natif de personnage, équipement, relation ou maladie n’est revendiqué. Le lot ne distribue pas rétroactivement ces armes aux PNJ. Les formes et pigments sont une interprétation originale partagée par les six matières.

Le schéma269 introduit les six identités d’armes, `make-mace`, `unfinished-mace` et les outils de récupération associés. L’ancien268 doit être validé strictement avant migration neutre du numéro ; propriétaires, objets emballés, filtres, files, archives et historiques refusent les marqueurs futurs. Aucun bien, droit, recherche, ouvrage ou progrès n’est accordé par migration. Les capacités antérieures continuent dans leurs familles de schémas fermées, sans admission d’un futur270. Auteur, facture, reçus, progression, qualité finale, permissions et flux PRNG restent autoritaires.

Les corrections du lot portent aussi sur les permissions et le combustible. Un ouvrage interdit ou une matière déjà déposée devenue interdite bloque planning, incorporation et travail ; la tâche est libérée sans détruire le bien, avancer le travail ou tirer une qualité. Autoriser permet de reprendre le même ouvrage. Les cellules réservées ne recopient que leurs coordonnées, sans champs de propriétaire ou de bâtiment.

Le transport de combustible destiné à une forge sous Artisanat porte désormais `forCrafting:true`, exclusif de `forCooking`, et réservé au269. Il relève d’Artisanat jusque dans l’ordre prioritaire ; un artisan avec Cuisine et Transport désactivés peut ravitailler son propre travail. Les anciennes destinations Cuisine et les anciennes sauvegardes ne sont pas réécrites. Réserve, consommation et contacts physiques du combustible restent ceux du service existant.

## Limites de catalogue et d’économie

Prix, masse et état des six armes sont raccordés aux autorités économiques existantes. Le prix de base additionne matières physiques et travail Core×0,0036 avant qualité, usure et arrondi final. Cela ne qualifie pas tous les canaux commerciaux : le traitement restreint des visiteurs n’est pas élargi, aucun nouvel assortiment marchand ni générateur d’équipement PNJ n’est ajouté.

Le brûlage des armes en bois par recette distincte reste différé ; leur inflammabilité dans le monde ne vaut pas cette recette. L’option Core de comptage des produits équipés n’est pas exposée : les armes équipées restent exclues du compteur de fabrication. Inspirations, styles, reliques et contenu des extensions restent hors de cette qualification. Aucun catalogue complet d’armes de mêlée n’est annoncé.

## Qualification ciblée et reprises

**97cas du lot dans11fichiers acquis par reprises :45dans cinq nouveaux fichiers et52dans six fichiers voisins.** Nouveaux : production11, combat12, migration10, présentation9 et récupération3. Les scénarios préparent poste, connaissances, compétences et stocks finis ; les six matières parcourent réellement apports, ouvrage, interruption, annulation sur branche de reprise, finition, rangement et équipement du même produit. Les permissions et le combustible comparent aussi campagne entière et continuation. La récupération de la masse d’argent produit réellement125argent, avec dépôt partiel25/100 et conservation des identités. Les trois parties de référence migrent sans autre changement que le numéro ; aucun fichier public modifié.

Première passe :85/92 acquis en75,586s. Sept rouges conservés : reprise d’ouvrage avec cellule polluée par les champs de propriétaire, combustible de forge attribué à Cuisine, rangement de l’argent interrompu par un vrai besoin, oracles de dépôt interdit, registre vide et arrondi affiché, ancien plafond de récupération plastacier. Les deux premiers corrigent le produit ; le pilote poursuit le vrai transport après le besoin pour l’argent ; les quatre autres corrigent leurs attentes/préparations sans retirer les assertions utiles. Reprise :10/11 acquis en12,990s, dont les sept anciens rouges et trois nouveaux cas ; le nouveau garde de file comptait sa propre réservation. Réutilisation de la vue existante retirant seulement cet ordre, compétition des autres ordres conservée : cas acquis à la reprise suivante.

Ravitaillement voisin :11cas supplémentaires acquis dans `manual-refuel-options.test.ts`. Deux cas sélectionnés de `player-cooking.test.ts` restent rouges dès la préparation, avant le service : le pilote déplace le tick à2000 sans son horloge de détérioration, qui demeure à0. Pilote et validateur de cette horloge ne sont pas modifiés par ce lot ; pas de comparaison exécutée d’un ancien commit, ni de suite déclarée entièrement verte. Le nouveau témoin Cuisine1/Artisanat0/Transport0 qualifie séparément son vrai ravitaillement, repas et continuation. Reprise groupée combustible :12acquis/2rouges/10ignorés en10,532s. Aucune campagne naturelle longue ni suite complète exécutée.

Typage et build initiaux acquis en13,977s et5,061s ; après le correctif graphique ci-dessous, typage final11,598s et build Pages final4,737s. Journaux `tmp/validation-runs/mace-v445-{targeted,targeted-resume,fuel-resume,type,type-final,type-closed,build}-…`. Export d’ouvrage réel au2221 et produit acier sous `tmp/test-runs/mace-v445-targeted-2026-10-20T23-04-54.856Z-25216/artifacts/`. Pour le parcours UI, un seul acteur allié immobile est ajouté à cet ouvrage par préparation privée déclarée ; auteur, reçus, piles, stocks, tâches, recherche, tick et PRNG restent identiques. Cette cible ne vaut ni raid naturel ni acquisition de personnage.

## Présentation et coûts

Les six pigments partagent une seule famille résidente de216sommets, ajoutée au premier port :3190→3406sommets sans armure,3720→3936avec armure. L’extension conserve les attributs partagés et les matériaux d’ombre ; retrait et changement de matière ne reconstruisent pas la géométrie. Après ce premier port, cette famille appartient au lot commun et augmente donc les sommets soumis pour tous ses personnages, pas seulement le porteur. Les réserves de géométrie retirée sont libérées avec le lot. L’atlas de cargaison ajoute1368sommets pour six pigments et l’ouvrage, soit60192octets d’attributs ; seuls les groupes actifs sont dessinés.

Activités confirmées6/7 pour tête/manche, pose corporelle commune conservée. Le cache est invalidé une fois lors d’un changement d’outil ou de départ de frappe de masse, jamais au simple tick suivant. Le coup naturel ou la récupération d’une autre arme ne déclenchent pas la masse. Positions et normales réutilisent le même graphe direct/cache/ombres ; aucune scène ou animation individuelle ajoutée par personnage.

Mesure privée dans la même version, chargement exclu, cinq échauffements puis30constructions par combinaison : médianes2,136ms sans armure/masse,2,391avec armure,2,417avec masse et2,477avec les deux ; p95 respectifs3,910/2,900/3,210/2,943ms. Les tableaux augmentent de12528octets pour la masse dans les deux combinaisons. Premières constructions dans un seul processus :9,313/6,196/5,122/9,762ms, ordre et caches explicitement non comparables à des processus froids. Rapport `tmp/mace-v445/geometry-cost-vitest.json`. Ce relevé ne mesure ni coût GPU par image, ni FPS, ni comparaison historique ; les variations négatives ne prouvent pas une optimisation générale.

Le chargement SSR du premier outil privé est interrompu sans résultat ; aucun coût de géométrie ne lui est attribué. Le repli emploie les imports Vitest déjà fonctionnels. Préparation UI initialement rouge parce que les métadonnées numériques des compétences étaient traitées comme des fiches : seul l’outil privé est corrigé. Mesure et préparation passent ensemble en11,065s ; ces deux opérations privées ne sont pas ajoutées aux97cas produit. Sources servies gelées :2099chemins sous `tmp/mace-v445/frozen-sources.json`.

Le premier parcours Chrome155/WebGPU,1440×1000, finit réellement la masse d’acier197 au3009, qualité médiocre et100PV, puis l’équipe au3011. Facture ajoutée/supprimée par l’interface, filtres initiaux contrôlés et campagne entière en pause strictement identique sauf identifiant retiré. Coup dirigé réel au3024, manche, cible alliée déclarée et contusion de jambe. Rapport `tmp/mace-v445/native-ui/2026-10-20T23-23-32-496Z/report.json`, durée80,106s : ces transitions sont acquises, mais la présentation échoue car le code d’activité du coup retombe à0.

Diagnostic depuis cet export : `PawnLayer.updateTravel` réécrivait l’activité après l’adoption. Le calcul partagé décode maintenant le scalaire d’équipement déjà publié, sans recherche de piles par image. Nouveau cas : vraie timeline, mise à jour de déplacement et présentation, chemins direct/cache, tête/manche/coup naturel, pause et World immuable. Les15cas de présentation masse/couteau/forge passent en19,369s, dont deux voisins supplémentaires non encore comptés ; ils s’ajoutent aux97cas du lot et aux11cas de ravitaillement. Empreintes précédentes conservées dans `frozen-sources-before-travel-fix.json`, nouveau gel2099chemins. Fabrication et rangement ne sont pas rejoués pour cette correction du rendu.

Deux notifications `ResizeObserver loop completed with undelivered notifications` sont conservées dans ce premier parcours, sans erreur GPU signalée. Le signal de mise en page V443/V444 reste ouvert ; aucune cause ou innocuité n’est affirmée.

Reprise native acquise en29,334s depuis le seul export du combat, sans rejouer la forge : campagne entière rechargée exactement au3024, même masse197 et coup de manche confirmé. L’attribut GPU porte désormais activité7, matériau5,25, pose8 et3406sommets. Soixante échantillons de pause gardent strictement les mêmes horloges et attributs. La continuation réelle atteint une nouvelle frappe de tête au3036, activité6 et nouvelle blessure, sans remplacement de géométrie, d’arme, de qualité ou dePV. Aucun nouveau signal de mise en page ni erreur GPU capturé dans ce périmètre. Rapport `tmp/mace-v445/combat-ui/2026-10-20T23-28-23-553Z/report.json` ; captures inspectées. Le chemin natif observé est direct ; le cache est contrôlé par le cas CPU, sans nouveau relevé GPU de cette branche. Effets et musique désactivés dans les réglages avant le jeu, navigateur lancé muet.

Présentation commune acquise en152,134s sur le départ250²/trois colons : minage puis abattage,45secondes chacun, vitesses1/6/1/3 et phases de travail. Aucun saut, dépassement continu ou occupation rocheuse détecté dans ces deux fenêtres. Intervalles image p50/p95/p99/max : minage6,0/6,1/6,1/24,0ms ; abattage6,0/6,1/11,9/35,9ms. Ce contrôle de synchronisation ne compare pas V444 et ne mesure pas la charge des Forges ni un débit×6 général. Rapport `tmp/test-runs/mace-v445-presentation-2026-10-20T23-29-21.307Z-32888/artifacts/`. Les deux réglages audio sont vérifiés àfalse et Chrome reste muet. Les2099empreintes finales restent identiques au gel.

## Livraison

Produit sélectionné et poussé sur `origin/main` : `9de7122fb1a2e0018b9af5561ff5728f4bf12db1`. Paquet qualifié en2,043s, `tmp/elsewhere-pages/v445-package-HofKyj/` :552fichiers, dont550actifs,71chemins publics de sauvegarde et68fiches conservés strictement public↔dist ; actifs statiques nonJS identiques au paquetV444. Aucun instrument privé ni dossier `references_UI/` livré. Les quatre fichiers compilés sont nouveaux ; les sauvegardes publiques restent intactes.

Déploiement acquis en16,068s : [version5d140817](https://5d140817.elsewhere-cq7.pages.dev), [site principal](https://elsewhere-cq7.pages.dev). Vérification11,089s :20réponses HTTPS exactes,10chemins sur deux origines, rapport `tmp/elsewhere-pages/v445-http-mfUytq/`. Ce contrôle couvre entrée,feuille de style,favicon,bundle,deux workers,catalogue et deux icônes de forge ; il ne vaut ni gameplay distant ni téléchargement des71sauvegardes. Les comparaisons de toutes les sauvegardes sont locales.

Contrôles documentaires et en-têtes de schéma acquis ; seuls les documents de livraison changent après cette sélection, sans recompilation produit. Le serveur et les navigateurs de contrôle sont arrêtés. Le journal Vite conserve les deux notifications de mise en page du premier parcours dans `tmp/mace-v445/vite-notifications.txt` ; elles ne sont pas déclarées résolues. Le dossier humain non suivi `references_UI/` reste hors commit.
