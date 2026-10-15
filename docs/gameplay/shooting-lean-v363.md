# Origine physique des tirs et défense V363

Les tirs humains qui utilisent une ligne de débordement partent désormais du corps décalé d'un demi-pas vers cette ligne, capturée au début de la visée. Le défaut a été révélé pendant une vraie défense. Le correctif ne garantit aucun impact : le raid de cette campagne reste actif et l'essai conserve en rouge un mur menacé de brèche.

## Référence primaire et adaptation

Installation locale relue : Core 1.6.4871 rev590, Assembly-CSharp.dll SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les extractions ciblées privées se trouvent dans `tmp/early-access-defense/lean-audit/`. Aucun code propriétaire n'est intégré au produit.

Le Core capture Source−Position au début du warmup dans PawnLeaner. Son DrawPos ajoute la moitié de cet offset multipliée par une progression visuelle ; Launch utilise DrawPos, distinct de la cellule Source utilisée au spawn. Notre ancien émetteur utilisait toujours le centre du corps, même si sa ligne de tir avait trouvé un débordement. La source physique manquait donc dans le moteur du clone.

Adaptation déterministe bornée : les trois warmups actuels de 18/102/210 ticks Core dépassent la saturation nominale de 14 mises à jour du lean. Le moteur capture une seule fois l'offset cardinal et émet depuis le corps +0,5×offset. Il n'introduit pas de tweener, jitter ou nouvelle animation par frame ; il ne prétend pas reproduire toutes les particularités temporelles du renderer Core. Toute arme future à visée plus courte devra revoir ce contrat. Les machines fixes restent inchangées.

Le décalage capturé ne se recalcule pas depuis une nouvelle ligne lorsque la cible bouge. Portée avant lean, probabilités, couvert, dégâts, ordre des tirages d'émission et règles d'interception restent ceux existants. Les collisions peuvent légitimement diverger ensuite et entraîner d'autres tirages : aucune égalité de toute la suite RNG n'est annoncée. L'EMP conserve sa distance logique depuis la cellule du tireur pour les seuils 3/5/7 de dispersion ; son origine physique décalée ne change pas cette règle. Aucun gain FPS n'est mesuré ou revendiqué.

## Sauvegardes et transport

Schéma **238**. Seules les nouvelles visées non centrales portent `lean`, offset cardinal non nul. Il est absent du cooldown. Ancien RAW237 validé strictement avant migration du seul numéro : aucune visée historique ou balle déjà en vol n'est réécrite. Une ancienne visée sans marqueur garde son origine de base jusqu'à sa fin ; la suivante capture la nouvelle donnée.

Les frontières RAW, records humains et Decoder full/delta contrôlent forme, version et cellule source bornée. Valeurs undefined présentes, offsets nuls/diagonaux/fractionnaires, propriétés héritées et marqueur dans cooldown sont rejetés. L'adoption Decoder reste atomique. Les tests nouveaux couvrent les personnes locales et le garde partagé ; ils ne constituent pas une nouvelle matrice exhaustive de chaque archive humaine.

## Deux arrêts réels, aucune réécriture favorable

La défense originale part du vrai V36274106, pas d'une scène reconstruite. Unique contrôle initial **RED56,308s**, Chrome/WebGPU, body36,886s, overall51,458s, erreurs[]/lifecycle[]. Gaël18532 reçoit un tir réel74406 depuis126115, ligne126116→91116. Le projectile19861 est un wild miss, origine126,5/115,5, destination102,62857/116,71186. Il croise réellement le mur18647/120115 à plus de cinq cases et lui inflige18 dégâts au74419. Ce dommage est une interception légitime du trajet existant, pas à lui seul un bug d'immunité ou RNG. Le repro privé indépendant conserve cette conclusion.

Export de conservation74421 SHA256 `8c1966f9a0d7d45c411936d78e4f2a0158c56c806012eeef72b3e3ef31b286fd`, ledger `96495249692a03643f95d3554264f65e90b0f2863ad0eda5c38f7a47f52397e9`, non rechargé par l'ancien pilote. Preuves : `tmp/early-access-defense/native-01/raid-defense-Real-raid2-de-12885-efuge-and-actual-rifle-line/`.

Le nouveau mandat distinct reprend ce vrai74421, valide237 puis migre238, importe et exporte/recharge exactement. Il conserve cooldown, ordre, personnes, possessions et mur18 ; il ne rejoue pas74106 pour obtenir un autre jet. La prochaine émission est observée74451, atCore744354 ; le projectile19863 est physiquement lu74455, atCore744546, avec **origine126,5/116,0**, celle du demi-lean attendu. Aucun impact ennemi n'est déduit de cette seule émission.

