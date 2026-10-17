# Massifs opaques et brouillard peint — V409

**17 octobre 2026, schéma256 inchangé.** Les sommets des massifs ne laissent plus voir le sol. Leur brouillard forme une lisière progressive et irrégulière, avec débordement des couleurs déjà découvertes, sans dévoiler les minerais encore inconnus. L’action existante Autoriser/Interdire est également raccordée à l’inspection d’une seule pile. Les fondations et voyages restent en cours ; aucune publication de ce lot, productionV403 inchangée.

## Résultat et limites

Le masque d’exploration supprimait les fragments des roches inconnues comme ceux des objets cachés. Certains flancs périphériques restaient visibles depuis une cellule découverte, tandis que les sommets disparaissaient. Les triangles avaient une orientation correcte : aucun changement de winding, aucune double face de camouflage.

Les roches utilisent leurs deux matériaux dédiés et conservent une couverture opaque. La connaissance est filtrée pour leur seule présentation, puis déformée par quatre ondes croisées et fixes dans le monde. La transition progressive laisse les pigments connus dépasser leur cellule et le brouillard recouvrir une partie du bord découvert. Elle ne suit ni l’écran, ni une horloge d’animation. Les contributeurs inconnus sont exclus du mélange de pigments ; un coin rocheux entièrement inconnu emploie une teinte neutre, sans consulter son minerai ou son type de pierre. Les coins vides restent vides. Une vraie découverte restitue les pigments par les mises à jour locales existantes.

Les acteurs et objets gardent leur masque strict. Le rendu ne donne aucun accès, inspection ou permission aux cellules cachées. Il s’agit d’une interprétation graphique originale demandée par l’utilisateur, pas d’une nouvelle règle de visibilité ni d’une revendication de pixels Vanilla identiques. Ce lot ne qualifie pas exhaustivement tous les toits et grottes.

Géométries, indices, chunks et nombres de dessins restent ceux des lots résidents. La vue filtrée partage les mêmes octets CPU et plages de mise à jour que le champ de connaissance, avec une seconde texture GPU RGBA :250000octets pour250², sans mipmaps. Aucun attribut propriétaire supplémentaire n’est conservé sur les sommets. Les quatre ondes et la lecture filtrée sont dans une branche uniforme évitée sur les cartes historiques sans exploration. Aucun parcours métier par image n’est ajouté ; aucun coût GPU nul, gain FPS ou résolution de la régression générale de performances n’est annoncé.

L’inspection d’une pile affiche l’offre existante Autoriser/Interdire et envoie sa commande habituelle. Aucun nouveau droit, règle de transport ou état persistant n’est créé.

## Contrôles exécutés

- 16cas/quatre fichiers acquis par reprises, dont quatre nouveaux : géométrie et matériaux opaques, pigments cachés, réapparition locale, textures résidentes partageant leurs données et plages. Première passe15PASS/1RED22,628s sur le fallback neutre appliqué aussi à un coin vide ; correction produit limitée aux coins réellement rocheux, oracle conservé, reprise du cas PASS13,293s. Type final PASS10,978s.
- Chrome/WebGPU AMD RDNA1, scène de rendu préparée12² : PASS3,398s. Quatre combinaisons proche/éloigné et uni/texturé ; aucun centre de cap laissant voir le sol cyan. Minerai caché présent/absent : zéro pixel différent, y compris au bord connu. Les pigments découverts diffèrent effectivement.1620échantillons de débordement de l’or déjà connu ; sur le champ isolé du vrai shader,184tons intermédiaires et contour variable. Deux rendus inchangés identiques, ancien mode sans exploration identique, erreurs GPU/console[]. Ce sont des contrôles de pixels, pas des mesures FPS.
- Le premier correctif opaque, puis la lisière peinte demandée, ont leurs captures et résultats intermédiaires conservés. Le premier natif opaque reste RED3,761s sur la sérialisation de GPUAdapterInfo et un favicon absent ; seuls le pilote et sa page privée ont été corrigés. Les assertions graphiques finales restent actives.
- Vraie sauvegarde géographique250² conservée au tick1037, chargée par les menus en PAUSE : PASS61,315s, deux angles inspectés par ROOT, export complet égal à l’entrée, erreurs[] et aucun incident. Aucun temps simulé, bien, personne ou histoire modifié.
- Les deux vrais clics Autoriser de l’essaiCamp ont changé les permissions des piles2404 et16047 au tick168, sans changement des quantités, propriétaires, PRNG ou nextId. Les personnes7/9 ont ensuite réellement atteint50386 au tick1037 ; ce résultat n’est pas une qualification de toute la boucleCamp.

Rapports sous `tmp/world-foundations/rock-caps-v409/`, logs `tmp/validation-runs/rock-fog-style-v409-*` et contrôles intermédiaires `rock-caps-v409-*`. Sources servies privées figées depuisV408 et les copies relues de ce correctif ; captures, rouges, entrées et exports conservés sous `tmp/`. Le contrôle de rendu en pause ne reprend ni ne rejoue le voyage.

## Reprise des fondations

Le premier essai d’entréeCamp a rencontré ensuite un autre défaut matériel : une palette de pluie6×16384 dépasse la limite de texture8192 du périphérique demandé. Le dernier export complet avant cette entrée reste le vrai1037 ; aucun export complet post-entrée ni boucle gagnée n’est annoncé. La correction de capacité est préparée pour reprendre ce parcours, séparément du futur diagnostic global de performances.

Les Aulnes publiques, archives, parties personnelles, personnes, biens et histoires restent inchangés. Aucun ancien monde n’est régénéré, aucun schéma ou contenu secondaire ajouté.
