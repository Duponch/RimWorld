# Abattage domestique — V309

Lot fonctionnel demandé le 11 octobre 2026 : priorité aux boucles élémentaires manquantes. Schéma **220**. La validation finale est consignée ci-dessous ; une fixture préparée ne démontre pas une campagne naturelle.

## Décision et boucle jouable

L’élevage possédait déjà apprivoisement, enclos, reproduction, lait/laine, soins et alimentation assistée. La chasse excluait les animaux domestiques ; il manquait donc le choix de conserver un reproducteur ou de transformer une bête possédée en ressources. Ce lot ferme **animal possédé → désignation → déplacement et abattage au contact → dépouille originale → transport/boucherie → viande et cuir → cuisine et usages textiles existants**.

Dans **Animaux**, la colonne **Abattre** désigne individuellement une bête. Sa fiche propose la même case ; décocher annule avant l’acte terminal. La désignation persiste si aucun dresseur ne peut agir. L’activité indique attente, approche ou abattage et le nom du travailleur. Un couteau original au-dessus de l’animal suit sa trajectoire GPU ; le seuil d’affichage reste celui des icônes d’ordre. Aucune affectation ni exécution automatique n’est ajoutée aux troupeaux historiques.

Le métier Dressage/Animaux doit être actif, avec manipulation et déplacement possibles et violence autorisée par le passé. Aucun niveau Animaux minimum, arme, médicament ou aliment n’est requis. Au sein du métier, l’abattage précède conduite, traite/tonte et entretien. Les réservations communes empêchent deux dresseurs ou une concurrence avec soins, alimentation, corde et collecte des produits. Un animal inaccessible reste désigné sans être tué à distance.

Le travail attend l’arrivée physique des deux acteurs et dure **18 ticks locaux**, adaptation des 180 ticks Core. L’animal est retenu uniquement au contact ; coins fermés, danger ou incapacité interrompent l’engagement. Annulation, mobilisation ou priorité retirée libèrent la tâche. Une incapacité survenue pendant un segment est réconciliée avant le snapshot suivant. L’intention reste disponible pour un autre dresseur.

À la fin seulement, l’incision clinique au cou et la mort utilisent le dossier anatomique commun. Pas de disparition d’une partie pour inventer du rendement ; l’identité originale devient une seule dépouille et sa conservation thermique continue. Les blessures préexistantes gardent leur effet ; `execution-cut` seule ne déclenche pas la pénalité 0,66. Le sang emprunte les salissures existantes, avec un tirage persistant et des couches locales plutôt que le placement Unity. Le dépôt refusé par les capacités ne révoque pas une mort réalisée.

Le dresseur ne transporte pas spécialement le corps : transport, réserves acceptant les dépouilles fraîches et facture de boucherie sont des travaux distincts. Cuisine transforme ensuite la vraie viande ; les cuirs rejoignent les matières déjà utilisables. Aucune viande ou peau n’est créée au clic.

## Référence et frontières

La [recherche Core datée](../research/slaughter-core-v309.md) distingue relevés frais du binaire **1.6.4871 rev590**, XML, annonce officielle et helpers historiques. Adopter le mandat individuel, les droits, contact et incision ; adapter horloge, déplacement 3D, PRNG local et salissures. Différer quotas automatiques, critères sexe/âge/gestation, liens affectifs, idéologie, espèces absentes et morts explosives. Aucun identifiant global SYS/TEST du corpus n’est clos par ce lot.

La tâche réemploie `Pawn.animalHandling.kind='slaughter'`, avec champs de cargo neutres, au lieu de créer une deuxième famille de propriétaires. La garde est partagée entre fichiers et Decoder. Le schéma 219 est strictement validé **avant** migration du seul numéro vers 220 : aucun animal, produit, travail, compétence ou histoire ajouté. Les futurs champs sont rejetés dans l’ancien format.

