# V376 — Toundra et neige physique

15 octobre 2026, schéma 239. Lot produit qualifié dans le périmètre ci-dessous ; produit872afdbb publié en712fc270.

## Pour le joueur

Nouvelle partie propose quatre biomes terrestres, dont la Toundra, sur un globe prospectif version2. Le lieu détermine réellement le froid, les saisons, la flore et la faune. La neige tombe progressivement, fond avec la chaleur, ralentit les déplacements et se tasse sous les personnes et grands animaux. **Zones → Déneigement** affecte des cases au travail Nettoyage : le colon rejoint une place au contact et travaille avant de retirer la neige. Retirer la zone interrompt ce travail ; les besoins et incapacités ordinaires restent prioritaires.

La profondeur, la phase de précipitation, les arêtes de déplacement et le travail interrompu sont persistés. L’herbe décorative disparaît sous neige profonde, les outils et zones restent visibles au-dessus. La nouvelle présentation réutilise les matériaux et lots GPU existants.

## Référence et adaptations

Règles relues sur l’installation Core1.6.4871rev590 (empreinte DLL5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a), notes privées tundra-reference et tundra-reference-complement. Aucun code ni asset propriétaire copié. [Annonce officielle de l’hiver](https://ludeon.com/blog/2014/12/alpha-8-winter-is-coming-released/) pour saisons/neige ; [références visuelles officielles consultées](biome-readiness-v375.md), sans leur attribuer une version/DLC non indiqué. Corpus utilisateur biomes/environnement : chapitres5–7/10/12/17/21/29, SYS/TEST016–019/071–075/113–117 et CAT059/060, aucune clôture globale déduite.

La toundra conserve densité végétale0,19 et repousse28jours. Six espèces existantes représentent4,38/9,26 des poids ; lièvres, lièvres des neiges et muffalos5/13,53. Les espèces absentes ne sont pas redistribuées. Cadence maladie80jours et poids humains330, dont peste80 ; les maladies non implémentées restent absentes.

Les scores des quatre candidats sont issus des workers Core ; leur sous-ensemble et son départage restent une adaptation. Globe original162cases, générationv2 plus froide et pluies600–1800mm : ni carte ni graine équivalente au générateur RimWorld. Les vieux globesv1 restent reconstructibles exactement. Bruit spatial et ordre du balayage neige originaux, travail de déneigement50×profondeur motivé par l’anomalie nullable relevée dans Core. Les nouvelles cartes commencent sans histoire d’accumulation inventée.

Les sols à lichen et marais, espèces manquantes, glace temporaire, fonte radiale, rivières et migrations animales restent hors lot. Cette toundra utilisable reste partielle ; aucune année de survie ni parité exhaustive certifiée.

## Continuité et coûts

Ancien schéma238 validé strictement avant migration neutre239 : pas de neige, nouveau climat, nouvelle personne ou progression ajoutés. Anciennes versions refusent les champs futurs. RAW, checkpoints et deltas partagent les gardes ; Toundra exige explicitement son climat, sa flore et sa surface neige. Les déplacements capturent leur coût à l’entrée, même si la neige fond ensuite ; les personnes et animaux portés ne tassent pas deux fois.

Simulation : balayage borné380cellules par tick local sur250², phase persistée, bruit mis en cache et aucune consommation du RNG de campagne. Carte historique sans domaine neige : sortie immédiate. Surface sèche vide : seule phase avancée. Rendu : chunks16² résidents, uploads sur adoption de changements quantifiés, aucun travail métier par image ; masque d’herbe résident actualisé seulement au franchissement de seuil. Les overlays ont une garde de hauteur fixe pour éviter un upload à chaque flocon. Ces choix ne prouvent ni coût nul ni débit/FPS général.

## Contrôles et limites

Sources/tests/publics3274fichiers figés sous tmp/tundra-v376/freeze01–04. Entre gels : sélection UI, navigateur/dossier de sortie, puis syntaxe de propriété de constructeur remplacée par une affectation strictement équivalente pour Node ; aucun autre changement produit.

- Passe ciblée initiale :74/77 cas acquis,24,734s. Nouvelle fixture de neige avait oublié le stock dérivé ; deux oracles existants/adoptés avaient une géométrie obsolète et un texte réencodé. Réparations conservées sans détendre les validateurs.
- Reprises ciblées : neige et monde18cas acquis11,197s ; garde Toundra et masque herbe16cas acquis12,593s ; navigation4cas PASS7,948s après mise à jour explicite étagères/pièges/crématorium/couchages. Les premiers rouges restent dans tmp/validation-runs.
- Typage sources et tests modifiés PASS16,424s puis13,495s après raccord des deux outils de zone au helper ; un rouge14,641s conservé. Mémoire compilateur bornée, pas de nouvelle suite globale prétendue.
- Corpus63 références publiques : PASS82,686s, anciennes sources immuables, migration239, roundtrip exact et Decoder, sans avancer le monde.
- Natif01 RED24,194s avant création du monde : pilote ne tournait qu’en longitude pour atteindre la tuile polaire111. Reprise par le sélecteur visible, graine42/case111 conservées.

- Natif02 RED65,833s : Chromium embarqué échoue à compiler un ancien graphe TSL (Tint IR swizzle), à l’arrivée. Aucun patch shader arbitraire ; limite de ce navigateur conservée.
- Natif03 Chrome installé/WebGPU **PASS72,538s** : vrai globe42/case111, arrivée30, climat−11,055°C ; scène froide séparée explicitement préparée pour le déneigement. Trajet8cases observé, contact126/124 vers127/124, travail18 au tick95, sauvegarde/reprise pendant travail puis case déneigée105. **Trois exports/recharges exacts**, erreurs[], incident graphique/simulation absent. Huit captures produites, quatre inspectées ROOT, iso et perspective. Aucun hiver entier certifié par cette scène.
- Présentation initiale RED1,630s sur propriété de constructeur non admise par le mode TypeScript Node ; correction équivalente et huit tests neige **PASS9,496s**. L’essai suivant a été interrompu par la coupure sans résultat : il reste non acquis. Reprise du contrôle imposé : **PASS139,647s**, minage puis abattage250², changements1×/6×/3×, zéro saut continu ni occupation solide détectés. Ce parcours historique n’est pas un banc FPS de toundra.
- Mesure CPU isolée du seul balayage250², Node24.11.1, Ryzen5 3600 :165ticks avec préparation paresseuse, p95=0,392ms/max5,368ms ;1000ticks chauds, p95=0,071ms/max0,261ms. Terrain synthétique froid sans toit ; simulation complète, thermique, bridge, rendu et GPU exclus. Pas de gain de FPS déduit.
- Typage de livraison sources et tests modifiés **PASS15,523s**, Pages **PASS3,025s** (compilation Vite après ce typage ciblé). Aucun nouveau typage global ou ancienne campagne prétendu vert.

Sorties sous tmp/validation-runs/v376-* et tmp/tundra-ui-v376/native-01..03/. Aucun test d’énergie de la campagne98038 n’est crédité à cette tranche. Produit `872afdbb978a8ad6de7ef10bba5a240dc3626762` commité/poussé sur origin/main. Publication unique `712fc270` : [production](https://elsewhere-cq7.pages.dev/) et [déploiement](https://712fc270.elsewhere-cq7.pages.dev/). Package517fichiers/119627847octets,63références/66fichiers publics inchangés, laboratoire et sources privées absents. Vérification locale PASS2,124s, Wrangler4.149.0 PASS15,712s, **106réponses HTTPS200 exactes**/MIME attendu PASS8,919s ; erreurs[]. Rapports tmp/elsewhere-pages/v376-package-Pfa17G/report.json et v376-http-CxlPgU/report.json. Le premier lanceur documentaire python avait EACCES ; le runtime explicite passe2,124s. Les3274entrées gelées restent exactes. references_UI humain non suivi est la seule raison de commit-dirty=true ; seul dist vérifié envoyé. Aucune session humaine fermée.
