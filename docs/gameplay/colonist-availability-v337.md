# V337 — comprendre l’absence de colon contrôlable

13 octobre 2026. Schéma232 conservé. Lot acquis pour expliquer une carte sans colon libre, en distinguant les personnes présentes, les originaux vivants hors carte et les décès confirmés. Le périmètre comprend aussi une correction d’admission des originaux hors carte dans le bridge, révélée par les contrôles. Les contrôles ROOT sont clos dans les périmètres ci-dessous ; commit/push et publication restent à consigner dans la clôture dédiée.

## Contrat joueur

Quand aucun colon vivant présent ne peut recevoir un ordre direct, les alertes affichent **Aucun colon libre sur cette carte** et les raisons actuelles. Une personne à terre ouvre **Santé**, une crise mentale **Besoins**, une détention **Prisonnier**. Les causes cumulées restent visibles ; Santé prend priorité pour la destination principale d’une personne à terre. Les alertes médicales et leurs cycles de cibles existants restent disponibles.

Un original vivant en reconnaissance ou en voyage commercial ouvre **Monde > Voyages individuels** ; un membre de groupe ouvre **Monde > Globe et groupe**. Le libellé indique la phase confirmée, notamment trajet aller, comptoir, trajet retour ou entrée en attente. Le clic ouvre la gestion existante : aucune ancienne coordonnée du voyageur n’est utilisée pour le sélectionner sur la carte, aucun rappel individuel fictif ni délai de retour garanti n’est ajouté.

Les décès identifiés restent nommés. Un corps local garde sa cible physique lorsqu’elle existe ; sinon le dossier local ouvre Historique. Une perte originale de groupe renvoie à sa vue de groupe. Si aucune personne coloniale vivante locale ou en voyage n’est identifiée, le libellé devient **Aucun colon vivant actuellement recensé dans la colonie ou ses voyages** et la destination principale est **Menu**, même lorsqu’il reste des décès connus. Une carte vide sans dossier de décès signale seulement l’absence constatée.

Le carnet conserve ses sept préparations. La ligne de travail devient **Comprendre la disponibilité des colons** et propose **Consulter Santé**, **Consulter Besoins**, **Consulter Prisonnier**, **Ouvrir Monde** ou **Ouvrir Menu**, suivant la première destination pertinente. Les détails et boutons gardent leur identité durant les mises à jour. Une équipe locale de nouveau contrôlable retrouve la ligne **Répartir le travail** et **Ouvrir Travail**. Le sommeil ou le travail en cours ne suffisent pas à retirer le contrôle ; les incapacités, trajets et refus d’une commande restent décidés par les mécaniques existantes.

Tant que les vrais occupants du départ sont contenus dans leurs capsules, le [bandeau d’arrivée V335](starting-arrival-v335.md) garde la priorité. Le carnet attend leur sortie et aucune seconde alerte d’absence n’est ajoutée. Cette interface ne déclenche ni fin de partie, ni pause, ni secours automatique, ni arrivée promise. Ouvrir Menu reste un choix du joueur avec ses règles ordinaires de pause et de sauvegarde.

## Projection et raccords

La [projection pure](../../src/ui/colonist-availability.ts) expose `readColonistAvailability(world)` et `isLocallyControllableColonist(pawn)`. Elle lit un snapshot confirmé et renvoie `available`, `arriving` ou `unavailable`. Ce dernier sépare `local`, `away` et `deaths`, triés par identité. Le parcours des propriétaires humains utilise les originaux effectivement détenus : carte, capsules initiales, reconnaissance, commerce, groupe et pertes de groupe. Les références de formation et les archives de visiteurs ou de capsules de secours ne deviennent pas une population active. Aucun stock, registre de Thing, besoin, flux PRNG ou propriété persistante n’est modifié.

Les [alertes](../../src/ui/status-alerts.ts) exposent `readAvailabilityStatusAlerts(world)`, réemployé par le [carnet](../../src/ui/first-day-guide.ts). `NotificationContext.worldTab` choisit `individual` ou `group`. `FirstDayGuideAction` accepte `target`, `tab` et `worldTab` ; [MAIN](../../src/main.ts) règle la vue avant l’ouverture de Monde ou sélectionne la cible physique avant son onglet. Les noms sauvegardés passent par `textContent`. Les lecteurs ne conservent pas une référence mutable comme témoin d’un prochain snapshot.

## Admission des originaux hors carte

Les reprises ont révélé un défaut produit dans le [Decoder](../../src/bridge/snapshots.ts), indépendamment des textes d’interface. Sur le chemin strict orbital sans planète ni registre relationnel, le garde préenregistrait les `foreignIds`, comprenant le voyageur commercial et ses objets, avant que la boucle des propriétaires originaux appelle `addId` pour ces mêmes identités. Un checkpoint valide du moteur était donc refusé par `resync` pour duplication d’IDs.

La correction ROOT réserve seulement les `postIds` du comptoir avant cette boucle ; les originaux en reconnaissance/commerce et leurs possessions sont ensuite enregistrés une fois. Les contrôles antérieurs de collision carte/hors carte et les gardes de forme, propriétaire et borne restent conservés. Aucun ID, objet ou propriétaire n’est remplacé pour rendre l’état admissible. La nouvelle reprise du corpus public après cette correction passe : **63références/66fichiers en60,758s**.

