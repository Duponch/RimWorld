# V446 — Épées longues dans les six matières

État : **publiée ; qualification ciblée, présentation et parcours natifs acquis par reprises**. Schéma 270. Aucun gain FPS ni achèvement d’ensemble annoncé.

## Résultat joueur

Après Forge puis la recherche **Lames longues400points**, un artisan de niveau5 peut fabriquer une épée longue en bois, acier, plastacier, uranium, argent ou or aux deux forges existantes. L’emplacement d’artisanat et l’atelier d’usinage ne proposent pas cette recette. Les matières autorisées et accessibles sont apportées physiquement ; une seule matière homogène paie l’ouvrage `unfinished-longsword`. Le même auteur conserve reçus, facture et progression après interruption, puis termine une arme unique avec qualité et PV propres à sa matière.

Le produit rejoint rangement, équipement, mêlée, fret, prix et récupération. Prise, dépôt, combat et fusion suivent les propriétaires et contacts réels. Lames longues se recherche sur un bureau ordinaire ; aucun bureau avancé ni courant n’est exigé pour ce projet.

## Référence et décisions

Primaire local identifié : **RimWorld Core1.6.4871rev590**, installation et empreinte de l’assemblage conservées dans `tmp/melee-v444/reference-construction.md`. XML relus : `MeleeMedieval.xml`, héritages de `BaseWeapons.xml`, matières de `Items_Resource_Stuff.xml`, ouvrages, postes, recherche et recettes de récupération. La lecture IL des autorités `Tool`, `VerbProperties` et `GenTicks` précise les arrondis de récupération ; complément privé `tmp/melee-v446/combat-reference.md`. Aucun code ni asset propriétaire intégré au produit.

La recherche officielle datée réutilise [l’annonce Ludeon du12octobre sur1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) : branche principale1.6 et bêta instable1.7 restent distinctes. Cette annonce ne fournit pas les valeurs numériques de l’épée ; elles proviennent du Core local identifié. Le dernier numéro public exact n’est pas attesté par manifeste Steam.

Corpus humain conservé : chapitres11,20 et29 ; SYS/TEST-062..066/068 et UI-025 pour production, SYS/TEST-055/UI-014 pour équipement, SYS/TEST-085/089..091/098..117 et UI-009/010 pour contacts et mêlée. Adopter matières, auteur, qualité, délais et propriétaires ; adapter horloge et représentation originale ; différer les autres armes. Aucun identifiant global clos.

## Fabrication et combat

Le coût nominal est100Stuff, le travail18000ticks Core avant facteur matière. Le volume unitaire0,1 de l’argent et de l’or impose1000unités physiques. Les durées ci-dessous sont nominales, avant capacités, environnement et interruptions ; dix ticks Core correspondent à un tick local.

| Matière | Unités physiques | Travail local | PV | Facteur contondant / tranchant |
| --- | ---: | ---: | ---: | ---: |
| Bois |100|1260|65|0,9 /0,4|
| Acier |100|1800|100|1 /1|
| Plastacier |100|3960|280|0,9 /1,1|
| Uranium |100|3420|250|1,5 /1,1|
| Argent |1000|1800|70|1 /0,85|
| Or |1000|1620|60|1 /0,75|

Le filtre initial autorise acier, plastacier et uranium ; bois, argent et or restent activables. Jade et blocs de pierre sont exclus. Chaque épée pèse2kg ; la qualité ne modifie ni masse ni PV. Le travail réutilise les facteurs physiques existants sans double application. Artisanat demeure la priorité locale commune aux productions et au combustible de forge : adaptation déclarée du découpage des métiers Core.

Trois outils distincts participent au choix pondéré avec les outils corporels : manche **Blunt9**, pointe **Stab23** et lame **Cut23**, multipliés par matière et qualité. Délais de base : manche120ticks Core, pointe et lame156. Le plastacier donne respectivement96 et125 ; l’uranium132 et172 ; les autres matières conservent120 et156. La chaîne native ajuste les secondes par la matière puis arrondit au tick Core entier à la création de la récupération :124,8 devient125,171,6 devient172. Ces cas ne sont pas des égalités à mi-unité. L’identité persistante des18outils inclut matière et partie ; retirer ou changer l’arme ne recalcule pas une récupération déjà engagée. Ces nombres ne promettent aucun DPS garanti contre une armure.

