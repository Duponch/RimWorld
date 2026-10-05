# Validation V217 — snapshots et pilote Énergie

**Livré dans le périmètre contrôlé.** Base V216 `fa1b149760dd2021b677b1660d6232b95cb28f01`, schéma 196 inchangé. [Contrat](../development/snapshot-consolidation-v217.md), [recherche](../research/planet-cache-v217.md). La rédaction, le code préparé et les tests écrits ne valent pas résultat.

V216 a été commité le 5 octobre à 11:49:13 (Paris), 155 min 43 s après V215. Le lot regroupe la boucle globe/groupe/besoins/commerce/retour et les corrections de diagnostic ; ce délai dépasse l’objectif indicatif de 90 minutes. Les 32 commandes V216 journalisées avant commit totalisent 924,308 s, échecs et reprises compris, hors diagnostic causal Crash V215 et file longue V215. Ces durées ne donnent pas une attribution exclusive de lecture, rédaction, coordination ou vitesse du modèle.

Copie de validation créée après commit : tmp/milestone-validation/fa1b149760dd, 4 278 fichiers suivis byte-à-byte, manifeste SHA256 et dépendances immuables liées. Les sources servies par la file longue ne changent pas pendant les éditions V217. Le lanceur privé vérifie les copies et préfixes authentiques avant et après, puis exécute successivement les fichiers originaux avec leurs assertions : Crash depuis J12, Énergie depuis J32, Prison depuis J58 et Environnement depuis J87. Il conserve les horizons originaux et leurs fins anticipées autorisées. Cette file est une reprise de suffixes, pas quatre nouvelles campagnes depuis leurs préparations initiales.

La file démarre le 5 octobre à 11:50:15 (Paris) ; résultat en attente. Le lanceur SHA256 264799d8f54b46c935f6680f1ccc886fca55c1baae387aa050b0f0d6529a7023 et les sources de la copie sont gelés. Pendant la file : recherche primaire, implémentation et préparation des tests V217 seulement. Aucun typage, benchmark, navigateur ou autre campagne concurrent.

Le banc V217 est préparé pour comparer le vrai SnapshotDecoder V216 de la copie au candidat, sans référence tmp dans les tests commis. Trois charges : sans globe et avec globe sur 250², puis groupe réellement sorti sur 32². Le même encodeur/paquet est vérifié, les statuts/raisons de refus, Worlds adoptés et anciennes frames sont comparés avant mesure. Les observations individuelles de clone et adoption sont enregistrées en A/B/B/A, avec voies froides et stables, checkpoints et deltas séparés. Aucun résultat de performance n’est préjugé.
Première reprise V216 : Atterrissage depuis le préfixe authentique J12 atteint tick 144 000 et passe en 664,790 s. SHA du World final : 04ab08c5b9e74e349081acec311ca92706ea440fa72fa6f857990ff54fd4b8f6. Les cinq contacts tardifs à 124509/124585/124661/124737/124813 sont prospectivement enregistrés comme frénésie alimentaire, avec Pawn et portions originales ; quantité cinq toujours dans le bilan, dernier tick brut conservé. Aucune nouvelle ration ordinaire après le checkpoint. La borne historique antérieure au délai utilise le SHA et rawLast53950 à J12 ; aucun ancien type d’ingestion n’est reconstitué. Les trois personnes restent soumises aux assertions originales de santé, besoins et autonomie agricole. Le rouge V215 demeure historique ; ce résultat porte sur le suffixe V216 et son carnet d’ingestion4. Énergie échoue ensuite à la fin J48 sur la phase rebuild : les observations ne reproduisent pas la chute V215, mais les objectifs finaux de reconstruction restent incomplets. Durée 747,228 s, horizon 288 000 inchangé. Le diagnostic de lecture du checkpoint montre cableCut à 287 718, passage rebuild à 287 838 après les 120 ticks requis, puis prochaine décision ordinaire à 288 000, hors boucle : aucun ordre de reconstruction publié. Cette cause ne prouve pas à elle seule que les 600 ticks finaux tiendraient dans la borne ; l’amont et la correction du pilote restent à contrôler. Prison passe en 102,943 s depuis J58 et termine au tick 355 989 avec un vrai composant de réparation consommé et le carnet spent=1/successes=1/failures=0. SHA du World final : c9f584f8a0570c85ab7f386d1b05969a52e446a1342fdd1d72f741357fd9976e. Environnement est en cours.

