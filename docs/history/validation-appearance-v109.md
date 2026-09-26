# Validation V109 — apparences humaines et gilet fabriqué

26 septembre 2026. Demande : comprendre la composition des personnages RimWorld, la transposer en 3D et poursuivre le gameplay. [Référence Core 1.6.4871 rev590](../research/pawn-appearance-reference-v109.md), [apparence](../development/pawn-appearance.md), [fabrication](../development/flak-armor.md). L'illustration voxel utilisateur inspire les volumes originaux ; aucune texture commerciale n'est distribuée.

## Livraison et limites

Cinq silhouettes, douze têtes, 26 identifiants de coiffure Urban représentés par treize familles de volumes, palettes Core et portraits composés depuis la même identité. Le sexe est ici un paramètre visuel ; biographies, âge biologique, vieillissement et génération complète des personnages restent absents. Les barbes existent sur profils explicites ; le générateur ordinaire reste sans barbe faute d'âge connu. Les nouveaux acteurs reçoivent un profil persistant ; les anciens gardent leurs données et une apparence de présentation déterministe.

Le gilet déjà portable devient réellement fabriquable : deux recherches préalables, tissu/acier/composant distincts, poste alimenté, ouvrage, auteur, reprise, qualité, équipement et compte du gilet porté. Aucun casque, composant fabriqué ou armure de plaques physique. Schéma **109**, validation stricte de 106 avant migration neutre. G0–G4 restent **partiels**, G5 **absent** ; estimations fonctionnelles uniquement dans ROADMAP.

Douzième colonie intégrée à Charger : **Visages et armurerie · 5 colons**. [Fichier préparé](../../public/test-saves/v109/visages-armurerie.json), [générateur](../../scripts/generate-appearance-flak-v109.mjs), SHA-256 `a3c107df89aeb757d17f111b5e80108358055099582e6c21a71fba7389dfbc1e`. Profils, provisions et recherches préparés, gilet non offert et travail non préachevé. Les fixtures antérieures restent immuables.

## Contrôles regroupés et corrections

[Premier groupe](../../artifacts/checks-v109-initial.json) : 59 contrôles, 54 réussis, cinq échecs conservés. Deux attentes figeaient le schéma courant à 106 ; trois fixtures synthétiques d'anciens schémas conservaient le nouveau profil lors de leur rétrogradation. Corrections des fixtures/attentes, sans affaiblir le validateur ; les cinq contrôles concernés ont été rejoués avec succès, puis les neuf contrôles du profil et de sa sauvegarde. Ces reprises sont consignées dans la sortie du terminal, sans rapport JSON distinct.

[Frontières finales](../../artifacts/checks-v109-final-boundaries.json) : **20/20**, incluant profils, croissance/réordonnancement des buffers, deltas d'ouvrages, douze colonies et départs de visiteurs. Au total, les groupes et reprises couvrent **69 contrats distincts** ; les contrôles déjà verts n'ont pas été tous rejoués après chaque modification.

- Profils : tirage déterministe sans consommation du PRNG métier, cohérence des clés/couleurs/têtes, migration neutre, rejet des champs futurs/corrompus, continuation exacte.
- Fabrication : recherches et compétence, trois matières réellement transportées/incorporées, courant interrompu, auteur, sauvegarde/reprise, sortie et qualité, jusqu'à X avec gilet porté, annulation à 75 % par part et refus sans place atomique. Le test de démonstration fabrique réellement à partir des ressources préparées.
- Rendu : agrandissement à 103 acteurs, réordonnancement stable, données anciennes intactes, buffers et matériaux conservés, sept flux et seize attributs sous les limites minimales WebGPU.
- Deux défauts d'intégration corrigés : le validateur des visiteurs sortis omettait le profil ; le décodeur de deltas omettait `flakWork` et le précédent `artWork`. Les progrès d'ouvrages passent désormais dans les deltas, sans demander un monde complet. Corruptions refusées et anciens instantanés conservés.

La [reprise de la fixture de recherche](../../artifacts/research-colony-v109.json), ticks 111824→230668, conserve alimentation/sommeil, achève sa recherche et fabrique/équipe une chemise. C'est un contrôle de la filière de production existante, pas une progression naturelle démontrant toute la nouvelle armurerie. [Checkpoint](../../artifacts/research-checkpoint-v109.json) conservé.

## Parcours natif

