# V434 — préparation commune de la scène et coût des surfaces

Travaux du 19 octobre 2026, qualification ciblée acquise ; publié83860f37, déploiementdaa13dca. Schéma 263 inchangé. Les Forges reste la référence principale : carte 250², 80 colons, 241 animaux et patrimoine préparé déclaré dans [V432](stress-colony-v432.md). La cible est 200 FPS stables en ×1, rotation comprise ; les vitesses rapides et les anciennes parties restent des contrôles complémentaires.

## Responsabilités et conservation

Le contexte MAIN prépare la géométrie confirmée au moment où le curseur de présentation applique réellement son World. `SceneStructurePreparation` demeure la capture ordonnée unique des primitives de structures. Ses changements alimentent les supports des piles, les toits physiques et les membres d'éclairage. Les prédicats courants de puissance, combustible et horaire restent évalués à chaque application ; l'index existant des ressources conserve les sources des plantes de grotte. La projection résidente des piles reçoit les mêmes supports, garde les anciens points de contact et acquitte son travail après la fin de l'application. Les lecteurs publics mutables conservent leur parcours complet.

Le calcul thermique recapture les obstacles et portes dans leur ordre historique, partage seulement les entrées environnementales stables de croissance pendant l'appel et relit les ancres/facteurs de chaque plante. Aucun état autoritaire, schéma de sauvegarde, PRNG, commande, horloge, fréquence de publication ni cadence graphique n'est changé. L'extraction du prédicat lumineux public garde ses valeurs et son ordre.

Le candidat de rendu utilise des matériaux diffus natifs pour le bois et les surfaces opaques déjà mates : terrain, flore, mobilier, roches et objets des lots. Eau, matériaux métalliques dédiés, transparences, acteurs et overlays gardent leurs modèles précédents. Les géométries, placements, pigments, lots et ombres restent identiques. La réponse spéculaire change légèrement ; les images sont comparées et inspectées, sans prétendre à une identité de pixels. La sélection dépend des mesures natives sur les trois parties, notamment du recul constaté sur Les Éclaircies avant publication.

## Contrôles de composants acquis

Les 25 Worlds entiers 335–359 du candidat thermique sont identiques aux oracles V433 ; recharge finale stricte exacte. SHA final359 `f668d74c38c9c6d0aff6d0d94a916f99e651f9ee39867e3ce148462a74f44c39`. Neuf différentiels thermiques, quatre contrats pérennes thermiques, quatre contrats de matériaux et les contrôles ciblés vent/hydroponie sont acquis. Ce n'est pas une suite complète.

Les quatre temps Node frais des mêmes24ticks, ordre A/B/B/A, sont4306,94 /3282,90 /3317,64 /3548,34ms. La dispersion du premier A interdit de transformer la moyenne en gain général annoncé ; la dernière paire donne environ−6,5%. Ce ne sont ni les FPS ni le débit physique Chrome.

La première mesure des piles recréait un World à chaque étape : elle forçait25checkpoints. Les assertions de composants finissent, mais le test dépasse sa borne120s et échoue en211,991s ; coût froid moyen7,90→12,99ms. Ce refus demeure. Le pilote corrigé restaure une seule fois puis exécute24vrais ticks hors minuterie, compare chaque World entier et exige1checkpoint/24deltas : PASS34,715s, composant piles5,31→3,21ms moyen.

Le noyau commun complet est ensuite qualifié sur cette vraie chronologie : neuf cas différentiels passent, valeurs lumineuses et attributs des toits/piles exacts, puis mesure PASS63,306s. ResourceIndex, préparation des structures, toits, éclairage, supports et piles sont tous chronométrés : **10,688→4,626ms moyens**, médianes8,764→1,850 et p9520,532→11,645. Une capture initiale7512structures puis1601ordinaux de changement ; un seul recalcul des supports et du toit sur25états. GPU, uploads et transformations BoxBatches restent hors de cette mesure. Preuve : `tmp/performance-v434/common-context/measure01/receipt.json`.

## GPU puis relevé natif intermédiaire

Deux paires successives figées, Chrome installé2560×1440/DPR1, même RAW335/caméra/options, requêtes timestamp couvertes intégralement : bois seul, passe MAIN4,537→3,829ms moyens ; puis bois identique dans les deux bras, autres surfaces opaques3,813→3,366ms. Les autres passes restent autour de0,157ms par passe, deux par image ; aucune passe d'ombre n'a lieu pendant ces courtes fenêtres en pause, après préparation normale. Ces gains GPU ne constituent pas un gain FPS actif.

Les images entières ont été inspectées : bois écart maximal7/255 ; extension opaque écart maximal42/255, moyenne absolue par canal inférieure à0,45/255. Le RAW335 est strictement identique avant/après. Les différences de pixels sont conservées sans seuil automatique d'acceptation.