## Preuves et limites

ROOT seul exécute les contrôles ; sources, tests, publics et pilotes restent gelés pendant chaque exécution. Journaux sous `tmp/validation-runs/`, artefacts natifs sous `tmp/early-access-v337/`. Le groupe unitaire ciblé est acquis par reprises ; la suite complète n’est pas qualifiée. Gel final après tous les contrôles : **2855entrées exactes** sources/tests/publics/scripts. Le navigateur piloté et le serveur Vite possédé sur5410 sont fermés.

| Contrôle | État courant |
| --- | --- |
| Projections, alertes, carnet et régressions ciblées | **ACQUIS PAR REPRISES** — 137cas uniques/14fichiers, dont35nouveaux/2fichiers ; rouges et périmètre ci-dessous, aucune suite complète annoncée |
| Corpus public et admission du bridge | **PASS60,758s** — 63références/66fichiers après la correction du Decoder ; journal `v337-public-corpus-2026-10-13T00-53-51.423Z-12844` |
| Typage et build Pages | **PASS** — typage11,544s ; build Pages et typage final15,572s |
| Parcours natif, destinations, clics et conservation | **PASS163,438s** — six situations préparées dans une spec, six recharges exactes, WebGPU, erreurs`[]` ; six captures inspectées par ROOT |
| Critère early access « comprendre l’absence » | **ACQUIS SUR ÉTATS PRÉPARÉS** — destinations Santé/Monde/Menu par clic et clavier, continuation ordinaire×1 sans pause automatique ; campagne naturelle entière encore à qualifier |

Les cas de personnes à terre, crises, détention, propriétaires hors carte ou décès sont des états préparés pour vérifier cette lecture et ses liens. Les nouvelles scènes de reconnaissance ou commerce ne prouvent jamais une mort survenue pendant un voyage naturel. Elles ne qualifient pas une campagne entière, une reprise multi-saison, une issue Core exhaustive, la performance ou une compatibilité matérielle universelle.

Le premier passage utilisait une fixture de groupe demandant le départ des trois personnes sur trois, interdit par la règle existante. La préparation corrigée fait partir deux personnes sur trois puis prépare l’incapacité du résident après le vrai départ. La seconde reprise distingue le défaut réel d’admission ci-dessus d’un arrêt de groupe mal préparé : le pilote utilise maintenant la vraie commande `group-pause`. Les rouges restent conservés ; ces réparations de fixtures ne modifient pas les règles de départ ou les issues de campagne.

Premier ciblé : **rouge79/83 en13,938s** ; seconde reprise : **rouge31/33 en9,566s**. Groupe final élargi : **130/137 en29,560s**, avec sept rouges historiques conservés. Reprise historique : **26/28 en12,453s**, les deux rouges restants portant sur les politiques commerciales ; reprise commerciale finale : **9/9 en9,835s**. Les137cas uniques sont acquis par ces reprises, sans assimiler les passages partiels à une suite complète.

La priorité du refus de provenance et les refus de champs futurs restent contrôlés. Les corrections historiques rendent explicite l’attendu de mutation du profil de pâte nutritive217 ; la fixture184 retire seulement ses agendas futurs vides `orbital`216 et `deepResources`215 avant d’exercer son refus propre. Les politiques commerciales sont celles du contrat courant. Aucun garde produit n’est détendu pour accepter ces fixtures.

Le pilote natif acquis couvre six cas, dont un commerce réellement arrivé au comptoir et un groupe après départ2/3 avec décès clinique préparé du résident resté sur la carte. Les cas unitaires distincts utilisent un résident à terre. Les six recharges conservent exactement leurs checkpoints ; les continuations ordinaires×1 atteignent les ticks suivants sans pause automatique :

| Situation préparée | Ticks confirmés |
| --- | --- |
| Personnes à terre | 3000→3004 |
| Reconnaissance | 3019→3023 |
| Commerce au comptoir | 3787→3791 |
| Groupe après départ2/3, décès clinique du résident | 0→4 |
| Décès locaux | 3000→3004 |
| Colonie vide | 3000→3004 |

Les traces et captures sont dans `tmp/early-access-v337/native/colonist-availability-v337-3f83d-ing-clock-and-exact-reloads/`. Le décès local préparé ne prouve aucun décès hors carte survenu pendant un voyage naturel.

Moteur, rendu, schéma, calendrier, règles de voyage, réservations, propriétaires et format des sauvegardes restent conservés ; le bridge reçoit la correction d’admission décrite ci-dessus. Les [trois premières nuits V336](human-sleeping-spots-v336.md) restent une qualification distincte. La suite early access exige une [campagne plus longue](early-access-readiness.md), avec consommation, renouvellement, incidents et reprises réparties. Aucun gainFPS ni campagne naturelle entière n’est certifié.

Produit `7c18d244` commité et poussé sur main, publié une seule fois avecV336 en `f604f7ac` ;104réponsesHTTPS exactes. [Clôture de publication](../development/cloudflare-pages.md#publication-v336v337--couchages-et-disponibilité). Relance ACTIVE, poursuite autonome vers la campagne durable.
