# Coupe productive et attente V352

Le lot termine le raccord du rendement de « Couper » après les [plantes et chantiers V351](construction-plants-v351.md). Les autres corrections demandées le14octobre restent décrites dans [V348](construction-clearance-v348.md), [V349](tree-transfer-v349.md) et [V350](../development/decor-occlusion-v350.md). Le schéma 235 est conservé ; les archives publiques restent littérales.

## Comportement

Une coupe actuelle de plante récoltable tente le producteur commun avec le vrai travailleur avant de supprimer la source. Les buissons mûrs, agaves, racines médicinales, foin et arbres concernés ne perdent plus silencieusement leur produit. Les cultures qui donnaient déjà une sortie utilisent également le rendement et l'échec du travailleur. L'herbe sans produit, une plante immature ou infectée restent sans récolte ; le simple retrait gratuit par un Frame ou un sol V351 reste sans travail, XP ou RNG de récolte.

La vraie coupe donne de l'apprentissage lorsque sa source peut produire. Le dégagement pour une construction ou une replantation suit cette même éligibilité. L'extraction et la replantation du même arbre ne deviennent pas elles-mêmes des récoltes. Une coupe d'arbre historique sans espèce annonce désormais son vrai produit, le bois, dans l'événement.

Si le produit ne trouve pas de place, la source, le travail payé, l'exécutant et les autres commandes restent conservés. L'attente et sa nouvelle tentative ne refont ni coupe, ni XP, ni tirage aléatoire. Le cooldown existant de20ticks borne les nouvelles tentatives ordinaires ; une commande peut les réveiller plus tôt. L'inspection et le diagnostic expliquent le manque de place. Cette attente couvre la coupe directe et le dégagement de la destination d'un arbre replanté, en plus des ouvrages V351.

Si une vraie infection survient à cette frontière payée puis que le colon est interrompu, le compteur conserve sa durée payée et reste strictement sauvegardable. La reprise retire la plante désormais infectée sans inventer un produit ni recommencer le travail. L'inspection distingue ce retrait de l'attente de place. La garde ne change pas la durée générale des autres plantes infectées.

## Référence primaire et limites

Core1.6.4871rev590, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les extraits privés PlantWork, PlantCut et Plant sont ceux de V348/V351 ; leur provenance et la correction de lecture figurent dans tmp/bugfix-v351/cut-yield-reference.md. PlantWork tente YieldNow et le placement avant le Done de PlantCut, qui détruit la plante restante. Une lecture isolée de DestroyThing ne prouve donc pas une coupe sans produit. Aucune classe entière n'est distribuée.

Le raccord reprend le producteur existant du clone : échec humain, arrondi de base et surplus, médicaments/foin avec leur base de HP actuelle. Les HP globaux de toutes les plantes, cropYieldFactor/difficulté, DrugHarvestYield distinct, emplacement près du travailleur et XP capturé à Init restent des différences avec Core. L'éligibilité à l'apprentissage est relue au contact ; les plantes immatures gardent l'absence historique de tirage productif du clone. Les durées locales ne deviennent pas celles de Core.

Les branches brutes jusqu'au schéma234, CHOP et HARVEST restent littérales. Les migrations restent neutres : aucun produit ni remboursement rétroactif. Une partie migrée235 applique prospectivement le raccord actuel ; ses produits et RNG futurs de CUT peuvent donc changer. La frontière réutilise duration−1/remainder9999, sans nouveau champ ; une fraction historique naturellement identique peut finir au plus0.0001unité de travail local plus tôt.

Aucun rendu, LOD, bridge ou fichier public modifié. Les lecteurs restent purs et le producteur ne consomme ses RNG/IDs qu'après admission de la sortie. Aucun gainCPU/GPU/FPS mesuré ici. La revue a signalé un autre cas préexistant V349 : expiration d'un arbre porté sous saturation totale de sa sortie. Il n'est pas qualifié ou corrigé par ce lot ; audit V353 engagé avant le retour à la campagne.

## Qualification

ROOT seul, contrôles lourds séquentiels sur sources/tests/pilotes figés. Groupe205cas/9fichiers acquis par reprises, dont24nouveaux/2 : groupe initial204 rouge35,035s avec201acquis, reprise des5cas d'attente PASS10,308s, puis19cas de rendement/message PASS6,213s après la dernière correction de libellé. Les oracles calculent séparément les tirages/quantités attendus ; ils couvrent productif/immature/infecté/stérile, faible/bon rendement, refus immuable, travail réel, mêmes claims/files, interruption, full/delta et export/rejeu exact.

Typage/buildPages PASS15,161s, Vite1,89s. Corpus63références/66chemins PASS64,679s avant le dernier libellé d'événement : fichiers littéraux, migration, full/delta, un vrai tick et replay exacts, premier snapshot immuable. Seule l'omission historique propre gatherId=undefined déjà documentée est admise. Le libellé final est couvert par son travail réel et le groupe19ci-dessus ; Pages/typage de livraison PASS15,464s et documentation PASS1,044s.

ChromeWebGPU acquis par reprises : groupe initial rouge107,911s, coupe directe PASS52,9s/body52,728s et saturation PASS35,7s/body35,477s ; replantation reprise seule PASS54,832s/body50,831s. Douze recharges exactes : direct2013/2070/2080/2137/2147/2204, attente2071/2096/2110, arbre3011/3054/3208. Erreurs[] ; sept captures acquises et une rouge inspectées ROOT. Le texte d'attente est également vérifié dans le DOM. Les images ne certifient pas une égalité de pixels ou l'absence de tout retard de présentation.

La sortie bloquée est libérée par le vrai retrait d'une portion alimentaire par un second colon, via Consommer ; à2110 sa portion est encore portée, dix baies sont produites une seule fois et le total physique augmente exactement de10. Aucune ingestion n'est prétendue dans ce parcours. L'arbre replanté conserve son ID interne et son dommage, son wrapper disparaît et le vrai buisson donne10baies. Les trois scènes32² sont des préparations déclarées, pas les sauvegardes des captures humaines ni une campagne naturelle. Aucun FPS, sauvegarde humaine réparée, campagne entière, early access100% ou parité exhaustive certifiés.

## Rouges et preuves conservés

Les rapports privés sont dans tmp/validation-runs/v352-* et tmp/bugfix-v352. Les trois échecs unitaires initiaux venaient d'une même préparation : un mur vide non approvisionné ne peut pas devenir un ordre forcé. La scène corrigée déclare un vrai arbre lourd devant ce mur et conserve les assertions de réservation étrangère, sans relâcher le moteur.

Le rouge natif de replantation est àtick3000, avant tout geste : perform ne prend pas en charge replant-tree. Le pilote utilise désormais les vrais clics de sélection, le bouton Replanter et la destination, comme V349 ; seule cette scène est reprise. Rapport initial, exports/SHA et captures restent dans native-first/native-first-report.json ; reprise dans native/native-report.json. Le dernier libellé bois a été ajouté après les parcours natifs, sans autre modification de moteur ou d'UI. Gel2925 exact avant livraison ; prêt au commit/push, publication précédente7b9ccdba conservée jusqu'à la publication suivante.