Décision après lecture des checkpoints : les manœuvres de phase reçoivent une observation rapprochée et une attribution réelle bornée, distinctes des scans ordinaires. La stabilité finale de 600 ticks devient explicitement assertée même si la borne est atteinte. Les six cas de secours/repli existants sont conservés ; nouveaux cas électriques et reprise longue V217 restent à exécuter. Le suffixe V216 rouge et sa borne restent inchangés.

Relecture statique supplémentaire : copie brute par méthodes héritées remplacée par copies indexées, avec deux cas de sous-classes légales (pas de preuve exécutée). Une divergence de verdict hors planète a aussi été identifiée par chemin d’import/garde : la préparation d’absence est séparée pour préserver le transport antérieur. Le banc prévoit le numéro fractionnaire sans owner puis avec projectiles vides ; tout éventuel durcissement global fera l’objet d’un résultat distinct, sans masquer une différence sous un gain CPU.


## File V216 terminée et conservée

Le 5 octobre à 13:08:02 (Paris), le lanceur termine : Atterrissage passe depuis J12, Prison passe depuis J58, Environnement passe depuis J87 ; Énergie reste rouge depuis J32 sur sa reconstruction finale. Commande enveloppe : 4 666,327 s (77 min 46,327 s), sans contrôle lourd concurrent. Les 4 278 fichiers suivis correspondent encore au manifeste initial. Archive privée exacte : tmp/validation-artifacts/v216-suffixes, quatorze fichiers, summarySHA 7a94b99d152869d796f83c08321725170ae75d89177f9af9bf86b12b48947b9a. Les preuves V215 restent rouges historiques.

Environnement termine au tick816293, avant son horizon847698 autorisé, en3 147,003s. Chauffage hivernal, production, consommation et récolte du retour du printemps passent les assertions originales ; 134 repas ingérés en hiver et six unités réellement récoltées après springReturn814500. Réparation : spent1/successes1/failures0. WorldSHA 539134a0f138a89473412d7afbfa8293a2b1ffe0df1849fb98db6b0e2f2770c2. Ce suffixe ne valide pas une nouvelle campagne entière depuis sa création ni toutes les saisons/climats.

## Comparaison Node exécutée

PASS en119,638s : trois charges, neuf voies, deux cycles A/B/B/A,160 observations par côté/voie avec valeurs individuelles conservées. Sources V216/candidat vérifiées avant/après. L'oracle compare55 publications/refus/retries/anciennes frames et deux cas distincts de compatibilité du numéro fractionnaire (absence acceptée antérieurement, propriétaire balistique refusé). L'encodeur ne change pas ; aucune fixture de chronométrage n'est mutée par les paquets corrompus. Rapport : tmp/planet-cache-v217/decoder-2026-10-05T11-10-53.369Z.json.

| Charge et voie | Adoption médiane V216 | Candidat V217 |
|---|---:|---:|
| Sans globe250², checkpoint stable | 3,269ms | 3,860ms |
| Sans globe250², delta stable | 0,287ms | 0,436ms |
| Sans globe250², checkpoint froid | 3,193ms | 3,805ms |
| Globe250², checkpoint stable | 5,790ms | 4,980ms |
| Globe250², delta stable | 2,691ms | 1,600ms |
| Globe250², checkpoint froid | 5,543ms | 6,265ms |
| Groupe réellement parti32², checkpoint stable | 2,977ms | 0,639ms |
| Groupe réellement parti32², delta stable | 2,929ms | 0,593ms |
| Groupe réellement parti32², checkpoint froid | 2,906ms | 1,858ms |

Les gains des deltas avec globe/groupe se retrouvent dans chaque bloc. Les voies sans globe régressent sur cette série ; elles ne sont pas présentées comme améliorées. Le checkpoint stable avec globe réduit sa médiane mais augmente sonp95(7,923→10,986ms), et le froid augmente sa médiane tandis que moyenne/p95 diminuent : résultat dispersé, pas accélération uniforme. Clone checkpoint médian ~46ms sans globe/~58ms avec globe ; le clone est chronométré hors adoption, constructeur exclu et aucune simulation dans la région mesurée. Ni cause GC/allocation, transfert réel, tick complet, mémoire ou FPS ne sont déduits de Node.

## Navigateur A/B/B/A exécuté

