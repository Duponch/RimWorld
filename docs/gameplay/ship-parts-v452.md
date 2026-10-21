# V452 — Poutres et moteurs de vaisseau

**V452 publiée, schéma276.** Poursuite de l’ensemble5 après le [réacteur V451](ship-reactor-v451.md) publié. Poutre structurelle, moteur Johnson–Tanaka, recherche et chantiers payés, réseau physique et rapport des pièces manquantes. Produit `6ac38d08`, déploiement `dd91c337`,20réponses HTTPS ciblées exactes ; sauvegardes publiques inchangées. Le lancement et la victoire restent ouverts.

## Référence et périmètre

Relevés primaires des21–22octobre2026 : Core **1.6.4871 rev590**, XML Buildings_Ship, Buildings_Base et ResearchProjects_5_Ship ; lectures ciblées de Verse.GenAdj, ThingDef, BuildableDef et RimWorld.ShipUtility. Assemblage identifié par le même SHA256 que V451 : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Aucun code ou asset propriétaire n’est intégré au produit. Les propositions privées et faits dérivés sont conservés sous `tmp/ship-reactor-v452/` et dans `tmp/ship-reactor-v451/next-victory.md`.

Recherche Internet officielle renouvelée le22octobre : [Ludeon, annonce Waylith/1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue toujours la principale1.6 de la bêta instable1.7 ; ce texte ne fournit pas les recettes de ces pièces. Le [billet Beta19](https://ludeon.com/blog/2018/08/rimworld-beta-19-released/) reste un contexte historique pour la fin spatiale, sans remplacer les XML/IL identifiés. Les constantes et emprises viennent de ces sources primaires locales, pas d’une extrapolation de wiki.

Le [corpus humain](../research/reference-adoption.md) garde **CAT-052**, chantier SYS/TEST-056, logistique051–054, retrait058, énergie127 et signaux136/137 comme rattachements. Aucun identifiant global n’est clos. Gravship, orbite et voyage Odyssey ne sont pas ajoutés par ce lot Core.

## Rechercher, payer et construire

| Pièce | Recherche | Emprise native / orientation initiale | Matières fixes | Travail local / Core ; compétence |
| --- | --- | --- | --- | --- |
| Poutre structurelle | Construction de vaisseau,4 000points après Fabrication avancée, déjà livré V451 |2×6, Nord0 ; rotation possible |200acier,40plastacier,3composants,1composant avancé |800 /8 000 ; Construction5 |
| Moteur Johnson–Tanaka | Nouveau projet6 000points après Construction de vaisseau |3×4, Nord0 ; rotation possible |260acier,140plastacier,70uranium,6avancés |5 000 /50 000 ; Construction8 |

La recherche moteur emploie le vrai bureau avancé et son multi-analyseur relié/alimenté. Réacteur stellaire n’est pas son prérequis ; la construction de vaisseau est son parent réel. Aucun point n’est initialisé par la sélection ou la migration. La disponibilité des deux outils suit les progrès confirmés.

Chaque pièce possède **400PV**, inflammabilité0, beauté0 et support Heavy. Ses douze cases doivent être découvertes, sans toit et libres à la désignation puis au dernier travail. Rectangle orienté autour de la position native, décalage de dimension paire conservé. Plans, cadres, contacts extérieurs, édifices et retrait utilisent ces mêmes cases. La taille graphique2×8 de la poutre ne modifie pas son emprise2×6.

Matières transportées physiquement, mêmes piles déposées et consommées à la finition ; pas de Stuff, qualité ou meuble minifié. Les édifices sont impassables, remplissage1, bloquent lumière et vent et participent aux pièces/enclos. Le moteur n’ajoute ni combustible périodique, opérateur, dégagement d’échappement, hibernation, IEM, interrupteur ou panne mécanique non établis par la référence.

Poutre et moteur transmettent le courant sans produire ou consommer des watts. L’adaptateur du réseau local conserve `power:{on:false,parentId:null}`, comme ses conducteurs passifs ; ce champ ne signifie pas un moteur à allumer. Le réacteur conserve sa production immédiate de1 000W et son orientation Est1 historique.

## Lire le même vaisseau et démarrer ses réacteurs

Le graphe se déduit uniquement des **pièces réellement achevées sur la carte** : réacteurs, poutres et moteurs se relient par les périmètres cardinaux de leurs emprises. Ni angle diagonal, conduit électrique, plan, meuble emballé ou autre carte ne sert de pont. L’index reste local à une commande ou à l’inspection confirmée ; aucun propriétaire réseau n’est sauvegardé et aucun graphe n’est reconstruit par image ou pas physique.

La lecture compte une poutre, trois moteurs et un réacteur requis, puis ordinateur, capteurs et caisson spatial. Ces trois dernières pièces restent absentes et sont affichées comme manquantes ; aucun bouton de lancement ni faux passager ne résulte du comptage. L’inspection affiche aussi les réacteurs opérationnels. Un caisson réellement occupé restera nécessaire au futur départ ; le caisson de colonie V447 ne devient pas spatial.

Le démarrage V451 parcourt désormais les vrais ponts. Les réacteurs Starting/Running restent traversables ; seuls les hibernants confirmés reçoivent leur état. Mêmes IDs, mêmes dates, même durée native et même signal par carte. Le plan interne scelle les véritables pièces et leurs objets imbriqués : déplacer ou remplacer un pont, même à valeur égale, périme cette transaction. Une coupure physique scinde les lectures et prochains démarrages sans déplacer une échéance existante ni effacer un adversaire né.

## Retrait et conservation

La déconstruction ordinaire restitue la moitié de chaque ingrédient, avec les arrondis aléatoires existants pour les nombres impairs ; destruction générique au quart. Poutre :100acier,20plastacier,1ou2composants,0ou1avancé ; moteur :130acier,70plastacier,35uranium,3avancés. Chaque retour et sa perte totalisent le coût réellement engagé. La place de dépôt, les IDs, les compteurs et le flux aléatoire sont prévus avant toute mutation ; un refus ne consomme rien.

Les pertes réutilisent `lostSteel`, `lostComponents`, `lostUranium`, `lostAdvancedComponents271` et `lostPlasteel275`, prospectivement pour les deux nouveaux kinds sous276. Aucun nouveau compteur ou remboursement rétroactif. Les anciens retraits conservent leurs contrats.

**Migration275 strictement validée puis numéro seul vers276.** Les réacteurs, recherches, pressions, groupes actifs et historiques275 continuent sous276 sans nouveaux objets, points, temps, réseau, puissance ou tirage. Les nouveaux kinds/projet sont interdits avant276, y compris marqueurs présents faux/undefined et cartes inactives, avant migration ou adoption publique.277 est refusé. RAW/Decoder vérifient le propriétaire complet ; Resident conserve sa barrière historique légère et ne remplace pas le Decoder métier.

Les deux modèles originaux low poly,18et26boîtes opaques, utilisent le lot de mobilier existant ; aucun batch, lumière ou champ d’animation par bâtiment ajouté. Les signatures existantes kind/orientation/power suffisent. L’inspection garde seulement l’index de son dernier tableau de structures confirmé et le remplace quand ce tableau change. Aucun gain FPS global n’est déduit de cette conception.

## Qualification acquise et limites

**35 nouveaux cas acquis, huit fichiers**, première passe `v452-targeted`,63,054 s. Géométrie7, recherche3, présentation6, physique4, retraits5, sauvegarde5, réseau/transactions4 et chantier moteur1. Les trois cas conditionnels du transport ont été exécutés ici, leur vraie source V451 étant présente ; aucun cas exclu n’est compté. Le premier typage d’intégration est conservé rouge24,105 s : deux libellés d’ordres manquants et un mauvais nom de priorité dans un test, corrigés avant cette passe.

Le scénario payé repart du **monde entier du réacteur V451 réellement acquis au12200**, SHA256 `2193119d8983fb32c823fe1246900a68e98fec92f5d1f68436c22275dbebe708`. Copie indépendante exacte dans `tests/fixtures/ship-reactor-v451-earned.json`, provenance voisine. Le réacteur284, Ada168, lampe185, repas et histoire sont conservés. Seuls la connaissance du moteur et les nouveaux stocks finis sont préparés et déclarés :980acier,460plastacier,210uranium,3composants,19avancés. Aucun plan, pièce, transport, progression, activation ou victoire n’est offert.

Les quatre désignations sont jouées. Les vrais trajets et contacts effectuent toutes les livraisons et tout le travail ; premier travail de la poutre311 au23107, un moteur déjà achevé dans l’ordre naturel du service. L’ensemble atteint46030 avec une poutre et trois moteurs, sans matière de recette résiduelle. Replay entier depuis le cadre exact, checkpoint/delta publics et recharges RAW concordent. La construction utilise le planning de travail préparé hérité du contrôle V451 ; cette durée de chantier ne qualifie pas une campagne ordinaire autonome.

Les conséquences de ce planning sont conservées : crise de destruction d’Ada au43977, effondrement de fatigue et retour au calme au44547, repas au45307. Les dégâts effectivement infligés au réacteur, à la poutre, au premier moteur, au lit et à la lampe restent présents dans le monde46030. Ni remise à neuf, annulation d’histoire ou tirage favorable ne remplace ces conséquences ; cette boucle de chantier ne prouve pas un équilibre de campagne autonome.

La même poutre est ensuite réellement déconstruite après activation du réacteur. Un moteur devient isolé ; deux restent physiquement reliés par leurs propres arêtes. Dates, signal, bilan des matières et pertes restent conservés. Sorties acquises sous `tmp/ship-reactor-v452/` : `native-paid-frame.json`, `assembled.json`, `bridge-removed.json` et leurs métadonnées utiles.

**28 voisins V451 acquis**, cinq fichiers,109,167 s : deux parcours d’attaques complets humains/mécanoïdes, douze cas de cycle du réacteur, trois de transport, cinq de menaces et six de présentation. Reprise depuis le vrai témoin275, validé puis migré par numéro seul ; son fichier original reste identique. Le lot compte donc **63 cas distincts acquis**. Le typage repris passe en23,680 s, puis en22,558 s après la correction d’affichage décrite ci-dessous.

**Parcours Chrome155/WebGPU natif muet acquis**,128,764 s (corps127,842 s). Le cadre payé reprend réellement du23107 au23119, progression1→12, sans offrir les matières. Import entier de l’assemblage exact, inspection des trois outils et des modèles originaux, comptes1poutre/3moteurs/1réacteur puis zéro pour les trois pièces futures. La déconstruction par l’interface retire vraiment la poutre445, du46030 au46196 en4,504 s d’attente ; elle restitue les ingrédients prévus, isole le premier moteur et laisse deux moteurs au réacteur. Reload RAW et soixante images en pause conservent le monde entier. Sept notifications `ResizeObserver loop completed with undelivered notifications` sont conservées ; aucune autre erreur observée dans ce parcours. Captures et rapport sous `tmp/ship-reactor-v452/native-ui/2026-10-21T22-31-33-250Z/` ; gel de ses2151sources conservé séparément avant correction du libellé.

La revue visuelle ROOT a repéré « Non raccordée · Demande0W » sur les deux transmetteurs passifs pourtant reliés. Une branche d’inspection dédiée affiche désormais « Transmission électrique passive · aucune consommation propre », sans changer la physique ni la lecture du réseau. **Reprise d’inspection seule acquise**,37,992 s (corps37,056 s) : mêmes poutre et moteur, réseau réel1 000Wproduits/30Wutilisés/30Wdemandés, comptes inchangés ; import puis monde entier après soixante images en pause strictement égaux au46030. Deux notifications de même type conservées, aucune autre erreur observée. Son rapport distinct est sous `tmp/ship-reactor-v452/native-power-label-reprise/2026-10-21T22-39-10-576Z/` ; le travail et le retrait déjà acquis n’ont pas été rejoués. Chrome lancé muet et effets/musique désactivés, volumes0, avant la première page dans les deux contrôles.

**Présentation commune acquise en deux phases successives**,45 s observées par action sous Chrome/WebGPU1440×1000, départ à×1 et changements×6/×1/×3 toutes les deux secondes. Minage95,498 s et abattage96,155 s, sans rejeu d’une phase déjà acquise. Zéro saut, excès de trajet continu, occupation de roche, rupture de présentation, erreur ou requête échouée dans ces deux relevés. Effets et musique désactivés avant la première page, navigateur muet.

| Phase | Intervalles image p50 / p95 / p99 / max | Plus longue réponse visible aux22changements de vitesse |
| --- | --- | --- |
| Minage |4,2 /8,3 /12,5 /54,1 ms |50,9 ms |
| Abattage |4,2 /8,4 /12,8 /58,3 ms |47,2 ms |

Rapports sous `tmp/test-runs/v452-presentation-mine-2026-10-21T22-40-08.505Z-21820/` et `tmp/test-runs/v452-presentation-chop-2026-10-21T22-42-10.380Z-3604/`. Ces fenêtres vérifient les continuités et commandes ; ce ne sont pas une comparaison FPS avant/après ni une longue campagne. Les maxima sont conservés. Les2151sources servies sont strictement égales au gel final après ces contrôles ; seul le serveur de contrôle5173 est arrêté, avec identité/date vérifiées.

Le contrôle de l’index avant commit a détecté quatre lignes vides finales dans les nouveaux helpers. Elles sont retirées après les contrôles natifs, sans autre modification de leurs textes ; les deux gels précédents sont conservés et le gel de publication est actualisé. Aucun comportement n’est changé par cette normalisation de fin de fichier.

## Publication et suite

Produit enregistré : **`6ac38d08100275803085ef19e7cdf9902f3f7461`**,112fichiers,1 441ajouts/217retraits. Construction Pages de ce HEAD acquise en6,608 s, contrôle du paquet en2,972 s, déploiement en15,062 s. Les avertissements du build sur les gros chunks et le temps des plugins restent visibles ; celui de Wrangler sur le dossier de travail provient des références humaines non suivies, exclues du paquet. Aucun indicateur artificiel de dossier propre n’est ajouté.

**Déploiement `dd91c337`**,22octobre2026 local : [production](https://elsewhere-cq7.pages.dev/) et [déploiement identifié](https://dd91c337.elsewhere-cq7.pages.dev/). Contrôle HTTPS acquis en12,656 s : vingt réponses ciblées, dix chemins sur chaque origine, statuts, MIME et octets exacts par rapport au paquet local. Cette vérification atteste sa disponibilité ; elle ne constitue pas un nouveau parcours de gameplay ou une mesure de performances sur la production.

Paquet de552fichiers/152 440 030octets, **68fiches et71chemins de sauvegarde conservés**. Tous les fichiers statiques et la feuille de style restent strictement identiques au paquet V451 ; seuls l’entrée et ses JavaScript/Workers compilés changent. Les Aulnes et les archives publiques ne sont pas remplacées. Sources, références humaines, pilotes et routes QA privées absents du paquet ; les2151sources servies concordent toujours avec le gel de publication.

Aucun démarrage défendu quatorze jours naturels, embarquement, lancement, victoire ou clôture des six ensembles n’est annoncé. La suite proposée de l’ensemble5 est le caisson spatial distinct du caisson de colonie, puis ordinateur/cœur d’IA, capteurs et lancement avec les vrais partants ; aucune de ces pièces futures n’est livrée par un simple rapport.
