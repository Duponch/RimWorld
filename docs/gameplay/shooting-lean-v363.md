# Origine physique des tirs et dÃ©fense V363

Les tirs humains qui utilisent une ligne de dÃ©bordement partent dÃ©sormais du corps dÃ©calÃ© d'un demi-pas vers cette ligne, capturÃ©e au dÃ©but de la visÃ©e. Le dÃ©faut a Ã©tÃ© rÃ©vÃ©lÃ© pendant une vraie dÃ©fense. Le correctif ne garantit aucun impact : le raid de cette campagne reste actif et l'essai conserve en rouge un mur menacÃ© de brÃ¨che.

## RÃ©fÃ©rence primaire et adaptation

Installation locale relue : Core 1.6.4871 rev590, Assembly-CSharp.dll SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les extractions ciblÃ©es privÃ©es se trouvent dans `tmp/early-access-defense/lean-audit/`. Aucun code propriÃ©taire n'est intÃ©grÃ© au produit.

Le Core capture Sourceâˆ’Position au dÃ©but du warmup dans PawnLeaner. Son DrawPos ajoute la moitiÃ© de cet offset multipliÃ©e par une progression visuelle ; Launch utilise DrawPos, distinct de la cellule Source utilisÃ©e au spawn. Notre ancien Ã©metteur utilisait toujours le centre du corps, mÃªme si sa ligne de tir avait trouvÃ© un dÃ©bordement. La source physique manquait donc dans le moteur du clone.

Adaptation dÃ©terministe bornÃ©e : les trois warmups actuels de 18/102/210 ticks Core dÃ©passent la saturation nominale de 14 mises Ã  jour du lean. Le moteur capture une seule fois l'offset cardinal et Ã©met depuis le corps +0,5Ã—offset. Il n'introduit pas de tweener, jitter ou nouvelle animation par frame ; il ne prÃ©tend pas reproduire toutes les particularitÃ©s temporelles du renderer Core. Toute arme future Ã  visÃ©e plus courte devra revoir ce contrat. Les machines fixes restent inchangÃ©es.

Le dÃ©calage capturÃ© ne se recalcule pas depuis une nouvelle ligne lorsque la cible bouge. PortÃ©e avant lean, probabilitÃ©s, couvert, dÃ©gÃ¢ts, ordre des tirages d'Ã©mission et rÃ¨gles d'interception restent ceux existants. Les collisions peuvent lÃ©gitimement diverger ensuite et entraÃ®ner d'autres tirages : aucune Ã©galitÃ© de toute la suite RNG n'est annoncÃ©e. L'EMP conserve sa distance logique depuis la cellule du tireur pour les seuils 3/5/7 de dispersion ; son origine physique dÃ©calÃ©e ne change pas cette rÃ¨gle. Aucun gain FPS n'est mesurÃ© ou revendiquÃ©.

## Sauvegardes et transport

SchÃ©ma **238**. Seules les nouvelles visÃ©es non centrales portent `lean`, offset cardinal non nul. Il est absent du cooldown. Ancien RAW237 validÃ© strictement avant migration du seul numÃ©ro : aucune visÃ©e historique ou balle dÃ©jÃ  en vol n'est rÃ©Ã©crite. Une ancienne visÃ©e sans marqueur garde son origine de base jusqu'Ã  sa fin ; la suivante capture la nouvelle donnÃ©e.

Les frontiÃ¨res RAW, records humains et Decoder full/delta contrÃ´lent forme, version et cellule source bornÃ©e. Valeurs undefined prÃ©sentes, offsets nuls/diagonaux/fractionnaires, propriÃ©tÃ©s hÃ©ritÃ©es et marqueur dans cooldown sont rejetÃ©s. L'adoption Decoder reste atomique. Les tests nouveaux couvrent les personnes locales et le garde partagÃ© ; ils ne constituent pas une nouvelle matrice exhaustive de chaque archive humaine.

## Deux arrÃªts rÃ©els, aucune rÃ©Ã©criture favorable

La dÃ©fense originale part du vrai V36274106, pas d'une scÃ¨ne reconstruite. Unique contrÃ´le initial **RED56,308s**, Chrome/WebGPU, body36,886s, overall51,458s, erreurs[]/lifecycle[]. GaÃ«l18532 reÃ§oit un tir rÃ©el74406 depuis126115, ligne126116â†’91116. Le projectile19861 est un wild miss, origine126,5/115,5, destination102,62857/116,71186. Il croise rÃ©ellement le mur18647/120115 Ã  plus de cinq cases et lui inflige18 dÃ©gÃ¢ts au74419. Ce dommage est une interception lÃ©gitime du trajet existant, pas Ã  lui seul un bug d'immunitÃ© ou RNG. Le repro privÃ© indÃ©pendant conserve cette conclusion.

Export de conservation74421 SHA256 `8c1966f9a0d7d45c411936d78e4f2a0158c56c806012eeef72b3e3ef31b286fd`, ledger `96495249692a03643f95d3554264f65e90b0f2863ad0eda5c38f7a47f52397e9`, non rechargÃ© par l'ancien pilote. Preuves : `tmp/early-access-defense/native-01/raid-defense-Real-raid2-de-12885-efuge-and-actual-rifle-line/`.