PASS en131,120s, quatre serveurs successifs réservés sur5191. Chaque passe vérifie le module réellement transformé du client et du worker : V216 exact enA, candidat enB. World250² identique en entrée et vérifié par SHA chargé, iso proche,1920×1080/DPR1,×6, cinq secondes de chauffe puis huit mesurées, météo imposée absente, échantillons individuels conservés. Chrome153, WebGPU, adapterAMD/rdna-1, Ryzen5 3600 ; pas de mesure timestampGPU. SourceDigest 6cd925b8ed8a3a36f20ff316827bd57859ecd426a7634ff7cbe03f0f84234914. Manifest : tmp/planet-cache-v217-native/manifest.json ; rapports tmp/performance-audit-v140-v217-{a1,b1,b2,a2}.json.

Médianes adoption A1/B1/B2/A2 :2,3/1,6/1,5/2,3ms ; p95 :3,3/2,7/2,3/3,7ms. Entre271 et279 adoptions observées par passe. RAF172,57–172,99images/s, vitesse réalisée5,9900–5,9920 et288ticks par fenêtre. Les Worlds finaux et les rythmes de publication ne sont pas supposés identiques au seul motif de fenêtres temporelles identiques. FPS et tick n'ont pas de gain établi ; CPU de frame reste ~1,87–1,96ms moyen. Erreurs navigateur[] à chaque passe. Ce relevé porte sur cette scène, cette caméra et ce matériel, pas les58colonies publiques ni la campagne Énergie.

## Contrôles courts déjà exécutés

Typage7,345s et build6,648s passent. Présentation116,700s : mine7839frames/chop7783frames, zéro saut, dépassement continu ou occupation solide ; p95 des intervalles6,1/6,2ms. Première ciblée :25/30 passent ; seconde :28/30. Les défauts de préparation sont distingués du produit : bills vide manquant, tir démarré avant le mandat tactique du driver, refus de personne placé trop tôt, générateur non relié cardinalement, puis borne de minage200ticks trop courte pour19coups. La préparation minière corrigée est bornée à400ticks avec profil neutre/contact/dégâts/matière réels ; les1800ticks de manœuvres et600finaux restent inchangés. Le dernier contrôle de ces deux cas et la régression sont encore en attente. L'échec EPERM du premier lanceur est conservé ; la reprise autorisée exécute le typage, sans résultat attribué au lancement bloqué.


## Sources finales et limite de campagne

Régression initiale :559fichiers,558passés/unrouge,2539réussis/unéchec/unignoré,436,113s ; seule la nouvelle suite de transitions était explicitement exclue pendant sa préparation. L'ancien oracle de pilote imposait un rang de destinations, alors que les deux civils sont déjà sûrs aux vraies cases14,13/15,13. Il est remplacé explicitement par le maintien sans déplacement redondant, le rally17,16 du défenseur, puis deux destinations intérieures réellement libres/distinctes après brèche et holdOpen. Les trois aperçus restent non mutants, chaque ordre est réellement adopté, validateWorld strict conservé ; le produit n'est pas modifié pour ce contrôle.

La nouvelle suite électrique termine bien les deux coupures, reconstruction et600ticks ; son dernier rouge observait uniquement orders.active après consommation de l'ordre direct. Le témoin de trajet lit désormais motion avec son vrai mandat haul/jobId/active, et portage/replay/coupure sont vérifiés séparément. Rien n'est produit par un témoin de test.

Cohorte finale9,162s : trois fichiers/11cas passent (héritée3, secours-repli6, transitions2). Avec les558autres fichiers verts inchangés, la régression hors campagnes longues est verte **par reprises :560fichiers/2542réussis/unignoré**. Les30cas ciblés V217 sont également verts par reprises. Aucun second plein rejeu n'est prétendu. Typage final5,208s passe après ces assertions ; sources produit et bancs restent celles mesurées, build et présentation antérieurs restent applicables.

Schéma196 inchangé, aucune migration, scène ou mécanique Core nouvelle. Le pilote électrique est certifié sur le parcours court ; le suffixe long J32→J48 devra être rejoué depuis son préfixe authentique sur la copie du commit V217. Ni son issue future ni la réparation du rouge V216 ne sont annoncées. Les résultats initiaux, corrections de préparations, oracle pilote et corrections produit restent distincts.

Treize commandes V217 journalisées totalisent882,105s (14min42,105s), échecs et reprises inclus, hors file longue V216. Le lancement bloqué EPERM ne crée pas de résultat validé. Ces durées et le délai entre commits ne mesurent ni tokens/s ni une attribution CPU exclusive de rédaction, coordination ou attente.
