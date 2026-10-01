# Validation — Plantes et colonie de test V179

2 octobre 2026, schéma **168**, base Git **b1186a2**. [Contrat](../development/plants-skill-v179.md), [recherche Core](../research/plants-skill-core-v179.md), [stratégie](../development/testing.md). Les sorties brutes restent sous `tmp/` ; cette note distingue préparation, mécanique, réparations des fixtures et portée des mesures.

## Recherche et contrôles courts

XML et IL du Core installé **1.6.4871 rev590**, confrontés au miroir public : courbes de vitesse et de rendement, capacités appliquées une seule fois, 0,085 XP Core/tick avant le travail, récolte avec échec puis arrondi puis bonus après l'entier, arbres non failable. Le contrat distingue les adaptations conservées : durées locales, facteur de difficulté/global absent, coupe stérile et admissibilité d'XP relue pendant la coupe.

Les douze tests propres à Plantes passent : statistiques, apprentissage/saturation/oubli et incapacité ; V167 strict avant migration neutre, refus des profils futurs/corrompus en sauvegarde et bridge sans adoption de révision ; travail au contact, voyage sans XP, semis, passage de niveau au même tick, annulation, reprise, arbre, coupe stérile, dégagement et refus de dépôt atomique. La démo publique passe aussi en simulation : empreinte, 250² naturel, récolte en cours sauvegardée, dose au sol puis portée et stockée, consommation herbal lors de l'auto-soin de Noé. La contusion et les politiques sont préparées, pas une incidence médicale naturelle.

La première passe ciblée donne 34/36. Deux attentes sont réparées : un ancien stream V166 doit omettre le champ Plantes futur ; un arrondi de récolte humaine tient désormais compte du tirage d'échec préalable, sans supprimer l'exigence de zéro produit. La première régression échoue sur les mêmes constructeurs historiques plus largement, et sur le compte de 30 entrées devenu 31. Le helper de fixtures retire explicitement le seul champ futur des personnes et des visiteurs archivés ; les fichiers de sauvegarde historiques et les validateurs du jeu restent inchangés.

Le test de dégagement de semis ajoute un arbre après découverte de l'index, en modifiant le tableau en place. Son original ne voit pas cet arbre pour l'apprentissage, alors que la reprise reconstruit l'index et gagne 850 milli-XP. La fixture remplace désormais le tableau, selon le contrat existant des producteurs ; une égalité complète est ajoutée immédiatement au checkpoint et conservée après continuation. Ce correctif de fixture n'est pas une nouvelle optimisation ou réparation du moteur.

## Résultats finaux

Régression finale r3 hors campagnes longues : **349/349 fichiers, 1 537 tests réussis et un ignoré sur 1 538**, **238,62 s**. La r2 n'avait plus qu'une fixture V150 de visiteurs en échec ; celle-ci retire désormais le champ futur chez les personnes et le visiteur archivé, sans détendre le validateur. Son ciblé passe 4/4 avant cette régression finale. Les sauvegardes historiques publiées n'ont pas été régénérées.

Build TypeScript/Vite passé : **615 modules**, avertissement préexistant de taille de chunks. Les trente premières fiches du manifeste gardent leur contenu et leur ordre ; la nouvelle entrée porte un JSON de **3 429 948 octets**, SHA-256 `8d78cdb940a76050f4f270b454f7ea2b5a4de927cdd5304a1d74a52e5f7d2c49`, vérifié par son test.

Parcours Chromium r2 **1/1, 46,2 s de test / 50,5 s au total**, **WebGPU AMD/RDNA‑1**, 1 440×1 000, sans erreur console/GPU. Catalogue ouvert par les menus réels, 31 choix, sélection et chargement en pause du fichier exact ; Bio affiche Plantes 8 et Travail ses deux priorités. Le premier passage avait une attente erronée de 100 % : le problème de dos naturellement généré d'Ada conserve Manipulation 90 %, donc vitesse 90 % et réussite 97 %. Aucun état médical n'est retiré ; l'oracle et la description sont corrigés. Le test de démo a été rejoué **1/1** après ajout de l'assertion sur ce problème naturel, sans modification du produit ou des octets publiés.

