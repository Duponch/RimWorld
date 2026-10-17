# Massifs opaques et brouillard comme pigment — V409

**17 octobre 2026, schéma256 inchangé.** Les sommets cachés restent opaques. Le brouillard participe désormais au mélange des pigments rocheux comme une matière supplémentaire : mêmes transitions entre coins, grain et éclairage que les pierres et minerais découverts. Le premier fondu ajouté par-dessus a été remplacé à la demande de l’utilisateur. Autoriser/Interdire est aussi raccordé à l’inspection d’une seule pile. Les fondations et voyages restent en cours ; aucune publication de ce lot, productionV403 inchangée.

## Résultat et limites

Le masque d’exploration supprimait les fragments des roches inconnues comme ceux des objets cachés. Certains flancs restaient visibles depuis une cellule découverte, tandis que les sommets disparaissaient. Les roches ont maintenant leurs matériaux dédiés opaques ; acteurs et objets conservent leur masque strict.

Un coin partagé reçoit les quatre contributeurs rocheux occupés, avec les poids irréguliers du mélange existant. Un contributeur caché prête son pigment sombre à la place de sa pierre ou de son minerai, sans lire ces informations inconnues. Les couleurs découvertes et le brouillard débordent ainsi ensemble par le même procédé que deux minerais voisins. Le grain de pierre, la variation des facettes et l’éclairage restent ceux du matériau commun. Les coins vides restent vides ; une vraie découverte actualise les couleurs par les mises à jour locales existantes.

La texture filtrée supplémentaire, les quatre ondes et le fondu de sortie du premier correctif ont été retirés. Il ne reste pas de couche floue ajoutée au-dessus des roches. Géométries, indices, normales, chunks, buffers et nombres de dessins restent ceux des lots résidents. Aucun parcours métier par image n’est ajouté. Cela ne mesure ni un gain FPS ni la résolution de la régression générale de performances signalée par l’utilisateur.

La présentation ne donne aucun accès, inspection ou permission aux cellules cachées. C’est une interprétation graphique originale demandée, pas une nouvelle règle de visibilité ni une revendication de pixels Vanilla identiques. Tous les toits et grottes ne sont pas exhaustivement qualifiés.

L’inspection d’une pile utilise l’offre Autoriser/Interdire et sa commande existantes. Aucun nouveau droit, règle de transport ou état persistant n’est créé.

## Contrôles exécutés sur le correctif final

- 17cas/quatre fichiers PASS19,484s : surface rocheuse, mélange historique, masque d’exploration, matériaux opaques, révélation locale et lecture interdite des minerais/pierres cachés. Type final PASS10,753s.
- Diagnostic séparé, trois cas/deux fichiers PASS3,052s :65536caps synthétiques et caps/flancs du vrai RAW1037 contenant1650cases rocheuses. Aucun triangle inversé ou dégénéré observé ; aucune modification géométrique ni double face de camouflage justifiée.
- Chrome/WebGPU AMD RDNA1, scène préparée12² PASS4,464s : quatre modes uni/texturé et proche/éloigné, aucun centre de cap laissant voir le sol cyan. Minerai caché présent/absent : zéro pixel différent, y compris sur un massif irrégulier. Pigment découvert réellement différent ;3864échantillons de débordement du pigment connu. Douze échantillons de roche entièrement cachée réagissent à la texture de pierre et douze à l’éclairage. Ancien mode sans exploration identique, erreurs GPU/console[]. Ce sont des contrôles de rendu, pas un banc FPS.
- Comparaison directe demandée ensuite : Chrome/WebGPU PASS3,105s, même massif texturé avec soleil/ombres et vrai masque de sol. La couleur témoin est portée par une copie privée de la palette de minerai ; aucune définition produit modifiée. Brouillard et minerai sombre visible donnent des couleurs résidentes identiques et zéro pixel différent à champ de sol égal. Le masque de sol activé/désactivé ne change aucun des37361pixels de caps/flancs contrôlés ; un seul pixel diffère au pied, sur le plan de sol. Il ne forme donc pas un voile au-dessus des roches dans cette scène. Captures des deux matières inspectées ROOT ; erreurs[]. Premier lancement RED2,501s avant chargement, accès réseau local refusé par la sandbox ; reprise autorisée sans modification produit, rouge conservé.
- Vraie sauvegarde géographique250² au tick1037, importée par les menus en PAUSE : PASS54,881s. Deux angles inspectés par ROOT, export complet égal à l’entrée, erreurs[] et aucun incident WebGPU. Aucun temps simulé, bien, personne ou histoire modifié. Ce contrôle ne rejoue pas le voyage.
- Les contrôles et captures du premier correctif opaque puis du fondu refusé sont conservés ; ils ne constituent pas les preuves du style final. Le premier natif opaque RED3,761s concernait GPUAdapterInfo et un favicon du pilote privé. La première suite de pigments avait aussi révélé un fallback appliqué à tort aux coins vides ; correction produit conservant leur oracle, sans règle de visibilité détendue.
- Les deux vrais clics Autoriser de l’essaiCamp ont changé les permissions des piles2404 et16047 au tick168, sans changer quantités, propriétaires, PRNG ou nextId. Les personnes7/9 ont ensuite réellement atteint50386 au tick1037 ; ce résultat ne qualifie pas toute la boucleCamp.