L’exécution mobile nouvelle exige un animal et une incision réelle au cou au tick terminal ; l’exécution historique à terre garde sa règle antérieure. Les cas de cou déjà épuisé sont soumis au vrai modèle anatomique. Les humains et mécanoïdes ne gagnent aucune nouvelle admission. Progression, annulation et remplacement corps au même tick ne modifient pas les anciennes vues du Decoder.

## Contrôles et limites

Les nouveaux contrôles ciblent annulation sans tirage ni sang, capacités, priorités, conflits, mouvement capturé, contact diagonal, mort concurrente, dépouille unique, rendement et boucherie réelle ; fichiers/migration et snapshots ciblent les cinq espèces, corruption et reprises exactes. Les marqueurs partagent les attributs des corps résidents : aucune recherche de travail ni écriture par acteur et par image, aucun dessin supplémentaire hors désignation active. La pose et la barre de travail reflètent le compteur confirmé.

### Simulation, frontières et présentation ciblées

Le groupe final des trois nouveaux fichiers `slaughter-core-v309`, `slaughter-persistence-v309` et `slaughter-presentation-v309` passe **41 cas en 10,087 s**, journal `v309-contact-final-2026-10-10T23-58-50.022Z-20400`. Il comprend le minimum de sang du jeune animal, l’incapacité pendant approche/contact, les commandes en pause, un constructeur fermant le dernier flanc diagonal après le tour du dresseur et un segment commencé au même tick. Les captures fichier et Decoder restent exactes après ces réconciliations ; santé, intention et PRNG sont conservés avant l’acte terminal. Le test de construction du marqueur refuse désormais les erreurs TSL, au lieu de ne vérifier que ses attributs.

Les groupes acquis ne sont pas additionnés comme une suite unique : le premier compte 49 cas/7 fichiers, dont 48 passent ; le groupe élargi compte 80 cas/13 fichiers, dont 72 passent ; la reprise compte 42 cas/4 fichiers et passe avant les derniers ajouts. Les contrôles historiques couvrent domestication, cycle animal, chasse et interruptions, dépouilles/rendu, inspection, horloge, uniformes et migration des zones. Le groupe final de 41 cas remplace les preuves des trois nouveaux fichiers ; la reprise des quatre contrats uniformes/dépouilles/horloge/stockage passe **15 cas en 12,535 s**, sans erreur TSL, dans `v309-shared-final-2026-10-11T00-10-18.960Z-22864`. Les autres garanties acquises restent bornées à leurs contrats. Il ne s’agit pas de la suite complète ni d’une campagne naturelle.

Les rouges et corrections restent identifiables : premier refus de dépouille mobile par l’ancienne garde d’exécution à terre (`v309-slaughter-first`, 16,549 s) ; typage de deux lectures facultatives de fixture (`v309-typecheck`, 15,936 s) ; fixture avec échéance animale hors borne, attente anatomique erronée à un PV de cou et oracle de migration figé sur 219 (`v309-slaughter-final`, 25,989 s). La correction d’oracle utilise le schéma courant, sans retirer la validation stricte des anciens fichiers.

### Parcours matériel et corpus public

Le parcours préparé dans **Chrome, WebGPU, 2560×1440** passe en **41,874 s**, journal `v309-native-final-2026-10-10T23-59-21.557Z-9436`. Menus et vraies commandes exercent désignation/annulation, colonne Abattre, déplacement, retenue au contact et travail confirmé. Sept sauvegardes/recharges comparent exactement le monde complet aux ticks **2000, 2001, 2058, 2075, 2145, 2218 et 2372**. La même identité devient une dépouille, le dresseur la transporte dans la vraie réserve, puis une facture produit **20 viandes et 11 cuirs** ; dix viandes deviennent un repas réellement mangé, avec faim restaurée et les onze cuirs conservés. Les besoins et transports ne sont pas sautés.

Les sorties restent sous `tmp/slaughter-v309/native-final/slaughter-v309-V309-native-92f6a-ad-corpse-butchery-and-meal/` : sept checkpoints, rapport, captures de désignation/contact et **WGSL réellement généré**. Les deux images ont été inspectées. Le couteau suit l’animal et la barre reflète le contact ; erreurs page/console vides. Les **2608 entrées figées** source/tests/publics restent exactes après le parcours. Le navigateur et Vite5380 propres au test sont fermés.

