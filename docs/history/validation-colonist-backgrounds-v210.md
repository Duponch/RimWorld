# Validation V210 — Passé personnel et incapacités

Contrôles du 5 octobre 2026, après le commit local V209 `3ed9ce73`. [Contrat](../development/colonist-backgrounds-v210.md), [recherche Core et adaptations](../research/colonist-backgrounds-core-v210.md). Livraison dans le périmètre ciblé, avec régression par reprises sur les sources finales ; aucun résultat de campagne longue n'est présumé.

Le contrôle TypeScript d'intégration passe en **3,997 s** avant gel complet des sources : `tmp/validation-runs/v210-typecheck-preflight-2026-10-04T22-35-09.259Z-22492/output.log`. Ce précontrôle ne remplace pas le build final.

La migration 190→191 est prospective et neutre. Aucun ancien payload public, original du référentiel ou fichier utilisateur sous `references_UI/` n'est régénéré ou intégré au lot.

## Contrôles regroupés

| Contrôle | Résultat et durée murale | Journal |
| --- | --- | --- |
| Cohorte ciblée après correction des fixtures | **16 fichiers, 88/88 tests**, dont **43 nouveaux cas V210** ; **16,814 s** | `tmp/validation-runs/v210-targeted-reprise-2026-10-04T22-58-14.578Z-15508/output.log` |
| Typage/build intermédiaire | Passe, **5,675 s** ; avant le dernier correctif d'infobulle et le refus d'un passé sans âge | `tmp/validation-runs/v210-build-reprise-2026-10-04T22-59-40.245Z-24664/output.log` |
| Chromium natif matériel | **3/3 parcours**, biographies et deux dossiers V199 ; **56,127 s** | `tmp/validation-runs/v210-native-reprise-2026-10-04T23-03-24.261Z-19444/output.log` |
| Présentation et déplacements, carte 250² | Passe, **116,328 s** | `tmp/validation-runs/v210-presentation-2026-10-04T23-04-47.256Z-23992/output.log` |
| Régression hors treize campagnes longues, par reprises | **501 fichiers, 2 271 tests réussis et un ignoré**. Première passe **359,642 s**, reprise des 16 fichiers corrigés + six V210 : **22 fichiers, 118/118, 23,434 s** | `tmp/validation-runs/v210-regression-2026-10-04T23-07-00.993Z-11096/output.log` et `tmp/validation-runs/v210-regression-reprise-2026-10-04T23-18-45.738Z-24580/output.log` |
| Typage/build final | Passe, **5,421 s**, après toutes les corrections | `tmp/validation-runs/v210-build-final-2026-10-04T23-19-45.719Z-22072/output.log` |
| Autre consommateur du générateur Orage sec | **3/3**, **6,345 s**, branche actuelle conservée | `tmp/validation-runs/v210-fixture-dependent-2026-10-04T23-21-13.942Z-26308/output.log` |
| Documents et corpus | **717 documents, 7 137 liens**, six en-têtes courants191 et trois originaux byte-identiques ; **0,994 s** | `tmp/validation-runs/v210-docs-reprise-2026-10-04T23-22-19.013Z-25828/output.log` |

Les six fichiers nouveaux couvrent génération5, persistance4, transport6, UI5, capacités8 et planification15. La cohorte contient aussi les anciennes admissions, scénarios, archives et migrations pertinentes. Les matrices testent les combinaisons compatibles, la frontière biologique vingt ans, gains uniques et bornés, XP/passions conservées, flux privés inchangés, offres figées avant allocation d'autres IDs, propriétaires hors carte et refus atomiques.

Les gardes métiers sont exercées avant proposition, ordre direct, prélèvement et continuation : priorité historique conservée, refus sans consommation ni réservation restante, livraison/installation par le métier permis, ravitaillement d'une facture Cuisine, secours/capture directs, fournisseurs automatiques Médecin/Geôlier, combat/équipement/XP et négociation. Ces fixtures isolent des transitions ; elles ne constituent pas une campagne naturelle.

## Parcours natif

La fixture prépare deux personnes, un cadre de lit approvisionné et une offre réelle. Elle n'effectue ni refus, ni construction, ni accueil en amont. Le parcours emploie les contrôles joueur : consulter l'offre au clavier, afficher les récits/gains, différer puis sauver/recharger ; inspecter Bio et Travail, obtenir l'explication de Construction interdite sans modifier la priorité enregistrée2 ; tenter le chantier au menu contextuel et constater le refus ; le confier à la bâtisseuse avec priorité ordinaire0, sauvegarder sa continuation, puis terminer physiquement le lit avec XP seulement pour elle ; accueillir la personne et retrouver exactement nom, âge, passé et compétences annoncés.