Rapports finaux sous `tmp/world-foundations/rock-caps-v409/native-04-pigment/` et `game-native-03-pigment/`, logs `tmp/validation-runs/rock-fog-pigment-v410-*`. Le nom privéV410 ne crée pas un nouveau lot fonctionnel : il désigne l’itération corrective deV409. Sources et entrées servies figées, captures, rouges et exports conservés sous `tmp/`. Les contrôles généraux non affectés ne sont pas rejoués pour cette correction cosmétique. Revue indépendante statique sans anomalie bloquante. Pages final PASS5,571s ; documentation contrôlée. Comparaison supplémentaire sous `native-06-dark-ore-equivalence/`.

## Correction complémentaire : éclairage des toits naturels

Le test humain remplaçant temporairement le pigment caché par celui de l’or a révélé un défaut supplémentaire, indépendant du mélange des couleurs. Le champ d’éclairage inclut les toits naturels. Il assombrissait aussi la surface extérieure des massifs quand leurs facettes passaient sous la hauteur graphique des bâtiments : effet intérieur plein à2,7 et nul à2,82, alors que les caps rocheux traversent ces hauteurs. D’où les plages sombres malgré le pigment exact de l’or.

Les premiers témoins de matériau n’appelaient pas `EnvironmentLighting.update` avec une couverture naturelle réelle. Ils vérifiaient le mélange et les masques, mais ne pouvaient pas fermer cette interaction. La validation visuelle avait donc été annoncée trop largement ; les anciennes captures et limites restent conservées.

Les matériaux extérieurs des roches ont maintenant une variante d’éclairage qui ignore cette atténuation intérieure. Lumières locales et ombres ordinaires restent raccordées ; les autres matériaux, notamment le sol sous un toit, gardent leur traitement. Aucun changement de toit, de visibilité, de géométrie, de simulation ou de sauvegarde. Le test local en or était temporaire et séparé du correctif ; il n’a créé aucun gisement.

Contrôles complémentaires :17cas/quatre fichiers PASS19,318s ; type PASS9,889s. Chrome/WebGPU PASS4,744s sur les vraies données de la carte250² au tick1037, dans un rendu isolé en lecture seule. Le champ est réellement actualisé, avec soleil, ombres et textures. Même massif et pigment or pour l’ancienne variante et la correction ; seule la composante graphique de couverture du champ est neutralisée pour le témoin, sans modifier le World. L’ancien rendu change85026pixels quand la couverture est neutralisée ; le rendu corrigé n’en change aucun. Quatre captures, dont avant/après inspectées ROOT, erreurs GPU/console[]. Le choix de ce cas diagnostique ne qualifie pas une campagne ni les performances générales.

Rapports `tmp/world-foundations/rock-roof-exterior/native-01/`, manifeste d’entrée et sources conservés. Les contrôles précédents de visibilité et de conservation restent acquis dans leur périmètre ; aucune campagne ni corpus inchangé rejoué.

## Pigment sombre final

Après confirmation humaine du résultat avec l’or, le pigment temporaire est remplacé par une teinte originale « ardoise d’encre » (`0x3b3d49`). Elle conserve le grain de pierre, les facettes, les poids du mélange entre voisins et l’éclairage extérieur corrigé. Aucun voile, nouvelle texture, nouveau minerai exploitable ou changement de sauvegarde ajouté.

Contrôle Chrome/WebGPU final PASS5,178s sur les mêmes données réelles et le même éclairage naturel : aucune différence due à la couverture intérieure sur les roches corrigées, erreurs GPU/console[]. Capture sombre inspectée ROOT ; rapport `tmp/world-foundations/rock-roof-exterior/native-02-ink-slate/`. Les contrôles de règles, de géométrie et de types inchangés sont réutilisés pour cette seule modification de couleur.

## Reprise des fondations

Le premier essai d’entréeCamp a rencontré un défaut distinct : une palette de pluie6×16384 dépasse la limite de texture8192 du périphérique demandé. Le dernier export complet avant cette entrée reste le vrai1037 ; aucun export complet post-entrée ni boucle gagnée annoncé. La correction de capacité est préparée pour reprendre ce parcours, séparément du futur diagnostic global de performances.

Les Aulnes publiques, archives, parties personnelles, personnes, biens et histoires restent inchangés. Aucun ancien monde régénéré, aucun schéma ou contenu secondaire ajouté.