Les reprises natives ne deviennent pas des succès rétroactifs : configuration de serveur avec mauvais cwd (1,297 s), facture absente de la fixture préparée (17,348 s), pose TSL hors `Fn` (15,914 s), ancien pilote Architecte/stockage (53,883 s), puis transport interrompu par la faim du cuisinier préparé (61,864 et 61,022 s). Le vrai checkpoint montre la dépouille déposée au milieu du trajet et une faim basse ; le parcours final donne ce transport au dresseur rassasié et réserve le cuisinier à la cuisine. La correction TSL est produit ; les autres réparations sont pilote/préconditions. Aucune règle alimentaire ou restitution de cargo n’est détendue.

Le contrôle public frais passe **63/63 références et 66 fichiers en 67,637 s**, journal `v309-public-final-2026-10-11T00-02-59.399Z-5056`, rapport `tmp/slaughter-v309/public-controls/public-context-check-QEuGVJ/`. Payloads/hash, migrations, recharges canoniques et véritables ticks ordinaires passent ; Decoder RAW et corps littéral du MAIN courant donnent les mêmes continuations et conservent leurs anciennes vues. Recensement et empreintes source/publics/contrôle sont identiques avant/après. Aucun fichier historique n’est réécrit ni nouvelle entrée publique créée.

### Présentation commune, compilation et limites

Le contrôle commun de présentation a été exécuté dans Chromium : **FAIL 64,572 s**, `v309-presentation-final-2026-10-11T00-06-03.448Z-2432`. Minage186→162, mouvements sans saut, retraits après confirmation et réponses des vitesses passent, mais une erreur de compilation WebGPU `Tint IR / swizzle view instruction still has usages after lowering` invalide le résultat. Le pilote permet désormais de choisir explicitement Chromium ou Chrome, sans changer aucune assertion.

La même commande de présentation, avec `HARVEST_BROWSER=chrome`, passe **120,137 s**, `v309-presentation-chrome-2026-10-11T00-07-59.162Z-7868`, matériel AMD/RDNA1 et viewport1440×1000. Minage186→162 au tick2885, abattage262→238 au tick2887 ; aucune erreur, starvation, case roche occupée, saut ou retrait avant confirmation. Les réponses visibles maximales des contrôles sont20,4/21,8ms, sous la borne100ms conservée. Les deux captures ont été inspectées. Sources/tests/publics restent exacts et les processus propres au contrôle sont fermés. Le choix du navigateur qualifie ce résultat Chrome ; il ne prétend pas réparer le compilateur Chromium ni recertifier Brave.

Le typage complet final avec `--singleThreaded` passe **14,139 s** (`v309-types-final-2026-10-11T00-10-43.688Z-19936`) ; le build Vite mode Pages passe séparément **2,261 s**, 933modules (`v309-pages-final-2026-10-11T00-11-17.307Z-28380`). Ce sont deux commandes qualifiées, pas un succès attribué à une exécution de `npm run build:pages`. Le harnais public littéral est également typé en **5,522 s** (`v309-public-types-2026-10-11T00-11-20.651Z-25952`).

Le contrôle documentaire courant passe **5,118 s**, `v309-docs-final-2026-10-11T00-11-56.947Z-26756` : liens/en-têtes220 et originaux du corpus conservés. `git diff --check` passe. Les sources publiques historiques n’ont aucun diff ; le dossier utilisateur `references_UI/` demeure hors lot.

Aucun gain CPU/GPU/FPS ni 240 FPS/vrai ×6 constant n’est annoncé. Les quotas et le secours vers un couchage animal restent absents dans V309. La relance planifiée demeure **PAUSED**. La nouvelle demande humaine autorise, après commit/push de ce lot, la suite autonome des mécaniques élémentaires ; prochaine priorité retenue : secours physique animal et emplacement gratuit normal/médical. Les publications Cloudflare restent regroupées.
