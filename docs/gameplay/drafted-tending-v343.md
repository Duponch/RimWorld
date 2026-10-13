# V343 — soins mobilisés sans médicament

13 octobre 2026. **Qualification ciblée acquise au schéma 233.** Un colon mobilisé peut soigner sans médicament au contact d’un autre humain local à terre ou déjà couché. Les54 nouveaux cas passent, ainsi que la conservation des63 sauvegardes historiques et les deux parcours Chrome avec sept recharges exactes. Les rouges initiaux et leurs baselines restent conservés ci-dessous. La branche naturelle V342 demeure blessée et non récupérée ; livraison prête au commit/push, puis publication.

## Geste joueur et conditions

Sélectionner un seul colon mobilisé, puis faire un clic droit sur le patient et choisir **Soigner sans médicament**. Le menu indique le motif lorsque le geste est refusé. Le médecin rejoint réellement une place cardinale libre au contact, travaille, puis traite une cible admissible avec la résolution médicale existante. L'ordre ne comporte pas de file ; une sélection multiple ou un auto-soin n'ouvre pas cette tranche tactique.

Le médecin doit être un colon libre local, éveillé, physiquement capable de manipuler et sans incapacité Médecin liée au passé. Une priorité Médecin0 n'interdit pas ce mandat explicite ; une incapacité professionnelle reste un refus. Le pacifisme lié au combat n'interdit pas les soins. Crise, portage du médecin, récupération de frappe/tir, étourdissement actif, épuisement et réactions immédiates feu/bombe restent des gardes.

Le patient doit être un **isCarePatient** humain local vivant, différent du médecin, réellement à terre ou couché avec son usage physique de lit. Une personne portée, en déplacement, en crise ou déjà réservée par secours/soins/alimentation/gardien/chirurgie est refusée. Le geste ne crée aucun lit, besoin de sommeil, médicament, transport ou nouvelle personne. Position, posture, dossier clinique et faim du patient sont conservés.

## Travail, interruption et propriété

La durée capturée réemploie600ticksCore divisés par MedicalTendSpeed, convertis dans l'horloge locale existante. La progression ne produit un résultat qu'après présence au contact valide, médecin disponible et patient encore admissible. Saignement, besoins et effets physiologiques continuent pendant trajet et travail. Qualité, traitement, XP et PRNG utilisent le résolveur médical commun ; le sec traite une cible par opération, sans dose prélevée sur les médicaments au sol ou en inventaire.

Annuler l'ordre, démobiliser le médecin, perdre l'accès/contact, déplacer ou perdre le patient interrompt le mandat selon les gardes existantes. Les cargaisons antérieures sont déposées par le plan physique ordinaire avant acceptation ; faute de dépôt possible, l'ordre est refusé. Une seule tâche et une seule réservation clinique restent admises. Le soin automatique/civil conserve son exigence de lit pour autrui et ses politiques habituelles ; les auto-soins restent dans leur commande propre.

Le marqueur `TendTask.drafted:true` appartient au médecin, avec phase approach/tend, ordre actif tend et destinations/files tactiques vides. Medicine, useMedicine, urgent et autres champs étrangers ne sont pas admis dans ce mode. Le patient ne devient ni objet ni seconde cargaison du médecin. Le secours ordinaire vérifie aussi les réservations cliniques concurrentes au schéma 233.

## Sauvegarde et transport

La migration valide strictement232 **avant** de changer uniquement schemaVersion vers233 : aucun marqueur tactique, blessure, posture, objet, rôle ou tirage n'est ajouté à une partie ancienne. Le champ futur sous un schéma antérieur, false/string, les phases étrangères et les doubles propriétaires sont refusés.