[Pilote](../../scripts/appearance-ui-v109.mjs), [résultat final](../../artifacts/appearance-ui-v109.json). Chromium visible/WebGPU, sources gelées, chargement par la vraie bibliothèque, cinq portraits SVG, Bio sans duplication, vues face/profil/dos et recherche terminée. Reprise ×6 de la démonstration du tick 3244 au tick **5070** : gilet physique de bonne qualité, 200 PV, transporté par son fabricant ; validation de monde sans erreur, **zéro resynchronisation complète**, zéro erreur JS/WebGPU. L'équipement et sa conservation sont aussi couverts par le test moteur.

Captures locales `artifacts/appearance-v109-{bio,front,side,back,work}.png`, inspectées ; les PNG régénérables sont exclus de Git. Première tentative de pilote : onglet Colonies de test omis, puis lecture de l'état avant sa première publication ; ces attentes ont été réparées. Un vrai défaut de présentation a ensuite été trouvé : l'ancienne classe du portrait appliquait encore l'atlas à la place du SVG. Classe corrigée ; [échec conservé](../../artifacts/appearance-ui-v109-failed.json), parcours complet rejoué. Aucune assertion métier n'a été retirée.

## Performance

[CPU isolé](../../scripts/appearance-cpu-v109.mjs), [résultat](../../artifacts/appearance-cpu-v109.json) : fixture mixte V98 immuable, 100 colons (104 humains avec acteurs annexes), 50 ticks d'amorçage et 200 mesurés. Tick médian **27,49 ms**, p95 **64,06 ms**, maximum **140,93 ms** ; validation et sérialisation hors chronométrage, continuation exacte sur 30 ticks. Fenêtre courte sans comparaison causale avec un autre lot. Le premier lancement lisait la fixture compressée comme du JSON brut ; le banc utilise le décodeur de stockage réel.

[Comparaison native](../../scripts/appearance-load-v109.mjs), [mesures complètes](../../artifacts/appearance-load-v109.json) : même simulation actuelle et même charge mixte, scène entière de **375,553 cases**, 1440×1000, rendus humains V108 publié (`f4a2dca`) et V109 successifs, ordre **V108/V109/V109/V108**. Six secondes par fenêtre après une seconde de stabilisation, pause puis ×6. Aucun autre test lourd concurrent. La première calibration avait une portée de caméra différente sur un passage : elle ne sert pas de comparaison ; la portée est maintenant imposée et vérifiée. Cache borné ajouté pour les apparences historiques, sans mutation des sauvegardes.

| Rendu | Image p95 pause | Image p95 ×6 / pic | CPU image p95 ×6 | Débit effectif |
|---|---:|---:|---:|---:|
| V108, passage 1 | 4,3 ms | 20,8 / 83,4 ms | 17,8 ms | 2,85× |
| V109, passage 1 | 4,3 ms | 20,8 / 71,0 ms | 18,4 ms | 2,71× |
| V109, passage 2 | 4,3 ms | 20,9 / 83,4 ms | 18,6 ms | 2,80× |
| V108, passage 2 | 4,3 ms | 20,8 / 75,0 ms | 18,2 ms | 2,76× |

La cadence d'image reste proche dans cette comparaison courte ; le CPU de présentation est légèrement plus haut et les débits se recouvrent partiellement. Ce n'est ni une garantie d'absence de surcoût ni un gain général. RAF mesure l'intervalle d'image, le CPU sa préparation ; **aucune sonde de temps GPU**. Un seul lot humain, géométrie/animation partagées et attributs interleavés limitent les coûts ; 240 FPS actifs et ×6 soutenu restent non atteints sur cette charge. Aucun saut de simulation ni allègement des règles.

Typage/build réussis, avertissement existant sur les gros bundles conservé. Audit documentaire réussi : 398 documents, 4 369 liens locaux, trois sources originales inchangées. Pas de campagne annuelle : l'identité visuelle et cette recette utilisent les horloges/chaînes existantes, éprouvées par les frontières et la continuation ciblées.

## Publication

Production Netlify **`6ab7a55fc13832e1b09b98d4`**, 37 fichiers, état `ready`. [Déploiement](../../artifacts/netlify-v109.json), [parcours public réussi](../../artifacts/netlify-smoke-v109.json) : création de trois colons, schéma 109, sauvegarde et restauration froide, interface et 62 pictogrammes, zéro erreur. [Catalogue et colonie publique](../../artifacts/appearance-public-v109.json) identiques octet par octet aux fichiers validés. Le pilote natif et les sondes de performance ne sont pas inclus dans le bundle.
