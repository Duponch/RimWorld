# V88 — échanges, arsenal et simulation

Campagne du 20 septembre 2026, **V88 validée dans le périmètre ci-dessous** sur `main`, après V87 `d38906a`. Ce document distingue tests contrôlés, continuation naturelle et mesures ; cette livraison ne clôture pas G0–G5.

## Périmètre commun

Visiteurs et passants physiques, agendas privés, inventaires et provisions séparés, négociateur au contact, monnaie et prix, panier atomique, achats déposés puis transportés, départ conservant les possessions. Fusil à verrou et couteau en plastacier disposent de profils de combat, blessures et représentations propres. Le nouveau départ Atterrissage forcé révision 3 ajoute réellement argent et armes ; la migration V87 reste neutre.

Les optimisations générales portent sur les captures de navigation animale et la validation du travail agricole. Les comparaisons CPU contre une copie V87 ont une égalité d’état complète ; la charge finale V88 ajoute des activités et ne sert pas de comparaison causale avec V87.

Références : [visiteurs](../research/visitors-reference-v88.md), [commerce](../research/trade-reference-v88.md), [armes](../research/weapons-v88.md), [performance](../research/performance-v88.md). Corpus, Core local daté et sources Internet sont confrontés ; aucune sauvegarde personnelle brute ni source propriétaire n’est publiée.

## Frontières et corrections conservées

La campagne initiale regroupe 75 contrôles dans 18 fichiers : 72 passent, trois échouent. Deux attentes étaient anciennes : provenance du nouveau départ révision 2 au lieu de 3, et absence d’âge végétal pourtant adopté en V87. Les assertions conservent la comparaison complète du terrain et des ressources, après la même adoption biologique, et ajoutent les stocks exacts V88.

Le troisième échec révèle un défaut effectif : un visiteur cherchant la sortie recevait un délai de 60 ticks alors que la sauvegarde borne ce champ à 20. Le délai commun du planificateur remplace cette valeur ; aucune attente artificielle n’est ajoutée lorsqu’une sortie est trouvée. Les quatre fichiers concernés passent ensuite leurs 18 contrôles, sans retrait de l’assertion de sauvegarde.

La relecture a aussi corrigé le transport automatique de l’argent, la création du couteau à ses 280 PV, la fiche du départ et le compteur colonial de cargaisons. Le commerce ouvert en pause reprend le temps pour le trajet puis demande la pause au contact ; fermeture et changement de sélection ne doivent pas perdre une commande pendant son acquittement.

La campagne complémentaire stockage/transport/transactions passe ses 11 contrôles dans quatre fichiers, dont trois nouveaux scénarios : argent par piles de 500, limites propres aux autres objets et conservation des anciennes capacités de réserve. Au total : **82 contrôles distincts dans 21 fichiers**, les reprises n'étant pas comptées comme de nouveaux tests.

## Interface et charge

Le parcours natif `integration/trade.spec.ts` réussit sur WebGPU matériel : contact depuis la pause, annulation, retour au contact, achat d'un fusil pour 357 argent, dépôt physique, équipement, sauvegarde et restauration exacte. La fixture fournit explicitement visiteur, argent et fusil ; elle ne prouve pas leur fréquence naturelle. La revue visuelle du premier passage a révélé une alerte « Menace armée » pour un visiteur neutre. L'alerte et le libellé d'activité ont été corrigés, puis le parcours complet et l'assertion d'absence de cette alerte passent à nouveau en 31,9 s (35,2 s avec lancement). [Résultat natif](../../artifacts/trade-ui-v88.json).

Le banc mixte suit 100 colons, 100 lièvres et deux visiteurs, avec environnement, travaux et contact commercial. Sa première préparation ne trouvait pas de poste adjacent ; la fixture choisit désormais trois places libres accessibles sans supprimer d'objet ni déplacer les autres acteurs. Cette correction de préparation précède les mesures, elle n'allège pas les règles du moteur.

CPU sur 650 ticks : p95 **89,44 ms**, pic **144,34 ms** ; encodage des snapshots p95 **14,20 ms**. Natif, exécuté séparément sur sources figées : image p95 **41,6 ms**, pic **120,9 ms**, worker p95 **92,9 ms**. Les 658 ticks en 41,542 s donnent **2,640× pour 6× demandé**. Les pipelines restent stables et les oracles métier passent ; le débit cible reste non tenu. Les comparaisons isolées des optimisations contre V87 donnent 7,63–15,03 % de temps CPU gagné selon l'ordre et la charge, avec état complet identique. Le banc final ajoute des activités et ne permet pas d'attribuer un gain par comparaison directe aux anciennes mesures. [Protocole, matériel et données](../research/performance-v88.md).

