# V458 — Lisser les sols rocheux

**Publié, schéma281 : produit `78cbd3a38388957fec0ed77553e29c590fa21f38`, déploiement `4b5eaee5`.** Cinq roches, travail Construction, interruption/reprise et revêtement payé acquis par reprises : **56 cas distincts**, dont31 nouveaux et25 voisins. Typage et parcours Chrome/WebGPU muet acquis ; un ancien échec de migration et une notification de mise en page restent consignés. Ce lot reprend une base ordinaire de construction après la revue de tous les domaines. Les exemples humains ne ferment pas le périmètre ; les six ensembles restent ouverts.

## Boucle retenue

Un colon habilité en Construction désigne une surface rocheuse rugueuse réellement visible et typée, la rejoint et la lisse par du travail physique. La matière de la case reste la même parmi les cinq roches existantes. Le terrain lissé peut recevoir un vrai revêtement payé ; le retrait de ce revêtement retrouve le même terrain lissé. Le lissage ne consomme ni ne rembourse de blocs et ne possède ni plan matériel, ni ouvrage, ni qualité d’objet.

La qualification prévue part d’un vrai minage joué. L’admission lit néanmoins l’état réel lissable, pas un historique d’excavation absent des sauvegardes : un sol rugueux ouvert peut aussi provenir de la génération. Les vieux sols sans identité de roche restent conservés ; cette information manquante ne devient pas du granite par déduction ou migration.

## Référence et adaptations