Les noms contenant `<b>` ou `<i>` restent littéraux, sans élément HTML interprété. Les quatre vitesses sont visibles et reçoivent effectivement les clics à 1280×720 avec Bio et Travail ouverts. La sauvegarde/reprise finale est exacte ; aucune erreur navigateur observée. La capture finale a été inspectée visuellement. Les deux parcours V199 contrôlent aussi infobulles souris/modal, politiques, anatomie et permissions prisonnier/hostile.

Le backend est **WebGPU**, adaptateur **AMD / rdna-1**, `isFallbackAdapter=false` ; aucune chaîne de rendu logiciel détectée. Capture et relevé sont dans `tmp/test-runs/v210-native-reprise-2026-10-04T23-03-24.261Z-19444/artifacts/backgrounds-v210-native.{png,json}`. Ce constat matériel ne mesure ni temps GPU ni fréquence naturelle d'incidents ; la vitesse6 demandée ne prouve pas un débit général ×6.

## Incidents et reprises

Premier ciblé : **81/88**, sept échecs. Les anciennes fixtures quest171 et visiteurs135/150/189 conservaient un champ `background` futur après rétrodatage ; seul ce champ a été retiré, sans relâcher les validateurs ni les oracles de migration. Les scénarios attendent désormais leurs gains prospectifs tout en vérifiant qu'un chargement historique n'invente pas de passé. L'oracle de Transport attendait une réservation12 alors que la capacité est10 ; il conserve maintenant pile12/réservation10, puis libération sans prélèvement. Reprise88/88.

Premier build : une erreur TypeScript de fixture, `bills:never[]` inféré par le helper de bâtiment. Annotation locale `Structure`, helper commun inchangé ; reprise verte.

Premier natif : focus correct sur le récit, mais infobulle ensuite masquée. Défaut produit du composant commun : défilement induit par le focus et sorties du pointeur pouvaient fermer l'explication clavier. Le focus possède maintenant son infobulle jusqu'à blur, Escape ou pointerdown ; défilement la repositionne, souris et clavier conservent leurs admissions. Le spec n'a pas été assoupli ; reprise3/3.

Revue finale avant régression : un passé enregistré sans âge connu pouvait franchir les gardes. Le validateur commun refuse désormais cette forme ; les matrices sauvegarde/transport incluent la corruption. Toute création normale fournit déjà cet âge ; l'absence historique de passé demeure neutre.

Première régression : **485 fichiers passants, 2 252/2 271 tests réussis, dix-huit échecs et un ignoré**. Quinze fichiers d'oracles historiques conservaient des champs futurs ou comparaient un payload ancien à une naissance actuelle. Les clones rétrodatés retirent seulement les champs V210 ; les cinq générateurs de démo possèdent désormais un mode explicite `pre-v210` qui restaure le profil historique immédiatement après la fabrique, avant leurs modifications propres, et conserve l'ancienne offre. Aucun payload ou hash public modifié, aucune comparaison supprimée. Le seizième fichier attendait que Médecin0 interdise un secours direct : attente alignée sur l'exception Core V210, avec un **nouveau cas distinct** prouvant que le secours automatique reste interdit à0.

Reprise groupée **118/118**. Le code produit est identique entre première régression et reprise ; seuls fixtures/oracles et ce cas supplémentaire changent. Le bilan de **2 271 réussis + un ignoré** est donc un ensemble unique acquis par reprises, pas une deuxième passe monolithique de toute la suite. Les nouvelles matrices V210 du refus d'un passé sans âge sont incluses dans ces deux passages.

Premier contrôle documentaire : deux en-têtes restés190 dans README et architecture ; actualisés191 avec renvoi au lot, reprise verte. `git diff --check` passe après finalisation.

## Portée et limites

Les contrôles sont successifs ; aucune campagne, mesure GPU ou suite lourde concurrente. Les agents ont partagé les domaines de source puis les ont gelés ; la recherche des crises V211 est restée en lecture seule pendant les mesures.

La fin des contrôles intervient environ **70 minutes après le commit V209**. Les quatorze passages V210 journalisés totalisent **650,65 s**, reprises comprises, dont359,642 s pour la régression générale. Ce total mesure l'exécution de ces commandes, pas l'écriture des tests, la recherche, le temps exclusif des agents ou les tokens/seconde. Le lot relie quatorze récits, dix-huit métiers, compétences, combat, négociation, sept chemins de naissance et offres, UI et migration dans une boucle ; cette cadence observée n'est pas une garantie pour les prochains piliers.

Catalogue local original, profils de compétences/traits et passions composés, gains additifs et choix privé uniforme sont des adaptations explicites. Les contraintes exhaustives entre traits Core et récits ne sont pas reproduites : notamment le filtre Core `Bloodlust`/`Violent` demeure ouvert. Famille, romance, huit candidats initiaux, croissance infantile et distribution Core complète restent absents. Les campagnes longues, tout le navigateur et le coût complet CPU/GPU des nouveaux profils ne sont pas établis par ce lot. G0–G5 restent ouverts.