Avant intégration du contexte commun, C+B en natif donne230,92FPS en pause,128,05en ×1 fixe et84,58en rotation ; physique×0,898/×0,845. Le précédent V433 donnait183,52 /131,19 /103,80FPS. Cette régression active intermédiaire est conservée ; elle motive la paire native de matériaux après le contexte et interdit de sélectionner le rendu sur le seul gain GPU.

## Mesures natives et sélection

Chrome155 installé, Ryzen53600/RX5700XT/16Go,2560×1440/DPR1, écran240Hz ; vue perspective inclinée large, mêmes paramètres balanced2048/60Hz, toutes les options visuelles actives. Chaque fenêtre dure10s. La rotation est un vrai clic droit maintenu, trajectoire erratique300mouvements/3,3s répétée pendant toute la fenêtre ; caméra restaurée par l'UI à1e−4. Les sources sont figées, les contrôles lourds successifs, les exports/recharges finaux entiers stricts. Le jeu propose0/1/3/6, pas de palier×4.

Le premier bras Standard des Forges finit tous ses relevés et sa recharge729 exacte mais échoue sur un garde de pilote qui attend un seul import sur toute la vie de la page, malgré les deux navigations normales. Le posthoc distinct confirme les événements, sources et sauvegardes ; l'ancien FAIL demeure. Le pilote corrigé compte exactement un import de chaque famille par document ; la reprise diffus seule passe263,737s, recharge746 exacte et sources produit strictement identiques. Pause fixe183,39→229,43FPS et pause rotation163,11→180,68 ; ×1 fixe127,73→128,37 et rotation104,25→104,60. **Le bénéfice GPU ne devient donc pas un gain ×1 substantiel.**

Derniers relevés sélectionnés (moyennes FPS ; les deux valeurs physiques et intervalles correspondent à fixe/rotation) :

| Partie / vitesse demandée | FPS fixe | FPS rotation | Vitesse physique réelle | RAF p99 fixe / rotation | Pire intervalle fixe / rotation |
| --- | ---: | ---: | ---: | ---: | ---: |
| Les Forges ×1 |128,37|104,60|×0,899 /×0,976|37,4 /45,8ms|83,4 /116,7ms|
| Les Forges ×3 |143,28|99,64|×1,047 /×0,946|29,2 /41,8ms|45,8 /254,2ms|
| Les Forges ×6 |142,57|97,77|×0,965 /×0,896|37,5 /54,1ms|83,3 /91,7ms|
| Les Aulnes ×1 |232,74|227,81|×0,982 /×0,998|8,3 /8,4ms|37,5 /25,0ms|
| Les Éclaircies ×1, seconde mesure |216,91|177,48|×0,981 /×0,998|16,6 /20,8ms|29,2 /183,3ms|

Les Forges V433 donnait131,19/103,80FPS en ×1 : fixe légèrement inférieur, rotation pratiquement inchangée. L'application moyenne baisse21,00→16,84ms fixe et23,24→19,01ms rotation, mais des pics d'application94,2ms et d'adoption43,1ms subsistent. Le témoin rapide V433 donnait100,13/74,79FPS en ×3 et107,46/74,35 en ×6 ; la cadence d'affichage augmente, **sans tenir les vitesses physiques demandées**. Le pic254,2ms de ×3 n'est pas écarté.

Les Aulnes passe125,219s avec recharge complète exacte ; V433 donnait222,49/224,63FPS. Les Éclaircies donne d'abord201,92/158,28FPS (PASS141,567s), recul face aux215,91/184,90 antérieurs malgré une application meilleure et les mêmes états/compteurs. La comparaison rapprochée Standard/diffus passe333,307s :216,48/163,31 contre216,91/177,48FPS, recharges complètes exactes. Le résultat initial défavorable demeure et cette variation interdit une garantie universelle de non-régression. Le contexte commun n'a pas de parcours ajouté par image ; l'application y diminue environ13,3/12,9→11,7/11,8ms.

Pour ne pas attribuer ce recul aux matériaux sur une simple corrélation, un second serveur local sert le graphe complet exact V433/HEAD9a21 déjà conservé, sans mélange de classes navigateur avec le produit courant. Même pilote, RAW, caméra, options et véritable rotation ; origine séparée5174, stockage isolé,1763sources SHA figées et interdiction de servir ROOT/src. Ce témoin rapproché passe153,319s, recharge entière exacte au1855 : **218,85FPS fixe et177,18rotation**, physique×0,982/×0,982 ; p9916,7/20,7ms et maxima29,2/154,2ms. V434216,91/177,48 n'apporte donc pas de gain général de cadence sur cette partie dans cette comparaison ; application13,27/12,92→11,69/11,78ms. Le pic V434183,3ms demeure plus élevé. Les matériaux diffus sont retenus pour leurs gains GPU, pause et vitesses rapides et leur meilleure rotation dans la paire Standard/diffus ; ni une stabilité200FPS ni une amélioration ×1 universelle n'en sont déduites. Le repli hybride préparé n'est pas utilisé.