## Récupération, économie et conservation

Fusion :25% du coût physique, soit25acier/plastacier/uranium ou250argent/or. L’arrondi consomme un tirage même lorsque le résultat est entier ; qualité et usure ne changent pas le rendement. Le bois est refusé. Annuler l’ouvrage rembourse75% par reçu réel avec l’arrondi existant ; sa destruction ordinaire ne déclenche pas ce remboursement.

Le prix de base additionne matière physique et travail Core×0,0036 avant qualité, état et arrondi final. Les visiteurs conservent leur périmètre commercial restreint (`visitorHandles:false`) ; aucun assortiment marchand ou équipement PNJ supplémentaire n’est inventé. Les producteurs actuels de PNJ restent provisoires.

Le schéma270 introduit les six armes, la recette, l’ouvrage, les18outils et les marqueurs `long-blades`/`longBlades`. **Valider strictement269 avant migration neutre du numéro** : aucun bien, recherche, droit, auteur, progrès, histoire ou tirage rétroactif. Les marqueurs futurs sont refusés même àfalse dans leurs domaines réels, filtres, files, possessions éloignées, cartes temporaires, archives et projections publiques. Les anciennes masses, le couteau, leurs ouvrages, le combustible et leurs limites historiques de fusion restent conservés. Un futur271 reste refusé.

## Présentation et limites

Les six pigments partagent **une forme résidente de216sommets**, ajoutée au premier port. Matière, retrait et nouvelle frappe réutilisent la géométrie ; les trois gestes suivent le tick confirmé dans les chemins direct, cache et ombres. Cette capacité supplémentaire ne constitue ni mesure GPU par image ni gain FPS.

Lances, autres débouchés de Lames longues, autres matières de couteaux et catalogue complet de mêlée restent ouverts. Le brûlage des armes par recette distincte reste différé ; inflammabilité physique et recette de brûlage sont distinctes. Le comptage facultatif des produits équipés n’est pas exposé. Inspirations, styles, reliques et extensions restent hors de cette qualification.

## Qualification et reprises

**180 cas distincts dans 17 fichiers acquis par reprises : 63 nouveaux dans six fichiers et 117 voisins dans onze fichiers.** Nouveaux : production 10, combat 27, migration 9, présentation 10, récupération 4 et recherche 3. Les six matières parcourent réellement apports finis, ouvrage, interruption, annulation sur une branche, finition, rangement et équipement du même produit ; la forge au bois atteint aussi son produit fini avec Artisanat actif, Cuisine et Transport désactivés. Les 18 outils passent un impact réel, une récupération capturée, puis retrait ou changement d’arme. Argent et or fondent réellement en 250 unités, avec dépôts partiels et continuations entières identiques. Les trois parties de référence migrent strictement ; les projections publiques/résidentes au même tick et leurs prédécesseurs sont conservés.

Les fixtures déclarent postes, connaissances antérieures, compétences et stocks finis ; elles ne prouvent ni leur acquisition naturelle ni une campagne autonome complète. La recherche Lames longues part réellement de zéro au bureau ordinaire. Le contrôle conserve un checkpoint acquis à 98 %, suspend puis reprend le projet et compare trois continuations entières. Ni points ni produit ne sont accordés par migration.

La revue indépendante trouve une omission du bilan d’incendie dans la frontière historique : `fires` rejoint les domaines clairsemés du garde 270. Le mutant 269 porte une perte `wood-longsword` dans un vrai ledger valide ; fichier, checkpoint et delta la refusent. Les terrains et ressources géographiques ne sont pas parcourus par ce garde.

Première passe interrompue en 39,819 s par **ENOSPC**, avec un fichier privé d’ouvrage vide ; aucun résultat global retenu. Après dégagement de stockage, passe regroupée : **179/180 en 193,440 s**. Un seul rouge : le pilote de recherche exigeait `working` au tick où le service existant libère son bureau après 400 ticks de travail. Le pilote vérifie désormais cette libération précise depuis `worked=399`, le contact et le mouvement terminé ; aucune règle de recherche n’est modifiée. Reprise des trois cas de recherche : **3/3 en 14,760 s**. Les cas voisins déjà acquis ne sont pas rejoués. Aucune suite complète ni campagne naturelle longue exécutée ; les deux anciennes préparations Cuisine invalides V445 ne sont pas relancées ni déclarées réparées.

