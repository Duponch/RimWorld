# Ordres, curseurs et aperçus — V300

Les ordres de la carte gagnent un aperçu avant confirmation, dans toutes les parties dont [Les Aulnes](aulnes-current.md). Simulation, éligibilité, qualité, schéma 218 et sauvegardes restent inchangés.

## Utilisation

Choisir un outil dans la catégorie Ordres ferme Architecte. Le curseur reprend son icône ; le zoom conserve ce curseur. Les curseurs et infobulles de l'interface restent disponibles, mais les indications flottantes de la carte sont masquées en mode ordre.

Un clic droit hors tracé revient au mode sélection. Pendant un tracé avec le bouton gauche maintenu, le clic droit annule seulement ce tracé : l'outil reste actif. La molette fonctionne pendant le tracé et son extrémité suit la case sous le pointeur après le changement de zoom.

Le rectangle reste bleu, même sans cible compatible ; son relâchement est alors silencieux. Seuls les éléments compatibles reçoivent les icônes et la teinte d'aperçu. Minage, abattage, récolte et coupe reprennent les quatre icônes existantes. Végétaux, surfaces rocheuses, bâtiments, fragments et plans concernés utilisent leurs véritables identités ou cellules. La déconstruction de zone montre tous les bâtiments touchés ; l'annulation d'un travail de retrait montre son propriétaire exact, y compris quand plusieurs objets partagent une case. Les fantômes de construction et leurs placements refusés conservent leur présentation V285.

Dans **Menu → Affichage** ou les **Options** du menu d'accueil, **Icônes des ordres** règle leur seuil de disparition de 0 à 96 pixels par case, 32 par défaut. **0 = toujours visibles**, même à grande distance. Ce choix reste local au navigateur et ne modifie pas la sauvegarde.

## Coût de présentation

Les couleurs des seules instances visées sont modifiées, puis leurs valeurs Float32 originales sont restaurées. Les buffers et matériaux restent résidents ; le minage ajoute une surface bleue reprenant la géométrie rocheuse exacte. Les effets indépendants, tels que fumées et émissions, ne sont pas recolorés.

Les correspondances sont construites à la demande. Un changement de rectangle ou une nouvelle adoption du monde renouvelle l'aperçu ; une sélection immobile en pause ne republie pas ses couleurs à chaque image. Le travail d'un grand rectangle actif n'est pas gratuit ni couvert par la seule mesure GAME au repos de l'outil. Aucune baisse de cadence, de règles ou de qualité n'est introduite.

## Validation

39 cas uniques dans 11 fichiers, dont 27 nouveaux, passent par groupe puis reprise ciblée : propriétaires et objets partageant une case, annulation depuis la source d'un déplacement, éligibilité, alias de couronnes, couleurs/restaurations Float32, reconstruction pendant sélection, rotation de portes/pales, buffers résidents et curseurs. Typage final 6,149 s et build final 2,011 s passent.

Le parcours Chrome WebGPU matériel AMD en 2560×1440/DPR1 charge le menu public Les Aulnes au tick 8434. Dix contrôles passent en 59,666 s : huit outils, infobulles UI, absence d'indication carte, minage/cultures/herbe/arbre avec couleurs et voisins exacts, molette pendant tracé, clic droit dans les deux situations, rectangle vide silencieux, vraie désignation d'abattage, modèle de lit et réglage 0 persistant. Dix RAF stationnaires au même tick conservent les versions des buffers observés. Une sauvegarde/recharge après l'ordre conserve le monde exact au tick 8434 ; un nouveau MAIN conserve le réglage dans Options.

Rapport `tmp/order-interactions-v300/native-reprise/run-88jt37/report.json` SHA `DEFF8B93`, gel `72688496` ; erreurs vides, sources et 63 références/66 fichiers publics exacts, navigateur et port 5340 fermés. Le contrôle des buffers ne certifie pas tous les pixels ou uploads GPU. La sonde de coût pendant la recharge est distincte du jeu ordinaire et n'est pas un budget CPU ni une mesure de FPS.

Le premier parcours `native/run-TvZF8c` reste rouge 34,640 s : quatre contrôles acquis puis cible de molette masquée par l'interface. La reprise distincte recentre cette fixture. L'erreur initiale de typage d'une fixture et la lecture erronée du premier bâtiment de déconstruction sont corrigées avant le gel final ; aucun ancien rouge n'est reclassé.

Comparaison GAME neuve A/B/B/A contre V299 exact `b302e865`, même référence 8434, caméra 129/122/zoom1, Chrome matériel AMD/WebGPU 1440p/DPR1/dev, chauffe 3 s et mesure 14 s, outil inactif :

| Cohorte | RAF/s | Vitesse réelle | p95 intervalle | Maximum |
|---|---:|---:|---:|---:|
| A1 V299 | 131,79 | 6,092× | 19,5 ms | 40,7 ms |
| B1 V300 | 139,05 | 6,059× | 18,1 ms | 40,8 ms |
| B2 V300 | 137,63 | 6,071× | 17,7 ms | 57,2 ms |
| A2 V299 | 136,14 | 6,059× | 17,4 ms | 38,8 ms |

Moyennes cumulées 133,96→138,34 RAF/s, débit 6,076→6,065×, moyenne des p95 18,45→17,90 ms. Aucun ralentissement moyen sensible observé ; la pointe B2 est défavorable. Ce contrôle ne prouve ni le coût d'un grand rectangle actif, ni une fluidité constante, ni un écran à 240 Hz. L'écart de +3,27 % n'est pas revendiqué comme gain d'optimisation.

Rapport `tmp/order-interactions-v300/performance/abba-CnlzOX/report.json` SHA `DDA07AD7`, gel `DBCD9725`, PASS 229,006 s. Quatre contextes/navigateurs/Workers et serveurs neufs, 43 feuilles historiques littérales A/48 actuelles B réellement chargées, CSS inclus. Recharges exactes 9029/9044/9049/9052 ; sources/publics identiques avant/après, erreurs vides, navigateurs et port 5342 fermés. Aucun chronomètre CPU ou query GPU dans les fenêtres GAME.

La vérification documentaire passe en 1,002 s : 908 documents, 8595 liens locaux, 25 identités de domaine et cinq familles préservées. Ce lot fonctionnel ne revendique aucun gain FPS, CPU ou GPU. Commit/push par lot et publications Cloudflare regroupées restent applicables ; V300 attend le prochain groupe de publication. La relance planifiée reste en pause.