Gaël se replie par une vraie commande74472. La porte18648 devient interdite74491 et sa fermeture physique complète est constatée74503, les trois originaux dedans. L'assaillant reste actif et frappe un autre mur18663/120113. Ses dégâts atteignent108/195 au74565, laissant87PV. La garde HP≤50% arrête ce mandat ; elle ne rend pas les ouvrages invulnérables. Unique continuation **RED50,479s**, body30,334s/overall45,219s, Chrome/WebGPU, erreurs[]/lifecycle[]. Aucun original blessé, aucune victoire ou guérison globale certifiée.

Vrai export UI en pause74567, validé, **non rechargé** : SHA256 `04957b3d519c6fa73ffbb5738164937fc237c2538e6b555c546a442300148804`. Ledger `0237c9f4873dee573f6ef8620f7b5f9afd652d7a94f954c3595600ec2d2f52c7`, resumeAllowed:false. Preuves : `tmp/early-access-defense/continuation/native-01/raid-defense-continuation--a0946-from-preserved-damaged-wall/`. C'est le nouvel état canonique ; les anciennes branches blessées, notamment V344, restent distinctes. Le prochain mandat doit intervenir sur cette brèche imminente, sans réactiver un ledger interdit ni effacer108 ou les dommages mineurs précédents.

## Contrôles et limites

ROOT seul, contrôles lourds séquentiels sur sources/tests/publics/pilotes/inputs figés. Gel final **2970 fichiers exacts** avant/après corpus, Pages et continuation. Les cinq originaux privés de défense et les rouges sont conservés. Les wrappers réservent un segment inédit avant Playwright et refusent tout output/reporter/réservation existant.

- Groupe existant : 87 cas/12 fichiers acquis par reprises ; premier RED31,377s avec cinq fixtures historiques incohérentes après ajout de champs modernes par les helpers.
- Ajout : 30 cas/2 fichiers, tous verts dans la reprise13,296s (cette reprise reste rouge sur trois anciennes fixtures). Ensemble **117 cas uniques/14 fichiers acquis par reprises**, pas un unique run117 annoncé vert.
- Fixtures corrigées uniquement avant leur projection historique : champs fodder/paste par défaut et calendriers modernes réellement vides retirés explicitement, anciens profils nommés custom pour ne pas prétendre être les profils standard217. Aucun validateur produit assoupli ; frontière237 du menu conservée. Reprise EMP/stun RED7,149s puis dernier fichier stun **PASS7,765s**, huit cas.
- Deux repros primaires privés distincts : avant correction RED12,594s (origine de base erronée, collision légitime verte), après correction **PASS12,843s**. Ces deux cas ne s'ajoutent pas aux117 suivis.
- Typage initial RED13,894s sur une annotation test237 face au type courant238, corrigée sans changer l'oracle historique ; typage final **PASS14,818s**.
- Corpus public : une épreuve parcourt **63 références/66 chemins**, validation historique stricte, migration238, roundtrip et Decoder sans avancer le monde : **PASS62,523s**. Aucun corpus privé ou save humain réparé n'est proclamé.
- Pages **PASS2,182s**. Quatre captures larges des deux contrôles natifs inspectées ROOT ; elles montrent UI et carte, pas une qualification fine de modèle ni un banc FPS. La vraie continuation n'a qu'une recharge exacte ; son export dangereux reste non rechargé.

Produit `ad28f47c` commité/poussé et [publié une fois en b0b70b29](../development/cloudflare-pages.md#publication-v363--origine-physique-des-tirs),106 réponses HTTPS exactes, package517fichiers/119598854octets. Gate documentaire initial PASS1,666s et package PASS1,311s. Les contrôles produit sont acquis ; la défense demeure partielle et rouge. Avant commit, deux lignes vides finales de pilotes ont été normalisées sans changement exécutable, manifeste privé et nouveau gel final05 conservés. La clôture documentaire a révélé un réencodage Windows par défaut dans le script ROOT ; les corps antérieurs ont été rétablis depuis le commit UTF-8, puis cette note nouvellement créée a été décodée par inversion exacte et vérifiée. Aucun fichier produit concerné. Gate de clôture UTF-8 PASS1,123s, après un premier rouge documentaire conservé. Après livraison, défense depuis74567, puis Batteries réellement payées/utilisées et essai des trois biomes. Nouveaux biomes, site persistant et catalogue utile restent autorisés après ces résultats bornés. Aucune campagne entière, parité exhaustive, EA100% ou240FPS certifiés.