Trois préparations de typage rouges conservées : comparaison littérale de schéma dans le planning, union de projection mondiale et cellule de stockage incomplète dans le nouveau pilote. Famille fermée réutilisée et témoins corrigés sans détendre les assertions métier. **Typage final 13,583 s ; build Pages 5,344 s**, acquis. Journaux `tmp/validation-runs/sword-v446-{targeted,targeted-resume,research-resume,type-final,build}-…` ; anciens journaux de préparation conservés.

## Coûts et présentation native

Mesure privée acquise avec la préparation UI, **11,940 s**, exclue des 180 cas produit. Même source, cinq échauffements puis 30 constructions par combinaison, chargement et destruction hors chronomètre : ordinaire / armure+masse / épée / trois familles donnent des médianes **2,319 / 2,511 / 2,298 / 2,624 ms**, p95 **4,991 / 3,895 / 3,711 / 4,148 ms**. Premières constructions dans un seul processus : 10,86 / 8,15 / 5,37 / 11,97 ms ; ordre et caches non comparables à des processus froids. Rapport `tmp/longsword-v446/geometry-cost-vitest.json`. Ces variations ne constituent ni une comparaison historique ni un gain FPS.

L’épée ajoute **216 sommets et 12 528 octets** de tableaux typés au lot commun : 3190→3406 sans autres familles, 3936→4152 avec armure et masse. Après le premier port, tous les personnages soumis par ce lot partagent cette géométrie augmentée. Six pigments et ouvrage ajoutent 1368 sommets / 60 192 octets à l’atlas de cargaison ; seuls les groupes actifs sont dessinés. Aucun coût GPU par image nul annoncé, aucune scène ou animation individuelle ajoutée par personnage. Identité d’outil et début de frappe invalident le cache ; le tick courant ne le fait pas à lui seul.

Sources gelées : **2104 chemins**, `tmp/longsword-v446/frozen-sources.json`. Le parcours de recherche recharge exactement le checkpoint réellement travaillé au 7667, choisit Lames longues, atteint 400 points au 7768 et rend la facture disponible sur la forge ordinaire. Premier parcours 58,081 s rouge : après l’achèvement réel, le panneau recouvrait le bouton Pause. Le pilote ferme désormais le panneau avant de jouer ; reprise depuis le même 98 % acquise en **32,289 s**, export entier au 7769, aucun produit préparé. Rapports `tmp/longsword-v446/research-ui/2026-10-21T11-24-15-203Z/` et `2026-10-21T11-25-59-358Z/`. Aucune erreur GPU ni notification de mise en page capturée dans ce périmètre.

Le parcours fabrication/combat part du vrai ouvrage acier au **4562, 95 %**, exporté par la production. Une seule cible alliée immobile est ajoutée par préparation privée déclarée ; auteur, ouvrage, reçus, piles, stocks, tâches, recherche, tick et PRNG restent strictement identiques. Aucun raid naturel, personnage acquis, blessure ou équipement n’est préparé. Le joueur ajoute puis retire une facture par l’interface, contrôle les trois métaux initialement cochés et bois/argent/or décochés ; l’export entier en pause diffère uniquement de l’identifiant de facture retirée.

**Parcours Chrome 155/WebGPU, 1440×1000, acquis en 47,873 s** : produit acier 205 rangé au 4805, qualité médiocre, 100 PV, puis même arme équipée ; frappe dirigée de manche au 4819 contre la cible alliée 202 avec vraie blessure. Le lot passe de 3190 à 3406 sommets au port, scalaire matière 6,25, activité de manche 8, pose 8 et ombres partagées. Les 60 échantillons de pause sur 248,2 ms sont strictement égaux sauf heure réelle de collecte ; comparaison privée conservée dans `paused-samples-check.json`. Le chemin natif observé est direct ; cache et autres outils sont contrôlés par les cas CPU, sans mesure GPU native de chaque branche. Exports, rapport et captures inspectées : `tmp/longsword-v446/native-ui/2026-10-21T11-26-43-250Z/`.