Preuves : `tmp/performance-v434/render/material-native02/`, `refs01-aulnes/`, `refs02-eclaircies/`, `render/eclaircies-material01/`, `v433-same-day/native01/` et `current-metrics01.json`. **Aucun200FPS stable, confort global rétabli ou débit physique×6 général n'est acquis.**

## Diagnostic suivant et essais privés écartés

Le profil MAIN frais conserve un refus du lecteur strict : un delta négatif−476µs parmi6738échantillons. Le lecteur diagnostique séparé garde cette anomalie signée, ne remplace aucune durée et distingue échantillonnage et temps réel. Il ne transforme pas la campagne échouée en PASS, ni ses données en FPS. Les poids positifs11,263882s et l'anomalie−0,000476s se réconcilient exactement au total signé, distinct de la portée11,263686s. La hiérarchie est seulement diagnostique.

Dans les branches disjointes du rendu4106,94ms, les ombres prennent1366,52ms. Appels de dessin, uniformes, préparation/bindings et uploads sont répartis ; le contexte commun prépare12,25ms sur1044,59ms d'application dans ce profil. Aucune domination nouvelle des seules cultures ni aucun double upload MAIN/ombre d'une même version de texture n'est établi. Les palettes d'animation expliquent une part des transferts, sans justifier d'en faire la priorité avant le travail répété par dessin.

Un prototype privé utilise l'API officielle de contexte matériel pour retirer les matrices objet de six matériaux opaques dont les consommateurs sont à l'identité. Après un refus de connexion locale, la paire GPU reprise finit ses deux captures mais échoue sur le classificateur final : il confond l'UniformNode interne avec son propriétaire ModelNode. Le posthoc distinct corrobore4→0matrices MAIN, ombres WGSL exactes,23consommateurs à l'identité, topologie et pixels RGBA identiques. L'ancien FAIL reste conservé. MAIN3,379→3,347ms seulement, aucun gain FPS natif établi : prototype **non intégré**. L'option d'observateur spécialisé et le repli hybride bois seul restent privés, sans validation ni gain livré. La priorité demeure une responsabilité de rendu qui supprime du travail répété mesuré, avec une préparation graphique dense bornée ; aucun portage moteur/langage n'est présenté comme un gain acquis.

## Qualification et publication

Les quatorze cas pérennes regroupés passent14,477s : thermique, contrat des matériaux, contexte MAIN et deux cas historiques de projection remis à une chronologie valide. Le build Pages passe18,135s ; les acquisitions privées, contrôles ciblés vent/hydroponie,25Worlds stricts et présentation ci-dessus restent distincts. Aucun test complet ni campagne naturelle longue n'est annoncé.

Les quatre anciens cas de `temperature.test.ts` échouent également sur le miroir cohérent pré-C : projection publique comparée au registre RAW, registre futur dans une fixture37, horloges de détérioration non avancées après affectation manuelle du tick. Les deux anciens cas de préparationV299 sont reproduits sur le graphe complet exact HEAD9a21 : leur fixture saute du tick0 à2000 sans avancer la détérioration ; le Decoder refuse avant la projection. Le diagnostic groupé reste FAIL31,483s : deux refus historiques attendus et quatre cas corrigés avant/après acquis. La correction pérenne retire seulement ce saut de tick inutile, sans retirer d'assertion métier. Aucun garde produit n'est assoupli, aucun succès de suite complète n'est annoncé. Les autres contrôles de graphe privé ont nécessité des miroirs cohérents pour les types nominaux ; ces réparations d'outillage ne sont pas des gains produit.

La présentation est acquise par `test:presentation` (PASS152,990s) : minage/abattage et changements6/1/3, sans saut ni occupation solide ; p99 autour de8,3ms sur ce parcours de trois colons. Cela ne remplace pas les mesures de charge des Forges.

Publication par le flux [Direct Upload de Cloudflare](https://developers.cloudflare.com/pages/get-started/direct-upload/), Wrangler local4.149.0 épinglé. Produit83860f3734904c0704ee3ba30a82b91a83c7298f poussé sur origin/main ; build Pages du HEAD sélectionné PASS16,627s, inspection du paquet `tmp/elsewhere-pages/v434-package-g7ZPc3/`. Déploiement PASS16,305s : [adresse immuable daa13dca](https://daa13dca.elsewhere-cq7.pages.dev), [site public](https://elsewhere-cq7.pages.dev). Vérification `tmp/elsewhere-pages/v434-http-vJFgcR/report.json` : **140réponses HTTPS exactes**, MIME attendus, deux origines ; paquet/public/HEAD inchangés et absence des raccords QA privés contrôlée. Tous les71chemins publics (70payloads et catalogue) restent identiques au package V432. Le dossier utilisateur `references_UI/` non suivi reste hors commit ; aucune partie jouée ni historique n'est remplacé. Ces réponses prouvent la disponibilité des octets, pas les FPS en production ni un nouveau parcours de gameplay distant.
