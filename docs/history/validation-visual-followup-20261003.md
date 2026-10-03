# Retouches visuelles du 3 octobre — consolidation ciblée

Sources graphiques : commit local `4a7beac`, schéma **173**. Les retouches avaient été livrées sans contrôles automatiques à la demande de l'utilisateur. Sa demande suivante reprend les tests ciblés avant la progression fonctionnelle. Cette consolidation actualise les oracles et apporte une preuve sur ce code ; aucune mécanique ou nouvelle retouche produit n'est ajoutée.

## Résultats

- Typage : `npm run typecheck` passe sur le code graphique livré, avant l'actualisation des tests.
- Neuf fichiers Vitest, **39 tests réussis** : nuages, fragments, zones de stockage et culture, précipitations, fumée, surfaces animales, feux attachés et rétention des buffers. Exécution groupée : environ 8 secondes.
- Trois parcours Chromium **natifs**, `args: []`, un worker : animaux couchés/feu/fumée préparés, zone de stockage sélectionnable, masque de nuages dans les deux projections. **3/3 passent**, environ 52 secondes, sources servies gelées.
- Le témoin nuage reconstruit une occultation qui existerait sans masque. L'écart maximal au centre vaut zéro dans les deux caméras ; plus de 828 000 pixels changent hors du masque. Un témoin soumis à la profondeur reste visible derrière le trou. Le shader peint des nuages compile sur le backend exercé.

Les nouvelles attentes conservent normales, sol, indices, capacités et identités stables. L'oracle de fragments utilise les sommets déformés et une séparation de leurs enveloppes convexes ; il contrôle les assemblages de une à trois masses sans étirement. Les tests de textures désactivées contrôlent l'absence de prélèvement dans les matériaux concernés, sans retirer les contrôles de pigment actif. Les zones subtiles restent sélectionnables sans leur ancien contour.

## Diagnostics et limites

Le premier lancement Vitest a été refusé par le sandbox à la création d'un processus (`spawn EPERM`), avant toute exécution de tests ; la reprise autorisée passe. Un premier parcours navigateur a été interrompu sans résultat final récupérable : il ne compte pas comme réussite. Les trois scènes ont ensuite été rejouées ensemble avec sortie conservée sous `tmp/test-runs/visual-followup-20261003/native-log.txt` et captures dans `browser-reprise`.

Il s'agit de scènes préparées et d'une consolidation ciblée. Aucune suite gameplay complète, campagne naturelle, nouveau build ou mesure comparative CPU/GPU n'a été exécutée pour ce lot. Le budget matériel et les résultats historiques V185 ne prouvent pas le coût général des retouches. L'appréciation artistique prolongée reste humaine. Le [contrat](../development/visual-audio-v185.md) distingue ces retouches de la livraison historique `98b7480`.