Sauvegarde/rechargement exact au tick **93**, avec XP acquise, plante encore présente et aucune dose. Récolte au tick **135**, transport réellement activé et ordonné, dose unique en réserve au tick **212**, auto-soin de Noé activé et ordonné puis achevé au tick **346**. Bilan herbal **0→1→1→0**, industrial **30** intact, XP Plantes finale d'Ada **66 960 milli-XP**, World valide. Capture Bio inspectée : nouveau détail et progression lisibles, sans nouvelle structure de panneau. La blessure de Noé et les besoins/politiques initiaux sont préparés ; la récolte et ses transitions ne le sont pas.

Présentation isolée minage/abattage **250²** passée, changements 1×/6×/3×, adaptateur **AMD/RDNA‑1** : **7 804 / 7 755 images**, p95 **6,1 ms** chacune, zéro starvation, saut et occupation solide. Le diagnostic enregistre aussi 144/165 gaps ; la passe ne constitue pas une assertion de zéro gap. Les poses proviennent des buffers GPU partagés ; ce contrôle de chronologie n'est ni une mesure de temps GPU ni une comparaison causale de cadence avec V178. La durée et la phase de racine de 40 unités sont exercées par le parcours natif ci-dessus.

Typage final passé après les dernières assertions navigateur ; documentation : **620 documents, 5 931 liens locaux**, six en-têtes courants au schéma 168 et trois sources originales inchangées. Revue indépendante du diff métier sans défaut concret supplémentaire ; `git diff --check` passé. Le changement utilisateur préexistant de l'herbe graphique est conservé hors de ce lot.

## CPU séparé et préparation du banc

Le [banc dédié](../../scripts/plant-skills-bench-v179.ts) compare le parent gelé et les sources courantes, **Ryzen 5 3600**, **Node 24.11.1**, carte boréale **250²**, graine 42, trois colons et **huit animaux naturels**. Deux warmups puis quatre tours A/B/B/A donnent huit lots de 60 ticks par version. Le second sous-coût adopte 60 deltas pour 100 personnes préparées, sans renderer ni worker. Sources hachées avant/après, inchangées : parent 623 fichiers `8ef762271547bb86cb98614e7b2aa4caa880757730e2c53e2fc7a70875722d37`, courant 624 fichiers `97a3a1d2e1243cd3727c1cfaefe993e14f4295ffedbfc8ea3819827704357b14`. Le fichier utilisateur d'herbe est présent mais non exécuté ici.

Avant tout chronométrage, deux gardes ont refusé des préparations erronées : attente de sept animaux au lieu des huit générés, puis index de profil de départ 3–99 produisant des besoins négatifs. Le banc corrige ses attentes et recycle les trois profils pour les personnes ajoutées, sans modifier le validateur ou la scène naturelle. L'oracle exige ensuite le World et tous les PRNG exacts au départ et après continuation ; seul le numéro de schéma est normalisé. Les paquets checkpoint/delta sont aussi identiques selon cette normalisation.

Deux exécutions successives, avant build et navigateur : moyenne du lot de **60 ticks 77,11→73,93 ms puis 77,15→68,71 ms** ; dispersion/JIT ne permettent pas d'annoncer une accélération générale. Adoption de **60 deltas/100 personnes 0,282→0,409 ms puis 0,281→0,389 ms**, p95 **0,444→0,741 ms puis 0,469→0,726 ms**. Le contrôle prospectif ajoute environ **1,8–2,1 µs par adoption** dans ce sous-coût ; le retirer supprimerait le refus des profils futurs/corrompus. Pas de correctif spéculatif pour cet écart absolu borné.

Les nouveaux profils Plantes sont retirés des deux préparations pour comparer exactement les anciens champs ; aucun travail agricole n'est actif. Ces mesures ne couvrent donc ni le coût de nombreux profils Plantes présents/actifs, ni l'encodage, la génération, le worker, le CPU image, le GPU ou les FPS. Les rapports sont `tmp/plant-skills-bench-v179-r1.json` et `-r2.json`, indépendants du navigateur et des campagnes.

## Frontières

Le semis médicinal domestique n'est pas livré. Aucun nouveau lot ou buffer GPU, campagne naturelle longue, parité exhaustive, débit à forte population ou coût GPU général n'est établi par ces contrôles. Les sorties nouvelles restent sous `tmp/`, distinctes des preuves historiques.
