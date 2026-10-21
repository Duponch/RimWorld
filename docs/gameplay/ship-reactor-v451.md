# V451 — Réacteur stellaire

**V451 publiée, schéma 275.** Première chaîne de l’ensemble 5 : recherches, construction payée, activation confirmée, démarrage persistant et signal d’attaques par carte. Produit `8e0e2ee6`, déploiement `7552f915`, qualification ciblée et native acquise. Le lancement, les autres pièces et la victoire restent ouverts.

## Référence et décisions

Relevé primaire du 21 octobre 2026 : RimWorld **Core 1.6.4871 rev590**, installation `E:/Steam/steamapps/common/RimWorld/`. SHA256 d’`Assembly-CSharp.dll` : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. XML des recherches spatiales, de Ship_Reactor et BuildingBase ; lectures ciblées de CompHibernatable, ShipUtility, MapParent, ThreatsGenerator, IncidentCycleUtility et des composants électriques. Compléments : géométrie native, Beauty et traitement des IEM. Aucun code ou asset propriétaire n’est intégré au produit.

Recherche Internet officielle : [Ludeon, Beta 19](https://ludeon.com/blog/2018/08/rimworld-beta-19-released/) annonçait historiquement quinze jours et des attaques ; [annonce du 12 octobre 2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue la principale 1.6 de la bêta instable 1.7. Ces textes ne remplacent pas les constantes de l’installation identifiée. Les relevés privés `tmp/ship-reactor-v451/reference.md`, `construction-audit.md` et `integration-review.md` conservent les détails.

Le [corpus humain](../research/reference-adoption.md) conserve ses originaux. **CAT-052** couvre la fin de partie ; son statut ne prouve pas une acquisition locale. Rattachements : chantier SYS/TEST-056, logistique et propriétaires 051–054, retrait 058, énergie 127, signaux et échéances 136/137, incidents existants. Le chapitre 28 contient aussi des éléments Odyssey ; ils ne deviennent pas des exigences Core par cette seule présence.

## Rechercher et construire

**Construction de vaisseau : 4 000 points après Fabrication avancée**, puis **Réacteur stellaire : 6 000 points**. Chaque recherche utilise le vrai bureau avancé et son multi-analyseur relié, avec les règles de courant et de travail déjà livrées. La catégorie Vaisseau suit la recherche confirmée ; un projet sélectionné ou un bouton ne créditent pas les points.

Le chantier consomme **350 acier, 280 plastacier, 70 uranium et 8 composants avancés**. Construction 8, travail **65 000 Core / 6 500 local**, 500 PV, inflammabilité 0. Les quatre intrants sont transportés puis consommés par le vrai cadre. L’acier est un ingrédient fixe, sans qualité ou bonus de Stuff.

Emprise native **6 × 7**, rotation possible, orientation initiale Est. Le rectangle est centré sur la position conservée et garde le décalage natif de sa dimension paire. Les 42 cases demandent le support Heavy, sont découvertes et sans toit à la pose ainsi qu’à l’achèvement. Elles deviennent impassables, opaques aux tirs et à la lumière, bloquent le vent et participent aux partitions de pièces et aux enclos. Beauté 0. Le réacteur est fixe et ne fournit aucun paquet transportable.

Le composant électrique fournit **1 000 W dès la construction** et transmet le courant sur l’emprise. Les consommateurs conservent leur démarrage progressif normal. Aucun combustible, interrupteur ou panne mécanique n’est ajouté. Le réacteur ne possède pas de composant d’étourdissement : les IEM ne lui coupent pas cette production. La mise en service stellaire ne conditionne pas ces 1 000 W.

## Confirmer le démarrage et conserver son échéance

L’inspection propose une confirmation qui annonce le risque. Elle capture la liste triée des réacteurs hibernants reliés cardinalement ; l’autorité revalide cette même liste. Un réacteur déjà démarré peut relier des hibernants nouveaux sans que sa propre date recommence. Dans ce lot, les seuls ShipPart constructibles sont les réacteurs ; les futures autres pièces devront prolonger ce réseau commun.

Le bouton natif ne demande ni colon, contact, tâche, courant, compétence, paiement supplémentaire, caisson occupé ou vaisseau complet. Annuler ne modifie rien. Confirmer active seulement les mêmes hibernants ; aucun arrêt ou redémarrage gratuit n’est proposé ensuite.

**Le runtime natif vaut 14 jours**, malgré les textes de recherche et d’avertissement annonçant environ 15 jours. L’échéance nominale ajoute 840 000 Core, avec conversion et addition Float32 puis arrondi au pair. La fin exige **Core courant strictement supérieur à l’échéance** ; l’égalité reste en démarrage. Le produit constate la première frontière physique de 10 Core qui satisfait cette condition. Une inspection ou un chargement n’avance pas cette horloge.

Les dates absolues restent dans la même structure et survivent à la recharge et au changement de carte affichée. Après la transition opérationnelle, le produit conserve les dates comme histoire vérifiable, alors que le Core efface sa date interne de fin. Le débordement de la plage int32 native est refusé de façon conservatrice ; son comportement hors plage n’est pas présenté comme vérifié. Une notification de fin est produite par la transition réelle.

## Signal et attaques indépendantes

Le signal appartient à la **vraie carte**, avec au moins un réacteur en démarrage. Plusieurs réacteurs ne multiplient pas les calendriers. Les cartes encore présentes sont simulées même lorsqu’une autre carte est affichée. Les camps et cartes temporaires gardent leurs vrais propriétaires ; aucun faux camp n’est utilisé pour admettre un raid de colonie.

L’agenda suit la génération de la carte, sans être remis à zéro par l’activation. La référence utilise des occasions aux frontières de 1 000 Core : fenêtre active d’un jour, repos d’un demi-jour, plage de 1 à 2 occurrences pondérée par la difficulté, espacement de 0,04 jour arrondi à deux intervalles. La courbe de fréquence primaire est conservée. Le contexte de difficulté actuel garde l’adaptation Récit d’aventure, facteur de menace 0,6 ; le réglage exhaustif des difficultés n’est pas livré par ce lot.

Les points valent au moins 500, à partir des lecteurs actuels de richesse, population, santé et adaptation ; ils ne sont pas plafonnés à 500. Les fenêtres et possibilités d’échec suivent la référence. Le hasard, les factions disponibles, PNJ, équipements et stratégies utilisent les producteurs originaux du projet, sans prétendre reproduire les tirages internes du natif. Une occurrence ne garantit pas une attaque : absence de faction ou entrée impossible peuvent la consommer sans naissance.

Les groupes supplémentaires possèdent leurs propres personnes, équipements, identifiants et provenance. Ils peuvent coexister avec un raid engagé, sans échange temporaire de l’emplacement du raid ordinaire. Le calendrier et le PRNG ordinaires restent inchangés sur une carte sans signal. La pression spéciale masque les occasions ordinaires de grande menace pendant le démarrage, avec consommation de leurs dates ; elle ne suspend pas tous les incidents.

Le propriétaire prospectif du signal apparaît au premier vrai pas après activation ; son état actif est rafraîchi après les transitions et le combat, avant les incidents. Une commande en pause ne simule pas un pas supplémentaire. La fin ou la disparition du dernier réacteur retire cette pression au pas suivant, **sans effacer les adversaires déjà arrivés**. Leur provenance historique reste valide après la perte du bâtiment.

## Retraits, sauvegardes et coûts

La déconstruction rend 175 acier, 140 plastacier, 35 uranium et 4 composants avancés par le chemin physique ordinaire. Les pertes correspondantes sont comptées, dont le nouveau scalaire prospectif `lostPlasteel275`. Le retrait fatal utilise les leavings génériques et leur arrondi ; aucune explosion nucléaire particulière n’est inventée. Les identités, dépôts et courants sont réconciliés par les autorités existantes.

L’ancien schéma 274 est validé strictement avant une migration par numéro seul vers 275 : aucune recherche, structure, activation, attaque, matière, puissance, durée ou tirage n’est offert. Les familles de capacités restent fermées ; 276 est refusé. Les nouvelles propriétés sont interdites avant 275 même lorsqu’elles sont présentes avec la valeur `undefined`, y compris dans une carte inactive ou un paquet retenu.

RAW et Decoder public vérifient les vrais propriétaires et les dates ; les deltas ne peuvent effacer une activation conservée, déplacer sa date ou revenir de l’état opérationnel au démarrage. Le Resident reste le lecteur léger de forme et de références du producteur SIM fixe, avec la barrière historique commune ; il ne remplace pas le Decoder métier complet.

Un seul passage des structures au pas physique suit les échéances et fournit le booléen du signal. L’agenda ne parcourt ni terrain ni population par image ; son travail de disposition est borné aux frontières utiles. Le modèle original low poly emploie le lot opaque existant. Sa signature capture seulement les phases, sans reconstruire les maillages à chaque évolution de l’heure. Aucun gain FPS global n’est déduit de cette conception.

## Qualification ciblée

**50 cas distincts acquis par reprises, dans treize fichiers ; un ancien rouge conservé.** Les reprises ne sont pas additionnées comme de nouveaux cas et les cas exclus par un filtre ne sont pas comptés. Les journaux ROOT restent sous `tmp/validation-runs/` :

| Contrôle | Résultat et portée |
| --- | --- |
| `v451-construction-lifecycle` | 17 cas initiaux acquis, 28,372 s ; construction, activation et familles fermées. |
| `v451-targeted` | 43/48 acquis initialement, 80,270 s. Les cinq échecs ont été conservés et diagnostiqués avant reprise. |
| `v451-four-reprises` | 4 des 5 cas sélectionnés acquis, 63,153 s : Float32 de fréquence corrigé, vraie migration V450 et deux oracles historiques corrigés. Le dernier échec a révélé le propriétaire local absent de la liste fermée des cartes ; ce raccord produit a été corrigé. |
| `v451-physical-births` | Le vrai chantier moteur passe en 37,799 s : quatre matières transportées, cadre travaillé, achèvement, courant, activation, retrait physique et recharges. Le filtre de cette exécution excluait les deux raids ; aucune naissance n’en est déduite. |
| `v451-human-mech-snow-reprise` | Deux scénarios complets acquis, 138,369 s : factions réelles, naissance, phase de combat, pertes, attaque mécanique, retraite humaine et biens conservés, perte du réacteur, corps et continuations RAW/public. Les deux refus de fixture précédents restent conservés ; les vrais constructeurs géographiques requis ont remplacé la préparation incomplète. |
| `v451-pressure-continuity-final` | 5/5 acquis, 97,340 s : les deux raids complets repris depuis la même base validée et les trois cas de transport, après correction de continuité. Un delta ne peut plus supprimer ou réinitialiser le calendrier adopté ; le retrait conserve légitimement son état inactif. |
| `v451-types-final` | Typage acquis, 23,181 s. Les premiers refus de typage d’intégration restent dans leurs journaux. |

Le rouge ancien `raid-spawn-v183`, sortie d’un éclaireur hors carte, échoue au même point du domaine alcool/propriétaire sur le témoin exact `4065ff1d6832d112a672a6828372d09d9c43a813`. Test ancien identique, SHA256 `9e2a91acbe774d40f9dcb0851389651397ebc36b8698a3d25c63c987732bc7e7` ; `v451-raid-baseline`, 28,849 s. Il n’est ni effacé ni attribué au réacteur.

Le vrai chantier de contrôle part d’un atelier32², d’un constructeur niveau8, de connaissances et de stocks finis déclarés ; aucun réacteur ni progression de cadre n’est préparé. Les exports privés `native-paid-frame.json` et `constructed.json` proviennent du même travail réellement avancé. Les deux scénarios de pression réutilisent seulement la géographie immuable du vrai camp V450 identifié, puis les vrais producteurs de factions, personnes et carte ; leur date de45jours, sol dégagé et réacteur déjà possédé sont une préparation déclarée. La même base RAW validée avant toute naissance pèse5 990 018octets, SHA256 `200ad231395a1a50ac12fd3356777e9ae7371792a8d0df688a34b025105ca6ab`. Aucune graine de monde ou tentative réelle n’est relancée pour effacer une issue défavorable.

La migration du vrai don V450 conserve le monde entier à l’exception du numéro de schéma, avec Decoder et Resident concordants. Source : `given.json` du pilote V450, SHA256 `a5acc56aefa61a98e68c469e9076f8155b47359b369710fc46633787c4c72250`. Les treize fichiers couvrent également géométrie dans quatre rotations, support/toit, pièces/enclos/vent, énergie, recherche, inspection et signatures de présentation.

## Parcours joueur et présentation

ROOT, `v451-native-ui`, **135,774 s** dont corps134,829 s, Chrome155.0.8059.85, backend réellement relevé **WebGPU**. Sources gelées :2 144chemins identiques avant et après. Pilote et sorties privés sous `tmp/ship-reactor-v451/native-ui/2026-10-21T21-55-10-451Z/`.

Le cadre réellement payé reprend par les vrais boutons de vitesse : tick4183→4195, même chantier205 et constructeur168, progression1→13, quatre matières toujours intégralement déposées. Le réacteur284 réellement achevé par le scénario moteur est importé entier exactement, montré dans la catégorie Vaisseau puis inspecté avec son modèle original et ses1 000W. Annuler le vrai dialogue conserve le monde entier. Confirmer émet exactement une commande avec ce même ID ; à la pause12200, seul le composant du réacteur change, début122000Core/échéance962000Core.

Quinze vrais pas à×1 donnent le premier propriétaire de pression au122010Core, sans déplacement des dates du réacteur. L’export12215 est rechargé exactement ; rendu, inspection et60images en pause ne changent pas le monde. Ce court parcours ne contient aucune occasion ni attaque : les deux naissances complètes sont qualifiées séparément par les scénarios ci-dessus. Quatre captures — cadre, modèle/inspection, confirmation et reprise — ont été inspectées par ROOT. Erreurs[], notifications de mise en page[], simulation et rendu non arrêtés.

Chrome est lancé avec `--mute-audio`. Effets et musique sont désactivés et leurs deux volumes à0 avant la première page, vérifiés dans les vraies options avant chaque reprise et conservés après recharge. Les préférences audio du produit publié ne sont pas imposées aux joueurs.

La présentation commune est acquise par reprise : `v451-presentation` atteint sa limite d’enveloppe à180,144 s, après la phase mine45 s conservée et ses assertions acquises ; la phase chop seule est reprise dans `v451-presentation-chop-reprise`, **100,722 s**, sans rejouer le minage. Même source gelée, Chrome/WebGPU muet, camp250² et vitesses1→6/1/3. Chaque phase conserve0saut brut,0excès continu de déplacement,0occupation solide,0privation de présentation et erreurs[]. Intervalles maximaux50,1 ms au minage et58,4 ms à l’abattage : aucun gain FPS ou seuil général ne s’en déduit. Le dépassement de l’enveloppe et les deux rapports restent conservés.

Les fixtures déclarent leurs préparations ; les transports, le travail, les commandes, combats et reprises effectivement joués en restent distincts. Aucun démarrage défendu pendant quatorze jours naturels ni victoire de campagne n’est déduit d’un checkpoint proche d’une échéance. Les six ensembles et la qualification des campagnes durables restent ouverts.

## Publication et suite

Le22octobre2026, heure locale, paquet Pages du HEAD produit exact `8e0e2ee6b8be640fe5352226693ce9905880084c` : `v451-pages-build` acquis en7,927 s. Avertissement de chunks supérieurs à500Ko conservé, sans annonce de gain de performance. `v451-package` acquis en3,079 s :552fichiers/152 397 159octets, fichiers statiques et CSS identiques au paquet V450, aucun asset propriétaire ajouté et outils privés de test absents.

`v451-pages-deploy` acquis en17,086 s ; [déploiement7552f915](https://7552f915.elsewhere-cq7.pages.dev/) et [adresse stable](https://elsewhere-cq7.pages.dev/). `v451-published-https` acquis en12,681 s :20réponses ciblées, octets et MIME exacts sur les deux adresses. Les68fiches et71chemins publics de sauvegarde restent identiques ; paquet, HEAD et sauvegardes n’ont pas changé pendant la vérification. Reçus privés : `tmp/elsewhere-pages/v451-package-Yzf6jy/` et `v451-http-NGvdQR/`. Ces contrôles HTTPS établissent la disponibilité du paquet, sans remplacer les parcours de jeu ni mesurer les FPS.

La documentation passe sur1 082documents/10 074liens avant la publication ; six en-têtes courants au schéma275 et trois sources humaines originales identiques. La mise à jour documentaire de publication fait ensuite l’objet du même contrôle. Les références personnelles non suivies `references_UI/`, les sauvegardes, historiques et démonstrations restent préservés.

La suite préparée de l’ensemble5 relie **poutres structurelles et moteurs Johnson–Tanaka**, recherche et chantiers payés, réseau physique et rapport des pièces manquantes. Les propositions privées ne sont pas encore intégrées ni qualifiées. Caissons spatiaux, ordinateur/cœur d’IA, capteurs, embarquement et lancement auront leurs propres boucles complètes ; aucun contenu ou progrès n’est offert pour les contourner. Les autres ensembles restent ouverts.