## Parcours naturel

Le préflight poursuit la vraie colonie Lisière V87 de 816 438 à 816 738 ticks, avec ses quatre habitants, ses réserves et son carnet d’environnement. Adoption des visites par commande, conservation et continuation exacte passent. Aucun visiteur ou argent n’est injecté.

Le calendrier effectivement tiré fixe la prochaine visite à 953 900 ticks, soit 22,91 jours après l’adoption. L’horizon initial de 15 jours ne peut donc pas couvrir cette visite. Son extension explicite à 30 jours conserve le tirage ; elle n’est ni un délai Core garanti ni un événement forcé. Le critère d’arrêt reste vente d’un surplus réel de revolvers, achat et rangement de médicaments, puis départ du marchand. Une maladie artificielle ne sera pas créée pour prétendre avoir utilisé les doses.

La première campagne atteint J162 sans échange : les revolvers de surplus sont encore interdits et dispersés hors foyer/réserves. Le refus commercial est correct. Reprise à J158 après ajout, par commandes ordinaires, d'une réserve d'armes et de l'autorisation du surplus ; quatre armes de remplacement et les armes portées sont conservées. La visite arrive naturellement à 953 900 et l'échange se conclut à 954 900 : **cinq revolvers contre trois médicaments et six argent**, sans crédit ni abandon d'une somme due.

Le marchand repart à 956 925. Le rangement médical ne se termine pas : les 24 places des réserves générales sont toutes occupées par d'autres matières. Une nouvelle case dédiée est créée au checkpoint du départ ; aucun objet n'est déplacé par le diagnostic. La première observation du transport conservait seulement l'identifiant de la pile achetée : le prélèvement de matière en crée un successeur porté. L'observateur suit désormais le lien réel `sourcePileId → carryPileId`, sans modifier les transferts ni enlever l'assertion de rangement.

La reprise finale réussit à **956 959 ticks, J159,493**, soit **23,420 jours supplémentaires** depuis la colonie V87. Quatre habitants survivent, 192 repas sont produits, 3 863 unités alimentaires récoltées et trois médicaments rangés ; trois passants puis deux visiteurs sont sortis physiquement. Conservation nourriture/composants/argent, validation stricte et continuation identique sur trente ticks sont vérifiées aux jours et transitions observés. Le checkpoint final propre à Lisière est publié pour les prochaines continuations ; aucune sauvegarde personnelle RimWorld n'est utilisée comme fixture.

Les interruptions diagnostiques à J162 et les reprises J158 puis 956 925 restent distinctes : il ne s'agit pas d'un parcours final rejoué intégralement après chaque correction du joueur. Les 3,918 s dans le rapport final mesurent uniquement la dernière reprise de 34 ticks et ses oracles, **pas** la campagne de 23 jours. [Rapport et journal des commandes](../../artifacts/trade-colony-v88.json), [provenance et empreinte du checkpoint publié](../../artifacts/trade-colony-checkpoint-v88.json), [monde Lisière final](../../tests/fixtures/colony-v88.json.gz).

## État de livraison

Typage et build final passent. Le premier contrôle de présentation générale (minage puis coupe, trois colons, changements 1×/6×/1×/3×) révèle trois images où le curseur attend les données dans la phase coupe ; aucun saut, occupation solide ni erreur console, et délais de commande sous 100 ms. L'assertion de progression échoue bien et reste inchangée. [Première mesure conservée](../../artifacts/presentation-v88-first.json).

L'épisode représente 33,2 ms entre les premières/dernières images arrêtées à 6× : le curseur a rejoint le dernier tick confirmé et n'extrapole pas au-delà. La preuve initiale ne permet pas d'attribuer l'origine au réveil du worker, au transport ou à l'ordonnancement. La [reprise instrumentée complète](../../artifacts/presentation-v88-trace.json), sans changement de code entre les deux essais, passe minage et coupe : zéro image arrêtée, saut ou occupation solide ; délais visibles maximaux 52,2 et 43,9 ms. Images p95 12,6/12,5 ms, maxima 41,6/70,8 ms. Cette reprise ne supprime pas le premier échec ni ne garantit l'absence de toute saccade.

Contrôle documentaire final : 325 documents, 3 538 liens locaux, 25 identifiants de domaine et cinq familles de validation ; les trois sources originales restent identiques. Build : avertissement connu de taille de bundle supérieur à 500 kB conservé. Aucun nouveau jalon global n'est déclaré terminé.

Monde/caravanes, diplomatie générale, catalogue commercial complet, élevage et fabrication de l’arsenal restent absents ou partiels. G0 en consolidation ; G1/G2/G3 partiels ; G4 progresse ; G5 absent.