Core **1.6.4871 rev590**, DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Recherche primaire ciblée des désignations, WorkGiver/JobDriver, statistiques, TerrainDefGenerator et couches de terrain ; relevé daté et recherche Internet dans `tmp/smooth-floors-v458/reference.md`, sans code ou asset propriétaire copié. L’[annonce officielle du12octobre](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue principale1.6 et instable1.7 ; elle ne fournit pas les coefficients mécaniques, lus dans l’installation identifiée. Corpus chapitre10, voisins8–11 et CAT041/059/086, SYS/TEST056/058 et051–054 conservés ; leurs statuts ne constituent pas une qualification locale.

Base native2800Core, progression `SmoothingSpeed ×1,7`, apprentissage Construction0,1XP par Core de travail. Vitesse : skill `.3+.0875×niveau`, Manipulation, Sight pondérée à0,3 et lumière réelle du travailleur via WorkSpeedGlobal, minimum0,1. L’horloge locale groupe10Core et emploie son progrès fractionnaire existant ; aucune équivalence générale du pipeline natif n’est annoncée. Le vrai contact Touch admet la case cible et ses voisins sous règles de coins et portes.

La tâche engagée sauvegardée garde son progrès ; l’abandon réel puis nouvelle tentative repart à zéro, avec XP et dégagement déjà acquis conservés. Le terrain ne mémorise pas un chantier partiellement poli. La neige est dégagée pendant le vrai travail ; les salissures présentes sont retirées à la transformation. Le sable Odyssey n’est pas représenté par ce relevé Core.

Surface lissée native : beauté2, valeur5, passage0, fertilité0, propreté0, nettoyage×1, flammabilité0, supports Walkable/Light/Medium/Heavy. Elle peut de nouveau recevoir neige et salissures ; aucun effet stérile. Elle n’est pas retirable directement. Le natif distingue Rough et RoughHewn après minage ; le clone les a historiquement fusionnés en `rough-stone`, coût géographique2. Ce lot conserve ces anciennes cellules et leurs coûts ; il n’invente pas leur provenance ni une migration qui les retouche.

## Conception et conservation

`smoothed-stone` est un substrat avec le `stone` existant obligatoire. La couche `floor` garde son usage rapporté, ainsi que les remboursements ordinaires du seul revêtement payé. Aucune nouvelle largeur de tuple terrain, pile, ressource ou monnaie. Le journal cellulaire existant publie uniquement les mutations confirmées ; les lecteurs de beauté, valeur, marche, salissures et inspection voient le même état.

Le nouveau mandat `smooth-floor` réemploie les acteurs, réservations, chemin, ordre direct/rectangle, interruptions et annulation. Migration280 strictement validée sur les cartes et propriétaires originaux, puis changement du seul numéro281 : aucune roche lissée, identité, ordre, XP, position, fourniture, date ou tirage créé. Nouveaux états281 refusés dans280 et les versions antérieures avant promotion, futur282 fermé. RAW, checkpoint/delta et projection résidente restent des frontières distinctes.

Les contrôles du nouveau domaine commencent par ses rares jobs/cellules. Une validation contenant des lissages réutilise une géométrie locale et des index d’auteurs/matières préparés une fois ; elle ne reparcourt pas tous les jobs/personnes/piles pour chaque case. Aucun cache autoritaire par identité de World ni nouveau parcours de terrain par colon/image. Ces choix de conception ne constituent pas un gain FPS mesuré.

## Critères du lot

Une passe ciblée et un court parcours natif muet doivent couvrir extraction réelle, rectangle mixte, contact correct, travail/XP, interruption et recharge du travail engagé, résultat sur la même roche, neige/salissures, plancher payé puis retrait révélant ce même résultat et reprise entière. Gardes ciblées sur anciens/futurs contenus, matière obligatoire, auteur/progrès, faux ingrédients et vraie carte inactive si pertinente. Les préparations initiales, échecs et reprises seront déclarés ; pas de nouvelle campagne multicolonie ni banc FPS inchangé requis.

## Contrôles acquis et reprises

ROOT seul a exécuté les contrôles regroupés. **56/57 cas distincts sélectionnés acquis :31 nouveaux dans cinq fichiers et25 voisins dans six fichiers.** Un ancien oracle supplémentaire `FLOOR_KINDS.length===8`, obsolète avant V458, a été explicitement exclu ; le terrain lissé n’ajoute aucun revêtement à cette liste. Aucun compte de répétitions n’est ajouté au nombre de cas distincts.

- Typage initial13,180s refusé par quatre complétudes/annotations de tests ; reprise12,600s acquise. Typage final après réparations des nouveaux tests13,362s acquis, puis13,697s acquis après la retouche textuelle du survol natif.
- Première passe V45823,641s :27/31 acquis, quatre échecs conservés. Trois préparations étaient incohérentes : pile placée sur un lit qui ne la stocke pas, neige sans propriétaire cohérent puis cible rocheuse qui ne la retient pas, nettoyage sans zone foyer. Les fixtures emploient désormais des contextes admissibles séparés, une vraie autorité neige voisine et une vraie commande de foyer. Aucun assouplissement de stockage, neige ou nettoyage du produit.
- Le quatrième échec demandait à un checkpoint neuf sans aucun job de lissage de connaître le genre d’un job supprimé. La limite est désormais exacte : RAW refuse la référence orpheline ; une vraie transition possédant l’ancien mandat refuse suppression/réaffectation avec référence retenue et préserve l’état précédent ; un checkpoint neuf ne certifie pas globalement les anciennes références de jobs dont l’identité a disparu. Pas de nouveau parcours de toutes les personnes/jobs dans les mondes sans ce domaine pour annoncer une certification générale inexistante. Les autres mutants du nouveau job et terrain restent vérifiés au checkpoint neuf.
- Reprise des quatre seuls échecs18,686s : quatre acquis ;27 cas déjà verts non rejoués. Voisins65,927s :25 acquis et un échec V16 `Invalid historical map registry.` dans le test de file d’ordres. Témoin indépendant de la vraie V457 `55e22babddae82960c9cae802e452e4a846532de`, archive SHA256 `d7d12a55798773b819443018a43df91987007a0273a7b064b6ed3c3babda752d`, même test inchangé et même erreur exacte en16,194s. Les deux blocs bruts sont conservés ; les numéros de ligne de sérialisation diffèrent859/855 et1702/1697. Aucune égalité octet par octet des blocs complets ni normalisation n’est prétendue.

Logs : `tmp/validation-runs/v458-targeted-2026-10-22T02-59-57.141Z-23940/`, `v458-targeted-resume-2026-10-22T03-07-50.774Z-12016/`, `v458-neighbors-2026-10-22T03-06-18.396Z-2068/` et `v458-neighbor-witness-2026-10-22T03-09-20.726Z-3356/`. Le détail comparatif non normalisé est dans `tmp/smooth-floors-v458/neighbor-witness.json`.

La chaîne Node part d’une préparation explicitement déclarée : carte historique32², deux cellules de granite intactes, ouvrière182 avec Construction/Minage8, six bois, six repas et un lit. Aucun résultat de minage, progrès favorable, succès ou tirage n’est inséré. Vrais minages au308, mobilisation libérant le premier travail puis progrès0 au312, reprise active au320 avec10,88travail, résultat518, plancher payé548 et retrait563. Bois6→3→5, une déconstruction et une perte1 ; même granite et vrai fragment188 conservés. Le second mandat est réellement annulé dans ce parcours. RAW/rejeu depuis le travail exacts. Une seconde boucle acquise laisse coexister lissage et plancher réellement en construction, puis constate le retrait du mandat devenu incompatible au vrai recouvrement.

Les gardes couvrent le vrai travail, ses mutations d’auteur/progrès/escrow/faux intrants et les trois mutations du terrain terminé via le codec tuple réel ; versions280/282, propriétaire de roche effondrée, carte originale inactive et chirurgie de captif280 en cours conservée par migration au seul numéro281. Les petits cas de lecteurs utilisent des préparations déclarées ; ils ne sont pas présentés comme une acquisition naturelle des cinq matières dans une campagne.

## Parcours natif et présentation

Chrome **155.0.8059.85**, WebGPU,1440×1000. **`--mute-audio` et quatre préférences effets/musique désactivées, volumes0 avant la première page et après chaque recharge.** Aucun changement des valeurs proposées aux joueurs publiés. Seul le BEFORE de la chaîne Node est importé initialement, SHA256 `a1a93cb39a6d7d6f9238c14d422460d6a9cc67aade06c9e12196d002828e8b73` ; aucun résultat Node n’est substitué au jeu natif.

Première session50,317s : import entier exact, deux vrais minages et rectangle mixte2ordres/1case ignorée acquis au309. Arrêt du pilote conservé : son sélecteur de clic droit trouvait à la fois **Prioriser : Lisser le sol** et l’action de transport du vrai fragment. Pas d’erreur graphique ou de simulation détectée dans cette session. Sélecteur privé précisé ; libellé produit du survol rendu **Lisser le sol** au lieu de l’identifiant interne. Reprise depuis la propre sauvegarde native309, sans rejouer minage ni rectangle ;2442 fichiers servis regélés puis strictement égaux après contrôle.

Continuation111,885s acquise : véritable priorité de travail sur job189, ouvrière182, progrès1,36 au310 ; sauvegarde entière et recharge du même travail/auteur/réservation/progrès exactes. Les deux vraies surfaces deviennent lissées, bois6 inchangé ; plancher payé6→3, retrait jusqu’au768, cinq bois présents et une perte1 au registre. Même fragment188 et deux terrains de granite lissés, ni blocs lissés ni gain matériel inventés. Recharge entière du résultat et60images en pause strictement égales. Inspection du sol, pictogramme, pose de travail et captures finales relues par ROOT.

Rapports privés : `tmp/smooth-floors-v458/native-ui/2026-10-22T03-11-26-202Z/report.json` puis `2026-10-22T03-14-12-521Z/report.json`, avec sauvegardes/captures propres à chaque étape et trace des vraies commandes. **Une notification `ResizeObserver loop completed with undelivered notifications.`** dans la continuation et le journal Vite reste nommée ; aucune autre erreur relevée, `graphicsFault=false`, `simulationStopped=false`. Sa cause n’est pas attribuée. Chrome est fermé et le serveur ROOT5173/PID26496 est arrêté après vérification de son identité ; le serveur utilisateur5184 n’a pas été piloté.

## Coût du nouveau contrôle

Banc Node isolé acquis en5,733s, sept alternances, monde déclaré128² fixe avec8personnes/32tabourets/128piles et2048surfaces typées. Chaque appel vérifie un résultat vrai ; création/clonage/sérialisation/validation complète hors chronométrage, monde et prédécesseur inchangés, SHA du garde strict. Les transitions retiennent les mêmes jobs, sans retrait/retypage chronométré.

| Mandats préparés | Garde seul, médiane ms | Même jeu de jobs avec prédécesseur, médiane ms |
| --- | ---: | ---: |
| 0, contrôle littéral280 | <0,001 | <0,001 |
| 128 | 0,0410 | 0,0455 |
| 512 | 0,1349 | 0,1665 |
| 2048 | 0,5295 | 0,6575 |

Rapport `tmp/smooth-floors-v458/validation-cost-2026-10-22T03-10-54-130Z.json`. Ce banc mesure le garde courant et son contexte fixe ; aucun ancien exécutable à parcours imbriqués, moteur complet, navigateur, GPU, débit physique ou FPS avant/après n’a été mesuré. **Aucun gain FPS global annoncé.** Les petites définitions restent immuables et le rendu utilise les lots/pigments existants, sans mesh par case ou nouvelle texture publique.

## Publication et suite

Build Pages propre acquis en4,781s à partir du produit choisi `78cbd3a38388957fec0ed77553e29c590fa21f38`. Paquet **552fichiers/152745134octets**,71chemins de sauvegardes et68fiches strictement identiques aux fichiers publics ; statiques et CSS inchangés par rapport au paquet V457 qualifié, outils privés absents. Rapports `tmp/elsewhere-pages/v458-package-BVjQbr/` et `v458-http-e5s0q5/`.

Publication Pages acquise en13,916s, déploiement **`4b5eaee5`**. [Jouer à Elsewhere](https://elsewhere-cq7.pages.dev/), [déploiement identifié](https://4b5eaee5.elsewhere-cq7.pages.dev/). **20réponses HTTPS ciblées exactes** en octets/typeMIME : entrée, JS, CSS, deuxWorkers, catalogue et icônes existantes, sur les deuxorigines. Ces réponses prouvent disponibilité du paquet ; elles ne rejouent ni le navigateur ni une campagne/FPS. Sauvegardes publiques et historiques inchangés. L’avertissement de répertoire Git non entièrement propre vient du dossier humain non suivi `references_UI/`, conservé et absent du paquet ; il n’a pas été ajouté au commit.

Relecture transversale du22octobre après ce lot : habitat/production/recherche/logistique, habitants/social/clinique/captivité/animaux, monde/récit/combat/dangers, création/aide/ergonomie, victoire/campagne et performances réexaminés. Trois notes privées `next-habitants.md`, `next-material-world-ui.md`, `next-story-campaign.md` conservent les comparaisons. **Suite privilégiée : apprentissage animal conduisant à un vrai transport local utile**, après recherche dédiée ; le bât de caravane existe déjà et n’est pas présenté comme manquant. Une demande commerciale mondiale, un danger toxique prolongé, les usages du couple et l’apprentissage de départ restent des alternatives, sans former une liste fermée. Murs lissés, autres bases, six ensembles, campagne complète et cible FPS restent ouverts ; pas de retour automatique aux variantes de sols ou au vaisseau.