**Deux notifications `ResizeObserver loop completed with undelivered notifications`** sont conservées pendant ce dernier parcours, sans erreur GPU capturée. La réserve de mise en page antérieure reste ouverte ; aucune cause ou innocuité n’est affirmée. Effets et musique sont désactivés avant chaque partie ; les navigateurs de contrôle sont lancés muets. Les réglages publiés des joueurs restent inchangés.

Présentation commune acquise en **157,275 s** sur le départ 250×250 / trois colons : minage puis abattage, 45 secondes chacun, vitesses 1/6/1/3 et phases de travail. Aucun saut, dépassement continu ou occupation rocheuse détecté dans ces fenêtres. Intervalles image p50/p95/p99/max : minage **4,2 / 4,3 / 8,3 / 37,5 ms** ; abattage **4,2 / 4,3 / 8,4 / 45,9 ms**. Rapport `tmp/test-runs/sword-v446-presentation-2026-10-21T11-27-57.810Z-19052/artifacts/`. Ce contrôle de synchronisation ne compare pas V445, ne mesure pas Les Forges et ne qualifie pas un débit ×6 général. Les deux réglages audio sont vérifiés à false avant de jouer, Chrome reste muet. Les 2104 empreintes finales sont identiques au gel.

## Incident de stockage

Le disque E: plein a interrompu la première passe. Nettoyage ciblé : 102 répertoires de caches graphiques fermés, 42 087 684 octets logiques ; trois seules copies `resources.assets.resS` de sondes Core, 762 235 488 octets, supprimées après égalité SHA256 avec l’installation source. Programmes de sonde, résultats, profils et captures restent conservés ; fichiers reconstructibles listés dans `tmp/longsword-v446/deleted-duplicate-assets.json`. Une compression d’archive de conversation engagée à tort a été intégralement annulée, attribut initial et SHA256 vérifiés dans `archive-restored.json` ; aucun nettoyage de conversation retenu. Aucun vidage global de `tmp`, sauvegarde jouée, historique, dossier humain `references_UI/` ou source produit supprimé.

## Livraison

Produit sélectionné et poussé sur `origin/main` : **`9a7abfbe767193d1f5183fd4f176405ec235a6e4`**. Paquet qualifié en **1,729 s**, `tmp/elsewhere-pages/v446-package-SzPQci/` : 552 fichiers dont 550 actifs ; 71 chemins publics et 68 fiches conservés strictement public↔dist ; actifs statiques non JS identiques au paquet V445. Les trois bundles JavaScript et l’entrée sont nouveaux ; aucun instrument privé ni dossier humain `references_UI/` livré. L’avertissement de répertoire non propre de Wrangler correspond à ce dossier humain non suivi, conservé hors commit.

Déploiement acquis en **19,107 s** : [version 822a5387](https://822a5387.elsewhere-cq7.pages.dev), [site principal](https://elsewhere-cq7.pages.dev). Vérification **14,297 s** : **20 réponses HTTPS exactes**, dix chemins sur deux origines ; `tmp/elsewhere-pages/v446-http-tPXk8C/`. Entrée, feuille de style, favicon, bundle, deux workers, catalogue et deux icônes de forge sont comparés ; ce relevé ne vaut ni gameplay distant ni téléchargement des 71 sauvegardes. Leur comparaison complète est locale.

Les documents de livraison seuls changent après la sélection, sans recompilation produit. Contrôles documentaires et en-têtes de schéma acquis ; les 2104 empreintes sources restent exactes. Serveur et navigateurs de contrôle arrêtés ; les deux notifications du journal Vite sont conservées dans `tmp/longsword-v446/vite-notifications.txt`, sans résolution annoncée. L’ensemble 2 reste principal. Les six ensembles, la victoire et la cible de fluidité en charge restent ouverts ; les notes privées préparatoires sur le cryptosommeil et le vaisseau ne constituent pas du gameplay livré.