Le Decoder vérifie la forme dans sa boucle de personnes existante, puis les relations du nouveau domaine après reconstruction du prochain World et **avant adoption**. Mandat, médecin/patient locaux, santé/horloge, place cardinale, progression, absence de cargaison sèche et réservations uniques sont contrôlés. Les indexes de patients/places/objets appartiennent à cette adoption et ne persistent pas entre états. Aucun validateur World complet ni parcours de toutes les cases n'est ajouté au MAIN. Un paquet incohérent doit demander resync en conservant le dernier World confirmé et sa révision ; RAW et recharges conservent les mêmes contrats de tâche.

## Référence et portée de la tranche

Référence primaire relue dans le Core installé **1.6.4871 rev590**, assemblySHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` : FloatMenuOptionProvider_DraftedTend et JobDriver_TendPatient, recherche privée `tmp/early-access-v342/field-tending-reference/findings.md`. Le provider distingue l'ordre mobilisé du WorkGiver_Tend humain ordinaire, qui conserve InBed. Le job primaire possède draftedTend durable, contact ClosestTouch hors lit et maintien de posture pendant le travail.

L'adaptation locale adopte le mode explicite, le contact physique et la résolution commune ; elle borne l'accès aux humains locaux pris en charge et au sec. L'option Core avec médicament depuis l'inventaire et ses continuations, le provider entier pour soi-même/ennemis/animaux/mutants/mécanos, et la parité clinique exhaustive restent hors lot.

## Contrôles ROOT et limites

ROOT seul exécute. Le premier typage a été rouge sur une assertion de test portant sur reason ; ROOT l'a corrigée, sans modification de règle moteur, puis reprise **PASS18,550s**. Les contrôles du correctif de réservation ont repris après dégel autorisé ; le gel courant2868 inclut un vérificateur privé de package. Les résultats suivants sont acquis, sans transformer les rouges initiaux en PASS.

| Contrôle | Résultat |
| --- | --- |
| Groupe initial15fichiers, gel2866 | **RED62,188s**,146/148 ;52nouveaux cas passent, dont47 dédiés et5 UI ROOT |
| Baseline parent9443938b des deux rouges | **RED10,045s**, mêmes refus transport195 et différence fixture43 ; oracles conservés |
| Reprise correctif6fichiers | **PASS26,474s**,74cas dont54nouveaux :49unitaires et5 UI ROOT ; deux cas du visiteur urgent passent |
| Corpus public | **PASS100,098s**,63références/66fichiers, un vrai tick au schéma 233 ; publics exacts |
| Typage final et buildPages | **PASS21,847s** et **PASS3,932s** |
| Premier natif | **RED15,087s**, préparation de30médicaments dans une pile limitée à25, avant navigation et gestes |
| Reprise ChromeWebGPU | **PASS93,579s**, deux scènes préparées, sept recharges exactes, erreurs[] ; sept PNG inspectés par ROOT |
| Typage final du pilote | **PASS18,742s**, label `v343-typecheck-pilot-final20:45:57.703Z-19528` |
| Package | **PASS2,191s**,516fichiers/119446355octets ;66chemins publics/63références exacts, laboratoire absent, forbidden[], dist et publics inchangés |
| Documentation | **PASS2,363s**, contrôle `v343-docs-2026-10-13T20-50-59.856Z-2900` ; gel2868 exact et sept captures inspectées ROOT |
| Livraison | Prête au commit/push ; publication après ces opérations |

Le contrôle isolé parent9443938b reproduit les deux rouges initiaux, label `v343-historical-baseline20:29:32.935Z-12292` : transport historique195 demande resync au lieu d'applied ; interrupted-cargo43 ajoute stockpile.zoneId65, rouge historique connu depuisV320. Aucune régression V343 n'est déduite de ces deux cas ; aucune conclusion générale d'absence de régression n'en découle.

La préparation native a été réparée en deux piles25+5, mêmes30doses, sans modification du produit. Les scènes déclarées de32×32 emploient médecin182 pacifiste à priorité Médecin0 et patient183 à terre. Elles qualifient déplacement/contact, pause, export/recharge aux phases, traitement sec et annulation ; elles ne simulent aucune réussite de campagne. Dans le parcours traitement, deux plaies sont traitées aux qualités105 et218, XP175000, mobilisation conservée, patient encore à terre et30médicaments intacts. Dans le parcours annulation, OFF libère la tâche ; après cinq vrais ticks, XP0 et aucun traitement enregistré.

| Parcours et checkpoint rechargé | Tick | SHA256 exact |
| --- | --- | --- |
| Traitement — approche |3000| `ffff19c02179e84f5a60534b8205813e98aa872fff3999d7ea9b7a8473ba3589` |
| Traitement — travail |3026| `a7561a8519164232e6c831082fa1718382c2d67c52041f6c224c5c4b51de4c99` |
| Traitement — final |3161| `8431851cc3da0c9cc4a74dc627c95d5a488706061a565fa091d64a12a65af2e8` |
| Annulation — approche |3000| `ffff19c02179e84f5a60534b8205813e98aa872fff3999d7ea9b7a8473ba3589` |
| Annulation — travail |3026| `a7561a8519164232e6c831082fa1718382c2d67c52041f6c224c5c4b51de4c99` |
| Annulation — tâche libérée |3026| `6d6ce74847ffc4f00442dd0672435de8d08c612ca5c73ebd8f5cc54f797d9a68` |
| Annulation — final |3031| `5f444c39758ba864b9258c87ab22691b0581f41deee000a8cd86515eb5c45249` |

Rapports locaux conservés : `tmp/early-access-v343/native-report.json`, `tmp/early-access-v343/native-material-repair-report.json` et `tmp/early-access-v343/public-corpus-report.json`. Résumés et captures dans `tmp/early-access-v343/native-material-repair/drafted-tending-v343-V343--d6c67-ifist-field-treatment-treat/` et `tmp/early-access-v343/native-material-repair/drafted-tending-v343-V343--04bde-fist-field-treatment-cancel/`. L'inspection du package est consignée dans `tmp/elsewhere-pages/v343-package-pOrmP1/report.json`, label `v343-package20:47:19.986Z-22188`, HEAD précommit9443938b : cette inspection ne constitue pas une livraison.

La relecture statique contrôle admission, dépôt préalable, place cardinale, horloge patient, interruptions, exclusivité et coût du garde ciblé. Le désaccord de place du visiteur auprès d'un patient urgent est corrigé avant libération des sources : fieldProposal ajoute les serviceCell encore détenus par les autres acteurs aux places réservées de bedsideAccess. La place reste exclue jusqu'à sa libération réelle ; une autre place cardinale libre peut être choisie. Le paramètre additionnel absent conserve le chemin civil/automatique. Les deux nouveaux cas couvrant ces réservations passent dans la reprise74cas.

La dernière relecture ne trouve aucun défaut concret supplémentaire sur les mandats valides générés : étourdissement/récupération actifs refusés, patient en mouvement refusé, horloge ancrée avant résultat, claims symétriques et dépôt planifié avant marqueur. Les gardes save/Decoder restent ciblées au domaine sec. Cette conclusion statique ne certifie ni toutes les interactions ni une campagne naturelle.

La [continuation V342](colony-rescue-v342.md) reste à l'export66474 : Iris blessée porte encore Gaël à terre sous menace active, sans dépôt médical ni premier soin acquis. Ce mode refuse justement un patient porté. Les scènes préparées ne récupèrent ni Iris, ni Gaël, ni cette branche naturelle. Après validation/commit/push, la suite autonome ACTIVE est une tentative unique de repli, pose et soin de terrain depuis cet export, puis la qualification des réserves. La menace reste vivante ; aucune victoire, guérison ou sécurité du médecin n'est promise.

Aucun gainFPS, guérison ou secours de la campagne V342, autonomie alimentaire, campagne entière ou early access100% acquis. Les contrôles ciblés et la conservation native sont attestés ci-dessus ; documentation et gel finaux passent. Le commit/push et la publication restent à effectuer par ROOT, puis la continuation naturelle.