Le nouveau mandat distinct reprend ce vrai74421, valide237 puis migre238, importe et exporte/recharge exactement. Il conserve cooldown, ordre, personnes, possessions et mur18 ; il ne rejoue pas74106 pour obtenir un autre jet. La prochaine Ã©mission est observÃ©e74451, atCore744354 ; le projectile19863 est physiquement lu74455, atCore744546, avec **origine126,5/116,0**, celle du demi-lean attendu. Aucun impact ennemi n'est dÃ©duit de cette seule Ã©mission.

GaÃ«l se replie par une vraie commande74472. La porte18648 devient interdite74491 et sa fermeture physique complÃ¨te est constatÃ©e74503, les trois originaux dedans. L'assaillant reste actif et frappe un autre mur18663/120113. Ses dÃ©gÃ¢ts atteignent108/195 au74565, laissant87PV. La garde HPâ‰¤50% arrÃªte ce mandat ; elle ne rend pas les ouvrages invulnÃ©rables. Unique continuation **RED50,479s**, body30,334s/overall45,219s, Chrome/WebGPU, erreurs[]/lifecycle[]. Aucun original blessÃ©, aucune victoire ou guÃ©rison globale certifiÃ©e.

Vrai export UI en pause74567, validÃ©, **non rechargÃ©** : SHA256 `04957b3d519c6fa73ffbb5738164937fc237c2538e6b555c546a442300148804`. Ledger `0237c9f4873dee573f6ef8620f7b5f9afd652d7a94f954c3595600ec2d2f52c7`, resumeAllowed:false. Preuves : `tmp/early-access-defense/continuation/native-01/raid-defense-continuation--a0946-from-preserved-damaged-wall/`. C'est le nouvel Ã©tat canonique ; les anciennes branches blessÃ©es, notamment V344, restent distinctes. Le prochain mandat doit intervenir sur cette brÃ¨che imminente, sans rÃ©activer un ledger interdit ni effacer108 ou les dommages mineurs prÃ©cÃ©dents.

## ContrÃ´les et limites

ROOT seul, contrÃ´les lourds sÃ©quentiels sur sources/tests/publics/pilotes/inputs figÃ©s. Gel final **2970 fichiers exacts** avant/aprÃ¨s corpus, Pages et continuation. Les cinq originaux privÃ©s de dÃ©fense et les rouges sont conservÃ©s. Les wrappers rÃ©servent un segment inÃ©dit avant Playwright et refusent tout output/reporter/rÃ©servation existant.

- Groupe existant : 87 cas/12 fichiers acquis par reprises ; premier RED31,377s avec cinq fixtures historiques incohÃ©rentes aprÃ¨s ajout de champs modernes par les helpers.
- Ajout : 30 cas/2 fichiers, tous verts dans la reprise13,296s (cette reprise reste rouge sur trois anciennes fixtures). Ensemble **117 cas uniques/14 fichiers acquis par reprises**, pas un unique run117 annoncÃ© vert.
- Fixtures corrigÃ©es uniquement avant leur projection historique : champs fodder/paste par dÃ©faut et calendriers modernes rÃ©ellement vides retirÃ©s explicitement, anciens profils nommÃ©s custom pour ne pas prÃ©tendre Ãªtre les profils standard217. Aucun validateur produit assoupli ; frontiÃ¨re237 du menu conservÃ©e. Reprise EMP/stun RED7,149s puis dernier fichier stun **PASS7,765s**, huit cas.
- Deux repros primaires privÃ©s distincts : avant correction RED12,594s (origine de base erronÃ©e, collision lÃ©gitime verte), aprÃ¨s correction **PASS12,843s**. Ces deux cas ne s'ajoutent pas aux117 suivis.
- Typage initial RED13,894s sur une annotation test237 face au type courant238, corrigÃ©e sans changer l'oracle historique ; typage final **PASS14,818s**.
- Corpus public : une Ã©preuve parcourt **63 rÃ©fÃ©rences/66 chemins**, validation historique stricte, migration238, roundtrip et Decoder sans avancer le monde : **PASS62,523s**. Aucun corpus privÃ© ou save humain rÃ©parÃ© n'est proclamÃ©.
- Pages **PASS2,182s**. Quatre captures larges des deux contrÃ´les natifs inspectÃ©es ROOT ; elles montrent UI et carte, pas une qualification fine de modÃ¨le ni un banc FPS. La vraie continuation n'a qu'une recharge exacte ; son export dangereux reste non rechargÃ©.

Livraison produit et publication groupÃ©e V363 en cours Ã  la rÃ©daction. AprÃ¨s livraison, dÃ©fense depuis74567, puis Batteries rÃ©ellement payÃ©es/utilisÃ©es et essai des trois biomes. Nouveaux biomes, site persistant et catalogue utile restent autorisÃ©s aprÃ¨s ces rÃ©sultats bornÃ©s. Aucune campagne entiÃ¨re, paritÃ© exhaustive, EA100% ou240FPS certifiÃ©s.
